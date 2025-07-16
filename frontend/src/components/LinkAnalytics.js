import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, ResponsiveContainer
} from "recharts";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

const ranges = [
  { label: "Last 24h", value: "24h" },
  { label: "Last 3d", value: "3d" },
  { label: "Last 7d", value: "7d" },
  { label: "Last 14d", value: "14d" },
  { label: "Last 1m", value: "1m" },
  { label: "Last 3m", value: "3m" },
  { label: "All time", value: "all" },
];

function getRangeDates(range) {
  const now = new Date();
  let from;
  switch (range) {
    case "24h":
      from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case "3d":
      from = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      break;
    case "7d":
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "14d":
      from = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      break;
    case "1m":
      from = new Date(now.setMonth(now.getMonth() - 1));
      break;
    case "3m":
      from = new Date(now.setMonth(now.getMonth() - 3));
      break;
    case "all":
    default:
      from = null;
  }
  return {
    from: from ? from.toISOString() : null,
    to: now.toISOString(),
  };
}

export default function LinkAnalytics() {
  const { analytics_code } = useParams();
  const [range, setRange] = useState("7d");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const { from, to } = getRangeDates(range);
    let url = `${API}/analytics/${analytics_code}`;
    if (from && to) {
      url += `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    }
    axios.get(url)
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError("Error loading analytics");
        setLoading(false);
      });
  }, [analytics_code, range]);

  if (loading) return <div>Loading analytics...</div>;
  if (error) return <div>{error}</div>;
  if (!data) return <div>No analytics data.</div>;

  // Example data structure expected from backend:
  // {
  //   original_url, short_code, analytics_code, analytics_level, virus_status, created_at,
  //   timeline: [ { date, visited, redirected } ],
  //   device_types: [ { device_type, count } ],
  //   languages: [ { language, count } ],
  //   countries: [ { country, count } ]
  // }

  return (
    <div style={{ maxWidth: 900, margin: "2rem auto" }}>
      <h2>Link Analytics</h2>
      <div style={{ marginBottom: 16 }}>
        <b>Original URL:</b> {data.original_url}<br />
        <b>Short link:</b> <a href={`/r/${data.short_code}`} target="_blank" rel="noopener noreferrer">{window.location.origin}/r/{data.short_code}</a><br />
        <b>Analytics code:</b> {data.analytics_code}<br />
        <b>Analytics level:</b> {data.analytics_level}<br />
        <b>Virus status:</b> {data.virus_status}<br />
        <b>Created at:</b> {new Date(data.created_at).toLocaleString()}<br />
      </div>
      <div style={{ marginBottom: 24 }}>
        <label>Range: </label>
        <select value={range} onChange={e => setRange(e.target.value)}>
          {ranges.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>
      <h3>Visits & Redirects Over Time</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data.timeline} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="visited" stroke="#8884d8" name="Visited" />
          <Line type="monotone" dataKey="redirected" stroke="#82ca9d" name="Redirected" />
        </LineChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', gap: 32, marginTop: 32 }}>
        <div style={{ flex: 1 }}>
          <h4>Device Types</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.device_types} layout="vertical">
              <XAxis type="number" />
              <YAxis dataKey="device_type" type="category" width={80} />
              <Tooltip />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ flex: 1 }}>
          <h4>Languages</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.languages} layout="vertical">
              <XAxis type="number" />
              <YAxis dataKey="language" type="category" width={80} />
              <Tooltip />
              <Bar dataKey="count" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ flex: 1 }}>
          <h4>Countries</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.countries} layout="vertical">
              <XAxis type="number" />
              <YAxis dataKey="country" type="category" width={80} />
              <Tooltip />
              <Bar dataKey="count" fill="#ffc658" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
} 