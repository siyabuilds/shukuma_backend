import DailyChallenge from "../models/DailyChallenge.js";
import Exercise from "../models/Exercise.js";
import Progress from "../models/Progress.js";

/**
 * Service to generate daily challenges for users
 */

const CHALLENGE_TEMPLATES = [
  {
    type: "complete_exercises",
    titleGenerator: (target) => `Complete ${target} Exercises Today`,
    descriptionGenerator: (target) =>
      `Challenge yourself to complete ${target} exercises today. You've got this!`,
    targetRange: [2, 5],
    weight: 3,
  },
  {
    type: "specific_exercise",
    titleGenerator: (target, exerciseName) => `Master: ${exerciseName}`,
    descriptionGenerator: (target, exerciseName) =>
      `Focus on the ${exerciseName} exercise today. Complete it to finish the challenge.`,
    targetRange: [1, 1],
    weight: 2,
    requiresExercise: true,
  },
  {
    type: "variety_challenge",
    titleGenerator: (target) => `Try ${target} Different Exercises`,
    descriptionGenerator: (target) =>
      `Expand your horizons! Complete ${target} different exercises today.`,
    targetRange: [3, 5],
    weight: 2,
  },
  {
    type: "exercise_streak",
    titleGenerator: (target) => `Build Your Streak`,
    descriptionGenerator: (target) =>
      `Complete at least one exercise today to maintain your ${target}-day streak goal!`,
    targetRange: [1, 1],
    weight: 1,
  },
];

// Utility to get a random integer in range [min, max]
function getRandomInRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Select a challenge template based on weights
function selectChallengeTemplate() {
  const totalWeight = CHALLENGE_TEMPLATES.reduce(
    (sum, template) => sum + template.weight,
    0
  );
  let random = Math.random() * totalWeight;

  for (const template of CHALLENGE_TEMPLATES) {
    random -= template.weight;
    if (random <= 0) {
      return template;
    }
  }

  return CHALLENGE_TEMPLATES[0]; // Fallback
}

// Generate a daily challenge for a user
export async function generateDailyChallenge(userId) {
  if (!userId) {
    console.log("Daily challenge generation skipped - no userId provided");
    return null;
  }

  const today = new Date().toISOString().split("T")[0];

  const existing = await DailyChallenge.findOne({ userId, date: today });
  if (existing) {
    return existing;
  }

  const template = selectChallengeTemplate();
  const target = getRandomInRange(...template.targetRange);

  let exerciseId = null;
  let exerciseName = "";

  // If challenge requires a specific exercise, select one
  if (template.requiresExercise) {
    const exerciseCount = await Exercise.countDocuments();
    if (exerciseCount > 0) {
      const random = Math.floor(Math.random() * exerciseCount);
      const exercise = await Exercise.findOne().skip(random);
      if (exercise) {
        exerciseId = exercise._id;
        exerciseName = exercise.name;
      }
    }
  }

  // Create the challenge
  const challenge = await DailyChallenge.create({
    userId,
    date: today,
    challengeType: template.type,
    title: template.titleGenerator(target, exerciseName),
    description: template.descriptionGenerator(target, exerciseName),
    target,
    exerciseId,
    progress: 0,
    isCompleted: false,
  });

  return challenge;
}

/**
 * Get or create today's challenge for a user
 */
export async function getTodayChallenge(userId) {
  const today = new Date().toISOString().split("T")[0];

  let challenge = await DailyChallenge.findOne({
    userId,
    date: today,
  }).populate("exerciseId");

  if (!challenge) {
    challenge = await generateDailyChallenge(userId);
    if (challenge.exerciseId) {
      await challenge.populate("exerciseId");
    }
  }

  return challenge;
}

/**
 * Update challenge progress based on user activity
 */
export async function updateChallengeProgress(userId, activityType, data = {}) {
  const today = new Date().toISOString().split("T")[0];
  const challenge = await DailyChallenge.findOne({ userId, date: today });

  if (!challenge || challenge.isCompleted) {
    return challenge;
  }

  let increment = 0;

  switch (challenge.challengeType) {
    case "complete_exercises":
      if (activityType === "exercise_completed") {
        increment = 1;
      }
      break;

    case "specific_exercise":
      if (
        activityType === "exercise_completed" &&
        data.exerciseId &&
        challenge.exerciseId &&
        data.exerciseId.toString() === challenge.exerciseId.toString()
      ) {
        increment = 1;
      }
      break;

    case "variety_challenge":
      if (activityType === "exercise_completed" && data.exerciseId) {
        // Track unique exercises (you might want to add a field to store completed exercise IDs)
        increment = 1;
      }
      break;

    case "exercise_streak":
      if (activityType === "exercise_completed") {
        increment = 1;
      }
      break;

    default:
      break;
  }

  if (increment > 0) {
    await challenge.updateProgress(increment);
  }

  return challenge;
}

/**
 * Mark a challenge as complete manually
 */
export async function markChallengeComplete(userId, challengeId) {
  const challenge = await DailyChallenge.findOne({
    _id: challengeId,
    userId,
  });

  if (!challenge) {
    throw new Error("Challenge not found");
  }

  if (challenge.isCompleted) {
    return challenge;
  }

  challenge.progress = challenge.target;
  challenge.isCompleted = true;
  challenge.completedAt = new Date();

  await challenge.save();
  return challenge;
}

/**
 * Get challenge statistics for a user
 */
export async function getChallengeStats(userId) {
  const challenges = await DailyChallenge.find({ userId });

  const total = challenges.length;
  const completed = challenges.filter((c) => c.isCompleted).length;
  const streak = await calculateCurrentStreak(userId);

  return {
    total,
    completed,
    completionRate: total > 0 ? ((completed / total) * 100).toFixed(1) : 0,
    currentStreak: streak,
  };
}

/**
 * Calculate the current streak of completed daily challenges
 */
async function calculateCurrentStreak(userId) {
  const challenges = await DailyChallenge.find({ userId }).sort({ date: -1 });

  let streak = 0;
  const today = new Date().toISOString().split("T")[0];
  let currentDate = new Date(today);

  for (const challenge of challenges) {
    const challengeDate = challenge.date;
    const expectedDate = currentDate.toISOString().split("T")[0];

    if (challengeDate === expectedDate && challenge.isCompleted) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else if (challengeDate === expectedDate && !challenge.isCompleted) {
      // Challenge exists but not completed - streak broken
      break;
    } else if (challengeDate < expectedDate) {
      // Gap in challenges - streak broken
      break;
    }
  }

  return streak;
}
