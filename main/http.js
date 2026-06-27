/* =============================================================================
 *  main/http.js — tiny HTTP helpers for the data sources (MAIN process).
 *  Runs in Node, so these requests are NOT subject to the renderer's CSP/CORS.
 *  Public APIs and feeds are fetched here, parsed, and handed to the UI as clean
 *  JSON over IPC — the renderer never touches the network directly.
 * =============================================================================
 */
const UA = 'SmartMirror/2.0 (+local appliance)';

async function fetchWithTimeout(url, { timeoutMs = 10000, headers = {} } = {}) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),   // tears down the socket on timeout
    redirect: 'follow',
    headers: { 'user-agent': UA, ...headers },
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res;
}

async function getJSON(url, opts) {
  return (await fetchWithTimeout(url, opts)).json();
}

async function getText(url, opts) {
  return (await fetchWithTimeout(url, opts)).text();
}

function posInt(v, d) { return Number.isFinite(v) && v > 0 ? Math.floor(v) : d; }

module.exports = { getJSON, getText, posInt };
