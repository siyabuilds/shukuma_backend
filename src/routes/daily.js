import express from "express";
import DailyExercise from "../models/Daily.js";
import Exercise from "../models/Exercise.js";

const dailyRouter = express.Router();

// GET /api/daily
dailyRouter.get("/", async (req, res) => {
  try {
    const userId = req.user._id;
    const today = new Date().toISOString().split("T")[0]; // Format: YYYY-MM-DD

    // 1. Try to find today's card
    let daily = await DailyExercise.findOne({ userId, date: today }).populate(
      "exerciseId"
    );

    if (daily) {
      return res.json(daily);
    }

    // 2. If none exists, generate a new card
    const count = await Exercise.countDocuments();

    if (count === 0) {
      return res.status(404).json({
        message:
          "No exercises available. Please add exercises to the database first.",
      });
    }

    const random = Math.floor(Math.random() * count);
    const exercise = await Exercise.findOne().skip(random);

    if (!exercise) {
      return res.status(404).json({
        message: "Failed to fetch exercise. Please try again.",
      });
    }

    daily = await DailyExercise.create({
      userId,
      exerciseId: exercise._id,
      date: today,
    });

    const populated = await daily.populate("exerciseId");

    res.json(populated);
  } catch (error) {
    console.error("Daily card error:", error);
    res.status(500).json({ message: error.message });
  }
});

export default dailyRouter;
