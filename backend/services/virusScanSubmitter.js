import axios from "axios";
import { pool } from "../utils/db.js";

export const processPendingLinks = async () => {
  const apiKey = process.env.VIRUSTOTAL_API_KEY;
  try {
    // Pobierz linki ze statusem 'pending' ORAZ linki immediate, które nie były skanowane od 24h
    const pendingLinks = await pool.query(
      `SELECT id, original_url, redirect_type, virus_status, last_virus_scan FROM links 
       WHERE (virus_status = 'pending' AND redirect_type = 'immediate')
         OR (redirect_type = 'immediate' AND (last_virus_scan IS NULL OR last_virus_scan < NOW() - INTERVAL '24 hours'))`
    );
    
    for (const link of pendingLinks.rows) {
      try {
        // Spróbuj zgłosić do VirusTotal
        const resp = await axios.post(
          "https://www.virustotal.com/api/v3/urls",
          `url=${encodeURIComponent(link.original_url)}`,
          { headers: { "x-apikey": apiKey, "content-type": "application/x-www-form-urlencoded" } }
        );
        const scanId = resp.data.data.id;
        // Dodaj wpis do virus_scans
        await pool.query(
          "INSERT INTO virus_scans (link_id, status, scan_id) VALUES ($1, $2, $3)",
          [link.id, "queued", scanId]
        );
        // Zmień status linku na 'queued'
        await pool.query(
          "UPDATE links SET virus_status = $1 WHERE id = $2",
          ["queued", link.id]
        );
      } catch (error) {
        if (error.response && error.response.status === 429) {
          // Limit API, zostaw jako 'pending', spróbuj później
          console.warn(`VirusTotal rate limit hit for link ${link.id}, zostawiam jako pending.`);
        } else {
          // Obsłuż inne błędy, ale nie loguj
        }
      }
    }
  } catch (error) {
    // Obsłuż błąd, ale nie loguj
  }
};

export const startVirusScanSubmitter = () => {
  console.log("Starting virus scan submitter...");
  processPendingLinks();
  setInterval(processPendingLinks, 10000); // co 10s próbuj zgłaszać pending
}; 