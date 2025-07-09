import React, { useState, useEffect } from "react";

const ASSET_BASE_URL = process.env.REACT_APP_ASSET_BASE_URL || "";

function CollectiblesModeration() {
  const [tokenValid, setTokenValid] = useState(false);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bannerMessage, setBannerMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const fetchEntries = () => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;

    setLoading(true);
    setErrorMessage("");

    fetch("/api/moderation/collectibles/pending", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch moderation data");
        return res.json();
      })
      .then((data) => {
        setEntries(data);
      })
      .catch((err) => {
        console.error(err);
        setErrorMessage(err.message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp <= now) {
        console.warn("Token expired");
        return;
      }
      if (payload.role !== "admin" && payload.role !== "moderator") {
        return;
      }
      setTokenValid(true);
      fetchEntries();
    } catch (e) {
      console.error("Invalid token", e);
    }
  }, []);

  const showBanner = (message) => {
    setBannerMessage(message);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => setBannerMessage(""), 5000);
  };

  const handleReject = async (entry) => {
    const token = localStorage.getItem("auth_token");
    const res = await fetch("/api/moderation/collectibles/reject", {
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
    const res = await fetch("/api/moderation/collectibles/approve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id: entry.id, deleted: entry.deleted || 0 }), // <-- Added deleted flag here
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

  // Group entries by guest_name + year
  const grouped = {};
  for (const entry of entries) {
    const key = `${entry.guest_name} (${entry.year || "N/A"})`;
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

      {errorMessage && (
        <div
          style={{
            backgroundColor: "#ffe0e0",
            border: "1px solid #a00000",
            padding: "10px",
            marginBottom: "20px",
            color: "#a00000",
          }}
        >
          Error: {errorMessage}
        </div>
      )}

      <h1>Collectibles Moderation</h1>
      <button onClick={fetchEntries}>🔄 Refresh</button>

      {Object.entries(grouped).map(([label, group], idx) => {
        const hasDelete = group.some((entry) => entry.deleted === 1);

        return (
          <div
            key={idx}
            style={{
              marginBottom: "1.5em",
              padding: "1em",
              border: "1px solid #ccc",
            }}
          >
            {hasDelete && (
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
                WARNING: This collectible deletion is pending moderator approval!
              </div>
            )}

            <h2>{label}</h2>

            {group.map((entry) => (
              <div
                key={entry.id}
                style={{ padding: "0.5em", borderBottom: "1px solid #eee" }}
              >
                <div>
                  <strong>Guest Name:</strong> {entry.guest_name || "(none)"}
                </div>
                <div>
                  <strong>Year:</strong> {entry.year || "(none)"}
                </div>
                <div>
                  <strong>Category:</strong> {entry.category || "(none)"}
                </div>
                <div>
                  <strong>Name:</strong> {entry.name || "(none)"}
                </div>
                <div>
                  <strong>Notes 1:</strong> {entry.notes_1 || "(none)"}
                </div>
                <div>
                  <strong>Notes 2:</strong> {entry.notes_2 || "(none)"}
                </div>
                <div>
                  <strong>Timestamp:</strong>{" "}
                  {entry.timestamp
                    ? new Date(entry.timestamp).toLocaleString()
                    : "(none)"}
                </div>
                {entry.filename && (
                  <div style={{ marginTop: "1em" }}>
                    <a
                      href={`${ASSET_BASE_URL}/${entry.filename}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img
                        src={`${ASSET_BASE_URL}/${entry.filename}`}
                        alt={entry.name || "Collectible"}
                        style={{ maxWidth: "400px", maxHeight: "400px" }}
                      />
                    </a>
                  </div>
                )}

                <div style={{ marginTop: "0.5em" }}>
                  <button
                    onClick={() => handleApprove(entry)}
                    style={{ marginRight: "0.5em" }}
                  >
                    Approve
                  </button>
                  <span style={{ margin: "0 0.5em" }}>|</span>
                  <button onClick={() => handleReject(entry)}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        );
      })}

      {/* Back to Moderation link */}
      <div style={{ marginTop: "2rem" }}>
        <a
          href="/moderation"
          style={{
            color: "#ffcc00",
            textDecoration: "underline",
            cursor: "pointer",
          }}
        >
          ← Back to Moderation
        </a>
      </div>
    </div>
  );
}

export default CollectiblesModeration;

