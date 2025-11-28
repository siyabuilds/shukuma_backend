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
    const { toUsername, exerciseId, message, durationDays } = req.body;
    if (!toUsername)
      return res.status(400).json({ message: "toUsername required" });

    const toUser = await User.findOne({ username: toUsername });
    if (!toUser)
      return res.status(404).json({ message: "Recipient user not found" });

    // Cannot challenge yourself
    if (toUser._id.equals(fromUser)) {
      return res.status(400).json({ message: "Cannot challenge yourself" });
    }

    // Check if they are friends (bidirectional)
    const friendship = await Friend.findOne({
      $or: [
        { requester: fromUser, recipient: toUser._id, status: "accepted" },
        { requester: toUser._id, recipient: fromUser, status: "accepted" },
      ],
    });

    if (!friendship) {
      return res
        .status(403)
        .json({ message: "You can only challenge friends" });
    }

    // Check if the recipient already has an active challenge
    const activeChallenge = await Challenge.findOne({
      toUser: toUser._id,
      status: "accepted",
      isComplete: false,
    });

    if (activeChallenge) {
      return res.status(400).json({
        message:
          "This user already has an active challenge they need to complete first",
      });
    }

    const challenge = await Challenge.create({
      fromUser,
      toUser: toUser._id,
      exerciseId: exerciseId || null,
      message,
      durationDays: durationDays || 7,
    });

    const populated = await challenge.populate([
      { path: "fromUser", select: "username" },
      { path: "toUser", select: "username" },
      { path: "exerciseId", select: "name" },
    ]);

    res.status(201).json(populated);
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
      .populate("toUser", "username")
      .populate("exerciseId", "name description category");
    res.json(challenges);
  } catch (err) {
    console.error("Get challenges error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Accept or decline a challenge: /api/community/challenge-respond
router.post("/challenge-respond", async (req, res) => {
  try {
    const userId = req.user._id;
    const { challengeId, accept } = req.body;

    if (!challengeId) {
      return res.status(400).json({ message: "challengeId required" });
    }

    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return res.status(404).json({ message: "Challenge not found" });
    }

    // Only the recipient can respond
    if (!challenge.toUser.equals(userId)) {
      return res
        .status(403)
        .json({ message: "Not authorized to respond to this challenge" });
    }

    // Can only respond to pending challenges
    if (challenge.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Challenge is no longer pending" });
    }

    if (accept) {
      // Check if user already has an active challenge
      const activeChallenge = await Challenge.findOne({
        toUser: userId,
        status: "accepted",
        isComplete: false,
        _id: { $ne: challengeId },
      });

      if (activeChallenge) {
        return res.status(400).json({
          message:
            "You already have an active challenge. Complete it first before accepting a new one.",
        });
      }

      challenge.status = "accepted";
      challenge.acceptedAt = new Date();
      // Calculate deadline
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + (challenge.durationDays || 7));
      challenge.deadline = deadline;
    } else {
      challenge.status = "declined";
    }

    await challenge.save();

    const populated = await challenge.populate([
      { path: "fromUser", select: "username" },
      { path: "toUser", select: "username" },
      { path: "exerciseId", select: "name description category" },
    ]);

    res.json(populated);
  } catch (err) {
    console.error("Challenge respond error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Complete a challenge: /api/community/challenge-complete
router.post("/challenge-complete", async (req, res) => {
  try {
    const userId = req.user._id;
    const { challengeId } = req.body;

    if (!challengeId) {
      return res.status(400).json({ message: "challengeId required" });
    }

    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return res.status(404).json({ message: "Challenge not found" });
    }

    // Only the recipient can complete the challenge
    if (!challenge.toUser.equals(userId)) {
      return res
        .status(403)
        .json({ message: "Not authorized to complete this challenge" });
    }

    // Can only complete accepted challenges
    if (challenge.status !== "accepted") {
      return res
        .status(400)
        .json({ message: "Challenge must be accepted before completing" });
    }

    // Check if already completed
    if (challenge.isComplete) {
      return res
        .status(400)
        .json({ message: "Challenge is already completed" });
    }

    challenge.status = "completed";
    challenge.isComplete = true;
    challenge.completedAt = new Date();
    await challenge.save();

    const populated = await challenge.populate([
      { path: "fromUser", select: "username" },
      { path: "toUser", select: "username" },
      { path: "exerciseId", select: "name description category" },
    ]);

    res.json(populated);
  } catch (err) {
    console.error("Challenge complete error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Get user's active challenge: /api/community/active-challenge
router.get("/active-challenge", async (req, res) => {
  try {
    const userId = req.user._id;
    const activeChallenge = await Challenge.findOne({
      toUser: userId,
      status: "accepted",
      isComplete: false,
    })
      .populate("fromUser", "username")
      .populate("toUser", "username")
      .populate("exerciseId", "name description category");

    res.json(activeChallenge || null);
  } catch (err) {
    console.error("Get active challenge error:", err);
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
    const alreadyLiked = post.likes.some((id) => id.equals(userId));
    if (alreadyLiked) {
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
    const isLiked = post.likes.some((id) => id.equals(userId));
    if (!isLiked) {
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

// Get friends list: /api/community/friends
router.get("/friends", async (req, res) => {
  try {
    const userId = req.user._id;

    // Get all accepted friendships (bidirectional)
    const friendships = await Friend.find({
      $or: [
        { requester: userId, status: "accepted" },
        { recipient: userId, status: "accepted" },
      ],
    }).populate([
      { path: "requester", select: "_id username email" },
      { path: "recipient", select: "_id username email" },
    ]);

    // Also get pending requests where current user is recipient
    const pendingRequests = await Friend.find({
      recipient: userId,
      status: "pending",
    }).populate([
      { path: "requester", select: "_id username email" },
      { path: "recipient", select: "_id username email" },
    ]);

    // Also get sent requests where current user is requester
    const sentRequests = await Friend.find({
      requester: userId,
      status: "pending",
    }).populate([
      { path: "requester", select: "_id username email" },
      { path: "recipient", select: "_id username email" },
    ]);

    // Combine all friend relationships
    const allFriends = [...friendships, ...pendingRequests, ...sentRequests];

    res.json(allFriends);
  } catch (err) {
    console.error("Friends list error:", err);
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
    let friendRequestStatus = "none";
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
        if (existingRequest.status === "accepted") {
          friendRequestStatus = "accepted";
        } else if (existingRequest.status === "pending") {
          if (existingRequest.recipient.equals(currentUserId)) {
            friendRequestStatus = "can_accept";
          } else {
            friendRequestStatus = "pending";
          }
        } else {
          friendRequestStatus = existingRequest.status;
        }
      } else {
        friendRequestStatus = "can_request";
      }
    }

    // Get completed challenges count
    const completedChallenges = await Challenge.countDocuments({
      toUser: profileUserId,
      status: "completed",
      isComplete: true,
    });

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
      completedChallenges,
    });
  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
