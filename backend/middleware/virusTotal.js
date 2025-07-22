import axios from "axios";
import { pool } from "../utils/db.js";

export const checkVirusTotal = async (url, link_id = null) => {
  const apiKey = process.env.VIRUSTOTAL_API_KEY;
  const resp = await axios.post(
    "https://www.virustotal.com/api/v3/urls",
    `url=${encodeURIComponent(url)}`,
    { headers: { "x-apikey": apiKey, "content-type": "application/x-www-form-urlencoded" } }
  );
  const scanId = resp.data.data.id;

  // Save to database with scan_id
  if (link_id) {
    await pool.query(
      "INSERT INTO virus_scans (link_id, status, scan_id) VALUES ($1, $2, $3)",
      [link_id, "queued", scanId]
    );
  }
  
  return "queued";
};