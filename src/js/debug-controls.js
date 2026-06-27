/* =============================================================================
 *  debug-controls.js — keyboard shortcuts + on-screen HUD for testing
 *  Only active when config.debug.enabled is true.
 *    1 = active (dashboard)   2 = ambient (photos)   3 = sleep
 *    n = next photo           d = toggle HUD         ctrl+q = quit
 * =============================================================================
 */
window.SM = window.SM || {};

// Keys the activity-manager should ignore so they don't count as "activity".
window.SM.DEBUG_KEYS = new Set(['1', '2', '3', 'n', 'N', 'd', 'D']);

(function () {
  function initDebugControls({ config, stateMachine, activityManager, ambient }) {
    if (!(config.debug && config.debug.enabled)) return;

    const hud = document.getElementById('debug-hud');
    let hudOn = false;
    let hudTimer = null;

    function toggleHud() {
      hudOn = !hudOn;
      hud.hidden = !hudOn;
      clearInterval(hudTimer);
      // Only run the refresh loop while the HUD is on screen — no wakeups when hidden.
      if (hudOn) { renderHud(); hudTimer = setInterval(renderHud, 250); }
      else hudTimer = null;
    }

    window.addEventListener('keydown', (e) => {
      switch (e.key) {
        case '1': activityManager.recordActivity('debug'); break;      // wake + reset idle timer
        case '2': stateMachine.transition('ambient', { reason: 'debug' }); break;
        case '3': stateMachine.transition('sleep',   { reason: 'debug' }); break;
        case 'n': case 'N': ambient.next(); break;
        case 'd': case 'D': toggleHud(); break;
        case 'q': case 'Q': if (e.ctrlKey) window.mirror.quit(); break;
        default: break;
      }
    });

    function renderHud() {
      const t = config.timings || {};
      const idle = activityManager.idleMs();
      const countdown = (target) =>
        target ? Math.max(0, Math.ceil((target - idle) / 1000)) + 's' : 'off';

      hud.innerHTML =
        'STATE <b>' + stateMachine.current + '</b><br>' +
        'idle ' + Math.floor(idle / 1000) + 's<br>' +
        '&rarr; ambient ' + countdown(t.activeToAmbientMs) + '<br>' +
        '&rarr; sleep ' + countdown(t.ambientToSleepMs) + '<br>' +
        '<span class="hud-keys">1 active · 2 ambient · 3 sleep · n next · d hud · ctrl+q quit</span>';
    }
  }

  window.SM.initDebugControls = initDebugControls;
})();
