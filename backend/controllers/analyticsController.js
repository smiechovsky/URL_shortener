import { pool } from "../utils/db.js";
import fetch from "node-fetch";
import useragent from "useragent";

function getDeviceType(agent) {
  const ua = agent.toString().toLowerCase();
  if (ua.includes("mobile")) return "Mobile";
  if (ua.includes("tablet")) return "Tablet";
  return "Desktop";
}

export const addAnalytics = async (req, res, next) => {
  const { short } = req.params;
  const { analytics_level, action, country_name } = req.body;
  const agent = useragent.parse(req.headers["user-agent"]);
  const device_type = getDeviceType(agent);
  const os = agent.os.toString();
  const browser = agent.toAgent();
  const user_agent = req.headers["user-agent"];
  const language = req.headers["accept-language"] || null;
  let country = country_name || "Unknown";
  let ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
  if (ip && ip.includes(",")) ip = ip.split(",")[0].trim();
  if (ip && ip.startsWith("::ffff:")) ip = ip.replace("::ffff:", "");
  console.log("[ANALYTICS] IP for analytics:", ip);

  // Get linkId from short_code
  const linkRes = await pool.query("SELECT id FROM links WHERE short_code = $1", [short]);
  const linkId = linkRes.rows[0]?.id;
  if (!linkId) {
    return res.status(404).json({ error: "Link not found" });
  }

  // Determine which timestamp column to update
  let column = "visited_at";
  if (action === "redirected") column = "redirected_at";
  if (action === "accepted_risk") column = "accepted_risk_at";

  // Look for an existing session (link_id, ip, user_agent, last 90 s)
  const since = new Date(Date.now() - 1.5 * 60 * 1000); // first variable is minutes; use a dot for fractions
  const existing = await pool.query(
    `SELECT id FROM analytics WHERE link_id=$1 AND ip=$2 AND user_agent=$3 AND visited_at >= $4`,
    [linkId, ip, user_agent, since]
  );

  if (existing.rows.length > 0) {
    // Update the relevant timestamp column
    await pool.query(
      `UPDATE analytics SET ${column}=NOW() WHERE id=$1`,
      [existing.rows[0].id]
    );
  } else {
    // Create a new record with the proper timestamp field
    const fields = {
      visited_at: null,
      redirected_at: null,
      accepted_risk_at: null
    };
    fields[column] = new Date();
    await pool.query(
      `INSERT INTO analytics (link_id, ip, country, device_type, user_agent, os, browser, language, visited_at, redirected_at, accepted_risk_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [linkId, ip, country, device_type, user_agent, os, browser, language, fields.visited_at, fields.redirected_at, fields.accepted_risk_at]
    );
  }
  res.json({ ok: true });
};