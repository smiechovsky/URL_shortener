import express from "express";
import { addAnalytics } from "../controllers/analyticsController.js";
const router = express.Router();

router.post("/:short", addAnalytics);

export default router;