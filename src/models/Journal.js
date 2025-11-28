import mongoose from "mongoose";

const { Schema } = mongoose;

const journalSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    title: {
      type: String,
      maxlength: 200,
    },
    content: {
      type: String,
      required: true,
      maxlength: 5000,
    },
    mood: {
      type: String,
      enum: ["great", "good", "okay", "bad", "terrible"],
    },
    tags: [
      {
        type: String,
        maxlength: 50,
      },
    ],
  },
  { timestamps: true }
);

journalSchema.index({ userId: 1, date: -1 });

export default mongoose.model("Journal", journalSchema);
