# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `agy-background-task-turn-liveness`
- Request / ticket: AGY member errors ("Antigravity runtime stopped unexpectedly") after starting a long-running background command (`pnpm dev`) inside an AutoByteus Org
- Requirements owner: Solution Designer (`/solution_designer`)
- Date: 2026-09-28
- Approval state and reference: Approved by the user in the Solution Designer conversation on 2026-09-28 ("I think you understand the anti gravity quite good now. I think you can have reasonable design. Please go ahead. I approve."), approving the two-change proposal presented immediately before (remove the mid-turn idle watchdog; close unfinished background tool steps at turn end), its explicit exclusions, and the separate-ticket treatment of the Terminate defect.
- Exact approved requirements baseline / solution revision: SR-001 (this document)
- Behavior-defining supplements and their approved versions: N/A — none

## Problem And Desired Outcome

- Problem: AutoByteus kills a healthy Antigravity (AGY) process when AGY sends no stream event for 5 minutes during a turn. AGY legitimately goes silent while a background command runs, because it withholds later step updates behind a still-running step. The kill surfaces as "Antigravity runtime stopped unexpectedly", takes the member offline, and (via a separate Terminate defect) can leave the whole Org unusable. Separately, a daemon command's tool card never finishes because AGY never reports `DONE` for it.
- Affected actors or systems: users running AGY agents standalone, in Teams, or in Orgs; AGY backend in `autobyteus-server-ts`.
- Desired outcome: starting a long-running or daemon command and continuing to work is a normal, non-breaking AGY workflow, consistent with the Codex and Claude runtimes.
- Observable definition of success: an AGY turn that stays silent for more than 5 minutes while a background command runs completes normally; a daemon command's tool card ends in a non-error "running in background" state when the turn ends.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001, SCN-002 | After 300 s with no AGY stream event during a turn, AutoByteus SIGTERMs AGY and reports "Antigravity runtime stopped unexpectedly"; run goes offline. | No time-based kill during a turn. A turn ends only on AGY `result`, AGY process exit / stream failure, or user Stop/Terminate. | Startup readiness timeout (60 s); process-exit, stream-protocol, line-size and stdin-write failure handling. | CUR-3; incident trace (300.0 s gap) |
| BEH-002 | User | SCN-001 | A tool step that AGY never reports as finished (daemon started with `IsDaemon`) stays open after the turn ends (spinner; tool call without result in memory). | When the AGY turn ends while a started tool step is still unfinished, that step is shown and recorded as succeeded with a clear "started as a background task; still running" result. | Steps that AGY reports `DONE`/`ERROR` keep their current success/failure/denial semantics; user Stop / process death keep "interrupted" semantics. | CUR-4; probe P1 |
| BEH-003 | System | SCN-002 | Non-daemon background task holds the AGY turn open; completion notification and model reaction arrive in the same turn. | Unchanged; works end-to-end once BEH-001 is fixed, regardless of how long the task runs. | Same. | CUR-5; probe P2 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User running AGY agents | Let agents run servers/builds/tests while continuing work | No false runtime failure; accurate tool cards | Simple change, no over-engineering |
| AGY agent (model) | Use `run_command` background/daemon and `manage_task` normally | Its turn is not killed by AutoByteus while it works | AGY stream is in-order and may be silent |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- UC-001: An AGY agent starts a daemon (e.g. dev server) and keeps working for any length of time in the same turn (SCN-001).
- UC-002: An AGY agent starts a non-daemon background command that runs longer than 5 minutes; the turn stays open until it completes (SCN-002).

### Out Of Scope

- Org/Team Terminate robustness when a member runtime already died, and the UI offering restore while the Org is still registered (separate ticket "Ticket B").
- The identical 5-minute idle kill in the ACP/Grok backend (`ACP_TURN_IDLE_TIMEOUT_MS`) — separate-ticket candidate.
- Live progress during AGY's withheld-stream window (e.g. reading AGY's internal transcript files).
- Any UI hint/banner about withheld AGY progress.
- Any replacement safety timeout, background-process manager, or reporting to Google (optional, non-code).

### Non-Goals

- Changing AGY's own background-task behavior or stream ordering.
- Changing behavior of other runtimes.

### Preserved Behavior Boundary

- Preserved: BEH-001 preserved column; BEH-002 preserved column; all existing AGY converter semantics for `DONE`/`ERROR`/denial/native image; existing `TURN_INTERRUPTED` handling on user Stop and process death.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate. It is not a required design correction.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | AutoByteus must not end, fail, or stop an AGY turn or process because no AGY stream event arrived for some period of time during a turn. | BEH-001, BEH-003 | Must | AGY silence is normal while a background task runs; other runtimes have no mid-turn idle kill. | User approval SR-001; CUR-2/3/5 |
| REQ-002 | An AGY turn must still end on AGY `result`, AGY process exit/error, stream protocol violation, or user Stop/Terminate, exactly as today. | BEH-001 | Must | Preserve real failure detection and user control. | User approval SR-001 |
| REQ-003 | When an AGY turn ends (AGY `result`) while a tool step that started in that turn has not been reported finished, AutoByteus must present and record that step as succeeded with a result stating it was started as a background task and was still running when the turn ended. | BEH-002 | Must | Accurate, non-spinning tool cards for daemons; no dangling tool calls. | User approval SR-001; CUR-4 |
| REQ-004 | Existing AGY tool, text, denial, native-image, token-usage, turn-error and interruption semantics must remain unchanged for steps AGY reports finished and for user Stop / process death. | BEH-002 | Must | Bounded change. | Preserved boundary |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-001 / SCN-001, SCN-002 | AGY turn in progress; no stream event for more than 5 minutes (simulated time) | AGY process is not stopped; no `AGY_TURN_IDLE_TIMEOUT` / `AGY_PROCESS_ERROR`; a later `result` completes the turn normally | — | Unit test with fake timers on the stream process |
| AC-002 | REQ-003 | BEH-002 / SCN-001 | Tool step `ACTIVE` with no `DONE`/`ERROR`, then `result` SUCCESS | One `TOOL_EXECUTION_SUCCEEDED` for that invocation (same invocation id, tool name, arguments) with `provider_state: "RUNNING"` and the background-task output text, emitted before `TURN_COMPLETED` | Non-SUCCESS `result`: the unfinished step is also closed as background before the turn error | Converter unit test |
| AC-003 | REQ-004 | BEH-002 | Steps reported `DONE`/`ERROR`/denied, native image, text, usage | Emitted events unchanged; no extra background closure for finished steps | User Stop / process close mid-turn still yields `TURN_INTERRUPTED` (and "Tool execution interrupted." in memory), not background success | Existing converter/lifecycle tests stay green + one interruption regression assertion |
| AC-004 | REQ-001, REQ-002 | BEH-003 / SCN-001, SCN-002 | Real AGY: daemon started, then further work; and non-daemon background task running > 5 minutes | Turn completes with all withheld steps delivered; daemon card ends in background state; no runtime error | Process kill / Stop still ends the turn | Live/E2E validation using the preserved probes pattern (opt-in real AGY) |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | AGY agent in an Org/Team/standalone run | Start a dev server and keep working (edit, build, screenshot, hand off) | Chat message / inter-agent task to an AGY member | AGY run active | Agent runs `pnpm dev` with `IsDaemon`; AGY backgrounds it; agent continues; AGY withholds later steps; agent finishes; `result` | Turn completes; withheld steps appear; dev-server card shows "running in background" | User Stop ends the turn as interrupted | Supported Normal Scenario | Incident 2026-09-28; probe P1 | REQ-001..004 / AC-001..004 |
| SCN-002 | User | AGY agent | Run a long build/test in the background and react to its completion | Same | AGY run active | Agent backgrounds a non-daemon command; turn stays open; AGY injects completion notification; agent reacts; `result` | Turn completes after the task, however long | Same | Supported Normal Scenario | Probe P2 | REQ-001, REQ-002 / AC-001, AC-004 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` (existing tool-card rendering of a succeeded result is reused; no new UI)
- Linked UI/UX or interaction supplement, prototype, Product ticket, revision, confirmation, visual baseline: N/A — not applicable

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001 / AC-001 | Reliability | Zero AutoByteus-initiated AGY terminations caused by stream silence | Any turn duration | Unit + live validation |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No` (new turns may record a result for a daemon tool call that previously stayed without result; no schema change; historical traces untouched)

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| AGY CLI stream-json (1.2.12) | `result` ends a turn; process exit is observable | Probes P1, P2 | Stream ordering/withholding is undocumented and may change; design does not depend on it |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `probes/agy-daemon-stream-order-probe.py` | Real-AGY reproduction of SCN-001 | AC-002, AC-004 | Evidence | Not behavior-defining |
| `probes/agy-background-task-turn-end-probe.py` | Real-AGY reproduction of SCN-002 | AC-004 | Evidence | Not behavior-defining |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Stopping the AGY process also stops its background tasks | User Stop remains an adequate control; no process manager needed | Observed after incident and probes; API/E2E may re-check | Supported by evidence |

## Open Decisions And Questions

| Decision / Question ID | Question | Why It Matters | Options / Evidence | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Keep a longer safety timeout? | Simplicity vs. stuck-turn protection | User approved no replacement timer; Stop is the control (matches Codex/Claude) | User | Resolved — no timer |
| DEC-002 | Live progress / UI hint during withheld window? | Visibility | User approved exclusion | User | Resolved — excluded |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Prototype Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001, UC-002 | BEH-001, BEH-003 | AC-001, AC-004 | SCN-001, SCN-002 | P1, P2 |
| REQ-002 | UC-001, UC-002 | BEH-001 | AC-004 | SCN-001, SCN-002 | — |
| REQ-003 | UC-001 | BEH-002 | AC-002, AC-004 | SCN-001 | P1 |
| REQ-004 | UC-001 | BEH-002 | AC-003 | SCN-001 | — |

## Architecture Phase Input

- Approved scenarios: SCN-001, SCN-002.
- Constraints: keep startup timeout and all failure detection; no new UI/contract; minimal change.
- Deferred to design: how the converter remembers open step payloads; exact background output text.
- Technical facts verified: see investigation notes (idle timer containment; converter open-step gap; `provider_state` consumers).

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Prototype and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and open decisions are visible: `Yes`
- Content ready for user approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- User approval received: `Yes`
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
