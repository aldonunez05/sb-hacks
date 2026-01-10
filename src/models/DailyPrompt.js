const mongoose = require('mongoose');

const dailyPromptSchema = new mongoose.Schema({
  challenge: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challenge',
    required: true
  },
  date: {
    type: Date,
    required: true,
    unique: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  totalSubmissions: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for efficient date queries
dailyPromptSchema.index({ date: 1 });

module.exports = mongoose.model('DailyPrompt', dailyPromptSchema);
