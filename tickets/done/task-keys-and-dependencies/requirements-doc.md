# Requirements Document — Readable Task keys and "depends on"

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-003`
- Package identifier: `task-keys-and-dependencies`
- Request / ticket: Project Task "Implement readable Task keys and "depends on" (step 1 of Task relationships), from the approved design" (AutoByteus Project, delegated 2026-10-17); Product design Task `project_task_21c58d74-129a-454e-ae56-cffec4274aaf` (DONE).
- Requested by: `/project_task_manager` (run id `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user.
- Requirements owner: Solution Designer
- Date: 2026-10-17
- Approved by and reference (SR-002): `User`. On 2026-10-17 the user chose "follow your suggestion as long as you make reasonable judgement", then "yess i think its cleaner actually" (the key as the one agent-facing Task ID) and "lets have both in this ticket thanks" (agent tools with keys, and key-based Task URLs). SR-001 approval, kept for the unchanged parts: The intended behavior is the user-approved UI/UX design (user, 2026-10-17: "sounds good. i like the UI. its approved"; model confirmed: "so basically we only have depends on, but translated to different wording"). The three open points the design and the delegating Task assign to engineering (DEC-001 to DEC-003) and the other details below were decided within that direction; the user is informed in the Solution Designer's conversation on 2026-10-17 (see `solution-revision-record.md` SR-001).
- Exact approved requirements baseline / solution revision: this document at `SR-003`.
  - SR-002 extended SR-001 with REQ-018 to REQ-022 and revised REQ-003, REQ-017, DEC-001 and DEC-008.
  - SR-003 clarifies REQ-018 and REQ-019 (ARCH-REV-002 AR-001, AR-002). These are clarifications within the user's SR-002 direction that keep preserved behavior, approved by the Solution Designer with the user informed on 2026-10-17.
- Behavior-defining supplements and their approved versions: Product UI/UX specification `ui-ux-spec.md` (Status `Approved`, 2026-10-17) with VIS-001 to VIS-015, design repository `AutoByteus/autobyteus-web-prototype` branch `personal` at `1ebf4c6` (ticket design revision `1ff2edf`), source pin `autobyteus-web@73f743211c`.

## Problem And Desired Outcome

- Problem: Task IDs (`project_task_0e310af7-…`) are unreadable, so the user often cannot tell which Task is meant. Relationships between Tasks ("what waits for what", follow-ups) exist only as prose, so the board cannot show them.
- Affected actors or systems: the user on the Projects board, Task page, New / Edit task page, the right panel's Projects tab and the Workspaces tree; agents that create, update and delegate Project Tasks (SR-002: they see and use keys as Task IDs and can set dependencies); the server's Project Task persistence and change feed.
- Desired outcome: every Project Task has a short, permanent key (`autobyteus-42`); a Task can record which Tasks of the same Project it depends on; the app shows keys and the derived "Blocked by", "Dependency cancelled", "Depends on" and "Required by" exactly as the approved design shows.
- Observable definition of success: every Project Task, old and new, shows its key in every in-scope surface; an open Task with an unfinished dependency says "Blocked by <key>" on its card; the Task page lists dependencies and dependents with links; a user can set dependencies on New / Edit task; loops and cross-Project dependencies cannot be stored.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001, SCN-002 | No current supported behavior: a Project Task has only `taskId` (`project_task_<uuid>`); `task.json` has no key or number. | Each Project Task gets `<prefix>-<number>` at creation (UI or agent tool); numbers per Project in creation order, never reused; the key never changes. | `taskId` stays the identity everywhere (URLs, tools, assignments). | `projects/domain/models.ts`, `project-store.ts` (`taskFileContent`), `project-task-service.ts:create` |
| BEH-002 | System | SCN-003 | Existing Tasks (user node: 7 Projects, 113 Tasks in "AutoByteus") have no key. | Existing Tasks get keys numbered by creation order on upgrade; the app keeps opening and working while it happens and if it cannot finish for one Project. | All existing Task data, context files and agent run resources. | INV source log (user data, read-only) |
| BEH-003 | System | SCN-004 | Renaming a Project changes only its name. | A Project's key prefix is fixed (from its name at first keying) and survives renames; prefixes are unique among current Projects. | Project name rules (required, unique case-insensitively). | `project-service.ts` (`assertNameAvailable`, `updateProject`, `patchProjectRecord`) |
| BEH-004 | User | SCN-005, SCN-006 | No current supported behavior: no relationship between Tasks. | A Task stores "depends on" (same-Project Task IDs); set on New / Edit task; the server rejects self, unknown, cross-Project and loop-forming dependencies. | Existing create / edit form behavior, context files, save flow and errors. | `project-tasks.ts` GraphQL inputs; prototype `useProjectTaskDraft.ts` |
| BEH-005 | User | SCN-007 | Cards show summary, preview, files, worker. | Cards show the key line and, on To Do / In Progress cards, the derived badge per the spec. | Lanes, ordering, search (description only), live highlight, Cancelled toggle. | `ProjectTaskRow.vue`, `ProjectTaskBoard.vue` |
| BEH-006 | User | SCN-008 | The Task page / tab Task view show status, description, Assigned to. | Key chip with copy beside the status; a Dependencies card (Depends on, informs note, Required by, None). Rows open the Task (page) or open it in the tab. | Existing header actions, description, context, Assigned to. | `ProjectTaskDetail.vue`, `ProjectsPanelTaskDetail.vue` |
| BEH-007 | User | SCN-009 | Tree Task summary reads "<summary>"; `TaskWorkerTask` has no key. | "<key> <summary>" with the key in medium weight; tooltip / accessible name include the key; Temp tasks unchanged. | The locate action and its behavior. | `TaskWorkerTaskSummary.vue`, `taskWorkerTaskStore.ts`, `currentTasksOfTaskWorkers` |
| BEH-008 | User | SCN-010 | Deleting a Task removes it. | Deleting a Task also removes it from every dependent's "Depends on"; dependents' badges and lists update; its number is not reused. | Delete confirmation and kept agent run resources. | `project-task-service.ts:deleteTask` |
| BEH-009 | System | SCN-007, SCN-008 | `/ws/projects` `task_upserted` carries the GraphQL `ProjectTask` shape. | It also carries `taskKey` and `dependsOnTaskIds`; derived states update live when any Task of the Project changes. | Feed ordering, coalescing and recovery contract. | `project-change-messages.ts`, `project-change-publisher.ts` |
| BEH-010 | Contract | SCN-011, SCN-012 | Agent tools return and take the long `taskId` (`list_project_tasks`, `create_task`, `update_task`, `delegate_task task_id`); refusals and the existing-copy assignment message name Tasks by long ID. | For a Project Task, the key is the agent-facing Task ID: tool results show it as `taskId`, and agent-facing texts name it. Every Task-ID input accepts the key or the long ID. `create_task` / `update_task` take `depends_on`; results show dependencies by key. Temp tasks keep their ID. | Tool names, other arguments and fields, assignment data, statuses, context files, closure / reopen rules. | `project-task-tool-manifest.ts`, `project-task-tool-contract.ts`, `root-task-execution-lifecycle.ts`, `task-execution-input.ts`, `task-execution-resources.ts` |
| BEH-011 | User | SCN-013 | Task page URL `/projects/<projectId>/tasks/<long taskId>`. | `/projects/<projectId>/tasks/<key>` (page and edit); a long-ID URL still opens the Task and switches to the key URL. | Project URLs, Temp-task URLs. | `pages/projects/[id]/tasks/[taskId]/*`, link builders |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User | Refer to Tasks briefly; see what waits for what | Keys everywhere in scope; badges, lists, editor as designed | Informs only; never prevents work |
| Agents (via tools) | Create, update, delegate and refer to Tasks | One readable ID per Project Task (the key), accepted everywhere; dependencies settable | Old long IDs keep working |
| Project Task Manager | Later uses keys / dependencies instead of board-file notes | Data model that a later `create_task` / `update_task` `depends_on` argument can set through the same validation | Not built here |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Every Project Task receives a permanent readable key at creation; existing Tasks are backfilled | SCN-001, SCN-002, SCN-003, SCN-004 |
| UC-002 | User sees keys on board cards (page and tab), the Task page / tab Task view (with copy), and the tree's Task summary | SCN-007, SCN-008, SCN-009 |
| UC-003 | User sets "Depends on" when creating or editing a Task; the server validates it | SCN-005, SCN-006 |
| UC-004 | User sees derived dependency state: card badge, Depends on / Required by lists | SCN-007, SCN-008 |
| UC-005 | Deleting a Task drops it from dependents | SCN-010 |
| UC-006 | Agents see and use the key as the Task ID in every Task tool and agent-facing Task text | SCN-011 |
| UC-007 | Agents set and see "depends on" through `create_task` / `update_task` / `list_project_tasks` | SCN-012 |
| UC-008 | Task page URLs use the key | SCN-013 |

### Out Of Scope

- Board search by key (board search still matches descriptions only).
- Other relationship types (parent / child, duplicate), graphs, filters ("blocked only"), automatic notices.
- Cross-Project dependencies; keys or dependencies for Temp tasks.
- The Project Task Manager's board-file notes migration to keys (its own definition / skill content).
- Key lookup in GraphQL (the web resolves keys from the Project's Task list).
- Readable Project IDs (the Project part of URLs and `project_id` stay as they are).
- Changing the stored Task identity: the long ID stays the internal identity (files, run resources, history).

### Non-Goals

- Enforcing order: a dependency never prevents starting, delegating or finishing a Task.
- Contiguous numbering (gaps after deletes are expected).

### Preserved Behavior Boundary

- The long `taskId` remains the stored identity in files, GraphQL arguments, change-feed scope and agent run resources; tools and URLs still accept it (BEH-001, BEH-010, BEH-011).
- Every existing surface, string and journey in the Projects area not named in the UI/UX spec stays unchanged, including board search, lanes, Cancelled toggle, live highlight, delete flow, context files, Temp tasks (BEH-005 to BEH-008).
- Every agent tool behavior other than the Task-ID value, the accepted reference forms and `depends_on` is unchanged (BEH-010).
- Historical Project data must never lock the user out: the app opens and new work is possible even if keying an existing Project cannot finish (QR-002).

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction.
- A downstream reviewer comment does not amend this requirements basis. The Solution Designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Every Project Task has a key `<prefix>-<number>`: the Project's key prefix, "-", and a positive integer. Numbers are assigned per Project in creation order starting at 1, are never reused (also after deletes), and a Task's key never changes. | BEH-001 | Must | Readable, permanent references | UI/UX spec "Key format"; DEC-004 |
| REQ-002 | A Project's key prefix is derived from its name when the Project is first keyed (creation, or backfill for existing Projects) by the prefix rule (DEC-002) and then never changes, also when the Project is renamed. | BEH-003 | Must | "A key never changes, even after a Project rename" | UI/UX spec; DEC-001 |
| REQ-003 | Prefixes are unique on the node among current Projects and the prefixes of deleted Projects (which stay reserved). When the derived prefix is taken, the Project gets the smallest free `-2`, `-3`, … suffix. Hence a key identifies at most one Task, ever. | BEH-003 | Must | A key is now an agent-facing ID; an old key must never point to another Task | DEC-001 (SR-002) |
| REQ-004 | Existing Project Tasks are keyed on upgrade, per Project, in creation order (`createdAt`, then `taskId`), numbered from 1; existing Projects reserve prefixes in creation order (`createdAt`, then `projectId`). New Tasks continue after the highest assigned number. | BEH-002 | Must | "Existing Tasks get keys too" | UI/UX spec; DEC-005 |
| REQ-005 | Tasks with no Project (Temp tasks) have no key and no dependencies. | BEH-001 | Must | Keys are per Project | UI/UX DEC-009 |
| REQ-006 | A Project Task stores one relationship, `dependsOnTaskIds`: a set of other Tasks of the same Project. "Blocked by", "Dependency cancelled", "Required by" are derived and never stored. | BEH-004 | Must | One stored relationship | UI/UX spec; user quote |
| REQ-007 | The server accepts `dependsOnTaskIds` on Project Task create and on update (replace when supplied, keep when omitted) and rejects, with no change, an ID that is the Task itself, does not name a current Task of the same Project, or would create a loop (directly or indirectly). Duplicates are collapsed. | BEH-004 | Must | "No loops"; "No cross-Project dependencies" | UI/UX DEC-005/006; DEC-006, DEC-007 |
| REQ-008 | Project Task reads (`projectTasks`, create / update results) and change-feed `task_upserted` messages carry `taskKey` and `dependsOnTaskIds`; the Task worker answer (`taskWorkerTasks`) carries `taskKey` (null for a Temp task). | BEH-007, BEH-009 | Must | Surfaces need both live | UI/UX "Data, Contract, And Mock Boundaries" |
| REQ-009 | Board cards (Projects page and the right-panel tab) show the key line and the dependency badge exactly as the UI/UX spec (UXJ-001, VIS-001, VIS-002a–d, VIS-010, VIS-013, VIS-015). | BEH-005 | Must | Approved design | UI/UX DEC-001, DEC-003 |
| REQ-010 | The Task page and the tab's Task view show the key chip with copy and the Dependencies card exactly as the UI/UX spec (UXJ-002, VIS-003–006, VIS-011, VIS-014). | BEH-006 | Must | Approved design | UI/UX DEC-002, DEC-004 |
| REQ-011 | New task and Edit task show the "Depends on (optional)" field and search exactly as the UI/UX spec (UXJ-003, VIS-007a/b, VIS-008, VIS-009a/b), including keyboard behavior, the 8-option limit, newest-first order, exclusions and the greyed loop option. | BEH-004 | Must | Approved design | UI/UX DEC-005 |
| REQ-012 | The Workspaces tree's Task summary on delegated-copy rows leads with the key, exactly as the UI/UX spec (UXJ-004, VIS-012). | BEH-007 | Must | Approved design | UI/UX DEC-008 |
| REQ-013 | Long keys are shown whole where they fit; otherwise the Project part is middle-shortened with "…" and the number stays visible; the full key is in the tooltip and copies as one string (UXJ-005, VIS-013, VIS-014). | BEH-005, BEH-006 | Must | Approved design | UI/UX DEC-007 |
| REQ-014 | Deleting a Task removes its ID from every dependent's `dependsOnTaskIds`; dependents' derived states update live. A dependency ID that names no current Task is never shown or counted. | BEH-008 | Must | Engineering decision assigned by the design | DEC-003 |
| REQ-015 | All new strings, en and zh-CN, are exactly those in the UI/UX spec "Content, Labels, Validation, And Feedback". | BEH-005–007 | Must | Wording is user-approved | UI/UX spec |
| REQ-016 | Dependencies inform only: no create, update, status, delegate or reopen path checks them. | BEH-004 | Must | "It informs and never prevents work" | UI/UX spec |
| REQ-017 | Tasks created by `create_task` receive keys like any other. Agent tool behavior other than REQ-018 to REQ-020 is unchanged. | BEH-010 | Must | Preserve the tool contract | SR-002 |
| REQ-018 | For a Project Task, the agent-facing Task ID is its key. Every agent tool result field that carries a Task ID shows the key (`list_project_tasks`, `create_task`, `update_task`). Agent-facing texts name the Task by key: the existing-copy assignment message, delegation refusals and failure texts. A Temp task keeps its ID. No Task-ID field or agent-facing text carries a Project Task's long ID. Saved-context file paths and locators keep their stored form, which embeds the stored folder name; this covers `contextFiles` `locator` / `localPath` and the reference-file paths `delegate_task` delivers. The long ID stays the stored identity. A Task that no longer exists is named "a deleted Task" in agent-facing texts. | BEH-010 | Must | One meaningful ID | User 2026-10-17; clarified SR-003 (DEC-011, DEC-013) |
| REQ-019 | Every agent tool input that takes a Task ID (`update_task task_id`, `delegate_task task_id` in both modes) accepts a Project Task's key or its long ID. `update_task` also accepts a Temp task's ID, as today. `delegate_task` stays limited to Project Tasks, as today (CM-6): a Temp-task ID or unknown reference fails with `TASK_NOT_FOUND`. Key matching ignores letter case (`AutoByteus-42` = `autobyteus-42`). | BEH-010 | Must | Keys usable; old notes keep working | User 2026-10-17; clarified SR-003 (DEC-012) |
| REQ-020 | `create_task` and `update_task` accept `depends_on` (a list of keys or long IDs; omitted keeps, `[]` clears on update) with the REQ-007 rules; a reference to another Project's Task or a Temp task is rejected; `depends_on` on a Temp task is rejected. `list_project_tasks` and the `create_task` / `update_task` results show `dependsOn` as keys. | BEH-004, BEH-010 | Must | Agents record dependencies | User 2026-10-17 |
| REQ-021 | REQ-016 holds for tools too: no tool refuses or delays work because of dependencies. | BEH-010 | Must | Informs only | UI/UX spec |
| REQ-022 | Task page and Edit task URLs use the key (`/projects/<projectId>/tasks/<key>`, `…/edit`); every in-app link to a Project Task uses it; a URL with the long ID still opens the Task and is replaced by the key URL. | BEH-011 | Must | Readable links | User 2026-10-17 |

## Acceptance Criteria

| AC ID | Related REQ | Related Behavior / Scenario | Preconditions / Trigger | Observable Expected Outcome | Alternate / Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-017 | SCN-001 | Project "AutoByteus" whose highest number is 40; a Task is created in the UI, then one by `create_task` | Keys `autobyteus-41`, `autobyteus-42`; unchanged after later edits and status changes | Two concurrent creates in one Project get distinct numbers | Server unit + integration; web probe |
| AC-002 | REQ-001 | SCN-002 | Delete the Task with the highest number, then create a Task | The new Task gets the next number, not the deleted one | — | Server unit |
| AC-003 | REQ-002 | SCN-004 | Rename "AutoByteus" to "AutoByteus Core" | Existing and new Tasks keep the `autobyteus` prefix | — | Server unit |
| AC-004 | REQ-003 | SCN-004 | After AC-003, create a Project named "AutoByteus"; also create "AutoByteus!" | Prefixes `autobyteus-2`, `autobyteus-3`; their first keys `autobyteus-2-1`, `autobyteus-3-1` | — | Server unit |
| AC-005 | REQ-002, DEC-002 | SCN-001 | Projects "AutoByteus Agents", "Customer Onboarding Experience Redesign", "Café Ops", "客户门户", "!!!" | Prefixes `autobyteus-agents`, `customer-onboarding-experience-redesign`, `cafe-ops`, `客户门户`, `project` | — | Server unit |
| AC-006 | REQ-004 | SCN-003 | Released data: Projects with Tasks and no keys (and one invalid task folder) | After the upgrade every valid Task has a key in creation order; prefixes in Project creation order; next create continues; a second start changes nothing; nothing else in the files changes | One Project that cannot be keyed does not stop startup, other Projects or new work | Migration tests on synthesized released data; isolated desktop instance |
| AC-007 | REQ-005, REQ-008 | SCN-009 | Temp task copy in the tree | No key; `taskWorkerTasks` answer `taskKey: null` | — | Server unit; web unit |
| AC-008 | REQ-006, REQ-007 | SCN-005 | Edit task: choose `autobyteus-39`, save | `dependsOnTaskIds` stored on this Task only; the other Task's file unchanged | — | Server unit; probe |
| AC-009 | REQ-007 | SCN-006 | API create / update with self, unknown, other-Project or loop-forming IDs (B depends on A, then A on B; or via C) | Rejected with a clear error; nothing written; in the editor the existing error line shows it | — | Server unit + GraphQL E2E |
| AC-010 | REQ-007 | SCN-005 | Update with `dependsOnTaskIds` omitted | Stored dependencies unchanged; supplying `[]` clears them | — | Server unit |
| AC-011 | REQ-008 | SCN-007 | Any Task created / updated / status-changed | `task_upserted` carries `taskKey` and `dependsOnTaskIds`; boards update without Refresh | — | Server unit (wire schema); probe |
| AC-012 | REQ-009, REQ-015 | SCN-007 | To Do / In Progress Task with open, cancelled-only or Done-only dependencies; Done / Cancelled Tasks | "Blocked by <lowest open key>" (+N, tooltip lists all with status) / "Dependency cancelled: <key>" (+N) / nothing; Done / Cancelled cards never show one; key line on every card | Badge disappears live when dependencies become Done | Web unit; probe; isolated instance |
| AC-013 | REQ-010 | SCN-008 | Open a Task page / the tab's Task view | Key chip after status; copy puts the key on the clipboard and shows "✓ Copied" 1.5 s; Depends on (all, key order, Done ✓), informs note while blocked, Required by, "None"; rows navigate (page) / open in tab | Clipboard write failure shows the existing error pattern | Web unit; probe; isolated instance |
| AC-014 | REQ-011 | SCN-005 | New / Edit task, search | ≤ 8 options of this Project, newest key first, key / summary / status; excludes itself and chosen; loop options greyed "Depends on this Task" and not choosable; arrows skip loop options; Enter adds; Esc closes; closes after a choice; "No other Tasks in this Project match." | — | Web unit; probe |
| AC-015 | REQ-011, REQ-001 | SCN-005 | New task with a dependency, saved | Board shows the new Task with the next key and "Blocked by <dep>" | — | Probe; isolated instance |
| AC-016 | REQ-012 | SCN-009 | Delegated copy of a Project Task in the tree | "<key> <summary>", key medium; tooltip "Show Task in Projects: <key> <summary>" | — | Web unit; isolated instance |
| AC-017 | REQ-013 | SCN-007, SCN-008 | Long-name Project | Whole keys on cards / chip / rows when they fit; middle-shortened with the number kept where not; tooltip full key | — | Web unit; probe screenshots vs VIS-013/014 |
| AC-018 | REQ-014 | SCN-010 | Delete a Task others depend on | Dependents' stored lists no longer contain it; their badges / lists update live | — | Server unit; probe |
| AC-019 | REQ-016 | — | A blocked Task | Can still be delegated, started, set to Done | — | Server unit (no check added) |
| AC-020 | REQ-017, REQ-018 | SCN-011 | `list_project_tasks`, `create_task`, `update_task` | `taskId` is the key (e.g. `autobyteus-42`) for Project Tasks; no long Task ID in any Task-ID field (context-file `locator` / `localPath` unchanged); Temp-task `update_task` result shows its ID; every other field as before | — | Server unit (manifest) + tool E2E |
| AC-022 | REQ-019 | SCN-011 | `update_task task_id="autobyteus-42"`; `update_task` with the long ID; `delegate_task recipient_address + task_id="autobyteus-42"`; `delegate_task target_agent_run_id + task_id="autobyteus-42"` | Each acts on the same Task as the long ID would; `AutoByteus-42` works too | Unknown key, or `delegate_task` with a Temp-task ID → the existing `TASK_NOT_FOUND` | Server unit + E2E (scripted runtime) |
| AC-023 | REQ-018 | SCN-011 | Existing-copy assignment; a refusal naming a Task (e.g. "already has Task …"); undelivered-work text | Texts name `autobyteus-42`, not the long ID | The copy's current Task was deleted → the text says "a deleted Task" | Server unit |
| AC-024 | REQ-020 | SCN-012 | `create_task depends_on=["autobyteus-39"]`; `update_task depends_on=[]`; loop / other Project / Temp task | Stored as IDs; results show `dependsOn: ["autobyteus-39"]`; board shows "Blocked by autobyteus-39"; invalid → `TASK_DEPENDENCY_INVALID`, nothing written | — | Server unit + E2E |
| AC-025 | REQ-003 | SCN-004 | Delete Project "AutoByteus", create a Project named "AutoByteus" | New prefix `autobyteus-2`; `update_task task_id="autobyteus-5"` (old key) → not found | — | Server unit |
| AC-026 | REQ-022 | SCN-013 | Open a Task from the board, panel or a dependency row; open a long-ID URL | URL `/projects/<id>/tasks/autobyteus-42`; the long-ID URL shows the Task and its address becomes the key URL; edit URL likewise | — | Web unit; probe |
| AC-027 | REQ-021 | — | A blocked Task via tools | `update_task status=IN_PROGRESS` and `delegate_task task_id=<blocked key>` succeed | — | Server unit |
| AC-021 | REQ-009–REQ-013 | All user scenarios | Isolated Electron instance with a test data package | The journeys above work in the real desktop app, with evidence | — | Isolated desktop instance (TESTING.md) |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator | Goal Or Event | Trigger / Entry | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | User or agent | A new Task gets a key | New task Save; `create_task` | Project exists | Create → key assigned | Next number, Project prefix | — | Supported Normal | UI/UX TR-009, VIS-009b | REQ-001, AC-001, AC-005 |
| SCN-002 | System | User | Numbers are not reused | Delete, then create | — | — | Next number | — | Supported Normal | UI/UX "Numbers are never reused" | AC-002 |
| SCN-003 | Operational | App upgrade | Existing Tasks get keys | First start of the new version | Released data without keys | Keying per Project | All Tasks keyed | A Project that can't be keyed is preserved; the rest works | Supported Normal | Delegated Task; user data shape | REQ-004, AC-006 |
| SCN-004 | User | User | Rename a Project / reuse a name | Edit Project / New Project | — | — | Prefix kept; colliding new prefix suffixed | — | Supported Explicit Edge (design open decision) | UI/UX "Open Decisions" | REQ-002/003, AC-003/004 |
| SCN-005 | User | User | Set dependencies | New / Edit task | Project with Tasks | Search, choose, save | Stored; board, lists update | Save error shown in the existing line | Supported Normal | UXJ-003 | REQ-007/011, AC-008/010/014/015 |
| SCN-006 | Contract | API caller (stale UI, concurrent agent change) | Invalid dependency | GraphQL mutation | — | — | Rejected, nothing written | — | Supported Explicit Edge (integrity) | UI/UX "server rejects self, cross-Project and loops" | AC-009 |
| SCN-007 | User | User | Scan the board | Projects page / tab | — | — | Keys, badges | Live updates | Supported Normal | UXJ-001 | AC-011/012/017 |
| SCN-008 | User | User | Read a Task | Task page / tab Task view | — | Copy key; follow rows | Chip, lists | — | Supported Normal | UXJ-002 | AC-013 |
| SCN-009 | User | User | Identify a copy's Task | Workspaces tree | Delegated copies | — | "<key> <summary>" | Temp: no key | Supported Normal | UXJ-004 | AC-007/016 |
| SCN-011 | Contract | Agent (e.g. Project Task Manager) | Refer to a Task by key | `update_task`, `delegate_task`, `list_project_tasks`, `create_task` | Project with keyed Tasks | List → act by key → report by key | Same outcomes as with long IDs; texts show keys | Unknown key refused as today | Supported Normal | User 2026-10-17 | REQ-018, REQ-019; AC-020, AC-022, AC-023 |
| SCN-012 | Contract | Agent | Record "depends on" | `create_task` / `update_task depends_on` | — | Set → stored → board shows | Stored, validated | Invalid refused | Supported Normal | User 2026-10-17 | REQ-020; AC-024 |
| SCN-013 | User | User | Readable Task link | Board, panel, dependency row, edit | — | Navigate | Key URL | Long-ID URL still works | Supported Normal | User 2026-10-17 | REQ-022; AC-026 |
| SCN-010 | User | User | Delete a depended-on Task | Task page Delete | — | — | Dropped from dependents | — | Supported Normal | UI/UX "Failure and recovery"; design open decision | AC-018 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`
- Linked UI/UX supplement: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/task-keys-and-dependencies/ui-ux-spec.md` (Approved)
- Runnable UI reference: `/Users/normy/autobyteus_org/autobyteus-web-design`, `corepack pnpm dev --port 3210` → `/projects/project-desktop-app`, `/projects/project-onboarding-redesign`, `/chat?id=run-ptm-0001`
- Product ticket record and folder (externally owned): `…/autobyteus-web-design/tickets/done/task-keys-and-dependencies/product-ticket.md`
- Design repository revision: `personal@1ebf4c6` (design `1ff2edf`, integrated `bcaa278`); source pin `autobyteus-web@73f743211c` (still current for every affected web file except two unrelated composable lines; see investigation notes)
- UI/UX user-confirmation reference: 2026-10-17, "sounds good. i like the UI. its approved"
- Approved visual-reference baseline: `visual-references/VIS-001` … `VIS-015`
- Normative visual and interaction details: everything listed in the spec's "Implementation Fidelity Boundary — Must preserve", dimensions, typography, colours, icons, states, strings and accessibility sections.
- Explicitly illustrative: all domain values (Project names, Task texts, numbers, statuses, workers); the prototype's fixture, client-derivation location, GraphQL field names and the `TaskKey` measuring approach.
- Required screens and states: UIS-001 to UIS-006 and the State Behavior table of the spec.
- Product decisions that need the user: none. The spec's three engineering decisions are DEC-001 to DEC-003 below.

## Quality And Non-Functional Requirements

| Quality ID | Related | Area | Requirement | Conditions | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001, REQ-003 | Reliability | No two Tasks on a node ever share a key, including under concurrent creates (UI + agents) | Normal operation | Server unit with concurrent creates |
| QR-002 | REQ-004 | Reliability / Compatibility | Upgrade keying never blocks startup or new work; a Project that cannot be keyed is preserved untouched and only that Project's keying is affected | First start after upgrade | Migration tests; isolated instance |
| QR-003 | REQ-007 | Integrity | Loop validation holds under concurrent dependency writes in one Project | Normal operation | Server unit |
| QR-004 | REQ-013, spec a11y | Accessibility | Combobox roles / names, focus order and announcements as in the spec | — | Web unit |
| QR-005 | REQ-008 | Performance | No extra per-Task requests: the board derives states from the Project's Task list it already holds | — | Design review |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes` — `project.json` and `task.json` under `<appData>/projects/`.
- Must be preserved: every existing Project and Task field, context files, drafts, agent run resources; Task IDs.
- SR-002: a deleted Project's key prefix must be remembered for as long as the node's data exists (REQ-003). Projects deleted before the upgrade never had keys, so there is nothing to reserve for them.
- Acceptable: numbers of Tasks deleted before the upgrade are unknown and not reconstructed; backfill numbers from 1 contiguous in creation order.
- Constraints: user volume is small (7 Projects, ≤ 113 Tasks per Project); never test on real data (TESTING.md).
- Unknowns for design: transition mechanism, its commit and retry boundary, and what a Task without a key means to current readers (data migration guideline).

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior | Authority | Risk |
| --- | --- | --- | --- |
| GraphQL `ProjectTask`, inputs, `TaskWorkerTaskView` | New fields | `api/graphql/types/project-tasks.ts` | Web codegen (`generated/graphql.ts`) must follow |
| `/ws/projects` strict schema | New fields in `projectTaskSchema` | `project-change-messages.ts` | Strict schema: server and web change together |
| Data migration guideline | Policy for the backfill | `autobyteus-server-ts/docs/design/data_migration_guideline.md` | — |

## Supplemental Artifacts

| Artifact Path | Purpose | Related | Status | Approval |
| --- | --- | --- | --- | --- |
| `…/autobyteus-web-design/tickets/done/task-keys-and-dependencies/ui-ux-spec.md` | Normative UI/UX | REQ-009–015 | Approved (Product-owned) | User 2026-10-17 |
| `…/visual-references/VIS-001…VIS-015` | Final references | REQ-009–013 | Approved | User 2026-10-17 |
| `…/product-ticket.md` | Product record | All | Completed | — |

## Assumptions

| ID | Assumption | Why | Validation / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The board / Task page already hold the Project's full Task list (all statuses), so derived states can be computed client-side | Derivation never stored | Verified: `projectTaskStore` lists all statuses; board filters only for display | Confirmed |
| ASM-002 | Projects are node-scoped; keys need uniqueness only per node | Prefix uniqueness scope | `docs/projects.md` "Node-scoped Projects" | Confirmed |

## Decisions

| ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Prefix uniqueness after a rename or delete | A new Project could take a renamed or deleted Project's old name; also different names can yield the same prefix ("AutoByteus Agents" / "autobyteus-agents") | Reserve + reject colliding names; reserve + suffix; no reservation | Keys must identify one Task, so prefixes must be unique, and rejecting a name for an invisible reason is a poor experience. Reserve every current Project's prefix and give a colliding new one the smallest free `-2`, `-3` suffix (`autobyteus-2-1`). Keys stay unique because the number never contains "-". SR-002: since agents now act on keys, a deleted Project's prefix stays reserved too, so an old key in an agent's memory can never reach a different Task. | Solution Designer (SR-002 revision told to the user 2026-10-17) | Decided |
| DEC-002 | Non-Latin Project names | Keys must be readable for zh-CN users too | Transliterate (heavy, language-specific, imperfect); fall back to `project` (unreadable: `project-2-5`); keep letters and digits of every script | Keep it readable in the user's own script: lower-case, Latin diacritics removed ("Café" → `cafe`), every run of characters that are not letters or digits becomes "-", trimmed; `project` only when nothing remains. "客户门户" → `客户门户-3`. No user data has non-Latin names today. | Solution Designer | Decided |
| DEC-003 | A deleted Task others depend on | Dependents would otherwise keep a dangling ID | Leave and ignore; remove from dependents | Stored data should stay truthful and the UI simple: deleting removes the ID from dependents (their views update live). Readers still ignore an ID that names no current Task. | Solution Designer | Decided |
| DEC-004 | Number allocation | "Never reused" needs memory beyond the current Tasks | Max of current + 1 (reuses after deleting the newest); stored per-Project high-water mark | Store the highest assigned number per Project; allocate under a lock. Gaps are acceptable. | Solution Designer | Decided |
| DEC-005 | Backfill order | Keys should feel chronological | `createdAt` then ID | Tasks by `createdAt` then `taskId`; Projects reserve prefixes by `createdAt` then `projectId`, so the older Project keeps the plain prefix. | Solution Designer | Decided |
| DEC-006 | Error presentation for a server-rejected dependency | The UI prevents these; only a race or another client reaches it | New localized strings vs. the server message in the existing error line | The spec fixes all strings and says "a save error shows the editor's existing error line". Show the server's clear English message there; no new strings. | Solution Designer | Decided |
| DEC-007 | Which Tasks may be dependencies | Follow-ups often depend on Done Tasks | Open only / any status | Any status of the same Project (the approved picker lists all statuses with their pill). | Solution Designer | Decided |
| DEC-008 | Agent tools | The design says agents set the field "through tools"; the user wants one meaningful ID | Later; now with both IDs; now with the key as the one agent-facing ID; replace the stored ID | The user chose the key as the one agent-facing ID now; old IDs accepted. Replacing the stored ID was rejected: a migration across files, run resources and history, and it breaks references in past conversations. | User 2026-10-17 | Decided |
| DEC-009 | Key-based Task URLs | Readable links; the desktop app shows no address bar | Leave / include | The user chose to include it ("lets have both in this ticket"). Long-ID URLs keep working and are replaced by the key URL. | User 2026-10-17 | Decided |
| DEC-011 | What "no long ID in results" covers (ARCH-REV-002 AR-001) | `contextFiles` locators and paths, and delegated reference-file paths, embed the stored Task folder name | Change stored paths / keep stored paths | The user's direction keeps the long ID as the stored identity ("the long ID stays inside the server, where the Task's files … are stored"). Paths are file locations, not IDs an agent uses to refer to the Task. Keep them; Task-ID fields and texts carry only the key. | Solution Designer (user informed) | Decided |
| DEC-012 | Does `delegate_task` accept Temp-task IDs (AR-002) | REQ-019 wording could read so | Allow / keep Project-only | Keep today's behavior (CM-6): saved-Task delegation is for Project Tasks. Allowing Temp tasks would be new behavior nobody asked for. | Solution Designer (user informed) | Decided |
| DEC-013 | Naming a deleted Task in texts (AR-004) | A copy's current Task can be deleted while the copy is open | Long ID / "a deleted Task" | Name it "a deleted Task": no key exists, and a long ID would reintroduce what the user wants gone. | Solution Designer (user informed) | Decided |
| DEC-010 | Field naming in tool results | One ID for agents | Add `taskKey` beside `taskId`; put the key in `taskId` | Put the key in `taskId` and drop the long ID from results, so agents have one Task ID and never choose between two. | Solution Designer (agreed by the user 2026-10-17) | Decided |

## Traceability

| REQ | UC | BEH | AC | SCN | Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-002 | SCN-001, SCN-002 | Key format; VIS-009b |
| REQ-002 | UC-001 | BEH-003 | AC-003, AC-005 | SCN-004 | Open Decisions |
| REQ-003 | UC-001 | BEH-003 | AC-004 | SCN-004 | Open Decisions |
| REQ-004 | UC-001 | BEH-002 | AC-006 | SCN-003 | Data boundaries |
| REQ-005 | UC-001 | BEH-001 | AC-007 | SCN-009 | DEC-009 (UI/UX), VIS-012 |
| REQ-006 | UC-003 | BEH-004 | AC-008 | SCN-005 | Agreed model |
| REQ-007 | UC-003 | BEH-004 | AC-008–010 | SCN-005, SCN-006 | DEC-005/006 (UI/UX) |
| REQ-008 | UC-002, UC-004 | BEH-007, BEH-009 | AC-007, AC-011 | SCN-007, SCN-009 | Data boundaries |
| REQ-009 | UC-002, UC-004 | BEH-005 | AC-012, AC-021 | SCN-007 | VIS-001, VIS-002a–d, VIS-010, VIS-015 |
| REQ-010 | UC-002, UC-004 | BEH-006 | AC-013, AC-021 | SCN-008 | VIS-003–006, VIS-011, VIS-014 |
| REQ-011 | UC-003 | BEH-004 | AC-014, AC-015, AC-021 | SCN-005 | VIS-007a/b, VIS-008, VIS-009a/b |
| REQ-012 | UC-002 | BEH-007 | AC-016, AC-021 | SCN-009 | VIS-012 |
| REQ-013 | UC-002 | BEH-005, BEH-006 | AC-017 | SCN-007, SCN-008 | VIS-013, VIS-014 |
| REQ-014 | UC-005 | BEH-008 | AC-018 | SCN-010 | Failure and recovery |
| REQ-015 | UC-002–UC-004 | BEH-005–007 | AC-012–016 | — | Strings table |
| REQ-016 | UC-003 | BEH-004 | AC-019 | — | "never prevents work" |
| REQ-017 | UC-001 | BEH-010 | AC-001, AC-020 | SCN-001 | — |
| REQ-018 | UC-006 | BEH-010 | AC-020, AC-023 | SCN-011 | — |
| REQ-019 | UC-006 | BEH-010 | AC-022 | SCN-011 | — |
| REQ-020 | UC-007 | BEH-004, BEH-010 | AC-024 | SCN-012 | — |
| REQ-021 | UC-006, UC-007 | BEH-010 | AC-027 | — | "never prevents work" |
| REQ-022 | UC-008 | BEH-011 | AC-026 | SCN-013 | — |

## Architecture Phase Input

- Approved scenarios: SCN-001 to SCN-013.
- Constraints: the long `taskId` stays the stored identity; strict change-feed schema; tolerant readers / current-only runtime / no lockout (migration guideline); tool behavior beyond REQ-018–020 unchanged; Temp tasks untouched.
- Deferred to design: where the prefix and high-water mark live; key stored vs. composed; allocation locking; backfill mechanism and admission; where loop validation is serialized; deletion cleanup mechanism; client derivation placement; component structure.
- Facts to verify: projects-per-folder-v1 migration conventions and its `PROJECTS_MIGRATION_PENDING` gate; how Project rename and Task create interact with the catalog lock; web codegen flow.
- Risks: concurrency of number allocation (UI and agents); backfill admission semantics.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `Yes`
- Applicable UI/UX approval and final visual-reference basis are recorded: `Yes`
- Material assumptions and decisions are visible, each with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: none

### Approved Basis Ready For Design

- Approval recorded: `Yes`. SR-001 was approved by the Solution Designer within the direction (user informed); SR-002 was approved by the user (2026-10-17).
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: none
