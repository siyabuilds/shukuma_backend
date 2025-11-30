import fs from "fs";

const whiteNoiseClips = [
  "bird_sounds",
  "brown_noise",
  "ocean_waves",
  "forest_river",
  "thunderstorm",
];
const baseUrl = "https://shukuma.syd1.digitaloceanspaces.com/ambient";

const whiteNoiseData = whiteNoiseClips.map((clip) => ({
  name: clip.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  url: `${baseUrl}/${clip}.mp3`,
}));

// Write JSON to file
fs.writeFileSync("whiteNoise.json", JSON.stringify(whiteNoiseData, null, 2));
console.log(
  "Generated whiteNoise.json with white noise clip data pointing to DO Spaces!"
);
