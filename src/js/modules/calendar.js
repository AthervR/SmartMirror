/* =============================================================================
 *  calendar.js — minimal list of upcoming events (data from main/ics-source.js).
 *  Works with Google & Apple ICS feeds. Overrides the Block #1 "calendar"
 *  placeholder in window.SM.moduleRegistry.
 * =============================================================================
 */
window.SM = window.SM || {};
(function () {
  const { el, shell, poll, eventTime } = window.SM.modules.util;

  window.SM.moduleRegistry.calendar = {
    label: 'Calendar',
    render(root, config) {
      const cfg = config.calendar || {};
      const body = shell(root, cfg.title || 'Calendar');
      const list = el('div', 'cal-list');
      body.append(list);

      function render(res) {
        if (!res || !res.ok) { list.replaceChildren(el('div', 'module-empty', 'calendar unavailable')); return; }
        const events = (res.data && res.data.events) || [];
        if (!events.length) { list.replaceChildren(el('div', 'module-empty', 'No upcoming events')); return; }
        list.replaceChildren();
        events.forEach((ev) => {
          const row = el('div', 'cal-event');
          row.append(el('div', 'cal-when', eventTime(ev.start, ev.allDay)));
          row.append(el('div', 'cal-title', ev.summary));
          list.append(row);
        });
      }

      poll({
        label: 'calendar',
        intervalMs: (Number(cfg.refreshMinutes) || 30) * 60000,
        fetchFn: () => window.mirror.getCalendar(),
        onResult: render,
      });
    },
  };
})();
