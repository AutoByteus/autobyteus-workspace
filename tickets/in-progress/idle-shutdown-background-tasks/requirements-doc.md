# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-002`
- Package identifier: `idle-shutdown-background-tasks`
- Request / ticket: Project Task from `/project_task_manager` (2026-10-08), source report `problem-report.md`
- Requirements owner: solution_designer
- Date: 2026-10-08
- Approval state and reference: Approved by the user on 2026-10-08 in the Solution Designer conversation. Direction: "the agent shouldn't stop working just because being idle for a long time"; question "do we still need it? … now people manage via task. when task is done, the resources are released"; decision "yes. i think we should remove it. lets go" (DEC-004 = remove idle shutdown)
- Exact approved requirements baseline / solution revision: this document at SR-002 (REQ-001..005, AC-001..008, SCN-001..004, DEC-004 decided, DEC-001/002 superseded, DEC-003 deferred)
- Behavior-defining supplements: none (`problem-report.md` is evidence only)

## Problem And Desired Outcome

- Problem: A delegated agent that starts a background task (for example a release monitor or a long build) and ends its turn is reported `idle`. After the idle-shutdown grace period (default 10 min) the server shuts the delegated run down, because its quiet check ignores running background tasks. Shutdown kills the background task. The completion notification never arrives, so the agent can neither continue its work nor report back to its delegator. Root cause confirmed in code (investigation notes, Source Log).
- Why removal: idle shutdown was introduced on 2026-09-29 only to prevent leaked delegated children while nothing else could release them. Since 2026-10-06 every new delegated copy is owned by a Task (Project or no-Project), and Task DONE releases it. Root stop and server stop release everything else (investigation notes, "Is Idle Shutdown Still Needed?").
- Affected actors or systems: delegated Agents and delegated Teams (and their members, and brought-in helpers) in Agent Team, Agent Org and standalone roots, on every runtime; their delegators; the user; operators who set the grace setting.
- Desired outcome: A delegated copy is never shut down because it is idle. It stays live until its Task is DONE, its root stops or the server stops. A background task therefore runs to completion, and the agent continues and reports back.
- Observable definition of success: A delegated Claude agent whose background task runs longer than the old grace period stays live, receives the completion and sends its result to its delegator. The grace setting no longer exists.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenarios | Current Behavior | Desired Behavior | Preserved Behavior | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | Claude delegated run with a running background task is shut down after the grace period; the task is killed (`[killed]`), no notification | No idle shutdown: the task completes; the agent receives its notification, continues and reports back | Background completion → CLI-started turn → agent continues | Report; `agent-run-termination.ts` |
| BEH-002 | System | SCN-001 | Same for AGY background steps, and for any long wait of any runtime | Same as BEH-001 | — | `agy-agent-run-backend.ts` |
| BEH-004 | System | SCN-002 | Quiet delegated copy is shut down after the grace period; a same-root message restores it | Quiet delegated copy stays live; a same-root message is delivered to the live run without restore | Message delivery and lease semantics | `agent_team_execution.md` |
| BEH-007 | Operational | SCN-003 | Server setting `AUTOBYTEUS_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS` (default 600 000) controls the grace period | Setting removed; a value left in an existing settings store has no effect and causes no error | Other server settings | `server-settings-service.ts` l.180–187 |
| BEH-008 | System | SCN-004 | Task DONE stops the Task's copies; root stop stops all; after a server restart children start shut down and a message wakes (restores) them; DONE reactivation restores a copy | Unchanged | Yes | Docs; prior tickets |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Constraint |
| --- | --- | --- | --- |
| Delegated agent | Finish long work and report back | Its run is never stopped for being idle | — |
| Delegator agent | Receive the result | Gets the result instead of silence | Marks DONE to release (existing contract) |
| User | Trust delegated work | No silent stalls | — |
| Operator | Resource use | Resources released by DONE, root stop, server stop | Accepted: an open Task's copy holds its runtime process until one of these happens |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Scenarios |
| --- | --- | --- |
| UC-001 | A delegated agent (or a member of a delegated Team) waits on its own background task or any long wait, then continues and reports back | SCN-001 |
| UC-002 | A quiet delegated copy stays live and receives follow-up messages directly | SCN-002 |
| UC-003 | Operators no longer have or need the idle grace setting | SCN-003 |

### Out Of Scope

- Telling an agent that a run end (root stop, server restart, Task DONE) stopped its background tasks (former REQ-004 / DEC-003). Separate-ticket candidate.
- Making background tasks survive a run end or server restart.
- Changing Task DONE release, reactivation, root stop, server-restart restore or wake-on-message restore of shut-down copies.
- Any replacement automatic release (timeouts, caps, watchdogs) or automatic DONE.
- Releasing legacy delegated copies created before 2026-10-06 without a Task; they are released by root stop or server stop.
- Standalone (non-delegated) runs and root members: they never had idle shutdown.

### Non-Goals

- Measuring or reducing the resource cost of idle live copies.

### Preserved Behavior Boundary

BEH-008; message delivery and live-lease semantics; status reporting of delegated copies (idle stays `idle`, not `offline`); root termination and fail-stop.

### Review Authority

Blocking findings must cite REQ/AC/BEH IDs here. Scope-changing proposals are Requirement Gaps and need user approval.

## Requirements

| Requirement ID | Requirement | Behaviors | Priority | Rationale | Source |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | A delegated copy (Agent or Team, including members and brought-in helpers) must never be shut down because it is idle or quiet, on any runtime and in any root kind | BEH-001, BEH-002, BEH-004 | Must | Idle shutdown kills background work and is no longer needed for release | DEC-004 |
| REQ-002 | Delegated copies must still be released by Task DONE, root stop/fail-stop and server stop; restore of non-live copies (after a server restart, DONE reactivation) must keep working | BEH-008 | Must | Remaining release and restore authorities | DEC-004; prior tickets |
| REQ-003 | The `AUTOBYTEUS_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS` setting must be removed. A stored value must be ignored without error | BEH-007 | Must | No idle shutdown to configure | DEC-004 |
| REQ-004 | Code that exists only for idle shutdown (grace schedule, shutdown-if-quiet paths) must be removed, not left dormant | BEH-004, BEH-007 | Must | Clean removal; no dead path | DEC-004; DESIGN.md |
| REQ-005 | Server documentation must describe the new lifetime rule (live until DONE, root stop or server stop) and drop the grace setting | All | Must | Contract for operators and agents | — |

## Acceptance Criteria

| AC ID | Requirements | Scenarios | Trigger | Expected Outcome | Alternate / Failure | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | SCN-001 | Reproduction of the 10-minute case: a delegated Claude agent starts a background task that runs longer than the old grace period (shortened to a test value, e.g. 60 s worth of controllable time) and ends its turn | The run is still live after that time; the task completes; the agent receives the completion and sends its result to the delegator | Before the fix the same test shows the run shut down and the task stopped | Automated lifecycle test with a controllable clock, plus a gated live Claude E2E |
| AC-002 | REQ-001 | SCN-002 | Delegated Agent and delegated Team go quiet; time advances far beyond the old grace period | Both stay live (`idle`); a same-root message is delivered without restore | — | Unit/integration tests |
| AC-003 | REQ-002 | SCN-004 | Task DONE, root stop, server restart then message, DONE reactivation | Same outcomes as before this change | — | Existing tests stay green (adjusted only where they relied on idle shutdown) |
| AC-004 | REQ-003 | SCN-003 | Server settings listed/updated; a settings store still contains the old key | The setting is not offered; startup and settings reads succeed with the stale key present | — | Unit test |
| AC-005 | REQ-004 | — | Code search | No grace schedule, grace setting or idle shutdown-if-quiet path remains | — | Review + grep |
| AC-006 | REQ-005 | — | Docs review | `agent_team_execution.md`, `agent_orgs.md`, `agent_tools.md`, `codex_integration.md` and related docs describe the new rule; no grace setting mention remains | — | Review |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal / Event | Trigger | Start | Steps | Expected Outcome | Alternate | Validity | Evidence | Related |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | Delegated agent | Wait on long work, then report | `run_in_background` task (Claude), background step (AGY), or other long wait; turn ends | Delegated copy live | Turn ends → idle → work runs as long as needed → completion → agent continues → `send_message_to` delegator | Result reaches the delegator | Task fails → agent reports the failure | Supported Normal Scenario | Report (observed twice 2026-10-08) | REQ-001, AC-001 |
| SCN-002 | System | Delegator | Follow up with a quiet copy | `send_message_to(run ID)` | Copy idle for a long time | Message delivered to the live run | Copy handles it, no restore | — | Supported Normal Scenario | Docs | REQ-001, AC-002 |
| SCN-003 | Operational | Operator | Server settings | Settings page / API | Old key may be stored | Setting absent; stale value ignored | No error | — | Supported Normal Scenario | Settings service | REQ-003, AC-004 |
| SCN-004 | System | Delegator / user / server | Release and restore | DONE, root stop, server restart then message, reactivation | — | As today | As today | — | Supported Normal Scenario | Prior tickets | REQ-002, AC-003 |

## UI, Interaction, And Experience Requirements

- Applicable: `No`. The setting disappears from the server settings list automatically (predefined setting removed). N/A — not applicable for Product design fields.

## Quality And Non-Functional Requirements

| Quality ID | Related | Area | Requirement | Conditions | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-002 | Reliability | Removing idle shutdown must not change ordering or safety of DONE release, reactivation, root stop or restore | Serialized task-execution command queue | Existing tests |
| QR-002 | REQ-001 | Operability (accepted) | An open Task's delegated copy keeps its runtime process until DONE, root stop or server stop | User decision DEC-004 | Documented |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes` (minor) — a stored value of the removed setting may exist in server settings.
- Must be preserved: all other settings; startup must succeed.
- Acceptable: the stale value is ignored (left in place or dropped; architecture decides).

## External Contracts And Dependencies

| Contract | Constraint | Evidence | Risk |
| --- | --- | --- | --- |
| Claude CLI background tasks | Live as long as the CLI process | `agent_execution.md` | None |
| Gated E2E `mixed-task-delegation.e2e.test.ts` | Uses the grace setting today | `codex_integration.md` l.633–642 | Must be updated |

## Supplemental Artifacts

| Artifact Path | Purpose | Related | Status | Approval |
| --- | --- | --- | --- | --- |
| `problem-report.md` | Original report | BEH-001 | Final | Evidence only |

## Assumptions

| ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Delegators mark Tasks DONE in normal use, so idle copies do not accumulate without bound | QR-002 | Project Task Manager role contract (prior ticket REQ-006) | Accepted by user decision |

## Open Decisions And Questions

| ID | Question | Options / Evidence | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | Skip idle shutdown only while background tasks run, or remove it? | — | User | Superseded by DEC-004 |
| DEC-002 | Upper bound for background deferral? | — | User | Superseded by DEC-004 (no idle shutdown) |
| DEC-003 | Notice to the agent when a run end stopped its background tasks | Not answered by the user; kept out of this ticket to keep scope to the approved removal | User | Deferred — separate-ticket candidate |
| DEC-004 | Is idle shutdown still needed now that every delegated copy belongs to a Task and DONE releases it? | Investigation notes "Is Idle Shutdown Still Needed?" | User | **Decided 2026-10-08: remove it** ("yes. i think we should remove it. lets go") |

## Traceability

| Requirement | Use Cases | Behaviors | ACs | Scenarios |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001, UC-002 | BEH-001, BEH-002, BEH-004 | AC-001, AC-002 | SCN-001, SCN-002 |
| REQ-002 | UC-002 | BEH-008 | AC-003 | SCN-004 |
| REQ-003 | UC-003 | BEH-007 | AC-004 | SCN-003 |
| REQ-004 | UC-003 | BEH-004, BEH-007 | AC-005 | — |
| REQ-005 | UC-001..003 | All | AC-006 | — |

## Architecture Phase Input

- Approved scenarios: SCN-001..SCN-004.
- Constraints: keep the serialized task-execution queue, live leases (if still needed), restore path, DONE release, reactivation, root stop/fail-stop.
- Deferred to architecture: what remains of liveness/lease concepts without idle shutdown; whether `tryPrepareTerminationIfQuiescent` has other callers; stale setting handling; test rewrites.
- Technical facts to verify: all callers of the removed paths; whether the "live lease" still has a purpose (it protected against shutdown during delivery).

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and ACs testable and traceable: `Yes`
- Scenarios covered: `Yes`
- Product design evidence: `N/A`
- UI/UX approval: `N/A`
- Assumptions and open decisions visible: `Yes`
- Content ready for user approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- User approval received: `Yes` (2026-10-08)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
