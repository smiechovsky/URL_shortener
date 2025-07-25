import express from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  createLink,
  getLink,
  redirectLink,
  getUserLinks,
  getAnalyticsLink,
} from "../controllers/linkController.js";

const router = express.Router();

router.post("/", createLink);
router.get("/user", requireAuth, getUserLinks);
router.get("/analytics/:code", getAnalyticsLink);

// SSE endpoint for virus scan status updates (must be before /:short routes)
router.get("/sse/:short", (req, res) => {
  const { short } = req.params;
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  let lastStatus = null;
  const interval = setInterval(async () => {
    try {
      const { pool } = await import("../utils/db.js");
      const result = await pool.query(
        "SELECT virus_status FROM links WHERE short_code = $1",
        [short]
      );
      if (result.rows.length > 0) {
        const status = result.rows[0].virus_status;
        if (status !== lastStatus) {
          res.write(`data: ${JSON.stringify({ type: 'status_update', status })}\n\n`);
          lastStatus = status;
        }
        // End SSE if status is safe or blocked
        if (status === 'safe' || status === 'blocked') {
          clearInterval(interval);
          res.end();
        }
      }
    } catch (error) {
      console.error('SSE error:', error);
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Database error' })}\n\n`);
    }
  }, 2000);

  req.on('close', () => {
    clearInterval(interval);
  });
});

router.get("/:short", getLink);
router.get("/r/:short", redirectLink);

export default router;