# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/home/autobyteus/workspace/.codex/worktrees/run-file-change-live-projection-ownership/tickets/in-progress/run-file-change-live-projection-ownership/requirements-doc.md`
- Upstream Investigation Notes: `/home/autobyteus/workspace/.codex/worktrees/run-file-change-live-projection-ownership/tickets/in-progress/run-file-change-live-projection-ownership/investigation-notes.md`
- Upstream Solution Revision Record: `/home/autobyteus/workspace/.codex/worktrees/run-file-change-live-projection-ownership/tickets/in-progress/run-file-change-live-projection-ownership/solution-revision-record.md`
- Reviewed Design Spec: `/home/autobyteus/workspace/.codex/worktrees/run-file-change-live-projection-ownership/tickets/in-progress/run-file-change-live-projection-ownership/design-spec.md`
- Supplemental Task Artifacts Reviewed: None
- Relevant Solution Revision IDs: `SR-001`, `SR-002`
- Architecture Review Revision Record: `/home/autobyteus/workspace/.codex/worktrees/run-file-change-live-projection-ownership/tickets/in-progress/run-file-change-live-projection-ownership/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: revised package SR-002 from `/solution_designer` (CRR-002 `Requirement Gap` from API-REV-001 B-003/B-004; the user approved Option 2, split)
- Prior Review Round Reviewed: 1 (`ARCH-REV-001`, Pass)
- Latest Authoritative Round: 2
- Current-State Evidence Basis: worktree `codex/run-file-change-live-projection-ownership` @ `5c74fed71`. Files read: `src/services/run-file-changes/run-file-change-service.ts`, `src/run-history/services/run-file-change-projection-service.ts`, `src/agent-execution/runtime/general-process-run-supervisor.ts` (construction, rollback L380-401, `closeInternal` L412-455), `src/agent-execution/services/agent-run-resource-manager.ts`, `src/agent-execution/services/agent-run-service.ts` (bind pattern), `src/agent-execution/services/agent-run-manager.ts` (`getInstance` throws when unbound), `src/application-platform/execution/application-execution-scope-kernel-builder.ts:90`, `tests/architecture/application-framework-boundaries.test.ts:458-468`. I also grepped every use of `RunFileChangeService`, `getRunFileChangeService` and `attachToRun`.

## Round 2 Delta (SR-002)

- Delta reviewed: a `git diff` of `requirements-doc.md`, `design-spec.md`, `solution-revision-record.md` and `solution-handoff.md`. The design-spec change is limited to the revision-ID line.
- Requirements change:
  - SCN-002 and SCN-003 are narrowed. They now cover the standalone UI plus the `getRunFileChanges` and content API for any run, including Team members.
  - AC-003 and AC-004 are restated accordingly.
  - ASM-001 is amended.
  - Team-member Artifacts **UI** hydration is moved to Out Of Scope as the approved next ticket, with the user quote recorded.
- Design impact: none. The design is server-side only (process authority, attached-run cache, per-call reader resolution). It already satisfies the narrowed AC-003 and AC-004 for Team members at the API boundary. That frontend gap (no team call site to `hydrateRunFileChanges`) predates this ticket and is not caused by this design.
- The approved basis for every in-scope behavior is still confirmed. No structural verdict changes, and all round-1 verdicts are preserved.
- Non-blocking artifact-consistency notes (DOC-001):
  - design-spec §Solution And Approval Basis still says "Approved requirements baseline: `requirements-doc.md` SR-001". It should reference SR-002.
  - In solution-revision-record SR-002, the "Current status" line still reads requirements `Ready for Approval` and design "`Needs Revision` only if Option 1". The later "User decision" line and the requirements-doc record approval of Option 2.
  - requirements-doc's §Revision SR-002 table row still lists `Decision owner: user` with no decision recorded inline. The heading and Document Status record it.
  - None of these affects implementation. The Solution Designer may correct them at its next revision.

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Classification rationale reviewed: the fix corrects which instance is the process authority for live state and changes the cache lifecycle. The getter becomes bind-required.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes (SR-002). Every artifact that an active run records must be listable and previewable while its file exists. This restores the documented single-owner behavior. There is no API or persistence change.
- Relevant existing behavior and evidence confirmed: Yes. The code confirms the following:
  - `getRunFileChangeService()` lazily creates an instance. Its only caller is `RunFileChangeProjectionService`, and nothing attaches runs to it.
  - The writer is the instance constructed inline at `general-process-run-supervisor.ts:186` and passed to `AgentRunResourceManager`.
  - Standalone, team (`FlatTeamExecutionFactory`), org and standalone-root runs all go through the same `generalAgentRunManager`, `activationRegistry` and `resourceManager`. So one process writer covers both the standalone (AC-002) and team-member (AC-001) paths.
  - `load()` caches the first disk read for any runId. This explains the reproduced 200/404/404.
- Scope guardrail confirmed: Yes. UC-001..003 are in scope. Frontend wording, `FILE_CHANGE` derivation, the `file_changes.json` format and application artifact publication are out of scope.
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable: Yes. There are no blocking findings.
- Remaining material ambiguity: None.

| Behavior ID | Kind | Design Alignment | Trigger / Evidence | Target Path / Spine | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass | Pass (DS-002: the attached run is served from the live owner, and the 409/404 branches in `run-file-changes.ts` are untouched) | Confirmed | None |
| BEH-002 | User | Pass | Pass | Pass (DS-002, same resolution; SR-002 narrows UI hydration to standalone, and Team members are covered at the API) | Confirmed | None |
| BEH-003 | User | Pass | Pass | Pass (the inactive branches read disk directly and are unchanged; SR-002 narrowing applies to the UI only) | Confirmed | None |
| BEH-004 | System | Pass | Pass | Pass (DS-001: the writer and store are unchanged) | Confirmed | None |

## Supplemental Artifact Coherence Verdict

None.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present | Pass | design-spec §Task Design Health Assessment | — |
| Root-cause classification explicit and evidence-backed | Pass | The `Boundary Or Ownership Issue` and `Missing Invariant` classifications are backed by the instance inventory (confirmed by grep) and by commits `8704f2653` and `ae5a1c7bc` | — |
| Refactor decision explicit | Pass | `Yes (bounded)` | — |
| Refactor decision reflected in concrete sections | Pass | The Removal Plan, Interface Mapping, File Mapping and Change Sequence all reflect bind/release/get, the attached-set cache and the per-call resolver | — |

## Spine Inventory Verdict

| Spine ID | Scope | Readable | Narrative | Facade vs Owner | Naming | Ownership | Off-Spine | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Return-Event | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-002 | Primary | Pass | Pass | Pass (REST/GraphQL are transport facades) | Pass | Pass | Pass | Pass |
| DS-003 | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

The bounded local spine (attach → cache → detach/clear) is named, and the spec ties cache lifetime to attachment lifetime. See REC-001 for one enforcement point.

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Point Clear | Internals Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `RunFileChangeService` (process authority) | Pass | Pass | Pass | Pass | The reader-side `new` instance and the module-level lazy instance are both forbidden |
| `RunFileChangeProjectionService` | Pass | Pass | Pass | Pass | Transport files continue to use only the projection service |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Clear | Forbidden Explicit | Coherent | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| supervisor → bind/release | Pass | Pass | Pass | Pass | Only the supervisor binds. `application-platform` must not bind |
| run-history → services/run-file-changes getter | Pass | Pass | Pass | Pass | Same direction as today |

## Interface Boundary Verdict

| Interface | Subject | Singular | Identity | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `bindProcessRunFileChangeService` / `releaseProcessRunFileChangeService` / `getRunFileChangeService` | Pass | Pass | Pass | Low | Pass |
| `getProjectionForRun` / `getProjectionForCollaborationMember` | Pass | Pass | Pass | Low | Pass |
| GraphQL / REST (unchanged) | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked | Decision Sound | New Piece Justified | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Process-scoped lookup | Pass | Pass | N/A | Pass | Matches `bindProcessAgentRunService`, including the throw-on-double-bind and same-instance release semantics |
| Cache invalidation | Pass | Pass | N/A | Pass | Extends the existing `attachToRun` disposer and `clear()` |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem | Allocation Clear | Decision Sound | Supports Spine Owners | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `services/run-file-changes` | Pass | Pass | Pass | Pass | — |
| `agent-execution/runtime` | Pass | Pass | Pass | Pass | — |
| `run-history/services` | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Item | Evaluated | Shared File | Ownership | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| None introduced | Pass | N/A | N/A | Pass | — |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning | No Redundancy | Overlap Controlled | Core/Variant | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `RunFileChangeProjection` / `RunFileChangeEntry` | Pass | Pass | Pass | N/A | Pass | Unchanged |

## File Responsibility Mapping Verdict

| File | Singular | Matches Owner | Re-tightened | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `run-file-change-service.ts` | Pass | Pass | N/A | Pass | See REC-001 |
| `general-process-run-supervisor.ts` | Pass | Pass | N/A | Pass | Rollback (L380+) and `closeInternal` (L438+) release blocks exist to extend |
| `run-file-change-projection-service.ts` | Pass | Pass | N/A | Pass | See REC-002 |
| Tests and docs listed in the spec | Pass | Pass | N/A | Pass | Every listed path exists |

## Subsystem / Folder / File Placement Verdict

| Path | Placement Clear | Folder Matches | Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| No new folders | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item | Named | Replacement Clear | Scope Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Lazy module singleton | Pass | Pass | Pass | Pass | Removing it also eliminates the only zero-arg `new RunFileChangeService()` site. That site is relevant to the `defaulting-owner` architecture-test entry for `RunFileChangeService` |
| Unconditional `load()` caching | Pass | Pass | Pass | Pass | — |
| Captured `changes` field | Pass | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Legacy Retained | Clean-Cut Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Getter fallback to an unbound default | No | Pass | Pass | Rejected explicitly |
| TTL or miss-reload patch | No | Pass | Pass | Rejected explicitly |

## Persisted-Data Transition Verdict (When Applicable)

| Stored Subject | Decision | Evidence | Proportionate | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `file_changes.json` | Not Affected | Pass | Pass | N/A | Pass | The store, normalizer and write path are unchanged |

## Change / Refactor Safety Verdict

| Area | Sequence Realistic | Temporary Seams | Cleanup | Verdict |
| --- | --- | --- | --- | --- |
| Service → supervisor → reader → tests → docs | Pass | Pass (none) | Pass | Pass |

The startup-ordering risk adds no new constraint. `RunFileChangeProjectionService`'s constructor already calls `AgentRunManager.getInstance()`, which throws when unbound, so the reader already requires the supervisor to be bound first. Both production compositions (`build-studio-server.ts:234` and `start-standalone-application-host.ts:273`) go through `createGeneralProcessRunSupervisor`, so both bind.

## Example Adequacy Verdict

| Topic | Needed | Present | Bad Shape | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Cache rule, reader lookup, composition | Yes | Pass | Pass | Pass | — |

## Material Premise Validation (Only When Needed)

### MP-001 — An in-flight `handle()` may re-populate the cache after detach

- Related approved requirement or established contract: the attached-run cache invariant in the design (supports REQ-001 and REQ-002).
- Relevant behavior ID(s): BEH-001, BEH-004
- Initiating basis kind: `User`
- Independent product-supported initiating trigger: the user stops or terminates an active run (supported run-control action) just after the agent emitted a `FILE_CHANGE`.
- Support evidence: termination → `AgentRunResourceManager.release` → file-change disposer → `unsubscribe(); clear(runId)`. A queued `handle()` that is awaiting `load()`'s disk read then continues and calls `this.projections.set(runId, …)` after `clear`.
- Forward path: `FILE_CHANGE` → `enqueue` → `handle` → `await load` (the run is still attached, so it reads from the cache or from disk) → detach clears → `projections.set` re-inserts.
- Lifecycle preconditions and material consequence: the cache keeps an entry for a run that is no longer attached. Reads are unaffected, because the design's `load()` checks attachment first and inactive reads use disk directly. If the run is re-attached later, it starts from that entry. The entry equals what the same `handle()` persisted, so no user-visible staleness follows. Impact is a small invariant leak only.
- Reachability: `Reachable` (narrow timing). The material consequence is negligible.
- Review consequence: non-blocking recommendation REC-001.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

## Findings

None (no blocking findings).

Non-blocking implementation recommendations:

- **REC-001 (enforce the invariant at every cache write):** The design's example guards only `load()`. To keep "in-memory projections exist only for attached runs" true, `handle()` should cache only while the run is still attached. For example, guard `this.projections.set` with `this.attached.has(runId)`. `load()` for an attached run should also not cache after a detach that happens during its disk read. Add a unit test: detach while a `handle` is pending, then assert that no projection remains. This is a cheap, local change within the existing owner (MP-001).
- **REC-002 (consistent resolution in the reader):** `RunFileChangeProjectionService` also captures `AgentRunManager.getInstance()` at construction, and the module singleton `getRunFileChangeProjectionService()` keeps it. In production there is one bind per process, so this has no consequence and no change is required. The implementer may choose to resolve the agent-run manager per call for symmetry with the `changes` resolver. Do not widen scope beyond that.

## Classification

N/A (Pass).

## Recommended Recipient

The returned primary pass recipient (normally `/implementation_engineer`), with an informational notice to `/solution_designer`.

## Residual Risks

- Team-member Artifacts UI hydration (reload or historical) is a pre-existing frontend gap. It is user-approved as the next ticket (SR-002). Also noted there: the failing base integration test "hydrates historical AutoByteus team-member file changes" (stale seed, per CRR-002).
- RSK-001: the frontend's "deleted or moved" wording for every 404. Out of scope; separate-ticket candidate.
- Tests that relied on the implicit singleton must bind or inject explicitly (`run-file-changes.test.ts`, `run-file-changes-api.integration.test.ts`, `run-file-change-projection-service.test.ts`).
- Unattached active runs (a short activation or release window) get a fresh disk read on every request. This is correct, and the cost is small.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: Round 2 (SR-002) is a requirements-only narrowing with explicit user approval, and the design is unchanged. DOC-001 is advisory. The design restores the documented single-owner behavior using the established `bindProcess*` pattern, with clear removal and no API or persistence change. REC-001 and REC-002 are advisory.
