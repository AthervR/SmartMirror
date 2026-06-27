# Smart Mirror

A full-screen smart mirror dashboard built with Electron, designed to run as a kiosk on a Raspberry Pi with a Wayland compositor (labwc). Displays a live clock, weather, calendar events, and rotating news headlines on the dashboard — and fades into a full-screen photo slideshow when idle.

---

## Features

- **Clock** — 12-hour live clock with date, auto-aligned to the minute boundary (no drift)
- **Weather** — current conditions + 3-day forecast via [Open-Meteo](https://open-meteo.com/) (free, no API key)
- **Calendar** — upcoming events from any ICS/iCal feed (Google Calendar, Apple Calendar, webcal://)
- **News** — rotating headlines from configurable RSS/Atom feeds (BBC, AP, Reuters, NPR, CNN, PBS, etc.)
- **Photo slideshow** — full-screen ambient mode with Ken Burns zoom and cross-fade transitions
- **Center photo frame** — small rounded photo frame on the dashboard while active
- **Custom text** — a persistent message in the corner ("be here now", etc.)
- **3-state machine** — `active` (dashboard) → `ambient` (photos) → `sleep` (dark), driven by idle timers
- **Kiosk-ready** — runs fullscreen under Wayland, hides cursor, ships a systemd user service
- **Zero cloud dependency** — weather is free/keyless; photos serve locally via a locked-down custom URL scheme

---

## Bill of Materials

> Add your Amazon links below for each component.

| Component | Notes | Link |
|---|---|---|
| Raspberry Pi | Pi 4 (4 GB) or Pi 5 recommended | https://www.amazon.com/Raspberry-Pi-Computer-Suitable-Workstation/dp/B0899VXM8F/ref=sr_1_1?crid=1VXJ4X0GGHKYA&dib=eyJ2IjoiMSJ9.h6N2Tyq9H2l8mNOjW6HJ9PgoSkwOBRt8Vd6Xr1i6r_63XV8-Ka0mMiRjQdiac86EpQ_TPm3dvioXgImExBi8qoL44b3gJeopPPwX1GY2teIYg3WHMKlY2mLNOfnNXGU5ppgunrJ7nuN2yviPf6Imxp_dEW-x4waLF503iDFFP3l61DURwsRZ2XwkiumuXRW8GP1HuFbJV3BE7O4dAAAPNPfkw_UlWn0n1ojSN4aPidU.L5uU8H3cQUBBGZOqlJx_KZ8PxC8v_SxnLNgvz7kydR4&dib_tag=se&keywords=raspberry+pi+4b+8gb&qid=1782528952&sprefix=raspberry+pi+4b%2Caps%2C265&sr=8-1 |
| MicroSD card | 32 GB+ Class 10 / A1 | https://www.amazon.com/SanDisk-Ultra-UHS-I-Memory-Adapter/dp/B00M55C0NS/ref=sr_1_4?crid=YDE86EYNV6EN&dib=eyJ2IjoiMSJ9.rqv_K51avTF4LethvvFZEX6rn6P9CxRgyO6IGLD2gh5ltuFTiFttoZOYLc9HL4U3tl0YQ1JWLA2L63LYGQPDs8YRxCJEIuFiSOYu_hPEhEiBHohuO2izNKlUV3WcDvc6R4rVXwmDYajUTNEPjJc9zE5EBRxuhD4yYPSvsI2mA-CEcKuMWTamd9Y08rENBswMNnWtN2uFuaBVON70QtHZ5pqYSw6jIu1aR6AwDSwpGRA.gELOv2oHzSPcYCQ9I7UgQZxAzUEcSpzy6CPIq3mP9sg&dib_tag=se&keywords=32gb+sd+card&qid=1782528981&sprefix=32gb+sd+ca%2Caps%2C210&sr=8-4 |
| Pi power supply | Official USB-C PSU (5V/3A for Pi 4, 5V/5A for Pi 5) | |
| Monitor / display | Any HDMI monitor that fits your frame | https://www.amazon.com/dp/B0BPM9VTY6?ref=ppx_yo2ov_dt_b_fed_asin_title |
| Monitor power cable | Match your monitor | |
| HDMI cable | Micro-HDMI to HDMI for Pi 4/5 | |
| Two-way mirror acrylic | Cut to your monitor size; acrylic is lighter than glass | |
| Mirror frame / shadow box | Deep enough to hide the monitor + Pi | https://www.amazon.com/dp/B0C6H6ZQ6R?ref=ppx_yo2ov_dt_b_fed_asin_title |
| BME280 Sensor Module for Pressure, Temperature & Humidity | https://www.amazon.com/dp/B0DHPCFXCK?ref=ppx_yo2ov_dt_b_fed_asin_title |
| PIR motion sensor | For auto-wake / display power (Block #3) | https://www.amazon.com/dp/B0CCF3HYT9?ref=ppx_yo2ov_dt_b_fed_asin_title |

---

## Requirements

- **Raspberry Pi** running Raspberry Pi OS (64-bit recommended)
- **Node.js** v20+ (ships with recent Pi OS, or install via [nvm](https://github.com/nvm-sh/nvm))
- **labwc** Wayland compositor (or any Wayland compositor)
- **npm** (comes with Node.js)

---

## Installation

```bash
# 1. Clone the repo
git clone https://github.com/AthervR/SmartMirror
cd smart-mirror

# 2. Install dependencies
npm install

# 3. Copy the example config and fill in your details
cp config/config.example.js config/config.js
nano config/config.js   # set your coordinates, calendar URL, etc.
```

---

## Configuration

Everything you need to change day-to-day lives in **`config/config.js`** (created from the example above). Key sections:

### Weather
```js
weather: {
  latitude:     40.7128,      // your latitude
  longitude:    -74.0060,     // your longitude
  locationName: "New York",   // display name
  units:        "imperial",   // "metric" for °C
}
```
Uses [Open-Meteo](https://open-meteo.com/) — no API key required.

### Calendar
```js
calendar: {
  icsUrls: [
    "https://calendar.google.com/calendar/ical/YOUR_SECRET_URL/basic.ics",
  ],
}
```
- **Google Calendar:** Settings → your calendar → Integrate calendar → "Secret address in iCal format"
- **Apple Calendar:** Share a calendar → Public Calendar → copy the `webcal://` link (converted automatically)

### News feeds
```js
news: {
  feeds: [
    "https://feeds.bbci.co.uk/news/rss.xml",
    "https://feeds.apnews.com/rss/apf-topnews",
    // add or remove feeds here
  ],
}
```

### Photo slideshow
```js
ambient: {
  photoDirectory: "/home/youruser/smart-mirror/photos",
  intervalMs:     8000,    // 8 seconds per photo
  shuffle:        true,
  kenBurns:       true,
}
```
Drop `.jpg` / `.png` files into the `photos/` folder (gitignored — stays local).

### Idle timers
```js
timings: {
  activeToAmbientMs: 10 * 60 * 1000,  // 10 min idle → photo slideshow
  ambientToSleepMs:  null,             // null = never sleep
}
```

---

## Running

### Manual (dev)
```bash
npm run dev
```
Opens the app in a window with debug keyboard shortcuts enabled:

| Key | Action |
|---|---|
| `1` | Active (dashboard) |
| `2` | Ambient (slideshow) |
| `3` | Sleep (dark) |
| `n` | Next photo |
| `d` | Debug HUD |
| `Ctrl+Q` | Quit |

### Production (kiosk)
```bash
npm start
```

### As a systemd service (auto-start on boot)
```bash
# Install the service
cp system/smart-mirror.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable smart-mirror
systemctl --user start smart-mirror

# Check logs
journalctl --user -u smart-mirror -f
```

---

## Project Structure

```
smart-mirror/
├── main.js                     # Electron main process entry point
├── preload.js                  # Context bridge (main ↔ renderer IPC)
├── config/
│   ├── config.example.js       # Template — copy to config.js and edit
│   └── config.js               # Your local config (gitignored)
├── main/
│   ├── data-service.js         # Polls weather/calendar/news, pushes to renderer
│   ├── http.js                 # Shared fetch wrapper (AbortSignal timeout, posInt)
│   ├── weather-source.js       # Open-Meteo API
│   ├── ics-source.js           # ICS/iCal feed parser (ical-expander)
│   └── news-source.js          # RSS/Atom feed parser (rss-parser)
├── src/
│   ├── index.html              # Renderer shell
│   ├── js/
│   │   ├── renderer.js         # Boot sequence — wires everything together
│   │   ├── app-state.js        # 3-state machine (active / ambient / sleep)
│   │   ├── layout.js           # Builds the dashboard grid from config
│   │   ├── module-registry.js  # Clock, customText, sensors modules
│   │   ├── activity-manager.js # Idle detection → state transitions
│   │   ├── ambient-mode.js     # Full-screen photo slideshow
│   │   ├── debug-controls.js   # Dev keyboard shortcuts + HUD
│   │   └── modules/
│   │       ├── data-module.js  # Shared utils (poll, shuffle, etc.)
│   │       ├── weather.js      # Weather UI module
│   │       ├── calendar.js     # Calendar UI module
│   │       ├── news.js         # Headlines UI module
│   │       └── photos.js       # Center photo frame module
│   └── styles/
│       ├── main.css            # Layout, theme, animations
│       ├── custom.css          # Your local style overrides
│       └── fonts/              # Vendored Inter woff2 (thin weights)
├── scripts/
│   └── start-smart-mirror.sh  # Launcher: sets Wayland env, execs Electron
├── system/
│   └── smart-mirror.service   # systemd user service unit
└── photos/
    └── README.txt              # Instructions for adding photos (files gitignored)
```

---

## Architecture Notes

The app uses a strict **main/renderer split**:

- **Main process** fetches and caches all external data (weather, calendar, news) on a timer, then pushes clean JSON to the renderer via IPC. The renderer never touches the network.
- **`mirror-photo://` scheme** serves local photos securely — blocks path traversal and symlink escapes so the renderer can't read arbitrary files.
- The **state machine** (`active → ambient → sleep`) is CSS-driven: state is written to `<body data-state="...">` and CSS `[data-state]` selectors show/hide regions with no JS layout thrashing.

---

## License

MIT
