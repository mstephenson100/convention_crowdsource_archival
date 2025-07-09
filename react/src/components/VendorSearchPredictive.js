import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";

function VendorSearchPredictive() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [allGuests, setAllGuests] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [error, setError] = useState(null);
  const debounceTimeout = useRef(null);
  const perPage = 100;

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

  const fetchGuests = (pageNumber = 1) => {
    fetch(`/api/vendors/search?page=${pageNumber}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch vendors");
        return res.json();
      })
      .then((data) => {
        setAllGuests(data.guests);
        setPages(data.pages || Math.ceil((data.total || perPage) / perPage));
        setPage(data.page);
        setError(null);
      })
      .catch((err) => setError(err.message || "Error loading vendors"));
  };

  useEffect(() => {
    if (!query.trim()) {
      fetchGuests(page);
    } else {
      setAllGuests([]);
      setPages(1);
      setPage(1);
    }
  }, [page, query]);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

    debounceTimeout.current = setTimeout(() => {
      fetch(`/api/vendors/search?q=${encodeURIComponent(query.trim())}&page=1`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch suggestions");
          return res.json();
        })
        .then((data) => {
          setSuggestions(data.guests.slice(0, 30));
          setError(null);
        })
        .catch((err) => {
          setError(err.message || "Error loading suggestions");
          setSuggestions([]);
        });
    }, 300);

    return () => clearTimeout(debounceTimeout.current);
  }, [query]);

  const handleSelect = (guest_id) => {
    window.location.href = `/guest_profile/${guest_id}`;
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo(0, 0); // Scroll to top on page change
  };

  const pagesToDisplay = getPageNumbers(page, pages, 7);

  return (
    <div style={{ padding: "2rem", maxWidth: "600px", position: "relative" }}>
      <h1>Vendor Search</h1>
      <input
        type="text"
        placeholder="Type vendor name..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setPage(1);
        }}
        style={{ width: "100%", padding: "0.5rem" }}
        aria-label="Search vendors"
      />
      {error && <div style={{ color: "red" }}>{error}</div>}

      {suggestions.length > 0 && query.trim() && (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: "0.5rem 0",
            border: "1px solid #ccc",
            borderRadius: "4px",
            maxHeight: "200px",
            overflowY: "auto",
            backgroundColor: "white",
            position: "absolute",
            width: "100%",
            zIndex: 1000,
            color: "#000",
          }}
        >
          {suggestions.map((guest) => (
            <li
              key={guest.guest_id}
              style={{ padding: "0.5rem", cursor: "pointer", color: "#000" }}
              onClick={() => handleSelect(guest.guest_id)}
              tabIndex={0}
              role="button"
            >
              {guest.guest_name}
            </li>
          ))}
        </ul>
      )}

      {!query.trim() && (
        <>
          <h2 style={{ marginTop: "2rem" }}>All Vendors</h2>
          <ul>
            {allGuests.map((guest) => (
              <li key={guest.guest_id}>
                <Link to={`/guest_profile/${guest.guest_id}`}>
                  {guest.guest_name}
                </Link>
              </li>
            ))}
          </ul>

          {/* Pagination Controls with yellow button styling */}
          <div
            style={{
              marginTop: "1rem",
              userSelect: "none",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              flexWrap: "nowrap",
            }}
          >
            <button
              onClick={() => page > 1 && handlePageChange(1)}
              disabled={page <= 1}
              style={{
                backgroundColor: "#ffcc00",
                border: "none",
                padding: "6px 12px",
                fontWeight: "bold",
                borderRadius: "3px",
                cursor: page > 1 ? "pointer" : "default",
                color: "#000",
                whiteSpace: "nowrap",
              }}
            >
              First
            </button>
            <button
              onClick={() => page > 1 && handlePageChange(page - 1)}
              disabled={page <= 1}
              style={{
                backgroundColor: "#ffcc00",
                border: "none",
                padding: "6px 12px",
                fontWeight: "bold",
                borderRadius: "3px",
                cursor: page > 1 ? "pointer" : "default",
                color: "#000",
                whiteSpace: "nowrap",
              }}
            >
              {"< Prev"}
            </button>

            {pagesToDisplay.map((p) => (
              <button
                key={p}
                onClick={() => p !== page && handlePageChange(p)}
                disabled={p === page}
                style={{
                  backgroundColor: p === page ? "#e0b800" : "#ffcc00",
                  border: "none",
                  padding: "6px 12px",
                  fontWeight: p === page ? "bold" : "normal",
                  borderRadius: "3px",
                  cursor: p === page ? "default" : "pointer",
                  color: "#000",
                }}
              >
                {p}
              </button>
            ))}

            <button
              onClick={() => page < pages && handlePageChange(page + 1)}
              disabled={page >= pages}
              style={{
                backgroundColor: "#ffcc00",
                border: "none",
                padding: "6px 12px",
                fontWeight: "bold",
                borderRadius: "3px",
                cursor: page < pages ? "pointer" : "default",
                color: "#000",
                whiteSpace: "nowrap",
              }}
            >
              {"Next >"}
            </button>
            <button
              onClick={() => page < pages && handlePageChange(pages)}
              disabled={page >= pages}
              style={{
                backgroundColor: "#ffcc00",
                border: "none",
                padding: "6px 12px",
                fontWeight: "bold",
                borderRadius: "3px",
                cursor: page < pages ? "pointer" : "default",
                color: "#000",
                whiteSpace: "nowrap",
              }}
            >
              Last
            </button>

            <span
              style={{
                marginLeft: "auto",
                fontWeight: "normal",
                color: "#555",
                whiteSpace: "nowrap",
                padding: "0 10px",
              }}
            >
              ({page}/{pages})
            </span>
          </div>
        </>
      )}

      {/* Back button at bottom */}
      <div style={{ marginTop: "2rem" }}>
        <Link
          to="/"
          style={{ color: "#ffcc00", textDecoration: "underline", cursor: "pointer" }}
        >
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}

export default VendorSearchPredictive;
