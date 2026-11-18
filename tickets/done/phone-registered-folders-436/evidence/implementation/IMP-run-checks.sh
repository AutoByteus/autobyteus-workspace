#!/bin/bash
# Implementation-scoped checks for autobyteus-436, run one at a time (TESTING.md: one heavy run at a time).
# Each check writes evidence/implementation/IMP-xx-<name>.log with a header; ANSI colors are removed.
set -u
ROOT=/Users/normy/autobyteus_org/autobyteus-worktrees/phone-registered-folders-436
EVIDENCE="$ROOT/tickets/in-progress/phone-registered-folders-436/evidence/implementation"
mkdir -p "$EVIDENCE"
cd "$ROOT"
COMMIT=$(git rev-parse --short HEAD)
ENV_TEXT="macOS $(sw_vers -productVersion), node $(node --version), pnpm $(pnpm --version)"
SUMMARY="$EVIDENCE/IMP-summary.txt"
touch "$SUMMARY"

clean_home() {
  local h
  h=$(mktemp -d)
  cd "$h" && pwd -P
}

run_check() {
  local id="$1" name="$2" mode="$3"
  shift 3
  local file="$EVIDENCE/$id-$name.log"
  {
    echo "# $id $name"
    echo "# Command: $*"
    echo "# Environment mode: $mode"
    echo "# Commit: $COMMIT (branch codex/phone-registered-folders-436)"
    echo "# Environment: $ENV_TEXT"
    echo "# Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo
  } > "$file"
  local status
  if [ "$mode" = "clean" ]; then
    local h
    h=$(clean_home)
    env -i PATH="$PATH" HOME="$h" TMPDIR="$TMPDIR" "$@" 2>&1 | sed -E 's/\x1B\[[0-9;]*[A-Za-z]//g' >> "$file"
    status=${PIPESTATUS[0]}
  else
    "$@" 2>&1 | sed -E 's/\x1B\[[0-9;]*[A-Za-z]//g' >> "$file"
    status=${PIPESTATUS[0]}
  fi
  echo "# Exit status: $status" >> "$file"
  echo "$id $name exit=$status" >> "$SUMMARY"
}

S=autobyteus-server-ts
W=autobyteus-web

case "${1:-all}" in
  all)
    run_check IMP-01 server-typecheck-build shell pnpm -C $S exec tsc --noEmit -p tsconfig.build.json
    run_check IMP-02 server-typecheck-tests shell bash -c "pnpm -C $S exec tsc --noEmit -p tsconfig.tests.json | grep 'error TS' | sort > /tmp/436-tsc-tests.txt; wc -l < /tmp/436-tsc-tests.txt; grep -E 'node-files|node-route-permissions' /tmp/436-tsc-tests.txt || true"
    run_check IMP-03 server-unit shell pnpm -C $S test:unit
    run_check IMP-04a integration-prepare shell pnpm -C $S test:integration:prepare
    run_check IMP-04 server-integration shell pnpm -C $S test:integration
    run_check IMP-05 server-e2e-node-files-access clean pnpm -C $S exec vitest run tests/e2e/node-files tests/e2e/node-access tests/e2e/remote-access tests/e2e/workspaces --no-watch
    run_check IMP-06 web-typecheck shell pnpm -C $W typecheck
    run_check IMP-07 web-nuxt-tests shell pnpm -C $W exec cross-env NUXT_TEST=true vitest run
    run_check IMP-08 web-guards shell bash -c "pnpm -C $W guard:web-boundary && pnpm -C $W guard:localization-boundary"
    ;;
esac
cat "$SUMMARY"
