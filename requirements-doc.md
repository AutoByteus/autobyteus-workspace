# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

Remove the dedicated native to-do-list tools from `autobyteus-ts`. Agents can maintain task lists with existing file tools and skills, so the native in-memory to-do API and its native event path should no longer be part of the TypeScript runtime. The change must not remove generic file/skill capabilities or the server-level to-do update contract used by Codex and other server backends.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | `registerTools()` exposes `create_todo_list`, `add_todo`, `get_todo_list`, and `update_todo_status` as model-facing local tools; each tool has source, schema/context, exports, and unit tests. | The four names are not registered, exported, schema-composed, or executable by the native `autobyteus-ts` tool pipeline. | All unrelated local tools remain available; file tools and skills are the supported file-based replacement. | REQ-001, REQ-004; AC-001, AC-005 |
| BEH-002 | Native tool calls keep a per-agent in-memory `ToDoList`, notify `AgentExternalEventNotifier`, and produce `StreamEventType.AGENT_TODO_LIST_UPDATE` / `TODO_LIST_UPDATE` through the native `AgentEventStream`. | Native runtime state has no ToDoList owner and emits no native to-do-list event. | Generic agent lifecycle, tool, segment, message, artifact, and token events remain unchanged. | REQ-002; AC-002, AC-003 |
| BEH-003 | Server/Codex backends can produce server `AgentRunEventType.TODO_LIST_UPDATE`, which the server maps to WebSocket `TODO_LIST_UPDATE` and the web progress UI renders. | The server/Web UI contract continues to work for backends that own their own plan/progress events; only the obsolete AutoByteus-native stream mapping is removed. | Codex event conversion, server event mapping, web handler/store/panel, and related coverage remain unchanged. | REQ-003; AC-004 |
| BEH-004 | `ToolCategory.TASK_MANAGEMENT` exists and native ToDo tools use it; server-owned task-delegation tools also use the category. | Native ToDo tools no longer use the category, but the category remains available for server-owned task-management tools. | Server task-delegation tool exposure remains intact. | REQ-004; AC-005 |
| BEH-005 | Active `autobyteus-ts` docs describe personal ToDo tools and native TODO stream updates as supported. | Active docs describe file/skill-based task tracking and distinguish server/backend-owned TODO events from the removed native tool capability. | Historical migration/compliance records remain historical and are not rewritten. | REQ-005; AC-006 |

## Investigation Findings

- The four tools are registered only by `autobyteus-ts/src/tools/register-tools.ts` and are otherwise contained in `src/task-management/tools/todo-tools` plus tests and barrels.
- `ToDoList` and its schemas/types are only used by the native tools, `AgentRuntimeState.todoList`, exports, and tests. The list is in-memory and not persisted.
- Native to-do updates flow through `AgentExternalEventNotifier` and `AgentEventStream`; the server AutoByteus converter has one mapping for that native stream enum.
- Codex converters emit the server-level `AgentRunEventType.TODO_LIST_UPDATE` directly, so the server/Web UI to-do update path is a separate backend-owned contract and must remain.
- Existing file tools and skill loading are independent capabilities and remain available.

## Relevant Supplemental Task Artifacts

None.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Cleanup / Behavior Change / Refactor
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Legacy Or Compatibility Pressure, with file/responsibility drift
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: The native tools, in-memory owner, notifier, stream payload, and server bridge form one obsolete capability. Removing only registry entries would leave dead public/runtime surfaces. The server and web contracts have a separate Codex/backend owner and therefore must be preserved.
- Requirement or scope impact: Scope includes the coherent native slice and one downstream bridge/test edit; it excludes server-level TODO delivery and the web presentation that remains valid for Codex.

## Recommendations

Perform a clean-cut decommission of the native ToDo capability. Remove the four tools and their tests/exports, remove the ownerless in-memory model/schema and runtime field, remove native notifier/event/stream payload wiring, remove the AutoByteus converter mapping/test row, and update active docs. Do not add a replacement skill in this change; use existing file tools and skill infrastructure. Do not remove `ToolCategory.TASK_MANAGEMENT` or server/Codex/web TODO event handling.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

The deletion is concentrated in `autobyteus-ts`, but removing its public stream enum requires a coordinated server AutoByteus converter/test update and active documentation updates.

## In-Scope Use Cases

- `UC-001`: A native AutoByteus agent receives its local tool schema without any dedicated ToDo tool names.
- `UC-002`: A native AutoByteus agent completes turns using generic file tools and skills without native ToDo runtime state or events.
- `UC-003`: The server AutoByteus backend consumes the remaining native stream events without referencing a removed ToDo stream enum.
- `UC-004`: Codex/server backends continue delivering server-level `TODO_LIST_UPDATE` events to the existing web ToDo panel.
- `UC-005`: Package build/type checks and focused tests prove removed capability absence and unrelated tool/event continuity.

## Out of Scope

- Implementing a new to-do-list skill or changing generic file tools.
- Removing the server `AgentRunEventType.TODO_LIST_UPDATE`, server WebSocket `TODO_LIST_UPDATE`, Codex converters, web handler/store/panel, or their tests.
- Removing `ToolCategory.TASK_MANAGEMENT`, which remains used by server-owned task-delegation tools.
- Rewriting archived migration/compliance reports or historical ticket records.
- Preserving removed native imports/names with compatibility aliases or no-op wrappers.

## Functional Requirements

- **REQ-001 — Remove native tool exposure:** Remove `create_todo_list`, `add_todo`, `get_todo_list`, and `update_todo_status` from the local registry, root/task-management exports, tool schema composition, and active source/tests. No removed name may be created or executed through the default local registry.
- **REQ-002 — Remove ownerless native runtime path:** Remove `AgentRuntimeState.todoList`, `ToDoList`, ToDo schemas/types, native notifier method/event enum value, native stream ToDo payload classes/factory/event type/generator, and their active tests. Preserve all unrelated runtime/event paths.
- **REQ-003 — Preserve backend-owned TODO delivery:** Remove only the `autobyteus-ts` native ToDo mapping from `AutoByteusStreamEventConverter` and its test row. Keep server/Codex `AgentRunEventType.TODO_LIST_UPDATE`, WebSocket `TODO_LIST_UPDATE`, and web handling unchanged.
- **REQ-004 — Preserve replacement and adjacent capabilities:** Keep generic file/terminal tools, skill discovery/loading, and `ToolCategory.TASK_MANAGEMENT` for server-owned task-management tools. Do not introduce a replacement skill as part of this removal.
- **REQ-005 — Align active documentation:** Update active `autobyteus-ts` architecture/runtime/streaming docs so they no longer advertise native ToDo tools or native TODO stream emission and explain the remaining backend-owned TODO event boundary.
- **REQ-006 — No persisted-data migration:** Treat the removed native ToDo state as non-persisted in-memory state; no migration, compatibility reader, or data cleanup is required.

## Acceptance Criteria

- **AC-001 — Registry absence and continuity:** A focused registry test proves all four removed names are absent after `registerTools()`, while `read_file`, `write_file`, `edit_file`, `run_bash`, and representative non-ToDo tools remain registered and schema-composable.
- **AC-002 — Native source/export absence:** Active `autobyteus-ts/src` contains no native ToDo tool/model/schema files, no `todoList` runtime field, and no root/barrel exports for the removed capability; TypeScript build succeeds.
- **AC-003 — Native event absence:** Active `autobyteus-ts/src` and its focused tests contain no `AGENT_DATA_TODO_LIST_UPDATED`, `AGENT_TODO_LIST_UPDATE`, `ToDoListUpdateData`, `createTodoListUpdateData`, or `streamTodoUpdates` native path; remaining stream event mappings and focused event tests pass.
- **AC-004 — Downstream boundary correctness:** `autobyteus-server-ts` builds and its AutoByteus stream converter tests pass without importing/referencing the removed `autobyteus-ts` native ToDo stream enum; server/Codex `TODO_LIST_UPDATE` mapping and web TODO handler tests remain present and passing where executed.
- **AC-005 — Replacement/adjacent continuity:** Existing file-tool, skill-loading, and server task-delegation category checks pass; `ToolCategory.TASK_MANAGEMENT` remains defined and server-owned task tools remain unaffected.
- **AC-006 — Documentation alignment:** Active `autobyteus-ts` docs no longer list the four native tools as supported and state that file/skill workflows replace them; historical records are not treated as active contracts.
- **AC-007 — No migration/compatibility machinery:** No persisted migration or compatibility alias is added; removed native names are absent rather than routed to a hidden fallback.

## Constraints / Dependencies

- The authoritative changes must be made in `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools` on `codex/remove-todo-list-tools`.
- `autobyteus-server-ts` resolves `autobyteus-ts` from source through TypeScript path mappings, so its AutoByteus converter must be updated when the native enum value is removed.
- `ToolCategory.TASK_MANAGEMENT` is shared by server-owned task-delegation tools and cannot be removed with native ToDo tools.
- No backward-compatibility wrappers, aliases, dual native/server paths, or fallback registrations are allowed.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: No native persisted subject; `ToDoList` was an in-memory `AgentRuntimeState` field only.
- Required outcome (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`/`Undetermined`): Not Affected
- Existing data to preserve, discard/rebuild, transform, or quarantine: None for native ToDo state. Server/Web UI transient TODO events remain under their existing owner.
- Unacceptable data loss or corruption: No persisted data may be altered; unrelated agent memory/files/runtime state must remain intact.
- Relevant availability, maintenance-window, or rollout constraints: None for native state; this is a breaking package API/tool-surface removal.
- Related requirement and acceptance-criteria IDs: REQ-006; AC-007.

## Assumptions

- “To-do list tools” means the four native local tool names found in `autobyteus-ts`, not server-owned task-delegation tools or the server-level TODO event used by Codex.
- Existing file and skill capabilities are sufficient for the requested replacement workflow; no first-party skill is required in this task.
- Removing the native event enum is acceptable as part of cleanly removing its only in-repository native producer and bridge.

## Risks / Open Questions

- External package consumers may import removed native classes or enum values; this is an intentional breaking change and must be called out in delivery notes.
- Native AutoByteus runs will no longer populate the web ToDo panel; backend paths that still emit server TODO events, notably Codex, remain supported.
- Generated `autobyteus-ts/dist` handling must follow repository build/tracking conventions so stale generated native artifacts are not presented as active output.

## Requirement-To-Use-Case Coverage

| Requirement | Covered Use Cases |
| --- | --- |
| REQ-001 | UC-001, UC-005 |
| REQ-002 | UC-002, UC-003, UC-005 |
| REQ-003 | UC-003, UC-004 |
| REQ-004 | UC-002, UC-005 |
| REQ-005 | UC-002, UC-004 |
| REQ-006 | UC-002, UC-005 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Register default tools and assert removed ToDo names are absent while generic/representative tools remain. |
| AC-002 | Run source search and TypeScript build after deleting native source/exports/state. |
| AC-003 | Run focused event/stream tests and search for removed native event names. |
| AC-004 | Build/test server AutoByteus converter; separately preserve Codex/server TODO mapping coverage. |
| AC-005 | Run file/skill/tool-category/task-delegation continuity checks. |
| AC-006 | Search active docs for removed native names and review replacements. |
| AC-007 | Inspect diff for aliases, fallback registrations, migrations, or persisted-data edits. |

## Approval Status

Design-ready. The requirements reflect the user’s explicit request and the evidence in `investigation-notes.md`; no intended-behavior supplement applies. Requirements should be treated as locked only after user/architecture review confirms the native-vs-server TODO scope distinction.
