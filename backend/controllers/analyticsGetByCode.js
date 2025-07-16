import { pool } from "../utils/db.js";

export async function getAnalyticsByCode(req, res, next) {
  const { analytics_code } = req.params;
  try {
    // Get link by analytics_code
    const linkRes = await pool.query(
      "SELECT * FROM links WHERE analytics_code = $1",
      [analytics_code]
    );
    const link = linkRes.rows[0];
    if (!link) return res.status(404).json({ error: "Link not found" });

    // Get all analytics records for this link
    const analyticsRes = await pool.query(
      "SELECT * FROM analytics WHERE link_id = $1",
      [link.id]
    );
    const analytics = analyticsRes.rows;

    // Timeline: aggregate by date (YYYY-MM-DD)
    const timelineMap = {};
    analytics.forEach(a => {
      if (a.visited_at) {
        const d = a.visited_at.toISOString().slice(0, 10);
        if (!timelineMap[d]) timelineMap[d] = { date: d, visited: 0, redirected: 0 };
        timelineMap[d].visited++;
      }
      if (a.redirected_at) {
        const d = a.redirected_at.toISOString().slice(0, 10);
        if (!timelineMap[d]) timelineMap[d] = { date: d, visited: 0, redirected: 0 };
        timelineMap[d].redirected++;
      }
    });
    let timeline = Object.values(timelineMap).sort((a, b) => a.date.localeCompare(b.date));
    const { from, to } = req.query;
    if (from && to) {
      timeline = timeline.filter(t => t.date >= from.slice(0, 10) && t.date <= to.slice(0, 10));
    }

    // Device types
    const deviceMap = {};
    analytics.forEach(a => {
      const key = a.device_type || "Unknown";
      deviceMap[key] = (deviceMap[key] || 0) + 1;
    });
    const device_types = Object.entries(deviceMap).map(([device_type, count]) => ({ device_type, count }));

    // Languages
    const langMap = {};
    analytics.forEach(a => {
      const key = a.language || "Unknown";
      langMap[key] = (langMap[key] || 0) + 1;
    });
    const languages = Object.entries(langMap).map(([language, count]) => ({ language, count }));

    // Countries
    const countryMap = {};
    analytics.forEach(a => {
      const key = a.country || "Unknown";
      countryMap[key] = (countryMap[key] || 0) + 1;
    });
    const countries = Object.entries(countryMap).map(([country, count]) => ({ country, count }));

    res.json({
      original_url: link.original_url,
      short_code: link.short_code,
      analytics_code: link.analytics_code,
      analytics_level: link.analytics_level,
      virus_status: link.virus_status,
      created_at: link.created_at,
      timeline,
      device_types,
      languages,
      countries
    });
  } catch (e) {
    next(e);
  }
} 