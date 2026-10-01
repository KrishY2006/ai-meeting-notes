const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const User = require('../models/User');

const router = express.Router();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function signToken(user) {  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
}

function validateCredentials(email, password) {
  if (!email || typeof email !== 'string' || !EMAIL_PATTERN.test(email.trim())) {
    return 'A valid email is required.';
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    return 'Password must be at least 8 characters.';
  }

  return null;
}

router.post('/register', async (req, res) => {
  const { email, password } = req.body || {};

  const invalid = validateCredentials(email, password);
  if (invalid) {
    return res.status(400).json({ error: invalid });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    return res.status(409).json({ error: 'An account with that email already exists.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await User.create({ email: normalizedEmail, passwordHash });

  return res.status(201).json({ token: signToken(user), user: { id: user.id, email: user.email } });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};

  const invalid = validateCredentials(email, password);
  if (invalid) {
    return res.status(400).json({ error: invalid });
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() });

  if (!user) {
    await bcrypt.compare(password, '$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidi');
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);

  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  return res.status(200).json({ token: signToken(user), user: { id: user.id, email: user.email } });
});

module.exports = router;
