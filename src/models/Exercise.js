import mongoose from "mongoose";

const { Schema } = mongoose;

const ExerciseSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ["core", "lowerbody", "cardio", "upperbody"],
      required: true,
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      required: true,
    },
    demonstration: {
      type: String,
      trim: true,
    },
    duration: {
      type: Number,
      min: 1,
    },
    reps: {
      type: Number,
      min: 1,
    },
  },
  { timestamps: true }
);

// Duration OR reps validation
ExerciseSchema.pre("validate", function () {
  const hasDuration = this.duration != null;
  const hasReps = this.reps != null;

  if (!hasDuration && !hasReps) {
    this.invalidate("duration", "Either duration or reps must be provided");
    this.invalidate("reps", "Either duration or reps must be provided");
  }

  if (hasDuration && hasReps) {
    this.invalidate("duration", "Cannot have both duration and reps");
    this.invalidate("reps", "Cannot have both duration and reps");
  }
});

export default mongoose.model("Exercise", ExerciseSchema);
