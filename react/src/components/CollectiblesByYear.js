import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

const ASSET_BASE_URL = process.env.REACT_APP_ASSET_BASE_URL || '';

function CollectiblesByYear() {
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [collectibles, setCollectibles] = useState([]);
  const location = useLocation();

  useEffect(() => {
    fetch(`/api/years`)
      .then(res => res.json())
      .then(data => {
        const sortedYears = data.sort();
        setYears(sortedYears);
      })
      .catch(err => {
        console.error("Failed to fetch years:", err);
      });
  }, []);

  useEffect(() => {
    if (!selectedYear) {
      setCollectibles([]);
      return;
    }

    fetch(`/api/collectibles/by_year/${selectedYear}`)
      .then(res => res.json())
      .then(data => {
        setCollectibles(data);
      })
      .catch(err => {
        console.error(`Failed to fetch collectibles for year ${selectedYear}:`, err);
        setCollectibles([]);
      });
  }, [selectedYear]);

  // Group collectibles by category
  const groupedByCategory = collectibles.reduce((acc, item) => {
    const cat = item.category || "Uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  // Define category order: Programs, Badges, Clothing, then others alphabetically
  const categoryOrder = ["Programs", "Badges", "Clothing"];
  const sortedCategories = Object.keys(groupedByCategory).sort((a, b) => {
    const ai = categoryOrder.indexOf(a);
    const bi = categoryOrder.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  // Helper: chunk array into subarrays of size n
  const chunk = (arr, size) =>
    arr.reduce((chunks, item, i) => {
      if (i % size === 0) chunks.push([]);
      chunks[chunks.length - 1].push(item);
      return chunks;
    }, []);

  // Helper to check if guest_name or notes_1 or notes_2 is not null/empty
  const hasContent = (item) => {
    return (
      (item.guest_name && item.guest_name.trim() !== "") ||
      (item.notes_1 && item.notes_1.trim() !== "") ||
      (item.notes_2 && item.notes_2.trim() !== "")
    );
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Collectibles</h1>

      <label htmlFor="year-select">Select Year:</label>
      <select
        id="year-select"
        value={selectedYear}
        onChange={e => setSelectedYear(e.target.value)}
        style={{ marginLeft: 10, marginBottom: 20 }}
      >
        <option value="">-- Select Year --</option>
        {years.map(y => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>

      {sortedCategories.length === 0 && selectedYear && (
        <p>No collectibles found for {selectedYear}.</p>
      )}

      {sortedCategories.map(category => {
        const items = groupedByCategory[category];
        // Sort items: those with content first, then those without
        const sortedItems = [
          ...items.filter(hasContent),
          ...items.filter(item => !hasContent(item))
        ];

        return (
          <div key={category} style={{ marginBottom: '3rem' }}>
            <h2>{category}</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {chunk(sortedItems, 3).map((rowItems, rowIndex) => (
                  <tr key={rowIndex}>
                    {rowItems.map((item, idx) => (
                      <td key={idx} style={{ padding: '10px', verticalAlign: 'top', border: '1px solid #ddd' }}>
                        {item.name && <div><strong>{item.name}</strong></div>}

                        {item.guest_name && item.guest_name.trim() !== "" && (
                          <div>
                            <em>
                              Artist: <Link to={`/guest_profile/${item.guest_id}`} state={{ from: location }}>{item.guest_name}</Link>
                            </em>
                          </div>
                        )}

                        {item.notes_1 && <p>{item.notes_1}</p>}
                        {item.notes_2 && <p>{item.notes_2}</p>}

                        {item.filename && (
                          <a href={`${ASSET_BASE_URL}/${item.filename}`} target="_blank" rel="noreferrer">
                            <img
                              src={`${ASSET_BASE_URL}/${item.filename}`}
                              alt={item.name || 'Collectible image'}
                              style={{ maxWidth: '100%', marginTop: 10 }}
                            />
                          </a>
                        )}
                      </td>
                    ))}
                    {/* Fill empty cells if less than 3 items in row */}
                    {rowItems.length < 3 && Array.from({ length: 3 - rowItems.length }).map((_, i) => (
                      <td key={`empty-${i}`} style={{ border: '1px solid #ddd' }} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      <br />
      <Link to="/collectibles">← Back to Collectibles</Link>
    </div>
  );
}

export default CollectiblesByYear;

