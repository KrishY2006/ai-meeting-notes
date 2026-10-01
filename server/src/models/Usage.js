const mongoose = require('mongoose');

const usageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  date: { type: String },
  generationsCount: { type: Number, default: 0 },
});

module.exports = mongoose.model('Usage', usageSchema);
