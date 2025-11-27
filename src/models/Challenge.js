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
      enum: ["pending", "accepted", "declined"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Challenge", challengeSchema);
