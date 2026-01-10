const express = require('express');
const multer = require('multer');
const Submission = require('../models/Submission');
const DailyPrompt = require('../models/DailyPrompt');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { uploadImage } = require('../services/imageUpload');

const router = express.Router();

// Configure multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Submit a photo for today's challenge
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const { dailyPromptId, caption } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Verify daily prompt exists and is still valid
    const dailyPrompt = await DailyPrompt.findById(dailyPromptId);
    if (!dailyPrompt) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    if (new Date() > dailyPrompt.expiresAt) {
      return res.status(400).json({ error: 'Challenge has expired' });
    }

    // Check if user already submitted for this challenge
    const existingSubmission = await Submission.findOne({
      user: req.userId,
      dailyPrompt: dailyPromptId
    });

    if (existingSubmission) {
      return res.status(400).json({ error: 'You already submitted for this challenge' });
    }

    // Upload image to Cloudinary
    const imageUrl = await uploadImage(req.file.buffer);

    // Create submission
    const submission = new Submission({
      user: req.userId,
      dailyPrompt: dailyPromptId,
      imageUrl,
      caption: caption || ''
    });

    await submission.save();

    // Update user points and streak
    const user = await User.findById(req.userId);
    user.updateStreak();
    user.points += 10; // Base points for submission
    await user.save();

    // Update daily prompt submission count
    dailyPrompt.totalSubmissions += 1;
    await dailyPrompt.save();

    // Populate submission data
    await submission.populate('user', 'username profilePicture');

    res.status(201).json({
      submission,
      points: user.points,
      streak: user.streak
    });
  } catch (error) {
    console.error('Submit photo error:', error);
    res.status(500).json({ error: 'Error submitting photo' });
  }
});

// Get feed (submissions from friends and self)
router.get('/feed', auth, async (req, res) => {
  try {
    const { limit = 20, skip = 0, dailyPromptId } = req.query;

    const user = await User.findById(req.userId);
    const friendIds = [...user.friends, req.userId]; // Include self

    const query = {
      user: { $in: friendIds }
    };

    if (dailyPromptId) {
      query.dailyPrompt = dailyPromptId;
    }

    const submissions = await Submission.find(query)
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .populate('user', 'username profilePicture points streak')
      .populate({
        path: 'dailyPrompt',
        populate: {
          path: 'challenge',
          select: 'prompt category'
        }
      })
      .populate('comments.user', 'username profilePicture');

    res.json({ submissions });
  } catch (error) {
    console.error('Get feed error:', error);
    res.status(500).json({ error: 'Error fetching feed' });
  }
});

// Like a submission
router.post('/:id/like', auth, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const likeIndex = submission.likes.indexOf(req.userId);

    if (likeIndex > -1) {
      // Unlike
      submission.likes.splice(likeIndex, 1);
    } else {
      // Like
      submission.likes.push(req.userId);
    }

    await submission.save();

    res.json({ 
      likes: submission.likes.length,
      isLiked: likeIndex === -1
    });
  } catch (error) {
    console.error('Like submission error:', error);
    res.status(500).json({ error: 'Error liking submission' });
  }
});

// Comment on a submission
router.post('/:id/comment', auth, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    const submission = await Submission.findById(req.params.id);

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    submission.comments.push({
      user: req.userId,
      text: text.trim()
    });

    await submission.save();
    await submission.populate('comments.user', 'username profilePicture');

    res.json({ comments: submission.comments });
  } catch (error) {
    console.error('Comment error:', error);
    res.status(500).json({ error: 'Error adding comment' });
  }
});

// Delete a submission
router.delete('/:id', auth, async (req, res) => {
  try {
    const submission = await Submission.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found or unauthorized' });
    }

    await submission.deleteOne();

    res.json({ message: 'Submission deleted successfully' });
  } catch (error) {
    console.error('Delete submission error:', error);
    res.status(500).json({ error: 'Error deleting submission' });
  }
});

module.exports = router;
