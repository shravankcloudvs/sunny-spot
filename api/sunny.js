// /api/sunny.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  const { lat, lon, radius } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: "Missing lat/lon" });
  }

  try {
    const weatherUrl = `https://api.openweathermap.org/data/2.5/find?lat=${lat}&lon=${lon}&cnt=30&units=imperial&appid=${process.env.OPENWEATHER_API_KEY}`;
    const response = await fetch(weatherUrl);
    const data = await response.json();

    const sunnySpots = data.list
      .filter((place) => place.weather[0].main === "Clear")
      .map((place) => ({
        name: place.name,
        weather: place.weather[0].description,
        temp: place.main.temp,
      }));

    res.status(200).json(sunnySpots);
  } catch (error) {
    console.error("API error:", error);
    res.status(500).json({ error: "Failed to fetch weather data" });
  }
}
