# Requirements Document — Task relationships step 2: "part of"

## Document Status

- Status: `Approved` (SR-004: the model, plus the user-approved Product UI/UX spec integrated).
- Current solution revision ID: `SR-004`
- Package identifier: `task-part-of`
- Request / ticket: Project Task `autobyteus-171` "Task relationships, step 2: a "part of" relationship between Project Tasks (a bigger Task and its parts)", AutoByteus Project, 2026-10-19.
- Requested by: `/project_task_manager` (run id `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user.
- Requirements owner: Solution Designer
- Date: 2026-10-19
- Approved by and reference (SR-002): `User` for DEC-001 to DEC-004, in the Solution Designer's conversation on 2026-10-19: "Of course one parent one task can only have one parent"; on closing the last part: "your recommendation is good no … the project task manager could just set the parent task to done like easily"; "when the parent has been … canceled or finished of course all the sub tasks should be canceled or finished as well … this is no doubt"; "we don't allow parts of parts … we just allow like one level … a flat level". The user did not comment on DEC-005 and DEC-006. Both stay within the delegated direction ("Product Team for the UI if the Solution Designer routes it"), and the visible details come back to the user through the Product design approval. They and DEC-016 to DEC-019 (details of the user's DEC-003 answer) were decided by the Solution Designer, the user informed on 2026-10-19.
- SR-003 (user, 2026-10-19): no backward-compatibility code; the desktop app and nodes are assumed up to date (DEC-009, REQ-015).
- SR-004 (user, 2026-10-19): the Product UI/UX spec `task-part-of` is approved ("approved" to the Product review package, with the recommended choice of its three open choices standing), and integrated here: REQ-008 to REQ-012 now point to it; REQ-018 and REQ-019 record its approved extras.
- Exact approved requirements baseline / solution revision: this document at `SR-004`, with the Product UI/UX spec below as its normative UI.
- Behavior-defining supplements and their approved versions: Product UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/task-part-of/ui-ux-spec.md` (Status `Approved`, 2026-10-19) with VIS-001 to VIS-017; design repository `autobyteus-web-design` `personal@c406879` (design), integration record `10207c6`; baseline pin `autobyteus-web@2f211340ee36` (the components it changes are identical at `cba6b85122`).

## Problem And Desired Outcome

- Problem: big work (cross-node collaboration, the NFS work, multi-slice features) is a loose group of Tasks tied only by `depends on` and prose such as "Follow-up C-10 of autobyteus-71". `depends on` says "this waits for that", not "these are the slices of one bigger thing", so neither the user nor the Project Task Manager can see a bigger Task with its parts or how far it is.
- Affected actors or systems: the user (board, Task page, right-panel Projects tab, New / Edit task); agents using Project Task tools (mainly the Project Task Manager); the server's Project Task persistence, GraphQL and change feed.
- Desired outcome: a Project Task can be part of one other Task of the same Project (its parent), one level only. The parent lists its parts and how many are done; a part shows its parent. `depends on` stays as it is. Closing every part leaves the parent as it is; setting the parent to DONE or CANCELLED closes its open parts the same way (SR-002, the user's decision).
- Observable definition of success: a Task made part of another Task, through the app or the tools, appears in the parent's parts with the right progress, shows its parent, and updates live; invalid parents are refused; dependencies, keys and every other behavior work as before.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenarios | Current Behavior | Desired Behavior | Preserved Behavior | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User / Contract | SCN-001, SCN-002, SCN-005, SCN-010 | No current supported behavior: Tasks have no "part of" relation. | A Project Task stores at most one parent: another Task of the same Project. Set, changed or cleared on New / Edit task and through `create_task` / `update_task`. Invalid parents are refused with no change. | `depends on`, keys, create / edit form behavior, context files, statuses. | INV models.ts, tool contract |
| BEH-002 | User | SCN-003, SCN-004, SCN-007 | Cards and the Task page show dependencies only. | A parent shows its parts and how many are done; a part shows its parent, on the card, the Task page and the tab's Task view, as the approved UI/UX spec defines. | Every other card and page element. | INV `ProjectTaskRow.vue`, `TaskDependenciesSection.vue` |
| BEH-003 | Contract | SCN-008 | `list_project_tasks` / `search_project_tasks` return key, status, dependencies (list only). | Both also show each Task's parent and parts by key; `create_task` / `update_task` results show the parent. | Every other tool field and rule. | INV tool manifest |
| BEH-004 | User | SCN-006 | Deleting a Task drops it from dependents. | Deleting a parent leaves its parts in place without a parent; deleting a part removes it from the parent's parts. | Delete confirmation, kept agent run resources, dependency cleanup. | INV `deleteTask` |
| BEH-005 | System | SCN-007, SCN-011 | DONE / CANCELLED close a Task's task agents. | Setting a parent to DONE or CANCELLED also sets each of its open parts (To Do / In Progress) to that status, closing their task agents as for any such change. A part's status change never changes its parent; reopening a parent never reopens parts. | Status rules and agent closure of each single Task. | INV `closeAndWrite` |
| BEH-006 | System | SCN-009 | Existing Tasks have no parent field. | Existing Tasks read as having no parent, with no conversion; nothing else changes. | All existing data. | INV persisted data |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Constraint |
| --- | --- | --- | --- |
| User | See a bigger Task with its parts and progress; see what a Task belongs to | Parent and parts shown clearly in the app | Informs only; step-1 design language; keys only where they link |
| Project Task Manager (agent) | Create and read slices of a bigger Task without prose notes | Tools set and show the parent; list / search show parent and parts | Its own tools / skill update is a separate later Task |
| Other agents | Unchanged Task tool use | Additive fields only | Old calls behave as before |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Scenarios |
| --- | --- | --- |
| UC-001 | User sets, changes or clears a Task's parent on New / Edit task | SCN-001, SCN-005, SCN-010 |
| UC-002 | Agent sets, changes or clears a Task's parent with `create_task` / `update_task` | SCN-002, SCN-005, SCN-010 |
| UC-003 | User sees a parent's parts and progress (card, Task page, tab Task view) | SCN-003, SCN-007 |
| UC-004 | User sees a part's parent (card, Task page, tab Task view) and opens it | SCN-004 |
| UC-005 | Agent reads parent and parts in `list_project_tasks` and `search_project_tasks` | SCN-008 |
| UC-006 | Deleting a parent or a part keeps the data truthful | SCN-006 |
| UC-007 | Setting a parent to DONE or CANCELLED closes its open parts the same way | SCN-011 |

### Out Of Scope

- Several parents per Task; parts of parts (more than one level); cross-Project parents; parents or parts for Temp tasks.
- Grouping, nesting or filtering the board by parent; tree or graph views; a whole-tree (recursive) view or progress.
- Automatic status changes other than UC-007 (closing the last part never closes the parent; reopening a parent never reopens parts), notices, warnings that block saving.
- Other relationship types (duplicate, related, follow-up as its own type).
- The Project Task Manager's tools / skill update (a separate Task for the Agent Package Creator).
- Changing keys (no hierarchical keys such as `autobyteus-25.1`).
- Board search by parent; the Workspaces-tree Task summary.
- Mixed versions of desktop app and nodes, in either direction (DEC-009): the app and its nodes are assumed to be on the same current release (the user's responsibility); no backward-compatibility code.

### Non-Goals

- Enforcing anything: a part's or parent's status never limits starting, delegating or finishing the other.
- Recursive progress (progress counts direct parts only).

### Preserved Behavior Boundary

- `depends on`, "Blocked by", "Dependency cancelled", "Required by" and the dependency picker behave exactly as in step 1 (step-1 REQ-006, REQ-007, REQ-009–011, REQ-014, REQ-016, REQ-020, REQ-021).
- Keys, key URLs and tool Task-ID behavior unchanged (step-1 REQ-001–005, REQ-018, REQ-019, REQ-022).
- Status rules and agent closure unchanged (BEH-005).
- Every Projects surface and string not named in the approved UI/UX spec of this ticket stays unchanged.
- Existing data: every field and file preserved (BEH-006).

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction.
- A downstream reviewer comment does not amend this requirements basis. The Solution Designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| Requirement ID | Requirement | Behavior | Priority | Rationale | Decision |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | A Project Task stores at most one parent: another current Task of the same Project, of any status. "Parts" of a Task are derived (the Tasks whose parent it is) and never stored. | BEH-001 | Must | One fact, like `depends on` | DEC-001, DEC-007, DEC-008 |
| REQ-002 | The parent is set at create, and replaced or cleared on update (omitted keeps it). The server refuses, with no change: the Task itself; a Task that is not a current Task of the same Project (unknown, another Project's, a Temp task); and any parent that breaks REQ-003. | BEH-001 | Must | Integrity of the one-level grouping | DEC-004, DEC-008 |
| REQ-003 | One level only: a Task that is a part cannot have parts, and a Task that has parts cannot be a part. So a parent must itself have no parent, and a Task with parts cannot be given a parent. (This also rules out loops.) | BEH-001 | Must | "we just allow like one level … a flat level" | DEC-004 (User) |
| REQ-004 | `part of` and `depends on` are independent: setting one never changes or checks the other. | BEH-001 | Must | Belonging vs order | DEC-011 |
| REQ-005 | `part of` never blocks work: no create, update, delegate or reopen path refuses because of a parent or parts. A part's status change never changes its parent, so closing the last part does not close the parent. | BEH-005 | Must | Closing the parent stays deliberate | DEC-002 (User), DEC-014 |
| REQ-016 | When a parent is set to DONE or CANCELLED, by any path that changes status, each of its parts that is To Do or In Progress is set to the same status, with the same effects as setting it directly (its task agents are closed and asked to stop). Parts already DONE or CANCELLED keep their status. Setting the parent back to To Do or In Progress never changes its parts. A part added or attached to a parent that is already DONE or CANCELLED keeps its own status. | BEH-005 | Must | "when the parent has been canceled or finished … all the sub tasks should be canceled or finished as well" | DEC-003 (User), DEC-016–DEC-018 |
| REQ-017 | The `update_task` result of a parent's DONE / CANCELLED lists the keys of the parts that change closed (none: an empty list or no field, as the design decides), so the calling agent knows what else changed. | BEH-003, BEH-005 | Must | Agents must see every side effect of their call | DEC-019 |
| REQ-006 | Deleting a parent leaves each part in place with no parent (the part's last-change time is not bumped), and open views update live. A stored parent ID that names no current Task is never shown or counted. | BEH-004 | Must | Truthful data, as step-1 DEC-003 | DEC-010 |
| REQ-007 | Project Task reads (GraphQL `projectTasks`, create / update results) and `/ws/projects` `task_upserted` carry the parent; the app derives parts and progress from the Project's Task list it already holds and updates them live. | BEH-002 | Must | Live surfaces | — |
| REQ-008 | A parent shows its parts: every part (Done and Cancelled ones too) with key, status and summary, each opening that Task; and its progress "N of M done", where M counts its parts that are not Cancelled and N those that are Done. Exact placement, look and strings: the approved UI/UX spec. | BEH-002 | Must | "see a bigger Task with its parts, how many are done" | DEC-005 |
| REQ-009 | A part shows its parent (key and summary, opening the parent) on its Task page and the tab's Task view, and an indication on its board card. Exact placement, look and strings: the approved UI/UX spec. | BEH-002 | Must | "how a part shows its parent" | DEC-005 |
| REQ-010 | A parent's board card shows its progress (REQ-008 count) as the approved UI/UX spec defines. The board stays flat: lanes, order, search and the Cancelled toggle are unchanged. | BEH-002 | Must | Board scanning | DEC-005, DEC-012 |
| REQ-011 | New / Edit task let the user choose, change and clear the parent, following the step-1 picker pattern (search this Project's Tasks by key or text; the Task itself and Tasks that are themselves parts cannot be chosen; a Task that has parts cannot get a parent), as the approved UI/UX spec defines. A server refusal shows in the editor's existing error line. | BEH-001 | Must | Set it in the app | DEC-013 |
| REQ-012 | All new strings exist in en and zh-CN, exactly as the approved UI/UX spec gives them. | BEH-002 | Must | Wording is user-approved | — |
| REQ-018 | A parent's Task page (not the tab) offers "New part", which opens New task with that Task already chosen as the parent, as the approved UI/UX spec defines (UXJ-002, TR-003, VIS-012). | BEH-001 | Must | Approved Product extra | UI/UX spec (user-approved) |
| REQ-019 | While a To Do / In Progress parent has an open part, its Parts card shows the static close hint; a parent's delete confirmation adds the parts note ("Its 5 parts stay as separate Tasks."), as the approved UI/UX spec defines (UXJ-002, UXJ-005, VIS-003, VIS-013). | BEH-002, BEH-004 | Must | Approved Product extras; make REQ-016 and REQ-006 visible | UI/UX spec (user-approved) |
| REQ-013 | `create_task` and `update_task` accept the parent as a Task reference (key, any letter case, or long ID), with the REQ-002 rules; `update_task` can clear it. A parent on a Temp task is refused. Results show the parent as a key. | BEH-003 | Must | Agents create and read parts | DEC-015 |
| REQ-014 | `list_project_tasks` shows each Task's parent (key or none) and parts (keys); `search_project_tasks` shows each result's parent and parts by key. No long Task ID appears in these fields. | BEH-003 | Must | "the Task list and search_project_tasks show parent and parts" | DEC-015 |
| REQ-015 | Existing Tasks read as having no parent, with no data conversion; no other data changes. Tool calls without the parent argument behave exactly as before. Desktop app and nodes are assumed to run the same release; no mixed-version handling. | BEH-006 | Must | Tasks that have no parent | DEC-009 (User) |

## Acceptance Criteria

| AC ID | REQ | Scenario | Trigger | Expected Outcome | Alternate / Failure | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-011 | SCN-001 | New task with parent `autobyteus-25`, Save | The new Task's parent is stored; `autobyteus-25` lists it among its parts; progress updates | — | Server unit; web unit; probe |
| AC-002 | REQ-002, REQ-011 | SCN-010 | Edit task: change the parent, then clear it | Stored parent replaced, then none; both parents' parts update live | Update without the parent field keeps it | Server unit; web unit |
| AC-003 | REQ-002 | SCN-005 | API / tool: parent = self, unknown, another Project's Task, a Temp task | Refused with a clear error; nothing written; the editor shows it in its error line | — | Server unit + GraphQL / tool E2E |
| AC-004 | REQ-003 | SCN-005 | B is part of A; then: C part of B; A part of D; B part of A again (no change) | "C part of B" and "A part of D" are refused (one level), nothing written; re-saving B's same parent succeeds; concurrent "B part of A" and "A part of B" cannot both succeed | — | Server unit (incl. concurrency) |
| AC-005 | REQ-004 | SCN-001 | A Task that depends on its parent, or a parent that depends on a part | Both relations stored independently; dependency badge and lists unchanged by `part of` | — | Server unit; web unit |
| AC-006 | REQ-005 | SCN-007 | Every part set DONE | The parent's status is unchanged; delegating a part or the parent works as before | — | Server unit |
| AC-018 | REQ-016, REQ-017 | SCN-011 | Parent with parts To Do, In Progress (with a running task agent), Done, Cancelled; `update_task status=CANCELLED` on the parent (and, separately, DONE) | The To Do and In Progress parts become CANCELLED (DONE); the part's task agent is closed and asked to stop; the Done and Cancelled parts are unchanged; the result lists the two changed parts' keys; boards update live | Parent set back to TODO: parts unchanged. A part attached to a Done parent stays TODO | Server unit + tool E2E; probe |
| AC-007 | REQ-006 | SCN-006 | Delete a parent with parts; delete a part | Parts keep existing with no parent and their `updatedAt` unchanged; the parent's parts and progress update live | A cleanup write failure is logged and never fails the delete; readers ignore the dangling ID | Server unit; probe |
| AC-008 | REQ-007 | SCN-003 | Any part created, edited, status-changed, deleted | `task_upserted` / `task_removed` lead every open board, Task page and tab to show updated parts and progress without Refresh | — | Server unit (wire); web unit; probe |
| AC-009 | REQ-008 | SCN-003 | Parent with parts To Do, In Progress, Done ×2, Cancelled | Parts list shows all five; progress "2 of 4 done" | No parts: the spec's empty state | Web unit; probe; isolated instance |
| AC-010 | REQ-009 | SCN-004 | Open a part's Task page / tab Task view; view its card | Parent shown with key and summary; activating it opens the parent; card shows the spec's indication | Parent Done / Cancelled: shown with its status as the spec defines | Web unit; probe; isolated instance |
| AC-011 | REQ-010 | SCN-003 | Board with a parent and its parts | Parent card shows progress; cards stay in their status lanes in the usual order; search and Cancelled toggle unchanged | — | Web unit; probe |
| AC-012 | REQ-011 | SCN-001 | Parent field search | Matches by key or text within this Project; the Task itself and its parts at any depth cannot be chosen; clearing works | — | Web unit; probe |
| AC-013 | REQ-012 | — | en and zh-CN | Every new string matches the spec | — | Web unit (catalogs) |
| AC-014 | REQ-013 | SCN-002 | `create_task part_of="autobyteus-25"`; `update_task part_of=<another key>`; `update_task` clearing it; `AutoByteus-25`; long ID | Stored as the long ID; results show the parent's key; board updates | Invalid → refused, nothing written; parent on a Temp task → refused | Server unit + tool E2E |
| AC-015 | REQ-014 | SCN-008 | `list_project_tasks`; `search_project_tasks` | Each Task / result shows its parent's key (or none) and its parts' keys | — | Server unit (manifest) + tool E2E |
| AC-016 | REQ-015 | SCN-009 | Existing data without the field; tool calls without the argument | Tasks read with no parent; files unchanged until edited; tool results otherwise identical to before | — | Server unit; isolated instance with test data |
| AC-019 | REQ-018 | SCN-001 | "New part" on a parent's page; Save | New task opens with the parent chosen; the saved Task is its part | Not offered in the tab, nor on a part's page | Web unit; probe |
| AC-020 | REQ-019 | SCN-006, SCN-011 | Parent with an open part; delete a parent with parts | Hint shown (not on a Done / Cancelled parent, nor when no part is open); confirmation shows the parts note with the right count | No note for a Task without parts | Web unit; probe |
| AC-017 | REQ-008–012, REQ-018, REQ-019 | All user scenarios | Isolated Electron instance with a test data package | The journeys work in the real desktop app, with evidence | — | Isolated desktop instance (TESTING.md) |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal / Event | Trigger | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User | Make a Task a part of a bigger Task | New / Edit task | Project with Tasks | Choose parent, Save | Stored; parent shows it | Server refusal in the error line | Supported Normal (new behavior; approved SR-002) | Delegated direction 2026-10-19 | REQ-001–004, 011; AC-001, 005, 012 |
| SCN-002 | Contract | Project Task Manager | Create slices of `autobyteus-25` | `create_task part_of` / `update_task part_of` | — | Create parts | Parts stored; board shows them | Invalid refused | Supported Normal (approved SR-002) | Direction: "first use is cross-node collaboration (autobyteus-25)" | REQ-013; AC-014 |
| SCN-003 | User | User | See how far a bigger Task is | Board, Task page, tab | Parent with parts | Scan card; open page | Parts list, "N of M done" | No parts: empty state | Supported Normal (approved SR-002) | Direction | REQ-007, 008, 010; AC-008, 009, 011 |
| SCN-004 | User | User | See what a Task belongs to | Card, Task page, tab | Part | Open parent | Parent opens | — | Supported Normal (approved SR-002) | Direction | REQ-009; AC-010 |
| SCN-005 | Contract | API caller (stale UI, concurrent agent) | Invalid parent | Mutation / tool | — | — | Refused, nothing written | — | Supported Explicit Edge (integrity) | Step-1 precedent for dependencies | REQ-002; AC-003 |
| SCN-006 | User | User | Delete a parent or part | Task page Delete | — | Confirm | Parts stay without parent / parent's parts update | — | Supported Normal | Step-1 DEC-003 precedent | REQ-006; AC-007 |
| SCN-007 | Agent | Project Task Manager | Close the last part | `update_task status` on a part | Parent with parts | Status change | Parent unchanged; the agent closes the parent deliberately | — | Supported Normal | User 2026-10-19 (DEC-002) | REQ-005; AC-006 |
| SCN-011 | Agent | Project Task Manager (for the user) | Finish or drop a bigger Task as a whole | `update_task status=DONE / CANCELLED` on the parent | Parent with open parts | Status change | Open parts take the same status; their task agents stop; result names them | Parent reopened: parts unchanged | Supported Normal | User 2026-10-19 (DEC-003) | REQ-016, REQ-017; AC-018 |
| SCN-008 | Contract | Agent | Read parent and parts | `list_project_tasks`, `search_project_tasks` | — | Read | Keys of parent and parts | — | Supported Normal (approved SR-002) | Direction | REQ-014; AC-015 |
| SCN-009 | Operational | App upgrade | Tasks without a parent | First start of the new release | Existing data | Read | No parent; no conversion | — | Supported Normal | Direction: "compatibility with Tasks that have no parent" | REQ-015; AC-016 |
| SCN-010 | User / Contract | User or agent | Move a part to another parent, or detach it | Edit task; `update_task` | Part | Change / clear | Both parents update | — | Supported Normal (approved SR-002) | Direction | REQ-002; AC-002, AC-014 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`
- Linked UI/UX supplement: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/task-part-of/ui-ux-spec.md` (Approved, 2026-10-19)
- Runnable UI reference: `/Users/normy/autobyteus_org/autobyteus-web-design`, `corepack pnpm install --ignore-workspace --frozen-lockfile`, `corepack pnpm dev --port <port>` → `/projects/project-desktop-app` (parent `autobyteus-25`, part `autobyteus-22`), `/projects/project-onboarding-redesign` (long keys), `/chat?id=run-ptm-0001` (tab); runbook `ui-reference-runbook.md`.
- Product ticket record and folder (externally owned): `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/task-part-of/product-ticket.md`
- Design repository revision: design `c406879`, integration record `10207c6` (`origin/personal`); base `e5ad9d8`; source pin `autobyteus-web@2f211340ee36`. The components this design changes are identical at the current source `cba6b85122`; only the board's meaning-search status line differs, and it is outside this design.
- UI/UX user-confirmation reference: 2026-10-19, the user replied "approved" to the Product review package; the recommended choice of its three open choices stands (the parent's key on a part's card; "New part", the close hint and the delete note; the empty Parts card).
- Approved visual-reference baseline: `tickets/done/task-part-of/visual-references/` VIS-001 to VIS-017 (34 images).
- Normative visual and interaction details: everything in the spec's "Implementation Fidelity Boundary — must preserve", plus its dimensions, typography, colours, icons, states, strings, keyboard and accessibility sections.
- Explicitly illustrative: all Task texts, keys, counts, Project names and statuses; fixture order; the app shell; the reference's `partOfTaskId` name, client-side derivation file and fixture rules; the exact shortening of long keys (the number stays).
- Required screens and states: UIS-001 to UIS-005 and the spec's State Behavior table.
- Product decisions that need the user: none.
- Reconciliation with this document: REQ-008 (adds "· N cancelled" beside "N of M done", and no progress when no part counts), REQ-009, REQ-010 (pill; the "↳ Part of <key>" line), REQ-011 (Tasks that are parts are greyed out, not hidden; a Task with parts shows an explanation instead of the search) and REQ-012 (17 strings) follow the spec. REQ-018 and REQ-019 record the extras. The spec does not simulate REQ-016 (the app only displays status) or the server refusals; both are engineering.

## Quality And Non-Functional Requirements

| Quality ID | Related | Area | Requirement | Conditions | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-002, REQ-003 | Integrity | The one-level rule holds under concurrent parent writes in one Project | UI + agents | Server unit |
| QR-005 | REQ-016, REQ-017 | Reliability | A parent's close and its parts' closes: a failure on one part never goes unreported; the result truthfully lists the parts that were closed | Normal operation | Server unit |
| QR-002 | REQ-007 | Performance | No extra per-Task requests: parts and progress derive from the Project's Task list | — | Design review |
| QR-004 | REQ-011 | Accessibility | Parent field keyboard and screen-reader behavior as the spec (step-1 combobox pattern) | — | Web unit |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes` — `task.json` gains one optional field.
- Must be preserved: every existing Task field and file; dependencies; keys.
- Acceptable: no mixed-version guarantees (DEC-009). Should a rollback ever happen, a Task an older build rewrites loses its parent.
- Constraints: user volume small (6 Projects, 204 Tasks); never test on real data (TESTING.md).
- Unknowns for design: confirm "no parent when absent" is directly usable under the migration guideline.

## External Contracts And Dependencies

| Contract | Required Behavior | Authority | Risk |
| --- | --- | --- | --- |
| GraphQL `ProjectTask` and inputs | New field / inputs | `api/graphql/types/project-tasks.ts` | Web codegen follows |
| `/ws/projects` | New field in the strict server schema | `project-change-messages.ts` | Server and web change together |
| Agent tools | Additive argument and result fields | `project-task-tool-contract.ts` | Tool-description wording affects agents |
| Data migration guideline | Direct use vs migration | `autobyteus-server-ts/docs/design/data_migration_guideline.md` | Low |

## Supplemental Artifacts

| Artifact Path | Purpose | Related | Status | Approval |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/task-part-of/ui-ux-spec.md` | Normative UI | REQ-008–012, REQ-018, REQ-019 | Approved (Product-owned) | User 2026-10-19 |
| `…/tickets/done/task-part-of/visual-references/VIS-001…VIS-017` | Final references | REQ-008–012, REQ-018, REQ-019 | Approved | User 2026-10-19 |
| `…/tickets/done/task-part-of/product-ticket.md` | Product record | All UI | Completed | — |

## Assumptions

| ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The board, Task page and tab already hold the Project's full Task list (all statuses) | Derived parts / progress | Verified in step 1 (`projectTaskStore`) | Confirmed |
| ASM-002 | Desktop app and Docker image of one release ship together | DEC-009 | Release workflows publish both per tag (step-1 release report) | Confirmed |

## Decisions

| ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | One parent per Task, or several? | Defines the model and the progress count | One (tree); several (graph). Jira, Linear, GitHub sub-issues all use one parent | With one parent, "the bigger Task this belongs to" has one answer; progress counts stay honest; the UI shows one "Part of" line. Several parents turn the tree into a graph, which the direction excludes. A Task that relates to two big Tasks can still use `depends on`. **Recommend one parent.** | User (2026-10-19: "Of course one parent one task can only have one parent") | Decided: one parent |
| DEC-002 | Does closing the last part close the parent? | Status changes have side effects | Auto-close; prompt; nothing. Jira / GitHub: nothing; Linear: opt-in setting | DONE stops the parent's task agents; an automatic close could stop work the user still wants (e.g. a final check on the parent). The direction excludes automatic status changes. The parent shows "4 of 4 done", so finishing it is a visible, deliberate step. **Recommend no automatic close.** | User (2026-10-19: "your recommendation is good no … the project task manager could just set the parent task to done") | Decided: no automatic close |
| DEC-003 | What happens to the parts when the parent is cancelled (or finished)? | Same side effects, on several Tasks | Cascade-cancel; block while parts are open; nothing | Cascading would stop several task agents at once and lose the parts' own status history; blocking contradicts "informs only". Parts stay as they are; each part shows its parent with the parent's status, so a cancelled parent is visible on its parts. **Recommend leaving the parts unchanged.** | User (2026-10-19: "when the parent has been … canceled or finished … all the sub tasks should be canceled or finished as well … no doubt") | Decided: the user overruled the recommendation; open parts take the parent's DONE / CANCELLED (REQ-016; details DEC-016 to DEC-019) |
| DEC-004 | Depth limit? | Model complexity and UI | One level only; a fixed limit (GitHub: 8); unlimited with loop refusal | Real work already has three levels ("Task relationships" → step 1 → its design and build Tasks), so one level is too few. The UI shows only the direct parent and direct parts, so depth costs nothing visually; loops are refused like dependency loops. A fixed number adds a rule nobody needs yet. **Recommend nesting allowed, no limit beyond loop refusal; progress counts direct parts only.** | User (2026-10-19: "we don't allow parts of parts … we just allow like one level … a flat level"; and: "more than three layer … it's actually not practical at all … we kind of need to think about … what is actually practical") | Decided: one level (REQ-003); the recommendation for nesting was overruled |
| DEC-005 | What the parent shows and how a part shows its parent (content) | Visible product behavior | — | Parent: the list of all its parts (key · status · summary, like the Depends on rows) and "N of M done", where Cancelled parts are listed but not counted (Cancelled means dropped as not needed); its card shows the progress. Part: "Part of <key> <summary>" on its Task page and tab view, opening the parent; a small indication on its card. Placement, look and strings go to the Product design step and come back to you for approval. On cards, Product should respect your earlier "keys only where they link" direction. **Recommend this content.** | Solution Designer (user informed 2026-10-19; the user did not comment; visuals return to the user via the Product design approval) | Decided: recommended content, sent to Product |
| DEC-006 | A Product UI/UX design step first? | Your direction makes it conditional; the design repository must be updated | Design step (as in step 1); engineering designs it | New visible elements on four approved surfaces, new en / zh-CN strings and a card indicator that must respect your taste. Step 1's visuals were approved by you through the Product Team, and the design repository is the Product Team's. **Recommend a Product design step before implementation**, dispatched by the Project Task Manager to the Product Team with this package; implementation follows your approval of that design. | Solution Designer within the direction ("Product Team for the UI if the Solution Designer routes it"; user informed 2026-10-19) | Decided: Product design step |
| DEC-007 | Which Tasks may be a parent? | Follow-ups of finished work | Open only; any status | Follow-ups are often filed under finished work (e.g. "Follow-up C-10 of autobyteus-71", a Done Task). Any status of the same Project, as for dependencies (step-1 DEC-007). | Solution Designer | Decided |
| DEC-008 | Cross-Project parents; Temp tasks | Consistency with step 1 | — | Same Project only; Temp tasks have no parent and no parts, as for dependencies and keys. | Solution Designer | Decided |
| DEC-009 | Mixed versions (desktop, remote nodes, Docker) | "Check the existing servers and clients … for compatibility" | Investigation: an absent field reads as no parent; a newer desktop app's query fails against an older node, as in step 1 | Tasks with no parent (all existing data) need no conversion: an absent field simply means no parent. The supported setup is the desktop app and its nodes on the same, current release; keeping them updated is the user's responsibility. No backward-compatibility code for mixed versions in either direction, and nothing about it in the product or its notes. | User (2026-10-19: "we don't keep backward compatible codes. This is important"; "assume that both … are up to date"; "It's a user's responsibility … if they want to use this feature, they need to make sure that they update") | Decided |
| DEC-010 | Deleting a parent | Truthful data | Leave dangling; clear on parts; refuse | As step-1 DEC-003: parts stay, their parent is cleared, `updatedAt` not bumped; readers ignore dangling IDs. Refusing would make delete harder for no gain. | User (2026-10-19: "i think you are right in this decision actually") | Decided |
| DEC-011 | Interaction with `depends on` | Clear semantics | Validate combinations; independent | Belonging and order are different facts; a part may depend on another part or even on its parent. No cross-checks keeps both simple. | Solution Designer | Decided |
| DEC-012 | The board | "the board" in the direction | Group parts under parents; flat with indicators | Lanes are by status, and a parent and its parts are usually in different lanes, so grouping would reorganize the board. The direction says keep it small. Flat board; cards carry the parent's progress and the part's indication. | Solution Designer | Decided |
| DEC-013 | Where the relation is set | One stored fact | On the part; on the parent ("add parts"); both | Stored on the part (like `depends on` on the later Task), set on the part's New / Edit task and by tools on the part. A "New part" shortcut on the parent is left to the Product design as an option, not required. | Solution Designer | Decided |
| DEC-014 | Informs only | Consistency | — | As step-1 REQ-016 / REQ-021: no path checks `part of`. | Solution Designer | Decided |
| DEC-015 | Tool surface | Agent usability | — | Input `part_of` (a key, any letter case, or long ID) on `create_task` and `update_task`, with a way to clear it on `update_task` (design decides the exact form); outputs `partOf` (key or none) and `parts` (keys) in `list_project_tasks`, `search_project_tasks` and the `create_task` / `update_task` results. Named after the user's wording and next to `depends_on`. | Solution Designer | Decided |
| DEC-016 | Which parts change when the parent closes | REQ-016 detail | All parts; open parts only | Only To Do / In Progress parts: a Done part is finished and a Cancelled part was dropped; rewriting them would erase their history. | Solution Designer (user informed) | Decided |
| DEC-017 | Status the open parts take | REQ-016 detail | Always CANCELLED; the parent's status | The user's words: "canceled or finished … as well". The parent's status: DONE → DONE, CANCELLED → CANCELLED. | Solution Designer (user informed) | Decided |
| DEC-018 | Reopening a parent; attaching to a closed parent | REQ-016 detail | Reopen parts; keep | Reopening the parent never reopens parts (the earlier closures can't be told apart from the parts' own). A part attached to, or created under, a Done / Cancelled parent keeps its status (follow-ups of finished work, DEC-007); only the parent's status change closes parts. | Solution Designer (user informed) | Decided |
| DEC-019 | Visibility of the side effect | An agent closing one Task now changes others | Silent; listed in the result | List the closed parts' keys in the `update_task` result (REQ-017), so the Project Task Manager can report them. Whether the app hints at it is left to the Product design; the app itself does not change statuses (only agents do). | Solution Designer (user informed) | Decided |

## Traceability

| REQ | UC | BEH | AC | SCN | Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001, UC-002 | BEH-001 | AC-001 | SCN-001 | — |
| REQ-002 | UC-001, UC-002 | BEH-001 | AC-002, AC-003 | SCN-005, SCN-010 | — |
| REQ-003 | UC-001, UC-002 | BEH-001 | AC-004 | SCN-005 | — |
| REQ-004 | UC-001, UC-002 | BEH-001 | AC-005 | SCN-001 | — |
| REQ-005 | UC-003 | BEH-005 | AC-006 | SCN-007 | — |
| REQ-006 | UC-006 | BEH-004 | AC-007 | SCN-006 | UXJ-005 |
| REQ-007 | UC-003, UC-004 | BEH-002 | AC-008 | SCN-003 | — |
| REQ-008 | UC-003 | BEH-002 | AC-009, AC-017 | SCN-003 | UXJ-002; VIS-003–006b, VIS-009 |
| REQ-009 | UC-004 | BEH-002 | AC-010, AC-017 | SCN-004 | UXJ-003; VIS-002d/e, VIS-007a–c, VIS-010 |
| REQ-010 | UC-003 | BEH-002 | AC-011, AC-017 | SCN-003 | UXJ-001; VIS-001, VIS-002a–f, VIS-008, VIS-015, VIS-017 |
| REQ-011 | UC-001 | BEH-001 | AC-001, AC-002, AC-012, AC-017 | SCN-001, SCN-010 | UXJ-004; VIS-011a–e |
| REQ-012 | UC-001, UC-003, UC-004 | BEH-002 | AC-013 | — | Strings table; VIS-016a–d |
| REQ-013 | UC-002 | BEH-003 | AC-014 | SCN-002, SCN-010 | — |
| REQ-014 | UC-005 | BEH-003 | AC-015 | SCN-008 | — |
| REQ-015 | UC-005 | BEH-006 | AC-016 | SCN-009 | — |
| REQ-016 | UC-007 | BEH-005 | AC-018 | SCN-011 | — |
| REQ-017 | UC-007 | BEH-003, BEH-005 | AC-018 | SCN-011 | — |
| REQ-018 | UC-001 | BEH-001 | AC-019, AC-017 | SCN-001 | UXJ-002, TR-003; VIS-012 |
| REQ-019 | UC-003, UC-006 | BEH-002, BEH-004 | AC-020, AC-017 | SCN-006, SCN-011 | UXJ-002, UXJ-005; VIS-003, VIS-013 |

## Architecture Phase Input

- Approved scenario IDs: SCN-001 to SCN-011 (SR-002).
- Constraints: one stored fact on the part; same Project; one level under concurrency; never blocks work; a parent's close cascades to its open parts (REQ-016) through the existing per-Task close path; additive GraphQL / feed / tool fields; Temp tasks untouched; dependencies unchanged.
- Deferred to design: cascade ordering, locking and partial-failure semantics (QR-005); field name and stored form; lock (shared with dependencies or not); clearing form for tools; error code; derivation placement on the web; component structure per the Product spec.
- Facts to verify: migration guideline decision for an optional field; GraphQL nullable input semantics (omit vs null); tool parameter schema support for clearing.
- Risks: one call closes several Tasks' task agents. Mixed versions are not supported (DEC-009).

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `Yes` (SR-004)
- Applicable UI/UX approval and final visual-reference basis are recorded: `Yes`
- Material assumptions and decisions are visible, each with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: none

### Approved Basis Ready For Design

- Approval recorded: `Yes` (SR-002 to SR-004; see Document Status)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: none
