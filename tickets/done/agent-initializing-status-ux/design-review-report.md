# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-initializing-status-ux/tickets/agent-initializing-status-ux/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-initializing-status-ux/tickets/agent-initializing-status-ux/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-initializing-status-ux/tickets/agent-initializing-status-ux/design-spec.md`
- Current Review Round: 2
- Trigger: User clarification routed through `solution_designer`: backend run/member lifecycle status should be authoritative for stale-Error recovery; frontend live-activity recovery should be bounded projection repair only.
- Prior Review Round Reviewed: Round 1
- Latest Authoritative Round: Round 2
- Current-State Evidence Basis: Reviewed revised requirements, investigation notes, and design spec; rechecked the architecture seams named by the design: backend status projection/publication, frontend runtime status owner, stream dispatchers, single/team send orchestration, team aggregation, and status visuals.

Round rules:
- Reuse the same finding IDs across reruns for the same unresolved design-review issues.
- Create new finding IDs only for newly discovered issues.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial review of startup/status UX design package | N/A | No | Pass | No | Passed frontend-centered design with residual risks. |
| 2 | Backend-authoritative lifecycle clarification | No prior findings; prior pass assumptions rechecked against revised backend-authoritative design | No | Pass | Yes | Revised design correctly moves primary stale-Error recovery to backend lifecycle status publication while keeping frontend repair bounded and centralized. |

## Reviewed Design Spec

The revised design keeps the immediate local send acknowledgement and first-class `initializing` lifecycle state from round 1, but corrects the stale-Error architecture: backend run/member lifecycle status is the primary source of truth. After a backend-authored lifecycle `error`, backend projectors/status publishers must publish a newer non-error lifecycle status for the same run/member before or with later recovered activity. Frontend status application remains centralized and status-event driven, with same-subject live activity used only as bounded projection repair for missed/out-of-order backend status events. Client transport/reconnect health is explicitly separated from backend lifecycle status.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design spec lines 31-40 classify Behavior Change + Bug Fix and describe the revised backend-authoritative response. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Missing invariant + shared structure looseness are tied to delayed local acknowledgement, coarse four-status contracts, missing backend recovery publication, and frontend stale status preservation. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Design states a small scoped refactor is needed; fully asynchronous backend provisioning remains intentionally deferred. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Design maps the refactor into backend status projection/publication, frontend status owner extensions, local-submission helper, stream-dispatcher changes, transport/lifecycle separation, and validation. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | N/A | N/A | N/A | Round 1 had no findings. | Rechecked prior pass assumptions after backend-authoritative clarification; no previously unresolved issues exist. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Single-agent offline/new send acknowledgement | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Focused team-member offline/new send acknowledgement | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Backend/runtime status token to UI visual | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Backend recovery status after lifecycle error | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Local user-message placeholder/reconciliation | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend run status | Pass | Pass | Pass | Pass | Correctly centralizes status-event application, local accepted startup, transport/lifecycle separation, and bounded projection repair in `agentRuntimeStatusState.ts`. |
| Frontend send lifecycle | Pass | Pass | Pass | Pass | Existing single/team stores remain orchestration owners and call shared helpers. |
| Frontend local submission | Pass | Pass | Pass | Pass | New helper remains a narrow acknowledgement/reconciliation owner. |
| Backend status projection/publication | Pass | Pass | Pass | Pass | Revised design correctly makes backend projectors/status publishers authoritative for lifecycle recovery after backend lifecycle errors. |
| UI presentation | Pass | Pass | Pass | Pass | Visual components remain render-only and do not infer recovery. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Local user message append/clear/finalize/fail logic | Pass | Pass | Pass | Pass | `services/runSubmission/localUserSubmission.ts` is narrow and shared by single/team stores. |
| Backend error-to-recovery lifecycle publication | Pass | Pass | Pass | Pass | Existing backend status contract/projector/publisher capability is the right owner. If implementation finds duplicated provider policy, extract a small backend lifecycle-status publication helper rather than scattering the invariant. |
| Frontend startup/status-event handling and bounded projection repair | Pass | Pass | Pass | Pass | Central status owner avoids component-level inference. |
| Startup token normalization sets | Pass | Pass | Pass | Pass | Backend and frontend each normalize at their boundary while sharing the same lifecycle vocabulary. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `AgentStatus.Initializing` / backend `"initializing"` | Pass | Pass | Pass | N/A | Pass | Startup accepted/not yet running or idle-ready. Preserve the design's `uninitialized(active) -> initializing` nuance. |
| Backend lifecycle recovery status | Pass | Pass | Pass | N/A | Pass | A newer backend-authored `initializing`/`running`/`idle` supersedes prior same-subject lifecycle `error`. |
| Transport health state | Pass | Pass | Pass | N/A | Pass | Connection/reconnect health is deliberately separate from backend lifecycle status. |
| Local submission handle | Pass | Pass | Pass | N/A | Pass | Handle is scoped to visible message reconciliation, not run orchestration. |
| Team aggregate status | Pass | Pass | Pass | N/A | Pass | Backend-authored active/initializing recovery can beat stale aggregate error while unrecovered member errors remain visible per member. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Four-status-only frontend enum assumptions | Pass | Pass | Pass | Pass | Replace with five-status model. |
| Backend startup-token collapse to running/offline | Pass | Pass | Pass | Pass | Move startup tokens to initializing. |
| Team composer clear after awaited send | Pass | Pass | Pass | Pass | Move to accepted-local-submission phase. |
| Single/team duplicated append timing | Pass | Pass | Pass | Pass | Shared local-submission helper replaces duplication. |
| Backend lifecycle error not followed by backend recovery status | Pass | Pass | Pass | Pass | Backend status publisher/projector emits non-error transition before/with recovered activity. |
| Client transport error conflated with lifecycle `Error` | Pass | Pass | Pass | Pass | Separate transport health state/UI from backend lifecycle status. |
| Stale frontend error despite same-subject backend-authored activity | Pass | Pass | Pass | Pass | Central bounded projection repair only; fallback, not primary architecture. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/services/runSubmission/localUserSubmission.ts` | Pass | Pass | Pass | Pass | Must not grow backend create/connect policy. |
| `autobyteus-web/services/runStatus/agentRuntimeStatusState.ts` | Pass | Pass | Pass | Pass | Correct frontend owner for accepted startup, backend status-event recovery handling, transport/lifecycle separation, and bounded projection repair. |
| `autobyteus-web/services/runHydration/runtimeStatusNormalization.ts` | Pass | Pass | N/A | Pass | Correct raw-token normalization boundary. |
| `autobyteus-web/stores/agentRunStore.ts` | Pass | Pass | Pass | Pass | Owns orchestration order and calls helpers. |
| `autobyteus-web/stores/agentTeamRunStore.ts` | Pass | Pass | Pass | Pass | Owns focused-member/team orchestration and identity. |
| `autobyteus-web/stores/activeContextStore.ts` | Pass | Pass | N/A | Pass | Thin facade; no local-submission internals. |
| `autobyteus-web/services/agentStreaming/AgentStreamingService.ts` | Pass | Pass | N/A | Pass | Status events remain primary; dispatcher can report transport health and invoke bounded same-run repair for backend-authored live activity. |
| `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` | Pass | Pass | N/A | Pass | Must resolve member identity before status application or projection repair. |
| `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts` | Pass | Pass | N/A | Pass | Five-status protocol union must be updated with backend. |
| Status visual composables/components | Pass | Pass | N/A | Pass | Render only. |
| `autobyteus-server-ts/src/agent-execution/domain/agent-status-payload.ts` | Pass | Pass | N/A | Pass | Correct API vocabulary/normalization owner. |
| Runtime-specific backend projectors/status publishers | Pass | Pass | N/A | Pass | Correct source-specific edge; preserve startup status and publish non-error recovery transitions. Avoid duplicating cross-provider invariants if a central helper becomes obvious during implementation. |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-status-aggregation.ts` | Pass | Pass | N/A | Pass | Correct aggregate owner; mixed active/error states need tests. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Send stores -> local submission/status helpers | Pass | Pass | Pass | Pass | Stores call authoritative helpers; components do not infer lifecycle. |
| Active context facade -> run stores | Pass | Pass | Pass | Pass | Facade remains thin. |
| Stream dispatchers -> frontend status helper | Pass | Pass | Pass | Pass | Dispatchers may report transport health and same-subject projection repair; normal lifecycle status still comes from backend status events. |
| UI visuals -> status enums/composables | Pass | Pass | Pass | Pass | No `isSending`, websocket, or content-event status inference. |
| Backend projectors/status publishers -> status payload domain | Pass | Pass | Pass | Pass | Provider-specific edges depend on canonical API status; API domain does not depend on providers. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Backend status contract/projectors/publishers | Pass | Pass | Pass | Pass | Revised design restores backend as lifecycle source of truth. |
| `agentRuntimeStatusState.ts` | Pass | Pass | Pass | Pass | Frontend lifecycle mutation is centralized; projection repair is explicitly bounded. |
| `localUserSubmission.ts` | Pass | Pass | Pass | Pass | Message mutation is encapsulated; run lifecycle remains outside. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `AgentStatusPayload.status` | Pass | Pass | Pass | Low | Pass |
| `TeamStatusPayload.status` | Pass | Pass | Pass | Low | Pass |
| `beginLocalUserSubmission` | Pass | Pass | Pass | Low | Pass |
| `applyAcceptedStartupStatus` | Pass | Pass | Pass | Low | Pass |
| `applyBackendLifecycleStatus` / existing status handler | Pass | Pass | Pass | Medium | Pass |
| `applyTransportHealthState` | Pass | Pass | Pass | Medium | Pass |
| `applyLiveRuntimeActivityProjectionRepair` | Pass | Pass | Pass | Medium | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/services/runSubmission/` | Pass | Pass | Low | Pass | New off-spine local UI message acknowledgement concern. |
| `autobyteus-web/services/runStatus/` | Pass | Pass | Low | Pass | Existing frontend lifecycle domain area. |
| `autobyteus-web/services/runHydration/` | Pass | Pass | Low | Pass | Existing frontend normalization area. |
| `autobyteus-server-ts/src/agent-execution/domain/` | Pass | Pass | Low | Pass | API lifecycle status vocabulary belongs here. |
| Runtime-specific backend projector/publisher files | Pass | Pass | Medium | Pass | Acceptable because provider edges own raw event mapping; use a central helper if the invariant would otherwise duplicate. |
| `autobyteus-server-ts/src/agent-team-execution/domain/` | Pass | Pass | Low | Pass | Team status aggregation belongs here. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Backend lifecycle status source of truth | Pass | Pass | N/A | Pass | Extend existing status payload/projector/publisher surfaces. |
| Frontend runtime status transition policy | Pass | Pass | N/A | Pass | Extend existing status owner. |
| Runtime token normalization | Pass | Pass | N/A | Pass | Extend frontend/backend normalizers. |
| Send orchestration | Pass | Pass | N/A | Pass | Extend stores. |
| Immediate message append/clear/reconcile | Pass | Pass | Pass | Pass | New helper is justified. |
| Status rendering | Pass | Pass | N/A | Pass | Extend existing visual mapping. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Four-status API/UI assumption | No | Pass | Pass | Clean-cut five-status model. |
| Component-level initializing inference | No | Pass | Pass | Explicitly rejected. |
| Startup tokens normalized as running/offline | No | Pass | Pass | Explicit removal in scope. |
| Frontend-only content-handler recovery | No | Pass | Pass | Explicitly rejected; backend emits recovery status, frontend only repairs projection centrally when status event is missed/out-of-order. |
| Transport error as lifecycle error | No | Pass | Pass | Explicitly rejected. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Status enum/protocol/backend projection rollout | Pass | Pass | Pass | Pass |
| Backend recovery-status publication after lifecycle error | Pass | Pass | Pass | Pass |
| Transport/lifecycle separation | Pass | Pass | Pass | Pass |
| Local submission helper and store migration | Pass | Pass | Pass | Pass |
| Streaming projection-repair fallback | Pass | Pass | Pass | Pass |
| Tests for AC-001 through AC-011 | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Offline send acknowledgement | Yes | Pass | Pass | Pass | Good/bad shape maps to the observed delayed acknowledgement. |
| Status normalization | Yes | Pass | Pass | Pass | Startup tokens are clearly separated from active running. |
| Backend error recovery | Yes | Pass | Pass | Pass | Example correctly makes backend `AGENT_STATUS` recovery primary. |
| Transport/lifecycle separation | Yes | Pass | Pass | Pass | Prevents client-only connection issues from overwriting lifecycle status. |
| Bounded projection repair | Yes | Pass | Pass | Pass | Clear fallback shape that avoids component-level inference. |
| Terminal error retention | Yes | Pass | Pass | Pass | Protects genuine unrecovered errors. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Exact UI color/copy for `Initializing` | Cosmetic, not architectural. | Choose during implementation within existing visuals. | Non-blocking. |
| Provider-specific event ordering | Backend should publish recovery status before/with activity, but providers may expose different event signals. | Add provider-specific tests and, if repeated logic appears, use a central backend recovery publication helper. | Non-blocking residual risk. |
| Team aggregate mixed states | Team row behavior changes when one member is active/recovered and another remains errored. | Test active/initializing precedence and member-level unrecovered error visibility. | Non-blocking residual risk. |
| Transport health surface | Requirement is separation from lifecycle, not a full transport-banner redesign. | Implement the minimal separate state/surface needed to avoid lifecycle overwrite. | Non-blocking residual risk. |

## Review Decision

- `Pass`: the revised design is ready for implementation.

## Findings

None.

## Classification

N/A — no blocking findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Backend recovery status must be emitted by backend lifecycle projection/publication, not inferred by frontend components. If implementing this across providers starts duplicating the same “prior error + later work => recovery status” policy, extract a small backend lifecycle-status publication helper under the backend status owner rather than scattering the invariant.
- `initializing` remains non-interruptible (`canInterrupt=false`) while still counting as active for running-list/history/termination visibility.
- Preserve `uninitialized(active) -> initializing`; inactive/missing/stopped runs should remain offline.
- Transport/reconnect health must not permanently set run/member lifecycle status to `Error`; if shown, it should be a separate connection health state/surface.
- Update backend protocol unions, frontend protocol unions, docs, and any generated artifacts together so `initializing` is accepted end-to-end.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Round 2 supersedes round 1. Implement the backend-authoritative recovery correction: backend publishes same-subject non-error lifecycle status after recovery/work following lifecycle `error`; frontend status-event handling remains primary and live-activity repair remains bounded and centralized.
