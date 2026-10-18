# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-002`
- Package identifier: `chat-socket-content-cadence` (Project Task autobyteus-139)
- Request / ticket: one content cadence for every chat socket
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Requirements owner: Solution Designer
- Date: 2026-10-18
- Approved by and reference: `Solution Designer within the direction (user informed)`. The direction is DEC-004 of PB-001 (decided under the user's delegation, 2026-10-18) and the Task text. The user is informed in the Solution Designer conversation, 2026-10-18.
- Exact approved requirements baseline / solution revision: SR-002 (SR-001 plus AC-009 and the AC-002 wording; verification refinement of the already approved SCN-002 "possibly in parallel", intended behavior unchanged)
- Behavior-defining supplements and their approved versions: None

## Problem And Desired Outcome

- Problem: The "Live response streaming" setting (default 500 ms) batches live reply text only on the standalone Agent socket. Team, Org and delegated-agent sockets send every delta as its own frame. In those streams each delta is also preceded by its own sequenced "running" status, so they send about 2 frames per delta. This reintroduces the per-delta renderer load that the August cadence ticket removed (renderer up to 85.8% CPU), on exactly the multi-agent surfaces where it matters most.
- Desired outcome: every chat socket delivers ordinary reply text at the configured cadence, with unchanged ordering and gap-free sequence semantics.
- Observable definition of success: per socket, a 30-delta burst arrives as one coalesced frame after the window. Boundaries flush earlier text first. Clients never detect a sequence gap.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | Standalone socket coalesces | Same | All of PB-001 | probe |
| BEH-002 | User | SCN-002 | Team: 30 deltas → 30 frames | Coalesced per window | Team ordering, status, tools | probe |
| BEH-003 | User | SCN-003 | Org: 30 deltas → 30 frames | Coalesced per window | Org ordering | probe |
| BEH-004 | User | SCN-004 | Delegated agent: 30 deltas → 30 frames | Coalesced per window | Collaboration ordering | probe |
| BEH-005 | Contract | SCN-002..004 | Clients require gap-free sequences | Clients still never see a gap or a reorder; a coalesced frame declares the contiguous sequences it covers | Snapshot/inspection base alignment | client code |
| BEH-006 | System | — | Applications, lifecycle observers and inspections read root events unthrottled | Same | Unthrottled domain stream | subscribers |
| BEH-007 | System | all | Boundaries flush earlier content first | Same on every socket | — | scheduler |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User watching Team/Org/delegated agents | Responsive app during multi-agent streaming | Batched text | No lost or reordered text |
| Applications on Team roots | Consume agent output | Unchanged | No cadence delay |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Team chat honours the content cadence | SCN-002 |
| UC-002 | Org chat honours the content cadence | SCN-003 |
| UC-003 | Delegated-agent chat of a standalone run honours the content cadence | SCN-004 |
| UC-004 | Streaming docs describe all four chat sockets and the cadence correctly | — |

### Out Of Scope

- The standalone socket's behavior (PB-001 shipped it); the cadence setting itself (range, default, UI).
- Applications, memory, history, raw traces, lifecycle observers and other root-event consumers: they stay unthrottled.
- Client rendering changes beyond accepting a covered sequence range.
- `AgentRun` input-state cleanup (autobyteus-140).
- Version-skew compatibility between desktop and remote nodes (no promise exists today; not added).

### Non-Goals

- No new performance targets beyond the existing setting; no renderer redesign.

### Preserved Behavior Boundary

BEH-001, BEH-005 (no gap/reorder), BEH-006, BEH-007; REQ-003, REQ-004, REQ-005; AC-004, AC-005, AC-006.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Team, Org and delegated-agent sockets deliver ordinary reply text of one agent/turn/segment at most once per configured window, unless a boundary arrives first. | BEH-002..004 | Must | One setting, every chat | DEC-004 (PB-001) |
| REQ-002 | Identical repeated status companions within a window must not split or flush the pending text (the routine "running" before every delta). | BEH-002..004 | Must | Otherwise coalescing never happens on sequenced streams | Investigation |
| REQ-003 | On sequenced sockets, clients never see a sequence gap or reorder. Every root sequence number is covered exactly once, in order, by the frames a connection receives after its snapshot base. | BEH-005 | Must | Correctness of client state | Client contract |
| REQ-004 | Lifecycle, tool, error, terminal, non-running status and every other non-content message flush earlier pending text before being sent. | BEH-007 | Must | Ordering | Task |
| REQ-005 | Root-event consumers other than chat sockets receive every event unthrottled and unchanged. | BEH-006 | Must | Protocol doc; applications | Cadence ticket |
| REQ-006 | The streaming protocol and module docs list all four chat sockets and describe where the cadence applies. | — | Must | FU-003 | Task |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | BEH-002..004 | Per socket: 30 deltas, each preceded by an identical "running" status, 500 ms window | 0 content frames before 350 ms; one coalesced frame with the exact concatenated text after the window | — | One cadence integration case per socket (Team, Org, collaboration) |
| AC-002 | REQ-003 | BEH-005 | Same, and the AC-009 interleaving | Every root sequence after the snapshot base is covered exactly once, contiguous and in order, by the received frames (a batch frame covers its whole range); the client context accepts them without reopen | A gap → test fails | Socket case + web context unit tests |
| AC-003 | REQ-001 | BEH-002..004 | Interval changed while open | The next newly opened window uses the new interval | — | One socket case |
| AC-004 | REQ-004 | BEH-007 | Pending text, then a boundary (segment end, tool, error, terminal status, token usage, task event) | Pending text is delivered first, then the boundary; sequences are contiguous | — | Socket cases |
| AC-005 | REQ-005 | BEH-006 | Application source on a Team root; Team lifecycle observer | Receives every delta and status, unthrottled | — | Existing tests stay green, plus one assertion |
| AC-006 | REQ-001..005 | BEH-001 | Existing suites | Server `test:unit`, `test:integration`, `typecheck`; web stream tests; PB-001 cases green | — | Suite runs |
| AC-007 | REQ-001, REQ-003 | SCN-002..004 | Isolated app instance with a test data package (TESTING.md): a Team, an Org and a standalone run with a delegated agent, each streaming a real answer | Socket traces show window-spaced content frames, no client reopen/recovery error, correct final text; screens update smoothly | — | Real-app check |
| AC-009 | REQ-001, REQ-002, REQ-003 | BEH-002..004 / SCN-002..004 | Two agents (or two segments) stream in parallel: their deltas and identical "running" statuses interleave in one root stream, 500 ms window | 0 content frames before 350 ms; after the window one batch frame whose items hold each agent's exact concatenated text, in order per agent, covering the whole contiguous range | A boundary from either agent closes the batch first | One interleaved case per socket |
| AC-008 | REQ-006 | — | Docs | Both docs list 4 sockets and the cadence scope accurately | — | Review |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User | Standalone chat | Send to an Agent | — | Streams | Batched (unchanged) | — | Supported Normal Scenario | PB-001 | AC-006 |
| SCN-002 | User | User | Watch Team members answer | Run an Agent Team | Team running | Members stream, possibly in parallel | Batched per member/segment | Errors/terminal flush first | Supported Normal Scenario | Cadence ticket UC-002 | REQ-001..004 |
| SCN-003 | User | User | Watch an Org | Run an Agent Organization | Org running | Members stream | Batched | Same | Supported Normal Scenario | Flat Org feature (`37d05c7f71`) | REQ-001..004 |
| SCN-004 | User | User | Watch a delegated task agent | Agent delegates with `delegate_task` | Child running | Child streams | Batched | Same | Supported Normal Scenario | `c2f69edde2` | REQ-001..004 |

## UI, Interaction, And Experience Requirements

- Applicable: `No`. No UI change; existing live-text rendering receives fewer, larger updates. Product design fields: N/A — not applicable.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001 / AC-001, AC-007 | Performance | At 500 ms, ordinary content frames ≤ 2.2/s per continuously active identity, excluding boundary flushes (same bar as cadence AC-003) | Team, Org, collaboration | Socket cases + live trace |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Collaboration/Team stream DTOs | A frame may cover a contiguous sequence range; an uncoalesced frame's meaning is unchanged | Design | Remote-node version skew (RSK-003, existing policy) |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `evidence/validity-probe.*` | Validity | REQ-001 | Final | Evidence only |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Desktop web and server ship together; remote-node skew is not promised (strict DTOs today) | A contract addition is acceptable | Existing protocol policy | Validated (static) |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Where does batching happen for sequenced streams? | Ordering, applications, gap-free sequences | (1) before the root publisher; (2) a second presentation publisher; (3) per connection with covered ranges | (1) delays applications (violates REQ-005). (2) splits sequence spaces and breaks the Team inspection/snapshot base check. (3) keeps the domain stream, snapshot barrier and bases untouched, and is the same "regulator at the tap" as `/ws/agent`. **Option 3.** | Solution Designer | Decided |
| DEC-002 | Absorb repeated "running" statuses? | Without it, every delta is split by a status | Identical repeats carry no information (the `/ws/agent` filter already suppresses them) | **Absorb identical repeats into the covered range; any changed status is a boundary.** | Solution Designer | Decided |
| DEC-003 | Release and user check | Task "Done when" | RELEASE.md | Merge, then ship with the next beta when the user asks; the user's check follows | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001..003 | BEH-002..004 | AC-001, AC-003, AC-007, AC-009 | SCN-002..004 | probe |
| REQ-002 | UC-001..003 | BEH-002..004 | AC-001 | SCN-002..004 | — |
| REQ-003 | UC-001..003 | BEH-005 | AC-002, AC-007, AC-009 | SCN-002..004 | — |
| REQ-004 | UC-001..003 | BEH-007 | AC-004 | all | — |
| REQ-005 | — | BEH-006 | AC-005 | — | — |
| REQ-006 | UC-004 | — | AC-008 | — | — |

## Architecture Phase Input

- Constraints: domain root stream unchanged; gap-free sequences; snapshot/inspection bases unchanged.
- Deferred to architecture: the covered-range field shape; the sequenced-mode rules.
- Risks: UNK-001, RSK-001..003.

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

- Approval recorded: `Yes`
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
