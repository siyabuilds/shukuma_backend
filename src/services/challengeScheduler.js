import { generateDailyChallenge } from "./dailyChallengeService.js";
import User from "../models/User.js";

let schedulerInterval = null;

// Calculate milliseconds until next midnight
function msUntilMidnight() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow - now;
}

// Generate challenges for all users
async function generateChallengesForAllUsers() {
  try {
    console.log(
      `[Daily Challenge Scheduler] Generating challenges at ${new Date().toISOString()}`
    );

    const users = await User.find({}).select("_id").limit(1000);

    console.log(`[Daily Challenge Scheduler] Found ${users.length} users`);

    let successCount = 0;
    let errorCount = 0;

    // Generate challenges for each user
    for (const user of users) {
      try {
        await generateDailyChallenge(user._id);
        successCount++;
      } catch (error) {
        console.error(
          `[Daily Challenge Scheduler] Error for user ${user._id}:`,
          error.message
        );
        errorCount++;
      }
    }

    console.log(
      `[Daily Challenge Scheduler] Completed: ${successCount} success, ${errorCount} errors`
    );
  } catch (error) {
    console.error("[Daily Challenge Scheduler] Fatal error:", error);
  }
}

// Schedule the next challenge generation at midnight
function scheduleNext() {
  const ms = msUntilMidnight();
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

  console.log(
    `[Daily Challenge Scheduler] Next generation in ${hours}h ${minutes}m`
  );

  schedulerInterval = setTimeout(async () => {
    await generateChallengesForAllUsers();
    scheduleNext(); // Schedule the next one
  }, ms);
}

// Start the daily challenge scheduler
export function startDailyChallengeScheduler() {
  console.log("[Daily Challenge Scheduler] Starting...");
  scheduleNext();
}

// Stop the daily challenge scheduler
export function stopDailyChallengeScheduler() {
  if (schedulerInterval) {
    clearTimeout(schedulerInterval);
    schedulerInterval = null;
    console.log("[Daily Challenge Scheduler] Stopped");
  }
}

// Manually trigger challenge generation (for testing)
export async function triggerManualGeneration() {
  console.log("[Daily Challenge Scheduler] Manual generation triggered");
  await generateChallengesForAllUsers();
}
