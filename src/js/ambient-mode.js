/* =============================================================================
 *  ambient-mode.js — the premium photo slideshow
 *  Two stacked layers cross-fade between photos, each with a slow Ken Burns
 *  zoom, on a black background. Driven entirely by config.ambient.
 * =============================================================================
 */
window.SM = window.SM || {};
(function () {
  // Shared with the dashboard photo frame; data-module.js loads first (index.html).
  const { shuffle } = window.SM.modules.util;

  // Honour a finite config number; fall back to a default otherwise. Interval
  // must be > 0 (a 0ms loop would spin); transition may be 0 (instant cut).
  function ms(value, fallback, allowZero) {
    if (Number.isFinite(value) && (allowZero ? value >= 0 : value > 0)) return value;
    return fallback;
  }

  class AmbientMode {
    constructor(config) {
      this.cfg = config.ambient || {};
      this.container = document.getElementById('ambient');
      this.layers = [
        this.container.querySelector('[data-layer="a"]'),
        this.container.querySelector('[data-layer="b"]'),
      ];
      this.activeLayer = 0;
      this.photos = [];
      this.index = 0;
      this.timer = null;
      this.running = false;
      this._gen = 0;            // bumped by stop()/start() to cancel an in-flight start()
      this._applyVars();
    }

    // Push timing/look settings into CSS variables.
    _applyVars() {
      const root = document.documentElement.style;
      const interval = ms(this.cfg.intervalMs, 8000, false);
      const trans = ms(this.cfg.transitionMs, 1500, true);
      root.setProperty('--ambient-transition', trans + 'ms');
      root.setProperty('--kb-zoom', this.cfg.kenBurns ? (this.cfg.kenBurnsZoom || 1.08) : 1);
      root.setProperty('--kb-duration', (interval + trans) + 'ms');
      this.container.dataset.fit = this.cfg.fitMode || 'cover';
      this.container.dataset.vignette = this.cfg.vignette ? 'on' : 'off';
    }

    // Ask the main process for the current photo filenames and build URLs.
    async load() {
      try {
        const files = await window.mirror.listPhotos();
        const list = this.cfg.shuffle ? shuffle(files) : files;
        this.photos = list.map((f) => 'mirror-photo://local/' + encodeURIComponent(f));
      } catch (err) {
        console.error('[ambient] could not list photos:', err);
        this.photos = [];
      }
      this.index = 0;
    }

    async start() {
      if (this.running) return;
      this.running = true;
      const gen = ++this._gen;
      await this.load();                                 // re-read folder each time
      // If stop() (or another start) ran during the await, abandon this run so we
      // don't paint a stray photo / arm an orphan timer after leaving ambient.
      if (gen !== this._gen || !this.running) return;
      if (!this.photos.length) {
        console.warn('[ambient] no photos in', this.cfg.photoDirectory, '- add images there.');
        this.running = false;                            // let a later start() retry once photos exist
        return;
      }
      this.show(this.index);
      this._schedule();
    }

    stop() {
      this.running = false;
      this._gen++;                                       // invalidate any in-flight start()
      clearTimeout(this.timer);
    }

    _schedule() {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.next(), ms(this.cfg.intervalMs, 8000, false));
    }

    next() {
      if (!this.photos.length) return;
      this.index = (this.index + 1) % this.photos.length;
      this.show(this.index);
      if (this.running) this._schedule();
    }

    // Preload the image, then cross-fade it in on the inactive layer.
    show(i) {
      const url = this.photos[i];
      const nextLayer = 1 - this.activeLayer;
      const layerEl = this.layers[nextLayer];
      const prevLayer = this.activeLayer;
      this.activeLayer = nextLayer;          // commit synchronously so overlapping calls alternate layers

      const img = new Image();
      img.onload = () => {
        layerEl.style.backgroundImage = 'url("' + url + '")';
        // Restart the Ken Burns animation from scratch on this layer.
        layerEl.classList.remove('kb');
        void layerEl.offsetWidth;                        // force reflow
        layerEl.classList.add('kb');

        this.layers[prevLayer].classList.remove('is-visible');
        layerEl.classList.add('is-visible');
      };
      img.onerror = () => console.warn('[ambient] failed to load', url);
      img.src = url;
    }
  }

  window.SM.AmbientMode = AmbientMode;
})();
