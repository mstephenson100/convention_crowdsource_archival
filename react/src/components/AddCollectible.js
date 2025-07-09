import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";

// Fixed AutocompleteInput component
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
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (customFetch) {
      customFetch(query);
      setShowDropdown(true);
      return;
    }

    if (!query.trim()) {
      setResults([]);
      return;
    }

    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      fetch(`${fetchUrl}?q=${encodeURIComponent(query.trim())}`)
        .then((res) => res.json())
        .then((data) => {
          setResults(data || []);
          setShowDropdown(true);
        })
        .catch(() => {
          setResults([]);
          setShowDropdown(false);
        });
    }, 300);

    return () => clearTimeout(timeoutRef.current);
  }, [query, fetchUrl, customFetch]); // externalResults intentionally not included

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  const handleSelect = (val) => {
    onChange(val);
    setQuery(val);
    setShowDropdown(false);
  };

  const displayResults = customFetch ? externalResults || [] : results;

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
          if (displayResults.length > 0) setShowDropdown(true);
        }}
        onBlur={() => {
          setTimeout(() => setShowDropdown(false), 150);
        }}
        style={{ width: "100%", color: "#000" }}
        autoComplete="off"
        placeholder={placeholder}
      />
      {showDropdown && displayResults.length > 0 && (
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
          {displayResults.map((item, idx) => (
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

// Memoized GuestNameAutocomplete wrapper component
function GuestNameAutocomplete({ value, onChange }) {
  const [results, setResults] = useState([]);

  const fetchUrl = "/api/guests/search";

  // useCallback ensures handleFetch identity is stable
  const handleFetch = useCallback(
    (query) => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      fetch(`${fetchUrl}?q=${encodeURIComponent(query.trim())}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.guests) {
            setResults(data.guests.map((g) => g.guest_name));
          } else {
            setResults([]);
          }
        })
        .catch(() => setResults([]));
    },
    [fetchUrl]
  );

  return (
    <AutocompleteInput
      value={value}
      onChange={onChange}
      fetchUrl="" // ignored because using customFetch
      placeholder="Type guest name..."
      customFetch={handleFetch}
      externalResults={results}
    />
  );
}

function AddCollectible() {
  const [formData, setFormData] = useState({
    year: "",
    name: "",
    guest_name: "",
    notes_1: "",
    notes_2: "",
    category: "",
  });
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [message, setMessage] = useState("");
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);

      // Create a preview URL for the selected file
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
    }
  };

  // Cleanup the object URL when file changes or component unmounts
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setFadeOut(false);
    setShowSuccessBanner(false);

    if (!file) {
      setMessage("Please select an image file to upload.");
      return;
    }

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        setMessage("You must be logged in.");
        return;
      }

      const data = new FormData();
      data.append("file", file);
      Object.entries(formData).forEach(([key, value]) => {
        if (value) data.append(key, value);
      });

      const res = await fetch("/api/collectibles/add", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: data,
      });

      if (res.ok) {
        window.scrollTo(0, 0);

        setShowSuccessBanner(true);
        setMessage("Collectible submitted successfully for moderation!");
        setFormData({
          year: "",
          name: "",
          guest_name: "",
          notes_1: "",
          notes_2: "",
          category: "",
        });
        setFile(null);

        // Clear preview image
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          setPreviewUrl(null);
        }
        e.target.reset();

        // Start fadeout after 4 seconds
        setTimeout(() => {
          setFadeOut(true);
        }, 4000);

        // Hide banner completely after fade out (say 1s)
        setTimeout(() => {
          setShowSuccessBanner(false);
          setMessage("");
          setFadeOut(false);
        }, 5000);
      } else {
        const err = await res.json();
        setMessage(err.error || "Failed to submit collectible.");
      }
    } catch (error) {
      setMessage("Network error: " + error.message);
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "auto" }}>
      <h2>Add Collectible</h2>

      {showSuccessBanner && (
        <div
          style={{
            marginBottom: "20px",
            padding: "10px",
            color: "#155724",
            backgroundColor: "#d4edda",
            border: "1px solid #c3e6cb",
            borderRadius: "4px",
            opacity: fadeOut ? 0 : 1,
            transition: "opacity 1s ease-in-out",
          }}
        >
          {message}
        </div>
      )}

      {message && !showSuccessBanner && (
        <div
          style={{
            marginBottom: "20px",
            padding: "10px",
            color: "#721c24",
            backgroundColor: "#f8d7da",
            border: "1px solid #f5c6cb",
            borderRadius: "4px",
          }}
        >
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} encType="multipart/form-data">
        <div style={{ marginBottom: "10px" }}>
          <label>Year:</label>
          <br />
          <input
            type="number"
            name="year"
            value={formData.year}
            onChange={(e) => handleChange("year", e.target.value)}
            placeholder="Enter Year"
          />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label>Name:</label>
          <br />
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="Enter Name"
          />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label>Guest Name:</label>
          <br />
          <GuestNameAutocomplete
            value={formData.guest_name}
            onChange={(val) => handleChange("guest_name", val)}
          />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label>Category:</label>
          <br />
          <AutocompleteInput
            value={formData.category}
            onChange={(val) => handleChange("category", val)}
            fetchUrl="/api/collectibles/categories"
            placeholder="Type category..."
          />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label>Notes 1:</label>
          <br />
          <textarea
            name="notes_1"
            rows="3"
            value={formData.notes_1}
            onChange={(e) => handleChange("notes_1", e.target.value)}
            placeholder="Notes 1"
          />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label>Notes 2:</label>
          <br />
          <textarea
            name="notes_2"
            rows="3"
            value={formData.notes_2}
            onChange={(e) => handleChange("notes_2", e.target.value)}
            placeholder="Notes 2"
          />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label>Image File:</label>
          <br />
          <input type="file" accept="image/*" onChange={handleFileChange} />
          {previewUrl && (
            <div style={{ marginTop: "10px" }}>
              <img
                src={previewUrl}
                alt="Selected preview"
                style={{ maxWidth: "100%", maxHeight: "300px", objectFit: "contain" }}
              />
            </div>
          )}
        </div>

        <button type="submit" style={{ padding: "10px 20px" }}>
          Submit
        </button>
      </form>

      {/* Back to Crowdsource link */}
      <div style={{ marginTop: "2rem" }}>
        <Link
          to="/crowdsource"
          style={{ textDecoration: "underline", color: "#ffcc00", cursor: "pointer" }}
        >
          ← Back to Crowdsource
        </Link>
      </div>
    </div>
  );
}

export default AddCollectible;

