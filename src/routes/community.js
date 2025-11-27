import express from "express";
import Post from "../models/Post.js";
import User from "../models/User.js";
import Friend from "../models/Friend.js";
import Challenge from "../models/Challenge.js";

const router = express.Router();

// Create a post: /api/community/share
router.post("/share", async (req, res) => {
  try {
    const userId = req.user._id;
    const { content, type, meta } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: "Content is required" });
    }

    const post = await Post.create({ userId, content, type, meta });
    const populated = await post.populate("userId", "username email");
    res.status(201).json(populated);
  } catch (err) {
    console.error("Share post error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Get feed: /api/community/feed
// For simplicity return all posts sorted by newest first. Could be limited to friends later.
router.get("/feed", async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("userId", "username");
    res.json(posts);
  } catch (err) {
    console.error("Feed error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Send friend request: /api/community/friend-request
router.post("/friend-request", async (req, res) => {
  try {
    const requester = req.user._id;
    const { username } = req.body;
    if (!username)
      return res.status(400).json({ message: "username required" });

    const recipient = await User.findOne({ username });
    if (!recipient) return res.status(404).json({ message: "User not found" });
    if (recipient._id.equals(requester))
      return res.status(400).json({ message: "Cannot friend yourself" });

    // Prevent duplicate
    const existing = await Friend.findOne({
      requester,
      recipient: recipient._id,
    });
    if (existing)
      return res.status(409).json({ message: "Friend request already exists" });

    const fr = await Friend.create({ requester, recipient: recipient._id });
    res.status(201).json(fr);
  } catch (err) {
    console.error("Friend request error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Accept friend request: /api/community/friend-accept
router.post("/friend-accept", async (req, res) => {
  try {
    const recipient = req.user._id;
    const { requestId, accept } = req.body;
    const fr = await Friend.findById(requestId);
    if (!fr) return res.status(404).json({ message: "Request not found" });
    if (!fr.recipient.equals(recipient))
      return res.status(403).json({ message: "Not authorized" });

    fr.status = accept ? "accepted" : "rejected";
    await fr.save();
    res.json(fr);
  } catch (err) {
    console.error("Friend accept error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Send challenge: /api/community/challenge
router.post("/challenge", async (req, res) => {
  try {
    const fromUser = req.user._id;
    const { toUsername, exerciseId, message } = req.body;
    if (!toUsername)
      return res.status(400).json({ message: "toUsername required" });

    const toUser = await User.findOne({ username: toUsername });
    if (!toUser)
      return res.status(404).json({ message: "Recipient user not found" });

    const challenge = await Challenge.create({
      fromUser,
      toUser: toUser._id,
      exerciseId,
      message,
    });
    res.status(201).json(challenge);
  } catch (err) {
    console.error("Challenge error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Get challenges for user: /api/community/challenges
router.get("/challenges", async (req, res) => {
  try {
    const userId = req.user._id;
    const challenges = await Challenge.find({
      $or: [{ toUser: userId }, { fromUser: userId }],
    })
      .sort({ createdAt: -1 })
      .populate("fromUser", "username")
      .populate("toUser", "username");
    res.json(challenges);
  } catch (err) {
    console.error("Get challenges error:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
