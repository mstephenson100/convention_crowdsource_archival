import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const ASSET_BASE_URL = process.env.REACT_APP_ASSET_BASE_URL || '';

function EditCollectibleList() {
  const [collectibles, setCollectibles] = useState([]);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [successBanner, setSuccessBanner] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const perPage = 20; // Adjust number of items per page

  // Pagination helper from GuestSubmissions
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

  const totalPages = Math.ceil(collectibles.length / perPage);
  const pagesToDisplay = getPageNumbers(page, totalPages);

  // Smooth scroll to top on page change
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  const fetchCollectibles = () => {
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

        // Group collectibles by filename
        const grouped = {};
        data.forEach((item) => {
          const key = item.filename || `no_filename_${item.collectible_id}`;
          if (!grouped[key]) {
            grouped[key] = {
              ...item,
              guest_names: item.guest_name ? [item.guest_name] : [],
            };
          } else {
            if (
              item.guest_name &&
              !grouped[key].guest_names.includes(item.guest_name)
            ) {
              grouped[key].guest_names.push(item.guest_name);
            }
          }
        });

        // Convert grouped object to array
        const groupedArray = Object.values(grouped);

        // Sort grouped by year ascending with null/undefined at end
        groupedArray.sort((a, b) => {
          if (a.year == null) return 1;
          if (b.year == null) return -1;
          return a.year - b.year;
        });

        setCollectibles(groupedArray);
        setPage(1); // reset to page 1 on data load
      })
      .catch((err) => {
        setError("Failed to load collectibles: " + err.message);
      });
  };

  useEffect(() => {
    fetchCollectibles();
  }, []);

  // Current page slice
  const currentPageItems = collectibles.slice((page - 1) * perPage, page * perPage);

  const onPageChange = (p) => {
    setPage(p);
  };

  const handleDelete = async (collectible_id) => {
    // Removed the confirmation popup here

    const token = localStorage.getItem("auth_token");
    if (!token) {
      setMessage("Not authenticated");
      return;
    }

    try {
      const res = await fetch(`/api/collectibles/delete/${encodeURIComponent(collectible_id)}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessBanner(true);
        setMessage('Collectible deletion submitted for moderation (pending approval).');
        window.scrollTo({ top: 0, behavior: "smooth" });
        setTimeout(() => {
          setSuccessBanner(false);
          setMessage('');
          // Refresh collectibles after deletion
          fetchCollectibles();
        }, 4000);
      } else {
        setMessage(data.error || 'Failed to submit deletion.');
      }
    } catch (err) {
      setMessage("Network error: " + err.message);
    }
  };

  if (error) {
    return (
      <div style={{ padding: "20px", color: "red" }}>
        Error loading collectibles: {error}
      </div>
    );
  }

  if (collectibles.length === 0) {
    return <div style={{ padding: "20px" }}>Loading collectibles...</div>;
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Edit Collectibles</h1>

      {successBanner && (
        <div
          style={{
            backgroundColor: "#d4edda",
            color: "#155724",
            padding: "10px",
            border: "1px solid #c3e6cb",
            borderRadius: "4px",
            marginBottom: "20px",
          }}
        >
          {message}
        </div>
      )}

      {message && !successBanner && (
        <div style={{ color: "red", marginBottom: "20px" }}>{message}</div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
        {currentPageItems.map((item) => (
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

            {item.year != null && (
              <div>
                <strong>Year:</strong> {item.year}
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
                    <strong>Guest Name:</strong> {guest}
                  </div>
                ))
              ) : (
                <div>No guest names</div>
              )}
            </div>

            <button
              style={{ marginTop: "0.5rem", marginRight: "0.5rem" }}
              onClick={() => navigate(`/edit/collectible/${item.collectible_id}`)}
            >
              Edit
            </button>
            <button
              style={{ marginTop: "0.5rem" }}
              onClick={() => handleDelete(item.collectible_id)}
            >
              Delete
            </button>
          </div>
        ))}
      </div>

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

      {/* Back to Crowdsource link */}
      <div style={{ marginTop: "2rem" }}>
        <Link
          to="/crowdsource"
          style={{
            color: "#ffcc00",
            textDecoration: "underline",
            cursor: "pointer",
          }}
        >
          ← Back to Crowdsource
        </Link>
      </div>
    </div>
  );
}

export default EditCollectibleList;

