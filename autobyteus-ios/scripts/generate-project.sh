#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if ! command -v xcodegen >/dev/null 2>&1; then
  echo "xcodegen is required. Install with: brew install xcodegen" >&2
  exit 127
fi
export IOS_BUNDLE_ID="${IOS_BUNDLE_ID:-org.autobyteus.mobile}"
export IOS_SHARE_EXTENSION_BUNDLE_ID="${IOS_SHARE_EXTENSION_BUNDLE_ID:-org.autobyteus.mobile.share}"
cd "$ROOT_DIR"
xcodegen generate --spec project.yml
