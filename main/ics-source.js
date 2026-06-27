/* =============================================================================
 *  main/ics-source.js — upcoming events from one or more ICS / iCal feeds.
 *  Uses ical-expander (built on ical.js) so recurring events and time zones from
 *  Google and Apple calendars expand correctly. webcal:// is rewritten to
 *  https://. Each feed is fetched independently — one bad feed won't break the
 *  others. Returns a clean, sorted, future-only list for the UI to render.
 * =============================================================================
 */
const IcalExpander = require('ical-expander');
const { getText, posInt } = require('./http');

async function fetchCalendar(cfg) {
  const urls = Array.isArray(cfg.icsUrls) ? cfg.icsUrls.filter(Boolean) : [];
  const lookaheadDays = posInt(cfg.lookaheadDays, 30);
  const maxEvents = posInt(cfg.maxEvents, 6);

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startMsToday = startOfToday.getTime();
  const horizon = new Date(now.getTime() + lookaheadDays * 86400000);
  const nowMs = now.getTime();

  // Fetch every feed at the same time so one slow/hung feed can't hold up the
  // rest (getText aborts via AbortSignal.timeout, so a hung feed is torn down at 12 s).
  const results = await Promise.allSettled(
    urls.map((raw) => getText(String(raw).replace(/^webcal:/i, 'https:'), { timeoutMs: 12000 }))
  );

  const collected = [];
  results.forEach((r, i) => {
    if (r.status !== 'fulfilled') {
      console.warn('[calendar] feed failed:', urls[i], '-', r.reason && r.reason.message);
      return;
    }
    try {
      const expander = new IcalExpander({ ics: r.value, maxIterations: 2000 });
      const { events, occurrences } = expander.between(startOfToday, horizon);
      events.forEach((e) => collected.push(shape(e.startDate, e.endDate, e.summary)));
      occurrences.forEach((o) => collected.push(shape(o.startDate, o.endDate, o.item && o.item.summary)));
    } catch (err) {
      console.warn('[calendar] could not parse feed:', urls[i], '-', err.message);
    }
  });

  const upcoming = collected
    // Drop anything already finished: all-day events whose last day is past, and
    // timed events whose end (or start, if no end) is in the past.
    .filter((e) => (e.allDay
      ? (e.endMs ? e.endMs > startMsToday : e.startMs >= startMsToday)
      : (e.endMs ? e.endMs >= nowMs : e.startMs >= nowMs)))
    // Sort chronologically, but treat an already-started (still-ongoing) event as
    // if it began today — so a multi-day banner doesn't sort days into the past
    // and shove genuinely upcoming events out of the maxEvents slice.
    .sort((a, b) => effStart(a, startMsToday) - effStart(b, startMsToday)
      || (Number(b.allDay) - Number(a.allDay)))
    .slice(0, maxEvents);

  return { events: upcoming };
}

// An ongoing event that started before today sorts at the start of today, not
// at its real (past) start time.
function effStart(e, startMsToday) {
  return e.startMs < startMsToday ? startMsToday : e.startMs;
}

function shape(startDate, endDate, summary) {
  const startJs = startDate.toJSDate();
  const endJs = endDate ? endDate.toJSDate() : null;
  return {
    startMs: startJs.getTime(),
    endMs: endJs ? endJs.getTime() : null,
    start: startJs.toISOString(),
    end: endJs ? endJs.toISOString() : null,
    allDay: !!startDate.isDate,
    summary: (summary || '(untitled)').toString().trim(),
  };
}

module.exports = { fetchCalendar };
