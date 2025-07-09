import React from "react";
import { Link } from "react-router-dom";

function CollectiblesHome() {
  return (
    <div style={{ padding: "2rem" }}>
      <h1>Collectibles</h1>
      <ul>
        <li>
          <Link to="/collectibles/by-year">Collectibles by Year</Link>
        </li>
        <li>
          <Link to="/collectibles/unsorted">Unsorted Collectibles</Link>
        </li>
      </ul>

      {/* Back to Home link at bottom */}
      <div style={{ marginTop: "2rem" }}>
        <Link to="/">← Back to Home</Link>
      </div>
    </div>
  );
}

export default CollectiblesHome;

