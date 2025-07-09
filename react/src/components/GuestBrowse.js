import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function GuestBrowse() {
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    fetch(`/api/years`)
      .then(res => res.json())
      .then(data => {
        setYears(data);
        setError('');
      })
      .catch(err => {
        console.error('Failed to fetch years:', err);
        setError('Failed to load years.');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleYearChange = (e) => {
    const year = e.target.value;
    setSelectedYear(year);
    if (year) {
      navigate(`/guests/${year}`);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Guests</h1>

      <label htmlFor="year-select">Select Year:</label>
      <select
        id="year-select"
        onChange={handleYearChange}
        value={selectedYear}
        disabled={loading}
        style={{ marginLeft: 10 }}
      >
        <option value="">-- Select Year --</option>
        {years.map(y => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>

      {error && (
        <div style={{ color: 'red', marginTop: '1rem' }}>
          {error}
        </div>
      )}

      <br /><br />
      <Link to="/">← Back to Home</Link>
    </div>
  );
}

export default GuestBrowse;
