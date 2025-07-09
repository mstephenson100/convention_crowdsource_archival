import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

function UserMetrics() {
  const { user_id } = useParams();
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setError("You must be logged in to view this page.");
      return;
    }

    fetch(`/api/user_metrics/${user_id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (res.status === 401) {
          setError("Unauthorized. Please log in.");
          throw new Error("Unauthorized");
        }
        if (!res.ok) {
          throw new Error("Failed to load metrics.");
        }
        return res.json();
      })
      .then((data) => {
        setMetrics(data);
        setError(null);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message || "An error occurred.");
      });
  }, [user_id]);

  if (error) {
    return (
      <div style={{ padding: "2rem", color: "red" }}>
        <h2>Error</h2>
        <p>{error}</p>
        <Link to="/admin/users" style={{ color: "#ffcc00", textDecoration: "underline" }}>
          ← Back to User Management
        </Link>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div style={{ padding: "2rem" }}>
        Loading metrics for user #{user_id}...
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h1>
        Metrics for {metrics.user_name} (Role: {metrics.role})
      </h1>

      {/* Guest moderation metrics */}
      <section>
        <h2>Guest Moderation</h2>
        <p><strong>Total submissions:</strong> {metrics.guest_submissions}</p>
        <p><strong>Total approvals:</strong> {metrics.guest_approvals}</p>
        <p><strong>Total rejections:</strong> {metrics.guest_rejections}</p>
        <p><strong>Pending moderation:</strong> {metrics.guest_pending}</p>
        <p><strong>First activity:</strong> {metrics.guest_first_activity || "N/A"}</p>
        <p><strong>Last activity:</strong> {metrics.guest_last_activity || "N/A"}</p>
      </section>

      {/* Collectible moderation metrics */}
      <section style={{ marginTop: "2rem" }}>
        <h2>Collectible Moderation</h2>
        <p><strong>Total submissions:</strong> {metrics.collectible_submissions}</p>
        <p><strong>Total approvals:</strong> {metrics.collectible_approvals}</p>
        <p><strong>Total rejections:</strong> {metrics.collectible_rejections}</p>
        <p><strong>Pending moderation:</strong> {metrics.collectible_pending}</p>
        <p><strong>First activity:</strong> {metrics.collectible_first_activity || "N/A"}</p>
        <p><strong>Last activity:</strong> {metrics.collectible_last_activity || "N/A"}</p>
      </section>

      <div style={{ marginTop: "2rem" }}>
        <Link to="/admin/users" style={{ color: "#ffcc00", textDecoration: "underline", cursor: "pointer" }}>
          ← Back to User Management
        </Link>
      </div>
    </div>
  );
}

export default UserMetrics;

