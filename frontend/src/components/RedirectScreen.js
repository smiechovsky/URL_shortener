import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function RedirectScreen() {
  const { short } = useParams();
  const [link, setLink] = useState(null);
  const [status, setStatus] = useState("loading");
  const [countdown, setCountdown] = useState(5);
  const [scanStatus, setScanStatus] = useState("queued");
  const [rescanMessage, setRescanMessage] = useState("");
  const visitedSent = useRef(false);
  const redirectedSent = useRef(false);
  const [countryName, setCountryName] = useState("Unknown");

  useEffect(() => {
    setCountdown(5);
    setStatus("loading");
    setLink(null);
    setScanStatus("queued");
    setRescanMessage("");
    visitedSent.current = false;
    redirectedSent.current = false;
    let eventSource = null;

    axios.get(`${API}/links/${short}`)
      .then(res => {
        setLink(res.data);
        setScanStatus(res.data.virus_status);
        setStatus("ready");
        setRescanMessage(res.data.rescan_message || "");
        // New redirect logic
        if (res.data.virus_status === "safe") {
          if (res.data.redirect_type === "delayed") {
            startCountdown(res.data.original_url, res.data.analytics_level, res.data.delay_seconds);
          } else {
            // immediate: redirect immediately
            if (!redirectedSent.current) {
              sendAnalytics(res.data.analytics_level, "redirected");
              redirectedSent.current = true;
            }
            window.location.href = res.data.original_url;
          }
        } else if (res.data.virus_status === "queued" || res.data.virus_status === "pending") {
          eventSource = startSSEConnection();
        }
      })
      .catch(() => setStatus("error"));

    return () => {
      if (eventSource) eventSource.close();
      // clear interval if set
      clearInterval(window._redirectInterval);
    };
  }, [short]);

  // Trigger analytics right after loading the link (only once)
  useEffect(() => {
    if (status === "ready" && link && !visitedSent.current && countryName !== "Unknown") {
      sendAnalytics(link.analytics_level, "visited");
      visitedSent.current = true;
    }
  }, [status, link, countryName]);

  useEffect(() => {
    if (scanStatus === "safe" && link) {
      if (link.redirect_type === "delayed") {
        startCountdown(link.original_url, link.analytics_level, link.delay_seconds);
      } else {
        // immediate: redirect immediately
        if (!redirectedSent.current) {
          sendAnalytics(link.analytics_level, "redirected");
          redirectedSent.current = true;
        }
        window.location.href = link.original_url;
      }
    }
  }, [scanStatus, link]);

  // Fetch country_name from ipapi.co
  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => setCountryName(data.country_name || "Unknown"))
      .catch(() => setCountryName("Unknown"));
  }, [short]);

  const startCountdown = (url, analytics_level, delay = 5) => {
    setCountdown(delay || 5);
    clearInterval(window._redirectInterval);
    window._redirectInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev === 1) {
          clearInterval(window._redirectInterval);
          if (!redirectedSent.current) {
            sendAnalytics(analytics_level, "redirected");
            redirectedSent.current = true;
          }
          window.location.href = url;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startSSEConnection = () => {
    const eventSource = new EventSource(`${API}/links/sse/${short}`);
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'status_update') {
        setScanStatus(data.status);
        setRescanMessage(data.rescan_message || "");
        if (data.status === 'safe') {
          eventSource.close();
          if (link) {
            startCountdown(link.original_url, link.analytics_level);
          }
        } else if (data.status === 'blocked') {
          eventSource.close();
        }
      }
    };
    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      eventSource.close();
    };
    return eventSource;
  };

  const sendAnalytics = (analytics_level, action = "visited") => {
    axios.post(`${API}/analytics/${short}`, {
      analytics_level: analytics_level,
      action: action,
      country_name: countryName
    });
  };

  // Handle "I accept the risk, go anyway" click
  const handleAcceptRisk = () => {
    if (!redirectedSent.current && link) {
      sendAnalytics(link.analytics_level, "accepted_risk");
      redirectedSent.current = true;
    }
    window.location.href = link.original_url;
  };
  

  if (status === "loading") return <div>Loading...</div>;
  if (status === "error") return <div>Link not found.</div>;

  return (
    <div style={{ maxWidth: 500, margin: "2rem auto" }}>
      <h2>Redirecting...</h2>
      <div>
        <b>Destination:</b> {link.original_url}
      </div>
      <div>
        <b>Virus status:</b> {scanStatus}
      </div>
      {(scanStatus === "safe") && link && link.redirect_type === "delayed" && (
        <div>
          Redirecting in {countdown} seconds...
        </div>
      )}
      {(scanStatus === "blocked") && (
        <div>
          <div style={{ color: "red" }}>This link is marked as dangerous!</div>
          <button onClick={handleAcceptRisk}>
            I accept the risk, go anyway
          </button>
        </div>
      )}
      {(scanStatus === "queued" || scanStatus === "pending") && (
        <div>
          {rescanMessage && (
            <div style={{ color: '#b8860b', marginBottom: 8 }}>{rescanMessage}</div>
          )}
          <div>Waiting for VirusTotal scan...</div>
          <div style={{ fontSize: '0.9em', color: '#666' }}>
            This may take up to 30 seconds
          </div>
        </div>
      )}
    </div>
  );
}