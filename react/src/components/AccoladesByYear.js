import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";

function AccoladesByYear() {
  const { year } = useParams();
  const [accolades, setAccolades] = useState([]);
  const [years, setYears] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Fetch only distinct years for dropdown
    fetch(`/api/years`)
      .then(res => res.json())
      .then(setYears)
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!year) {
      setAccolades([]);
      return;
    }

    // Fetch only guests for the selected year with accolades
    fetch(`/api/guests?year=${year}`)
      .then(res => res.json())
      .then(data => {
        const filtered = data.filter(
          g => g.accolades_1 || g.accolades_2
        );
        setAccolades(filtered);
      })
      .catch(console.error);
  }, [year]);

  const handleYearChange = (e) => {
    navigate(`/accolades/year/${e.target.value}`);
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Accolades by Year</h1>

      <div style={{ marginBottom: "1rem" }}>
        <label htmlFor="year">Select Year: </label>
        <select id="year" value={year || ""} onChange={handleYearChange}>
          <option value="">-- Select Year --</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      <ul>
        {accolades.map((g, i) => (
          <li key={i}>
            <Link
              to={`/guest_profile/${g.guest_id}`}
              state={{ from: location }}
            >
              {g.guest_name}
            </Link>
            : {g.accolades_1}
            {g.accolades_2 && ` / ${g.accolades_2}`}
          </li>
        ))}
      </ul>

      <div style={{ marginTop: "2rem" }}>
        <Link to="/accolades">← Back to Accolades</Link>
      </div>
    </div>
  );
}

export default AccoladesByYear;

