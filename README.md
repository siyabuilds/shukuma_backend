# Shukuma Backend

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Mongoose](https://img.shields.io/badge/Mongoose-880000?style=for-the-badge&logo=mongoose&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)
![Render](https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)
![DigitalOcean](https://img.shields.io/badge/DigitalOcean-0080FF?style=for-the-badge&logo=digitalocean&logoColor=white)

</div>

A RESTful API powering the Shukuma fitness companion application for exercise management, daily challenges, progress tracking, and community engagement.

---

## Design Decisions

### 1. Date-String Indexing for Daily Records

Daily exercises and challenges use `YYYY-MM-DD` string format instead of Date objects. This simplifies timezone-agnostic queries and creates predictable compound indexes (`userId` + `date`). The trade-off in query flexibility is acceptable given the single-day lookup pattern.

### 2. Pre-Save Password Hashing

User passwords are hashed via a Mongoose `pre('save')` hook using bcrypt with a cost factor of 10. This centralizes security logic in the model layer, ensuring passwords are never stored in plaintext regardless of which route creates the user.

### 3. Exercise Snapshot in Challenges

Friend-to-friend challenges store an `exerciseSnapshot` object alongside the `exerciseId` reference. This denormalization ensures challenge details remain intact even if the referenced exercise is later modified or deleted.

### 4. Weighted Challenge Selection

Daily challenges are generated using a weighted random algorithm. Templates with higher weights (e.g., `complete_exercises`) appear more frequently, while specialized challenges (e.g., `exercise_streak`) provide variety without dominating.

### 5. Middleware-Based Route Protection

Authentication uses a single `authenticate` middleware applied at the router level. This avoids repetitive token validation across endpoints and provides consistent error responses for unauthorized requests.

---

## File Structure

```
backend/
├── index.js                    # Server entry point, route registration, scheduler init
├── package.json                # Dependencies and scripts
├── Dockerfile                  # Container configuration for deployment
├── deploy.sh                   # Deployment script
└── src/
    ├── data/
    │   ├── exercises.js        # Exercise seed data (array export)
    │   ├── exercises.json      # Exercise dataset
    │   ├── seedExercises.js    # Seeding script for exercises collection
    │   ├── whiteNoise.js       # White noise track data
    │   ├── whiteNoise.json     # White noise dataset
    │   └── seedWhiteNoise.js   # Seeding script for white noise collection
    ├── db/
    │   └── connect.js          # MongoDB connection with ping verification
    ├── middleware/
    │   ├── auth.js             # JWT verification and user hydration
    │   └── errorHandler.js     # Centralized error and 404 handling
    ├── models/                 # Mongoose schemas (see MODELS.md)
    └── routes/                 # Express routers (documented below)
        └── services/           # Background services (see MODELS.md)
```

---

## API Routes

### Authentication

| Method | Endpoint        | Auth | Description                           |
| ------ | --------------- | ---- | ------------------------------------- |
| POST   | `/api/register` | No   | Create user account                   |
| POST   | `/api/login`    | No   | Authenticate, receive JWT (1h expiry) |

**Register** validates username (≥3 chars), email format, and password (≥8 chars). Returns `409` on duplicate username/email.

**Login** returns a signed JWT containing `userId`. All protected routes expect `Authorization: Bearer <token>`.

---

### Exercises

| Method | Endpoint                           | Auth | Description                                                   |
| ------ | ---------------------------------- | ---- | ------------------------------------------------------------- |
| GET    | `/api/exercises`                   | No   | Retrieve all exercises                                        |
| GET    | `/api/exercises/:id`               | No   | Retrieve single exercise by ID                                |
| GET    | `/api/exercises/difficulty/:level` | No   | Filter by `easy`, `medium`, `hard`                            |
| GET    | `/api/exercises/type/:type`        | No   | Filter by `strength`, `cardio`, `core`, `mobility`, `stretch` |
| GET    | `/api/exercises/random`            | No   | Get one random exercise                                       |
| POST   | `/api/exercises/:id/complete`      | Yes  | Mark exercise complete, update progress                       |

The `/complete` endpoint creates a `Progress` record, triggers daily challenge progress updates, and prevents duplicate completions for the same exercise on the same day.

---

### Daily Card

| Method | Endpoint     | Auth | Description                                 |
| ------ | ------------ | ---- | ------------------------------------------- |
| GET    | `/api/daily` | Yes  | Get today's exercise card (or generate one) |

Returns a cached daily exercise for the authenticated user. If none exists for today, randomly selects an exercise and persists the assignment.

---

### Daily Challenges

| Method | Endpoint                        | Auth | Description                         |
| ------ | ------------------------------- | ---- | ----------------------------------- |
| GET    | `/api/daily-challenge`          | Yes  | Get today's challenge (or generate) |
| POST   | `/api/daily-challenge/complete` | Yes  | Mark challenge as complete          |
| POST   | `/api/daily-challenge/progress` | Yes  | Update challenge progress manually  |
| GET    | `/api/daily-challenge/stats`    | Yes  | Get challenge completion statistics |
| GET    | `/api/daily-challenge/history`  | Yes  | Get past challenges (default: 30)   |

Challenges are auto-generated at midnight via the scheduler service. Types include `complete_exercises`, `specific_exercise`, `variety_challenge`, and `exercise_streak`.

---

### Progress

| Method | Endpoint                        | Auth | Description                                |
| ------ | ------------------------------- | ---- | ------------------------------------------ |
| POST   | `/api/progress`                 | Yes  | Log completed workout                      |
| GET    | `/api/progress/:userId`         | Yes  | Get all progress records for user          |
| GET    | `/api/progress/:userId/today`   | Yes  | Get today's completed exercises            |
| GET    | `/api/progress/:userId/summary` | Yes  | Get totals, streak, badges, next milestone |

Progress logging triggers streak badge checks. The summary endpoint returns earned badges and progress toward the next milestone.

---

### Streaks & Badges

| Method | Endpoint                     | Auth | Description                                       |
| ------ | ---------------------------- | ---- | ------------------------------------------------- |
| GET    | `/api/streak/badges`         | Yes  | Get authenticated user's badges                   |
| GET    | `/api/streak/badges/:userId` | Yes  | Get badges for a specific user                    |
| GET    | `/api/streak/current`        | Yes  | Get current streak, earned badges, next milestone |
| POST   | `/api/streak/check`          | Yes  | Force badge check and award new badges            |

Milestones: 7 days (Week Warrior), 14 days (Fortnight Fighter), 30 days (Month Master), 60 days (Consistency Champion), 100 days (Century Club).

---

### Leaderboard

| Method | Endpoint                        | Auth | Description                                                |
| ------ | ------------------------------- | ---- | ---------------------------------------------------------- |
| GET    | `/api/leaderboard`              | Yes  | Get ranked users (filter: `cards`, `streak`, `challenges`) |
| GET    | `/api/leaderboard/user/:userId` | Yes  | Get specific user's stats                                  |

Default sort is by total exercise cards completed. The response includes the current user's rank even if outside the returned limit.

---

### Journal

| Method | Endpoint           | Auth | Description                                  |
| ------ | ------------------ | ---- | -------------------------------------------- |
| POST   | `/api/journal`     | Yes  | Create journal entry                         |
| GET    | `/api/journal`     | Yes  | List entries (paginated, filterable by date) |
| GET    | `/api/journal/:id` | Yes  | Get single entry                             |
| PUT    | `/api/journal/:id` | Yes  | Update entry                                 |
| DELETE | `/api/journal/:id` | Yes  | Delete entry                                 |

Entries support optional `mood` (`great`, `good`, `okay`, `bad`, `terrible`) and `tags` array.

---

### Community

| Method | Endpoint                                    | Auth | Description                              |
| ------ | ------------------------------------------- | ---- | ---------------------------------------- |
| POST   | `/api/community/share`                      | Yes  | Create post sharing progress/achievement |
| GET    | `/api/community/feed`                       | Yes  | Get recent posts (limit 50)              |
| POST   | `/api/community/like/:postId`               | Yes  | Like a post                              |
| POST   | `/api/community/unlike/:postId`             | Yes  | Unlike a post                            |
| POST   | `/api/community/comment/:postId`            | Yes  | Add comment to post                      |
| GET    | `/api/community/comments/:postId`           | Yes  | Get comments for a post                  |
| DELETE | `/api/community/comment/:postId/:commentId` | Yes  | Delete a comment                         |
| POST   | `/api/community/friend-request`             | Yes  | Send friend request by username          |
| POST   | `/api/community/friend-accept`              | Yes  | Accept or reject friend request          |
| GET    | `/api/community/friends`                    | Yes  | Get friends list (accepted + pending)    |
| GET    | `/api/community/profile/:username`          | Yes  | Get user profile with stats              |
| POST   | `/api/community/challenge`                  | Yes  | Send workout challenge to friend         |
| GET    | `/api/community/challenges`                 | Yes  | Get all challenges (sent and received)   |
| POST   | `/api/community/challenge-respond`          | Yes  | Accept or decline a challenge            |
| POST   | `/api/community/challenge-complete`         | Yes  | Mark friend challenge as complete        |
| GET    | `/api/community/active-challenge`           | Yes  | Get user's active challenge              |

Friend challenges require an accepted friendship. Users can only have one active challenge at a time.

---

### White Noise

| Method | Endpoint           | Auth | Description                             |
| ------ | ------------------ | ---- | --------------------------------------- |
| GET    | `/api/white-noise` | No   | Get all white noise tracks (name + URL) |

Audio files are hosted on DigitalOcean Spaces. The endpoint returns CDN URLs for direct client playback.

---

## Deployment

### Render (Application Hosting)

The backend is deployed on [Render](https://render.com) as a web service. The `Dockerfile` defines the container:

```dockerfile
FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]
```

Environment variables required on Render:

- `MONGO_URI` — MongoDB Atlas connection string
- `JWT_SECRET` — Secret key for JWT signing
- `PORT` — Typically `3000` (Render maps external ports automatically)

### DigitalOcean Spaces (Asset Storage)

Static assets (exercise demonstration images, white noise audio files) are hosted on a DigitalOcean Space configured with CDN. The `WhiteNoise` model stores full CDN URLs, enabling direct client access without backend proxying.

---

## Data Models & Services

For detailed schema definitions, data flow patterns, and service documentation, see **[MODELS.md](./MODELS.md)**.
