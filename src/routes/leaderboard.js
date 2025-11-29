import express from "express";
import User from "../models/User.js";
import Progress from "../models/Progress.js";
import DailyChallenge from "../models/DailyChallenge.js";

const router = express.Router();

// Helper function to calculate current streak from progress entries
const calculateStreak = (progressEntries) => {
  if (!progressEntries || progressEntries.length === 0) return 0;

  const uniqueDates = [
    ...new Set(
      progressEntries.map((p) => new Date(p.date).toISOString().split("T")[0])
    ),
  ].sort((a, b) => new Date(b) - new Date(a));

  if (uniqueDates.length === 0) return 0;

  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  const mostRecentDate = uniqueDates[0];
  if (mostRecentDate !== today && mostRecentDate !== yesterday) {
    return 0;
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

// GET /api/leaderboard
router.get("/", async (req, res) => {
  try {
    const { filter = "cards", limit = 20 } = req.query;
    const limitNum = Math.min(parseInt(limit) || 20, 100);

    // Get all users
    const users = await User.find({}, "_id username createdAt");

    // Build leaderboard data for each user
    const leaderboardData = await Promise.all(
      users.map(async (user) => {
        const totalCards = await Progress.countDocuments({ userId: user._id });
        const progressEntries = await Progress.find(
          { userId: user._id },
          "date"
        ).sort({ date: -1 });
        const currentStreak = calculateStreak(progressEntries);
        const completedChallenges = await DailyChallenge.countDocuments({
          userId: user._id,
          isCompleted: true,
        });

        return {
          _id: user._id,
          username: user.username,
          totalCards,
          currentStreak,
          completedChallenges,
          joinedAt: user.createdAt,
        };
      })
    );

    let sortedData;
    switch (filter) {
      case "streak":
        sortedData = leaderboardData.sort(
          (a, b) => b.currentStreak - a.currentStreak
        );
        break;
      case "challenges":
        sortedData = leaderboardData.sort(
          (a, b) => b.completedChallenges - a.completedChallenges
        );
        break;
      case "cards":
      default:
        sortedData = leaderboardData.sort(
          (a, b) => b.totalCards - a.totalCards
        );
        break;
    }

    // Add rank to each entry
    const rankedData = sortedData.slice(0, limitNum).map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

    // Find current user's rank if not in top results
    const currentUserId = req.user._id.toString();
    const currentUserInResults = rankedData.find(
      (entry) => entry._id.toString() === currentUserId
    );

    let currentUserRank = null;
    if (!currentUserInResults) {
      const fullRankedData = sortedData.map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));
      currentUserRank = fullRankedData.find(
        (entry) => entry._id.toString() === currentUserId
      );
    }

    res.json({
      leaderboard: rankedData,
      currentUserRank: currentUserRank || currentUserInResults,
      filter,
      totalUsers: users.length,
    });
  } catch (error) {
    console.error("Leaderboard error:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/leaderboard/user/:userId
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId, "_id username createdAt");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get total cards (exercises) completed
    const totalCards = await Progress.countDocuments({ userId });

    // Get progress entries for streak calculation
    const progressEntries = await Progress.find({ userId }, "date").sort({
      date: -1,
    });
    const currentStreak = calculateStreak(progressEntries);

    // Get total daily challenges completed
    const completedChallenges = await DailyChallenge.countDocuments({
      userId,
      isCompleted: true,
    });

    res.json({
      _id: user._id,
      username: user.username,
      totalCards,
      currentStreak,
      completedChallenges,
      joinedAt: user.createdAt,
    });
  } catch (error) {
    console.error("User stats error:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
