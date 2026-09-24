# Investigation Notes

## Investigation Meta

- Package identifier: `claude-sdk-background-task-lifecycle`
- Request / ticket: User report 2026-09-24: Claude agents (delivery engineer) start background Bash commands (Electron build) that never finish; the agent later says they "stopped". Investigate whether our Claude Agent SDK backend is at fault.
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-background-task-lifecycle`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-background-task-lifecycle` / `codex/claude-sdk-background-task-lifecycle`
- Resolved base remote / branch / revision: `origin/personal` @ `9267d11c8` (fetched 2026-09-24)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: worktree created from refreshed `origin/personal`
- Bootstrap blocker: None
- Current solution revision ID: `SR-001`
- Investigation status: Root cause confirmed by code reading and live reproduction. Solution direction awaiting user decision (DEC-001).

## Initial Request And Clarifications

- Original request: "sometimes it runs background bash, but it seems like our backend support is not good enough for background bash command … it's never built … when I ask have you built it, it says it's stopped … please investigate … probe whether our implementation has a problem."
- User-supplied evidence: delivery_engineer transcript, and a screenshot of the Bash tool call with `run_in_background: true` whose result said "Command running in background with ID: bqfuwugea … You will be notified when it completes."
- Clarifications received: none yet.

## Product And Domain Understanding

- Product area: AutoByteus server Claude Agent SDK runtime backend (`autobyteus-server-ts/src/agent-execution/backends/claude`, `src/runtime-management/claude/client`).
- Affected actors: users running Claude-runtime agents and teams; Claude agents that start long-running commands (builds, servers, test suites).
- Terminology: *background task*: a Claude Code built-in Bash call with `run_in_background: true` (and, while those tools are exposed, background `Agent` subagents or `Monitor`). The Claude Code CLI process owns these tasks.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-09-24 | Runtime | `ls /private/tmp/claude-501/-Users-normy-autobyteus-org-autobyteus-workspace-superrepo/9e00c72c-…/tasks/` and `od -c` on each file | The screenshot's output path | All three task outputs (`bxm16d8ka` 06:15, `bqfuwugea` 06:26, `bl4f3ymgc` 06:27) contain only `\n[killed]\n` | Reproduce |
| 2026-09-24 | Runtime | `tail …/delivery-logs/electron-build-mac-personal.log`, `ps -o pid,ppid,pgid …` | Check the build state | The 4th attempt, started with shell detachment (PPID 1 = launchd, outside Claude's task registry), survived and finished (`electron-build.exit` = 0; `autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`) | This shows the command itself works and only Claude-managed background tasks die |
| 2026-09-24 | Code | `src/agent-execution/backends/claude/session/claude-session.ts` `executeTurn` (L374-533) | Turn lifecycle | Each turn calls `sdkClient.startQueryTurn({prompt: string, …})`, iterates, `break`s on the terminal `result` chunk, then `finally → closeActiveTurnQuery → sdkClient.closeQuery → query.close()` | Root cause |
| 2026-09-24 | Code | `src/runtime-management/claude/client/claude-sdk-client.ts` `startQueryTurn` L273-288, `closeQuery` L290-299, `buildQueryOptions` L403-440 | Query shape | `prompt` is a plain string (single-prompt mode). Resume is by `resume: sessionId` on the next turn's new query, so there is one CLI process per turn. No background-task env switch. `disallowedTools` = `["AskUserQuestion"]` on `origin/personal` | — |
| 2026-09-24 | Code | `session/claude-session-cleanup.ts` | Run close path | Run termination also calls `query.close()` | — |
| 2026-09-24 | Code | `grep -rn "task_notification\|background_tasks\|run_in_background\|DISABLE_BACKGROUND" autobyteus-server-ts/src` | Existing support | No handling of `task_started` / `task_notification` / `background_tasks_changed` SDK messages, and no background switch | — |
| 2026-09-24 | Contract | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts` L3078-3095, L4559-4568, L4651-4735, L2636-2652 | SDK contract | `SDKTaskStartedMessage`, `SDKTaskNotificationMessage` (`completed/failed/stopped`), `SDKBackgroundTasksChangedMessage` ("the level is per-process … reset whenever the session's CLI process (re)starts"), `session_state_changed: idle` ("authoritative turn-over signal"), `Query.stopTask`, `Query.backgroundTasks` | Background tasks are scoped to the CLI process |
| 2026-09-24 | Command | `strings <claude CLI 2.1.281> \| grep CLAUDE_CODE_.*BACKGROUND` | Available switches | `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS`, `CLAUDE_CODE_AUTO_BACKGROUND_TIMEOUT_MS`, `CLAUDE_CODE_DISABLE_MCP_TASK_BACKGROUND`, … | Probe D |
| 2026-09-24 | Runtime | Probes A–D, see `probe-evidence/probe-results.md` | Reproduce and compare lifecycles | A reproduces `[killed]`; B shows single-prompt mode stops tasks about 5 s after result; C (streaming input) completes and the CLI starts its own follow-up turn; D (switch set) removes `run_in_background` and the command completes in the foreground | — |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger | Current Path / Lifecycle | Current Outcome | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Claude-runtime agent calls built-in Bash with `run_in_background: true` | CLI starts the task and returns "Command running in background … You will be notified when it completes" → model ends its turn → CLI emits `result` → AutoByteus breaks and calls `query.close()` → CLI exits and kills its tasks | Command is killed within seconds of the turn ending. The output file says `[killed]` and no notification ever reaches the agent or the user | Probe A; three `[killed]` files; build log truncated mid-step | High |
| BEH-002 | User | User asks a Claude agent about work it "started in the background" | The agent's next turn is a new CLI process (resume). Its earlier task is gone | The agent finds the task stopped and restarts it, which repeats BEH-001 (the observed loop of three attempts) | delivery_engineer transcript | High |
| BEH-003 | System | Claude agent runs a long command in the foreground | Tool blocks inside the turn, subject to the Bash tool timeout (default about 2 min, max about 10 min) | Works; the turn stays RUNNING while the command runs | Probe D; normal operation | High |
| BEH-004 | System | Other process-scoped async Claude features (background `Agent` subagents, `Monitor`, scheduled wakeups) while those tools are exposed | Same lifecycle as BEH-001 | Expected to die with the CLI process in the same way (not separately probed) | SDK contract (per-process level) | Medium |

## Relevant Codebase And Technical Facts

| Path / Component | Current Responsibility | Requirement Implication | Design Question |
| --- | --- | --- | --- |
| `claude-session.ts#executeTurn` | One `query()` per AutoByteus turn. Closes on the `result` chunk | "Turn complete" and "CLI process closed" are the same event today | Should the process outlive the turn? |
| `claude-sdk-client.ts#startQueryTurn/buildQueryOptions` | String prompt, per-turn resume, spawn env from `resolveSpawnEnvironment` | Minimal fix point: env switch `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1` | Env injection location |
| `claude-provider-session-lifecycle.ts` | Enforces one open query binding per session, create-then-resume | A persistent process would change this lifecycle model | — |
| `claude-session-cleanup.ts` | Closes the query on run termination | With a persistent process, background tasks would legitimately die on run close/restart | — |
| Event pipeline (`events/claude-session-event-converter.ts`, status projector) | Maps chunks to AutoByteus events. The turn model assumes each turn is started by an AutoByteus input | Probe C shows the CLI starts turns on its own after `task_notification`. Supporting that means "provider-initiated turns" in the AutoByteus run/stream/memory model | High-risk area if a full solution is chosen |

## Structural And Payload Surface Inventory

- Payload surfaces: none persisted. Claude task output files live in `/private/tmp/claude-<uid>/…` and are CLI-owned.
- Structural surfaces: Claude session turn lifecycle, SDK query transport mode (string compared with streaming input), runtime event model (turn start/complete/interrupt), team inbound-message routing while a turn is active.
- Potential structural impacts: none for Option 1 (env switch). For Option 2 (persistent streaming session), a concurrency/lifecycle change plus a runtime-event contract change (provider-initiated turns and background-task status).

## Runtime, Probe, Or Reproduction Findings

See `probe-evidence/probe-results.md` (A: killed, B: stopped by CLI after about 5 s, C: completes and the CLI starts its own turn, D: foreground, completes).

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| UNK-001 | Unknown | Whether `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS` is a stable, documented switch | Option 1 relies on it | **Resolved (SR-003):** officially documented at https://code.claude.com/docs/en/env-vars ("Set to `1` to disable all background task functionality, including the `run_in_background` parameter on Bash and subagent tools, auto-backgrounding, and the Ctrl+B shortcut"), and referenced from the interactive-mode and tools-reference pages. Keep a unit check on the spawn env | Resolved |
| RSK-001 | Risk | Under Option 1, a command longer than the foreground Bash maximum timeout (about 10 min) is cut off at that limit | Very long builds | The agent can still detach with `nohup … &`, as the delivery engineer eventually did. Timeout via `BASH_MAX_TIMEOUT_MS` is a possible later enhancement | Open |
| RSK-002 | Risk | Option 2 changes the turn model (CLI-initiated turns, a process that outlives turns, team messages arriving while the CLI is mid-notification) | High architectural risk | Only if user selects Option 2 | Open |
| RSK-003 | Risk | The in-flight `claude-sdk-builtin-tool-restriction` ticket (not yet merged) hides `Agent`/`Monitor`/`Workflow`, which reduces BEH-004 to Bash only | Scope overlap | Coordinate at design time | Open |

## Requirement Implications

The current behavior is a silent failure plus a false promise. The tool result tells the
model "you will be notified", but our lifecycle guarantees it never will be, so the
agent tells the user it will report back and never does. Any acceptable outcome must remove that
false promise: either run the work to completion inside the turn (Option 1) or keep the process
alive and deliver the completion to the agent (Option 2).

## SDK Usage Conformance Review (SR-002, 2026-09-24)

User question: "Did we use the Claude Agent SDK correctly? It was implemented long ago; maybe the SDK has improved."

| Source | Finding |
| --- | --- |
| https://code.claude.com/docs/en/agent-sdk/streaming-vs-single-mode | "Streaming input mode is the **preferred** way to use the Claude Agent SDK … operate as a long lived process that takes in user input, handles interruptions, surfaces permission requests, and handles session management." Single message input "does **not** support: direct image attachments, dynamic message queueing, real-time interruption, natural multi-turn conversations". Recommended "when you need a one-shot response … stateless environment, such as a lambda function". |
| https://code.claude.com/docs/en/agent-sdk/hosting (Long-running sessions) | For servers hosting ongoing sessions: "maps each active session to a long-lived query and the subprocess behind it. In TypeScript, use `streamInput()` to add turns to an active session and `startup()` to pre-warm subprocesses." |
| https://code.claude.com/docs/en/agent-sdk/sessions | `resume` is documented for following up on a completed task, recovering from a limit, or restoring after a process restart. `continue`/`resume` per call is the TS pattern for simple multi-turn use. It is valid but is the single-message path. |
| https://code.claude.com/docs/en/agent-sdk/typescript (SDKResultMessage.origin) | "When the SDK injects a synthetic follow-up turn, such as for a finished background task, the resulting `SDKResultMessage` carries `origin: { kind: "task-notification" }` … Check `kind` to distinguish results that answer your prompt from injected follow-ups." `interrupt()` is "Only available in streaming input mode". |
| Installed `sdk.d.ts` 0.3.231 | `Query` control methods (interrupt, setPermissionMode, setModel, …) are "only supported when streaming input/output is used". `origin?: SDKMessageOrigin` with `kind: 'task-notification'`, `startup()`, `background_tasks_changed`, `session_state_changed` are present. |
| `npm pack @anthropic-ai/claude-agent-sdk@0.2.63` (the version our backend started with on 2026-02-28, commit `17ea13a87`) | Already had `prompt: string \| AsyncIterable<SDKUserMessage>`, `streamInput()`, "Only available in streaming input mode" and `task_notification`. So streaming input was available and documented as the richer mode when the backend was built. Later SDKs added helpers such as result `origin`, `background_tasks_changed`, `startup()` pre-warm and interrupt receipts. |
| Our code | `startQueryTurn` passes a string prompt, and each AutoByteus turn is a new `query()` with `resume`. The query is closed on `result`. Interrupt is done by `AbortController.abort()` (process abort), not `query.interrupt()`. Context files, images included, are passed as text path references (`appendContextFileReferenceSection`). No `streamInput`, `startup`, or `task_*` handling. |

Conclusion: the implementation is a *valid* use of the SDK's documented single-message mode, and create-by-`sessionId` then `resume` is correct API usage. But it is not the mode Anthropic recommends for our product shape: a server hosting long-lived, interactive, multi-turn agent sessions with interrupts and team messages. The background-Bash failure is the most visible consequence. Real-time interrupt, mid-turn message injection/queueing, inline image blocks, and control methods (`setModel`, `setPermissionMode`) are also unavailable or emulated in single-message mode. It was a design choice at build time, not a gap from an older SDK.

## Official CLI Documentation Check (SR-003, 2026-09-24)

| Source | Finding | Implication |
| --- | --- | --- |
| https://code.claude.com/docs/en/env-vars | `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS`: "Set to `1` to disable all background task functionality, including the `run_in_background` parameter on Bash and subagent tools, auto-backgrounding, and the Ctrl+B shortcut." `BASH_DEFAULT_TIMEOUT_MS` defaults to 120000 (2 min). `BASH_MAX_TIMEOUT_MS` defaults to 600000 (10 min) and is the maximum the model can set. | Option 1 uses a supported CLI switch, not an internal one. The foreground ceiling is configurable |
| https://code.claude.com/docs/en/tools-reference (Bash) | "When a command reaches its timeout without finishing, Claude Code moves it to the background instead of stopping it, unless the command starts with `sleep`. … Setting `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1` disables auto-backgrounding along with the rest of the background task functionality." | **New failure path (BEH-005):** even a foreground Bash call without `run_in_background` that exceeds its timeout is auto-moved to the background, and our per-turn close then kills it. So the bug is not limited to explicit background requests |
| https://code.claude.com/docs/en/interactive-mode (Background bash commands) | "Background tasks are automatically cleaned up when Claude Code exits … processes that detached from the task's shell, such as ones started under `setsid` or `timeout`, stop too." "To disable all background task functionality, set the `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS` environment variable to `1`." | Confirms by contract that closing the CLI process kills its tasks (probe A). Only a fully detached `nohup … &` (reparented to launchd, as in the 4th build attempt) survived |

Behavior added: BEH-005 (System): a foreground Bash call that exceeds its timeout (default 2 min, model may request up to 10 min) is auto-backgrounded by the CLI and then killed when AutoByteus closes the query at turn end. Evidence: tools-reference doc (not separately probed).

## Notes For Architecture Design

- Root cause is in our per-turn `query()` + `close()` lifecycle, not in the SDK. The SDK supports background tasks only while the CLI process lives (streaming-input mode).
- The Option 1 injection point is the spawn env used by `startQueryTurn` (it must not leak into the model-discovery probe env unless harmless).
