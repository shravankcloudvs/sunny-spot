export default async function handler(req, res) {
  try {
    const { lat, lon, radius } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ error: 'Missing lat/lon parameters' });
    }

    const apiKey = process.env.WEATHER_API_KEY;
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;

    const response = await fetch(weatherUrl);
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.statusText}`);
    }

    const data = await response.json();

    res.status(200).json({
      location: data.name,
      temp: data.main.temp,
      weather: data.weather[0].description,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}