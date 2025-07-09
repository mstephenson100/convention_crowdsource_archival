import React, { useEffect, useState } from "react";

const ASSET_BASE_URL = process.env.REACT_APP_ASSET_BASE_URL || '';

function UnsortedCollectibles() {
  const [collectibles, setCollectibles] = useState({});
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  const yearsPerPage = 2; // Number of years per page, adjust as needed

  // Scroll smoothly to top whenever page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  // Extract and sort years for pagination
  const years = Object.keys(collectibles).sort((a, b) => {
    if (a === "Unknown Year") return 1;
    if (b === "Unknown Year") return -1;
    return Number(a) - Number(b);
  });

  const totalPages = Math.ceil(years.length / yearsPerPage);

  // Get years to show on current page slice
  const yearsToShow = years.slice((page - 1) * yearsPerPage, page * yearsPerPage);

  // Pagination helper (copied from GuestSubmissions)
  function getPageNumbers(currentPage, totalPages, maxPagesToShow = 7) {
    let startPage, endPage;

    if (totalPages <= maxPagesToShow) {
      startPage = 1;
      endPage = totalPages;
    } else {
      const maxPagesBeforeCurrentPage = Math.floor(maxPagesToShow / 2);
      const maxPagesAfterCurrentPage = Math.ceil(maxPagesToShow / 2) - 1;

      if (currentPage <= maxPagesBeforeCurrentPage) {
        startPage = 1;
        endPage = maxPagesToShow;
      } else if (currentPage + maxPagesAfterCurrentPage >= totalPages) {
        startPage = totalPages - maxPagesToShow + 1;
        endPage = totalPages;
      } else {
        startPage = currentPage - maxPagesBeforeCurrentPage;
        endPage = currentPage + maxPagesAfterCurrentPage;
      }
    }

    return Array.from(Array(endPage + 1 - startPage).keys()).map(i => startPage + i);
  }

  const pagesToDisplay = getPageNumbers(page, totalPages);

  // Handler to change page
  const onPageChange = (p) => {
    setPage(p);
  };

  useEffect(() => {
    fetch("/api/collectibles/unsorted")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        if (!Array.isArray(data)) {
          setError("Unexpected response format");
          return;
        }

        // Group collectibles by filename, accumulate guest_names and guest_ids
        const groupedByFilename = {};
        data.forEach((item) => {
          const key = item.filename || `no_filename_${item.collectible_id}`;
          if (!groupedByFilename[key]) {
            groupedByFilename[key] = {
              ...item,
              guest_names: item.guest_name ? [item.guest_name] : [],
              guest_ids: item.guest_id ? [item.guest_id] : [],
            };
          } else {
            if (
              item.guest_name &&
              !groupedByFilename[key].guest_names.includes(item.guest_name)
            ) {
              groupedByFilename[key].guest_names.push(item.guest_name);
              groupedByFilename[key].guest_ids.push(item.guest_id);
            }
          }
        });

        // Convert groupedByFilename to array and sort by year ascending (null last)
        let groupedArray = Object.values(groupedByFilename).sort((a, b) => {
          if (a.year == null) return 1;
          if (b.year == null) return -1;
          return a.year - b.year;
        });

        // Group by year
        const groupedByYear = {};
        groupedArray.forEach((item) => {
          const yearKey = item.year ?? "Unknown Year";
          if (!groupedByYear[yearKey]) {
            groupedByYear[yearKey] = [];
          }
          groupedByYear[yearKey].push(item);
        });

        setCollectibles(groupedByYear);
      })
      .catch((err) => {
        setError("Failed to load collectibles: " + err.message);
      });
  }, []);

  if (error) {
    return <div style={{ padding: "20px", color: "red" }}>Error: {error}</div>;
  }

  if (!collectibles || Object.keys(collectibles).length === 0) {
    return <div style={{ padding: "20px" }}>Loading collectibles...</div>;
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Unsorted Collectibles</h1>

      {yearsToShow.map((year) => (
        <div
          key={year}
          style={{
            border: "3px double #444",
            borderRadius: "8px",
            padding: "1rem",
            marginBottom: "2rem",
          }}
        >
          <h2 style={{ marginTop: 0 }}>{year}</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
            {collectibles[year].map((item) => (
              <div
                key={item.collectible_id}
                style={{
                  flex: "1 1 calc(33.333% - 1rem)",
                  boxSizing: "border-box",
                  border: "1px solid #ccc",
                  padding: "1rem",
                  borderRadius: "6px",
                  textAlign: "left",
                }}
              >
                {item.filename ? (
                  <a
                    href={`${ASSET_BASE_URL}/${item.filename}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src={`${ASSET_BASE_URL}/${item.filename}`}
                      alt={item.name || "Collectible"}
                      style={{
                        maxWidth: "100%",
                        maxHeight: "250px",
                        objectFit: "contain",
                        marginBottom: "0.5rem",
                      }}
                    />
                  </a>
                ) : (
                  <div
                    style={{
                      height: "250px",
                      lineHeight: "250px",
                      color: "#888",
                    }}
                  >
                    No Image
                  </div>
                )}

                {item.category && (
                  <div>
                    <strong>Category:</strong> {item.category}
                  </div>
                )}
                {item.name && (
                  <div>
                    <strong>Name:</strong> {item.name}
                  </div>
                )}
                {item.notes_1 && (
                  <div>
                    <strong>Notes 1:</strong> {item.notes_1}
                  </div>
                )}
                {item.notes_2 && (
                  <div>
                    <strong>Notes 2:</strong> {item.notes_2}
                  </div>
                )}

                <div>
                  {item.guest_names.length > 0 ? (
                    item.guest_names.map((guest, idx) => (
                      <div key={idx}>
                        {item.guest_ids && item.guest_ids[idx] ? (
                          <a href={`/guest_profile/${item.guest_ids[idx]}`}>
                            {guest}
                          </a>
                        ) : (
                          guest
                        )}
                      </div>
                    ))
                  ) : (
                    <div></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Pagination Controls */}
      <div
        style={{
          marginTop: "1rem",
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <button onClick={() => onPageChange(1)} disabled={page === 1}>
          First
        </button>
        <button onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1}>
          &lt; Prev
        </button>

        {pagesToDisplay.map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            disabled={p === page}
            style={{
              fontWeight: p === page ? "bold" : "normal",
              textDecoration: p === page ? "underline" : "none",
            }}
          >
            {p}
          </button>
        ))}

        <button onClick={() => onPageChange(Math.min(page + 1, totalPages))} disabled={page === totalPages}>
          Next &gt;
        </button>
        <button onClick={() => onPageChange(totalPages)} disabled={page === totalPages}>
          Last
        </button>
      </div>
    </div>
  );
}

export default UnsortedCollectibles;

