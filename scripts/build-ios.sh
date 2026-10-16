#!/usr/bin/env bash
set -euo pipefail
# Usage: API_BASE_URL=https://api.example.com APP_API_KEY=... CONFIGURATION=Release scripts/build-ios.sh
CONFIGURATION="${CONFIGURATION:-Release}"; VERSION="${APP_VERSION:-1.0.0}"; BUILD="${BUILD_NUMBER:-1}"
cd "$(dirname "$0")/../ios"
command -v xcodegen >/dev/null || brew install xcodegen
xcodegen generate
ARGS=(MARKETING_VERSION="$VERSION" CURRENT_PROJECT_VERSION="$BUILD")
[ -n "${API_BASE_URL:-}" ] && ARGS+=(API_BASE_URL="$API_BASE_URL")
[ -n "${APP_API_KEY:-}" ] && ARGS+=(APP_API_KEY="$APP_API_KEY")
xcodebuild -project MagnetPlayer.xcodeproj -scheme MagnetPlayer -configuration "$CONFIGURATION" \
  -sdk iphoneos -destination 'generic/platform=iOS' -derivedDataPath ../build \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY="" "${ARGS[@]}" build

