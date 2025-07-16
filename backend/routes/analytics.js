import express from "express";
import { addAnalytics } from "../controllers/analyticsController.js";
import { getAnalyticsByCode } from "../controllers/analyticsGetByCode.js";
const router = express.Router();

router.post("/:short", addAnalytics);
router.get("/:analytics_code", getAnalyticsByCode);

export default router;