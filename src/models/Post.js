import mongoose from "mongoose";

const { Schema } = mongoose;

const commentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true, maxlength: 500 },
  },
  { timestamps: true }
);

const postSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
    // type can be 'progress', 'achievement', 'announcement', etc.
    type: { type: String, default: "progress" },
    // optional metadata (e.g., { reps: 20 } )
    meta: { type: Schema.Types.Mixed },
    // array of user IDs who liked this post
    likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    // array of comments
    comments: [commentSchema],
  },
  { timestamps: true }
);

export default mongoose.model("Post", postSchema);
