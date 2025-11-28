import express from "express";
import Journal from "../models/Journal.js";

const journalRouter = express.Router();

// POST /api/journal - Create a new journal entry
journalRouter.post("/", async (req, res) => {
  try {
    const userId = req.user._id;
    const { title, content, mood, tags, date } = req.body;

    if (!content) {
      return res.status(400).json({ message: "Content is required" });
    }

    const journal = await Journal.create({
      userId,
      title,
      content,
      mood,
      tags,
      date: date || new Date(),
    });

    res.status(201).json(journal);
  } catch (error) {
    console.error("Journal POST error:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/journal - Get all journal entries for the authenticated user
journalRouter.get("/", async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 20, page = 1, startDate, endDate } = req.query;

    const query = { userId };

    // Optional date filtering
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [journals, total] = await Promise.all([
      Journal.find(query).sort({ date: -1 }).skip(skip).limit(parseInt(limit)),
      Journal.countDocuments(query),
    ]);

    res.json({
      journals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Journal GET error:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/journal/:id - Get a specific journal entry
journalRouter.get("/:id", async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const journal = await Journal.findOne({ _id: id, userId });

    if (!journal) {
      return res.status(404).json({ message: "Journal entry not found" });
    }

    res.json(journal);
  } catch (error) {
    console.error("Journal GET by ID error:", error);
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/journal/:id - Update a journal entry
journalRouter.put("/:id", async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const { title, content, mood, tags, date } = req.body;

    // Only allow updating own journal entries
    const journal = await Journal.findOne({ _id: id, userId });

    if (!journal) {
      return res.status(404).json({ message: "Journal entry not found" });
    }

    // Update fields
    if (title !== undefined) journal.title = title;
    if (content !== undefined) journal.content = content;
    if (mood !== undefined) journal.mood = mood;
    if (tags !== undefined) journal.tags = tags;
    if (date !== undefined) journal.date = new Date(date);

    await journal.save();

    res.json(journal);
  } catch (error) {
    console.error("Journal PUT error:", error);
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/journal/:id - Delete a journal entry
journalRouter.delete("/:id", async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    // Only allow deleting own journal entries
    const journal = await Journal.findOneAndDelete({ _id: id, userId });

    if (!journal) {
      return res.status(404).json({ message: "Journal entry not found" });
    }

    res.json({ message: "Journal entry deleted successfully" });
  } catch (error) {
    console.error("Journal DELETE error:", error);
    res.status(500).json({ message: error.message });
  }
});

export default journalRouter;
