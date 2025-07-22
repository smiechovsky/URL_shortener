import axios from "axios";
import { pool } from "../utils/db.js";

export const processQueuedScans = async () => {
  const apiKey = process.env.VIRUSTOTAL_API_KEY;
  
  try {
    // Fetch all scans with status queued
    const queuedScans = await pool.query(
      "SELECT id, link_id, scan_id FROM virus_scans WHERE status = 'queued'"
    );

    for (const scan of queuedScans.rows) {
      try {
        // Check scan status in VirusTotal
        const result = await axios.get(
          `https://www.virustotal.com/api/v3/analyses/${scan.scan_id}`,
          { headers: { "x-apikey": apiKey } }
        );

        const status = result.data.data.attributes.status;
        const stats = result.data.data.attributes.stats;

        let verdict = "queued";
        if (status === "completed") {
          if (stats.malicious > 0 || stats.suspicious > 0) {
            verdict = "blocked";
          } else {
            verdict = "safe";
          }
        }

        // Update status in virus_scans
        await pool.query(
          "UPDATE virus_scans SET status = $1 WHERE id = $2",
          [verdict, scan.id]
        );

        // Update status in links table
        await pool.query(
          "UPDATE links SET virus_status = $1, last_virus_scan = NOW() WHERE id = $2",
          [verdict, scan.link_id]
        );

        console.log(`Updated scan ${scan.id} for link ${scan.link_id} to status: ${verdict}`);
      } catch (error) {
        console.error(`Error processing scan ${scan.id}:`, error.message);
      }
    }
  } catch (error) {
    console.error("Error in processQueuedScans:", error);
  }
};

// Function to run the processor in a loop
export const startVirusScanProcessor = () => {
  console.log("Starting virus scan processor...");
  
  // Run once at start
  processQueuedScans();
  
  // 1000 = 1s
  setInterval(processQueuedScans, 5000);
}; 