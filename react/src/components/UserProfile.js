import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

function UserProfile() {
  const location = useLocation();

  // Helper to check if current path ends with the given segment
  const isActive = (path) => location.pathname.endsWith(path);

  const tabStyle = {
    padding: '10px 20px',
    marginRight: '10px',
    cursor: 'pointer',
    textDecoration: 'none',
    borderBottom: '2px solid transparent',
    color: '#555',
    fontWeight: 'bold',
  };

  const activeTabStyle = {
    ...tabStyle,
    borderBottom: '2px solid #ffcc00',
    color: '#ffcc00',
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>User Profile</h2>

      <nav style={{ marginBottom: '20px', borderBottom: '1px solid #ccc' }}>
        <Link
          to="guest_submissions"
          style={isActive('guest_submissions') ? activeTabStyle : tabStyle}
        >
          My Guest Submissions
        </Link>
        <Link
          to="collectible_submissions"
          style={isActive('collectible_submissions') ? activeTabStyle : tabStyle}
        >
          My Collectible Submissions
        </Link>
      </nav>

      {/* Nested routes render here */}
      <Outlet />

    </div>
  );
}

export default UserProfile;

