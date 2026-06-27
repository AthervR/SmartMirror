/* =============================================================================
 *  Smart Mirror — Electron main process
 *  Creates the frameless fullscreen window, serves local photos securely,
 *  and exposes a tiny IPC surface to the UI. You rarely need to edit this —
 *  day-to-day changes live in config/config.js.
 * =============================================================================
 */

const { app, BrowserWindow, ipcMain, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { pathToFileURL } = require('url');

const config = require('./config/config.js');
const createDataService = require('./main/data-service');

// NOTE: the Wayland ozone platform is selected by a real CLI flag in
// scripts/start-smart-mirror.sh (--ozone-platform=wayland) and in the npm
// scripts — Chromium reads that switch before any app.commandLine.appendSwitch
// here would take effect, so rendering flags live in the launcher, not here.

// A custom scheme so the UI can load local photos without us turning off
// web security or handing the filesystem to the renderer.
protocol.registerSchemesAsPrivileged([
  { scheme: 'mirror-photo', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
]);

const PHOTO_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.avif']);
const MIME = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.bmp': 'image/bmp', '.avif': 'image/avif',
};

// Expand a leading "~" to the user's home directory.
function resolveDir(p) {
  if (!p) return path.join(__dirname, 'photos');
  if (p === '~') return os.homedir();
  if (p.startsWith('~/')) return path.join(os.homedir(), p.slice(2));
  return path.resolve(p);
}

const PHOTO_DIR = resolveDir(config.ambient && config.ambient.photoDirectory);
const IS_DEV = process.argv.includes('--dev');

// Block #2 data feeds (weather / calendar / news) — fetched & cached in main.
const dataService = createDataService(config);

// Return just the image filenames in the photo directory (sorted).
function listPhotoFiles() {
  try {
    return fs.readdirSync(PHOTO_DIR)
      .filter((f) => PHOTO_EXTS.has(path.extname(f).toLowerCase()))
      .sort();
  } catch (err) {
    console.warn('[smart-mirror] could not read photo dir:', PHOTO_DIR, '-', err.message);
    return [];
  }
}

// Hook for a LATER block: actually power the panel on/off.
// On labwc:  spawn('wlopm', ['--off', '*'])  / ['--on', '*']
// Or HDMI:   spawn('vcgencmd', ['display_power', on ? '1' : '0'])
function setDisplayPower(on) {
  console.log('[smart-mirror] setDisplayPower(' + on + ') — stub, no real power control in Block #1');
}

function registerPhotoProtocol() {
  protocol.handle('mirror-photo', async (request) => {
    try {
      const url = new URL(request.url);                 // mirror-photo://local/<file>
      const name = decodeURIComponent(url.pathname).replace(/^\/+/, '');
      // Resolve symlinks on BOTH the root and the target, then require the real
      // file to live inside the real photo dir. This blocks ../ traversal AND a
      // symlink placed inside the folder that points at an out-of-tree file.
      const root = await fs.promises.realpath(PHOTO_DIR);
      const realPath = await fs.promises.realpath(path.resolve(root, name));
      if (realPath !== root && !realPath.startsWith(root + path.sep)) {
        return new Response('Forbidden', { status: 403 });
      }
      const ext = path.extname(realPath).toLowerCase();
      if (!PHOTO_EXTS.has(ext)) {
        return new Response('Forbidden', { status: 403 });   // only serve real image files
      }
      const stat = await fs.promises.stat(realPath);
      if (!stat.isFile()) {
        return new Response('Not found', { status: 404 });
      }
      const data = await fs.promises.readFile(realPath);
      return new Response(data, { headers: { 'content-type': MIME[ext] || 'application/octet-stream' } });
    } catch (err) {
      return new Response('Not found', { status: 404 });
    }
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width:  (config.display && config.display.width)  || 1280,
    height: (config.display && config.display.height) || 800,
    backgroundColor: (config.theme && config.theme.backgroundColor) || '#000000',
    frame: !IS_DEV,            // borderless appliance; show a frame only in --dev
    fullscreen: !IS_DEV,       // fullscreen on the Pi; windowed in --dev for debugging
    kiosk: !IS_DEV,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  win.once('ready-to-show', () => win.show());
  win.loadFile(path.join('src', 'index.html'));

  // Lock it down: this is an appliance, not a browser.
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  if (IS_DEV) win.webContents.openDevTools({ mode: 'detach' });
}

// Only allow a single running instance.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.whenReady().then(() => {
    registerPhotoProtocol();

    ipcMain.handle('get-config', () => config);
    ipcMain.handle('list-photos', () => listPhotoFiles());
    ipcMain.handle('get-weather', () => dataService.weather());
    ipcMain.handle('get-calendar', () => dataService.calendar());
    ipcMain.handle('get-news', () => dataService.news());
    ipcMain.on('set-display-power', (_e, on) => setDisplayPower(!!on));
    ipcMain.on('quit', () => app.quit());

    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => app.quit());
}
