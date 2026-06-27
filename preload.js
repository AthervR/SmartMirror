/* =============================================================================
 *  Smart Mirror — preload bridge
 *  The ONLY channel between the locked-down UI and the main process.
 *  Everything the UI is allowed to ask for is listed here as window.mirror.*
 * =============================================================================
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mirror', {
  // Read config/config.js (loaded by the main process).
  getConfig: () => ipcRenderer.invoke('get-config'),

  // List image filenames in the configured photo directory.
  listPhotos: () => ipcRenderer.invoke('list-photos'),

  // Ask the main process to power the panel (stub in Block #1, real later).
  setDisplayPower: (on) => ipcRenderer.send('set-display-power', !!on),

  // Quit the app.
  quit: () => ipcRenderer.send('quit'),

  // --- Block #2 data feeds (fetched + parsed in the main process) ---------
  getWeather:  () => ipcRenderer.invoke('get-weather'),
  getCalendar: () => ipcRenderer.invoke('get-calendar'),
  getNews:     () => ipcRenderer.invoke('get-news'),

  /* --- Future-sensor hooks ----------------------------------------------
   * Wired now, but nothing sends on these channels yet in Block #1.
   * A later block's main process can do, e.g.:
   *     win.webContents.send('external-activity', { source: 'pir' });
   *     win.webContents.send('force-state', 'ambient');
   * ...to feed PIR motion / heart-rate events into the same state machine.
   */
  onExternalActivity: (cb) => {
    const listener = (_e, payload) => cb(payload);
    ipcRenderer.on('external-activity', listener);
    return () => ipcRenderer.removeListener('external-activity', listener);
  },
  onForceState: (cb) => {
    const listener = (_e, state) => cb(state);
    ipcRenderer.on('force-state', listener);
    return () => ipcRenderer.removeListener('force-state', listener);
  },
});
