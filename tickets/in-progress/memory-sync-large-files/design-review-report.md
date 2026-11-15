# Design Review Report — memory-sync-large-files

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/memory-sync-large-files/tickets/in-progress/memory-sync-large-files/requirements-doc.md` (SR-003, Approved; unchanged in SR-004)
- Upstream Investigation Notes: `…/memory-sync-large-files/investigation-notes.md` (SR-004 rows)
- Upstream Solution Revision Record: `…/memory-sync-large-files/solution-revision-record.md` (SR-004)
- Reviewed Design Spec: `…/memory-sync-large-files/design-spec.md` (SR-004, Ready)
- Supplemental Task Artifacts Reviewed: `probes/large-file-sync-probe.e2e.test.ts.txt` (evidence only, unchanged); `handoff-sr-004.md`; `follow-ups.md`
- Relevant Solution Revision IDs: SR-001, SR-002, SR-003, SR-004
- Architecture Review Revision Record: `…/memory-sync-large-files/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-003`
- Current Review Round: 3
- Trigger: Solution Designer handoff SR-004 (design revised for ARCH-REV-002 AR-007, AR-008)
- Prior Review Round Reviewed: 2 (`ARCH-REV-002`, Fail)
- Latest Authoritative Round: 3
- Current-State Evidence Basis: branch `task/memory-sync-large-files` @ `7ae4be962`. Source code is unchanged since round 1, so the code reads from rounds 1–2 still hold (service, scanner, planners, client, parser, state store, worker, import store, ingestion, batch identity, route, types, GraphQL resolver, `store-utils.ts:40-125`, `background-runner.ts`, context-file layout). SR-004 changed only `design-spec.md` (DS-003, DS-006, Ownership Map, Interfaces, limits, examples, Risks, tests), investigation notes (two evidence rows) and the solution revision record. I checked the whole diff `c9563a9b3..7ae4be962` for those files.

## Routing Classification Review

- Task size: `Large`; Architectural risk: `High`
- Classification rationale reviewed: unchanged and accurate (three subsystems; new node-to-node contract, hub staging persistence, additive source state, run-lifecycle change).
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None. Design approval `Not required`.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes (SR-003 baseline; SR-004 changes no requirement).
- Relevant existing behavior and evidence confirmed: Yes.
- Scope guardrail confirmed: Yes.
- Every prospective blocking `Design Impact` finding is traceable to an approved ID: `Yes` (none remain).
- Remaining material ambiguity: None.
- Statements about existing code the design relies on: all checked in rounds 1–2. The new SR-004 citations (`store-utils.ts:40-125`, `local-file-memory-import-store.ts:208-211`) are accurate.

| Behavior ID | Kind | Design Alignment | Trigger / Current-State Evidence | Target Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-002 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-003/004 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-005 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-006 | Operational | Pass | Pass | Pass | Confirmed | — |
| BEH-007 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-008 | System | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope | Linked | Complete | Consistent | Status / Approval | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `probes/large-file-sync-probe.e2e.test.ts.txt` | Pass | Pass | Pass | Pass | Pass (evidence only) | None |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Present for the task posture | Pass | Bug Fix + Larger Requirement | — |
| Root cause explicit and evidence-backed | Pass | Missing Invariant + Responsibility Drift (planner 43-46/58-80, service 73-93/148-154) | — |
| Refactor decision explicit | Pass | Yes, now | — |
| Decision reflected in design sections | Pass | Scanner / change planner / batch planner / transfer / stager / failure policy / run gate / staged store / sweep cadence | — |

## Spine Inventory Verdict

| Spine ID | Scope | Readable | Narrative Clear | Facade vs Owner | Naming | One Owner Per Node, In Call Order | Off-Spine Off Main Line | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary run (trigger, run gate, per-batch recording) | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Primary staged transfer (prefix hash, exact `size`, 409) | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-003 | Primary commit (batchId → verify all, grouped by SHA-256 → write by temp + rename / staged rename → manifest) | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Bounded local change plan | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-005 | Return/event owner visibility | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006 | Bounded local staging sweep (cadence: ingestion, at most hourly, not awaited; mechanics: staged store, per-source lock one folder at a time) | Pass | Pass | Pass (cadence owner vs mechanics owner named) | Pass | Pass | Pass (off every request's critical path) | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Point Clear | Internals Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `MemorySyncService` | Pass | Pass | Pass | Pass | Worker/resolver pass only the trigger |
| `MemoryHubIngestionService` | Pass | Pass | Pass | Pass | Routes and the startup loader call only it; `sweepStale` is called only by `requestStagingSweep` |
| `LocalFileMemoryImportStore.commitBatch` | Pass | Pass | Pass | Pass | Owns grouping and verify-all-then-write |
| `MemoryHubStagedFileStore` | Pass | Pass | Pass | Pass | `placeStagedFile` only inside the commit lock after verification |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Clear | Shortcuts Explicit | Coherent | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| source / hub / shared / api | Pass | Pass | Pass | Pass | Unchanged |
| startup loader → ingestion service (`requestStagingSweep`) | Pass | Pass | Pass | Pass | SR-004 routes the loader through the cadence owner instead of calling the store directly |

## Interface Boundary Verdict

| Interface | Subject | Singular | Identity | Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| Staged-file GET/PUT; batches POST | Pass | Pass | Pass | Low | Pass |
| `startSync(trigger)` / `runOnce(trigger)` / `planChangedFiles(…, trigger, now)` / `isDue(…, trigger, now)` | Pass | Pass | Pass | Low | Pass |
| `placeStagedFile(sourceId, sha256, targetPaths[])` | Pass | Pass | Pass | Low | Pass |
| `requestStagingSweep(): void`; `sweepStale()` | Pass | Pass | Pass | Low | Pass |
| GraphQL `fileFailureCount`, `fileFailures`, `failedFiles` | Pass | Pass | N/A | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked | Decision Sound | New Piece Justified | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Status, locked JSON, hub commit, access gate, binary parsing | Pass | Pass | N/A | Pass | Unchanged |
| Streaming hash | Pass | Pass | Pass | Pass | Shared by source and hub |
| Startup job | Pass | Pass | Pass | Pass | `background-runner.ts` task list |
| Per-source lock | Pass | Pass | N/A | Pass | `withFilePathLock`, now off the request path |

## Subsystem / Capability-Area Allocation Verdict

| Area | Allocation Clear | Decision Sound | Supports Spine Owners | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `memory-sync/source`, `hub`, `shared`, `api`, `startup`, web | Pass | Pass | Pass | Pass | Each sequence has one owner that calls its mechanisms itself; no callbacks reach other collaborators; both run entry forms are traced |

## Reusable Owned Structures Verdict

| Repeated Structure | Evaluated | Shared File Sound | Ownership Clear | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Transfer limits (+ sweep interval) | Pass | Pass | Pass | Pass | One owner for source and hub numbers |
| Streaming SHA-256 | Pass | Pass | Pass | Pass | — |
| Operation union | Pass | Pass | Pass | Pass | — |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning | Redundant Removed | Overlap Controlled | Core vs Variant | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `MemoryFileOperation` union | Pass | Pass | Pass | Pass | Pass | — |
| `MemorySyncFileFailure` | Pass | Pass | Pass | N/A | Pass | — |
| `MemoryFileEntry` / `ChangedMemoryFile` | Pass | Pass | Pass | Pass | Pass | — |

Derived consumers listed with a decision each (Principle 11): `Pass`. One vocabulary (Principle 15): `Pass`.

## File Responsibility Mapping Verdict

| File | Singular | Matches Owner | Re-Tightened | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| All mapped files (shared limits/hash/types; source scanner, change planner, batch planner, transfer, stager, failure policy, client, parser, service, worker, state store; hub staged store, import store, ingestion; startup loader; REST; GraphQL; web; doc) | Pass | Pass | Pass | Pass | Ingestion service gains the cadence owner, a small timestamp + in-flight flag tied to its hub calls; not a mixed concern |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Placement Clear | Folder Matches Owner | Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Flat `source/`, `hub/`, `shared/`; `startup/` loader | Pass | Pass | Low | Pass | — |
| `<memoryDir>/memory-sync-staging/<sourceId>/<sha256>.partial` | Pass | Pass | Low | Pass | Outside every reader's root |

## Removal / Decommission Completeness Verdict

| Item / Area | Named | Replacement Clear | Scope Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Scanner whole-file read, planner base64/`maxOperations`, `chunkOperations`, route literal, `MemoryFileDescriptor.sha256` | Pass | Pass | Pass | Pass | Dead-code grep recorded |

## Legacy / Backward-Compatibility Verdict

| Area | Retention Exists | Clean Cut Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Inline vs staged | No (two encodings of one protocol) | Pass | Pass | — |
| Mixed versions | No (rule 9) | Pass | Pass | — |

## Persisted-Data Transition Verdict

| Subject | Decision | Evidence | Proportionate | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Source state `fileFailures` | Directly Usable — No Migration | Pass | Pass | N/A | Pass | — |
| Hub staging | Not Affected (disposable; lifetime: taken, failed verification, or swept after 24 h) | Pass | Pass | N/A | Pass | — |
| Manifest / imports | Not Affected | Pass | Pass | N/A | Pass | — |

## Change / Refactor Safety Verdict

| Area | Sequence Realistic | Temporary Seams | Cleanup Explicit | Verdict |
| --- | --- | --- | --- | --- |
| Shared → hub → source → GraphQL/web → tests/docs | Pass | Pass (none) | Pass | Pass |

## Example Adequacy Verdict

| Topic | Needed | Present | Bad Shape | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Batch cutting; staged budget; same content twice (temp sibling); sweep off the request path; isolation; run-level; Sync now during a run; resume; card | Yes | Pass | Pass | Pass | — |

## Material Premise Validation

- MP-001 (same SHA-256 twice in one batch): `Reachable`. Handled by grouping and temp + rename placement.
- MP-002 (abandoned partial whose source never returns): `Reachable`. Handled by the all-source sweep at start and at most hourly.
- MP-003 (verification time against fetch timeouts): `Unclear`. Bounded by the 4 GiB staged budget; measured in the AC-003 run. Residual risk only.
- MP-004 (a piece request waits behind another source's commit): `Reachable`. Resolved because no request waits for the sweep.
- MP-005 (a partly copied imported file is visible): `Reachable`. Resolved by temp + rename.

No new premise in this round.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

## Findings

None. All prior findings (AR-001..AR-008) are resolved; see `architecture-review-revision-record.md` ARCH-REV-003.

## Classification

N/A (Pass).

## Recommended Recipient

Implementation Engineer (`/software_engineering_team/implementation_engineer`); informational notice to the Solution Designer.

## Residual Risks

- R-AR-1: staged verification time per batch (≤ 4 GiB or one file) against Node fetch's default 300 s response-headers timeout. The AC-003 run records the actual time; if it comes close, return a `Design Impact`.
- Sweep cadence: on a hub that receives no source request and does not restart, an abandoned partial stays until either happens (stated in the design Risks).
- Sync now holds the GraphQL mutation open until the queued manual run ends (same pattern as today, with a longer worst case).
- R-003 release order: release before or with `autobyteus-workspace-6`. `generated/graphql.ts` needs the fresh-start build at delivery.
- Implementation notes (not findings):
  - The background sweep's promise must handle its own rejection (log a warning) so it never becomes an unhandled rejection.
  - `requestStagingSweep` must record the start time before it starts the sweep, so calls arriving at the same moment start only one.
  - The temp sibling name follows the inline writer's pattern, which the source scanner already excludes (`.tmp`).

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: ARCH-REV-003. `task_size: Large`, `architectural_risk: High`. Ready for implementation.
