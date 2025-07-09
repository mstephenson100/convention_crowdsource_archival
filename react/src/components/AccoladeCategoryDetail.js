import React, { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "react-router-dom";

function AccoladeCategoryDetail() {
  const { category } = useParams();
  const [guests, setGuests] = useState([]);
  const location = useLocation();

  useEffect(() => {
    //fetch("http://localhost:5000/guests")
    fetch("/api//guests")
      .then((res) => res.json())
      .then((data) => {
        const filtered = data.filter(
          (g) => g.accolades_1 === category || g.accolades_2 === category
        );
        filtered.sort((a, b) => a.year - b.year);
        setGuests(filtered);
      });
  }, [category]);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>{category}</h1>
      <ul>
        {guests.map((guest, index) => (
          <li key={index}>
            <Link
              to={`/guest_profile/${guest.guest_id}`}
              state={{ from: location }} // Pass current location as state
            >
              {guest.guest_name}
            </Link>{" "}
            ({guest.year})
          </li>
        ))}
      </ul>
      <Link to="/accolades/category">← Back to Categories</Link>
    </div>
  );
}

export default AccoladeCategoryDetail;
