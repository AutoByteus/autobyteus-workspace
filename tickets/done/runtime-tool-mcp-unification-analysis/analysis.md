# Runtime Tool MCP Unification Analysis

## Short Conclusion

Yes, this is feasible, but the safe target is **not** “move all current tool code into MCP.” The safe target is:

1. keep one canonical, project-owned implementation for each first-party tool family;
2. expose that implementation through thin adapters:
   - current native AutoByteus/local `BaseTool` registration where needed;
   - Codex dynamic tools where still needed;
   - Claude SDK in-process MCP where still needed;
   - a new project-hosted MCP server for runtimes that can consume external MCP;
3. make Streamable HTTP the primary shared transport, with stdio as a compatibility shim for clients that cannot connect to HTTP MCP.

A single static MCP address/config is safe only for unscoped tools. For scoped tools such as `send_message_to`, `create_tasks`, and browser tabs, the shared server must bind each MCP client/session to a run, team member, workspace, browser bridge, and capability set by a scoped token/header or run-scoped URL.

## Current-State Findings

### 1. The repo already has a partial “canonical implementation + runtime projection” pattern

- Browser tools live under `autobyteus-server-ts/src/agent-tools/browser/*`.
- `open_tab` and related browser tools have:
  - canonical names/contracts in `browser-tool-contract.ts`;
  - manifest entries in `browser-tool-manifest.ts`;
  - a shared `BrowserToolService`;
  - AutoByteus local wrappers (`open-tab.ts`, `navigate-to.ts`, etc.);
  - Codex dynamic projection in `agent-execution/backends/codex/browser/build-browser-dynamic-tool-registrations.ts`;
  - Claude in-process MCP projection in `agent-execution/backends/claude/browser/*`.

This is the best local pattern to reuse.

### 2. The repo also consumes external MCP servers, but does not host one general first-party MCP server

- `autobyteus-ts/src/tools/mcp/*` implements MCP client-side config, discovery, registration, and tool calls.
- It supports `stdio`, `streamable_http`, and `websocket` in core types/managers.
- Server/UI management persists MCP configs through `autobyteus-server-ts/src/mcp-server-management/*` and Settings/Tools UI.
- Current code search did not find a general first-party MCP server endpoint that exposes AutoByteus-owned tools to other runtimes by address.

### 3. Claude “MCP tools” are currently SDK-local, not a reusable address

- Claude browser/team/media/publish tools are built through `ClaudeSdkClient.createMcpServer(...)`.
- Those servers are passed into a Claude session as `mcpServers`.
- That is useful for Claude, but it is not the same as a project-hosted streamable MCP endpoint that Antigravity/Codex/other runtimes can all configure.

### 4. `send_message_to` is split across old local and newer runtime-specific paths

- Local AutoByteus tool: `autobyteus-ts/src/agent/message/send-message-to.ts`.
- Codex dynamic projection: `autobyteus-server-ts/src/agent-execution/backends/codex/team-communication/codex-send-message-dynamic-tool-registration.ts`.
- Claude in-process MCP projection: `autobyteus-server-ts/src/agent-execution/backends/claude/team-communication/*`.
- Shared server-side parsing/delivery helpers already exist under `agent-team-execution/services/*`, but there is not one general MCP exposure boundary for this tool.

### 5. `create_tasks` / task-plan tools are still local runtime tools

- `create_tasks`, `create_task`, `get_my_tasks`, `update_task_status`, and `assign_task_to` are in `autobyteus-ts/src/task-management/tools/task-tools/*`.
- They depend on `context.customData.teamContext.state.taskPlan`.
- Exposing them externally through MCP requires a server-owned or runtime-handle-backed task-plan command boundary; otherwise an MCP call has no safe way to know which team run/member task plan it should mutate.

## Transport Analysis

| Transport | Fit | Pros | Cons | Recommendation |
| --- | --- | --- | --- | --- |
| Streamable HTTP MCP | Best primary target | One stable server address; works for local and remote runtimes; no per-runtime process spawn; can use headers/tokens; matches repo's existing MCP client config support | Requires auth, session binding, lifecycle cleanup, and network reachability; not every client may support all MCP features equally | Build first as the shared endpoint |
| stdio MCP | Good compatibility fallback | Easy for local CLIs; per-process env can carry run/workspace token; simple local security model | Not a single address; every runtime launches its own process; awkward for remote/mobile/browser bridge use; harder to share live application state | Provide later as a shim/proxy to the same catalog/service |
| WebSocket MCP | Existing core client support, but less relevant | Could support long-lived sessions | Less universal as a config target; UI docs emphasize stdio/HTTP | Do not use as the main design unless a target runtime requires it |

## Recommended Target Shape

1. **FirstPartyToolCatalog**
   - Owns canonical tool names, descriptions, JSON schemas, result shapes, capability tags, and context requirements.
   - Browser/media/publish already approximate this pattern.
   - Team communication and task-plan tools should be moved toward this pattern.

2. **ToolExecutionContextResolver**
   - Converts an MCP request/session into an authoritative AutoByteus context:
     - `runId`, `teamRunId`, `memberRunId` / route key;
     - workspace root;
     - configured tool allowlist;
     - browser bridge binding;
     - approval policy / auto-execute policy.

3. **FirstPartyMcpServer**
   - New streamable HTTP server endpoint, likely in `autobyteus-server-ts`.
   - Lists only tools allowed for that scoped token/session.
   - Delegates execution to project-owned services; it must not duplicate tool logic.

4. **CapabilityGate / Auth**
   - Tokens or headers should bind the client to a run/team/member and allowed capabilities.
   - A global unauthenticated `send_message_to` / browser / task mutation endpoint is unsafe.

5. **Runtime adapters become optional compatibility layers**
   - Keep Codex dynamic and Claude in-process MCP adapters initially.
   - For runtimes with good external MCP support, configure them to use the shared HTTP MCP endpoint.
   - Eventually delete bespoke adapters only when the shared path proves it can preserve tool lifecycle, approvals, and UI event normalization.

## Tool-by-Tool Feasibility

| Tool family | Feasibility | Notes |
| --- | --- | --- |
| Browser tools (`open_tab`, `navigate_to`, etc.) | High | Already server-owned with manifest/service. MCP endpoint can delegate to `BrowserToolService`; must require a valid browser bridge binding/token. |
| Media / publish tools | High | Already follow server-owned cross-runtime patterns. Good candidates for the same MCP catalog. |
| `send_message_to` | Medium | Semantics are clear, but execution must be bound to a team run/member identity and allowed recipient list. Needs one server-owned canonical send-message command service. |
| Task-plan tools (`create_tasks`, `create_task`, `get_my_tasks`, etc.) | Medium/Hard | Current implementation depends on in-memory team context. Need a server-owned task-plan command/query boundary or live team-run handle registry before safe MCP exposure. |
| File/shell/edit tools | Harder / security-sensitive | Need workspace sandboxing, approval bridge, cancellation, and durable lifecycle events before external MCP exposure. Not phase 1 unless explicitly scoped. |

## Migration Plan

1. **Phase 0 — Inventory and classify**
   - Classify first-party tools by owner, required context, side-effect level, approval needs, and runtime exposure today.

2. **Phase 1 — Host read/simple server-owned tools over streamable HTTP MCP**
   - Start with browser list/read-ish operations or media/publish if auth/context is ready.
   - Reuse existing manifests/services.
   - Prove tool discovery and call flow from at least one external MCP client.

3. **Phase 2 — Scoped browser tools**
   - Expose full browser tool group through MCP with a token bound to the Electron/remote browser bridge and allowed browser capability.

4. **Phase 3 — Scoped team communication**
   - Create/standardize a server-owned `TeamCommunicationToolService`.
   - Expose `send_message_to` through MCP only with teamRun/member binding and allowed recipients.

5. **Phase 4 — Scoped task-plan tools**
   - Introduce a server-owned task-plan command/query service or live team-run handle boundary.
   - Expose `create_tasks`, `create_task`, `get_my_tasks`, `update_task_status` through MCP only for a bound team member/team run.

6. **Phase 5 — Runtime adapter reduction**
   - Compare Codex dynamic/Claude in-process MCP against shared HTTP MCP behavior.
   - Remove bespoke paths only where lifecycle, approval, result normalization, and UI behavior are equivalent.

## Main Risks / Design Constraints

1. **A single static config is unsafe for scoped tools**
   - Same address is fine; same global token/context is not.
   - Use stable base URL plus generated per-run/per-member token/header, or run-scoped URL.

2. **Tool lifecycle normalization must remain canonical**
   - Existing code already has special normalization for Codex MCP calls and Claude `mcp__autobyteus_*__tool` names.
   - A shared MCP endpoint still needs canonical event names/results for Activity, artifacts, and history.

3. **Approval semantics differ by runtime**
   - Some runtimes support MCP elicitation/approval differently or not at all.
   - AutoByteus should keep approval policy in its own server/runtime boundary, not rely entirely on external runtime UX.

4. **Browser tools are UI-process dependent**
   - The server delegates to Electron's browser bridge.
   - Remote nodes need explicit pairing; MCP exposure must not bypass browser sharing controls.

5. **Task tools need authoritative run/team context**
   - Without explicit team-run/member binding, an MCP `create_tasks` call cannot be safely routed.

6. **MCP feature support varies**
   - Before committing to Antigravity or another runtime, verify: supported transports, headers/env interpolation, tool approval/elicitation behavior, cancellation, and result rendering.

## Recommended Decision

Proceed with a **streamable HTTP first-party MCP server** as a new exposure adapter around existing project-owned services, not as the new owner of tool semantics. Keep stdio as a compatibility shim. Do not promise one universal static config for all scoped tools; promise one stable server/code path plus scoped credentials/session binding.
