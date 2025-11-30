import WhiteNoise from "../models/WhiteNoise.js";
import express from "express";

const whiteNoiseRouter = express.Router();

// GET /api/white-noise
whiteNoiseRouter.get("/", async (req, res) => {
  try {
    const whiteNoises = await WhiteNoise.find({}, "name url").sort({ name: 1 });
    res.json(whiteNoises);
  } catch (err) {
    console.error("Error fetching white noise list:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default whiteNoiseRouter;
