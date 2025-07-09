import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

function AccoladesByCategory() {
  const [accoladeMap, setAccoladeMap] = useState({});
  const location = useLocation();

  useEffect(() => {
    fetch("/api/guests/accolades")
      .then((res) => res.json())
      .then((data) => {
        const map = {};

        data.forEach((guest) => {
          [guest.accolades_1, guest.accolades_2].forEach((acc) => {
            if (acc && acc.trim()) {
              if (!map[acc]) map[acc] = [];
              map[acc].push(guest);
            }
          });
        });

        setAccoladeMap(map);
      })
      .catch((err) => {
        console.error("Failed to fetch guests with accolades:", err);
      });
  }, []);

  const sortedCategories = Object.keys(accoladeMap).sort();

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Guest of Honor by Category</h1>
      {sortedCategories.length === 0 && <p>No accolades found.</p>}
      {sortedCategories.map((category) => (
        <div key={category} style={{ marginBottom: "1.5rem" }}>
          <h2>{category}</h2>
          <ul>
            {accoladeMap[category]
              .slice()
              .sort((a, b) => (a.year || 0) - (b.year || 0))
              .map((g) => (
                <li key={`${g.guest_id}-${g.year}`}>
                  <Link
                    to={`/guest_profile/${g.guest_id}`}
                    state={{ from: location }}
                  >
                    {g.guest_name}
                  </Link>{" "}
                  ({g.year || "N/A"})
                </li>
              ))}
          </ul>
        </div>
      ))}
      <Link to="/accolades">← Back to Accolades</Link>
    </div>
  );
}

export default AccoladesByCategory;

