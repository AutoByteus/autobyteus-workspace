# Requirements Document — agy-capsule-tools-and-spill-shapes

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `agy-capsule-tools-and-spill-shapes`
- Request / ticket: Project Task `autobyteus-588` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`, part of autobyteus-530): the merged follow-ups of autobyteus-561 (FU-1 spilled `run_command` wrapper, FU-2 `grep_search` second spill shape, FU-3 discovery-timeout recurrence) and of autobyteus-377 (FU-1: `AGY_NATIVE_TOOL_NAMES` is stale).
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Requirements owner: Solution Designer
- Date: 2026-11-24
- Approved by and reference: Solution Designer within the direction (the Task lists the follow-ups and asks for each to be done or judged); the user is informed in the Solution Designer's conversation.
- Exact approved baseline: this document at `SR-001`. Supplements: none.

## Problem And Desired Outcome

- Problem: of the five items, three are not work (`investigation-notes.md`): the spilled `run_command` wrapper is already delivered by autobyteus-377, the `grep_search` "second spill shape" was a false lead and the tool no longer exists in the current CLI, and the discovery-timeout item can only be investigated when it recurs. The fourth, the list of native tools written into every Antigravity run's agent.md capsule (`AGY_NATIVE_TOOL_NAMES`), was reported as stale; it is not (SR-002: its names are the CLI's own registry names, and the names the model sees are aliases of them). What is real is that nothing would tell us if the CLI renamed one of them.
- Desired outcome: the list stays as it is, a start tells us when a name in it is missing from the CLI's own registry, and the four non-changes are closed or armed with their evidence.
- Observable success: on agy 1.5.15 nothing changes for a run; with a registry that lacks a listed name, the start logs one warning naming it.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenarios | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | The capsule allowlist names eight tools; a name the CLI no longer has is ignored silently | Unchanged list; the start warns once when a listed name is missing from the CLI's registry (`init.tools`) | The agent's tool set on 1.5.15; the start itself never fails for it | F-06, F-11 |
| BEH-002 | System | SCN-002 | N/A | The three non-items carry their verdict and evidence in the records | The 561 and 377 follow-up records | F-01…F-04 |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Outcome | Constraint |
| --- | --- | --- | --- |
| Antigravity runs | Have their file and command tools | Stay available if the CLI drops its aliases | The tool set is not widened (no `search_web`, `schedule`, `send_message`, browser tools) |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases
| ID | Use Case | Scenarios |
| --- | --- | --- |
| UC-001 | The start reports a listed tool that the CLI's registry lacks | SCN-001 |

### Out Of Scope
The journal rules (done by 377); a `grep_search` rendering; the discovery-timeout investigation (needs a recurrence); the scripted CLI's emitted tool names (they model older versions); the tools the CLI always offers (`manage_task`); making a missing registry name a start failure.

### Non-Goals
Detecting the CLI version; widening the tool set.

### Preserved Behavior Boundary
BEH-001's preserved column; the capsule manifest and restore rules.

### Prerequisites
None.

### Review Authority
As the template.

## Requirements

| ID | Requirement | Behavior | Priority | Rationale | Feasibility | Source |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | `AGY_NATIVE_TOOL_NAMES` is unchanged: the eight registry names, with no aliases, no collaboration or MCP names (a list mixing a name and its alias fails to start). | BEH-001 | High | F-06, F-07 | Reproduced | DEC-1 |
| REQ-002 | When the CLI's start message carries a `tools` array and a name of the list is not in it, the start logs one warning `AGY_CAPSULE_TOOL_NOT_IN_REGISTRY names=<…> run=<id>`; a start message without `tools` is accepted silently; the warning never fails or delays the start. | BEH-001 | Medium | F-11: a renamed tool would otherwise be dropped silently | Reproduced (init.tools) | DEC-1 |
| REQ-003 | The 561 and 377 follow-up rows are closed with their verdicts: FU-1 (561) delivered by 377; FU-2 (561) dropped; FU-3 (561) armed. | BEH-002 | Medium | ticket-scope | N/A | DEC-2, 3, 4 |

## Acceptance Criteria

| AC | Req | Scenario | Trigger | Expected | Verification |
| --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | SCN-001 | The policy unit test | The exact eight names, unique, no aliases (`read_file`, `write_file`, `edit_file`), no `call_mcp_tool` or collaboration names | Unit test (the existing test, with the alias rule added) |
| AC-002 | REQ-002 | SCN-001 | A start with a fake init message whose `tools` lacks one listed name; with all present; with no `tools` field | One warning naming the missing name; none; none; the run starts in all three | Factory unit tests |
| AC-003 | REQ-001, 002 | SCN-001 | The real agy 1.5.15 started with a capsule from `createAgyRunCapsule` (live probe, `evidence/INV-01-capsule-tools-probe.mjs`) | `init.tools` holds all eight names; no warning; the agent's tools are `read_file, write_file, edit_file, run_command, generate_image, manage_task` | Executed by API/E2E (live gate) |

## Relevant Scenarios And Journeys

| ID | Kind | Initiator | Goal | Trigger | Start | Steps | Outcome | Validity |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | The platform | Start an Antigravity run | A new Antigravity start | A current agy | write the capsule, start | The agent has the files/command/image tools only | Supported Normal Scenario |
| SCN-002 | Operational | The team | Close follow-ups | Task 588 | N/A | judge | Verdicts recorded | Supported Normal Scenario |

## UI, Interaction, And Experience Requirements
N/A — not applicable.

## Quality And Non-Functional Requirements
None.

## Data Continuity And Acceptable Loss
Persisted data affected: `No`. The capsule's agent.md text is unchanged.

## External Contracts And Dependencies

| Contract | Constraint | Authority | Risk |
| --- | --- | --- | --- |
| The CLI's `tools:` allowlist in a custom agent's front matter | Names it does not know are ignored; some old names map to the current tools | Probe on 1.5.15 (undocumented) | None for the unchanged list; the warning (REQ-002) only reads the start message |

## Supplemental Artifacts
`evidence/INV-01-capsule-tools-probe.mjs`.

## Assumptions
| ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The registry names in `init.tools` are the names `tools:` accepts | The conflict in F-07 resolves aliases to the registry | Probe | Verified on 1.5.15 |

## Decisions
| ID | Question | Options / evidence | Reasoning and recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-1 | Change the list? | (a) the five alias names only; (b) the five plus the older names; (c) keep the eight; (d) choose per CLI version. Evidence: F-06 (the eight are the registry names, the five are aliases of three of them), F-07 (mixing fails to start; the implementation engineer's probe) | (c): the list is already the CLI's own names, which every CLI version has; (a) would drop the older CLIs' file tools; (b) fails to start on 1.5.15; (d) needs a version threshold nobody knows. SR-001's choice (b) came from an unverified premise: the designer judged the list stale from the model's answer without checking the registry or probing the final list. What remains useful is a cheap drift warning at start from the registry the CLI already sends (REQ-002), not a new failure | Solution Designer | Decided (SR-002) |
| DEC-2 | 561 FU-1 (spilled `run_command` wrapper) | Build or close | Close: delivered by autobyteus-377 (D-7, AC-015; merged `87ca2ceb99`); verified in the merged code and its tests | Solution Designer | Decided |
| DEC-3 | 561 FU-2 (`grep_search` second spill shape) | Build or drop | Drop: the tool is not offered by agy 1.5.15 (F-02), so new runs produce none; the cited shape was grep results that quoted transcript files (F-03); the real rows need nothing beyond the CLI's own truncation marker, already normalized | Solution Designer | Decided |
| DEC-4 | 561 FU-3 (discovery-timeout recurrence) | Keep the Task open, or close with the item armed | Close with the item armed: the evidence line is in place in three files (`probe-timeout-evidence.ts`); a recurrence is reported with that line and handled as a new Task. An open Task that waits for a failure that may never recur would only hide the rest | Solution Designer | Decided |

## Traceability
| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, 003 | SCN-001 |
| REQ-002 | UC-001 | BEH-001 | AC-002, 003 | SCN-001 |
| REQ-003 | UC-001 | BEH-002 | (records) | SCN-002 |

## Architecture Phase Input
One constant and its test; verify AC-002 live.

## Readiness Check
Content ready: `Yes`. Approval recorded: `Yes`. Ready for design: `Yes`.
