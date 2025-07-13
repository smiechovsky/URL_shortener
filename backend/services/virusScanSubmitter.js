import axios from "axios";
import { pool } from "../utils/db.js";

export const processPendingLinks = async () => {
  const apiKey = process.env.VIRUSTOTAL_API_KEY;
  try {
    // Pobierz linki ze statusem 'pending'
    const pendingLinks = await pool.query(
      "SELECT id, original_url FROM links WHERE virus_status = 'pending'"
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
        console.log(`Link ${link.id} zgłoszony do VirusTotal, scanId: ${scanId}`);
      } catch (error) {
        if (error.response && error.response.status === 429) {
          // Limit API, zostaw jako 'pending', spróbuj później
          console.warn(`VirusTotal rate limit hit for link ${link.id}, zostawiam jako pending.`);
        } else {
          console.error(`Błąd zgłaszania linku ${link.id} do VirusTotal:`, error.message);
        }
      }
    }
  } catch (error) {
    console.error("Błąd w processPendingLinks:", error);
  }
};

export const startVirusScanSubmitter = () => {
  console.log("Starting virus scan submitter...");
  processPendingLinks();
  setInterval(processPendingLinks, 10000); // co 10s próbuj zgłaszać pending
}; 