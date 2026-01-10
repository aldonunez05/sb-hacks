const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dailyPrompt: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DailyPrompt',
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  caption: {
    type: String,
    default: '',
    maxlength: 200
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    text: {
      type: String,
      required: true,
      maxlength: 200
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  submittedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient querying
submissionSchema.index({ user: 1, dailyPrompt: 1 }, { unique: true });
submissionSchema.index({ dailyPrompt: 1, createdAt: -1 });

module.exports = mongoose.model('Submission', submissionSchema);
