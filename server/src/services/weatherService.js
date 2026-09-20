// Returns null when no API key is configured or the lookup fails, so callers
// can fall back to season-only advisory instead of erroring out.
export async function getCurrentWeather(location) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey || !location) return null;

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${apiKey}&units=metric`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    return {
      tempC: data.main?.temp ?? null,
      humidity: data.main?.humidity ?? null,
      condition: data.weather?.[0]?.main ?? null,
      description: data.weather?.[0]?.description ?? null,
      windSpeed: data.wind?.speed ?? null,
    };
  } catch (err) {
    console.error('Weather lookup failed:', err.message);
    return null;
  }
}
