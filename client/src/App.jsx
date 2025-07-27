// /client/src/App.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";

export default function App() {
  const [location, setLocation] = useState(null);
  const [radius, setRadius] = useState(50);
  const [sunnySpots, setSunnySpots] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      (err) => console.error("Location error:", err)
    );
  }, []);

  const findSunnySpots = async () => {
    if (!location) return;
    setLoading(true);
    try {
      // const res = await axios.get("/api/sunny", {
      //   params: { ...location, radius },
      // });
      const res = await axios.get("/api/sunny", {
        params: { ...location, radius }
      });

      setSunnySpots(res.data);
    } catch (err) {
      console.error("Error fetching sunny spots:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto text-center">
      <h1 className="text-3xl font-bold mb-4">☀️ Find Sunny Places Nearby</h1>
      <div className="mb-4">
        <label className="mr-2">Radius: {radius} miles</label>
        <input
          type="range"
          min="10"
          max="200"
          value={radius}
          onChange={(e) => setRadius(e.target.value)}
        />
      </div>
      <button
        onClick={findSunnySpots}
        className="bg-yellow-400 px-4 py-2 rounded font-semibold"
      >
        {loading ? "Searching..." : "Find Sunny Spots"}
      </button>
      <div className="mt-6">
        {sunnySpots.map((spot) => (
          <div
            key={spot.name}
            className="bg-white p-4 shadow rounded mb-2 border"
          >
            <h2 className="text-xl font-bold">{spot.name}</h2>
            <p>{spot.weather}</p>
            <p>{Math.round(spot.temp)}°F</p>
          </div>
        ))}
        {!loading && sunnySpots.length === 0 && <p>No sunny spots found.</p>}
      </div>
    </div>
  );
}
