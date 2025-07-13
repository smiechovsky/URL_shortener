import React, { useState, useEffect } from "react";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function Stats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchStats = () => {
      axios.get(`${API}/stats`).then(res => setStats(res.data));
    };
    fetchStats(); // pobierz od razu po załadowaniu
    const interval = setInterval(fetchStats, 1000); // 1000 = 1s
    return () => clearInterval(interval); // wyczyść interwał przy odmontowaniu
  }, []);

  if (!stats) return <div>Loading stats...</div>;

  return (
    <div style={{ maxWidth: 400, margin: "2rem auto" }}>
      <h2>Stats (last 24h)</h2>
      <div>Links created: {stats.last_24h.total_links}</div>
      <div>Scans: {stats.last_24h.total_scans}</div>
      <div>Blocked links: {stats.last_24h.total_blocked}</div>
      <div>Awaiting submission to scan: {stats.pending_links}</div>
      <div>Awaiting scan verdict: {stats.scanning_links}</div>
      <hr style={{ margin: '2em 0' }} />
      <h2>Global stats</h2>
      <div>Total links: {stats.total_links}</div>
      <div>Total scans: {stats.total_scans}</div>
      <div>Blocked links: {stats.total_blocked}</div>
      <div style={{ marginTop: 32 }}>
        <a href="/">Back to main</a>
      </div>
    </div>
  );
}