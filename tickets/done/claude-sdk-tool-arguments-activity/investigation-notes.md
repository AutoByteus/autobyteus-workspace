# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Investigation reopened for user-approved in-ticket refactor; refined two-lane tool event contract identified.
- Investigation Goal: Determine where Claude Agent SDK tool-call arguments are lost before Activity details and design a fix with executable validation.
- Scope Classification (`Small`/`Medium`/`Large`): Large
- Scope Classification Rationale: The original bug crossed Claude runtime event normalization and frontend Activity rendering; the user-approved expansion now also touches cross-runtime segment/lifecycle alignment, frontend Activity ownership, memory/history projection expectations, and e2e coverage.
- Scope Summary: Claude SDK raw events include tool arguments. The narrow lifecycle fix restored arguments, but broader analysis shows Claude normal tools should synthesize the same segment lane plus lifecycle lane as Codex, while lifecycle remains the single Activity owner.
- Primary Questions To Resolve:
  - Does the Claude Agent SDK raw event stream include tool invocation arguments? **Yes.** Raw `assistant.message.content[].type === "tool_use"` blocks include `input` objects.
  - Which repository component maps Claude SDK tool events into normalized run/activity events? `ClaudeSessionToolUseCoordinator` emits Claude session tool lifecycle events; `ClaudeSessionEventConverter` maps them to `AgentRunEventType.TOOL_*`; websocket mapper forwards them to the frontend.
  - Does the normalized event model have a runtime-agnostic field for tool-call arguments? **Yes.** `arguments` is already used by Codex and by Claude permission-path events.
  - Does the frontend Activity details renderer hide arguments due to field-name or empty-object checks? It hides only empty argument objects. This is appropriate when arguments are truly empty; the bug is that some Claude activities are created with `{}` because the normalized started event is missing.
  - What executable validation should protect this path? Unit tests for `ClaudeSessionToolUseCoordinator.processToolLifecycleChunk`, frontend handler/store tests for argument hydration, and a corrected Claude e2e assertion around the approved target invocation.
  - Should Claude normal tools issue both segment and lifecycle events? **Yes.** Segment events own transcript structure; lifecycle events own Activity/memory/status. Emitting only lifecycle forces frontend fallback/synthesis and leaves Claude asymmetric with Codex.
  - Who should create Activity entries? **Lifecycle handlers.** Segment handlers should create/enrich conversation segments and should not independently create tool Activity cards.

## Request Context

User provided screenshots on 2026-05-01 showing:
- Claude Agent SDK run: Activity entries for `Bash`, `Read`, `Write` show only collapsible `Result`; no `Arguments` section visible.
- Claude Agent SDK run: selected `Bash` shows result content only.
- Codex runtime run: selected `run_bash` shows both `Arguments` and `Result`; arguments include JSON `{ "command": ... }`.
User specifically asked to investigate whether this is our bug and suggested enabling Claude event logging for e2e tests. In a follow-up, the user confirmed that Claude-related e2e tests with raw-event logging should be run, and that additional capture could be added if current raw events were insufficient.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-tool-arguments-activity`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-tool-arguments-activity/tickets/done/claude-sdk-tool-arguments-activity`
- Current Branch: `codex/claude-sdk-tool-arguments-activity`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-tool-arguments-activity`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully from `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`.
- Task Branch: `codex/claude-sdk-tool-arguments-activity`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Original shared checkout `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` had untracked `docs/future-features/`; the dedicated task worktree was created from refreshed `origin/personal` to avoid touching shared checkout state. `pnpm install --frozen-lockfile --offline` was run in the dedicated worktree for local test execution; node_modules/dist outputs are ignored.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-01 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v && git branch --show-current && git symbolic-ref refs/remotes/origin/HEAD` | Bootstrap repo/worktree/base context | Shared checkout on `personal` tracking `origin/personal`; remote default points to `origin/personal`; untracked `docs/future-features/` present in shared checkout. | No |
| 2026-05-01 | Command | `git worktree list --porcelain && git fetch origin --prune` | Check existing task worktrees and refresh remotes | No matching existing worktree found; remote refresh succeeded. | No |
| 2026-05-01 | Command | `git worktree add -b codex/claude-sdk-tool-arguments-activity /Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-tool-arguments-activity origin/personal` | Create mandatory dedicated task worktree/branch | Worktree created at release version commit `49378489`; branch tracks `origin/personal`. | No |
| 2026-05-01 | Code | `/Users/normy/autobyteus_org/autobyteus-agents/.../solution-designer/SKILL.md` and `design-principles.md` | Follow required solution-designer workflow and design reference | Workflow requires durable artifacts, investigation notes, design spec, and architecture-reviewer handoff. | No |
| 2026-05-01 | Command | `rg -n "Arguments|arguments|tool.?call|ToolCall|tool_use|toolUse|call_id|callId|run_bash|Bash|Activity" autobyteus-web autobyteus-server-ts autobyteus-ts` | Locate affected runtime/frontend paths | Found Claude runtime event converter/coordinator, frontend tool lifecycle handlers, Activity store/component, run-history projection and memory accumulator. | No |
| 2026-05-01 | Code | `autobyteus-web/components/progress/ActivityItem.vue` | Confirm UI rendering condition | `Arguments` section renders only when `activity.arguments` has keys. Therefore a missing section means frontend activity args are `{}`/empty, not a pure label/rendering bug. | No |
| 2026-05-01 | Code | `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts` | Trace frontend lifecycle events into Activity store | `handleToolExecutionStarted` creates/updates activity arguments; `handleToolExecutionSucceeded` calls `ensureToolLifecycleSegment(..., {})`, so result-first events create empty-argument activity entries. | No |
| 2026-05-01 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-tool-use-coordinator.ts` | Find Claude SDK raw chunk tool handling | `processToolLifecycleChunk` tracks `tool_use.input` internally but emits only completion on `tool_result`; no normalized started event is emitted for observed raw `tool_use` blocks. Permission callback path emits started events with args. | Yes: implement duplicate-safe started emission and completion fallback args. |
| 2026-05-01 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-session-event-converter.ts` | Inspect normalized payload mapping | Started/request-approval mapping includes `arguments`; completed mapping preserves serialized payload but does not explicitly attach tracked args if the Claude session event lacks them. | Yes: make completion events include `arguments` upstream or preserve via converter if present. |
| 2026-05-01 | Local Package | `node_modules/.pnpm/@anthropic-ai+claude-agent-sdk@0.2.71_zod@4.3.6/node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts` and package version check | Verify SDK message/permission contracts locally | SDK emits `SDKAssistantMessage` with Anthropic message content; `CanUseTool` callback receives `toolName`, `input`, and `toolUseID`. Installed version is `0.2.71`. | No |
| 2026-05-01 | Setup | `pnpm install --frozen-lockfile --offline` | Install ignored dependencies in dedicated worktree to run tests | Installed workspace deps from local store; generated ignored node_modules. | No |
| 2026-05-01 | Command | `pnpm -C autobyteus-server-ts test tests/unit/agent-execution/backends/claude/events/claude-session-event-converter.test.ts --run` | Baseline targeted unit test | Passed 8 tests after deps installed. | No |
| 2026-05-01 | Command | `RUN_CLAUDE_E2E=1 CLAUDE_SESSION_EVENT_DEBUG=1 CLAUDE_SESSION_RAW_EVENT_DEBUG=1 CLAUDE_SESSION_RAW_EVENT_LOG_DIR=... RUNTIME_RAW_EVENT_DEBUG=1 ... pnpm -C autobyteus-server-ts test tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts --run -t "Claude current GraphQL runtime e2e.*routes tool approval..."` | First e2e attempt with raw logging | Failed before tests due missing Prisma generated client in fresh worktree. | No; setup fixed with prisma generate. |
| 2026-05-01 | Setup | `pnpm -C autobyteus-server-ts exec prisma generate --schema ./prisma/schema.prisma` | Generate Prisma client for e2e | Generated client successfully. | No |
| 2026-05-01 | Trace | `RUN_CLAUDE_E2E=1 CLAUDE_SESSION_EVENT_DEBUG=1 CLAUDE_SESSION_RAW_EVENT_DEBUG=1 CLAUDE_SESSION_RAW_EVENT_LOG_DIR=... RUNTIME_RAW_EVENT_DEBUG=1 ... pnpm -C autobyteus-server-ts test tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts --run -t "routes tool approval over websocket and streams the normalized tool lifecycle"` | Run live Claude e2e with raw/runtime event logs | Raw logs show SDK `tool_use.input` for `Bash` and `Write`. Runtime logs show `Bash` emitted only `TOOL_EXECUTION_SUCCEEDED` with no args; `Write` emitted started/request/approved with args because permission callback ran. Test failed due existing matcher selecting the preliminary `Bash` success and then waiting for approval for that invocation. | Yes: fix runtime event emission and e2e matcher/assertions. |
| 2026-05-01 | Log | `tickets/done/claude-sdk-tool-arguments-activity/logs/claude-raw-events/claude-run-12670a43-469e-4352-9b92-d37f5cd85384.jsonl` | Inspect raw SDK evidence | Sequence 3: `Bash` tool_use input `{ command: "pwd", description: "Get current working directory" }`; sequence 6: `Write` tool_use input `{ file_path: ..., content: ... }`. | No |
| 2026-05-01 | Log | `tickets/done/claude-sdk-tool-arguments-activity/logs/claude-tool-lifecycle-e2e.log` | Inspect runtime/websocket evidence | Runtime sequence 3 `TOOL_EXECUTION_SUCCEEDED` for `Bash` has payload keys `invocation_id`, `tool_name`, `result` only. Runtime sequence 4/5/6 for `Write` include `arguments`. | No |

## Current Behavior / Current Flow

### Original Reproduction Behavior

- Current entrypoint or first observable boundary: Claude SDK `query()` async iterator emits SDK messages/chunks consumed in `ClaudeSession.executeTurn`.
- Original execution flow from the raw/e2e investigation:
  1. `ClaudeSession.executeTurn` iterated SDK chunks and called `logRawClaudeSessionChunkDetails(...)` when logging env vars were set.
  2. The same loop called `ClaudeSessionToolUseCoordinator.processToolLifecycleChunk(runContext, chunk)`.
  3. For assistant `tool_use` blocks, the coordinator extracted `id`, `name`, and `input`/`arguments`, then stored them in `observedToolInvocationsByRunId`.
  4. For user `tool_result` blocks, the coordinator consumed the observed invocation and emitted `ITEM_COMMAND_EXECUTION_COMPLETED` with `invocation_id`, `tool_name`, and `result`/`error`, but not `arguments`.
  5. Separately, when Claude SDK called our `canUseTool` permission callback, `handleToolPermissionCheck` emitted `ITEM_COMMAND_EXECUTION_STARTED` with `arguments`; approval/denial also included args in the session event.
  6. `ClaudeSessionEventConverter` mapped session events to normalized `AgentRunEventType.TOOL_*` events; started/request events included `arguments`.
  7. `AgentRunEventMessageMapper` forwarded the normalized payload to the websocket unchanged.
  8. Frontend `handleToolExecutionStarted` created/updated activity args, but `handleToolExecutionSucceeded` created result-first activity records with empty args.
  9. `ActivityItem.vue` hid `Arguments` when `Object.keys(activity.arguments).length === 0`.

### Current Worktree State After Narrow Implementation

- The narrow implementation added `startedEmitted` state to `ClaudeSessionToolUseCoordinator`.
- Raw assistant `tool_use` observation now upserts the invocation and emits `ITEM_COMMAND_EXECUTION_STARTED` with `arguments` once.
- Raw user `tool_result` completion now includes tracked `arguments` on `ITEM_COMMAND_EXECUTION_COMPLETED`.
- This fixes the immediate Activity argument symptom through lifecycle events.
- The current worktree still does not synthesize `ITEM_ADDED` / `ITEM_COMPLETED` segment events for Claude normal tools.

### Broader Current Asymmetry

- Codex normal dynamic tool/file-change starts emit both `SEGMENT_START` and `TOOL_EXECUTION_STARTED` from the converter.
- Claude normal tools currently emit lifecycle only after the narrow fix.
- Frontend segment handling currently creates Activity cards from executable segments, and lifecycle handling also creates Activity cards from lifecycle events.
- Therefore Activity ownership is split and dedupe-based. The expanded design makes lifecycle the single Activity owner and segment handling the transcript owner.

### Ownership / Boundary Observations

- `ClaudeSessionToolUseCoordinator` already owns per-run observed tool invocation state and is the correct owner to enforce both Claude normal-tool invariants: segment projection and lifecycle projection.
- `ClaudeSessionEventConverter` owns provider-to-agent event mapping, but should not recover information the coordinator failed to include unless it is present in session event params.
- Frontend Activity store/component are runtime-agnostic consumers; a Claude-specific UI patch would bypass the correct runtime boundary.
- Frontend segment and lifecycle handlers need a clearer ownership split to avoid duplicate Activity cards and provider-specific fallbacks.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix + Behavior Change + Refactor
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant + Boundary Or Ownership Issue + Duplicated Policy Or Coordination
- Refactor posture evidence summary: Refactor needed now. The correct Claude owner exists, but it must enforce both segment and lifecycle invariants; frontend Activity ownership is currently split between segment and lifecycle handlers and should be consolidated under lifecycle handling.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User screenshots | Claude SDK path shows result-only cards; Codex path shows arguments/result. | UI can render arguments when normalized data contains them; issue likely upstream of detail rendering. | Confirmed by raw/runtime logs. |
| Raw Claude JSONL sequence 3 | `Bash` `tool_use.input` contains `{ command: "pwd", description: ... }`. | Upstream SDK supplies arguments. | Emit/forward them. |
| Runtime log sequence 3 | `Bash` normalized success has payload keys only `invocation_id`, `tool_name`, `result`. | Arguments lost in our normalization before frontend. | Fix coordinator/completion payloads. |
| Raw Claude JSONL sequence 6 + runtime sequences 4-6 | `Write` raw args appear and started/approval runtime events include args when permission callback runs. | Existing event contract works when started event is emitted; missing invariant affects non-permission raw-observed path. | Add duplicate-safe started emission for raw-observed path. |
| Frontend ActivityItem.vue | Arguments section hidden only for empty args. | No Claude-specific UI rendering bug. | Keep UI mostly unchanged; add regression tests. |
| Codex item event converter | Dynamic tool/file-change starts emit both `SEGMENT_START` and `TOOL_EXECUTION_STARTED`. | Runtime-neutral normal-tool contract should be two-lane. | Align Claude normal tools to same shape. |
| Frontend segment/lifecycle handlers | `segmentHandler.ts` and `toolLifecycleHandler.ts` can both create Activity cards. | Activity ownership is duplicated and ordering-sensitive. | Refactor so lifecycle owns Activity, segment owns transcript. |
| Runtime memory accumulator | Tool traces are recorded from lifecycle events, while non-text/non-reasoning segment starts are ignored. | Adding Claude tool segments should not duplicate memory traces if lifecycle remains owner. | Add/confirm regression coverage. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | Runs Claude SDK query turn and dispatches raw chunks into coordinator/converter pipeline | Calls raw logging and `processToolLifecycleChunk` for every chunk. | No direct change expected; keep this as orchestration point. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-tool-use-coordinator.ts` | Coordinates Claude tool approvals and observed tool invocation/result pairing | Narrow implementation now emits lifecycle starts/arguments, but it still does not synthesize normal-tool segment start/end events. | Primary change owner: emit duplicate-safe segment start/end and lifecycle start/completion from one per-invocation state. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-session-event-converter.ts` | Converts Claude session events to normalized `AgentRunEvent`s | Existing `ITEM_ADDED`/`ITEM_COMPLETED` mapping can produce `SEGMENT_START`/`SEGMENT_END`; command execution mapping produces `TOOL_*`. | Reuse converter; add tests for normal-tool segment metadata plus lifecycle arguments. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts` | Converts Codex item events | Dynamic tool/file-change starts return both segment and lifecycle normalized events. | Reference shape for Claude alignment. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/team-communication/claude-send-message-tool-call-handler.ts` | Handles Claude `send_message_to` team communication | Already emits segment start/end and converter suppresses generic lifecycle noise. | Preserve as special team-communication exception. |
| `autobyteus-server-ts/src/services/agent-streaming/agent-run-event-message-mapper.ts` | Maps normalized run events to websocket messages | Forwards payloads unchanged for `SEGMENT_*` and `TOOL_*`. | No provider-specific change expected. |
| `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts` | Turns websocket segment messages into conversation state | Currently also creates/updates Activity entries for executable segments. | Refactor to transcript-only ownership; remove independent Activity creation/update side effects. |
| `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts` | Turns websocket tool lifecycle messages into lifecycle segments/activity state | Currently creates Activity entries and can synthesize a missing segment. | Make this the authoritative Activity owner and keep segment synthesis only as ordering backstop/reconciliation. |
| `autobyteus-web/stores/agentActivityStore.ts` | Stores Activity rows keyed by run/invocation | Dedupe is exact-ID based; lifecycle handler also has alias guard. | Keep or strengthen only as guardrail; not a second ownership model. |
| `autobyteus-web/components/progress/ActivityItem.vue` | Renders Activity details | Hides Arguments when args object is empty. | Correct for true empty args; no Claude raw parsing should be added. |
| `autobyteus-server-ts/src/agent-memory/services/runtime-memory-event-accumulator.ts` | Records memory traces from normalized events | Ignores non-text/non-reasoning segment starts; records tool calls/results from lifecycle. | Added Claude tool segments should not duplicate memory traces; validate. |
| `autobyteus-server-ts/tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts` | Cross-runtime websocket e2e validation | Claude test originally selected unrelated preliminary success and timed out waiting for approval. | Update matcher and add two-lane argument assertions for target invocation. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-01 | Test | `pnpm -C autobyteus-server-ts test tests/unit/agent-execution/backends/claude/events/claude-session-event-converter.test.ts --run` | Passed 8 tests. | Existing converter tests do not cover raw-observed `tool_use -> tool_result` coordinator path. |
| 2026-05-01 | Setup | `pnpm -C autobyteus-server-ts exec prisma generate --schema ./prisma/schema.prisma` | Required after first e2e attempt failed with missing `.prisma/client/default`. | Fresh worktrees need Prisma generate before e2e. |
| 2026-05-01 | E2E Trace | `RUN_CLAUDE_E2E=1 CLAUDE_SESSION_EVENT_DEBUG=1 CLAUDE_SESSION_RAW_EVENT_DEBUG=1 CLAUDE_SESSION_RAW_EVENT_LOG_DIR="$(pwd)/tickets/done/claude-sdk-tool-arguments-activity/logs/claude-raw-events" RUNTIME_RAW_EVENT_DEBUG=1 RUNTIME_RAW_EVENT_MAX_CHARS=50000 CLAUDE_SESSION_RAW_EVENT_MAX_CHARS=50000 pnpm -C autobyteus-server-ts test tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts --run -t "routes tool approval over websocket and streams the normalized tool lifecycle"` | Produced raw/runtime logs. Test failed after 129s because it picked preliminary `Bash` success, but logs are sufficient. | Root cause confirmed; e2e needs matcher fix. |
| 2026-05-01 | Log Probe | Python JSONL parser over raw log | Raw assistant `tool_use` entries include `input` for both `Bash` and `Write`; raw user `tool_result` entries contain result but not original args. | Coordinator must emit args at observation time and/or attach tracked args on completion. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: No web lookup needed; local installed SDK package and TypeScript definitions were primary sources.
- Version / tag / commit / freshness: Local package `@anthropic-ai/claude-agent-sdk@0.2.71` from repository lockfile/deps; Claude CLI reported `2.1.126` on 2026-05-01.
- Relevant contract, behavior, or constraint learned: `CanUseTool` receives `toolName`, `input`, and `toolUseID`; `SDKAssistantMessage` carries Anthropic message content where `tool_use` blocks include `input`.
- Why it matters: Confirms SDK exposes the necessary argument data and the fix belongs in our event normalization path.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Live Claude CLI/auth available locally (`/Users/normy/.local/bin/claude`, version `2.1.126`).
- Required config, feature flags, env vars, or accounts:
  - `RUN_CLAUDE_E2E=1`
  - `CLAUDE_SESSION_EVENT_DEBUG=1`
  - `CLAUDE_SESSION_RAW_EVENT_DEBUG=1`
  - `CLAUDE_SESSION_RAW_EVENT_LOG_DIR=/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-tool-arguments-activity/tickets/done/claude-sdk-tool-arguments-activity/logs/claude-raw-events`
  - `RUNTIME_RAW_EVENT_DEBUG=1`
  - `RUNTIME_RAW_EVENT_MAX_CHARS=50000`
  - `CLAUDE_SESSION_RAW_EVENT_MAX_CHARS=50000`
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation:
  - `pnpm install --frozen-lockfile --offline`
  - `pnpm -C autobyteus-server-ts exec prisma generate --schema ./prisma/schema.prisma`
- Cleanup notes for temporary investigation-only setup: node_modules/dist/test tmp are ignored. No source-code debug instrumentation was added because existing raw logging captured enough.

## Findings From Code / Docs / Data / Logs

1. **Raw SDK data is sufficient.** JSONL sequence 3 contains a `Bash` `tool_use` block with `input.command`; sequence 6 contains a `Write` `tool_use` block with file path/content.
2. **Our raw-observed path drops arguments from normalized lifecycle events.** `processToolLifecycleChunk` stores `toolInput`, but its `tool_result` handling emits only result/error.
3. **Permission callback path is not enough.** It emits arguments, but not all Claude tool executions traverse this callback before execution.
4. **Frontend result-first behavior explains the screenshots.** Without a prior started event, success creates an activity with `{}` args, and the component hides the Arguments section.
5. **E2E test fragility found.** Current Claude e2e test should select the approved target invocation instead of first success.

## Constraints / Dependencies / Compatibility Facts

- The existing runtime-neutral payload field is `arguments`; do not introduce `input`, `toolInput`, or Claude-only frontend fields.
- `send_message_to` Claude tool lifecycle noise is intentionally suppressed; any coordinator change must keep `isClaudeSendMessageToolName` suppression behavior for lifecycle events.
- Existing file-change tracking uses started args and has fallback caches; including args on completion can improve generated-output attribution but should not duplicate file-change entries.
- No backward compatibility/dual-path behavior is needed; this is a clean invariant fix inside the Claude runtime event owner.

## Open Unknowns / Risks

- Need implementation-time care to avoid duplicate started events when the assistant `tool_use` block is observed and the permission callback also emits started for the same invocation.
- Need to decide whether frontend success/failure parsers should merge completion `arguments` too. This is recommended as defensive fallback if the backend begins including args on completion.
- Live Claude e2e cost/time is non-trivial; unit fixture tests should provide most regression coverage, with e2e as optional gated validation.

## Notes For Architect Reviewer

The design should keep the authoritative fix in `ClaudeSessionToolUseCoordinator`, where both raw SDK `tool_use` observation and permission callback events meet. Avoid a frontend-only workaround: it would not fix memory/history projections and would bypass the normalized runtime event boundary.


## Design Impact Rework Addendum - 2026-05-01

### Trigger

Implementation found that the narrow lifecycle-arguments fix solves the immediate screenshot symptom but leaves a cross-runtime design asymmetry. The user then explicitly instructed the team to keep refactoring in this ticket rather than creating a new follow-up ticket.

### Why Claude Should Emit Both Segment And Lifecycle Events

Claude should emit both lanes for normal tools because they represent different facts:

- `SEGMENT_START` / `SEGMENT_END` describe the assistant transcript: the assistant decided to call a tool, and that tool-call segment has a stable identity, metadata, and conversation position.
- `TOOL_EXECUTION_*` / `TOOL_APPROVAL_*` describe execution state: approval, started/executing, success/failure/denial, arguments, result/error, logs, memory traces, and Activity status.

The missing-arguments bug could be fixed with lifecycle events alone, but that would keep the frontend responsible for synthesizing or reconciling transcript/tool state when Claude differs from Codex. Codex already emits both for normal tool calls, so the provider-normalized contract should require Claude to do the same.

### Current Code Evidence Added During Rework

- `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts`
  - `createDynamicToolSegmentStartEvent` at lines 102-113 emits a `SEGMENT_START` with `segment_type: "tool_call"`.
  - `createDynamicToolLifecycleStartedEvent` at lines 116-128 emits `TOOL_EXECUTION_STARTED` with normalized `arguments`.
  - `ITEM_STARTED` for `dynamictoolcall` returns both events at lines 233-237.
  - `ITEM_STARTED` for `filechange` returns both segment and lifecycle events at lines 227-230.
- `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-tool-use-coordinator.ts`
  - The current narrow implementation tracks `startedEmitted` and emits lifecycle starts for raw `tool_use` at lines 158-177.
  - It emits completion lifecycle events with tracked arguments at lines 189-222.
  - It still does not synthesize normal-tool `ITEM_ADDED` / `ITEM_COMPLETED` segment events from raw `tool_use` / `tool_result`.
- `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-session-event-converter.ts`
  - Existing converter support already maps `ITEM_ADDED` / `ITEM_COMPLETED` to `SEGMENT_START` / `SEGMENT_END` at lines 150-168.
  - Existing converter support maps `ITEM_COMMAND_EXECUTION_STARTED` and completion events to lifecycle events at lines 170-253.
  - Therefore the refactor can reuse existing Claude session event names and converter behavior.
- `autobyteus-server-ts/src/agent-execution/backends/claude/team-communication/claude-send-message-tool-call-handler.ts`
  - `send_message_to` already emits `ITEM_ADDED` and `ITEM_COMPLETED` segment events at lines 34-53 and 82-98.
  - Its generic lifecycle completion is suppressed later by converter checks for `isClaudeSendMessageToolName`, preserving team communication semantics.
- `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts`
  - Segment start currently creates Activity entries for `tool_call`, `write_file`, `run_bash`, and `edit_file` at lines 112-157.
  - Segment end currently updates Activity state/arguments at lines 295-330.
- `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts`
  - Lifecycle start also creates Activity entries through `ensureActivityForSegment` at lines 182-228.
  - This means Activity currently has two potential creation owners, with dedupe rather than an explicit ownership boundary.
- `autobyteus-server-ts/src/agent-memory/services/runtime-memory-event-accumulator.ts`
  - Memory ignores non-text/non-reasoning segment starts at lines 118-123.
  - Tool call/result traces are recorded from lifecycle events at lines 101-108 and 280-356.
  - This supports the target split: adding Claude tool segments should not duplicate memory tool traces as long as lifecycle remains the memory owner.

### Refined Design Decision

- Pull the broader cross-runtime segment/lifecycle alignment into this ticket.
- Treat the previous narrow implementation as incomplete for final delivery: it is a valid stepping stone but does not finish the updated requirements.
- Route the refined design back through architecture review before implementation continues.
- Supersede earlier downstream review/delivery artifacts for the narrow scope; keep them as historical evidence in the cumulative package.

### Remaining Risks To Validate

- Frontend tests currently encode segment-created Activity behavior. They must be updated to assert transcript-only segment handling and lifecycle-owned Activity creation.
- If any runtime relies on executable segment events without lifecycle events for Activity display, that runtime must be aligned or explicitly documented as out of scope.
- `send_message_to` must not accidentally start producing generic Activity noise when normal Claude tools gain segment events.


## Non-Regression History / Codex Safety Check - 2026-05-01

### Question Checked

The user asked whether the refactor could break existing behavior, especially Codex Activity display and Activity display when clicking/opening a historical run.

### Findings

- **Codex live Activity should remain safe if lifecycle remains the Activity owner.** Codex command execution starts already emit `TOOL_EXECUTION_STARTED` directly, and Codex dynamic tool/file-change starts emit lifecycle starts with arguments as well as segments. Therefore removing Activity creation from `segmentHandler.ts` should not remove Codex Activity cards, provided lifecycle handler tests cover command execution, dynamic tool calls, and file changes.
- **History Activity hydration is independent of live `segmentHandler.ts`.** `openAgentRun` calls `hydrateActivitiesFromProjection(input.runId, activities)` after loading projection data. `hydrateActivitiesFromProjection` clears and repopulates `AgentActivityStore` from `projection.activities`; it does not depend on live `SEGMENT_START` handling.
- **Server projection builds historical activities from tool events.** Local-memory projection converts memory `tool_call` / `tool_result` traces into `HistoricalReplayToolEvent`s, then `historical-replay-events-to-activities.ts` maps those to `RunProjectionActivityEntry`s.
- **Codex historical projection is separately safe.** `CodexRunViewProjectionProvider` resolves command/file/web-search items into `HistoricalReplayToolEvent`s and activities independently of frontend live segment handling.
- **Important discovered risk: Claude standalone history projection.** `ClaudeRunViewProjectionProvider` currently maps Claude session messages into conversation-only replay events. In standalone `AgentRunViewProjectionService.getProjection`, a Claude primary projection with conversation but no activities is considered usable, so local-memory fallback may not run. That can leave `projection.activities` empty even when local memory has lifecycle tool traces. Team-member projection is safer because it passes a local projection into `getProjectionFromMetadata`, and the service merges local + runtime provider rows.

### Design Safeguard Added

The refined design now requires historical Activity non-regression:

- Frontend history open must keep hydrating Activity from `projection.activities` via `hydrateActivitiesFromProjection`.
- The implementation must add tests proving historical run open still shows projected activities.
- Server projection must preserve local-memory activities when runtime-specific providers, especially Claude, provide complementary conversation-only projection data.
- Codex live Activity tests must prove lifecycle-created Activity cards still appear after segment-created Activity is removed.

### Evidence Sources

- `autobyteus-web/services/runOpen/agentRunOpenCoordinator.ts` lines 28-63: historical/live run open loads projection payload and calls `hydrateActivitiesFromProjection`.
- `autobyteus-web/services/runHydration/runProjectionActivityHydration.ts` lines 127-140: projection activities are converted directly into `AgentActivityStore` rows.
- `autobyteus-server-ts/src/run-history/projection/transformers/historical-replay-events-to-activities.ts` lines 4-27: historical tool replay events become projection activities.
- `autobyteus-server-ts/src/run-history/projection/providers/codex-run-view-projection-provider.ts` lines 268-319: Codex run-view items become historical tool events with activity type/status/arguments.
- `autobyteus-server-ts/src/run-history/projection/providers/claude-run-view-projection-provider.ts` lines 125-138: Claude provider currently returns bundle from session messages only.
- `autobyteus-server-ts/src/run-history/services/agent-run-view-projection-service.ts` lines 132-158: primary projection can prevent fallback when it is considered usable; local projection is merged only when supplied.
