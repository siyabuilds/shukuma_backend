import { initDb } from "../db/connect.js";
import dotenv from "dotenv";
import fs from "fs";
import WhiteNoise from "../models/WhiteNoise.js";

dotenv.config();

const seedWhiteNoise = async () => {
  try {
    const data = fs.readFileSync("src/data/whiteNoise.json", "utf-8");
    const whiteNoises = JSON.parse(data);

    // Clear existing white noise entries first
    await WhiteNoise.deleteMany({});
    console.log("Cleared existing white noise entries.");

    await WhiteNoise.insertMany(whiteNoises);
    console.log(`Seeded ${whiteNoises.length} white noise entries!`);
  } catch (err) {
    console.error("Error seeding white noise entries:", err);
  }
};

// Run
const run = async () => {
  await initDb();
  await seedWhiteNoise();
  // Exit the process after seeding to avoid hanging
  process.exit(0);
};

run();
