import React from 'react';
import { Link } from 'react-router-dom';

function AccoladesHome() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Accolades</h1>
      <ul>
        <li>
          <Link to="/accolades/year">View Accolades by Year</Link>
        </li>
        <li>
          <Link to="/accolades/category">View Accolades by Category</Link>
        </li>
      </ul>
      <Link to="/">← Back to Home</Link>
    </div>
  );
}

export default AccoladesHome;
