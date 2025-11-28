import mongoose from "mongoose";

const { Schema } = mongoose;

const DailyChallengeSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: String, // Format: YYYY-MM-DD
      required: true,
    },
    challengeType: {
      type: String,
      enum: [
        "complete_exercises",
        "exercise_streak",
        "specific_exercise",
        "time_challenge",
        "variety_challenge",
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    target: {
      type: Number,
      required: true, // Target number (e.g., 3 exercises, 5 days, etc.)
    },
    progress: {
      type: Number,
      default: 0,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
    },
    exerciseId: {
      type: Schema.Types.ObjectId,
      ref: "Exercise",
      // Only used for specific_exercise type
    },
    reward: {
      type: String,
      default: "🎉 Great job!",
    },
  },
  { timestamps: true }
);

// Compound index to ensure one challenge per user per day
DailyChallengeSchema.index({ userId: 1, date: 1 }, { unique: true });

// Method to update progress
DailyChallengeSchema.methods.updateProgress = function (increment = 1) {
  this.progress = Math.min(this.progress + increment, this.target);
  if (this.progress >= this.target && !this.isCompleted) {
    this.isCompleted = true;
    this.completedAt = new Date();
  }
  return this.save();
};

export default mongoose.model("DailyChallenge", DailyChallengeSchema);
