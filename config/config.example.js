/* =============================================================================
 *  SMART MIRROR — MAIN CONFIG
 *  This is the ONE file you edit for everyday changes.
 *  Edit a value, save, then restart the mirror:
 *      systemctl --user restart smart-mirror      (when running as a service)
 *  ...or just relaunch it if you started it by hand.
 * =============================================================================
 */

module.exports = {

  /* ===========================================================================
   *  ░░░  START HERE  ░░░   Everything most people change lives below.
   * ===========================================================================
   */

  // --- LOOK & FEEL -----------------------------------------------------------
  theme: {
    // Font shown on screen. "Inter" ships with the project (thin, premium).
    // Want a different font? Put its name first, e.g.:
    //   "'Cormorant Garamond', serif"   or   "'Helvetica Neue', sans-serif"
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",

    textColor:       "#FFFFFF",   // main text colour
    backgroundColor: "#000000",   // screen background (keep black for a mirror)
    accentColor:     "#9A9A9A",   // dimmer colour for dates / sub-labels

    // 100 = hair-thin, 200 = thin, 300 = light, 400 = normal. Lower = more elegant.
    baseFontWeight: 200,
    letterSpacing:  "0.04em",     // space between letters; bigger = airier

    hideCursor: true,             // hide the mouse pointer (true for a real mirror)
  },

  // --- WHAT THE MIRROR SHOWS WHEN IT TURNS ON --------------------------------
  startup: {
    // "active"  = boot to the dashboard (clock + modules), then idle to photos
    // "ambient" = boot straight into the photo slideshow
    initialState: "active",
  },

  // --- IDLE TIMINGS (when the screen changes on its own) ---------------------
  timings: {
    // No activity for this long  ->  switch from dashboard to photo slideshow.
    activeToAmbientMs: 10 * 60 * 1000,   // 10 minutes

    // Total idle time before going to a dark "sleep" state. This is measured
    // from the LAST activity, so set it LARGER than activeToAmbientMs above.
    // Set to null to disable sleep entirely (the default).
    ambientToSleepMs: null,              // e.g. 30 * 60 * 1000 for 30 minutes
  },

  // --- PHOTO SLIDESHOW (the "ambient" screen) --------------------------------
  ambient: {
    // Folder the photos come from. Drop images in here (or change the path).
    photoDirectory: "/home/athervr/smart-mirror/photos",  // "~" also works

    intervalMs:   8000,     // how long each photo stays (8 seconds)
    transitionMs: 1500,     // cross-fade length between photos (1.5 seconds)

    // "cover"   = fill the screen, may crop edges (best for most photos)
    // "contain" = show the whole photo, may letterbox with black
    fitMode: "cover",

    shuffle:      true,     // random order each time the slideshow starts
    kenBurns:     true,     // slow cinematic zoom on each photo (premium look)
    kenBurnsZoom: 1.08,     // how far it zooms (1.0 = none, 1.12 = stronger)
    vignette:     true,     // soft dark edges around the photo
  },

  // --- CENTER PHOTO FRAME (a rounded square shown ON the dashboard) ----------
  // Cycles the SAME images as the slideshow (from ambient.photoDirectory above),
  // but as a small rounded square in the middle of the screen while the
  // dashboard is up. Hide it by setting layout.regions.photos.visible to false.
  photos: {
    title: "",              // small header above the frame ("" = no header)
    intervalMs: 6000,       // how long each photo shows before the next (6 s)
    size: 340,              // width & height of the square, in pixels
    cornerRadius: 28,       // corner roundness (bigger = rounder; 0 = sharp)
    fitMode: "cover",       // "cover" = fill the square (crops), "contain" = whole photo
    shuffle: true,          // random order each time
  },

  // --- WEATHER (Open-Meteo — free, no API key) -------------------------------
  weather: {
    title: "Weather",            // header shown above this module
    // Your coordinates (decimal degrees; south & west are negative).
    // Find them at https://www.latlong.net or Google your town + "lat long".
    latitude:  40.7128,
    longitude: -74.0060,
    locationName: "New York",    // shown under the temperature (display only)
    units: "imperial",           // "metric" = °C + km/h,  "imperial" = °F + mph
    refreshMinutes: 15,          // how often to refresh the forecast
  },

  // --- CALENDAR (ICS / iCal — works with Google & Apple) ---------------------
  calendar: {
    title: "Calendar",
    // One or more ICS feed URLs. Where to find yours:
    //   Google : Settings -> your calendar -> "Integrate calendar"
    //            -> "Secret address in iCal format"
    //   Apple  : Calendar app -> share a calendar -> Public Calendar
    //            -> copy link  (a webcal:// link is fine, it's converted for you)
    icsUrls: [
      // Public US holidays so you see events on first run — replace with yours:
      "https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics",
    ],
    maxEvents:      6,           // how many upcoming events to list
    lookaheadDays:  30,          // only show events within this many days
    refreshMinutes: 30,
  },

  // --- NEWS (RSS / Atom feeds) -----------------------------------------------
  news: {
    title: "Headlines",
    feeds: [
      "https://feeds.bbci.co.uk/news/rss.xml",           // BBC
      "https://feeds.apnews.com/rss/apf-topnews",        // AP
      "https://feeds.reuters.com/reuters/topNews",        // Reuters
      "https://feeds.npr.org/1001/rss.xml",              // NPR
      "http://rss.cnn.com/rss/cnn_topstories.rss",       // CNN
      "https://www.pbs.org/newshour/feeds/rss/headlines", // PBS NewsHour
    ],
    maxItems:       12,          // headlines kept in the rotation
    rotateSeconds:  8,           // seconds each headline shows before the next
    showSource:     true,        // show the feed name under each headline
    refreshMinutes: 20,
  },

  // --- DASHBOARD LAYOUT: which modules show, and where -----------------------
  layout: {
    // For each module:  visible = show/hide,  position = where on the screen.
    // Positions (a 3x3 grid):
    //   top-left     top-center     top-right
    //   mid-left     mid-center     mid-right
    //   bottom-left  bottom-center  bottom-right
    regions: {
      clock:      { visible: true,  position: "top-left" },
      photos:     { visible: true,  position: "mid-center" },
      weather:    { visible: true,  position: "top-right" },
      calendar:   { visible: true,  position: "mid-right" },
      news:       { visible: true,  position: "bottom-right" },
      customText: { visible: true,  position: "bottom-left" },
      sensors:    { visible: false, position: "bottom-center" },  // Block #3
    },
    customText: {
      message: "be here now",     // shown by the customText region
    },
  },

  // --- DEVELOPER HELPERS -----------------------------------------------------
  debug: {
    // Keyboard shortcuts for testing (turn off for a finished mirror):
    //   1 = dashboard   2 = photos   3 = sleep
    //   n = next photo  d = debug overlay   ctrl+q = quit
    enabled: true,
  },

  /* ===========================================================================
   *  ░░░  END START HERE  ░░░   Below is plumbing most people never touch.
   * ===========================================================================
   */

  display: {
    width:  1280,   // target screen size; the app runs fullscreen regardless
    height: 800,
  },
};
