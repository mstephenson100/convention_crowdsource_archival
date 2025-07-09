import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";

function GuestsModeration() {
  const [tokenValid, setTokenValid] = useState(false);
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [bannerMessage, setBannerMessage] = useState("");
  const navigate = useNavigate();

  const fetchEntries = useCallback(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;

    setLoading(true);
    fetch("/api/moderation/guests/pending", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch moderation data");
        return res.json();
      })
      .then(data => {
        setEntries(data);
        setError("");
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      navigate("/");
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp <= now) {
        console.warn("Token expired");
        navigate("/");
        return;
      }

      // Role check: only allow admin or moderator
      if (payload.role !== "admin" && payload.role !== "moderator") {
        navigate("/");
        return;
      }

      setTokenValid(true);
      fetchEntries();
    } catch (e) {
      console.error("Invalid token", e);
      navigate("/");
    }
  }, [navigate, fetchEntries]);

  const showBanner = (message) => {
    setBannerMessage(message);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => setBannerMessage(""), 5000);
  };

  const handleReject = async (entry) => {
    const token = localStorage.getItem("auth_token");
    const res = await fetch("/api/moderation/guests/reject", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id: entry.id }),
    });

    const data = await res.json();
    if (res.ok) {
      showBanner(`❌ Rejected ${data.guest_name} (${data.year})`);
      fetchEntries();
    } else {
      alert(data.error || "Failed to reject entry");
    }
  };

  const handleApprove = async (entry) => {
    const token = localStorage.getItem("auth_token");
    const res = await fetch("/api/moderation/guests/approve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      // Corrected property name from 'delete' to 'deleted'
      body: JSON.stringify({ id: entry.id, deleted: entry.deleted || 0 }),
    });

    const data = await res.json();
    if (res.ok) {
      showBanner(`✅ Approved ${data.guest_name} (${data.year})`);
      fetchEntries();
    } else {
      alert(data.error || "Failed to approve entry");
    }
  };

  if (!tokenValid) {
    return (
      <div className="container">
        <h2>Access Denied</h2>
        <p>You must be an admin or moderator to view moderation content.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="container">Loading moderation entries...</div>;
  }

  const grouped = {};
  for (const entry of entries) {
    const key = `${entry.guest_name} (${entry.year})`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(entry);
  }

  return (
    <div className="container">
      {bannerMessage && (
        <div
          style={{
            backgroundColor: "#e0ffe0",
            border: "1px solid #00a000",
            padding: "10px",
            marginBottom: "20px",
            color: "#222",
          }}
        >
          {bannerMessage}
        </div>
      )}

      <h1>Moderation</h1>
      <button onClick={fetchEntries}>🔄 Refresh</button>

      {error && <div style={{ color: "red", marginBottom: "1rem" }}>{error}</div>}

      {Object.entries(grouped).map(([label, group], idx) => (
        <div
          key={idx}
          className="moderation-group"
          style={{ marginBottom: "2em", padding: "1em", border: "1px solid #ccc" }}
        >
          {/* Show warning banner if any entry in the group is a deletion */}
          {group.some((entry) => entry.deleted === 1) && (
            <div
              style={{
                backgroundColor: "#f8d7da",
                color: "#721c24",
                border: "1px solid #f5c6cb",
                borderRadius: "4px",
                padding: "10px",
                marginBottom: "1em",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
              aria-live="assertive"
            >
              <span role="img" aria-label="warning">
                ⚠️
              </span>
              WARNING: This guest deletion is pending moderator approval!
            </div>
          )}

          <h2>{label}</h2>
          {group.map((entry, i) => (
            <div key={i} style={{ padding: "0.5em", borderBottom: "1px solid #eee" }}>
              <p>
                <strong>Guest Name:</strong> {entry.guest_name}
              </p>
              <p>
                <strong>Year:</strong> {entry.year}
              </p>
              <p>
                <strong>Version:</strong> {entry.version}
              </p>
              <p>
                <strong>Submitted by:</strong> {entry.user_name || `User ID ${entry.user_id}`}
              </p>
              <p>
                <strong>Timestamp:</strong> {entry.timestamp}
              </p>
              <p>
                <strong>Guest Type:</strong> {entry.guest_type || "(none)"}
              </p>
              {entry.blurb && <p><strong>Blurb:</strong> {entry.blurb}</p>}
              {entry.biography && <p><strong>Biography:</strong> {entry.biography}</p>}
              {(entry.accolades_1 || entry.accolades_2) && (
                <p>
                  <strong>Accolades:</strong>{" "}
                  {[entry.accolades_1, entry.accolades_2].filter(Boolean).join(", ")}
                </p>
              )}
              <div style={{ marginTop: "0.5em" }}>
                <button onClick={() => handleApprove(entry)} style={{ marginRight: "0.5em" }}>
                  Approve
                </button>
                <span style={{ margin: "0 0.5em" }}>|</span>
                <button onClick={() => handleReject(entry)}>
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Back to Moderation link */}
      <div style={{ marginTop: "2rem" }}>
        <Link
          to="/moderation"
          style={{
            color: "#ffcc00",
            textDecoration: "underline",
            cursor: "pointer",
          }}
        >
          ← Back to Moderation
        </Link>
      </div>
    </div>
  );
}

export default GuestsModeration;

