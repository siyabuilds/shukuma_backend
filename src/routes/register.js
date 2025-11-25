import User from "../models/User";
import express from "express";

// /api/register
const registerRouter = express.Router();

const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

const validatePassword = (password) => {
  // Password must be at least 8 characters long
  return password && password.length >= 8;
};

const validateUsername = (username) => {
  // Username must be at least 3 characters long
  return username && username.length >= 3;
};

// Register route
registerRouter.post("/register", async (req, res) => {
  const { username, password, email } = req.body;
  if (!validateUsername(username)) {
    return res.status(400).json({
      message: "Invalid username. It must be at least 3 characters long.",
      code: "INVALID_USERNAME",
    });
  }

  if (!validateEmail(email)) {
    return res
      .status(400)
      .json({ message: "Invalid email format.", code: "INVALID_EMAIL" });
  }

  if (!validatePassword(password)) {
    return res.status(400).json({
      message: "Password must be at least 8 characters long.",
      code: "INVALID_PASSWORD",
    });
  }

  try {
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res
        .status(409)
        .json({ message: "Username or email already in use." });
    }

    const newUser = new User({ username, password, email });
    await newUser.save();

    res.status(201).json({ message: "User registered successfully." });
  } catch (error) {
    res.status(500).json({ message: "Internal server error." });
  }
});

export default registerRouter;
