#!/bin/bash
# DR-001 AC-016: clean clone of the integrated ticket branch (tree = the finalize merge tree)
set -u
SUPER=/Users/normy/autobyteus_org/autobyteus-workspace-superrepo
C=/tmp/dr253/clone
LOG=/tmp/dr253/DR-01-ac016-clean-clone.txt
rm -rf "$C"
exec > "$LOG" 2>&1
echo "DR-01 — AC-016 on a clean clone (not a worktree) of the integrated ticket branch"
git clone -q --branch codex/test-and-tooling-hygiene "$SUPER" "$C"
cd "$C"
echo "clone HEAD $(git rev-parse --short=10 HEAD); tree $(git rev-parse HEAD^{tree}); git status lines: $(git status --short | wc -l | tr -d ' '); start $(date '+%F %T')"
echo "node $(node -v); pnpm $(pnpm -v); load: $(uptime | sed 's/.*load/load/')"
step() { local name="$1"; shift; echo "== $name: $*"; local s=$(date +%s); "$@" > "/tmp/dr253/$name.log" 2>&1; local rc=$?; echo "$name rc=$rc $(( $(date +%s)-s ))s"; grep -E '^\s*(Test Files|Tests)\s' "/tmp/dr253/$name.log" | tail -2; grep -E '^# (tests|pass|fail)' "/tmp/dr253/$name.log"; [ $rc -ne 0 ] && tail -40 "/tmp/dr253/$name.log"; return 0; }
step install pnpm install --frozen-lockfile
echo "type-graphql in node_modules/.pnpm: $(ls node_modules/.pnpm | grep '^type-graphql@' | tr '\n' ' ')"
step prebuild pnpm -C autobyteus-server-ts prebuild
step nuxtprepare pnpm -C autobyteus-web exec nuxt prepare
step integprepare pnpm -C autobyteus-server-ts test:integration:prepare
step typecheck pnpm -C autobyteus-server-ts typecheck
step unit pnpm -C autobyteus-server-ts test:unit
step architecture pnpm -C autobyteus-server-ts exec vitest run tests/architecture/application-framework-boundaries.test.ts --no-watch
step integration pnpm -C autobyteus-server-ts test:integration
step nuxt pnpm -C autobyteus-web test:nuxt --run
step electron pnpm -C autobyteus-web test:electron --run
step guardweb pnpm -C autobyteus-web guard:web-boundary
step guardloc pnpm -C autobyteus-web guard:localization-boundary
step auditloc pnpm -C autobyteus-web audit:localization-literals
step nodetest bash -c 'node --test autobyteus-web/scripts/electron-e2e/__tests__/*.node-test.mjs'
H="$(cd "$(mktemp -d)" && pwd -P)"
step e2e_liverefresh env -i PATH="$PATH" HOME="$H" TMPDIR="$TMPDIR" pnpm -C autobyteus-server-ts exec vitest run tests/e2e/agent-definitions/agent-package-definitions-live-refresh.e2e.test.ts --no-watch
step e2e_updnotif env -i PATH="$PATH" HOME="$H" TMPDIR="$TMPDIR" pnpm -C autobyteus-server-ts exec vitest run tests/e2e/update-notifications --no-watch
step lmstudio_closed env -i PATH="$PATH" HOME="$H" TMPDIR="$TMPDIR" LMSTUDIO_HOSTS=http://127.0.0.1:9 pnpm -C autobyteus-ts exec vitest run tests/integration/llm/api/lmstudio-llm.test.ts
rm -rf "$H"
echo "git status lines after run (tracked changes): $(git status --short --untracked-files=no | wc -l | tr -d ' ')"
echo "done $(date '+%F %T')"
