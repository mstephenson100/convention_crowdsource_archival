import React, { useState, useEffect, useRef, useCallback } from "react";
//import { useParams, Link, useNavigate } from "react-router-dom";
import { useParams, Link } from "react-router-dom";

const ASSET_BASE_URL = process.env.REACT_APP_ASSET_BASE_URL || '';

// Reusable AutocompleteInput component with debounced fetch
function AutocompleteInput({
  value,
  onChange,
  fetchUrl,
  placeholder,
  customFetch,
  externalResults,
}) {
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const lastFetchQueryRef = useRef("");
  const timeoutRef = useRef(null);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      if (!hasFocus) setShowDropdown(false);
      lastFetchQueryRef.current = "";
      return;
    }

    if (query.trim() === lastFetchQueryRef.current) {
      // Skip duplicate fetch for same query
      return;
    }

    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      lastFetchQueryRef.current = query.trim();

      if (customFetch) {
        customFetch(query.trim());
      } else {
        fetch(`${fetchUrl}?q=${encodeURIComponent(query.trim())}`)
          .then((res) => res.json())
          .then((data) => {
            setResults(data || []);
            if (hasFocus) setShowDropdown(true);
          })
          .catch(() => {
            setResults([]);
            setShowDropdown(false);
          });
      }
    }, 300);

    return () => clearTimeout(timeoutRef.current);
  }, [query, fetchUrl, customFetch, hasFocus]);

  useEffect(() => {
    if (externalResults) setResults(externalResults);
  }, [externalResults]);

  const handleSelect = (val) => {
    onChange(val);
    setQuery(val);
    setShowDropdown(false);
  };

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
        }}
        onFocus={() => {
          setHasFocus(true);
          if (results.length > 0) setShowDropdown(true);
        }}
        onBlur={() => {
          setTimeout(() => {
            setShowDropdown(false);
            setHasFocus(false);
          }, 150);
        }}
        style={{ width: "100%", color: "#000" }}
        autoComplete="off"
        placeholder={placeholder}
      />
      {showDropdown && results.length > 0 && (
        <ul
          style={{
            position: "absolute",
            zIndex: 1000,
            background: "#fff",
            color: "#000",
            border: "1px solid #ccc",
            marginTop: 0,
            maxHeight: "200px",
            overflowY: "auto",
            width: "100%",
            listStyle: "none",
            paddingLeft: 0,
          }}
        >
          {results.map((item, idx) => (
            <li
              key={idx}
              onMouseDown={() => handleSelect(item)}
              style={{
                padding: "6px 10px",
                cursor: "pointer",
                borderBottom: "1px solid #eee",
              }}
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// GuestNameAutocomplete using AutocompleteInput, with debounced guest search fetch
function GuestNameAutocomplete({ value, onChange }) {
  const [results, setResults] = useState([]);
  const lastQueryRef = useRef("");

  const fetchUrl = "/api/guests/search";

  const handleFetch = useCallback((query) => {
    if (!query.trim()) {
      setResults([]);
      lastQueryRef.current = "";
      return;
    }
    if (query === lastQueryRef.current) {
      return; // avoid duplicate fetch
    }
    lastQueryRef.current = query;

    fetch(`${fetchUrl}?q=${encodeURIComponent(query)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.guests) {
          setResults(data.guests.map((g) => g.guest_name));
        } else {
          setResults([]);
        }
      })
      .catch(() => setResults([]));
  }, []);

  return (
    <AutocompleteInput
      value={value}
      onChange={onChange}
      fetchUrl="" // disables internal fetch; uses customFetch
      placeholder="Type guest name..."
      customFetch={handleFetch}
      externalResults={results}
    />
  );
}

function EditCollectibleDetail() {
  const { collectible_id } = useParams();
  //const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [message, setMessage] = useState("");
  const [successBanner, setSuccessBanner] = useState(false);

  useEffect(() => {
    if (!collectible_id) {
      setMessage("No collectible ID provided.");
      return;
    }

    const token = localStorage.getItem("auth_token");
    if (!token) {
      setMessage("You must be logged in to edit collectibles.");
      return;
    }

    fetch(`/api/collectibles/${collectible_id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (res.status === 401) {
          setMessage("Unauthorized — please log in.");
          throw new Error("Unauthorized");
        }
        if (!res.ok) {
          setMessage("Failed to load collectible data.");
          throw new Error("Failed to load collectible");
        }
        return res.json();
      })
      .then((data) => setData(data))
      .catch((err) => {
        console.error(err);
      });
  }, [collectible_id]);

  const handleChange = (field, value) => {
    setData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = () => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setMessage("Not authenticated");
      return;
    }

    fetch(`/api/collectibles/${collectible_id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    })
      .then(async (res) => {
        window.scrollTo(0, 0);
        if (res.ok) {
          setMessage("");
          setSuccessBanner(true);
          setTimeout(() => setSuccessBanner(false), 3000);
        } else {
          const errorData = await res.json();
          setMessage(errorData.error || "Failed to submit changes.");
        }
      })
      .catch(() => {
        setMessage("Network error during submission.");
      });
  };

  if (!data && message) {
    return (
      <div style={{ padding: "20px", color: "red" }}>
        ⚠️ {message}
        <div>
          <Link to="/edit/collectibles">← Back to list</Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div>Loading...</div>;
  }

  const imageUrl = data.filename ? `${ASSET_BASE_URL}/${data.filename}` : null;

  return (
    <div style={{ padding: "20px" }}>
      <h2>Edit Collectible Detail</h2>

      {successBanner && (
        <div
          style={{
            backgroundColor: "#d4edda",
            color: "#155724",
            padding: "10px",
            border: "1px solid #c3e6cb",
            borderRadius: "4px",
            marginBottom: "20px",
            transition: "opacity 1s ease-in-out",
          }}
        >
          ✅ Changes submitted successfully!
        </div>
      )}

      {message && (
        <div
          style={{
            backgroundColor: "#f8d7da",
            color: "#721c24",
            padding: "10px",
            border: "1px solid #f5c6cb",
            borderRadius: "4px",
            marginBottom: "20px",
          }}
        >
          ⚠️ {message}
        </div>
      )}

      {imageUrl ? (
        <div style={{ marginBottom: "20px" }}>
          <a href={imageUrl} target="_blank" rel="noopener noreferrer">
            <img
              src={imageUrl}
              alt={data.name || "Collectible Image"}
              style={{
                maxWidth: "400px",
                maxHeight: "400px",
                objectFit: "contain",
                cursor: "pointer",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
            />
          </a>
        </div>
      ) : (
        <div
          style={{
            marginBottom: "20px",
            width: "400px",
            height: "400px",
            lineHeight: "400px",
            textAlign: "center",
            color: "#888",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
        >
          No Image Available
        </div>
      )}

      {/* Editable Name */}
      <div style={{ marginTop: "10px" }}>
        <label>Name:</label>
        <br />
        <input
          type="text"
          value={data.name || ""}
          onChange={(e) => handleChange("name", e.target.value)}
        />
      </div>

      {/* Editable Year */}
      <div style={{ marginTop: "10px" }}>
        <label>Year:</label>
        <br />
        <input
          type="number"
          value={data.year || ""}
          onChange={(e) => handleChange("year", e.target.value)}
        />
      </div>

      {/* Editable Category with Autocomplete */}
      <div style={{ marginTop: "10px" }}>
        <label>Category:</label>
        <br />
        <AutocompleteInput
          value={data.category}
          onChange={(val) => handleChange("category", val)}
          fetchUrl="/api/collectibles/categories"
          placeholder="Type category..."
        />
      </div>

      {/* Editable Notes 1 */}
      <div style={{ marginTop: "10px" }}>
        <label>Notes 1:</label>
        <br />
        <textarea
          rows="4"
          cols="80"
          value={data.notes_1 || ""}
          onChange={(e) => handleChange("notes_1", e.target.value)}
        />
      </div>

      {/* Editable Notes 2 */}
      <div style={{ marginTop: "10px" }}>
        <label>Notes 2:</label>
        <br />
        <textarea
          rows="4"
          cols="80"
          value={data.notes_2 || ""}
          onChange={(e) => handleChange("notes_2", e.target.value)}
        />
      </div>

      {/* Guest Name with Autocomplete */}
      <div style={{ marginTop: "10px" }}>
        <label>Guest Name:</label>
        <br />
        <GuestNameAutocomplete
          value={data.guest_name}
          onChange={(val) => handleChange("guest_name", val)}
        />
      </div>

      <div style={{ marginTop: "15px" }}>
        <button onClick={handleSubmit}>Submit for Moderation</button>
      </div>

      <div style={{ marginTop: "10px" }}>
        <Link to="/edit/collectibles">← Back to list</Link>
      </div>
    </div>
  );
}

export default EditCollectibleDetail;

