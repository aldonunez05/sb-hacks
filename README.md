DailyChallenge 📸

test

Made by Alexia Sargsyan, Aldo Nunez, Carter Wang, & Mylie Torchia

A BeReal-inspired app that sends daily challenge prompts at 6 AM. Complete your challenge before 11:59 PM by uploading a photo!

Concept:
Users receive a random daily challenge at 6 AM (e.g., "Take a photo with your best friend", "Show us your lunch")
They have until 11:59 PM to complete and upload their photo
See what challenges your friends completed each day

Tech Stack:
Frontend:
React Native (Expo) for mobile app
Expo Notifications for push notifications
Expo Camera for photo capture
React Navigation for routing

Backend:
Node.js + Express
MongoDB (or PostgreSQL) for database
Firebase Cloud Messaging (FCM) for push notifications
Cloudinary or AWS S3 for image storage
node-cron for scheduled tasks

Project Structure:
dailychallenge/
├── client/                 # React Native app
│   ├── src/
│   │   ├── screens/       # App screens
│   │   ├── components/    # Reusable components
│   │   ├── services/      # API calls
│   │   └── navigation/    # Navigation setup
│   └── app.json
├── server/                # Node.js backend
│   ├── src/
│   │   ├── routes/        # API routes
│   │   ├── models/        # Database models
│   │   ├── controllers/   # Business logic
│   │   ├── middleware/    # Auth, validation
│   │   ├── services/      # External services (FCM, storage)
│   │   └── cron/          # Scheduled jobs
│   └── server.js
└── README.md

Database Schema:
Users
javascript{
  _id: ObjectId,
  username: String,
  email: String,
  password: String (hashed),
  pushToken: String,
  friends: [ObjectId],
  createdAt: Date
}
Challenges
javascript{
  _id: ObjectId,
  prompt: String,
  category: String,
  createdAt: Date
}
Submissions
javascript{
  _id: ObjectId,
  userId: ObjectId,
  challengeId: ObjectId,
  date: Date,
  imageUrl: String,
  completed: Boolean,
  submittedAt: Date
}
DailyPrompts
javascript{
  _id: ObjectId,
  date: Date,
  challengeId: ObjectId,
  sentAt: Date
}

Getting Started:
Prerequisites
Node.js 18+
MongoDB (local or Atlas)
Expo CLI: npm install -g expo-cli
Firebase project with FCM enabled

Backend Setup:
Navigate to server directory:

bashcd server
npm install

Create .env file:

envPORT=3000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret

Start server:

bashnpm run dev
Frontend Setup

Navigate to client directory:

bashcd client
npm install

Create .env file:

envEXPO_PUBLIC_API_URL=http://localhost:3000/api

Start Expo:

bashnpx expo start
📱 Key Features to Implement
MVP (Minimum Viable Product)

 User authentication (signup/login)
 Receive push notification at 6 AM with daily challenge
 Take/upload photo for challenge
 View your submission history
 Timer showing time left to complete challenge

Stretch Goals

 Friend system (add friends, see their submissions)
 Challenge categories
 Streak tracking
 Late submissions (marked differently)
 Comments/reactions on submissions
 Custom challenge suggestions

🔧 API Endpoints
Authentication

POST /api/auth/register - Register new user
POST /api/auth/login - Login user
POST /api/auth/logout - Logout user

Challenges

GET /api/challenges/today - Get today's challenge
GET /api/challenges/history - Get past challenges

Submissions

POST /api/submissions - Submit photo for challenge
GET /api/submissions/mine - Get my submissions
GET /api/submissions/friends - Get friends' submissions

Users

GET /api/users/me - Get current user
PUT /api/users/push-token - Update push notification token
POST /api/users/friends - Add friend

📅 Cron Jobs

6:00 AM Daily: Select random challenge and send push notifications to all users
12:00 AM Daily: Archive previous day's submissions

🔐 Security Notes

Use bcrypt for password hashing
Implement JWT for authentication
Validate all inputs
Use HTTPS in production
Sanitize image uploads
Rate limit API endpoints

🎨 UI Screens

Login/Signup - Authentication
Home - Today's challenge + timer
Camera - Capture/upload photo
Feed - See friends' submissions
Profile - User stats, streak, history

📝 Challenge Prompts Ideas

"Take a photo with your best friend"
"Show us your lunch"
"Capture your current view"
"Photo of something blue"
"Your favorite spot on campus"
"Something that made you smile today"
"Your study setup"
"A random act of kindness"

🏆 Hackathon Tips

Day 1: Set up auth, database, basic UI
Day 2: Implement core features (camera, submissions, notifications)
Day 3: Polish, fix bugs, prepare demo

Focus on MVP first, add stretch goals if time permits!
📄 License
MIT License - Built at SBHacks 🚀
