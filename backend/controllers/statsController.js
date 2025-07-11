import { pool } from "../utils/db.js";

export const getStats = async (req, res, next) => {
  try {
    const totalLinks = await pool.query("SELECT COUNT(*) FROM links");
    const totalScans = await pool.query("SELECT COUNT(*) FROM virus_scans;");
    const totalBlocked = await pool.query("SELECT COUNT(*) FROM links WHERE virus_status='blocked'");
    const totalQueued = await pool.query("SELECT COUNT(*) FROM links WHERE virus_status='queued'");
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last24hStr = last24h.toISOString();
    const totalLinks24h = await pool.query("SELECT COUNT(*) FROM links WHERE created_at >= $1", [last24hStr]);
    const totalScans24h = await pool.query("SELECT COUNT(*) FROM virus_scans WHERE scanned_at >= $1", [last24hStr]);
    const totalBlocked24h = await pool.query("SELECT COUNT(*) FROM links WHERE virus_status='blocked' AND created_at >= $1", [last24hStr]);
    res.json({
      total_links: totalLinks.rows[0].count,
      total_scans: totalScans.rows[0].count,
      total_blocked: totalBlocked.rows[0].count,
      queued_links: totalQueued.rows[0].count,
      last_24h: {
        total_links: totalLinks24h.rows[0].count,
        total_scans: totalScans24h.rows[0].count,
        total_blocked: totalBlocked24h.rows[0].count,
      }
    });
  } catch (err) {
    next(err);
  }
};