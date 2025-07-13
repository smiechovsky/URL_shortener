import { pool } from "../utils/db.js";
import { checkVirusTotal } from "../middleware/virusTotal.js";
import crypto from "crypto";

const generateCode = (len = 6) =>
  crypto.randomBytes(len).toString("base64url").slice(0, len);

export const createLink = async (req, res, next) => {
  const { original_url, analytics_level = "minimal" } = req.body;
  const user_id = req.user?.id || null;
  const short_code = generateCode(6);
  const analytics_code = user_id ? null : generateCode(12);
  try {
    // 1. Utwórz link ze statusem 'pending'
    const link = await pool.query(
      `INSERT INTO links (user_id, original_url, short_code, analytics_code, analytics_level, virus_status, last_virus_scan)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [user_id, original_url, short_code, analytics_code, analytics_level, "pending"]
    );
    // 2. NIE wywołuj checkVirusTotal tutaj! (zrobi to osobny serwis)

    // 3. Zwróć tylko niezbędne dane (bez user_id, last_virus_scan itp.)
    const l = link.rows[0];
    res.json({
      id: l.id,
      original_url: l.original_url,
      short_code: l.short_code,
      analytics_code: l.analytics_code,
      analytics_level: l.analytics_level,
      virus_status: l.virus_status,
      created_at: l.created_at
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
      const err = new Error("Not found");
      err.status = 404;
      return next(err);
    }
    const link = linkResult.rows[0];

    // Sprawdź, czy minęło 24h od ostatniego skanowania
    if (link.last_virus_scan && new Date(link.last_virus_scan) < new Date(Date.now() - 24 * 60 * 60 * 1000)) {
      // Uruchom ponownie skanowanie (nowy wpis w virus_scans)
      await checkVirusTotal(link.original_url, link.id);
      // Ustaw status na queued (nie zmieniaj starego wpisu w virus_scans)
      await pool.query("UPDATE links SET virus_status = $1 WHERE id = $2", ["queued", link.id]);
      // Zwróć informację o reskanowaniu
      return res.json({
        ...link,
        virus_status: "queued",
        rescan_message: "Minęło 24h od ostatniego skanowania, czekam na reskanowanie VirusTotal."
      });
    }

    res.json(link);
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
      const err = new Error("Not found");
      err.status = 404;
      return next(err);
    }
    // Zwróć dane do ekranu pośredniego (frontend sam przekieruje po kilku sekundach)
    res.json(link.rows[0]);
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
      const err = new Error("Not found");
      err.status = 404;
      return next(err);
    }
    res.json(link.rows[0]);
  } catch (err) {
    next(err);
  }
};