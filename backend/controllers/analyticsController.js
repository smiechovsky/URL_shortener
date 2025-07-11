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
  const { analytics_level } = req.body;
  const agent = useragent.parse(req.headers["user-agent"]);
  const device_type = getDeviceType(agent);
  const os = agent.os.toString();
  const browser = agent.toAgent();
  const user_agent = req.headers["user-agent"];
  const language = req.headers["accept-language"] || null;
  let country = "Unknown";

  // Get linkId from short_code
  const linkRes = await pool.query("SELECT id FROM links WHERE short_code = $1", [short]);
  const linkId = linkRes.rows[0]?.id;
  if (!linkId) {
    return res.status(404).json({ error: "Link not found" });
  }

  if (analytics_level === "standard" || analytics_level === "advanced") {
    try {
      let ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
      if (ip && ip.includes(",")) ip = ip.split(",")[0].trim();
      if (ip && ip.startsWith("::ffff:")) ip = ip.replace("::ffff:", "");
      console.log("IP for analytics:", ip);
      const geo = await fetch(`https://ipapi.co/${ip}/json/`).then(res => res.json());
      country = geo.country_name || "Unknown";
    } catch {}
  }

  await pool.query(
    `INSERT INTO analytics (link_id, timestamp, country, device_type, user_agent, os, browser, language)
     VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7)`,
    [linkId, country, device_type, user_agent, os, browser, language]
  );
  res.json({ ok: true });
};