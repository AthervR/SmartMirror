/* =============================================================================
 *  data-module.js — shared helpers for the Block #2 data modules.
 *  Provides a tiny DOM builder, a standard module "shell" (title + body), a
 *  self-refreshing poller that pauses while the mirror isn't in the active
 *  state, and a date/time formatter. Keeps each module file small + consistent.
 *  Loads BEFORE weather/calendar/news.js (see src/index.html).
 * =============================================================================
 */
window.SM = window.SM || {};
window.SM.modules = window.SM.modules || {};
(function () {
  // textContent everywhere = feed/calendar text can never inject HTML.
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  // Fisher-Yates shuffle. Returns a new array; the input is left untouched.
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Standard module frame: an uppercase title + a body container to fill.
  function shell(root, title) {
    root.classList.add('module--data');
    if (title) root.append(el('div', 'module-title', String(title).toUpperCase()));
    const body = el('div', 'module-body');
    root.append(body);
    return body;
  }

  function isActive() { return document.body.dataset.state === 'active'; }

  // Fetch now + every intervalMs. Skips fetching while not active, and refreshes
  // immediately when the mirror returns to active. Main-process caching makes
  // calling often cheap, so we never hammer the network.
  function poll({ label, intervalMs, fetchFn, onResult }) {
    const interval = Number.isFinite(intervalMs) && intervalMs > 0 ? intervalMs : 15 * 60 * 1000;
    let timer = null;
    let busy = false;

    async function run() {
      if (busy) return;
      busy = true;
      try {
        onResult(await fetchFn());
      } catch (err) {
        console.warn('[' + label + '] poll error:', err);
        onResult({ ok: false, error: String((err && err.message) || err) });
      } finally {
        busy = false;
      }
    }
    function schedule() { clearTimeout(timer); timer = setTimeout(tick, interval); }
    function tick() { if (isActive()) run().then(schedule, schedule); else schedule(); }

    run();
    schedule();
    window.addEventListener('mirror:state', (e) => {
      if (e.detail && e.detail.to === 'active') run();
    });
  }

  // "Today 14:00" / "Tue 09:00" / "Mar 4" — minimal, locale-aware.
  function eventTime(startISO, allDay) {
    const d = new Date(startISO);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    const soon = d > now && (d - now) < 7 * 86400000;
    const day = sameDay ? 'Today'
      : soon ? d.toLocaleDateString(undefined, { weekday: 'short' })
      : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    if (allDay) return day;
    return day + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  window.SM.modules.util = { el, shell, isActive, poll, eventTime, shuffle };
})();
