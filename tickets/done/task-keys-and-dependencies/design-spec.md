# Design Spec — Readable Task keys and "depends on"

## Solution And Approval Basis

- Current solution revision ID: `SR-003` (SR-001: ARCH-REV-001 Pass; SR-002: ARCH-REV-002 Fail; findings resolved in "SR-003 Corrections")
- Approved requirements baseline: `requirements-doc.md` at `SR-002` (user approval 2026-10-17 for the extension; SR-001 parts approved within the direction, user informed); intended UI behavior = the user-approved UI/UX design.
- Behavior-defining supplements: Product `ui-ux-spec.md` (Approved 2026-10-17, user: "sounds good. i like the UI. its approved"), VIS-001–015, design repo `personal@1ebf4c6`.
- Design status: `Ready`
- Canonical investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-and-dependencies/tickets/in-progress/task-keys-and-dependencies/investigation-notes.md`
- Authorities read (2026-10-17): `references/architecture-design.md`, `references/design-principles.md`; project `DESIGN.md` (root), `autobyteus-server-ts/docs/design/data_migration_guideline.md` (persisted data), `TESTING.md`; `references/design-examples.md` not used.
- Project design-principle conflicts or discrepancies: none.

## Current-State Read

Project Tasks are files owned by `ProjectStore` (`project.json` per Project, `task.json` per Task), read tolerantly and written exactly. `ProjectService` owns Project invariants (name normalisation and case-insensitive uniqueness, checked inside the store's serialized catalog write). `ProjectTaskService` is the Task subject boundary for both the UI (GraphQL) and agent tools: create, update, delete, views, change publication, worker-task reads. The `/ws/projects` publisher reads committed views and emits strict, field-picked frames. The web `projectTaskStore` holds every Task of a Project (all statuses) and applies feed upserts; board, Task page, tab and editor render from it. Agent tool results pick their fields explicitly, so new Task fields do not reach agents. There is no structural problem; the feature adds a new persisted fact (key), new allocation state (per-Project prefix and high-water mark), an optional stored relation and their UI.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale: SR-002 adds the agent-tool contract, the Task-execution port and refusal texts, a retired-prefix file and key-based routes. Three subsystems now (server Projects + app-data migration + agent tools / collaboration Task execution; web Projects + tree), ~40 files: server domain, store, two services, GraphQL types, change messages, a new migration with frozen shapes; web types, queries / codegen, store, draft composable, 5 new components, 6 modified components, 2 localization files, docs; tests in both.
- Architectural risk: `High`
- Risk rationale: new persisted required fact with a startup backfill migration (persistence), an extended GraphQL and WebSocket contract (contract), a new concurrency invariant (unique number allocation shared by UI and agents; loop-free dependency writes), and, in SR-002, a changed agent-facing tool contract (Task-ID values, reference resolution, `depends_on`) across the agent-tools and collaboration boundary.
- Escalation trigger: any need to read old shapes outside the migration; any tool change beyond REQ-018–020; any need to change the stored Task identity; any requirement to block work on dependencies; a migration failure mode that would hide Projects in a reachable scenario.

## Architecture Investigation Evidence

| Source | Path | Observation | Decision Supported | Uncertainty |
| --- | --- | --- | --- | --- |
| Store | `src/projects/stores/project-store.ts` | Catalog lock for all `project.json` writes; task create under its own lock; tolerant readers / exact writers | D-ALLOC (allocate under catalog lock), D-READERS | None |
| Project service | `src/projects/services/project-service.ts` | Name check inside `store.createProject(check)` with all Projects | D-PREFIX (reserve in the same callback) | None |
| Task service | `src/projects/services/project-task-service.ts` | One shared create / update body for UI and tools | D-DEPS, D-DELETE | None |
| Migration guideline + predecessor | `docs/design/data_migration_guideline.md`; `src/app-data-migrations/migrations/projects-per-folder-v1/` | Migrate for a new required fact; frozen readers; dispositions; atomic writes; retry recognition | D-MIGRATION | None |
| Runner / startup | `app-data-migration-runner.ts`; `server-runtime.ts:178` | Runs before serving; FAILED does not stop startup; prerequisite-incomplete stays NOT_RUN | No lockout | None |
| User data (read-only) | `~/.autobyteus/server-data/projects` | 7 Projects, ≤ 113 Tasks, Latin names, residue folders without `project.json` | Cost trivial; residue is not a candidate | None |
| Updater | `electron/updater` | `allowDowngrade: false` | Downgrade unsupported | None |
| Prototype | design repo `1ff2edf` | Components and derivation on the same source | Web port | None |

## Intended Change

Every Project Task gets an immutable `taskKey` at creation, allocated by the store from the Project's reserved prefix and high-water mark; existing data is keyed by a startup migration. Tasks store `dependsOnTaskIds`, validated by `ProjectTaskService`. GraphQL, the change feed and the worker-task answer carry the new fields. The web derives badges and lists from the Project's Task list and renders the approved components.

## Change Scope (Mandatory)

- In scope: UC-001 to UC-008 (SR-002 adds UC-006 to UC-008: tools use keys, tools set dependencies, key URLs; see "SR-002 Extension"). Server `projects` domain, store, services, GraphQL Project Task types, change messages, a new app-data migration; web Projects types / queries / store / draft, new and modified Projects components, the tree's Task summary, `taskWorkerTaskStore`, localization (en, zh-CN), `autobyteus-web/docs/projects.md`.
- Deliberately left alone: Temp tasks / ad-hoc store (their IDs stay); board search; `projects-per-folder-v1` migration; Project GraphQL type (no prefix exposed); the stored Task identity, run resources and history (still the long ID); assignment / closure / reopen rules (REQ-016, REQ-021); Project IDs and Temp-task URLs; context-file REST paths.
- Follow-ups:
  - FU-001 (agent tools) is absorbed into this ticket by SR-002.
  - FU-002 Board search by key (non-goal here).
  - FU-003 Project Task Manager uses keys / dependencies instead of its board-file notes.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | REQ / AC | Trigger | Existing Evidence | Change | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001, 005, 017; AC-001, 002, 005, 007, 020 | New task Save; `create_task` | INV BEH-001 | Key allocated in the first write | DS-001 |
| BEH-002 | Operational | REQ-004; AC-006 | First start of the new build | INV BEH-002 | Backfill migration | DS-006 |
| BEH-003 | User | REQ-002, 003; AC-003, 004 | New / Edit Project | INV BEH-003 | Prefix reserved at creation, kept on rename | DS-002 |
| BEH-004 | User / Contract | REQ-006, 007, 011, 016; AC-008–010, 014, 015, 019 | New / Edit task Save | none (new) | Stored and validated | DS-001, DS-003 |
| BEH-005 / 006 | User | REQ-009, 010, 013, 015; AC-012, 013, 017 | Board, Task page, tab | INV | Derived client-side | DS-005 |
| BEH-007 | User | REQ-008, 012; AC-007, 016 | Tree | INV | `taskKey` on worker answer | DS-007 |
| BEH-008 | User | REQ-014; AC-018 | Delete Task | INV | Dependents cleaned | DS-004 |
| BEH-009 | System | REQ-008; AC-011 | Any Task write | INV | Wire fields | DS-005 |
| BEH-010 | Contract | REQ-017–021; AC-020, 022–025, 027 | Agent tools | INV, SR-002 investigation | Key as agent-facing ID; reference resolution; `depends_on` | DS-009, DS-010 |
| BEH-011 | User | REQ-022; AC-026 | Task links | INV | Key URLs | DS-011 |

## Relevant Supplemental Task Artifacts

| Artifact | Purpose | Related IDs | Relationship | Status |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/task-keys-and-dependencies/ui-ux-spec.md` | Normative UI/UX | REQ-009–015 | Web implementation follows it exactly | Approved |
| `…/visual-references/VIS-001…015` | Final references | REQ-009–013 | Visual acceptance | Approved |
| Design repo `/Users/normy/autobyteus_org/autobyteus-web-design` @ `1ebf4c6`: `components/projects/TaskKey.vue`, `TaskKeyChip.vue`, `TaskDependencyBadge.vue`, `TaskDependenciesSection.vue`, `TaskDependencyPicker.vue`, `utils/projects/taskDependencies.ts` and the changed source files (`git diff b31a5b1 1ff2edf`) | Reference implementation on the same source | REQ-009–013 | Port; drop fixture code (`prototype/`, `apolloClient.ts` hooks, design-only comments) | Reference |

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature`
- Current design issue found: `No`
- Structural triggers considered: *Shared-structure tightness* — `ProjectView extends Omit<Project,"workspaces">` would leak allocation state; fixed by omitting `taskKeys`. *Responsibility overload* — `project-task-service.ts` is 505 lines; dependency validation and key / prefix rules go into small domain files, not the service. *Capability reuse* — locks reuse `withFilePathLock`; migration reuses the runner. *Authoritative boundary* — all Task writes stay behind `ProjectTaskService`; number allocation stays inside `ProjectStore`. None fires beyond these handled points.
- Root cause classification: `No Design Issue Found`
- Refactor needed now: `No`
- Evidence: investigation notes, "Architecture Investigation Findings".
- Design response: extend existing owners; add two pure domain files and one migration folder.
- Refactor rationale: owners are correct; additions are bounded.
- Deferrals: none.

## Terminology

- `taskKey`: `<prefix>-<number>`, stored on the Task, immutable.
- `taskKeys` (Project allocation state): `{ prefix, lastNumber }` in `project.json`; `lastNumber` is the highest number ever assigned in the Project.
- Keying: giving a Project its `taskKeys` and every Task its `taskKey` (creation or backfill).

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths and files in this scope: none (additive feature).
- Compatibility wrappers, dual paths, or legacy fallbacks kept: `None`. Current readers require the new key fields; old shapes are interpreted only inside the new migration.

## Persisted Data / State Transition Decision (Mandatory)

- Stored subject: `<appData>/projects/<projectId>/project.json` and `…/tasks/<taskId>/task.json` (shapes in investigation notes; ≤ 7 Projects, ≤ 113 Tasks each on the user node).
- Change:
  - `task.json` gains `taskKey` (required, immutable) and `dependsOnTaskIds` (optional array).
  - `project.json` gains `taskKeys: { prefix, lastNumber }` (required).
- Normal reader/writer: tolerant readers project known fields; exact writers emit the current shape. Single owner: `ProjectStore`.
- Semantics under direct use:
  - `dependsOnTaskIds` absent truthfully means "no dependencies". Directly usable: the reader defaults to `[]`; no migration.
  - `taskKey` / `taskKeys` absent has no truthful meaning: every Project Task has a key, and creation order is a fact only old data supplies.
- Constraints: no lockout; never touch real data in tests; one writer process (existing assumption of every Projects lock).
- Decision: `Migration Required` for keys; `Directly Usable — No Migration` for `dependsOnTaskIds`.
- Rationale:
  - Deriving keys at read time would be runtime reconciliation of historical storage, which the guideline forbids.
  - Lazy keying on first access would put old-shape classification into the current store.
  - A one-time startup pass costs one read and write per file (≈ 150 files), with no backup.
- Supported ACs: AC-006; QR-002.

### Migration Plan

- Current schema: the current store writer after this change.
- Older shape requiring transformation: the released `project.json` / `task.json` as written at `c600028072`. Path-only links; statuses TODO / IN_PROGRESS / DONE / CANCELLED. Older link extras (`workspaceId`, `addedAt`) may remain in files and are left in place.
- Why direct use / rebuild is insufficient: keys are a required immutable fact; rebuild would lose nothing, but a read-time derivation is a forbidden compatibility path.
- Trigger: `Startup` (`requiredOnStartup: true`, `executionPolicy: "STARTUP_ONLY"`).
- Owner / location: `autobyteus-server-ts/src/app-data-migrations/migrations/project-task-keys-v1/`, registered after `ProjectsPerFolderV1AppDataMigration` with `prerequisiteMigrationIds: [PROJECTS_PER_FOLDER_V1_MIGRATION_ID]`. ID `20261017_project_task_keys_v1`.
- Current runtime stays current-schema-only: `ProjectStore` readers require `taskKeys` / `taskKey`.
- Historical shapes confined: `project-task-keys-v1/released-project-files-v2.ts` is a frozen copy of the current `readProjectFile` / `readTaskFile` (at `c600028072`), used to classify candidates. `project-task-keys-v1/task-key-prefix-v1.ts` is a frozen copy of the prefix rule and the uniqueness suffixing, so the deterministic output never drifts if the runtime rule changes.
- Completion marker:
  - Per Project, the `taskKeys` field written last into `project.json`.
  - Overall, the runner ledger.
- Restart / idempotency:
  - Same validated input always gives the same plan:
    - Projects are ordered by `createdAt`, then `projectId`.
    - Tasks are ordered by `createdAt`, then `taskId`.
    - Prefixes already reserved by keyed Projects are taken first.
  - On retry, a Project that already has valid `taskKeys` is `SKIPPED_ALREADY_CURRENT`.
  - A Task that already carries the planned `taskKey` is recognized as current.
  - A Task carrying a different key is a `FAILED_OPERATION` for that Project. Nothing is overwritten and the Project's marker is not written.
- Validation: after writing, each Task and then the Project are re-read with the current readers (allowed: current code only to validate output), and their key fields are compared with the plan.
- Backup / rollback: none.
  - Each write adds fields to the parsed object, keeps every other key and value, and is replaced atomically (`writeJsonFile`).
  - The added fields are inert to the released build. Its updater never downgrades.
- Concurrent access: migrations run before the server serves requests (single writer).
- Retention: keep the migration registered (supported upgrade range).

| Step | Source | Target | Owner | Validation | Failure / Recovery |
| --- | --- | --- | --- | --- | --- |
| 1 Enumerate | Project folders with a `project.json` that the frozen reader accepts | Candidate list in Project order; reserved = prefixes of Projects already keyed | migration | Frozen reader | Folder without `project.json`: not a candidate. Invalid `project.json`: `SKIPPED_INVALID_PROJECT_WARNING` (preserved; already excluded at runtime) |
| 2 Plan Project | Candidate | Prefix by the frozen rule, then smallest free `-N` suffix; Tasks valid under the frozen reader, in creation order, get numbers 1..n | migration | — | Invalid `task.json`: `SKIPPED_INVALID_TASK_WARNING` (preserved, not numbered). Folder without `task.json`: not a candidate |
| 3 Write Tasks | `task.json` | `+ taskKey` | migration | Re-read with the current `readTaskFile` | Write error → `FAILED_OPERATION` for the Project; its marker is not written; restart retries |
| 4 Write marker | `project.json` | `+ taskKeys {prefix, lastNumber: n}` | migration | Re-read with the current `readProjectFile` | As above |
| 5 Result | Dispositions | `SUCCEEDED` / `SUCCEEDED_WITH_WARNINGS` / `FAILED` | migration | Runner contract | `FAILED` is logged; startup continues; an unkeyed Project stays excluded (preserved) until a restart retries |

Availability: a Project whose keying failed is preserved and invisible until a restart retries it. Every other Project and all new work keep working. A failure here is only reachable through I/O errors outside the guideline's operating assumptions.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-001, 004 | New task Save / `create_task` | Card with the new key (and badge) | `ProjectTaskService` | Key allocation, dependency storage at create |
| DS-002 | Primary | BEH-003 | New / Edit Project | `project.json` with reserved prefix | `ProjectService` | Prefix uniqueness and immutability |
| DS-003 | Primary | BEH-004 | Edit task Save | Updated Task, board / lists | `ProjectTaskService` | Validation, loop safety |
| DS-004 | Primary | BEH-008 | Delete Task | Dependents cleaned and republished | `ProjectTaskService` | Truthful data |
| DS-005 | Return-Event | BEH-005, 006, 009 | Committed Task write | Re-derived badge / lists in every open surface | Publisher → web store | Live derived state |
| DS-006 | Primary (operational) | BEH-002 | App start | Keyed Projects | Migration | Backfill |
| DS-007 | Primary | BEH-007 | Tree requests worker Tasks | "<key> <summary>" | `ProjectTaskService.currentTasksOfTaskWorkers` | Tree key |
| DS-008 | Bounded Local | BEH-004 | Picker input | Option list / chosen rows | `TaskDependencyPicker` | Keyboard, filtering, loop exclusion |

## Primary Execution Spine(s)

- DS-001: `New task page / create_task → GraphQL createProjectTask / tool manifest → ProjectTaskService.create (validate dependsOn) → ProjectStore.createTask (allocate key under catalog lock → write task.json) → publisher task_upserted → web projectTaskStore → ProjectTaskBoard card (key line, badge)`
- DS-002: `Project editor / create_or_update_project → ProjectService.createProjectRecord → ProjectStore.createProject(check: name unique + reserve prefix) → project.json`; rename: `ProjectService.updateProject / patchProjectRecord → ProjectStore.updateProject → project.json (taskKeys carried unchanged)`
- DS-003: `Edit task page → GraphQL updateProjectTask(dependsOnTaskIds) → ProjectTaskService.updateTask → [dependency lock] read Project Tasks → validate → ProjectStore.updateTask → publisher → web store → board / Task page / tab`
- DS-004: `Task page Delete → deleteProjectTask → ProjectTaskService.deleteTask → ProjectStore.deleteTask → for each dependent: ProjectStore.updateTask (remove id) → publisher (task_removed + dependents' task_upserted) → web`
- DS-006: `server-runtime runPending → ProjectTaskKeysV1AppDataMigration → per Project: plan → write task.json keys → write project.json taskKeys → ledger`
- DS-007: `Workspaces tree → GetTaskWorkerTasks → ProjectTaskService.currentTasksOfTaskWorkers → readTaskChangeView → TaskWorkerTaskView{…, taskKey} → taskWorkerTaskStore → TaskWorkerTaskSummary`

## Spine Narratives (Mandatory)

| Spine | Narrative | Nodes | Owner | Off-Spine |
| --- | --- | --- | --- | --- |
| DS-001 | The service normalizes the description and dependencies and checks that every dependency is a current Task of this Project. A new Task cannot close a loop, because nothing depends on it yet. The service prepares context. The store then takes the catalog lock, reads `project.json`, increments `taskKeys.lastNumber`, writes it and returns `formatTaskKey(prefix, n)`. Under the Task-file lock it writes `task.json` with `taskKey` and `dependsOnTaskIds`. If a later step fails, the number is spent (a gap), never reused. | service, store, publisher, web store, board | `ProjectTaskService` | key format rule, dependency rule |
| DS-002 | Inside the existing catalog-locked `createProject(check)` callback, the service derives the prefix from the name and suffixes it against every current Project's `taskKeys.prefix`. It writes `taskKeys: {prefix, lastNumber: 0}`. Renames spread the record, so `taskKeys` is unchanged; no service path ever writes `taskKeys` except allocation. | service, store | `ProjectService` | prefix rule |
| DS-003 | Only when `dependsOnTaskIds` is supplied, the service takes the Project's dependency lock and re-reads the Project's Tasks. It rejects self, unknown or loop-forming IDs (a loop exists if this Task is reachable from any new dependency over current `dependsOnTaskIds`). Then it runs the existing update body, which replaces the list. The edit counts as a meaningful change and bumps `updatedAt`. | service, store | `ProjectTaskService` | dependency rule, lock |
| DS-004 | After the delete commits, the service lists the Project's Tasks and, for each that still lists the deleted ID, writes the list without it. It keeps the dependent's `updatedAt`: the user did not edit it, and the board order stays. It publishes each. A failing cleanup write is logged and never fails the delete; readers ignore IDs that name no Task. | service, store, publisher | `ProjectTaskService` | — |
| DS-005 | Each committed write publishes that Task's view, now with `taskKey` and `dependsOnTaskIds`. The web store replaces the Task in its list. Badges, Depends on and Required by are computed from the list, so a dependency becoming Done clears dependents' badges with no extra events. | publisher, web store, components | publisher / store | `utils/projects/taskDependencies.ts` |
| DS-006 | See the Migration Plan. | migration | migration | frozen shapes, frozen prefix rule |
| DS-007 | The worker answer adds `taskKey` from the Project Task view (null for a Temp task). | service, store, summary | service | — |
| DS-008 | Input or click opens the list. The list shows options of this Project: not itself, not already chosen, matching key or description text; newest key first; at most 8. Loop options (the Task and everything that transitively depends on it) are greyed and skipped by the arrows. Enter adds, Esc closes, a choice closes the list and keeps focus. | picker | picker | `dependencyCycleIds` |

## Spine Actors / Main-Line Nodes

GraphQL `ProjectTaskResolver` (transport), tool manifest (transport, unchanged), `ProjectTaskService`, `ProjectService`, `ProjectStore`, `ProjectChangePublisher`, migration, web `projectTaskStore`, `taskWorkerTaskStore`, web components.

## Ownership Map

- `ProjectStore`: files, locks, key allocation (the high-water mark lives in its file), reader admission (`taskKeys` / `taskKey` required; `dependsOnTaskIds` normalized), exact writers.
- `ProjectService`: Project invariants, including prefix reservation at creation and never changing `taskKeys`.
- `ProjectTaskService`: Task invariants, including dependency validation, the dependency lock, delete cleanup and views (`taskKey`, `dependsOnTaskIds`, worker `taskKey`).
- `projects/domain/task-keys.ts`: the prefix rule, uniqueness suffix and key format (pure).
- `projects/domain/task-dependencies.ts`: normalization and validation of a dependency list against the Project's Tasks (pure).
- Migration: one-time keying of released data.
- Web `utils/projects/taskDependencies.ts`: derivations (dependencies, required by, badge, loop set, key number); web components render only.
- GraphQL resolver and change messages: thin mapping.

## Thin Entry Facades / Public Wrappers

| Facade | Owner Behind | Why | Must Not Own |
| --- | --- | --- | --- |
| `ProjectTaskResolver` | `ProjectTaskService` | GraphQL transport | Validation |
| `projectTaskWire` | publisher | Feed shape | Derivation |

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| None | Additive feature; no replaced path | — | — | Remove dead code found in touched files with evidence, per Principle 7 |

## Return Or Event Spine(s)

DS-005: `ProjectStore commit → ProjectTaskService changes.taskChanged → ProjectChangePublisher flush → readTaskChangeView → projectTaskWire (+taskKey, dependsOnTaskIds) → /ws/projects → web projectTaskStore apply → computed derivations`.

## Bounded Local / Internal Spines

- DS-008 (picker): `input / keydown → filter + sort + slice(8) → mark loop options → active index (skip loop) → Enter / click → add id → close, keep focus`. Parent: `TaskDependencyPicker`.
- Migration Project loop: `plan → write Tasks → write marker → validate → disposition`. Parent: migration.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk If On Main Line |
| --- | --- | --- | --- | --- | --- |
| Prefix rule + suffix | DS-002 | ProjectService | Name → prefix; uniquify | Shared by create and (frozen) migration | Rule drift between callers |
| Key format | DS-001 | ProjectStore | `${prefix}-${n}` | One place | — |
| Dependency rule | DS-001, 003 | ProjectTaskService | Normalize, exists, same Project, no self, no loop | Pure, testable | Service bloat |
| Dependency lock | DS-003 | ProjectTaskService | Serialize dependency-changing updates per Project | QR-003 | — |
| Web derivations | DS-005 | Components | Badge / lists / loop set / key number | Shared by card, page, tab, picker | Duplication across components |

## Ownership Boundaries

- All Task writes go through `ProjectTaskService`; tools and GraphQL never call `ProjectStore` directly (unchanged).
- Allocation is internal to `ProjectStore.createTask`. No caller passes or computes a number.
- `taskKeys` is never accepted from any input and never returned by any API.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass | Fix If Too Thin |
| --- | --- | --- | --- | --- |
| `ProjectTaskService` | dependency rule, lock, store writes, publication | GraphQL resolver, tool manifest, publisher readers | Resolver validating dependencies itself | Add service method |
| `ProjectStore.createTask` | key allocation | `ProjectTaskService` | Service reading / writing `taskKeys` | — |
| `ProjectService` | prefix reservation | GraphQL, tool | Store choosing prefixes | — |

## Dependency Rules

- `projects/domain/*` depends on nothing in services or stores.
- Store → domain (format); services → store + domain.
- Migration → frozen local copies; may import current `readProjectFile` / `readTaskFile` only to validate output, and `writeJsonFile`, `ProjectsLayout`.
- Web components → `utils/projects/taskDependencies.ts` and stores; no component computes derivations inline beyond presentation.
- Forbidden: current runtime importing anything from the migration folder; agent tool files changing.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity | Notes |
| --- | --- | --- | --- | --- |
| GraphQL `ProjectTask.taskKey: String!`, `dependsOnTaskIds: [String!]!` | Project Task | Read | — | — |
| `CreateProjectTaskInput.dependsOnTaskIds: [String!]` (nullable) | Project Task | Set at create | same-Project `taskId`s | Omitted = none |
| `UpdateProjectTaskInput.dependsOnTaskIds: [String!]` (nullable) | Project Task | Replace | same | Omitted = keep; `[]` = clear |
| `TaskWorkerTaskView.taskKey: String` (nullable) | Worker's Task | Read | — | Null for a Temp task |
| `CreateProjectTaskCommand.dependsOnTaskIds?`, `UpdateProjectTaskCommand.dependsOnTaskIds?` | Service commands | — | — | Tool commands unchanged |
| Error `TASK_DEPENDENCY_INVALID` | — | Self / unknown / other-Project / loop | — | Message in English, shown in the editor's error line (DEC-006) |
| `/ws/projects` `projectTaskSchema` `+ taskKey: text, dependsOnTaskIds: array(text)` | Feed | — | — | Strict schema |

## Interface Boundary Check

| Interface | Singular | Identity Explicit | Ambiguity | Action |
| --- | --- | --- | --- | --- |
| GraphQL inputs `dependsOnTaskIds` | Yes | Yes (`taskId`s; the web holds them) | Low | Agent tools take references (key or ID), resolved by one resolver (SR-002 D-REF) |
| `TaskWorkerTaskView.taskKey` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural | Drift | Action |
| --- | --- | --- | --- | --- |
| Key | `taskKey` | Yes | Low | — |
| Allocation state | `taskKeys {prefix, lastNumber}` | Yes | Low | — |
| Relation | `dependsOnTaskIds` | Yes | Low | Same name as the prototype and the future tool argument `depends_on` |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision | Why |
| --- | --- | --- | --- |
| Serialize allocation | `withProjectsCatalog` | Reuse | Same lock as every `project.json` write |
| Dependency lock | `withFilePathLock` | Reuse | In-process path lock, as every Projects lock |
| Backfill | App-data migration runner | Reuse | Policy |
| Feed | Publisher | Extend | Fields only |
| Copy to clipboard | existing clipboard pattern (`components/common/CopyButton.vue`) | Reuse its clipboard call / error pattern inside `TaskKeyChip` | Spec: "existing error pattern" |

## Subsystem / Capability-Area Allocation

| Area | Concerns | Spines | Decision |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/projects` | domain rules, store, services | DS-001–005, 007 | Extend |
| `autobyteus-server-ts/src/app-data-migrations` | backfill | DS-006 | Extend (new folder) |
| `autobyteus-server-ts/src/api/graphql/types` | transport | DS-001, 003, 007 | Extend |
| `autobyteus-web` Projects | UI, store, derivations | DS-001, 003, 005, 008 | Extend |
| `autobyteus-web` workspace history | tree summary | DS-007 | Extend |

## Draft File Responsibility Mapping

See Final File Responsibility Mapping (no extraction changed the draft).

## Reusable Owned Structures Check

| Logic | Shared File | Owner | Why Shared | Tight | Must Not Become |
| --- | --- | --- | --- | --- | --- |
| Prefix + suffix + format | `projects/domain/task-keys.ts` | projects | ProjectService, store | Yes | A key parser / lookup service |
| Dependency validation | `projects/domain/task-dependencies.ts` | projects | create + update | Yes | A graph framework |
| Web derivations | `utils/projects/taskDependencies.ts` | web Projects | card, page, tab, picker | Yes | Server-call layer |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning | Redundancy | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| `task.json taskKey` vs `project.json taskKeys.prefix` | Yes: the Task's assigned fact vs. the Project's allocation input | Not redundant: the key must not depend on the prefix field later | Low | Never compose keys from the Project at read time |
| `ProjectView` | — | Would include `taskKeys` | Medium | `Omit<Project, "workspaces" \| "taskKeys">` |
| Web `ProjectTask.taskKey` | Yes | — | Low | Required `string`; `dependsOnTaskIds: string[]` required |

## Final File Responsibility Mapping

| File | Owner | Concern |
| --- | --- | --- |
| `server/src/projects/domain/task-keys.ts` (new) | projects domain | `taskKeyPrefixOf(name)`, `uniqueTaskKeyPrefix(base, taken)`, `formatTaskKey(prefix, n)` |
| `server/src/projects/domain/task-dependencies.ts` (new) | projects domain | `normalizeDependsOn(raw)` (strings, trimmed, de-duplicated), `assertDependenciesValid(taskId \| null, ids, tasks)` → `TASK_DEPENDENCY_INVALID` |
| `server/src/projects/domain/models.ts` | domain | `ProjectTask.taskKey`, `dependsOnTaskIds`; `Project.taskKeys`; `ProjectView` omits `taskKeys`; `TaskWorkerTaskView.taskKey`; commands `+dependsOnTaskIds?` |
| `server/src/projects/domain/project-errors.ts` | domain | `+ TASK_DEPENDENCY_INVALID` |
| `server/src/projects/stores/project-store.ts` | store | readers / writers with new fields; `createTask` allocates under the catalog lock; `withTaskDependencies(projectId, op)` lock |
| `server/src/projects/services/project-service.ts` | Project service | reserve prefix at create; `taskKeys` untouched elsewhere |
| `server/src/projects/services/project-task-service.ts` | Task service | dependency validation in create / update; lock; delete cleanup; views; worker `taskKey` |
| `server/src/api/graphql/types/project-tasks.ts` | transport | fields, inputs, mapping |
| `server/src/projects/changes/project-change-messages.ts` | feed | schema + wire |
| `server/src/app-data-migrations/migrations/project-task-keys-v1/project-task-keys-v1-app-data-migration.ts` (new) | migration | DS-006 |
| `…/project-task-keys-v1/released-project-files-v2.ts` (new) | migration | frozen readers of the shapes at `c600028072` |
| `…/project-task-keys-v1/task-key-prefix-v1.ts` (new) | migration | frozen prefix rule and suffixing |
| `server/src/app-data-migrations/app-data-migration-registry.ts` | registry | register after per-folder v1 |
| `web/types/project.ts` | types | `ProjectTask.taskKey`, `dependsOnTaskIds`; `TaskWorkerTask.taskKey` |
| `web/graphql/queries/projectTaskQueries.ts`, `graphql/mutations/projectTaskMutations.ts`, `generated/graphql.ts` | transport | fields / inputs; regenerate |
| `web/stores/projectTaskStore.ts` | store | pass `dependsOnTaskIds` on create / update |
| `web/stores/taskWorkerTaskStore.ts` | store | carry `taskKey` |
| `web/composables/projects/useProjectTaskDraft.ts` | draft | `dependsOn` state; initialised from dependencies that exist |
| `web/utils/projects/taskDependencies.ts` (new) | derivations | as prototype |
| `web/components/projects/TaskKey.vue`, `TaskKeyChip.vue`, `TaskDependencyBadge.vue`, `TaskDependenciesSection.vue`, `TaskDependencyPicker.vue` (new) | UI | as prototype / spec |
| `web/components/projects/ProjectTaskRow.vue`, `ProjectTaskDetail.vue`, `ProjectTaskDraftEditor.vue`, `panel/ProjectsPanelTaskDetail.vue`, `panel/ProjectsPanel.vue` | UI | integrate |
| `web/components/workspace/history/TaskWorkerTaskSummary.vue` | UI | key first |
| `web/localization/messages/en/projects.ts`, `zh-CN/projects.ts` (+ workspace strings if the tree label key needs the key) | strings | exact spec strings |
| `web/docs/projects.md` | docs | keys, dependencies |

## Applied Patterns

- Repository (existing `ProjectStore`); migration definition (existing runner contract).

## Target Subsystem / Folder / File Mapping

As in Final File Responsibility Mapping. The new migration folder follows the per-migration folder convention (`projects-per-folder-v1/`). The pure rules live in `projects/domain/` beside `task-status.ts`.

## Folder Boundary Check

| Folder | Depth | Clear | Risk | Note |
| --- | --- | --- | --- | --- |
| `projects/domain` | Domain rules | Yes | Low | Pure functions only |
| `migrations/project-task-keys-v1` | Migration | Yes | Low | Frozen copies only here |
| `web/components/projects` | UI | Yes | Low | Flat, as today |

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Prefix rule | NFD, then remove combining marks that follow a Latin letter, then NFC. Lower-case with `toLowerCase()` (locale-independent). Replace each run of characters other than `\p{L}\p{M}\p{N}` with "-". Trim "-". Empty → `project`. Results: "AutoByteus Agents" → `autobyteus-agents`; "Café Ops" → `cafe-ops`; "客户门户" → `客户门户`; "!!!" → `project` | Removing every `\p{M}` (breaks Japanese dakuten, Devanagari); NFKD for Hangul; `toLocaleLowerCase()` (Turkish İ varies by locale) | Readable in every script, deterministic |
| Suffix | Taken `{autobyteus, autobyteus-2}` + base `autobyteus` → `autobyteus-3`; its first key `autobyteus-3-1` | Rejecting the Project name | Unique keys; keys split at the last "-" |
| Allocation | `withProjectsCatalog(read project.json → lastNumber+1 → write) → key; then task-file lock write` | `max(existing numbers)+1` (reuses after deleting the newest) | REQ-001 |
| `task.json` | `{"taskId":…,"projectId":…,"taskKey":"autobyteus-42","description":…,"status":"TODO","dependsOnTaskIds":["project_task_…"],…}` | Key composed from the Project at read | Immutability |
| `project.json` | `{…,"workspaces":[…],"taskKeys":{"prefix":"autobyteus","lastNumber":113}}` | Exposing `taskKeys` in `Project` GraphQL | Allocation state is internal |
| Loop check | New deps D of T: reject if T is reachable from any d ∈ D through current `dependsOnTaskIds` (unknown IDs ignored while walking) | Checking only direct back-edges | Indirect loops (VIS-008) |
| Editor init | `dependsOn = dependenciesOf(task, tasks).map(t => t.taskId)` | `[...task.dependsOnTaskIds]` (can resubmit a dangling id and be rejected) | RSK-003 |

## Backward-Compatibility Rejection Log (Mandatory)

| Mechanism | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Derive keys at read time from creation order for Tasks without `taskKey` | Avoids a migration | Rejected | Startup migration |
| Lazy keying on first store access | Avoids startup work | Rejected | Startup migration |
| Optional `taskKey` with the UI hiding a missing key | Tolerance | Rejected (no truthful meaning) | Required field; migration |
| Store keys as dependency identities | Convenience | Rejected (stored identity stays `taskId`) | Tools accept references that resolve to `taskId` before storage (SR-002) |

## Derived Layering

N/A.

## Change / Refactor Sequence

1. Server domain: `task-keys.ts`, `task-dependencies.ts`, models, error code (+ unit tests, AC-005).
2. Store:
   - readers / writers with the new fields;
   - allocation in `createTask`;
   - dependency lock;
   - written key-set tests updated.
3. `ProjectService` prefix reservation (AC-003, AC-004).
4. `ProjectTaskService`:
   - create / update dependencies, validation and lock;
   - delete cleanup;
   - views and worker `taskKey` (AC-001, 002, 007–011, 018, 019).
5. GraphQL types and change messages (+ `projects-graphql.e2e`).
6. Migration with frozen shapes and registration. Test it on synthesized released data: valid, invalid project, invalid task, residue folders, colliding names, an interrupted retry, a second run (no change). Extend `projects-startup-migration.e2e` (AC-006).
7. Web:
   - types, queries, codegen, stores, draft;
   - derivations and components (port from the design repo);
   - localization;
   - tree summary;
   - docs.
8. Validation: web unit, browser probe, isolated desktop instance with a released-shape test data root (TESTING.md), a beta release (delivery).

## Key Tradeoffs

- Storing the full key on the Task duplicates the prefix text but makes immutability structural.
- One global catalog lock for allocation serializes Task creates across Projects. Creates are rare, and this is the lock every `project.json` writer already uses.
- Client-side derivation needs no server fan-out. It relies on the store holding the whole Project list, which it already does.
- No reservation of deleted Projects' prefixes: simpler, and accepted (requirements DEC-001).

## Risks

- A web build and an older server (or the reverse) mismatch on required fields. Both ship together in the desktop app; remote nodes on mixed versions are out of scope.
- If migration I/O fails, a Project is hidden until a restart. This is outside the operating assumptions; the Project is preserved and the failure logged.
- Codegen needs a running server of this worktree.

## Guidance For Implementation

- Follow the UI/UX spec exactly. Port the design repo components (`git -C /Users/normy/autobyteus_org/autobyteus-web-design diff b31a5b1 1ff2edf -- components composables stores types graphql utils localization`) and drop design-only code (`prototype/`, `utils/apolloClient.ts` hooks, `delegatedCopyTasksFixture.ts`, `icon-collections.json`, `task-keys-and-dependencies (design)` comments). Use the same heroicons the way the source already resolves icons.
- Store the dependency list de-duplicated, in submitted order. The order has no meaning; the UI sorts by key number.
- Bump `updatedAt` when a user's edit changes the dependencies. Do not bump it during delete cleanup.
- Never accept `taskKey` or `taskKeys` from any input. A `create` / `update` that names the Task itself is rejected (`TASK_DEPENDENCY_INVALID`) rather than silently dropped.
- Agent tool changes are exactly REQ-018–020 (see "SR-002 Extension"); every other tool field, text and rule stays as is.
- Tests assert written key sets for both files (guideline section 3).
- Migration tests use small synthesized released-shape records (TESTING.md). Never use real data.


## SR-002 Extension — keys as the agent-facing Task ID, tool dependencies, reserved prefixes, key URLs

This section is authoritative for the SR-002 additions. Where it differs from earlier sections, it wins; those sections were edited to match.

### Additional investigation (see investigation notes, "SR-002 Investigation")

- Every agent-facing Task-ID surface:
  - inputs: `update_task task_id`; `delegate_task task_id` (with `recipient_address`, or with `target_agent_run_id` / `target_team_run_id`);
  - outputs: `list_project_tasks` `taskId`, `create_task` / `update_task` acknowledgement `taskId`;
  - texts: `buildExistingCopyTaskMessage` ("New Task assigned to you: …"), the undelivered-work text in `root-task-execution-lifecycle.ts`, and the refusals in `projects/domain/task-execution-resources.ts` (`assertTaskExecutionAssignable`, `notCurrentTaskMessage`).
- `delegate_task` returns `task_id` only for a Temp task it created. Unchanged.
- The runtime reaches Project Tasks only through `TaskExecutionResourcePort`, implemented by `ProjectTaskService`. `resolveAssignment(taskId)` is the first port call of both `delegate_task` task modes.
- Long IDs and keys cannot collide. Task IDs contain "_" (`project_task_…`, ad-hoc prefix), and prefixes never contain "_" (the prefix rule turns it into "-").

### Decisions

- D-REF (one resolver): `ProjectTaskService.resolveTaskReference(reference)` → `{ location, taskId, taskReference }`.
  - Order: an ad-hoc Task with that ID; else a Project Task with that ID (`findTask`); else a key. For a key, split at the last "-"; the Project whose `taskKeys.prefix` equals the left part; then its Task whose `taskKey` equals the reference.
  - Unknown → the existing `TASK_NOT_FOUND`.
  - `taskReference` is the agent-facing ID: the key for a Project Task, the ID for a Temp task.
  - Cost: ≤ #Projects `project.json` reads plus one Project's Task list, on a tool call only.
- D-PORT: `resolveAssignment(reference)` returns `{ taskId, taskReference, description, referenceFiles }`.
  - `RootTaskExecutionLifecycle.delegateToNewCopy` and `assignToExistingCopy` call it first and then use only the canonical `taskId` for every port call (join, `assertAssignable`, `assignExistingTaskExecution`, `refuseCopyOutsideTree`). They use `taskReference` in texts (`buildExistingCopyTaskMessage`, undelivered-work text).
  - Every other port method keeps canonical IDs.
- D-TOOL-OUT: the manifest maps each result's Task ID to `taskReference`.
  - `list_project_tasks`: `taskId: <key>`, `dependsOn: [<keys of existing dependencies>]`.
  - `create_task` / `update_task`: `taskId: <reference>`, plus `dependsOn` for Project Tasks.
  - The view supplies `taskKey`, so no extra reads. Dependency keys come from the Project list (`listTasks`, already read for listing; one extra list for an acknowledgement).
  - No long Task ID appears in results.
- D-TOOL-IN:
  - `update_task` resolves `task_id` via D-REF (`updateTaskById`).
  - `create_task` / `update_task` accept `depends_on: string[]` (references). The manifest passes them to the service, which resolves each with D-REF and requires a Project Task of the same Project (else `TASK_DEPENDENCY_INVALID`), then applies the SR-001 validation, lock and storage.
  - `depends_on` on a Temp task → `TASK_DEPENDENCY_INVALID`.
  - The parsers shape-check `depends_on` (array of non-empty strings); empty array allowed on update; `update_task` with only `depends_on` is a valid patch.
- D-TEXT: the refusal builders in `task-execution-resources.ts` take Task references instead of IDs (`taskReference`, `currentTaskReference`, `reopenedTaskReference`).
  - The service computes them with `referenceOf(location)`: the key from the read Task, or the ad-hoc ID.
  - `notCurrentTaskMessage`'s suggested call uses `task_id "<key>"`.
- D-DESC: tool descriptions say "task_id: the Task's ID (a Project Task's key, e.g. autobyteus-42)" and document `depends_on`.
  - Files: `PROJECT_TASK_TOOL_DESCRIPTIONS`, parameter descriptions, `DELEGATE_TASK_ID_DESCRIPTION`.
  - Follow the existing wording conventions (agent-addressed, "run id").
- D-RETIRED (REQ-003): `ProjectStore.deleteProject` adds the Project's `taskKeys.prefix` to `<appData>/projects/retired-task-key-prefixes.json` (`{"prefixes": [...]}`), under the catalog lock, before removing `project.json`.
  - Prefix reservation at Project creation checks current prefixes ∪ retired prefixes.
  - Tolerant reader: a missing file means an empty list, which is truthful, since pre-upgrade deleted Projects had no keys. No migration.
  - Exact writer. The file is in the Projects root, beside `projects.pre-folders.json`; `ProjectsLayout.retiredTaskKeyPrefixesFile()`.
- D-URL (REQ-022): routes stay `pages/projects/[id]/tasks/[taskId]/…`; the parameter is a Task reference.
  - `useProjectTaskPage` (and the editor page) find the Task in the Project list by `taskKey === ref || taskId === ref`. When the match was by long ID, they `router.replace` to the key URL (same query), so a page component never holds two identities.
  - Internally components keep using `task.taskId` for mutations, context clients and feed matching.
  - Every link builder uses `task.taskKey`: `ProjectTaskRow`, `ProjectsPanelTaskDetail`, `ProjectTaskDetail` / `ProjectTaskDraftEditor` detail targets, `TaskDependenciesSection`.
  - A shared `taskPagePath(projectId, task)` in `utils/projects/` builds them.
  - Temp-task routes are unchanged.
- D-DOC: update `autobyteus-server-ts/docs/design/collaboration_model.md` CM-6 wording ("a Project Task, delegated by its key or ID"), `docs/modules/agent_team_execution.md` where it documents `task_id`, and `autobyteus-web/docs/projects.md`.

### Additional spines

- DS-009 (tool reference in): `update_task / delegate_task (task_id = key or ID) → manifest / lifecycle → ProjectTaskService.resolveTaskReference → canonical taskId → existing update / assignment path → result / text with taskReference`
- DS-010 (tool dependencies): `create_task / update_task depends_on → manifest → ProjectTaskService (resolve each reference, same Project) → SR-001 dependency validation + lock → store → publisher → board badge`
- DS-011 (key URL): `card / panel / dependency row link (taskPagePath) → /projects/<id>/tasks/<key> → useProjectTaskPage resolves reference in the Project list → page (long-ID URL → router.replace to key URL)`

### Additional file mapping

| File | Change |
| --- | --- |
| `server/src/projects/services/project-task-service.ts` | `resolveTaskReference`, `referenceOf`; `updateTaskById` resolves; dependency references on tool commands; `resolveAssignment` returns `taskId` / `taskReference`; refusal texts with references |
| `server/src/projects/domain/models.ts` | `CreateTaskWithLocalContextFilesCommand.dependsOn?`, `UpdateTaskByIdCommand.dependsOn?` (references); acknowledgement view `taskReference`, `dependsOn` (keys) |
| `server/src/projects/domain/task-execution-resources.ts` | refusal builders take references |
| `server/src/projects/stores/project-store.ts`, `projects-layout.ts` | retired prefixes file (read / append under catalog lock); `findTaskByKey(key)` (prefix → Project → Task) |
| `server/src/projects/services/project-service.ts` | reservation checks retired prefixes |
| `server/src/agent-collaboration/execution/task/task-execution-resource-port.ts` | `resolveAssignment` result shape |
| `server/src/agent-collaboration/execution/task/root-task-execution-lifecycle.ts` | resolve first; canonical IDs inward; references in texts |
| `server/src/agent-collaboration/execution/task/task-execution-input.ts` | `buildExistingCopyTaskMessage({ taskReference, … })` |
| `server/src/agent-collaboration/domain/agent-team-collaboration-llm-contract.ts` | `DELEGATE_TASK_ID_DESCRIPTION` |
| `server/src/agent-tools/project-tasks/project-task-tool-contract.ts` | `depends_on` params / parsers; descriptions |
| `server/src/agent-tools/project-tasks/project-task-tool-manifest.ts` | results with `taskReference`, `dependsOn` |
| `server/tests/fixtures/task-execution-resource-fixtures.ts` and port fakes | new `resolveAssignment` shape |
| `web/utils/projects/taskPagePath.ts` (new), `web/composables/projects/useProjectTaskPage.ts` (or its current file) | reference lookup + replace |
| `web/components/projects/ProjectTaskRow.vue`, `ProjectTaskDetail.vue`, `ProjectTaskDraftEditor.vue`, `ProjectTaskEditor.vue`, `TaskDependenciesSection.vue`, `panel/ProjectsPanelTaskDetail.vue` | links via `taskPagePath` |
| docs listed in D-DOC | wording |

### Boundary and dependency rules (additions)

- Only `ProjectTaskService` resolves references. The lifecycle, manifest and parsers never parse keys or read Project files.
- After resolution, nothing inside the runtime or the stores carries a key as an identity. Run resources, assignments and feed scopes stay keyed by the long ID.
- Web: only the Task page lookup accepts a reference; everything else uses `taskId` internally and `taskKey` for links and text.

### Examples

| Topic | Good | Avoided |
| --- | --- | --- |
| Tool result | `{"tasks":[{"projectId":"project_a13…","taskId":"autobyteus-42","description":"…","status":"TODO","dependsOn":["autobyteus-39"],"contextFiles":[…],"assignments":[…],"closedAssignments":[…]}]}` | Both `taskId` and `taskKey` (two IDs to choose from) |
| Delegation | `delegate_task recipient_address="/team" task_id="autobyteus-42"` → resolved once → `join.taskId = "project_task_0e31…"` | Passing the key into `linkNewTaskExecution` / run resources |
| Refusal | "This task agent already has Task autobyteus-42. To continue it, set Task autobyteus-42 to TODO or IN_PROGRESS, then …" | The long ID in agent-facing text |
| URL | `/projects/project_a13…/tasks/autobyteus-42`; `/tasks/project_task_0e31…` → replaced by the key URL | Two routes or a key-only route that breaks old links |

### Backward-compatibility note

Accepting long IDs as inputs and opening long-ID URLs is approved product behavior (REQ-019, REQ-022: old notes and links keep working). It is not a legacy dual path: the long ID stays the stored identity, and both input forms resolve through one resolver to it.

### Change sequence (additions, after SR-001 steps 1–5)

1. Retired prefixes (store, layout, service) + AC-025.
2. `resolveTaskReference`, `referenceOf`, port shape, lifecycle, texts, fixtures + AC-022, AC-023.
3. Tool contract and manifest (`taskReference`, `depends_on`, `dependsOn`, descriptions) + AC-020, AC-024, AC-027.
4. Web `taskPagePath`, page lookup / replace, link builders + AC-026.
5. Docs (D-DOC).

### Risks (additions)

- Agents with old memory keep sending long IDs. These are accepted, and every result they get back carries keys.
- Tool-description wording changes affect agent behavior. Keep the changes minimal and in the existing voice.


## SR-003 Corrections (ARCH-REV-002)

This section is authoritative where it refines the "SR-002 Extension".

### AR-001: what "no long ID" covers (requirements DEC-011)

- Task-ID fields (`taskId` in tool results, `dependsOn`) and agent-facing texts carry only the key.
- Saved-context file data keeps its stored form, because the long ID stays the stored identity:
  - `contextFiles` `storedFilename`, `locator` and `localPath` in `list_project_tasks`;
  - the reference-file paths `delegate_task` delivers to the task agent.
- No change to `projectTaskFileLocator`, context paths or `resolveAssignment`'s `referenceFiles`.

### AR-002: delegation stays Project-only (requirements DEC-012)

- `resolveAssignment(reference)` resolves Project Tasks only: a key or a long Project Task ID.
- An ad-hoc ID or unknown reference fails with `TASK_NOT_FOUND`, as `uniqueTask` does today.
- D-REF's ad-hoc branch serves `update_task` (`updateTaskById`) only. Implementation:
  - `resolveProjectTaskReference(reference)` (ID via `findTask`, else key) is used by `resolveAssignment` and by tool `depends_on`;
  - `resolveTaskReference(reference)` (ad-hoc first, then `resolveProjectTaskReference`) is used by `updateTaskById` only.

### AR-003: the Task page boundary (REQ-022 / AC-026)

The route parameter is a Task reference (a key or a long ID). Exactly one owner resolves it, `useProjectTaskPage`; every consumer uses the canonical `task.taskId` it yields.

- `useProjectTaskPage(projectId, taskReference)`:
  - `task = list.find(t => t.taskKey === ref || t.taskId === ref)` (key compare case-insensitive);
  - exposes `taskId = computed(() => task.value?.taskId ?? null)`;
  - after load, if the match was not by the exact key, calls `router.replace` to the key URL (`taskPagePath`, same query and edit suffix).
  - Because the page `:key` includes the route parameter, this remounts the page once. That is accepted: it only happens for old long-ID links, and the Project list is already cached.
- `ProjectTaskDetail.vue`:
  - prop renamed `taskReference`;
  - the context client is created from the resolved `task.taskId` once `task` resolves (computed or watch-once), not from the prop at setup;
  - delete uses `task.value.taskId`;
  - `detailTarget` uses `taskPagePath(projectId, task)`;
  - children (`TaskContextFiles`, `TaskRootSection`, `TaskDependenciesSection`, chip) receive the resolved task;
  - not-found and loading states unchanged.
- `ProjectTaskEditor.vue`: prop `taskReference`; lookup through the same composable; passes the resolved `task` (canonical) to `ProjectTaskDraftEditor`, whose `detailTarget` uses `taskPagePath`.
- `pages/projects/[id]/tasks/[taskId]/index.vue` and `edit.vue` pass `route.params.taskId` as `taskReference` (the folder name stays `[taskId]`, so no route change).
- Switched uses:
  - detail context client;
  - detail delete;
  - detail and editor lookup;
  - `detailTarget` / edit links;
  - draft-editor targets.
- Unchanged: the right panel, which holds `taskId` internally.

### AR-004: a deleted current Task in texts (requirements DEC-013)

- `referenceOf(location)` returns `string | null`: the key for an existing Project Task, the ID for an existing Temp task, and null when the Task no longer exists.
- The text builders render null as "a deleted Task" (e.g. "This task agent still works on a deleted Task. …"). The rest of each sentence is unchanged.
- Follow-up FU-004: that refusal still advises setting the current Task to DONE or CANCELLED, which is impossible for a deleted Task. This is pre-existing, outside this ticket's scope.

### REC-005 (accepted): refusal order in `assignToExistingCopy`

- The reference is resolved first (`resolveAssignment`, which also refuses DONE / CANCELLED), then `refuseCopyOutsideTree` and the copy checks run.
- So when both the Task and the copy are wrong, the Task refusal now comes first. This is intended: the Task named by the agent is checked before the copy.
- Pin it with a unit test (copy outside the tree + unknown key → `TASK_NOT_FOUND`; copy outside the tree + DONE Task → the closed-Task refusal).

### REC-006 (accepted): case-insensitive keys

- The resolver lower-cases a key reference (`toLowerCase()`) before matching prefixes and keys. Prefixes and keys are stored lower-case.
- Long IDs are matched exactly.

### Follow-ups (additions)

- FU-004: the "still works on a deleted Task" refusal advises an impossible step (pre-existing).
