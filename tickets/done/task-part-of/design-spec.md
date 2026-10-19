# Design Spec — Task relationships step 2: "part of"

## Solution And Approval Basis

- Current solution revision ID: `SR-005` (design round over the SR-004 requirements)
- Approved requirements baseline: `requirements-doc.md` at `SR-004`. The `User` approved the model (SR-002, SR-003; quotes in its Document Status). The UI/UX package was approved by the user on 2026-10-19 ("approved").
- Behavior-defining supplements: Product `ui-ux-spec.md` (`/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/task-part-of/ui-ux-spec.md`, Approved), VIS-001–VIS-017, design `c406879`.
- Design status: `Ready`
- Canonical investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-part-of/tickets/in-progress/task-part-of/investigation-notes.md` ("Architecture Investigation Findings" AF-001–AF-009)
- Authorities read (2026-10-19): `references/architecture-design.md`, `references/design-principles.md`; project `DESIGN.md` (root); `autobyteus-server-ts/docs/design/data_migration_guideline.md` (persisted data, sections 1–6); `autobyteus-server-ts/docs/design/collaboration_model.md` (CM-6, Task closure stops runs); step-1 `tickets/done/task-keys-and-dependencies/design-spec.md` (precedent). `references/design-examples.md` not used.
- Project design-principle conflicts or discrepancies: none.

## Current-State Read

Project Tasks are files owned by `ProjectStore` (`task.json` per Task; tolerant projection reader, exact writer). `ProjectTaskService` is the Task subject boundary for GraphQL and agent tools: create, update, delete, views, change publication and status closure. A DONE/CANCELLED write goes through `closeAndWrite`, which closes the Task's agent runs and then asks for their release (CM-6). Step 1 added one stored relation, `dependsOnTaskIds`. Its validation, per-Project lock and delete cleanup live in `TaskDependencyWrites` (`services/task-dependency-writes.ts`) and the pure rule `domain/task-dependencies.ts`. GraphQL has no status mutation, so status changes only through `update_task` (AF-001). The web `projectTaskStore` holds every Task of a Project; board, Task page, tab and editor derive relations from that list. The change feed carries the GraphQL Task shape under a strict server schema. Tool results map stored IDs to keys from the Project list. There is no structural problem. The feature adds one optional stored fact, one more rule over the same lock, a status cascade inside the existing close path, and their contracts and UI.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale: three areas (server Projects domain / store / services; GraphQL, feed and agent-tool contracts; web Projects UI), about 35 files. Server: `models.ts`, a new `domain/task-parts.ts`, `project-errors.ts`, `project-store.ts`, `task-dependency-writes.ts` → `task-relation-writes.ts`, `project-task-service.ts`, `project-tasks.ts` (GraphQL), `project-change-messages.ts`, the tool contract and manifest, plus 3 docs. Web: types, query, codegen, store, draft, a new `utils/projects/taskParts.ts`, 4 new components, 4 changed components, 2 localization files and docs. Tests in both.
- Architectural risk: `High`
- Risk rationale:
  - a changed agent-facing tool contract (`part_of`, `partOf`, `parts`, `closedParts`, and tool descriptions that change agent behavior);
  - extended GraphQL and WebSocket contracts;
  - a concurrency invariant (one level under concurrent writes, shared lock);
  - a new lifecycle effect: one `update_task` closes several Tasks and stops their task agents (CM-6 blast radius).
  - Persistence is low-risk: one optional field, no migration.
- Escalation trigger:
  - any need for a migration or for reading old shapes;
  - any status path other than `update()`;
  - the cascade needing a cross-Task transaction;
  - a requirement to block work on parts;
  - any mixed-version handling.

## Architecture Investigation Evidence

| Source | Path | Observation | Decision Supported | Uncertainty |
| --- | --- | --- | --- | --- |
| AF-001 | `api/graphql/types/project-tasks.ts` | No status mutation in GraphQL | Cascade in the shared `update()` body | None |
| AF-002 | `project-task-service.ts` `update`/`closeAndWrite`; `task-execution-resource-service.ts:closeTask` | Close is per Task; damaged run data throws `TASK_AGENT_RESOURCES_UNAVAILABLE` | Per-part close via `update()`, contained per part | None |
| AF-003 | `task-dependency-writes.ts`, `project-store.ts:withTaskDependencies` | Per-Project lock and delete cleanup for dependencies | One relations owner and lock for both relations | None |
| AF-004 | `project-store.ts` reader / writer | Tolerant reader, exact writer | `partOfTaskId` read as string-or-null, always written | None |
| AF-005 | `project-change-messages.ts` | Strict schema | Add the field | None |
| AF-006 | tool manifest | Key mapping from the Project list | Same for `partOf` / `parts`; search lists once more | None |
| AF-007 | design repo `e5ad9d8..c406879` | Reference store / draft semantics; components | GraphQL: omitted keeps, null clears; port components | type-graphql omitted-vs-null on an input field must be confirmed by a test |
| AF-008 | `collaboration_model.md` CM-6 | Closing a Task stops its runs | Doc sentence for the parent cascade | None |
| AF-009 | migration guideline section 3 | Optional field with truthful absence needs no migration | No migration | None |

## Intended Change

A Project Task stores an optional `partOfTaskId`, another Task of the same Project, one level only. It is validated under the per-Project relations lock and set through GraphQL and the `part_of` tool argument. Parts and progress are derived on the client and in tool results. When `update()` changes a parent's status to DONE or CANCELLED, the service then closes each of its open parts the same way. Deleting a parent clears its parts' `partOfTaskId`. The web renders the approved UI.

## Change Scope (Mandatory)

- In scope: UC-001 to UC-007. Server Projects domain, store, services, GraphQL Project Task types, change messages, agent Project Task tools; web Projects types / query / codegen / store / draft / derivations / components / localization; docs (`autobyteus-server-ts/docs/modules/projects.md`, `autobyteus-server-ts/docs/design/collaboration_model.md` CM-6, `autobyteus-web/docs/projects.md`).
- Deliberately left alone:
  - `depends on` behavior and its UI (REQ-004; only its writer class is renamed and generalized);
  - keys, key URLs, Temp tasks;
  - the Workspaces tree, `taskWorkerTasks`, board lanes, order, search and the Cancelled toggle;
  - the board's meaning-search status line (outside the design baseline);
  - assignment, delegation and reopen rules;
  - no migration and no mixed-version handling (DEC-009).
- Follow-ups:
  - FU-001: the Project Task Manager's tools / skill update (Agent Package Creator; named in the Task).
  - FU-002: the design repository baseline refresh to bring in the meaning-search status line (Product; recorded in their spec).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | REQ / AC | Trigger | Existing Evidence | Change | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User / Contract | REQ-001–004, 011, 013, 018; AC-001–005, 012, 014, 019 | New / Edit task Save; "New part"; `create_task` / `update_task part_of` | INV BEH-001; AF-003, AF-007 | Stored, validated under the relations lock | DS-001, DS-002, DS-008 |
| BEH-002 | User | REQ-007–012, 019; AC-008–013, 020 | Board, Task page, tab | INV; spec | Derived on the client from the list | DS-005, DS-006 |
| BEH-003 | Contract | REQ-013, 014, 017; AC-014, 015, 018 | Tools | AF-006 | `partOf`, `parts`, `closedParts` | DS-007 |
| BEH-004 | User | REQ-006, 019; AC-007, 020 | Delete Task | INV; AF-003 | Parts' parent cleared | DS-004 |
| BEH-005 | System / Contract | REQ-005, 016, 017; AC-006, 018 | `update_task status` | AF-001, AF-002 | Parent close cascades to open parts | DS-003 |
| BEH-006 | Operational | REQ-015; AC-016 | Existing data | AF-004, AF-009 | Absent = no parent | Reader only |

## Relevant Supplemental Task Artifacts

| Artifact | Purpose | Related IDs | Relationship | Status |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/task-part-of/ui-ux-spec.md` | Normative UI | REQ-008–012, 018, 019 | Web implementation follows it exactly | Approved |
| `…/task-part-of/visual-references/VIS-001…VIS-017` | Final references | Same | Visual acceptance | Approved |
| Design repo `/Users/normy/autobyteus_org/autobyteus-web-design`: `git diff e5ad9d8 c406879 -- components composables stores types graphql utils localization` | Reference implementation on the same component sources | Same | Port it, dropping design-only code (`prototype/`, `utils/apolloClient.ts` hooks, `prototype/fixtures/icon-collections.json`, design-only comments) | Reference |

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature`
- Current design issue found: `No` (one naming trigger handled)
- Structural triggers considered:
  - *Responsibility overload*: `project-task-service.ts` is 507 lines. The parent rule goes to a pure domain file and the relations writer, not the service. The service gains only the cascade (about 20 lines), which belongs with its existing closure orchestration.
  - *Capability reuse*: the parent rule needs the dependency lock, delete cleanup and reference resolution that `TaskDependencyWrites` already owns. Reuse and generalize it, rather than add a parallel `TaskParentWrites` with a second lock (two locks would not serialize a parent write against a dependency write; nor is that needed, but one owner for "relations between Tasks of a Project" is clearer).
  - *Naming drift*: the class and lock names say "dependencies" once they also carry parents. Rename them `TaskRelationWrites`, `task-relation-writes.ts` and `withTaskRelations`.
  - *Authoritative boundary*: all writes stay behind `ProjectTaskService`; the cascade reuses `update()`, so closure semantics stay in one place.
  - *Shared-structure tightness*: `TaskAcknowledgementView` gains `partOfTaskId` and `closedPartReferences` only for Project Tasks, like `dependsOnTaskIds`.
- Root cause classification: `No Design Issue Found`
- Refactor needed now: `Yes` (small): rename and generalize `TaskDependencyWrites` into `TaskRelationWrites`, and fold its `forNewTask` / `replace` into one validated-write method.
- Evidence: AF-003; `grep` shows the lock and class are used only by the store, the service, the writer, one store test and the server docs.
- Design response: extend the existing owners; add one pure domain file.
- Refactor rationale: keeps one owner and one lock for Task relations, with honest names.
- Deferrals: none.

## Terminology

- `partOfTaskId`: the stored long ID of a Task's parent; `null` = no parent.
- *Part*: a Task whose `partOfTaskId` names a current Task. *Parent*: a Task named by some part. *Open part*: a part with status TODO or IN_PROGRESS.
- *Relations*: `dependsOnTaskIds` and `partOfTaskId` together.

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths: none (additive). Renamed: `TaskDependencyWrites` → `TaskRelationWrites`; `withTaskDependencies` → `withTaskRelations` (an in-process lock path; nothing on disk).
- Compatibility wrappers, dual paths or legacy fallbacks kept: `None`. No mixed-version handling (DEC-009, the user's).

## Persisted Data / State Transition Decision (Mandatory)

- Stored subject: `<appData>/projects/<projectId>/tasks/<taskId>/task.json`; user node: 6 Projects, 204 Tasks; no file has the field.
- Change: `task.json` gains `partOfTaskId` (string or null).
- Normal reader / writer: `readTaskFile` projects known fields. It reads `partOfTaskId` as a non-empty string, else `null`. `taskFileContent` always writes it (`null` when none). Single owner: `ProjectStore`.
- Semantics under direct use: an absent field truthfully means "no parent". A stored ID that names no current Task is ignored by every reader (REQ-006).
- Constraints: no lockout; never touch real data in tests.
- Decision: `Directly Usable — No Migration`.
- Rationale: guideline section 3, "adding an optional field, provided its absence has a truthful meaning". There is no new required fact and no change of meaning. An existing file gains `"partOfTaskId": null` only at its next ordinary save.
- Guideline checklist (section 2):
  1. Need: none.
  2. Availability: unaffected.
  3. Source shapes: the step-1 shape, read from user data (204 Tasks, none with the field) and the current reader; fixture: one Task file without the field.
  4. Disposition: N/A.
  5. Commit: the existing atomic writer.
  6. Current-only boundary: no old-shape code.
  7. Cost: zero extra passes.
  8. References: `partOfTaskId` is a same-Project Task reference. It is validated at write time under the relations lock; readers ignore dangling IDs; a delete clears it.
  9. Evidence: store key-set tests, a reader test on a file without the field, and an isolated instance on test data.
  10. Lessons: step-1 `dependsOnTaskIds` precedent; review by the architecture reviewer.
- Supported ACs: AC-016.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-001 | New task Save / "New part" / `create_task part_of` | New part on the board; parent's progress | `ProjectTaskService` | Parent validated at create, under the lock |
| DS-002 | Primary | BEH-001 | Edit task Save / `update_task part_of` | Parent replaced or cleared; both parents' parts update | `ProjectTaskService` | One-level rule under concurrency |
| DS-003 | Primary | BEH-005 | `update_task status=DONE/CANCELLED` on a parent | Open parts closed (runs stopped); result lists them | `ProjectTaskService` | The cascade |
| DS-004 | Primary | BEH-004 | Task page Delete | Parts without parent, republished | `ProjectTaskService` → `TaskRelationWrites` | Truthful data |
| DS-005 | Return-Event | BEH-002 | Any committed Task write | Re-derived parts, progress, markers in every open surface | Publisher → web store | Live derived state |
| DS-006 | Bounded Local | BEH-001 | Part-of picker input | Options / chosen row | `TaskPartOfPicker` | Keyboard, one-level exclusions |
| DS-007 | Primary | BEH-003 | `list_project_tasks` / `search_project_tasks` | `partOf` / `parts` keys | Tool manifest over `ProjectTaskService` | Agents read the grouping |
| DS-008 | Bounded Local | BEH-001 | Relations write | Validated write or refusal | `TaskRelationWrites` | Lock → list → rules → write |

## Primary Execution Spine(s)

- DS-001: `New task page (?partOf=<task ID>) / create_task part_of → GraphQL createProjectTask / tool manifest (part_of → service) → ProjectTaskService.create → TaskRelationWrites.write (lock, list, rules) → ProjectStore.createTask (key, task.json with partOfTaskId) → publisher task_upserted → web projectTaskStore → parent card pill / Parts card`
- DS-002: `Edit task Save / update_task part_of → GraphQL updateProjectTask / manifest → ProjectTaskService.updateTask / updateTaskById → TaskRelationWrites.write (lock, list, rules) → update() → ProjectStore.updateTask → publisher → web (old and new parents' Parts recomputed)`
- DS-003: `update_task status=DONE → ProjectTaskService.updateTaskById → update() → closeAndWrite (parent's runs closed, status written, release) → closeOpenParts → for each open part: update(status) → closeAndWrite (part's runs closed, release) → publisher (each Task) → ack { closedParts }`
- DS-004: `Task page Delete → deleteProjectTask → ProjectTaskService.deleteTask → ProjectStore.deleteTask → TaskRelationWrites.removeDeleted (dependents lose the ID; parts lose partOfTaskId; updatedAt kept) → publisher`
- DS-007: `list_project_tasks / search_project_tasks → manifest → ProjectTaskService.listTasks (whole Project) [+ search service] → partOf key / parts keys per Task → result`

## Spine Narratives (Mandatory)

| Spine | Narrative | Nodes | Owner | Off-Spine |
| --- | --- | --- | --- | --- |
| DS-001 | The service normalizes inputs. A tool `part_of` reference is resolved to a same-Project long ID, as `depends_on` is today. When a parent or dependencies are supplied, the relations writer takes the Project's relations lock and reads the Project's Tasks. It applies the dependency rule (a new Task cannot close a loop) and the parent rule (the parent exists in this Project and is not itself a part; a new Task has no parts). The existing create body then runs inside the lock: context prepare, key allocation, `task.json` with `partOfTaskId`. Without relations, create is unchanged (no lock). | service, relations writer, store, publisher, web | `ProjectTaskService` | parent rule, dependency rule |
| DS-002 | When `partOfTaskId` / `part_of` is supplied: a string replaces the parent and null (`""` from the tool) clears it. The writer validates under the lock: not itself; a current Task of this Project; the parent has no current parent; this Task has no current parts (only when setting non-null). Clearing always passes. Then the existing `update()` body writes it. A changed parent is meaningful and bumps `updatedAt`. The same lock call also validates supplied dependencies. | service, relations writer, store | `ProjectTaskService` | parent rule |
| DS-003 | Inside the parent's store updater, `update()` notes whether this write changes the status to DONE or CANCELLED (`current.status !== status`). After the parent's `closeAndWrite` commits and publishes, `closeOpenParts` lists the Project's Tasks. It takes the parts that are TODO / IN_PROGRESS and, one at a time, calls `update()` with the same status and no context change, with cascade off (parts have no parts). Each part's own `closeAndWrite` closes its runs and asks for their release, and each part is published. A part whose close throws (e.g. `TASK_AGENT_RESOURCES_UNAVAILABLE`, or deleted meanwhile) is logged as `TASK_PART_CLOSE_FAILED` with project, parent and part IDs, and skipped. The parent's result never fails because of a part. `update()` returns the keys of the parts it closed. A reopen, a same-status write and a parts-closing write never cascade. | service | `ProjectTaskService` | — |
| DS-004 | After the delete commits, one pass over the Project's Tasks: a Task listing the deleted ID in `dependsOnTaskIds` loses it, and a Task whose `partOfTaskId` is the deleted ID gets `null`. One write per affected Task, `updatedAt` kept, published. A failing cleanup write is logged (`TASK_RELATION_CLEANUP_FAILED`) and never fails the delete; readers ignore dangling IDs. | service, relations writer, store | `TaskRelationWrites` | — |
| DS-005 | Every committed write publishes the Task view, now with `partOfTaskId`. The web store replaces it in the list. `utils/projects/taskParts.ts` recomputes parent, parts, progress and unchoosable IDs. A part becoming Done updates its parent's pill and card with no extra event. | publisher, web store, components | store | derivations |
| DS-007 | The manifest lists the whole Project once (it already does for `list_project_tasks`; `search_project_tasks` adds one `listTasks`). It builds one ID → Task map and, per result Task, `partOf` (the parent's key when it exists, else `null`) and `parts` (keys of Tasks whose `partOfTaskId` is this Task, in key order). | manifest | manifest | relation-key mapping |

## Spine Actors / Main-Line Nodes

GraphQL `ProjectTaskResolver` (transport), tool contract / manifest (transport), `ProjectTaskService`, `TaskRelationWrites`, `ProjectStore`, `ProjectChangePublisher`, web `projectTaskStore`, web components.

## Ownership Map

- `ProjectStore`: files; reader (`partOfTaskId` string or null) and exact writer; the per-Project relations lock (`withTaskRelations`).
- `domain/task-parts.ts` (pure): `normalizePartOf`, `assertParentValid` → `TASK_PARENT_INVALID`.
- `TaskRelationWrites`: resolving tool references to same-Project IDs (dependencies and parent); the validated write under the lock; delete cleanup of both relations.
- `ProjectTaskService`: Task invariants and status closure, including the cascade (`closeOpenParts`) and acknowledgement fields.
- Tool manifest: agent-facing mapping (`partOf`, `parts`, `closedParts` keys).
- Web `utils/projects/taskParts.ts`: derivations; components render.

## Thin Entry Facades / Public Wrappers

| Facade | Owner Behind | Why | Must Not Own |
| --- | --- | --- | --- |
| `ProjectTaskResolver` | `ProjectTaskService` | GraphQL transport | Parent validation; omitted/null semantics beyond passing them on |
| Tool parsers | `ProjectTaskService` | Shape checks only | Same-Project or one-level rules |

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| `services/task-dependency-writes.ts` / `TaskDependencyWrites` | Name no longer matches; owns both relations now | `services/task-relation-writes.ts` / `TaskRelationWrites` | In This Change | Rename with history (`git mv`) |
| `TaskDependencyWrites.forNewTask`, `.replace` | One validated-write method serves create and update for both relations | `TaskRelationWrites.write` | In This Change | — |
| `ProjectStore.withTaskDependencies` (lock path `.task-dependencies`) | Same lock now serializes both relations | `withTaskRelations` (`.task-relations`) | In This Change | In-process path lock; no file on disk matters |
| Dead code in touched files | To be checked by implementation with evidence (Core Principle 7) | — | In This Change | Record any found in the implementation handoff |

## Return Or Event Spine(s)

DS-005: `ProjectStore commit → ProjectTaskService changes.taskChanged → ProjectChangePublisher flush → readTaskChangeView → projectTaskWire (+partOfTaskId) → /ws/projects → web projectTaskStore apply → taskParts derivations → cards / Parts card / Part of card / picker`.

## Bounded Local / Internal Spines

- DS-008 (`TaskRelationWrites.write`): `relations supplied? no → write() | yes → withTaskRelations(projectId) → listTasks → assertDependenciesValid (if supplied) → assertParentValid (if non-null supplied) → write()`.
- DS-006 (`TaskPartOfPicker`): `input / keydown → filter (key or text) + sort newest key + slice(8), excluding itself → mark Tasks that are parts as unchoosable ("Already part of a Task") → active index skips them → Enter / click replaces the chosen parent → close, keep focus`; a Task that has parts shows the has-parts note instead of the search.
- DS-003 inner loop (`closeOpenParts`): `list → open parts → for each: try update(status, cascade off) → collect key | catch → warn, skip`.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk If On Main Line |
| --- | --- | --- | --- | --- | --- |
| Parent rule | DS-001, 002 | `TaskRelationWrites` | Self / unknown / parent-is-part / has-parts | Pure, testable, shared by create and update | Rule drift between paths |
| Relations lock | DS-001, 002 | `TaskRelationWrites` | Serialize relation writes per Project | QR-001 | — |
| Relation-key mapping | DS-007 | Manifest | IDs → keys for `partOf`, `parts`, `dependsOn` | Shared by list, search, acks | Duplication across tool branches |
| Web derivations | DS-005, 006 | Components | Parent, parts, progress, unchoosable IDs | Shared by card, page, tab, picker, delete note | Duplication |

## Ownership Boundaries

- All Task writes, the parent rule and the cascade go through `ProjectTaskService`; GraphQL and tools never call the store or the relations writer directly.
- Only `TaskRelationWrites` (inside the service) takes the relations lock and resolves `part_of` references.
- The cascade calls the service's own `update()`; nothing else writes a part's status on behalf of its parent.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass | Fix If Too Thin |
| --- | --- | --- | --- | --- |
| `ProjectTaskService` | relations writer, store, closure, cascade, publication | GraphQL resolver, tool manifest | Manifest closing parts itself after a parent's `update_task` | Service returns `closedPartReferences` |
| `TaskRelationWrites` | lock, rules, reference resolution, delete cleanup | `ProjectTaskService` only | Service validating parents inline | Add a method |
| `ProjectStore` | files, lock primitive | services | — | — |

## Dependency Rules

- `projects/domain/*` depends on nothing in services or stores; `task-parts.ts` depends only on `project-errors.ts`.
- `TaskRelationWrites` → store, domain rules, `TaskReferences`, change marks.
- Tool manifest → `ProjectTaskService` and the search service only (unchanged).
- Web components → `utils/projects/taskParts.ts` and stores; no component computes parts inline beyond presentation.
- Forbidden: any mixed-version branch; reading a parent across Projects; recursion in the cascade.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity | Notes |
| --- | --- | --- | --- | --- |
| GraphQL `ProjectTask.partOfTaskId: String` (nullable) | Project Task | Read | long ID | — |
| `CreateProjectTaskInput.partOfTaskId: String` (nullable) | Project Task | Set at create | same-Project long ID | Omitted / null = none |
| `UpdateProjectTaskInput.partOfTaskId: String` (nullable) | Project Task | Replace / clear | same-Project long ID | Omitted = keep; null = clear; string = replace |
| Service commands: `CreateProjectTaskCommand.partOfTaskId?: string \| null`, `UpdateProjectTaskCommand.partOfTaskId?: string \| null`; tool commands `CreateTaskWithLocalContextFilesCommand.partOf?: string`, `UpdateTaskByIdCommand.partOf?: string \| null` (references) | — | — | — | `undefined` = keep |
| `TaskAcknowledgementView` `+ partOfTaskId?: string \| null`, `+ closedPartReferences?: string[]` | Project Task | Ack | — | Present only for Project Tasks; `closedPartReferences` only when the call closed parts |
| Error `TASK_PARENT_INVALID` | — | Refusal | — | English message; shown in the editor's error line |
| Tool `create_task part_of` (string, non-empty) | — | Set parent | key (any case) or long ID | — |
| Tool `update_task part_of` (string) | — | Replace; `""` clears | key or long ID | Temp task → `TASK_PARENT_INVALID` |
| Tool results: `list_project_tasks` / `search_project_tasks` tasks `+ partOf: <key> \| null, parts: [<key>]`; `create_task` / `update_task` task `+ partOf: <key> \| null` (Project Tasks), `+ closedParts: [<key>]` (only when it closed parts) | — | Read | keys | No long IDs |
| `/ws/projects` `projectTaskSchema` `+ partOfTaskId: text.nullable()` | Feed | — | — | Strict schema and wire |

## Interface Boundary Check

| Interface | Singular | Identity Explicit | Ambiguity | Action |
| --- | --- | --- | --- | --- |
| GraphQL `partOfTaskId` | Yes | Yes (long ID) | Low | Omitted vs null pinned by a GraphQL test |
| Tool `part_of` | Yes | Yes (reference resolved once) | Low | `""` documented as "clear" |
| Ack `closedParts` | Yes | Yes (keys) | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural | Drift | Action |
| --- | --- | --- | --- | --- |
| Stored parent | `partOfTaskId` | Yes (user's word, beside `dependsOnTaskIds`) | Low | — |
| Tool input | `part_of` | Yes (beside `depends_on`) | Low | — |
| Tool outputs | `partOf`, `parts`, `closedParts` | Yes | Low | — |
| Relations writer | `TaskRelationWrites` | Yes | Low | Renamed from `TaskDependencyWrites` |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision | Why |
| --- | --- | --- | --- |
| Serialize parent writes | `withTaskDependencies` | Extend (rename) | Same per-Project scope |
| Resolve `part_of` references | `TaskReferences.projectTask` via `TaskRelationWrites` | Reuse | Same as `depends_on` |
| Close parts | `update()` / `closeAndWrite` | Reuse | One closure path (CM-6) |
| Delete cleanup | `removeDeleted` | Extend | One pass for both relations |
| Web picker pattern | `TaskDependencyPicker` | New component `TaskPartOfPicker` (as the approved reference) | Single-choice with unchoosable notes and the has-parts state differs from the multi-choice dependency picker; sharing would need a mode flag. Port as designed |

## Subsystem / Capability-Area Allocation

| Area | Concerns | Spines | Decision |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/projects` | rule, store, relations writer, service cascade, views | DS-001–005 | Extend |
| `autobyteus-server-ts/src/api/graphql/types` | transport | DS-001, 002 | Extend |
| `autobyteus-server-ts/src/agent-tools/project-tasks` | tool contract and results | DS-001–003, 007 | Extend |
| `autobyteus-web` Projects | UI, store, derivations | DS-001, 002, 005, 006 | Extend |

## Draft File Responsibility Mapping

See Final File Responsibility Mapping; the draft changed only by folding `forNewTask` / `replace` into `write`.

## Reusable Owned Structures Check

| Logic | Shared File | Owner | Why Shared | Tight | Must Not Become |
| --- | --- | --- | --- | --- | --- |
| Parent rule | `projects/domain/task-parts.ts` | projects | create + update | Yes | A hierarchy framework |
| Relations write | `projects/services/task-relation-writes.ts` | projects | create + update + delete | Yes | A generic graph service |
| Web derivations | `utils/projects/taskParts.ts` | web Projects | card, page, tab, picker, delete note | Yes | A server-call layer |
| Relation-key mapping | local functions in `project-task-tool-manifest.ts` | agent tools | list, search, acks | Yes | — |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning | Redundancy | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| `ProjectTask.partOfTaskId` | Yes | Parts are never stored | Low | — |
| `TaskAcknowledgementView` | Yes | `closedPartReferences` only when non-empty | Low | — |
| Web `ProjectTask.partOfTaskId: string \| null` | Yes | — | Low | Required field |

## Final File Responsibility Mapping

| File | Owner | Concern |
| --- | --- | --- |
| `server/src/projects/domain/task-parts.ts` (new) | domain | `normalizePartOf(raw)` (trimmed string, or null for null / ""), `assertParentValid(taskId \| null, parentId, tasks)` |
| `server/src/projects/domain/models.ts` | domain | `ProjectTask.partOfTaskId`; commands; `TaskAcknowledgementView` fields |
| `server/src/projects/domain/project-errors.ts` | domain | `+ TASK_PARENT_INVALID` |
| `server/src/projects/stores/project-store.ts` | store | reader / writer; `withTaskRelations` |
| `server/src/projects/services/task-relation-writes.ts` (renamed from `task-dependency-writes.ts`) | relations writer | `dependencyIdsOf`, `parentIdOf`, `write`, `removeDeleted` |
| `server/src/projects/services/project-task-service.ts` | Task service | inputs, `update()` patch + cascade (`closeOpenParts`), acks |
| `server/src/api/graphql/types/project-tasks.ts` | transport | field, inputs, mapping |
| `server/src/projects/changes/project-change-messages.ts` | feed | schema + wire |
| `server/src/agent-tools/project-tasks/project-task-tool-contract.ts` | tool contract | `part_of` params, parsers, descriptions |
| `server/src/agent-tools/project-tasks/project-task-tool-manifest.ts` | tool results | `partOf`, `parts`, `closedParts` |
| `server/docs/modules/projects.md`, `server/docs/design/collaboration_model.md` (CM-6) | docs | — |
| `web/types/project.ts`, `graphql/queries/projectTaskQueries.ts`, `generated/graphql.ts` | transport | field; codegen |
| `web/stores/projectTaskStore.ts`, `composables/projects/useProjectTaskDraft.ts` | state | as the reference |
| `web/utils/projects/taskParts.ts` (new) | derivations | as the reference |
| `web/components/projects/TaskPartsSection.vue`, `TaskPartsProgress.vue`, `TaskPartOfMarker.vue`, `TaskPartOfPicker.vue` (new) | UI | as the reference / spec |
| `web/components/projects/ProjectTaskRow.vue`, `ProjectTaskDetail.vue`, `ProjectTaskDraftEditor.vue`, `panel/ProjectsPanelTaskDetail.vue` | UI | integrate |
| `web/localization/messages/en/projects.ts`, `zh-CN/projects.ts` | strings | the 17 spec strings |
| `web/docs/projects.md` | docs | — |

## Applied Patterns

Repository (existing `ProjectStore`); none new.

## Target Subsystem / Folder / File Mapping

As in Final File Responsibility Mapping. Server files stay in their existing folders: the rule in `projects/domain/` beside `task-dependencies.ts`, the writer in `projects/services/`. Web components stay flat in `components/projects/`, as today.

## Folder Boundary Check

| Folder | Depth | Clear | Risk | Note |
| --- | --- | --- | --- | --- |
| `projects/domain` | Domain rules | Yes | Low | Pure functions only |
| `projects/services` | Main-line + owned writer | Yes | Low | As step 1 |
| `web/components/projects` | UI | Yes | Low | Flat, as today |

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| `task.json` | `{"taskId":"project_task_…","projectId":"…","taskKey":"autobyteus-172","description":"…","status":"TODO","dependsOnTaskIds":[],"partOfTaskId":"project_task_0e31…","createdAt":…,"updatedAt":…,"contextFiles":[]}` | Storing `parts` on the parent | One stored fact |
| Parent rule | Refuse: self ("A Task cannot be part of itself."); not current in this Project ("Task 'X' is not a current Task of this Project."); parent is a part ("autobyteus-25 is itself part of autobyteus-3; a part can't have parts of its own."); this Task has parts ("This Task has parts, so it can't be part of another Task."). Clearing is always allowed. A parent whose own `partOfTaskId` names no current Task counts as having no parent | Walking a tree; depth counters | One level only |
| GraphQL update | `{taskId, description, partOfTaskId: null}` clears; omitting the field keeps | Treating null as "keep" | The editor always sends the field (AF-007) |
| Tool update | `update_task task_id="autobyteus-172" part_of="AutoByteus-25"` → `{task:{projectId, taskId:"autobyteus-172", status:"TODO", dependsOn:[], partOf:"autobyteus-25"}}`; `part_of=""` → `partOf: null` | `null` as the clear value (schema-unfriendly for some runtimes) | Agent usability |
| Cascade result | `update_task task_id="autobyteus-25" status="CANCELLED"` → `{task:{…, status:"CANCELLED", dependsOn:[], partOf:null, closedParts:["autobyteus-172","autobyteus-174"]}}` | Silent cascade; failing the whole call when one part fails | REQ-017, QR-005 |
| Cascade trigger | Parent TODO → DONE cascades; DONE → DONE (no change) does not; DONE → TODO does not; DONE → CANCELLED cascades to parts that are still open | Cascading on every terminal write | DEC-018 |
| List result | `{"taskId":"autobyteus-25","status":"IN_PROGRESS","dependsOn":[],"partOf":null,"parts":["autobyteus-172","autobyteus-174"],…}` | `parts` with long IDs | Keys only |
| Tool descriptions | `update_task`: "Setting a Task that has parts to DONE or CANCELLED also sets its open parts the same way (stopping their task agents); closedParts lists them." `create_task` / `update_task` `part_of`: "the taskId of the bigger Task in the same Project this Task is part of; one level only (a part can't have parts); \"\" clears it (update_task)." `list_project_tasks` / `search_project_tasks`: mention `partOf` and `parts` | Long explanations | Existing voice, minimal |

## Backward-Compatibility Rejection Log (Mandatory)

| Mechanism | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Web detecting older nodes and skipping `partOfTaskId` | Mixed versions | Rejected (user, DEC-009) | Desktop app and nodes on the same release |
| Migration writing `partOfTaskId: null` into every file | Uniform shape | Rejected | Tolerant reader; field written at next save |
| Keeping the `TaskDependencyWrites` name as an alias | Smaller diff | Rejected | Clean rename |

## Derived Layering

N/A.

## Change / Refactor Sequence

1. Server domain: `task-parts.ts`, models, error code (+ unit tests for the parent rule: self, unknown, parent-is-part, has-parts, clear, dangling grandparent).
2. Store: reader / writer (+ key-set tests; a file without the field reads `null`); rename the lock to `withTaskRelations`.
3. Relations writer: rename `task-dependency-writes.ts` → `task-relation-writes.ts`; `write` (lock only when relations are supplied), `parentIdOf`, `removeDeleted` for both relations (+ tests, incl. concurrent "B part of A" vs "A part of B": exactly one succeeds).
4. Service: create / update inputs; `update()` patch; cascade `closeOpenParts`; acks (+ AC-001–007, AC-018: runs closed and release requested per part; a failing part is logged and skipped; reopen and same-status writes don't cascade).
5. GraphQL types and change messages (+ `projects-graphql.e2e`: omitted keeps, null clears, refusals).
6. Tool contract and manifest (+ tool tests and E2E: AC-014, AC-015, AC-018 result).
7. Web: types, query, codegen, store, draft, derivations, components (port from the design repo), localization; the tab and page per the spec.
8. Docs: server `modules/projects.md` (model, rules, tool tables), `collaboration_model.md` CM-6 sentence, web `docs/projects.md`.
9. Validation: server and web unit, browser probe against VIS-001–017, isolated Electron instance with test data (TESTING.md), beta release (delivery).

## Key Tradeoffs

- Create with a parent now takes the per-Project relations lock, which serializes such creates in one Project. They are rare, and this is the same lock dependency edits use.
- The cascade closes parts one at a time after the parent commits, not in one transaction. One `update_task` can therefore leave a part open when that part's run data is damaged. The part is logged and left out of `closedParts`, which keeps every other part's closure and the parent's correct and visible. A cross-Task transaction would need machinery nothing else in the store has.
- `search_project_tasks` reads the Project's Task list once more to name parents and parts. That is one read per call, a cost already paid by `list_project_tasks`.

## Risks

- Tool-description wording changes agent behavior. Keep it minimal and in the existing voice; the Project Task Manager's skill update is FU-001.
- One call stops several task agents (the user's decision). `closedParts` makes it visible to the agent.
- The GraphQL omitted-vs-null distinction on an input field must hold in type-graphql. Pin it with a test (AF-007).

## Guidance For Implementation

- Follow the UI/UX spec exactly. Port the design-repo components and drop design-only code (see Relevant Supplemental Task Artifacts).
- The New task page initializes `partOf` from `?partOf=<task ID>` only when that ID names a current Task of the Project in the store's list. Otherwise it starts empty.
- `TaskPartsSection` "New part" links to `/projects/<projectId>/tasks/new?partOf=<taskId>` (page only). It is an internal hand-off between two screens, not a Task link, so the long ID is fine (step-1 key URLs cover Task page links).
- Never accept `parts` from any input. Never cascade from a part to its parent.
- `closedParts` appears in the `update_task` result only when the call closed at least one part.
- Tests assert the written key set of `task.json` (guideline section 3). Use synthesized test data only (TESTING.md).
- Remove dead code found in touched files, with evidence, and list it in the implementation handoff.
