#!/bin/bash
# ios-icon-compliance-594 API/E2E (temporary; copied from followup-cleanups-568): FS-DOCKER and FS-DESKTOP, Fresh-start builds of the other release jobs whose inputs
# this change touches (TESTING.md Fresh-start build). Each: a fresh clone of the commit (outside any symlinked folder), then the
# job's commands in the job's order.
#   docker   the server image's builder stage (`autobyteus-server-ts/docker/Dockerfile.monorepo` lines 31–47), on macOS
#   desktop  `build:electron:mac -- --arm64` with TESTING.md's variables, then the Desktop Release's verify steps
# Usage: fs-other.sh <docker|desktop> <worktree> <commit> <clone dir> <evidence dir>
set -uo pipefail
JOB=$1; WT=$2; COMMIT=$3; CLONE=$4; OUT=$5
LOG="$OUT/FS-$(echo "$JOB" | tr a-z A-Z).log"; : > "$LOG"
step() { local name=$1; shift; echo "## $(date -u +%FT%TZ) $name: $*" | tee -a "$LOG"; local t0=$SECONDS; "$@" >> "$LOG" 2>&1; local rc=$?; echo "## $name exit=$rc ($((SECONDS - t0)) s)" | tee -a "$LOG"; return $rc; }
echo "# FS-$JOB: commit $COMMIT; clone $CLONE; node $(node -v); pnpm $(pnpm -v); load $(uptime | sed 's/.*load averages: //')" | tee -a "$LOG"
rm -rf "$CLONE"
step clone git clone --no-local --quiet "$WT" "$CLONE" || exit 1
cd "$CLONE" || exit 1
step checkout git checkout --quiet "$COMMIT" || exit 1
echo "# fresh: $(ls -d autobyteus-web/dist autobyteus-web/dist-mobile autobyteus-server-ts/dist autobyteus-web/.nuxt 2>/dev/null | wc -l | tr -d ' ') prior build folders" | tee -a "$LOG"
if [ "$JOB" = docker ]; then
  export ELECTRON_SKIP_BINARY_DOWNLOAD=1
  step install pnpm install --frozen-lockfile || exit 1
  step presentation-contracts pnpm -C autobyteus-agent-presentation-contracts build || exit 1
  step collaboration-contracts pnpm -C autobyteus-collaboration-stream-contracts build || exit 1
  step team-contracts pnpm -C autobyteus-team-stream-contracts build || exit 1
  step prisma-generate pnpm -C autobyteus-server-ts exec prisma generate --schema prisma/schema.prisma || exit 1
  step server-build pnpm -C autobyteus-server-ts build || exit 1
  step mobile-web pnpm -C autobyteus-web build:mobile-web || exit 1
  echo "# dist-mobile/public: $(ls autobyteus-web/dist-mobile/public | head -5 | tr '\n' ' ')" | tee -a "$LOG"
else
  step install pnpm install --frozen-lockfile || exit 1
  cd autobyteus-web || exit 1
  step build-electron-mac env NO_TIMESTAMP=1 AUTOBYTEUS_BUILD_FLAVOR=personal PRISMA_CLI_BINARY_TARGETS=darwin-arm64,debian-openssl-1.1.x,debian-openssl-3.0.x \
    CSC_IDENTITY_AUTO_DISCOVERY=false GITHUB_REPOSITORY=AutoByteus/autobyteus-workspace pnpm build:electron:mac -- --arm64 || exit 1
  cd "$CLONE" || exit 1
  echo "# electron-dist: $(ls autobyteus-web/electron-dist 2>/dev/null | head -8 | tr '\n' ' ')" | tee -a "$LOG"
fi
echo "## FS-$JOB done" | tee -a "$LOG"
