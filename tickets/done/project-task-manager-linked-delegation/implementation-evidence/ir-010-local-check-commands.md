# IR-010 local implementation checks

Workdir `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation`. Root TESTING/AGENTS and server AGENTS applied. No closer guideline. Unit/narrow integration/typecheck/build only; no E2E, provider inference, app start or product acceptance. Counts overlap.

## regression-before
```bash
pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/claude/session/claude-input-terminal-release.test.ts --no-watch
```
Exit1: Original source: 3 failures, including exact unresolved-input assertion; one unhandled held-release rejection from diagnostic harness, subsequently caught. Not final candidate.
Evidence `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/implementation-evidence/ir-010-regression-before.log`.

## focused-first
```bash
pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/claude/session/claude-input-terminal-release.test.ts tests/unit/agent-execution/backends/claude/session/claude-session-cleanup.test.ts --no-watch
```
Exit0: 2 files / 4 tests; initial corrected candidate before adding three controls.
Evidence `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/implementation-evidence/ir-010-focused-first.log`.

## owner-units
```bash
pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/claude tests/unit/runtime-management/claude tests/unit/agent-execution/agent-run.test.ts tests/unit/agent-execution/agent-run-manager.test.ts tests/unit/agent-execution/agent-run-resource-manager.test.ts tests/unit/agent-team-execution/inter-agent-message-router-claude-input-admission.test.ts tests/unit/agent-team-execution/flat-team-private-release-independence.test.ts --no-watch
```
Exit0: 32 files / 316 tests; no skips/unhandled errors.
Evidence `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/implementation-evidence/ir-010-owner-units.log`.

## production-typecheck
```bash
pnpm -C autobyteus-server-ts exec tsc --noEmit -p tsconfig.build.json
```
Exit0: Current production compilation.
Evidence `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/implementation-evidence/ir-010-production-typecheck.log`.

## server-build
```bash
pnpm -C autobyteus-server-ts build
```
Exit0: Shared core/SDK prebuild, Prisma generation, full server compile/assets/sanitized built-module bootstrap. No desktop packaging.
Evidence `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/implementation-evidence/ir-010-server-build.log`.

## cumulative-unit
```bash
bash /Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/implementation-evidence/ir-010-cumulative-unit-command.sh
```
Exit0: 151 passed / 3 skipped files; 1504 passed / 5 skipped tests. AGY live opt-ins absent; skips are not Pass. Same selected cumulative owner set as IR009 plus new regression.
Evidence `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/implementation-evidence/ir-010-cumulative-unit.log`.

## test-typecheck
```bash
pnpm -C autobyteus-server-ts exec tsc --noEmit -p ../tickets/in-progress/project-task-manager-linked-delegation/implementation-evidence/ir-010-tests-tsconfig.json
```
Exit0: Narrow actual changed-test/helper/source typecheck. Initial ticket-config typeRoots error and test enum typing error retained separately and corrected.
Evidence `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/implementation-evidence/ir-010-test-typecheck.log`.

## narrow-integration-final
```bash
pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/claude/session/claude-input-terminal-release.test.ts tests/unit/agent-execution/backends/claude/session/claude-session-cleanup.test.ts tests/integration/agent-run-collaboration/native-root-fixture-cleanup.integration.test.ts tests/integration/agent-run-collaboration/native-compaction-root.integration.test.ts tests/integration/agent-run-collaboration/native-root-termination.integration.test.ts tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts --no-watch
```
Exit0: Final current test bytes: 6 files / 36 tests = 7 focused unit + 29 narrow Native/task integration. No unhandled errors.
Evidence `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/implementation-evidence/ir-010-narrow-integration-final.log`.

Initial fake SDK helper call omitted its required options object; `ir-010-initial-fixture-error.log` retained, caller corrected before actual pre-fix causal run. All diagnostics remain original; no prior failure erased.
