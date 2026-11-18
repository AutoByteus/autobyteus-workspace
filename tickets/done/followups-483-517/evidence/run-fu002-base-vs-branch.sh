#!/bin/bash
# AC-001 (autobyteus-517 FU-002): the seven listed test files at the base revision, then at the branch, one after the
# other under the same machine load. Base = the files as of origin/personal 24d438fa31 (product code differs only in
# the AGY monitor, which none of these files exercises). Usage: run-fu002-base-vs-branch.sh <worktree> <base sha> <log>
set -u
WT="$1"; BASE="$2"; LOG="$3"
FILES="tests/unit/agent-package-definitions/agent-package-folder-watcher.test.ts tests/unit/skill-update-notices/skill-folder-watcher.test.ts tests/integration/agent-package-definitions/package-auto-refresh.integration.test.ts tests/integration/file-explorer/file-system-watcher.integration.test.ts tests/integration/api/studio-server-http-contract.integration.test.ts tests/e2e/agent-definitions/agent-package-definitions-live-refresh.e2e.test.ts tests/e2e/runtime/grok-build-runtime-replay.e2e.test.ts"
load() { echo "load: $(uptime | sed 's/.*load averages*: //')"; echo "fseventsd CPU %: $(ps -Ao pcpu,comm | grep fseventsd | grep -v grep | awk '{print $1}' | head -1)"; }
run_side() {
  echo "## $1 ($(date -u +%FT%TZ))"
  load
  ( cd "$WT/autobyteus-server-ts" && env -u AUTOBYTEUS_AGENT_PACKAGE_ROOTS -u AUTOBYTEUS_SKILLS_PATHS -u AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS \
      pnpm exec vitest run $FILES --no-watch 2>&1 ) | sed 's/\x1b\[[0-9;]*m//g' \
    | grep -E "^ (✓|×|❯) tests|^ FAIL|Test timed out|Hook timed out|AssertionError|toBeLessThan|Tests  |Test Files  |Duration"
  load
}
{
  echo "# IMP-03 AC-001: base vs branch under the same machine load"
  echo "# commit: branch $(git -C "$WT" rev-parse --short HEAD), base files from $BASE; node $(node --version); macOS $(sw_vers -productVersion), $(sysctl -n hw.ncpu) cores"
  cd "$WT/autobyteus-server-ts"
  git checkout "$BASE" -- $FILES
  run_side "base"
  git checkout HEAD -- $FILES
  run_side "branch"
  git -C "$WT" status --short -- autobyteus-server-ts/tests
} > "$LOG" 2>&1
