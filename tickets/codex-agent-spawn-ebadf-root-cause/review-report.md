# Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/requirements.md`
- Current Review Round: `19`
- Trigger: Round-21 implementation update applying Round-18 advisory improvements (`ADV-TERM-002`, `ADV-TABS-001`) after the user asked that the cleanup suggestions be implemented rather than left advisory-only.
- Prior Review Round Reviewed: `18`
- Latest Authoritative Round: `19`
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
| 19 | Round-21 implementation of advisory cleanup | `ADV-TERM-002`, `ADV-TABS-001` | `CR-013` | Fail | Yes | Production cleanup shape is mostly correct, but stale terminal unit tests still call removed `closeAllForWorkspace()`. |

## Review Scope

Fresh review was performed against the current source and cumulative artifact chain, not as a delta-only check. The Round-19 scope focused on the user-requested advisory implementation changes:

- Backend Terminal naming cleanup:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-server-ts/src/services/terminal-streaming/pty-session-manager.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-server-ts/src/services/terminal-streaming/terminal-handler.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-server-ts/tests/integration/terminal/terminal-websocket.integration.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-server-ts/tests/unit/services/terminal/pty-session-manager.test.ts`
- Right panel open-file auto-switch extraction:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-web/components/layout/RightSideTabs.vue`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-web/composables/useRightPanelOpenFileAutoSwitch.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-web/components/layout/__tests__/RightSideTabs.spec.ts`
- Evidence logs from Round 21 implementation and fresh reviewer checks.

## Prior Findings / Advisories Resolution Check

| Prior Item | Current Status | Evidence | Notes |
| --- | --- | --- | --- |
| `ADV-TERM-001` | Accepted conservatively | No backend architecture change; macOS `IsolatedPtySession` remains default on Darwin. | Correct posture: profile before redesigning descriptor-safe backend. |
| `ADV-TERM-002` | Partially implemented; blocked by `CR-013` | Production manager/handler now use `targetKey`, but unit tests still call removed `closeAllForWorkspace()`. | Needs local test cleanup before pass. |
| `ADV-TABS-001` | Implemented | `RightSideTabs.vue` no longer imports `useFileExplorerStore` or `useWorkspaceStore`; auto-switch logic moved to `useRightPanelOpenFileAutoSwitch()`. | Reviewer frontend tests pass. |
| `CR-009` | Still resolved | No old workspace-id Terminal route/prop shape found in focused grep. | No regression. |
| `CR-010` | Still resolved | Mobile tools mode still suppresses Files tab and does not reintroduce interactive mobile Terminal. | No regression in reviewed scope. |
| `E2E-TERMFD-001` / `E2E-TERMFD-002` / `CR-012` | Still resolved in reviewed source | Round-21 did not alter `IsolatedPtySession` descriptor ownership; integration/e2e evidence from implementation remains relevant. | No descriptor architecture change made. |

## Structural / Design Checks

| Check | Result | Evidence / Notes | Required Action |
| --- | --- | --- | --- |
| Terminal grouping terminology no longer implies initialized workspace ownership | Fail | Production code was renamed to `targetKey`, but repository-resident unit tests still call `closeAllForWorkspace()` and use stale test wording. | Fix `CR-013`. |
| Terminal runtime behavior remains cwd/root-path based | Pass | `TerminalHandler.connect()` delegates `targetKey` and `cwd`; no workspace/file-explorer acquisition path introduced. | None. |
| `RightSideTabs.vue` presentation shell no longer directly owns file-explorer store coordination | Pass | Direct file/workspace store imports were removed from `RightSideTabs.vue`; watcher lives in `useRightPanelOpenFileAutoSwitch()`. | None. |
| Open-file auto-switch behavior preserved | Pass | Reviewer frontend tests pass, including desktop auto-switch and mobile-tools no-switch behavior. | None. |
| No old workspace-id Terminal route/prop shape reintroduced | Pass | Focused grep found no old `/ws/terminal/:workspaceId` or `<Terminal ... workspace-id>` route/prop shape. | None. |
| Test quality/validation readiness | Fail | Backend unit test `tests/unit/services/terminal/pty-session-manager.test.ts` fails because it still invokes the removed API. | Fix and rerun relevant backend tests. |

## Review Scorecard

- Overall score: `7.7/10` (`77/100`)
- Review Decision: `Fail`

| Category | Score | Rationale |
| --- | --- | --- |
| Data-flow spine clarity | 8.8 | Production code improves naming clarity and preserves Terminal cwd/root-path spine. |
| Ownership clarity and boundary encapsulation | 8.5 | RightSideTabs extraction is a good local ownership cleanup; auto-switch concern has a clearer home. |
| API/interface clarity | 7.0 | Production API rename is clear, but stale unit tests still reference the removed method and obsolete naming. |
| Separation of concerns and file placement | 8.4 | New composable owns open-file auto-switch coordination without bloating RightSideTabs. |
| Validation readiness | 5.0 | A focused backend unit test fails; this blocks review pass. |
| Cleanup completeness | 6.0 | Cleanup missed `tests/unit/services/terminal/pty-session-manager.test.ts` and generated JS counterpart. |
| Runtime correctness risk | 8.0 | Runtime behavior appears unchanged; issue is stale durable tests, not product logic. |
| Naming quality | 7.2 | Source naming improved, but stale test names/API references undercut the cleanup. |

## Findings

### CR-013 — Stale Terminal unit tests still call removed `closeAllForWorkspace()`

- Severity: `Medium`
- Classification: `Local Fix`
- Owner: `implementation_engineer`
- Files:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-server-ts/tests/unit/services/terminal/pty-session-manager.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-server-ts/tests/unit/services/terminal/pty-session-manager.test.js`
- Evidence:
  - Reviewer command failed: `pnpm -C autobyteus-server-ts test tests/unit/services/terminal/pty-session-manager.test.ts`
  - Failure: `TypeError: manager.closeAllForWorkspace is not a function` at `tests/unit/services/terminal/pty-session-manager.test.ts:154`.
  - Grep also found the stale generated JS reference at `tests/unit/services/terminal/pty-session-manager.test.js:76`.
- Why this matters:
  - `ADV-TERM-002` was specifically about removing misleading workspace terminology from Terminal session grouping. Leaving the unit tests on the old API both breaks a focused test and keeps stale naming in durable repository validation.
- Required fix:
  - Rename the unit test case from workspace wording to target-key wording.
  - Replace `manager.closeAllForWorkspace("ws1")` with `manager.closeAllForTargetKey(...)` in the TypeScript test and any repository-resident JS counterpart that is kept in-tree.
  - Prefer test data names such as `target-1` / `target-2` or cwd-style target keys over `ws1` / `ws2` if the goal is naming cleanup.
  - Rerun at least:
    - `pnpm -C autobyteus-server-ts test tests/unit/services/terminal/pty-session-manager.test.ts tests/integration/terminal/terminal-websocket.integration.test.ts tests/e2e/terminal/terminal-websocket-lifecycle.e2e.test.ts`
    - focused grep for `closeAllForWorkspace` / stale Terminal target naming.

## Reviewer Checks Performed

- Frontend targeted advisory tests: Pass, 3 files / 17 tests.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/code-review-round19-terminal-advisory-frontend-tests-20260528.log`
- Backend Terminal unit test: Fail, 1 file / 10 tests, 1 failed.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/code-review-round19-terminal-advisory-backend-unit-20260528.log`
- Terminal advisory grep: Fail for stale test references; pass for RightSideTabs direct dependency extraction and old workspace-id Terminal route shape.
  - Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/code-review-round19-terminal-advisory-greps-20260528.log`

## Docs-Impact Verdict

- Docs impact: `No durable product-doc update required for the finding`.
- Ticket-local implementation/review artifacts should record the local fix when it returns.

## Classification

- Classification: `Local Fix`
- Recommended Recipient: `implementation_engineer`
- Rationale: The issue is a bounded stale test/update miss in implementation-owned Terminal test coverage after a local rename. No requirement gap or design impact was found.

## Latest Authoritative Result

- Review Decision: `Fail`
- Score Summary: `7.7/10` (`77/100`)
- Notes: Round-21 production cleanup is largely aligned with the advisory intent, but review cannot pass while a focused backend unit test still calls the removed `closeAllForWorkspace()` API. Delivery/API-E2E should remain paused until `CR-013` is fixed and re-reviewed.
