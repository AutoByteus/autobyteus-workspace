#!/usr/bin/env bash
# API-16 (autobyteus-416, TESTING.md § Fresh-start build): the ticket changes `scripts/development/*` (a `scripts/**` build
# input), so the macOS ARM64 desktop release job is reproduced from nothing: a fresh clone of the commit under test, the
# job's frozen-lockfile install alone, then the job's build command and its two verify steps, from
# .github/workflows/release-desktop.yml. Signing, notarization and the other platforms need the runner (not tested).
# Usage: api-16-fresh-start-build.sh <worktree> <commit> <out dir>
set -uo pipefail
worktree="$1"; commit="$2"; out="$3"; mkdir -p "$out"
clone="$(cd "$(mktemp -d /tmp/api416-16-XXXX)" && pwd -P)/repo"
log="$out/API-16-fresh-start-build.log"
step() { echo; echo "== [$(date -u +%FT%TZ)] $*"; }
{
  echo "# API-16 fresh-start build; commit $commit; $(date -u +%FT%TZ); macOS $(sw_vers -productVersion) $(uname -m); node $(node -v); pnpm $(pnpm -v)"
  step "git clone --no-local $worktree $clone && checkout $commit"
  git clone --no-local --quiet "$worktree" "$clone" && git -C "$clone" checkout --quiet "$commit" && git -C "$clone" log -1 --format='%h %s'
  git -C "$clone" submodule update --init --recursive --quiet 2>&1 | tail -3
  step "untracked build outputs in the clone (must be none)"; git -C "$clone" status --porcelain --ignored | grep -E 'dist/|\.nuxt|resources/server' | head -5 || echo "(none)"
  cd "$clone"
  step "pnpm install --frozen-lockfile"; pnpm install --frozen-lockfile 2>&1 | tail -15; echo "install exit ${PIPESTATUS[0]}"
  step "cd autobyteus-web && pnpm build:electron:mac -- --arm64 (job env)"
  (cd autobyteus-web && NO_TIMESTAMP=1 AUTOBYTEUS_BUILD_FLAVOR=personal PRISMA_CLI_BINARY_TARGETS=darwin-arm64,debian-openssl-1.1.x,debian-openssl-3.0.x \
    CSC_IDENTITY_AUTO_DISCOVERY=false GITHUB_REPOSITORY=AutoByteus/autobyteus-workspace pnpm build:electron:mac -- --arm64) > "$out/API-16-build-full.log" 2>&1
  build=$?; tail -25 "$out/API-16-build-full.log"; echo "build exit $build"
  step "Verify bundled Prisma ARM64 engine target"
  ENGINES_DIR="$(find autobyteus-web/resources/server/node_modules -maxdepth 6 -type d -path '*/@prisma/engines' | head -n1)"
  test -n "$ENGINES_DIR" && test -f "$ENGINES_DIR/schema-engine-darwin-arm64" && echo "engines ok: $ENGINES_DIR" || echo "engines FAIL"
  CLIENT_DIR="$(find autobyteus-web/resources/server/node_modules -maxdepth 10 -type d -path '*/node_modules/.prisma/client' | head -n1)"
  test -n "$CLIENT_DIR" && test -f "$CLIENT_DIR/libquery_engine-darwin-arm64.dylib.node" && echo "client ok: $CLIENT_DIR" || echo "client FAIL"
  step "Verify packaged terminal runtime ARM64"
  node autobyteus-web/scripts/verify-packaged-terminal-runtime.mjs --server-root autobyteus-web/resources/server --platform darwin --arch arm64; echo "verify resources exit $?"
  APP_SERVER_ROOT="$(find autobyteus-web/electron-dist -path '*/AutoByteus.app/Contents/Resources/server' -type d -print -quit)"
  node autobyteus-web/scripts/verify-packaged-terminal-runtime.mjs --server-root "$APP_SERVER_ROOT" --platform darwin --arch arm64; echo "verify app exit $?"
  APP_BUNDLE="${APP_SERVER_ROOT%/Contents/Resources/server}"
  ELECTRON_RUN_AS_NODE=1 "$APP_BUNDLE/Contents/MacOS/AutoByteus" autobyteus-web/scripts/verify-packaged-terminal-runtime.mjs --server-root "$APP_SERVER_ROOT" --platform darwin --arch arm64 --spawn-probe; echo "spawn probe exit $?"
  step "artifacts"; ls autobyteus-web/electron-dist | head
} > "$log" 2>&1
cd /; rm -rf "$(dirname "$clone")"
echo "clone removed: $(dirname "$clone")" >> "$log"
grep -E "^== |exit [0-9]+|ok:|FAIL" "$log"
