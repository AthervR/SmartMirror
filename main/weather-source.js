/* =============================================================================
 *  main/weather-source.js — current conditions + short forecast (Open-Meteo).
 *  Free, no API key required.  https://open-meteo.com/
 *  Returns plain numbers; the UI (src/js/modules/weather.js) maps WMO weather
 *  codes to labels + icons, so presentation stays on the renderer side.
 * =============================================================================
 */
const { getJSON } = require('./http');

async function fetchWeather(cfg) {
  const lat = Number(cfg.latitude);
  const lon = Number(cfg.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error('set latitude & longitude in config.js (weather)');
  }
  const imperial = cfg.units === 'imperial';
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: 'temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m,relative_humidity_2m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min',
    forecast_days: '4',
    timezone: 'auto',
    temperature_unit: imperial ? 'fahrenheit' : 'celsius',
    wind_speed_unit: imperial ? 'mph' : 'kmh',
  });

  const j = await getJSON('https://api.open-meteo.com/v1/forecast?' + params.toString(), { timeoutMs: 10000 });
  const c = j.current || {};
  const d = j.daily || {};

  // Guard against a 200 with a partial body: without the core fields we'd render
  // a confident, fake "0°". Throwing here lets the UI show "weather unavailable".
  if (!Number.isFinite(c.temperature_2m) || !Number.isFinite(c.weather_code)) {
    throw new Error('open-meteo: incomplete current weather payload');
  }

  const daily = (d.time || []).map((date, i) => ({
    date,
    code: num(at(d.weather_code, i)),
    tMax: Math.round(num(at(d.temperature_2m_max, i))),
    tMin: Math.round(num(at(d.temperature_2m_min, i))),
  }));

  return {
    current: {
      temp: Math.round(num(c.temperature_2m)),
      feels: Math.round(num(c.apparent_temperature)),
      code: num(c.weather_code),
      isDay: c.is_day === 1 || c.is_day === true,
      wind: Math.round(num(c.wind_speed_10m)),
      humidity: Math.round(num(c.relative_humidity_2m)),
    },
    daily,
    tempUnit: imperial ? '°F' : '°C',
    windUnit: imperial ? 'mph' : 'km/h',
  };
}

function at(arr, i) { return Array.isArray(arr) ? arr[i] : undefined; }
function num(v) { return typeof v === 'number' && Number.isFinite(v) ? v : 0; }

module.exports = { fetchWeather };
