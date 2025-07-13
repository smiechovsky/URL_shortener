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

// CORS configuration for multiple environments
const allowedOrigins = [
  process.env.RAILWAY_URL,
  process.env.FRONTEND_URL,
].filter(Boolean); // Remove undefined values

app.use(cors({ 
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true 
}));

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
  const PORT = process.env.BACKEND_PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
    startVirusScanProcessor(); // teraz już bezpiecznie!
  });
};

startServer();