import mongoose from "mongoose";

const { Schema } = mongoose;

const DailyExerciseSchema = new Schema(
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
      type: String, // Format: YYYY-MM-DD
      required: true,
    },
  },
  { timestamps: true }
);

DailyExerciseSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.model("DailyExercise", DailyExerciseSchema);
