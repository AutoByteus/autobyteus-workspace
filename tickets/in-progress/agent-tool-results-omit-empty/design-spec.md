# Design Spec — Agent tool results without empty fields, and a Task title

## Solution And Approval Basis

- Current solution revision ID: `SR-011`
- Approved requirements: [requirements-doc.md](requirements-doc.md) at SR-006, approved by the user on 2026-10-25 in the Solution Designer's conversation ("you know the best I think, you understand the code more than me, I trust your design"), with DEC-009 (a), DEC-013 (existing style), DEC-016 (yes).
- Behavior-defining supplements: `evidence/SD-measure-sizes-output-20261025.txt`, `evidence/SD-measure-summary-output-20261025.txt`, `evidence/SD-first-line-lengths-output-20261025.txt` (in the approval basis).
- Design status: `Ready`
- Investigation notes: [investigation-notes.md](investigation-notes.md)
- Authorities read (2026-10-25): `references/architecture-design.md`, `references/design-principles.md` (whole), `references/design-examples.md` (case studies 1–7), `DESIGN.md` (mandatory rules 1–10, project-specific documents), `GLOSSARY.md`, `autobyteus-server-ts/docs/design/data_migration_guideline.md` (whole), `docs/design-cases.md`, `TESTING.md` (layers, path choice, rules), `autobyteus-server-ts/AGENTS.md`, `autobyteus-web/AGENTS.md`.
- Conflicts or discrepancies: none.

## Current-State Read

- **Tool results.** Every platform tool family has one shared manifest whose `execute` returns a plain object, used by both routes (investigation notes, Architecture Investigation Findings). Each route adapter then serializes that object with its family's own call: compact `JSON.stringify` (Project Task, `get_handoff_rules`, agent discovery, `publish_artifacts` native, `send_message_to`), pretty `JSON.stringify(…, null, 2)` (agent / team definition tools), or `toJsonString(value, 2)` through the family serializers `toBrowserJsonString`, `toTaskDelegationJsonString`, `toMediaJsonString` (browser, delegation, media, `publish_artifacts` MCP). Empty fields are kept in some families, dropped by hand in others (Project Task manifest: `comments`, `commentCount`, `closedParts`, `partsNotClosed`, `attachedContextFiles`), and required as `null` by `send_message_to`'s output schema (`send-message-to-tool-result-contract.ts:17,33,47`).
- **Routes.** The AutoByteus runtime calls tools in process (`autobyteus-ts` registry; object results are stringified by the provider renderers, `native-tool-payload-format.ts:21-41`). Codex, Claude, AGY and Grok call the same tools through the Agent Tools MCP server (backends `codex/`, `claude/`, `antigravity/capsule/agy-mcp-config-materializer.ts`, `grok/`). MCP JSON results carry `content[0].text` and `structuredContent` (`agent-tools-mcp-structured-json-result.ts`); Codex 0.164 gives the model only `structuredContent` (`evidence/SD-codex-0.164-mcp-result-to-model.txt`), Claude one copy (observed).
- **Tasks.** `ProjectTask` has no title (`projects/domain/models.ts:14`); the store's tolerant reader requires `taskKey` and `description` (`stores/project-store.ts:50-57`), the writer emits the exact shape (`:63-65`). Search derives `summary` from the description (`project-task-tool-manifest.ts:68-73,137`); the app derives its one-line labels in `autobyteus-web/utils/projects/taskSummary.ts` (10 users). Temp tasks are a separate model (`domain/ad-hoc-task.ts`). Stored data: 376 Project Task files in 4 released shapes, all with `taskKey`, all with a non-blank trimmed description, none with `title` (`evidence/SD-task-file-shape-inventory-output-20261025.txt`).
- **Constraint.** `projects/services/project-task-service.ts` is 494 lines: adding the title there without a split crosses the 500-line limit.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale (SR-010 adds `get_project_task`, its caller scope on both routes and the first-message line): three packages (`autobyteus-ts`, `autobyteus-server-ts`, `autobyteus-web`) plus one skill in `autobyteus-agents`; ~10 tool families on two routes (≈30 source files), the Project Task model through store, service, GraphQL, change feed, search and app (≈25 files), one new app-data migration.
- Architectural risk: `High`
- Risk rationale: a new tool with a caller-based access rule; changes every platform tool's result contract on both routes (advertised MCP output schemas included), a persisted-data migration of every Project Task file, a new required field on the GraphQL and change-feed Task contracts.
- Escalation trigger: a consumer found that relies on an empty field being present; a released `task.json` shape outside the inventory; a runtime (AGY, Grok) found to show the model both MCP copies with a material cost; any file of the change crossing 500 lines.

## Architecture Investigation Evidence

| Source | Path / reference | Observation | Design decision supported | Uncertainty |
| --- | --- | --- | --- | --- |
| Serialization call sites | investigation notes, Source Log + Architecture Investigation Findings; `grep` list | ~10 owners, three rules | One rule in one function (DS-001) | — |
| Native renderer | `autobyteus-ts/src/llm/prompt-renderers/native-tool-payload-format.ts:21-41` | Strings pass through; objects compact-stringified; third-party results share the path | Do not put the rule in renderers | — |
| Codex MCP conversion | `evidence/SD-codex-0.164-mcp-result-to-model.txt` | Model reads `structuredContent` only when present | Apply the rule to the value both copies come from; keep the two copies (DEC-006) | AGY, Grok unknown |
| Codex payload parser | `autobyteus-server-ts/src/agent-execution/backends/codex/items/codex-tool-payload-parser.ts:477-483` | Reads `structuredContent.error` / `.message` for display | Errors keep `code` and `message` | — |
| `send_message_to` contract | `agent-communication/services/send-message-to-tool-result-contract.ts`; `agent-collaboration/domain/agent-team-collaboration-llm-contract.ts:13`; `docs/modules/agent_communication.md:130-141` | Rejected result requires `target_agent_run_id: null`; tool text and doc state the null rule | Schema, text and doc change together | — |
| `delegate_task` result schema | `agent-team-execution/task-delegation/task-delegation-result-contract.ts` | Optional fields are already absent by schema; `launch_notes` requires ≥ 1 | `toDelegateTaskResult` keeps its schema-shaped construction | — |
| Task store reader / writer | `projects/stores/project-store.ts:50-65` | Tolerant reader requires used fields; exact writer | Reader requires `title`; writer writes it | — |
| Migration precedent | `app-data-migrations/migrations/project-task-keys-v1/` | New required Task fact added per file, atomic replace, re-read validation, per-item dispositions, retry recognizes current files | Same mechanism for titles | — |
| Runner | `app-data-migrations/app-data-migration-runner.ts:80-100,180-195` | `requiredOnStartup` migrations run at start; failure is recorded, startup continues; restart retries | No capability gate; an unconverted Task stays unlisted until retry (contained) | — |
| Task shapes | `evidence/SD-task-file-shape-inventory-output-20261025.txt` | 4 Project Task shapes (123 / 122 / 74 / 57); 15 Temp tasks untouched | Fixtures per shape | Other users' data may hold older shapes that `project-task-keys-v1` already converts first |
| Search exact tier | `projects/search/project-task-search-service.ts:80-81` | Exact match over description + comments | Add the title to the exact tier (DEC-018) | — |
| Task worker view | `projects/services/project-task-service.ts:247`; `api/graphql/types/project-tasks.ts:186-191` | Tree label from `description` | Add nullable `title` (null for a Temp task) | — |
| Guard style | `autobyteus-server-ts/tests/architecture/projects-boundaries.test.ts` | Source-scanning architecture tests | New guard test for result serialization | — |
| Web forms and labels | `autobyteus-web/components/projects/ProjectTaskDraftEditor.vue`, `composables/projects/useProjectTaskDraft.ts`, `stores/projectTaskStore.ts:187-190`, `ProjectEditor.vue:18` (name input style) | Required-field style exists | Title input in that style (DEC-013) | — |

## Intended Change

1. One function owns "leave out empty fields, write compact JSON"; every platform tool's adapters on both routes call it; the old serializers and the hand-written variants go.
2. Project Tasks get a stored `title` (required, not blank, no limit); existing Tasks get one once, at startup, from their first line (≤ 200 characters).
3. `list_project_tasks` returns short entries only; a new `get_project_task(project_id, task_id)` returns one Project Task in full, scoped to the caller's own Task for workers; a worker's first message names its Task and Project; `search_project_tasks` returns `title`; context files become `{name, path}`.
4. The app gets a required Title field and shows titles; "summary" stops naming a Task's one-liner.

## Change Scope (Mandatory)

- In scope: UC-001 to UC-006. Areas: `autobyteus-ts/src/tools/` (the rule; four background-process tools); `autobyteus-server-ts/src/agent-tools/**` (all platform families, MCP helpers), `agent-communication/services/send-message-to-tool-result-contract.ts`, `agent-collaboration/domain/agent-team-collaboration-llm-contract.ts`; `projects/**` (model, store, service split, views, change feed, search exact tier), `api/graphql/types/project-tasks.ts`; a new migration `app-data-migrations/migrations/project-task-titles/`; `autobyteus-web` Task types, GraphQL documents, store, draft, forms, labels, i18n, error keys; docs and `GLOSSARY.md`, `docs/design-cases.md`; `autobyteus-agents` Project Task Manager skill.
- Derived consumers (Principle 11):
  - `ProjectTask` gains `title` → `ProjectTaskView`, GraphQL `ProjectTask`, change-feed `TaskChangeView` (zod schema), `taskBusinessRead` / short entries, search hits, `TaskWorkerTaskView`, web `ProjectTask` type and store, board/row/pickers/markers/tree: each carries or shows `title`.
  - Search exact tier: includes `title`. Meaning index: stays on descriptions (autobyteus-276).
  - Delegated work input (`project-task-service.ts:289` `resolveAssignment`, `task-execution-input.ts` `buildTaskWorkText`): gains `projectId` and one Task line (REQ-017); the title is not added (it would repeat old Tasks' first lines).
  - Member Task capability (`MemberTaskCommandCapability`, 16 files; implementations in `team-root-materializer.ts:67`, `agent-org-execution-scope-builder.ts:64`, `standalone-root-builder.ts:182`, `standalone-host-member-context-builder.ts:65`): gains the read-only `ownedTaskOf(caller)`; renamed `MemberTaskCapability` because it no longer holds only commands (Principle 15).
  - `send_message_to` output schema → MCP `outputSchema` advertisement (catalog maps it): follows the schema.
  - `delegate_task` `resultSchema`: unchanged (already optional-absent).
  - Codex payload parser (`structuredContent.error`): unchanged contract.
- Deliberately left alone: third-party MCP and application tool results; native provider renderers; `TerminalResult.toJSON` (its own result shape, already compliant); which MCP tools carry `structuredContent` (no copy added or removed); Temp tasks (not read by `get_project_task`); meaning search; the worker's reading of other Tasks (own Task only, DEC-022).
- Follow-ups: `None` (no `follow-ups.md` rows).

## `get_project_task` (SR-010 addition)

- **Contract.** `get_project_task(project_id, task_id)`, both required; `task_id` a key (any letter case) or long ID, resolved within `project_id` (a key of another Project → `TASK_NOT_FOUND`). Result: the full Task (`taskFullEntry`): `projectId`, `taskId` (key), `title`, `status`, `description`, `dependsOn`, `partOf`, `parts`, `comments` (texts, oldest first), `contextFiles` `{name, path}`, `assignments`, `closedAssignments` (or `assignmentsUnavailable`); the result rule leaves out empty ones. Added to `PROJECT_TASK_TOOL_NAMES`, so exposure stays opt-in by agent definition (`runtime-agent-tool-exposure.ts:75`).
- **Caller scope (one owner).** `TaskReadScope = { kind: "any" } | { kind: "owned"; owner: TaskExecutionOwner }`, built by one function `taskReadScopeOf(memberExecutionContext)` in `agent-tools/project-tasks/` from `memberExecutionContext?.tasks.ownedTaskOf(identity)`: an owner → `owned`; no member context, or no owner → `any` (a run that is no Task's worker; explicit, not inferred from a failure: `ownedTaskOf` answers "none"). The owner comes from the existing rule `RootTaskExecutionResourceScope.ownerOf(agentRunId)` (`root-task-execution-resource-scope.ts:48`): the caller's containment chain, so a task agent, every member of a task team, and the agents a worker delegated to share their copy's Task.
- **Scope check (in the manifest, one place).** `owned`: the named Task's long ID must equal `owner.taskId`; otherwise `TASK_READ_OUT_OF_SCOPE` with no Task data (`"You work on <key>; you can read only that Task."`; for a Temp task owner: `"Your Task has no Project; get_project_task reads Project Tasks."`). The check runs after resolving the reference within the Project and before building the result. `any`: no check.
- **Routes.** Native: `get_project_task` is created bound to the member like the discovery tools (`autobyteus-agent-tool-resolver.ts:83-95` pattern: a `createBoundGetProjectTaskTool(memberExecutionContext | null)`); the other Project Task native tools stay unbound. MCP: `ProjectTaskToolsMcpAdapterProvider` passes `taskReadScopeOf(session.sender?.memberExecutionContext)` for `get_project_task`. `executeProjectTaskTool(name, raw, scope = ANY)` takes the scope; only `get_project_task` reads it.
- **Service read.** `ProjectTaskService.readProjectTask(projectId, reference)` (key or long ID within the Project) returns the view; the manifest uses `listTasks(projectId)` for relation keys as the list does and `assignments([taskId])`.
- **First message.** `resolveAssignment` returns `projectId` too; `buildTaskWorkText` takes an optional `task: {taskKey, projectId}` and, when given, puts `Task: <key> in Project <projectId>` and `If you have get_project_task, it reads this Task again, including comments added later.` before `Description:`; both saved-Task paths (`root-task-execution-lifecycle.ts:153` new copy, `:191` existing copy) pass it; described work passes none. The existing-copy path builds its message with `buildExistingCopyTaskMessage` (AR-007), which gets the same Task line and keeps its other-open-Tasks sentence. A copy with several open Tasks reads only its current one (the `ownerOf` answer; REQ-015, AR-006).
- **Removed with it:** the `task_ids` form of `list_project_tasks` (never built or released).

## Relevant Behavior And Production-Path Map (Mandatory)

| BEH | Kind | REQ / AC | Trigger | Existing evidence | Change | Target path / spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | REQ-001, REQ-002 / AC-001, AC-002 | Any platform tool call | Current-State Read | One rule, compact | DS-001, DS-002 |
| BEH-002 | User + Contract | REQ-003–REQ-006, REQ-009, REQ-011 / AC-003–AC-005, AC-009 | `create_task`, `update_task`, New / Edit task, startup | models, store, app | Stored title | DS-003, DS-004, DS-005 |
| BEH-003 | Contract | REQ-007 / AC-006 | `list_project_tasks` | manifest | Short entries only | DS-006 |
| BEH-004 | Contract | REQ-008 / AC-007 | `search_project_tasks` | manifest:137 | `title`, `meaningSearch` when not ready | DS-006 |
| BEH-005 | Contract | REQ-014, REQ-013 / AC-012, AC-011 | `get_project_task`; `create_task` / `update_task` acks | manifest `contextFiles`; ack `attachedContextFiles` (`project-task-tool-manifest.ts:54`) | `{name, path}` in both | DS-007, DS-003 |
| BEH-006 | Contract | REQ-014–REQ-017 / AC-012–AC-015 | `get_project_task`; `delegate_task` with a saved Task | no read-one tool; first message without key or Project (`task-execution-input.ts:41-63`) | read one Task; worker scope; first message names Task and Project | DS-007, DS-008 |

## Relevant Supplemental Task Artifacts

| Path | Purpose | REQ / AC | Relationship | Status |
| --- | --- | --- | --- | --- |
| `evidence/SD-measure-*.py`, `-output-20261025.txt` | Before sizes | REQ-010, QR-001 | Before numbers for delivery's after table | Approved basis |
| `evidence/SD-first-line-lengths*` | Title cut | REQ-005 | 200-character derived cut | Approved basis |
| `evidence/SD-task-file-shape-inventory*` | Released shapes | AC-004 | Migration fixtures | Design evidence |
| `evidence/SD-codex-0.164-mcp-result-to-model.txt` | Codex model view | DEC-006 | Keep two copies | Design evidence |

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` (contract) with `Feature` (title).
- Current design issue found: `Yes`.
- Structural triggers:
  - *Repeated coordination / one rule by several callers* (Principle 13; design-examples Case 7): result serialization in ~10 owners with three rules. Fires.
  - *Legacy cleanup* (Principle 8): `json-utils.ts toJsonString` and three family serializers become unnecessary. Fires.
  - *Persisted-data transition* (Principle 5): `task.json` gains a required field. Fires.
  - *Derived data* (Principle 11): `ProjectTask` feeds views, feed, GraphQL, search, app. Fires; inventory in Change Scope.
  - *Vocabulary drift* (Principle 15): "summary" names a Task's one-liner and a reduced view. Fires.
  - *Responsibility overload / size* (Principle 12): `project-task-service.ts` at 494 lines. Fires.
  - *Several kinds or forms* (Principle 1): two routes; Project Tasks and Temp tasks; `get_project_task` callers that work on a Task and callers that do not. Each traced below.
  - *Behavior by absence* (Principle 13): ruled out — a Temp task's label is chosen by its kind (`projectId` null), not by a missing title.
- Root cause: `Duplicated Policy Or Coordination` (results); `File Placement Or Responsibility Drift` risk (service size).
- Refactor needed now: `Yes`.
- Design response: one result-rule owner in `autobyteus-ts`; route adapters call it; old serializers removed; Task text normalization (title, description) moves out of the service into `projects/domain/task-text.ts`, shared by both update paths.
- Intentional deferrals: none.

## Terminology

- **Result rule**: leave out `null`, `undefined`, `""`, `[]` and `{}` (after the same rule applied inside) from every object at any depth; keep `false`, `0` and every other value; array elements keep their positions; the top-level value is never removed.
- **Title**: a Project Task's one-line name, given by its writer (GLOSSARY entry added by this change). **Summary**: a reduced view of something (`listProjectSummaries`, `TaskWorkerTaskSummary`), never a Task's one-liner.
- **Short entry / full Task**: a Task's line in `list_project_tasks`; the whole Task as `get_project_task` returns it.
- **Owned Task**: the Task a caller works on: its run, or the task team it is a member of, or the copy it was delegated work from holds that Task's assignment (`TaskExecutionOwner`).

## Legacy Removal Policy (Mandatory)

- Obsolete: `agent-tools/json-utils.ts`; `toBrowserJsonString`, `toTaskDelegationJsonString`, `toMediaJsonString`; pretty-printing in definition tools; hand-written "absent when empty" spreads in the Project Task manifest; `send_message_to`'s null rule; search's `summaryOf` / `SUMMARY_MAX_CHARS`; the web's derived-summary helpers for Project Tasks.
- Compatibility wrappers, dual paths or fallbacks kept: `None`. No reader falls back to the first line for a Project Task without a title.

## Persisted Data / State Transition Decision (Mandatory)

- Stored subject: `<appData>/projects/<projectId>/tasks/<taskId>/task.json`; 376 files in the user's data, 4 shapes; ~1.3 MB in the largest Project.
- Change: new required field `title` (string, trimmed, not blank).
- Reader/writer: tolerant projection reader requiring used fields; exact writer.
- Invariant: every current Project Task has a title.
- Decision: `Migration Required` (guideline § 3: a new required fact that only old data can supply; § 4: no fallback reads).
- Rationale: one pass over 376 small files once; the alternative (a read-time fallback everywhere) is a permanent compatibility path.
- Supports: REQ-005, AC-004, QR-002.

### Migration Plan

- Current canonical shape: `task.json` with `title`.
- Older shapes: the four inventoried shapes (with or without `dependsOnTaskIds`, `partOfTaskId`, `comments`); all carry `taskKey` after `project-task-keys-v1`.
- Trigger: `Startup`, `requiredOnStartup: true`, `executionPolicy: "STARTUP_ONLY"`, `prerequisiteMigrationIds: ["20261017_project_task_keys_v1"]`.
- Owner and location: `ProjectTaskTitlesAppDataMigration`, id `20261025_project_task_titles`, folder `src/app-data-migrations/migrations/project-task-titles/`, registered right after `ProjectTaskKeysV1AppDataMigration` (registry line 131).
- Current runtime: current-shape only; `readTaskFile` requires `title`.
- Historical shapes: a frozen strict validator of the released Task file (the pre-title reader) and the derivation, inside the migration folder; no current code imported (`tests/architecture/app-data-migration-boundaries.test.ts`).
- Derivation: the description's first non-empty line, trimmed; longer than 200 characters → its first 199 characters (never ending on half a surrogate pair) plus "…".
- Completion: the runner ledger; per Task, a file with a non-blank string `title` is current.
- Restart safety: per-file atomic replace (frozen `writeJsonFile`); retry skips titled files.
- Validation: re-read each written file and check the planned `title` and that every other key and value is unchanged.
- Backup / rollback: none (guideline § 7: atomic replace, originals' other content preserved). Rollback note for release: an older build ignores `title` but drops it when it saves a Task; after re-upgrading, such a Task is no longer listed (the migration is terminal). Release notes say rolling back is not supported.
- Concurrency: single writer at startup.
- Retention: kept until a release sets a minimum upgrade-from version.

| Step | Source | Target | Owner | Validation | Failure |
| --- | --- | --- | --- | --- | --- |
| Each Project folder, each Task folder with `task.json` | released Task file (frozen validator) | same object plus `title` | migration | re-read: title + unchanged keys | `FAILED_OPERATION` for that Task, others continue; restart retries |
| Task already titled | current | — | migration | non-blank string `title` | `SKIPPED_ALREADY_CURRENT` |
| Not a valid released Task file | — | unchanged | migration | — | `SKIPPED_INVALID_TASK_WARNING` (already not listed today) |

Aggregate: `FAILED` if any `FAILED_OPERATION`; else `SUCCEEDED_WITH_WARNINGS` if any warning; else `SUCCEEDED`. Startup and other Projects' work are never blocked; an unconverted Task is the only thing not listed.

## Data-Flow Spine Inventory

| Spine | Scope | BEH | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-001 | Native tool call (AutoByteus runtime) | Text the provider renderer sends | the family's native tool adapter | Native route |
| DS-002 | Primary | BEH-001 | MCP `tools/call` (Codex, Claude, AGY, Grok) | MCP result (`content`, `structuredContent`) | the family's MCP provider | MCP route |
| DS-003 | Primary | BEH-002 | `create_task` / `update_task` | stored `task.json` + acknowledgement | `ProjectTaskService` | Agent writes a title |
| DS-004 | Primary | BEH-002 | New / Edit task form | stored `task.json` + change feed → board | `ProjectTaskService` via GraphQL | User writes a title |
| DS-005 | Primary | BEH-002 | App start | every Task titled | `ProjectTaskTitlesAppDataMigration` | Existing Tasks |
| DS-006 | Primary | BEH-003–004 | `list_project_tasks` / `search_project_tasks` | short entries, search hits | Project Task tool manifest | Agent reads Tasks |
| DS-007 | Primary | BEH-005, BEH-006 | `get_project_task` (native bound tool or MCP provider) | full Task or refusal | Project Task tool manifest (read), with the caller's Task read scope | Agent reads one Task |
| DS-008 | Primary | BEH-006 | `delegate_task` with a saved Task | worker's first message naming Task and Project | `RootTaskExecutionLifecycle` | Worker knows its Task identity |

## Primary Execution Spine(s)

- DS-001: `Runtime tool call -> Family native tool (_execute) -> Family manifest.execute (object) -> toToolResultJson (rule) -> renderer passes text to the model`
- DS-002: `MCP tools/call -> Tool executor -> Family MCP provider -> Family manifest.execute (object) -> toAgentToolsMcpStructuredJsonResult / createAgentToolsMcpSuccessResult(toToolResultJson(...)) -> MCP result`
- DS-003: `create_task -> parseProjectTaskToolInput (title required) -> executeProjectTaskTool -> ProjectTaskService.createTaskWithLocalContextFiles (normalizeTaskTitle) -> ProjectStore.createTask (taskFileContent with title) -> acknowledgement object -> DS-001/DS-002`
- DS-004: `Draft editor (Title + Description) -> projectTaskStore.createTask/updateTask -> GraphQL createProjectTask/updateProjectTask -> ProjectTaskService -> ProjectStore -> change feed (TaskChangeView with title) -> board row`
- DS-005: `Startup -> AppDataMigrationRunner.runPending -> ProjectTaskTitlesAppDataMigration.execute -> per Task: frozen validate -> derive title -> atomic write -> re-read validate -> dispositions -> runner ledger`
- DS-006: `list_project_tasks -> parse (status) -> ProjectTaskService.listTasks + assignments -> taskShortEntry -> DS-001/DS-002`
- DS-007: `get_project_task -> parse (project_id, task_id) -> caller's TaskReadScope (owned Task or any) -> ProjectTaskService.readProjectTask(projectId, reference) -> scope check -> taskFullEntry -> DS-001/DS-002`
- DS-008: `delegate_task (task_id) -> RootTaskExecutionLifecycle -> TaskExecutionResourcePort.resolveAssignment (now with projectId) -> buildTaskWorkText (Task line) -> worker's first message`

## Spine Narratives (Mandatory)

| Spine | Narrative | Nodes | Owner | Off-spine |
| --- | --- | --- | --- | --- |
| DS-001 / DS-002 | The family manifest does the work and returns an object; the route adapter turns it into text with the one rule and, on MCP, wraps it. Refusals go the same way. | native tool, MCP provider, manifest | the family's adapters | the rule (`tool-result-json.ts`), MCP result helpers |
| DS-003 / DS-004 | The title is validated with the description by the domain text rules, stored with the Task, and returned by the acknowledgement, GraphQL and change feed. | contract parser, service, store | `ProjectTaskService` | `task-text.ts` |
| DS-005 | Once, at start, each released Task file gains its title from its first line. | runner, migration | the migration | frozen validator, derivation |
| DS-006 | The list reads all Tasks (for relation keys), filters by status, and builds short entries. | manifest | the manifest | — |
| DS-007 | The tool asks the caller's scope first: a worker may read only its owned Task; others any. The manifest reads the Task through the service, refuses out-of-scope with no data, and builds the full Task. | contract parser, manifest, service | the manifest | `TaskReadScope` (caller), result rule |
| DS-008 | When a saved Project Task is delegated (new copy or existing copy), the first message names `Task: <key> in Project <projectId>` and says `get_project_task` reads it again. | lifecycle, port, input builder | `RootTaskExecutionLifecycle` | — |

## Spine Actors / Main-Line Nodes

Family native tools and MCP providers; family manifests; `toToolResultJson`; `ProjectTaskService`; `ProjectStore`; the migration; the web draft editor and store.

## Ownership Map

- `autobyteus-ts/src/tools/tool-result-json.ts`: owns the result rule and compact JSON (transformation). Pure, no I/O.
- Family adapters (native tools, MCP providers): own the route translation only; they never build JSON text themselves.
- MCP result helpers (`agent-tools-mcp-structured-json-result.ts`, `agent-tools-mcp-operation-result.ts`): own the MCP envelope; `toAgentToolsMcpStructuredJsonResult` takes the value and uses the rule, so both copies come from one value.
- `projects/domain/task-text.ts`: owns Task text rules: `normalizeTaskTitle`, `normalizeTaskDescription` (moved from the service), and the patch parse both update paths use.
- `ProjectTaskService`: owns create/update sequencing (unchanged role); stays under 500 lines.
- `ProjectStore`: owns the stored shape (reader requires `title`, writer writes it).
- Migration: owns the one-time transition and its historical shapes.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A — no new facade.

## Removal / Decommission Plan (Mandatory)

| Item | Why unnecessary | Replaced by | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/json-utils.ts` | All callers move to the rule | `autobyteus-ts/src/tools/tool-result-json.ts` | Date → ISO behavior moves with it |
| `toBrowserJsonString` (`browser-tool-serialization.ts`), `toTaskDelegationJsonString`, `toMediaJsonString` | Same | `toToolResultJson` | Error-payload builders in those files stay |
| `JSON.stringify(…, null, 2)` in 4 definition tools | Same | `toToolResultJson` | — |
| Hand-written empty spreads in `project-task-tool-manifest.ts` (`comments`, `commentCount`, `closedParts`, `partsNotClosed`, `attachedContextFiles`, ack `dependsOn`/`partOf` conditionals) | The rule leaves them out | the rule | Keep the explicit field lists |
| `summaryOf`, `SUMMARY_MAX_CHARS` (manifest) | Search returns the stored title | `task.title` | — |
| `meaningSearch` `{state: "ready"}` object | Absent = used | `meaningSearchNote` returns nothing for ready | — |
| `send_message_to` rejected `target_agent_run_id: null` | Rule; schema field removed from the rejected variant | — | Text + doc updated |
| Hand-built `{content, structuredContent}` in `get-handoff-rules-mcp-adapter-provider.ts:31` and `agent-discovery-mcp-result.ts:11` | One MCP helper | `toAgentToolsMcpStructuredJsonResult(value)` | Discovery refusal text stays plain text |
| `normalizeDescription` in `project-task-service.ts:53-56` | Moved | `projects/domain/task-text.ts` | — |
| Web `taskSummary`, `taskCardSummary`, `taskSummaryLabel`, `TASK_SUMMARY_LABEL_MAX_CHARS` and `utils/projects/taskSummary.ts` (+ its spec) | Project Tasks have a stored title | `utils/projects/taskText.ts` (below) | `boundTaskText` and the card bounds move |
| `models.ts:14` and web `types/project.ts:26` "It has no title" comments | No longer true | — | — |

## Return Or Event Spine(s) (If Applicable)

- Change feed: `ProjectTaskService commit -> ProjectChangePublisher -> TaskChangeView (with title) -> /ws/projects -> projectTaskStore -> board`.

## Bounded Local / Internal Spines (If Applicable)

- The rule (`tool-result-json.ts`): `value -> JSON round trip (toJSON, Date → ISO) -> recursive prune (objects: drop empty after pruning children; arrays: prune elements, keep positions) -> JSON.stringify (compact)`.

## Off-Spine Concerns Around The Spine

| Concern | Spines | Serves | Responsibility | Why | Risk if misplaced |
| --- | --- | --- | --- | --- | --- |
| Result rule | DS-001, DS-002, DS-006 | all family adapters | prune + compact | One rule | Drift if each family keeps its own |
| MCP envelope helpers | DS-002 | MCP providers | text + `structuredContent` from one value | Two copies must agree | Copies diverge |
| Task text rules | DS-003, DS-004 | `ProjectTaskService`, contract parser | title / description validation | Both update paths and create share it | Duplicated in two update paths; service > 500 lines |
| Title derivation (frozen) | DS-005 | migration | first line → title | Historical-only | Current code gains a fallback |
| Web Task text bounds | DS-004 | board, pickers, tree | bound title and preview for display | Display only | Labels re-derive titles |

## Ownership Boundaries

- The result rule is the only producer of agent-tool result JSON text in `src/agent-tools/**` and `send-message-to-tool-result-contract.ts`; family files build objects.
- `projects/domain/task-text.ts` is the only validator of a Task title; the tool contract parser calls it for `title` (as it calls `normalizeCommentText`), the service calls it in create/update.
- Migration code imports nothing from current code; current code imports nothing from the migration.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden bypass | Fix if thin |
| --- | --- | --- | --- | --- |
| `toToolResultJson` / `omitEmptyToolResultFields` | prune + stringify | every platform family adapter | `JSON.stringify` of a tool result in `src/agent-tools/**` | Extend the rule file, never a family copy |
| `toAgentToolsMcpStructuredJsonResult(value, options)` | text + structured envelope | MCP providers with structured results | hand-built `{content, structuredContent}` | Add an option to the helper |
| `ProjectTaskService` | Task create/update with title | GraphQL resolvers, tool manifest | writing `title` through the store directly | — |

## Dependency Rules

- `autobyteus-server-ts` → `autobyteus-ts/tools/tool-result-json.js` (allowed; the server already imports `autobyteus-ts/tools/*`).
- `autobyteus-ts` core tools → `../tool-result-json.js` (allowed).
- Migration folder → frozen layer and node APIs only (existing boundary test).
- Forbidden: a family-local serializer; renderer-level filtering; current code reading a description's first line as a Project Task's title.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity | Notes |
| --- | --- | --- | --- | --- |
| `omitEmptyToolResultFields<T>(value: T): T` | tool result value | the rule, returns a JSON value | — | Used by core tools that return objects |
| `toToolResultJson(value: unknown): string` | tool result text | rule + compact JSON | — | Used by every server adapter |
| `toAgentToolsMcpStructuredJsonResult(value: object, {isError?})` | MCP structured result | envelope from one value | — | Signature changes from text to value |
| `create_task` | Project Task | + required `title` | `project_id` | Description stays required |
| `update_task` | any Task | + optional `title` (Project Tasks only) | `task_id` | `TASK_TITLE_INVALID` for a Temp task |
| `list_project_tasks` | a Project's Tasks | short entries; optional `status` | `project_id` | no `task_ids` (DEC-021) |
| `get_project_task` | one Project Task | full Task, read-only | `project_id` + `task_id` (key, any case, or long ID) | `TASK_NOT_FOUND` when the Task is not in that Project; `TASK_READ_OUT_OF_SCOPE` (new `ProjectErrorCode`) when a worker names another Task; message names the caller's Task key |
| Member Task read scope `ownedTaskOf(caller)` | the caller's owned Task | read-only query on the member's root-bound Task capability | the caller's `CollaborationMemberExecutionIdentity` | backed by `RootTaskExecutionResourceScope.ownerOf(agentRunId)`; `null` when the caller works on no Task |
| `TaskExecutionResourcePort.resolveAssignment` | saved work for assignment | + `projectId` in its result | key or long ID | for the Task line |
| GraphQL `createProjectTask` / `updateProjectTask` | Project Task | + `title: String!` | `projectId`, `taskId` | Full-form edit keeps the required field |
| GraphQL `TaskWorkerTaskView.title` | Task of a worker | `String` nullable: null for a Temp task | — | Wire, not an agent tool |

## Interface Boundary Check

| Interface | Singular | Identity explicit | Ambiguous selector | Action |
| --- | --- | --- | --- | --- |
| `list_project_tasks` | Yes (one form) | Yes | Low | — |
| `get_project_task` | Yes | Yes (compound: Project + Task) | Low (key resolved within the Project; a key of another Project is not found) | — |
| `ownedTaskOf` | Yes | Yes | Low | — |
| `update_task` title | Yes | Yes | Low | Refuse for Temp task |

## Main Domain Subject Naming Check

| Subject | Name | Natural | Same everywhere (Principle 15) | Drift risk | Action |
| --- | --- | --- | --- | --- | --- |
| Task one-liner | `title` | Yes | Yes after this change (field, tool parameter, results, GraphQL, feed, UI "Title", docs) | was "summary" | Rename search `summary`, web helpers, i18n `{summary}` → `{title}` |
| Reduced view | `summary` (`listProjectSummaries`, `TaskWorkerTaskSummary`) | Yes | Yes | — | Glossary entry |
| Result rule | `toToolResultJson`, `omitEmptyToolResultFields` | Yes | Yes | — | — |
| Migration | `project-task-titles` / `ProjectTaskTitlesAppDataMigration` | Yes | No version number (DESIGN rule 8) | — | — |
| Web text helpers | `utils/projects/taskText.ts` (`taskTitleLabel`, `taskCardTitle`, `taskCardPreview`, `descriptionFirstLine`) | Yes | A Temp task's line is `descriptionFirstLine`, never "title" | — | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision | Why |
| --- | --- | --- | --- |
| JSON for results | `agent-tools/json-utils.ts` (server only) | Create New in `autobyteus-ts/src/tools/`, remove the old | Core tools must reach it; the server helper cannot be imported by `autobyteus-ts` |
| MCP envelope | `agent-tools-mcp-structured-json-result.ts` | Extend (takes a value) | Already the structured owner |
| Task text validation | `normalizeDescription` (service), `normalizeCommentText` (`domain/task-comments.ts`) | Extend the domain: `domain/task-text.ts` | Same pattern as comments |
| Migration mechanism | `project-task-keys-v1` | Reuse its mechanism (new folder, no import) | Same kind of change |
| Guard | `tests/architecture/*` | Extend with one file | Existing style |

## Subsystem / Capability-Area Allocation

| Area | Owns | Spines | Decision |
| --- | --- | --- | --- |
| `autobyteus-ts/src/tools` | result rule; core tools' results | DS-001 | Extend |
| `autobyteus-server-ts/src/agent-tools` | family adapters, MCP helpers, Project Task tool contract/manifest | DS-001, DS-002, DS-006 | Extend / Modify |
| `autobyteus-server-ts/src/projects` | Task model, text rules, store, service, views, feed, search | DS-003, DS-004 | Extend |
| `autobyteus-server-ts/src/app-data-migrations` | title migration | DS-005 | Create New (folder) |
| `autobyteus-web` projects | form, store, labels | DS-004 | Modify |

## Draft File Responsibility Mapping

See Final File Responsibility Mapping (no change between draft and final after the reuse check, except moving Task text rules out of the service).

## Reusable Owned Structures Check

| Repeated | Shared file | Owner | Why | Redundant removed | Overlaps removed | Must not become |
| --- | --- | --- | --- | --- | --- | --- |
| Result serialization (×~10) | `autobyteus-ts/src/tools/tool-result-json.ts` | tools | one rule | Yes | Yes (three rules → one) | a general JSON utility for non-tool data (stores, feeds keep their own writers) |
| Title / description validation (create + 2 update paths) | `projects/domain/task-text.ts` | projects domain | one rule per field | Yes | Yes | a second service |
| Short entry / full Task | inside `project-task-tool-manifest.ts` (`taskShortEntry`, `taskFullEntry`) | manifest | two forms of one subject, list and get | Yes (no per-Task `projectId` in lists) | Yes | a generic view builder |

## Shared Structure / Data Model Tightness Check

| Structure | One meaning per field | Redundant removed | Overlap risk | Action |
| --- | --- | --- | --- | --- |
| `ProjectTask.title` | Yes | — | Low (title ≠ description) | Required |
| Context file in agent results (`contextFiles` in `get_project_task`, `attachedContextFiles` in acks): `{name, path}` | Yes (`name` = display name, `path` = local path) | storedFilename, mimeType, sizeBytes, locator | Low | One shape, built by one manifest helper (`contextFileEntry`) for both (DEC-019) |
| `TaskWorkerTaskView.title` | Yes (null = Temp task) | — | Low | — |

## Final File Responsibility Mapping

| File | Concern |
| --- | --- |
| `autobyteus-ts/src/tools/tool-result-json.ts` (new) | the rule and compact JSON |
| `autobyteus-ts/src/tools/terminal/tools/{get-background-processes,get-process-output,start-background-process,stop-background-process}.ts` | return `omitEmptyToolResultFields(result)` |
| `autobyteus-server-ts/src/agent-tools/{project-tasks,browser,task-delegation,media,agent-management,agent-team-management,agent-communication,agent-discovery,published-artifacts}/**` | adapters call `toToolResultJson`; manifests return objects |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-structured-json-result.ts` | envelope from a value |
| `autobyteus-server-ts/src/agent-tools/mcp/providers/*.ts` | use the helpers; no hand-built envelopes |
| `autobyteus-server-ts/src/agent-communication/services/send-message-to-tool-result-contract.ts` | schema without rejected `target_agent_run_id`; serializer via the rule |
| `autobyteus-server-ts/src/agent-collaboration/domain/agent-team-collaboration-llm-contract.ts` | `send_message_to` text: "…or leaves it out, with the reason, when the message can't be delivered" |
| `autobyteus-server-ts/src/agent-tools/project-tasks/project-task-tool-contract.ts` | `title` (create required, update optional); `get_project_task` name, description, schema (`project_id`, `task_id` required), parser; no `task_ids` |
| `autobyteus-server-ts/src/agent-tools/project-tasks/project-task-tool-manifest.ts` | short entries, `get_project_task` (scope check, `taskFullEntry`), search `title`, acks; `executeProjectTaskTool(name, raw, scope)` takes the caller's read scope (used only by `get_project_task`); one `contextFileEntry` (`{name, path}`) for full Tasks and ack `attachedContextFiles` (the ack's attached files need their local path: take it from the saved-context view, as full entries do); no empty spreads |
| `autobyteus-server-ts/src/projects/domain/models.ts` | `title` on `ProjectTask`, commands (`CreateProjectTaskCommand`, `UpdateProjectTaskCommand`, `CreateTaskWithLocalContextFilesCommand`, `UpdateTaskByIdCommand`), `TaskWorkerTaskView` |
| `autobyteus-server-ts/src/projects/domain/task-text.ts` (new) | `normalizeTaskTitle`, `normalizeTaskDescription`, update text patch |
| `autobyteus-server-ts/src/projects/domain/project-errors.ts` | `TASK_TITLE_REQUIRED`, `TASK_TITLE_INVALID`, `TASK_READ_OUT_OF_SCOPE` |
| `autobyteus-server-ts/src/agent-tools/project-tasks/project-task-read-scope.ts` (new) | `TaskReadScope`, `taskReadScopeOf(memberExecutionContext)` |
| `autobyteus-server-ts/src/agent-tools/project-tasks/project-task-native-tools.ts` | `GetProjectTaskTool` + `createBoundGetProjectTaskTool` |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.ts` | bound branch for `get_project_task` |
| `autobyteus-server-ts/src/agent-tools/mcp/providers/project-task-tools-mcp-adapter-provider.ts` | passes the caller's scope |
| `autobyteus-server-ts/src/agent-collaboration/execution/task/member-task-command-capability.ts` → `member-task-capability.ts` | `MemberTaskCapability` with `ownedTaskOf(caller)`; the four root implementations forward it to their root's resource scope |
| `autobyteus-server-ts/src/agent-collaboration/execution/task/task-execution-resource-port.ts`, `projects/services/project-task-service.ts` | `resolveAssignment` returns `projectId`; `readProjectTask` |
| `autobyteus-server-ts/src/agent-collaboration/execution/task/task-execution-input.ts`, `root-task-execution-lifecycle.ts` | the Task line on both saved-Task paths |
| `autobyteus-server-ts/src/projects/stores/project-store.ts` | reader requires `title`; writer writes it |
| `autobyteus-server-ts/src/projects/services/project-task-service.ts` | title through create/update; ≤ 500 lines |
| `autobyteus-server-ts/src/projects/services/project-task-views.ts`, `changes/project-change-messages.ts`, `search/project-task-search-service.ts` | carry `title`; exact tier includes it |
| `autobyteus-server-ts/src/api/graphql/types/project-tasks.ts` | `title` fields and inputs |
| `autobyteus-server-ts/src/app-data-migrations/migrations/project-task-titles/` (new) + `app-data-migration-registry.ts` | migration + registration |
| `autobyteus-server-ts/tests/architecture/agent-tool-result-boundaries.test.ts` (new) | guard |
| `autobyteus-web/types/project.ts`, `graphql/**` (queries, mutations, change feed parsing), `generated/graphql.ts` (codegen) | `title` |
| `autobyteus-web/stores/projectTaskStore.ts`, `composables/projects/useProjectTaskDraft.ts`, `components/projects/ProjectTaskDraftEditor.vue` | Title field, required |
| `autobyteus-web/utils/projects/taskText.ts` (replaces `taskSummary.ts`) + 10 users | labels from title; preview |
| `autobyteus-web/components/projects/ProjectTaskDetail.vue`, `panel/ProjectsPanelTaskDetail.vue` | Title shown above Description |
| `autobyteus-web/localization/messages/{en,zh-CN}/projects.ts`, `utils/projects/projectErrorMessageKey.ts` | "Title", placeholder, errors, `{title}` slots |
| Docs: `GLOSSARY.md`, `docs/design-cases.md`, `autobyteus-server-ts/docs/modules/{agent_communication,agent_tools,agent_tools_mcp_server,projects,search}.md`, `autobyteus-web/docs/projects.md` | describe the new shapes |
| `autobyteus-agents/agents/project-task-manager/skills/project-task-management/SKILL.md` | REQ-012 sentences |

## Applied Patterns (If Any)

Adapter (route adapters translate one manifest result per route); the rule is a pure function, not a pattern.

## Target Subsystem / Folder / File Mapping

As in Final File Responsibility Mapping; one new folder (`migrations/project-task-titles/`), no other new folders.

## Folder Boundary Check

| Path | Depth | Clear | Risk | Note |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/tools/tool-result-json.ts` | Off-spine concern | Yes | Low | beside `base-tool.ts`, the tool contract's home |
| `projects/domain/task-text.ts` | Domain rule | Yes | Low | beside `task-comments.ts` |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Rule | `{"a":0,"b":false,"c":[],"d":{"e":null},"f":[{},"x"]}` → `{"a":0,"b":false,"f":[{},"x"]}` | dropping `0`/`false`; removing array elements | Positions in arrays carry meaning |
| Native adapter | `return toToolResultJson(await entry.execute(...))` | `return JSON.stringify(result, null, 2)` | One owner |
| MCP structured | `toAgentToolsMcpStructuredJsonResult(result)` | `({content:[{type:"text",text:JSON.stringify(r)}], structuredContent: r})` | Two copies from one pruned value |
| `send_message_to` refused | `{"accepted":false,"code":"…","message":"…"}` | `"target_agent_run_id":null` | Rule |
| List default (one Task) | `{"taskId":"autobyteus-260","title":"Agent tool results …","status":"IN_PROGRESS","commentCount":5,"assignments":[{"kind":"team",…}]}` | description, contextFiles, per-Task `projectId` | 94% smaller |
| Ack with files | `{"task":{"projectId":"p1","taskId":"autobyteus-301","status":"TODO","attachedContextFiles":[{"name":"brief.md","path":"/…/context/ctx_…__brief.md"}]}}` | `[{storedFilename, displayName}]` | One name for one thing (DEC-019) |
| Get one Task | `get_project_task project_id=P task_id=autobyteus-260` → `{"projectId":"P","taskId":"autobyteus-260","title":"…","status":"IN_PROGRESS","description":"…","comments":["…"],"contextFiles":[{"name":"handoff.md","path":"/…/context/ctx_…"}],"assignments":[…],"closedAssignments":[…]}` | six context-file fields; a list parameter returning full Tasks | One shape for a Task in full |
| Worker reads another Task | `{"error":{"code":"TASK_READ_OUT_OF_SCOPE","message":"You work on autobyteus-260; you can read only that Task."}}` | returning the Task, or `TASK_NOT_FOUND` (hides why) | Explicit refusal (Principle 13) |
| First message | `Task: autobyteus-260 in Project project_a1377344-…` then `If you have get_project_task, it reads this Task again, including comments added later.` before `Description:` | no identity in the message | The worker can name its Task |
| Search hit | `{"taskId":"autobyteus-42","status":"TODO","title":"…","match":"exact"}`; `meaningSearch` only when preparing/unavailable | `summary`, `"meaningSearch":{"state":"ready"}` | Rule + vocabulary |
| Card | title (main line) + description preview; for a Task whose description's first line equals its title (or starts with the title before its "…"), the preview skips that line | repeating the title in the preview | Old Tasks' titles came from that line |

## Backward-Compatibility Rejection Log (Mandatory)

| Mechanism | Why considered | Decision | Replacement |
| --- | --- | --- | --- |
| Read-time title fallback (first line) | PM's preference (DEC-009 b) | Rejected (user chose a) | Migration |
| Keep `summary` beside `title` in search | Old skill text | Rejected | Clean rename + skill update |
| Keep `target_agent_run_id: null` for old callers | Documented contract | Rejected | Schema change, docs |
| Keep `json-utils.ts` for other callers | — | N/A (no non-tool callers) | Removed |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. `autobyteus-ts`: `tool-result-json.ts` + unit tests; the four background-process tools.
2. Server results: MCP helper signature; every family adapter; `send_message_to` schema/text; remove old serializers; guard test; per-family tests updated (both routes).
3. Server Tasks: `task-text.ts` + errors; model; store reader/writer; service; views/feed/GraphQL/search; tool contract (`title`, `get_project_task`) and manifest (entries, get, search, acks).
4. Migration folder, frozen validator, registry line, tests with fixtures for the four shapes plus an invalid file, a titled file, a long first line (> 200, surrogate at the cut), retry after partial write.
5. Web: codegen, types, store, draft, editor, `taskText.ts` and its users, Task page / panel title, i18n, error keys; web unit tests; localization guards.
5b. `get_project_task`: error code, read scope, capability query (+ rename), service read, contract, manifest, native bound tool and resolver, MCP provider; first-message line; tests (scope: task agent, task team member, delegated agent, Temp-task worker, non-worker; refusal has no data; exposure opt-in on both routes).
6. Docs, glossary, design case additions; `autobyteus-agents` skill sentences on its own branch.
7. Evidence: before/after sizes on synthesized data with the user's shapes (scripts in `evidence/`, no user content).

## Key Tradeoffs

- One function called by each adapter (≈30 call sites) vs one route-level owner per route: chosen for a bounded change; the guard test keeps it single.
- Titles from first lines are imperfect for a third of old Tasks (cut at 200) but need no user action.
- The card-preview duplicate-line rule is a display heuristic, limited to the helper and tested.

## Risks

- Hidden consumer of an empty field (ASM-001): mitigated by tests across families and the Codex parser check.
- AGY/Grok may show both MCP copies: unchanged from today; not made worse.
- `get_project_task` scope relies on `ownerOf` being current for the caller; it is the same answer that already gates `delegate_task`, so both stay consistent.
- Rollback after the migration hides Tasks saved by the older build (release note).
- `project-task-service.ts` near the size limit: the `task-text.ts` move is required.

## Guidance For Implementation

- Reproduction to start from: `None` (behavior change); start from the per-family tests asserting today's shapes and the before-size scripts in `evidence/`.
- Do not print Task content or secrets in evidence; synthesize data with the user's shapes.
- Tests to update: `tests/unit/agent-tools/**` (all families, both routes), `team-communication/send-message-to.test.ts`, `collaboration-result-contracts.test.ts`, `project-tasks/*.test.ts`, projects store/service tests, web `taskSummary.spec.ts` → `taskText.spec.ts`, `ProjectTaskRow.spec.ts`.
- Validation layers (TESTING.md): `autobyteus-ts` tests; server unit + integration + typecheck; migration tests with synthesized released-shape fixtures; web unit + localization guards; an isolated desktop instance for the New/Edit task form and board titles; an MCP tool E2E on a test-owned server for `list_project_tasks` / `search_project_tasks` / `send_message_to`.
