import express from "express";
import StreakBadge, { STREAK_MILESTONES } from "../models/StreakBadge.js";
import Progress from "../models/Progress.js";

const router = express.Router();

/**
 * Calculate user's current streak based on progress entries
 * Returns the streak count (consecutive days with exercise)
 */
const calculateStreak = (progressEntries) => {
  if (!progressEntries || progressEntries.length === 0) return 0;

  // Get unique dates with progress (sorted descending)
  const uniqueDates = [
    ...new Set(
      progressEntries.map((p) => new Date(p.date).toISOString().split("T")[0])
    ),
  ].sort((a, b) => new Date(b) - new Date(a));

  if (uniqueDates.length === 0) return 0;

  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  // Check if the most recent activity was today or yesterday
  const mostRecentDate = uniqueDates[0];
  if (mostRecentDate !== today && mostRecentDate !== yesterday) {
    return 0; // Streak broken
  }

  // Count consecutive days
  let streak = 1;
  for (let i = 0; i < uniqueDates.length - 1; i++) {
    const current = new Date(uniqueDates[i]);
    const next = new Date(uniqueDates[i + 1]);
    const diffDays = (current - next) / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
};

/**
 * Check and award new streak badges based on current streak
 */
const checkAndAwardBadges = async (userId, currentStreak) => {
  const newBadges = [];

  for (const milestone of STREAK_MILESTONES) {
    if (currentStreak >= milestone.days) {
      // Check if badge already exists
      const existingBadge = await StreakBadge.findOne({
        userId,
        milestone: milestone.days,
      });

      if (!existingBadge) {
        // Award new badge
        const badge = await StreakBadge.create({
          userId,
          milestone: milestone.days,
          name: milestone.name,
          icon: milestone.icon,
          description: milestone.description,
          streakCount: currentStreak,
        });
        newBadges.push(badge);
      }
    }
  }

  return newBadges;
};

// GET /api/streak/badges - Get all badges for current user
router.get("/badges", async (req, res) => {
  try {
    const userId = req.user._id;

    const badges = await StreakBadge.find({ userId }).sort({ milestone: 1 });

    res.json(badges);
  } catch (error) {
    console.error("Get badges error:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/streak/badges/:userId - Get all badges for a specific user (for profiles)
router.get("/badges/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const badges = await StreakBadge.find({ userId }).sort({ milestone: 1 });

    res.json(badges);
  } catch (error) {
    console.error("Get user badges error:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/streak/current - Get current streak and milestone info
router.get("/current", async (req, res) => {
  try {
    const userId = req.user._id;

    // Get all progress for user
    const allProgress = await Progress.find({ userId }).sort({ date: -1 });

    // Calculate current streak
    const currentStreak = calculateStreak(allProgress);

    // Get earned badges
    const earnedBadges = await StreakBadge.find({ userId }).sort({
      milestone: 1,
    });

    // Find next milestone
    const earnedMilestones = earnedBadges.map((b) => b.milestone);
    const nextMilestone = STREAK_MILESTONES.find(
      (m) => !earnedMilestones.includes(m.days)
    );

    // Calculate progress to next milestone
    let progressToNext = null;
    if (nextMilestone) {
      progressToNext = {
        milestone: nextMilestone,
        current: currentStreak,
        target: nextMilestone.days,
        percentage: Math.min(
          100,
          Math.round((currentStreak / nextMilestone.days) * 100)
        ),
      };
    }

    res.json({
      currentStreak,
      earnedBadges,
      nextMilestone: progressToNext,
      allMilestones: STREAK_MILESTONES,
    });
  } catch (error) {
    console.error("Get current streak error:", error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/streak/check - Check and award new badges (called after progress is logged)
router.post("/check", async (req, res) => {
  try {
    const userId = req.user._id;

    // Get all progress for user
    const allProgress = await Progress.find({ userId }).sort({ date: -1 });

    // Calculate current streak
    const currentStreak = calculateStreak(allProgress);

    // Check and award new badges
    const newBadges = await checkAndAwardBadges(userId, currentStreak);

    res.json({
      currentStreak,
      newBadges,
      message:
        newBadges.length > 0
          ? `Congratulations! You earned ${newBadges.length} new badge(s)!`
          : "Keep going! You're building your streak.",
    });
  } catch (error) {
    console.error("Check streak error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Export utility functions for use in other routes
export { calculateStreak, checkAndAwardBadges };

export default router;
