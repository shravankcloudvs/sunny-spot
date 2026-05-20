// /server/index.js
import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

app.use(cors());

app.get("/api/sunny", async (req, res) => {
  const { lat, lon, radius, type = "sunny" } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: "Missing lat/lon parameters" });
  }

  const searchRadiusMiles = parseFloat(radius) || 100;

  try {
    // 1. Fetch nearby cities in a circle around coords
    const findUrl = `https://api.openweathermap.org/data/2.5/find?lat=${lat}&lon=${lon}&cnt=50&appid=${WEATHER_API_KEY}&units=imperial`;
    
    const weatherRes = await axios.get(findUrl);
    const citiesList = weatherRes.data.list;

    if (!citiesList || citiesList.length === 0) {
      return res.json([]);
    }

    // 2. Filter cities by distance and weather type (sunny vs snowy)
    const matchingSpots = [];
    for (const spot of citiesList) {
      const dist = getDistanceFromLatLonInMiles(lat, lon, spot.coord.lat, spot.coord.lon);
      
      if (dist <= searchRadiusMiles) {
        const mainWeather = spot.weather[0].main.toLowerCase();
        const descWeather = spot.weather[0].description.toLowerCase();
        const cloudiness = spot.clouds ? spot.clouds.all : 0;
        
        let matchesType = false;
        
        if (type === "snowy") {
          matchesType = mainWeather.includes("snow") || 
                        descWeather.includes("snow") || 
                        descWeather.includes("sleet") || 
                        descWeather.includes("hail") || 
                        descWeather.includes("flurr");
        } else {
          matchesType = mainWeather.includes("clear") || cloudiness <= 35;
        }

        if (matchesType) {
          matchingSpots.push({
            name: spot.name,
            lat: spot.coord.lat,
            lon: spot.coord.lon,
            temp: spot.main.temp,
            weather: spot.weather[0].description,
            icon: spot.weather[0].icon,
            distance: Math.round(dist)
          });
        }
      }
    }

    // Sort by distance (closest first)
    matchingSpots.sort((a, b) => a.distance - b.distance);

    // Limit to top 8 to prevent speed issues and API limits
    const limitedSpots = matchingSpots.slice(0, 8);

    // 3. Fetch nearby tourist spots from Wikipedia concurrently
    const enrichedSpots = await Promise.all(
      limitedSpots.map(async (spot) => {
        try {
          const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${spot.lat}|${spot.lon}&gsradius=10000&gslimit=5&format=json&origin=*`;
          
          const wikiRes = await axios.get(wikiUrl, {
            headers: {
              "User-Agent": "SunnySpotApp/1.0 (contact@example.com) Axios/1.0"
            }
          });

          if (wikiRes.data.query && wikiRes.data.query.geosearch) {
            const attractions = wikiRes.data.query.geosearch
              .filter(item => item.title.toLowerCase() !== spot.name.toLowerCase())
              .slice(0, 4)
              .map(item => ({
                title: item.title,
                pageid: item.pageid,
                distance: Math.round(item.dist)
              }));
            
            return { ...spot, touristSpots: attractions };
          }
        } catch (wikiErr) {
          console.error(`Wiki fetch failed for ${spot.name}:`, wikiErr.message);
        }
        return { ...spot, touristSpots: [] };
      })
    );

    res.json(enrichedSpots);
  } catch (err) {
    console.error("/api/sunny error:", err.message);
    res.status(500).json({ error: "Failed to fetch weather data" });
  }
});

function getDistanceFromLatLonInMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // Radius of Earth in miles
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
