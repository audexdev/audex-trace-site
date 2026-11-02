#!/usr/bin/env bash
# Render assets/og-image.png (1200x630) from assets/og-image.svg using headless Chrome.
# Regenerate whenever og-image.svg changes, then commit the PNG: social crawlers
# (X, LinkedIn, etc.) do not render SVG og:images.
set -euo pipefail

cd "$(dirname "$0")/.."

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
if [[ ! -x "$CHROME" ]]; then
  echo "Google Chrome not found at $CHROME" >&2
  exit 1
fi

"$CHROME" \
  --headless \
  --disable-gpu \
  --hide-scrollbars \
  --force-device-scale-factor=1 \
  --window-size=1200,630 \
  --default-background-color=00000000 \
  --screenshot="assets/og-image.png" \
  "file://$(pwd)/assets/og-image.svg" >/dev/null 2>&1

sips -g pixelWidth -g pixelHeight assets/og-image.png
