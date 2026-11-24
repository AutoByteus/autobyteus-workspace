# Requirements Document — autobyteus-638 A restart keeps a person's runs running

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-002`
- Package identifier: `idle-run-discovery-638`
- Request / ticket: autobyteus-638, "Cross-node & local agent discovery: find and wake idle-stopped user runs instead of spawning duplicates"
- Requested by: `/project_task_manager` (for the founder)
- Requirements owner: Solution Designer
- Date: 2026-11-24
- Approved by and reference: **User (the founder)**, in this conversation on 2026-11-24.
  - He asked: "Is it possible for earlier idle ones after restart we bring them back to idle as well, would that solve the problem, they will never be released again right?"
  - Then: "If it's simpler then let's use the simple approach also I think it's more natural, earlier it's idle, after restart it's also idle. would be great"
- Approved baseline: SR-002. SR-001's approach (list sleeping runs, wake on a message, rename the tool) is replaced. Its DEC-003 and DEC-005 are no longer needed.
- Behavior-defining supplements: none. Evidence: [investigation-notes.md](investigation-notes.md)

## Problem And Desired Outcome

- **Problem:** after a node restarts (an update, Restart server, `docker stop`/start, a crash), the runs a person started come back only if they were busy. Idle ones stay unloaded (grey).
  - `list_running_agents` doesn't list them, and `send_message_to` refuses them.
  - So other agents start duplicates: the incident on docker-8001, investigation-notes §1.
  - The 10-minute idle timer is not involved: it stops only delegated runs.
- **Desired outcome:** "earlier it's idle, after restart it's also idle". Every run a person started that was running when the node stopped is running again after the node starts. That holds for an Agent run, and for a Team run with its coordinator.
- **Success:** after docker-8001 restarts, the founder's Project Task Managers that were running before show green (idle), `list_running_agents(node: "docker-8001")` lists them, and a message reaches them.

## Relevant Current And Desired Behavior

| ID | Kind | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | After a restart, only busy runs are brought back (after an update), or told on their next input. An idle run a person started stays unloaded | Every run a person started that was running at the stop is running again after the start: idle, with its conversation, without any input | Restart reminders: who is told and when (autobyteus-448), the update wake | notes §1, §2; `docs/modules/restart_resume.md` |
| BEH-002 | Contract | `list_running_agents` / `send_message_to` see only running runs | Unchanged; they now see these runs because they are running | autobyteus-492 entirely | notes §2 |
| BEH-003 | Operational | Delegated runs: idle shutdown, restart resume bottom-up | Unchanged | CM-6, CM-7 | notes §2 |

## Scope Guardrail

### In-Scope Use Cases

| ID | Use case | Scenarios |
| --- | --- | --- |
| UC-001 | A node stops (gracefully or not) and starts again; the runs a person started that were running come back running | SCN-001, SCN-002 |
| UC-002 | A run that must not come back stays unloaded: archived or stopped by a person in the meantime, removed, or not started by a person | SCN-003 |

### Out Of Scope

- Runs that were already unloaded before the stop (they come back when the person opens or messages them, as today).
- `list_running_agents` / `send_message_to` rules (autobyteus-492).
- The 10-minute idle shutdown of delegated runs.
- Org runs and their units (CM-3: a message to a unit restores it).
- Application-owned and system-owned runs.
- The run list UI.

### Non-Goals

- Waking anything: no input is posted, so no model call happens and no tokens are spent.

### Preserved Behavior Boundary

- Restart resume and reminders (autobyteus-285, -448): BEH-001 preserved column.
- autobyteus-492 REQ-001..REQ-012.
- Delegated-run lifecycle (CM-6, CM-7, CM-10).
- DESIGN.md rule 7: one run that cannot come back is left out, named in the log; the node starts and other runs are unaffected.

### Prerequisites

None.

### Review Authority

As the template states.

## Requirements

| ID | Requirement | Behavior | Priority | Rationale | Feasibility | Source |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | When the node stops, gracefully or by a crash, it knows which runs a person started were running. A crash loses at most the last few seconds | BEH-001 | Must | The founder: "earlier it's idle" | The busy-run record already does this for busy runs (2 s live record + final write) | Founder 2026-11-24 |
| REQ-002 | After the node starts, each of those runs is running again, idle: an Agent run's agent, or a Team run's coordinator. No input is posted | BEH-001 | Must | "after restart it's also idle" | Restore without posting exists for standalone hosts (`ensureAgentReady`, used by restart resume today); a Team coordinator needs the same (design) | Founder |
| REQ-003 | A run is not brought back when it was archived, was stopped by a person, is gone, or was not started by a person (delegated, an Org unit) | BEH-001, BEH-003 | Must | Retired runs stay retired | `rootHistory` states exist (`restart-resume-composition.ts`) | Task comment |
| REQ-004 | A run that fails to come back is logged with its name and reason; the start and every other run go on | BEH-001 | Must | DESIGN.md rule 7 | — | DESIGN.md |
| REQ-005 | Restart reminders and the update wake behave as today; a run brought back idle still gets its reminder with its next input when it was busy at the stop | BEH-001 | Must | No regression | — | autobyteus-448 |

## Acceptance Criteria

| ID | Req | Trigger | Expected | Alternate | Verification |
| --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | A run a person started is idle; the node is restarted gracefully | After the start it is running (idle), listed by `list_running_agents` (locally and from a peer), and a message to it is delivered | A Team run: its coordinator is running and listed | Server tests; built-server E2E across a real restart |
| AC-002 | REQ-001, REQ-002 | Same, but the node is killed (crash) | The same | — | Built-server E2E with a kill |
| AC-003 | REQ-003 | A recorded run was archived or stopped by a person before the start; a delegated run; an Org unit | Not brought back | — | Server tests |
| AC-004 | REQ-004 | A recorded run cannot be restored (its runtime is missing, its file unreadable) | Logged with name and reason; the others come back; the server serves | — | Server test |
| AC-005 | REQ-005 | A run busy at an update; a run busy at a plain restart | The update wake as today; the plain-restart reminder rides its next input as today, and the run is now also running idle | — | Existing restart-resume suites green, plus one case |
| AC-006 | REQ-002 | A run that was unloaded before the stop | Stays unloaded | — | Server test |

## Relevant Scenarios

| ID | Kind | Actor / event | Steps | Outcome | Validity |
| --- | --- | --- | --- | --- | --- |
| SCN-001 | Operational | Node update or restart (docker-8001, 10:56 UTC) | The node stops, then starts | The person's running runs are running again; other nodes' agents find and message them | Supported Normal (the incident) |
| SCN-002 | Operational | Crash or forced kill | As SCN-001 | As SCN-001 (up to ~2 s lost) | Supported Normal |
| SCN-003 | Operational | A run is archived or stopped by its owner | Restart | Stays retired | Supported Normal |

## UI, Interaction, And Experience Requirements

- Applicable: No. Product design: N/A, not applicable.

## Quality And Non-Functional Requirements

| ID | Req | Area | Constraint |
| --- | --- | --- | --- |
| QR-001 | REQ-002 | Performance | Memory after a start equals the memory those runs used before the stop. Measured on docker-8001: one loaded Claude run ≈ 270 MB, one Antigravity run ≈ 330 MB (investigation-notes §3a). No run that was unloaded is loaded |
| QR-002 | REQ-002 | Operability | At most 3 runs are brought back at a time (as restart resume); the server serves requests meanwhile |

## Data Continuity

- Persisted data affected: one new transient file (the record of REQ-001), read once at the start and rewritten while the node runs. Absent or invalid means "nothing to bring back". No change to run files or history.

## Decisions

| ID | Question | Why it matters | Options | Reasoning and recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Cause | The Task blamed the 10-minute idle timer | — | The restart for the update unloaded the runs (notes §1) | Solution Designer | Decided (founder informed) |
| DEC-002 | Approach | — | A: list sleeping runs and wake them on a message; B: bring running runs back after a restart | B keeps every rule as it is and matches "earlier idle, after restart idle" | Founder | Decided (B), 2026-11-24 |
| DEC-003 | Which runs come back: those running at the stop (1), or every unarchived, unstopped run a person started (2)? | Memory: each loaded run is a runtime process of ≈270–330 MB (notes §3a); option 2 would load runs untouched for weeks (2 on docker-8001 are 7–30 days old) | (1), (2) | I offered (2) first. The founder's words, "earlier it's idle, after restart it's also idle", are (1), and the measurement shows (2) would use more memory than before the restart. (1) restores exactly what was there. **(1)**; founder informed, and he can ask for (2) | Solution Designer within the founder's direction | Decided |
| DEC-004 | Which run kinds | — | Agent and Team runs a person started; Orgs; delegated | The same set `list_running_agents` lists (one definition of "a run a person started"). Orgs restore their units on a message (CM-3); delegated runs have their own lifecycle | Solution Designer | Decided |
| DEC-005 | Which restart causes | — | update / restart / crash | All three: the founder's goal is that a restart changes nothing | Solution Designer | Decided |

## Traceability

| Req | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-002 | SCN-001, SCN-002 |
| REQ-002 | UC-001 | BEH-001 | AC-001, AC-002, AC-006 | SCN-001 |
| REQ-003 | UC-002 | BEH-001, BEH-003 | AC-003 | SCN-003 |
| REQ-004 | UC-001 | BEH-001 | AC-004 | — |
| REQ-005 | UC-001 | BEH-001 | AC-005 | SCN-001 |

## Architecture Phase Input

- Contract first: the record's file and entry shape.
- To verify:
  - shutdown must not mark runs terminated;
  - a Team coordinator can be made ready without input;
  - the order relative to the update wake.

## Readiness Check

- Content ready: Yes. Approval recorded: Yes (founder, SR-002). Ready for design: Yes.
