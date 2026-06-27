/* =============================================================================
 *  main/news-source.js — headlines from one or more RSS / Atom feeds.
 *  Uses rss-parser (handles RSS 2.0 and Atom). Feeds are merged, de-duplicated
 *  by title, sorted newest-first, and trimmed to maxItems. One bad feed won't
 *  break the others.
 * =============================================================================
 */
const Parser = require('rss-parser');
const { getText, posInt } = require('./http');

// No internal timeout here: rss-parser's own timeout only rejects the promise,
// it never tears down the socket. We fetch through getText (AbortSignal.timeout),
// so a hung/trickle-slow feed is genuinely aborted, then hand the XML to the parser.
const parser = new Parser();

async function fetchNews(cfg) {
  const feeds = Array.isArray(cfg.feeds) ? cfg.feeds.filter(Boolean) : [];
  const maxItems = posInt(cfg.maxItems, 12);

  // Fetch all feeds concurrently — total wait is the single slowest feed (≤12 s),
  // not the sum. One bad feed still won't break the others.
  const results = await Promise.allSettled(
    feeds.map(async (url) => {
      const xml = await getText(String(url), { timeoutMs: 12000, headers: { 'user-agent': 'SmartMirror/2.0' } });
      return parser.parseString(xml);
    })
  );

  const items = [];
  results.forEach((r, i) => {
    if (r.status !== 'fulfilled') {
      console.warn('[news] feed failed:', feeds[i], '-', r.reason && r.reason.message);
      return;
    }
    const feed = r.value;
    const source = (feed.title || '').toString().trim();
    (feed.items || []).slice(0, 15).forEach((it) => {
      const title = (it.title || '').toString().trim();
      if (!title) return;
      items.push({ title, source, ts: toTs(it.isoDate || it.pubDate) });
    });
  });

  items.sort((a, b) => b.ts - a.ts);

  const seen = new Set();
  const unique = [];
  for (const it of items) {
    const key = it.title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push({ title: it.title, source: it.source });
  }
  return { items: unique.slice(0, maxItems) };
}

function toTs(s) { const t = s ? Date.parse(s) : NaN; return Number.isFinite(t) ? t : 0; }

module.exports = { fetchNews };
