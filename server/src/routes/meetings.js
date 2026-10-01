const express = require('express');
const rateLimit = require('express-rate-limit');

const Meeting = require('../models/Meeting');
const Usage = require('../models/Usage');
const { generateNotes } = require('../services/llm');
const { convertToMarkdown } = require('../services/export');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

// Generation costs money and is the most abuseable endpoint, so it gets a hard
// per-IP burst cap in addition to the per-user daily quota checked in the handler.
const generateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.GENERATE_RATE_LIMIT_MAX) || 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many generation requests. Please try again in a few minutes.' },
});

function today() {
  return new Date().toISOString().slice(0, 10);
}

function isValidObjectId(id) {
  return /^[a-f\d]{24}$/i.test(String(id || ''));
}

router.get('/', async (req, res) => {
  const meetings = await Meeting.find({ userId: req.user.id })
    .select('_id title sourceType createdAt updatedAt')
    .sort({ createdAt: -1 })
    .lean();

  return res.status(200).json(meetings);
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(404).json({ error: 'Meeting not found.' });
  }

  const meeting = await Meeting.findOne({ _id: id, userId: req.user.id });

  if (!meeting) {
    return res.status(404).json({ error: 'Meeting not found.' });
  }

  return res.status(200).json(meeting);
});

router.get('/:id/export', async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(404).json({ error: 'Meeting not found.' });
  }

  const meeting = await Meeting.findOne({ _id: id, userId: req.user.id })
    .select('_id title notes updatedAt')
    .lean();

  if (!meeting) {
    return res.status(404).json({ error: 'Meeting not found.' });
  }

  const markdown = convertToMarkdown(meeting.notes, {
    title: meeting.title,
    generatedAt: meeting.updatedAt,
  });

  return res.status(200).type('text/markdown; charset=utf-8').send(markdown);
});

router.patch('/:id', async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(404).json({ error: 'Meeting not found.' });
  }

  const { notes } = req.body || {};

  if (!notes || typeof notes !== 'object' || Array.isArray(notes)) {
    return res.status(400).json({ error: 'notes must be an object.' });
  }

  const meeting = await Meeting.findOneAndUpdate(
    { _id: id, userId: req.user.id },
    { $set: { notes } },
    { new: true, runValidators: true }
  );

  if (!meeting) {
    return res.status(404).json({ error: 'Meeting not found.' });
  }

  return res.status(200).json(meeting);
});

router.post('/:id/regenerate', async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  if (!isValidObjectId(id)) {
    return res.status(404).json({ error: 'Meeting not found.' });
  }

  const meeting = await Meeting.findOne({ _id: id, userId });

  if (!meeting) {
    return res.status(404).json({ error: 'Meeting not found.' });
  }

  const dailyLimit = Number(process.env.DAILY_GENERATION_LIMIT) || 20;
  const date = today();

  const usage = await Usage.findOneAndUpdate(
    { userId, date },
    { $inc: { generationsCount: 1 } },
    { new: true, upsert: true }
  );

  if (usage.generationsCount > dailyLimit) {
    await Usage.updateOne({ userId, date }, { $inc: { generationsCount: -1 } });
    return res.status(429).json({
      error: `Daily generation limit reached. Limit is ${dailyLimit} per day.`,
    });
  }

  try {
    const notes = await generateNotes(meeting.sourceText);

    meeting.notes = notes;
    await meeting.save();

    return res.status(200).json(meeting);
  } catch (error) {
    await Usage.updateOne({ userId, date }, { $inc: { generationsCount: -1 } });
    return res.status(502).json({ error: `Note generation failed: ${error.message}` });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(404).json({ error: 'Meeting not found.' });
  }

  const meeting = await Meeting.findOneAndDelete({ _id: id, userId: req.user.id });

  if (!meeting) {
    return res.status(404).json({ error: 'Meeting not found.' });
  }

  return res.status(200).json({ message: 'Meeting deleted successfully.' });
});

router.post('/generate', generateLimiter, async (req, res) => {
  const userId = req.user.id;
  const { title, sourceType, sourceText } = req.body || {};

  if (!sourceText || typeof sourceText !== 'string' || !sourceText.trim()) {
    return res.status(400).json({ error: 'sourceText is required and cannot be empty.' });
  }

  const maxChars = Number(process.env.MAX_TRANSCRIPT_CHARS) || 40000;
  if (sourceText.length > maxChars) {
    return res.status(400).json({
      error: `Transcript is too long: ${sourceText.length} characters. Maximum is ${maxChars}.`,
    });
  }

  const dailyLimit = Number(process.env.DAILY_GENERATION_LIMIT) || 20;
  const date = today();

  const usage = await Usage.findOneAndUpdate(
    { userId, date },
    { $inc: { generationsCount: 1 } },
    { new: true, upsert: true }
  );

  if (usage.generationsCount > dailyLimit) {
    await Usage.updateOne({ userId, date }, { $inc: { generationsCount: -1 } });
    return res.status(429).json({
      error: `Daily generation limit reached. Limit is ${dailyLimit} per day.`,
    });
  }

  let meeting;

  try {
    const notes = await generateNotes(sourceText);

    meeting = await Meeting.create({
      userId,
      title: title || 'Untitled meeting',
      sourceType,
      sourceText,
      notes,
    });
  } catch (error) {
    await Usage.updateOne({ userId, date }, { $inc: { generationsCount: -1 } });
    return res.status(502).json({ error: `Note generation failed: ${error.message}` });
  }

  return res.status(201).json(meeting);
});

module.exports = router;
