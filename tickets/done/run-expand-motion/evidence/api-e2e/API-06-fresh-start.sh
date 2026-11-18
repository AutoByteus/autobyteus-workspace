#!/bin/bash
# Fresh-start build proof for autobyteus-390 at 85bf73750b: a fresh clone, the release job's install alone, then the
# macOS ARM64 job's build command (release-desktop.yml "Build Electron macOS ARM64"), without the signing secrets.
set -u
C=/tmp/rxm-390/clean-clone
echo "== header: fresh-start build proof; commit 85bf73750b; $(date -u +%FT%TZ); $(sw_vers -productVersion); node $(node -v); pnpm $(pnpm -v)"
rm -rf $C
git clone --quiet --no-local /Users/normy/autobyteus_org/autobyteus-worktrees/run-expand-motion $C && git -C $C checkout --quiet 85bf73750b037e54cd357ed12d6a26c75b1815c4 || exit 2
echo "== clone: $(git -C $C rev-parse --short HEAD); dist folders before install: $(find $C -maxdepth 2 -name dist -type d | wc -l)"
cd $C
H=$(cd "$(mktemp -d)" && pwd -P)
E="env -i PATH=$PATH HOME=$HOME TMPDIR=$TMPDIR LANG=en_US.UTF-8"
echo "== step 1: pnpm install --frozen-lockfile $(date -u +%T)"
$E pnpm install --frozen-lockfile > /tmp/rxm-390/fresh-install-r2.log 2>&1; s=$?; echo "install exit=$s"; tail -3 /tmp/rxm-390/fresh-install-r2.log
[ $s -eq 0 ] || exit 3
echo "== step 2: (autobyteus-web) pnpm build:electron:mac -- --arm64, NO_TIMESTAMP=1 AUTOBYTEUS_BUILD_FLAVOR=personal PRISMA_CLI_BINARY_TARGETS=darwin-arm64,debian-openssl-1.1.x,debian-openssl-3.0.x, no APPLE_* secrets, GITHUB_REPOSITORY as the runner sets it $(date -u +%T)"
cd autobyteus-web
$E NO_TIMESTAMP=1 AUTOBYTEUS_BUILD_FLAVOR=personal PRISMA_CLI_BINARY_TARGETS=darwin-arm64,debian-openssl-1.1.x,debian-openssl-3.0.x CSC_IDENTITY_AUTO_DISCOVERY=false GITHUB_REPOSITORY=AutoByteus/autobyteus-workspace pnpm build:electron:mac -- --arm64 > /tmp/rxm-390/fresh-build-r2.log 2>&1; s=$?
echo "build exit=$s $(date -u +%T)"; grep -n "\[typecheck\]\|production errors\|Passed\|error\|Error" /tmp/rxm-390/fresh-build-r2.log | grep -v "node_modules" | head -30
ls electron-dist 2>/dev/null | head
echo all-done
