/* =============================================================================
 *  activity-manager.js — idle tracking + automatic state changes
 *  Watches keyboard/mouse/touch and schedules a single timer for the next
 *  idle transition (active -> ambient -> sleep), re-armed on activity. No
 *  per-second polling, so the CPU can stay asleep until something actually
 *  changes.
 *
 *  EXTENDING LATER: a PIR sensor or heart-rate monitor just needs to call
 *  recordActivity('sensor'). Use registerSource() to wire one in cleanly.
 * =============================================================================
 */
window.SM = window.SM || {};
(function () {
  const INPUT_EVENTS = ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart'];

  class ActivityManager {
    constructor(config, stateMachine) {
      this.config = config;
      this.timings = config.timings || {};
      this.sm = stateMachine;
      this.lastActivity = Date.now();
      this.sources = [];

      this._onInput = (e) => {
        // Don't let the debug hotkeys (1/2/3/n/d) count as real activity,
        // otherwise pressing "2" to view photos would instantly wake again.
        if (e && e.type === 'keydown' && this.config.debug && this.config.debug.enabled) {
          const dk = window.SM.DEBUG_KEYS;
          if (dk && dk.has(e.key)) return;
        }
        this.recordActivity('input');
      };
    }

    start() {
      INPUT_EVENTS.forEach((ev) => window.addEventListener(ev, this._onInput, { passive: true }));
      // Re-arm on every state change: the ambient timer firing arms the sleep
      // timer next; debug keys that change state re-arm too.
      this._unsub = this.sm.onChange(() => this._arm());
      this._arm();
    }

    stop() {
      INPUT_EVENTS.forEach((ev) => window.removeEventListener(ev, this._onInput));
      clearTimeout(this.timer);
      if (this._unsub) this._unsub();
    }

    // The public entry point for ANY activity source (input now; sensors later).
    recordActivity(source) {
      this.lastActivity = Date.now();
      if (this.sm.current !== 'active') {
        this.sm.transition('active', { reason: 'activity:' + (source || 'unknown') });  // onChange -> _arm
      } else {
        this._arm();   // already active: just push the idle timer back
      }
    }

    // Extension hook. `fn` receives a wake() callback to call on each event,
    // and may return a cleanup function.
    registerSource(fn) {
      try {
        const cleanup = fn(() => this.recordActivity('sensor'));
        if (typeof cleanup === 'function') this.sources.push(cleanup);
      } catch (err) {
        console.error('[activity] source registration failed:', err);
      }
    }

    idleMs() { return Date.now() - this.lastActivity; }

    // Schedule the single next idle transition for the current state, instead of
    // polling. null/undefined timing = disabled; 0 transitions immediately.
    _arm() {
      clearTimeout(this.timer);
      const idle = this.idleMs();
      const { activeToAmbientMs: toAmbient, ambientToSleepMs: toSleep } = this.timings;

      if (this.sm.current === 'active' && toAmbient != null) {
        this.timer = setTimeout(() => this.sm.transition('ambient', { reason: 'idle-timeout' }),
          Math.max(0, toAmbient - idle));
      } else if (this.sm.current === 'ambient' && toSleep != null) {
        this.timer = setTimeout(() => this.sm.transition('sleep', { reason: 'idle-timeout' }),
          Math.max(0, toSleep - idle));
      }
    }
  }

  window.SM.ActivityManager = ActivityManager;
})();
