import mongoose from "mongoose";

const { Schema } = mongoose;

const progressSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    exerciseId: {
      type: Schema.Types.ObjectId,
      ref: "Exercise",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    completedReps: Number,
    completedSeconds: Number,
    notes: String,
  },
  { timestamps: true }
);

export default mongoose.model("Progress", progressSchema);
