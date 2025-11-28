import express from "express";
import {
  getTodayChallenge,
  updateChallengeProgress,
  markChallengeComplete,
  getChallengeStats,
} from "../services/dailyChallengeService.js";

const dailyChallengeRouter = express.Router();

// GET /api/daily-challenge
dailyChallengeRouter.get("/", async (req, res) => {
  try {
    const userId = req.user._id;
    const challenge = await getTodayChallenge(userId);

    res.json(challenge);
  } catch (error) {
    console.error("Error fetching daily challenge:", error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/daily-challenge/complete
dailyChallengeRouter.post("/complete", async (req, res) => {
  try {
    const userId = req.user._id;
    const { challengeId } = req.body;

    if (!challengeId) {
      return res.status(400).json({ message: "Challenge ID is required" });
    }

    const challenge = await markChallengeComplete(userId, challengeId);

    res.json({
      message: "Challenge completed! 🎉",
      challenge,
    });
  } catch (error) {
    console.error("Error completing challenge:", error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/daily-challenge/progress
dailyChallengeRouter.post("/progress", async (req, res) => {
  try {
    const userId = req.user._id;
    const { activityType, data } = req.body;

    if (!activityType) {
      return res.status(400).json({ message: "Activity type is required" });
    }

    const challenge = await updateChallengeProgress(userId, activityType, data);

    res.json(challenge);
  } catch (error) {
    console.error("Error updating challenge progress:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/daily-challenge/stats
dailyChallengeRouter.get("/stats", async (req, res) => {
  try {
    const userId = req.user._id;
    const stats = await getChallengeStats(userId);

    res.json(stats);
  } catch (error) {
    console.error("Error fetching challenge stats:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/daily-challenge/history
dailyChallengeRouter.get("/history", async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 30 } = req.query;

    const DailyChallenge = (await import("../models/DailyChallenge.js"))
      .default;

    const challenges = await DailyChallenge.find({ userId })
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .populate("exerciseId");

    res.json(challenges);
  } catch (error) {
    console.error("Error fetching challenge history:", error);
    res.status(500).json({ message: error.message });
  }
});

export default dailyChallengeRouter;
