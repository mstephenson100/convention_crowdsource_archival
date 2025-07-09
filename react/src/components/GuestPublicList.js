import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";

function GuestPublicList() {
  const { year } = useParams();
  const [guests, setGuests] = useState([]);
  const [years, setYears] = useState([]);
  const [loadingYears, setLoadingYears] = useState(true);
  const [loadingGuests, setLoadingGuests] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setLoadingYears(true);
    fetch(`/api/years`)
      .then(res => res.json())
      .then(data => {
        setYears(data);
        setError('');
      })
      .catch(err => {
        console.error("Failed to fetch years:", err);
        setError("Failed to load years.");
      })
      .finally(() => setLoadingYears(false));
  }, []);

  useEffect(() => {
    if (!year) {
      setGuests([]);
      return;
    }
    setLoadingGuests(true);
    fetch(`/api/guests?year=${year}`)
      .then(res => res.json())
      .then(data => {
        // Optional: decode base64 fields here if necessary
        // For example:
        // data.forEach(g => {
        //   if (g.blurb) g.blurb = atob(g.blurb);
        //   if (g.biography) g.biography = atob(g.biography);
        // });
        setGuests(data);
        setError('');
      })
      .catch(err => {
        console.error("Failed to fetch guests:", err);
        setError("Failed to load guests.");
      })
      .finally(() => setLoadingGuests(false));
  }, [year]);

  const handleYearChange = (e) => {
    const selected = e.target.value;
    if (selected) {
      navigate(`/guests/${selected}`);
    } else {
      navigate(`/guests`);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Guests for {year || "..."}</h1>

      <div style={{ marginBottom: "1rem" }}>
        <label htmlFor="year-select">Select Year: </label>
        <select
          id="year-select"
          value={year || ""}
          onChange={handleYearChange}
          disabled={loadingYears}
        >
          <option value="">-- Select Year --</option>
          {years.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {error && <div style={{ color: "red", marginBottom: "1rem" }}>{error}</div>}

      {loadingGuests ? (
        <p>Loading guests...</p>
      ) : (
        <table border="1" cellPadding="4" style={{ verticalAlign: 'top', width: "100%" }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Blurb</th>
              <th>Biography</th>
              <th>Accolades</th>
              <th>Guest Type</th>
            </tr>
          </thead>
          <tbody>
            {guests.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: "center" }}>No guests found.</td></tr>
            ) : guests.map(g => (
              <tr key={g.guest_id}>
                <td style={{ verticalAlign: 'top' }}>
                  <Link
                    to={`/guest_profile/${g.guest_id}`}
                    state={{ from: location.pathname + location.search }}
                  >
                    {g.guest_name}
                  </Link>
                </td>
                <td style={{ verticalAlign: 'top' }}>{g.blurb}</td>
                <td style={{ verticalAlign: 'top' }}>{g.biography}</td>
                <td style={{ verticalAlign: 'top' }}>
                  {[g.accolades_1, g.accolades_2].filter(Boolean).join(" / ")}
                </td>
                <td style={{ verticalAlign: 'top' }}>{g.guest_type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: "2rem" }}>
        <Link to="/guests">← Back to Guest Years</Link>
      </div>
    </div>
  );
}

export default GuestPublicList;
