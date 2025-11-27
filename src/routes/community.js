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

// Like a post: /api/community/like/:postId
router.post("/like/:postId", async (req, res) => {
  try {
    const userId = req.user._id;
    const { postId } = req.params;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Check if already liked
    if (post.likes.includes(userId)) {
      return res.status(400).json({ message: "Already liked this post" });
    }

    post.likes.push(userId);
    await post.save();

    res.json({ message: "Post liked", likes: post.likes.length });
  } catch (err) {
    console.error("Like post error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Unlike a post: /api/community/unlike/:postId
router.post("/unlike/:postId", async (req, res) => {
  try {
    const userId = req.user._id;
    const { postId } = req.params;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Check if not liked
    if (!post.likes.includes(userId)) {
      return res.status(400).json({ message: "Post not liked yet" });
    }

    post.likes = post.likes.filter((id) => !id.equals(userId));
    await post.save();

    res.json({ message: "Post unliked", likes: post.likes.length });
  } catch (err) {
    console.error("Unlike post error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Get user profile: /api/community/profile/:username
router.get("/profile/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const currentUserId = req.user._id;

    // Find the profile user
    const profileUser = await User.findOne({ username }).select("-password");
    if (!profileUser)
      return res.status(404).json({ message: "User not found" });

    const profileUserId = profileUser._id;

    // Get accepted friends (bidirectional)
    const friendships = await Friend.find({
      $or: [
        { requester: profileUserId, status: "accepted" },
        { recipient: profileUserId, status: "accepted" },
      ],
    }).populate(["requester", "recipient"]);

    const friends = friendships.map((fr) => {
      if (fr.requester._id.equals(profileUserId)) {
        return { _id: fr.recipient._id, username: fr.recipient.username };
      } else {
        return { _id: fr.requester._id, username: fr.requester.username };
      }
    });

    const friendCount = friends.length;

    // Get progress stats
    const Progress = (await import("../models/Progress.js")).default;
    const allProgress = await Progress.find({ userId: profileUserId }).sort({
      date: 1,
    });
    const totalCompleted = allProgress.length;

    // Calculate streak
    let streak = 0;
    let lastDate = null;

    allProgress.forEach((p) => {
      const pDate = new Date(p.date).toISOString().split("T")[0];
      if (!lastDate) {
        streak = 1;
      } else {
        const prev = new Date(lastDate);
        const curr = new Date(pDate);
        const diff = (curr - prev) / (1000 * 60 * 60 * 24);
        if (diff === 1) {
          streak += 1;
        } else if (diff > 1) {
          streak = 1;
        }
      }
      lastDate = pDate;
    });

    // Determine friend request status
    let friendRequestStatus = "none"; // none, pending, accepted, can_request
    if (currentUserId.equals(profileUserId)) {
      friendRequestStatus = "self";
    } else {
      const existingRequest = await Friend.findOne({
        $or: [
          { requester: currentUserId, recipient: profileUserId },
          { requester: profileUserId, recipient: currentUserId },
        ],
      });

      if (existingRequest) {
        friendRequestStatus = existingRequest.status;
      } else {
        friendRequestStatus = "can_request";
      }
    }

    res.json({
      user: {
        _id: profileUser._id,
        username: profileUser.username,
        email: profileUser.email,
      },
      friends,
      friendCount,
      exercisesCompleted: totalCompleted,
      currentStreak: streak,
      friendRequestStatus,
    });
  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
