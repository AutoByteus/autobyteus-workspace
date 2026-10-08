# Design Spec — Closed Task status (`task-closed-status`)

## Solution And Approval Basis

- Current solution revision ID: `SR-005`
- Approved requirements baseline / revision and user-approval reference: `requirements-doc.md` at SR-003. The user approved on 2026-10-08 ("Just have your design create a clean UI. I like your suggestion … a small closed control next to the refresh button shows a closed [lane] on demand"), on top of SR-002 ("the UI is just for displaying").
- Behavior-defining supplements and their approval references: None
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-closed-status/tickets/in-progress/task-closed-status/investigation-notes.md`
- Authorities read (design reading gate, 2026-10-08): `references/architecture-design.md`, `design-principles.md`, project `DESIGN.md` (repository root), `autobyteus-server-ts/docs/design/data_migration_guideline.md` (required by DESIGN.md for persisted data), `autobyteus-server-ts/AGENTS.md`, `autobyteus-web/AGENTS.md`, `TESTING.md` (test-layer map). `design-examples.md` was not needed.
- Project design-principle conflicts or discrepancies: One pre-existing discrepancy. The released migration `projects-per-folder-v1-app-data-migration.ts` imports the current `readTaskFile`, but the migration guideline (§3, §4) requires a frozen copy and says to "repoint any released migration that still imports it" before changing a current schema. This design repoints it (see Persisted Data). There are no conflicts with the general principles.

## Current-State Read

- Task status is a three-value vocabulary (`TODO | IN_PROGRESS | DONE`) that is **repeated in seven places**:
  - the `models.ts` type;
  - the `STATUSES` sets in `project-store.ts` and `ad-hoc-task-store.ts`;
  - `validateTaskStatus` in `project-task-service.ts`;
  - the `statuses` array and error text in `project-task-tool-contract.ts`;
  - the zod `taskStatusSchema` in `project-change-messages.ts`;
  - the GraphQL `ProjectTaskStatus` enum.

  The "work has ended" rule is also repeated as literal `=== "DONE"` checks:
  - service L149 and L376 (trigger closure);
  - L243 and L257 (refuse assignment);
  - L331 (refuse reactivation);
  - `project-service.ts` L272 (open count).
- The closure mechanism is already status-agnostic. `ProjectTaskService.closeAndWrite` → `TaskAgentResourceService.closeTask` → `closeTaskAgentResources` → `TaskAgentResourceRelease.release` closes every open agent-run entry under the Task's serialization and asks the host roots to stop exactly those runs. A repeated call writes nothing new and re-requests the stop. Only the trigger and the guards name DONE.
- Status is agent-owned. GraphQL has no status write (`UpdateProjectTaskInput` has no `status`), and the web only displays status. This stays as is (REQ-006).
- Web:
  - `ProjectTaskBoard` renders one lane per `PROJECT_TASK_STATUSES` entry.
  - `TempTaskBoard`, the `projectTaskStore.laneOf` live-highlight, `TempTasksLink`, `TempTaskDetail` and `ProjectsPanelTaskDetail` classify by `status === 'DONE'`, so a fourth value would silently become "Open".
  - The status pill colours are an inline ternary that is repeated in three components.
  - The open count `status !== 'DONE'` is repeated in `projectTaskStore.publish` and `TempTasksLink`.
- Evidence: investigation notes, Source Log and Architecture Investigation Findings.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale: about 15 server files and about 15 web files, plus tests and docs. Every change sits inside the existing Projects owners (Task status vocabulary, Task service, stores, tool contract, LLM contract text, change feed, GraphQL enum, Projects board components). It adds one small web component and one small server domain file. No new subsystem or runtime owner.
- Architectural risk: `Low`
- Risk rationale:
  - The new value travels through existing contracts as an **additive enum value** (persisted `status`, GraphQL enum, tool enum, change-feed schema).
  - No migration (Directly Usable). No new write path; GraphQL stays read-only for status.
  - No new lifecycle or concurrency: CLOSED reuses DONE's existing serialized closure, release and refusals through one predicate.
  - The guideline-mandated repoint of the released migration is behavior-preserving (shown below).
  - By the house test, existing structural surfaces absorb the value; the only structural edit consolidates a duplicated vocabulary into its owner.
- Escalation trigger: return a `Design Impact` if implementation finds any of:
  - a status consumer not listed here that changes runtime behavior, beyond wording;
  - that CLOSED cannot reuse `closeAndWrite` unchanged;
  - that DONE ↔ CLOSED transitions alter the resource file beyond today's repeated-DONE behavior;
  - that the migration repoint changes any classification outcome.

## Architecture Investigation Evidence

| Source | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code | `projects/services/project-task-service.ts` L49-52, 149, 243, 257, 304-335, 376 | DONE literal checks around a status-agnostic `closeAndWrite` | One `isTerminalTaskStatus` predicate drives trigger and refusals | None |
| Code | `projects/domain/task-agent-resources.ts` L76-80; `services/task-agent-resource-service.ts` L84-124 | Closure closes open entries only; repeat = re-request stop | DONE→CLOSED / CLOSED→DONE = existing retry semantics, no new file change | None |
| Code | `projects/stores/{project-store,ad-hoc-task-store}.ts` | Tolerant readers gate on a local STATUSES set; unknown → task absent | Widen via shared vocabulary; existing values unchanged | None |
| Code | `app-data-migrations/migrations/projects-per-folder-v1/projects-per-folder-v1-app-data-migration.ts` L7, L121-160 | Released migration uses current `readTaskFile` for CURRENT/CONFLICT classification and post-write validation | Repoint to a frozen copy before widening (guideline §3/§4) | None. Outcomes are identical: expected content always has 3-value statuses, and a non-equal or invalid target is `CONFLICT` under either reader |
| Code | `api/graphql/types/project-tasks.ts` | Enum is a TS enum; no status in update input | Add `CLOSED` to enum only | None |
| Code | `projects/changes/project-change-messages.ts` L29 | zod enum gates feed messages | Build from shared tuple | None |
| Code | `agent-collaboration/domain/agent-team-collaboration-llm-contract.ts`; `execution/task/{root-task-execution-lifecycle,root-task-dispatch,root-task-agent-resource-scope}.ts`; `projects/domain/task-agent-resources.ts` L51, L82-83 | LLM-facing texts and refusal messages say "DONE" | Wording to "DONE or CLOSED" | None |
| Code | `autobyteus-web/stores/projectTaskStore.ts` L30, L78; `components/projects/{ProjectTaskBoard,TempTaskBoard,TempTasksLink,ProjectTaskDetail,TempTaskDetail}.vue`; `panel/ProjectsPanelTaskDetail.vue`; `utils/projects/taskStatusLabelKey.ts` | Duplicated DONE classification, pill styles and lane mapping | One web status-presentation owner | None |
| Doc | `autobyteus-web/codegen.ts` | Codegen reads schema from a running backend | Regenerate, or apply the generated-equivalent enum line | None |
| Command | `grep -rn "\bDONE\b"` over server/web src (2026-10-08) | Full inventory of DONE sites (recorded in investigation notes) | Change inventory below | Comment-only sites listed as wording sweep |

## Intended Change

1. Introduce one owned Task-status vocabulary on the server (`projects/domain/task-status.ts`): the four values, validation, and `isTerminalTaskStatus` (DONE or CLOSED). Every server consumer uses it.
2. CLOSED triggers exactly DONE's closure and is refused for new assignment or reactivation exactly like DONE.
3. Additive `CLOSED` in the GraphQL enum, the agent tool enum and descriptions, the LLM collaboration texts, and the change-feed schema. The open count becomes "not terminal".
4. Web: one status-presentation owner (labels, pill style, temp lanes, open predicate). Closed Tasks are hidden from the boards by default. A small "Closed (N)" toggle beside Refresh reveals a Closed column as the last column, after Done (SR-005). Pills and labels show "Closed".
5. Repoint the released projects-per-folder migration to a frozen task-file reader. Docs are updated.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC IDs | Trigger Or Contract | Existing Behavior / Evidence | Approved Change Or Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | REQ-002, REQ-004, REQ-007; AC-001, AC-003, AC-004, AC-007 | `create_or_update_task {task_id, status}` | DONE closes; others write | CLOSED closes like DONE; reopen writes only | DS-001 |
| BEH-002 | User | REQ-006; AC-002 | Projects pages | Display only | Preserved: display only, no status write | DS-003 |
| BEH-003 | User | REQ-008, REQ-009; AC-008 | Project board, right panel | 3 lanes | 3 lanes plus a hidden-by-default Closed lane behind a toggle | DS-003 |
| BEH-004 | User | REQ-010; AC-009 | Temp board/page/header | Open/Done by DONE | Open/Done/Closed (Closed hidden by default); count excludes Closed | DS-003 |
| BEH-005 | Contract | REQ-005; AC-006 | `list_project_tasks {status}` | 3-value filter | 4-value filter | DS-001 (list branch) |
| BEH-006 | Contract | REQ-003, REQ-007; AC-005 | `delegate_task {task_id}`, `send_message_to` run ID | DONE refuses | Terminal (DONE or CLOSED) refuses; reopen allows assigner reactivation | DS-002 |
| BEH-007 | User | REQ-011; AC-010 | Project cards, panel picker | open = not DONE | open = not terminal | DS-003 |
| BEH-008 | System | REQ-012; AC-011 | `/ws/projects` | 3-value schema | 4-value schema; live lane moves | DS-004 |
| BEH-009 | Contract | REQ-013; AC-012 | Stored task.json | 3 values | Directly usable; reader accepts 4 | Persisted Data |
| BEH-010 | Contract | REQ-001 | — | none | CLOSED exists | all |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature`
- Current design issue found: `Yes` (small)
- Structural triggers that fire:
  - **Repeated coordination / shared-structure trigger.** The status vocabulary is duplicated in 7 server places and the DONE rule in 6 server sites. On the web, the DONE classification, open count and pill style are duplicated across 6 files. Adding a value by hand in every place is the drift this ticket would otherwise multiply.
  - Triggers checked and ruled out:
    - Authoritative-boundary: callers already use `ProjectTaskService`; no bypass is added.
    - Empty indirection: the new files own real policy.
    - Legacy-cleanup: no compatibility path.
    - Persisted-data: Directly Usable.
    - Ambiguous-boundary: no new API.
- Root cause classification: `Duplicated Policy Or Coordination`
- Refactor needed now: `Yes` (bounded). Consolidate the status vocabulary and terminal rule (server) and the status presentation (web) into one owner each, as part of adding CLOSED.
- Evidence: the grep inventory in the investigation notes, and the code lines cited above.
- Design response: `projects/domain/task-status.ts` (server) and `utils/projects/taskStatusPresentation.ts` (web, renamed from `taskStatusLabelKey.ts`). Every consumer imports from them; the local sets, literals and ternaries are removed.
- Refactor rationale: Adding CLOSED to each copy separately would leave the next status change just as error-prone. Consolidating costs only a few lines.
- Intentional deferrals and residual risk: GraphQL's TS enum stays a separate declaration (type-graphql needs a TS enum). A unit test asserts it equals the shared tuple. Comment-only "(Task DONE)" mentions in runtime subsystems outside Projects become "(Task DONE or CLOSED)" in a mechanical sweep; leftovers would be cosmetic only.

## Terminology

- **Terminal status**: DONE or CLOSED. The Task's work has ended: its agent runs are closed and stopped, and new assignment or reactivation is refused until it is reopened.
- **Open status**: TODO or IN_PROGRESS (not terminal).
- **CLOSED**: dropped as not needed, not completed. Shown as "Closed" / "已关闭".

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- In scope:
  - remove the duplicated local status sets, literals and DONE ternaries (Removal plan);
  - rename `taskStatusLabelKey.ts` to `taskStatusPresentation.ts` and update its 3 importers. No re-export shim.

## Persisted Data / State Transition Decision (Mandatory)

- Stored subject: `status` in `<appData>/projects/<projectId>/tasks/<taskId>/task.json` and `<appData>/ad-hoc-tasks/<taskId>/task.json`. Tens to hundreds per node.
- Change: the enum gains `CLOSED`. There is no new field and no change of meaning for existing values (guideline §3: no field reused with a new meaning).
- Normal readers/writers: tolerant readers project the known fields and validate `status` against the vocabulary. Writers emit the exact shape (unchanged key set).
- Required semantics under direct use: every existing TODO/IN_PROGRESS/DONE file reads identically, and the agent-run resource files are untouched.
- Decision: `Directly Usable — No Migration`.
- Rationale:
  - Guideline checklist §2:
    1. Need: none; the tolerant reader absorbs an additive value.
    2. Availability: unaffected; no startup work.
    3. Source/target: current per-folder shape. Released predecessor `projects-per-folder-v1` inspected; its source (`released-projects-array-v1.ts`) is already frozen.
    4. Disposition: N/A.
    5. Commit: N/A.
    6. Current-only boundary: the released migration currently imports the current `readTaskFile`. It is **repointed** to a frozen copy (`readReleasedTaskFileV1`, 3-value statuses) in `released-project-folder-v1.ts`, which already holds the frozen Project target reader. Classification is unchanged: expected content is always 3-value, and a target that is unreadable or unequal is `CONFLICT` under either reader.
    7. Cost: zero.
    8. References: none crossing.
    9. Evidence: store tests read all four values and the existing fixtures; existing migration tests stay green after the repoint.
    10. Lessons: avoided adding a migration or version field merely because an enum widened.
  - Downgrade (an older app reading CLOSED) hides that Task without loss; this is an approved non-goal.
- Supported ACs: AC-012.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-005, BEH-010 | Agent tool call | Status persisted; workers stopped; ack returned | `ProjectTaskService` | Closing and reopening through the tool |
| DS-002 | Primary End-to-End | BEH-006 | `delegate_task {task_id}` / `send_message_to` run ID | Refusal or admission | `ProjectTaskService` (TaskAgentResourcePort) | Terminal Tasks refuse new and reactivated work |
| DS-003 | Primary End-to-End | BEH-002, BEH-003, BEH-004, BEH-007 | GraphQL read / store snapshot | Board lanes, toggle, pills, counts | Web `projectTaskStore` + board components | Clean display |
| DS-004 | Return-Event | BEH-008 | Task write commit | Open pages updated live | `ProjectChangePublisher` → web store | Live lane move into or out of Closed |

## Primary Execution Spine(s)

- DS-001: `Agent → create_or_update_task (tool contract parse/validate) → project-task-tool-manifest → ProjectTaskService.updateTaskById → [isTerminalTaskStatus ? closeAndWrite : write] → TaskAgentResourceService.closeTask → store write → TaskAgentResourceRelease.release (host roots stop runs) → change publisher → ack {status: CLOSED}`
- DS-002: `Agent → delegate_task {task_id} → root task dispatch → ProjectTaskService.resolveAssignment / linkAgentRun (terminal → TASK_AGENT_RESOURCE_CLOSED)`; and `send_message_to run ID → assertReopenable / reopenAssignment → assertTaskNotTerminal`
- DS-003: `projectTasks / tasksWithoutProject query → projectTaskStore snapshot → ProjectTaskBoard / TempTaskBoard (lane grouping via taskStatusPresentation; Closed hidden unless toggled) → ProjectTaskRow / Task pages (status pill)`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The tool parses `status` against the shared vocabulary. The service asks `isTerminalTaskStatus`; for DONE or CLOSED it closes open runs first (fence), writes the status, then requests stops, exactly as DONE does today. A reopen (TODO/IN_PROGRESS) only writes. | tool contract, manifest, service, resource service, store, release | ProjectTaskService | task-status vocabulary, change publisher |
| DS-002 | Assignment and reactivation guards ask the same predicate under the Task's serialization and refuse with a message naming the actual status. | dispatch, service | ProjectTaskService | task-status vocabulary |
| DS-003 | Reads deliver four-value statuses. Boards group by status: Project → TODO/IN_PROGRESS/DONE lanes plus a CLOSED lane; Temp → open/done/closed. The Closed lane renders only while the toggle is on. Counts use the open predicate. | store, boards, rows, pages | projectTaskStore / boards | taskStatusPresentation, ClosedTasksToggle |
| DS-004 | Every committed write publishes `task_upserted` with the new status (schema from the shared tuple). The web store applies it; a lane change highlights as `moved`. | publisher, feed, store | ProjectChangePublisher / projectTaskStore | — |

## Spine Actors / Main-Line Nodes

`create_or_update_task` contract → `project-task-tool-manifest` → `ProjectTaskService` → `TaskAgentResourceService` / stores → `TaskAgentResourceRelease`; GraphQL `ProjectTaskResolver` → web `projectTaskStore` → `ProjectTaskBoard` / `TempTaskBoard` / Task pages.

## Ownership Map

- `projects/domain/task-status.ts` (new): owns the status vocabulary, its validation and the terminal/open predicates. Pure domain; no I/O.
- `ProjectTaskService`: owns when closure happens and the assignment/reactivation refusals. Unchanged sequencing; only the condition changes.
- `TaskAgentResourceService` / `TaskAgentResourceRelease`: unchanged closure and stop mechanics.
- Stores: tolerant persistence using the vocabulary.
- Tool contract: agent-facing schema and descriptions; delegates status validation to the vocabulary.
- LLM collaboration contract: agent-facing wording.
- Web `utils/projects/taskStatusPresentation.ts` (renamed): owns label keys, pill classes, temp lane mapping, the open predicate and the board lane order.
- Web `ClosedTasksToggle.vue` (new): owns the toggle's rendering and accessibility only. Each board owns its own show/hide state.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade | Governing Owner | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `project-task-tool-manifest.ts` tool handlers | ProjectTaskService | Tool → service mapping | Status rules |
| GraphQL `ProjectTaskResolver` | ProjectTaskService | Transport | Any status write |

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Scope |
| --- | --- | --- | --- |
| `STATUSES` set in `project-store.ts` and `ad-hoc-task-store.ts` | Duplicated vocabulary | `isProjectTaskStatus` from `task-status.ts` | In This Change |
| `validateTaskStatus` body in `project-task-service.ts` | Duplicated | Moved to `task-status.ts` (service imports it) | In This Change |
| `statuses` literal and inline error text in `project-task-tool-contract.ts` | Duplicated | `PROJECT_TASK_STATUSES` and `validateTaskStatus` | In This Change |
| zod literal in `project-change-messages.ts` | Duplicated | `z.enum(PROJECT_TASK_STATUSES)` | In This Change |
| `=== "DONE"` checks (service ×5, project-service ×1) | Rule duplicated | `isTerminalTaskStatus` | In This Change |
| Private `assertTaskNotDone` | Name no longer true | `assertTaskNotTerminal` | In This Change |
| Current `readTaskFile` import in the released migration | Guideline: frozen copies only | `readReleasedTaskFileV1` in `released-project-folder-v1.ts` | In This Change |
| Web `taskStatusLabelKey.ts` | Becomes the broader presentation owner | `taskStatusPresentation.ts` | In This Change (rename; no shim) |
| Web `status === 'DONE'` / `!== 'DONE'` and inline pill ternaries in `projectTaskStore`, `TempTaskBoard`, `TempTasksLink`, `ProjectTaskDetail`, `TempTaskDetail`, `ProjectsPanelTaskDetail` | Duplicated classification | `taskStatusPresentation.ts` helpers | In This Change |

## Return Or Event Spine(s) (If Applicable)

DS-004: `ProjectTaskService write → ProjectChangePublisher.taskChanged → /ws/projects task_upserted{status} (zod: shared tuple) → useProjectChangeFeed → projectTaskStore.applyToList (laneOf → 'moved' highlight) → board`. The only change is that the schema accepts CLOSED and `laneOf` uses the presentation owner.

## Bounded Local / Internal Spines (If Applicable)

The closure ordering inside `ProjectTaskService.closeAndWrite` is unchanged: `closeTask (serialize → close open entries → commit) → write status → release(stop requests)`.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk If On Main Line |
| --- | --- | --- | --- | --- | --- |
| Task-status vocabulary (`task-status.ts`) | DS-001/002/004 | ProjectTaskService, stores, tool contract, feed | Values, validation, predicates | One source of truth | Rule drift across copies |
| Status presentation (`taskStatusPresentation.ts`) | DS-003 | Boards, pages, store | Labels, pill classes, lanes, open predicate | One source of truth | Inline ternaries drift |
| `ClosedTasksToggle.vue` | DS-003 | Both boards | Toggle button UI and a11y | Same control on both boards | Duplicated markup |

## Ownership Boundaries

`ProjectTaskService` remains the only status writer and closure trigger; nothing else calls `TaskAgentResourceService.closeTask`. The web consumes status read-only through `projectTaskStore`. `agent-collaboration` never imports the Projects vocabulary; it only words its refusals generically.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass | Fix If Too Thin |
| --- | --- | --- | --- | --- |
| `ProjectTaskService` | closure, release, resource service, stores | tool manifest, GraphQL, runtime port | Tool or GraphQL calling `closeTask` or the stores directly | Extend service |
| `task-status.ts` | status literals | service, stores, contract, feed, project-service | New local status sets or `=== "DONE"` checks | Add a predicate here |
| `taskStatusPresentation.ts` | status → label/style/lane | web components, store | Inline status ternaries in components | Add a helper here |

## Dependency Rules

- `projects/domain/task-status.ts` depends only on `project-errors.ts`.
- Allowed importers: `projects/*`, `agent-tools/project-tasks/*`, `api/graphql/types/project-tasks.ts` (test only), and `projects/changes/*`.
- The migration folder must **not** import `task-status.ts` or the current `readTaskFile`. It uses its frozen copy.
- `agent-collaboration/*` must not import the Projects vocabulary.
- Web components import status helpers only from `taskStatusPresentation.ts` and types from `types/project.ts`.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `PROJECT_TASK_STATUSES: readonly ["TODO","IN_PROGRESS","DONE","CLOSED"]` | Task status | Vocabulary | — | `as const` tuple; `ProjectTaskStatus = typeof …[number]` |
| `isProjectTaskStatus(v: unknown): v is ProjectTaskStatus` | Task status | Reader guard | — | Stores |
| `validateTaskStatus(v: unknown): ProjectTaskStatus` | Task status | Throws `TASK_STATUS_INVALID` "Task status must be TODO, IN_PROGRESS, DONE or CLOSED." | — | Service and tool contract |
| `isTerminalTaskStatus(s: ProjectTaskStatus): boolean` | Task status | DONE or CLOSED | — | Closure trigger, refusals, open count |
| `create_or_update_task.status` enum | Tool | + CLOSED | task_id | Description updated (below) |
| `list_project_tasks.status` enum | Tool | + CLOSED | project_id | Description updated |
| GraphQL `ProjectTaskStatus` | Transport | + `CLOSED` | — | Read-only; no status in inputs |
| Web `TASK_STATUS_LABEL_KEYS`, `taskStatusPillClass(status)`, `tempTaskLaneOf(status): 'open'\|'done'\|'closed'`, `TEMP_LANE_LABEL_KEYS`, `isOpenTaskStatus(status)`, `BOARD_OPEN_LANES = ['TODO','IN_PROGRESS','DONE']` | Status presentation | Display mapping | — | One file |

## Interface Boundary Check

| Interface | Singular? | Identity Explicit? | Ambiguous Selector Risk | Action |
| --- | --- | --- | --- | --- |
| task-status helpers | Yes | N/A | Low | — |
| Tool status enums | Yes | Yes | Low | — |
| Web presentation helpers | Yes | N/A | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural? | Drift Risk | Action |
| --- | --- | --- | --- | --- |
| New status | `CLOSED` / "Closed" | Yes (user's word) | Medium: "closed" also describes agent-run resources | The doc and tool text define CLOSED as "dropped as not needed"; resource closure is described as happening for "DONE or CLOSED" |
| Predicate | `isTerminalTaskStatus` | Yes | Low | — |
| Private guard | `assertTaskNotTerminal` | Yes | Low | Renamed from `assertTaskNotDone` |
| Web file | `taskStatusPresentation.ts` | Yes | Low | — |
| Toggle | `ClosedTasksToggle.vue` | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| Stop workers for CLOSED | `closeAndWrite` / `TaskAgentResourceService` / `TaskAgentResourceRelease` | Reuse | Status-agnostic already |
| Live updates | `ProjectChangePublisher`, `projectTaskStore` | Reuse | Schema widening only |
| Board lane rendering | `ProjectTaskBoard` / `TempTaskBoard` section markup | Extend | Same lane section markup for Closed |
| Vocabulary owner | none | Create New (`task-status.ts`) | No current owner; 7 copies |
| Toggle control | none | Create New (`ClosedTasksToggle.vue`) | Shared by 2 boards |

## Subsystem / Capability-Area Allocation

| Area | Owns | Spines | Decision |
| --- | --- | --- | --- |
| Server `projects/domain` | vocabulary and predicates | DS-001/002/004 | Extend |
| Server `projects/services` | closure trigger and refusals, open count | DS-001/002 | Reuse/modify |
| Server `projects/stores`, `projects/changes` | tolerant read, feed schema | DS-001/004 | Modify |
| Server `agent-tools/project-tasks` | tool schema/description | DS-001 | Modify |
| Server `agent-collaboration` | LLM texts, refusal wording | DS-002 | Modify (text only) |
| Server `api/graphql` | enum | DS-003 | Modify |
| Server `app-data-migrations/.../projects-per-folder-v1` | frozen reader | — | Modify |
| Web `utils/projects`, `components/projects`, `stores`, `types`, `localization`, `generated` | display | DS-003/004 | Modify, plus 1 new component |

## Draft → Final File Responsibility Mapping

The drafts held after extraction; the final mapping is below.

| File | Kind | Concrete Change |
| --- | --- | --- |
| `autobyteus-server-ts/src/projects/domain/task-status.ts` | **Add** | Holds the `PROJECT_TASK_STATUSES` tuple, `ProjectTaskStatus` type, `isProjectTaskStatus`, `validateTaskStatus` and `isTerminalTaskStatus`. The doc comment defines each status, including CLOSED as "dropped as not needed, not completed; ends work like DONE". |
| `src/projects/domain/models.ts` | Modify | Re-export the `ProjectTaskStatus` type from `task-status.ts` (or update importers; no duplicate literal). Fix the `openTaskCount` and `TaskRootView` comments to "not DONE or CLOSED" and "closed (DONE or CLOSED)". |
| `src/projects/stores/project-store.ts`, `ad-hoc-task-store.ts` | Modify | Replace `STATUSES` with `isProjectTaskStatus`. |
| `src/projects/services/project-task-service.ts` | Modify | Import `validateTaskStatus` and `isTerminalTaskStatus`. Make five changes: (1) L149 and L376: `isTerminalTaskStatus(status)` → `closeAndWrite`; (2) L243 and L257: refuse when terminal, with `The Task is ${status}; move it to TODO or IN_PROGRESS before assigning new work.`; (3) rename `assertTaskNotDone` → `assertTaskNotTerminal`, message `This Task is ${status}. Move it to TODO or IN_PROGRESS with create_or_update_task first, then message this run ID again.`; (4) update comments mentioning DONE closure to "DONE or CLOSED"; (5) `status` is only `undefined` when absent, so call `isTerminalTaskStatus` only on a defined status. |
| `src/projects/services/project-service.ts` | Modify | `openTaskCount = tasks.filter(t => !isTerminalTaskStatus(t.status)).length` |
| `src/projects/changes/project-change-messages.ts` | Modify | `z.enum(PROJECT_TASK_STATUSES)` |
| `src/agent-tools/project-tasks/project-task-tool-contract.ts` | Modify | `statuses = [...PROJECT_TASK_STATUSES]`; the parse uses `validateTaskStatus`; descriptions per Concrete Examples. |
| `src/agent-tools/project-tasks/project-task-tool-manifest.ts` | Modify (type import only, if needed) | — |
| `src/api/graphql/types/project-tasks.ts` | Modify | Add `CLOSED = "CLOSED"` to the enum; keep the resolver comment (no status mutation). |
| `src/api/graphql/types/projects.ts` | Modify (comment) | `openTaskCount`: "not DONE or CLOSED". |
| `src/agent-collaboration/domain/agent-team-collaboration-llm-contract.ts` | Modify (text) | See Concrete Examples. |
| `src/agent-collaboration/execution/task/{root-task-execution-lifecycle,root-task-dispatch,root-task-agent-resource-scope,task-agent-resource-port,root-task-execution-adapter}.ts`, `src/projects/domain/task-agent-resources.ts`, `src/projects/runtime/task-agent-resource-release.ts`, `src/projects/services/{task-agent-resource-service,task-root-view-builder}.ts` | Modify (text) | Error messages "(Task DONE)" → "(its Task is DONE or CLOSED)"; `root-task-dispatch` → "The Task was marked DONE or CLOSED; its new work was not started."; `root-task-agent-resource-scope` "repeat DONE" → "repeat DONE or CLOSED"; comments likewise. |
| Comment-only sites in `agent-team-execution`, `agent-org-execution`, `standalone-agent-run-root`, `agent-execution/shared/runtime-agent-tool-exposure.ts` | Modify (comment) | "Task DONE" → "Task DONE or CLOSED" (mechanical; cosmetic). |
| `src/app-data-migrations/migrations/projects-per-folder-v1/released-project-folder-v1.ts` | Modify | Add a frozen `readReleasedTaskFileV1(raw, projectId, taskId)`, a verbatim copy of the current `readTaskFile` plus its `normalizeContextFiles` and 3-value status set (pin the source commit in the header like the existing note). |
| `.../projects-per-folder-v1-app-data-migration.ts` | Modify | Import `readReleasedTaskFileV1` instead of the current `readTaskFile`. |
| `autobyteus-web/types/project.ts` | Modify | `ProjectTaskStatus` adds `'CLOSED'`; `PROJECT_TASK_STATUSES` has 4 values; comments updated. |
| `autobyteus-web/utils/projects/taskStatusLabelKey.ts` → `taskStatusPresentation.ts` | Rename/Modify | `TASK_STATUS_LABEL_KEYS` (+CLOSED); `taskStatusPillClass(status)` (DONE emerald, IN_PROGRESS blue, TODO slate, CLOSED muted: e.g. `bg-white text-slate-500 ring-slate-300`, plus optional `heroicons:no-symbol` icon); `isOpenTaskStatus`; `BOARD_OPEN_LANES`; `TempLane = 'open'\|'done'\|'closed'`, `TEMP_LANES_OPEN = ['open','done']`, `tempTaskLaneOf(status)`, `TEMP_LANE_LABEL_KEYS` (literal keys, for the localization audit). |
| `autobyteus-web/components/projects/ClosedTasksToggle.vue` | **Add** | Button `Closed (N)`: props `count`, `pressed`; emits `toggle`; `aria-pressed`; same size and style as Refresh (`min-h-11`, slate border), pressed state `bg-slate-100`; icon `heroicons:archive-box` (permitted variation); `data-testid` set by the parent via attrs. Renders nothing itself when count is 0 (or the parent uses `v-if`). |
| `autobyteus-web/components/projects/ProjectTaskBoard.vue` | Modify | Toolbar: `[search] [ClosedTasksToggle v-if closedCount>0] [Refresh] [New task]`, with `ml-auto` moved to the toggle when present (toggle+Refresh grouped on the right). Local `showClosed = ref(false)`, reset to false when `closedCount` becomes 0. `closedCount` = all CLOSED Tasks in the list (search-independent). Lanes iterate `BOARD_OPEN_LANES`. When `showClosed`, a Closed `<section>` (same markup, heading "Closed" + filtered count, `data-testid="project-task-column-CLOSED"`) is the **fourth column, after Done**, in the same grid (SR-005). Grid: below 752px one column (stacked, as today); at 752px and above `repeat(N, minmax(0, 1fr))`, where N = 3 (Closed hidden) or 4 (Closed shown). A modifier class such as `project-task-board__columns--with-closed` switches 3→4. No full-width row. `isNoMatch` is computed over the **visible** tasks (closed excluded unless shown). |
| `autobyteus-web/components/projects/TempTaskBoard.vue` | Modify | Same toggle and pattern: lanes `open`/`done` via `tempTaskLaneOf`, plus a `closed` column after Done when toggled (2→3 columns at ≥752px; stacked below, as today); the Done 10-item limit is unchanged; the Closed lane shows all. |
| `autobyteus-web/components/projects/{ProjectTaskDetail,TempTaskDetail}.vue`, `panel/ProjectsPanelTaskDetail.vue` | Modify | Pill class and label from the presentation owner; the Temp label uses `TEMP_LANE_LABEL_KEYS[tempTaskLaneOf(status)]`. |
| `autobyteus-web/components/projects/TempTasksLink.vue` | Modify | Count with `isOpenTaskStatus`. |
| `autobyteus-web/stores/projectTaskStore.ts` | Modify | `laneOf` uses `tempTaskLaneOf` for Temp; the open count uses `isOpenTaskStatus`. |
| `autobyteus-web/localization/messages/{en,zh-CN}/projects.ts` | Modify | `projects.task.status.CLOSED`: "Closed" / "已关闭"; `projects.temp.lane.closed`: "Closed" / "已关闭"; `projects.board.closedToggle`: "Closed ({{count}})" / "已关闭（{{count}}）"; optional toggle aria labels "Show closed tasks" / "Hide closed tasks" ("显示已关闭的任务" / "隐藏已关闭的任务"). |
| `autobyteus-web/generated/graphql.ts` | Modify | Add `Closed = 'CLOSED'` to `ProjectTaskStatus` (regenerate with `pnpm -C autobyteus-web codegen` against a running server, or apply the identical generated line). |
| Docs | Modify | See the Docs list in Guidance. |

## Reusable Owned Structures Check / Shared Structure Tightness Check

| Structure | File | Why Shared | Tight? | Must Not Become |
| --- | --- | --- | --- | --- |
| Status vocabulary and predicates | `projects/domain/task-status.ts` | 7 consumers | Yes: one tuple, two predicates, one validator | A Task-model or transition state machine (no transition rules: any explicit status is allowed, as today) |
| Status presentation | `utils/projects/taskStatusPresentation.ts` | 7 web consumers | Yes | A component or store |

## Applied Patterns (If Any)

None beyond the existing serialized closure.

## Target Subsystem / Folder / File Mapping

New files: `autobyteus-server-ts/src/projects/domain/task-status.ts` (domain vocabulary sits beside `models.ts`) and `autobyteus-web/components/projects/ClosedTasksToggle.vue` (beside the boards that use it). Rename: `autobyteus-web/utils/projects/taskStatusLabelKey.ts` → `taskStatusPresentation.ts`. All other changes are in place, as listed above.

## Folder Boundary Check

| Path | Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `projects/domain/task-status.ts` | Main-Line Domain | Yes | Low | Domain vocabulary beside the models |
| `components/projects/ClosedTasksToggle.vue` | Off-Spine UI | Yes | Low | Sibling of its two users |

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Closure trigger | `const updated = status !== undefined && isTerminalTaskStatus(status) ? await this.closeAndWrite(loc, write) : await write();` | `status === "DONE" \|\| status === "CLOSED"` written at each site | One rule |
| Board layout (≥752px) | Toggle off: `[To Do][In Progress][Done]`. Toggle on: `[To Do][In Progress][Done][Closed n]` (four equal columns) | A full-width Closed row under the lanes (SR-004, rejected by the user in SR-005), or Closed mixed into Done | Matches common boards: Linear shows Canceled as the last status column; Jira keeps terminal states in the far-right column |
| Toolbar | `[ Search… ] [Closed (3)] [⟳ Refresh] [+ New task]`; Closed absent when 0 | A filter dropdown or status picker | Small, on demand |

**Tool description text** (contract; exact wording may be polished, but the meaning is fixed):
- `list_project_tasks`: "…optionally filtered by exact TODO, IN_PROGRESS, DONE or CLOSED status (CLOSED = dropped as not needed)…"
- `create_or_update_task`: "…Patch: supply task_id with description and/or TODO/IN_PROGRESS/DONE/CLOSED status… DONE means the work is finished; CLOSED means the Task was dropped as not needed (not completed). Both stop the Task's delegated copies and remove them from the run; their history is kept. To continue with a copy later, set the Task to TODO or IN_PROGRESS first, then…"
- `DELEGATE_TASK_ID_DESCRIPTION`: "…Blank, unknown, ambiguous, DONE or CLOSED Tasks fail…"
- `send_message_to` / team instruction: "A copy whose Task is DONE or CLOSED is stopped… first moves the Task out of DONE or CLOSED (for example to IN_PROGRESS)…"
- Delegation guidance line "mark that Task DONE … which stops the copy": append "(or CLOSED if the work turned out not to be needed)".

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Status migration / version field | Enum changed | Rejected | Directly Usable tolerant reader |
| Keep `taskStatusLabelKey.ts` re-exporting from the new file | Avoid touching importers | Rejected | Rename and update 3 importers |
| Mapping CLOSED to DONE for older clients | Downgrade | Rejected | Approved non-goal |
| GraphQL status mutation | Earlier proposal | Rejected | User decision SR-002 |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Server vocabulary: add `task-status.ts`; repoint the released migration to its frozen task reader **before** the current reader changes; then switch the stores, service, project-service, change messages and tool contract to the vocabulary and predicate; add the GraphQL enum value.
2. Server wording: tool descriptions, LLM contract, refusal messages, comments.
3. Server tests (below).
4. Web: types, presentation owner (rename), store, Temp link, pills, `ClosedTasksToggle`, both boards, localization, generated enum.
5. Web tests.
6. Docs (delivery may finalize).

## Key Tradeoffs

- A hidden-by-default lane with a toggle (approved) versus an always-visible column. It adds one local boolean per board; the state is not persisted, so every visit starts clean.
- Closed is a fourth column after Done (SR-005, user direction). While it is shown at 752–1007px, the columns are narrower than 240px. This is accepted because rows are compact 2-line summaries and the toggle is off by default. The earlier full-width row (SR-004) was rejected: it looked detached from the board.
- The search no-match state ignores hidden Closed Tasks. A search for a closed Task shows "no match" until the toggle is on, and the toggle stays visible (with its count) beside the search.

## Risks

- **R-001 wording.** "Closed" also names agent-run closure. Mitigated by definitions in the tool text and docs.
- **R-002 external Project Task Manager skill.** It doesn't know CLOSED (dependency readiness = DONE). This is a separate-repository follow-up. Agents still learn CLOSED from the tool descriptions.
- **LLM-contract string tests** may assert exact text; update them with the wording.

## Guidance For Implementation

- **Server tests** (`pnpm -C autobyteus-server-ts exec vitest run <file> --no-watch`):
  - `tests/unit/projects/project-task-service.test.ts` and `ad-hoc-tasks.test.ts`:
    - CLOSED closes open entries and requests release (Project and ad-hoc), exactly as DONE;
    - repeated CLOSED re-requests the stop with no file change;
    - DONE→CLOSED and CLOSED→DONE behave as a repeated DONE;
    - reopen from CLOSED writes only;
    - `resolveAssignment` / `linkAgentRun` / `assertReopenable` / `reopenAssignment` refuse CLOSED with the status-naming messages.
  - `tests/unit/projects/task-agent-resource-reactivation.test.ts` / `task-agent-resources.test.ts`: reopen after CLOSED allows the assigner to reactivate.
  - `tests/unit/agent-tools/project-tasks/project-task-tools.test.ts`:
    - enums contain CLOSED;
    - parse accepts CLOSED on patch and list;
    - create with status still fails;
    - invalid-status message lists four values;
    - descriptions mention CLOSED.
  - Store tests: `readTaskFile` and the ad-hoc reader accept all four; unknown values are still rejected.
  - `project-change-messages` / publisher tests accept CLOSED.
  - `project-service.test.ts`: openTaskCount excludes CLOSED.
  - LLM contract test text.
  - `projects-per-folder-v1` migration tests remain green with the frozen reader.
  - A unit test asserts the GraphQL enum values equal `PROJECT_TASK_STATUSES`.
  - E2E: `tests/e2e/projects/projects-graphql.e2e.test.ts` (CLOSED in schema/read); `task-closure-root-visibility.e2e.test.ts` and `ad-hoc-task-delegation.e2e.test.ts` (add a CLOSED case mirroring DONE); `project-change-feed.e2e.test.ts` (CLOSED upsert).
- **Web tests** (`pnpm -C autobyteus-web test:nuxt <path> --run`):
  - `ProjectTaskBoard.spec.ts`:
    - Closed hidden by default; toggle absent at 0;
    - toggle shows/hides the Closed lane with `aria-pressed`;
    - counts and no-match over visible tasks;
    - compact mode too.
  - `TempTasks.spec.ts`: Closed in neither Open nor Done; toggle; page label; header count.
  - `projectLiveChanges.spec.ts`: lane move to/from CLOSED highlights; counts.
  - `ProjectsPanel.spec.ts`: panel detail label.
  - `projectsCatalog.spec.ts`: en/zh-CN parity.
- **Desktop verification:** `pnpm --silent isolated-app start --build`, then have an agent close and reopen a Task with `create_or_update_task`. Check that the board hides it, the toggle shows it, the label reads "Closed" and the worker stops.
- **Docs to sync:**
  - `autobyteus-server-ts/docs/modules/projects.md`: status set, DONE-or-CLOSED closure, refusals, open count, tool table;
  - `autobyteus-web/docs/projects.md`: Closed display, toggle, Temp lanes; status still read-only and agent-owned;
  - `autobyteus-server-ts/docs/modules/{agent_tools_mcp_server,prompt_engineering,agent_communication}.md`;
  - `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` (closed task executions: "Task DONE or CLOSED");
  - `autobyteus-web/docs/chat.md`;
  - `TESTING.md` mentions of "Task is DONE" (where they describe status rules).
- No GraphQL status input may be added (AC-002).
