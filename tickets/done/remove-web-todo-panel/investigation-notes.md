# Investigation Notes

## Investigation Meta

- Package identifier: `remove-web-todo-panel`
- Request / ticket: User report (2026-09-29): "the ToDo on the Activity area is no longer used. There is even no to do on the autobyteus-ts, and no todo in the server anymore." Screenshot shows the right-panel Activity tab with an empty `To-Do — 0 Tasks` section ("No to-dos yet") above the `Activity — 70 Events` feed.
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel` on `codex/remove-web-todo-panel`
- Resolved base remote / branch / revision: `origin/personal` @ `43b6fc0f4b9b51c611df8895a57f8bb13d646f3e` (fetched 2026-09-29)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: Worktree and branch created from refreshed `origin/personal`; ticket folder `tickets/in-progress/remove-web-todo-panel/`.
- Bootstrap blocker: None
- Current solution revision ID: `SR-006`
- Investigation status: Requirements approved (SR-005); architecture investigation complete (SR-006).

## Initial Request And Clarifications

- Original request: see above; the implied ask is to remove the unused To-Do UI from the Activity tab.
- Clarifications received: None yet.
- User-supplied facts and constraints: native `autobyteus-ts` has no to-do capability; user believes the server has none either.
- Initial ambiguity: whether removal should stop at the web UI or also remove the server/contract `TODO_LIST_UPDATE` event path (see DEC-001 in requirements).

## Product And Domain Understanding

- Product area: `autobyteus-web` right-side panel → `Activity` tab (`ProgressPanel`), which stacks a collapsible `To-Do` section over a collapsible `Activity` feed.
- Affected actors or systems: desktop/web users viewing agent runs (single agent and team members); server streaming contracts; Codex runtime backend event conversion.
- Existing purpose: show an agent-maintained plan/checklist. Originally fed by native `autobyteus-ts` to-do tools (removed in `fa0fd927a`, ticket `tickets/done/remove-todo-list-tools`).
- Terminology: "To-Do panel" = `TodoListPanel.vue`; "todo event" = `TODO_LIST_UPDATE` (server `AgentRunEventType`, WebSocket `ServerMessageType`, presentation/team-stream contract DTOs).

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-09-29 | Command | `git grep -i "todo_list\|TODO_LIST_UPDATE\|todos"` over web, server src, autobyteus-ts src, contracts | Map producers/consumers | Only producers of `TODO_LIST_UPDATE` are two Codex converter cases. No producer in autobyteus-ts, Claude, Antigravity, ACP, Grok, AutoByteus backends. | — |
| 2026-09-29 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts:411-418` | Codex producer 1 | `item/plan/delta` → `TODO_LIST_UPDATE` with the raw Codex payload serialized. | Compare with protocol |
| 2026-09-29 | Code | `.../codex/events/codex-turn-event-converter.ts:56-63`, `codex-thread-event-name.ts:5` | Codex producer 2 | `turn/taskProgressUpdated` → `TODO_LIST_UPDATE` with raw payload. | Compare with protocol |
| 2026-09-29 | Command | `codex app-server generate-ts --out /tmp/codex-schema-probe` (codex-cli 0.159.0) | Authoritative Codex protocol shapes | No `turn/taskProgressUpdated` notification exists. Plan notifications are `turn/plan/updated` `{threadId, turnId, explanation, plan:[{step,status}]}` (not subscribed by AutoByteus) and `item/plan/delta` `{threadId, turnId, itemId, delta: string}` (EXPERIMENTAL, plan-mode proposed-plan text). | — |
| 2026-09-29 | Code | `autobyteus-server-ts/src/agent-collaboration/execution/events/collaboration-agent-presentation-adapter.ts:348-358` | How raw payload becomes presentation event | `const entries = Array.isArray(p.todos) ? p.todos : []` — neither Codex payload has `todos`, so every emitted update carries `todos: []`. | — |
| 2026-09-29 | Code | `autobyteus-web/components/progress/ProgressPanel.vue`, `components/workspace/agent/TodoListPanel.vue`, `stores/agentTodoStore.ts`, `services/agentStreaming/handlers/todoHandler.ts`, `components/layout/RightSideTabs.vue:179-184` | Web consumers | Panel renders store contents; store only written by `todoHandler`; `RightSideTabs` auto-switches to Activity tab when todos become non-empty. | — |
| 2026-09-29 | Doc | `tickets/done/remove-todo-list-tools/requirements-doc.md` (BEH-003, REQ-003, Out of Scope) | Prior decision | The previous ticket deliberately preserved server/Codex/web TODO handling on the assumption that Codex populated the panel. Current evidence shows that assumption does not hold. | Surface to user |
| 2026-09-29 | Command | `git grep` over `autobyteus-android`, `autobyteus-ios`, `autobyteus-message-gateway`, `applications`, `autobyteus-application-*` | Other clients | No `TODO_LIST_UPDATE`/todo consumer. | — |
| 2026-09-29 | Command | `git grep` server run-history/projection/memory for todo | Persistence | No persisted todo state; the event is transient streaming only. | — |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | User opens the right-panel `Activity` tab for any agent/team-member run | `ProgressPanel` shows a `To-Do (N Tasks)` collapsible section above the `Activity (N Events)` collapsible feed; only one section is expanded at a time (default Activity). | To-Do always shows `0 Tasks` / "No to-dos yet — Ask the agent to break down the work…". The empty-state text promises behavior no runtime delivers. | Screenshot; `ProgressPanel.vue`; producer analysis | High |
| BEH-002 | System/Contract | Codex runtime `item/plan/delta` (plan-mode only) or nonexistent `turn/taskProgressUpdated` | Converted to `AgentRunEventType.TODO_LIST_UPDATE` → presentation adapter → WebSocket/team-stream `TODO_LIST_UPDATE` `{todos: []}` → web `todoHandler` → `agentTodoStore.setTodos(runId, [])`. | Can only ever deliver an empty list. No runtime produces a non-empty to-do list. | Converter + adapter code; Codex 0.159.0 schema | High |
| BEH-003 | User | Todo store becoming non-empty for the active run | `RightSideTabs` watcher switches the right panel to the Activity tab. | Unreachable (store never non-empty). | `RightSideTabs.vue:179-184` | High |
| BEH-004 | User | Activity feed | Tool calls, approvals, etc. listed with event count; collapsible header. | Must be preserved. | `ActivityFeed.vue` | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question |
| --- | --- | --- | --- |
| `autobyteus-web/components/progress/ProgressPanel.vue` | Stacks TodoListPanel + ActivityFeed with shared expand state | UI must become Activity-only | How the Activity header/collapse behaves when it is the only section |
| `autobyteus-web/components/workspace/agent/TodoListPanel.vue` | To-Do UI | Remove | — |
| `autobyteus-web/stores/agentTodoStore.ts`, `types/todo.ts` | Per-run todo state | Remove | — |
| `autobyteus-web/services/agentStreaming/handlers/todoHandler.ts` (+ spec), `handlers/index.ts`, `agentStreamMessageProjector.ts`, `protocol/messageTypes.ts`, `teamStreamDtoAdapters.ts`, `agentStatusHandler.ts` (comment) | Message handling | Remove with the message type | Unknown message types after removal: confirm projector behavior on unrecognized type |
| `autobyteus-web/components/layout/RightSideTabs.vue` (+ spec mock) | Auto-switch watcher | Remove | — |
| `autobyteus-web/localization/messages/{en,zh-CN}/workspace.generated.ts` | 3 TodoListPanel keys each | Remove keys | Confirm generator/audit script expectations |
| `autobyteus-web/docs/{agent_execution_architecture,settings,terminal}.md` | Document todo path | Update docs | — |
| `autobyteus-agent-presentation-contracts/src` + committed `dist` | `TODO_LIST_UPDATE` DTO schema | Remove (if DEC-001 = A) | Rebuild committed dist |
| `autobyteus-team-stream-contracts/src` + committed `dist` | Team `TODO_LIST_UPDATE` schema/message | Remove (if DEC-001 = A) | Rebuild committed dist |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run-event.ts`, lifecycle-status state, presentation event/adapter/projector, team-agent-event, websocket mapper/projector, `services/agent-streaming/models.ts` | Server event type plumbing | Remove (if DEC-001 = A) | — |
| Codex converters + `codex-thread-event-name.ts` | Map `item/plan/delta` and nonexistent `turn/taskProgressUpdated` | Stop emitting todo events (if DEC-001 = A) | Disposition of `item/plan/delta` (ignore like other deltas) and the dead enum member |
| Server tests: `agent-stream-broadcaster.test.ts`, `agent-stream-handler.test.ts`, `codex-reasoning-block-converter.test.ts:259` | Use TODO_LIST_UPDATE / plan delta as sample | Rewrite with another message type / updated expectation | — |

## Structural And Payload Surface Inventory

- Payload surfaces: WebSocket `TODO_LIST_UPDATE` (single-agent and team streams), shared Zod contracts in two contract packages.
- Readers/writers: only the web client reads; only Codex converters write. No mobile/gateway/application readers.
- Structural impacts: removal of one streaming message type across server→contracts→web (all in this monorepo, shipped together). No persistence, security, concurrency or deployment change.

## Persisted Data And State Facts

- No persisted todo data. Web store is in-memory per session. Nothing to migrate.

## Product Design Request Context

- Product Design request in the current input: `Not stated`. This is a removal; no Product Design needed.

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RSK-001 | Risk | A future desire to show Codex's real checklist (`turn/plan/updated`) would need a new, correctly-shaped path. | Removing the contract loses the placeholder. | Not in scope; a future feature can add a correct contract. Recorded as DEC-001 option C. | Open (user decision) |
| UNK-001 | Unknown | Web projector behavior if an old server sends `TODO_LIST_UPDATE` to a new client. | Mixed-version tolerance. | Architecture phase; server/web ship together in desktop bundle. | Open |

## SR-002 Investigation (2026-09-29) — Why Codex to-dos never appear; Claude background tasks

User follow-up: "I never see there are to-do's… either it's not used or it's not working. You have to investigate." Plus: rename/replace To-Do with Claude Agent SDK background tasks (show running, then finished). User declined inspection of personal `~/.codex` session history; evidence below is protocol + code only.

### Codex to-do path: conclusively never produces a visible to-do

| Source | Finding |
| --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts:237` | Threads start with `collaborationMode: null` → Codex plan mode is never enabled. `item/plan/delta` (plan-mode proposed-plan text, EXPERIMENTAL per protocol) therefore never fires in AutoByteus. |
| Codex 0.159.0 generated protocol (`/tmp/codex-schema-probe/ServerNotification.ts`) | `turn/taskProgressUpdated` does not exist. Mapping is dead code. |
| Same protocol, `v2/TurnPlanUpdatedNotification.ts` | Codex's actual checklist (`update_plan` tool) is `turn/plan/updated` `{explanation, plan:[{step,status}]}`. AutoByteus has no enum member/case for it; converters' `default: return []` drops it. |
| `collaboration-agent-presentation-adapter.ts:349` | Even if a mapped event fired, payload lacks `todos` → `todos: []`. |
| `tests/unit/.../codex-reasoning-block-converter.test.ts:259-261` | Tests exercise plan delta / task progress only as boundary no-ops with `{turnId}` payloads; no test asserts a non-empty to-do. |

Conclusion: four independent defects; the panel cannot show a to-do from any runtime. Matches user observation.

### Claude Agent SDK background tasks: current state

| Source | Finding |
| --- | --- |
| `tickets/done/claude-sdk-background-task-lifecycle/probe-evidence/probe-results.md` (Probe C) | In streaming-input mode the CLI emits `system/background_tasks_changed` + `task_started` when a background Bash starts, `background_tasks_changed` + `task_updated` + `task_notification completed <output_file>` when it finishes, then starts a new model turn by itself. |
| `tickets/done/claude-sdk-streaming-input-session/requirements-doc.md` DEC-006, Out of Scope line 53 | Streaming-input ticket (approved 2026-09-25) explicitly deferred "a background-task panel, per-task stop button, or running-task indicator in the UI" to a later ticket. This request is that follow-up (without stop button unless approved). |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts:268` | Background tasks are enabled; only a warning if an inherited env disables them. |
| `.../claude/session/claude-background-task-registry.ts` | Server already observes `background_tasks_changed`, `task_started`, `task_updated`, `task_notification` per session; tracks background task IDs + descriptions; filters foreground `task_notification` (subagents also emit task frames). It emits no UI events — it only feeds turn control and notices. |
| `.../claude/session/claude-session.ts:421-424`, `claude-turn-tracker.ts:299,359` | Only UI-visible output today: a `SYSTEM_TASK_NOTIFICATION` chat notice "Background task completed: <description> (<status>)" before a Claude-initiated turn, or "… — Claude was stopped before reporting it" on interrupt. Nothing is visible while a task runs. |
| `claude-turn-tracker.ts:65-68` | `system/task_started|task_updated|task_progress|task_notification` are classified as frames inside a turn (turn-tracking only). |
| Claude Agent SDK 0.3.231 installed in main checkout; `autobyteus-server-ts/package.json` pins 0.3.280 | `SDKBackgroundTasksChangedMessage {tasks:[{task_id, task_type, description}]}` (REPLACE semantics: full live set); `SDKTaskStartedMessage {task_id, tool_use_id?, description, subagent_type?, task_type?, workflow_name?, prompt?, skip_transcript?}`; `SDKTaskProgressMessage {task_id, description, usage{total_tokens,tool_uses,duration_ms}, last_tool_name?, summary?}`; `SDKTaskUpdatedMessage {task_id, patch{status?: pending|running|completed|failed|killed|paused, description?, end_time?, error?, is_backgrounded?}}`; `SDKTaskNotificationMessage {task_id, status: completed|failed|stopped, output_file, summary, usage?}`. Task type labels include shell, subagent, monitor, workflow. Verify against 0.3.280 during design. |
| Other runtimes | Codex/AutoByteus/Antigravity/ACP/Grok have no equivalent background-task signal wired today. |

### SR-003 — Other runtimes that start background tasks (user question 2026-09-29)

| Runtime | Source | Finding |
| --- | --- | --- |
| Antigravity (AGY) | `tickets/done/agy-background-task-turn-liveness/requirements-doc.md` BEH-002/BEH-003, investigation CUR-2/4/5, probes P1/P2; `backends/antigravity/stream/agy-stream-event-converter.ts:18,143,187-195`; `agy-background-process-groups.ts`; `agy-stream-process.ts:65-83` | Two kinds. (1) **Non-daemon background command** (`run_command` with `WaitMsBeforeAsync`): AGY keeps the turn open until it finishes and injects the completion into the same turn; it already shows as a running → finished tool call in the Activity feed. It does not outlive the turn. (2) **Daemon** (`IsDaemon: true`, e.g. `pnpm dev`): outlives the turn; AGY **never reports** its end. At turn end AutoByteus closes that tool call as succeeded with output "Started as a background task; still running when the turn ended." When AGY is stopped, AutoByteus kills AGY's background process groups (macOS/Linux). No signal exists if a daemon exits on its own. |
| Codex | Codex 0.159.0 protocol `ServerNotification.ts` | No agent background-task notifications. `process/outputDelta`/`process/exited` belong to client-initiated `process/spawn`, not agent work. |
| ACP / Grok | `git grep` in `backends/acp`, `backends/grok` | No background-task signal. |
| AutoByteus native | autobyteus-ts | No background tasks. |

Conclusion (before probes): Claude has a full lifecycle (start, status, finish, summary). AGY daemons have a start signal; end-of-daemon observability needed a probe (below).

### SR-004 — AGY daemon exit probes (user request 2026-09-29: "did you already do experiments…?")

Probe script: `probes/agy-daemon-exit-signal-probe.py` (AGY CLI 1.2.13, model gemini-3.8-flash-high). Logs: `probe-evidence/p3-agy-daemon-exit-signal.log`, `probe-evidence/p4-agy-daemon-failure-signal.log`.

| Probe | Setup | Observation |
| --- | --- | --- |
| P3 success | Daemon `sleep 20; echo … > daemon-exit.txt`, turn ends immediately; 45 s idle; then a second user message | (1) stream-json: step 2 `run_command` `ACTIVE` at 6.4 s; `result SUCCESS` at 8.5 s with step 2 never `DONE`. `tool_info.parameters` in the stream carries only `CommandLine` — **no `IsDaemon`**. (2) At daemon exit (26.6 s) **AGY emitted nothing on stdout**. (3) At the same instant AGY wrote `<brain>/<conversation>/.system_generated/messages/<uuid>.json`: `sender: "<conversation>/task-2"`, `renderDetails.messageTitle: "Daemon execution finished"`, `content: "Task id \"…/task-2\" finished with result:\n\nThe command exited with code 0.\nStdout: … Log: file://…/tasks/task-2.log"`, `sourceMetadata.tool.stepIndex: 2`, `toolCall.argumentsJson` incl. `"IsDaemon": true`, `toolSummary`. `messages/read.json` marked it read immediately. (4) AGY's own transcript (`logs/transcript.jsonl`) shows step 4 `SYSTEM_MESSAGE` and step 5 model reply "The background daemon command has finished running (exit code 0)." both **created at 16:48:40 (daemon exit time)** — AGY reacted autonomously — but these steps reached stdout only at 54.7 s together with the next user turn; the stream `system_message` step carries no content. |
| P4 failure | Daemon `sleep 10; echo FAILING >&2; exit 3` | Same pattern. Message file at exit: `messageTitle: "Daemon start finished"` (title = `toolSummary` + " finished"; varies), `content: "… The command exited with code 3.\nOutput:\nFAILING …"`, `sourceMetadata.tool.stepIndex: 2`. Exit code distinguishes completed vs failed. |

Findings:
- Real-time AGY daemon finish **is observable** via the conversation's `.system_generated/messages/*.json` files, correlated to the tool step by `sourceMetadata.tool.stepIndex` (also `sender` suffix `task-<step>`), with status from "exited with code N".
- Task id pattern `<conversation>/task-<stepIndex>` (also seen as task-116 for step 116 in the prior ticket).
- The AGY stream alone cannot identify daemons (no `IsDaemon` in stream parameters) nor report their exit in real time; the message file carries `IsDaemon: true`.
- Precedent: AutoByteus already reads AGY brain files (`stream/agy-step-output-reader.ts` reads `.system_generated/steps/<n>/output.txt` with bounded, no-symlink, conversation-confined reads). The messages folder is an undocumented internal format → version risk; must fail safe (unknown format → entry stays running until AGY stops, then stopped).
- Side observation (out of scope): AGY's autonomous reaction to the daemon finish (system message + model reply) is withheld from stdout until the next user turn, so AutoByteus shows it only then, attributed to that turn. Separate-ticket candidate.

### Implications (SR-002)

### Implications

- The dead To-Do contract can be removed and a correctly shaped, runtime-owned background-task contract introduced; Claude is the first (and currently only) producer.
- The server already owns the per-session background-task view; exposing it is a projection of existing observation, not new runtime behavior.
- Background tasks die with the Claude process (`registry.clear()`); no durable task state exists today.

## Requirement Implications

- The user's premise is correct in effect: no runtime can put anything in the To-Do panel. The only remaining "todo" code in the server is a Codex mapping that always yields an empty list (one of its two source events doesn't exist in the Codex protocol).
- Therefore the clean outcome is removal of the whole dead path, not only the UI, unless the user wants Codex plans surfaced (a new feature).

## Architecture Investigation Findings (post-approval, SR-006)

### Event pipeline (current)

| Stage | Path | Fact | Design implication |
| --- | --- | --- | --- |
| Runtime event type | `autobyteus-server-ts/src/agent-execution/domain/agent-run-event.ts:23` | `AgentRunEventType.TODO_LIST_UPDATE` beside other runtime-neutral types | Replace with `BACKGROUND_TASK_UPDATED` |
| Status processor | `agent-execution/events/processors/lifecycle-status/agent-turn-lifecycle-state.ts:20-36,178-202` | `ACTIVITY_EVENT_TYPES` includes `TODO_LIST_UPDATE`; activity events set status `running` and can open an ANONYMOUS turn while a command is pending | Background-task events arrive **between turns** (Claude completion, AGY poll) → must NOT be activity events |
| Memory | `agent-memory/services/runtime-memory-event-accumulator.ts` switch `default` ignores unknown types | Background-task events are not persisted → satisfies DEC-005 without extra code |
| Single-agent websocket | `services/agent-streaming/agent-run-event-message-mapper.ts:121` passes payload through; `models.ts:29` `ServerMessageType` | Add mapping for new type; remove todo |
| Collaboration (team/org member) | `agent-collaboration/execution/events/collaboration-agent-presentation-adapter.ts:348-358` (parse/validate) → `agent-presentation-event.ts:124` (typed union) → `agent-presentation-message-projector.ts:71` (org DTO) and `services/agent-streaming/team-agent-event-websocket-projector.ts:104` (team DTO); `agent-team-execution/domain/team-agent-event.ts:112` | Typed details + Zod-validated DTOs | Replace todo variant in each |
| Shared contracts | `autobyteus-agent-presentation-contracts/src/agent-presentation-message-dtos.ts:89`; `autobyteus-team-stream-contracts/src/team-agent-message-dtos.ts:42`, `team-stream-server-message.ts:52`; committed `dist/` (build: `tsc -p tsconfig.build.json`) | Replace schema, rebuild dist |
| Web routing | `autobyteus-web/services/agentStreaming/agentStreamMessageProjector.ts:189`; unknown types → `console.warn`, no crash | Mixed-version tolerance OK (QR-001) |
| Web DTO adapters | `services/agentStreaming/teamStreamDtoAdapters.ts:79,149`; `protocol/messageTypes.ts:52,191-198,287` | Replace |
| Web state/UI | `stores/agentTodoStore.ts` (per-run Map), `handlers/todoHandler.ts`, `components/progress/ProgressPanel.vue` (accordion `expandedSection` 'todo'/'activity', default 'activity'), `components/workspace/agent/TodoListPanel.vue`, `components/layout/RightSideTabs.vue:179-184` (auto-switch) | Same per-run pattern for the new store; panel moves to `components/progress/` beside `ActivityFeed.vue` |
| Localization | `localization/messages/{en,zh-CN}/workspace.ts` (hand-written) and `workspace.generated.ts`; scripts `guard:localization-boundary`, `audit:localization-literals` | New strings in `workspace.ts`; delete TodoListPanel generated keys |

### Claude

| Path | Fact |
| --- | --- |
| `backends/claude/session/claude-turn-tracker.ts:63-69,249-253` | `system/background_tasks_changed|task_started|task_updated|task_progress|task_notification` classified `task` and routed to `registry.observeTaskFrame` |
| `backends/claude/session/claude-turn-tracker.ts:263-278` | `processExited()` and `close()` call `registry.clear()` (tasks die with the process) |
| `backends/claude/session/claude-session.ts:85,177,421-424` | Session owns the registry; emits `ClaudeSessionEvent`s via `emitRuntimeEvent`; `ClaudeSessionEventConverter` maps them to `AgentRunEvent`s (`events/claude-session-event-converter.ts:244-255` pattern) |
| `tickets/done/claude-sdk-streaming-input-session/probe-evidence/probeJ.log`, `probeO.log` | Order at start: `background_tasks_changed [local_bash:<description>]` **then** `task_started type=local_bash`. Foreground Bash also emits `task_started type=local_bash` (so only the background set identifies background tasks). Finish: `background_tasks_changed []` → `task_updated` → `task_notification completed` |
| SDK 0.3.231 typings | `task_notification.status` ∈ completed/failed/stopped + `summary`; `task_updated.patch.status` ∈ pending/running/completed/failed/killed/paused; friendly types shell/subagent/monitor/workflow (`BackgroundTaskSummary`). Observed raw `task_type`: `local_bash`. Other raw values (subagent/monitor/workflow) unobserved → verify on SDK 0.3.280 |

### Antigravity

| Path | Fact |
| --- | --- |
| `backends/antigravity/backend/agy-agent-run-backend.ts` | Backend owns process, converter, serialized `eventQueue`/`deliver`; `interrupt()` and `terminate()` stop the whole AGY process; `handleClose()` on unexpected exit. `handleMessage` drops messages when no turn |
| `stream/agy-stream-event-converter.ts:143,187-195` | At `result`, `closeBackgroundTools()` emits `TOOL_EXECUTION_SUCCEEDED` (RUNNING, "Started as a background task…") for every still-open tool step; `openTools` holds `{turn_id, invocation_id, tool_name, arguments}` |
| `stream/agy-step-output-reader.ts` | Existing bounded (16 KiB), `O_NOFOLLOW`, conversation-confined reader of AGY brain files; default brain root `~/.gemini/antigravity-cli/brain` |
| Probes P3/P4 | Step indexes are conversation-wide; message file `sourceMetadata.tool.stepIndex` equals the stream `step_index`; files appear within ~0 s of daemon exit |

## Notes For Architecture Design

- Pending approval of requirements baseline SR-001.
