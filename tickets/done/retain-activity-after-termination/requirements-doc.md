# Requirements — Retain Activity after termination

## Document Status
- Package: ACTIVITY-RETAIN-20260914-001; approved baseline SR-001; approval captured SR-003.
- Status: **Approved**. Owner: Solution Designer. Date: 2026-09-14.
- Explicit approval in this conversation: after SR-001 scope presentation and SR-002 personal comparison, user says “Okay, I think now it's clear you can just work on the design ... Make sure that we have a clean design”. Approves REQ/AC-001–004 and preserved same container termination principles; captured SR-003. Previous ticket approval is not reused.
- Behavior-defining Product supplements: N/A — none requested.

## Problem / Outcome / Actors
A user inspecting a Team member sees completed and System instructions Activity while live. After Terminate, the same conversation remains but the right Activity panel empties; Send restores it. Runtime termination must not make retained historical Activity unavailable. User should be able to inspect stopped runs without activating providers.

## Relevant Behavior
| ID | Scenario | Current evidence | Desired | Preserve |
|---|---|---|---|---|
| BEH-001 | SCN-001 | Team success-stop explicitly clears Activity, INV-001/user images | Retain historical Activity through stop and offline inspection | Stop actually disconnects/stops; truthful Offline |
| BEH-002 | SCN-002 | Standalone no explicit clear; Org re-inspects, INV-002 | Same historical inspectability for Agent and Org direct/mounted; correct same loss if found | Existing per-Agent identity and container routing |
| BEH-003 | SCN-003 | Team Send rehydrates activities | Continue normally without requiring Send to see prior activity, without duplicates | Lazy addressed activation, history/attachments/drafts, manual/auto policy |
| BEH-004 | SCN-004 | Team stop rejection returns before local cleanup | Failed stop must not erase history or misrepresent confirmed stop | Existing error/uncertainty handling and real empty-state |

## Scope Guardrail
- UC-001: retained Team member Activity during normal successful Terminate and offline selection/inspection.
- UC-002: same user path for standalone Agent and Org direct/mounted members; investigate and correct equivalent loss if established, otherwise parity regression coverage only.
- UC-003: later normal continuation and relevant stop failure/empty-history controls.
- Out of scope: new event journal, expanded raw-trace retention, archive/deletion semantics, new approval persistence/policy, new Activity UI, backend rename, unrelated refactor, release/deploy/migration/reset.
- Preserve BEH-003/004 and existing lazy Agent startup, container vs member status, manual task approvals, exact identities, attachments and no duplicate submissions. Historical inspection must not revive stale actionable approvals.
- Every blocking correction must cite approved REQ/AC/BEH. New product or operational policy requires explicit user approval; reviewer proposals alone do not amend scope.

## Requirements and Acceptance
| REQ | Requirement | AC / observable verification | Mapping |
|---|---|---|---|
| REQ-001 | Keep retained historical Activity available when Team stops | AC-001: with visible successful tool and System instructions entries, successful Terminate leaves same selected member's history inspectable, no reload/refocus/Send required; status Offline and no provider startup | UC-001 / BEH-001 / SCN-001 |
| REQ-002 | Consistent stopped-history inspection for supported Agent/Org placements | AC-002: repeat live/stop/retained inspection for standalone Agent and Org direct/mounted member; check multiple Team members. No equivalent Activity disappearance; don't require source changes where unaffected | UC-002 / BEH-002 / SCN-002 |
| REQ-003 | Preserve legitimate continuation and control safety | AC-003: later Send retains prior Activity/history/identity/attachments and adds new activity without duplicate old entries or unrelated startup. Stopped inspection does not expose executable stale decisions; resumed manual policy remains unchanged | UC-003 / BEH-003 / SCN-003 |
| REQ-004 | Preserve supported failure and empty behavior | AC-004: rejected/failed stop does not erase Activity or claim confirmed Offline solely from failure. Genuine empty history still shows appropriate empty state; selecting another member never displays previous member's activities | UC-003 / BEH-004 / SCN-004 |

## Relevant Scenarios and Journeys
All are **Supported Normal Scenarios**, not synthetic protocol calls. Approved by the SR-003 user reference.
- SCN-001: user completes work with selected Team member and visible Activity, clicks existing Terminate, stays selected, inspects same Activity offline. Evidence: supplied images and production UI→store path INV-001. REQ/AC-001.
- SCN-002: user does the same with standalone Agent or Org direct/mounted member, or selects another retained member after stopping. Expected history tied to exact selected identity, no activation for reading. Evidence: existing termination/inspection surfaces INV-002 plus user's explicit parity request. REQ/AC-002.
- SCN-003: user sends new work to stopped retained run after inspecting history; prior history remains and only legitimate work starts Agents. Existing continuation path and previous completed ticket establish preservation. REQ/AC-003.
- SCN-004: ordinary termination fails/rejects, or selected member has never produced Activity. Preserve history/accurate feedback in failure, truthful empty state in genuine empty case. Existing success/error branches and ActivityFeed establish supported alternate. REQ/AC-004.

## UI / Quality / Data
Existing Activity panel and existing controls only; no prototype or visual redesign (N/A). Screenshots illustrate incorrect count/content loss, not normative fixture names or pixels. QR-001 reliability = AC-001–004, verify via durable relevant lifecycle/store/render checks and actual frontend journey. Preserve conversation/Activity content and identity, drafts and attachments; no user-data loss/reset acceptable. Runtime-state changes after stop must remain truthful rather than freeze live status. Data mechanism deferred to architecture; no schema change assumed.

## Dependencies / Assumptions / Open Questions
Current local raw-trace history projection and live Agent events remain existing inputs, not a promise that every stream transition is persisted. No external credential blocker established. Actual user deployed commit unknown; personal remembered experience cannot be disproven from branch snapshot. Source cause confirmed for Team, parity runtime validation still pending. No material unresolved product question.

## Supplements / Traceability
Canonical evidence: investigation-notes.md INV-001–004, evidence/team-live.png and evidence/team-terminated.png (evidence only). Requirement table provides UC/BEH/SCN/AC traceability. bootstrap-handoff.md and solution-revision-record.md record context; no independent review/implementation result yet (N/A).

## Architecture Phase Input / Readiness
Design DS-001 / SR-004 addresses stop cleanup ownership versus retained history ownership, post-stop control gating, relevant projection/selection paths, and proportional removal/reuse rather than add competing history caches. Architecture DS-001 completed, Small/Low; see design-spec.md. Content readiness: evidence/scope/preserved behavior/traceability/scenario validity Yes; Product N/A. Approved basis ready for design: **Yes**, SR-003 explicit reference above.
