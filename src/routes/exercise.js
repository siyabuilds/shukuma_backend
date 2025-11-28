import Exercise from "../models/Exercise.js";
import Progress from "../models/Progress.js";
import { updateChallengeProgress } from "../services/dailyChallengeService.js";
import express from "express";
import { authenticate } from "../middleware/auth.js";

const exerciseRouter = express.Router();

// GET /api/exercises
exerciseRouter.get("/", async (req, res) => {
  try {
    const exercises = await Exercise.find();
    res.json(exercises);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const validDifficulties = ["easy", "medium", "hard"];
const validTypes = ["strength", "cardio", "core", "mobility", "stretch"];

// GET /api/exercises/difficulty/:level
exerciseRouter.get("/difficulty/:level", async (req, res) => {
  const { level } = req.params;
  try {
    if (!validDifficulties.includes(level)) {
      return res.status(400).json({ message: "Invalid difficulty level" });
    }
    const exercises = await Exercise.find({ difficulty: level });
    res.json(exercises);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/exercises/type/:type
exerciseRouter.get("/type/:type", async (req, res) => {
  const { type } = req.params;
  try {
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: "Invalid exercise type" });
    }
    const exercises = await Exercise.find({ type });
    res.json(exercises);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/exercises/random
exerciseRouter.get("/random", async (req, res) => {
  try {
    const count = await Exercise.countDocuments();
    if (count === 0) {
      return res.status(404).json({ message: "No exercises available" });
    }
    const random = Math.floor(Math.random() * count);
    const exercise = await Exercise.findOne().skip(random);
    res.json(exercise);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/exercises/:id - Must be last due to wildcard parameter
exerciseRouter.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const exercise = await Exercise.findById(id);
    if (!exercise) {
      return res.status(404).json({ message: "Exercise not found" });
    }
    res.json(exercise);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/exercises/:id/complete - Mark an exercise as complete (requires auth)
exerciseRouter.post("/:id/complete", authenticate, async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  try {
    // Verify exercise exists
    const exercise = await Exercise.findById(id);
    if (!exercise) {
      return res.status(404).json({ message: "Exercise not found" });
    }

    const today = new Date().toISOString().split("T")[0];

    // Check if already completed today
    const existingProgress = await Progress.findOne({
      userId,
      exerciseId: id,
      date: today,
    });

    if (existingProgress) {
      return res.status(400).json({
        message: "You already completed this exercise today!",
        progress: existingProgress,
      });
    }

    // Create progress record
    const progress = await Progress.create({
      userId,
      exerciseId: id,
      date: today,
      completedReps: exercise.reps || 0,
      completedSeconds: exercise.duration || 0,
      notes: `Completed ${exercise.name}`,
    });

    // Update daily challenge progress
    try {
      await updateChallengeProgress(userId, "exercise_completed", {
        exerciseId: id,
      });
    } catch (challengeError) {
      console.error("Error updating challenge progress:", challengeError);
      // Don't fail the completion if challenge update fails
    }

    res.status(201).json({
      message: `Great job! ${exercise.name} completed! 💪`,
      progress,
      exercise,
    });
  } catch (error) {
    console.error("Exercise complete error:", error);
    res.status(500).json({ message: error.message });
  }
});

export default exerciseRouter;
