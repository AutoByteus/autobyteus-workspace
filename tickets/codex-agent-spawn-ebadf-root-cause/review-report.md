# Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/requirements.md`
- Current Review Round: `16`
- Trigger: Round-16 implementation local fix for API/E2E Round 9 `E2E-TERMFD-002` after Architecture Review round 8 approved the Terminal normal-session descriptor lifecycle design-impact rework.
- Prior Review Round Reviewed: `15`
- Latest Authoritative Round: `16`
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
| 16 | Round-16 `E2E-TERMFD-002` implementation local fix | `E2E-TERMFD-002`, prior Terminal findings | `CR-012` | Fail | Yes | Descriptor isolation passes the built-backend churn probe, but the new Darwin default `IsolatedPtySession` bypasses the existing node-pty spawn-helper executable-bit repair invariant. |

## Review Scope

Fresh review was performed against the cumulative artifact chain and current source state, not as a delta-only check. The latest round received extra scrutiny on the Round-16 Terminal descriptor fix and its direct integration into the already-reviewed workspace metadata / file-explorer separation:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-ts/src/tools/terminal/isolated-pty-session.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-ts/src/tools/terminal/isolated-pty-bridge-source.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-ts/src/tools/terminal/session-factory.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-ts/src/tools/terminal/index.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-ts/src/tools/terminal/pty-session.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-ts/src/tools/terminal/node-pty-bootstrap.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-server-ts/src/api/websocket/terminal.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-server-ts/src/services/terminal-streaming/terminal-handler.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-server-ts/src/services/terminal-streaming/pty-session-manager.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-server-ts/tests/e2e/terminal/terminal-websocket-lifecycle.e2e.test.ts`
- new/updated Round-16 tests and evidence logs listed in the handoff.

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | `CR-001` | High | Still resolved | File-explorer WebSocket lifecycle validation remains accepted; not touched by Round 16. | No change. |
| 1 | `CR-002` | Medium | Still resolved | Workspace metadata/file-explorer state split remains the accepted architecture; not touched by Round 16. | No change. |
| 1 | `CR-003` | Medium | Still resolved | Codex diagnostics path not touched by Round 16. | No change. |
| 4 | `CR-004` | Medium | Still resolved | Prior GraphQL file-operation durable assertions remain outside Round-16 changed files. | No change. |
| 6 | `CR-005` | Medium | Still resolved | Workspace selector/reference behavior was superseded by current `WorkspaceMetadata` / `WorkspaceFileExplorer` target. | No change. |
| 6 | `CR-006` | High | Still resolved | Team launch root-path activation/dedupe retained; not touched by Round 16. | No change. |
| 6 | `CR-007` | Medium | Still resolved | Canonical root-path case semantics retained; not touched by Round 16. | No change. |
| 7 | `CR-008` | Medium | Still resolved | Same-root team activation dedupe retained; not touched by Round 16. | No change. |
| 10 | `CR-009` | High | Still resolved | Terminal still uses `/ws/terminal/:sessionId?cwd=...`; current terminal route validates cwd directly and does not acquire workspace/file-explorer state. | Round 16 affects the low-level PTY backend only. |
| 10 | `CR-010` | High | Still resolved | Mobile latest-base reconciliation remains outside Round-16 changes. | No change. |
| 12 | `E2E-TERMFD-001` | High | Still resolved | Reviewer server Terminal E2E and descriptor churn probe pass with no retained sessions/children after early-close churn. | Round 16 preserves the close-before-connect cleanup path. |
| 14 | `CR-011` | Medium | Still resolved | Round-15 run-history grep/test cleanup remains outside Round-16 changes. | No change. |
| API/E2E 9 | `E2E-TERMFD-002` | High | Descriptor symptom resolved, review not passable | Reviewer built-backend descriptor/timing probe passes: baseline `36`, after 8 normal command-output sessions `32`, final `32`, final child count `0`, no `/dev/ptmx` or `(revoked)` lines. However `CR-012` shows the new Darwin default backend regresses an existing node-pty startup repair invariant. | Needs bounded implementation local fix before API/E2E resumes. |

## Source File Size And Structure Audit (If Applicable)

Changed source implementation files only; unit/integration/API/E2E test files and ticket artifacts are excluded from the source-file hard limit.

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/tools/terminal/index.ts` | 20 | Pass | Pass | Pass | Pass | N/A | None. |
| `autobyteus-ts/src/tools/terminal/session-factory.ts` | 53 | Pass | Pass | Pass | Pass | N/A | None. |
| `autobyteus-ts/src/tools/terminal/isolated-pty-bridge-source.ts` | 89 | Pass | Pass | Pass | Pass | N/A | None. |
| `autobyteus-ts/src/tools/terminal/isolated-pty-session.ts` | 322 | Pass | Watch | Mostly pass, but incomplete existing bootstrap invariant reuse | Pass | `Local Fix` | Add/reuse the existing node-pty spawn-helper executable-bit repair before starting the isolated bridge. |

## Structural / Design Checks

| Check | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | Requirements/design/root-cause now explicitly cover Terminal normal-session descriptor cleanup (`REQ-049..053`, `DS-013`). | None. |
| Data-flow spine inventory clarity and preservation under shared principles | Pass | Current spine is `Terminal WebSocket -> TerminalHandler -> PtySessionManager -> TerminalSession backend -> descriptor-clean close`; implementation maps to those layers. | None. |
| Ownership boundary preservation and clarity | Fail | `IsolatedPtySession` owns the new Darwin low-level backend but does not call the existing `node-pty-bootstrap` repair that previously protected the default macOS PTY startup path. | Fix `CR-012`. |
| Off-spine concern clarity (off-spine concerns serve clear owners and stay off the main line) | Pass | Bridge child source is an off-spine low-level adapter serving `IsolatedPtySession`. | None. |
| Existing capability/subsystem reuse check (no fresh helper where an existing subsystem should own it) | Fail | Existing `ensureNodePtySpawnHelperExecutable()` is the owned capability for node-pty helper permission repair; the new node-pty bridge path bypasses it. | Fix `CR-012`. |
| Reusable owned structures check (repeated structures extracted into the right owned file instead of copied across files) | Pass | The new backend reuses `TerminalSession` interface and `TerminalSessionFactory` selection instead of introducing a parallel server-only contract. | None. |
| Shared-structure/data-model tightness check (no kitchen-sink base, no overlapping parallel shapes, specialization/composition used meaningfully) | Pass | `IsolatedPtySession` is a specialized backend, not a broadened base type. | None. |
| Repeated coordination ownership check (shared policy has a clear owner instead of being repeated across callers) | Pass | Platform backend selection is centralized in `session-factory.ts`; server Terminal manager receives one factory. | None. |
| Empty indirection check (no pass-through-only boundary) | Pass | The isolated session owns process isolation, IPC, queueing, and close semantics; it is not just a pass-through wrapper. | None. |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | Parent session lifecycle and child bridge code are split into separate files under `tools/terminal`. | None. |
| Ownership-driven dependency check (no forbidden shortcuts or unjustified cycles) | Fail | The new backend depends on node-pty indirectly through the bridge while skipping the existing bootstrap owner for node-pty runtime readiness. | Fix `CR-012`. |
| Authoritative Boundary Rule check (callers do not depend on both an outer owner and that owner's internal manager/repository/helper/lower-level concern) | Fail | The node-pty startup boundary already has an authoritative helper executable-bit repair owner; replacing the Darwin default backend without invoking it bypasses that invariant. | Fix `CR-012`. |
| File placement check (file/folder path matches owning concern or explicitly justified shared boundary) | Pass | New files live in `autobyteus-ts/src/tools/terminal`, the correct low-level terminal backend area. | None. |
| Flat-vs-over-split layout judgment (layout is readable for the scope and not artificially fragmented) | Pass | Two new files are justified: parent session backend and child bridge source. | None. |
| Interface/API/query/command/service-method boundary clarity (one subject, one responsibility, explicit identity shape) | Pass | `getDefaultSessionFactory()` makes Darwin selection explicit; server route API remains cwd-based. | None. |
| Naming quality and naming-to-responsibility alignment check (files, folders, APIs, types, functions, parameters, variables) | Pass | `IsolatedPtySession` and `isolated-pty-bridge-source` accurately describe the descriptor-isolation mechanism. | None. |
| No unjustified duplication of code / repeated structures in changed scope | Pass | Close/read queue patterns are similar to `PtySession` but adapted to child-process isolation; no blocking duplication found. | None. |
| Patch-on-patch complexity control | Pass | The approach cleanly selects a Darwin backend rather than patching fd limits or adding route-level hacks. | None. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | No stale workspace-id terminal route or file-explorer materialization path reintroduced. | None. |
| Test quality is acceptable for the changed behavior | Fail | Existing tests pass, but they only exercise the already-repaired helper state. They miss the known macOS `spawn-helper` non-executable baseline that `PtySession` already handles. | Add regression coverage for `CR-012`. |
| Test maintainability is acceptable for the changed behavior | Pass | New unit tests are focused and readable; they need one additional startup-repair case. | Add one missing case. |
| Validation or delivery readiness for the next workflow stage | Fail | Descriptor churn passes, but the new default Darwin backend can fail to start from a known local/package state. | Return to implementation. |
| No backward-compatibility mechanisms (no compatibility wrappers/dual-path behavior) | Pass | No fd-limit workaround or compatibility branch was used. | None. |
| No legacy code retention for old behavior | Pass | Old direct Darwin `PtySession` default is not retained as the server steady-state default. | None. |

## Review Scorecard (Mandatory)

- Overall score (`/10`): `8.4`
- Overall score (`/100`): `84/100`
- Score calculation note: simple average across the ten mandatory categories; the score does not override the fail decision.

| Priority | Category | Score (`1.0-10.0`) | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.1 | Terminal lifecycle spine is now well-stretched from WebSocket open through backend selection and descriptor-close evidence. | The new startup/bootstrap sub-spine is not represented in tests for the isolated backend. | Add the node-pty helper repair startup case to the same low-level spine. |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 7.8 | Descriptor isolation ownership is mostly clear, but the isolated backend skips an existing owner of node-pty readiness. | `IsolatedPtySession` bypasses `node-pty-bootstrap`. | Reuse `ensureNodePtySpawnHelperExecutable()` before bridge startup. |
| `3` | `API / Interface / Query / Command Clarity` | 9.2 | Public Terminal WebSocket and factory interfaces remain clear and cwd-based. | No API issue; weakness is backend startup invariant. | None beyond CR-012. |
| `4` | `Separation of Concerns and File Placement` | 9.0 | Parent/bridge split is appropriate and files are in the terminal subsystem. | `isolated-pty-session.ts` is 322 effective lines, acceptable but worth watching. | Keep any new repair/test logic focused; avoid broadening the file. |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 8.0 | The backend uses the existing `TerminalSession` contract and factory structures. | It failed to reuse the existing bootstrap helper structure. | Call the helper instead of duplicating/omitting bootstrap behavior. |
| `6` | `Naming Quality and Local Readability` | 9.0 | Names match responsibilities and the bridge source is understandable. | The bridge-as-string pattern is inherently less readable than normal module execution. | Keep bridge source small and covered by tests. |
| `7` | `Validation Readiness` | 7.7 | Unit, server E2E, build, and descriptor probe pass. | Missing regression coverage for known `spawn-helper` permission failure; reviewer probe failed. | Add startup-repair coverage and rerun checks. |
| `8` | `Runtime Correctness Under Edge Cases` | 7.4 | Normal descriptor cleanup and early-close churn look good. | Known node-pty `spawn-helper` permission edge case regresses on the new default Darwin backend. | Fix `CR-012`. |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.6 | No fd-limit or session-count-only workaround is retained. | None blocking. | None. |
| `10` | `Cleanup Completeness` | 8.3 | Descriptor cleanup is strong in the repaired-helper runtime and final `lsof` is clean. | Startup cleanup/readiness is incomplete for unrepaired helper state. | Include bootstrap repair and test it. |

## Findings

### CR-012 — `IsolatedPtySession` bypasses existing node-pty spawn-helper executable-bit repair

- Severity: `High`
- Classification: `Local Fix`
- Recommended owner: `implementation_engineer`
- Path(s):
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-ts/src/tools/terminal/isolated-pty-session.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-ts/src/tools/terminal/node-pty-bootstrap.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-ts/tests/unit/tools/terminal/isolated-pty-session.test.ts`
- Evidence:
  - Current `PtySession.start()` calls `ensureNodePtySpawnHelperExecutable()` before importing/starting `node-pty`.
  - New `IsolatedPtySession.start()` spawns the bridge child directly and the bridge imports/starts `node-pty` without first invoking that existing repair owner.
  - Reviewer forced the installed macOS `node-pty` `spawn-helper` to mode `0644`, then attempted to start `IsolatedPtySession`; startup failed with `Error: posix_spawnp failed.` The probe restored the helper to `0755` afterward.
  - Reviewer evidence log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/code-review-round16-isolated-pty-spawn-helper-permission-probe-20260524.log`.
- Why this matters:
  - The repository already treats macOS `node-pty` `spawn-helper` execute permission as a real runtime/package invariant, with install-time and runtime repair.
  - Round 16 makes `IsolatedPtySession` the default Darwin backend. That replacement must preserve the old default backend's startup robustness, not only its descriptor cleanup.
  - The server-side `PtySessionManager` uses `getDefaultSessionFactory()` directly and does not apply the `autobyteus-ts` fallback manager, so an isolated-backend startup failure can make backend Terminal unusable on Darwin in this known bad helper state.
- Required action:
  1. Reuse the existing node-pty bootstrap owner for the isolated path, preferably by calling `ensureNodePtySpawnHelperExecutable()` in `IsolatedPtySession.start()` before spawning the bridge child. If the repair must run inside the child instead, keep the responsibility explicit and reuse the same helper logic rather than duplicating it ad hoc.
  2. Add regression coverage that forces/resets `spawn-helper` to a non-executable mode and proves `IsolatedPtySession` or the server Terminal start path repairs and starts successfully, restoring the original mode afterward.
  3. Rerun the Round-16 terminal unit tests, backend Terminal E2E, backend build, descriptor/timing probe, source size audit, and source/doc diff check.

## Test Quality And Validation-Readiness Verdict

| Area | Check | Result (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- |
| Validation Readiness | Ready for the next workflow stage (`API / E2E`) | Fail | `CR-012` must be fixed before API/E2E resumes. |
| Tests | Test quality is acceptable | Fail | Existing tests pass but miss the known node-pty spawn-helper permission baseline. |
| Tests | Test maintainability is acceptable | Pass | The new tests are focused; one startup-repair regression should be added. |
| Tests | Review findings are clear enough for the next owner before API / E2E or delivery resumes | Pass | `CR-012` is bounded and directly actionable. |

Reviewer checks performed:

- Source/doc diff check excluding generated evidence logs: Pass. Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/code-review-round16-source-doc-diff-check-20260524.log`
- Full `git diff --check HEAD^..HEAD`: Fail only on committed/generated evidence logs with `lsof` trailing whitespace / blank EOF. Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/code-review-round16-diff-check-20260524.log`. This was not the blocking source finding.
- Source size audit: Pass. Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/code-review-round16-source-size-20260524.log`
- `pnpm -C autobyteus-ts exec vitest run tests/unit/tools/terminal/session-factory.test.ts tests/unit/tools/terminal/isolated-pty-session.test.ts tests/unit/tools/terminal/pty-session.test.ts`: Pass, 3 files / 25 tests. Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/code-review-round16-autobyteus-ts-terminal-unit-20260524.log`
- `pnpm -C autobyteus-server-ts test tests/e2e/terminal/terminal-websocket-lifecycle.e2e.test.ts`: Pass, 1 file / 3 tests. Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/code-review-round16-server-terminal-e2e-20260524.log`
- `pnpm -C autobyteus-server-ts build:full`: Pass. Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/code-review-round16-backend-build-full-20260524.log`
- Reviewer copy of the built-backend macOS Terminal descriptor/timing probe: Pass. JSON: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/code-review-round16-terminal-server-connect-timing-v2-20260524.json`; run log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/code-review-round16-terminal-server-connect-timing-v2-20260524.run.log`; final `lsof`: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/code-review-round16-terminal-server-connect-timing-v2-20260524-final-lsof.log`.
  - Key samples: baseline after health `36` FDs; after 8 normal command-output sessions `32`; after 25 early-close cycles `32`; final after abort-before-open cycles `32`; final child count `0`; no `/dev/ptmx` or `(revoked)` lines in final `lsof`.
- Reviewer spawn-helper permission probe: Fail as expected for current code; see `CR-012`. Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/code-review-round16-isolated-pty-spawn-helper-permission-probe-20260524.log`.

## Legacy / Backward-Compatibility Verdict

| Check | Result (`Pass`/`Fail`) | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | The isolated backend is a clean Darwin backend selection, not a compatibility wrapper or fd-limit workaround. |
| No legacy old-behavior retention in changed scope | Pass | The old direct `PtySession` Darwin default is not retained as the main server path. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | No stale workspace-id terminal route or file-explorer materialization path was reintroduced. |

## Dead / Obsolete / Legacy Items Requiring Removal (Mandatory If Any Exist)

| Item / Path | Type (`DeadCode`/`ObsoleteFile`/`LegacyBranch`/`CompatWrapper`/`UnusedHelper`/`UnusedTest`/`UnusedFlag`/`ObsoleteAdapter`/`DormantPath`) | Evidence | Why It Must Be Removed | Required Action |
| --- | --- | --- | --- | --- |
| None | N/A | No dead/obsolete source item found in Round-16 scope. | N/A | N/A |

## Docs-Impact Verdict

- Docs impact: `No` for product/user docs from this review finding.
- Why: `CR-012` is an implementation-owned startup invariant regression in the low-level terminal backend. Ticket-local review/handoff artifacts must be updated after the fix; durable product docs should not need new behavior text.
- Files or areas likely affected: `autobyteus-ts/src/tools/terminal/isolated-pty-session.ts`, isolated PTY tests, ticket implementation handoff, ticket review report.

## Classification

- Classification: `Local Fix`
- Rationale: The accepted design is sound and the descriptor-isolation approach is directionally correct. The failure is a bounded implementation omission: the new default Darwin `TerminalSession` backend did not reuse the existing node-pty startup repair invariant.

## Recommended Recipient

- Recommended Recipient: `implementation_engineer`

Routing note: After the local fix, return to `code_reviewer` before API/E2E resumes.

## Residual Risks

- The isolated bridge source is string-evaluated JavaScript. This is acceptable for the descriptor-isolation target, but future changes should keep it minimal and well covered.
- Code review reran the descriptor/timing probe successfully, but API/E2E still needs to own final broad validation after `CR-012` is fixed.
- Committed/generated evidence logs in the Round-16 commit contain trailing whitespace/blank EOF that make a full `git diff --check HEAD^..HEAD` fail. The source/doc diff check passes; this is evidence-artifact hygiene, not the blocking runtime finding.

## Latest Authoritative Result

- Review Decision: `Fail`
- Score Summary: `8.4/10` (`84/100`). Descriptor cleanup evidence is strong, but `CR-012` blocks API/E2E readiness because the new Darwin default isolated backend regresses a known node-pty startup repair invariant.
- Notes: Route to `implementation_engineer` for bounded local fix, then re-review before API/E2E resumes.
