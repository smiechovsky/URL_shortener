import axios from "axios";
import { pool } from "../utils/db.js";

export const processPendingLinks = async () => {
  const apiKey = process.env.VIRUSTOTAL_API_KEY;
  try {
    // Fetch links with status 'pending' and immediate links not scanned for 24h
    const pendingLinks = await pool.query(
      `SELECT id, original_url, redirect_type, virus_status, last_virus_scan FROM links 
       WHERE (virus_status = 'pending' AND redirect_type = 'immediate')
         OR (redirect_type = 'immediate' AND (last_virus_scan IS NULL OR last_virus_scan < NOW() - INTERVAL '24 hours'))`
    );
    
    for (const link of pendingLinks.rows) {
      try {
        // Try to submit to VirusTotal
        const resp = await axios.post(
          "https://www.virustotal.com/api/v3/urls",
          `url=${encodeURIComponent(link.original_url)}`,
          { headers: { "x-apikey": apiKey, "content-type": "application/x-www-form-urlencoded" } }
        );
        const scanId = resp.data.data.id;
        // Insert record into virus_scans
        await pool.query(
          "INSERT INTO virus_scans (link_id, status, scan_id) VALUES ($1, $2, $3)",
          [link.id, "queued", scanId]
        );
        // Update link status to 'queued'
        await pool.query(
          "UPDATE links SET virus_status = $1 WHERE id = $2",
          ["queued", link.id]
        );
      } catch (error) {
        if (error.response && error.response.status === 429) {
          // API limit reached, keep as 'pending' and retry later
          console.warn(`VirusTotal rate limit hit for link ${link.id}, zostawiam jako pending.`);
        } else {
          // Handle other errors silently
        }
      }
    }
  } catch (error) {
    // Handle error silently
  }
};

export const startVirusScanSubmitter = () => {
  console.log("Starting virus scan submitter...");
  processPendingLinks();
  setInterval(processPendingLinks, 10000); // try submitting pending links every 10s
}; 