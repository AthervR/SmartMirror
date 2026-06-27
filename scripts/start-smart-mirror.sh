#!/usr/bin/env bash
# =============================================================================
#  Smart Mirror launcher
#  Sets up the display environment, then runs the Electron app.
#  Used both for manual testing and by the systemd user service.
# =============================================================================
set -euo pipefail

# Make sure node/electron are findable when launched by systemd.
export PATH="/usr/local/bin:/usr/bin:/bin:${PATH:-}"

# VS Code's SSH server exports ELECTRON_RUN_AS_NODE=1 into its terminals, which
# would make our Electron app start as plain Node.js (no window). Clear it so the
# app always launches as a real Electron GUI — both here and under systemd.
unset ELECTRON_RUN_AS_NODE

# A stale DISPLAY=:0 in the inherited environment pulls Chromium onto a half-X11
# path that floods the log with gbm/dma_buf errors. We render on Wayland — drop it.
unset DISPLAY

# Resolve <project> from this script's location (<project>/scripts/...).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# --- Display environment -----------------------------------------------------
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"

# Wait up to ~30s for the Wayland (labwc) socket so we never race the compositor
# at boot. labwc always provides one; the app targets Wayland directly (main.js).
if [ -z "${WAYLAND_DISPLAY:-}" ]; then
  for _ in $(seq 1 30); do
    sock="$(ls "$XDG_RUNTIME_DIR"/wayland-* 2>/dev/null | grep -v '\.lock$' | head -n1 || true)"
    if [ -n "$sock" ]; then
      export WAYLAND_DISPLAY="$(basename "$sock")"
      break
    fi
    sleep 1
  done
fi

# --- Launch ------------------------------------------------------------------
# Electron is a local dependency and bundles its own runtime (no system
# Chromium). --ozone-platform-hint=auto picks native Wayland on labwc and
# falls back to X11/Xwayland automatically.
# The Wayland ozone platform MUST be chosen with a real CLI flag — Chromium reads
# it before main.js could set it. We target labwc's Wayland compositor directly:
# hardware-accelerated and clean. Electron bundles its own runtime (no system
# Chromium). "$@" passes through extras like --dev from `npm run dev`.
# (If you ever hit GPU instability, add `--disable-gpu` for software rendering.)
exec "$PROJECT_DIR/node_modules/.bin/electron" . \
  --ozone-platform=wayland \
  --enable-features=UseOzonePlatform \
  "$@"
