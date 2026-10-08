# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-004`
- Package identifier: `task-closed-status`
- Request / ticket: Project Task "Add a Closed (not needed / won't do) Task status, separate from DONE" (user request 2026-10-08, via `/project_task_manager`)
- Requirements owner: Solution Designer (`/software_engineering_team/solution_designer`)
- Date: 2026-10-08
- Approval state and reference: Approved — User, 2026-10-08: "Let's do not make it so complicated … Just have your design create a clean UI. I like your suggestion. Basically, to do in progress, down, and a small closed control next to the refresh button shows a closed [lane] on demand. Yeah." This approves the suggestion as presented (name Closed; hidden by default with a small "Closed (N)" toggle beside Refresh revealing a Closed lane after Done, absent when none are closed; agents may reopen; Temp tasks the same) on top of SR-002 (no status control in the app).
- Exact approved requirements baseline / solution revision: this document at SR-003
- Behavior-defining supplements and their approved versions: None

## Problem And Desired Outcome

- Problem: A Task can only be TODO, IN_PROGRESS or DONE. A planned Task that turns out to be unnecessary must either be marked DONE, which falsely records it as completed, or left TODO forever, cluttering the board. Status is agent-owned: only agents change it through `create_or_update_task`, and the app only displays it (unchanged by this request, user 2026-10-08).
- Affected actors or systems: desktop user (Projects pages, right-panel Projects tab); agents using `create_or_update_task`, `list_project_tasks`, `delegate_task`, `send_message_to`; the Task's workers (delegated agent/team copies); the `/ws/projects` change feed; persisted Task data.
- Desired outcome: a distinct terminal status, working name **CLOSED** (shown as "Closed"), meaning "dropped, not needed, not completed". Agents close and reopen Tasks through `create_or_update_task`. Closing stops the Task's workers exactly as DONE does. The app displays Closed Tasks clearly distinguished from Done; it has no status control.
- Observable definition of success: an agent (for example on the user's request in chat) closes an unneeded Task with `create_or_update_task`. On the board it leaves the open lanes and shows as Closed (not Done), and its workers stop. Verified by tests and by the user in the desktop app.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | SCN-002, SCN-004 | Agent sets TODO/IN_PROGRESS/DONE; DONE closes and stops workers | Agent can also set CLOSED; CLOSED closes and stops workers exactly as DONE | All DONE behavior, retry-by-repeat, omitted-field preservation | notes BEH-001 |
| BEH-002 | User | SCN-005 | No user status control; the app only displays status | Unchanged: no user status control; the app displays CLOSED read-only like the other statuses | Create/edit/delete; read-only status display; "only agents change status" | notes BEH-002; user 2026-10-08 |
| BEH-003 | User | SCN-005 | 3 lanes; every Task in one lane | Closed Tasks are kept out of the open lanes and shown distinctly per DEC-002 | Existing 3 lanes, search, counts, ordering, live highlight | notes BEH-003 |
| BEH-004 | User | SCN-006 | Temp board Open/Done; non-DONE counts as Open | Closed Temp tasks are neither Open nor Done; shown as Closed; not counted as open | Temp tasks stay read-only in the app | notes BEH-004 |
| BEH-005 | Contract | SCN-004 | Filter among 3 values | Filter accepts CLOSED | Unfiltered listing returns every Task | notes BEH-005 |
| BEH-006 | Contract | SCN-002, SCN-004 | DONE refuses assignment/reactivation | CLOSED refuses them identically; reopening a Closed Task allows the same assigner-only reactivation as after DONE | Reactivation rules | notes BEH-006 |
| BEH-007 | User | SCN-005 | Open count = not DONE | Open count = TODO + IN_PROGRESS (Closed is not open) | Delete confirm counts all Tasks | notes BEH-007 |
| BEH-008 | System | SCN-002, SCN-003 | Feed carries 3 values | Feed carries CLOSED; open pages update live | Feed semantics | notes BEH-008 |
| BEH-009 | Contract | — | Stored Tasks have 3 values | Stored Tasks may also be CLOSED; existing Tasks unchanged without migration loss | Existing data readable as before | notes BEH-009 |
| BEH-010 | Contract | SCN-002 | No current supported behavior (workaround: DONE or leave TODO) | New: close as not needed | — | notes BEH-010 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Desktop user | Drop Tasks that are not needed (by asking an agent) | Sees Closed Tasks distinctly from Done; open lanes uncluttered | App remains display-only for status |
| Agent with Project tools | Record that a Task was dropped | Set/filter/reopen CLOSED; workers stop | Tool descriptions must explain the meaning; agents are the only status writers |
| Workers of a Task | Stop when the Task no longer needs them | Same stop/remove as DONE | No new lifecycle semantics |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-002 | Agent closes any Task (Project or Temp) by ID through `create_or_update_task` | SCN-002 |
| UC-003 | Agent reopens a Closed Task via the tool | SCN-003 |
| UC-004 | Agent lists Project Tasks filtered by CLOSED | SCN-004 |
| UC-005 | User sees Closed Tasks distinctly from Done on the Project board, Task page and right panel | SCN-005 |
| UC-006 | User sees Closed Temp tasks distinctly from Open and Done | SCN-006 |

### Out Of Scope

- Any user status control in the app (no Close/Reopen button, status picker or drag-and-drop) for Project Tasks or Temp tasks. Status is changed only by agents through `create_or_update_task` (user decision 2026-10-08).
- A required reason/comment for closing.
- Changes to the Project Task Manager agent/skill in the separate `autobyteus-agents` repository (follow-up candidate: teach it CLOSED and dependency handling).
- Automatic closing, bulk close, or archiving/purging of closed Tasks.

### Non-Goals

- Downgrade compatibility: an older app version may not show a Task stored as CLOSED (the file stays on disk and shows again after upgrading).
- Transition restrictions in the agent tool beyond today's (the tool keeps accepting any explicit status, including DONE ↔ CLOSED).

### Preserved Behavior Boundary

- BEH-001..BEH-009 preserved columns; in particular DONE semantics, reactivation rules, Task create/edit/delete, search, ordering, Refresh, live feed queue/replay, delete-confirm counts, Temp tasks read-only.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate. It is not a required design correction.
- A downstream reviewer comment does not amend this requirements basis. The Solution Designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | A Task (Project or Temp) shall have a fourth status, `CLOSED`, meaning dropped without completion. It is shown as "Closed" (en) / "已关闭" (zh-CN), distinct from DONE in every place a status is shown. | BEH-010 | Must | Core request | User 2026-10-08; DEC-001 |
| REQ-002 | Setting a Task to CLOSED shall close and stop its workers exactly as DONE does today (same closure, stop request, retry by repeating, removal from the run), for both Project and Temp Tasks, whether set by the user or an agent. | BEH-001, BEH-006 | Must | Nothing keeps running for a dropped Task | Request |
| REQ-003 | While a Task is CLOSED, saved-ID delegation (`delegate_task` with `task_id`) and reactivation of its workers shall be refused as they are for DONE, with guidance that names the Task's actual status. | BEH-006 | Must | Same terminal semantics | Request |
| REQ-004 | `create_or_update_task` shall accept `CLOSED` as a patch status (never on create). Its schema enum and descriptions, and the related LLM-facing texts for `delegate_task` and `send_message_to`, shall explain CLOSED (not needed, not completed; stops workers like DONE; reopen to TODO/IN_PROGRESS to continue). Invalid-status errors shall list all four values. | BEH-001, BEH-006 | Must | Agents must use it correctly | Request |
| REQ-005 | `list_project_tasks` shall accept `CLOSED` as a status filter; an unfiltered list includes Closed Tasks. | BEH-005 | Must | Request | Request |
| REQ-006 | ~~Withdrawn in SR-002~~ The app shall offer no control that changes a Task's status; CLOSED is displayed read-only like the other statuses. | BEH-002 | Must | Status is agent-owned; app is display-only | User 2026-10-08 (DEC-003) |
| REQ-007 | Agents can reopen a Closed Task to TODO or IN_PROGRESS through `create_or_update_task`; reopening starts nothing. After reopening, the existing assigner-only reactivation rules apply exactly as after DONE. | BEH-001, BEH-006 | Must | Mistakes are recoverable; mirrors DONE reopen | DEC-004 |
| REQ-008 | The Project board shall keep Closed Tasks out of To Do / In Progress / Done and hide them by default. A small toolbar toggle "Closed (N)" beside Refresh shows them in a separate Closed lane after Done and hides it again; the toggle is absent when the Project has no Closed Task. The board otherwise looks as today (clean). The same applies to the compact board in the right-panel Projects tab. | BEH-003 | Must | Visibly different from Done; declutter | DEC-002 |
| REQ-009 | The Task page, right-panel Task detail and board rows shall label a Closed Task "Closed" with a style distinct from Done. | BEH-003 | Must | Visibly different | Request |
| REQ-010 | Temp tasks: a Closed Temp task shall not appear as Open or Done; it is hidden by default with the same "Closed (N)" toggle revealing a Closed lane, its Task page labels it Closed, and the Temp tasks header count excludes it. Temp tasks stay read-only in the app. | BEH-004 | Must | Every three-status assumption updated | Request; DEC-005 |
| REQ-011 | A Project's open-Task count shall count only TODO and IN_PROGRESS. The Project delete confirmation keeps counting all Tasks. | BEH-007 | Must | Closed is not open | Request |
| REQ-012 | Status changes to and from CLOSED by an agent shall reach open Projects pages live through the existing change feed, including lane moves and counts. | BEH-008 | Must | Existing live behavior | Request |
| REQ-013 | Existing stored Tasks (TODO/IN_PROGRESS/DONE, Project and Temp) shall keep loading and behaving unchanged after upgrade, with no data loss. | BEH-009 | Must | Compatibility | Request |
| REQ-014 | Server and web docs (`autobyteus-server-ts/docs/modules/projects.md`, `autobyteus-web/docs/projects.md`) shall describe the new status and its display, keeping the "only agents change status" rule. | All | Should | Docs truthfulness | Request |

## Acceptance Criteria

| AC ID | Related REQ | Related BEH / SCN | Preconditions / Trigger | Observable Expected Outcome | Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-002, REQ-009 | SCN-002, SCN-005 | TODO or IN_PROGRESS Project Task with a running delegated worker; an agent sets it CLOSED | Task status CLOSED; Task page and right-panel detail show "Closed" (not Done style); worker stopped and removed from the run like DONE; root shows Offline/closed | — | Server unit/E2E + web component + desktop user verification |
| AC-002 | REQ-006 | SCN-005 | Any Task in any status, Project or Temp | No control on the board, Task page or right panel changes status; GraphQL exposes no status write | — | Web component + server GraphQL |
| AC-003 | REQ-007 | SCN-003 | Closed Task; agent sets TODO (or IN_PROGRESS) | Status changes; Task returns to its lane live; no worker starts | — | Server unit + web store |
| AC-004 | REQ-002, REQ-004 | SCN-002 | Agent calls `create_or_update_task {task_id, status:"CLOSED"}` on a Project Task and on a Temp task with open workers | Ack `status: CLOSED`; workers closed and stop requested exactly as DONE; repeating CLOSED retries the stop | `create` with status still fails `TASK_CREATE_STATUS_UNSUPPORTED`; invalid status error lists TODO, IN_PROGRESS, DONE, CLOSED | Server unit + E2E |
| AC-005 | REQ-003 | SCN-002 | Task is CLOSED | `delegate_task {task_id}` fails without spawning; messaging a closed worker's run ID is refused with guidance to move the Task to TODO/IN_PROGRESS first | After reopen, assigner reactivation works as after DONE | Server unit/E2E |
| AC-006 | REQ-005 | SCN-004 | Project with Tasks in all four statuses | `list_project_tasks {status:"CLOSED"}` returns only Closed Tasks; unfiltered returns all four | — | Server unit/E2E |
| AC-007 | REQ-004 | SCN-002 | Tool schemas/descriptions rendered to an agent | `status` enums for both tools include CLOSED; descriptions state its meaning, worker stop, and reopen path; `delegate_task`/`send_message_to` texts mention CLOSED with DONE | — | Server unit |
| AC-008 | REQ-008, REQ-009 | SCN-005 | Board with Tasks in all four statuses | To Do / In Progress / Done lanes exclude Closed; Closed hidden by default; "Closed (N)" toggle beside Refresh reveals a Closed lane after Done and hides it again; toggle absent with no Closed Task; same in right-panel compact board | — | Web component + desktop verification |
| AC-009 | REQ-010 | SCN-006 | Temp tasks in TODO, DONE and CLOSED | Closed one is in neither Open nor Done; hidden by default, revealed by the Closed toggle; Temp page labels it Closed; header count excludes it | — | Web component |
| AC-010 | REQ-011 | SCN-005 | Project with Tasks in all four statuses | Project card open count = TODO + IN_PROGRESS; delete confirm counts all four | — | Server + web |
| AC-011 | REQ-012 | SCN-002, SCN-003 | Board open; an agent closes or reopens a Task | Board updates live, lane move highlighted, counts follow | — | Server feed test + web store test |
| AC-012 | REQ-013 | — | App data with existing TODO/IN_PROGRESS/DONE Project and Temp Tasks from the current release | All load unchanged; no rewrite required | — | Server store test |
| AC-013 | REQ-014 | — | Docs | Docs describe CLOSED, its display, and that only agents change status | — | Review |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator | Goal Or Event | Trigger / Entry Surface | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | Related REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-002 | Contract | Agent (e.g. Project Task Manager, often on the user's chat request) | Record a Task as not needed | `create_or_update_task {task_id, status:"CLOSED"}` | Any Task | Patch status | Ack CLOSED; workers stopped; delegation/reactivation refused while Closed | Invalid status error | Supported Normal Scenario (new) | Request | REQ-001,002,003,004,012; AC-001,004,005,007,011 |
| SCN-003 | Contract | Agent | Undo a mistaken close | `create_or_update_task` status TODO/IN_PROGRESS | Task CLOSED | Patch status | Chosen status; nothing starts | — | Supported Normal Scenario (mirrors DONE reopen) | Request; DEC-004 | REQ-007; AC-003,005 |
| SCN-004 | Contract | Agent | Review dropped Tasks | `list_project_tasks {status:"CLOSED"}` | Project with Closed Tasks | List | Only Closed returned | — | Supported Normal Scenario | Request | REQ-005; AC-006 |
| SCN-005 | User | Desktop user | See the board without dropped work, still able to find it | Project board / right-panel Projects tab | Board with Closed Tasks | View; optionally toggle Closed | Open lanes uncluttered; Closed visible on demand, distinct from Done | — | Supported Normal Scenario | Request; DEC-002 | REQ-008,009,011; AC-008,010 |
| SCN-006 | User | Desktop user | See Temp tasks an agent closed | Temp tasks board/page | Agent closed a Temp task | View | Not Open, not Done; labelled Closed | — | Supported Normal Scenario | Request | REQ-010; AC-009 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (small, existing-pattern changes)
- Linked UI/UX or interaction supplement: None
- Linked runnable UI reference, separate design repository/root, UI/UX specification, and applicable support artifacts: N/A — not applicable
- Product ticket record and folder (externally owned): N/A — not applicable
- Design repository revision or commit: N/A — not applicable
- UI/UX user-confirmation reference: N/A — not applicable
- Approved visual-reference baseline: N/A — not applicable
- Normative visual and interaction details: display only. "Closed" pill/label in a neutral/muted style distinct from Done's green; board presentation per REQ-008; labels in en and zh-CN; status never shown by colour alone. No status controls.
- Explicitly illustrative / permitted variation: exact colours and icon within the existing palette.
- Required states: Task page / right-panel detail / board row showing CLOSED; board Closed hidden/shown (REQ-008); Temp Closed.
- Explicitly unresolved product decisions: None.

## Quality And Non-Functional Requirements

| Quality ID | Related REQ / AC | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-008, REQ-009 | Accessibility | Closed is conveyed by text, not colour alone; the Closed toggle is a keyboard-operable button with an accessible name and pressed state | Task page, board | Web component a11y assertions |
| QR-002 | REQ-001 | Compatibility | Both en and zh-CN catalogs carry all new strings (catalog parity test passes) | Web | `projectsCatalog.spec.ts` |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes` (new allowed value of `status` in Project and Temp `task.json`)
- Data or state that must be preserved: every existing Task and its status, context files and agent-run resources.
- Loss, reset, rebuild, or regeneration that is acceptable: none on upgrade. On downgrade, Closed Tasks may be hidden by the older app (non-goal).
- Retention, privacy, compliance, volume, downtime, or operational constraints: none beyond current.
- Unknowns requiring downstream investigation: whether repository migration conventions require any marker (architecture phase).

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Agent tool contract (`list_project_tasks`, `create_or_update_task`, `delegate_task`, `send_message_to`) | Additive enum value and wording | tool contract source | Agents built against old descriptions will learn from new descriptions |
| Project Task Manager skill (separate repo) | Not changed here | SKILL.md | Follow-up candidate (R-002) |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| None | — | — | — | — |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The user closes a Task by asking an agent (e.g. in chat), which calls `create_or_update_task` | App is display-only for status | Confirmed by user 2026-10-08 | Resolved |

## Open Decisions And Questions

| ID | Question | Why It Matters | Options / Evidence | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Name of the new status | Shown to users and agents; must not be confused with DONE | `CLOSED` / "Closed" (zh-CN "已关闭") | User | Resolved (SR-003) |
| DEC-002 | Board presentation of Closed Tasks (Project board, right panel, Temp board) | Declutter vs visibility | Hidden by default; small "Closed (N)" toggle beside Refresh reveals a Closed lane after Done; absent when none; informed by industry practice (Jira hides resolved after 14 days with a link to all; GitHub open-by-default with close reasons; Linear separate Canceled category) | User | Resolved (SR-003) |
| DEC-003 | App control scope and placement | Would revise the earlier decision that only agents change status | User 2026-10-08: **no status control in the app**; status changes only through `create_or_update_task`; the app only displays it | User | Resolved (SR-002) |
| DEC-004 | Reopen | Recover from mistakes | Yes, through the tool only: agents may set a Closed Task back to TODO or IN_PROGRESS; reactivation rules same as after DONE | User | Resolved (SR-003) |
| DEC-005 | Temp tasks | Agents can close them; app stays read-only | Same as the Project board (hidden, Closed toggle); header count excludes Closed | User | Resolved (SR-003) |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-002..006 | BEH-010 | AC-001, AC-009 | SCN-002, SCN-005 | — |
| REQ-002 | UC-002 | BEH-001, BEH-006 | AC-001, AC-004 | SCN-002 | — |
| REQ-003 | UC-002 | BEH-006 | AC-005 | SCN-002 | — |
| REQ-004 | UC-002, UC-003 | BEH-001 | AC-004, AC-007 | SCN-002 | — |
| REQ-005 | UC-004 | BEH-005 | AC-006 | SCN-004 | — |
| REQ-006 | UC-005 | BEH-002 | AC-002 | SCN-005 | — |
| REQ-007 | UC-003 | BEH-001, BEH-006 | AC-003, AC-005 | SCN-003 | — |
| REQ-008 | UC-005 | BEH-003 | AC-008 | SCN-005 | — |
| REQ-009 | UC-005 | BEH-003 | AC-001, AC-008 | SCN-005 | — |
| REQ-010 | UC-006 | BEH-004 | AC-009 | SCN-006 | — |
| REQ-011 | UC-005 | BEH-007 | AC-010 | SCN-005 | — |
| REQ-012 | UC-002, UC-003 | BEH-008 | AC-011 | SCN-002, SCN-003 | — |
| REQ-013 | — | BEH-009 | AC-012 | — | — |
| REQ-014 | — | all | AC-013 | — | — |

## Architecture Phase Input

- Approved scenario IDs and product-level behavior paths architecture must map: SCN-002..SCN-006 (approved SR-003; SCN-001 withdrawn in SR-002).
- Product and system constraints architecture must preserve: DONE semantics and its serialization with assignment/reactivation; change feed ordering; no status write in GraphQL or the app; no migration loss.
- Decisions intentionally deferred to architecture design: a single "terminal status" rule shared by closure/assignment/reactivation; DONE ↔ CLOSED transition handling.
- Technical facts architecture should verify: migration conventions for an added enum value; generated GraphQL types; change-feed lane-move highlight with a hidden lane.
- Known feasibility or integration risks: R-001 (wording collision with internal "closed"), R-002 (external manager skill).

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and open decisions are visible: `Yes`
- Content ready for user approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- User approval received: `Yes` (2026-10-08, SR-003)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
