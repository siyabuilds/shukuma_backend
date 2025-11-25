import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import registerRouter from "./src/routes/register.js";
import loginRouter from "./src/routes/login.js";
import { initDb } from "./src/db/connect.js";
import "./src/routes/daily.js";
import "./src/routes/exercise.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

initDb();

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.use("/api/register", registerRouter);

app.use("/api/login", loginRouter);

app.use("/api/daily", dailyRouter);

app.use("/api/exercises", exerciseRouter);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
