export default async function handler(req, res) {
  try {
    const { lat, lon, radius, type = 'sunny' } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ error: 'Missing lat/lon parameters' });
    }

    const searchRadiusMiles = parseFloat(radius) || 100;
    const apiKey = process.env.OPENWEATHER_API_KEY || process.env.WEATHER_API_KEY || "fcd60cc0ebe020cd30a4d2ae43fd4005";
    if (!apiKey) {
      return res.status(500).json({ error: "Server configuration error: Missing API key." });
    }
    
    // 1. Fetch nearby cities in a circle around coordinates using OpenWeatherMap Find API
    const findUrl = `https://api.openweathermap.org/data/2.5/find?lat=${lat}&lon=${lon}&cnt=50&appid=${apiKey}&units=imperial`;
    
    const response = await fetch(findUrl);
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.list || data.list.length === 0) {
      return res.status(200).json([]);
    }

    // 2. Filter cities by distance and weather type (sunny vs snowy)
    const matchingSpots = [];
    for (const spot of data.list) {
      const dist = getDistanceFromLatLonInMiles(lat, lon, spot.coord.lat, spot.coord.lon);
      
      if (dist <= searchRadiusMiles) {
        const mainWeather = spot.weather[0].main.toLowerCase();
        const descWeather = spot.weather[0].description.toLowerCase();
        const cloudiness = spot.clouds ? spot.clouds.all : 0;
        
        let matchesType = false;
        
        if (type === 'snowy') {
          // Snowy matches main='Snow', description containing snow/sleet/hail/ice
          matchesType = mainWeather.includes('snow') || 
                        descWeather.includes('snow') || 
                        descWeather.includes('sleet') || 
                        descWeather.includes('hail') || 
                        descWeather.includes('flurr');
        } else {
          // Sunny matches main='Clear' or cloudiness <= 35%
          matchesType = mainWeather.includes('clear') || cloudiness <= 35;
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

    // Limit to top 8 to prevent slow page load and avoid hitting Wikipedia API limits
    const limitedSpots = matchingSpots.slice(0, 8);

    // 3. Concurrently fetch nearby tourist spots/landmarks from Wikipedia for matching cities
    const enrichedSpots = await Promise.all(limitedSpots.map(async (spot) => {
      try {
        const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${spot.lat}|${spot.lon}&gsradius=10000&gslimit=5&format=json&origin=*`;
        
        const wikiRes = await fetch(wikiUrl, {
          headers: {
            "User-Agent": "SunnySpotApp/1.0 (contact@example.com) fetch/1.0"
          }
        });
        
        if (!wikiRes.ok) return { ...spot, touristSpots: [] };
        
        const wikiData = await wikiRes.json();
        
        if (wikiData.query && wikiData.query.geosearch) {
          // Process tourist spots, excluding duplicate city entries
          const attractions = wikiData.query.geosearch
            .filter(item => item.title.toLowerCase() !== spot.name.toLowerCase())
            .slice(0, 4) // top 4
            .map(item => ({
              title: item.title,
              pageid: item.pageid,
              distance: Math.round(item.dist) // distance in meters from city center
            }));
          
          return { ...spot, touristSpots: attractions };
        }
      } catch (wikiErr) {
        console.error(`Wiki fetch failed for ${spot.name}:`, wikiErr);
      }
      return { ...spot, touristSpots: [] };
    }));

    res.status(200).json(enrichedSpots);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

function getDistanceFromLatLonInMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // Radius of the Earth in miles
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