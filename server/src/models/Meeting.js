const mongoose = require('mongoose');

const actionItemSchema = new mongoose.Schema(
  {
    task: { type: String },
    assignee: { type: String, default: 'Unassigned' },
    dueDate: { type: String, default: null },
  },
  { _id: false }
);

const topicSchema = new mongoose.Schema(
  {
    topic: { type: String },
    blurb: { type: String },
  },
  { _id: false }
);

const notesSchema = new mongoose.Schema(
  {
    summary: { type: String },
    keyDecisions: [{ type: String }],
    actionItems: [actionItemSchema],
    topics: [topicSchema],
    openQuestions: [{ type: String }],
  },
  { _id: false }
);

const meetingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    title: { type: String },
    sourceType: {
      type: String,
      enum: ['paste', 'file'],
    },
    sourceText: { type: String },
    notes: { type: notesSchema },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Meeting', meetingSchema);
