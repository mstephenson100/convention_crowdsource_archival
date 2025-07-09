import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";

// AutocompleteInput component for predictive search
function AutocompleteInput({ value, onChange, fetchUrl, placeholder }) {
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      fetch(`${fetchUrl}?q=${encodeURIComponent(query.trim())}`)
        .then((res) => res.json())
        .then((data) => {
          setResults(data.guests || []);
          setShowDropdown(true);
        })
        .catch(() => {
          setResults([]);
          setShowDropdown(false);
        });
    }, 300);

    return () => clearTimeout(timeoutRef.current);
  }, [query, fetchUrl]);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  const handleSelect = (guest_name) => {
    onChange(guest_name);
    setQuery(guest_name);
    setShowDropdown(false);
  };

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
        }}
        onFocus={() => {
          if (results.length > 0) setShowDropdown(true);
        }}
        onBlur={() => {
          setTimeout(() => setShowDropdown(false), 150);
        }}
        style={{ width: "100%", color: "#000" }}
        autoComplete="off"
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
          {results.map(({ guest_name, guest_id }) => (
            <li
              key={guest_id}
              onMouseDown={() => handleSelect(guest_name)}
              style={{
                padding: "6px 10px",
                cursor: "pointer",
                borderBottom: "1px solid #eee",
              }}
            >
              {guest_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AddGuest() {
  const [year, setYear] = useState("");
  const [guestName, setGuestName] = useState("");
  const [blurb, setBlurb] = useState("");
  const [biography, setBiography] = useState("");
  const [accolades1, setAccolades1] = useState("");
  const [accolades2, setAccolades2] = useState("");
  const [guestType, setGuestType] = useState("");
  const [message, setMessage] = useState("");
  const [successBanner, setSuccessBanner] = useState(false);
  const [accoladesOptions, setAccoladesOptions] = useState([]);

  useEffect(() => {
    fetch("/api/accolades/distinct")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAccoladesOptions(data);
        } else {
          setMessage(data.error || "Failed to load accolades options.");
        }
      })
      .catch(() => setMessage("Network error loading accolades options."));
  }, []);

  const handleSubmit = async () => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setMessage("Not authenticated");
      return;
    }

    const res = await fetch("/api/guests/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        year,
        guest_name: guestName,
        blurb,
        biography,
        accolades_1: accolades1,
        accolades_2: accolades2 || null,
        guest_type: guestType,
      }),
    });

    const data = await res.json();
    window.scrollTo(0, 0);

    if (res.ok) {
      setMessage("");
      setSuccessBanner(true);
      setYear("");
      setGuestName("");
      setBlurb("");
      setBiography("");
      setAccolades1("");
      setAccolades2("");
      setGuestType("");

      setTimeout(() => {
        setSuccessBanner(false);
      }, 3000);
    } else {
      setMessage(data.error || "Failed to submit guest.");
    }
  };

  return (
    <div className="container">
      <h2>Add Guest Data</h2>

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
          ✅ Guest submission added for moderation!
        </div>
      )}

      <label>Year:</label>
      <br />
      <input value={year} onChange={(e) => setYear(e.target.value)} />
      <br />

      <label>Name:</label>
      <br />
      <AutocompleteInput
        value={guestName}
        onChange={setGuestName}
        fetchUrl="/api/guests/search"
        placeholder="Type guest name..."
      />
      <br />

      <label>Blurb:</label>
      <br />
      <textarea rows={4} value={blurb} onChange={(e) => setBlurb(e.target.value)} />
      <br />

      <label>Biography:</label>
      <br />
      <textarea rows={6} value={biography} onChange={(e) => setBiography(e.target.value)} />
      <br />

      <label>Accolades 1:</label>
      <br />
      <select value={accolades1} onChange={(e) => setAccolades1(e.target.value)}>
        <option value="">None</option>
        {accoladesOptions.map((a, idx) => (
          <option key={idx} value={a}>
            {a}
          </option>
        ))}
      </select>
      <br />

      <label>Accolades 2:</label>
      <br />
      <select value={accolades2} onChange={(e) => setAccolades2(e.target.value)}>
        <option value="">None</option>
        {accoladesOptions
          .filter((a) => a !== accolades1)
          .map((a, idx) => (
            <option key={idx} value={a}>
              {a}
            </option>
          ))}
      </select>
      <br />

      <label>Guest Type:</label>
      <br />
      <select value={guestType} onChange={(e) => setGuestType(e.target.value)}>
        <option value="">-- select --</option>
        <option value="guest">guest</option>
        <option value="attending professional">attending professional</option>
        <option value="performance act">performance act</option>
        <option value="vendor">vendor</option>
      </select>
      <br />
      <br />

      <button onClick={handleSubmit}>Submit</button>

      {message && <p>{message}</p>}

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

export default AddGuest;

