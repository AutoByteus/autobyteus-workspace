# Investigation Notes — task-keys-and-dependencies

## Investigation Meta

- Package identifier: `task-keys-and-dependencies`
- Request / ticket: Project Task "Implement readable Task keys and "depends on" (step 1 of Task relationships), from the approved design", from `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), 2026-10-17
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-and-dependencies`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-and-dependencies`, branch `codex/task-keys-and-dependencies`
- Resolved base remote / branch / revision: `origin/personal` at `c600028072` (fetched 2026-10-17)
- Finalization target remote / branch: `origin` / `personal`
- Bootstrap result: worktree created from refreshed `origin/personal`; ticket folder `tickets/in-progress/task-keys-and-dependencies/`
- Bootstrap blocker: none
- Current solution revision ID: `SR-002`
- Authorities read: `references/requirements-engineering.md` (2026-10-17); `references/architecture-design.md`, `references/design-principles.md` (2026-10-17); repository `DESIGN.md`, `TESTING.md`, `autobyteus-server-ts/docs/design/data_migration_guideline.md`, `autobyteus-server-ts/AGENTS.md`, `autobyteus-web/AGENTS.md` (2026-10-17)
- Investigation status: complete for requirements and architecture

## Initial Request And Clarifications

- Original request: implement the approved Product design (keys, "depends on", badges, lists, editor, tree summary), server work (assign and backfill keys; store `dependsOnTaskIds` with same-Project, no-self, no-loop validation; return both with Project Tasks and change-feed upserts; `taskKey` on the TaskWorkerTask answer).
- Clarifications received: none needed. The user's approval quotes are in the Product spec.
- User-supplied facts and constraints: open engineering decisions (prefix after rename, non-Latin names, deleted dependents); agent tools out of scope; Done when includes an isolated Electron check with a test data package, tests, a beta release and the user's check.
- Initial ambiguity: the spec says agents set the field "through tools", the Task puts tools out of scope → resolved as follow-up (requirements DEC-008).

## Product And Domain Understanding

- Product area: Projects (node-scoped Projects with Tasks; board with To Do / In Progress / Done lanes and Cancelled behind a toggle; Task page; New / Edit task; right-panel Projects tab; Workspaces-tree Task summary on delegated copies).
- Terminology: Task key (`autobyteus-42`), key prefix (Project part), "depends on" (stored), "Blocked by" / "Dependency cancelled" / "Required by" (derived), Temp task (Task without Project).

## Source Log

| Date | Type | Exact Source / Command | Why | Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-17 | Doc | Product `ui-ux-spec.md`, `product-ticket.md` (attached; design repo `tickets/done/task-keys-and-dependencies/`) | Normative design | Approved 2026-10-17; three engineering decisions open | Requirements DEC-001–003 |
| 2026-10-17 | Command | `git -C autobyteus-web-design log` → `1ebf4c6`; `git diff --stat b31a5b1 1ff2edf` | Prototype delta | 23 files: 5 new components, `taskDependencies.ts`, store / draft / query changes, fixture | Port guidance |
| 2026-10-17 | Command | `git diff --stat 73f743211c HEAD -- <affected web paths>` (in worktree) | Baseline drift | Only `useTaskWorkerTasks.ts` (1 line) and a new disclosure spec changed since the design pin | Design pin current |
| 2026-10-17 | Code | `autobyteus-server-ts/src/projects/domain/models.ts` | Model | `ProjectTask {taskId, description, status, contextFiles?, createdAt, updatedAt}`; `Project {…, workspaces}`; `ProjectView extends Omit<Project,"workspaces">`; `TaskWorkerTaskView {taskId, projectId, description, status}` | Add fields |
| 2026-10-17 | Code | `projects/stores/project-store.ts` | Persistence | Tolerant readers (`readProjectFile`, `readTaskFile`), exact writers; Project writes under `.projects-catalog` in-process lock; Task create under task-file lock; `updateTask` locked RMW; deleteTask keeps `agent_run_resources.json` | Allocation must share the catalog lock with Project writes |
| 2026-10-17 | Code | `projects/services/project-service.ts` | Project invariants | Name unique case-insensitively, checked inside the catalog lock with all Projects; rename via `updateProject` / `patchProjectRecord` spreads the record | Prefix reservation fits the create callback; rename keeps extra fields if the writer writes them |
| 2026-10-17 | Code | `projects/services/project-task-service.ts` | Task boundary | `create()` (UI & tool), `update()` (UI full-form & `updateTaskById` tool), `deleteTask`, `readTaskChangeView`, `currentTasksOfTaskWorkers`, `toView` | All Task writes pass here |
| 2026-10-17 | Code | `api/graphql/types/project-tasks.ts` | Contract | `ProjectTask` object, `CreateProjectTaskInput`, `UpdateProjectTaskInput` (description required), `TaskWorkerTaskView`; no status mutation | Add fields |
| 2026-10-17 | Code | `projects/changes/project-change-messages.ts` | Feed contract | Strict zod `projectTaskSchema`; `projectTaskWire` picks fields | Add both fields |
| 2026-10-17 | Code | `agent-tools/project-tasks/project-task-tool-manifest.ts`, `-contract.ts` | Tools | Results pick fields explicitly (`taskAcknowledgement`, `taskBusinessRead`) | Tool output unchanged automatically |
| 2026-10-17 | Code | `app-data-migrations/*`, `migrations/projects-per-folder-v1/*` | Migration conventions | Definitions with `requiredOnStartup`, `STARTUP_ONLY`, `prerequisiteMigrationIds`; per-folder migration uses frozen readers, dispositions with capped examples, atomic writes, target recognition on retry | Pattern for the backfill |
| 2026-10-17 | Code | `server-runtime.ts:178`, `standalone-application-host/start-standalone-application-host.ts:146` | Startup | `runPending()` before serving; FAILED is logged, startup continues | No lockout |
| 2026-10-17 | Code | `app-data-migration-runner.ts` | Runner | Prerequisite incomplete → error before `markRunning` → stays `NOT_RUN`, retried next start; STARTUP_ONLY failures → RESTART_TO_RETRY | — |
| 2026-10-17 | Code | `autobyteus-web/electron/updater` tests | Downgrade | `allowDowngrade` is false in both channels | Downgrade is not a supported path |
| 2026-10-17 | Code | `grep -rln taskFileContent\|readTaskFile …` | Other writers | Only `project-store.ts` (+ frozen migration copy, one test) read/write these files | Single owner |
| 2026-10-17 | Code | `autobyteus-web/stores/projectTaskStore.ts`, `components/projects/ProjectTaskBoard.vue` | Client data | Store holds every Task of a Project (all statuses); board search filters descriptions for display only | Client derivation is possible without new requests |
| 2026-10-17 | Code | `autobyteus-web/services/projects/projectChangeFeed.ts` | Client feed | Lenient parse (type check only) | No client schema change needed |
| 2026-10-17 | Code | `autobyteus-web/codegen.ts`, `package.json` `codegen` | Codegen | `generated/graphql.ts` from a running backend schema | Regenerate |
| 2026-10-17 | Data | `~/.autobyteus/server-data/projects/*/project.json` (read-only, names and counts only) | Volume, names | 7 folders: "AutoByteus" 113 Tasks, "AutoByteus Agents" 22, "AutoByteus NFS", "AutoByteus Marketing", "AutoByteus Investor Applications", "Niuzhirui App Market", and one folder without `project.json` (deleted Project residue with a kept task folder) | All Latin; small volume; residue folders exist |
| 2026-10-17 | Doc | `DESIGN.md`, `data_migration_guideline.md`, `TESTING.md` | Policy | Tolerant readers; migrate only for a new required fact only old data supplies; frozen source shapes; no lockout; migration tests on synthesized released data | Migration decision |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Trigger | Current Path | Outcome / Invariants | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | New task Save; `create_task` | `createProjectTask` / tool → `ProjectTaskService.create` → `ProjectStore.createTask` → `task.json` → `taskChanged` → feed | No key | service / store | High |
| BEH-002 | Operational | App start | `runPending()` → migrations → server | No Task keys exist | runner, data | High |
| BEH-003 | User | Edit Project | `updateProject` / `patchProjectRecord` under catalog lock | Name only | project-service | High |
| BEH-004 | User | — | No current supported behavior | — | — | — |
| BEH-005–007 | User | Board / Task page / tree | Store lists → components | No keys | components | High |
| BEH-008 | User | Delete Task | `deleteProjectTask` → `store.deleteTask` → `taskRemoved` | — | service | High |
| BEH-009 | System | Any Task write | publisher `taskChanged` → `readTaskChangeView` → `projectTaskWire` | Strict schema | change files | High |
| BEH-010 | Contract | Agent tools | manifest picks fields | — | manifest | High |

## Relevant Codebase And Technical Facts

| Path | Current Responsibility | Requirement Implication | Design Implication |
| --- | --- | --- | --- |
| `project-store.ts` `withProjectsCatalog` | Serializes every `project.json` write | Number allocation and prefix reservation must not race with renames | Allocate under the same lock |
| `project-store.ts` `createTask` | Writes `task.json` under its own lock | Key must be in the first write | Store allocates, then creates |
| `persistence/file/store-utils.ts` `withFilePathLock` | In-process promise chain per path | One writer process (existing assumption) | Reuse for the dependency lock |
| `project-task-service.ts` `update` | Shared body for UI and tool updates | `dependsOnTaskIds` only from the UI path now | Optional patch field; tool path passes none |
| `ProjectView extends Omit<Project,"workspaces">` | Client Project view | Allocation state must not leak | Omit the new field |
| `toGraphqlTask`, `projectTaskWire` | Explicit field mapping | Fields must be added in both | — |
| `currentTasksOfTaskWorkers` | Builds `TaskWorkerTaskView` from the change view | `taskKey` available from the Project Task view | — |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files: `<appData>/projects/<projectId>/project.json`, `<projectId>/tasks/<taskId>/task.json`.
- Readers / writers: `ProjectStore` only (current); frozen copies in `projects-per-folder-v1`.

### Structural Surfaces

- GraphQL `ProjectTask`, inputs, `TaskWorkerTaskView`; `/ws/projects` strict schema; app-data migration registry; ProjectStore locks; web store, components, codegen, localization.

### Potential Structural Impacts To Investigate

- API change: yes (additive fields and inputs).
- Persistence change: yes (new required Task fact; new Project allocation state; optional Task dependency list).
- Concurrency: number allocation (UI + agents create concurrently); dependency loop validation.
- Migration: yes (backfill).
- Security / deployment / ownership boundary: none found.

## Runtime, Probe, Or Reproduction Findings

| Method | Scenario | Observation | Implication | Evidence |
| --- | --- | --- | --- | --- |
| Read-only listing of user Project files | Volume / names | 7 Projects, max 113 Tasks, Latin names, one residue folder | Migration cost trivial; residue folders are not candidates | Source log |

## Stakeholder And User Evidence

| Source | Need | Strength | Implication | Open Question |
| --- | --- | --- | --- | --- |
| User (via Product, 2026-10-17) | "so basically we only have depends on, but translated to different wording"; "its approved" | Explicit | One stored relationship; design normative | None |
| Delegating Task | Engineering decides prefix, non-Latin, deletes; tools later | Explicit | DEC-001–003, DEC-008 | None |

## External Contracts, Standards, And Dependencies

| Contract | Authority | Constraint | Evidence | Risk |
| --- | --- | --- | --- | --- |
| Data migration guideline | `autobyteus-server-ts/docs/design/data_migration_guideline.md` (base `c600028072`) | Tolerant readers, frozen source shapes, no lockout, no default backups | Read in full | — |
| Unicode property escapes (`\p{L}`, `\p{N}`, `\p{M}`) | ECMAScript 2018, Node ≥ 10 | Prefix rule for every script | — | NFKD on Hangul decomposes syllables into jamo; the rule must remove only combining marks from Latin-decomposable letters (see design) |

## Persisted Data And State Facts

- Subject: Project and Task metadata files.
- Shapes (current writer): `project.json` `{projectId, name, description, createdAt, updatedAt, workspaces:[{workspaceRootPath, description}]}` (older files may also carry `workspaceId` / `addedAt` in links, ignored by the current reader); `task.json` `{taskId, projectId, description, status, createdAt, updatedAt, contextFiles:[…]}` with status TODO / IN_PROGRESS / DONE / CANCELLED.
- Volume: 7 Projects, ≤ 113 Tasks each (user node).
- Readers / writers: `ProjectStore` only.
- Unknown-field behavior: ignored on read, dropped on next save.
- Must be preserved: everything; Task IDs; context; agent run resources.
- Acceptable: pre-upgrade deleted numbers are not reconstructed.
- Remaining gap: none.

## Product Design Request Context

- Product Design request in the current input: `Not stated` (the design is already approved and integrated).

## Product Design Findings

- Package path: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/task-keys-and-dependencies/`
- UI reference source: `/Users/normy/autobyteus_org/autobyteus-web-design` (`AutoByteus/autobyteus-web-prototype`, `personal@1ebf4c6`; ticket design `1ff2edf`)
- Approved spec: `ui-ux-spec.md` (Approved 2026-10-17); review URL in spec; user confirmation quoted there and in `product-ticket.md` "Approval".
- Journeys validated: UXJ-001 to UXJ-005; 13/13 checks.
- Final visuals: `visual-references/VIS-001` to `VIS-015`.
- Mocked boundaries: key assignment and dependency storage in the browser fixture (`prototype/task-keys/taskKeysFixture.ts`); production assigns on the server.
- Consistency check: spec, ticket record and design repo agree on root, ticket, revision and paths. Accepted.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/task-keys-and-dependencies/ui-ux-spec.md` | Product | Normative UI/UX | All UI REQs | REQ-009–015 | Approved | User 2026-10-17 |
| `…/visual-references/` (VIS-001–015, `final-validation.mjs`) | Product | Final references and checks | UI | REQ-009–013 | Approved | User 2026-10-17 |
| `…/product-ticket.md` | Product | Record, approval quotes | All | — | Completed | — |
| Design repo components (`components/projects/TaskKey.vue`, `TaskKeyChip.vue`, `TaskDependencyBadge.vue`, `TaskDependenciesSection.vue`, `TaskDependencyPicker.vue`, `utils/projects/taskDependencies.ts`) | Product | Reference implementation built on the same source | UI | REQ-009–013 | Reference (fixture parts design-only) | Part of the approved reference |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why | Resolution | Status |
| --- | --- | --- | --- | --- | --- |
| RSK-001 | Risk | Concurrent creates (agents + UI) could allocate the same number | Keys must be unique | Allocate under the catalog lock | Designed |
| RSK-002 | Risk | Two concurrent dependency updates could form a loop | Integrity | Per-Project dependency lock around validate + write | Designed |
| RSK-003 | Risk | An editor resubmits a dangling dependency ID and gets rejected | Usability | Delete cleans dependents; the editor starts from existing dependencies only | Designed |
| RSK-004 | Unknown → resolved | Downgrade to an older build would drop new fields on save | Data | Updater never downgrades (`allowDowngrade: false`); manual downgrade unsupported | Out of scope |

## Architecture Investigation Findings

- Execution spines: create (`GraphQL / tool → ProjectTaskService.create → ProjectStore.createTask → task.json → publisher → feed → web store → board`), update, delete, worker-task read, startup migration.
- Ownership: `ProjectStore` owns files and locks; `ProjectService` owns Project invariants (name); `ProjectTaskService` owns Task invariants and publication; publisher owns feed; web `projectTaskStore` owns client lists.
- Coupling: none problematic. `ProjectView` derives from `Project` by `Omit`, so new persisted Project fields leak into the view type unless omitted.
- Migration conventions: guideline sections 2–10 read; closest predecessor `projects-per-folder-v1` (frozen readers, dispositions, atomic writes, retry recognition). Its frozen readers are independent of the current readers, so changing current readers does not affect it.
- Current admission owner: `ProjectStore` readers (an invalid `project.json` is "not a Project", an invalid `task.json` "not a Task").
- Released dispositions that matter: deleted Projects / Tasks leave folders without `project.json` / `task.json` (kept `agent_run_resources.json`); these are not candidates.

## Requirement Implications

- Key backfill is a new required fact derived from old data (creation order) → migration (design).
- Delete cleanup decided (DEC-003); the editor must not resubmit dangling IDs.
- Tool outputs are already explicit picks → REQ-017 holds without tool changes.

## Notes For Architecture Design

- Scenarios SCN-001–010 must map to: create allocation, rename preservation, prefix reservation, update validation, delete cleanup, feed fields, worker-task key, web derivation and components, startup backfill.
- Keep the agent-tool path able to pass `dependsOnTaskIds` later through the same service validation (no tool change now).

## SR-002 Investigation (2026-10-17)

Trigger: the user asked to make the Task ID itself meaningful, chose the key as the one agent-facing ID with agent tools updated now, and asked for key-based Task URLs too. Quotes in `requirements-doc.md` Document Status.

| Source | Exact Path / Command | Finding | Implication |
| --- | --- | --- | --- |
| Code | `grep -rn '"task_id"\|task_id:' autobyteus-server-ts/src` | Task-ID inputs: `update_task` (`project-task-tool-contract.ts`), `delegate_task` both task modes (`task-delegation-tool-input-parsers.ts`, `root-task-execution-lifecycle.ts`). Output `task_id` only for a created Temp task (`root-task-dispatch.ts:57`, `task-delegation-tool-serialization.ts:33`) | Two inputs to resolve; the delegate output is unchanged |
| Code | `agent-collaboration/execution/task/task-execution-input.ts:71`; `root-task-execution-lifecycle.ts:193` | Agent-facing texts embed the Task ID | Use the reference |
| Code | `projects/domain/task-execution-resources.ts:153-186` | Refusal texts embed Task IDs, including a suggested `task_id "<id>"` call | Builders take references |
| Code | `agent-collaboration/execution/task/task-execution-resource-port.ts:38` | `resolveAssignment(taskId) → {description, referenceFiles}` is the first port call of both task delegation modes | Natural resolution point |
| Code | `agent-collaboration/domain/agent-team-collaboration-llm-contract.ts:42` | `DELEGATE_TASK_ID_DESCRIPTION` | Wording update |
| Code | `autobyteus-web/pages/projects/[id]/tasks/[taskId]/{index,edit}.vue`; `composables/projects/useProjectTaskPage.ts`; link builders in `ProjectTaskRow.vue:62`, `ProjectsPanelTaskDetail.vue:84`, `ProjectTaskDetail.vue:51`, `ProjectTaskDraftEditor.vue:35`, `TaskDependenciesSection.vue:14` | Route param is passed straight through as `taskId` | Page resolves a reference; links use the key |
| Doc | `autobyteus-server-ts/docs/design/collaboration_model.md` CM-6 | "saved-ID delegation" wording | Doc update |
| Code | ID formats: `project_task_<uuid>`, ad-hoc prefix + uuid; prefix rule maps "_" to "-" | Keys and IDs are disjoint strings | One resolver can try ID then key |
| Observation | Worktree status 2026-10-17 | Implementation of SR-001 is under way; the implementation engineer was told SR-002 is coming | SR-001 stays the base |

Decision evidence: reserving deleted Projects' prefixes becomes necessary once keys are agent-facing IDs. Otherwise an old key in an agent's memory could later resolve to a different Task of a re-created Project.
