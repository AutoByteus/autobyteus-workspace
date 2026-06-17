# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/raw-trace-archive-filename-simplification/tickets/in-progress/raw-trace-archive-filename-simplification/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/raw-trace-archive-filename-simplification/tickets/in-progress/raw-trace-archive-filename-simplification/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/raw-trace-archive-filename-simplification/tickets/in-progress/raw-trace-archive-filename-simplification/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/raw-trace-archive-filename-simplification/tickets/in-progress/raw-trace-archive-filename-simplification/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/raw-trace-archive-filename-simplification/tickets/in-progress/raw-trace-archive-filename-simplification/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/raw-trace-archive-filename-simplification/tickets/in-progress/raw-trace-archive-filename-simplification/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code-review pass requested API/E2E coverage investigation and executable checks for provider/runtime persistence paths after raw trace archive filename simplification.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

The approved behavior is a clean-cut simplification of newly generated raw trace archive segment filenames from `<index>_<utcStamp>_<boundaryHash>.jsonl` to `<index>_<utcStamp>.jsonl` for every writer path that reaches `RawTraceArchiveManager`: AutoByteus/native compaction, Codex provider compaction boundaries, and Claude Agent SDK compact boundaries. The manifest remains authoritative for exact `file_name` and full `boundary_key`; pending-to-complete manifest lifecycle, idempotency by `boundary_key`, archive-only reads, full raw-trace corpus reads, active trace pruning/rewrite, and provider compaction boundary conversion/recording behavior must remain unchanged. No migration, filename parsing, compatibility wrapper, or dual-path write behavior is allowed or needed.

Implementation handoff legacy/compatibility section was reviewed. It reports no backward-compatibility mechanisms introduced, no legacy old-behavior retained in new writes, obsolete archive-manager filename hash helper/import removed, and the separate native `RunMemoryFileStore` boundary-key hash helper intentionally preserved. Static inspection of the changed files matches that statement.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `RawTraceArchiveManager` generated archive segment filename | Changed | REQ-001, AC-001, design intended change, implementation handoff | Existing focused durable coverage already updated before code review to assert simplified generated filenames and reject hash-suffixed generated names. Re-run that coverage. |
| Archive-manager filename-only boundary hash helper/import | Removed | Design removal plan, implementation handoff, code review `rg` validation | Verify through build/source checks; no API/E2E coverage should preserve the removed filename suffix. |
| Manifest `file_name` exact storage and full `boundary_key` authority | Preserved | REQ-002, REQ-004, REQ-005, AC-002/003/005 | Existing archive-manager tests cover exact manifest reads, old exact names, and same-boundary replay. Re-run focused unit coverage. |
| Native compaction archive path through `RunMemoryFileStore.pruneRawTracesById` | Changed persisted filename shape, preserved semantics | UC-001, REQ-006, design DS-001 | Existing file-store test now asserts simplified filename via native path. Re-run focused unit coverage. |
| Provider boundary archive path through `RunMemoryFileStore.rotateActiveRawTracesBeforeBoundary` | Changed persisted filename shape, preserved semantics | UC-002, design DS-002/DS-003, implementation handoff | Existing file-store test now asserts simplified filename via provider path. Re-run focused unit coverage and broader server provider recorder/runtime integration coverage. |
| Codex compact-event provider boundary flow | Preserved, with changed archive filename below shared manager | UC-002, design DS-002 | Existing server unit/integration coverage is still valid for event conversion/recording/persistence. Execute selected provider-runtime tests; no durable update needed because filename is already proven at shared store boundary. |
| Claude status vs compact-boundary flow | Preserved, with changed archive filename below shared manager | UC-002, design DS-003 | Existing cross-runtime integration coverage is still valid for non-rotating status and rotating compact boundary. Execute selected integration test. |
| Archive/full-corpus reads including manifest-listed old hash-suffixed file names | Preserved | REQ-004, AC-003/004, design DS-004 | Existing archive-manager and store tests are still valid. Re-run focused tests. This is not a compatibility wrapper; it is pre-existing manifest-authoritative reads. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/memory/raw-trace-archive-manager.test.ts` — simplified filename and manifest boundary authority | New segment file names match simplified pattern, do not match old hash suffix; segment file exists; manifest stores exact `file_name` and full `boundary_key`; same boundary replay reuses complete segment. | REQ-001, REQ-002, REQ-005, AC-001, AC-002, AC-005; design DS-001/DS-002/DS-003 owner boundary | Still Valid | Test file inspected in working tree; assertions match approved behavior and were reviewed by code reviewer. | Re-run as final focused durable coverage. |
| `autobyteus-ts/tests/unit/memory/raw-trace-archive-manager.test.ts` — exact manifest reads for old hash-suffixed filename | Complete archive reads open exact manifest `file_name` including an old hash-suffixed fixture. | REQ-004, AC-003, design DS-004 | Still Valid | This proves manifest-authoritative reads without adding filename parsing/migration. It does not assert new writes use old shape. | Re-run as final focused durable coverage. |
| `autobyteus-ts/tests/unit/memory/raw-trace-archive-manager.test.ts` — pending ignored / stale pending superseded | Pending segments are ignored for complete reads; retry for same boundary removes stale pending and writes a new complete simplified segment. | REQ-003, AC-003 | Still Valid | Assertions align with preserved pending-to-complete lifecycle. | Re-run as final focused durable coverage. |
| `autobyteus-ts/tests/unit/memory/run-memory-file-store.test.ts` — native pruning archive path | Native pruning moves selected raw traces into a manifest-backed archive segment with simplified file name and keeps active/archive reads correct. | UC-001, REQ-001, REQ-006, AC-001, AC-006 | Still Valid | Test reaches the public store path and the shared archive manager; static inspection shows native boundary-key hash helper remains separate. | Re-run as final focused durable coverage. |
| `autobyteus-ts/tests/unit/memory/run-memory-file-store.test.ts` — provider boundary rotation and full corpus | Provider boundary rotation archives active traces before the marker, preserves complete corpus order, and writes simplified segment filename. | UC-002, REQ-001, REQ-006, AC-001, AC-004, AC-006 | Still Valid | Test reaches `RunMemoryFileStore.rotateActiveRawTracesBeforeBoundary` and shared archive manager. | Re-run as final focused durable coverage. |
| `autobyteus-ts/tests/unit/memory/run-memory-file-store.test.ts` — same-boundary replay after post-boundary records | Same provider boundary replay does not duplicate archives and complete corpus remains ordered. | REQ-005, AC-005 | Still Valid | Test remains semantically current; filename shape is already covered in adjacent path tests. | Re-run as final focused durable coverage. |
| `autobyteus-server-ts/tests/unit/agent-memory/runtime-memory-event-accumulator.test.ts` — provider compaction marker, rotation, replay, retry | Runtime memory accumulator writes provider compaction markers, rotates settled traces into segmented archives, dedupes replayed boundaries, and retries marker-only rotation. | UC-002, REQ-005, REQ-006, design DS-002/DS-003 provider recorder spine | Still Valid | Static inspection shows these tests validate server-side recorder behavior above the shared file store. They do not need direct filename assertions because shared store durable coverage already owns filename shape. | Execute as broader provider/runtime executable coverage. No durable update needed. |
| `autobyteus-server-ts/tests/integration/agent-memory/cross-runtime-memory-persistence.integration.test.ts` — Codex provider compaction memory archive | Codex `thread/compacted` provider boundary archives prior raw trace, records manifest `boundary_key`, preserves complete memory view and restored write sequence. | UC-002, REQ-002, REQ-005, REQ-006, design DS-002 | Still Valid | Static inspection shows it exercises `AgentRunManager`/converter/recorder/store path for Codex provider persistence. | Execute as broader cross-runtime integration coverage. No durable update needed. |
| `autobyteus-server-ts/tests/integration/agent-memory/cross-runtime-memory-persistence.integration.test.ts` — Claude compacting status and compact boundary | Claude `status/compacting` is non-rotating; `compactBoundary` rotates and preserves full view with both status and boundary markers. | UC-002, REQ-006, design DS-003 | Still Valid | Static inspection shows it exercises Claude provider persistence path and archive segment creation. | Execute as broader cross-runtime integration coverage. No durable update needed. |
| `autobyteus-server-ts/tests/integration/run-history/memory-layout-and-projection.integration.test.ts` — projection reads archived plus active traces | Projection service reads archived and active traces after provider boundary rotation. | AC-004, design DS-004 | Still Valid but not selected for final execution | The scenario is current but primarily covers run-history projection, not filename generation or provider runtime persistence. Focused store and cross-runtime memory persistence tests cover the required boundary more directly. | Do not run in this round. |
| `autobyteus-server-ts/tests/unit/agent-memory/agent-memory-service.test.ts` — includeArchive raw trace reads | Agent memory service reads archive segments plus active traces when `includeArchive` is true. | AC-004, design DS-004 | Still Valid but not selected for final execution | The scenario is current but duplicates full-corpus read evidence at a higher service level. | Do not run in this round. |
| `autobyteus-server-ts/tests/e2e/memory/*` and broader GraphQL/runtime E2E files | GraphQL/runtime APIs around memory and live runtime behavior. | Indirectly related to memory views but not to internal segment filename shape. | Out Of Scope | This ticket does not change public API/GraphQL contracts or browser/runtime UI. Running full E2E would be high-cost and low-signal for the owner-local filename cleanup. | No action. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| None found during API/E2E investigation | N/A | Code-review-passed implementation already updated old generated-filename expectations before this stage; no remaining relevant durable coverage asserts old generated hash-suffixed names. | Code review report and static inspection of relevant tests. | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| None | N/A | Existing reviewed durable coverage already covers the filename shape at the archive manager and public store boundaries plus server provider/runtime persistence paths. | N/A | No new repository-resident coverage is needed in API/E2E. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| None | N/A | N/A | N/A | Code-review-passed implementation already updated durable unit coverage before API/E2E. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TV-001 | Run focused `autobyteus-ts` Vitest tests for raw trace archive manager and run memory file store. | New file names, manifest authority, old exact manifest reads, idempotency, native compaction, provider boundary rotation, full corpus order. | Existing durable tests already live in repo; no separate temporary probe is needed. |
| TV-002 | Run `autobyteus-server-ts` unit provider memory accumulator tests. | Server runtime memory event recorder still rotates provider boundaries and handles replay/retry through archive store. | Existing durable tests already live in repo; no separate temporary probe is needed. |
| TV-003 | Run `autobyteus-server-ts` cross-runtime memory persistence integration test. | Codex and Claude provider compaction flows persist archive segments through realistic runtime manager/converter/recorder setup. | Existing durable integration test already lives in repo; no separate temporary probe is needed. |
| TV-004 | Run `autobyteus-ts` package build. | TypeScript and runtime dependency verification remain clean after source/test changes. | Build is a command-level validation, not durable coverage. |
| TV-005 | Run `git diff --check` and final status review. | Whitespace and tracked/untracked artifact state are understood for handoff. | Repository hygiene check only. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full browser/GraphQL E2E memory explorer surfaces | Public API/UI contracts are not changed by filename generation; archive reads are covered by store and cross-runtime memory persistence tests. | Low; filename shape is an internal persisted file name, not a GraphQL schema/API behavior. | None. |
| Live external Codex/Claude provider processes | Existing integration tests synthesize provider events through converters/managers without requiring external provider credentials/processes. This is sufficient for the archive writer boundary. | Low; archive filename generation is owned by shared local store and does not depend on external provider execution. | None. |
| Concurrent archive writes | Not introduced or changed by this ticket; existing lifecycle remains unchanged. | Low/pre-existing. | None for this ticket. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None identified | N/A | Requirements, design, implementation handoff, code review, and static inspection align. No compatibility wrapper, migration, or retained old generated write behavior observed. | N/A |

## Execution Plan

1. Run focused durable `autobyteus-ts` unit coverage: `pnpm --filter autobyteus-ts exec vitest run tests/unit/memory/raw-trace-archive-manager.test.ts tests/unit/memory/run-memory-file-store.test.ts`.
2. Run `autobyteus-ts` build/runtime dependency verification: `pnpm --filter autobyteus-ts build`.
3. Run server-side provider/runtime durable coverage: `pnpm --filter autobyteus-server-ts exec vitest run tests/unit/agent-memory/runtime-memory-event-accumulator.test.ts tests/integration/agent-memory/cross-runtime-memory-persistence.integration.test.ts`.
4. Run `git diff --check` and final working-tree status review.
5. Write the API/E2E execution coverage report with exact command results and route to delivery if no repository-resident durable coverage is changed during API/E2E.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing code-review-passed durable coverage is sufficient and current. API/E2E will execute focused store coverage plus broader provider/runtime persistence tests; no new durable coverage edits are planned.
