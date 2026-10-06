# DR-001 Integrated Verification

2026-10-06; workspace `/Users/normy/autobyteus_org/autobyteus-worktrees/create-or-update-project-tool`; Medium/High Reviewed route unchanged.
Reviewed candidate a83642e6f (CRR-002/eee3ae0df plus dispatch receipt) was clean
apart from generated untracked SDK dist. `git fetch origin personal` refreshed
bootstrap 68261f8111e2f0eb119824c91a2650410c9aeffa to d9ffaa7cbf0b8907e002d9da1482d3a9aa5ae469; `git merge origin/personal` completed without
conflicts, creating db34a3f6684d8515c76debe6a3e08b494b26a40d. No checkpoint needed: all upstream work was
already committed and generated SDK output was not at risk. No backend/core
paths changed from a83642e6f to integrated HEAD; base adds already-delivered
run-settings renderer work. No push or final-target merge occurred.

| Command (repository root) | Result | Log |
| --- | --- | --- |
| `pnpm -C autobyteus-server-ts prebuild` initial | exit 0 | prebuild.log |
| `pnpm -C autobyteus-server-ts build` initial | exit 1; missing generated core module during concurrent shared-output build | build.log |
| `pnpm -C autobyteus-server-ts prebuild` sequential retry | exit 0 | prebuild-rerun.log |
| `pnpm -C autobyteus-server-ts build` sequential retry | exit 0; current compiler/assets/sanitized Manager bootstrap | build-rerun.log |
| `pnpm -C autobyteus-server-ts exec vitest run tests/unit/projects tests/unit/agent-tools/project-tasks tests/unit/built-in-agents/built-in-agent-bootstrapper.test.ts tests/unit/agent-tools/mcp/agent-tool-mcp-catalog.test.ts tests/architecture/projects-boundaries.test.ts tests/e2e/projects --no-watch` | exit 0; **15 files/195 tests, no skips**, 50.10s | integrated-regression.log |
| `git diff --check` after integration | exit 0 | tool output |

Initial smoke failure is retained, not represented as Pass. Process inspection
showed another same-worktree isolated desktop build rebuilding core/server;
shared-output interference is the evidence-supported explanation, not an
established product defect. Delivery waited until its shared compilation stages
had finished, then rebuilt sequentially and ran the full affected suite. No
source/test fix or assertion weakening. Final logs include actual saved IDs,
metadata/link reads and owned HTTP/two-node listener/process/data cleanup
receipts. Expected injected-fault stderr does not mean suite failure.

No user app/data, provider calls or desktop process was started/stopped by this
round. Separately produced manual-electron-preview artifacts/process were
observed and left untouched; they are not delivery-owned validation/approval or
cleanup receipts. Coordinator must confirm ownership/state before final cleanup.
SDK dist and ignored test/build output remain unstaged. Generic TS6059/rootDir
limitation remains known failed upstream; not rerun or claimed passed. No full
Manager Chat/@/desktop/model/delegation/history-replay certification; original
API scripting/representative-assignment/sentinel limits remain. Docs-only edits
followed the successful integrated check, so no executable behavior changed.
