import React from "react";
import { Link } from "react-router-dom";

function Home() {
  const token = localStorage.getItem("auth_token");
  let role = null;

  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp > now) {
        role = payload.role;
      } else {
        localStorage.removeItem("auth_token");
      }
    } catch (e) {
      console.error("Invalid token", e);
      localStorage.removeItem("auth_token");
    }
  }

  const isLoggedIn = !!role;

  // Only show the framed box if logged in and has at least one allowed role
  const showBox = isLoggedIn && (role === "editor" || role === "moderator" || role === "admin");

  const boxStyle = {
    padding: "1rem",
    marginTop: "1rem",
    border: "4px double #ffcc00",
    borderRadius: "8px",
    display: "inline-block"
  };

  return (
    <div className="container">
      <h1>Archive</h1>

      <p><Link to="/guest_search">Guest Search</Link></p>
      <p><Link to="/guests">Guests by Year</Link></p>
      <p><Link to="/vendor_search">Vendor Search</Link></p>
      <p><Link to="/vendors">Vendors by Year</Link></p>
      <p><Link to="/collectibles">Collectibles</Link></p>
      <p><Link to="/accolades">Accolades</Link></p>

      {showBox && (
        <div style={boxStyle}>
          {/* Crowdsource Editing for all logged-in roles */}
          <p><Link to="/crowdsource">Crowdsource Editing</Link></p>

          {/* Moderation Panel only for admin and moderator */}
          {(role === "admin" || role === "moderator") && (
            <p><Link to="/moderation">Moderation Panel</Link></p>
          )}

          {/* User Management only for admin */}
          {role === "admin" && (
            <p><Link to="/admin/users">User Management (Admin)</Link></p>
          )}
        </div>
      )}
    </div>
  );
}

export default Home;

