# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-reentry-worker-stopped/tickets/in-progress/application-reentry-worker-stopped/requirements-doc.md` (SR-001, Approved, unchanged by SR-002)
- Upstream Investigation Notes: `…/investigation-notes.md` (E-08 corrected in SR-002)
- Upstream Solution Revision Record: `…/solution-revision-record.md` (SR-001, SR-002)
- Reviewed Design Spec: `…/design-spec.md` (SR-002, Ready)
- Supplemental Task Artifacts Reviewed:
  - `evidence/repro-application-reentry.e2e.test.ts`
  - `evidence/SD-01-repro-base.log`
  - `evidence/SD-02-control-reentry-order.log`
  - `application-framework-design-findings.md`
  - `follow-ups.md` (FU-001…FU-005, added at the user's request)
- Relevant Solution Revision IDs: `SR-001`, `SR-002`
- Architecture Review Revision Record: `…/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: `2`
- Trigger: Solution Designer re-review request after ARCH-REV-001 (SR-002), 2026-10-25
- Prior Review Round Reviewed: `1` (ARCH-REV-001, Fail: AR-001, AR-002)
- Latest Authoritative Round: `2`
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/application-reentry-worker-stopped`, branch `codex/application-reentry-worker-stopped` @ `9f6982ce0b`. Code read at the cited lines below.

## Routing Classification Review

- Task size: `Medium` (five source files across three subsystems, all within existing owners)
- Architectural risk: `High` (lifecycle order of the shared reentry path; transition→reentry contract; worker stop end state)
- Classification rationale reviewed: confirmed.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: as round 1 (REQ-001…006). SR-002 does not change them.
- Relevant existing behavior and evidence confirmed (round 1, still valid), plus for SR-002:
  - `application-engine-controller.ts:202-225`: the stop returns early with no handle.
  - `application-engine-launcher.ts:69-73`: `stop` waits for an in-flight start, then calls the controller.
  - `application-engine-launcher.ts:145-168`: a crash sets `failed` and detaches.
  - `application-engine-state-registry.ts:15-24,75-84`: the base status is `stopped`; `updateStatus` sets the in-memory map and writes a file only with a path.
  - `stopAttachedEngine` callers: the launcher (`:71`) and `tests/unit/application-engine/application-engine-controller.test.ts:77-78`.
  - Architecture guard anchor: `tests/architecture/application-framework-boundaries.test.ts:3089-3093`.
  - `getDiagnosticsByApplicationId` readers: `application-platform-lifecycle.ts:115`, with stubs at `application-platform-lifecycle.test.ts:22` and `application-execution-event-journal-recovery.test.ts:258`.
  - Readiness `activeApplicationIds` is `selectedApplicationIds` (`create-application-orchestration-services.ts:241`). So the lifecycle's `isSelected` filter covers the same set that readiness checks.
- Scope guardrail confirmed: yes. `application-engine` enters scope only for the stop end state that REQ-001 and BEH-001 require. No new behavior.
- Every prospective blocking `Design Impact` finding is traceable: `Yes` (none remain)
- Remaining material ambiguity: none
- Statements about existing code the design relies on: every SR-002 citation was opened and matches. E-08 is now accurate.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User/System | Pass | Pass | Pass (`ready`, `failed` and `stopped` workers all end `stopped`; MP-001 traced) | Confirmed | — |
| BEH-002 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-003 | User | Pass | Pass | Pass (startup per selected app via `getSetupRequiredDetail`) | Confirmed | — |
| BEH-004 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-005 | Operational | Pass | Pass | N/A (report) | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| reproduction e2e + SD-01/SD-02 logs | Pass | Pass | Pass | Pass | Pass | — |
| `application-framework-design-findings.md` | Pass | Pass | Pass | Pass | Pass (report) | — |
| `follow-ups.md` FU-001…005 | Pass | Pass (design Change Scope) | Pass | Pass (outside this ticket's scope) | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present | Pass | Bug fix | — |
| Root cause explicit and evidence-backed | Pass | Missing Invariant + Duplicated Policy. SR-002 adds the crashed-worker stop state, supported by evidence | — |
| Refactor decision explicit | Pass | Small refactor | — |
| Supported by concrete sections | Pass | Target mapping, removal plan, sequence 2/2a | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Reload / repair / import | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-002 | Startup | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-003 | Per-participant | Pass | Pass | N/A | Pass | Pass (worker state across a reentry is traced for each worker state) | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `ApplicationDefinitionRuntimeReadiness` | Pass | Pass | Pass | Pass | One text owner |
| `ApplicationReentryService` | Pass | Pass | Pass | Pass | Reasons as data; `Pick<"stop">` |
| `ApplicationEngineLauncher` → `ApplicationEngineController.stopEngine` | Pass | Pass | Pass | Pass | Reentry calls only `launcher.stop`; the end state is owned by the worker owner |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| transition → readiness, reentry | Pass | Pass | Pass | Pass | — |
| reentry → availability, recovery, dispatch, launcher (`stop`), tools | Pass | Pass | Pass | Pass | — |
| launcher → controller | Pass | Pass | Pass | Pass | Unchanged; guard assertion unchanged |

## Interface Boundary Verdict

| Interface | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `readiness.getSetupRequiredDetail(applicationId)` | Pass | Pass | Pass | Low | Pass |
| `recoverParticipants(token, currentIds, setupRequiredDetails, options)` | Pass | Pass | Pass | Low | Pass |
| `controller.stopEngine(applicationId)` (renamed) | Pass | Pass (always ends `stopped`; the name no longer says "attached only") | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Setup text | Pass | Pass | N/A | Pass | — |
| On-demand worker start | Pass | Pass (with stop ending in `stopped`, the invoker covers the crashed kind) | N/A | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `application-orchestration` | Pass | Pass | Pass | Pass | — |
| `application-platform/runtime` | Pass | Pass | Pass | Pass | — |
| `application-engine` | Pass | Pass | Pass | Pass | Stop end state |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| "Application setup is required: …" | Pass | Pass | Pass | Pass | — |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `ReadonlyMap<applicationId, setupRequiredDetail>` | Pass | Pass | Pass | N/A | Pass | — |

Derived consumers of a changed structure listed with a decision for each: `Pass` (the reentry caller; the error class; the lifecycle, now decided; every stop caller listed).

Domain vocabulary keeps one meaning per word: `Pass`. `stopEngine` keeps the controller's existing "engine" word. The engine/worker/backend drift is FU-005, outside this ticket's scope.

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Matches Owner? | Re-Tightened? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| reentry / transition / readiness / lifecycle | Pass | Pass | Pass | Pass | — |
| `application-engine-controller.ts`, `application-engine-launcher.ts` | Pass | Pass | N/A | Pass | — |
| new invoker unit, new e2e, updated units, architecture guard anchor | Pass | Pass | N/A | Pass | The guard assertion is unchanged |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| existing folders; new tests in existing test folders | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Named? | Replacement Clear? | Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| reentry `ensureReady` + `Pick` | Pass | Pass (stop → `stopped`; start on demand) | Pass | Pass | AR-001 resolved |
| `recoverableApplicationIds` | Pass | Pass | Pass | Pass | — |
| generic "after catalog transition" text; inline lifecycle text | Pass | Pass | Pass | Pass | — |
| `getDiagnosticsByApplicationId` + 2 stubs | Pass | Pass | Pass | Pass | AR-002 resolved |
| early return without status change in the controller stop | Pass | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| reentry worker start; stop rename | No | Pass | Pass | No alias for `stopAttachedEngine` |

## Persisted-Data Transition Verdict (When Applicable)

N/A: `Not Affected`. The stop path's `updateStatus` call has no `statusPath` (`application-engine-state-registry.ts:75-84`), so nothing is written to disk.

## Change / Refactor Sequence Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1, 2, 2a, 3–6 | Pass | Pass (none) | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Present And Clear? | Bad Shape Explained? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Reentry order | Yes | Pass | Pass | Pass | — |
| Worker state across a reentry | Yes | Pass (DS-003 note) | N/A | Pass | — |

## Material Premise Validation (Only When Needed)

### `MP-001` — A participant whose worker crashed is reentered (repair or package reload)

- Related contract: REQ-001; BEH-001 preserved column; `docs/modules/application_orchestration.md:179-180`; `tickets/done/application-owned-mcp-capability/requirements.md:217`
- Relevant behavior ID(s): BEH-001 (SCN-001, SCN-002)
- Initiating basis kind: `System` (crash) then `Operational` / `User` (repair, reload)
- Trigger and forward path: as in round 1. Target (SR-002): `prepareParticipants` → `launcher.stop` → `controller.stopEngine` with no handle → base `stopped`. Reentry starts nothing; the app becomes ACTIVE. A tool call → the invoker sees `stopped` → `ensureReady` → the worker starts, and its host calls are admitted because the app is ACTIVE.
- Reachability: `Reachable`
- Review consequence: the SR-002 design covers it, with the planned invoker unit and controller unit as evidence. Resolved.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

- `Pass`

## Findings

None open. AR-001 and AR-002 are resolved (see ARCH-REV-002 in the revision record).

## Classification

N/A (Pass)

## Recommended Recipient

Implementation Engineer (`/software_engineering_team/implementation_engineer`)

## Residual Risks

- A stop clears a crashed worker's `lastFailure` in the engine status. The crash reason was already published at worker close. Accepted in the design.
- A crashed worker of an ACTIVE app that is not reentered still fails its tool calls closed until the next ensure-ready or reentry. That is the existing approved contract, unchanged.
- The participant is ACTIVE before its tools open, while dispatch resume is awaited, as at startup. Accepted.
- A worker start failure now surfaces on the first on-demand request, as at startup. Accepted.
- Implementation note: the planned new invoker unit should use the real controller and only fake the launcher's start, as the target mapping says, so that it proves the `failed` → `stopped` → on-demand chain.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: task_size=Medium, architectural_risk=High. SR-002 resolves AR-001 (a stop ends in `stopped` for every worker state; reentry starts nothing) and AR-002 (`getDiagnosticsByApplicationId` removed; startup asks `getSetupRequiredDetail` per selected app).
