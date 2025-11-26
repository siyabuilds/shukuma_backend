import fs from "fs";

const types = ["core", "lowerbody", "cardio", "upperbody"];
const totalCards = 52;
const cardsPerType = 13;

// Helper to determine difficulty based on card position within type
function getDifficulty(cardIndex) {
  const pos = (cardIndex % cardsPerType) + 1;
  if (pos <= 4) return "easy";
  if (pos <= 9) return "medium";
  return "hard";
}

// Helper to determine reps based on card position
function getReps(cardIndex) {
  return ((cardIndex % cardsPerType) + 1) * 2;
}

// Base URL for Digital Ocean Spaces
const baseUrl = "https://shukuma.syd1.digitaloceanspaces.com";

const exercises = [];

for (let i = 0; i < totalCards; i++) {
  const type = types[Math.floor(i / cardsPerType)];
  const difficulty = getDifficulty(i);
  const reps = getReps(i);
  const cardNumber = String(i + 1).padStart(3, "0");

  exercises.push({
    name: `Exercise ${cardNumber}`,
    description: `Perform ${reps} reps of Exercise ${cardNumber}`,
    type,
    difficulty,
    demonstration: `${baseUrl}/output_${cardNumber}.png`,
    reps,
  });
}

// Write JSON to file
fs.writeFileSync("exercises.json", JSON.stringify(exercises, null, 2));
console.log(
  "Generated exercises.json with 52 exercises pointing to DO Spaces!"
);
