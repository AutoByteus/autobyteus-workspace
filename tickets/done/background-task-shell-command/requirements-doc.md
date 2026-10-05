# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-002` (requirements baseline SR-001 unchanged)
- Package identifier: `background-task-shell-command`
- Request / ticket: Show the shell command of a background task in Activity → Background Tasks
- Requirements owner: Solution Designer
- Date: 2026-10-05
- Approval state and reference: Approved by the user on 2026-10-05 ("agreed. approve"), including DEC-001 option A
- Exact approved requirements baseline / solution revision: SR-001 (REQ-001..007, AC-001..006, SCN-001..004, DEC-001 = A)
- Behavior-defining supplements and their approved versions: None

## Problem And Desired Outcome

- Problem: A background shell task row shows only the model-written description (e.g. "Wait for release workflows to complete") and the label "Shell". The user cannot tell which command is actually running without searching the chat history.
- Affected actors or systems: The user watching an agent or team-member run. The Claude and Antigravity runtime backends. The background-task stream contract.
- Desired outcome: When the command of a shell-type background task is known, the row shows it next to the "Shell" label.
- Observable definition of success: A Claude background Bash or Monitor task shows `Shell · <command>` in the panel while it is running and after it finishes.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | Claude background Bash row: description + "Shell". The command is not shown. | The row also shows the Bash command. | Title = description; status chip; counts; ordering; summary after finish | probe-bash-bg.log; BackgroundTaskPanel.vue |
| BEH-002 | User | SCN-002 | Claude Monitor task row: description + "Shell". The command is not shown. | The row also shows the monitored command. | Same as BEH-001 | probe-monitor.log |
| BEH-003 | User | SCN-003 | AGY `run_command` row: title = the command line, plus "Shell". | No visible change. The command is not repeated under a title that already is the command. | AGY title | agy-background-task-monitor.ts |
| BEH-004 | User | SCN-004 | Subagent/workflow/other rows: description + kind. | Unchanged (they have no shell command). | Entire row | registry |
| BEH-005 | System | SCN-001 | No runtime command data reaches the frontend for background tasks. | The background-task snapshot carries the command when known, and "unknown" otherwise. | Upsert-by-task-id semantics; live-only (not persisted) | contract, domain model |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Constraint |
| --- | --- | --- | --- |
| User watching a run | Understand what a background shell is doing | The command is visible in the Background Tasks row | The row must stay compact and readable for long commands |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | See the command of a Claude background Bash task in the panel | SCN-001 |
| UC-002 | See the command of a Claude Monitor task in the panel | SCN-002 |
| UC-003 | AGY background command rows keep showing their command once (no duplication) | SCN-003 |

### Out Of Scope

- Showing live or interim output of a background task, or its output file.
- Stopping or killing tasks from the panel.
- Persisting background tasks across reload or restore.
- Adding background-task support to runtimes that do not report them today (Codex, Grok, ACP, AutoByteus).
- Changing chat tool cards.
- Prompts or arguments of subagent and workflow tasks.

### Non-Goals

- Pretty-printing, syntax-highlighting or shortening commands (e.g. removing `cd …&&` prefixes).

### Preserved Behavior Boundary

- BEH-003, BEH-004 preserved columns. The status chip, counts, newest-first ordering, the finished-task summary (BEH-005 in investigation notes), the "Untitled task" fallback and the collapse toggle stay unchanged.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved REQ/AC/BEH ID.
- New product behavior is a `Requirement Gap` and requires explicit user approval.
- Adjacent concerns are non-blocking recommendations only.
- Reviewer comments do not amend this basis without renewed user approval.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | A background-task snapshot carries an optional command string. It is null or absent when the runtime does not know a command. | BEH-005 | Must | The frontend cannot show what it does not receive. | User request; contract investigation |
| REQ-002 | For Claude background tasks started by a Bash or Monitor tool call, the snapshot's command is the exact `command` input of that tool call, matched by the task's tool-use identity. | BEH-001, BEH-002 | Must | Verified feasible by live probe. | probe logs |
| REQ-003 | For AGY background `run_command` tasks, the command is the step's command line. The row title stays the same as today. | BEH-003 | Should | Keeps the runtime-neutral meaning consistent. | agy monitor |
| REQ-004 | When the command is unknown (no correlated tool call, older CLI, other task kinds), the row looks exactly as it does today. | BEH-004, BEH-005 | Must | Graceful degradation (RSK-001). | — |
| REQ-005 | When a row's task has a known command that differs from its title, the second line shows `Shell · <command>` in monospace on one truncated line. The full command is available on hover and can be expanded by clicking (same interaction as the existing summary). | BEH-001, BEH-002 | Must | Compact row; full command reachable. Mirrors the chat `Bash · <command>` card. | DEC-001 |
| REQ-006 | When the known command equals the row title (AGY), the command is not repeated. | BEH-003 | Must | Avoid duplicated text. | — |
| REQ-007 | A command that becomes known after the task first appears (follow-up snapshot) appears in the existing row without creating a duplicate row. | BEH-001, BEH-005 | Must | Claude reports the task set before the start frame that carries the correlation. | probe-bash-bg.log |

## Acceptance Criteria

| AC ID | Related REQ | Related BEH / SCN | Preconditions / Trigger | Observable Expected Outcome | Alternate / Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002, REQ-005, REQ-007 | BEH-001 / SCN-001 | Claude agent runs Bash `run_in_background:true` with command `sleep 6 && echo BG_DONE` | One running row: title = description, second line `Shell · sleep 6 && echo BG_DONE` (monospace). After completion the row still shows the command, plus the summary. | — | Server unit (registry correlation) + web component test + live Claude E2E |
| AC-002 | REQ-002, REQ-005 | BEH-002 / SCN-002 | Claude agent uses the Monitor tool | The row shows `Shell · <monitored command>`. | — | Server unit + live probe |
| AC-003 | REQ-005 | BEH-001 | Command longer than the panel width | One truncated line. Hover shows the full command. Clicking expands it to the full wrapped command, and clicking again collapses it. | — | Web component test |
| AC-004 | REQ-003, REQ-006 | BEH-003 / SCN-003 | AGY daemon `run_command` left running | Title = command line, second line "Shell" only (no duplicate command). | — | Server unit + web component test |
| AC-005 | REQ-004 | BEH-004 / SCN-004 | Subagent/workflow task, or a shell task whose start frame has no tool-use identity | The row is identical to the current rendering (description + kind label). | No error, no "null" text | Server unit + web component test |
| AC-006 | REQ-001 | BEH-005 | Single-agent and team-member streams | The command reaches the panel for both a standalone agent run and a team member run. | — | Contract/adapter tests |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal / Event | Trigger | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | Related REQ/AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User watching a Claude agent | Know which command a background shell runs | Agent runs Bash with `run_in_background` (e.g. waiting for release workflows) | Activity tab open on that run | Agent issues Bash → task appears Running → finishes | Row shows the description, `Shell · <command>`, the status, and later the summary | Unknown correlation: the row is shown as today | Supported Normal Scenario | User screenshot; probe-bash-bg.log | REQ-001/002/004/005/007; AC-001/003/005/006 |
| SCN-002 | User | User watching a Claude agent | Same, for Monitor | Agent uses the Monitor tool | Same | Same | Same | Same | Supported Normal Scenario | probe-monitor.log | REQ-002/005; AC-002 |
| SCN-003 | User | User watching an AGY agent | Same | AGY turn ends with a `run_command` daemon still running | Same | Same | Title shows the command once, plus "Shell" | — | Supported Normal Scenario | agy monitor | REQ-003/006; AC-004 |
| SCN-004 | User | User watching a Claude agent | See subagent/workflow tasks | Background Agent/Workflow tool | Same | Same | Unchanged rows | — | Supported Normal Scenario | p02/p03 logs | REQ-004; AC-005 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (small addition to an existing row; no Product Design requested)
- Linked UI/UX supplement, runnable reference, Product ticket, design revision, UI/UX confirmation, visual baseline: `N/A — not applicable`
- Normative details: second line `<Kind label> · <command>`. The kind label keeps its current gray style. The command is monospace, gray, single-line truncated with an ellipsis, and the full command is in the tooltip. Click (keyboard-focusable button) toggles full wrapped display, with `aria-expanded` reflecting the state, matching the existing summary toggle.
- Permitted variation: exact spacing and color shades within the existing panel palette.
- Explicitly unresolved product decisions: None (DEC-001 decided: option A).

## Quality And Non-Functional Requirements

| Quality ID | Related | Area | Requirement | Conditions | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-002 | Reliability | Command correlation state is released when the runtime session closes or exits, and does not grow without bound during a long run. | Claude runs | Server unit test |
| QR-002 | REQ-005 | Accessibility | The expand control is keyboard-operable and exposes `aria-expanded`. | Web | Component test |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`. Background tasks are live-only and not persisted.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior | Evidence | Risk |
| --- | --- | --- | --- |
| Claude CLI task frames (`task_started.tool_use_id`) | Used for correlation | Live probe, CLI 2.1.283 / SDK 0.3.280 | Undocumented. Absence degrades per REQ-004. |
| `BACKGROUND_TASK_UPDATED` agent/team presentation contract | Gains the optional command | contracts source | Server and web ship together. |

## Supplemental Artifacts

| Artifact Path | Purpose | Related IDs | Status | Approval Applicability |
| --- | --- | --- | --- | --- |
| `evidence/probe-bash-bg.log`, `evidence/probe-monitor.log`, `evidence/probes/claude-bg-command-probe.mjs` | Feasibility evidence | REQ-002, AC-001, AC-002 | Evidence | Not behavior-defining |

## Assumptions

| ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Showing the command in the panel exposes no new information, since the same command is already shown in the chat tool card for the same user. | Privacy | Investigation | Accepted |

## Open Decisions And Questions

| ID | Question | Why It Matters | Options | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | How should a long command be displayed? | Row compactness vs. full visibility | (A, proposed) one truncated monospace line + hover tooltip + click to expand. (B) tooltip only. (C) always wrap the full command. | User | Decided: A (user approval 2026-10-05) |

## Traceability

| REQ | UC | BEH | AC | SCN | Supplemental |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001, UC-002 | BEH-005 | AC-001, AC-006 | SCN-001 | — |
| REQ-002 | UC-001, UC-002 | BEH-001, BEH-002 | AC-001, AC-002 | SCN-001, SCN-002 | probe logs |
| REQ-003 | UC-003 | BEH-003 | AC-004 | SCN-003 | — |
| REQ-004 | UC-001 | BEH-004, BEH-005 | AC-005 | SCN-004 | — |
| REQ-005 | UC-001, UC-002 | BEH-001, BEH-002 | AC-001, AC-003 | SCN-001 | — |
| REQ-006 | UC-003 | BEH-003 | AC-004 | SCN-003 | — |
| REQ-007 | UC-001 | BEH-001 | AC-001 | SCN-001 | probe-bash-bg.log |

## Architecture Phase Input

- Approved scenario paths to map: SCN-001..SCN-004.
- Constraints: strict contract shared by agent and team streams. Upsert semantics. Live-only. Server and web change together.
- Deferred to architecture: where the Claude correlation lives (registry vs. tool-use coordinator), the contract field name and shape, AGY dedupe responsibility (server vs. UI).
- Facts to verify: the auto-backgrounded Bash path (UNK-001), and the cleanup of the correlation map.
- Feasibility risks: RSK-001.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios covered with validity and evidence: `Yes`
- Product design and supplemental evidence integrated: `N/A`
- UI/UX approval basis: `N/A`
- Material assumptions and open decisions visible: `Yes`
- Content ready for user approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- User approval received: `Yes`
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
