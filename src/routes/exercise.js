import Exercise from "../models/Exercise.js";
import express from "express";
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

// GET /api/exercises/:id
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

// GET /api/exercises/random

exerciseRouter.get("/random", async (req, res) => {
  try {
    const count = await Exercise.countDocuments();
    const random = Math.floor(Math.random() * count);
    const exercise = await Exercise.findOne().skip(random);
    res.json(exercise);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default exerciseRouter;
