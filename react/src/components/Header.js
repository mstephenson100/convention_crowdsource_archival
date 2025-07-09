import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FaUserCircle } from "react-icons/fa";

function Header() {
  const [role, setRole] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp > now) {
        setRole(payload.role);
        setUserId(payload.user_id);
        setIsLoggedIn(true);
      } else {
        localStorage.removeItem("auth_token");
      }
    } catch (e) {
      console.error("Invalid token", e);
      localStorage.removeItem("auth_token");
    }
  }, []);

  const handleLogin = async () => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_name: userName, password }),
    });

    const data = await res.json();
    if (res.ok && data.token) {
      localStorage.setItem("auth_token", data.token);
      const decoded = JSON.parse(atob(data.token.split(".")[1]));
      setRole(decoded.role);
      setUserId(decoded.user_id);
      setIsLoggedIn(true);
      setMessage("Login successful!");
      window.location.reload(); // Refresh after login
    } else {
      setMessage(data.error || "Login failed.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    setIsLoggedIn(false);
    setRole(null);
    setUserId(null);
    window.location.reload(); // Refresh after logout
  };

  return (
    <header
      style={{
        backgroundColor: "#2b1b47",
        padding: "1rem 2rem",
        borderBottom: "2px solid #ffcc00",
        color: "#ffcc00",
        fontFamily: "hwt-artz, sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <img
          src="/logo512.png"
          alt="512 Logo"
          style={{ height: "40px", marginRight: "1rem" }}
        />
        <h1 style={{ margin: 0, fontSize: "1.5rem" }}>
          <Link
            to="/"
            style={{ color: "#ffcc00", textDecoration: "none" }}
          >
            Archival Demo
          </Link>
        </h1>
      </div>

      <div style={{ textAlign: "right" }}>
        {!isLoggedIn ? (
          <div>
            <input
              placeholder="Username"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              style={{ marginRight: "0.5rem" }}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ marginRight: "0.5rem" }}
            />
            <button onClick={handleLogin}>Login</button>
            {message && <div style={{ color: "white" }}>{message}</div>}
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div>Logged in as: <strong>{role}</strong></div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <button onClick={handleLogout}>Logout</button>
              {userId && (
                <Link
                  to={`/user/${userId}`}
                  title="My Profile"
                  style={{ color: "#ffcc00", fontSize: "1.5rem", display: "flex", alignItems: "center" }}
                >
                  <FaUserCircle />
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;

