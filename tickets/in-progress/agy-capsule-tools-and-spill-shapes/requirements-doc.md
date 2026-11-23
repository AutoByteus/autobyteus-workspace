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

- Problem: of the five items, three are not work (`investigation-notes.md`): the spilled `run_command` wrapper is already delivered by autobyteus-377, the `grep_search` "second spill shape" was a false lead and the tool no longer exists in the current CLI, and the discovery-timeout item can only be investigated when it recurs. One is real: the list of native tools written into every Antigravity run's agent.md capsule (`AGY_NATIVE_TOOL_NAMES`) names tools that agy 1.5.15 no longer has; it works today only because the CLI silently maps the old names to the new tools.
- Desired outcome: the capsule's tool allowlist names the tools the current CLI has, so the agent's tool set no longer depends on an undocumented alias; the three non-items are closed or armed with their evidence.
- Observable success: on agy 1.5.15 a run started with the new list has exactly the tools it has today (`read_file`, `write_file`, `edit_file`, `run_command`, `generate_image`, and the CLI's own `manage_task`).

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenarios | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | The capsule allowlist names `view_file, write_to_file, replace_file_content, grep_search, list_dir, find_by_name, run_command, generate_image`; the agent gets the current tools through the CLI's aliases | The list names the current tools (and keeps the older names for older CLI versions) | The agent's tool set on 1.5.15; no collaboration or MCP names in the list (they come through the MCP descriptor) | F-05…F-07 |
| BEH-002 | System | SCN-002 | N/A | The three non-items carry their verdict and evidence in the records | The 561 and 377 follow-up records | F-01…F-04 |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Outcome | Constraint |
| --- | --- | --- | --- |
| Antigravity runs | Have their file and command tools | Stay available if the CLI drops its aliases | The tool set is not widened (no `search_web`, `schedule`, `send_message`, browser tools) |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases
| ID | Use Case | Scenarios |
| --- | --- | --- |
| UC-001 | The capsule allowlist names the current Antigravity tools | SCN-001 |

### Out Of Scope
The journal rules (done by 377); a `grep_search` rendering; the discovery-timeout investigation (needs a recurrence); the scripted CLI's emitted tool names (they model older versions); restoring runs whose capsule already holds the old list (they keep working through the CLI's aliases and are replaced at the next new start, autobyteus-440); the tools the CLI always offers (`manage_task`).

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
| REQ-001 | `AGY_NATIVE_TOOL_NAMES` lists the current Antigravity native tools for files, commands and images (`read_file`, `write_file`, `edit_file`, `run_command`, `generate_image`) followed by the older names (`view_file`, `write_to_file`, `replace_file_content`, `grep_search`, `list_dir`, `find_by_name`), with no duplicates and no collaboration or MCP names. | BEH-001 | Medium | F-05…F-07 | Reproduced on 1.5.15 | DEC-1 |
| REQ-002 | On agy 1.5.15, a capsule built with the list gives the agent the tool set `run_command, read_file, write_file, edit_file, generate_image` plus the CLI's own `manage_task`, and not `search_web`, `schedule`, `send_message` or the browser tools. | BEH-001 | High | The allowlist must still restrict | Reproduced (probe) | DEC-1 |
| REQ-003 | The 561 and 377 follow-up rows are closed with their verdicts: FU-1 (561) delivered by 377; FU-2 (561) dropped; FU-3 (561) armed. | BEH-002 | Medium | ticket-scope | N/A | DEC-2, 3, 4 |

## Acceptance Criteria

| AC | Req | Scenario | Trigger | Expected | Verification |
| --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | SCN-001 | The policy unit test | The exact list of REQ-001, unique, no `call_mcp_tool`, no collaboration names | Unit test (the existing "exact eight names" test is replaced) |
| AC-002 | REQ-002 | SCN-001 | The real agy 1.5.15 started with a capsule written by `createAgyRunCapsule` (live probe: ask the agent to list its tools, `evidence/INV-01-capsule-tools-probe.mjs` is the recipe); and the existing live write/edit/run_command case | The tool set of REQ-002; a write, an edit and a command succeed through the capsule | Executed by API/E2E (live gate) |
| AC-003 | REQ-001 | SCN-001 | The capsule and restore unit tests; the native-image e2e (its tool count) | Pass with the new count; the manifest's `agentMarkdownHash` is computed from the written text as before | Existing tests adapted |

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
Persisted data affected: `No` for stored shapes. An existing run's capsule keeps its written agent.md (its list is not rewritten; restore reads it); a new start replaces the capsule (440).

## External Contracts And Dependencies

| Contract | Constraint | Authority | Risk |
| --- | --- | --- | --- |
| The CLI's `tools:` allowlist in a custom agent's front matter | Names it does not know are ignored; some old names map to the current tools | Probe on 1.5.15 (undocumented) | An older CLI could reject an unknown name (U-1): a start would then fail loudly at launch |

## Supplemental Artifacts
`evidence/INV-01-capsule-tools-probe.mjs`.

## Assumptions
| ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The user runs a current agy | The app prompts `agy update` when options are missing | Not needed beyond U-1 | Noted |

## Decisions
| ID | Question | Options / evidence | Reasoning and recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-1 | Which names? | (a) the current names only; (b) the current names plus the older names; (c) leave it | (b): (a) would strip an older CLI of its file tools; (c) relies on an undocumented alias that works silently today (F-06) and would silently drop the file tools when the CLI removes it. The current CLI ignores names it does not know (F-07) and still restricts (F-05), so (b) is safe there; an older CLI's tolerance is U-1 and fails loudly if wrong. The list order puts the current names first. The tool set is not widened | Solution Designer | Decided |
| DEC-2 | 561 FU-1 (spilled `run_command` wrapper) | Build or close | Close: delivered by autobyteus-377 (D-7, AC-015; merged `87ca2ceb99`); verified in the merged code and its tests | Solution Designer | Decided |
| DEC-3 | 561 FU-2 (`grep_search` second spill shape) | Build or drop | Drop: the tool is not offered by agy 1.5.15 (F-02), so new runs produce none; the cited shape was grep results that quoted transcript files (F-03); the real rows need nothing beyond the CLI's own truncation marker, already normalized | Solution Designer | Decided |
| DEC-4 | 561 FU-3 (discovery-timeout recurrence) | Keep the Task open, or close with the item armed | Close with the item armed: the evidence line is in place in three files (`probe-timeout-evidence.ts`); a recurrence is reported with that line and handled as a new Task. An open Task that waits for a failure that may never recur would only hide the rest | Solution Designer | Decided |

## Traceability
| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, 003 | SCN-001 |
| REQ-002 | UC-001 | BEH-001 | AC-002 | SCN-001 |
| REQ-003 | UC-001 | BEH-002 | (records) | SCN-002 |

## Architecture Phase Input
One constant and its test; verify AC-002 live.

## Readiness Check
Content ready: `Yes`. Approval recorded: `Yes`. Ready for design: `Yes`.
