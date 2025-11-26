# Shukuma Backend

Welcome to Shukuma, a robust REST API for exercise management, daily workout cards, and progress tracking.

## 🚀 Features

- **User Authentication:** Secure registration and login with JWT-based sessions and bcrypt password hashing.
- **Daily Workout Cards:** Get a randomized daily exercise card, unique per user per day.
- **Exercise Library:** Browse a comprehensive database of exercises with filtering by difficulty and type.
- **Progress Tracking:** Log completed workouts with reps, duration, and notes for personal accountability.
- **Streak Calculation:** Track workout consistency with automatic streak computation.
- **Protected Routes:** Authentication middleware ensures secure access to user-specific data.
- **MongoDB Integration:** Persistent storage with Mongoose ODM for flexible data modeling.
- **Error Handling:** Centralized error handling middleware for consistent API responses.
- **CORS Enabled:** Cross-origin requests supported for frontend integration.

## 🏗️ Project Structure

```
backend/
├── index.js              # Express server entry point
├── package.json          # Dependencies and scripts
├── Dockerfile            # Container configuration
└── src/
    ├── data/
    │   ├── exercises.js      # Exercise seed data
    │   ├── exercises.json    # Exercise JSON database
    │   └── seedExercises.js  # Database seeding script
    ├── db/
    │   └── connect.js        # MongoDB connection logic
    ├── middleware/
    │   ├── auth.js           # JWT authentication middleware
    │   └── errorHandler.js   # Error and 404 handling
    ├── models/
    │   ├── User.js           # User schema with password hashing
    │   ├── Exercise.js       # Exercise schema with validation
    │   ├── Daily.js          # Daily workout card schema
    │   └── Progress.js       # Progress tracking schema
    └── routes/
        ├── register.js       # User registration endpoint
        ├── login.js          # User login endpoint
        ├── daily.js          # Daily workout card logic
        ├── exercise.js       # Exercise CRUD and filtering
        └── progress.js       # Progress logging and retrieval
```

## 🛠️ Tech Stack

- **Node.js & Express** (REST API framework)
- **MongoDB & Mongoose** (database and ODM)
- **JWT** (JSON Web Tokens for auth)
- **bcrypt** (password hashing)
- **CORS** (cross-origin resource sharing)
- **dotenv** (environment configuration)

## 📊 How It Works

1. **Register/Login:** Users create accounts with hashed passwords and receive JWT tokens.
2. **Get Daily Card:** Authenticated users receive a random exercise for the day (cached per date).
3. **Browse Exercises:** Explore exercises by difficulty (`easy`, `medium`, `hard`) or type (`core`, `lowerbody`, `cardio`, `upperbody`).
4. **Log Progress:** Submit completed workouts with reps, duration, and notes.
5. **Track Streaks:** View workout summaries including total completed exercises and current streak.

## 🔌 API Endpoints

### Authentication

- `POST /api/register` - Create new user account
- `POST /api/login` - Authenticate and receive JWT token

### Daily Workout (Protected)

- `GET /api/daily` - Get today's workout card (auto-generates if none exists)

### Exercises (Public)

- `GET /api/exercises` - Get all exercises
- `GET /api/exercises/:id` - Get specific exercise
- `GET /api/exercises/difficulty/:level` - Filter by difficulty (`easy`, `medium`, `hard`)
- `GET /api/exercises/type/:type` - Filter by type (`core`, `lowerbody`, `cardio`, `upperbody`)

### Progress (Protected)

- `POST /api/progress` - Log completed workout
- `GET /api/progress/:userId` - Get all progress records for user
- `GET /api/progress/:userId/today` - Get today's completed workouts
- `GET /api/progress/:userId/summary` - Get total workouts and current streak

## 📦 Data Models

### User

```js
{
  username: String,        // Unique username
  email: String,           // Unique email
  password: String,        // Bcrypt hashed password
  timestamps: true         // createdAt, updatedAt
}
```

### Exercise

```js
{
  name: String,            // Exercise name
  description: String,     // How to perform
  type: String,            // core | lowerbody | cardio | upperbody
  difficulty: String,      // easy | medium | hard
  demonstration: String,   // Link to demo video/image
  duration: Number,        // Time in seconds (OR reps, not both)
  reps: Number,            // Number of repetitions (OR duration)
  timestamps: true
}
```

### Daily Exercise

```js
{
  userId: ObjectId,        // Reference to User
  exerciseId: ObjectId,    // Reference to Exercise
  date: String,            // YYYY-MM-DD format
}
```

### Progress

```js
{
  userId: ObjectId,        // Reference to User
  exerciseId: ObjectId,    // Reference to Exercise
  date: String,            // YYYY-MM-DD format
  completedReps: Number,   // Actual reps completed
  completedSeconds: Number,// Actual duration completed
  notes: String,           // User notes
}
```

## 🖥️ Getting Started

```bash
git clone https://github.com/siyabuilds/shukuma
cd shukuma/backend
npm install

# Create .env file
echo "MONGODB_URI=your_mongodb_connection_string" >> .env
echo "JWT_SECRET=your_secret_key" >> .env
echo "PORT=3000" >> .env

# Run in development mode
npm run dev

# Run in production
npm start
```

## 🔒 Authentication Flow

1. User registers via `/api/register` with username, email, and password
2. Password is automatically hashed using bcrypt before storage
3. User logs in via `/api/login` and receives JWT token
4. Token must be included in `Authorization: Bearer <token>` header for protected routes
5. Middleware validates token and attaches user object to `req.user`

## 🎯 Key Features Explained

### Daily Workout Cards

- One exercise per user per day
- Automatically generated on first access
- Cached to prevent multiple exercises in one day
- Randomly selected from entire exercise database

### Progress Tracking

- Prevents duplicate submissions for same exercise on same day
- Supports both time-based and rep-based exercises
- Calculates streaks based on consecutive days of completion
- Provides summary statistics for motivation

### Exercise Validation

- Exercises must have EITHER duration OR reps (not both)
- Pre-validation hook ensures data integrity
- Supports four exercise types and three difficulty levels

## 🌱 Future Plans

- Exercise recommendation algorithm based on user progress
- Social features (friend workouts, challenges)
- Advanced analytics (weekly/monthly trends, muscle group distribution)
- REST API rate limiting and caching with Redis
