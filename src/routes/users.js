const express = require('express');
const multer = require('multer');
const User = require('../models/User');
const Submission = require('../models/Submission');
const { auth } = require('../middleware/auth');
const { uploadImage } = require('../services/imageUpload');

const router = express.Router();

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Search users
router.get('/search', auth, async (req, res) => {
  try {
    const { query, limit = 10 } = req.query;

    if (!query || query.trim().length === 0) {
      return res.json({ users: [] });
    }

    const users = await User.find({
      $and: [
        { _id: { $ne: req.userId } }, // Exclude current user
        {
          $or: [
            { username: { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } }
          ]
        }
      ]
    })
    .select('username email profilePicture points streak')
    .limit(parseInt(limit));

    res.json({ users });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Error searching users' });
  }
});

// Get user profile
router.get('/:userId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('-password')
      .populate('friends', 'username profilePicture points streak');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's recent submissions
    const submissions = await Submission.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(9)
      .populate({
        path: 'dailyPrompt',
        populate: { path: 'challenge', select: 'prompt category' }
      });

    // Check if current user is friends with this user
    const currentUser = await User.findById(req.userId);
    const isFriend = currentUser.friends.includes(user._id);
    const hasPendingRequest = user.friendRequests.includes(req.userId);

    res.json({
      user,
      submissions,
      isFriend,
      hasPendingRequest
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Error fetching user profile' });
  }
});

// Update profile
router.patch('/profile', auth, upload.single('profilePicture'), async (req, res) => {
  try {
    const { bio, username } = req.body;
    const updates = {};

    if (bio !== undefined) updates.bio = bio;
    if (username !== undefined) {
      // Check if username is taken
      const existing = await User.findOne({ 
        username, 
        _id: { $ne: req.userId } 
      });
      if (existing) {
        return res.status(400).json({ error: 'Username already taken' });
      }
      updates.username = username;
    }

    if (req.file) {
      const imageUrl = await uploadImage(req.file.buffer);
      updates.profilePicture = imageUrl;
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      updates,
      { new: true }
    ).select('-password');

    res.json({ user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Error updating profile' });
  }
});

// Send friend request
router.post('/friend-request/:userId', auth, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.userId);

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.friendRequests.includes(req.userId)) {
      return res.status(400).json({ error: 'Friend request already sent' });
    }

    if (targetUser.friends.includes(req.userId)) {
      return res.status(400).json({ error: 'Already friends' });
    }

    targetUser.friendRequests.push(req.userId);
    await targetUser.save();

    res.json({ message: 'Friend request sent' });
  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({ error: 'Error sending friend request' });
  }
});

// Accept friend request
router.post('/friend-request/:userId/accept', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);
    const requester = await User.findById(req.params.userId);

    if (!requester) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!currentUser.friendRequests.includes(requester._id)) {
      return res.status(400).json({ error: 'No friend request from this user' });
    }

    // Remove from friend requests
    currentUser.friendRequests = currentUser.friendRequests.filter(
      id => !id.equals(requester._id)
    );

    // Add to friends
    currentUser.friends.push(requester._id);
    requester.friends.push(currentUser._id);

    await currentUser.save();
    await requester.save();

    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    console.error('Accept friend request error:', error);
    res.status(500).json({ error: 'Error accepting friend request' });
  }
});

// Reject friend request
router.post('/friend-request/:userId/reject', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);

    currentUser.friendRequests = currentUser.friendRequests.filter(
      id => id.toString() !== req.params.userId
    );

    await currentUser.save();

    res.json({ message: 'Friend request rejected' });
  } catch (error) {
    console.error('Reject friend request error:', error);
    res.status(500).json({ error: 'Error rejecting friend request' });
  }
});

// Remove friend
router.delete('/friends/:userId', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);
    const friend = await User.findById(req.params.userId);

    if (!friend) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove from both users' friend lists
    currentUser.friends = currentUser.friends.filter(
      id => !id.equals(friend._id)
    );
    friend.friends = friend.friends.filter(
      id => !id.equals(currentUser._id)
    );

    await currentUser.save();
    await friend.save();

    res.json({ message: 'Friend removed' });
  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({ error: 'Error removing friend' });
  }
});

// Get leaderboard
router.get('/leaderboard/top', auth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const topUsers = await User.find()
      .sort({ points: -1 })
      .limit(parseInt(limit))
      .select('username profilePicture points streak');

    res.json({ leaderboard: topUsers });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Error fetching leaderboard' });
  }
});

module.exports = router;
