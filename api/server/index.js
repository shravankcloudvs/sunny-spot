// /server/index.js
import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import cors from "cors";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

app.use(cors());

app.get("/api/sunny", async (req, res) => {
  const { lat, lon, radius } = req.query;
  const radiusKm = radius * 1.6;

  try {
    // Example: Fetch nearby cities using GeoNames or static list (simplified here)
    const cities = [
      { name: "Los Angeles", lat: 34.05, lon: -118.24 },
      { name: "San Diego", lat: 32.71, lon: -117.16 },
      { name: "Las Vegas", lat: 36.17, lon: -115.14 },
      { name: "Phoenix", lat: 33.45, lon: -112.07 },
    ];

    const results = [];
    for (const city of cities) {
      const dist = getDistanceFromLatLonInKm(lat, lon, city.lat, city.lon);
      if (dist <= radiusKm) {
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${city.lat}&lon=${city.lon}&appid=${WEATHER_API_KEY}&units=imperial`;
        const weatherRes = await axios.get(url);
        const weather = weatherRes.data.weather[0].main.toLowerCase();
        if (weather.includes("clear")) {
          results.push({
            name: city.name,
            weather: weatherRes.data.weather[0].description,
            temp: weatherRes.data.main.temp,
          });
        }
      }
    }

    res.json(results);
  } catch (err) {
    console.error("/api/sunny error:", err);
    res.status(500).json({ error: "Failed to fetch weather data" });
  }
});

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
