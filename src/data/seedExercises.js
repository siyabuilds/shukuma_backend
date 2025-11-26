import { initDb } from "../db/connect.js";
import dotenv from "dotenv";
import fs from "fs";
import Exercise from "../models/Exercise.js";

dotenv.config();

const seedExercises = async () => {
  try {
    const data = fs.readFileSync("src/data/exercises.json", "utf-8");
    const exercises = JSON.parse(data);

    // Clear existing exercises first
    await Exercise.deleteMany({});
    console.log("Cleared existing exercises.");

    await Exercise.insertMany(exercises);
    console.log(`Seeded ${exercises.length} exercises!`);
  } catch (err) {
    console.error("Error seeding exercises:", err);
  }
};

// Run
const run = async () => {
  await initDb();
  await seedExercises();
  // Exit the process after seeding to avoid hanging
  process.exit(0);
};

run();
