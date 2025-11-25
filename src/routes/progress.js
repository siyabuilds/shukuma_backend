import express from "express";
import Progress from "../models/Progress.js";

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

    res.status(201).json(progress);
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

    // Calculate simple streak
    let streak = 0;
    let lastDate = null;

    allProgress.forEach((p) => {
      const pDate = new Date(p.date).toISOString().split("T")[0];
      if (!lastDate) {
        streak = 1;
      } else {
        const prev = new Date(lastDate);
        const curr = new Date(pDate);
        const diff = (curr - prev) / (1000 * 60 * 60 * 24);
        if (diff === 1) {
          streak += 1;
        } else if (diff > 1) {
          streak = 1;
        }
      }
      lastDate = pDate;
    });

    res.json({
      totalCompleted,
      streak,
    });
  } catch (error) {
    console.error("Progress summary GET error:", error);
    res.status(500).json({ message: error.message });
  }
});

export default progressRouter;
