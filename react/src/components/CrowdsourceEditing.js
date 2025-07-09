import React from 'react';
import { Link } from 'react-router-dom';

function CrowdsourceEditing() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Crowdsource Editing</h1>
      <ul>
        <li><Link to="/edit/2025">✏️ Edit Guest Data</Link></li>
        <li><Link to="/crowdsource/add">➕ Add Guest Data</Link></li>
        <li><Link to="/edit/collectibles">✏️ Edit Collectible Data</Link></li>
        <li><Link to="/add_collectible">➕ Add Collectible Data</Link></li>
      </ul>

      {/* Back to Home link */}
      <div style={{ marginTop: '2rem' }}>
        <Link
          to="/"
          style={{
            color: '#ffcc00',
            textDecoration: 'underline',
            cursor: 'pointer',
          }}
        >
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}

export default CrowdsourceEditing;
