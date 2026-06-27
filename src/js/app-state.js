/* =============================================================================
 *  app-state.js — the central state machine
 *  Three states: "active" (dashboard), "ambient" (photos), "sleep" (dark).
 *  The current state is written to <body data-state="..."> so CSS decides what
 *  is visible. Other modules listen via onChange() to run side-effects.
 * =============================================================================
 */
window.SM = window.SM || {};
(function () {
  const STATES = ['active', 'ambient', 'sleep'];

  class StateMachine {
    constructor(initial) {
      this.current = STATES.includes(initial) ? initial : 'active';
      this._listeners = [];
    }

    // Register a (to, from, meta) callback. Returns an unsubscribe function.
    onChange(fn) {
      this._listeners.push(fn);
      return () => {
        const i = this._listeners.indexOf(fn);
        if (i >= 0) this._listeners.splice(i, 1);
      };
    }

    // Move to a new state. No-op if it's unknown or already current.
    transition(to, meta = {}) {
      if (!STATES.includes(to)) { console.warn('[state] unknown state:', to); return false; }
      if (to === this.current) return false;

      const from = this.current;
      this.current = to;
      document.body.dataset.state = to;

      this._listeners.forEach((fn) => {
        try { fn(to, from, meta); } catch (err) { console.error('[state] listener error:', err); }
      });
      return true;
    }
  }

  window.SM.StateMachine = StateMachine;
})();
