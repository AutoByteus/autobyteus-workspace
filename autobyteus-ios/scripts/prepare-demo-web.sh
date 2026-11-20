#!/usr/bin/env bash
# The iOS app's built-in demo (autobyteus-279): copies the demo build of the phone screens
# (`pnpm --dir autobyteus-web build:mobile-web --demo` → autobyteus-web/dist-mobile-demo/public) into the app as DemoWeb/.
# `--build` builds it first, after the workspace packages autobyteus-web links to (it imports their dist/; DESIGN.md
# rule 12), so it works from a fresh `pnpm install`. The app's build fails while DemoWeb/ is missing (project.yml).
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SOURCE="$ROOT_DIR/autobyteus-web/dist-mobile-demo/public"
TARGET="$ROOT_DIR/autobyteus-ios/DemoWeb"
if [[ "${1:-}" == "--build" ]]; then
  pnpm --dir "$ROOT_DIR" --filter "{./autobyteus-web}^..." run build
  pnpm --dir "$ROOT_DIR/autobyteus-web" build:mobile-web --demo
fi
if [[ ! -f "$SOURCE/index.html" ]]; then
  echo "No demo build at $SOURCE. Run: pnpm --dir autobyteus-web build:mobile-web --demo (or this script with --build)." >&2
  exit 1
fi
rm -rf "$TARGET"
mkdir -p "$TARGET"
cp -R "$SOURCE/." "$TARGET/"
echo "Demo web content copied to $TARGET ($(du -sh "$TARGET" | cut -f1))."
