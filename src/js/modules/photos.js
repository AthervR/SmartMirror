/* =============================================================================
 *  photos.js — a rounded-square photo frame in the middle of the dashboard.
 *  Cycles the same images as the ambient slideshow (config.ambient.photoDirectory),
 *  but as a small framed square shown while the dashboard is up. Two stacked
 *  layers cross-fade between photos. Settings live in config.photos.
 * =============================================================================
 */
window.SM = window.SM || {};
window.SM.moduleRegistry = window.SM.moduleRegistry || {};
(function () {
  const util = (window.SM.modules && window.SM.modules.util) || {};

  function num(value, fallback) {
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  window.SM.moduleRegistry.photos = {
    label: 'Photos',
    render(root, config) {
      const cfg = (config && config.photos) || {};
      const intervalMs = num(cfg.intervalMs, 6000);
      const size = num(cfg.size, 340);
      const radius = Number.isFinite(cfg.cornerRadius) ? cfg.cornerRadius : 28;

      root.classList.add('module--photos');
      if (cfg.title) root.append(util.el('div', 'module-title', String(cfg.title).toUpperCase()));

      const frame = document.createElement('div');
      frame.className = 'photo-frame';
      frame.style.width = size + 'px';
      frame.style.height = size + 'px';
      frame.style.borderRadius = radius + 'px';
      frame.dataset.fit = cfg.fitMode === 'contain' ? 'contain' : 'cover';

      const layers = [
        util.el('div', 'photo-img'),
        util.el('div', 'photo-img'),
      ];
      frame.append(layers[0], layers[1]);
      root.append(frame);

      let photos = [];
      let index = 0;
      let active = 0;
      let timer = null;

      // Cross-fade the next photo in on the inactive layer once it has loaded.
      function show(i) {
        const url = photos[i];
        if (!url) return;
        const next = 1 - active;
        const img = new Image();
        img.onload = () => {
          layers[next].style.backgroundImage = 'url("' + url + '")';
          layers[next].classList.add('is-visible');
          layers[active].classList.remove('is-visible');
          active = next;
        };
        img.onerror = () => console.warn('[photos] failed to load', url);
        img.src = url;
      }

      function schedule() {
        clearTimeout(timer);
        // Only cycle while the dashboard is actually visible — no decoding photos
        // into a hidden frame during ambient/sleep.
        if (photos.length > 1 && util.isActive()) timer = setTimeout(advance, intervalMs);
      }
      function advance() {
        index = (index + 1) % photos.length;
        show(index);
        schedule();
      }

      async function load() {
        try {
          const files = await window.mirror.listPhotos();
          const list = cfg.shuffle === false ? files : util.shuffle(files);
          photos = list.map((f) => 'mirror-photo://local/' + encodeURIComponent(f));
        } catch (err) {
          console.error('[photos] could not list photos:', err);
          photos = [];
        }
        index = 0;
        if (!photos.length) {
          frame.classList.add('photo-frame--empty');
          frame.append(util.el('div', 'photo-empty', 'add photos to the photos folder'));
          return;
        }
        show(0);
        schedule();
      }

      // Pause cycling when we leave the dashboard, resume on return.
      window.addEventListener('mirror:state', (e) => {
        if (!e.detail) return;
        if (e.detail.to === 'active') schedule();
        else clearTimeout(timer);
      });

      load();
    },
  };
})();
