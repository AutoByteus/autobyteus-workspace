# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete — dedicated ticket worktree created from refreshed `origin/personal` and bootstrap artifacts created before deeper investigation.
- Current Status: Investigation complete; requirements refined to Design-ready and design prepared.
- Investigation Goal: Establish the complete native to-do-list tool surface in `autobyteus-ts`, its production paths and consumers, persisted-data implications, and the smallest clean removal that leaves file/skill workflows and server-owned to-do events coherent.
- Scope Classification (`Small`/`Medium`/`Large`): Medium.
- Scope Classification Rationale: The source deletion is localized to `autobyteus-ts`, but the native stream contract is consumed by the server AutoByteus event converter and requires a small cross-package contract cleanup. The server/Web UI `TODO_LIST_UPDATE` contract must remain because Codex backends produce the same server event independently.
- Scope Summary: Remove the four model-facing native to-do tools, their in-memory owner and native event/stream path, their tests/exports/active documentation, and the obsolete AutoByteus converter mapping. Preserve generic file/terminal tools, skill loading, server task-management category support, and server/Codex/Web UI to-do update events.
- Primary Questions To Resolve:
  1. What exact files, exports, registries, schemas, runtime state, events, stream payloads, tests, and docs form the native capability?
  2. What supported trigger and production path exposes or invokes the tools?
  3. Does native to-do state persist independently or require migration?
  4. Which downstream contracts are shared with other backends and must remain?
  5. What validation proves both clean absence and unrelated capability continuity?

## Request Context

The user says that the to-do-list tools in `autobyteus-ts` are no longer needed because a to-do list can be maintained in a normal file and, if useful, supported by a to-do-list skill. The requested direction is a clean removal of the dedicated native tools, not implementation of a replacement skill. The investigation distinguishes the native AutoByteus tool path from the server/Codex to-do event path that shares the frontend `TODO_LIST_UPDATE` transport.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git monorepo.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools`
- Current Branch: `codex/remove-todo-list-tools`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin personal` succeeded on 2026-08-03. The dedicated worktree was created from `origin/personal` at `ba6ebc2a2fbf56f17ee6bbb965f3f153307db3d2`.
- Task Branch: `codex/remove-todo-list-tools`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal` / tracked remote `origin/personal`, subject to delivery review.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: The shared checkout has unrelated untracked files; the dedicated worktree above is authoritative. The change is intentionally breaking for the removed `autobyteus-ts` native to-do API/tool names; no compatibility wrappers are planned.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| None | No separate supplement materially improves the compact code/contract investigation | N/A | N/A | N/A | N/A | N/A | None |

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-08-03 | Setup | `git fetch origin personal` | Refresh the tracked base before creating the task worktree | Fetch succeeded; `origin/personal` is the expected base | No |
| 2026-08-03 | Setup | `git worktree add -b codex/remove-todo-list-tools /Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools origin/personal` | Establish isolated authoritative workspace | Worktree and branch created successfully at `ba6ebc2a2` | No |
| 2026-08-03 | Code | `rg -n -i --hidden --glob '!node_modules/**' --glob '!*.map' --glob '!*.lock' --glob '!autobyteus-ts/dist/**' '(to[- ]?do|todo|checklist)' autobyteus-ts autobyteus-server-ts autobyteus-web ...` | Inventory to-do references across packages | Found native tools/models in `autobyteus-ts`; server/Codex and web have a separate `TODO_LIST_UPDATE` event path | No |
| 2026-08-03 | Code | `find autobyteus-ts/src/task-management autobyteus-ts/tests/unit/task-management -type f` | Enumerate the native source and test surface | Four tool classes, a tool context, ToDoList/model/schemas, barrels, and dedicated tests exist | No |
| 2026-08-03 | Code | `sed -n '1,220p' autobyteus-ts/src/tools/register-tools.ts` | Verify registry ownership | `registerTools()` imports and registers `AddToDo`, `CreateToDoList`, `GetToDoList`, and `UpdateToDoStatus` | No |
| 2026-08-03 | Code | `rg -n --glob '!dist/**' --glob '!node_modules/**' 'task-management|todoList|ToDoList|create_todo_list|add_todo|get_todo_list|update_todo_status|...' autobyteus-ts/src autobyteus-ts/tests ...` | Trace production callers and exports | Native tools are only registered by `register-tools.ts`; ToDoList is only used by native runtime state/tools/tests/exports; stream wiring is separate | No |
| 2026-08-03 | Code | `sed -n ... autobyteus-ts/src/task-management/tools/todo-tools/*.ts` | Inspect behavior and ownership | Tools mutate an in-memory `AgentRuntimeState.todoList`, serialize results, and notify `AgentExternalEventNotifier` | No |
| 2026-08-03 | Code | `sed -n ... autobyteus-ts/src/agent/context/agent-runtime-state.ts`; `rg -n 'todoList' ...` | Verify state lifecycle and persistence | `todoList` is an in-memory field initialized to `null`; no writer, snapshot, restore, database, or file persistence references exist | No |
| 2026-08-03 | Code | `sed -n ... autobyteus-ts/src/agent/events/notifiers.ts`; `src/events/event-types.ts`; `src/agent/streaming/...` | Trace return/event production | Tool mutation calls `notifyAgentDataTodoListUpdated`; `AgentEventStream` maps it to `AGENT_TODO_LIST_UPDATE` with `ToDoListUpdateData`; `streamTodoUpdates()` exposes it | No |
| 2026-08-03 | Code | `rg -n -C 4 'TODO_LIST_UPDATE|todo' autobyteus-server-ts/src/agent-execution/backends/codex/events/... autobyteus-server-ts/src/services/agent-streaming ...` | Separate shared downstream contracts | Codex turn/item converters emit server `AgentRunEventType.TODO_LIST_UPDATE` directly; server maps it to WebSocket `TODO_LIST_UPDATE`; this path does not need native `autobyteus-ts` ToDo types | No |
| 2026-08-03 | Code | `sed -n ... autobyteus-server-ts/src/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.ts` | Find native downstream coupling | One map entry consumes `StreamEventType.AGENT_TODO_LIST_UPDATE`; it is the only required server source change if the native stream event is removed | No |
| 2026-08-03 | Code | `sed -n ... autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.test.ts` | Locate contract coverage | One parameterized row asserts the native mapping; remove that row while retaining server/Codex TODO coverage | No |
| 2026-08-03 | Code | `sed -n ... autobyteus-ts/tests/unit/...` and `rg -n 'add_todo' ...` | Identify stale tests/negative assertions | Four native tool tests and ToDo model tests assert removed behavior; existing unrelated-tool tests assert `add_todo` remains and must be updated to assert absence while retaining generic tools | No |
| 2026-08-03 | Code | `sed -n ... autobyteus-ts/docs/agent_team_design.md autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md autobyteus-ts/docs/agent_team_streaming_protocol.md` | Check active docs | Two active docs explicitly claim Personal ToDo tools remain; streaming docs claim native `TODO_LIST_UPDATE` remains; these statements become stale and need update | No |
| 2026-08-03 | Code | `git show --stat --oneline a0c438120` and prior ticket requirements | Understand prior boundary decision | Earlier task-plan cleanup intentionally preserved personal ToDo as a separate capability; this task is a later clean-cut removal of that remaining native capability, while preserving server/Codex TODO transport | No |
| 2026-08-03 | Code | `cat autobyteus-ts/package.json autobyteus-ts/tsconfig.build.json autobyteus-ts/vitest.config.ts` | Determine validation commands | Package has `build`; tests run through workspace `pnpm exec vitest --config vitest.config.ts`; build excludes tests | No |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | The default local tool registry is initialized for a native AutoByteus agent and its model-facing tool schema is composed from registered definitions | `registerTools()` -> four native ToDo tool class registrations -> `ToolRegistry` definitions -> model tool schema / invocation pipeline -> tool `_execute()` | `create_todo_list`, `add_todo`, `get_todo_list`, and `update_todo_status` are available as local tools, each under `Task Management` | `autobyteus-ts/src/tools/register-tools.ts`; `src/task-management/tools/todo-tools/*.ts`; `tests/unit/task-management/tools/todo-tools/*.test.ts`; `tests/unit/tools/file/exact-file-tools-removed.test.ts` |
| BEH-002 | System | A native agent invokes one of the registered ToDo tools during a turn | `BaseTool` execution -> `AgentRuntimeState.todoList` / `ToDoList` in-memory mutation -> `AgentExternalEventNotifier.notifyAgentDataTodoListUpdated()` -> `AgentEventStream` -> `StreamEventType.AGENT_TODO_LIST_UPDATE` -> server AutoByteus converter | The native agent receives tool result text and the web/server path can receive an agent-level list update; state is per runtime and non-persistent | `autobyteus-ts/src/task-management/todo-list.ts`; `src/agent/context/agent-runtime-state.ts`; `src/agent/events/notifiers.ts`; `src/agent/streaming/streams/agent-event-stream.ts`; `autobyteus-server-ts/src/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.ts` |
| BEH-003 | Contract | A server backend emits its supported task-progress signal; currently Codex emits plan/progress events | Codex event converter -> `AgentRunEventType.TODO_LIST_UPDATE` -> server agent-run event mapper -> WebSocket `ServerMessageType.TODO_LIST_UPDATE` -> web `todoHandler` / `agentTodoStore` -> `TodoListPanel` | Codex/server-provided to-do updates remain visible in the existing progress UI; this is not the native `autobyteus-ts` tool path | `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts`; `codex-turn-event-converter.ts`; `src/services/agent-streaming/agent-run-event-message-mapper.ts`; `autobyteus-web/services/agentStreaming/handlers/todoHandler.ts`; `components/workspace/agent/TodoListPanel.vue` |
| BEH-004 | User/System | The agent has existing generic file tools and skills available | Existing file/terminal tools and skill discovery/loading remain registered and injected through their current pipelines | An agent can maintain a to-do file or use an installed skill without native ToDo tool names; generic tool and skill contracts are unchanged | `autobyteus-ts/src/tools/register-tools.ts`; `src/tools/file/*`; `src/skills/*`; `src/agent/system-prompt-processor/available-skills-processor.ts`; `src/tools/skill/*` |

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Cleanup / Behavior Change / Refactor.
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Legacy Or Compatibility Pressure, with file/responsibility drift in a native model that no longer has a justified owner.
- Refactor posture evidence summary: The four tools, the in-memory ToDoList owner, and the native stream path form one capability; removing only registry lines would leave unused source, state, exports, and event contracts. The downstream server and web contracts must be split at the backend boundary: remove the AutoByteus-native source mapping but preserve the server/Codex TODO event contract.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `register-tools.ts` | Four native ToDo classes are first-party local registrations | Tool exposure is centralized and has a clean removal point | Remove imports/registrations and add negative registry coverage |
| `AgentRuntimeState` and `ToDoList` | In-memory list has no persistence or independent runtime caller | Native list has no remaining owner after tools are removed | Delete field and native model files rather than retaining dead state |
| `AgentExternalEventNotifier` + `AgentEventStream` | Native list changes have dedicated internal event and stream classes | Dedicated event surface is legacy native wiring | Remove native event/notifier/stream path and its tests |
| Server Codex converters | Codex emits server TODO events without `autobyteus-ts` ToDo classes | Downstream UI contract is not equivalent to native tool capability | Preserve server event enum/mapper/web handler; remove only AutoByteus map row |
| Active `autobyteus-ts` docs | Docs state personal ToDo tools and native TODO stream remain | Docs would reintroduce removed capability if unchanged | Update active docs to file/skill workflow and clarify server/Codex boundary |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/tools/register-tools.ts` | First-party local tool registration | Registers all four native ToDo classes | Remove native imports/registrations; retain unrelated tools |
| `autobyteus-ts/src/task-management/tools/todo-tools/` | Native tool implementations | Four tools plus context type; no external source consumers | Delete the folder and dedicated tests; no compatibility exports |
| `autobyteus-ts/src/task-management/{todo.ts,todo-list.ts,schemas/}` | Native in-memory state/model/schema | Only native ToDo tool/runtime/export/test paths use them | Remove the now-ownerless subsystem and root exports |
| `autobyteus-ts/src/agent/context/agent-runtime-state.ts` | Per-agent runtime state | Contains `todoList: ToDoList | null`, no persistence | Remove import and field; keep all other runtime lifecycle state |
| `autobyteus-ts/src/events/event-types.ts` | Internal event names | Contains `AGENT_DATA_TODO_LIST_UPDATED` | Remove native event enum value and update event tests |
| `autobyteus-ts/src/agent/events/notifiers.ts` | Internal-to-external notifier API | Contains `notifyAgentDataTodoListUpdated` | Remove method; no callers remain |
| `autobyteus-ts/src/agent/streaming/events/stream-event-payload-lifecycle.ts` | Agent stream payload classes/factories | Contains `ToDoItemData`, `ToDoListUpdateData`, and parser | Remove native payloads/factory; preserve unrelated lifecycle payloads |
| `autobyteus-ts/src/agent/streaming/events/stream-event-payloads.ts` | Payload barrel/union | Exports/includes native ToDo payloads | Remove exports and union member |
| `autobyteus-ts/src/agent/streaming/events/stream-events.ts` | Native stream event contract | Defines `AGENT_TODO_LIST_UPDATE` and payload map entry | Remove native stream type/map entry |
| `autobyteus-ts/src/agent/streaming/streams/agent-event-stream.ts` | Internal event -> stream event adapter | Handles native event and exposes `streamTodoUpdates()` | Remove case/import/generator; preserve all remaining event flows |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.ts` | Native AutoByteus stream -> server event adapter | Has one mapping from removed native stream type | Remove the map entry; server `AgentRunEventType.TODO_LIST_UPDATE` remains for Codex |
| `autobyteus-server-ts/tests/.../autobyteus-stream-event-converter.test.ts` | AutoByteus mapping coverage | Parameterized test row asserts removed mapping | Remove that row; retain other native event mapping coverage |
| `autobyteus-ts/tests/unit/tools/file/exact-file-tools-removed.test.ts` | Registry continuity test | Incorrectly expects `add_todo` to remain | Update to assert all four removed names are absent and generic tools remain |
| `autobyteus-ts/docs/agent_team_design.md` | Active architecture boundary doc | Says Personal ToDo tools remain | Replace with file/skill workflow and server/Codex event distinction |
| `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md` | Active runtime/task doc | Names four removed tools and native TODO stream | Remove native ToDo claims; clarify server-owned/Codex-only update path |
| `autobyteus-ts/docs/agent_team_streaming_protocol.md` | Active stream contract doc | Claims personal TODO updates remain native agent events | State that this package no longer emits native ToDo updates; server backends may still emit server TODO events |
| `autobyteus-web/**` TODO handler/store/panel | Server-level TODO presentation | Consumes server `TODO_LIST_UPDATE`, including Codex | Preserve; do not conflate it with removed native tools |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-08-03 | Trace | `rg -n 'todoList' autobyteus-ts/src autobyteus-ts/tests` | Only `AgentRuntimeState`, native tools, ToDo model/tests, and event wiring reference the native list | Removing the native owner does not require alternate internal state |
| 2026-08-03 | Trace | `rg -n 'AGENT_DATA_TODO_LIST_UPDATED|AGENT_TODO_LIST_UPDATE|ToDoListUpdateData|createTodoListUpdateData|streamTodoUpdates' autobyteus-ts/src autobyteus-ts/tests` | All matches are native event/stream definitions, mapping, or tests | Native event/stream can be removed as one coherent slice |
| 2026-08-03 | Trace | `rg -n 'TODO_LIST_UPDATE' autobyteus-server-ts/src autobyteus-server-ts/tests` | Codex converters and server mapper still use server-level TODO event; only AutoByteus converter/test reference the removed `autobyteus-ts` enum | Preserve server/web contract and edit only AutoByteus native bridge |
| 2026-08-03 | Trace | `rg -n 'add_todo|create_todo_list|get_todo_list|update_todo_status' --glob '!dist/**' --glob '!node_modules/**' autobyteus-ts autobyteus-server-ts autobyteus-web` | Active source references are native registration/tests/docs plus historical migration/compliance records | Active code/docs require update; historical ticket records remain historical |
| 2026-08-03 | Probe | `git show --stat --oneline a0c438120` and prior `tickets/done/remove-legacy-task-plans/requirements.md` | Previous cleanup explicitly preserved personal ToDo as a separate feature | This request supersedes that earlier preservation decision for the native tools; do not remove unrelated server task delegation |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None consulted; the task is fully evidenced by the local repository and user request.
- Version / tag / commit / freshness: Local base `origin/personal` at `ba6ebc2a2fbf56f17ee6bbb965f3f153307db3d2` on 2026-08-03.
- Relevant contract, behavior, or constraint learned: `autobyteus-server-ts` uses `autobyteus-ts` `StreamEventType` for the AutoByteus backend, while Codex emits server-level TODO events independently.
- Why it matters: A clean native removal requires one server converter/test edit but must not remove the shared WebSocket/UI path.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for source tracing; native package unit/build checks are sufficient for implementation scope, with server targeted type/test checks for the bridge.
- Required config, feature flags, env vars, or accounts: None.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: `git fetch origin personal`; `git worktree add ...`; repository searches and source reads listed in the source log.
- Cleanup notes for temporary investigation-only setup: Retain the dedicated worktree and authoritative artifacts for downstream handoffs.

## Findings From Code / Docs / Data / Logs

1. **Native exposure:** `registerTools()` is the only first-party registration site for the four native tool classes. Removing only class files without removing registration would break the build; removing only registration would leave dead public exports and runtime state.
2. **Native owner:** `AgentRuntimeState.todoList` and `ToDoList` are in-memory only. `ToDoList` generates IDs, stores items in an array/map, and changes status. No normal persistence writer/reader or snapshot/restore path references it.
3. **Native return/event path:** Native tools notify through `AgentExternalEventNotifier`, and `AgentEventStream` converts that internal event into `StreamEventType.AGENT_TODO_LIST_UPDATE`. This is a dedicated native event path, not the server `AgentRunEventType` contract.
4. **Downstream split:** The server AutoByteus converter consumes the native stream enum; Codex converters produce `AgentRunEventType.TODO_LIST_UPDATE` directly. The frontend handler/store/panel consume the server/WebSocket event, so they remain valid for Codex and other server backends.
5. **Generic replacement capability:** Existing `read_file`, `write_file`, `edit_file`, `run_bash`, and skill discovery/loading are separate registry/pipeline capabilities. No replacement skill is required by the repository to remove native tools.
6. **Existing negative-test drift:** `legacy-task-tools-removed.test.ts` and `exact-file-tools-removed.test.ts` predate this request and currently assert `add_todo` remains. They must be rewritten as native ToDo removal/continuity checks rather than left contradictory.
7. **Historical records:** Migration/compliance ticket files and archived prior reports name the old tools. They are historical evidence, not active runtime contracts, and should not be rewritten as if history changed.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject, location, representative shape, and approximate volume: No persisted native to-do subject. `ToDoList` is an object held on `AgentRuntimeState`; no filesystem/database serialization is referenced by `rg -n 'todoList'` or the inspected state/bootstrap/memory restore paths.
- Relevant code-model, serialization, semantic, or physical-store change: Deletion of an in-memory field/model and native event payloads only; no persisted schema changes.
- Normal readers and writers, including unknown/extra-field behavior: No readers/writers exist for native ToDo state. The server/WebSocket TODO payload is a separate transient event contract and is not stored by `autobyteus-ts`.
- Representative direct-read or compatibility evidence: N/A; there is no native persisted representation.
- Required semantics and invariants preserved by direct use: `N/A` — no persisted data.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: None for native ToDo state. Server/web transient TODO events remain governed by their existing contracts.
- Concrete benefit, cost, and risk of migration if it remains a candidate: Migration would add machinery for a non-persisted object and has no benefit.
- Existing migration framework or lifecycle constraints, only if migration may be required: N/A.

## Constraints / Dependencies / Compatibility Facts

- Clean-cut removal is intentional: no aliases, registry tombstones, no-op wrappers, or fallback tool names.
- Remove the native `autobyteus-ts` ToDo API and stream enum entries as part of the same source change so no dead native path remains.
- Keep `ToolCategory.TASK_MANAGEMENT`; `autobyteus-server-ts` server-owned delegation tools use that category even after native ToDo tools disappear.
- Keep server `AgentRunEventType.TODO_LIST_UPDATE`, server `ServerMessageType.TODO_LIST_UPDATE`, Codex event converters, and web TODO handler/store/panel because they are independently produced/consumed.
- Package consumers importing removed `autobyteus-ts` native ToDo exports or stream enum values will break by design; delivery should record this as a breaking public-surface cleanup.
- Do not edit archived migration/compliance records merely to erase historical references.

## Open Unknowns / Risks

- No material investigation unknowns remain for the source design.
- Residual risk: external consumers may import native `ToDoList`, `ToDoSchema`, or tool classes despite no in-repository caller; this is an intentional breaking change under clean-cut removal.
- Residual risk: server AutoByteus runs will no longer emit native TODO updates, while Codex/server backends retain their server TODO updates. This follows the requested replacement with files/skills and the backend ownership boundary.
- Delivery should verify generated `autobyteus-ts/dist` is treated according to repository tracking/build convention; source is authoritative and build output must not leave stale active artifacts if tracked/generated outputs are part of the branch.

## Notes For Architecture Reviewer

The recommended design removes the native tool capability as one coherent slice: tool classes/tests/exports, native in-memory state/model/schema, native notifier/event/stream payloads, and the AutoByteus converter mapping. It intentionally preserves the server-level `TODO_LIST_UPDATE` event for Codex and other server backends, generic file/skill tools, `ToolCategory.TASK_MANAGEMENT`, and unrelated runtime/event contracts. Review especially the scope distinction between native `autobyteus-ts` tool removal and downstream server/web TODO presentation.
