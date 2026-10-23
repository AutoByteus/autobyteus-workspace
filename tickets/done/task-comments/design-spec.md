# Design Spec — Task comments

## Solution And Approval Basis

- Current solution revision ID: `SR-013` (SR-012 design; SR-013 aligns the work-text example with DEC-012 / DEC-024 after ARCH-REV-001)
- Approved requirements baseline: `requirements-doc.md` at `SR-013` (SR-011 plus editorial alignment and DEC-025), approved by the `User` on 2026-10-22 ("Okay, cool. I agree. Look good …"). The decisions are quoted in DEC-001 to DEC-024.
- Behavior-defining supplements: none. The UI follows the existing Task-page card language (DEC-005).
- Design status: `Ready`
- Canonical investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-comments/tickets/in-progress/task-comments/investigation-notes.md` (AF-001–AF-009; Part 2 findings P2-* belong to the separate Part 2 Task)
- Authorities read (2026-10-22): `references/architecture-design.md`, `references/design-principles.md`, `references/ticket-scope.md`, `references/finding-the-cause.md`; project `DESIGN.md` (root, incl. rule 9), `autobyteus-server-ts/docs/design/data_migration_guideline.md`; `references/design-examples.md` not used.
- Project design-principle conflicts or discrepancies: none.

## Current-State Read

A Project Task is one `task.json`, owned by `ProjectStore`: tolerant projection reader, exact writer, locked read-modify-write per Task. `ProjectTaskService` is the Task boundary for GraphQL, the agent tools and the collaboration runtime (`TaskExecutionResourcePort`). Its shared `update()` body applies a patch, bumps `updatedAt` on a meaningful change, closes runs on DONE / CANCELLED and cascades to open parts. The tool manifest maps views to agent-facing results. The search service's exact tier matches description text; the board and `search_project_tasks` share it. Delegation of a saved Task builds the work text from `resolveAssignment`'s description. There is no structural problem: comments are one more optional fact on the Task, one more patch field, and their reads.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale: about 25 files within existing owners.
  - Server: models, a new `domain/task-comments.ts`, errors, store, service, part closure, the GraphQL type, change messages, the tool contract and manifest, the search service, the work-text builder and the port type.
  - Web: types, query / mutation / codegen, store, a new `TaskCommentsSection.vue`, two Task views, en / zh-CN.
  - Docs (3) and tests.
  - No new owner or subsystem.
- Architectural risk: `High`
- Risk rationale:
  - material contract changes: the agent tool (`update_task add_comment`, `partsNotClosed`, list / search fields), GraphQL (field and a new mutation), the strict `/ws/projects` schema, and the delegated-work text every task agent receives;
  - a persisted field (no migration).
- Escalation trigger:
  - any need for a migration or old-shape reading;
  - comments needing their own file or lock;
  - changing meaning-search items;
  - any notification to runs;
  - any edit / delete.

## Architecture Investigation Evidence

| Source | Path | Observation | Decision Supported | Uncertainty |
| --- | --- | --- | --- | --- |
| AF-001 | `project-store.ts` | Locked per-Task write | Comments in `task.json` | None |
| AF-002 | `project-task-service.ts` | Shared `update()`; 481 lines | Patch field; rules in a domain file | None |
| AF-003 | GraphQL types | `description` required on update | New mutation for the app | None |
| AF-005 | tool contract / manifest / part closure | — | `add_comment`, `partsNotClosed` | None |
| AF-006, AF-007 | search service; web search | One exact rule for agents and the board | Comments in the exact tier | None |
| AF-008 | port, lifecycle, `taskBodyLines` | Both delegation paths use `resolveAssignment` | `comments` in the port result | None |

## Intended Change

`task.json` gains `comments: [{id, createdAt, text}]`. `update_task add_comment` and a GraphQL mutation append one comment through the shared `update()` body. Reads expose the thread to the app (full) and to agents (texts only). Exact search covers comment text. Delegated work lists the comments after the description. `update_task` reports parts a parent close left open.

## Change Scope (Mandatory)

- In scope: UC-001 to UC-004, UC-006, UC-007. Areas:
  - server: Projects domain, store, services, search exact tier, GraphQL Project Task types, change messages, Project Task tools, the collaboration work-text builder and port type;
  - web: Projects types, queries, store, Task page and tab Task view, localization;
  - docs: `autobyteus-server-ts/docs/modules/projects.md`, `docs/modules/agent_tools_mcp_server.md`, `autobyteus-web/docs/projects.md`.
- Deliberately left alone:
  - meaning search items and the embedding index (FU-001);
  - notification of running workers (FU-002);
  - editing and deleting comments (DEC-001);
  - every other tool result's empty fields (`autobyteus-260`);
  - Part 2 (its own Task);
  - Temp tasks, board cards, the Workspaces tree.
- Follow-ups: FU-001, FU-002 (`follow-ups.md`).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | REQ / AC | Trigger | Evidence | Change | Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract / User | REQ-001, 002, 004–006, 010; AC-001–003, 008 | `update_task add_comment`; the Task page's add | AF-001–003 | Append under the Task lock | DS-001, DS-002 |
| BEH-002 | User | REQ-007, 014; AC-003, 004, 012 | Task page / tab | AF-004 | Thread card, live | DS-004 |
| BEH-004 | Contract | REQ-008; AC-005 | list / search | AF-006, AF-007 | Texts; count; exact tier | DS-005 |
| BEH-006 | Contract | REQ-011; AC-009 | Parent close | AF-005 | `partsNotClosed` | DS-006 |
| BEH-007 | Contract | REQ-012; AC-010 | `delegate_task task_id` | AF-008 | Comments in the work text | DS-003 |
| — | Operational | REQ-013; AC-011 | Existing data | AF-001 | Absent = none | Reader |

## Relevant Supplemental Task Artifacts

None (DEC-005). Visual language: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/task-part-of/ui-ux-spec.md` (the Parts card) as the style reference.

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature`
- Current design issue found: `No`
- Structural triggers considered:
  - *Responsibility overload / size*: `project-task-service.ts` is 481 lines. The comment rules (normalize text, next ID, append) go to `domain/task-comments.ts`; the service only threads the patch and adds `addComment(projectId, taskId, text)` for GraphQL. Implementation keeps the file under 500 lines, or moves code as the size guardrail requires.
  - *Capability reuse*: the store's per-Task lock serializes appends; no new lock or file.
  - *Authoritative boundary*: GraphQL and tools reach comments only through `ProjectTaskService`.
  - *Shared structure*: the port's `resolveAssignment` result gains `comments: string[]` (texts, ordered), its single meaning for work text.
- Root cause classification: `No Design Issue Found`
- Refactor needed now: `No`
- Evidence: AF-001 to AF-008.
- Design response: extend existing owners; one pure domain file and one web component.
- Deferrals: none.

## Terminology

- *Comment*: `{id, createdAt, text}`; `id` is the Task-local number; append-only.

## Legacy Removal Policy (Mandatory)

- Obsolete paths: none.
- Compatibility wrappers or fallbacks: `None` (DESIGN.md rule 9).

## Persisted Data / State Transition Decision (Mandatory)

- Stored subject: `task.json` (309 files on the user's node, none with comments).
- Change: `comments` (array of `{id: positive integer, createdAt: ISO string, text: non-empty string}`, in ID order).
- Reader: keeps well-formed entries (positive integer `id`, non-empty strings), sorted by `id`; absent or invalid → `[]`.
- Writer: always writes `comments` (an empty array when none), like `dependsOnTaskIds`; tests assert the key set.
- Semantics: absent = no comments, which is truthful.
- Decision: `Directly Usable — No Migration` (guideline section 3: optional field with truthful absence).
- Rollback (guideline "Rolling back after a migration"): no migration. An older build ignores `comments`, and drops them when it rewrites a Task (ordinary writer change; nothing is engineered for rollback).
- Guideline checklist:
  1. Need: none.
  2. Availability: unaffected.
  3. Source shapes: the current `task.json` (with `partOfTaskId`), from the user's data read-only and the current reader; fixture: a file without `comments`.
  4. Disposition: N/A.
  5. Commit: the existing atomic writer.
  6. Current-only boundary: no old-shape code.
  7. Cost: none.
  8. References: none (comments reference nothing).
  9. Evidence: store key-set and reader tests.
  10. Review: the architecture reviewer.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-001 | `update_task add_comment` | Comment stored; Task republished; ack | `ProjectTaskService` | Agent path |
| DS-002 | Primary | BEH-001 | Task page "Add" | Comment stored; every open view updated | `ProjectTaskService` | App path |
| DS-003 | Primary | BEH-007 | `delegate_task task_id` | Work text with comments | `ProjectTaskService.resolveAssignment` → lifecycle | Worker sees directions |
| DS-004 | Return-Event | BEH-002 | Committed comment | Thread re-rendered in open views | Publisher → web store | Live |
| DS-005 | Primary | BEH-004 | list / search | Texts, count, exact matches | Manifest / search service | Agent read |
| DS-006 | Primary | BEH-006 | `update_task status` on a parent | `closedParts` + `partsNotClosed` | `ProjectTaskService` / `TaskPartClosure` | 187 |

## Primary Execution Spine(s)

- DS-001: `update_task {task_id, add_comment} → tool parser (string, trimmed, non-empty) → manifest → ProjectTaskService.updateTaskById(addComment) → resolve reference (Temp task → TASK_COMMENT_INVALID) → update() patch → ProjectStore.updateTask (lock: appendComment(task, text, now)) → publisher task_upserted → ack (unchanged fields; + partsNotClosed when applicable)`
- DS-002: `TaskCommentsSection "Add" → projectTaskStore.addComment → GraphQL addProjectTaskComment({projectId, taskId, text}) → ProjectTaskService.addComment → update() patch → store → publisher → every open view`
- DS-003: `delegate_task task_id → lifecycle → port.resolveAssignment → {…, description, comments: [texts]} → buildTaskWorkText / buildExistingCopyTaskMessage → taskBodyLines (Description, Comments, Reference files) → delivery`
- DS-005: `list_project_tasks → manifest → listTasks → per Task: comments.length ? {comments: texts} : nothing`; `search_project_tasks → search service (exact: description or any comment text contains the query) → manifest → commentCount when > 0`
- DS-006: `update_task status=DONE on a parent → update() → closeAndWrite → TaskPartClosure.closeOpenParts → {closed, notClosed} → ack closedParts, partsNotClosed (only when non-empty)`

## Spine Narratives (Mandatory)

| Spine | Narrative | Nodes | Owner | Off-Spine |
| --- | --- | --- | --- | --- |
| DS-001 | The parser shape-checks `add_comment` (a string, trimmed, non-empty, else `TASK_COMMENT_INVALID`), which counts as a change for the patch-required check. The service rejects it for a Temp task before any write. The `update()` patch carries `addComment`. Inside the store's locked updater, `appendComment` adds `{id: max(id) + 1 (1 when none), createdAt: now, text}`. A comment is a meaningful change, so `updatedAt` is bumped. Status, description, context, dependencies and parent in the same call are applied in the same write, so all of it is saved or none. | parser, manifest, service, store, publisher | `ProjectTaskService` | comment rules |
| DS-002 | The app posts `{projectId, taskId, text}`. `ProjectTaskService.addComment` normalizes the text and runs the same `update()` body. The mutation returns the Task, which the store replaces in its list; the feed carries the same change to other views. | web store, resolver, service | `ProjectTaskService` | — |
| DS-003 | `resolveAssignment` returns the Task's comment texts in order. `taskBodyLines` adds, after the description, a "Comments:" block listing the texts as bullets (`- `), oldest first, only when there are comments (no IDs, DEC-024). Both the new-copy and existing-copy paths use it. Temp-task work (no Project) is unchanged. | service, lifecycle, input builder | `ProjectTaskService` (data) / lifecycle (text) | — |
| DS-005 | The manifest adds `comments: [texts]` to a listed Task only when it has comments, and `commentCount` to a search result only when > 0. The search service's exact tier also matches a comment's text (case-insensitive containment). Meaning items stay descriptions, so no reindex is triggered. | manifest, search service | manifest / search | — |
| DS-006 | `closeOpenParts` returns both lists. The ack shows `partsNotClosed` (keys, in key order) only when non-empty. | closure, service, manifest | `ProjectTaskService` | — |

## Spine Actors / Main-Line Nodes

Tool contract / manifest; GraphQL resolver; `ProjectTaskService`; `ProjectStore`; publisher; search service; collaboration lifecycle and input builder; web store and Task views.

## Ownership Map

- `domain/task-comments.ts` (pure): `normalizeCommentText(raw)` → trimmed or `TASK_COMMENT_INVALID`; `appendComment(task, text, now)` → the new Task value; the next-ID rule.
- `ProjectStore`: reader / writer of `comments`.
- `ProjectTaskService`: the patch, the Temp-task refusal, `addComment` for GraphQL, `resolveAssignment` comments.
- Manifest: agent-facing shapes (texts, counts, `partsNotClosed`).
- Search service: exact tier over description and comments.
- `task-execution-input.ts`: the "Comments:" block.
- Web `TaskCommentsSection.vue`: renders the thread and the add box; `projectTaskStore.addComment` sends.

## Thin Entry Facades / Public Wrappers

| Facade | Owner Behind | Must Not Own |
| --- | --- | --- |
| `ProjectTaskResolver.addProjectTaskComment` | `ProjectTaskService.addComment` | Text rules |
| Tool parser | `ProjectTaskService` | Temp-task rule; ID allocation |

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| None | Additive | — | — | Implementation removes dead code found in touched files, with evidence |

## Return Or Event Spine(s)

DS-004: `store commit → changes.taskChanged → publisher → projectTaskWire (+comments) → /ws/projects → web store → TaskCommentsSection`.

## Bounded Local / Internal Spines

`TaskCommentsSection` add box: `type → Add (disabled when blank or saving) → mutation → clear box, keep focus | error line (existing pattern)`; Enter adds a line break, and an explicit "Add comment" button posts (multi-line text).

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Risk If Misplaced |
| --- | --- | --- | --- | --- |
| Comment rules | DS-001, 002 | Service | Text, next ID, append | Rule drift between GraphQL and tools |
| Agent result shaping | DS-005, 006 | Manifest | Omit empty | Token waste |

## Ownership Boundaries

- Only `ProjectTaskService` writes comments; tools and GraphQL never call the store.
- IDs and times are set only by `appendComment` under the store lock; never accepted from input.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass |
| --- | --- | --- | --- |
| `ProjectTaskService` | comment rules, store, publication | resolver, manifest, port users | Manifest or resolver allocating IDs |

## Dependency Rules

- `domain/task-comments.ts` → `project-errors.ts` only.
- Collaboration code receives comment texts through the port result only; it never reads Project files.
- Forbidden: a comments file or lock separate from `task.json`; any run notification; any version branch.

## Interface Boundary Mapping

| Interface | Subject | Shape | Notes |
| --- | --- | --- | --- |
| `task.json` `comments` | Task | `[{id, createdAt, text}]` | Always written |
| `ProjectTask` model / view | Task | `comments: ProjectTaskComment[]` | — |
| GraphQL `ProjectTask.comments: [ProjectTaskComment!]!`; `ProjectTaskComment {id: Int!, createdAt: String!, text: String!}` | Task | Read | — |
| GraphQL `addProjectTaskComment(input: {projectId, taskId, text}): ProjectTask!` | Task | App add | `TASK_COMMENT_INVALID` on blank text |
| `/ws/projects` `projectTaskSchema + comments: z.array({id: int, createdAt: text, text: text})` | Feed | — | Strict |
| `update_task add_comment: string` | Tool | Append | Project Tasks only |
| `UpdateTaskByIdCommand.addComment?: string`; `UpdateProjectTaskCommand` unchanged; service `addComment(projectId, taskId, text)` | Service | — | — |
| `list_project_tasks` Task `+ comments: string[]` (only when any) | Tool | Read | Texts, oldest first |
| `search_project_tasks` result `+ commentCount: number` (only when > 0) | Tool | Read | — |
| `update_task` result `+ partsNotClosed: string[]` (only when any) | Tool | 187 | Keys |
| `TaskExecutionResourcePort.resolveAssignment` result `+ comments: string[]` | Port | Work text | Ordered texts |
| Errors `TASK_COMMENT_INVALID` | — | Blank text; Temp task | English messages |

## Interface Boundary Check

| Interface | Singular | Identity Explicit | Ambiguity | Action |
| --- | --- | --- | --- | --- |
| `add_comment` | Yes | Task by `task_id` | Low | — |
| `addProjectTaskComment` | Yes | `projectId` + `taskId` (long ID, as other mutations) | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural | Action |
| --- | --- | --- | --- |
| Stored list | `comments` | Yes | — |
| Tool input | `add_comment` | Yes (the action) | — |
| Ack field | `partsNotClosed` | Yes (beside `closedParts`) | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision |
| --- | --- | --- |
| Serialize appends | `ProjectStore.updateTask` lock | Reuse |
| Live updates | publisher / feed | Extend (field) |
| Work text | `taskBodyLines` | Extend |
| UI card | Parts / Dependencies card style | Reuse style |

## Subsystem / Capability-Area Allocation

| Area | Concerns | Decision |
| --- | --- | --- |
| `autobyteus-server-ts/src/projects` | rules, store, service, search, closure | Extend |
| `src/api/graphql/types` | field, mutation | Extend |
| `src/agent-tools/project-tasks` | param, results | Extend |
| `src/agent-collaboration/execution/task` | work text, port type | Extend |
| `autobyteus-web` Projects | UI, store | Extend |

## Draft File Responsibility Mapping

See the final mapping.

## Reusable Owned Structures Check

| Logic | File | Why Shared | Must Not Become |
| --- | --- | --- | --- |
| Comment rules | `projects/domain/task-comments.ts` | GraphQL and tools | A thread framework |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning | Action |
| --- | --- | --- |
| `comments[]` | Yes | No author, no edit fields |
| Agent `comments: string[]` | Yes | Order = age |

## Final File Responsibility Mapping

| File | Concern |
| --- | --- |
| `server/src/projects/domain/task-comments.ts` (new) | `normalizeCommentText`, `appendComment` |
| `server/src/projects/domain/models.ts` | `ProjectTaskComment`; `ProjectTask.comments`; `UpdateTaskByIdCommand.addComment`; `TaskAcknowledgementView.partsNotClosedReferences?` |
| `server/src/projects/domain/project-errors.ts` | `TASK_COMMENT_INVALID` |
| `server/src/projects/stores/project-store.ts` | reader / writer |
| `server/src/projects/services/project-task-service.ts` | patch, Temp refusal, `addComment`, `resolveAssignment` comments, ack |
| `server/src/projects/services/task-part-closure.ts` | return `{closed, notClosed}` |
| `server/src/projects/search/project-task-search-service.ts` | exact tier includes comments |
| `server/src/api/graphql/types/project-tasks.ts` | type, field, mutation |
| `server/src/projects/changes/project-change-messages.ts` | schema + wire |
| `server/src/agent-tools/project-tasks/project-task-tool-contract.ts` | param, parser, descriptions (`update_task`, `list_project_tasks`, `search_project_tasks`) |
| `server/src/agent-tools/project-tasks/project-task-tool-manifest.ts` | list / search / ack fields |
| `server/src/agent-collaboration/execution/task/task-execution-resource-port.ts`, `task-execution-input.ts`, `root-task-execution-lifecycle.ts` | port type; "Comments:" block; pass comments |
| test fixtures / port fakes | new `resolveAssignment` shape |
| `web/types/project.ts`, `graphql/queries/projectTaskQueries.ts`, `graphql/mutations/projectTaskMutations.ts`, `generated/graphql.ts` | field, mutation |
| `web/stores/projectTaskStore.ts` | `addComment` |
| `web/components/projects/TaskCommentsSection.vue` (new) | thread + add box |
| `web/components/projects/ProjectTaskDetail.vue`, `panel/ProjectsPanelTaskDetail.vue` | place the card after Description, before Part of / Parts |
| `web/localization/messages/en/projects.ts`, `zh-CN/projects.ts` | strings |
| docs (3) | — |

## Applied Patterns

None new.

## Target Subsystem / Folder / File Mapping

As above, in the existing folders.

## Folder Boundary Check

| Folder | Clear | Note |
| --- | --- | --- |
| `projects/domain` | Yes | Pure rules |
| `web/components/projects` | Yes | Flat, as today |

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided |
| --- | --- | --- |
| `task.json` | `"comments":[{"id":1,"createdAt":"2026-10-22T08:15:02.120Z","text":"Dispatched with this direction."}]` | Author, edit fields |
| Tool call | `update_task {"task_id":"autobyteus-259","status":"DONE","add_comment":"Merged and released."}` → `{"task":{"projectId":"…","taskId":"autobyteus-259","status":"DONE","dependsOn":[],"partOf":null}}` | An `addedComment` field |
| List | `{"taskId":"autobyteus-259",…,"comments":["Dispatched with this direction.","User decided: …"]}`; no `comments` when none | `[{id, createdAt, text}]` |
| Search | `{"taskId":"autobyteus-259","status":"IN_PROGRESS","summary":"…","match":"exact","commentCount":2,…}` | `commentCount: 0` |
| Work text | `Description:\n<description>\n\nComments:\n- Dispatched with this direction.\n- User decided: …\n\nReference files:\n- …` | Comments mixed into the description |
| Parent close | `{"task":{…,"closedParts":["autobyteus-245"],"partsNotClosed":["autobyteus-261"]}}` | `partsNotClosed: []` |
| Tool description (`update_task`) | "Optional add_comment (Project Tasks only): text added as a new comment at the end of the Task's comments; the description is not changed. Each call adds one comment." | Long text |
| App | A "Comments" card (section label like "Parts"), rows "#1 · <relative or local time> · text" (full text, wrapped, `whitespace-pre-wrap`), oldest first; "No comments yet." when empty; a textarea with placeholder "Add a comment" and an "Add comment" button (disabled when blank or saving); errors in the existing error line. Strings en / zh-CN: "Comments" / "评论", "No comments yet." / "暂无评论。", "Add a comment" / "添加评论", "Add comment" / "添加评论" (button), "Adding…" / "正在添加…" | A new visual language |

## Backward-Compatibility Rejection Log (Mandatory)

| Mechanism | Decision | Replacement |
| --- | --- | --- |
| Handling older nodes or apps without `comments` | Rejected (DESIGN.md rule 9) | Same release everywhere |
| Migration adding `comments: []` to every file | Rejected | Tolerant reader |

## Derived Layering

N/A.

## Change / Refactor Sequence

1. Domain `task-comments.ts`, models, error code (+ unit tests: next ID, blank, append order).
2. Store reader / writer (+ key set; a file without `comments`; invalid entries dropped).
3. Service:
   - patch and `addComment`;
   - Temp refusal;
   - combined call is atomic;
   - concurrent appends both kept (AC-001, 002, 011).
4. Part closure `{closed, notClosed}` and the ack (AC-009).
5. Search exact tier (AC-005).
6. GraphQL type and mutation; feed schema (+ GraphQL E2E).
7. Tool contract and manifest (+ tool tests / E2E; AC-001, 005, 008).
8. Port, work text, fixtures (AC-010).
9. Web: types, codegen, store, `TaskCommentsSection`, two views, strings (AC-003, 004, 012).
10. Docs.
11. Validation: unit, probe, isolated Electron instance with test data (AC-013).

## Key Tradeoffs

- Comments live in `task.json`, so each add rewrites the file. Tasks are small (median about 2 KB of description), so this is accepted for one file and one lock.
- No IDs or times in agent results: fewer tokens. An agent cannot refer to a comment by number; nothing needs that now.
- The board's exact search also matches comments (one rule; AF-007; requirements DEC-025, AC-016).

## Risks

- Tool description text affects agents; keep it to the one line.
- Long threads enlarge `list_project_tasks` results. This is accepted: comments are the point; `autobyteus-260` covers wider trimming.

## Guidance For Implementation

- Never accept an ID or time from any input.
- `add_comment` with only whitespace is refused, not ignored.
- Keep `project-task-service.ts` under the 500-line guardrail. Put rules in `task-comments.ts`.
- The thread card follows the Parts card's look (`rounded-xl`, slate-200 border, 12 px label) on page and tab; the add box exists on both (REQ-006).
- Tests assert the written key set of `task.json`, and that a combined status + comment call that fails writes nothing.
