# Investigation Notes

## Investigation Meta

- Package identifier: `task-closed-status`
- Request / ticket: Project Task `Add a "Closed" (not needed / won't do) Task status, separate from DONE` delegated by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`); user request 2026-10-08
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-closed-status`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-closed-status` / `codex/task-closed-status`
- Resolved base remote / branch / revision: `origin` / `personal` / `3a2496c95b16b0f7e0cedc7afdf615ada00b2267` (fetched 2026-10-08; `origin/HEAD -> origin/personal`)
- Finalization target remote / branch: `origin` / `personal`
- Bootstrap result: Worktree created with `git worktree add -b codex/task-closed-status … origin/personal`
- Bootstrap blocker: None
- Current solution revision ID: `SR-004`
- Authorities read (requirements reading gate; file and date): `references/requirements-engineering.md` (2026-10-08); templates `requirements-doc-template.md`, `investigation-notes-template.md`, `solution-revision-record-template.md` (2026-10-08); `TESTING.md` header/test-layer map (2026-10-08)
- Investigation status: Requirements and architecture investigation complete (2026-10-08)
- Authorities read (design reading gate, 2026-10-08): `references/architecture-design.md`, `design-principles.md`, `DESIGN.md`, `autobyteus-server-ts/docs/design/data_migration_guideline.md`, package `AGENTS.md` files

## Initial Request And Clarifications

- Original request (user, 2026-10-08): "Currently the task status has to do, in progress and done. But actually sometimes when I plan a task, I find that this task is not needed … I want to close it directly … I think this is normal in task management."
- Clarifications received: None yet. Naming, board presentation, app control placement and reopen behavior are open (see requirements `DEC-*`).
- User-supplied facts and constraints (from the delegated Task): new terminal status separate from DONE; settable from TODO/IN_PROGRESS in the app and through `create_or_update_task`; stops/removes workers exactly like DONE; visibly different from DONE on the board; `list_project_tasks` filter; existing data keeps working; every three-status assumption updated (server store, GraphQL, agent tools, web board, Temp tasks, change feed); verified by the user in the desktop app.
- Initial ambiguity: the app currently has **no** status control at all (see BEH-002), so "close from the board" is a new user-facing control and partially reverses an earlier user decision.

## Product And Domain Understanding

- Product area: Projects → Project Tasks and Temp tasks (Tasks with no Project); agent tools `list_project_tasks`, `create_or_update_task`, `delegate_task` (saved `task_id`).
- Affected actors or systems: desktop user on the Projects pages and right-panel Projects tab; agents using the Project tools (e.g. the external Project Task Manager agent); the `/ws/projects` change feed; Task agent-run resources (workers).
- Existing purpose: Tasks are business records; agents own status. DONE closes the Task's agent-run resources and asks the runtime to stop them; reopening (TODO/IN_PROGRESS) starts nothing but permits assigner-only reactivation.
- Terminology: "closed" is already used internally for agent-run resources (`closedAt`, `closeTask`, root `closed: true`, `TASK_AGENT_RESOURCE_CLOSED`) — today only DONE produces it. Any new status name must coexist with that wording.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-08 | Code | `autobyteus-server-ts/src/projects/domain/models.ts` | Status type | `ProjectTaskStatus = "TODO" \| "IN_PROGRESS" \| "DONE"`; `ProjectView.openTaskCount` documented as non-DONE | Design |
| 2026-10-08 | Code | `autobyteus-server-ts/src/agent-tools/project-tasks/project-task-tool-contract.ts` | Tool enum/descriptions | `statuses` array drives both `create_or_update_task.status` and `list_project_tasks.status`; descriptions and `TASK_STATUS_INVALID` message enumerate three values; DONE closure explained in description | Design |
| 2026-10-08 | Code | `autobyteus-server-ts/src/projects/services/project-task-service.ts` | Status rules / closure | `validateTaskStatus` (3 values); `status === "DONE"` → `closeAndWrite` in both `update` (Project) and `updateTaskById` (ad-hoc); DONE blocks `resolveAssignment`, `linkAgentRun`, `assertReopenable`/`reopenAssignment` (`assertTaskNotDone`) | Design |
| 2026-10-08 | Code | `autobyteus-server-ts/src/projects/stores/project-store.ts` L10, L33-38; `ad-hoc-task-store.ts` L9-17 | Persistence readers | Tolerant readers accept only the 3 statuses; any other value makes the task read as `null` (skipped/not found) | Data continuity |
| 2026-10-08 | Code | `autobyteus-server-ts/src/projects/services/project-service.ts` L272 | Counts | `openTaskCount = status !== "DONE"` | Requirement (counts) |
| 2026-10-08 | Code | `autobyteus-server-ts/src/projects/changes/project-change-messages.ts` L29 | Change feed | `taskStatusSchema = z.enum(["TODO","IN_PROGRESS","DONE"])` | Design |
| 2026-10-08 | Code | `autobyteus-server-ts/src/api/graphql/types/project-tasks.ts` | GraphQL | Enum has 3 values; `UpdateProjectTaskInput` has no status; resolver comment: "There is deliberately no status mutation here: users only create, edit the description of, and delete Tasks." | New app capability needed |
| 2026-10-08 | Code | `autobyteus-server-ts/src/app-data-migrations/migrations/projects-per-folder-v1/released-projects-array-v1.ts` | Legacy migration | Legacy reader/STATUSES fixed at 3 values; legacy data predates any new value | Should stay unchanged (design verifies) |
| 2026-10-08 | Code | `autobyteus-server-ts/src/agent-collaboration/domain/agent-team-collaboration-llm-contract.ts` L30-61, L68, L127-135 | LLM-facing text | `send_message_to`/`delegate_task` descriptions and team instructions explain "Task is DONE" stop/reactivation; `DELEGATE_TASK_ID_DESCRIPTION`: "Blank, unknown, ambiguous or DONE Tasks fail" | Text must cover new status |
| 2026-10-08 | Code | `autobyteus-server-ts/src/projects/domain/task-agent-resources.ts` L76-83; `root-task-execution-lifecycle.ts` L114, L148, L185-211 | Resource closure | Closure itself is status-agnostic (`closeTaskAgentResources`); messages say "(Task DONE)" | Wording |
| 2026-10-08 | Code | `autobyteus-web/types/project.ts`; `utils/projects/taskStatusLabelKey.ts`; `components/projects/ProjectTaskBoard.vue` L18-51 | Web board | `PROJECT_TASK_STATUSES` drives lanes; grouped record has exactly 3 keys; lanes are not mutation controls | Board presentation decision |
| 2026-10-08 | Code | `autobyteus-web/components/projects/ProjectTaskDetail.vue` L10 | Task page | Status pill colours: DONE emerald, IN_PROGRESS blue, else slate; no status control | Close/Reopen placement |
| 2026-10-08 | Code | `autobyteus-web/components/projects/TempTaskBoard.vue` L75-97; `TempTaskDetail.vue` L20; `TempTasksLink.vue` L24; `panel/ProjectsPanelTaskDetail.vue` L78-81 | Temp tasks | Two lanes Open/Done by `status === 'DONE'`; header count `status !== 'DONE'`; a new status would fall into **Open** without change | Must update |
| 2026-10-08 | Code | `autobyteus-web/localization/messages/{en,zh-CN}/projects.ts` | Labels | Status labels per value in both locales (`projects.task.status.*`, `projects.temp.lane.*`) | New labels in both locales |
| 2026-10-08 | Code | `autobyteus-web/generated/graphql.ts` L2142 | Codegen | Generated `ProjectTaskStatus` enum mirrors server | Regenerate |
| 2026-10-08 | Doc | `autobyteus-web/docs/projects.md` | Product contract | "Tasks have … read-only business status"; "status labels are not mutation controls"; "The web UI has no status mutation, so DONE and assignment come only from agent tools"; Temp tasks "no edit, delete or status control" | Explicit product decision to revisit |
| 2026-10-08 | Doc | `autobyteus-server-ts/docs/modules/projects.md` L23-28, L294-296, L471-547 | Server contract | "Only agents change a Task's status"; DONE procedure, retry by repeating DONE, reopen/reactivation contract | Docs update |
| 2026-10-08 | Doc | `tickets/done/project-tasks/requirements-doc.md` REQ-003, DEC-013, L250 | Prior decision | User decided "Status belongs to agents: in this ticket no human changes it"; "no status mutation API is needed for users in this ticket (agent-driven status arrives later)" | This request partly reverses it → user must confirm scope of app control |
| 2026-10-08 | Doc | `tickets/done/project-manager-ux/requirements-doc.md` L67, AC-015 | Prior decision | "No status control … in the UI"; read-only status preserved | Same |
| 2026-10-08 | Other | `/Users/normy/autobyteus_org/autobyteus-agents/agents/project-task-manager/skills/project-task-management/SKILL.md` L20, L45, L58-68 | External consumer | Manager lists TODO/IN_PROGRESS, treats a Task as ready when dependencies are DONE, never mentions a dropped status | Out of scope here (separate repo); follow-up candidate |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | `create_or_update_task {task_id, status}` | Agent patches status to TODO/IN_PROGRESS/DONE; any value can follow any other | DONE closes all open agent-run resources, writes status, asks runtime to stop exactly those runs; repeating DONE retries; other statuses start nothing | tool contract; `project-task-service.ts` L130-159, L304-316; server doc L471-493 | High |
| BEH-002 | User | Projects board / Task page / right-panel Projects tab | User sees status as read-only lane/pill; can create, edit text/context, delete | No user status control exists by explicit decision | web doc; GraphQL resolver comment; project-tasks REQ-003 | High |
| BEH-003 | User | Project board | Three fixed lanes To Do / In Progress / Done; search across all; per-lane counts; live highlight on lane move | Every Task appears in exactly one of 3 lanes | `ProjectTaskBoard.vue` | High |
| BEH-004 | User | Temp tasks board/page/header button, panel | Open/Done lanes (Done shows 10 latest until Show all); header count = not DONE; read-only | A Task with any non-DONE status counts as Open | `TempTaskBoard.vue`, `TempTasksLink.vue` | High |
| BEH-005 | Contract | `list_project_tasks {project_id, status?}` | Optional exact filter among 3 values | Invalid filter → `TASK_STATUS_INVALID` | tool contract | High |
| BEH-006 | Contract | `delegate_task {task_id}`; `send_message_to` reactivation | DONE Task refuses new assignment and reactivation (`TASK_AGENT_RESOURCE_CLOSED`); after reopen to TODO/IN_PROGRESS, only assigner can reactivate a started worker by messaging its run ID | Closed workers stay closed until reactivated | service L241-292; server doc L495-547 | High |
| BEH-007 | User/Contract | Projects list cards, right panel, Project delete confirm | `openTaskCount` = not DONE; delete confirm shows all Tasks | — | `project-service.ts` L272; web doc | High |
| BEH-008 | System | `/ws/projects` change feed | Task upsert messages validated against 3-value schema | A 4th value would fail schema validation | `project-change-messages.ts` | High |
| BEH-009 | Contract | Persisted `task.json` (Project and ad-hoc) | Readers accept 3 values; unknown value → Task treated as absent | — | stores | High |
| BEH-010 | — | Closing a Task as not needed | **No current supported behavior.** Workaround: mark DONE (false completion record) or leave TODO | — | request | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `ProjectTaskService.update` / `updateTaskById` / `closeAndWrite` | DONE-triggered closure for both Task kinds | New status must trigger identical closure | Generalize "terminal status" predicate rather than duplicate DONE checks |
| `resolveAssignment`, `linkAgentRun`, `assertTaskNotDone` | DONE blocks assignment and reactivation | New status must block identically | Same predicate |
| GraphQL `ProjectTaskResolver` | No status mutation | App close/reopen needs a write path | New narrow mutation vs. adding status to `UpdateProjectTaskInput` (design) |
| Web lanes keyed by `PROJECT_TASK_STATUSES` | 3 lanes | Presentation depends on DEC-002 | — |
| Change feed zod schema | 3 values | Must accept new value | — |
| LLM contract strings | DONE-only wording | Agents must learn the new status meaning and that it stops workers | Wording only |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files: `<appData>/projects/<projectId>/tasks/<taskId>/task.json`, `<appData>/ad-hoc-tasks/<taskId>/task.json` (`status` field); `agent_run_resources.json` (status-agnostic `closedAt`).
- Readers/writers: `project-store.ts`, `ad-hoc-task-store.ts`; legacy `released-projects-array-v1.ts` (read-only migration source).
- Evidence paths: above.

### Structural Surfaces

- GraphQL enum/type/mutations (`project-tasks.ts`) and web generated types/documents; agent tool schemas (`project-task-tool-contract.ts`); `/ws/projects` message schema; LLM contract strings.
- Existing structures that support the behavior: `closeAndWrite`/`TaskAgentResourceService.closeTask` already implement status-agnostic closure.

### Potential Structural Impacts To Investigate

- API or external-contract change: Yes — GraphQL enum value + a user status write path; agent tool enum.
- Persistence schema or invariant change: New enum value in `task.json`; no new field.
- Security or privacy boundary change: None identified.
- Concurrency or lifecycle change: Reuses DONE serialization; design must confirm DONE↔CLOSED transitions (already closed resources) behave as retry/no-op.
- Deployment/migration: No migration expected (existing values remain valid) — design verifies against repository migration conventions.
- Confirmed absent/present/unknown: as above.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- |
| Static code reading only | — | No runtime probe needed for requirements; behavior is fully determined by the cited code and docs | — | — |

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User, 2026-10-08 | Drop an unneeded planned Task directly, without recording it as done | Direct request | New terminal status; app control | Name, board, reopen, placement |
| User, 2026-10-08 (SR-002) | The app is agent-native: status changes only through `create_or_update_task`; the UI only displays it | Direct statement | No app status control | — |
| User, 2026-09-27 (project-tasks) | Status belongs to agents; no human status control "in this ticket" | Prior explicit decision | Adding Close/Reopen in the app changes it; confirm scope (only Close/Reopen, not general status editing) | DEC-003 |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Project Task Manager agent skill (separate `autobyteus-agents` repo) | current | Uses TODO/IN_PROGRESS filters; dependency readiness = DONE | SKILL.md | Not updated here; agents learn the new value from tool descriptions. Follow-up candidate |
| Common task tools (Linear "Canceled", Jira "Won't Do", GitHub "Closed as not planned") | Public practice | A distinct dropped/terminal state separate from completed is normal | General knowledge | Naming choice |

## Persisted Data And State Facts

- Affected stored subject: `status` in Project and ad-hoc `task.json`.
- Location and shape: `{taskId, projectId, description, status, createdAt, updatedAt, contextFiles[]}` / ad-hoc `{taskId, description, referenceFiles[], status, createdAt, updatedAt}`.
- Approximate volume: tens–hundreds of Tasks per node.
- Current readers and writers: stores above; legacy migration reader for pre-per-folder data.
- Current unknown/extra-field behavior: unknown status value → Task read as `null` (hidden / not found), file untouched.
- Required semantics to preserve: every existing TODO/IN_PROGRESS/DONE Task keeps its status and behavior; no rewrite needed.
- Acceptable loss: None for upgrade. On downgrade to an older app, a Task with the new status would be hidden (file kept on disk, visible again after upgrading) — proposed as accepted non-goal.
- Remaining evidence gap: repository migration-conventions check is an architecture-phase step.

## Product Design Request Context

- Product Design request in the current input: `Not stated`.
- Small, existing-pattern UI change (a lane/filter, a status pill colour, a Close/Reopen button with inline confirm like Task delete). Decisions are captured as DEC-002/DEC-003 for the user rather than a Product handoff.

## Product Design Findings

- N/A — not applicable (no Product Design request).

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| None | — | — | — | — | — | — |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| R-001 | Risk | Word "closed" already describes DONE's worker closure internally and in agent-facing text | Agents/users could conflate CLOSED with DONE | Name decision DEC-001; reword DONE-specific messages to "DONE or CLOSED" | Open |
| R-002 | Risk | Project Task Manager (external repo) does not know the new status; dependency readiness rule only considers DONE | A dependency that is CLOSED may block dependents in that agent's planning | Out of scope; record follow-up | Open |
| U-001 | Unknown | Whether migration-conventions require a data-version marker for a new enum value | Data continuity | Resolved: guideline §3 says no version fields, and a tolerant reader absorbs an additive enum value → Directly Usable. Guideline §3/§4 require repointing the released migration that imports current `readTaskFile` | Resolved |

## Architecture Investigation Findings

| Date | Source / Command | Finding | Design Implication |
| --- | --- | --- | --- |
| 2026-10-08 | `grep -rn "\bDONE\b" autobyteus-server-ts/src autobyteus-web` (excluding runtime-provider noise) | Status vocabulary in 7 server places; DONE rule at service L149/243/257/331/376 and project-service L272. Web DONE classification in projectTaskStore L30/L78, TempTaskBoard L92, TempTasksLink L24, TempTaskDetail L20, ProjectsPanelTaskDetail L81, ProjectTaskDetail L10 (pill), ProjectTaskBoard L50. Runtime refusal texts "(Task DONE)" in root-task-execution-lifecycle L114/L148, root-task-dispatch L35, root-task-agent-resource-scope L130/L134, task-agent-resources L51; comment-only sites in team/org/standalone runtimes | Duplicated policy → one vocabulary owner per side; wording sweep |
| 2026-10-08 | `projects/domain/task-agent-resources.ts` L76-80, `services/task-agent-resource-service.ts` L84-124, `project-task-service.ts` L304-316 | Closure is status-agnostic; repeat closes nothing new and re-requests stops | CLOSED reuses closeAndWrite; DONE↔CLOSED = repeated-DONE semantics |
| 2026-10-08 | `app-data-migrations/migrations/projects-per-folder-v1/projects-per-folder-v1-app-data-migration.ts` L7, L121-123, L158-160 | Released migration classifies target CURRENT/CONFLICT and validates writes with the **current** `readTaskFile` | Guideline §3/§4: repoint to a frozen copy (in `released-project-folder-v1.ts`) before widening. Outcomes are identical, because the expected content is 3-value and an unequal or invalid target is CONFLICT either way |
| 2026-10-08 | `api/graphql/types/project-tasks.ts` | `UpdateProjectTaskInput` has no status; `updateTask` honours `status` only via `Object.hasOwn`, which GraphQL inputs can't supply | AC-002 holds by keeping inputs unchanged |
| 2026-10-08 | `autobyteus-web/codegen.ts` | Codegen needs a running backend schema | Regenerate or apply the generated-equivalent enum line |
| 2026-10-08 | `autobyteus-web/components/projects/{ProjectTaskBoard,TempTaskBoard}.vue` | Lanes in a container-query grid (1 col <752px, 3 or 2 cols ≥752px); toolbar = search, Refresh (`ml-auto`), New task | The Closed lane is a full-width grid row; the toggle sits beside Refresh |
| 2026-10-08 | `autobyteus-web/stores/projectTaskStore.ts` L30, L78, L95-99 | Lane-move highlight via `laneOf`; open count set into projectStore | Use the presentation owner's lane/open helpers |
| 2026-10-08 | Docs grep: `agent_tools_mcp_server.md` L316, `prompt_engineering.md` L254, `agent_communication.md` L385/439, `agent_websocket_streaming_protocol.md` L97-104, `web/docs/chat.md` L383-386, `TESTING.md` L367/391 | Further DONE-only statements | Docs sync list |

## Requirement Implications

- The app has no status write path. SR-001 proposed a user Close/Reopen action; the user rejected it on 2026-10-08 (SR-002: the app stays display-only and agents own status), so no GraphQL status write is added.
- Because Temp lanes classify by `=== 'DONE'`, a new status would silently appear as "Open" — explicit requirement needed.
- Because closure machinery is status-agnostic, "stop workers exactly like DONE" is achievable as a shared rule.
- Because readers treat unknown values as absent, no upgrade migration is implied; downgrade hiding is a candidate non-goal.

## Notes For Architecture Design

- Map scenarios SCN-002..SCN-006 (requirements) to: tool contract → `ProjectTaskService.updateTaskById`; closure via existing `closeAndWrite`; web display/lanes. No GraphQL status write (SR-002).
- Verify DONE→CLOSED and CLOSED→DONE transitions (already-closed resources): expected no new closure, retry stop requests.
- Verify the change-feed "moved lane" highlight and queue/replay with the new value.
- Keep `released-projects-array-v1` unchanged unless migration conventions require otherwise.
