# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-005`
- Package identifier: `remove-web-todo-panel` (scope since SR-002: replace the dead To-Do panel with Background Tasks)
- Request / ticket: User report 2026-09-29 — To-Do section in the Activity tab is unused; follow-up: remove all to-do events and show Claude Agent SDK background tasks (running → finished) instead.
- Requirements owner: Solution Designer
- Date: 2026-09-29
- Approval state and reference: **Approved by the user 2026-09-29** ("Approve.") on baseline SR-004 including designer recommendations DEC-003 (only real background tasks) and DEC-007 (include Antigravity daemons via AGY message files, fail-safe). Earlier user decisions: DEC-001, DEC-004, DEC-005, DEC-006, DEC-008. Design guidance with approval: event-driven; replace the to-do event with a background-task event.
- Exact approved requirements baseline / solution revision: SR-004 content (recorded as approved in SR-005)
- Behavior-defining supplements and their approved versions: None
- Related prior decisions: `tickets/done/claude-sdk-streaming-input-session` DEC-006 deferred background-task UI to a later ticket; `tickets/done/remove-todo-list-tools` REQ-003 preserved the server/web to-do path (superseded here, its assumption disproven).

## Problem And Desired Outcome

- Problem:
  1. The Activity tab always shows an empty `To-Do — 0 Tasks` section. No runtime can fill it: native tools removed; Codex never enables plan mode, one mapped Codex event does not exist, Codex's real checklist event (`turn/plan/updated`) is not handled, and the payload shape never carries `todos`.
  2. Claude agents can run background tasks (background shell commands, background subagents, monitors, workflows). While they run, the user sees nothing. Completion only shows as a chat notice when Claude starts a follow-up turn.
- Affected actors or systems: users watching single-agent and team-member runs; server streaming; shared stream contracts; web client; Claude runtime backend.
- Desired outcome: The To-Do concept is gone end to end. The Activity tab shows a Background Tasks section with each Claude background task while running and after it finishes, above the Activity feed.
- Observable definition of success: No to-do UI/event anywhere. Starting a Claude background task makes it appear as running within the Activity tab; when it ends it shows its final status and summary.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | Activity tab stacks an always-empty To-Do section above the Activity feed. | The To-Do section is replaced in place by a Background Tasks section with the same section behavior (always present, collapsible, same expand/collapse interplay with Activity, Activity expanded by default); with no tasks it shows "No background tasks". | Tab name/position `Activity`; feed content, ordering, count, scrolling. | notes BEH-001 |
| BEH-002 | Contract | SCN-002 | Codex `item/plan/delta` / nonexistent `turn/taskProgressUpdated` → `TODO_LIST_UPDATE {todos: []}` on single-agent and team streams. | No to-do event type in server, contracts or web; those Codex notifications produce nothing. | All other Codex conversions and stream message types. | notes BEH-002, SR-002 Codex table |
| BEH-003 | User | SCN-001 | Right panel auto-switches to Activity when todos become non-empty (unreachable). | Removed. No tab auto-switch for background tasks either (DEC-006). | Other right-panel auto-switch behavior. | notes BEH-003 |
| BEH-004 | User | SCN-001 | Activity feed lists run activity. | Unchanged. | Everything. | notes BEH-004 |
| BEH-005 | User/System | SCN-003, SCN-004 | Claude background tasks are tracked server-side only; nothing visible while running. | Each background task of a Claude run appears in a Background Tasks section with description, kind, and running status; when it ends it shows completed / failed / stopped plus the summary. | Task execution itself; turn behavior. | notes SR-002 Claude table |
| BEH-007 | User/System | SCN-005 | Antigravity daemon commands (`IsDaemon`) outlive the turn; the tool call closes as "Started as a background task; still running when the turn ended." AGY's stream never reports daemon exit, but AGY writes a "… finished" message file with exit code at exit time (probes P3/P4). AutoByteus kills AGY's background process groups when AGY stops. Non-daemon AGY background commands keep the turn open and already show in the Activity feed. | If DEC-007 = include: each AGY daemon appears as a running Background Task when its turn ends; when it exits it shows completed (exit code 0) or failed (non-zero) in real time; if AGY is stopped first it shows stopped. | AGY tool-call result text and stop cleanup unchanged. | notes SR-003 |
| BEH-006 | User | SCN-004 | On completion, Claude may start a turn on its own, preceded by the chat notice "Background task completed: … (status)"; on interrupt, "… — Claude was stopped before reporting it". | Unchanged; the section adds live status, it does not replace the notice. | Notice text, run-history recording, Claude-initiated turns. | `claude-session.ts:421`, `claude-turn-tracker.ts:299,359` |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Desktop/web user | Know what the agent is doing, including work running after its turn ended | See running and finished background tasks; no dead To-Do UI | No loss of existing activity or notices |
| Maintainers | Coherent, owned contracts | Dead to-do contract replaced by a correctly-shaped, runtime-owned background-task contract | Server, contracts and web ship together |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- UC-001: User views the Activity tab of a single-agent run or a team-member run (BEH-001, BEH-003, BEH-004).
- UC-002: Server streams run events for every runtime to the web client without any to-do event (BEH-002).
- UC-003: A Claude agent starts one or more background tasks; the user sees them running and then finished in the Activity tab, for single-agent and team-member runs (BEH-005, BEH-006).

### Out Of Scope

- Stopping/killing a background task from the UI, or opening its output file from the section (candidate follow-up).
- Surfacing Codex's `turn/plan/updated` checklist or any plan/checklist feature.
- Background-task visibility for Codex, ACP, Grok and AutoByteus native (none report background tasks). The contract must not be Claude-specific in shape.
- AGY's withheld autonomous reaction to a daemon finish (shown only with the next user turn) — separate-ticket candidate.
- Restoring background tasks after app reload or for historical runs (DEC-005).
- Project Tasks (task board `TODO`/`IN_PROGRESS`/`DONE`) — unrelated, unchanged.
- Source `// TODO` comments; historical `tickets/done/**` artifacts.
- Mobile clients.

### Non-Goals

- Redesigning the Activity feed. Changing when Claude starts follow-up turns or the notice text.

### Preserved Behavior Boundary

- BEH-004, BEH-006, and preserved columns of BEH-001/BEH-002/BEH-005; REQ-004; AC-005, AC-006, AC-011.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | The Activity tab shows no To-Do section, count, or to-do empty state for any run. | BEH-001 | Must | Dead, misleading UI | User request |
| REQ-002 | The Background Tasks section takes the To-Do section's place and behaves like it does today: always present for every run, collapsible, same expand/collapse interplay with the Activity section, Activity expanded by default. With no tasks it shows a "No background tasks" empty state. | BEH-001, BEH-005 | Must | User: "the section behavior is how it behaves currently like the to do" | DEC-004 (user) |
| REQ-003 | The to-do event/message type and payload are removed from server runtime events, WebSocket messages, both shared stream contracts, and the web client (store, handler, panel, auto-switch). Codex `item/plan/delta` and the nonexistent `turn/taskProgressUpdated` mapping produce no event. | BEH-002, BEH-003 | Must | No producer can deliver data | DEC-001 (user, 2026-09-29) |
| REQ-004 | All other stream message types, Codex conversions, the Activity feed, Claude-initiated turns and their notices, and Project Tasks behave as before. | BEH-004, BEH-006 | Must | Preserve | — |
| REQ-005 | Active docs and localization catalogs contain no to-do panel/event entries and document the background-task behavior. | BEH-001, BEH-002, BEH-005 | Should | Docs sync | — |
| REQ-006 | When a Claude agent's background task starts, it appears in the Background Tasks section of that run (single agent and team member) as running, with its description and a kind label (e.g. shell, subagent, monitor, workflow). | BEH-005 | Must | Core request | User request; DEC-003 |
| REQ-007 | When a background task ends, its entry changes to its final status (completed, failed, or stopped) and shows the summary Claude reports. Finished entries stay listed for the rest of the live session. | BEH-005 | Must | "When it's finished, show that it's finished" | User request |
| REQ-008 | Only tasks Claude reports as background tasks are listed; foreground subagent/tool work (already visible in the Activity feed) is not duplicated. | BEH-005 | Must | Avoid duplication | DEC-003 |
| REQ-009 | If the Claude process ends (stop, crash, run end), tasks still shown as running are marked stopped rather than left running forever. | BEH-005 | Must | Background tasks die with the process (`registry.clear()`) | Evidence |
| REQ-010 | The section is titled "Background Tasks"; its header shows a running count and total count; entries are ordered newest first. Right-panel tab selection behaves exactly as today: nothing switches tabs when a task appears or changes. | BEH-003, BEH-005 | Must | Clear naming; users already watch Activity | DEC-006, DEC-008 (user) |
| REQ-011 | An Antigravity daemon command still running when its turn ends appears as a running Background Task (description from its command, kind shell). When AGY reports its exit, it shows completed (exit code 0) or failed (non-zero, with the exit code) without waiting for another turn. If AGY stops first, it shows stopped. If AGY's report cannot be read or understood, the entry stays running until AGY stops, then shows stopped (never a false completed). | BEH-007 | Should | User: "if it's possible, that's definitely good"; feasible per P3/P4 | DEC-007 |

## Acceptance Criteria

| AC ID | Related REQ | Related BEH / SCN | Preconditions / Trigger | Observable Expected Outcome | Alternate / Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-001 / SCN-001 | Open Activity tab (single agent, team member, any runtime) | No "To-Do", "Tasks" count or "No to-dos yet" text | — | Component test + rendered UI |
| AC-002 | REQ-002 | BEH-001 / SCN-001 | Run with no background tasks (e.g., Codex run) | "Background Tasks" section present with "No background tasks" and a 0 count, in the former To-Do position; Activity expanded by default; expand/collapse behaves as the To-Do/Activity pair does today | — | Component test + rendered UI |
| AC-003 | REQ-003 | BEH-002 / SCN-002 | Static search of active source (excl. `tickets/**`, logs) | No `TODO_LIST_UPDATE`, `agentTodoStore`, `todoHandler`, `TodoListPanel`, `types/todo`, `TURN_TASK_PROGRESS_UPDATED` in server, contracts (src + committed dist), web | — | Static audit |
| AC-004 | REQ-003, REQ-004 | BEH-002 / SCN-002 | Codex emits `item/plan/delta` | No event produced; other Codex conversions unchanged | — | Server unit tests |
| AC-005 | REQ-004 | BEH-004 | Existing suites | Server, contracts, web build/type-check; relevant suites pass; Project Tasks unchanged | — | Test runs |
| AC-006 | REQ-005 | — | Docs/localization review | No to-do entries; background-task behavior documented; localization audits pass | — | Static audit |
| AC-007 | REQ-006, REQ-010 | BEH-005 / SCN-003 | Claude agent runs `sleep 20; echo done > marker` with `run_in_background` and ends its turn | Within the Activity tab a Background Tasks section appears with one running entry (description + shell kind); header shows 1 running / 1 total; Activity tab is not auto-selected | — | Live E2E (server + websocket) + rendered UI |
| AC-008 | REQ-007 | BEH-005, BEH-006 / SCN-004 | Same task finishes | Entry shows completed and the reported summary; the existing chat notice and Claude-initiated turn still appear | A failing command shows failed | Live E2E + component test |
| AC-009 | REQ-006, REQ-007 | BEH-005 / SCN-003 | Claude team member starts a background task | Entry appears on that member's Activity tab only, not on other members | — | Team stream test |
| AC-010 | REQ-008 | BEH-005 | Claude runs a foreground subagent (non-background) | No Background Tasks entry for it; it remains visible as a tool call in the Activity feed | — | Unit test on server projection |
| AC-011 | REQ-009, REQ-004 | BEH-005, BEH-006 | Stop the run / kill the Claude process while a background task runs | Entry changes to stopped; existing stop notice behavior unchanged | — | Unit/integration test |
| AC-013 | REQ-011 | BEH-007 / SCN-005 | (a) AGY daemon `sleep 20; …` exits 0 after the turn; (b) daemon exits 3; (c) `python3 -m http.server` daemon, then user stops the run | (a) running at turn end → completed about 20 s later with no new user input; (b) → failed with exit code 3; (c) running → stopped. Tool call text unchanged | Unreadable/unknown message file → stays running until AGY stops → stopped. Non-daemon AGY background command produces no entry | Server unit tests (fixtures from P3/P4) + live AGY E2E |
| AC-012 | REQ-007 | BEH-005 | Two tasks, one finishes | Only that entry changes; running count decrements; order newest first | — | Component test |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | Related |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User | Follow agent activity | Open right-panel Activity tab | Any run | Open tab | Activity feed (plus Background Tasks section only if tasks exist) | Empty feed label | Supported Normal | Screenshot; `ProgressPanel.vue` | REQ-001, 002; AC-001, 002 |
| SCN-002 | Contract | Server streaming | Deliver run events | Runtime event incl. Codex plan delta | Streaming | Convert → project → send | No to-do event; others unchanged | — | Supported Normal | Converter/adapter code; Codex 0.159.0 schema | REQ-003, 004; AC-003, 004 |
| SCN-003 | User | User + Claude agent | See long-running work after the turn ended | Claude starts a background shell/subagent/monitor/workflow task | Claude run (single or team member) active | Agent starts task → turn may end → user opens Activity | Running entry with description + kind | Several concurrent tasks | Supported Normal | Probe C; registry code | REQ-006, 008, 010; AC-007, 009, 010 |
| SCN-005 | User | User + Antigravity agent | See a dev server/daemon the agent left running | AGY `run_command` with `IsDaemon` | AGY run active | Agent starts daemon → turn ends → user opens Activity | Running entry; stopped after run stop | Daemon exits 0 → completed; non-zero → failed; AGY stopped first → stopped | Supported Normal (if DEC-007 = include) | `agy-background-task-turn-liveness` P1; this ticket P3/P4 | REQ-011; AC-013 |
| SCN-004 | User | User + Claude agent | Know when background work finished | Task completes/fails/is stopped | Entry running | CLI reports completion → entry updates → Claude may start its own turn with notice | Final status + summary; notice unchanged | Process ends → entries stopped | Supported Normal | Probe C; streaming-input ticket REQ-003 | REQ-007, 009; AC-008, 011, 012 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`
- Prototype / Product ticket: N/A — not applicable (no Product Design requested)
- Required layout and states:
  - Activity tab: `Background Tasks` section in the To-Do section's place above `Activity`, always present, with the same section behavior as the To-Do section today (collapsible header, same accordion interplay with Activity, Activity expanded by default). Empty state: "No background tasks".
  - Section header: title `Background Tasks`, count (running and total). Activity keeps its header and count.
  - Entry: status indicator (running = animated/in-progress; completed; failed; stopped), description (truncated with full text on hover), kind label, and for finished entries the summary (truncated, expandable or hover).
  - No tab auto-switch when a task appears.
  - Strings localized (en, zh-CN).
- Unresolved product decisions: DEC-003..DEC-006 pending user confirmation.

## Quality And Non-Functional Requirements

| Quality ID | Related | Area | Requirement | Conditions | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-003 | Compatibility | Server, contracts and web change together; no shim for the removed message. | Desktop bundle ships server + web together | Design confirms web tolerates unknown message types |
| QR-002 | REQ-006, REQ-007 | Performance | Status updates reach the UI within the same latency as other stream events; progress frames must not flood the stream (throttle or ignore `task_progress` if needed). | Long-running subagent tasks | Design decision + unit test |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`. Background-task list is live-session state; acceptable to lose on reload/restart (DEC-005). Existing chat notices remain the durable record.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence | Uncertainty |
| --- | --- | --- | --- |
| Claude Agent SDK / CLI system frames `background_tasks_changed`, `task_started`, `task_updated`, `task_notification` (`task_progress` optional) | Source of task identity, description, kind, status, summary | SDK 0.3.231 typings; Probe C (CLI 2.1.281) | Server pins SDK 0.3.280; verify field shapes in design |
| Codex app-server protocol 0.159.0 | `turn/taskProgressUpdated` absent; `item/plan/delta` plan-mode only | Generated schema | — |

## Supplemental Artifacts

| Artifact Path | Purpose | Related | Status | Approval |
| --- | --- | --- | --- | --- |
| None | — | — | — | — |

## Assumptions

| ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | No external consumer depends on `TODO_LIST_UPDATE`. | Clean removal | Repo-wide grep incl. mobile/gateway/applications | Validated |
| ASM-003 | AGY writes a message file with `sourceMetadata.tool.stepIndex` and "exited with code N" when a daemon exits (AGY 1.2.13). | REQ-011 | Probes P3/P4; fail-safe required for format drift | Validated for 1.2.13 |
| ASM-002 | Claude CLI reports background membership via `background_tasks_changed` and/or `is_backgrounded`, and ends every task with `task_notification` or `task_updated` status. | REQ-006..009 | Probe C evidence; re-probe in design/validation | Partially validated |

## Open Decisions And Questions

| ID | Question | Why It Matters | Options / Evidence | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | How far should to-do removal go? | Scope | A: remove whole to-do path | User | **Decided 2026-09-29: A.** User: "I want to remove all the to-do list events" |
| DEC-002 | Activity-alone layout | UX | Superseded by DEC-004 | — | Superseded |
| DEC-003 | Which Claude tasks are listed? | Duplication vs completeness | Only tasks Claude reports as background (background shell, background subagents, monitors, workflows) | User | **Decided 2026-09-29: approved recommendation** |
| DEC-004 | When is the section visible? | Layout | Always present like today's To-Do, empty state "No background tasks" | User | **Decided 2026-09-29:** "the section behavior is how it behaves currently like the to do… no background tasks and just like the to do section today" |
| DEC-005 | Persistence | Scope/risk | Live session only; not restored after app reload or for history | User | **Decided 2026-09-29:** "of course it's not a persistent" |
| DEC-006 | Auto-switch to Activity tab when a task starts? | Tab hijacking | No auto-switch; keep today's tab behavior | User | **Decided 2026-09-29:** "no tab switching… keep it as how it behaves now" |
| DEC-007 | Include Antigravity daemons? | Coverage vs. dependency on AGY internal files | **Recommended: include**, using AGY's per-conversation "… finished" message files for real-time completed/failed (P3/P4), failing safe to stopped. Risk: undocumented AGY file format (precedent: AutoByteus already reads AGY step output files). Alternative: Claude only now, AGY later. | User | **Decided 2026-09-29: approved recommendation (include)** |
| DEC-008 | Name | Clarity | "Background Tasks" | User | **Decided 2026-09-29:** "Let's name it as a background tasks" |

## Traceability

| REQ | Use Cases | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001 | SCN-001 |
| REQ-002 | UC-001 | BEH-001, BEH-005 | AC-002 | SCN-001 |
| REQ-003 | UC-002 | BEH-002, BEH-003 | AC-003, AC-004 | SCN-002 |
| REQ-004 | UC-001..003 | BEH-004, BEH-006 | AC-004, AC-005, AC-008, AC-011 | SCN-001..004 |
| REQ-005 | UC-001..003 | BEH-001, BEH-002, BEH-005 | AC-006 | — |
| REQ-006 | UC-003 | BEH-005 | AC-007, AC-009 | SCN-003 |
| REQ-007 | UC-003 | BEH-005 | AC-008, AC-009, AC-012 | SCN-004 |
| REQ-008 | UC-003 | BEH-005 | AC-010 | SCN-003 |
| REQ-009 | UC-003 | BEH-005 | AC-011 | SCN-004 |
| REQ-010 | UC-001, UC-003 | BEH-003, BEH-005 | AC-007, AC-012 | SCN-003 |
| REQ-011 | UC-003 | BEH-007 | AC-013 | SCN-005 |

## Architecture Phase Input

- Scenario paths: SCN-001 (right panel → ProgressPanel), SCN-002 (Codex converters → AgentRunEvent → presentation adapter/projector → WebSocket/team stream → web projector), SCN-003/004 (Claude CLI frames → `ClaudeBackgroundTaskRegistry`/session → new runtime event → presentation/team projectors → web store → section).
- Constraints: runtime-neutral contract shape; registry stays the single owner of Claude background-task state; preserve notices/turns; rebuild committed contract dist.
- Deferred to design: event naming and granularity (per-task upsert vs full-set snapshot), `task_progress` handling, process-end handling, web store/state ownership, component placement.
- Technical facts to verify: SDK 0.3.280 frame shapes; whether `task_started` carries `is_backgrounded`; frame ordering; team-member routing.
- Risks: moderate — new cross-package contract plus Claude session projection.

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

- User approval received: `Yes` (2026-09-29, "Approve.")
- Exact requirements and supplement approval basis recorded: `Yes` (SR-004 content; SR-005)
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
