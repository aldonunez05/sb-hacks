// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
require('dotenv').config();

const authRoutes = require('./src/routes/auth');
const challengeRoutes = require('./src/routes/challenges');
const submissionRoutes = require('./src/routes/submissions');
const userRoutes = require('./src/routes/users');
const { sendDailyChallenge } = require('./src/cron/dailyChallenge');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Cron job - Send daily challenge at 6 AM
cron.schedule('0 6 * * *', async () => {
  console.log('Running daily challenge cron job...');
  await sendDailyChallenge();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// ============================================
// src/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  pushToken: {
    type: String,
    default: null
  },
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

// ============================================
// src/models/Challenge.js
const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
  prompt: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['social', 'food', 'nature', 'creative', 'random'],
    default: 'random'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Challenge', challengeSchema);

// ============================================
// src/models/Submission.js
const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  challengeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challenge',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  completed: {
    type: Boolean,
    default: true
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure one submission per user per day
submissionSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Submission', submissionSchema);

// ============================================
// src/models/DailyPrompt.js
const mongoose = require('mongoose');

const dailyPromptSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true
  },
  challengeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challenge',
    required: true
  },
  sentAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('DailyPrompt', dailyPromptSchema);

// ============================================
// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw new Error();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      throw new Error();
    }

    req.user = user;
    req.userId = user._id;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Please authenticate' });
  }
};

module.exports = authMiddleware;

// ============================================
// src/routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const user = new User({ username, email, password });
    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '30d'
    });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '30d'
    });

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;

// ============================================
// src/routes/challenges.js
const express = require('express');
const authMiddleware = require('../middleware/auth');
const DailyPrompt = require('../models/DailyPrompt');
const Challenge = require('../models/Challenge');

const router = express.Router();

// Get today's challenge
router.get('/today', authMiddleware, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyPrompt = await DailyPrompt.findOne({ date: today })
      .populate('challengeId');

    if (!dailyPrompt) {
      return res.status(404).json({ error: 'No challenge for today yet' });
    }

    res.json({
      challenge: dailyPrompt.challengeId,
      date: dailyPrompt.date
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get challenge history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const history = await DailyPrompt.find()
      .populate('challengeId')
      .sort({ date: -1 })
      .limit(30);

    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

// ============================================
// src/routes/submissions.js
const express = require('express');
const multer = require('multer');
const authMiddleware = require('../middleware/auth');
const Submission = require('../models/Submission');
const DailyPrompt = require('../models/DailyPrompt');
const { uploadImage } = require('../services/imageUpload');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Submit photo for challenge
router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already submitted today
    const existingSubmission = await Submission.findOne({
      userId: req.userId,
      date: today
    });

    if (existingSubmission) {
      return res.status(400).json({ error: 'Already submitted for today' });
    }

    // Get today's challenge
    const dailyPrompt = await DailyPrompt.findOne({ date: today });
    if (!dailyPrompt) {
      return res.status(404).json({ error: 'No challenge for today' });
    }

    // Upload image
    const imageUrl = await uploadImage(req.file);

    // Create submission
    const submission = new Submission({
      userId: req.userId,
      challengeId: dailyPrompt.challengeId,
      date: today,
      imageUrl
    });

    await submission.save();

    res.status(201).json(submission);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get my submissions
router.get('/mine', authMiddleware, async (req, res) => {
  try {
    const submissions = await Submission.find({ userId: req.userId })
      .populate('challengeId')
      .sort({ date: -1 });

    res.json(submissions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get friends' submissions for today
router.get('/friends', authMiddleware, async (req, res) => {
  try {
    const user = await req.user.populate('friends');
    const friendIds = user.friends.map(f => f._id);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const submissions = await Submission.find({
      userId: { $in: friendIds },
      date: today
    })
      .populate('userId', 'username')
      .populate('challengeId');

    res.json(submissions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

// ============================================
// src/routes/users.js
const express = require('express');
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .select('-password')
      .populate('friends', 'username');
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update push token
router.put('/push-token', authMiddleware, async (req, res) => {
  try {
    const { pushToken } = req.body;
    
    await User.findByIdAndUpdate(req.userId, { pushToken });
    
    res.json({ message: 'Push token updated' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Add friend
router.post('/friends', authMiddleware, async (req, res) => {
  try {
    const { username } = req.body;
    
    const friend = await User.findOne({ username });
    if (!friend) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = await User.findById(req.userId);
    if (user.friends.includes(friend._id)) {
      return res.status(400).json({ error: 'Already friends' });
    }

    user.friends.push(friend._id);
    await user.save();

    res.json({ message: 'Friend added', friend: { id: friend._id, username: friend.username } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;

// ============================================
// src/cron/dailyChallenge.js
const DailyPrompt = require('../models/DailyPrompt');
const Challenge = require('../models/Challenge');
const { sendPushNotification } = require('../services/pushNotifications');
const User = require('../models/User');

async function sendDailyChallenge() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already sent today
    const existing = await DailyPrompt.findOne({ date: today });
    if (existing) {
      console.log('Challenge already sent today');
      return;
    }

    // Get random challenge
    const count = await Challenge.countDocuments();
    const random = Math.floor(Math.random() * count);
    const challenge = await Challenge.findOne().skip(random);

    if (!challenge) {
      console.error('No challenges available');
      return;
    }

    // Save daily prompt
    const dailyPrompt = new DailyPrompt({
      date: today,
      challengeId: challenge._id
    });
    await dailyPrompt.save();

    // Send push notifications to all users
    const users = await User.find({ pushToken: { $ne: null } });
    
    for (const user of users) {
      await sendPushNotification(user.pushToken, {
        title: 'Today\'s Challenge!',
        body: challenge.prompt,
        data: { challengeId: challenge._id.toString() }
      });
    }

    console.log(`Daily challenge sent: ${challenge.prompt}`);
  } catch (error) {
    console.error('Error sending daily challenge:', error);
  }
}

module.exports = { sendDailyChallenge };

// ============================================
// src/services/pushNotifications.js
const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL
  })
});

async function sendPushNotification(token, notification) {
  try {
    const message = {
      notification: {
        title: notification.title,
        body: notification.body
      },
      data: notification.data || {},
      token: token
    };

    await admin.messaging().send(message);
    console.log('Push notification sent successfully');
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}

module.exports = { sendPushNotification };

// ============================================
// src/services/imageUpload.js
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function uploadImage(file) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'dailychallenge' },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );
    
    uploadStream.end(file.buffer);
  });
}

module.exports = { uploadImage };

// ============================================
// package.json
/*
{
  "name": "dailychallenge-backend",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^8.0.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "multer": "^1.4.5-lts.1",
    "node-cron": "^3.0.2",
    "firebase-admin": "^12.0.0",
    "cloudinary": "^1.41.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
*/
