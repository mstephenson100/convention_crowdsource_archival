import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

const ASSET_BASE_URL = process.env.REACT_APP_ASSET_BASE_URL || "";
const PER_PAGE = 15; // items per page, adjust as needed

function CollectibleSubmissions() {
  const { userId } = useParams();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!userId) return;

    setLoading(true);
    const token = localStorage.getItem("auth_token");
    fetch(
      `/api/user/${userId}/collectible_submissions?page=${page}&per_page=${PER_PAGE}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch collectible submissions");
        return res.json();
      })
      .then((data) => {
        // Sort by state: Pending(1) first, then Rejected(0), then Approved(2)
        const sorted = data.submissions.sort((a, b) => {
          const order = { 1: 0, 0: 1, 2: 2 };
          return order[a.state] - order[b.state];
        });
        setEntries(sorted);
        setTotalPages(data.total_pages);
        setError("");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [userId, page]);

  const renderState = (state) => {
    switch (state) {
      case 0:
        return (
          <div style={{ fontWeight: "bold", color: "red", marginBottom: "0.3rem" }}>
            Rejected
          </div>
        );
      case 1:
        return (
          <div style={{ fontWeight: "bold", color: "yellow", marginBottom: "0.3rem" }}>
            Pending
          </div>
        );
      case 2:
        return (
          <div style={{ fontWeight: "bold", color: "green", marginBottom: "0.3rem" }}>
            Approved
          </div>
        );
      default:
        return <div style={{ marginBottom: "0.3rem" }}>Unknown</div>;
    }
  };

  const handleFirstPage = () => setPage(1);
  const handlePrevPage = () => setPage((p) => Math.max(p - 1, 1));
  const handleNextPage = () => setPage((p) => Math.min(p + 1, totalPages));
  const handleLastPage = () => setPage(totalPages);

  const renderPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 7;
    let startPage = Math.max(1, page - Math.floor(maxPagesToShow / 2));
    let endPage = startPage + maxPagesToShow - 1;
    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => setPage(i)}
          disabled={i === page}
          style={{
            margin: "0 3px",
            fontWeight: i === page ? "bold" : "normal",
            cursor: i === page ? "default" : "pointer",
          }}
        >
          {i}
        </button>
      );
    }
    return pages;
  };

  if (loading) return <p>Loading collectible submissions...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (entries.length === 0) return <p>No collectible submissions found.</p>;

  return (
    <div>
      <h3>My Collectible Submissions</h3>
      <ul style={{ listStyle: "none", paddingLeft: 0 }}>
        {entries.map((entry) => (
          <li
            key={entry.id}
            style={{ padding: "0.5rem 0", borderBottom: "1px solid #ccc" }}
          >
            {/* Status line */}
            {renderState(entry.state)}

            {/* Guest */}
            {entry.guest_name && (
              <>
                <strong>Guest:</strong> {entry.guest_name}
                <br />
              </>
            )}

            {/* Category */}
            {entry.category && (
              <>
                <strong>Category:</strong> {entry.category}
                <br />
              </>
            )}

            {/* Year */}
            <div>
              <strong>Year:</strong> {entry.year}
            </div>

            {/* Name with "Name:" label in bold */}
            <div style={{ marginTop: "0.3rem", marginBottom: "0.3rem" }}>
              <strong>Name:</strong> {entry.name || "(Unnamed collectible)"}
            </div>

            {/* Notes */}
            {entry.notes_1 && (
              <>
                <strong>Notes 1:</strong> {entry.notes_1}
                <br />
              </>
            )}
            {entry.notes_2 && (
              <>
                <strong>Notes 2:</strong> {entry.notes_2}
                <br />
              </>
            )}

            {/* Submitted on */}
            <div>
              <strong>Submitted on:</strong> {new Date(entry.timestamp).toLocaleString()}
            </div>

            {/* Image */}
            {entry.filename && (
              <div style={{ marginTop: "0.5rem" }}>
                <a
                  href={`${ASSET_BASE_URL}/${entry.filename}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src={`${ASSET_BASE_URL}/${entry.filename}`}
                    alt={entry.name || "Collectible image"}
                    style={{
                      maxWidth: "150px",
                      maxHeight: "150px",
                      objectFit: "contain",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                    }}
                  />
                </a>
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* Pagination Controls */}
      <div style={{ marginTop: "1rem", textAlign: "center" }}>
        <button
          onClick={handleFirstPage}
          disabled={page === 1}
          style={{ marginRight: "5px" }}
        >
          First
        </button>
        <button
          onClick={handlePrevPage}
          disabled={page === 1}
          style={{ marginRight: "5px" }}
        >
          Previous
        </button>

        {renderPageNumbers()}

        <button
          onClick={handleNextPage}
          disabled={page === totalPages}
          style={{ marginLeft: "5px" }}
        >
          Next
        </button>
        <button
          onClick={handleLastPage}
          disabled={page === totalPages}
          style={{ marginLeft: "5px" }}
        >
          Last
        </button>

        <div style={{ marginTop: "0.5rem" }}>
          Page {page} of {totalPages}
        </div>
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

export default CollectibleSubmissions;

