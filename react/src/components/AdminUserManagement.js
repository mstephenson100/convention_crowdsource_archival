import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";

function AdminUserManagement() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [banner, setBanner] = useState(null);
  const [formData, setFormData] = useState({
    user_name: "",
    password: "",
    full_name: "",
    role: "editor",
  });
  const [passwordUpdates, setPasswordUpdates] = useState({});
  const [roleUpdates, setRoleUpdates] = useState({});
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setAccessDenied(true);
      setLoading(false);
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp <= now) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }
      if (payload.role !== "admin") {
        setAccessDenied(true);
        setLoading(false);
        return;
      }
      setAccessDenied(false);
      setLoading(false);
      fetchUsers();
    } catch {
      setAccessDenied(true);
      setLoading(false);
    }
  }, [navigate]);

  const showBanner = (message, type = "success") => {
    setBanner({ message, type });
    setTimeout(() => setBanner(null), 4000);
  };

  const fetchUsers = () => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;

    fetch("/api/users", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setUsers(data))
      .catch(() => setError("Failed to fetch users."));
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddUser = async () => {
    const token = localStorage.getItem("auth_token");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      setFormData({ user_name: "", password: "", full_name: "", role: "editor" });
      fetchUsers();
      showBanner("User added successfully.");
      window.scrollTo(0, 0);
    } else {
      showBanner("An error occurred. Please try again.", "error");
      window.scrollTo(0, 0);
    }
  };

  const handleDeleteUser = async (userId) => {
    const token = localStorage.getItem("auth_token");
    const res = await fetch(`/api/users/${userId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.ok) {
      fetchUsers();
      showBanner("User deleted successfully.");
      window.scrollTo(0, 0);
    } else {
      showBanner("An error occurred. Please try again.", "error");
      window.scrollTo(0, 0);
    }
  };

  const handlePasswordChange = (userId, value) => {
    setPasswordUpdates({ ...passwordUpdates, [userId]: value });
  };

  const handleUpdatePassword = async (userId) => {
    const token = localStorage.getItem("auth_token");
    const newPassword = passwordUpdates[userId];
    if (!newPassword) return;

    const res = await fetch(`/api/users/${userId}/password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ password: newPassword }),
    });

    if (res.ok) {
      setPasswordUpdates({ ...passwordUpdates, [userId]: "" });
      showBanner("Password updated successfully.");
      window.scrollTo(0, 0);
    } else {
      showBanner("An error occurred. Please try again.", "error");
      window.scrollTo(0, 0);
    }
  };

  const handleRoleChangeLocal = (userId, newRole) => {
    setRoleUpdates(prev => ({ ...prev, [userId]: newRole }));
  };

  const handleRoleUpdate = async (userId) => {
    const token = localStorage.getItem("auth_token");
    const newRole = roleUpdates[userId];
    if (!newRole) return;

    const res = await fetch(`/api/users/${userId}/role`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ role: newRole }),
    });

    if (res.ok) {
      showBanner("User role updated successfully.");
      fetchUsers();
      window.scrollTo(0, 0);
      setRoleUpdates(prev => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
    } else {
      showBanner("An error occurred. Please try again.", "error");
      window.scrollTo(0, 0);
    }
  };

  if (loading) {
    return null; // or spinner if desired
  }

  if (accessDenied) {
    return (
      <div style={{ padding: "2rem", color: "red" }}>
        <h2>Access Denied</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  if (error) {
    return <div style={{ padding: "2rem", color: "red" }}>{error}</div>;
  }

  return (
    <div style={{ padding: "2rem" }}>
      {banner && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "1rem",
            borderRadius: "4px",
            color: banner.type === "error" ? "#721c24" : "#155724",
            backgroundColor: banner.type === "error" ? "#f8d7da" : "#d4edda",
            border: `1px solid ${banner.type === "error" ? "#f5c6cb" : "#c3e6cb"}`,
          }}
        >
          {banner.message}
        </div>
      )}

      <h1>User Management (Admin Only)</h1>

      <h2>Existing Users</h2>
      <table border="1" cellPadding="4">
        <thead>
          <tr>
            <th>User ID</th>
            <th>User Name</th>
            <th>Full Name</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => {
            const currentRole = roleUpdates[user.id] !== undefined ? roleUpdates[user.id] : user.role;
            return (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>
                  <Link to={`/user_metrics/${user.id}`}>
                    {user.user_name}
                  </Link>
                </td>
                <td>{user.full_name}</td>
                <td>
                  <select
                    value={currentRole}
                    onChange={(e) => handleRoleChangeLocal(user.id, e.target.value)}
                    style={{ marginRight: "0.5rem" }}
                  >
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                    <option value="moderator">Moderator</option>
                  </select>
                  <button
                    disabled={roleUpdates[user.id] === undefined || roleUpdates[user.id] === user.role}
                    onClick={() => handleRoleUpdate(user.id)}
                  >
                    Update Role
                  </button>
                </td>
                <td>
                  <button onClick={() => handleDeleteUser(user.id)}>Delete</button>
                  <br />
                  <input
                    type="password"
                    placeholder="New Password"
                    value={passwordUpdates[user.id] || ""}
                    onChange={(e) => handlePasswordChange(user.id, e.target.value)}
                    style={{ marginTop: "0.5rem", marginRight: "0.5rem" }}
                  />
                  <button onClick={() => handleUpdatePassword(user.id)}>
                    Update Password
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2 style={{ marginTop: "2rem" }}>Add New User</h2>
      <div>
        <input
          type="text"
          name="user_name"
          placeholder="Username"
          value={formData.user_name}
          onChange={handleInputChange}
          style={{ marginRight: "1rem" }}
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleInputChange}
          style={{ marginRight: "1rem" }}
        />
        <input
          type="text"
          name="full_name"
          placeholder="Full Name"
          value={formData.full_name}
          onChange={handleInputChange}
          style={{ marginRight: "1rem" }}
        />
        <select
          name="role"
          value={formData.role}
          onChange={handleInputChange}
          style={{ marginRight: "1rem" }}
        >
          <option value="editor">Editor</option>
          <option value="admin">Admin</option>
          <option value="moderator">Moderator</option>
        </select>
        <button onClick={handleAddUser}>Add User</button>
      </div>

      {/* Back to Home link */}
      <div style={{ marginTop: "2rem" }}>
        <Link
          to="/"
          style={{
            color: "#ffcc00",
            textDecoration: "underline",
            cursor: "pointer",
          }}
        >
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}

export default AdminUserManagement;
