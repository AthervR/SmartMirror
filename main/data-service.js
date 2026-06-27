/* =============================================================================
 *  main/data-service.js — caches the three data sources so the UI can poll
 *  freely without hammering the network. Each source refetches at most once per
 *  its refreshMinutes; failures are cached briefly so a flaky feed backs off.
 *  Always resolves to { ok, fetchedAt, data } or { ok:false, fetchedAt, error }.
 * =============================================================================
 */
const { fetchWeather } = require('./weather-source');
const { fetchCalendar } = require('./ics-source');
const { fetchNews } = require('./news-source');

function withCache(fn, ttlMs, errTtlMs) {
  let good = null;        // { at, payload } — last SUCCESSFUL fetch (never discarded by an error)
  let failedAt = 0;       // timestamp of the last failure (drives the back-off window)
  let inflight = null;
  return function () {
    const now = Date.now();
    // Serve fresh good data.
    if (good && now - good.at < ttlMs) return Promise.resolve(good.payload);
    // Inside the post-failure back-off window, keep serving the last good data
    // rather than re-hitting a flaky feed (only-slightly-stale beats "unavailable").
    if (failedAt && now - failedAt < errTtlMs && good) return Promise.resolve(good.payload);
    if (inflight) return inflight;
    inflight = (async () => {
      try {
        const data = await fn();
        good = { at: Date.now(), payload: { ok: true, fetchedAt: Date.now(), data } };
        failedAt = 0;
        return good.payload;
      } catch (err) {
        failedAt = Date.now();
        // One transient failure must not blank a working module: fall back to the
        // last good payload if we ever had one; only surface the error otherwise.
        if (good) return good.payload;
        return { ok: false, fetchedAt: Date.now(), error: String((err && err.message) || err) };
      } finally {
        inflight = null;
      }
    })();
    return inflight;
  };
}

const minutes = (m, fallback) => (Number.isFinite(m) && m > 0 ? m : fallback) * 60 * 1000;
const ERR_BACKOFF = 90 * 1000;

module.exports = function createDataService(config) {
  const w = config.weather || {};
  const c = config.calendar || {};
  const n = config.news || {};
  return {
    weather:  withCache(() => fetchWeather(w),  minutes(w.refreshMinutes, 15), ERR_BACKOFF),
    calendar: withCache(() => fetchCalendar(c), minutes(c.refreshMinutes, 30), ERR_BACKOFF),
    news:     withCache(() => fetchNews(n),     minutes(n.refreshMinutes, 20), ERR_BACKOFF),
  };
};
