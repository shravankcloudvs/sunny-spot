// /client/src/App.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";

export default function App() {
  const [location, setLocation] = useState(null);
  const [geoError, setGeoError] = useState(null);
  const [radius, setRadius] = useState(50);
  const [type, setType] = useState("sunny"); // 'sunny' or 'snowy'
  const [sunnySpots, setSunnySpots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState("dark"); // 'dark' or 'light'
  const [openSpots, setOpenSpots] = useState({}); // Keep track of open accordions by city name
  const [searched, setSearched] = useState(false);
  const [apiError, setApiError] = useState(null);

  // New states for location autocomplete
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isBrowserGeo, setIsBrowserGeo] = useState(true);

  // Sync theme and active type classes on document body
  useEffect(() => {
    document.body.className = `${theme}-theme ${type === "snowy" ? "snowy-active" : ""}`;
  }, [theme, type]);

  // Request browser geolocation
  const getBrowserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
          setIsBrowserGeo(true);
          setSelectedPlace("Your Current Location");
          setSearchQuery("");
          setGeoError(null);
        },
        (err) => {
          console.error("Location error:", err);
          setGeoError("Please enable location access in your browser settings or enter a location manually below.");
        }
      );
    } else {
      setGeoError("Geolocation is not supported by your browser.");
    }
  };

  // Request browser geolocation on mount
  useEffect(() => {
    getBrowserLocation();
  }, []);

  // Debounced location suggestions lookup
  useEffect(() => {
    if (searchQuery.trim().length < 3 || searchQuery === selectedPlace) {
      setSuggestions([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        const response = await axios.get(
          `https://geocoding-api.open-meteo.com/v1/search`,
          {
            params: {
              name: searchQuery,
              count: 5,
              language: "en",
              format: "json",
            },
          }
        );
        if (response.data && response.data.results) {
          setSuggestions(response.data.results);
        } else {
          setSuggestions([]);
        }
      } catch (err) {
        console.error("Geocoding API error:", err);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, selectedPlace]);

  // Dismiss suggestions dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = () => {
      setShowSuggestions(false);
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  const handleSearch = async () => {
    if (!location) {
      alert("Please enter a location or allow location access to run a search.");
      return;
    }
    setLoading(true);
    setSearched(true);
    setSunnySpots([]);
    setOpenSpots({});
    setApiError(null);

    try {
      const res = await axios.get("/api/sunny", {
        params: {
          lat: location.lat,
          lon: location.lon,
          radius,
          type,
        },
      });
      setSunnySpots(res.data);
    } catch (err) {
      console.error("Error fetching weather spots:", err);
      const serverMsg = err.response?.data?.error || err.message;
      setApiError(`Server Error: ${serverMsg}. Please check your Vercel API key.`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSuggestion = (e, place) => {
    e.stopPropagation(); // Prevent document click listener from firing
    setLocation({
      lat: place.latitude,
      lon: place.longitude,
    });
    setIsBrowserGeo(false);

    const displayName = [
      place.name,
      place.admin1 || "",
      place.country || "",
    ]
      .filter(Boolean)
      .join(", ");

    setSelectedPlace(displayName);
    setSearchQuery(displayName);
    setSuggestions([]);
    setShowSuggestions(false);
    setGeoError(null);
  };

  const toggleAccordion = (name) => {
    setOpenSpots((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <div className="app-container">
      {/* Header Panel */}
      <header className="app-header glass-panel">
        <div className="logo-section">
          <span className="logo-emoji">{type === "sunny" ? "☀️" : "❄️"}</span>
          <h1 className="app-title">SunnySpot</h1>
        </div>
        <button
          onClick={toggleTheme}
          className="theme-toggle-btn"
          aria-label="Toggle Theme"
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </header>

      {/* Main Control Panel */}
      <main className="control-panel glass-panel">
        {/* Toggle Mode Switcher */}
        <div className="mode-tabs">
          <button
            onClick={() => setType("sunny")}
            className={`tab-btn ${type === "sunny" ? "active" : ""}`}
          >
            ☀️ Sunny Getaways
          </button>
          <button
            onClick={() => setType("snowy")}
            className={`tab-btn ${type === "snowy" ? "active" : ""}`}
          >
            ❄️ Snowy Spots
          </button>
        </div>

        {/* Location Lookup Panel */}
        <div className="control-row" onClick={(e) => e.stopPropagation()}>
          <span className="control-label">Target Location</span>
          <div className="search-input-container">
            <div className="search-input-wrapper">
              <input
                type="text"
                placeholder="Enter city or zip code (e.g. Paris, Denver...)"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                className="location-search-input"
              />
              <button
                onClick={getBrowserLocation}
                title="Use current location"
                className={`use-geo-btn ${isBrowserGeo ? "active" : ""}`}
              >
                🛰️
              </button>
            </div>

            {/* Suggestions Overlay Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="suggestions-dropdown">
                {suggestions.map((place) => {
                  const placeDesc = [place.admin1, place.country]
                    .filter(Boolean)
                    .join(", ");
                  return (
                    <button
                      key={place.id}
                      onClick={(e) => handleSelectSuggestion(e, place)}
                      className="suggestion-item"
                    >
                      <span className="suggestion-city">{place.name}</span>
                      <span className="suggestion-meta">{placeDesc}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Current Selected Location Indicator */}
        {selectedPlace && (
          <div className="location-state-banner">
            📍 <span>Searching near: <strong>{selectedPlace}</strong></span>
          </div>
        )}

        {/* Radius Controller */}
        <div className="control-row">
          <div className="control-label-row">
            <span className="control-label">Search Radius</span>
            <span className="control-value">{radius} miles</span>
          </div>
          <input
            type="range"
            min="10"
            max="300"
            step="10"
            value={radius}
            onChange={(e) => setRadius(parseInt(e.target.value))}
          />
        </div>

        {/* Geo Status Alerts */}
        {geoError && !selectedPlace && (
          <div
            style={{
              padding: "1rem",
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "12px",
              color: "rgb(248, 113, 113)",
              fontSize: "0.9rem",
              textAlign: "center",
            }}
          >
            ⚠️ {geoError}
          </div>
        )}

        {!location && !geoError && (
          <div
            style={{
              padding: "1rem",
              background: "rgba(245, 158, 11, 0.1)",
              border: "1px solid rgba(245, 158, 11, 0.25)",
              borderRadius: "12px",
              color: "var(--accent-sunny)",
              fontSize: "0.9rem",
              textAlign: "center",
            }}
          >
            🛰️ Acquiring your location to find nearby spots...
          </div>
        )}

        {/* Main Action Button */}
        <button
          onClick={handleSearch}
          disabled={loading || !location}
          className={`search-btn ${loading ? "loading" : ""}`}
        >
          {loading ? (
            <>Searching weather maps...</>
          ) : (
            <>
              {type === "sunny" ? "Find Sunny Escapes" : "Locate Snowy Slopes"}
            </>
          )}
        </button>
      </main>

      {/* Loading States */}
      {loading && (
        <div className="loader-wrapper glass-panel">
          {type === "sunny" ? (
            <div className="sunny-loader"></div>
          ) : (
            <div className="snowy-loader-container">
              <span className="cloud-icon">☁️</span>
              <div className="snowflake-particles">
                <span className="flake">❄️</span>
                <span className="flake">❄️</span>
                <span className="flake">❄️</span>
              </div>
            </div>
          )}
          <p className="loading-text">
            {type === "sunny"
              ? "Scanning cloud cover databases..."
              : "Locating sub-freezing snow conditions..."}
          </p>
        </div>
      )}

      {/* Results Display */}
      {!loading && searched && (
        <div className="results-section">
          {sunnySpots.length > 0 ? (
            <div className="spots-grid">
              {sunnySpots.map((spot) => {
                const isOpen = !!openSpots[spot.name];
                return (
                  <div key={spot.name} className="spot-card glass-panel">
                    {/* Top Row: Name and distance badge */}
                    <div className="spot-header">
                      <h2 className="spot-city">{spot.name}</h2>
                      <span className="distance-badge">
                        {spot.distance} mi away
                      </span>
                    </div>

                    {/* Middle Weather details */}
                    <div className="spot-weather-info">
                      {spot.icon && (
                        <img
                          src={`https://openweathermap.org/img/wn/${spot.icon}@2x.png`}
                          alt={spot.weather}
                          className="weather-img"
                        />
                      )}
                      <div>
                        <div className="temp-display">
                          {Math.round(spot.temp)}°F
                        </div>
                        <span className="weather-desc">{spot.weather}</span>
                      </div>
                    </div>

                    {/* Expandable Tourist spots */}
                    <div className="tourist-section">
                      <div
                        onClick={() => toggleAccordion(spot.name)}
                        className="tourist-header"
                      >
                        <span>📍 Nearby Tourist Spots ({spot.touristSpots?.length || 0})</span>
                        <span className={`chevron-icon ${isOpen ? "open" : ""}`}>
                          ▼
                        </span>
                      </div>

                      <div className={`tourist-list ${isOpen ? "open" : ""}`}>
                        {spot.touristSpots && spot.touristSpots.length > 0 ? (
                          spot.touristSpots.map((attraction) => (
                            <a
                              key={attraction.pageid}
                              href={`https://en.wikipedia.org/?curid=${attraction.pageid}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="attraction-link"
                            >
                              <span className="attraction-title">
                                {attraction.title}
                              </span>
                              <span className="attraction-dist">
                                {(attraction.distance / 1000).toFixed(1)} km
                              </span>
                            </a>
                          ))
                        ) : (
                          <div
                            style={{
                              padding: "0.5rem",
                              fontSize: "0.8rem",
                              color: "var(--text-muted)",
                              textAlign: "center",
                            }}
                          >
                            No tourist attractions cataloged nearby.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* No Results State */
            <div className="status-msg-panel glass-panel">
              <span className="status-emoji">
                {type === "sunny" ? "☁️" : "🏜️"}
              </span>
              <h3 className="status-title">
                {apiError ? "Server Error" : `No ${type === "sunny" ? "Sunny" : "Snowy"} spots found`}
              </h3>
              <p className="status-desc">
                {apiError ? apiError : `We couldn't find any ${type === "sunny" ? "sunny" : "snowy"} spots within a ${radius} mile radius near `}
                {!apiError && <strong>{selectedPlace}</strong>}
                {!apiError && `. Try expanding your search radius or searching for the opposite weather mode!`}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
