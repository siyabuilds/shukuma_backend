# Data Models & Services

This document details the Mongoose schemas and background services powering the Shukuma backend. Each model section includes the schema structure, field explanations, and data flow context.

---

## Models

### User

```javascript
{
  username: String,      // Unique, required, ≥3 characters
  password: String,      // Hashed via bcrypt pre-save hook
  email: String,         // Unique, required, validated format
  createdAt: Date,       // Auto-generated
  updatedAt: Date        // Auto-generated
}
```

**Data Flow:**

- Created via `/api/register` with raw password → hashed automatically before save
- Queried during `/api/login` → `comparePassword()` method validates credentials
- Referenced by: `Progress`, `Daily`, `DailyChallenge`, `Post`, `Friend`, `Challenge`, `Journal`, `StreakBadge`

**Methods:**

- `comparePassword(plaintext)` — Async bcrypt comparison, returns boolean

---

### Exercise

```javascript
{
  name: String,          // Required, trimmed
  description: String,   // Optional
  type: String,          // Enum: "core", "lowerbody", "cardio", "upperbody"
  difficulty: String,    // Enum: "easy", "medium", "hard"
  demonstration: String, // URL to image/video (hosted on DO Spaces)
  duration: Number,      // Seconds (mutually exclusive with reps)
  reps: Number,          // Repetitions (mutually exclusive with duration)
  createdAt: Date,
  updatedAt: Date
}
```

**Data Flow:**

- Seeded via `seedExercises.js` from `exercises.json`
- Queried by exercise routes for listing and filtering
- Referenced by: `Daily`, `Progress`, `DailyChallenge`, `Challenge`

**Validation:**

- Pre-validate hook enforces: exactly one of `duration` OR `reps` must be set (not both, not neither)

---

### DailyExercise (Daily Card)

```javascript
{
  userId: ObjectId,      // Ref: User
  exerciseId: ObjectId,  // Ref: Exercise
  date: String,          // Format: "YYYY-MM-DD"
  createdAt: Date,
  updatedAt: Date
}
```

**Index:** Compound unique index on `{ userId, date }` ensures one card per user per day.

**Data Flow:**

1. User requests `/api/daily`
2. Query for existing record matching `userId` + today's date
3. If none: randomly select exercise → create `DailyExercise` → populate and return
4. If exists: populate `exerciseId` → return

---

### Progress

```javascript
{
  userId: ObjectId,         // Ref: User
  exerciseId: ObjectId,     // Ref: Exercise
  date: Date,               // When completed
  completedReps: Number,    // Optional
  completedSeconds: Number, // Optional
  notes: String,            // Optional user notes
  createdAt: Date,
  updatedAt: Date
}
```

**Data Flow:**

- Created via `/api/progress` POST or `/api/exercises/:id/complete`
- Duplicate check: same `userId` + `exerciseId` + date (string comparison) rejects second attempt
- After creation: triggers `updateChallengeProgress()` and `checkAndAwardBadges()`
- Queried for: streak calculation, summary stats, leaderboard ranking

**Streak Calculation:**

```
1. Get unique dates from progress (descending)
2. Check if most recent is today or yesterday (else streak = 0)
3. Count consecutive days backward (diff = 1 day)
```

---

### DailyChallenge

```javascript
{
  userId: ObjectId,         // Ref: User
  date: String,             // Format: "YYYY-MM-DD"
  challengeType: String,    // Enum: "complete_exercises", "exercise_streak",
                            //       "specific_exercise", "time_challenge", "variety_challenge"
  title: String,            // Generated from template
  description: String,      // Generated from template
  target: Number,           // Goal value (e.g., 3 exercises)
  progress: Number,         // Current progress toward target
  isCompleted: Boolean,     // Auto-set when progress ≥ target
  completedAt: Date,        // Set on completion
  exerciseId: ObjectId,     // Ref: Exercise (for specific_exercise type only)
  reward: String,           // Completion message
  createdAt: Date,
  updatedAt: Date
}
```

**Index:** Compound unique index on `{ userId, date }`.

**Methods:**

- `updateProgress(increment)` — Adds to progress, auto-completes if target reached, saves document

**Data Flow:**

1. Scheduler calls `generateDailyChallenge()` at midnight for all users
2. Weighted random selects challenge template
3. If `specific_exercise` type: randomly picks an exercise
4. User activity triggers `updateChallengeProgress()` → matches activity type to challenge type

---

### StreakBadge

```javascript
{
  userId: ObjectId,     // Ref: User
  milestone: Number,    // Enum: 7, 14, 30, 60, 100
  name: String,         // Badge name (e.g., "Week Warrior")
  icon: String,         // FontAwesome class (e.g., "fa-fire")
  description: String,  // Achievement description
  earnedAt: Date,       // When badge was earned
  streakCount: Number,  // Streak length when earned
  createdAt: Date,
  updatedAt: Date
}
```

**Index:** Compound unique index on `{ userId, milestone }` prevents duplicate badges.

**Milestones Configuration:**
| Days | Name | Icon |
|------|-----------------------|--------------|
| 7 | Week Warrior | fa-fire |
| 14 | Fortnight Fighter | fa-bolt |
| 30 | Month Master | fa-trophy |
| 60 | Consistency Champion | fa-dumbbell |
| 100 | Century Club | fa-star |

**Data Flow:**

- After progress is logged → `checkAndAwardBadges(userId, currentStreak)`
- Iterates milestones ≤ current streak → checks for existing badge → creates if missing
- Returns array of newly awarded badges

---

### Post

```javascript
{
  userId: ObjectId,     // Ref: User
  content: String,      // Required, post body
  type: String,         // Default: "progress" (also: "achievement", "announcement")
  meta: Mixed,          // Optional metadata (e.g., { reps: 20 })
  likes: [ObjectId],    // Array of User refs who liked
  comments: [{
    userId: ObjectId,   // Ref: User
    content: String,    // Max 500 chars
    createdAt: Date,
    updatedAt: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
```

**Data Flow:**

- Created via `/api/community/share`
- Feed queries: sorted by `createdAt` descending, limited to 50, populated with usernames
- Likes: push/pull user ID from `likes` array
- Comments: embedded subdocuments with separate validation

---

### Friend

```javascript
{
  requester: ObjectId,  // Ref: User (who sent request)
  recipient: ObjectId,  // Ref: User (who received request)
  status: String,       // Enum: "pending", "accepted", "rejected"
  createdAt: Date,
  updatedAt: Date
}
```

**Data Flow:**

- Created via `/api/community/friend-request` with `status: "pending"`
- Recipient calls `/api/community/friend-accept` to set `status: "accepted"` or `"rejected"`
- Friendship queries check both directions: `(requester, recipient)` OR `(recipient, requester)`
- Required for sending workout challenges between users

---

### Challenge (Friend Challenge)

```javascript
{
  fromUser: ObjectId,       // Ref: User (challenger)
  toUser: ObjectId,         // Ref: User (recipient)
  exerciseId: ObjectId,     // Ref: Exercise (optional)
  exerciseSnapshot: {       // Denormalized exercise data
    name: String,
    type: String,
    difficulty: String,
    duration: Number,
    reps: Number,
    description: String
  },
  message: String,          // Optional challenge message
  status: String,           // Enum: "pending", "accepted", "declined", "completed"
  isComplete: Boolean,      // Completion flag
  durationDays: Number,     // Default: 7
  acceptedAt: Date,
  completedAt: Date,
  deadline: Date,           // Calculated: acceptedAt + durationDays
  isWorkoutAssignment: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

**Data Flow:**

1. User A (with accepted friendship to User B) creates challenge via `/api/community/challenge`
2. `exerciseSnapshot` captured at creation time
3. User B accepts via `/api/community/challenge-respond` → `deadline` calculated
4. User B completes via `/api/community/challenge-complete`

**Constraints:**

- Users can only challenge friends
- Recipients can only have one active challenge at a time

---

### Journal

```javascript
{
  userId: ObjectId,     // Ref: User
  date: Date,           // Entry date (default: now)
  title: String,        // Optional, max 200 chars
  content: String,      // Required, max 5000 chars
  mood: String,         // Enum: "great", "good", "okay", "bad", "terrible"
  tags: [String],       // Array of tags, each max 50 chars
  createdAt: Date,
  updatedAt: Date
}
```

**Index:** Compound index on `{ userId, date }` (descending) for efficient user timeline queries.

**Data Flow:**

- Full CRUD via `/api/journal` endpoints
- Paginated listing with optional date range filtering
- Ownership enforced: users can only access their own entries

---

### WhiteNoise

```javascript
{
  name: String,         // Required, unique (e.g., "Rain", "Ocean Waves")
  url: String,          // Required, full CDN URL to audio file
  createdAt: Date,
  updatedAt: Date
}
```

**Data Flow:**

- Seeded via `seedWhiteNoise.js` from `whiteNoise.json`
- Audio files stored on DigitalOcean Spaces CDN
- GET `/api/white-noise` returns all tracks with name and URL for client playback

---

## Services

### Challenge Scheduler (`challengeScheduler.js`)

A background service that generates daily challenges for all users at midnight.

**Initialization:**

- Called from `index.js` after server starts: `startDailyChallengeScheduler()`
- Calculates milliseconds until next midnight → sets timeout

**Execution Flow:**

```
1. Timeout fires at midnight
2. Query all users (limit 1000)
3. For each user: call generateDailyChallenge(userId)
4. Log success/error counts
5. Schedule next execution (recursive timeout)
```

**Exports:**

- `startDailyChallengeScheduler()` — Initialize scheduler
- `stopDailyChallengeScheduler()` — Cancel scheduled timeout
- `triggerManualGeneration()` — Force immediate generation (testing)

---

### Daily Challenge Service (`dailyChallengeService.js`)

Core logic for challenge generation and progress tracking.

**Challenge Templates:**
| Type | Weight | Target Range | Description |
|--------------------|--------|--------------|-----------------------------------|
| complete_exercises | 3 | 2-5 | Complete N exercises today |
| specific_exercise | 2 | 1 | Complete a specific exercise |
| variety_challenge | 2 | 3-5 | Complete N different exercises |
| exercise_streak | 1 | 1 | Maintain streak by exercising |

**Key Functions:**

`generateDailyChallenge(userId)`

- Returns existing challenge if one exists for today
- Otherwise: weighted random template selection → create challenge

`getTodayChallenge(userId)`

- Get-or-create wrapper for today's challenge
- Populates exercise reference if applicable

`updateChallengeProgress(userId, activityType, data)`

- Called after exercise completion
- Matches `activityType` to `challengeType` → increments progress
- For `specific_exercise`: validates `data.exerciseId` matches challenge

`markChallengeComplete(userId, challengeId)`

- Manual completion endpoint handler
- Sets `isCompleted: true` and `completedAt` timestamp

`getChallengeStats(userId)`

- Aggregates: total challenges, completed count, completion rate, current streak

---

## Data Relationships Diagram

```
User
 ├── Progress[] ────────────┐
 │    └── exerciseId ───────┼──→ Exercise
 ├── DailyExercise[] ───────┤
 │    └── exerciseId ───────┘
 ├── DailyChallenge[]
 │    └── exerciseId ───────→ Exercise (optional)
 ├── StreakBadge[]
 ├── Journal[]
 ├── Post[]
 │    ├── likes[] ──────────→ User[]
 │    └── comments[]
 │         └── userId ──────→ User
 ├── Friend[] (as requester or recipient)
 │    ├── requester ────────→ User
 │    └── recipient ────────→ User
 └── Challenge[] (as fromUser or toUser)
      ├── fromUser ─────────→ User
      ├── toUser ───────────→ User
      └── exerciseId ───────→ Exercise (optional)

WhiteNoise (standalone, CDN URLs)
```
