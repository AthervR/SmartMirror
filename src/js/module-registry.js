/* =============================================================================
 *  module-registry.js — the dashboard modules
 *  Each entry knows how to render itself into a region element. In Block #1
 *  the clock is real and the rest are labelled placeholders. To turn a
 *  placeholder into a real module later, just replace its render() function.
 * =============================================================================
 */
window.SM = window.SM || {};
(function () {
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  // A generic "coming later" tile used by weather / calendar / news / sensors.
  function placeholder(label, note) {
    return {
      label,
      render(root) {
        root.classList.add('module--placeholder');
        root.append(el('div', 'placeholder-label', label.toUpperCase()));
        root.append(el('div', 'placeholder-note', note));
      },
    };
  }

  const registry = {
    // The only working module in Block #1: a live, minimal 24-hour clock.
    clock: {
      label: 'Clock',
      render(root) {
        root.classList.add('module--clock');
        const time = el('div', 'clock-time', '--:--');
        const date = el('div', 'clock-date', '');
        root.append(time, date);

        function tick() {
          const now = new Date();
          const h = now.getHours();
          const hh = String(h % 12 || 12);
          const mm = String(now.getMinutes()).padStart(2, '0');
          const ampm = h < 12 ? 'AM' : 'PM';
          time.textContent = hh + ':' + mm + ' ' + ampm;
          date.textContent = now.toLocaleDateString(undefined, {
            weekday: 'long', day: 'numeric', month: 'long',
          });
        }
        // The clock only shows HH:MM, so wake once per minute (aligned to the
        // minute boundary), not 60× a minute. Self-correcting, no drift.
        tick();
        (function scheduleNextMinute() {
          const now = new Date();
          setTimeout(() => { tick(); scheduleNextMinute(); },
            60000 - (now.getSeconds() * 1000 + now.getMilliseconds()));
        })();
      },
    },

    customText: {
      label: 'Custom Text',
      render(root, config) {
        root.classList.add('module--custom');
        const msg = (config.layout && config.layout.customText && config.layout.customText.message) || '';
        root.append(el('div', 'custom-text', msg));
      },
    },

    sensors: placeholder('Sensors', 'PIR motion / heart-rate — coming in a later block'),
  };

  window.SM.moduleRegistry = registry;
})();
