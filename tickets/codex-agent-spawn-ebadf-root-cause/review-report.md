# Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/requirements.md`
- Current Review Round: `20`
- Trigger: CR-013 local fix for stale `PtySessionManager` target-key unit coverage after Round-19 review failed the Round-21 advisory implementation cleanup.
- Prior Review Round Reviewed: `19`
- Latest Authoritative Round: `20`
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/investigation-notes.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/design-spec.md`
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/design-review-report.md`
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/implementation-handoff.md`
- Validation Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/api-e2e-validation-report.md`
- API / E2E Validation Started Yet: `Yes`
- Repository-Resident Durable Validation Added Or Updated After Prior Review: `No`

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial implementation review for file-explorer watcher lifecycle refactor | N/A | `CR-001`, `CR-002`, `CR-003` | Fail | No | Required stream cleanup, open-folder refresh, and Codex diagnostics fixes. |
| 2 | Implementation local fixes for `CR-001..003` | `CR-001..003` | None | Pass | No | Routed to API/E2E. |
| 3 | API/E2E local fix for `E2E-FEWS-001` plus durable WebSocket validation | `E2E-FEWS-001` | None | Pass | No | Durable WebSocket lifecycle validation accepted. |
| 4 | Expanded workspace/file-explorer durable E2E audit | Prior durable validation | `CR-004` | Fail | No | File-operation GraphQL E2E accepted empty `changes`. |
| 5 | API/E2E local fix for `CR-004` | `CR-004` | None | Pass | No | Durable validation tightened. |
| 6 | Lazy workspace-reference/history/team-run activation implementation rework | Prior watcher/metadata findings | `CR-005`, `CR-006`, `CR-007` | Fail | No | Routed bounded implementation fixes. |
| 7 | Round-6 local fixes | `CR-005..007` | `CR-008` | Fail | No | Required same-root team activation dedupe. |
| 8 | Round-7 local fix | `CR-008` | None | Pass | No | Routed to API/E2E. |
| 9 | API/E2E round-5 durable validation additions | Prior lazy-workspace durable coverage | None | Pass | No | Routed to delivery. |
| 10 | WorkspaceMetadata / WorkspaceFileExplorer simplification rework | Prior architecture concerns | `CR-009`, `CR-010` | Fail | No | Terminal and mobile surfaces still depended on initialized workspace/materialized file-explorer paths. |
| 11 | Round-10 local fixes | `CR-009`, `CR-010` | None | Pass | No | Routed to API/E2E. |
| 12 | Terminal close-before-connect implementation local fix for `E2E-TERMFD-001` | `E2E-TERMFD-001`, `CR-009`, `CR-010` | None | Pass | No | Routed to API/E2E; downstream later passed and delivery resumed. |
| 13 | Latest-base delivery integration context | Round-12 residual delivery risks | None | Pass / context | No | Delivery merged latest `origin/personal`, resolved conflicts, and recorded integrated-state evidence. |
| 14 | User-prompted run GraphQL/API-layer durable integration coverage update | Prior stale-history durable-test risk | `CR-011` | Fail | No | Durable test still retained obsolete history-index mocks. |
| 15 | CR-011 local fix | `CR-011` | None | Pass | No | Obsolete run-history index mocks removed; focused subset and reviewer greps passed. |
| 16 | Round-16 `E2E-TERMFD-002` implementation local fix | `E2E-TERMFD-002`, prior Terminal findings | `CR-012` | Fail | No | Descriptor isolation passed churn probe, but isolated PTY startup bypassed spawn-helper repair. |
| 17 | Round-17 `CR-012` local fix | `CR-012`, `E2E-TERMFD-002` | None | Pass | No | Isolated PTY now reuses spawn-helper executable-bit repair; API/E2E later passed and delivery proceeded. |
| 18 | User-requested full Terminal FE→BE data-flow spine review after latest-base Round 20 integration | `CR-009`, `CR-010`, `E2E-TERMFD-001`, `E2E-TERMFD-002`, `CR-012` | None | Pass | No | Confirmed Terminal is cwd/root-path only and recorded non-blocking advisories. |
| 19 | Round-21 implementation of advisory cleanup | `ADV-TERM-002`, `ADV-TABS-001` | `CR-013` | Fail | No | Stale `PtySessionManager` unit tests still called removed `closeAllForWorkspace()`. |
| 20 | CR-013 local fix | `CR-013` | `CR-014` | Fail | Yes | CR-013 is fixed, but broader Terminal handler unit tests still use `ws1` as target-key fixture data after the target-key cleanup. |

## Review Scope

Fresh review was performed against the current source and cumulative artifact chain, not as a delta-only check. The Round-20 scope focused on the CR-013 local fix plus directly related Terminal target-key cleanup coverage:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-server-ts/tests/unit/services/terminal/pty-session-manager.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-server-ts/tests/unit/services/terminal/pty-session-manager.test.js`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-server-ts/tests/unit/services/terminal/terminal-handler.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-server-ts/tests/unit/services/terminal/terminal-handler.test.js`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-server-ts/src/services/terminal-streaming/pty-session-manager.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-server-ts/src/services/terminal-streaming/terminal-handler.ts`
- Round-22 implementation evidence logs and fresh reviewer logs.

## Prior Findings Resolution Check

| Prior Item | Current Status | Evidence | Notes |
| --- | --- | --- | --- |
| `CR-013` | Resolved | `pty-session-manager.test.ts` and kept `.js` counterpart now use `closeAllForTargetKey()`, `target-1`/`target-2`, and `closes sessions by target key`. Reviewer backend manager/integration/e2e command passes, 3 files / 17 tests. | Good local fix for the originally failing unit test. |
| `ADV-TERM-002` | Mostly implemented; residual `CR-014` remains | Production code and manager tests now use `targetKey`; `TerminalHandler` tests still use `ws1` target-key fixtures. | Residual test cleanup needed. |
| `ADV-TABS-001` | Still implemented | No source changes since Round 19; reviewer frontend tests passed in Round 19. | No regression. |
| `CR-009`, `CR-010`, `E2E-TERMFD-001`, `E2E-TERMFD-002`, `CR-012` | Still resolved in reviewed source | Terminal route remains cwd/root-path based; no IsolatedPtySession architecture change in this fix. | No regression. |

## Structural / Design Checks

| Check | Result | Evidence / Notes | Required Action |
| --- | --- | --- | --- |
| CR-013 exact API/test failure resolved | Pass | `closeAllForWorkspace()` no longer appears in `pty-session-manager` test/source scope; focused test command passes. | None. |
| Terminal manager target-key naming is complete across direct Terminal manager/handler tests | Fail | `terminal-handler.test.ts` / `.js` still pass `"ws1"` as the target-key argument and logs now print `for target ws1`. | Fix `CR-014`. |
| Terminal runtime behavior remains cwd/root-path based | Pass | No product-code regression found; handler/manager tests pass functionally. | None. |
| Validation readiness | Fail | Functionally passing tests still contain stale workspace-shaped target fixture names in adjacent Terminal unit coverage, leaving the advisory cleanup incomplete. | Fix `CR-014` and rerun focused tests/grep. |
| Design-impact classification | No design-impact finding | This is a bounded test cleanup issue, not a requirements/design gap. | Route to implementation engineer. |

## Review Scorecard

- Overall score: `8.4/10` (`84/100`)
- Review Decision: `Fail`

| Category | Score | Rationale |
| --- | --- | --- |
| Data-flow spine clarity | 9.0 | Runtime Terminal spine remains direct and cwd/root-path based. |
| Ownership clarity and boundary encapsulation | 8.6 | Production target-key rename is clear; stale handler test fixtures undermine documentation-by-test clarity. |
| API/interface clarity | 8.4 | Removed API is gone from manager tests; adjacent handler tests still use workspace-shaped fixture names for target keys. |
| Separation of concerns and file placement | 9.0 | No production concern split regression. |
| Validation readiness | 7.5 | Commands pass, but grep-based cleanup validation fails for stale target naming. |
| Cleanup completeness | 6.8 | CR-013 exact miss fixed; cleanup did not reach all directly related Terminal unit tests. |
| Runtime correctness risk | 9.0 | No product behavior failure found. |
| Naming quality | 7.8 | Naming is now mostly good, but `ws1` in handler tests should be updated to complete the intent. |

## Findings

### CR-013 — Resolved

- Previous severity: `Medium`
- Previous classification: `Local Fix`
- Current status: `Resolved`
- Evidence:
  - `autobyteus-server-ts/tests/unit/services/terminal/pty-session-manager.test.ts` and `.js` now use `closeAllForTargetKey()`.
  - Test wording now says `closes sessions by target key`.
  - Fixtures now use `target-1` / `target-2` instead of `ws1` / `ws2` in the manager tests.
  - Reviewer command passed: `pnpm -C autobyteus-server-ts test tests/unit/services/terminal/pty-session-manager.test.ts tests/integration/terminal/terminal-websocket.integration.test.ts tests/e2e/terminal/terminal-websocket-lifecycle.e2e.test.ts`.

### CR-014 — TerminalHandler unit tests still use workspace-shaped `ws1` target-key fixtures

- Severity: `Low`
- Classification: `Local Fix`
- Owner: `implementation_engineer`
- Files:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-server-ts/tests/unit/services/terminal/terminal-handler.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-server-ts/tests/unit/services/terminal/terminal-handler.test.js`
- Evidence:
  - Reviewer grep found `ws1` in direct Terminal handler unit tests:
    - `manager.createSession("s1", "ws1", "/tmp")`
    - `handler.connect(connection, "ws1", "s1", "/tmp")`
  - Reviewer `terminal-handler.test.ts` command passes functionally, but logs now show `Created terminal session s1 using backend MockPtySession for target ws1`, which preserves the misleading workspace-shaped fixture in target-key coverage.
- Why this matters:
  - The user asked to apply the architecture-review cleanup, and `ADV-TERM-002` was specifically about preventing future readers from thinking Terminal sessions are grouped by initialized workspace IDs.
  - The production rename is good, but adjacent durable unit tests still encode the old mental model in fixture names.
- Required fix:
  - Replace `ws1` target-key fixtures in `terminal-handler.test.ts` and the kept `.js` counterpart with target-key/cwd-key style names such as `target-1` or `/tmp`-like keys.
  - Rerun at least:
    - `pnpm -C autobyteus-server-ts test tests/unit/services/terminal/pty-session-manager.test.ts tests/unit/services/terminal/terminal-handler.test.ts tests/integration/terminal/terminal-websocket.integration.test.ts tests/e2e/terminal/terminal-websocket-lifecycle.e2e.test.ts`
    - focused grep for `closeAllForWorkspace`, `terminalTargetId`, `sessions by workspace`, `ws1`, and `ws2` across `autobyteus-server-ts/src/services/terminal-streaming` and `autobyteus-server-ts/tests/unit/services/terminal`.

## Reviewer Checks Performed

- CR-013 terminal manager/integration/e2e tests: Pass, 3 files / 17 tests.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/code-review-round20-cr013-terminal-manager-tests-20260528.log`
- Terminal handler unit test: Pass, 1 file / 9 tests.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/code-review-round20-terminal-handler-unit-20260528.log`
- CR-013/target-key grep: Fail due residual `ws1` in `terminal-handler.test.ts` and `.js`.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/code-review-round20-cr013-terminal-manager-grep-20260528.log`

## Docs-Impact Verdict

- Docs impact: `No product docs impact`.
- Ticket-local implementation/review artifacts should record the local fix when it returns.

## Classification

- Classification: `Local Fix`
- Recommended Recipient: `implementation_engineer`
- Rationale: The remaining issue is a bounded test-fixture naming cleanup in implementation-owned Terminal unit tests. No design-impact or requirement-gap finding was found.

## Latest Authoritative Result

- Review Decision: `Fail`
- Score Summary: `8.4/10` (`84/100`)
- Notes: `CR-013` itself is resolved, but the target-key terminology cleanup remains incomplete in adjacent `TerminalHandler` unit tests. Delivery/API-E2E should remain paused until `CR-014` is fixed and re-reviewed.
