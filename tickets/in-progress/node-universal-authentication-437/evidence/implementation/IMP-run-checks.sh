#!/bin/bash
# Implementation-scoped checks for autobyteus-437, run one at a time (TESTING.md: one heavy run at a time).
# Each check writes evidence/implementation/IMP-xx-<name>.log with a header; ANSI colors are removed.
set -u
ROOT=/Users/normy/autobyteus_org/autobyteus-worktrees/node-universal-authentication-437
EVIDENCE="$ROOT/tickets/in-progress/node-universal-authentication-437/evidence/implementation"
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
    echo "# Commit: $COMMIT (branch codex/node-universal-authentication-437)"
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
  server)
    run_check IMP-01 server-typecheck-build shell pnpm -C $S exec tsc --noEmit -p tsconfig.build.json
    run_check IMP-02 server-typecheck-tests shell bash -c "pnpm -C $S exec tsc --noEmit -p tsconfig.tests.json | grep -c 'error TS'"
    run_check IMP-03 server-unit shell pnpm -C $S test:unit
    run_check IMP-04 server-integration shell pnpm -C $S test:integration
    ;;
  server-rerun)
    run_check IMP-01 server-typecheck-build shell pnpm -C $S exec tsc --noEmit -p tsconfig.build.json
    run_check IMP-02 server-typecheck-tests shell bash -c "pnpm -C $S exec tsc --noEmit -p tsconfig.tests.json | grep -c 'error TS'"
    run_check IMP-03b server-unit-hold-back-rerun shell pnpm -C $S exec vitest run tests/unit/memory-sync/memory-sync-hold-back.test.ts --no-watch
    run_check IMP-04 server-integration shell pnpm -C $S test:integration
    ;;
  e2e)
    run_check IMP-05 server-build shell pnpm -C $S build
    run_check IMP-06 server-e2e-node-access clean pnpm -C $S exec vitest run tests/e2e/node-access tests/e2e/remote-access tests/e2e/node-desktop tests/e2e/remote-collaboration/peer-host-refused.e2e.test.ts --no-watch
    run_check IMP-07 built-server-e2e clean pnpm -C $S exec vitest run tests/e2e/app-data-migrations tests/e2e/memory-sync tests/e2e/projects/projects-startup-migration.e2e.test.ts tests/e2e/projects/get-project-task-worker-scope.e2e.test.ts tests/e2e/run-history/standalone-unreadable-tree-containment.e2e.test.ts tests/e2e/runtime/runtime-switch-native-built-server.e2e.test.ts --no-watch
    run_check IMP-08 built-cli-setup-code shell bash /tmp/nac-check.sh
    ;;
  e2e-rerun)
    run_check IMP-05 server-build shell pnpm -C $S build
    run_check IMP-07 built-server-e2e clean pnpm -C $S exec vitest run tests/e2e/app-data-migrations tests/e2e/memory-sync tests/e2e/projects/projects-startup-migration.e2e.test.ts tests/e2e/projects/get-project-task-worker-scope.e2e.test.ts tests/e2e/run-history/standalone-unreadable-tree-containment.e2e.test.ts tests/e2e/runtime/runtime-switch-native-built-server.e2e.test.ts --no-watch
    ;;
  final)
    run_check IMP-17 architecture-node-access-boundaries shell pnpm -C $S exec vitest run tests/architecture/node-access-boundaries.test.ts --reporter=verbose --no-watch
    run_check IMP-18 server-unit-node-access shell pnpm -C $S exec vitest run tests/unit/node-access tests/unit/memory-sync --no-watch
    run_check IMP-19 web-nodes-specs shell pnpm -C $W exec cross-env NUXT_TEST=true vitest run components/settings/nodes
    run_check IMP-10 web-typecheck shell pnpm -C $W typecheck
    ;;
  two-server)
    local_dir="$EVIDENCE/remote-two-server"
    run_check IMP-09 two-server-remote-collaboration clean env RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND="$ROOT/$S/tests/fixtures/agy-failure-cli.mjs" REMOTE_E2E_EVIDENCE_DIR="$local_dir" pnpm -C $S exec vitest run tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts --no-watch
    ;;
  web)
    run_check IMP-10 web-typecheck shell pnpm -C $W typecheck
    run_check IMP-11 web-nuxt-tests shell pnpm -C $W exec cross-env NUXT_TEST=true vitest run
    run_check IMP-12 web-electron-tests shell pnpm -C $W exec vitest run --config ./electron/vitest.config.ts
    run_check IMP-13 web-guards shell bash -c "pnpm -C $W guard:web-boundary && pnpm -C $W guard:localization-boundary"
    ;;
  scripts)
    run_check IMP-14 launcher-tests shell python3 -m pytest -q scripts/tests/test_public_docker_launcher_shared_workspace.py scripts/tests/test_public_docker_launcher_stop.py scripts/tests/test_public_docker_launcher_update.py scripts/tests/test_server_docker_cli_latest_defaults.py scripts/tests/test_server_docker_cli_install_failures.py
    run_check IMP-15 dev-runtime-test shell node --test scripts/development/run-dev.test.mjs
    run_check IMP-16 source-size-guardrail shell python3 /tmp/size-check.py
    ;;
esac
cat "$SUMMARY"
