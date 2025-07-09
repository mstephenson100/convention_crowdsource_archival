import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

function EditList() {
  const { year } = useParams();
  const [guests, setGuests] = useState([]);
  const [years, setYears] = useState([]);
  const [loadingYears, setLoadingYears] = useState(true);
  const [loadingGuests, setLoadingGuests] = useState(false);
  const [successBanner, setSuccessBanner] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  // Fetch years for dropdown
  useEffect(() => {
    setLoadingYears(true);
    fetch('/api/years')
      .then(res => res.json())
      .then(data => {
        setYears(data);
      })
      .catch(err => {
        console.error('Failed to fetch years:', err);
        setMessage('Failed to load years.');
      })
      .finally(() => setLoadingYears(false));
  }, []);

  // Fetch guests filtered by year
  useEffect(() => {
    if (!year) {
      setGuests([]);
      return;
    }
    setLoadingGuests(true);
    fetch(`/api/guests?year=${year}`)
      .then(res => res.json())
      .then(data => {
        setGuests(data);
      })
      .catch(err => {
        console.error('Failed to fetch guests:', err);
        setMessage('Failed to load guests for the selected year.');
      })
      .finally(() => setLoadingGuests(false));
  }, [year]);

  const handleYearChange = (e) => {
    navigate(`/edit/${e.target.value}`);
  };

  const handleDelete = async (guest_id, year) => {
    window.scrollTo(0, 0);

    const token = localStorage.getItem('auth_token');
    if (!token) {
      setMessage('Not authenticated');
      return;
    }

    try {
      const res = await fetch(`/api/guests/delete/${guest_id}/${year}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (res.ok) {
        setSuccessBanner(true);
        setMessage('Guest deletion submitted for moderation (pending approval).');
        setTimeout(() => {
          setSuccessBanner(false);
          setMessage('');
        }, 4000);
      } else {
        setMessage(data.error || 'Failed to submit deletion.');
      }
    } catch (err) {
      setMessage('Failed to submit deletion.');
      console.error(err);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Editing Tools</h1>

      {successBanner && (
        <div
          style={{
            backgroundColor: '#d4edda',
            color: '#155724',
            padding: '10px',
            border: '1px solid #c3e6cb',
            borderRadius: '4px',
            marginBottom: '20px',
            transition: 'opacity 1s ease-in-out',
          }}
        >
          ✅ {message}
        </div>
      )}

      {!successBanner && message && (
        <div
          style={{
            backgroundColor: '#f8d7da',
            color: '#721c24',
            padding: '10px',
            border: '1px solid #f5c6cb',
            borderRadius: '4px',
            marginBottom: '20px',
          }}
        >
          ⚠️ {message}
        </div>
      )}

      <label htmlFor="year-select">Select Year:</label>
      <select
        id="year-select"
        value={year || ""}
        onChange={handleYearChange}
        disabled={loadingYears}
        style={{ marginLeft: 10, marginBottom: 20 }}
      >
        <option value="">-- Select Year --</option>
        {years.map(y => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>

      <h2>Guest List for {year || "(Select a year)"}</h2>

      {loadingGuests ? (
        <p>Loading guests...</p>
      ) : (
        <table border="1" cellPadding="4" style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Blurb</th>
              <th>Biography</th>
              <th>Accolades</th>
              <th>Guest Type</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {guests.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center' }}>No guests found for this year.</td>
              </tr>
            ) : (
              guests.map(g => (
                <tr key={`${g.year}-${g.guest_id}`}>
                  <td style={{ verticalAlign: 'top' }}>
                    <Link to={`/edit/guest/${g.year}/${g.guest_id}`}>{g.guest_name}</Link>
                  </td>
                  <td style={{ verticalAlign: 'top', whiteSpace: 'pre-wrap' }}>
                    {g.blurb}
                  </td>
                  <td style={{ verticalAlign: 'top', whiteSpace: 'pre-wrap' }}>
                    {g.biography}
                  </td>
                  <td style={{ verticalAlign: 'top' }}>
                    {[g.accolades_1, g.accolades_2].filter(Boolean).join(" / ")}
                  </td>
                  <td style={{ verticalAlign: 'top' }}>
                    {g.guest_type}
                  </td>
                  <td style={{ verticalAlign: 'top' }}>
                    <button onClick={() => handleDelete(g.guest_id, g.year)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: "2rem" }}>
        <Link to="/crowdsource">← Back to Crowdsource</Link>
      </div>
    </div>
  );
}

export default EditList;

