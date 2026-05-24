# Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/requirements.md`
- Current Review Round: `17`
- Trigger: Round-17 local fix for `CR-012` after Round-16 review found the new Darwin default `IsolatedPtySession` bypassed the existing node-pty spawn-helper executable-bit repair invariant.
- Prior Review Round Reviewed: `16`
- Latest Authoritative Round: `17`
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/investigation-notes.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/design-spec.md`
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/design-review-report.md`
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/implementation-handoff.md`
- Validation Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/api-e2e-validation-report.md`
- API / E2E Validation Started Yet: `Yes`
- Repository-Resident Durable Validation Added Or Updated After Prior Review: `Yes`

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
| 14 | User-prompted run GraphQL/API-layer durable integration coverage update | Prior stale-history durable-test risk | `CR-011` | Fail | No | Durable test still retained obsolete `historyIndexService` / `recordRunCreated` / `recordRunRestored` mock blocks. |
| 15 | CR-011 local fix | `CR-011` | None | Pass | No | Obsolete run-history index mocks removed; focused subset and reviewer greps passed. |
| 16 | Round-16 `E2E-TERMFD-002` implementation local fix | `E2E-TERMFD-002`, prior Terminal findings | `CR-012` | Fail | No | Descriptor isolation passed the built-backend churn probe, but isolated PTY startup bypassed existing spawn-helper repair. |
| 17 | Round-17 `CR-012` local fix | `CR-012`, `E2E-TERMFD-002` | None | Pass | Yes | Isolated PTY now reuses `ensureNodePtySpawnHelperExecutable()` before bridge spawn; unit/integration, server E2E, build, descriptor probe, and manual permission probe pass. |

## Review Scope

Fresh review was performed against the cumulative artifact chain and current source state, not as a delta-only check. The Round-17 scope focuses on the `CR-012` implementation local fix and the directly related Terminal descriptor lifecycle surfaces:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-ts/src/tools/terminal/isolated-pty-session.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-ts/src/tools/terminal/isolated-pty-bridge-source.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-ts/src/tools/terminal/node-pty-bootstrap.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-ts/tests/unit/tools/terminal/isolated-pty-session.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-ts/tests/integration/tools/terminal/isolated-pty-session.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-server-ts/tests/e2e/terminal/terminal-websocket-lifecycle.e2e.test.ts`
- Round-17 evidence logs and implementation handoff.

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | `CR-001` | High | Still resolved | File-explorer WebSocket lifecycle validation remains accepted; not touched by Round 17. | No change. |
| 1 | `CR-002` | Medium | Still resolved | Workspace metadata/file-explorer state split remains the accepted architecture; not touched by Round 17. | No change. |
| 1 | `CR-003` | Medium | Still resolved | Codex diagnostics path not touched by Round 17. | No change. |
| 4 | `CR-004` | Medium | Still resolved | Prior GraphQL file-operation durable assertions remain outside Round-17 changed files. | No change. |
| 6 | `CR-005` | Medium | Still resolved | Workspace selector/reference behavior was superseded by current `WorkspaceMetadata` / `WorkspaceFileExplorer` target. | No change. |
| 6 | `CR-006` | High | Still resolved | Team launch root-path activation/dedupe retained; not touched by Round 17. | No change. |
| 6 | `CR-007` | Medium | Still resolved | Canonical root-path case semantics retained; not touched by Round 17. | No change. |
| 7 | `CR-008` | Medium | Still resolved | Same-root team activation dedupe retained; not touched by Round 17. | No change. |
| 10 | `CR-009` | High | Still resolved | Terminal still uses `/ws/terminal/:sessionId?cwd=...`; current terminal route validates cwd directly and does not acquire workspace/file-explorer state. | Round 17 affects the low-level PTY backend only. |
| 10 | `CR-010` | High | Still resolved | Mobile latest-base reconciliation remains outside Round-17 changes. | No change. |
| 12 | `E2E-TERMFD-001` | High | Still resolved | Reviewer server Terminal E2E and descriptor churn probe pass with no retained sessions/children after early-close churn. | Round 17 preserves the close-before-connect cleanup path. |
| 14 | `CR-011` | Medium | Still resolved | Round-15 run-history grep/test cleanup remains outside Round-17 changes. | No change. |
| 16 | `CR-012` | High | Resolved | `IsolatedPtySession.start()` now calls `ensureNodePtySpawnHelperExecutable()` before bridge spawn and guards against close winning during bootstrap. Unit test verifies call order/no late spawn; integration and reviewer manual probe both verify a non-executable helper is repaired before isolated PTY startup. | Ready for API/E2E to resume. |
| API/E2E 9 | `E2E-TERMFD-002` | High | Implementation-review accepted, requires API/E2E validation | Reviewer built-backend descriptor/timing probe passes: baseline `36`, after 8 normal command-output sessions `32`, after early-close `32`, final `32`, final child count `0`, no `/dev/ptmx` or `(revoked)` lines. | API/E2E owns final broad validation. |

## Source File Size And Structure Audit (If Applicable)

Changed source implementation files only; unit/integration/API/E2E test files and ticket artifacts are excluded from the source-file hard limit.

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/tools/terminal/isolated-pty-session.ts` | 328 | Pass | Watch | Pass | Pass | N/A | None. |
| `autobyteus-ts/src/tools/terminal/isolated-pty-bridge-source.ts` | 89 | Pass | Pass | Pass | Pass | N/A | None. |
| `autobyteus-ts/src/tools/terminal/session-factory.ts` | 53 | Pass | Pass | Pass | Pass | N/A | None. |
| `autobyteus-ts/src/tools/terminal/index.ts` | 20 | Pass | Pass | Pass | Pass | N/A | None. |

## Structural / Design Checks

| Check | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | Requirements/design/root-cause cover Terminal normal-session descriptor cleanup (`REQ-049..053`, `DS-013`); Round 17 preserves that target. | None. |
| Data-flow spine inventory clarity and preservation under shared principles | Pass | Current spine is `Terminal WebSocket -> TerminalHandler -> PtySessionManager -> TerminalSession backend -> descriptor-clean close`; Round 17 additionally covers `IsolatedPtySession.start -> node-pty bootstrap repair -> bridge spawn`. | None. |
| Ownership boundary preservation and clarity | Pass | `IsolatedPtySession` now delegates node-pty helper readiness to `ensureNodePtySpawnHelperExecutable()` before it owns bridge startup. | None. |
| Off-spine concern clarity (off-spine concerns serve clear owners and stay off the main line) | Pass | `node-pty-bootstrap` remains the off-spine readiness owner for node-pty; bridge child source remains the descriptor-isolation adapter for `IsolatedPtySession`. | None. |
| Existing capability/subsystem reuse check (no fresh helper where an existing subsystem should own it) | Pass | The local fix reuses the existing bootstrap helper instead of duplicating repair logic. | None. |
| Reusable owned structures check (repeated structures extracted into the right owned file instead of copied across files) | Pass | Existing `TerminalSession` contract, factory selection, and bootstrap helper are reused. | None. |
| Shared-structure/data-model tightness check (no kitchen-sink base, no overlapping parallel shapes, specialization/composition used meaningfully) | Pass | `IsolatedPtySession` remains a specialized backend; no broad base/type looseness was introduced. | None. |
| Repeated coordination ownership check (shared policy has a clear owner instead of being repeated across callers) | Pass | Platform selection stays in `session-factory.ts`; node-pty helper repair stays in `node-pty-bootstrap.ts`; descriptor close stays in the selected session backend. | None. |
| Empty indirection check (no pass-through-only boundary) | Pass | The isolated session owns process isolation, IPC, queueing, startup repair sequencing, and close semantics. | None. |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | Round-17 code adds only bootstrap sequencing to the isolated backend and targeted tests. | None. |
| Ownership-driven dependency check (no forbidden shortcuts or unjustified cycles) | Pass | No mixed-level bypass remains; the new backend depends on the existing bootstrap owner for node-pty readiness. | None. |
| Authoritative Boundary Rule check (callers do not depend on both an outer owner and that owner's internal manager/repository/helper/lower-level concern) | Pass | The prior bypass is resolved by using the authoritative bootstrap helper before bridge spawn. | None. |
| File placement check (file/folder path matches owning concern or explicitly justified shared boundary) | Pass | New integration test lives under `autobyteus-ts/tests/integration/tools/terminal`, matching the low-level terminal runtime concern. | None. |
| Flat-vs-over-split layout judgment (layout is readable for the scope and not artificially fragmented) | Pass | No new source files were added for the local fix; the new integration test is justified by real filesystem/node_modules permission mutation. | None. |
| Interface/API/query/command/service-method boundary clarity (one subject, one responsibility, explicit identity shape) | Pass | No public API changes; Darwin backend selection and cwd-based server Terminal route remain clear. | None. |
| Naming quality and naming-to-responsibility alignment check (files, folders, APIs, types, functions, parameters, variables) | Pass | New tests and existing function names communicate the spawn-helper repair responsibility clearly. | None. |
| No unjustified duplication of code / repeated structures in changed scope | Pass | No duplicate chmod/repair implementation in production; tests exercise the shared helper path. | None. |
| Patch-on-patch complexity control | Pass | The fix is a small, targeted reuse of the existing bootstrap invariant plus a close-during-bootstrap guard. | None. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | No stale workspace-id terminal route, file-explorer materialization path, or obsolete run-history mock was reintroduced. | None. |
| Test quality is acceptable for the changed behavior | Pass | Unit tests verify bootstrap-before-spawn and close-during-bootstrap no-spawn behavior; integration and reviewer probes verify repair from `0644` helper state. | None. |
| Test maintainability is acceptable for the changed behavior | Pass | The permission-mutating integration test restores the original mode in `finally`; reviewer verified final helper mode was restored to `755`. | None. |
| Validation or delivery readiness for the next workflow stage | Pass | Ready for API/E2E to resume. | None. |
| No backward-compatibility mechanisms (no compatibility wrappers/dual-path behavior) | Pass | No fd-limit workaround or compatibility branch was used. | None. |
| No legacy code retention for old behavior | Pass | Direct Darwin `PtySession` is not retained as the default server path; fallback behavior remains only in the existing autobyteus-ts fallback manager where already designed. | None. |

## Review Scorecard (Mandatory)

- Overall score (`/10`): `9.4`
- Overall score (`/100`): `94/100`
- Score calculation note: simple average across the ten mandatory categories; the score does not override the pass decision.

| Priority | Category | Score (`1.0-10.0`) | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.5 | The Terminal descriptor lifecycle and isolated-backend startup/repair sub-spine are now explicit and validated. | API/E2E still needs final broad rerun. | API/E2E should rerun the full relevant matrix. |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.4 | The isolated backend now calls the existing bootstrap owner, preserving the authoritative node-pty readiness boundary. | `isolated-pty-session.ts` remains moderately large. | Keep future additions small or extract only if a real owner emerges. |
| `3` | `API / Interface / Query / Command Clarity` | 9.5 | No public API churn; root-path Terminal route and backend factory selection remain clear. | None blocking. | None. |
| `4` | `Separation of Concerns and File Placement` | 9.3 | Source and tests are in the correct terminal subsystem locations. | The bridge source remains string-evaluated, which is less transparent than a normal module. | Keep bridge source compact and tested. |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.5 | The fix reuses `ensureNodePtySpawnHelperExecutable()` instead of introducing duplicate repair logic. | None blocking. | None. |
| `6` | `Naming Quality and Local Readability` | 9.3 | Names align with terminal/PTY startup responsibilities and tests document the edge case. | Permission-mutating tests are inherently a little more complex. | Keep comments/names concrete if expanded. |
| `7` | `Validation Readiness` | 9.5 | Reviewer reran unit/integration, server E2E, build, descriptor probe, diff check, size audit, and manual permission probe successfully. | API/E2E remains the owner for final validation signoff. | Proceed to API/E2E. |
| `8` | `Runtime Correctness Under Edge Cases` | 9.4 | Close-before-bootstrap, non-executable helper startup, normal command-output close, early close, and abort-before-open are covered. | Real packaged Electron validation remains downstream. | API/E2E should include the macOS built-backend descriptor/timing probe. |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.6 | No fd-limit workaround, stale workspace-id route, or old default path retention was introduced. | None blocking. | None. |
| `10` | `Cleanup Completeness` | 9.3 | Descriptor cleanup and spawn-helper mode restoration are verified. | Generated evidence logs are numerous but expected for this ticket. | Delivery/API-E2E should manage artifact hygiene. |

## Findings

No new findings in Round 17.

### CR-012 — Resolved

- Previous severity: `High`
- Previous classification: `Local Fix`
- Current status: `Resolved`
- Evidence:
  - `IsolatedPtySession.start()` now calls `ensureNodePtySpawnHelperExecutable()` before spawning the isolated bridge child.
  - The post-bootstrap `this.closed` guard prevents close-before-connect/close-during-bootstrap from spawning a late bridge after cleanup wins.
  - Unit tests cover bootstrap-before-spawn call order and close-during-bootstrap no-spawn behavior.
  - Integration test temporarily removes execute bits from the installed node-pty `spawn-helper`, starts `IsolatedPtySession`, verifies repair plus real command output, and restores the original mode.
  - Reviewer manual permission probe also passes: forced helper `0644`, `IsolatedPtySession` start succeeds, and helper mode is restored to `755`.

## Test Quality And Validation-Readiness Verdict

| Area | Check | Result (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- |
| Validation Readiness | Ready for the next workflow stage (`API / E2E`) | Pass | Implementation review passes; API/E2E should resume. |
| Tests | Test quality is acceptable | Pass | Tests cover the exact `CR-012` regression plus existing Terminal E2E lifecycle behavior. |
| Tests | Test maintainability is acceptable | Pass | Permission-mutating test is isolated, restores original mode, and is under integration tests. |
| Tests | Review findings are clear enough for the next owner before API / E2E or delivery resumes | Pass | No open findings. |

Reviewer checks performed:

- `git diff --check HEAD^..HEAD`: Pass. Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/code-review-round17-diff-check-20260524.log`
- Source size audit: Pass. Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/code-review-round17-source-size-20260524.log`
- `pnpm -C autobyteus-ts exec vitest run tests/unit/tools/terminal/session-factory.test.ts tests/unit/tools/terminal/isolated-pty-session.test.ts tests/unit/tools/terminal/pty-session.test.ts tests/integration/tools/terminal/isolated-pty-session.test.ts`: Pass, 4 files / 27 tests. Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/code-review-round17-autobyteus-ts-terminal-unit-integration-20260524.log`
- `pnpm -C autobyteus-server-ts test tests/e2e/terminal/terminal-websocket-lifecycle.e2e.test.ts`: Pass, 1 file / 3 tests. Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/code-review-round17-server-terminal-e2e-20260524.log`
- `pnpm -C autobyteus-server-ts build:full`: Pass. Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/code-review-round17-backend-build-full-20260524.log`
- Reviewer built-backend macOS Terminal descriptor/timing probe: Pass. JSON: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/code-review-round17-terminal-server-connect-timing-v2-20260524.json`; run log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/code-review-round17-terminal-server-connect-timing-v2-20260524.run.log`; final `lsof`: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/code-review-round17-terminal-server-connect-timing-v2-20260524-final-lsof.log`.
  - Key samples: baseline after health `36` FDs; after 8 normal command-output sessions `32`; after 25 early-close cycles `32`; final after abort-before-open cycles `32`; final child count `0`; no `/dev/ptmx` or `(revoked)` lines in final `lsof`.
- Reviewer manual spawn-helper permission probe: Pass. Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/code-review-round17-isolated-pty-spawn-helper-permission-probe-20260524.log`.
- Final helper mode check after permission-mutating tests/probe: Pass, mode `755`. Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/code-review-round17-spawn-helper-mode-after-tests-20260524.log`.

## Legacy / Backward-Compatibility Verdict

| Check | Result (`Pass`/`Fail`) | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | The fix uses the existing startup invariant; no fd-limit or compatibility wrapper was added. |
| No legacy old-behavior retention in changed scope | Pass | The old direct Darwin `PtySession` default is not restored. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | No dead or obsolete terminal path introduced. |

## Dead / Obsolete / Legacy Items Requiring Removal (Mandatory If Any Exist)

| Item / Path | Type (`DeadCode`/`ObsoleteFile`/`LegacyBranch`/`CompatWrapper`/`UnusedHelper`/`UnusedTest`/`UnusedFlag`/`ObsoleteAdapter`/`DormantPath`) | Evidence | Why It Must Be Removed | Required Action |
| --- | --- | --- | --- | --- |
| None | N/A | No dead/obsolete source item found in Round-17 scope. | N/A | N/A |

## Docs-Impact Verdict

- Docs impact: `No` for durable product docs from this review pass.
- Why: Round 17 is a low-level terminal startup invariant repair plus tests. Ticket-local implementation/review artifacts were updated; user-facing docs do not need additional changes.
- Files or areas likely affected: ticket implementation handoff and review report only.

## Classification

- Classification: N/A because the latest review result is `Pass`.

## Recommended Recipient

- Recommended Recipient: `api_e2e_engineer`

Routing note: This is an implementation-review pass after a local implementation fix. API/E2E should resume and own the final executable validation signoff for the broader ticket.

## Residual Risks

- API/E2E still needs to rerun the relevant broad validation matrix, including the macOS built-backend Terminal descriptor/timing probe, before delivery resumes.
- The isolated bridge source remains string-evaluated JavaScript; keep future bridge changes small and covered.
- The new integration test mutates installed `node-pty` helper permissions but restores original mode in `finally`; reviewer independently verified the final mode is restored.

## Latest Authoritative Result

- Review Decision: `Pass`
- Score Summary: `9.4/10` (`94/100`). `CR-012` is resolved; no open code-review findings remain.
- Notes: Ready to route to `api_e2e_engineer` for API/E2E to resume.
