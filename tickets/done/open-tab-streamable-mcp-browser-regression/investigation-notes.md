# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete enough to begin investigation; reusing the user-identified task worktree because the bug is branch-specific to `codex/streamable-mcp-runtime-tools`.
- Current Status: Bootstrap recorded; code investigation pending.
- Investigation Goal: Determine why successful `open_tab` Streamable MCP calls do not update the Electron Browser panel.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The issue may cross MCP server tool execution, run/session context propagation, browser surface state, and frontend event/UI subscriptions.
- Scope Summary: Diagnose and design a fix for `open_tab` tool success without visible browser UI update on the Streamable MCP runtime tools branch.
- Primary Questions To Resolve: Does `open_tab` update backend browser state? Which identity/session is used? What event or query causes the Browser panel to display tabs? What changed from personal/original branch to Streamable MCP?

## Request Context

User reports that screenshots show `open_tab` tool calls returning success from both `solution_designer` and Daily Assistant, but the Browser panel remains empty. The Electron app is built from the `streamable-mcp-runtime-tools` worktree, whose server-side agent tools were refactored to Streamable MCP. Original personal branch reportedly did not have this issue.

Reference screenshots:
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_3c149324ddaf4e32847071827c587f1f/solution_designer_c0dbc987b73e499f8ea66c384facdb1d/context_files/ctx_6b6344e867a9__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_3c149324ddaf4e32847071827c587f1f/solution_designer_c0dbc987b73e499f8ea66c384facdb1d/context_files/ctx_a7e69ff9fd1c__image.png`

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git monorepo
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/open-tab-streamable-mcp-browser-regression`
- Current Branch: `codex/streamable-mcp-runtime-tools`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools`
- Bootstrap Base Branch: Existing task branch based on the Streamable MCP refactor; remote default for the superrepo is `origin/personal`.
- Remote Refresh Result: `git fetch origin --prune` succeeded from the superrepo before investigation.
- Task Branch: `codex/streamable-mcp-runtime-tools`
- Expected Base Branch (if known): Compare against `personal` / `origin/personal` and possibly the existing non-streamable implementation.
- Expected Finalization Target (if known): The Streamable MCP runtime tools branch before merge/integration.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: This is branch-specific; do not assume `personal` behavior is broken.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-16 | Command | `git fetch origin --prune` | Refresh tracked refs before branch-specific investigation | Succeeded | No |
| 2026-06-16 | Command | `git worktree list --porcelain` | Locate the user-named worktree | Found `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools` on `codex/streamable-mcp-runtime-tools` | No |
| 2026-06-16 | Command | `git status --short --branch` in task worktree | Record branch/worktree state | Branch tracks `origin/codex/streamable-mcp-runtime-tools`; clean before artifacts | No |
| 2026-06-16 | Other | User screenshots | Observe reported runtime symptom | Tool call succeeds while Browser tab remains empty-state | Yes |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Agent tool call to `mcp__autobyteus_agent_tools.open_tab`.
- Current execution flow: Pending code investigation.
- Ownership or boundary observations: Pending code investigation.
- Current behavior summary: Tool result returns `tab_id`, `status`, and URL, but the visible Browser panel does not show the opened/reused tab.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Unclear
- Refactor posture evidence summary: Pending comparison between original/personal and Streamable MCP implementation.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User screenshots | Successful tool results do not update Browser panel | Possible missing state/event propagation invariant after Streamable MCP refactor | Inspect code paths |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| Pending | Pending | Pending | Pending |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |

## External / Public Source Findings

- None yet.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Running Electron app built from `streamable-mcp-runtime-tools`; no local repro setup launched yet.
- Required config, feature flags, env vars, or accounts: Unknown.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: None beyond git fetch.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

Pending.

## Constraints / Dependencies / Compatibility Facts

- Must preserve visible in-app Browser semantics for tool calls.
- Must support single-agent and team-member contexts.
- Must not paper over the issue by reporting success without UI synchronization when context is missing.

## Open Unknowns / Risks

- Unknown whether browser state is being written under a wrong key, not written, or written but not notified to frontend.
- Unknown exact identity required by the Browser panel (`runId`, `agentRunId`, `agentTeamRunId`, member ID, conversation ID, or tab ID).
- Unknown whether Streamable MCP request metadata contains the required context and whether the current server tool reads it.

## Notes For Architect Reviewer

Design should explicitly identify the authoritative owner for browser surface state/event publication and forbid Streamable MCP tool handlers from bypassing or recreating that behavior locally.

## Added Findings — 2026-06-16

### Reproduction evidence from persisted traces

Persisted raw traces for both reported runs show the same backend event shape:

- Daily Assistant run: `/Users/normy/.autobyteus/server-data/memory/agents/daily_assistant_a407fb42f8b945199363972572bb120c/raw_traces.jsonl`
  - `TOOL_EXECUTION_STARTED` for `open_tab` with args `{ url: "https://example.com", wait_until: "domcontentloaded", reuse_existing: true, title: "Open Tab Test" }`.
  - `TOOL_EXECUTION_SUCCEEDED` for `open_tab` with `tool_result` shaped as an MCP content envelope:
    - `{ content: [{ type: "text", text: "{\n  \"tab_id\": \"65ab2c\", ... }" }], structuredContent: null, _meta: null }`.
  - Second Daily Assistant `open_tab` to Google returned the same envelope shape with `tab_id: "67fb94"`.
- Team solution-designer member run: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_3c149324ddaf4e32847071827c587f1f/solution_designer_c0dbc987b73e499f8ea66c384facdb1d/raw_traces.jsonl`
  - `TOOL_EXECUTION_STARTED` for `open_tab` with args `{ url: "https://example.com", wait_until: "domcontentloaded", reuse_existing: true, title: "open_tab test" }`.
  - `TOOL_EXECUTION_SUCCEEDED` for `open_tab` with `tool_result.content[0].text` containing the JSON string for `{ tab_id: "65ab2c", status: "opened", url: "https://example.com/", title: "open_tab test" }`.

This proves the backend bridge did execute the browser operation and returned a valid browser session ID, but the streamed result contract seen by the renderer was not canonicalized to a direct object with `result.tab_id`.

### Runtime probe evidence

A direct `list_tabs` probe through `mcp__autobyteus_agent_tools.list_tabs` returned existing Electron browser sessions:

- `65ab2c` — `https://example.com/`
- `67fb94` — `https://www.google.com/`

This confirms the browser sessions exist in Electron/main browser state. The empty Browser panel is therefore not caused by failure to open browser sessions. It is caused by the shell focus/update path not being triggered from the streamed tool success event.

### Current code path and likely failure point

The current frontend Browser focus hook is `autobyteus-web/services/agentStreaming/browser/browserToolExecutionSucceededHandler.ts`.

It only focuses a browser session when all of these are true:

1. `parseToolExecutionSucceededPayload(payload)` succeeds.
2. `parsed.toolName === "open_tab"`.
3. `extractBrowserTabIdFromResult(parsed.result)` can find a tab ID.

`extractBrowserTabIdFromResult` supports only:

- direct object shape: `{ tab_id: "..." }`, or
- JSON string shape: `"{\"tab_id\":\"...\"}"`.

It does **not** support the Streamable MCP envelope observed in traces:

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\n  \"tab_id\": \"65ab2c\" ... }"
    }
  ],
  "structuredContent": null,
  "_meta": null
}
```

Therefore `browserSessionId` becomes null, the handler returns before calling `browserShellStore.focusSession`, and the right-side Browser panel remains in the empty state.

### Current ownership / design contract

`autobyteus-web/docs/browser_sessions.md` says the server owns runtime-specific browser tool event canonicalization before streaming, and the renderer consumes canonical browser tool events. The new Streamable MCP branch updates the docs to state that `autobyteus_agent_tools` MCP-prefixed raw tool names and results must be normalized to the same canonical browser event contract before the renderer sees `TOOL_EXECUTION_SUCCEEDED`.

Important current owner details:

- `autobyteus-server-ts/src/agent-tools/mcp/providers/browser-tools-mcp-adapter-provider.ts` returns browser tool outputs as `createAgentToolsMcpSuccessResult(toBrowserJsonString(result))`, which becomes an MCP text content result.
- `autobyteus-server-ts/src/agent-execution/backends/codex/items/codex-tool-payload-parser.ts` currently returns `payload.result ?? item.result ?? ...` before attempting text extraction/parsing. With MCP envelopes, that preserves the raw content envelope instead of extracting/parsing `content[0].text`.
- `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-browser-tool-result-normalizer.ts` already contains browser-specific logic that unwraps MCP content blocks/envelopes into a direct JSON object for known browser tool names.
- The Codex path has Agent Tools MCP name sanitization/canonicalization (`codex-agent-tools-mcp-*`) but lacks the equivalent browser result-envelope normalization observed by the renderer traces.

### Root-cause conclusion

The regression is not that Electron failed to create a browser tab. The tab exists. The regression is that after moving server-side agent tools to Streamable MCP, `open_tab` success events now stream an MCP content envelope as the `result`, while the renderer Browser focus handler and documented browser event contract require a canonical result with `tab_id` directly available.

Root cause classification: `Missing Invariant` with a boundary/ownership aspect. The server event-converter boundary must preserve the invariant "known browser tool success events expose direct canonical browser result objects". The Streamable MCP refactor broke that invariant for `open_tab` by leaking MCP result envelope shape to the renderer.

### Recommended fix direction

Primary fix should be server-side, not frontend-only:

1. Add a shared Agent Tools MCP browser result normalizer that can unwrap MCP text content envelopes and parse known browser tool JSON results.
2. Apply it at Codex Agent Tools MCP event conversion before `TOOL_EXECUTION_SUCCEEDED` is emitted for known browser tool names.
3. Reuse or replace the Claude-specific normalizer with the shared normalizer so Claude and Codex do not diverge.
4. Keep the frontend `browserToolExecutionSucceededHandler` simple and canonical-contract-based. Optional defensive support for envelopes can be added only as a diagnostic/fallback, not as the authoritative fix.
5. Add regression coverage using the exact observed envelope shape and assert that the converted `TOOL_EXECUTION_SUCCEEDED` payload has `tool_name: "open_tab"` and `result.tab_id` directly available.

### Additional Source Log Rows

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-16 | Log | `/Users/normy/.autobyteus/server-data/memory/agents/daily_assistant_a407fb42f8b945199363972572bb120c/raw_traces.jsonl` | Inspect actual streamed result shape for Daily Assistant reproduction | `open_tab` success result is MCP content envelope, not direct `{ tab_id }` object | Add converter coverage |
| 2026-06-16 | Log | `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_3c149324ddaf4e32847071827c587f1f/solution_designer_c0dbc987b73e499f8ea66c384facdb1d/raw_traces.jsonl` | Inspect team coordinator reproduction | Same MCP content envelope shape for `open_tab` | Add team/single-agent validation |
| 2026-06-16 | Probe | `mcp__autobyteus_agent_tools.list_tabs` | Determine whether Electron browser sessions exist | Existing sessions `65ab2c` and `67fb94` are present | Confirms UI focus/event issue |
| 2026-06-16 | Code | `autobyteus-web/services/agentStreaming/browser/browserToolExecutionSucceededHandler.ts` | Determine frontend Browser focus trigger | Handler only extracts direct `{ tab_id }` object or JSON string; ignores MCP content envelopes | Server result canonicalization needed |
| 2026-06-16 | Code | `autobyteus-web/stores/browserShellStore.ts` and `autobyteus-web/electron/browser/register-browser-shell-ipc-handlers.ts` | Verify focus path from renderer to Electron shell | `focusSession` invokes Electron IPC `browser-shell:focus-session`, which would attach existing session if called | Failure is before focus call |
| 2026-06-16 | Code | `autobyteus-server-ts/src/agent-tools/mcp/providers/browser-tools-mcp-adapter-provider.ts` | See new Streamable MCP browser adapter output | Browser result is serialized into MCP text content through `createAgentToolsMcpSuccessResult` | Need event converter unwrap |
| 2026-06-16 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/items/codex-tool-payload-parser.ts` | See Codex result extraction behavior | Raw `payload.result` / `item.result` is returned before text extraction, preserving envelope | Needs normalizer or parser adjustment |
| 2026-06-16 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-browser-tool-result-normalizer.ts` | Look for existing browser MCP envelope normalizer | Claude already unwraps known browser tool MCP content envelopes | Reuse/extract for Codex |
| 2026-06-16 | Repo Diff | `git diff origin/personal...HEAD -- autobyteus-server-ts/src/agent-tools autobyteus-server-ts/src/agent-execution/backends autobyteus-web/docs/browser_sessions.md` | Compare personal vs Streamable MCP branch | Codex browser dynamic tool registrations were removed and replaced by Agent Tools MCP; docs still require canonical event result | Regression introduced by Streamable MCP result shape |
| 2026-06-16 | Code | `git show origin/personal:autobyteus-server-ts/src/agent-execution/backends/codex/browser/build-browser-dynamic-tool-registrations.ts` | Understand original personal branch behavior | Old Codex dynamic browser tool path returned dynamic-tool text result, which existing parser could parse into direct browser JSON | Confirms changed result envelope source |
