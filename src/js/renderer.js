/* =============================================================================
 *  renderer.js — the orchestrator (runs last)
 *  Pulls config from the main process, applies the theme, builds the dashboard,
 *  and wires the state machine + activity manager + ambient slideshow together.
 * =============================================================================
 */
(async function () {
  const SM = window.SM;

  const config = await window.mirror.getConfig();
  applyTheme(config);

  // 1) Dashboard
  SM.buildLayout(config);

  // 2) State machine (start in whatever config.startup.initialState says)
  const initial = (config.startup && config.startup.initialState) || 'active';
  const state = new SM.StateMachine(initial);

  // 3) Ambient slideshow + 4) activity/idle manager
  const ambient = new SM.AmbientMode(config);
  const activity = new SM.ActivityManager(config, state);

  // Side-effects whenever the state changes.
  state.onChange((to, from) => {
    if (to === 'ambient') ambient.start();
    else ambient.stop();

    if (to === 'sleep') window.mirror.setDisplayPower(false);
    else if (from === 'sleep') window.mirror.setDisplayPower(true);

    // Let Block #2 data modules refresh the moment we return to active.
    window.dispatchEvent(new CustomEvent('mirror:state', { detail: { to, from } }));
  });

  // Apply the initial state's visuals + side-effects (no transition fired yet).
  document.body.dataset.state = state.current;
  if (state.current === 'ambient') ambient.start();
  if (state.current === 'sleep') window.mirror.setDisplayPower(false);

  activity.start();

  // Future hardware: nothing sends on these channels yet in Block #1.
  window.mirror.onExternalActivity((p) => activity.recordActivity((p && p.source) || 'external'));
  window.mirror.onForceState((s) => state.transition(s, { reason: 'external' }));

  // 5) Debug hotkeys + HUD
  SM.initDebugControls({ config, stateMachine: state, activityManager: activity, ambient });

  console.log('[smart-mirror] ready — initial state:', state.current);

  function applyTheme(cfg) {
    const t = cfg.theme || {};
    const r = document.documentElement.style;
    if (t.fontFamily)      r.setProperty('--font-family', t.fontFamily);
    if (t.textColor)       r.setProperty('--text-color', t.textColor);
    if (t.backgroundColor) r.setProperty('--bg-color', t.backgroundColor);
    if (t.accentColor)     r.setProperty('--accent-color', t.accentColor);
    if (t.baseFontWeight)  r.setProperty('--font-weight', t.baseFontWeight);
    if (t.letterSpacing)   r.setProperty('--letter-spacing', t.letterSpacing);
    document.body.dataset.cursor = t.hideCursor === false ? 'show' : 'hide';
  }
})();
