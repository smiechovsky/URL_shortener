import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./utils/db.js";
import authRoutes from "./routes/auth.js";
import linkRoutes from "./routes/links.js";
import analyticsRoutes from "./routes/analytics.js";
import statsRoutes from "./routes/stats.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { startVirusScanProcessor } from "./services/virusScanProcessor.js";

dotenv.config();

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/links", linkRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/stats", statsRoutes);

app.get("/", (req, res) => res.send("URL Shortener API running!"));

app.use(errorHandler);

// Poprawiony asynchroniczny start:
const startServer = async () => {
  await connectDB(); // tu masz pewność, że tabele już są!
  app.listen(4000, () => {
    console.log("Backend running on port 4000");
    startVirusScanProcessor(); // teraz już bezpiecznie!
  });
};

startServer();