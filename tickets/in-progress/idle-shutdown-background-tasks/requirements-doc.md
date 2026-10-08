# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-003`
- Package identifier: `idle-shutdown-background-tasks`
- Request / ticket: Project Task from `/project_task_manager` (2026-10-08), source report `problem-report.md`
- Requirements owner: solution_designer
- Date: 2026-10-08
- Approval state and reference: Approved by the user on 2026-10-08 in the Solution Designer conversation, superseding the SR-002 removal. Sequence: user asked about server cost of never shutting down, and proposed "if [the] agent has a background task, then we don't shut down it … for other ones, it still follows 10 minutes"; after the feasibility check: "thats fine for other agent. if they do not send, then they do not create lets assume that. i think hybrid is better"; "lets use hybrid approach". No time limit: the hybrid was presented with "no limit" as the recommended default; the user did not ask for one (recorded in DEC-005; the user can still ask for a cap)
- Exact approved requirements baseline / solution revision: this document at SR-003 (REQ-001..006, AC-001..008, SCN-001..005)
- Behavior-defining supplements: none (`problem-report.md` is evidence only)

## Problem And Desired Outcome

- Problem: A delegated agent that starts a background task and ends its turn is reported `idle`. After the idle-shutdown grace period (default 10 min) the server shuts the delegated run down, because its quiet check ignores running background tasks. Shutdown kills the background task. The completion notification never arrives, so the agent can neither continue nor report back to its delegator. Root cause confirmed in code (investigation notes).
- Why not remove idle shutdown (SR-002): an idle Claude CLI process holds about 260–480 MB (measured 2026-10-08), so delegated copies that stay open until Task DONE would hold several GB. Idle shutdown stays for copies with nothing running.
- Affected actors or systems: delegated Agents and delegated Teams (and their members and brought-in helpers) in Agent Team, Agent Org and standalone roots on the Claude and Antigravity runtimes; their delegators; the user; operators.
- Desired outcome: A delegated copy is not idle-shut-down while any of its agents has a running background task. All other copies keep the existing 10-minute idle shutdown. When the last background task ends, the normal grace period starts again.
- Observable definition of success: With a shortened grace period (60 s), a delegated Claude agent whose background task runs longer than the grace period stays live, receives the completion and sends its result to its delegator; a delegated agent without a background task is still shut down after the grace period.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenarios | Current Behavior | Desired Behavior | Preserved Behavior | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | Claude delegated run with a running background task is shut down after the grace period; the task is killed (`[killed]`), no notification | Not idle-shut-down while the task is running; the task completes; the agent receives its notification, continues and reports back | Background completion → CLI-started turn → agent continues | Report; `agent-run-termination.ts` |
| BEH-002 | System | SCN-002 | Same for AGY background steps | Same as BEH-001 | AGY Stop/Terminate still stops background groups | `agy-agent-run-backend.ts` |
| BEH-003 | System | SCN-003 | — (no background-aware rule) | When the last running background task of the copy ends and the copy is otherwise quiet, the grace period starts again and the copy is shut down when it elapses, including when the task ends without starting a turn (AGY) | — | Investigation |
| BEH-004 | System | SCN-004 | Quiet delegated copy without running background tasks is shut down after the grace period; a same-root message restores it | Unchanged | Yes | `agent_team_execution.md` |
| BEH-006 | System | SCN-005 | Codex, native AutoByteus and ACP runtimes report no background tasks | Treated as having none (user: "if they do not send, then they do not create"); idle shutdown unchanged for them | Yes | Code |
| BEH-007 | Operational | — | Grace setting `AUTOBYTEUS_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS` (default 600 000) | Unchanged | Yes | `server-settings-service.ts` |
| BEH-008 | System | — | Task DONE, root stop/fail-stop, server stop, restart restore, DONE reactivation | Unchanged; they still stop a copy even while background tasks run | Yes | Docs; prior tickets |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Constraint |
| --- | --- | --- | --- |
| Delegated agent | Finish long background work and report back | Not idle-shut-down while its background task runs | — |
| Delegator agent | Receive the result | Gets the result | — |
| User / operator | Bounded memory | Copies with nothing running are still released after the grace period | Grace setting unchanged |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Scenarios |
| --- | --- | --- |
| UC-001 | A delegated agent (or member of a delegated Team) on Claude or AGY waits on its own background task longer than the grace period, then continues and reports back | SCN-001, SCN-002 |
| UC-002 | Idle shutdown releases delegated copies once nothing is running, including after background work ends | SCN-003, SCN-004 |

### Out Of Scope

- Telling an agent that a run end stopped its background tasks (separate-ticket candidate).
- Background-task reporting for Codex, native AutoByteus and ACP runtimes.
- A time limit on how long a running background task keeps a copy alive (DEC-005).
- Making background tasks survive a run end or server restart.
- Changing the grace setting, DONE release, reactivation, root stop or restore.
- Standalone (non-delegated) runs and root members: they never had idle shutdown.

### Non-Goals

- Measuring or reducing memory of live copies beyond keeping today's idle shutdown.

### Preserved Behavior Boundary

BEH-004, BEH-006, BEH-007, BEH-008; root-shutdown fence (root stop is not deferred by background tasks); message delivery and live-lease semantics; status reporting.

### Review Authority

Blocking findings must cite REQ/AC/BEH IDs here. Scope-changing proposals are Requirement Gaps and need user approval.

## Requirements

| Requirement ID | Requirement | Behaviors | Priority | Rationale | Source |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | A delegated copy (Agent or Team, including members and brought-in helpers) must not be idle-shut-down while any of its agents has a running background task reported by its runtime (Claude, Antigravity), with no time limit | BEH-001, BEH-002 | Must | The agent is still working | User 2026-10-08 (hybrid) |
| REQ-002 | When a copy's last running background task ends (completed, failed or stopped) and the copy is otherwise quiet, the grace period must start again and the copy must be shut down when it elapses, whether or not the end starts a turn | BEH-003 | Must | Memory is still released after the work ends | Hybrid; AGY behavior |
| REQ-003 | Copies with no running background task must keep today's idle shutdown, grace setting and wake-on-message behavior; runtimes that report no background tasks are treated as having none | BEH-004, BEH-006, BEH-007 | Must | Preserved | User 2026-10-08 |
| REQ-004 | Task DONE, root stop/fail-stop and server stop must still stop a copy and its background tasks | BEH-008 | Must | Explicit stops stay authoritative | Preserved |
| REQ-005 | The agent-facing collaboration text and server docs must state that a quiet copy is shut down after the grace period except while it has a running background task | All | Must | Agents can rely on background waits | — |
| REQ-006 | The SR-002 removal already on the task branch must be fully undone outside the ticket folder, so the result has no leftover removal changes (setting, lifecycle, contract, docs) | BEH-004, BEH-007 | Must | Approved behavior keeps idle shutdown | SR-003 |

## Acceptance Criteria

| AC ID | Requirements | Scenarios | Trigger | Expected Outcome | Alternate / Failure | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | SCN-001 | Reproduction of the 10-minute case with grace set to 60 s: a delegated Claude agent starts a `run_in_background` task that runs longer than 60 s (e.g. `sleep 90`) and ends its turn | The copy is still live after the grace period; the task completes (no `[killed]`); the agent receives the completion and sends its result to the delegator | On the base the same test shows the copy shut down and the task stopped (existing `evidence/baseline-before*`) | Gated live Claude E2E |
| AC-002 | REQ-001 | SCN-002 | AGY copy with a running background step, grace elapsed | Copy not shut down | — | Unit/integration (live AGY optional) |
| AC-003 | REQ-001 | SCN-001 | A member of a delegated Team has a running background task; grace elapsed; Team otherwise quiet | Team copy not shut down | — | Unit/integration |
| AC-004 | REQ-002 | SCN-003 | Background task ends (completed, failed, stopped) with no following turn; copy quiet | Shut down one grace period after the end | — | Unit with fake timers |
| AC-005 | REQ-002 | SCN-003 | Claude task completes; CLI turn runs; agent goes idle | Shut down one grace period after that idle | — | Unit/integration |
| AC-006 | REQ-003 | SCN-004, SCN-005 | Quiet copy without background tasks (any runtime) | Shut down after the grace period; message restores it | — | Existing tests restored and green |
| AC-007 | REQ-004 | — | DONE, root stop, server stop while a background task runs | Copy and task stop as today | — | Existing tests + one unit case for root stop with a running task |
| AC-008 | REQ-005, REQ-006 | — | Review | LLM contract and docs describe the rule; no SR-002 removal residue outside `tickets/` (diff against base shows only the hybrid change) | — | Review + `git diff 3a2496c95 -- . ':!tickets'` |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal / Event | Trigger | Start | Steps | Expected Outcome | Alternate | Validity | Evidence | Related |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | Delegated Claude agent | Wait on long background work, then report | `run_in_background` task, turn ends | Copy live | Idle → task runs > grace → completes → CLI turn → agent reports to delegator | Result reaches delegator | Task fails → agent reports failure | Supported Normal Scenario | Report (observed twice 2026-10-08) | REQ-001, AC-001, AC-003 |
| SCN-002 | System | Delegated AGY agent | Same with an AGY background step | Step open at turn end | Copy live | As SCN-001 | Copy stays live | — | Supported Normal Scenario | AGY docs | REQ-001, AC-002 |
| SCN-003 | System | Idle shutdown | Release after work ends | Last background task ends | Copy otherwise quiet | Task ends → grace → shutdown | Memory released | — | Supported Normal Scenario | Hybrid decision | REQ-002, AC-004, AC-005 |
| SCN-004 | System | Idle shutdown | Release quiet copies | Turn ends, nothing running | Copy live | Grace → shutdown → message wakes it | Unchanged | — | Supported Normal Scenario | Docs | REQ-003, AC-006 |
| SCN-005 | System | Codex/native/ACP copy | Same as SCN-004 | Turn ends | Copy live | As SCN-004 | Unchanged | — | Supported Normal Scenario | User assumption 2026-10-08 | REQ-003, AC-006 |

## UI, Interaction, And Experience Requirements

- Applicable: `No`. N/A — not applicable for Product design fields.

## Quality And Non-Functional Requirements

| Quality ID | Related | Area | Requirement | Conditions | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001, REQ-002 | Reliability | No new timer per background task; the existing grace schedule and serialized shutdown path stay the single idle authority | Idle shutdown | Review |
| QR-002 | REQ-001 | Reliability | If a runtime fails to report a task's end, the copy stays live (never killed by mistake); it is still stopped by DONE/root/server stop | Missed terminal frame | Review |
| QR-003 | REQ-003 | Operability | Memory of copies with nothing running is released as today | — | Existing tests |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`. The grace setting stays; background task state is runtime-only.

## External Contracts And Dependencies

| Contract | Constraint | Evidence | Risk |
| --- | --- | --- | --- |
| Claude CLI task frames | `background_tasks_changed`, `task_started`/`task_updated` (`is_backgrounded`, terminal status), `task_notification` | `claude-background-task-registry.ts`, `agent_execution.md` | Missed terminal frame keeps the copy live (QR-002) |
| AGY exit-message files | Exit → completed/failed; unreadable → stays running until AGY stops | `agy-background-task-monitor.ts`, AGY docs | Never-ending daemon keeps the copy live until DONE/root stop (accepted, DEC-005) |

## Supplemental Artifacts

| Artifact Path | Purpose | Related | Status | Approval |
| --- | --- | --- | --- | --- |
| `problem-report.md` | Original report | BEH-001 | Final | Evidence only |
| `evidence/baseline-before*`, `evidence/after*` | AC-001 receipts from the SR-002 implementation; the "before" receipt stays valid | AC-001 | Historical | Evidence only |

## Assumptions

| ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Codex, native and ACP runtimes do not create background tasks that the agent waits on for a notification | REQ-003 | User decision 2026-10-08 | Accepted |
| ASM-002 | Claude starts a turn after each background completion; AGY does not | REQ-002 re-arm trigger | Docs; architecture | Accepted |

## Open Decisions And Questions

| ID | Question | Options / Evidence | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | Skip only while background tasks run, or remove idle shutdown? | — | User | Decided 2026-10-08: skip only while background tasks run (hybrid) |
| DEC-002 | Upper bound for background deferral? | — | User | Superseded by DEC-005 |
| DEC-003 | Notice to the agent when a run end stopped its background tasks | — | User | Deferred — separate-ticket candidate |
| DEC-004 | Remove idle shutdown? | — | User | Decided "remove" in SR-002; **reversed 2026-10-08** in favor of the hybrid |
| DEC-005 | Time limit on a running background task keeping a copy alive | Recommended: none (DONE, root stop and server stop still end it) | User | Adopted as presented with the hybrid; user may still request a cap |
| DEC-006 | Runtimes without background reporting | "if they do not send, then they do not create" | User | Decided 2026-10-08: treated as none |

## Traceability

| Requirement | Use Cases | Behaviors | ACs | Scenarios |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001, BEH-002 | AC-001, AC-002, AC-003 | SCN-001, SCN-002 |
| REQ-002 | UC-002 | BEH-003 | AC-004, AC-005 | SCN-003 |
| REQ-003 | UC-002 | BEH-004, BEH-006, BEH-007 | AC-006 | SCN-004, SCN-005 |
| REQ-004 | UC-001 | BEH-008 | AC-007 | — |
| REQ-005 | UC-001, UC-002 | All | AC-008 | — |
| REQ-006 | UC-002 | BEH-004, BEH-007 | AC-008 | — |

## Architecture Phase Input

- Approved scenarios: SCN-001..SCN-005.
- Constraints: one idle authority (existing schedule and quiet check); root-shutdown fence and explicit stops not deferred; grace setting unchanged.
- Deferred to architecture: where the running-background-task signal lives; re-arm trigger on background-task end; how the SR-002 commits are undone.

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

- User approval received: `Yes` (2026-10-08, hybrid)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
