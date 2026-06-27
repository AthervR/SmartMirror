/* =============================================================================
 *  weather.js — current conditions + short forecast (data from Open-Meteo).
 *  Monochrome inline-SVG line icons mapped from WMO weather codes. Overrides the
 *  Block #1 "weather" placeholder in window.SM.moduleRegistry.
 * =============================================================================
 */
window.SM = window.SM || {};
(function () {
  const { el, shell, poll } = window.SM.modules.util;

  // WMO weather code -> [label, iconKey].  https://open-meteo.com/en/docs
  function describe(code, isDay) {
    const map = {
      0: ['Clear', isDay ? 'sun' : 'moon'], 1: ['Mostly clear', isDay ? 'sun' : 'moon'],
      2: ['Partly cloudy', 'partly'], 3: ['Overcast', 'cloud'],
      45: ['Fog', 'fog'], 48: ['Rime fog', 'fog'],
      51: ['Light drizzle', 'drizzle'], 53: ['Drizzle', 'drizzle'], 55: ['Heavy drizzle', 'drizzle'],
      56: ['Freezing drizzle', 'drizzle'], 57: ['Freezing drizzle', 'drizzle'],
      61: ['Light rain', 'rain'], 63: ['Rain', 'rain'], 65: ['Heavy rain', 'rain'],
      66: ['Freezing rain', 'rain'], 67: ['Freezing rain', 'rain'],
      71: ['Light snow', 'snow'], 73: ['Snow', 'snow'], 75: ['Heavy snow', 'snow'], 77: ['Snow grains', 'snow'],
      80: ['Rain showers', 'rain'], 81: ['Rain showers', 'rain'], 82: ['Heavy showers', 'rain'],
      85: ['Snow showers', 'snow'], 86: ['Snow showers', 'snow'],
      95: ['Thunderstorm', 'thunder'], 96: ['Thunderstorm', 'thunder'], 99: ['Thunderstorm', 'thunder'],
    };
    return map[code] || ['—', 'cloud'];
  }

  // Minimal monochrome line icons (stroke inherits the text colour).
  const PATHS = {
    sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.3 6.3 0 0 0 10.5 10.5z"/>',
    partly: '<circle cx="8" cy="7.5" r="3"/><path d="M8 1.7v1.4M2.2 7.5h1.4M3.8 3.3l1 1M12.2 3.3l-1 1"/><path d="M7 19h10a3.4 3.4 0 0 0 .2-6.8A4.6 4.6 0 0 0 8.6 12 3.5 3.5 0 0 0 7 19z"/>',
    cloud: '<path d="M7 18h10a3.6 3.6 0 0 0 .2-7.2A5 5 0 0 0 7.6 10 3.7 3.7 0 0 0 7 18z"/>',
    fog: '<path d="M5 9.5h11a3.3 3.3 0 0 0-.4-6.4A4.5 4.5 0 0 0 7.4 5.5"/><path d="M4 14h16M6 18h12"/>',
    drizzle: '<path d="M7 14.5h9a3.4 3.4 0 0 0 .2-6.8A4.6 4.6 0 0 0 7.6 7.5 3.5 3.5 0 0 0 7 14.5z"/><path d="M9 17.5l-1 2.5M14 17.5l-1 2.5"/>',
    rain: '<path d="M7 13.5h9a3.4 3.4 0 0 0 .2-6.8A4.6 4.6 0 0 0 7.6 6.5 3.5 3.5 0 0 0 7 13.5z"/><path d="M8 16.5l-1.2 3.5M12 16.5l-1.2 3.5M16 16.5l-1.2 3.5"/>',
    snow: '<path d="M7 13.5h9a3.4 3.4 0 0 0 .2-6.8A4.6 4.6 0 0 0 7.6 6.5 3.5 3.5 0 0 0 7 13.5z"/><path d="M9 17.5h.01M12 19h.01M15 17.5h.01"/>',
    thunder: '<path d="M7 12.5h9a3.4 3.4 0 0 0 .2-6.8A4.6 4.6 0 0 0 7.6 5.5 3.5 3.5 0 0 0 7 12.5z"/><path d="M12 13l-2 4h3l-2 4"/>',
  };

  function icon(key, size) {
    const markup =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="' + size + '" height="' + size +
      '" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" class="wx-icon">' +
      (PATHS[key] || PATHS.cloud) + '</svg>';
    const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
    return document.importNode(doc.documentElement, true);
  }

  function dayName(iso) {
    const d = new Date(iso + 'T00:00:00');
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { weekday: 'short' });
  }

  window.SM.moduleRegistry.weather = {
    label: 'Weather',
    render(root, config) {
      const cfg = config.weather || {};
      const body = shell(root, cfg.title || 'Weather');

      const current = el('div', 'wx-current');
      const iconWrap = el('div', 'wx-now-icon');
      const temp = el('div', 'wx-temp', '—');
      current.append(iconWrap, temp);
      const cond = el('div', 'wx-cond', '');
      const place = el('div', 'wx-place', cfg.locationName || '');
      const forecast = el('div', 'wx-forecast');
      body.append(current, cond, place, forecast);

      function render(res) {
        if (!res || !res.ok || !res.data) {
          temp.textContent = '—'; cond.textContent = 'weather unavailable'; return;
        }
        const d = res.data;
        const [label, key] = describe(d.current.code, d.current.isDay);
        iconWrap.replaceChildren(icon(key, 38));
        temp.textContent = d.current.temp + (d.tempUnit || '°');
        cond.textContent = label;
        place.textContent = cfg.locationName || '';

        forecast.replaceChildren();
        (d.daily || []).slice(1, 4).forEach((day) => {
          const chip = el('div', 'wx-day');
          chip.append(el('div', 'wx-day-name', dayName(day.date)));
          const di = icon(describe(day.code, true)[1], 20);
          di.classList.add('wx-day-icon');
          chip.append(di);
          chip.append(el('div', 'wx-day-temp', day.tMax + '° ' + day.tMin + '°'));
          forecast.append(chip);
        });
      }

      poll({
        label: 'weather',
        intervalMs: (Number(cfg.refreshMinutes) || 15) * 60000,
        fetchFn: () => window.mirror.getWeather(),
        onResult: render,
      });
    },
  };
})();
