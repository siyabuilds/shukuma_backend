import mongoose from "mongoose";

const { Schema } = mongoose;

// Streak milestones configuration
export const STREAK_MILESTONES = [
  {
    days: 7,
    name: "Week Warrior",
    icon: "fa-fire",
    description: "7-day streak achieved!",
  },
  {
    days: 14,
    name: "Fortnight Fighter",
    icon: "fa-bolt",
    description: "14-day streak achieved!",
  },
  {
    days: 30,
    name: "Month Master",
    icon: "fa-trophy",
    description: "30-day streak achieved!",
  },
  {
    days: 60,
    name: "Consistency Champion",
    icon: "fa-dumbbell",
    description: "60-day streak achieved!",
  },
  {
    days: 100,
    name: "Century Club",
    icon: "fa-star",
    description: "100-day streak achieved!",
  },
];

const streakBadgeSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    milestone: {
      type: Number,
      required: true,
      enum: STREAK_MILESTONES.map((m) => m.days),
    },
    name: {
      type: String,
      required: true,
    },
    icon: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    earnedAt: {
      type: Date,
      default: Date.now,
    },
    // The streak count when the badge was earned
    streakCount: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

// Compound index to prevent duplicate badges for the same user/milestone
streakBadgeSchema.index({ userId: 1, milestone: 1 }, { unique: true });

export default mongoose.model("StreakBadge", streakBadgeSchema);
