/* =============================================================================
 *  layout.js — builds the dashboard
 *  Reads config.layout.regions and renders only the modules switched on, placing
 *  each at its configured position. Each region gets class "region region--<name>"
 *  and data-pos="<position>" so CSS can place + align it.
 * =============================================================================
 */
window.SM = window.SM || {};
(function () {
  // Order here = visual reading order; the CSS grid handles actual placement.
  const REGION_ORDER = ['clock', 'photos', 'weather', 'calendar', 'news', 'customText', 'sensors'];
  const DEFAULT_POS = {
    clock: 'top-left', photos: 'mid-center', weather: 'top-right', calendar: 'mid-right',
    news: 'bottom-right', customText: 'bottom-left', sensors: 'bottom-center',
  };

  function buildLayout(config) {
    const dashboard = document.getElementById('dashboard');
    dashboard.innerHTML = '';

    const regions = (config.layout && config.layout.regions) || {};
    const usedPositions = new Set();

    REGION_ORDER.forEach((name) => {
      const r = regions[name];
      // Each region is { visible, position }; absent or visible:false hides it.
      if (!r || r.visible === false) return;
      const position = r.position || DEFAULT_POS[name];

      const mod = window.SM.moduleRegistry[name];
      if (!mod) { console.warn('[layout] no module registered for', name); return; }

      if (usedPositions.has(position)) {
        console.warn('[layout] position "' + position + '" is already used by another visible module; "' +
          name + '" will overlap it. Give each visible module its own position in config.layout.regions.');
      }
      usedPositions.add(position);

      const region = document.createElement('section');
      region.className = 'region region--' + name;
      region.dataset.pos = position;
      try { mod.render(region, config); }
      catch (err) { console.error('[layout] module failed:', name, err); }
      dashboard.append(region);
    });
  }

  window.SM.buildLayout = buildLayout;
})();
