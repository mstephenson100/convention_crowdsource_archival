import React, { useState, useEffect } from 'react';
//import { useParams, Link, useNavigate } from 'react-router-dom';
import { useParams, Link } from 'react-router-dom';

function EditDetail() {
  const { guest_id, year } = useParams();
  //const navigate = useNavigate();

  const [data, setData] = useState({});
  const [combinedOptions, setCombinedOptions] = useState([]);
  const [accoladesOptions, setAccoladesOptions] = useState([]);
  const [accolades1, setAccolades1] = useState('');
  const [accolades2, setAccolades2] = useState('');

  const [successBanner, setSuccessBanner] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch(`/api/guests/${guest_id}/${year}`)
      .then(res => res.json())
      .then(data => {
        setData({
          ...data,
          blurb: data.blurb || '',
          biography: data.biography || '',
        });
        setAccolades1(data.accolades_1 || '');
        setAccolades2(data.accolades_2 && data.accolades_2 !== data.accolades_1 ? data.accolades_2 : '');
      });

    fetch(`/api/guests/${guest_id}`)
      .then(res => res.json())
      .then(all => {
        const combined = all.map(g => ({
          year: g.year,
          blurb: g.blurb ? atob(g.blurb) : null,
          biography: g.biography ? atob(g.biography) : null
        })).filter(g => g.blurb || g.biography);
        setCombinedOptions(combined);
      });

    fetch('/api/accolades/distinct')
      .then(res => res.json())
      .then(options => setAccoladesOptions(options));
  }, [guest_id, year]);

  const handleSubmit = () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setMessage("Not authenticated");
      return;
    }

    fetch(`/api/guests/${guest_id}/${year}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        ...data,
        accolades_1: accolades1,
        accolades_2: accolades2 === accolades1 ? null : accolades2
      })
    }).then(async (res) => {
      window.scrollTo(0, 0);
      if (res.ok) {
        setMessage('');
        setSuccessBanner(true);
        setTimeout(() => setSuccessBanner(false), 3000);
      } else {
        const errorData = await res.json();
        setMessage(errorData.error || 'Failed to submit for moderation.');
      }
    }).catch(() => {
      setMessage('Network error during submission.');
    });
  };

  const handleBlurbReplace = (text) => {
    setData(prev => ({ ...prev, blurb: text }));
    window.scrollTo(0, 0);
  };

  const handleBioReplace = (text) => {
    setData(prev => ({ ...prev, biography: text }));
    window.scrollTo(0, 0);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Edit Guest Detail</h2>

      {/* Banners below header */}
      {successBanner && (
        <div style={{
          backgroundColor: '#d4edda',
          color: '#155724',
          padding: '10px',
          border: '1px solid #c3e6cb',
          borderRadius: '4px',
          marginBottom: '20px',
          transition: 'opacity 1s ease-in-out'
        }}>
          ✅ Guest submission sent for moderation!
        </div>
      )}

      {message && (
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '10px',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          ⚠️ {message}
        </div>
      )}

      <div><strong>Guest Name:</strong> {data.guest_name}</div>
      <div><strong>Year:</strong> {data.year}</div>

      <div style={{ marginTop: '10px' }}>
        <label>Guest Type:</label><br />
        <select
          value={data.guest_type || ''}
          onChange={e => setData({ ...data, guest_type: e.target.value })}
        >
          <option value="">-- select --</option>
          <option value="guest">guest</option>
          <option value="attending professional">attending professional</option>
          <option value="performance act">performance act</option>
          <option value="vendor">vendor</option>
        </select>
      </div>

      <div style={{ marginTop: '10px' }}>
        <label>Accolades 1:</label><br />
        <select value={accolades1} onChange={e => setAccolades1(e.target.value)}>
          <option value="">None</option>
          {accoladesOptions.map((a, idx) => (
            <option key={idx} value={a}>{a}</option>
          ))}
        </select>
      </div>

      <div style={{ marginTop: '10px' }}>
        <label>Accolades 2:</label><br />
        <select value={accolades2} onChange={e => setAccolades2(e.target.value)}>
          <option value="">None</option>
          {accoladesOptions.filter(a => a !== accolades1).map((a, idx) => (
            <option key={idx} value={a}>{a}</option>
          ))}
        </select>
      </div>

      <div style={{ marginTop: '10px' }}>
        <label>Blurb:</label><br />
        <textarea
          rows="4"
          cols="80"
          value={data.blurb || ''}
          onChange={e => setData({ ...data, blurb: e.target.value })}
        />
      </div>

      <div style={{ marginTop: '10px' }}>
        <label>Biography:</label><br />
        <textarea
          rows="8"
          cols="80"
          value={data.biography || ''}
          onChange={e => setData({ ...data, biography: e.target.value })}
        />
      </div>

      <div style={{ marginTop: '15px' }}>
        <button onClick={handleSubmit}>Submit for Moderation</button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <label>Copy from other years:</label>
        {combinedOptions.map(opt => (
          <div key={opt.year} style={{ marginBottom: '12px' }}>
            <strong>{opt.year}</strong><br />
            {opt.blurb && (
              <div>
                <button onClick={() => handleBlurbReplace(opt.blurb)} style={{ marginRight: '6px' }}>Use Blurb</button>
                <span style={{ fontStyle: 'italic' }}>{opt.blurb}</span>
              </div>
            )}
            {opt.biography && (
              <div>
                <button onClick={() => handleBioReplace(opt.biography)} style={{ marginRight: '6px' }}>Use Biography</button>
                <span style={{ fontStyle: 'italic' }}>{opt.biography}</span>
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ marginTop: '15px' }}>
        <Link to={`/edit/${year}`}>← Back to List</Link>
      </div>
    </div>
  );
}

export default EditDetail;

