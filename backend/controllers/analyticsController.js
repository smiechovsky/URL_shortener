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
  const { analytics_level, action } = req.body;
  const agent = useragent.parse(req.headers["user-agent"]);
  const device_type = getDeviceType(agent);
  const os = agent.os.toString();
  const browser = agent.toAgent();
  const user_agent = req.headers["user-agent"];
  const language = req.headers["accept-language"] || null;
  let country = "Unknown";
  let ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
  if (ip && ip.includes(",")) ip = ip.split(",")[0].trim();
  if (ip && ip.startsWith("::ffff:")) ip = ip.replace("::ffff:", "");

  // Get linkId from short_code
  const linkRes = await pool.query("SELECT id FROM links WHERE short_code = $1", [short]);
  const linkId = linkRes.rows[0]?.id;
  if (!linkId) {
    return res.status(404).json({ error: "Link not found" });
  }

  if (analytics_level === "standard" || analytics_level === "advanced") {
    try {
      const geo = await fetch(`https://ipapi.co/${ip}/json/`).then(res => res.json());
      country = geo.country_name || "Unknown";
    } catch {}
  }

  // Określ, którą kolumnę timestamp aktualizować
  let column = "visited_at";
  if (action === "redirected") column = "redirected_at";
  if (action === "accepted_risk") column = "accepted_risk_at";

  // Szukaj istniejącej sesji (link_id, ip, user_agent, ostatnie 10 min)
  const since = new Date(Date.now() - 2.5 * 60 * 1000); // pierwsza zmienna to czas w min, jak ulamkowa to rodzielona kropka
  const existing = await pool.query(
    `SELECT id FROM analytics WHERE link_id=$1 AND ip=$2 AND user_agent=$3 AND visited_at >= $4`,
    [linkId, ip, user_agent, since]
  );

  if (existing.rows.length > 0) {
    // Aktualizuj odpowiednią kolumnę timestamp
    await pool.query(
      `UPDATE analytics SET ${column}=NOW() WHERE id=$1`,
      [existing.rows[0].id]
    );
  } else {
    // Twórz nowy rekord z odpowiednim polem czasowym
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