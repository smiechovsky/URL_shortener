import React, { useState } from "react";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function ShortenForm() {
  const [url, setUrl] = useState("");
  const [level, setLevel] = useState("minimal");
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setResult(null);
    try {
      const res = await axios.post(`${API}/links`, {
        original_url: url,
        analytics_level: level,
      });
      setResult(res.data);
    } catch (err) {
      setResult({ error: err.response?.data?.error || "Error" });
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "2rem auto" }}>
      <h2>Shorten your link</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="url"
          placeholder="Paste your URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          style={{ width: "100%", marginBottom: 8 }}
        />
        <select value={level} onChange={e => setLevel(e.target.value)} style={{ width: "100%", marginBottom: 8 }}>
          <option value="none">No analytics</option>
          <option value="minimal">Minimal (geo, device)</option>
          <option value="advanced">Advanced (IP, user agent)</option>
        </select>
        <button type="submit" style={{ width: "100%" }}>Shorten</button>
      </form>
      {result && (
        <div style={{ marginTop: 16 }}>
          {result.error && <div style={{ color: "red" }}>{result.error}</div>}
          {result.short_code && (
            <div>
              <div>
                Short link: <a href={`/r/${result.short_code}`}>{window.location.origin}/r/{result.short_code}</a>
              </div>
              {result.analytics_code && (
                <div>
                  Analytics: <a href={`${API}/links/analytics/${result.analytics_code}`}>{result.analytics_code}</a>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      <div style={{ marginTop: 32 }}>
        <a href="/stats">Show stats</a>
      </div>
    </div>
  );
}