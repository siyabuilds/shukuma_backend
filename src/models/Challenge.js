import mongoose from "mongoose";

const { Schema } = mongoose;

const challengeSchema = new Schema(
  {
    fromUser: { type: Schema.Types.ObjectId, ref: "User", required: true },
    toUser: { type: Schema.Types.ObjectId, ref: "User", required: true },
    exerciseId: { type: Schema.Types.ObjectId, ref: "Exercise" },
    // Store exercise details snapshot for when exercise might be deleted or to avoid extra queries
    exerciseSnapshot: {
      name: { type: String },
      type: { type: String },
      difficulty: { type: String },
      duration: { type: Number },
      reps: { type: Number },
      description: { type: String },
    },
    message: { type: String },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "completed"],
      default: "pending",
    },
    isComplete: { type: Boolean, default: false },
    durationDays: { type: Number, default: 7 },
    acceptedAt: { type: Date },
    completedAt: { type: Date },
    deadline: { type: Date },
    // Track if this is specifically a workout assignment challenge
    isWorkoutAssignment: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Challenge", challengeSchema);
