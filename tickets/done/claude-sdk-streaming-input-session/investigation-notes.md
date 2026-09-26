# Investigation Notes

## Investigation Meta

- Package identifier: `claude-sdk-streaming-input-session`
- Request / ticket: Follow-up to `claude-sdk-background-task-lifecycle` (v1.4.78), approved by the user on 2026-09-24: move the Claude Agent SDK backend to SDK streaming input mode. Start request: "since its released. now we could work on the second ticket right?"
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session`
- Repository mode: `Git`
- Task worktree / branch: same / `codex/claude-sdk-streaming-input-session`
- Resolved base: `origin/personal` @ `6f7b5e371` (v1.4.81; fast-forwarded from `40b1783f4` on 2026-09-25 at user request, 44 commits; the only change in the Claude backend/runtime/input scope is `autobyteus-server-ts/package.json`, see SR-002)
- Finalization target: `origin/personal`
- Bootstrap result: worktree created. No `node_modules` yet
- Predecessor evidence: `origin/personal:tickets/done/claude-sdk-background-task-lifecycle/`, which holds the root cause, probes A-D and the SR-002 SDK conformance review
- Current solution revision ID: `SR-008`
- Investigation status: requirements approved (SR-006); architecture investigation complete (SR-007)

## Initial Request And Clarifications

- Original request: in the predecessor ticket the user asked "did we use the claude agent sdk correctly … maybe claude agent sdk has improved". The answer was that we use the valid but limited single-message mode, while the SDK docs prefer streaming input for long-lived hosted sessions. The user approved "temp fix now, ticket two after". This is ticket two.
- Clarifications pending: DEC-001..DEC-006 in `requirements-doc.md`.

## Product And Domain Understanding

- Product area: AutoByteus server, Claude Agent SDK runtime backend (`autobyteus-server-ts/src/agent-execution/backends/claude`, `src/runtime-management/claude/client`) and its seams with `AgentRun` input admission, the turn lifecycle, memory and the web stream.
- Actors: users of standalone Claude-runtime agents and of teams with Claude members; team members exchanging messages.

## Source Log

| Date | Type | Source / Command | Finding |
| --- | --- | --- | --- |
| 2026-09-24 | Code | `backends/claude/backend/claude-agent-run-backend.ts` | `inputCapabilities = { activeTurnAppend: "unsupported" }`; `dispatchUserInput` rejects `append_to_active_turn`; interrupt → `session.interrupt(turnId)` |
| 2026-09-24 | Code | `backends/claude/session/claude-session.ts` (`executeTurn`) | One `query({prompt: string})` per turn, closed on `result`. Our turn id is generated locally (`${runId}:turn:${Date.now()}`). Interrupt = `AbortController.abort()` + wait |
| 2026-09-24 | Code | `runtime-management/claude/client/claude-sdk-client.ts` (on base) | `CLAUDE_CLI_RUNTIME_POLICY_ENV` (disable background tasks, 30-min Bash ceiling) is merged into the turn env; the explicit built-in `tools` list has 10 tools (Bash, Read, Edit, Write, Glob, Grep, NotebookEdit, WebFetch, WebSearch, Skill) |
| 2026-09-24 | Code | `agent-execution/input/agent-run-input-admission-state.ts`; `docs/modules/agent_execution.md` "Active Input And Interrupt Command Results" | AgentRun owns one FIFO. With `activeTurnAppend: "supported"` (Codex → `turn/steer`) queued input goes into the active turn; with `unsupported` (Claude, AutoByteus) it waits and becomes a later `start_turn` |
| 2026-09-24 | Doc | `docs/modules/agent_execution.md` "Canonical Turn Lifecycle" | `TURN_STARTED` opens the supplied turn id regardless of input. A terminal for turn A cannot close a newer B. Lifecycle is provider-agnostic, so a provider-initiated turn is structurally admissible |
| 2026-09-24 | Code | `autobyteus-web/services/agentStreaming/agentStreamMessageProjector.ts` L198 | Frontend ignores `TURN_STARTED`; segments render by turn id. A CLI-initiated turn would appear as agent output with no user message before it |
| 2026-09-24 | Code | `agent-memory/services/runtime-memory-event-accumulator.ts` | User traces are written only from forwarded AgentRun input; run events are recorded by turn. A CLI-initiated turn would record agent/tool traces without a triggering trace |
| 2026-09-24 | Contract | SDK 0.3.280 `sdk.d.ts` (npm pack) | `SDKUserMessage` supports `uuid`, `isSynthetic`, `origin`, and `priority?: 'now'\|'next'\|'later'` (priority is **not** in public docs). The result carries `origin`, `user_message_uuid` and `user_message_uuids` |
| 2026-09-24 | Web | https://code.claude.com/docs/en/agent-sdk/typescript (`user_message_uuid`, result `origin`) | Messages sent close together can be merged into one turn; a regular message can be picked up between tool calls; results for injected background-task turns carry `origin: {kind:"task-notification"}`; several completions can be answered in one turn |
| 2026-09-24 | Web | agent-sdk hosting / streaming-vs-single-mode / agent-loop | Recommended pattern: one long-lived query per session with `streamInput()`. A streaming session survives error results except a crash (`error_during_execution` + process exit) |
| 2026-09-24 | Runtime | `ps` on live Claude CLI processes | About 400 MB **RSS** per Claude CLI process (two samples: 422 MB, 399 MB) |
| 2026-09-25 | Runtime | `ps -o rss` + `footprint -p` on a live SDK-spawned `claude --input-format stream-json` process (10 min old) | RSS 491 MB but **physical footprint 169 MB**. RSS counts the shared, read-only pages of the `claude` binary, which are loaded once and shared by all Claude processes. The footprint is the real per-process cost: **about 170 MB per live Claude run** (grows with conversation size) |
| 2026-09-24 | Runtime | Probes E and F (below) | Streaming behavior verified live |
| 2026-09-25 | Runtime | `probe-evidence/mem.mjs` (fresh streaming session, 1 short turn, idle 5 s) and `footprint -p` on a running `codex app-server` | Fresh idle Claude process: RSS 269 MB, **footprint 152 MB**. After a 10-min session: footprint 169 MB. Codex app-server: RSS 154 MB, footprint 83 MB (but Codex shares one process per workspace, while Claude needs one per run) |

## Runtime, Probe, Or Reproduction Findings

SDK 0.3.280 with the PATH CLI 2.1.281, real API, model `haiku`, one streaming-input query. Logs: `probe-evidence/probeE.log`, `probe-evidence/probeF.log`.

| Probe | Scenario | Observation |
| --- | --- | --- |
| E-S1 | Background Bash, then idle | Result 1 answers the message uuid. About 11 s later: `task_notification completed`, `system init`, and a **CLI-initiated turn** whose result has `origin={"kind":"task-notification"}` and no uuid. The marker file exists. Same process and session throughout |
| E-S2 | Second message sent 5 s into a foreground tool call | Picked up in the **same turn**: one result, `user_message_uuids=[a,b]`, and the reply satisfies both messages |
| E-S3 | Foreground `sleep 40` | The CLI refused a foreground command starting with `sleep` (documented guard), so this interrupt test was invalid; re-run as probe F |
| F | `interrupt()` during a 40 s foreground python command | Receipt `{still_queued:[]}` immediately; `task_notification stopped`; result `error_during_execution` with `terminal_reason: aborted_tools`. **The process stayed alive** and the next message was answered in about 1 s |
| E (all) | Turn boundaries | Each turn begins with a `system init` frame (same session id) and ends with one `result` |

## Relevant Existing Behavior

| Behavior ID | Kind | Current Behavior | Evidence |
| --- | --- | --- | --- |
| BEH-001 | System | Background Bash is disabled by the v1.4.78 policy env; long commands run in the foreground, up to 30 min, and hold the turn | Predecessor ticket |
| BEH-002 | User/System | A message to a busy Claude agent (from the user or a teammate) waits in the AgentRun FIFO until the current turn ends, then starts a new turn | Input admission docs/code |
| BEH-003 | User | Interrupt aborts the whole CLI process; the next message spawns a new process with `resume` | `claude-session.ts`; docs "Claude active-turn closure" |
| BEH-004 | System | Every turn spawns a new CLI process (startup cost per turn); no process exists while the agent is idle | `executeTurn` |
| BEH-005 | User | Context files, images included, reach Claude as text path references | `appendContextFileReferenceSection` |
| BEH-006 | System | Run terminate/close aborts the active query; no process remains | `claude-session-cleanup.ts` |
| BEH-007 | System | Resuming a run after a server restart: the next turn uses `resume` with the stored session id | `claude-provider-session-lifecycle.ts` |

## Structural Surface Inventory

- Session/turn lifecycle (`ClaudeSession`, `ClaudeProviderSessionLifecycle`, `ClaudeActiveTurnExecution`): structural rewrite from per-turn query to per-run query.
- `ClaudeSdkClient.startQueryTurn` → a long-lived query with an input channel; remove `CLAUDE_CLI_RUNTIME_POLICY_ENV`.
- `ClaudeAgentRunBackend.inputCapabilities` / `dispatchUserInput` (append) and the interrupt path (`Query.interrupt()`).
- Event conversion: turn boundaries now come from the stream (`system init`/`result`) rather than from our `startTurn`; this adds provider-initiated turns and a mapping from message uuid to turn.
- Token usage per result; memory recording of CLI-initiated turns; frontend display of provider-initiated turns.
- Process resource management (idle close / reopen via `resume`).
- No persisted-schema change expected. Session ids and stored runs stay valid.

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Status |
| --- | --- | --- | --- |
| RSK-001 | Risk | Each live Claude process costs about 150-170 MB physical footprint (RSS about 400-500 MB, mostly shared binary pages), so a 6-member team is about 1 GB. DEC-002: accepted; no idle timer | Accepted |
| RSK-002 | Risk | Races between an AgentRun dispatch and a CLI-initiated turn, or merges of several queued messages into one turn, must map to the canonical turn/input lifecycle exactly (uuid echo makes this observable) | Architecture |
| RSK-003 | Risk | `priority` on user messages is undocumented; the design must not depend on it | Architecture |
| RSK-004 | Risk | A crash (`error_during_execution` + exit) mid-run requires reopening with `resume` | Architecture |
| RSK-005 | Risk | Background tasks die when the process closes (run terminate, idle close with no tasks running, or server shutdown) | Covered by requirements |
| UNK-001 | Unknown | Whether `session_state_changed` (idle/running) is emitted without extra options; probe E saw only `system init` and `result` as boundaries | Architecture |
| UNK-002 | Unknown | Behavior of `canUseTool` approvals during CLI-initiated turns (approvals exist only when the permission mode prompts) | Architecture |

## Requirement Implications

- Streaming input fixes the root cause (the process outlives the turn), so background tasks can be re-enabled and the v1.4.78 policy env removed.
- Mid-turn delivery works natively (E-S2), which means Claude can declare `activeTurnAppend: "supported"`, as Codex does.
- The system must support turns the provider starts itself (E-S1). This is new behavior for the Claude runtime in AutoByteus and needs a user decision on presentation (DEC-001).
- Memory cost per live process makes an idle lifecycle policy a requirement (DEC-002).

## Activity-Area / To-Do Findings (SR-002, 2026-09-24)

The user proposed replacing the Activity tab's "To-Do" section with "Tasks" (screenshot: the Activity tab shows "To-Do · 0 Tasks · No to-dos yet" above the Activity feed). The user also stated a preference for an event-driven design.

| Source | Finding |
| --- | --- |
| `git show fa0fd927a` (2026-08-03, "Remove native todo list tools and stream path") | The native AutoByteus todo tools and stream path were removed from `autobyteus-ts` |
| `backends/codex/events/codex-turn-event-converter.ts` L56-62 (`TURN_TASK_PROGRESS_UPDATED`), `codex-item-event-converter.ts` L411-417 (`ITEM_PLAN_DELTA`) | **Codex still emits `TODO_LIST_UPDATE`** from its plan updates, so the To-Do section is still fed for Codex runs |
| `autobyteus-web/components/progress/ProgressPanel.vue`, `TodoListPanel.vue` (148 lines), `stores/agentTodoStore.ts`, `handlers/todoHandler.ts` | Activity tab = To-Do section (from `TODO_LIST_UPDATE`) + Activity feed |
| https://code.claude.com/docs/en/agent-sdk/todo-tracking | Claude's checklist tools (`TodoWrite`, and its successors `TaskCreate/TaskGet/TaskUpdate/TaskList`) are default-on only for older models and are not in AutoByteus's explicit 10-tool list, so Claude runs produce no checklist today |
| SDK `task_started` / `task_notification` / `background_tasks_changed` | A **different** concept: running background executions (Bash commands, subagents), not checklist items |
| `autobyteus-web/components/workspace/team/TeamDelegatedTask*.vue`, `CollaborationDelegatedTasksSection.vue` | AutoByteus already uses "Tasks" for team delegations (`delegate_task`), which is a naming-collision risk |
| `agent-run-event.ts` | The canonical event enum already has `TODO_LIST_UPDATE` and `SYSTEM_TASK_NOTIFICATION` (the latter is used for team task-delegation notices) |

Implication: background-task state should become canonical `AgentRunEvent`s produced by the Claude event converter and flowing through the existing run event pipeline → websocket → frontend store (event-driven, consistent with the server). The To-Do → Tasks change needs a user decision on naming and on whether the Codex plan display is kept.

## Inline Image Findings (SR-006, 2026-09-25)

- Current Claude path: `appendContextFileReferenceSection` puts image paths in the prompt text, and the model must call `Read`. Codex (`backends/codex/thread/codex-user-input-mapper.ts`: `localImage`/`image` inputs from local path, `file://`, data URL or http URL) and native AutoByteus (`autobyteus-ts/src/agent/message/multimodal-message-builder.ts`) send images inline.
- AutoByteus web context files are stored as local absolute paths, e.g. `~/.autobyteus/server-data/memory/.../context_files/ctx_<id>__image.png`.
- Probes G/H/I (`probe-evidence/image-probe-results.md`): base64 and url image blocks work in streaming input; the CLI downsizes large images (6 MB OK), fixes wrong media types, converts TIFF, answers gracefully for corrupt data, keeps the session alive, and images persist across `resume`.

## Architecture Investigation Findings (SR-007, 2026-09-25)

All probes: SDK 0.3.280, PATH CLI 2.1.281, real API, model `haiku`, one streaming-input query per session unless noted. Helper: `probe-evidence/lib.mjs`.

| Probe | Scenario | Observation | Design implication |
| --- | --- | --- | --- |
| J (`probeJ.*`) | Background task finishes while the agent is mid-turn (running a 20 s foreground command) | `task_notification completed` arrives mid-turn; **no separate turn**. The agent mentions it in the same turn's reply. **Foreground Bash calls also emit `task_started`/`task_notification`** (type `local_bash`), but only background tasks appear in `background_tasks_changed` | Notices must key off background-set membership plus provider-initiated turns, not every `task_notification` |
| L (`probeJ.*`) | `SIGKILL` of the CLI mid-turn | The SDK iterator throws `Claude Code process terminated by signal SIGKILL`; no `result`. A new `query({resume})` recalled a codeword sent in the killed turn | Unexpected exit = stream throw/end; fail the active turn and reopen by resume on the next input |
| K (`probeK.*`) | Slow HTTP MCP tool (12 s) with `CLAUDE_CODE_MCP_AUTO_BACKGROUND_MS=4000` | Not backgrounded; normal foreground tool result | AutoByteus team tools (HTTP MCP) stay foreground in SDK mode; no MCP background handling needed |
| M (`probeM.*`) | Two messages written back-to-back while idle | **Two separate CLI turns**, each with its own `result` answering one uuid | Canonical turn must span consecutive CLI turns while written input is unanswered |
| M | Message written during a long foreground tool, then `interrupt()` | Receipt `still_queued:[uuid]`; interrupted result (`aborted_tools`); **the queued message then runs as a new CLI turn** | Interrupt must cancel our still-queued uuids, otherwise they run after the canonical turn was reported interrupted |
| N (`probeN.*`) | Usage across 3 turns in one process | `usage` is **per turn**; `modelUsage` and `total_cost_usd` are **cumulative for the process** | Compatible with `claude-sdk-model-usage-reconciler.ts` (differences cumulative `modelUsage` per session and raw model; regression = new baseline). Verify reopen-after-crash behavior |
| O (`probeO.*`) | `interrupt()` while a background task and a foreground command run | The foreground command is stopped; **the background task survives** and completes; the CLI then starts a turn by itself (`origin: task-notification`) | Satisfies AC-005 |
| E-S2 (earlier) | Message during a running tool call | Picked up at the next tool boundary, same turn (`user_message_uuids=[a,b]`) | Append semantics are "delivered to the live session", answered in this or the next CLI turn |

SDK contract facts (`/tmp/sdk0280/package/sdk.d.ts`, SDK 0.3.280):
- `SDKUserMessage` has `uuid`, `content` blocks, `isSynthetic`, `origin`, and `priority` (undocumented; not used). The result carries `user_message_uuids`, `origin`, `terminal_reason`.
- `Query.interrupt()` resolves to `{still_queued: uuid[]}` (`interrupt_receipt_v1`). Queued uuids survive unless cancelled.
- Cancellation: the control protocol documents `SDKControlCancelAsyncMessageRequest {subtype: "cancel_async_message", message_uuid}` (and says "a wrapper that wants per-uuid control … follows up with cancel_async_message"). The SDK runtime `Query` class implements `cancelAsyncMessage(uuid)` (`sdk.mjs`), but **the method is not declared in `sdk.d.ts`**. RSK-006.
- `Query.stopTask(taskId)` is public (not needed without a task UI).

Codebase facts (base `6f7b5e371`):
- `domain/agent-run.ts`: `claimNextInput` issues `append_to_active_turn` only when `lifecycleState.activeTurn` is IDENTIFIED and the backend declares `activeTurnAppend: "supported"`. The start-turn path uses `beginCommand/acceptCommand(token, turnId)`. `acceptCommand` with an already-open identical turn id is idempotent (`openIdentifiedTurn`). Inputs forwarded into turn A are finished at the canonical terminal of A.
- `SYSTEM_TASK_NOTIFICATION` payload `{sender_id, content}` is already produced server-side (`skill-improvement/services/skill-improvement-target-notification-service.ts`) and rendered by the web as a conversation segment (`handlers/systemTaskNotificationHandler.ts`).
- Memory traces for external runtimes (`agent-memory/services/runtime-memory-event-accumulator.ts`, `store/external-runtime-memory-writer.ts`) have no system-notice trace type, and run-history replay (`run-history/projection/transformers/raw-trace-to-historical-replay-events.ts`) therefore cannot show notices after reload (for any producer).
- `ClaudeSessionManager` creates/restores sessions per run and closes them via `ClaudeSessionCleanup`. The tool approval path (`canUseTool` → `ClaudeSessionToolUseCoordinator.handleToolPermissionCheck`) is a query-level callback and is unaffected by input mode.

| ID | Type | Description | Status |
| --- | --- | --- | --- |
| RSK-006 | Risk | SR-008 update: queued-input cancellation uses `interrupt({cancelQueued:true})`, which is protocol-documented and capability-advertised (`interrupt_cancel_queued_v1`), but the parameter is undeclared in the `Query.interrupt()` d.ts signature. (The earlier `cancel_async_message` choice was replaced as racy.) | Isolated in one adapter in `ClaudeSdkStreamingSession`, with a capability snapshot and a live gated test on both CLIs |
| RSK-007 | Risk | Cumulative `modelUsage` baseline after an unexpected process restart | Verify reconciler behavior in implementation/API-E2E |

## Architecture Review Round 1 Evidence (SR-008, 2026-09-25)

Trigger: ARCH-REV-001 (`design-review-report.md`), findings ARCH-F-001..006. All probes were unfiltered (every frame kind printed except `thinking_tokens`, `stream_event` and `rate_limit_event`, which carry no turn semantics), on SDK 0.3.280, with the **PATH CLI 2.1.281 and the SDK-bundled CLI 2.1.280** (`npm pack @anthropic-ai/claude-agent-sdk-darwin-arm64@0.3.280` → `/tmp/cli0280/package/claude`).

| Probe | Scenario | Observation |
| --- | --- | --- |
| P `cq` (`probeP.*`), both CLIs | Message B written during a long foreground tool, then `interrupt({cancelQueued:true})` | Response `{"still_queued":[],"cancelled":[B]}`; aborted result answers only A; **B never ran**; the next message works |
| P `cam`, both CLIs | Same, then `interrupt()` + `cancelAsyncMessage(B)` | Receipt `still_queued:[B]`, cancel → `true`, B did not run in this timing. Per the SDK doc this path is racy for dequeued batches |
| P (all) | `system/init` | `capabilities: ["interrupt_receipt_v1","interrupt_cancel_queued_v1","msg_lifecycle_v1","mcp_read_resource_v1","mcp_tool_ui_meta_v1"]` on both CLIs |
| P-prewait (`probeP-prewait.log`) | `interrupt({cancelQueued:true})` sent immediately after writing A (before the CLI read it) | Response `cancelled:[]`; A then **ran normally to completion** (result answers A). Stop can arrive before the CLI sees the input; accounting must wait for A's result |
| P/Q (all) | Frame kinds | Every CLI turn opens with `system/init`. Frames seen outside turns: `command_lifecycle` (per-uuid `queued/started/completed/cancelled`; undeclared type, capability `msg_lifecycle_v1`), `system/background_tasks_changed`, `system/task_started`, `system/task_updated`, `system/task_notification`, `rate_limit_event` |
| Q (`probeQ.*`) | A background task completes during the final model reply (after the last tool boundary) | `task_notification` at 8.5 s during generation; the turn's `result` at 14.2 s; then **immediately** `system/init` and a CLI-started turn (`origin: task-notification`, `answers=[]`) replying about it |
| J (earlier) | Completion during a tool call | Absorbed: a `user` (tool_result) frame follows the notification in the same CLI turn, and the next model call sees it |

Conclusions:
- Cancellation mechanism: `interrupt({cancelQueued:true})`. It is atomic with the abort, documented in the control protocol as the Stop-button mode, capability-advertised (`interrupt_cancel_queued_v1`), and the SDK runtime passes the option (`sdk.mjs`: `interrupt(e){… e?.cancelQueued===!0&&{cancel_queued:!0}`), although the `Query.interrupt()` d.ts signature omits the parameter.
- Documented accounting sources suffice: `result.user_message_uuids` (answered, including aborted results) and the interrupt response `cancelled`. `command_lifecycle` is not used (undeclared); diagnostics only.
- REQ-002 side effect: `cancel_queued` also dequeues queued uuid-less task notifications (SDK doc), so a completion queued at Stop time may never reach the model. The design carries such completions forward (see design-spec SPINE-3).
- P-007 (tool exposure/MCP descriptor change mid-run): Not Reachable (reviewer evidence); no reopen-on-change.

## Notes For Architecture Design

- Map turn identity from the stream: a turn opens at the first frame after the previous `result` (`system init`) and closes at `result`. Attribute input by `SDKUserMessage.uuid` ↔ `user_message_uuids`.
- Interrupt should use `Query.interrupt()` with the receipt and must not abort the process. Terminate keeps `close()`.
- Remove `CLAUDE_CLI_RUNTIME_POLICY_ENV` (clean cut per legacy policy; see DEC-005).
- Re-check the pre-existing failing `claude-session.test.ts` interrupt/resume tests and the 3 mocked-SDK tests in `claude-agent-websocket-interrupt-resume.e2e.test.ts`; they cover the area being rewritten.
