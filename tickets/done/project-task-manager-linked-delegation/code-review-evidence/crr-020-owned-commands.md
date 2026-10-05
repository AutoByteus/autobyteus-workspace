# CRR-020 independent source-review checks

Working directory: /Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation

## owner-units
```bash
pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/claude tests/unit/runtime-management/claude tests/unit/agent-execution/agent-run.test.ts tests/unit/agent-execution/agent-run-manager.test.ts tests/unit/agent-execution/agent-run-resource-manager.test.ts tests/unit/agent-team-execution/inter-agent-message-router-claude-input-admission.test.ts tests/unit/agent-team-execution/flat-team-private-release-independence.test.ts --no-watch
```
Exit 0; log: /Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/code-review-evidence/crr-020-owner-units.log

## narrow-integration
```bash
pnpm -C autobyteus-server-ts exec vitest run tests/integration/agent-run-collaboration/native-root-fixture-cleanup.integration.test.ts tests/integration/agent-run-collaboration/native-compaction-root.integration.test.ts tests/integration/agent-run-collaboration/native-root-termination.integration.test.ts tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts --no-watch
```
Exit 0; log: /Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/code-review-evidence/crr-020-narrow-integration.log

## production-typecheck
```bash
pnpm -C autobyteus-server-ts exec tsc --noEmit -p tsconfig.build.json
```
Exit 0; log: /Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/code-review-evidence/crr-020-production-typecheck.log

## changed-tests-typecheck
```bash
pnpm -C autobyteus-server-ts exec tsc --noEmit -p ../tickets/in-progress/project-task-manager-linked-delegation/implementation-evidence/ir-010-tests-tsconfig.json
```
Exit 0; log: /Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/code-review-evidence/crr-020-changed-tests-typecheck.log

## diffcheck
```bash
git diff --check HEAD && git diff --cached --check
```
Exit 0; log: /Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/code-review-evidence/crr-020-diffcheck.log

Source inventory/hashes and baseline candidate comparisons are in crr-020-size-audit.json. No source/test/code/index/provider/desktop changes. These are bounded source-readiness checks, not API/E2E execution.

Additional read-only provenance check: hash every source and built output listed in implementation-evidence/ir-010-built-boundary-hashes.json against current bytes; all 2 source and 6 built entries matched (see crr-020-build-provenance-check.json). Existing app.asar intentionally is not a corrected candidate.

Preservation command (after canonical result): `python3 tickets/in-progress/project-task-manager-linked-delegation/code-review-evidence/crr-020-verify-preservation.py`; final exit0. Initial one-sided newline-normalization assertion was a verifier assumption, separately retained and corrected; reconstructed previous chronology was exactly139667 bytes. Extra read-only complete source audit: `git diff HEAD --numstat -- <each of136 paths>`; machine currentDeltaLatestBase fields and conservative maximum499 are retained in crr-020-size-audit.json. No source-size limits applied to tests/generated/fixtures.
