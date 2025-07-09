import React from 'react';
import { Link } from 'react-router-dom';

function ModerationPage() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Moderation</h1>
      <ul>
        <li>
          <Link to="/moderation/guests">👤 Guests Moderation</Link>
        </li>
        <li>
          <Link to="/moderation/collectibles">🎁 Collectibles Moderation</Link>
        </li>
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

export default ModerationPage;
