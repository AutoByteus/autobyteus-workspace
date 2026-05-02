# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Complete; design-ready
- Investigation Goal: Identify why Claude Agent SDK browser MCP tool successes do not open/update the frontend Browser panel while Codex runtime browser tools do, and explain/fix raw MCP browser tool-name display.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The bug crosses runtime-specific result shapes, frontend streaming lifecycle handling, Electron browser shell state, and UI display naming.
- Scope Summary: Add runtime-agnostic browser tool name/result normalization at the frontend browser success boundary and display layer; strengthen backend converter normalization tests.
- Primary Questions To Resolve:
  - What event/result shape does Claude SDK emit for browser MCP tools?
  - What event/result shape does Codex emit?
  - What code turns a browser tool success into a visible Browser panel session?
  - Why are raw `mcp__autobyteus_browser__...` names visible?

## Request Context

User reports a current bug in Autobyteus desktop UI on 2026-05-02. In a run using Claude Agent SDK runtime, the chat/activity stream shows successful browser MCP tool calls, but the Browser panel remains empty. In a run using Codex runtime, `open_tab` opens a Browser panel tab successfully. User also asks why frontend labels show `mcp__autobyteus_browser__open_tab` instead of concise names.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-browser-open-tab-ui`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-browser-open-tab-ui/tickets/done/claude-browser-open-tab-ui`
- Current Branch: `codex/claude-browser-open-tab-ui`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-browser-open-tab-ui`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin personal --prune` completed on 2026-05-02; branch created from `origin/personal` at `7df3a50fde4dd8037b2b94b1d11be1a748a939bf`.
- Task Branch: `codex/claude-browser-open-tab-ui`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: Use the dedicated worktree above, not `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-02 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/SKILL.md` | Required workflow | Requires dedicated worktree, requirements, investigation notes, design spec before handoff. | No |
| 2026-05-02 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/design-principles.md` | Required design guidance | Use spine/ownership model and Authoritative Boundary Rule. | No |
| 2026-05-02 | Command | `git fetch origin personal --prune` | Refresh base before branch creation | Completed. | No |
| 2026-05-02 | Command | `git worktree add -b codex/claude-browser-open-tab-ui /Users/normy/autobyteus_org/autobyteus-worktrees/claude-browser-open-tab-ui origin/personal` | Create isolated task worktree | Created dedicated branch/worktree. | No |
| 2026-05-02 | Command | `rg -n "open_tab|navigate_to|read_page|autobyteus_browser|mcp__autobyteus_browser|Browser" autobyteus-web autobyteus-server-ts autobyteus-ts ...` | Locate browser tooling and UI paths | Found frontend streaming browser success handler, Browser panel/store, Electron browser bridge, Claude backend browser MCP builder/converter. | No |
| 2026-05-02 | Code | `autobyteus-web/services/agentStreaming/browser/browserToolExecutionSucceededHandler.ts` | Inspect frontend post-tool-success browser visibility owner | Handler only handles exact `open_tab`; extracts tab id only from direct object or JSON string. Does not parse Claude MCP content-block arrays. | Yes: modify/validate. |
| 2026-05-02 | Code | `autobyteus-web/stores/browserShellStore.ts` | Inspect renderer browser-shell state API | `focusSession(tabId)` initializes store and calls `window.electronAPI.focusBrowserTab(tabId)`, applying returned shell snapshot. | No |
| 2026-05-02 | Code | `autobyteus-web/components/workspace/tools/BrowserPanel.vue` | Inspect empty state and shell session display | Panel renders empty-state text when `sessions.length === 0`; sessions come from `browserShellStore`. | No |
| 2026-05-02 | Code | `autobyteus-web/electron/browser/browser-bridge-server.ts` | Inspect browser bridge tool execution target | `/browser/open` calls `BrowserTabManager.openSession(...)` directly. This creates browser session but does not attach it to a shell/window. | No |
| 2026-05-02 | Code | `autobyteus-web/electron/browser/browser-shell-controller.ts` | Inspect shell visibility/lease owner | `focusSession(shellId, browserSessionId)` adds the browser session to the shell state's `sessionIds`, claims lease, activates it, applies projection, and publishes snapshot. | No |
| 2026-05-02 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/browser/build-claude-browser-tool-definitions.ts` | Inspect Claude MCP browser tool result shape | Claude tool definitions return MCP content blocks `{ content: [{ type: "text", text: json }] }`. | No |
| 2026-05-02 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-session-event-converter.ts` | Inspect backend tool-name normalization | Contains `CLAUDE_BROWSER_MCP_TOOL_PREFIX` and normalizes terminal lifecycle tool names to canonical browser names when `isBrowserToolName(candidate)` is true. Segment metadata should also be covered/tested. | Yes: add tests/strengthen if needed. |
| 2026-05-02 | Code | `autobyteus-web/components/conversation/ToolCallIndicator.vue` | Inspect inline chat tool label rendering | Renders `{{ toolName }}` directly. | Yes: display normalization. |
| 2026-05-02 | Code | `autobyteus-web/components/progress/ActivityItem.vue` | Inspect Activity row tool label rendering | Renders `{{ activity.toolName }}` directly. | Yes: display normalization. |
| 2026-05-02 | Log | `/Users/normy/.autobyteus/logs/app.log` with `rg -n "mcp__autobyteus_browser|open_tab|navigate_to|read_page|Browser bridge|browser|Claude|claude|TOOL_EXECUTION|D5C3|92DC|latest model"` | Inspect current app logs per user request | Browser bridge started at `2026-05-02T17:29:27.097Z`; Claude run `96ee8dd0-3585-429a-ae05-ffbc0af8d5c3` created at `17:31:33.412Z`; Codex run `dab27e5f-48ca-42bc-8582-ab2a187f92dc` created at `17:35:29.155Z`. | No |
| 2026-05-02 | Data | `/Users/normy/.autobyteus/server-data/memory/agents/96ee8dd0-3585-429a-ae05-ffbc0af8d5c3/run_metadata.json` | Confirm failing run runtime | Runtime kind `claude_agent_sdk`; model `sonnet`; autoExecuteTools true. | No |
| 2026-05-02 | Trace | `/Users/normy/.autobyteus/server-data/memory/agents/96ee8dd0-3585-429a-ae05-ffbc0af8d5c3/raw_traces.jsonl` | Inspect failing Claude browser tool events | `open_tab` succeeded with `tool_result` as array of text content blocks containing JSON with `tab_id: "983e18"`; later `navigate_to` and `read_page` use same tab. | No |
| 2026-05-02 | Data | `/Users/normy/.autobyteus/server-data/memory/agents/96ee8dd0-3585-429a-ae05-ffbc0af8d5c3/working_context_snapshot.json` | Check persisted conversation tool names | Persisted tool names are canonical (`open_tab`, `navigate_to`, `read_page`), indicating backend memory path is at least partly normalized. | No |
| 2026-05-02 | Data | `/Users/normy/.autobyteus/server-data/memory/agents/dab27e5f-48ca-42bc-8582-ab2a187f92dc/raw_traces.jsonl` | Inspect successful Codex comparison | Codex `open_tab` succeeded with direct object result containing `tab_id: "1b9502"`; this matches frontend handler's current parser. | No |
| 2026-05-02 | Code | `autobyteus-web/services/agentStreaming/browser/__tests__/browserToolExecutionSucceededHandler.spec.ts` | Inspect existing coverage | Covers direct object `open_tab`, unrelated tools, and missing `tab_id`; lacks Claude MCP content-block result and MCP-prefixed name cases. | Yes |
| 2026-05-02 | Code | `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/events/claude-session-event-converter.test.ts` | Inspect backend normalization coverage | Has terminal lifecycle normalization test for `ITEM_COMMAND_EXECUTION_COMPLETED`; lacks segment start/end metadata explicit browser MCP normalization coverage. | Yes |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Server WebSocket emits `TOOL_EXECUTION_SUCCEEDED`; frontend `AgentStreamingService` / `TeamStreamingService` dispatches to normal tool lifecycle handler and to `handleBrowserToolExecutionSucceeded`.
- Current execution flow for Codex success:
  1. Codex runtime emits `TOOL_EXECUTION_SUCCEEDED` with `tool_name: "open_tab"` and direct object result `{ tab_id, status, url, title }`.
  2. Frontend browser handler parses `tab_id` from object.
  3. Frontend calls `browserShellStore.focusSession(tab_id)`.
  4. Electron `browser-shell:focus-session` calls `BrowserShellController.focusSession(senderShellId, tabId)`.
  5. Browser panel store receives snapshot containing the session, activates Browser right-side tab.
- Current execution flow for Claude SDK success:
  1. Claude browser MCP tool opens a browser session through `BrowserBridgeServer` / `BrowserTabManager` and returns MCP content blocks with JSON text containing `tab_id`.
  2. Frontend browser handler receives `TOOL_EXECUTION_SUCCEEDED`, but `extractBrowserTabIdFromResult` does not parse arrays/content blocks.
  3. Handler returns before `browserShellStore.focusSession(...)`.
  4. Browser session remains in `BrowserTabManager` but is not attached to the visible shell state; Browser panel sees `sessions.length === 0`.
- Ownership or boundary observations:
  - `BrowserTabManager` owns browser sessions.
  - `BrowserShellController` owns visible shell membership, active session, lease, and snapshots per Electron shell/window.
  - Frontend browser success handler is the correct bridge between runtime tool success and visible shell focus, because it has the active renderer/shell context.
  - BrowserBridgeServer should remain shell-agnostic; adding shell ownership there would cross the renderer shell boundary.
- Current behavior summary: Runtime browser tool execution works; frontend browser-shell claiming/focus does not happen for Claude MCP result shapes.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant
- Refactor posture evidence summary: A narrow normalization extraction is needed now so browser tool names and result payloads are canonicalized once at the browser success boundary/display boundary instead of adding ad hoc Claude branches.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `browserToolExecutionSucceededHandler.ts` | Hard-coded exact `open_tab`; parser only object/string. | Existing owner is correct but lacks invariant for runtime-neutral result shapes. | Add normalizer/tests. |
| Claude raw trace | Successful `open_tab` result is MCP content block array with JSON text. | Handler cannot parse required tab id despite success. | Add content-block parsing. |
| Codex raw trace | Successful `open_tab` result is direct object. | Explains why Codex works and must remain covered. | Add regression guard. |
| `BrowserBridgeServer` and `BrowserShellController` | Bridge opens unclaimed sessions; shell controller must focus/claim for visible UI. | Fix should stay in renderer browser-success boundary, not Electron bridge. | No bridge refactor. |
| `ToolCallIndicator.vue` and `ActivityItem.vue` | Render raw toolName. | Display lacks canonical tool-name invariant. | Add display utility/use in components. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/services/agentStreaming/AgentStreamingService.ts` | Single-agent stream facade and message dispatch | Calls `handleBrowserToolExecutionSucceeded` after normal tool success handling. | Keep; no runtime-specific branching here. |
| `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` | Team stream facade and member routing | Also calls `handleBrowserToolExecutionSucceeded`. | Keep; shared browser handler covers teams too. |
| `autobyteus-web/services/agentStreaming/browser/browserToolExecutionSucceededHandler.ts` | Browser tool post-success side effect owner | Correct owner for focusing opened tab, but parser is too narrow. | Modify/extract normalizer here. |
| `autobyteus-web/stores/browserShellStore.ts` | Renderer-side browser shell state and Electron IPC facade | Owns `focusSession`, `openTab`, snapshot application. | Reuse only; no new state owner. |
| `autobyteus-web/components/workspace/tools/BrowserPanel.vue` | Browser panel UI | Empty state derived from store sessions. | No direct fix needed. |
| `autobyteus-web/electron/browser/browser-bridge-server.ts` | Local HTTP bridge for runtime browser tools | Opens sessions through BrowserTabManager, shell-agnostic. | Do not move shell focus here. |
| `autobyteus-web/electron/browser/browser-shell-controller.ts` | Shell/window membership and active browser projection | `focusSession` attaches existing session to shell. | Existing authoritative boundary for visible shell state. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/browser/build-claude-browser-tool-definitions.ts` | Defines Claude SDK MCP browser tools | Returns MCP text content blocks containing JSON. | Frontend must parse this shape or backend must unwrap before event emission; design chooses frontend boundary because live tool result can vary by runtime. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-session-event-converter.ts` | Converts Claude session events to agent-run events | Normalizes browser MCP tool names in terminal lifecycle events. | Strengthen segment metadata coverage/tests; keep source canonicalization. |
| `autobyteus-web/components/conversation/ToolCallIndicator.vue` | Inline tool card display | Shows raw `toolName`. | Use display-name utility. |
| `autobyteus-web/components/progress/ActivityItem.vue` | Activity row display | Shows raw `activity.toolName`. | Use display-name utility. |
| `autobyteus-web/services/runHydration/runProjectionActivityHydration.ts` and `runProjectionConversation.ts` | Historical projection hydration | Hydrates stored tool names directly. | Display-time normalization avoids migration and covers historical raw names. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-02 | Trace | `rg -n "open_tab|navigate_to|read_page|tab_id" ~/.autobyteus/server-data/memory/agents/96ee8dd0-3585-429a-ae05-ffbc0af8d5c3/raw_traces.jsonl` | Claude `open_tab` succeeded and returned `tab_id` inside text content block array. | Browser session exists, but frontend parser misses it. |
| 2026-05-02 | Trace | `rg -n "open_tab|read_page|tab_id" ~/.autobyteus/server-data/memory/agents/dab27e5f-48ca-42bc-8582-ab2a187f92dc/raw_traces.jsonl` | Codex result is a direct object containing `tab_id`, matching the current frontend parser. | Confirms result shape difference. |
| 2026-05-02 | Log | `rg -n "Browser bridge|created claude_agent_sdk|created codex_app_server|open_tab" ~/.autobyteus/logs/app.log` | Browser bridge started; relevant Claude and Codex runs created. | Confirms logs correspond to user screenshots timeframe. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: Investigation was fully local and log/code driven.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: For implementation validation, frontend unit tests can use mocked `browserShellStore`/`useRightSideTabs`; backend converter tests are pure unit tests.
- Required config, feature flags, env vars, or accounts: Manual live validation requires Electron Browser bridge available and Claude Agent SDK runtime configured; existing logs show this environment has both.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation only.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

1. **Primary root cause**: `handleBrowserToolExecutionSucceeded` does not parse Claude MCP content-block results. The exact failing result shape is present in the user-requested `$HOME/.autobyteus` logs.
2. **Visibility architecture**: Browser tools create sessions in `BrowserTabManager`; Browser panel only lists sessions claimed into a shell by `BrowserShellController`. The existing frontend handler is intentionally responsible for that claim/focus after `open_tab` success.
3. **Codex parity explanation**: Codex works because it emits a direct object result with `tab_id`, which the handler already supports.
4. **Tool-name display explanation**: Claude Agent SDK uses transport-qualified MCP names (`mcp__autobyteus_browser__open_tab`) at the raw runtime/tool surface. Some backend event paths normalize to canonical names, but UI components render raw stored names directly when raw values reach them.
5. **Design direction**: Do not add Claude-specific branches in stream facades or Electron bridge. Add small browser-specific normalizers under frontend streaming/browser or utils and use display-time label normalization for raw/historical tool names.

## Constraints / Dependencies / Compatibility Facts

- Preserve `BrowserBridgeServer` as shell-agnostic; the renderer shell id is only available through Electron IPC from the active Browser panel/window.
- Preserve `BrowserShellController` as authoritative owner of visible shell state and leases.
- Preserve existing direct object/string result parsing for Codex and Autobyteus runtime.
- Normalize only allowlisted Autobyteus browser MCP names to avoid incorrectly rewriting unrelated MCP server tools.

## Open Unknowns / Risks

- Whether the user saw raw MCP names from a live stream before backend normalization landed, from a historical/cached projection, or from a still-uncovered segment metadata path. Design covers both by adding display-time normalization and converter coverage.
- If multiple windows/shells subscribe to the same run, the current behavior focuses the tab in the renderer that receives the event. This matches existing Codex behavior and is not changed.

## Notes For Architect Reviewer

- The correct fix is not to make BrowserBridgeServer call BrowserShellController, because the bridge lacks the target shell/window identity and should remain runtime-facing.
- The correct implementation center is the frontend `browserToolExecutionSucceededHandler` plus tiny allowlisted utilities for browser tool result/name normalization and display label normalization.
- Consider asking implementation to add focused unit tests rather than live Claude E2E in implementation; API/E2E can later run live Electron/Claude validation if the environment is available.

## Design Revision Note — 2026-05-02

After the initial design handoff, the user clarified that frontend display components should display the values sent by the backend and should not implement Claude MCP tool-name normalization in `ToolCallIndicator.vue` or `ActivityItem.vue`. The design direction was revised accordingly:

- Backend Claude event conversion is the authoritative boundary for normalizing `mcp__autobyteus_browser__<tool>` names to canonical browser tool names.
- Backend Claude event conversion should also normalize browser MCP result content blocks/envelopes into standard browser result objects before emitting `TOOL_EXECUTION_SUCCEEDED`.
- Frontend display components should remain display-only. If raw MCP labels appear, fix the backend converter/projection source rather than adding presentation-level prefix stripping.
- The existing frontend Browser shell focus path remains the consumer of canonical `open_tab` events with parseable `tab_id` results.

## Additional Investigation Note — Claude `send_message_to` Parsed-Only Activity — 2026-05-02

User reported a second bug after confirming the Claude browser `open_tab` fix works in a local build from the ticket worktree: in a Claude Agent SDK ClassRoomSimulation team run, `send_message_to` appears in Activity only as `PARSED`.

Evidence inspected:

- App log records team run `team_classroomsimulation_1c44ae06` created at `2026-05-02T18:57:55.658Z`, professor member run `professor_9fde020d19f62422`, and student member run `student_378c57a308a8baeb`.
- Team metadata path: `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_classroomsimulation_1c44ae06/team_run_metadata.json` confirms `professor` runtime kind `claude_agent_sdk`.
- Team member raw trace path: `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_classroomsimulation_1c44ae06/professor_9fde020d19f62422/raw_traces.jsonl` contains user/assistant trace only; lifecycle state issue is better explained by converter/coordinator code.
- `autobyteus-server-ts/src/agent-execution/backends/claude/team-communication/claude-send-message-tool-call-handler.ts` emits canonical `ITEM_ADDED` and terminal `ITEM_COMMAND_EXECUTION_COMPLETED` / `ITEM_COMPLETED` for logical `send_message_to`, but does not emit canonical `ITEM_COMMAND_EXECUTION_STARTED`.
- `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-session-event-converter.ts` suppresses every `TOOL_*` lifecycle event whose `toolName` satisfies `isClaudeSendMessageToolName(...)`. That predicate matches both canonical `send_message_to` and raw MCP `mcp__autobyteus_team__send_message_to`, so canonical handler completions are dropped.
- `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-tool-use-coordinator.ts` suppresses raw SDK send-message tool-use/tool-result chunks. This duplicate suppression is correct, but should not imply suppression of handler-owned canonical lifecycle events.
- Codex parity source: `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts` has dynamicToolCall tests showing start fan-out to `SEGMENT_START` + `TOOL_EXECUTION_STARTED` and completion fan-out to `TOOL_EXECUTION_SUCCEEDED`/`FAILED` + `SEGMENT_END` for `send_message_to`.

Design implication:

- Fix belongs in backend Claude team tool handler/converter. Split raw-MCP vs canonical send-message predicates; pass canonical `send_message_to` lifecycle events; keep raw SDK MCP duplicate suppression. Do not change frontend display/status components.
