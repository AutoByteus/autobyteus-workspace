# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete; dedicated task worktree found and remote refreshed.
- Current Status: Deep investigation complete; design corrected after Codex MCP materializer scope challenge.
- Investigation Goal: Derive the runtime MCP agent-tools follow-up requirements from the empty ticket folder, the base branch, the completed upstream `streamable-mcp-runtime-tools` ticket, and the later design-impact/API-E2E reroutes.
- Scope Classification (`Small`/`Medium`/`Large`): Large.
- Scope Classification Rationale: The selected change now includes two external/runtime Agent Tools MCP `send_message_to` materializers (Claude Agent SDK and Codex App Server), removal/gating of duplicate runtime-specific send-message paths, runtime-memory/run-history invariant work, and all-active-runtime E2E coverage.
- Scope Summary: Implement Claude Agent SDK programmatic materialization and Codex App Server thread-scoped MCP config materialization of the existing AutoByteus Agent Tools MCP Server for `send_message_to`; remove the duplicate Claude in-process `send_message_to` MCP implementation; remove/gate Codex dynamic `send_message_to`; keep AutoByteus native local; defer Claude Code CLI and Antigravity CLI materializers.

## Request Context

User request: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools` and “please work on this ticket which is based on the origin/codex/streamable-mcp-runtime-tools branch”.

The provided ticket directory existed but was empty at bootstrap. The user later clarified that this ticket is bootstrapped from the earlier completed `streamable-mcp-runtime-tools` ticket and that its investigation notes should be used as upstream evidence.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools`
- Current Branch: `codex/runtime-mcp-agent-tools`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools`
- Bootstrap Base Branch: `origin/codex/streamable-mcp-runtime-tools`
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-06-13; local branch and fetched remote both at `3a82ba5cb95542004fe4a4604fc600bc5404a0a8`.
- Task Branch: `codex/runtime-mcp-agent-tools`
- Expected Base Branch: `origin/codex/streamable-mcp-runtime-tools`
- Expected Finalization Target: `origin/codex/streamable-mcp-runtime-tools` unless delivery receives a newer instruction.
- Bootstrap Blockers: No worktree blockers. Requirement source was absent in the in-progress folder, so upstream done-ticket artifacts were used as the requirements lineage.
- Notes For Downstream Agents: Use the dedicated worktree, not the superrepo checkout. Treat `origin/codex/streamable-mcp-runtime-tools` as the base unless delivery resolves a different finalization target.

## Upstream Done-Ticket Lineage

Primary upstream package read from the current worktree:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/done/streamable-mcp-runtime-tools/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/done/streamable-mcp-runtime-tools/design-spec.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/done/streamable-mcp-runtime-tools/implementation-handoff.md`

Relevant upstream conclusions:

1. The base branch intentionally created a **central AutoByteus Agent Tools MCP Server** and stopped short of production runtime materializers.
2. `AgentToolMcpDescriptor` is the canonical runtime-only, secret-bearing descriptor. Runtime materializers must consume this descriptor and must not hand-build route URLs, tokens, or tool allowlists from registry internals.
3. Claude Agent SDK materialization was already investigated and accepted as a programmatic path: convert the descriptor into `{ mcpServers, allowedTools }` and pass it into SDK query options; no `.mcp.json`, `.claude/`, or other bearer-token file is needed.
4. Codex App Server materialization was investigated. The high-risk shape is process-wide bearer config on the cwd-keyed shared app-server process; the safe shape is per-thread `thread/start` / `thread/resume` `config.mcp_servers` materialization, which was later verified locally and is now in scope.
5. Antigravity CLI materialization was investigated as workspace `.agents/mcp_config.json`, but the AGY runtime/materializer is not present in this branch and would need explicit file cleanup/rewrite/redaction policy.
6. Claude Code CLI materialization was investigated as generated ephemeral `--mcp-config`, but there is no Claude Code runtime backend in this branch.
7. V1 Agent Tools MCP sessions are memory-only, app-level run/member sessions with bearer-token capability isolation. Raw descriptors must not be logged, persisted, emitted, or written to durable project files.
8. `send_message_to` execution authority is `SendMessageToDispatcher`; the MCP route/tool executor must not call runtime wrappers such as AutoByteus `BaseTool`, Codex dynamic registration, or Claude handler shortcuts.
9. The prior implementation handoff explicitly listed production materializers for AGY, Claude Code CLI, Codex App Server, and Claude Agent SDK as deferred. The current ticket promotes Claude Agent SDK and Codex App Server `send_message_to` materializers into scope after the user clarified the unified-solution requirement.

Scope implication for this follow-up: implement backend-local materializers for Claude Agent SDK and Codex App Server. Do not use a generic all-runtime config writer; do not implement Claude Code CLI or Antigravity CLI materializers here.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-13 | Command | `pwd` from `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` | Identify initial shell context | Initial cwd was the shared superrepo checkout, not the ticket worktree. | No |
| 2026-06-13 | Command | `ls -la /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools` | Inspect provided ticket path | Directory existed and was empty. | No |
| 2026-06-13 | Command | `git -C /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools status --short --branch` | Verify dedicated worktree/branch | Branch was `codex/runtime-mcp-agent-tools`, tracking `origin/codex/streamable-mcp-runtime-tools`, clean before artifact creation. | No |
| 2026-06-13 | Command | `git -C /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools fetch origin --prune` | Refresh tracked remote refs | Fetch succeeded; remote base and local branch remained at `3a82ba5cb95542004fe4a4604fc600bc5404a0a8`. | No |
| 2026-06-13 | Command | `git rev-parse HEAD` and `git rev-parse origin/codex/streamable-mcp-runtime-tools` | Record exact base state | Both resolved to `3a82ba5cb95542004fe4a4604fc600bc5404a0a8`. | No |
| 2026-06-13 | Repo/Spec | `tickets/done/streamable-mcp-runtime-tools/investigation-notes.md` | Read required upstream investigation lineage | Confirmed runtime materializer matrix, Codex/Claude/AGY probes, Claude SDK programmatic materialization, session/security policy, and external runtime deferrals. | Incorporated into requirements/design. |
| 2026-06-13 | Spec | `tickets/done/streamable-mcp-runtime-tools/design-spec.md` | Verify prior ownership/design constraints | Confirmed runtime-specific materializers belong under runtime backend folders, consume `AgentToolMcpDescriptor`, and must not implement tool behavior. Found explicit future Claude SDK materializer file suggestion. | Incorporated into design. |
| 2026-06-13 | Doc | `tickets/done/streamable-mcp-runtime-tools/implementation-handoff.md` | Confirm what base branch actually delivered/deferred | Base delivered route/session/catalog/executor; production runtime materializers remained deferred. | Current ticket now picks Claude SDK and Codex App Server send-message materializers. |
| 2026-06-13 | Code | `autobyteus-server-ts/src/agent-tools/mcp/**` | Inspect base Agent Tools MCP subsystem | Server has session service, descriptor/redaction, route gate, method dispatcher, catalog, schema/result mapping, and `send_message_to` execution through `SendMessageToDispatcher`. | Reuse; do not alter route unless tests reveal need. |
| 2026-06-13 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | Find Claude SDK query setup | `executeTurn` resolves tooling, builds MCP servers, passes `mcpServers` and `allowedTools` to `sdkClient.startQueryTurn`. | Insert/ensure Agent Tools MCP descriptor before config build. |
| 2026-06-13 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/session/build-claude-session-mcp-servers.ts` and `claude-session-mcp-server-config.ts` | Inspect MCP server config merge | Current `sendMessageToToolingEnabled` causes `autobyteus_team` in-process server creation and request approval handler wiring. | Change team server to task-delegation only and merge Agent Tools MCP server separately. |
| 2026-06-13 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/team-communication/claude-team-mcp-server-builder.ts` | Inspect current team MCP builder | Builds `send_message_to` tool with `ClaudeSendMessageToolCallHandler` plus task-delegation definitions. | Remove send-message path; keep task delegation. |
| 2026-06-13 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/agent-communication/claude-send-message-tool-call-handler.ts` and `claude-send-message-tool-definition-builder.ts` | Inspect duplicate Claude path | Files wrap `SendMessageToDispatcher` behind Claude-specific in-process MCP tool and event/approval handling. | Obsolete after Agent Tools MCP materializer. |
| 2026-06-13 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-tooling-options.ts` | Inspect allowed-tool names | Current configured send-message adds plain `send_message_to` and old `mcp__autobyteus_team__send_message_to`. | Replace old MCP name with `mcp__autobyteus_agent_tools__send_message_to`; avoid dual path. |
| 2026-06-13 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/claude-send-message-tool-name.ts`, event converter, tool-use coordinator | Inspect event/tool name handling | Current code treats old team MCP send-message as duplicate noise and suppresses events because handler emitted canonical events itself. | New remote MCP lifecycle should not be suppressed; normalize prefixed name to canonical. |
| 2026-06-13 | Code | `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts` | Verify SDK query option passthrough | `startQueryTurn` builds options with `mcpServers`, `allowedTools`, `canUseTool`/auto allow, cwd/env/settings. | Materializer can pass standard config through existing client. |
| 2026-06-13 | Code/Lockfile | `pnpm-lock.yaml`, `autobyteus-server-ts/package.json`, local/packed `@anthropic-ai/claude-agent-sdk@0.2.71` type definitions | Verify remote HTTP MCP config shape | SDK supports `mcpServers?: Record<string, McpServerConfig>` and HTTP config `{ type: "http", url, headers? }`. | Use as contract for materializer. |
| 2026-06-13 | Code | `autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-client-manager.ts`, `codex-thread-manager.ts` | Check current Codex runtime config path | App-server process reuse is cwd-keyed; thread start/resume currently passes `config: null` and dynamic tools. | Do not use process-wide config; add thread-scoped config materialization. |
| 2026-06-13 | Command | `codex app-server generate-ts --out /tmp/codex-app-server-proto`; inspect `v2/ThreadStartParams.ts` and `v2/ThreadResumeParams.ts` | Verify app-server protocol supports per-thread config | Both start and resume params contain `config?: { [key: string]?: JsonValue } | null`, allowing runtime-provided config without process-level `-c` overrides. | Use `thread/start`/`thread/resume` config for Codex Agent Tools MCP. |
| 2026-06-13 | Local Probe | `/tmp/autobyteus-agent-tools-mcp-thread-config-probe-20260613-133706/result.json` | Verify Codex app-server honors thread-scoped MCP config | Started dummy Streamable HTTP MCP server, launched `codex app-server --stdio`, passed `config.mcp_servers.autobyteus_agent_tools` in `thread/start`, observed MCP status, and `mcpServer/tool/call` returned `pong:thread-config`. | Codex materializer is feasible without shared process args or project files. |
| 2026-06-13 | Code | `autobyteus-server-ts/src/runtime-management/runtime-kind-enum.ts` | Verify available runtimes | Only `autobyteus`, `claude_agent_sdk`, and `codex_app_server` exist. | Claude Code/Antigravity materializers require future runtime backends. |

## Current Behavior / Current Flow

### Central Agent Tools MCP Server

Current base behavior:

```text
runtime/materializer would call AgentToolMcpSessionService.createAgentToolMcpSession(...)
  -> registry stores run/member owner, sender context, configured exposure, enabled tools, token hash, TTL
  -> service returns secret AgentToolMcpDescriptor
  -> external MCP client calls /mcp/agent-tools/:sessionId with bearer header
  -> route gate validates origin/auth/session/protocol/content
  -> method dispatcher handles initialize/resources/tools/list/tools/call/ping
  -> tools/call send_message_to delegates to AgentToolMcpToolExecutor
  -> executor delegates to SendMessageToDispatcher
```

Gap: no production runtime path currently calls `createAgentToolMcpSession(...)`.

### Claude Agent SDK current flow

```text
AgentRunManager.createAgentRun
  -> ClaudeAgentRunBackendFactory.createBackend
  -> ClaudeSessionBootstrapper.bootstrapForCreate/Restore
  -> ClaudeSessionManager.createRunSession/restoreRunSession
  -> ClaudeSession.sendTurn
  -> ClaudeSession.executeTurn
  -> resolveClaudeSessionToolingOptions(configured exposure)
  -> buildClaudeSessionMcpServerConfig
  -> buildClaudeSessionMcpServers
  -> buildClaudeTeamMcpServers(sendMessageToToolingEnabled, taskDelegation...)
  -> sdkClient.createMcpServer({ name: "autobyteus_team", tools: [send_message_to?, task tools?] })
  -> sdkClient.startQueryTurn({ mcpServers, allowedTools, canUseTool/autoExecuteTools })
```

Current design issue: `send_message_to` is still built as a Claude-specific in-process MCP tool under `autobyteus_team`, duplicating the new central Agent Tools MCP Server path and requiring special event suppression. Separately, Codex still registers `send_message_to` as a dynamic tool even though Codex app-server can consume the same Agent Tools MCP endpoint through thread-scoped config.

### Target Claude flow

```text
ClaudeSession.executeTurn
  -> resolve tooling options
  -> if send_message_to configured, ensure live in-memory AgentToolMcpDescriptor via AgentToolMcpSessionService
  -> Claude Agent Tools materializer maps descriptor to SDK HTTP MCP config
  -> buildClaudeSessionMcpServers merges:
       autobyteus_agent_tools   # send_message_to only, from descriptor
       autobyteus_team          # task-delegation only, when configured
       autobyteus_browser / autobyteus_image_audio / autobyteus_published_artifacts unchanged
  -> sdkClient.startQueryTurn({ mcpServers, allowedTools: [mcp__autobyteus_agent_tools__send_message_to, ...] })
  -> Claude SDK remote MCP client calls /mcp/agent-tools/:sessionId
  -> shared Agent Tools MCP executor -> SendMessageToDispatcher
  -> Claude tool-use coordinator/converter emits canonical send_message_to events
```

## Design Health Assessment Evidence

- Change posture: Feature plus targeted refactor.
- Candidate root cause classification: Duplicated Policy Or Coordination, Boundary Or Ownership Issue, Legacy Or Compatibility Pressure.
- Refactor posture evidence summary: The base created the authoritative server-hosted MCP path, but Claude keeps a second active `send_message_to` projection. This creates duplicate policy for schema, approval, events, and execution results. Removing the old Claude handler after materializing the new descriptor keeps one active Claude send-message execution path.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Prior done-ticket design | Runtime materializers consume `AgentToolMcpDescriptor`; Claude SDK materializer maps descriptor to `{ mcpServers, allowedTools }` | Current ticket should not invent a new config shape or generic writer. | Implement backend-local Claude materializer. |
| Prior implementation handoff | Production materializers deferred, but route/session/catalog/executor are complete | Current ticket should create a production call site for the existing service. | Use service, do not modify registry internals. |
| Current Claude team MCP builder | Builds both send-message and task delegation into `autobyteus_team` | `autobyteus_team` has two responsibilities; send-message must move to `autobyteus_agent_tools`. | Refactor builder/tests. |
| Current event converter/coordinator | Suppresses old MCP send-message events because handler emits canonical events | New remote MCP path needs generic lifecycle; suppression would drop Activity events. | Normalize instead of suppress. |
| Codex app-server client manager and protocol | Process reuse by cwd, but thread/start/resume support per-thread config | Process-wide bearer config is unsafe; thread-scoped config is the safe Codex materializer seam. | Implement backend-local Codex materializer using thread config. |
| Runtime enum | No Claude Code or Antigravity runtime kind | No runtime backend to host those materializers. | Keep future tickets. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session-service.ts` | Create/revoke sessions and build descriptors | Ready for runtime materializers; no production caller yet. | Claude and Codex must call this service, not registry internals. |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session.ts` | Secret/redacted descriptor and session types | `AgentToolMcpDescriptor` already has `name`, `transport`, `serverUrl`, `headers`, `enabledTools`. | Claude materializer consumes this exact shape. |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-tool-executor.ts` | Execute MCP calls | Delegates `send_message_to` to `SendMessageToDispatcher`. | Preserve as only Claude/Codex external-runtime send-message execution path after cutover. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | Per-run Claude SDK query/turn lifecycle | Natural in-memory owner for secret descriptor; already passes `mcpServers` into SDK. | Add session-service dependency and lazy descriptor creation. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-manager.ts` | Creates/restores `ClaudeSession` and owns dependencies | Current dependency bundle lacks Agent Tools MCP session service. | Inject service for testability. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/build-claude-session-mcp-servers.ts` | Merge Claude MCP server maps | Currently treats send-message as team MCP reason. | Merge Agent Tools MCP descriptor separately; team server only task delegation. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-mcp-server-config.ts` | Wrapper around MCP server construction | Currently wires send-message approval handler into old team builder. | Remove send-message requestToolApproval bridge; generic canUseTool remains. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-tooling-options.ts` | Build allowed tool names | Uses old `mcp__autobyteus_team__send_message_to`. | Replace with `mcp__autobyteus_agent_tools__send_message_to`. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/team-communication/claude-team-mcp-server-builder.ts` | Build in-process team MCP server | Currently builds send-message and task delegation. | Remove send-message imports/params; keep task delegation. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/agent-communication/claude-send-message-tool-call-handler.ts` | Claude-specific send-message handler | Duplicate path once Agent Tools MCP is used. | Delete. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/agent-communication/claude-send-message-tool-definition-builder.ts` | Claude-specific send-message tool definition | Duplicate path once Agent Tools MCP is used. | Delete. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-session-event-converter.ts` | Convert runtime events to application events | Currently filters old MCP send-message name. | Normalize new name to canonical, do not filter. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-tool-use-coordinator.ts` | Tool approval/lifecycle event coordination | Currently suppresses old MCP send-message lifecycle. | Emit canonical lifecycle for new remote MCP tool. |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts` | SDK wrapper | Already forwards `mcpServers` and `allowedTools`. | Reuse unchanged unless typing helper is needed. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/**` | Current Claude coverage | Existing tests assert old `autobyteus_team` send-message path. | Update/replace focused tests. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-13 | Upstream probe review | Prior done-ticket local Codex/Claude Code probes | Codex App Server and Claude Code can consume the server-hosted endpoint, but require runtime-specific config/process ownership. | Implement Codex via thread-scoped config; keep Claude Code CLI for a future runtime ticket. |
| 2026-06-13 | Local package contract check | Workspace lockfile and package type definitions for `@anthropic-ai/claude-agent-sdk@0.2.71` | SDK supports HTTP MCP server config in `mcpServers`; AutoByteus wrapper passes it through. | Claude SDK materializer is feasible without new dependency. |
| 2026-06-13 | Static code trace | Current Claude session/tooling files | Claude already constructs MCP config per query turn and passes allowed tools. | Best insertion point is Claude session/query setup. |
| 2026-06-13 | Static/protocol probe | Current Codex thread/bootstrap files plus generated app-server protocol | Codex currently passes `config: null`, but app-server start/resume support thread-scoped config and the live probe honored `mcp_servers`. | Best insertion point is Codex bootstrap/thread config plus thread manager request payloads. |

## External / Public Source Findings

No new external public source was required for the final current-ticket scope beyond the upstream done-ticket's documented public-source/probe findings. This investigation relied on repository code, archived upstream ticket artifacts, the locally locked Claude Agent SDK package contract, local Codex app-server protocol generation, and a local Codex thread-config MCP probe.

The upstream done-ticket had already recorded official/public source checks for Codex MCP, Claude Code MCP, MCP Streamable HTTP transport, and local client probes. Those findings are inherited as upstream evidence and cited through the archived upstream artifacts rather than re-browsed here.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for design investigation.
- Required config, feature flags, env vars, or accounts: None for design investigation.
- External repos, samples, or artifacts cloned/downloaded for investigation: None. Local package/lockfile inspection only.
- Setup commands that materially affected the investigation: `git fetch origin --prune`.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

1. The central Agent Tools MCP server is complete enough for a runtime materializer: it can create secret descriptors, list `send_message_to`, execute through `SendMessageToDispatcher`, and revoke sessions by run/member owner.
2. Claude Agent SDK has a safe programmatic materializer surface through SDK query `mcpServers`; Codex App Server has a safe thread-scoped materializer surface through `thread/start` / `thread/resume` `config.mcp_servers`.
3. Current Claude send-message support duplicates the newly centralized MCP execution path and uses special event suppression. That special case becomes wrong once the execution path is remote MCP.
4. Current Codex send-message support duplicates the centralized MCP execution path through dynamic tool registration. That dynamic registration must be removed/gated off when Agent Tools MCP is configured.
5. The correct Claude cutover removes `send_message_to` from `autobyteus_team`; that name remains a task-delegation MCP server name only.
6. Event and history names must stay canonical (`send_message_to`) even though provider wire names may be Claude-prefixed or Codex MCP server-qualified.
7. No current code should persist the descriptor in `ClaudeAgentRunContext`, `CodexAgentRunContext`, run history, team metadata, project config, or process launch args. Live runtime/session setup is the correct in-memory ownership point.

## Constraints / Dependencies / Compatibility Facts

- Dedicated worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools`.
- Base/finalization branch context: `origin/codex/streamable-mcp-runtime-tools`.
- Upstream done-ticket artifacts are in this branch under `tickets/done/streamable-mcp-runtime-tools` and are authoritative lineage for materializer design.
- No backward-compatibility fallback should keep `mcp__autobyteus_team__send_message_to` active.
- Existing Claude task-delegation/browser/media/publish-artifacts surfaces must remain unchanged outside the send-message cutover.
- Existing Codex browser/media/task-delegation/publish-artifacts dynamic tools remain runtime-local; only `send_message_to` cuts over to Agent Tools MCP in this ticket.
- Codex Agent Tools MCP config must be passed through app-server thread config, not shared process launch args or trusted project files.

## Open Unknowns / Risks

- The current in-progress ticket folder was empty. The final refined scope is inferred from upstream artifacts plus user clarification: Claude Agent SDK and Codex App Server `send_message_to` materializers are in scope; Claude Code CLI and Antigravity CLI remain out of scope.
- Real Claude SDK HTTP MCP behavior should be validated by API/E2E if feasible, because the SDK's spawned Claude Code transport is outside local unit test control.
- If Claude SDK emits different raw lifecycle chunks for remote MCP than existing tests model, event canonicalization may require small implementation adjustment.
- If a long-running Claude session outlives the default Agent Tools MCP session TTL, the implementation should recreate the descriptor instead of reusing a stale one. Design calls this out; tests can cover the normal creation/no-creation gates first.

## Notes For Architect Reviewer

- This design intentionally expands two upstream-deferred materializers for `send_message_to`: Claude Agent SDK and Codex App Server. It does **not** implement every deferred materializer; Claude Code CLI and Antigravity CLI remain future runtime-specific work.
- The prior done-ticket at `tickets/done/streamable-mcp-runtime-tools` is part of the source package and should be considered upstream context.
- The key architecture decisions to review are the clean cutover from Claude's in-process `autobyteus_team` send-message tool to server-hosted `autobyteus_agent_tools`, and the clean cutover from Codex dynamic `send_message_to` to Codex app-server thread-scoped `mcp_servers.autobyteus_agent_tools`, with no compatibility fallbacks.
- If implementation cannot prove Codex thread-scoped config works in the installed app-server version, route back to solution design rather than using process-wide or file-backed bearer config.

## Design-Impact Rework Investigation (2026-06-13)

### Reroute Context

Implementation/API-E2E routed the package back as `Design Impact` after live Claude executed route-backed `send_message_to` successfully but sender raw memory traces were empty:

```text
Timed out waiting for ping send_message_to memory traces for invocation call_00_zP1JfTrUulPyngiliMzE0120. Observed traces: []
```

The failure occurs after the server-hosted Agent Tools MCP route, shared `SendMessageToDispatcher`, team communication projection, and canonical Claude stream lifecycle all function. The design-impact question is therefore the runtime-memory/run-history trace spine, not whether the route-backed tool call works.

### Additional Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-13 | Spec | `tickets/in-progress/runtime-mcp-agent-tools/design-impact-reroute.md` | Read authoritative implementation reroute | Live Claude delivery and canonical lifecycle worked; `getTeamMemberRunMemoryView` returned no sender raw traces. The attempted member-level memoryDir fallback and broad singleton rebinding were reverted and preserved only as diagnostics. | Requirements/design must name authoritative memory invariant owner. |
| 2026-06-13 | Data | `tickets/in-progress/runtime-mcp-agent-tools/api-e2e-execution-coverage-report.md` | Verify failing boundary | `E2E-CLAUDE-002 / LIVE-CLAUDE-001` failed only when waiting for memory raw traces; earlier route-backed delivery, canonical stream lifecycle, and no-provider-name-leak assertions passed. | Add acceptance for live memory readback after fix. |
| 2026-06-13 | Diff | `tickets/in-progress/runtime-mcp-agent-tools/design-impact-memory-local-fix-attempt.diff` | Inspect rejected local-fix attempt | The attempt derived missing member memoryDir inside `MixedAgentMemberHandle` and keyed several service singletons by current memoryDir. This confirms suspected areas but crosses ownership boundaries as a fallback. | Reject downstream fallback; design service/root lifecycle explicitly if needed. |
| 2026-06-13 | Code | `autobyteus-server-ts/src/agent-memory/services/agent-run-memory-recorder.ts` | Trace raw memory persistence attachment | Recorder attaches to active `AgentRun` only when `AgentRunConfig.memoryDir` is non-empty; missing memoryDir causes a warning and no event subscription. It skips `RuntimeKind.AUTOBYTEUS`. | Ensure non-AutoByteus executable team member runs get memoryDir before `AgentRunManager` registration. |
| 2026-06-13 | Code | `autobyteus-server-ts/src/agent-memory/services/runtime-memory-event-accumulator.ts` and `runtime-memory-event-payload.ts` | Verify event-shape handling | Canonical `TOOL_EXECUTION_STARTED` creates `tool_call`; terminal tool events create `tool_result`; invocation id, tool name, args, result/error are extracted from canonical payload keys. | Keep route-backed path on canonical AgentRun events; no route-side persistence. |
| 2026-06-13 | Code | `autobyteus-server-ts/src/agent-memory/store/run-memory-writer.ts`, `agent-memory-layout.ts`, `agent-memory-location-service.ts` | Verify memory directory layout and path owner | `RunMemoryWriter` writes under the given run `memoryDir`. `AgentMemoryLocationService` already derives standard team member paths and task-agent paths. | Reuse `AgentMemoryLocationService`; do not duplicate path logic in member handles. |
| 2026-06-13 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.ts` | Find standard team member memoryDir owner | Fresh mixed-team runtime identity materialization attaches memberRunId and derives agent member memoryDir via `getTeamAgentRunLocation(...)` before creating `MixedTeamRunContext`. | Treat this factory as the standard team-member invariant owner for fresh contexts. |
| 2026-06-13 | Code | `autobyteus-server-ts/src/agent-team-execution/services/team-run-metadata-mapper.ts` | Find restore memoryDir owner | Restore config reconstruction derives member memoryDir from metadata and `AgentMemoryLocationService`. Metadata itself does not need to persist the absolute memoryDir. | Treat mapper as restore-context memoryDir owner. |
| 2026-06-13 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-team-member-registry.ts` | Find task-agent memoryDir owner | Task-agent config construction derives logical member location and task-agent location using `getTaskAgentLocation(...)` before creating `MixedAgentMemberHandle`. | Treat registry/task-agent activation as task-agent memoryDir owner. |
| 2026-06-13 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts` | Verify downstream handle role | `buildMemberRunConfig()` currently passes `this.options.config.memoryDir ?? null` into `AgentRunConfig`. The handle is a consumer of member config, not the right place to derive team/task memory paths as fallback. | Add fail-fast invariant check here if needed; do not derive fallback here. |
| 2026-06-13 | Code | `autobyteus-server-ts/src/api/graphql/types/memory-view.ts` | Verify readback path | `getTeamMemberRunMemoryView` resolves member location from team metadata under `appConfigProvider.config.getMemoryDir()` and reads raw traces from that team-member directory. | If traces are written to a different root, readback returns empty even when the recorder attached. |
| 2026-06-13 | Code | `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts`, `agent-team-run-manager.ts`, run-history services, `agent-memory-location-service.ts` | Check app-memory-root singleton risk | Several service singletons cache memory-root-derived collaborators; some history catalog state is already keyed by memoryDir, while others are not. Production app roots should be initialized before singleton construction; tests that change app data dirs need reset/injection or explicitly designed root-keyed lifecycle. | If implementation evidence shows stale-root writes/reads, fix at service lifecycle/test bootstrap boundary rather than member fallback. |
| 2026-06-13 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-session-event-converter.ts` and `session/claude-session-tool-use-coordinator.ts` | Recheck Claude event shape after route-backed materializer | Current route-backed implementation normalizes `mcp__autobyteus_agent_tools__send_message_to` to canonical `send_message_to` in application events. Since stream assertions passed, event conversion is alive; empty memory readback points to recorder attachment/root, not route execution. | Keep canonical event path; no old handler fallback. |

### Current Runtime-Memory / Run-History Spine Finding

The canonical persistence spine for a route-backed Claude tool call is:

```text
Claude SDK remote MCP tool_use/tool_result
  -> ClaudeSessionToolUseCoordinator / ClaudeSessionEventConverter
  -> canonical AgentRunEvent TOOL_EXECUTION_STARTED / TOOL_EXECUTION_SUCCEEDED
  -> AgentRun.subscribeToEvents listeners
  -> AgentRunMemoryRecorder attached by AgentRunManager.registerActiveRun
  -> RuntimeMemoryEventAccumulator
  -> RunMemoryWriter(memoryDir from AgentRunConfig)
  -> raw_traces.jsonl under the authoritative member memoryDir
  -> getTeamMemberRunMemoryView resolves the team/member memory directory from app memory root + team metadata
```

The API/E2E observed the earlier nodes through canonical websocket stream events, then saw no raw traces through readback. Because accepted user messages and tool lifecycle traces both go through the same recorder/writer, an entirely empty raw trace list strongly indicates either:

1. `AgentRunMemoryRecorder` never attached because `AgentRunConfig.memoryDir` was missing or blank; or
2. the recorder wrote to a different app memory root than the GraphQL memory readback path; or
3. less likely, the recorder attached and wrote only unsupported events, which is inconsistent with the same run emitting canonical `TOOL_EXECUTION_STARTED` / `TOOL_EXECUTION_SUCCEEDED` stream events and with the accumulator's current extraction logic.

### Ownership Conclusion

- Standard mixed-team member memoryDir invariant owner: `MixedTeamRunBackendFactory` for fresh runtime contexts, using `AgentMemoryLocationService.getTeamAgentRunLocation(...)` after member run ids are assigned.
- Restore memoryDir invariant owner: `TeamRunMetadataMapper.memberMetadataToRunConfig(...)`, using persisted metadata plus `AgentMemoryLocationService.getTeamAgentRunLocation(...)`.
- Task-agent memoryDir invariant owner: `MixedTeamMemberRegistry.buildTaskAgentRunConfig(...)`, using `AgentMemoryLocationService.getTaskAgentLocation(...)`.
- Consumer/assertion boundary: `MixedAgentMemberHandle.buildMemberRunConfig()`. It may reject invalid executable configs before constructing `AgentRunConfig`, but it must not derive a fallback memoryDir.
- Persistence owner: `AgentRunMemoryRecorder` and `RuntimeMemoryEventAccumulator`. They persist from canonical AgentRun events only and must not become memory-location owners.
- Transport/execution owner: Agent Tools MCP route/dispatcher/executor and `SendMessageToDispatcher`. They must not write raw traces directly.

### Rejected Diagnostic Fix Shape

The diagnostic diff is useful evidence but not accepted design. The rejected shape was:

```text
MixedAgentMemberHandle sees missing config.memoryDir
  -> derive a memoryDir from team context / task-agent context
  -> continue creating AgentRunConfig
```

That shape hides an upstream invariant violation at the last consumer before AgentRun creation. The accepted shape is:

```text
Team run launch/restore/task-agent activation establishes memoryDir
  -> MixedAgentMemberHandle asserts/consumes memoryDir
  -> AgentRunManager registers run
  -> AgentRunMemoryRecorder attaches and persists canonical events
```

If stale app-memory-root state is the true failure, the accepted shape is also not a member fallback. The fix must align memory-root service lifecycle/read-write ownership, for example by using explicit memoryDir injection/reset in the E2E bootstrap or by designing memoryDir-keyed singleton behavior for the affected service boundary.

### Updated Design Health Assessment Evidence

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Live API/E2E reroute | Route-backed delivery and canonical lifecycle succeeded; raw memory readback was empty. | The route/materializer path is alive; the missing invariant is runtime-memory/run-history read/write attachment/root. | Revise design and route through architecture review. |
| `AgentRunMemoryRecorder` | Missing `memoryDir` prevents recorder subscription. | Executable team-member `AgentRunConfig.memoryDir` must be non-null before `AgentRunManager.createAgentRun`. | Add invariant tests/fail-fast guard. |
| `MixedTeamRunBackendFactory` / `TeamRunMetadataMapper` / `MixedTeamMemberRegistry` | Existing code already has natural owners for standard fresh, restore, and task-agent memoryDir derivation. | Do not derive fallback in `MixedAgentMemberHandle`; strengthen upstream owners and tests. | Implementation should prove each path. |
| GraphQL memory readback | Reads by app memory root + team metadata, independent from any stale cached writer root. | Empty readback can also be stale root mismatch, not only missing memoryDir. | If reproduced, fix service lifecycle/test bootstrap explicitly. |

## Notes For Architecture Reviewer — Design-Impact Rework

- The revised design keeps the Claude Agent Tools MCP materializer in scope but adds the memory/run-history trace spine needed for `REQ-RMCP-007` to be verifiable.
- The design rejects both old `mcp__autobyteus_team__send_message_to` fallback and downstream `MixedAgentMemberHandle` memoryDir fallback.
- The architecture review should focus on whether the named invariant owners are correct: `MixedTeamRunBackendFactory` for fresh standard members, `TeamRunMetadataMapper` for restore, `MixedTeamMemberRegistry` for task agents, `MixedAgentMemberHandle` as assertion/consumer, and `AgentRunMemoryRecorder` as canonical-event persistence subscriber.

## Branch Comparison: Why `origin/personal` Memory Worked But New Route-Backed `send_message_to` Failed

The relevant memory and mixed-team infrastructure is effectively unchanged between `origin/personal` and the base branch for this ticket. Static comparison showed only Agent Tools MCP cleanup additions in `AgentRunManager` / `MixedAgentMemberHandle`; `AgentRunMemoryRecorder`, `RuntimeMemoryEventAccumulator`, `MixedTeamRunBackendFactory`, `TeamRunService`, `TeamRunMetadataMapper`, and `getTeamMemberRunMemoryView` have the same essential behavior. Therefore the failure is not explained by a newly rewritten memory subsystem.

The behavioral difference is the Claude `send_message_to` execution/event source.

### `origin/personal` / old Claude path

`origin/personal` used the Claude in-process `autobyteus_team` MCP server and `ClaudeSendMessageToolCallHandler`:

```text
Claude SDK tool call mcp__autobyteus_team__send_message_to
  -> in-process ClaudeSendMessageToolCallHandler.handle(...)
  -> handler emits ITEM_ADDED + ITEM_COMMAND_EXECUTION_STARTED itself with tool_name send_message_to
  -> handler calls SendMessageToDispatcher directly
  -> handler emits ITEM_COMMAND_EXECUTION_COMPLETED + ITEM_COMPLETED itself with canonical result object
  -> ClaudeSessionEventConverter converts those synthetic canonical events
  -> AgentRunMemoryRecorder writes raw traces
```

Important old-path details:

- The old handler emitted the canonical lifecycle inside the backend before/after dispatch; memory did not rely on the external MCP route or on Claude's remote-MCP result shape.
- `ClaudeSessionEventConverter` and `ClaudeSessionToolUseCoordinator` intentionally suppressed raw `mcp__autobyteus_team__send_message_to` provider events because the handler already emitted canonical `send_message_to` events.
- The old handler's tool result shape was an application object such as `{ accepted: true, code, message }`, so old memory assertions expecting `toolResult.accepted === true` matched that old path.

### New route-backed path

The new materializer removes the old handler and exposes a server-hosted HTTP MCP server:

```text
Claude SDK remote MCP call mcp__autobyteus_agent_tools__send_message_to
  -> POST /mcp/agent-tools/:sessionId tools/call
  -> Agent Tools MCP route/dispatcher/executor
  -> SendMessageToDispatcher
  -> MCP result content array returned to Claude
  -> Claude SDK emits observed tool_use/tool_result chunks
  -> generic ClaudeSessionToolUseCoordinator / ClaudeSessionEventConverter emit canonical AgentRun events
  -> AgentRunMemoryRecorder should write raw traces if attached with the correct memoryDir/root
```

New-path consequences:

- The Agent Tools MCP route is transport/execution only; it does not and should not write raw memory traces directly.
- Memory now depends on the generic Claude tool lifecycle event path plus the existing recorder attachment/root invariant.
- The route-backed result shape is MCP content, not the old handler's `{ accepted: true }` object. The live E2E stream assertion was updated for this shape; the memory trace assertion also needs to preserve/expect the route-backed result shape once traces exist.

### Current best answer to the user's question

`origin/personal` worked because the old Claude-specific handler manually emitted canonical lifecycle events in-process and returned the old application-result object. The new route-backed `send_message_to` removed that implicit local event/persistence shortcut and now relies on the normal canonical AgentRun event spine plus an already-correct `AgentRunConfig.memoryDir` and app-memory-root consistency.

The live route-backed test proved the route and canonical stream event conversion were alive. Since memory readback returned an entirely empty raw trace list, the failure is best explained by one of these invariant breaks, in this order of likelihood:

1. `AgentRunMemoryRecorder` was not attached to the sender run because that `AgentRunConfig.memoryDir` was missing/blank when `AgentRunManager` registered the run; or
2. the recorder wrote using a stale/cached memory root while `getTeamMemberRunMemoryView` read from the current `appConfigProvider.config.getMemoryDir()` root; or
3. stale coverage remains in the memory assertion result shape after traces are restored (`toolResult` should preserve the new MCP content result, not the old `{ accepted: true }` object).

The old path masked this because it made `send_message_to` lifecycle emission a Claude-handler responsibility. The new path is architecturally cleaner, but it exposes the missing explicit invariant: every executable non-AutoByteus team member run must have a concrete durable memoryDir before it starts, and all run-history/memory read/write services in the test/app process must agree on the same app memory root.

## Requirement-Gap Rework Investigation: All Active Runtime Communication E2E (2026-06-13)

### Trigger

`api_e2e_engineer` rerouted a Requirement Gap after the user challenged Claude-only live validation. The gap artifact is `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/api-e2e-runtime-communication-scope-gap.md`.

User intent recorded by API/E2E: all active runtime agent communications should be E2E tested, not only Claude Agent SDK, otherwise the product cannot claim communication works across runtimes.

### Active Runtime Inventory

Source: `autobyteus-server-ts/src/runtime-management/runtime-kind-enum.ts`.

Active runtime kinds in this server branch:

- `RuntimeKind.AUTOBYTEUS` (`autobyteus`): native AutoByteus runtime, exposes `send_message_to` through `AutoByteusSendMessageToTool`.
- `RuntimeKind.CODEX_APP_SERVER` (`codex_app_server`): Codex App Server runtime; current code exposes `send_message_to` through Codex dynamic tool registration, but corrected target scope exposes it through Codex app-server Agent Tools MCP thread config.
- `RuntimeKind.CLAUDE_AGENT_SDK` (`claude_agent_sdk`): Claude Agent SDK runtime, changed by this ticket to expose `send_message_to` through route-backed `autobyteus_agent_tools` MCP.

Antigravity CLI and Claude Code CLI materializers are not runtime backends in this branch and remain outside this all-active-runtime matrix.

### Runtime Entry Points Into Common Communication Spine

Sources inspected:

- `autobyteus-server-ts/src/agent-tools/agent-communication/send-message-to.ts`
- `autobyteus-server-ts/src/agent-execution/backends/codex/agent-communication/codex-send-message-dynamic-tool-registration.ts`
- `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-tool-executor.ts`
- `autobyteus-server-ts/src/agent-communication/services/send-message-to-dispatcher.ts`
- `autobyteus-server-ts/src/agent-team-execution/backends/mixed/delivery/team-member-delivery-coordinator.ts`
- `autobyteus-server-ts/src/agent-team-execution/backends/mixed/delivery/team-message-recipient-resolver.ts`
- `autobyteus-server-ts/src/agent-team-execution/services/inter-agent-message-runtime-builders.ts`

Current convergence spine:

```text
AutoByteus native BaseTool OR Codex Agent Tools MCP OR Claude Agent Tools MCP
  -> SendMessageToDispatcher.dispatch(...)
  -> parse/validate exactly one selector
  -> recipient_name: memberTeamContext.deliverInterAgentMessage(...)
  -> MixedTeamManager / TeamMemberDeliveryCoordinator
  -> TeamMessageRecipientResolver
  -> MixedTeamMemberRegistry / target member handle
  -> buildInterAgentDeliveryInputMessage(...)
  -> recipient AgentRun.postUserMessage(...)
```

`target_agent_run_id` direct delivery uses `GlobalAgentRunMessageRouter` and `AgentRunManager.getActiveRun(...)`; that path is shared with the same runtime adapters but is not the primary teammate roster matrix.

### Existing Durable E2E Coverage Inventory Against Runtime Matrix

Files inspected:

- `autobyteus-server-ts/tests/e2e/runtime/autobyteus-team-runtime-graphql.e2e.test.ts`
- `autobyteus-server-ts/tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts`
- `autobyteus-server-ts/tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts`
- `autobyteus-server-ts/tests/e2e/runtime/mixed-team-runtime-graphql.e2e.test.ts`
- `autobyteus-server-ts/tests/e2e/runtime/nested-mixed-team-runtime-graphql.e2e.test.ts`
- `autobyteus-server-ts/tests/e2e/runtime/codex-standalone-send-message-global-routing.e2e.test.ts`

Observed coverage:

| Directed runtime pair | Existing durable evidence | Gap decision |
| --- | --- | --- |
| AutoByteus -> AutoByteus | `autobyteus-team-runtime-graphql.e2e.test.ts` routes `send_message_to` between real AutoByteus team members | Still valid; include in required matrix execution/inventory. |
| Codex -> Codex | `codex-team-inter-agent-roundtrip.e2e.test.ts` covers Codex team send-message roundtrip | Still valid; include in required matrix execution/inventory. |
| Claude -> Claude | `claude-team-inter-agent-roundtrip.e2e.test.ts` covers live route-backed Claude ping/pong send-message | Still valid and changed by this ticket; include in required matrix execution/inventory. |
| AutoByteus -> Codex | `mixed-team-runtime-graphql.e2e.test.ts` covers AutoByteus/Codex mixed runtime communication in one direction | Still valid; include in required matrix execution/inventory. |
| Codex -> AutoByteus | `mixed-team-runtime-graphql.e2e.test.ts` covers AutoByteus/Codex mixed runtime communication in the opposite direction | Still valid; include in required matrix execution/inventory. |
| Codex -> Claude | `nested-mixed-team-runtime-graphql.e2e.test.ts` covers a Codex child coordinator sending to a Claude child teammate | Still valid as partial all-runtime evidence, but it is nested and does not prove all six top-level mixed-runtime directed pairs. |
| AutoByteus -> Claude | No focused top-level directed pair found | Needs new or updated durable E2E matrix coverage. |
| Claude -> AutoByteus | No focused top-level directed pair found | Needs new or updated durable E2E matrix coverage. |
| Claude -> Codex | No focused top-level directed pair found | Needs new or updated durable E2E matrix coverage. |

### Design Decision

Accept the user's expanded acceptance bar in this ticket and the later Codex unified-solution correction. The production code scope is now Claude Agent SDK materializer, Codex App Server Agent Tools MCP materializer, and the memory invariant. API/E2E acceptance still requires all active runtime `send_message_to` communication evidence before delivery.

Codex must be re-scoped into Agent Tools MCP materialization for `send_message_to`; the safe implementation path is thread-scoped `thread/start` / `thread/resume` config. Codex must not use process-wide `-c` overrides on the shared cwd-keyed client manager, trusted project `.codex/config.toml`, or a dynamic `send_message_to` fallback after cutover. AutoByteus remains local-tool based; Claude uses the route-backed Agent Tools MCP path.

### Revised Matrix Requirement

API/E2E must inventory and execute or update durable coverage for this directed teammate communication matrix before delivery, subject to existing live-test environment gates:

```text
AutoByteus -> AutoByteus
Codex      -> Codex
Claude     -> Claude
AutoByteus -> Codex
Codex      -> AutoByteus
AutoByteus -> Claude
Claude     -> AutoByteus
Codex      -> Claude
Claude     -> Codex
```

Each executed row should assert at minimum:

- sender runtime actually executes `send_message_to` through its runtime entry adapter;
- application-facing lifecycle uses canonical `send_message_to` where that runtime emits tool lifecycle;
- recipient team communication projection is emitted with correct sender/recipient/content;
- recipient runtime accepts the inter-agent input and reaches a terminal/idle/assistant-output state appropriate for that runtime;
- provider-specific old Claude wire names and secret Agent Tools MCP descriptors do not leak in application-facing events;
- memory/raw-trace behavior is asserted where the sender runtime is recordable and the existing product contract expects raw traces.


## Codex MCP Materializer Correction Investigation (2026-06-13)

### Trigger

The user challenged the design because the existing `design-spec.md` left Codex App Server on dynamic `send_message_to` even though the earlier streamable-MCP ticket investigated Codex MCP support and the project goal is a unified Agent Tools MCP solution.

### Findings

- Prior upstream investigation already proved Codex supports Streamable HTTP MCP config through normal Codex `mcp_servers.*` config and that `codex app-server --stdio -c 'mcp_servers.autobyteus_agent_tools.url=...' -c 'mcp_servers.autobyteus_agent_tools.http_headers={Authorization="Bearer ..."}'` initialized the dummy Agent Tools MCP server and called tools.
- The unsafe part of that prior probe is not Codex MCP itself; it is applying a run/member bearer descriptor to the shared cwd-keyed app-server process via launch args or a trusted project file.
- Current app-server protocol generation (`codex app-server generate-ts --out /tmp/codex-app-server-proto`) shows `ThreadStartParams` and `ThreadResumeParams` both accept `config?: { [key: string]?: JsonValue } | null`.
- A refreshed local probe at `/tmp/autobyteus-agent-tools-mcp-thread-config-probe-20260613-133706/result.json` passed `config.mcp_servers.autobyteus_agent_tools` directly in `thread/start`; Codex app-server reported the MCP server in `mcpServerStatus/list`, listed `dummy_ping` and `send_message_to`, and `mcpServer/tool/call` returned `{ content: [{ type: "text", text: "pong:thread-config" }], isError: false }`.
- Current AutoByteus Codex runtime code (`codex-thread-manager.ts`) still sends `config: null` on both `thread/start` and `thread/resume`; `codex-thread-config.ts` has only `dynamicTools`; bootstrap strategies still build `buildSendMessageToDynamicToolRegistrations(...)`.

### Design Consequence

The earlier Claude-only design is incomplete. Codex App Server must be added to the same Agent Tools MCP `send_message_to` spine using a Codex-backend-local materializer:

```text
CodexThreadBootstrapper
  -> resolveConfiguredAgentToolExposure(...)
  -> if send_message_to configured:
       AgentToolMcpSessionService.createAgentToolMcpSession({ owner, sender, configuredExposure, runtimeKind })
       Codex materializer builds config.mcp_servers.autobyteus_agent_tools
       Codex dynamic tool registrations exclude send_message_to
  -> CodexThreadManager.thread/start or thread/resume passes config object
  -> Codex app-server MCP client calls /mcp/agent-tools/:sessionId
  -> Agent Tools MCP route/executor
  -> SendMessageToDispatcher
```

The authoritative forbidden shapes are process-wide launch `-c` bearer config on the cwd-keyed app-server process, trusted project `.codex/config.toml` bearer writes, durable descriptor persistence, and a dynamic `send_message_to` fallback after MCP cutover.
