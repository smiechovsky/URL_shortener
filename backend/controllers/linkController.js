import { pool } from "../utils/db.js";
import { checkVirusTotal } from "../middleware/virusTotal.js";
import crypto from "crypto";

const generateCode = (len = 6) =>
  crypto.randomBytes(len).toString("base64url").slice(0, len);

export const createLink = async (req, res, next) => {
  const { original_url, analytics_level = "minimal", redirect_type = "immediate", delay_seconds = null } = req.body;
  const user_id = req.user?.id || null;
  const short_code = generateCode(6);
  const analytics_code = user_id ? null : generateCode(12);
  try {
    const sql = `INSERT INTO links (user_id, original_url, short_code, analytics_code, analytics_level, virus_status, redirect_type, delay_seconds)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`;
    const params = [user_id, original_url, short_code, analytics_code, analytics_level, "pending", redirect_type, delay_seconds];
    const link = await pool.query(sql, params);
    const l = link.rows[0];
    
    // Pierwszy skan dla linków delayed
    if (redirect_type === "delayed") {
      await checkVirusTotal(original_url, l.id);
      await pool.query("UPDATE links SET virus_status = $1 WHERE id = $2", ["queued", l.id]);
    }
    
    res.json({
      id: l.id,
      original_url: l.original_url,
      short_code: l.short_code,
      analytics_code: l.analytics_code,
      analytics_level: l.analytics_level,
      virus_status: redirect_type === "delayed" ? "queued" : l.virus_status,
      created_at: l.created_at,
      redirect_type: l.redirect_type,
      delay_seconds: l.delay_seconds
    });
  } catch (err) {
    next(err);
  }
};

export const getLink = async (req, res, next) => {
  const { short } = req.params;
  try {
    const linkResult = await pool.query("SELECT * FROM links WHERE short_code=$1", [short]);
    if (!linkResult.rows.length) {
      return res.status(404).json({ error: "Link not found" });
    }
    const link = linkResult.rows[0];

    // Skanowanie na żądanie tylko dla delayed
    if (link.redirect_type === 'delayed' && link.last_virus_scan && new Date(link.last_virus_scan) < new Date(Date.now() - 24 * 60 * 60 * 1000)) {
      await checkVirusTotal(link.original_url, link.id);
      await pool.query("UPDATE links SET virus_status = $1 WHERE id = $2", ["queued", link.id]);
      return res.json({
        ...link,
        virus_status: "queued",
        rescan_message: "Minęło 24h od ostatniego skanowania, czekam na reskanowanie VirusTotal.",
        redirect_type: link.redirect_type,
        delay_seconds: link.delay_seconds
      });
    }

    res.json({
      ...link,
      redirect_type: link.redirect_type,
      delay_seconds: link.delay_seconds
    });
  } catch (err) {
    next(err);
  }
};

export const redirectLink = async (req, res, next) => {
  const { short } = req.params;
  try {
    const link = await pool.query("SELECT * FROM links WHERE short_code=$1", [
      short,
    ]);
    if (!link.rows.length) {
      return res.status(404).json({ error: "Link not found" });
    }
    // Nie wywołuj checkVirusTotal tutaj, logika tylko w getLink
    res.json({
      ...link.rows[0],
      redirect_type: link.rows[0].redirect_type,
      delay_seconds: link.rows[0].delay_seconds
    });
  } catch (err) {
    next(err);
  }
};

export const getUserLinks = async (req, res, next) => {
  const user_id = req.user.id;
  try {
    const links = await pool.query("SELECT * FROM links WHERE user_id=$1", [
      user_id,
    ]);
    res.json(links.rows);
  } catch (err) {
    next(err);
  }
};

export const getAnalyticsLink = async (req, res, next) => {
  const { code } = req.params;
  try {
    const link = await pool.query(
      "SELECT * FROM links WHERE analytics_code=$1",
      [code]
    );
    if (!link.rows.length) {
      return res.status(404).json({ error: "Link not found" });
    }
    res.json(link.rows[0]);
  } catch (err) {
    next(err);
  }
};