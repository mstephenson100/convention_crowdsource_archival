import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

function GuestSubmissions() {
  const { userId } = useParams();  // get userId from route params
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const perPage = 20; // or any number your API supports / you prefer

  // Function to calculate page numbers for pagination
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

  useEffect(() => {
    if (!userId) return;

    setLoading(true);
    const token = localStorage.getItem("auth_token");

    fetch(`/api/user/${userId}/guest_submissions?page=${page}&per_page=${perPage}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch guest submissions");
        return res.json();
      })
      .then((data) => {
        // Sort entries: Pending(1) first, Rejected(0) second, Approved(2) last
        const sorted = (data.submissions || []).sort((a, b) => {
          const order = { 1: 0, 0: 1, 2: 2 };
          return order[a.state] - order[b.state];
        });
        setEntries(sorted);
        setPages(data.total_pages || 1);
        setPage(data.current_page || 1);
        setError("");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [userId, page]);

  const renderState = (state) => {
    switch (state) {
      case 0:
        return <span style={{ color: "red", fontWeight: "bold" }}>Rejected</span>;
      case 1:
        return <span style={{ color: "yellow", fontWeight: "bold" }}>Pending</span>;
      case 2:
        return <span style={{ color: "green", fontWeight: "bold" }}>Approved</span>;
      default:
        return "Unknown";
    }
  };

  const pagesToDisplay = getPageNumbers(page, pages);

  // Scroll to top when page changes
  const onPageChange = (p) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) return <p>Loading guest submissions...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (entries.length === 0) return <p>No guest submissions found.</p>;

  return (
    <div>
      <h3>My Guest Submissions</h3>
      <ul style={{ listStyle: "none", paddingLeft: 0 }}>
        {entries.map((entry) => (
          <li key={entry.id} style={{ padding: "0.5rem 0", borderBottom: "1px solid #ccc" }}>
            <strong>{entry.guest_name}</strong> ({entry.year}) — <em>{renderState(entry.state)}</em><br />
            Submitted on: {new Date(entry.timestamp).toLocaleString()}<br />

            {entry.guest_type && <div><strong>Guest Type:</strong> {entry.guest_type}</div>}

            {entry.blurb && entry.blurb.trim() !== "" && (
              <div><strong>Blurb:</strong> {entry.blurb}</div>
            )}

            {entry.biography && entry.biography.trim() !== "" && (
              <div><strong>Biography:</strong> {entry.biography}</div>
            )}

            {(entry.accolades_1 || entry.accolades_2) && (
              <div><strong>Accolades:</strong> {[entry.accolades_1, entry.accolades_2].filter(Boolean).join(", ")}</div>
            )}
          </li>
        ))}
      </ul>

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

        {pagesToDisplay.map(p => (
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

        <button onClick={() => onPageChange(Math.min(page + 1, pages))} disabled={page === pages}>
          Next &gt;
        </button>
        <button onClick={() => onPageChange(pages)} disabled={page === pages}>
          Last
        </button>
      </div>

      {/* Back Link to User Profile */}
      <div style={{ marginTop: "2rem" }}>
        <Link 
          to={`/user/${userId}`} 
          style={{ color: "#ffcc00", textDecoration: "underline", cursor: "pointer" }}
        >
          ← Back to Profile
        </Link>
      </div>
    </div>
  );
}

export default GuestSubmissions;

