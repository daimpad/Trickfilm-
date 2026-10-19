#!/usr/bin/env bash
# SessionStart-Hook: Abhängigkeiten installieren und die Werkzeuge der Werkstatt prüfen.
# Fehlendes wird gemeldet, nie still nachinstalliert. Der Hook scheitert nicht,
# damit die Sitzung startet; die Meldungen landen im Kontext der Sitzung.
set -u
cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/..}" || exit 0

fehlt=()

# npm ci nur, wenn node_modules fehlt oder älter ist als die Sperrdatei.
if [ ! -d node_modules ] || [ package-lock.json -nt node_modules ]; then
  if npm ci --no-audit --no-fund >/tmp/trickfilm-npm-ci.log 2>&1; then
    echo "npm ci: ok"
  else
    fehlt+=("npm ci gescheitert, siehe /tmp/trickfilm-npm-ci.log")
  fi
else
  echo "npm ci: übersprungen, node_modules aktuell"
fi

command -v ffmpeg >/dev/null 2>&1 || fehlt+=("ffmpeg")
command -v ffprobe >/dev/null 2>&1 || fehlt+=("ffprobe")

# Chromium für Playwright 1.56.1 ist Revision 1194; in Cloud-Sitzungen unter PLAYWRIGHT_BROWSERS_PATH.
browser_pfad="${PLAYWRIGHT_BROWSERS_PATH:-$HOME/.cache/ms-playwright}"
if ! ls -d "$browser_pfad"/chromium-1194 >/dev/null 2>&1; then
  fehlt+=("Chromium-Revision 1194 unter $browser_pfad (örtlich: npx playwright install chromium)")
fi

if command -v fc-list >/dev/null 2>&1; then
  fc-list | grep -qiE "arial|liberation sans" || fehlt+=("Schrift Arial oder Liberation Sans")
else
  fehlt+=("fc-list (Schriftprüfung nicht möglich)")
fi

if [ ${#fehlt[@]} -eq 0 ]; then
  echo "Werkstatt bereit: ffmpeg, ffprobe, Chromium 1194, Schrift vorhanden."
else
  echo "Werkstatt unvollständig, es fehlt:"
  for f in "${fehlt[@]}"; do echo "  - $f"; done
fi
exit 0
