#!/usr/bin/env bash
set -euo pipefail
CONFIGURATION="${CONFIGURATION:-Release}"; ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/build/Build/Products/${CONFIGURATION}-iphoneos/MagnetPlayer.app"
OUT="$ROOT/dist"; rm -rf "$OUT"; mkdir -p "$OUT/Payload"
[ -d "$APP" ] || { echo "App not found: $APP"; exit 1; }
cp -R "$APP" "$OUT/Payload/"
(cd "$OUT" && zip -qry MagnetPlayer-unsigned.ipa Payload && rm -rf Payload)
# Validate
unzip -l "$OUT/MagnetPlayer-unsigned.ipa" | grep -q "Payload/MagnetPlayer.app/Info.plist" || { echo "Invalid IPA"; exit 1; }
unzip -l "$OUT/MagnetPlayer-unsigned.ipa" | grep -q "Payload/MagnetPlayer.app/MagnetPlayer$" || { echo "Missing executable"; exit 1; }
echo "IPA OK: $OUT/MagnetPlayer-unsigned.ipa ($(du -h "$OUT/MagnetPlayer-unsigned.ipa" | cut -f1))"

