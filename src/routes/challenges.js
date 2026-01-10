const express = require('express');
const DailyPrompt = require('../models/DailyPrompt');
const Challenge = require('../models/Challenge');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get today's challenge
router.get('/today', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dailyPrompt = await DailyPrompt.findOne({
      date: { $gte: today, $lt: tomorrow }
    }).populate('challenge');

    if (!dailyPrompt) {
      return res.json({ challenge: null, message: 'No challenge for today yet' });
    }

    // Calculate time remaining
    const now = new Date();
    const timeRemaining = dailyPrompt.expiresAt - now;

    res.json({
      challenge: {
        id: dailyPrompt._id,
        prompt: dailyPrompt.challenge.prompt,
        category: dailyPrompt.challenge.category,
        expiresAt: dailyPrompt.expiresAt,
        timeRemaining: Math.max(0, timeRemaining),
        totalSubmissions: dailyPrompt.totalSubmissions
      }
    });
  } catch (error) {
    console.error('Get today challenge error:', error);
    res.status(500).json({ error: 'Error fetching today\'s challenge' });
  }
});

// Get challenge history
router.get('/history', auth, async (req, res) => {
  try {
    const { limit = 10, skip = 0 } = req.query;

    const dailyPrompts = await DailyPrompt.find()
      .sort({ date: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .populate('challenge');

    res.json({
      challenges: dailyPrompts.map(dp => ({
        id: dp._id,
        prompt: dp.challenge.prompt,
        category: dp.challenge.category,
        date: dp.date,
        totalSubmissions: dp.totalSubmissions
      }))
    });
  } catch (error) {
    console.error('Get challenge history error:', error);
    res.status(500).json({ error: 'Error fetching challenge history' });
  }
});

// Admin: Manually create today's challenge (for testing)
router.post('/trigger-daily', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if challenge already exists for today
    const existing = await DailyPrompt.findOne({
      date: { $gte: today, $lt: tomorrow }
    });

    if (existing) {
      return res.status(400).json({ error: 'Challenge already exists for today' });
    }

    // Get a random unused challenge
    const unusedChallenges = await Challenge.find({ isUsed: false });
    
    if (unusedChallenges.length === 0) {
      // Reset all challenges if we've used them all
      await Challenge.updateMany({}, { isUsed: false, usedDate: null });
      const allChallenges = await Challenge.find();
      unusedChallenges.push(...allChallenges);
    }

    const randomChallenge = unusedChallenges[
      Math.floor(Math.random() * unusedChallenges.length)
    ];

    // Mark challenge as used
    randomChallenge.isUsed = true;
    randomChallenge.usedDate = today;
    await randomChallenge.save();

    // Create daily prompt
    const expiresAt = new Date(tomorrow);
    const dailyPrompt = new DailyPrompt({
      challenge: randomChallenge._id,
      date: today,
      expiresAt
    });

    await dailyPrompt.save();
    await dailyPrompt.populate('challenge');

    res.json({
      message: 'Daily challenge created successfully',
      challenge: {
        id: dailyPrompt._id,
        prompt: dailyPrompt.challenge.prompt,
        category: dailyPrompt.challenge.category,
        expiresAt: dailyPrompt.expiresAt
      }
    });
  } catch (error) {
    console.error('Trigger daily challenge error:', error);
    res.status(500).json({ error: 'Error creating daily challenge' });
  }
});

module.exports = router;
