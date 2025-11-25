import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import registerRouter from "./src/routes/register.js";
import loginRouter from "./src/routes/login.js";
import { initDb } from "./src/db/connect.js";
import dailyRouter from "./src/routes/daily.js";
import exerciseRouter from "./src/routes/exercise.js";
import progressRouter from "./src/routes/progress.js";
import { authenticate } from "./src/middleware/auth.js";
import {
  errorHandler,
  notFoundHandler,
} from "./src/middleware/errorHandler.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

initDb();

app.get("/", authenticate, (req, res) => {
  res.send("Hello, World!");
});

app.use("/api/register", registerRouter);

app.use("/api/login", loginRouter);

// Protected routes (require authentication)
app.use("/api/daily", authenticate, dailyRouter);

app.use("/api/exercises", exerciseRouter);

app.use("/api/progress", authenticate, progressRouter);

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Error handling middleware - must be last
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
