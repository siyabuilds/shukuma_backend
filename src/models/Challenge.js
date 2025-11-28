import mongoose from "mongoose";

const { Schema } = mongoose;

const challengeSchema = new Schema(
  {
    fromUser: { type: Schema.Types.ObjectId, ref: "User", required: true },
    toUser: { type: Schema.Types.ObjectId, ref: "User", required: true },
    exerciseId: { type: Schema.Types.ObjectId, ref: "Exercise" },
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
  },
  { timestamps: true }
);

export default mongoose.model("Challenge", challengeSchema);
