# Task Agent Peer Sidebar — Requirements

## Document Status
- Package: `task-agent-peer-sidebar`
- Status: **Approved**
- Baseline: `SR-001`, 2026-09-26
- Owner: Solution Designer
- Approval state/reference: Explicit user message, 2026-09-26: “Approve now work on it.” This followed the SR-001 proposal and confirmation that Agent Orgs uses peer task-team rows.
- Exact approved baseline: SR-001, REQ-001–004 / AC-001–005 / BEH-001–003 / SCN-001–003, including immediate-after-agent ordering. No behavior-defining external supplements. Approval captured in SR-002.

## Problem And Desired Outcome
Delegated task agents in the Team workspace sidebar appear beneath a regular agent and require expanding that agent. This suggests a child relationship and hides separately inspectable executions. The user requests parallel placement, like the Agent Orgs presentation.
Success: after opening a Team run, users see and select task agents at the same indentation level as regular agents without opening a regular agent first.

## Relevant Current And Desired Behavior
| ID | Kind / scenarios | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User; SCN-001 | Task agent is indented under a regular agent and filtered out when that row is collapsed | Task agent is a peer row in its containing Team, visible independently of regular-agent expansion | Team/run grouping and outer expand/collapse | Screenshot; Team execution row projection and tree renderer |
| BEH-002 | User; SCN-002 | Task row opens its separate execution with task status and distinct styling | Same exact-execution selection and distinguishability at peer position | Task label, status, loading/error/retry, keyboard activation, selection highlight | Transient row component |
| BEH-003 | System/User; SCN-003 | Multiple and retained task executions have distinct run identities | Preserve each available task as a separate peer entry | Existing availability, retention and task lifecycle rules; no synthesized missing history | Row projection tests and Team docs |

## Stakeholders
Workspace users need discoverable task execution monitors. Engineering must preserve exact execution identity and delegation semantics.

## Scope Guardrail
### In Scope
- UC-001: Discover task-agent executions as peers within the expanded Team run (BEH-001).
- UC-002: Open a task agent directly and distinguish it from its regular agent (BEH-002).
- UC-003: Preserve multiple/retained available task executions during the layout change (BEH-003).
### Out Of Scope / Non-Goals
No backend delegation, addressing, execution ownership, persistence, task retention, standalone Agents surface, Agent Orgs redesign, task-team redesign, or right-panel task-detail changes. No new prototype requested. No unrelated tree cleanup or historical compatibility expansion.
### Preserved Boundary
BEH-002/003 apply throughout. Actual Team/member containment remains meaningful; this is not a flat list across different Teams. The outer workspace/definition/run may still be collapsed. Peer placement does not change runtime parentage.
### Review Authority
Blocking design/implementation findings must trace to approved REQ/AC/BEH IDs. New behavior, migration obligations or adjacent policies are Requirement Gaps needing explicit user approval; reviewer comments do not amend requirements.

## Requirements
| ID | Requirement | Behavior | Priority / basis |
| --- | --- | --- | --- |
| REQ-001 | In an expanded Team run, available task-agent rows appear at the same hierarchy level as regular agents in their containing Team, never requiring a regular-agent disclosure first. | BEH-001 | Must; user request |
| REQ-002 | Each peer task row remains recognizable as a task and directly opens its own execution, not the regular agent conversation. | BEH-002 | Must; preserve supported inspection |
| REQ-003 | Preserve task labels/status, exact identities, selection/keyboard/loading/error/retry behavior, task availability and lifecycle semantics; multiple tasks must not collapse into one entry. | BEH-002/003 | Must; prevent presentation regression |
| REQ-004 | Preserve regular-agent order and existing outer Team/run grouping/collapse; no disclosure on a regular agent solely to hide/show delegated task agents. | BEH-001 | Must; user request and narrow scope |

## Acceptance Criteria
| ID | Requirement / scenario | Trigger | Observable outcome | Verification |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001/004; SCN-001 | Open a Team run with a delegated task agent without opening its regular agent | Both rows are visible, share hierarchy indentation, and no agent-to-task child branch is drawn | Projection/component assertions plus rendered sidebar check |
| AC-002 | REQ-002/003; SCN-002 | Click or keyboard-activate task row, then regular-agent row | Each opens its own conversation; correct row selected; task styling, label and lifecycle/runtime status preserved | Selection tests and UI check |
| AC-003 | REQ-001/003; SCN-003 | Multiple task agents exist for the same regular agent | Every available task remains separately selectable at peer level | Distinct run-ID fixture plus rendered check |
| AC-004 | REQ-003/004; SCN-003 | Reload/inspect retained history, collapse/reopen Team, or view Team with no tasks | Existing available tasks and inspection behavior preserved; outer Team collapse hides its contents; no-task regular list unchanged | History/component regression coverage |
| AC-005 | REQ-003; SCN-002 | Inspection loads or fails | Existing loading/error/retry feedback continues on the task row | Existing inspection regression coverage |

## Relevant Scenarios And Journeys
| ID | Actor / goal | Trigger and steps | Outcome / alternate | Validity / evidence |
| --- | --- | --- | --- | --- |
| SCN-001 | User discovers delegated work | Team agent delegates to another agent; user opens Team run in workspace sidebar | Task visible without expanding a regular agent; empty Team-task list unchanged | Supported Normal Scenario; user screenshot and Team documentation |
| SCN-002 | User inspects task execution | Select visible task row by mouse/keyboard, then select regular agent | Correct separate execution; existing loading/retry if needed | Supported Normal Scenario; transient/stable row handlers |
| SCN-003 | User inspects multiple/retained work | Open run containing multiple or retained tasks; collapse/reopen outer run or load available history | Separate identities and existing availability preserved | Supported Normal Scenario; Team history/task inspection docs; projection tests corroborate |

## UI, Interaction And Experience
Applicable: Yes. Parallel means sibling rows vertically in the sidebar, not side-by-side columns. Preserve existing task visual treatment. Approved placement: place task rows immediately after the corresponding regular agent at equal indentation, keeping related work nearby and regular-agent order unchanged; multiple tasks retain their existing relative order. This placement is part of SR-001 approval.
Prototype/spec/final visual baseline: N/A — not requested. User screenshot is current-state evidence, not a new approved design reference. Existing Team/task-Team containers retain meaningful containment. No changes to Agent Orgs.

## Quality And Data Continuity
- QR-001 → REQ-003 / AC-002/005: preserve keyboard activation and truthful accessible hierarchy level.
- No persisted data change requested. Preserve all task/conversation/run identities and history. No data loss/reset authorized.
- External contracts: existing delegation and execution identity contracts unchanged. Architecture must verify the appropriate presentation boundary after approval.

## Supplements, Assumptions And Decisions
- Screenshot path is recorded in investigation notes; evidence-only, no supplement approval required.
- Product artifacts / independent review: N/A — not applicable at this phase.
- ASM-001: request concerns Team-run sidebar shown in screenshot, not standalone Agents navigation. Explicit in proposal for approval.
- DEC-001: approve same-level peer placement immediately following related regular agent, preserving existing task content/style. Approved by the explicit user message recorded above.

## Traceability
| Requirement | Use cases | Behaviors | ACs | Scenarios |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001/003 | BEH-001 | AC-001/003 | SCN-001/003 |
| REQ-002 | UC-002 | BEH-002 | AC-002 | SCN-002 |
| REQ-003 | UC-002/003 | BEH-002/003 | AC-002/003/004/005 | SCN-002/003 |
| REQ-004 | UC-001/003 | BEH-001 | AC-001/004 | SCN-001/003 |

## Architecture Phase Input
SCN-001–003 and all requirements approved. Architecture must verify navigation row ownership, depth/parent/expandability coupling, selection auto-expansion and whether retained task contexts take the same path. Keep exact execution identity and backend contracts unchanged. Technical decisions are owned by design-spec.md.

## Readiness
Current behavior evidenced; desired/preserved behavior explicit; scope/testability/scenario mapping complete. Product prototype N/A. Assumptions visible. **Content ready for approval: Yes. Approved basis ready for design: Yes — explicit user approval recorded above.**
