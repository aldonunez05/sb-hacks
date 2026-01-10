const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
  prompt: {
    type: String,
    required: true,
    unique: true
  },
  category: {
    type: String,
    enum: ['food', 'nature', 'social', 'creative', 'random'],
    default: 'random'
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  usedDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Challenge', challengeSchema);
