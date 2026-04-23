"""
Person B owns this file.

Fetches a 7-day weather forecast using Open-Meteo (free, no API key needed).
Geocodes city name using the Open-Meteo geocoding API.
"""

import httpx
from datetime import date, timedelta

GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"
FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

# WMO weather code → human description
WMO_CODES = {
    0: "clear sky", 1: "mainly clear", 2: "partly cloudy", 3: "overcast",
    45: "foggy", 48: "foggy", 51: "light drizzle", 53: "drizzle",
    55: "heavy drizzle", 61: "light rain", 63: "rain", 65: "heavy rain",
    71: "light snow", 73: "snow", 75: "heavy snow", 80: "rain showers",
    81: "heavy showers", 82: "violent showers", 95: "thunderstorm",
}


def get_weekend_forecast(city: str) -> dict:
    """
    Returns a dict:
      {
        "forecast": "sunny" | "rainy" | "cloudy" | "cold",
        "temp_max": float,          # °C
        "description": str          # human-readable
      }
    Falls back to a neutral dict if geocoding or forecast fails.
    """
    try:
        lat, lon = _geocode(city)
        return _forecast(lat, lon)
    except Exception as e:
        print(f"[weather] failed for {city}: {e}")
        return {"forecast": "neutral", "temp_max": 20.0, "description": "Weather unavailable"}


def _geocode(city: str) -> tuple[float, float]:
    r = httpx.get(GEOCODE_URL, params={"name": city, "count": 1, "language": "en", "format": "json"}, timeout=5)
    r.raise_for_status()
    results = r.json().get("results", [])
    if not results:
        raise ValueError(f"City not found: {city}")
    return results[0]["latitude"], results[0]["longitude"]


def _forecast(lat: float, lon: float) -> dict:
    # Pull next 7 days; we'll pick the upcoming Saturday/Sunday
    r = httpx.get(
        FORECAST_URL,
        params={
            "latitude": lat,
            "longitude": lon,
            "daily": "temperature_2m_max,weathercode",
            "timezone": "auto",
            "forecast_days": 7,
        },
        timeout=5,
    )
    r.raise_for_status()
    data = r.json()["daily"]

    dates = data["time"]          # list of "YYYY-MM-DD"
    temps = data["temperature_2m_max"]
    codes = data["weathercode"]

    # Pick the first Saturday or Sunday in the forecast window
    weekend_idx = None
    for i, d in enumerate(dates):
        day = date.fromisoformat(d)
        if day.weekday() in (5, 6):  # 5=Sat, 6=Sun
            weekend_idx = i
            break

    idx = weekend_idx if weekend_idx is not None else 0
    temp = temps[idx]
    code = codes[idx]
    desc_raw = WMO_CODES.get(code, "variable")

    if code <= 2 and temp >= 22:
        forecast = "sunny"
    elif code in (61, 63, 65, 80, 81, 82):
        forecast = "rainy"
    elif temp < 10:
        forecast = "cold"
    else:
        forecast = "cloudy"

    return {
        "forecast": forecast,
        "temp_max": round(temp, 1),
        "description": f"{desc_raw.capitalize()} and {round(temp)}°C this weekend",
    }
