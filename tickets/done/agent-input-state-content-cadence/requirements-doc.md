# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `agent-input-state-content-cadence` (Project Task PB-001)
- Request / ticket: PB-001 — premature flushing of ordinary Agent response text when input-state events are published
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on the user's go-ahead of 2026-10-18
- Requirements owner: Solution Designer
- Date: 2026-10-18
- Approved by and reference: `Solution Designer within the direction (user informed)`; reference: Solution Designer conversation message of 2026-10-18 reporting validity and decisions DEC-001..DEC-003
- Exact approved requirements baseline / solution revision: SR-001 (this document as of 2026-10-18)
- Behavior-defining supplements and their approved versions: None

## Problem And Desired Outcome

- Problem: On current `origin/personal` (`2f211340ee`, v1.5.6-beta.1+2) the server-side response cadence never holds content for its window. After every dispatched event batch the run publishes an unchanged `AGENT_INPUT_STATE`, and the WebSocket cadence treats every input-state frame as an ordering boundary, so pending text is flushed about 15 ms after each burst. The defect is still valid and has the same form as recorded on 2026-10-17.
- Affected actors or systems: users watching a live Agent response; the agent WebSocket stream; any client of `AGENT_INPUT_STATE`.
- Desired outcome: ordinary text content is coalesced for the configured window again, while real input-queue changes are still shown immediately and in order.
- Observable definition of success: the two integration cases pass unweakened; a real stream shows coalesced content frames at the configured cadence; queued-message state still appears immediately.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User/System | SCN-001 | An unchanged input-state frame after every batch flushes pending content; no coalescing window holds | Content within one window is delivered as one coalesced frame at the window's end, unless a real boundary arrives first | Content text, order and completeness | Repro runs 1-3; probe-trigger log |
| BEH-002 | User | SCN-002 | A changed input state is published immediately and flushes earlier content first | Same | Immediate queue projection; content-before-change ordering | agent-run.ts L202, L378 |
| BEH-003 | Contract | SCN-003 | New subscriber receives a snapshot | Same; and every subscriber still receives every new revision | Snapshot on connect/reconnect | agent-run.ts L160-166 |
| BEH-004 | System | SCN-001, SCN-004 | Lifecycle/tool/error/terminal boundaries flush pending content first | Same | Boundary ordering | scheduler classify; integration cases 1-3, 6, 7 |
| BEH-005 | Operational | SCN-004 | Changed interval applies to the next newly opened window (case currently failing because of BEH-001) | Same, observable again | Live interval setting semantics | test L379-436 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User watching a live response | Read a steadily updating answer | Text arrives in configured-window batches | No lost or reordered text |
| User queuing a message during a run | See the queue reflect their message | Queue state appears immediately | Not delayed by the content window |
| Web/team/collaboration clients | Project input state by revision | Every new revision received; no behavior change for repeats | Frame schema unchanged |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Live Agent text response honours the server content cadence on the agent WebSocket | SCN-001, SCN-004 |
| UC-002 | Input-queue state changes are projected immediately and in order, including to new and reconnecting subscribers | SCN-002, SCN-003 |

### Out Of Scope

- Team-stream content coalescing (team `SEGMENT_CONTENT` uses `segment_id`, which the coalescer does not recognize; FU-001). A separate follow-up.
- Changing the cadence scheduler's classification of companion types, the cadence setting, or the client renderer.
- Input-delivery, queue or recovery refactors; any change to what an input-state revision contains.
- Live-node repair. Release happens only through the normal delivery route with the next beta.

### Non-Goals

- No new streaming performance target beyond restoring the existing configured window.
- No reduction of other per-batch traffic besides the redundant input-state repeats.

### Preserved Behavior Boundary

BEH-002, BEH-003, BEH-004, BEH-005; REQ-002, REQ-003, REQ-004; AC-003, AC-004. The five currently passing cases of `agent-status-websocket.integration.test.ts` stay green.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | When the input state has not changed, no input-state frame that a subscriber already received may be sent to it again, so routine batches do not end the content window early. | BEH-001 | Must | Root cause is a redundant, information-free frame | DEC-001 |
| REQ-002 | Every changed input state (new revision) is still delivered to every current subscriber immediately, after any content that preceded it. | BEH-002, BEH-004 | Must | Keep queue projection immediate and ordered | Task constraint |
| REQ-003 | A new or reconnecting subscriber still receives the current input-state snapshot on subscribe, and no subscriber misses a revision first produced by a snapshot or pull read. | BEH-003 | Must | Hydration correctness | RSK-001 |
| REQ-004 | Lifecycle, tool, error, terminal and non-running status frames keep flushing pending content before themselves. | BEH-004 | Must | Ordering invariant | Task constraint |
| REQ-005 | The two cadence integration cases pass without weakening their timing assertions, filters or error handling. | BEH-001, BEH-005 | Must | Regression proof | Task "Done when" |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-005 | BEH-001, BEH-005 / SCN-001, SCN-004 | `agent-status-websocket.integration.test.ts`, unchanged | All 7 cases pass, including "coalesces a representative fine-grained canonical stream…" and "uses a changed interval only…", on repeated runs | Any failure blocks | Server integration, ≥3 runs |
| AC-002 | REQ-001 | BEH-001 / SCN-001 | A subscriber connected to a running run; several content batches with no input change | Not one `AGENT_INPUT_STATE` frame reaches the subscriber after its snapshot; content stays pending until the window ends | — | Producer-to-socket test that does not filter `AGENT_INPUT_STATE` |
| AC-003 | REQ-002, REQ-004 | BEH-002 / SCN-002 | Content pending in an open window, then a message is posted or queued | A new-revision `AGENT_INPUT_STATE` arrives immediately (before the window ends) and after the pending content | — | Producer-to-socket test |
| AC-004 | REQ-003 | BEH-003 / SCN-003 | (a) socket subscribes or reconnects; (b) the revision advanced through a snapshot or pull read before the next publish | (a) the subscriber gets the current snapshot; (b) every existing subscriber still receives that revision | — | AgentRun unit tests |
| AC-005 | REQ-001, REQ-004 | BEH-001, BEH-004 / SCN-001 | A real Agent text response (scripted/real runtime through the real server, or isolated app instance per TESTING.md) | Socket trace shows coalesced `SEGMENT_CONTENT` frames spaced by the configured window, no input-state repeats between them, and boundaries after content | — | Real-stream regression proof + isolated-instance check |
| AC-006 | REQ-002..004 | BEH-002..004 | Existing suites | Server `test:unit`, `test:integration`, `typecheck` and web input-state handler tests stay green | — | Suite runs |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User in chat | Watch a live text answer | Send a message to an Agent | Agent idle, chat open | Agent streams many small deltas | Text updates once per configured window; segment/turn end flush the remainder | Error/terminal flush remainder first | Supported Normal Scenario | Live response streaming feature (`3b5144a0be`) | REQ-001, REQ-004, REQ-005 / AC-001, AC-002, AC-005 |
| SCN-002 | User | User in chat | Queue a follow-up while the Agent answers | Send while running | Agent streaming | Message admitted, shown as pending; later dispatched | Pending state appears at once; earlier text is not reordered after it | Rejected admission unchanged | Supported Normal Scenario | Held-input feature (`6908ccff48`) | REQ-002 / AC-003 |
| SCN-003 | Contract | WebSocket client | Hydrate queue state on connect/reconnect | Open `/ws/agent/:runId` | Run live | Subscribe → snapshot → later revisions | Client has the current and every later revision | — | Supported Normal Scenario | agent-run.ts L160-166 | REQ-003 / AC-004 |
| SCN-004 | Operational | User changes Live response streaming interval | New window uses new interval | Settings | Socket open | Change setting mid-stream | Next window uses new value | — | Supported Normal Scenario | integration case | REQ-005 / AC-001 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` — no UI change; the restored behavior is the existing cadence.
- All Product design fields: N/A — not applicable.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001 / AC-001, AC-005 | Performance | With a 500 ms window, zero content frames before 350 ms of a burst and one coalesced frame after the window | Agent WebSocket | Integration + real stream |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| `AGENT_INPUT_STATE` frame (`agentInputStateSchema`) | Shape and revision semantics unchanged | contracts package; web handler dedupes by revision | None |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `evidence/` (repro and probe logs) | Validity and feasibility evidence | REQ-001..003 | Final | Evidence only, not behavior-defining |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | No consumer uses repeated unchanged input-state frames as a heartbeat | Suppression would otherwise remove a signal | Grep of all consumers (investigation notes) | Validated |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Which correction? | Determines ordering and traffic | (1) make `AGENT_INPUT_STATE` a safe companion in the scheduler; (2) publish only revisions subscribers have not received | Option 1 would forward a *real* queue change ahead of earlier pending text, inverting producer order and weakening BEH-002/BEH-004; it also keeps sending redundant frames to every consumer. Option 2 removes the actual cause (an information-free repeat), keeps every real change as an ordered boundary, is invisible to clients (they already ignore same-revision frames), and touches only the producer. Probe B proved it passes all 7 cases and 2282 related unit tests. **Option 2.** | Solution Designer (Task: "engineering owner decides the smallest appropriate correction") | Decided |
| DEC-002 | Fix team-stream coalescing (`segment_id`) here? | Similar symptom in team chats | Static evidence only; a different cause | Separate cause and blast radius; keep this ticket bounded. **Follow-up FU-001 to the PTM.** | Solution Designer | Decided |
| DEC-003 | Change the test's `AGENT_INPUT_STATE` filter? | Could hide or expose the trigger | Filter is in `captureMessages` | Keep the two cases unchanged (REQ-005); add separate coverage that does not filter input state (AC-002, AC-003). | Solution Designer | Decided |

| DEC-004 | Should Team, Org and child-agent (delegated task agent) chats also follow "Live response streaming"? | One user setting should behave the same on every chat surface | Today only the standalone chat batches: Team content is not recognised (`segment_id`), and Org/collaboration sockets have no egress | One visible setting should mean one behaviour; Org chats, with several agents streaming at once, benefit most. **Yes, in a separate follow-up Task (FU-001 + FU-002 + docs FU-003), not in PB-001.** That Task first verifies the static finding, as PB-001 did. | Solution Designer (user delegated the decision, 2026-10-18: "I trust that you can make a reasonable decision for me") | Decided |
| DEC-005 | Send follow-ups now or at delivery? | PB-001 was parked for 10 days once already | — | **Send now, ordered:** PB-001 first, then the combined batching Task with docs, then the `AgentRun` cleanup (FU-004, which touches the same file as PB-001). | Solution Designer (same user delegation) | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-002, AC-005 | SCN-001 | evidence/ |
| REQ-002 | UC-002 | BEH-002, BEH-004 | AC-003, AC-006 | SCN-002 | — |
| REQ-003 | UC-002 | BEH-003 | AC-004, AC-006 | SCN-003 | probe-option2 logs |
| REQ-004 | UC-001 | BEH-004 | AC-003, AC-005, AC-006 | SCN-001 | — |
| REQ-005 | UC-001 | BEH-001, BEH-005 | AC-001 | SCN-001, SCN-004 | repro logs |

## Architecture Phase Input

- Approved scenario IDs: SCN-001..SCN-004.
- Constraints: frame schema unchanged; scheduler unchanged; snapshot on subscribe unconditional.
- Deferred to architecture: exact delivered-revision bookkeeping.
- Technical facts to verify: snapshot/pull read paths that advance the revision (RSK-001).
- Known risks: RSK-002 (other flush triggers in real streams).

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and decisions are visible, each decision with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- Approval recorded: `Yes` (Solution Designer within the direction; user informed)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
