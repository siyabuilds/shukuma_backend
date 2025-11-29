import express from "express";
import Progress from "../models/Progress.js";
import { updateChallengeProgress } from "../services/dailyChallengeService.js";
import { calculateStreak, checkAndAwardBadges } from "./streak.js";

const progressRouter = express.Router();

// GET /api/progress
progressRouter.post("/", async (req, res) => {
  try {
    const userId = req.user._id;
    const { exerciseId, completedReps, completedSeconds, notes } = req.body;

    const today = new Date().toISOString().split("T")[0]; // Format: YYYY-MM-DD

    // Prevent duplicate entries for today/exercise
    const exists = await Progress.findOne({
      userId,
      exerciseId,
      date: today,
    });

    if (exists) {
      return res
        .status(400)
        .json({ message: "Progress for today already submitted" });
    }

    const progress = await Progress.create({
      userId,
      exerciseId,
      date: today,
      completedReps,
      completedSeconds,
      notes,
    });

    // Update daily challenge progress
    try {
      await updateChallengeProgress(userId, "exercise_completed", {
        exerciseId,
      });
    } catch (challengeError) {
      console.error("Error updating challenge progress:", challengeError);
    }

    // Check for streak badges
    let newBadges = [];
    try {
      const allProgress = await Progress.find({ userId }).sort({ date: -1 });
      const currentStreak = calculateStreak(allProgress);
      newBadges = await checkAndAwardBadges(userId, currentStreak);
    } catch (streakError) {
      console.error("Error checking streak badges:", streakError);
    }

    res.status(201).json({
      progress,
      newBadges,
      badgeEarned: newBadges.length > 0,
    });
  } catch (error) {
    console.error("Progress POST error:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/progress/:userId
progressRouter.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const progress = await Progress.find({ userId })
      .populate("exerciseId")
      .sort({ date: -1 });

    res.json(progress);
  } catch (error) {
    console.error("Progress GET error:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/progress/:userId/today
progressRouter.get("/:userId/today", async (req, res) => {
  try {
    const { userId } = req.params;
    const today = new Date().toISOString().split("T")[0];

    const progress = await Progress.find({ userId, date: today }).populate(
      "exerciseId"
    );

    res.json(progress);
  } catch (error) {
    console.error("Progress today GET error:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/progress/:userId/summary
progressRouter.get("/:userId/summary", async (req, res) => {
  try {
    const { userId } = req.params;

    const allProgress = await Progress.find({ userId }).sort({ date: 1 });

    const totalCompleted = allProgress.length;

    // Calculate current streak using the streak utility
    const currentStreak = calculateStreak(allProgress);

    // Get earned badges
    const StreakBadge = (await import("../models/StreakBadge.js")).default;
    const earnedBadges = await StreakBadge.find({ userId }).sort({
      milestone: 1,
    });

    // Find next milestone
    const { STREAK_MILESTONES } = await import("../models/StreakBadge.js");
    const earnedMilestones = earnedBadges.map((b) => b.milestone);
    const nextMilestone = STREAK_MILESTONES.find(
      (m) => !earnedMilestones.includes(m.days)
    );

    res.json({
      totalCompleted,
      streak: currentStreak,
      earnedBadges,
      nextMilestone: nextMilestone || null,
      progressToNext: nextMilestone
        ? {
            current: currentStreak,
            target: nextMilestone.days,
            percentage: Math.min(
              100,
              Math.round((currentStreak / nextMilestone.days) * 100)
            ),
          }
        : null,
    });
  } catch (error) {
    console.error("Progress summary GET error:", error);
    res.status(500).json({ message: error.message });
  }
});

export default progressRouter;
