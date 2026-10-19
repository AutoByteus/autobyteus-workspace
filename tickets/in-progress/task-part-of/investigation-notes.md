# Investigation Notes — Task relationships step 2: "part of"

## Investigation Meta

- Package identifier: `task-part-of`
- Request / ticket: Project Task `autobyteus-171` ("Task relationships, step 2: a "part of" relationship between Project Tasks"), delegated by `/project_task_manager` (run id `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) on 2026-10-19, for the user.
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-part-of`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-part-of`, `codex/task-part-of`
- Resolved base remote / branch / revision: `origin/personal` @ `cba6b851227352d6bcefd5a8543ef8e5ba9f550d` (`chore(release): bump workspace release version to 1.5.6-beta.8`), fetched 2026-10-19
- Finalization target remote / branch: `origin` / `personal` (RELEASE.md)
- Bootstrap result: worktree created from freshly fetched `origin/personal`; ticket folder `tickets/in-progress/task-part-of/`.
- Bootstrap blocker: none
- Current solution revision ID: `SR-004`
- Authorities read (requirements reading gate): `references/requirements-engineering.md` (2026-10-19); also `AGENTS.md`, `RELEASE.md` (finalization target), `TESTING.md` (data-safety rules, Docker nodes)
- Investigation status: requirements investigation complete for SR-001; architecture investigation not started (starts after approval).

## Initial Request And Clarifications

- Original request: add a "part of" relationship next to `depends on`: a Task can be part of another Task (its parent). `depends on` says order; `part of` says belonging. Tools (`create_task`, `update_task`) accept the parent; the Task list and `search_project_tasks` show parent and parts; the app shows them on cards, the Task page, the Depends on / Required by area and the board, in step 1's design language. A UI/UX design step (Product Team) first if the interface needs it. Keep it small; no graphs, automatic status changes or notices unless the user asks.
- Clarifications received: none yet. The Task lists six questions to settle with the user, each with a lean: one parent or several (lean: one, a tree); closing the last part closes the parent? (lean: no); what the parent shows; how a part shows its parent; parts when the parent is cancelled; depth limits.
- User-supplied facts and constraints: keys stay as they are; dependencies work as before; first use is cross-node collaboration (`autobyteus-25`) split into slices; the design repository `autobyteus-web-design` keeps the UI baseline and must be updated for this change.
- Initial ambiguity: the six questions; whether Product design is needed (finding: yes, see "Product Design Request Context"); compatibility of mixed versions.

## Product And Domain Understanding

- Product area: Projects (board, Task page, right-panel Projects tab, New / Edit task) and the agent Project Task tools.
- Affected actors or systems: the user; agents using Project Task tools (mainly the Project Task Manager); server Projects persistence, GraphQL and `/ws/projects`; web Projects UI.
- Existing purpose: Project Tasks are business records of work; `depends on` (step 1) records order between Tasks of one Project and only informs.
- Terminology: *parent* = the bigger Task; *part* = a Task that is part of the parent ("part of <parent>"); *parts* = the derived list of a parent's parts.

## Source Log

| Date | Type | Source | Why | Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-19 | Doc | `tickets/done/task-keys-and-dependencies/requirements-doc.md`, `design-spec.md` (step 1) | Precedent, design language, rules | One stored relation (`dependsOnTaskIds`) on the later Task, same Project only, any status, loops rejected, informs only; derived inverse ("Required by"); deleted Task removed from dependents; Temp tasks have none; `TASK_DEPENDENCY_INVALID`; tools take keys or long IDs, return keys | Mirror these rules for `part of` |
| 2026-10-19 | Doc | `autobyteus-web-design/tickets/done/task-keys-and-dependencies/product-ticket.md` (Revision 2026-10-17, ticket `task-keys-off-lists`) | User taste for keys in the UI | The user removed keys from board cards and the tree: "we don't need to show that on the UI… it's only used to link". Keys stay on the Task page chip, dependency rows, badge and picker | A "part of" indicator on cards must respect this taste (Product to design) |
| 2026-10-19 | Code | `autobyteus-server-ts/src/projects/domain/models.ts` | Current Task shape | `ProjectTask { taskId, taskKey, description, status, contextFiles?, dependsOnTaskIds, createdAt, updatedAt }`; no parent | New optional stored fact |
| 2026-10-19 | Code | `src/projects/stores/project-store.ts` | Persistence | Tolerant `readTaskFile` (known fields only; `dependsOnTaskIds` absent → `[]`), exact `taskFileContent` writer; per-Project `withTaskDependencies` lock | Absent parent is directly usable as "no parent"; the exact writer of older builds drops unknown fields |
| 2026-10-19 | Code | `src/projects/domain/task-dependencies.ts`, `services/task-dependency-writes.ts` | Validation pattern | Self / unknown / other-Project / loop rejection; references resolved by `TaskReferences`; delete cleanup keeps dependents' `updatedAt` | Same pattern fits a parent |
| 2026-10-19 | Code | `src/projects/services/project-task-service.ts` | Create / update / delete bodies | Shared by GraphQL and tools; `updateTask` requires at least one change field; `deleteTask` → `dependencies.removeDeleted` | Parent joins these bodies |
| 2026-10-19 | Code | `src/agent-tools/project-tasks/project-task-tool-contract.ts`, `project-task-tool-manifest.ts` | Tool contract | `create_task` / `update_task` take `depends_on`; `list_project_tasks` returns `taskId` (key) and `dependsOn` (keys); `search_project_tasks` returns `{taskId, status, summary, match}` | Add parent input and `partOf` / `parts` outputs |
| 2026-10-19 | Code | `src/projects/changes/project-change-messages.ts` | Feed contract | Server-side strict zod schema for `task_upserted` | Server schema must add the field |
| 2026-10-19 | Code | `autobyteus-web/services/projects/projectChangeFeed.ts` | Client feed parsing | The web only checks `type`; extra task fields pass through | An older desktop app tolerates a newer server's extra field |
| 2026-10-19 | Code | `autobyteus-web/graphql/queries/projectTaskQueries.ts` | Client query | `ProjectTaskFields` selects every field explicitly (incl. `taskKey`, `dependsOnTaskIds`) | A newer desktop app querying a new field fails against an older server (GraphQL validation), as in step 1 |
| 2026-10-19 | Code | `autobyteus-web/utils/nodeCapabilityProbe.ts` | Version / capability negotiation | Only a health probe (terminal, file streaming); no server version or Projects capability check | No mixed-version mechanism exists today |
| 2026-10-19 | Doc | step 1 `release-deployment-report.md` "Risks" / design-spec "Risks" | Mixed-version precedent | "Both ship together in the desktop app; remote nodes on mixed versions are out of scope." Docker images ship with every release tag | Same policy proposed (DEC-009) |
| 2026-10-19 | Code | `autobyteus-web/utils/projects/taskDependencies.ts`, `components/projects/TaskDependenciesSection.vue`, `TaskDependencyBadge.vue`, `TaskDependencyPicker.vue` | Web derivation and UI pattern | Derived lists from the Project's full Task list held by `projectTaskStore`; rows key · status pill · summary | Parts and "Part of" can be derived the same way; no extra requests |
| 2026-10-19 | Doc | `autobyteus-web/docs/projects.md` | Current documented UI | Board lanes To Do / In Progress / Done (+ Cancelled toggle), flat cards, semantic search; cards show no key | Board stays flat (DEC-008) |
| 2026-10-19 | Data | `~/.autobyteus/server-data/projects/*` (read-only, counts only) | Real usage | 6 Projects, 204 Tasks (DONE 90, TODO 86, IN_PROGRESS 16, CANCELLED 12); 15 Tasks use `dependsOnTaskIds`; descriptions carry "Follow-up C-10 of autobyteus-71 …" notes; this ticket is `autobyteus-171`; `autobyteus-25` (cross-node collaboration) is TODO and parked | Real need for grouping; follow-ups of Done Tasks exist (parent of any status) |
| 2026-10-19 | Other | Step 1 Task structure | Depth evidence | "Task relationships" → step 1 → design Task `autobyteus-44` + build Task `autobyteus-113` | Real work already has 3 levels (DEC-004) |
| 2026-10-19 | Web | Industry practice (Jira sub-tasks / epics, Linear sub-issues, GitHub sub-issues) | Recommendation basis | All use one parent per item (a tree); none closes the parent automatically by default (Linear offers it as an opt-in setting); GitHub and Linear allow nesting (GitHub up to 8 levels); progress shown as "done / total" on the parent | DEC-001, DEC-002, DEC-004, DEC-005 |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Trigger / Contract | Current Path | Current Outcome / Invariants | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User / Contract | New / Edit task; `create_task` / `update_task` | No current supported behavior: no "part of" relation exists | Grouping only by prose in descriptions | models.ts; tool contract | High |
| BEH-002 | User | Board, Task page, tab | Cards: summary, preview, files, worker, dependency badge; Task page: status, key chip, description, Dependencies card (Depends on / Required by), context, Assigned to | No parent / parts shown | `ProjectTaskRow.vue`, `ProjectTaskDetail.vue`, `TaskDependenciesSection.vue`; docs/projects.md | High |
| BEH-003 | Contract | `list_project_tasks`, `search_project_tasks` | Return key as `taskId`, `dependsOn` keys (list only) | No parent / parts | tool manifest | High |
| BEH-004 | User | Delete Task | Task removed; dropped from dependents | — | `project-task-service.ts:deleteTask` | High |
| BEH-005 | System | Status DONE / CANCELLED | Closes the Task's task agents and asks them to stop | Status changes have runtime effects | `closeAndWrite` | High |

## Relevant Codebase And Technical Facts

| Path | Responsibility | Requirement Implication | Architecture Question |
| --- | --- | --- | --- |
| `src/projects/stores/project-store.ts` | `task.json` reader / writer | Absent parent = none; no migration needed (to be confirmed in design under the migration guideline) | Field name and lock reuse |
| `src/projects/services/task-dependency-writes.ts` | dependency validation + delete cleanup | Same rules for parent: self, unknown, other Project, loop; delete cleanup | Shared lock vs. own lock; one relations helper or two |
| `src/agent-tools/project-tasks/*` | tool contract + results | New input; new result fields | How to clear a parent through a tool |
| `src/projects/changes/project-change-messages.ts` | strict feed schema | New field in schema and wire | — |
| `src/api/graphql/types/project-tasks.ts` | GraphQL | New field and inputs | Nullable input semantics (omit = keep, null = clear) |
| `autobyteus-web/*` Projects | UI, store, derivations | Derived parts and progress from the store's list | Component placement per Product spec |
| `src/projects/domain/models.ts` `TaskAcknowledgementView` | tool acknowledgement | Carries `dependsOnTaskIds`; would carry parent | — |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- `task.json` (gains an optional parent field); GraphQL `ProjectTask` and inputs; `/ws/projects` `task_upserted`; tool results of `list_project_tasks`, `search_project_tasks`, `create_task`, `update_task`; en / zh-CN strings.
- Readers / writers: `ProjectStore`; GraphQL resolver; publisher; web `projectTaskStore`; tool manifest.

### Structural Surfaces

- Existing owners suffice: `ProjectTaskService` (Task invariants), `ProjectStore` (files, locks), tool contract / manifest, web Projects store and components.

### Potential Structural Impacts To Investigate

- API / external contract: GraphQL and feed additive fields; tool contract additive argument and result fields.
- Persistence: one optional field; no new required fact.
- Concurrency: loop-free parent writes under concurrent edits (same class as dependencies).
- Migration: likely none (absent = no parent); confirm under the migration guideline in design.
- Confirmed absent: security / privacy boundary change; deployment change.

## Runtime, Probe, Or Reproduction Findings

| Method | Scenario | Observation | Implication | Evidence |
| --- | --- | --- | --- | --- |
| Read-only Python scan (counts only) of the user's Projects folder | Real data shape | 204 Tasks, all keyed; no parent field anywhere | New field starts empty everywhere | Source log row "Data" |

## Stakeholder And User Evidence

| Source | Need | Strength | Implication | Open Question |
| --- | --- | --- | --- | --- |
| User via Task, 2026-10-19 | See a bigger Task with its parts and how many are done; stop "follow-up of X" notes | Direct direction | UC-001–UC-005 | The six questions |
| User, 2026-10-17 (step 1 revision) | Keys only where they link; not on cards or the tree | Direct quote | Card indicator design must respect it | Product |
| User, step 1 | "never prevents work"; informs only | Approved principle | No enforcement, no automatic status changes | — |

## External Contracts, Standards, And Dependencies

| Contract | Authority | Constraint | Evidence | Risk |
| --- | --- | --- | --- | --- |
| Data migration guideline | `autobyteus-server-ts/docs/design/data_migration_guideline.md` | Decides migration vs direct use | Step 1 design | Low (optional field) |
| GraphQL / feed | server types + `project-change-messages.ts` | Additive fields | — | Mixed versions (DEC-009) |

## Persisted Data And State Facts

- Affected subject: `<appData>/projects/<projectId>/tasks/<taskId>/task.json`.
- Shape: step 1 shape plus an optional parent Task ID (stored long ID, like `dependsOnTaskIds`).
- Volume: user node 6 Projects, 204 Tasks.
- Readers / writers: `ProjectStore` only (tolerant reader, exact writer).
- Unknown / extra fields: current and released readers ignore unknown fields; released exact writers drop them when they rewrite a Task.
- Must be preserved: every existing field and file; dependencies unchanged.
- Acceptable loss: after a rollback to an older build, a Task the older build rewrites loses its parent (older builds do not know the field). Re-setting is manual.
- Remaining evidence gap: none for requirements.

## Product Design Request Context

- Product Design request in the current input: `Present` (conditional). The delegated Task (the user's direction) says: "A UI/UX design step first (Product Team) if the Solution Designer finds the interface needs it", and "The UI/UX design repository (autobyteus-web-design) keeps the baseline: update it for this change, as the user asked for earlier changes."
- Finding: the interface needs it. New visible elements on four approved surfaces (card, Task page / tab Task view, the Dependencies card, New / Edit task), new strings in en / zh-CN, and a card indicator that must respect the user's "keys only where they link" taste. Step 1's visible details were user-approved through Product Team design, and the design repository baseline must be updated by its owner.
- User's requested outcome (own terms): "see a bigger Task with its parts, how many parts are done"; "Task cards, the Task page, the Depends on / Required by area, and the board; follow the approved design language of step 1".
- Requirement / behavior IDs involved: REQ-008 to REQ-012; BEH-002.
- Product decision to design: placement and look of "Part of" on a part (card, Task page, tab), the parts list and progress on a parent (card, Task page, tab), the parent field on New / Edit task, how the Dependencies card holds both relations, the parent-delete confirmation wording, en / zh-CN strings.
- Critical journeys and states: SCN-001 to SCN-007 of the requirements doc; parent with 0 / some / all parts done; Cancelled parts; a part whose parent is Done / Cancelled; long parent summaries; tab (compact) and page.
- Constraints and non-goals: requirements doc Scope Guardrail.
- Existing context: approved step-1 spec `autobyteus-web-design/tickets/done/task-keys-and-dependencies/ui-ux-spec.md` and its 2026-10-17 revision (`task-keys-off-lists`); design repo `personal@e5ad9d8` (baseline refreshed to autobyteus-web `2f21134`, v1.5.6-beta.1).
- Product Design request artifact: to be written after the user settles the model questions (requirements doc "Decisions").
- Established design repository: `/Users/normy/autobyteus_org/autobyteus-web-design` (Product-owned).

## Product Design Findings

- Product Design package path: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/task-part-of/` (`product-ticket.md`, `ui-ux-spec.md`, `visual-references/`)
- UI reference source: design repository `personal@c406879`. Reference components: `components/projects/TaskPartsSection.vue`, `TaskPartsProgress.vue`, `TaskPartOfMarker.vue`, `TaskPartOfPicker.vue`; changed `ProjectTaskRow.vue`, `ProjectTaskDetail.vue`, `ProjectTaskDraftEditor.vue`, `panel/ProjectsPanelTaskDetail.vue`, `composables/projects/useProjectTaskDraft.ts`; derivations `utils/projects/taskParts.ts`; `partOfTaskId` in types, query, store and generated GraphQL. Design-only: `prototype/task-part-of/`, `prototype/source-observation/fixtures.mjs`, `utils/apolloClient.ts` hooks.
- Approved UI/UX specification: `ui-ux-spec.md` (Approved 2026-10-19)
- Review URL: `corepack pnpm dev --port <port>` → `/projects/project-desktop-app`
- User-confirmation reference: the user replied "approved", 2026-10-19
- Journeys validated: UXJ-001 to UXJ-006; PART-001 to PART-009 checks passed (56/56), plus the step-1 checks 14/14
- Final visual references: VIS-001 to VIS-017 (34 images)
- Product decisions supported: one card, either "Part of" or "Parts", between Description and Dependencies; card pill and "↳ Part of <key>" line; picker greys out Tasks that are parts; extras: "New part", close hint, delete note
- Alternatives rejected: parts inside Dependencies; board grouping; a progress bar; the parent's summary on a card; a coloured "Part of" pill; a closing notice
- Mocked boundaries: the server refusals and the REQ-016 cascade are not simulated; the reference stores `partOfTaskId` (omitted keeps it, null clears it)
- Requirements sections affected: UI section, REQ-008–REQ-012, REQ-018, REQ-019 (SR-004)

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/task-part-of/ui-ux-spec.md` + `visual-references/` VIS-001–017 | Product | Normative UI of this ticket | Projects UI | REQ-008–012, REQ-018, REQ-019 | Approved (`c406879`) | User 2026-10-19 |
| `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/task-keys-and-dependencies/ui-ux-spec.md` | Product | Step-1 design language (reference, not this ticket's spec) | Projects UI | REQ-008–012 | Approved (step 1) | Not a supplement of this ticket; reference only |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RSK-001 | Risk | New desktop app against an older remote / Docker node: the Projects board query fails on the new field | Explicit field selection, no version negotiation | User (DEC-009): unsupported; desktop and nodes are kept on the same release by the user; no compatibility code | Closed |
| RSK-002 | Risk | Rollback: older builds drop the parent when they rewrite a Task | Exact writers | Accepted; mixed versions unsupported (DEC-009) | Closed |
| UNK-001 | Unknown | The user's answers to DEC-001 to DEC-006 | Product direction | User | Open |

## Architecture Investigation Findings

Gathered 2026-10-19 after the SR-004 approval. Design reading gate: `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (root), `autobyteus-server-ts/docs/design/data_migration_guideline.md` (sections 1–6), `autobyteus-server-ts/docs/design/collaboration_model.md` (CM-6).

| ID | Source | Finding | Design Implication |
| --- | --- | --- | --- |
| AF-001 | `src/api/graphql/types/project-tasks.ts` | `UpdateProjectTaskInput` has no `status`; the resolver says "There is deliberately no status mutation here". Status changes only through `updateTaskById` (`update_task`) | The REQ-016 cascade is reached only by `update_task`; put it in the shared `update()` body so every status path, present and future, cascades |
| AF-002 | `project-task-service.ts` `update()` / `closeAndWrite()`; `task-execution-resource-service.ts:closeTask` | A DONE/CANCELLED write closes the Task's runs under `resources.serialize(taskId)` and then asks for release. `closeTask` throws `TASK_AGENT_RESOURCES_UNAVAILABLE` when that Task's run data is damaged (DESIGN.md rule 7 containment) | Close each open part through the same `update()` body, one part at a time after the parent commits; a part that fails is logged and skipped, never blocks the parent or the other parts |
| AF-003 | `task-dependency-writes.ts`, `project-store.ts:withTaskDependencies` | Per-Project in-process path lock (`.task-dependencies`) serializes dependency validation + write; `removeDeleted` cleans dependents after a delete, keeping `updatedAt` | The parent rule needs the same lock (one level under concurrency, QR-001), including for create with a parent; generalize into one "relations" owner. Callers: the store, the service, `task-dependency-writes.ts`, `tests/unit/projects/project-store-task-keys.test.ts`, `docs/modules/projects.md` |
| AF-004 | `project-store.ts` `readTaskFile` / `taskFileContent` | Tolerant projection reader; exact writer that always writes `dependsOnTaskIds` | `partOfTaskId`: reader → non-empty string or null; writer always writes it (null when none) |
| AF-005 | `project-change-messages.ts` | Strict zod `projectTaskSchema`; `projectTaskWire` picks fields | Add `partOfTaskId: text.nullable()` to both |
| AF-006 | `agent-tools/project-tasks/*` | Parsers shape-check `depends_on`; the manifest maps IDs to keys from the Project list; `search_project_tasks` maps only the matches | `part_of` parsing; `partOf` / `parts` mapping needs the Project list in search too (one extra `listTasks`) |
| AF-007 | `autobyteus-web-design` `git diff e5ad9d8 c406879` | The reference adds `TaskPartsSection`, `TaskPartsProgress`, `TaskPartOfMarker`, `TaskPartOfPicker`, `utils/projects/taskParts.ts`; the store sends `partOfTaskId` on update whenever the draft has a value or null (null clears), on create only when set; the draft initializes from `parentOf(saved)` or `?partOf=<task ID>` | GraphQL update input: omitted keeps, null clears, a string replaces; server validation runs on every edit of a Task with a parent (cheap, under the lock) |
| AF-008 | `docs/design/collaboration_model.md` CM-6 | "Closing the Task (DONE or CANCELLED, with `update_task`) stops its delegated runs." | One added sentence: closing a parent Project Task also closes its open parts (and so their runs) |
| AF-009 | Migration guideline section 3 | "adding an optional field, provided its absence has a truthful meaning" needs no migration | `Directly Usable — No Migration` |

## Requirement Implications

- One stored relation on the part (parent ID), derived parts on the parent, like `depends on` / "Required by" in step 1: one fact, no duplication, live derivation from the list the store already holds.
- DONE / CANCELLED stop task agents (BEH-005): any automatic status change of a parent or its parts would stop agents' work as a side effect. This strongly supports "no automatic closing" (DEC-002) and "parts untouched when the parent is cancelled" (DEC-003).
- Real data already has three levels of grouping and follow-ups of Done Tasks, so nesting (DEC-004) and a parent of any status (DEC-007) are needed.
- The user's key taste (keys only where they link) constrains the card design: Product decides.

## Notes For Architecture Design

- Verify the migration decision for an optional field under the data migration guideline.
- Reuse `TaskReferences` for tool inputs; decide whether the parent shares the dependency lock.
- Decide how a tool clears a parent.
- Mixed versions: none supported (DEC-009, the user): no compatibility code in either direction; an absent field means no parent.
