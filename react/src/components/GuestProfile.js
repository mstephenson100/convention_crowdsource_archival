import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

const ASSET_BASE_URL = process.env.REACT_APP_ASSET_BASE_URL || '';

function GuestProfile() {
  const { guest_id } = useParams();
  const [profile, setProfile] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from || '/guest_search';

  useEffect(() => {
    //fetch(`http://localhost:5000/guest_profile/${guest_id}`)
    fetch(`/api/guest_profile/${guest_id}`)
      .then(res => res.json())
      .then(setProfile);
  }, [guest_id]);

  if (!profile) return <div>Loading...</div>;

  const collectiblesByYear = new Map();
  if (profile.collectibles) {
    profile.collectibles.forEach(c => {
      const y = c.year || "Unknown";
      if (!collectiblesByYear.has(y)) {
        collectiblesByYear.set(y, []);
      }
      collectiblesByYear.get(y).push(c);
    });
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Guest Profile</h1>

      {profile.yearly_guests && profile.yearly_guests.length > 0 && (
        <div>
          <h2>{profile.yearly_guests[0].guest_name}</h2>

          {profile.yearly_guests.map((entry, i) => {
            const year = entry.year;
            const collectiblesForYear = collectiblesByYear.get(year) || [];

            return (
              <div key={i} style={{ marginBottom: '2rem' }}>
                <strong>{year}</strong>

                {entry.accolades_1 && <div><em>{entry.accolades_1}</em></div>}
                {entry.accolades_2 && <div><em>{entry.accolades_2}</em></div>}

                {entry.blurb && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <strong>Blurb:</strong>
                    <div>{atob(entry.blurb)}</div>
                  </div>
                )}

                {entry.biography && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <strong>Biography:</strong>
                    <div>{atob(entry.biography)}</div>
                  </div>
                )}

                {collectiblesForYear.length > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <strong>Collectibles:</strong>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '1rem',
                        marginTop: '0.5rem'
                      }}
                    >
                      {collectiblesForYear.map((c, idx) => (
                        <div key={idx} style={{ border: '1px solid #ddd', padding: '0.5rem', borderRadius: '4px' }}>
                          {c.name && <div><strong>{c.name}</strong></div>}
                          {c.notes_1 && <div>Notes 1: {c.notes_1}</div>}
                          {c.notes_2 && <div>Notes 2: {c.notes_2}</div>}
                          {c.filename && (
                            <a
                              href={`${ASSET_BASE_URL}/${c.filename}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <img
                                src={`${ASSET_BASE_URL}/${c.filename}`}
                                alt={c.name || "Collectible"}
                                style={{ width: '100%', height: 'auto', marginTop: '0.5rem', borderRadius: '4px' }}
                              />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {entry.guest_type && <div><strong>Guest Type:</strong> {entry.guest_type}</div>}
                {entry.url && (
                  <div>
                    <strong>URL:</strong>{" "}
                    <a href={entry.url} target="_blank" rel="noreferrer">{entry.url}</a>
                  </div>
                )}

                <hr />
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={() => navigate(from)}
        style={{ marginTop: '2rem', cursor: 'pointer' }}
      >
        ← Back
      </button>
    </div>
  );
}

export default GuestProfile;

