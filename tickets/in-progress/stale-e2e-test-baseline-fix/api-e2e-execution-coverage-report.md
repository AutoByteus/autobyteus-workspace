# API/E2E Execution and Coverage Report — stale-e2e-test-baseline-fix

- Round `API-001`. **Result: `Pass`.** Test-only baseline fixes (TESTING.md Rule 9); Small / Low; direct route; no product change and no release.
- Task `project_task_70a4e762-6aa2-4e87-88da-43b8cdd80900` (scope extended by the user). Request: `autobyteus-delivery-receipts/imported-team-defaults-edit/stale-e2e-test-fix-request.md`.
- Worktree `autobyteus-worktrees/stale-e2e-test-fix`, branch `codex/stale-e2e-baseline-fix`, base `origin/personal@50b7436229`.
- Commits (each a separate baseline fix, in order):
  - `3b2b59b9e9` `agent-package-private-skills` uses the current backend preparation API;
  - `0ca7fd16b1` `agent-team-definitions-graphql` rewritten to the flat Team/Org model;
  - the ticket artifacts and evidence commit that follows.
- Investigation, ledger and revision record: `api-e2e-coverage-investigation.md`, `api-e2e-test-case-ledger.md`, `api-e2e-revision-record.md`. Evidence: `evidence/`.

## Done condition (from the request)

| Condition | Result | Evidence |
| --- | --- | --- |
| Both files pass: `env -u AUTOBYTEUS_AGENT_PACKAGE_ROOTS -u AUTOBYTEUS_SKILLS_PATHS -u AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS pnpm -C autobyteus-server-ts exec vitest run <both files> --no-watch` | **10/10 pass, 3 runs** (before the fix: 7 of 10 failed) | `evidence/before-fix.log`, `after-fix-run{1,2}.log`, `done-command.log` |
| No other test regresses | Unit + architecture 698 files pass (4 skipped). Neighbor E2E folders `agent-definitions`, `agent-team-definitions`, `agent-org-runs`: all pass once the server is built (49/49 plus the Org-run files) | `unit-suite.log`, `neighbor-e2e.log`, `org-runs-built-e2e.log` |
| Committed separately as baseline test fixes | Yes: one commit per file, each labelled a baseline fix | `git log` |
| Merged and cleaned up through the normal route | Pending: handoff to the Delivery Engineer | — |

## What changed

1. **`agent-package-private-skills.e2e.test.ts`** (2 cases failed): the Codex probe passes an accepting `ProviderPreparationGuard` to `bootstrapForCreate` and leases the client with `beginAcquire` (`028cca2312`); the AutoByteus probe prepares through `beginPreparation({ kind: "new", … }).prepare()` because `createBackend` is private (`54eaac53a`). Assertions unchanged; all 4 cases pass.
2. **`agent-team-definitions-graphql.e2e.test.ts`** (5 of 6 failed since `37d05c7f71`): rewritten to the flat model, 6 cases:
   - TDG-001: Team CRUD with the revision on every update, default kept when omitted, invalid handoff refused with nothing written, default cleared, templates, delete;
   - TDG-002: team-local member round trip and swap;
   - TDG-003: the flat GraphQL contract (members have only name/ref/scope; update requires `expectedRevision`);
   - TDG-004: coordinator validation message;
   - TDG-005: a Team member naming a Team is refused;
   - TDG-006: an Org of an Agent and a Team: create, update with revision, stale conflict, delete.

   The two nested-Team cases were dropped with the removed feature. Registered-package saves stay covered by `registered-package-definition-edit.e2e.test.ts`; nothing there is duplicated.

## Test validity

Mutation checks with the sources reverted afterwards (`evidence/mutation-checks.log`):
- an omitted default launch config cleared instead of kept → TDG-001 fails;
- the coordinator-membership check skipped → TDG-004 fails;
- the Org service's own revision check skipped → the Org case still passes, because the package transaction independently rejects a stale revision. There are two guards; the case asserts the end result.

## Findings and notes

- **No product defect found.** One apparent regression (templates not listed) was a fixture problem: the strict team config format requires a `handoffs` key.
- **Environment note (not a defect):** `tests/e2e/agent-org-runs/*` run the built server (`TEST_SERVER_BUILD_REQUIRED` without `pnpm -C autobyteus-server-ts build`). On a fresh worktree they fail until it is built; they pass after.
- **Not touched:** the unpruned directory `autobyteus-worktrees/stale-e2e-baseline-fix` and branch `codex/stale-e2e-baseline-fix` came from the fresh team that briefly held this task. It is an orphan checkout whose git link is gone. I attached the suggested branch to a fresh directory, `stale-e2e-test-fix`. The Delivery Engineer should remove the orphan directory during cleanup if the user agrees; it is not mine.
- No source file changed; no secrets, user data or `~/.autobyteus` were used (in-process tests with temp data; a scripted AGY CLI for the delegation file).

## Confidence

| Category | Score | Basis |
| --- | --- | --- |
| Requirement coverage | 97% | Both files fixed and passing; the unique coverage of the old file is kept or replaced |
| Test validity | 94% | Mutation-checked; one lower-layer guard noted |
| Regression safety | 97% | Unit, architecture and neighboring E2E folders green |
| Realistic-system evidence | 95% | Real GraphQL schema and services over a real data dir; Org runs against the built server |
| **Overall** | **96% — Pass** | No category below 90% |
