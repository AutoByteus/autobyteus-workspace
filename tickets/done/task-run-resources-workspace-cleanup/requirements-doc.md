# Requirements Document

## Document Status

- Status: `Approved` — resumed 2026-10-06 (SR-008) after `delegated-row-clean-style` was delivered (merged `24e00db81`, release 1.4.95-beta.3). It was on hold under SR-007.
- Current solution revision ID: `SR-008`
- SR-007 scope change (user instruction SD-AP-002, 2026-10-06): REQ-010 / AC-011 / BEH-007 / UC-004 (clean delegated-row style) are **moved out** to package `delegated-row-clean-style` (`/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-row-clean-style/tickets/in-progress/delegated-row-clean-style/`). They are no longer part of this package's scope. All other approved requirements are unchanged.
- Package identifier: `task-run-resources-workspace-cleanup`
- Request / ticket: User request 2026-10-05 — hide a Task's agent run resources from the Workspaces tree once the Task is DONE.
- Requirements owner: Solution Designer
- Date: 2026-10-06 (SR-003; baseline 2026-10-05)
- Approval state and reference: `Approved` — SD-AP-001, user 2026-10-06: "coool. i think you already got UI i think its clear the requirement right?" → asked to confirm as approval → "yess".
- Exact approved requirements baseline / solution revision: SR-003 content (recorded as SR-004 approval)
- Behavior-defining supplements: Product-owned approved UI/UX specification `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/task-run-resources-workspace-cleanup/ui-ux-spec.md` (design repo `personal` @ `a38bd6e`; user UI confirmation 2026-10-06 "perfect. i like the UI. now i confirm"). Included in the approval basis.

## Problem And Desired Outcome

- Problem: When a Project Task Manager delegates a Task, the Task's agent runs appear as rows under the Manager's run in the left Workspaces tree. Marking the Task DONE stops them, but the rows stay forever (Offline). A Manager that keeps working accumulates rows without bound, and the tree becomes unmanageable.
- Affected actors: The user watching the Workspaces tree; the Project Task Manager (or any Agent that assigns Task work); the platform's DONE closure.
- Desired outcome: Task agent runs appear when they start and disappear when their Task is DONE. The tree reflects work that is actually alive.
- Observable success: After DONE, none of that Task's runs are shown under the root, live and after reload/restart. The Manager, other Tasks and non-Task rows are unaffected.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenarios | Current Behavior | Desired Behavior | Preserved Behavior | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | Task runs appear under the root run when delegated. | Unchanged. | Live appearance on start. | Investigation BEH-001 |
| BEH-002 | System | SCN-001 | DONE closes and stops the Task's runs; rows stay (Offline). | On DONE, every closed run of the Task (`assigned`, `delegated`, `broughtIn`, incl. Team runs and members) is removed from the tree immediately, without a reload. | Manager run, other Tasks' runs, non-Task rows stay. | Investigation BEH-002 |
| BEH-003 | User | SCN-002 | Reload/restart/opening a stopped root shows all historical Task rows, including closed ones. | Closed runs are not shown. | Open runs still shown. | Investigation BEH-003 |
| BEH-004 | System | SCN-003 | DONE when the root is not active: closure committed, rows still listed when viewed later. | Rows hidden when the root is next viewed. | No root is restored just to hide rows. | Investigation BEH-004 |
| BEH-005 | User | SCN-004 | Description-only delegation and user `@` collaborators show rows; no DONE concept. | Unchanged. | Fully preserved. | Investigation BEH-005 |
| BEH-007 | User | SCN-001 | Delegated rows render inside a dashed indigo box with a tint; Team icon in a dashed box. | Delegated rows read like other tree rows (REQ-010). | Status dot, initials avatar, bolt for Teams, branch lines, indentation, order. | `WorkspaceTransientExecutionRow.vue`; UI/UX spec |
| BEH-006 | Contract | — | DONE preserves conversations, execution-tree records, workspaces (prior REQ-008). Prior Q-2 said closed runs "stay visible in the app's run views". | Data preservation unchanged; **only the visibility clause of prior Q-2 is reversed** for the Workspaces tree. | No data deletion. | Prior ticket `project-task-manager-linked-delegation` |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Task runs disappear from the Workspaces tree live when their Task is DONE. | SCN-001 |
| UC-002 | Closed Task runs stay hidden after reload, restart, or when a stopped root is viewed. | SCN-002, SCN-003 |
| UC-003 | Same behavior for every root kind that hosts Task runs: standalone Agent run, Agent Team run, Agent Org run. | SCN-001–003 |
| UC-004 | Delegated rows use the cleaner, ordinary tree-row style (REQ-010). | SCN-001 |

### Out Of Scope

- Deleting any data (conversations, execution-tree records, workspaces, `agent_run_resources.json`).
- A new UI for browsing closed Task runs or their history (e.g., an "archived runs" view or Task-page assignment list).
- Changes to DONE closure/stop semantics, reopen, Task delete, root Stop, or idle lifecycle.
- Hiding rows for runs that stop for other reasons (root Stop, idle, error) without DONE.
- Description-only delegation and user `@` collaborators.

### Non-Goals

- Hiding rows only after the stop actually succeeds; visibility follows Task closure, not stop outcome.

### Preserved Behavior Boundary

BEH-001, BEH-005, BEH-006 (data), prior B-3/B-4/B-5/REQ-008 of `project-task-manager-linked-delegation`.

### Review Authority

- Blocking findings must cite a REQ/AC/BEH here.
- New behavior (e.g., archived-run browser, data deletion) is a `Requirement Gap` and needs user approval.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | When a Task becomes DONE, every agent run resource of that Task (all roles, incl. Team runs with their members and nested sub-delegations) is no longer shown in the Workspaces tree of its host root. | BEH-002 | Must | User request | User 2026-10-05; DEC-001 |
| REQ-002 | The removal happens live, without the user reloading, while the root is open in the app. Leaving rows fade and collapse in 200 ms ease-out while the remaining rows move up; with `prefers-reduced-motion: reduce` they are removed at once. New rows still appear at once (no enter motion). No toast, badge or "finished" section is added; the Manager's own conversation is the feedback. Closed runs are absent from the first render after reload. | BEH-002 | Must | "it appears when created, disappears when done" | User 2026-10-05; UI/UX spec TR-001, Motion |
| REQ-003 | Visibility follows Task closure (DONE), not stop success. A closed run stays hidden even if its stop failed. | BEH-002 | Must | Closed is forever (prior B-3) | DEC-002 |
| REQ-004 | Closed Task runs stay hidden after reload, app restart, Task deletion, and when the root was not active at DONE time. | BEH-003, BEH-004 | Must | Consistency | DEC-002 |
| REQ-005 | Applies to standalone Agent, Agent Team and Agent Org roots. | BEH-002–004 | Must | Task runs can be hosted in all three | DEC-004 |
| REQ-006 | The Manager's run, other Tasks' open runs, description-only delegations and `@` collaborators remain shown exactly as today. Reopening a Task and delegating again shows the new runs; the old closed ones stay hidden. | BEH-001, BEH-005 | Must | Scope protection | Prior B-4 |
| REQ-007 | No data is deleted. Conversations, execution-tree records and workspaces of closed runs are preserved on disk. | BEH-006 | Must | Prior REQ-008 | Prior ticket |
| REQ-008 | Messages the Manager exchanged with closed runs remain in the Manager's Team tab message history. | BEH-006 | Must | Manager's own communication record | DEC-003 (user-confirmed UI, 2026-10-06) |
| REQ-009 | If the user is viewing a closed run's conversation when the Task becomes DONE, the view returns to the root (Manager) run and the root run row becomes selected. If keyboard focus is on a leaving row, focus moves to the root run row; a leaving row leaves the accessibility tree at once. A closed run cannot be selected. | BEH-002 | Must | No dangling selection | DEC-005 (user-confirmed UI, 2026-10-06) |
| REQ-010 | **[Moved out SR-007 → `delegated-row-clean-style` REQ-001]** Delegated rows (delegated Agents, delegated Teams and their members) under Agent, Agent Team and Agent Org roots read like other tree rows: no dashed indigo border or tint; `gray-600` text; `gray-50` hover; `2px indigo-500` focus ring; selected style identical to member rows; a delegated Team shows only its bolt icon in `slate-500`; a delegated Agent keeps its status dot and initials avatar. No new Task-linked marker. Applies to all delegated rows, Task-linked or not. | BEH-007 | Must | User-requested visual change in the same area | User via Product, 2026-10-06; UI/UX spec Visual Language |

## Acceptance Criteria

| AC ID | REQ IDs | Behavior / Scenario | Trigger | Expected Outcome | Alternate / Failure | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | 001, 002 | BEH-002 / SCN-001 | Manager (root Agent run) delegates Task A to an Agent and Task B to a Team; Manager marks A DONE. | A's Agent row disappears without reload; B's Team row and members, and the Manager row, remain. | — | Real flow or integration test with stream |
| AC-002 | 001 | BEH-002 / SCN-001 | A's worker sub-delegated and brought in a helper; A marked DONE. | All A rows (assigned, delegated, broughtIn, Team members) disappear. | — | Integration |
| AC-003 | 003 | BEH-002 / SCN-001 | DONE while a run's stop fails. | Rows still disappear. | Failure stays in server log as today. | Server/web test with failing stop |
| AC-004 | 004 | BEH-003/004 / SCN-002, SCN-003 | Reload app; restart server; DONE while root stopped then open root; delete the DONE Task. | Closed runs never reappear; open runs of other Tasks shown. | — | Reload/restart checks |
| AC-005 | 005 | SCN-001 | Repeat AC-001 with Manager hosted in an Agent Team root and an Agent Org root. | Same outcome. | — | Per-root-kind tests |
| AC-006 | 006 | BEH-001/005 / SCN-004 | Description-only delegation and `@` collaborator present; reopen Task A and delegate again. | Non-Task rows unchanged; new A runs appear; old A runs stay hidden. | — | Integration |
| AC-007 | 007 | BEH-006 | After AC-001. | Conversation/run-history files of closed runs still exist on disk. | — | File/API check |
| AC-008 | 008 | BEH-006 | After AC-001, open Manager's Team tab. | Earlier messages with the closed run are listed; reload does not error. | — | Web test |
| AC-009 | 009 | BEH-002 | User has A's worker conversation open (or a leaving row focused); DONE. | Main view shows the Manager run and the Manager row is selected; focus moves to the run row; no error. | — | Web test |
| AC-010 | 002 | BEH-002 | DONE while root open; then with reduced motion. | Rows fade/collapse over 200 ms ease-out; others move up; with reduced motion they disappear at once; no toast/badge. Reload shows no flash of closed rows. | — | Component test + browser check against VIS-001/002 |
| AC-011 | 010 | **[Moved out SR-007]** BEH-007 | Delegated Agent, Team and member rows under Agent, Team and Org roots. | Match UI/UX spec Visual Language and VIS-001/VIS-008 (no dashed box/tint, gray-600 text, gray-50 hover, 2px indigo-500 focus, bolt slate-500). | — | Component test + visual check |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Start | Steps | Outcome | Alternate | Validity | Evidence | REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User/System | User + Project Task Manager | Keep tree to live work | Manager sets Task DONE | Root open, Task runs shown | Delegate → rows appear → DONE → rows disappear | Tree shows only live work | Stop fails → still hidden | Supported Normal Scenario | User request; DONE path code | 001–003, 005, 009 / 001–003, 005, 009 |
| SCN-002 | User | User | Consistent tree after reload | Reload/restart | Some Tasks DONE | Open app → view root | Closed runs not shown | — | Supported Normal Scenario | Stored tree read path | 004 / 004 |
| SCN-003 | System | Manager / other client | DONE while root not active | DONE via Projects UI or another Manager | Root stopped | DONE → later open root | Closed runs hidden | — | Supported Normal Scenario | Release `null` path | 004 / 004 |
| SCN-004 | User | User | Non-Task work unaffected | Description-only delegation, `@` | — | — | Unchanged | — | Supported Normal Scenario | Code | 006 / 006 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`
- Linked UI/UX specification (Product-owned, approved): `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/task-run-resources-workspace-cleanup/ui-ux-spec.md`
- Runnable UI reference: design repo `/Users/normy/autobyteus_org/autobyteus-web-design` (`corepack pnpm dev --port <port>`, `/workspace` → prototype-workspace → Project Task Manager; reset `__resetTaskRunCleanup()`)
- Product ticket record and folder (externally owned): `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/task-run-resources-workspace-cleanup/product-ticket.md`
- Design repository revision: `personal` @ `a38bd6e` (ticket commits `84833f0`, `a38bd6e`; base `6718986`); baseline pin autobyteus-web `origin/personal@10fb695`, re-checked at `d9ffaa7`.
- UI/UX user-confirmation reference: 2026-10-06 "perfect. i like the UI. now i confirm" (also "really really nice design. I like that."; "I like the current design.").
- Approved visual-reference baseline: VIS-001–VIS-008 in `.../visual-references/`.
- Normative details: everything visible in VIS-001–008 and the spec's Visual Language, Interaction, Accessibility and Motion sections, except content the spec marks illustrative.
- Illustrative: fixture names, messages, statuses, times, Manager wording, tool-card content.
- Required states/transitions: TR-001–TR-005; empty list not rendered; narrow 390 px truncation.
- Unresolved product decisions: None. U-001 and R-001 are architecture decisions.

## Quality And Non-Functional Requirements

| Quality ID | REQ / AC | Area | Requirement | Verification |
| --- | --- | --- | --- | --- |
| QR-001 | REQ-002 / AC-001 | Performance | Rows disappear within the normal stream latency (~ same as a status update), no manual reload. | Observed in test |

## Data Continuity And Acceptable Loss

- Persisted data affected: `No` (read-only use of existing closure facts).
- Must preserve: all run history, conversations, workspaces, `agent_run_resources.json`.
- Acceptable loss: none.

## Supplemental Artifacts

| Artifact Path | Purpose | Related IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/task-run-resources-workspace-cleanup/ui-ux-spec.md` (+ `visual-references/VIS-001–008`) | Product-owned approved UI/UX spec | REQ-001–010, AC-001–011 | Approved by Product with user confirmation 2026-10-06 | Behavior-defining; part of requirements approval basis |
| `product-design-request.md` (this folder) | Product request context | — | Sent | Not behavior-defining |

## Open Decisions And Questions

| ID | Question | Decision | Status |
| --- | --- | --- | --- |
| DEC-001 | Which runs leave? | Every run of the Task (assigned, further delegations, helpers, Team with members). | Decided — user-confirmed UI 2026-10-06 |
| DEC-002 | Hide on closure or on stop success? | Closure (DONE); holds after reload/restart/Task delete. | Decided — user-confirmed UI 2026-10-06 |
| DEC-003 | Team-tab messages with closed runs? | Keep all. | Decided — user-confirmed UI 2026-10-06 |
| DEC-004 | Root kinds? | Agent, Team, Org alike. | Decided — user-confirmed UI 2026-10-06 |
| DEC-005 | Open worker conversation at DONE? | Return to root run, root row selected. | Decided — user-confirmed UI 2026-10-06 |
| DEC-006 | Reverse prior Q-2 "stay visible in run views" for the tree? | Reversed by the confirmed UI (closed runs leave the tree). | Decided via UI confirmation; included in requirements approval |
| DEC-007 | Leave motion? | 200 ms ease-out fade + collapse; instant under reduced motion; no enter motion; no toast. (Product package labels this "DEC-001 how rows leave".) | Decided — user-confirmed UI 2026-10-06 |
| DEC-008 | Access to finished runs? | None in app; data on disk; no archive. (Product package "DEC-004".) | Decided — user-confirmed UI 2026-10-06 |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-002 | AC-001, AC-002 | SCN-001 |
| REQ-002 | UC-001 | BEH-002 | AC-001, AC-010 | SCN-001 |
| REQ-003 | UC-001 | BEH-002 | AC-003 | SCN-001 |
| REQ-004 | UC-002 | BEH-003, BEH-004 | AC-004 | SCN-002, SCN-003 |
| REQ-005 | UC-003 | BEH-002–004 | AC-005 | SCN-001–003 |
| REQ-006 | UC-001 | BEH-001, BEH-005 | AC-006 | SCN-004 |
| REQ-007 | UC-001 | BEH-006 | AC-007 | — |
| REQ-008 | UC-001 | BEH-006 | AC-008 | — |
| REQ-009 | UC-001 | BEH-002 | AC-009 | SCN-001 |
| REQ-010 | UC-003 | BEH-007 | AC-011 | SCN-001 |

## Architecture Phase Input

- Map SCN-001–004 across the three root kinds.
- Constraints: closure is the authority (Task side); host tree records stay intact; no new persisted state.
- Product facts: no user control for Task status (only agent tools); store already falls back to host when a selected child leaves; UI reference kept closed runs in the participant index and filtered only the tree list (non-prescriptive). Verify the Agent Org root's delegated-row rendering path (Product states all three roots share `WorkspaceTransientExecutionRow`; confirmed for Agent and Team roots in source).
- Deferred to design: where the filter lives (server projection vs. client), live signal (new stream event vs. checkpoint reload), Team-tab message identity for hidden runs.
- Risks: client message-correlation assertions (R-001).

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered: `Yes`
- Product design and supplemental evidence integrated consistently: `Yes` (UI/UX spec @ a38bd6e)
- Applicable UI/UX approval and final visual-reference basis recorded: `Yes`
- Material assumptions and open decisions visible: `Yes` (DEC-001–008 decided via UI confirmation)
- Content ready for user approval: `Yes`

### Approved Basis Ready For Design

- User approval received: `Yes` (SD-AP-001)
- Exact requirements and supplement approval basis recorded: `Yes` (SR-003 requirements + ui-ux-spec.md @ a38bd6e)
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None.
