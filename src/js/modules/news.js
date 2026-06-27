/* =============================================================================
 *  news.js — rotating headlines (data from main/news-source.js).
 *  One headline at a time, gently cross-fading. Overrides the Block #1 "news"
 *  placeholder in window.SM.moduleRegistry.
 * =============================================================================
 */
window.SM = window.SM || {};
(function () {
  const { el, shell, poll, isActive } = window.SM.modules.util;

  window.SM.moduleRegistry.news = {
    label: 'News',
    render(root, config) {
      const cfg = config.news || {};
      const body = shell(root, cfg.title || 'Headlines');

      const item = el('div', 'news-item');
      const headline = el('div', 'news-headline', '');
      const source = el('div', 'news-source', '');
      item.append(headline, source);
      body.append(item);

      let items = [];
      let idx = 0;
      let rotateTimer = null;
      const rotateMs = Math.max(3, Number(cfg.rotateSeconds) || 8) * 1000;
      const showSource = cfg.showSource !== false;

      function paint() {
        if (!items.length) { headline.textContent = ''; source.textContent = ''; return; }
        const it = items[idx % items.length];
        item.style.opacity = '0';
        setTimeout(() => {
          headline.textContent = it.title;
          source.textContent = showSource ? (it.source || '') : '';
          item.style.opacity = '1';
        }, 350);
      }

      function rotate() {
        clearTimeout(rotateTimer);
        // Pause entirely while not on the dashboard; the poll() mirror:state
        // handler re-runs render() (below) on return to active, restarting us.
        if (!isActive()) return;
        rotateTimer = setTimeout(() => {
          if (isActive() && items.length > 1) { idx = (idx + 1) % items.length; paint(); }
          rotate();
        }, rotateMs);
      }

      function render(res) {
        if (!res || !res.ok) {
          items = []; headline.textContent = 'news unavailable'; source.textContent = '';
        } else {
          items = (res.data && res.data.items) || [];
          idx = 0;
          paint();
        }
        rotate();   // restart the rotation clock so this headline gets a full dwell
      }

      poll({
        label: 'news',
        intervalMs: (Number(cfg.refreshMinutes) || 20) * 60000,
        fetchFn: () => window.mirror.getNews(),
        onResult: render,
      });
      rotate();
    },
  };
})();
