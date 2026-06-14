# Design Spec

## Status

Refined after API/E2E requirement-gap reroute and Codex MCP materializer scope correction on 2026-06-13; expanded acceptance coverage requires all-active-runtime `send_message_to` E2E evidence before delivery.

This design is a follow-up to the completed `streamable-mcp-runtime-tools` ticket archived at `tickets/done/streamable-mcp-runtime-tools`. The base branch already delivered the runtime-neutral Agent Tools MCP Server. This ticket implements two active external-runtime `send_message_to` materializers: Claude Agent SDK programmatic consumption of `autobyteus_agent_tools`, and Codex App Server thread-scoped `mcp_servers.autobyteus_agent_tools` consumption. AutoByteus native remains an in-process local tool adapter.

## Requirements / Investigation Basis

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/investigation-notes.md`
- Upstream done-ticket investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/done/streamable-mcp-runtime-tools/investigation-notes.md`
- Upstream done-ticket design: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/done/streamable-mcp-runtime-tools/design-spec.md`
- Upstream done-ticket implementation handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/done/streamable-mcp-runtime-tools/implementation-handoff.md`

## Problem Summary

The base branch introduced an AutoByteus-hosted Streamable HTTP MCP server named `autobyteus_agent_tools`, with `send_message_to` v1 support and a canonical `AgentToolMcpDescriptor`. However, no production runtime uses it yet. Claude Agent SDK still exposes `send_message_to` through a Claude-specific in-process `autobyteus_team` MCP tool and handler, and Codex App Server still exposes `send_message_to` through dynamic tool registration.

Both duplicate external-runtime paths should be removed for `send_message_to`. When a Claude run has `send_message_to` configured, Claude SDK should receive the server-hosted Agent Tools MCP descriptor as an HTTP MCP server config and call `send_message_to` through `/mcp/agent-tools/:sessionId`. When a Codex App Server run has `send_message_to` configured, the Codex thread should receive a thread-scoped `config.mcp_servers.autobyteus_agent_tools` object derived from the same descriptor and call the same endpoint. `autobyteus_team` remains only for Claude task-delegation tools, and Codex dynamic tools remain only for non-`send_message_to` tool families.

The API/E2E requirement-gap reroute expands the validation bar: delivery must prove that every active runtime communication entry still works end-to-end after the Claude and Codex cutovers. AutoByteus native, Codex App Server, Claude Agent SDK, and all supported directed mixed-runtime teammate pairs must be covered by durable API/E2E inventory and execution evidence.

## Task Design Health Assessment (Mandatory)

- Change posture: Feature plus targeted refactor plus expanded API/E2E validation scope.
- Current design issue found: Yes.
- Root cause classification: Duplicated Policy Or Coordination; Boundary Or Ownership Issue; Legacy Or Compatibility Pressure; Missing Invariant exposed by runtime-memory/run-history trace persistence after the route-backed send-message cutover.
- Refactor needed now: Yes for the Claude materializer, Codex materializer, and memory invariant. The all-active-runtime matrix is also a validation/coverage expansion; non-Claude/non-Codex production code should change only if the matrix exposes a product defect.
- Evidence: Upstream established `AgentToolMcpSessionService` and `AgentToolMcpToolExecutor -> SendMessageToDispatcher` as the server-owned MCP execution boundary. Claude still owns a second `send_message_to` handler and special event suppression; Codex still owns a dynamic `send_message_to` handler. Keeping either external-runtime duplicate active would preserve two execution projections for one configured server-owned tool.
- Design response: Add backend-local Claude and Codex Agent Tools MCP materializers, create live Agent Tools MCP descriptors when configured, merge Claude into SDK query options, pass Codex through thread-scoped app-server config, remove the old Claude-specific handler/definition path, remove/gate Codex dynamic `send_message_to`, preserve memory persistence through canonical AgentRun events under an authoritative member memoryDir, and require an all-active-runtime communication E2E matrix before delivery.

## Scope

### In Scope

1. Claude Agent SDK materialization of `AgentToolMcpDescriptor` into SDK `mcpServers` config.
2. Claude session setup that creates/uses an Agent Tools MCP session when `send_message_to` is configured.
3. Allowed-tool cutover from old `mcp__autobyteus_team__send_message_to` to `mcp__autobyteus_agent_tools__send_message_to`.
4. Removal of old Claude in-process `send_message_to` handler/definition and tests.
5. Codex App Server materialization of `AgentToolMcpDescriptor` into thread-scoped app-server `config.mcp_servers.autobyteus_agent_tools`.
6. Codex thread setup that creates/uses an Agent Tools MCP session when `send_message_to` is configured and removes/gates dynamic `send_message_to`.
7. Event/tool-name normalization so application events remain canonical `send_message_to` for Claude and Codex MCP tool calls.
8. Runtime-memory/run-history trace preservation for route-backed `send_message_to`: canonical AgentRun events persist raw traces under the authoritative member memory directory.
9. All-active-runtime `send_message_to` E2E coverage inventory and execution plan for AutoByteus, Codex App Server, Claude Agent SDK, and supported directed mixed-runtime teammate pairs.
10. Focused tests and build validation.

### Out of Scope

1. Antigravity CLI or Claude Code CLI runtime/materializers.
2. Browser/media/task-delegation/publish-artifacts exposure through Agent Tools MCP Server.
3. Persisted MCP sessions or durable bearer-token files.
4. Codex process-level `--config`/`-c` bearer injection on the shared cwd-keyed app-server process, trusted project `.codex/config.toml` bearer writes, or any durable Codex bearer config file.
5. Compatibility fallback for `mcp__autobyteus_team__send_message_to` or Codex dynamic `send_message_to`.
6. Agent Tools MCP route-side raw-trace persistence; memory must stay attached to canonical AgentRun events.
7. Downstream member-handle memoryDir fallback; missing memoryDir is an upstream executable-run invariant failure.
8. Deferring active-runtime communication E2E for AutoByteus, Codex, Claude, or supported mixed-runtime pairs to a follow-up ticket.

## Legacy Removal Policy (Mandatory)

- Policy: no backward compatibility; remove replaced paths.
- Remove the old Claude-specific send-message in-process MCP handler and definition files after the new materializer is wired.
- Remove old tests that assert `autobyteus_team` contains `send_message_to`; replace them with tests asserting `autobyteus_agent_tools` contains the descriptor-based HTTP server config.
- Do not keep `mcp__autobyteus_team__send_message_to` in allowed tools as a fallback.
- Do not add a second route, alias, generic runtime-tools name, or materializer that hand-builds session URLs/tokens.
- Do not make the Agent Tools MCP route, dispatcher, or executor write memory raw traces directly.
- Do not hide missing team-member `memoryDir` by deriving fallback paths inside `MixedAgentMemberHandle`; enforce the invariant at the creation/restore owner and assert at the consuming boundary.
- All runtime communication validation must preserve the corrected runtime entry ownership: AutoByteus local tool, Codex Agent Tools MCP through thread-scoped config, and Claude Agent Tools MCP through SDK config. Do not turn this into a generic all-runtime materializer or reintroduce dynamic/in-process fallbacks.

## Data-Flow Spine Inventory

### DS-RMCP-001 — Claude Runtime Session Materializes Agent Tools MCP

Primary production spine for standalone runs:

```text
GraphQL / application create agent run
  -> AgentRunService / AgentRunProvisioningService
  -> AgentRunManager.createAgentRun
  -> ClaudeAgentRunBackendFactory.createBackend / restoreBackend
  -> ClaudeSessionBootstrapper resolves agent definition, configured tools, skills, workspace
  -> ClaudeSessionManager creates/restores ClaudeSession
  -> ClaudeSession.sendTurn / executeTurn
  -> resolveClaudeSessionToolingOptions(configuredToolExposure)
  -> if send_message_to configured:
       ClaudeSession.ensureAgentToolsMcpDescriptor()
         -> AgentToolMcpSessionService.createAgentToolMcpSession({ owner, sender, configuredExposure, runtimeKind })
         -> secret descriptor stored only in live ClaudeSession private memory
  -> Claude Agent Tools MCP materializer maps descriptor to SDK HTTP MCP config
  -> buildClaudeSessionMcpServerConfig merges server maps
  -> ClaudeSdkClient.startQueryTurn({ mcpServers, allowedTools, canUseTool/autoExecuteTools })
```

Team-member variant enters the same Claude backend after `MixedAgentMemberHandle.ensureReady` creates the `MemberTeamContext` and member `AgentRunConfig`:

```text
MixedAgentMemberHandle.ensureReady
  -> build MemberTeamContext + member run config
  -> AgentRunManager.createAgentRun(memberRunConfig, memberRunId)
  -> ClaudeAgentRunBackendFactory
  -> same ClaudeSession flow above
```

Design notes:

- The MCP descriptor is runtime-only secret data. It must not be added to `ClaudeAgentRunContext`, `AgentRunContext`, run history, team events, or logs.
- The live `ClaudeSession` may memoize the descriptor/session metadata to avoid creating one per tool call. On restored backend/new process, no memoized descriptor exists, so a fresh session is created on the next configured turn.
- If implementation can cheaply detect expiration through the returned `session.expiresAt`, it should recreate before passing stale config. If not, stale descriptor failures still go through the route/session denial behavior; downstream tests can refine this if needed.

### DS-RMCP-002 — Claude Remote MCP Tool Call Executes Through Server-Owned Path

```text
Claude SDK / spawned Claude MCP client
  -> POST /mcp/agent-tools/:sessionId tools/call send_message_to with bearer header
  -> Agent Tools MCP route gate validates Origin/auth/session/protocol/content
  -> AgentToolsMcpMethodDispatcher validates JSON-RPC method/params
  -> AgentToolMcpCatalog confirms send_message_to is enabled for the session
  -> AgentToolMcpToolExecutor.executeAgentToolMcpCall
  -> SendMessageToDispatcher.dispatch(rawArguments, session.sender)
  -> direct target_agent_run_id or member recipient_name delivery
  -> AgentToolsMcpResultMapper returns MCP tool result
  -> Claude SDK emits raw tool_use/tool_result lifecycle chunks
  -> ClaudeSessionToolUseCoordinator / ClaudeSessionEventConverter emit canonical application events
```

The route/executor path is already implemented by the base branch and must remain the only Claude send-message execution path after this cutover.

### DS-RMCP-003 — MCP Server Map Merge

```text
Agent Tools descriptor (only when send_message_to configured)
  -> materializeClaudeAgentToolsMcpServers(descriptor)
     returns { autobyteus_agent_tools: { type: "http", url: descriptor.serverUrl, headers: descriptor.headers } }

Task delegation configured for team member
  -> buildClaudeTeamMcpServers(...task tools only...)
     returns { autobyteus_team: <SDK-created in-process server> }

Browser/media/publish artifacts configured
  -> existing builders return their current server maps

mergeMcpServerMaps(agentTools, team, browser, media, publishArtifacts)
  -> duplicate server names still throw CLAUDE_MCP_SERVER_NAME_CONFLICT
```

`sendMessageToToolingEnabled` must no longer be a reason to build `autobyteus_team`.

### DS-RMCP-004 — Allowed Tools And Tool Name Normalization

Provider wire name after cutover:

```text
mcp__autobyteus_agent_tools__send_message_to
```

Application-facing name:

```text
send_message_to
```

Rules:

- `resolveClaudeSessionToolingOptions` adds `mcp__autobyteus_agent_tools__send_message_to` when `send_message_to` is configured.
- It does not add `mcp__autobyteus_team__send_message_to`.
- The old in-process handler is removed, so there is no handler-emitted canonical lifecycle to deduplicate.
- The tool-use coordinator and event converter normalize the new prefixed name to `send_message_to` when emitting application events and metadata.
- The new prefixed name must not be filtered as duplicate noise.

### DS-RMCP-005 — Session Lifetime, Cleanup, And Secret Handling

```text
AgentToolMcpSessionService.createAgentToolMcpSession
  -> returns { session, descriptor, redactedDescriptor }
  -> ClaudeSession stores only descriptor/session metadata in private memory
  -> Claude query uses descriptor in mcpServers options
  -> run/member cleanup later calls existing owner revoke hooks
```

Rules:

- Store token hash only in registry; existing service already owns this.
- Do not log or emit raw descriptor, raw bearer header, or full `mcpServers` config.
- Do not write descriptor to `.mcp.json`, `.claude/`, `.codex/config.toml`, `.agents/mcp_config.json`, or ticket artifacts.
- Existing owner cleanup (`AgentRunManager.unregisterActiveRun`, `MixedAgentMemberHandle.dispose`) remains the mandatory revoke path.
- If the live `ClaudeSession` is closed, clearing the private descriptor reference is sufficient; owner-based revocation handles registry state.

### DS-RMCP-006 — Codex App Server Materializes Agent Tools MCP Through Thread-Scoped Config

Primary production spine for standalone Codex runs:

```text
GraphQL / application create agent run
  -> AgentRunService / AgentRunProvisioningService
  -> AgentRunManager.createAgentRun
  -> CodexAgentRunBackendFactory.createBackend / restoreBackend
  -> CodexThreadBootstrapper resolves agent definition, configured tools, skills, workspace
  -> Codex bootstrap strategy builds base/developer instructions and non-send-message dynamic tools
  -> if send_message_to configured:
       CodexAgentToolsMcpSessionFactory / inline owner builds owner + sender context
       AgentToolMcpSessionService.createAgentToolMcpSession({ owner, sender, configuredExposure, runtimeKind })
       Codex Agent Tools MCP materializer maps descriptor to app-server thread config
  -> buildCodexThreadConfig stores or receives a runtime-only Agent Tools MCP config payload
  -> CodexThreadManager.startRemoteThread / resumeRemoteThread sends:
       config: { mcp_servers: { autobyteus_agent_tools: { url, http_headers, enabled_tools, startup_timeout_sec } } }
       dynamicTools: configured dynamic tool specs excluding send_message_to
  -> Codex app-server initializes autobyteus_agent_tools for that thread
```

Team-member variant enters the same Codex backend after `MixedAgentMemberHandle.ensureReady` creates the `MemberTeamContext` and member `AgentRunConfig`:

```text
MixedAgentMemberHandle.ensureReady
  -> build MemberTeamContext + member run config
  -> AgentRunManager.createAgentRun(memberRunConfig, memberRunId)
  -> CodexAgentRunBackendFactory
  -> same CodexThreadBootstrapper / CodexThreadManager flow above
```

Materialized Codex config shape:

```ts
{
  mcp_servers: {
    autobyteus_agent_tools: {
      url: descriptor.serverUrl,
      http_headers: descriptor.headers,
      enabled_tools: descriptor.enabledTools,
      startup_timeout_sec: 5,
    },
  },
}
```

Rules:

- Use the app-server `thread/start` / `thread/resume` `config` field. The local protocol generation and probe prove this field exists and can initialize `mcp_servers` without process-level launch config.
- Do not use `codex app-server -c mcp_servers...` in production for run/member bearer descriptors, because AutoByteus reuses app-server processes by normalized `cwd`.
- Do not write `.codex/config.toml`, trusted project config, `CODEX_APP_SERVER_ARGS`, or any durable bearer-token file for the descriptor.
- Do not keep Codex dynamic `send_message_to` as fallback after MCP cutover. Dynamic Codex tools for browser/media/task-delegation/publish-artifacts may remain configuration-gated through the existing dynamic tool path.
- The raw descriptor/config is runtime-only secret data. It must not be added to run history, team metadata, logs, project config, or user-visible events. If `CodexAgentRunContext` is serialized anywhere downstream, do not store raw bearer config there; pass it as a transient thread-start/resume input or ensure the field is non-serialized and never emitted.
- On restore/new process, create a fresh Agent Tools MCP session and thread config rather than trying to reuse a persisted descriptor.
- If implementation proves the installed Codex app-server version cannot honor thread-scoped `config.mcp_servers`, route back to solution design before using process-wide launch args, project config, or dynamic fallback.

### DS-RMCP-007 — Codex Remote MCP Tool Call Executes Through Server-Owned Path

```text
Codex app-server / Codex MCP client
  -> POST /mcp/agent-tools/:sessionId tools/call send_message_to with bearer header
  -> Agent Tools MCP route gate validates Origin/auth/session/protocol/content
  -> AgentToolsMcpMethodDispatcher validates JSON-RPC method/params
  -> AgentToolMcpCatalog confirms send_message_to is enabled for the session
  -> AgentToolMcpToolExecutor.executeAgentToolMcpCall
  -> SendMessageToDispatcher.dispatch(rawArguments, session.sender)
  -> direct target_agent_run_id or member recipient_name delivery
  -> AgentToolsMcpResultMapper returns MCP tool result
  -> Codex app-server emits MCP tool-call item/lifecycle events
  -> Codex item/event/history converters emit canonical application events/history
```

Rules:

- Application-facing tool name is `send_message_to`, not a Codex server-qualified/provider-qualified name.
- Codex event/history conversion must preserve invocation correlation, arguments, result/error, and no secret descriptor/header/session data.
- The route/executor path remains the only Codex `send_message_to` execution path after cutover; Codex dynamic tool handlers must not dispatch `send_message_to`.

### DS-RMCP-008 — Non-Target Runtime Deferrals

- AutoByteus native remains a local in-process tool wrapper. It already lives in the server process and converges on `SendMessageToDispatcher`; it does not need to become an HTTP MCP client in this ticket.
- Claude Code CLI and Antigravity CLI do not have runtime backends here. Do not add orphan materializer files without runtime owners.
- Browser/media/task-delegation/publish-artifacts remain on their existing runtime-specific exposure surfaces for this ticket:
  - Codex exposes them through the app-server `dynamicTools` mechanism built from the existing dynamic registration builders.
  - Claude exposes them through the existing SDK-created local MCP server builders (`autobyteus_browser`, `autobyteus_image_audio`, `autobyteus_team`, and `autobyteus_published_artifacts`), not through the new route-backed `autobyteus_agent_tools` HTTP MCP server.
  Do not expose these non-target tools through `autobyteus_agent_tools` until the Agent Tools MCP catalog has explicit adapters for them.


### DS-RMCP-009 — Route-Backed Tool Lifecycle Persists Through Canonical AgentRun Memory Spine

Return/event spine for live route-backed Claude and Codex `send_message_to` results becoming durable memory:

```text
Claude SDK observed tool_use/tool_result chunks OR Codex app-server MCP tool-call items
  -> ClaudeSessionToolUseCoordinator / Codex item-event converter emits runtime lifecycle
  -> ClaudeSessionEventConverter / Codex event converter normalizes provider/server-qualified names to send_message_to
  -> AgentRun emits canonical TOOL_EXECUTION_STARTED / TOOL_EXECUTION_SUCCEEDED
  -> AgentRunManager-attached AgentRunMemoryRecorder receives the event
  -> RuntimeMemoryEventAccumulator derives tool_call / tool_result raw-trace records
  -> RunMemoryWriter appends raw_traces.jsonl under AgentRunConfig.memoryDir
  -> getTeamMemberRunMemoryView resolves the team-member location from app memory root + team metadata and reads the trace
```

Rules:

- Governing owners: `AgentRunManager` owns active-run sidecar attachment; `AgentRunMemoryRecorder` / `RuntimeMemoryEventAccumulator` own canonical-event-to-raw-trace persistence.
- Agent Tools MCP route/dispatcher/executor must not write raw traces, attach memory recorders, or know file-system memory locations.
- A missing `AgentRunConfig.memoryDir` is not fixed at the route, executor, or member-handle level. For active recordable team-member runs it is an upstream invariant failure.
- Raw memory traces preserve the route-backed MCP result shape that Claude/Codex received, including MCP content arrays. They must not coerce the result back into the old in-process handler or Codex dynamic-tool result shape.
- If write/read paths disagree because an app memory root is stale, the fix belongs to service lifecycle/test bootstrap ownership, not to per-member fallback path derivation.

### DS-RMCP-010 — Executable Team-Member MemoryDir Invariant

Primary invariant spine for standard mixed-team members:

```text
TeamRunService assigns team/member ids
  -> MixedTeamRunBackendFactory builds fresh MixedTeamRunContext and memberTree
  -> AgentMemoryLocationService derives member memoryDir
  -> MixedTeamMemberRegistry resolves member config
  -> MixedAgentMemberHandle consumes/asserts config.memoryDir
  -> AgentRunManager.createAgentRun registers run and attaches AgentRunMemoryRecorder
```

Restore variant:

```text
TeamRunMetadataMapper reads metadata
  -> AgentMemoryLocationService derives member memoryDir from root team id + team path + member run id
  -> restored MixedTeamRunContext/member config
  -> MixedAgentMemberHandle consumes/asserts config.memoryDir
```

Task-agent variant:

```text
MixedTeamMemberRegistry.startTaskAgentInstance / recovery
  -> logical member memory location
  -> AgentMemoryLocationService.getTaskAgentLocation(...)
  -> task-agent MixedAgentMemberHandle consumes/asserts config.memoryDir
```

Rules:

- `AgentRunConfig.memoryDir` can remain nullable at the broad type boundary for contexts that are genuinely non-durable or not memory-recorded, but it must be non-null before any non-AutoByteus executable team-member run reaches `AgentRunManager.createAgentRun`.
- Fresh standard member ownership: `MixedTeamRunBackendFactory` materializes standard member runtime identity and memoryDir.
- Restore ownership: `TeamRunMetadataMapper` reconstructs member config and memoryDir from persisted metadata and the current app memory root.
- Task-agent ownership: `MixedTeamMemberRegistry` derives task-agent memoryDir via `AgentMemoryLocationService.getTaskAgentLocation(...)`.
- Consumer guard: `MixedAgentMemberHandle` asserts the invariant and fails fast with an upstream-owner error; it does not derive fallback memoryDir.


### DS-RMCP-011 — All Active Runtime Communication Matrix

Primary product validation spine for teammate `recipient_name` delivery across active runtimes:

```text
Runtime sender entry
  -> AutoByteus: AutoByteusSendMessageToTool._execute(...)
  -> Codex: autobyteus_agent_tools MCP send_message_to via thread-scoped config and /mcp/agent-tools/:sessionId
  -> Claude: mcp__autobyteus_agent_tools__send_message_to via SDK MCP config and /mcp/agent-tools/:sessionId
  -> SendMessageToDispatcher.dispatch(...)
  -> buildInterAgentMessageDeliveryIntent(...)
  -> MixedTeamManager.deliverInterAgentMessage(...)
  -> TeamMemberDeliveryCoordinator
  -> TeamMessageRecipientResolver
  -> MixedTeamMemberRegistry resolves or starts recipient handle
  -> buildInterAgentDeliveryInputMessage(...)
  -> recipient AgentRun.postUserMessage(...)
  -> team communication projection + recipient runtime terminal/idle/assistant-output state
```

Required directed matrix before delivery:

| Sender | Recipient | Expected coverage owner |
| --- | --- | --- |
| AutoByteus | AutoByteus | Existing/update AutoByteus live team E2E |
| Codex | Codex | Existing/update Codex live team E2E |
| Claude | Claude | Existing/update route-backed Claude live team E2E |
| AutoByteus | Codex | Existing/update mixed AutoByteus/Codex live E2E |
| Codex | AutoByteus | Existing/update mixed AutoByteus/Codex live E2E |
| AutoByteus | Claude | New/update all-runtime or mixed AutoByteus/Claude live E2E |
| Claude | AutoByteus | New/update all-runtime or mixed Claude/AutoByteus live E2E |
| Codex | Claude | Existing nested coverage may count only if API/E2E records equivalence; focused top-level row preferred |
| Claude | Codex | New/update all-runtime or mixed Claude/Codex live E2E |

Rules:

- This spine validates product communication across active runtimes after the corrected cutover. AutoByteus remains a local tool wrapper; Codex and Claude use Agent Tools MCP for `send_message_to`.
- Existing durable E2E tests may satisfy matrix rows only when API/E2E records the exact directed pair, live sender runtime, recipient runtime, and assertions satisfied.
- A new focused tri-runtime matrix E2E is acceptable and preferred if it is clearer than stretching nested/lifecycle tests. It should be gated on the existing live runtime environment variables and compile/skip cleanly by default.
- Every row should assert sender runtime tool execution, canonical `send_message_to` lifecycle where emitted, correct team communication projection, recipient inter-agent input acceptance, and no old Claude provider wire-name, Codex dynamic fallback marker, or Agent Tools secret descriptor/bearer leak.
- Memory/raw-trace assertions are mandatory for changed route-backed Claude/Codex sender rows and for any other runtime rows where existing product contracts require raw traces.

## Ownership Boundaries

| Owner | Owns | Must Not Own |
| --- | --- | --- |
| `AgentToolMcpSessionService` | Session creation, configured-supported tool resolution, secret/redacted descriptor creation, owner revoke API | Runtime-specific config object/file details |
| `AgentToolMcpSessionRegistry` | Token hash storage, session lifecycle, owner identity, expiry/revocation | Raw token persistence or runtime-specific state |
| Agent Tools MCP route/dispatcher/executor | Streamable HTTP protocol/session gate, MCP methods, list/call mapping, `send_message_to` call delegation | Runtime launch/query/thread setup, Claude/Codex event policy, business delivery semantics, raw memory persistence |
| `SendMessageToDispatcher` | `send_message_to` parsing, validation, routing, delivery result | MCP protocol mapping, runtime config/materialization, memory trace writing |
| Claude Agent Tools MCP materializer | Descriptor-to-Claude SDK config and prefixed allowed tool name | Session registry internals, tool execution, file writing |
| Codex Agent Tools MCP materializer | Descriptor-to-Codex app-server `config.mcp_servers.autobyteus_agent_tools` shape | Session registry internals, tool execution, process launch args, project config files |
| `ClaudeSession` | Live runtime-session memory, lazy descriptor creation, query setup | Durable raw descriptor storage, route/session internals, team memory path derivation |
| `ClaudeTeamMcpServerBuilder` | Task-delegation in-process team MCP server only | `send_message_to` after cutover |
| `ClaudeSessionToolUseCoordinator` / event converter | Claude tool approval/lifecycle projection and canonical event names | Tool execution business behavior, raw trace persistence |
| `CodexThreadBootstrapper` / bootstrap strategies | Codex instructions, non-send-message dynamic tools, Agent Tools MCP session/config setup | Process-wide MCP launch config, durable bearer config, dynamic `send_message_to` fallback |
| `CodexThreadManager` | Codex thread start/resume request payload and app-server routing | Agent Tools session registry internals, business delivery semantics, project config writing |
| Codex item/event/history converters | Codex MCP tool-call lifecycle/history canonicalization | Tool execution business behavior, raw trace persistence, secret logging |
| `MixedTeamRunBackendFactory` | Fresh standard mixed-team member runtime identity and member memoryDir materialization | Tool execution, memory persistence, downstream fallback policy |
| `TeamRunMetadataMapper` | Restore-time team/member run config reconstruction and member memoryDir reconstruction from metadata/current app memory root | Creating live AgentRuns or writing raw traces |
| `MixedTeamMemberRegistry` | Member handle registry, dynamic task-agent config, task-agent memoryDir derivation | Standard member fallback derivation inside handles |
| `MixedAgentMemberHandle` | Consuming member config, building `MemberTeamContext`, starting/disposing member AgentRun, fail-fast invariant assertion | Deriving fallback memoryDir when config is missing one |
| `AgentRunManager` | Active `AgentRun` registration and sidecar attachment, including memory recorder attachment | Team memory path derivation or tool-specific trace shaping |
| `AutoByteusSendMessageToTool` | AutoByteus runtime entry adapter for server-owned `send_message_to` tool | Team recipient resolution, other runtime config, raw memory persistence |
| Codex dynamic tool registrations | Browser/media/task-delegation/publish-artifacts dynamic tool adapters where still configured | `send_message_to` after Agent Tools MCP cutover, team recipient resolution, Agent Tools MCP session/materialization |
| Codex Agent Tools MCP entry | Codex runtime entry adapter via Agent Tools MCP descriptor and route-backed tool call | Codex dynamic `send_message_to` fallback or AutoByteus local tool setup |
| Claude Agent Tools MCP entry | Claude runtime entry adapter via Agent Tools MCP descriptor and route-backed tool call | Codex dynamic tool setup or AutoByteus local tool setup |
| `TeamMemberDeliveryCoordinator` / `TeamMessageRecipientResolver` | Shared teammate delivery resolution, communication projection, recipient handle dispatch | Runtime-specific tool entry/materializer behavior |
| `AgentRunMemoryRecorder` / `RuntimeMemoryEventAccumulator` | Canonical AgentRun event to raw trace persistence under supplied `memoryDir` | Inventing memory locations or writing route-specific traces |

## Dependency Rules

Allowed:

- Claude backend/session -> `AgentToolMcpSessionService` for descriptor creation.
- Claude materializer -> `AgentToolMcpDescriptor`, `AGENT_TOOLS_MCP_SERVER_NAME`, send-message tool name constants.
- Claude session config builder -> Claude materializer output and existing server builders.
- Codex backend/bootstrapper -> `AgentToolMcpSessionService` for descriptor creation.
- Codex materializer -> `AgentToolMcpDescriptor`, `AGENT_TOOLS_MCP_SERVER_NAME`, enabled tool names.
- Codex thread manager -> Codex materializer output through app-server `thread/start` / `thread/resume` `config`.
- Event converter/coordinator -> shared/runtime-local tool-name normalizers for Claude and Codex.
- Agent Tools MCP executor -> `SendMessageToDispatcher` (already true in base).
- `MixedTeamRunBackendFactory`, `TeamRunMetadataMapper`, and `MixedTeamMemberRegistry` -> `AgentMemoryLocationService` for their owned member/task memoryDir derivation.
- `MixedAgentMemberHandle` -> local invariant assertion that supplied executable member config already has `memoryDir`.
- `AgentRunManager` -> `AgentRunMemoryRecorder` attachment for active runs.
- `AgentRunMemoryRecorder` / `RuntimeMemoryEventAccumulator` -> memory writer using the supplied `AgentRunConfig.memoryDir`.
- Memory-view GraphQL resolver -> `AgentMemoryLocationService` using the current app memory root for readback.
- AutoByteus local send-message entry and Agent Tools MCP executor -> `SendMessageToDispatcher` as the only delivery entry after runtime-specific argument/result adaptation.
- API/E2E all-runtime matrix -> existing runtime-gated live test harnesses and shared team communication helpers.

Forbidden:

- Claude/Codex materializers -> `AgentToolMcpSessionRegistry` internals.
- Claude/Codex materializers -> route URL construction or bearer token generation.
- Claude team MCP builder -> old send-message handler/definition.
- Codex bootstrapper/thread manager -> process-wide `codex app-server -c` bearer config, `CODEX_APP_SERVER_ARGS`, trusted `.codex/config.toml`, or any durable bearer config file.
- Agent Tools MCP route/dispatcher/executor -> `RunMemoryWriter`, `AgentRunMemoryRecorder`, raw-trace files, or team memory path derivation.
- `MixedAgentMemberHandle` -> fallback memoryDir derivation for missing standard member config.
- Any code -> logging raw `descriptor.headers.Authorization`, full Claude `mcpServers`, or full Codex `mcp_servers` containing the bearer header.
- Any code -> retaining old `mcp__autobyteus_team__send_message_to` or Codex dynamic `send_message_to` as compatibility fallback.
- Durable E2E expectations -> old in-process handler result shape `{ accepted: true }` for the route-backed `autobyteus_agent_tools` path.
- Runtime entry adapters -> direct calls to `TeamMemberDeliveryCoordinator` or recipient handles that bypass `SendMessageToDispatcher`.

## Proposed File-Level Changes

### Add

| File | Purpose |
| --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-materializer.ts` | Convert `AgentToolMcpDescriptor` to Claude SDK MCP server map and expose helper for Agent Tools send-message allowed tool name. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-tool-name.ts` | Define/derive `mcp__autobyteus_agent_tools__send_message_to` and canonicalization helpers. This may replace or narrow existing `claude-send-message-tool-name.ts`. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-materializer.test.ts` | Descriptor-to-config and allowed-tool helper coverage. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/agent-tools-mcp/codex-agent-tools-mcp-materializer.ts` | Convert `AgentToolMcpDescriptor` to Codex app-server `config.mcp_servers.autobyteus_agent_tools` shape. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/agent-tools-mcp/codex-agent-tools-mcp-materializer.test.ts` | Descriptor-to-Codex-config shape and redaction coverage. |

### Modify

| File | Change |
| --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | Add private live Agent Tools MCP descriptor/session metadata; ensure it when send-message is configured; pass descriptor into MCP server config builder. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-manager.ts` | Inject `AgentToolMcpSessionService` into session dependencies for testability. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-mcp-server-config.ts` | Accept an Agent Tools descriptor instead of send-message approval handler wiring; pass descriptor to server-map builder. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/build-claude-session-mcp-servers.ts` | Merge `autobyteus_agent_tools` separately; build `autobyteus_team` only for task delegation. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-tooling-options.ts` | Replace old team send-message MCP allowed tool with new Agent Tools MCP name. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/team-communication/claude-team-mcp-server-builder.ts` | Remove send-message parameters/imports/handler; build task-delegation tools only and return null when none. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-session-event-converter.ts` | Normalize new Agent Tools MCP send-message name to canonical; remove suppression for send-message lifecycle. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-tool-use-coordinator.ts` | Emit canonical lifecycle for observed Agent Tools send-message tool use; remove duplicate suppression. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | Create Agent Tools MCP session/config when `send_message_to` is configured; exclude `send_message_to` from dynamic tool specs/handlers. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrap-strategy.ts` | Stop building standalone Codex dynamic `send_message_to`; preserve non-send-message instruction behavior. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/team-communication/team-member-codex-thread-bootstrap-strategy.ts` | Stop building team-member Codex dynamic `send_message_to`; preserve task-delegation dynamic tools and member instructions. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-config.ts` | Add runtime-only app-server thread `config` payload field for Agent Tools MCP. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-manager.ts` | Pass materialized `config` to `thread/start` and `thread/resume` instead of `config: null`; keep `dynamicTools` without send-message. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts` | Normalize Codex MCP `send_message_to` lifecycle to canonical name and prevent server-qualified/secret leakage. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/history/codex-thread-history-item-normalizer.ts` | Normalize Codex MCP `send_message_to` history entries to canonical name instead of server-qualified names. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts` | Add fail-fast assertion for recordable non-AutoByteus executable member configs missing `memoryDir`; do not derive a fallback path here. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.ts` | Keep/lock fresh standard member memoryDir materialization through `AgentMemoryLocationService`; adjust only if focused tests prove the invariant is not currently emitted. |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-metadata-mapper.ts` | Keep/lock restore-time member memoryDir reconstruction through `AgentMemoryLocationService`; add focused coverage if missing. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-team-member-registry.ts` | Keep/lock task-agent memoryDir derivation at the registry owner; add focused coverage if missing. |
| `autobyteus-server-ts/src/agent-memory/services/agent-run-memory-recorder.ts` and/or accumulator tests | Add canonical `send_message_to` event-to-raw-trace coverage; do not make recorder derive paths. |
| `autobyteus-server-ts/tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts` | Update live route-backed memory assertion to require trace presence and MCP content result shape, not old handler `{ accepted: true }`. |
| `autobyteus-server-ts/tests/e2e/runtime/autobyteus-team-runtime-graphql.e2e.test.ts` | Inventory/run as AutoByteus -> AutoByteus matrix evidence; update assertions only if needed for shared matrix contract. |
| `autobyteus-server-ts/tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts` | Update/inventory as Codex -> Codex matrix evidence requiring Agent Tools MCP sender execution, canonical naming, and no dynamic fallback. |
| `autobyteus-server-ts/tests/e2e/runtime/mixed-team-runtime-graphql.e2e.test.ts` | Inventory/run as AutoByteus <-> Codex matrix evidence; update assertions only if needed for shared matrix contract. |
| `autobyteus-server-ts/tests/e2e/runtime/all-runtime-send-message-matrix.e2e.test.ts` or equivalent | Add preferred focused top-level tri-runtime directed matrix for AutoByteus/Codex/Claude mixed pairs not already covered cleanly. |
| `autobyteus-server-ts/tests/e2e/runtime/codex-standalone-send-message-global-routing.e2e.test.ts` | Inventory as failure-path/exact-target evidence where applicable. |
| Claude unit tests under `tests/unit/agent-execution/backends/claude/**` | Update expected server maps, allowed tools, event conversion, and delete/replace obsolete handler tests. |

### Delete

| File | Reason |
| --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/claude/agent-communication/claude-send-message-tool-call-handler.ts` | Replaced by remote Agent Tools MCP execution plus generic Claude tool lifecycle. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/agent-communication/claude-send-message-tool-definition-builder.ts` | Replaced by Agent Tools MCP catalog definition and descriptor materializer. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/team-communication/claude-send-message-tool-call-handler.test.ts` | Obsolete old path coverage. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/team-communication/claude-send-message-tool-definition-builder.test.ts` | Obsolete old path coverage. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/agent-communication/codex-send-message-dynamic-tool-registration.ts` | Delete or stop exporting/using after Codex Agent Tools MCP cutover; no dynamic fallback may remain. |
| Unit tests that assert Codex dynamic `send_message_to` registration | Obsolete after Codex Agent Tools MCP materializer; replace with materializer/config tests. |

## Interface Boundary Mapping

| Interface / API | Owner | Input | Output / Effect | Notes |
| --- | --- | --- | --- | --- |
| `AgentToolMcpSessionService.createAgentToolMcpSession(input)` | Agent Tools MCP Server | owner identity, sender context, configured exposure, runtime kind | `{ session, descriptor, redactedDescriptor }` | Claude and Codex call this; no registry bypass. |
| `buildAgentToolsMcpSenderContext(runContext)` or inline equivalent | Claude/Codex runtime setup | runtime run context | `AgentRunMessageSenderContext` | Must use member name for team member, agent definition id for standalone. |
| `buildAgentToolsMcpOwner(runContext)` or inline equivalent | Claude/Codex runtime setup | runtime run context | `AgentToolMcpSessionOwnerIdentity` | Include run id and member fields when present. |
| `materializeClaudeAgentToolsMcpServers(descriptor)` | Claude materializer | `AgentToolMcpDescriptor` | `{ autobyteus_agent_tools: { type: "http", url, headers } }` | No file, no logging. |
| `CLAUDE_AGENT_TOOLS_SEND_MESSAGE_MCP_TOOL_NAME` | Claude materializer/name helper | constants | `mcp__autobyteus_agent_tools__send_message_to` | Derived from descriptor server name and canonical send-message name. |
| `normalizeClaudeToolNameForEvent(name)` | Claude event/name helper | raw provider tool name | canonical name or unchanged | Used by coordinator and converter. |
| `materializeCodexAgentToolsMcpConfig(descriptor)` | Codex materializer | `AgentToolMcpDescriptor` | `{ mcp_servers: { autobyteus_agent_tools: { url, http_headers, enabled_tools, startup_timeout_sec } } }` | Thread-scoped app-server config only; no files/process args. |
| `CodexThreadConfig.agentToolsMcpConfig` or equivalent | Codex thread config | materialized runtime-only MCP config | app-server `config` payload for start/resume | Must not be logged/persisted; implementation may choose transient parameter if context serialization risk is found. |
| `normalizeCodexToolNameForEvent(name/server)` or inline equivalent | Codex event/history helper | raw MCP item name/server | canonical name or unchanged | Used by item/event/history converters. |
| `buildClaudeTeamMcpServers(options)` | Claude team communication | task delegation options only | `autobyteus_team` server or null | No send-message parameters. |
| `MixedTeamRunBackendFactory` member config materialization | Mixed team runtime backend | team definition, run ids, app memory root | member config with concrete `memoryDir` | Fresh standard members only. |
| `TeamRunMetadataMapper.memberMetadataToRunConfig(...)` | Team run metadata mapping | persisted metadata, current app memory root | restored member `AgentRunConfig` with concrete `memoryDir` | Restore path owner. |
| `MixedTeamMemberRegistry` task-agent config builder | Mixed team member registry | logical member + task identity | task-agent member config with concrete `memoryDir` | Task-agent path owner. |
| `MixedAgentMemberHandle.buildMemberRunConfig()` | Mixed member handle | supplied member config | `AgentRunConfig` or fail-fast invariant error | Asserts; does not derive fallback memoryDir. |
| `AgentRunMemoryRecorder.attach(run)` | Agent memory | active AgentRun with concrete `memoryDir` | raw trace subscription/write sidecar | Canonical events only; no route-specific logic. |
| Runtime `send_message_to` entry adapters | Runtime backends / Agent Tools MCP executor | runtime-native or MCP tool call arguments + sender context | `SendMessageToDispatcher.dispatch(...)` result mapped to provider-native/MCP result | AutoByteus local tool plus Codex/Claude Agent Tools MCP entries converge on one dispatcher. |
| All-runtime E2E matrix harness | API/E2E coverage | active runtime test environment + team definitions | directed pair evidence for same-runtime and mixed-runtime communication | Coverage owner only; must not create production routing shortcuts. |

## Data Shape Details

### `send_message_to` Schema Authority

For `send_message_to`, the Agent Tools MCP catalog/contract is the authoritative external-runtime schema after this cutover. Claude and Codex materializers must not define separate argument schemas for `send_message_to`; they only expose the server-owned MCP tool through runtime-specific config.

Runtime implications:

- Claude provider wire name is `mcp__autobyteus_agent_tools__send_message_to`, but the schema comes from Agent Tools MCP.
- Codex MCP server/tool exposure comes from `mcp_servers.autobyteus_agent_tools`, but the schema comes from Agent Tools MCP.
- AutoByteus native may keep its local in-process wrapper, but it must remain semantically aligned with the same shared `send_message_to` parser/validator/dispatcher contract rather than creating a divergent schema.
- Other tool families can still be available across runtimes when configured, but in this ticket they are not all served by the new `autobyteus_agent_tools` MCP catalog. Their exposure remains through each runtime's existing adapter/config path, while still using shared tool contracts/manifests where those already exist. A future design can move each family into the Agent Tools MCP catalog one by one.

### Claude SDK MCP Server Config

Input descriptor:

```ts
type AgentToolMcpDescriptor = {
  name: "autobyteus_agent_tools";
  transport: "streamable_http";
  serverUrl: string;
  headers: { Authorization: string };
  enabledTools: string[];
};
```

Materialized output:

```ts
{
  autobyteus_agent_tools: {
    type: "http",
    url: descriptor.serverUrl,
    headers: descriptor.headers,
  },
}
```

Do not include `enabledTools` inside the SDK server config unless the Claude SDK contract later explicitly supports it for HTTP MCP servers. Tool narrowing is handled by `allowedTools` and server-side session allowlist.

### Codex App Server Thread MCP Config

Input descriptor is the same `AgentToolMcpDescriptor`.

Materialized output passed as the app-server `thread/start` / `thread/resume` `config` field:

```ts
{
  mcp_servers: {
    autobyteus_agent_tools: {
      url: descriptor.serverUrl,
      http_headers: descriptor.headers,
      enabled_tools: descriptor.enabledTools,
      startup_timeout_sec: 5,
    },
  },
}
```

Use snake_case keys because this is Codex config TOML/JSON shape, not Claude SDK MCP server shape. The materializer must not write this object to process args, `CODEX_APP_SERVER_ARGS`, `.codex/config.toml`, run history, logs, or ticket artifacts. If the implementation cannot safely keep this out of serialized `CodexAgentRunContext`, pass it as a transient thread-start/resume payload instead of storing it on runtime context.

### Session Owner / Sender Mapping

Standalone Claude/Codex run:

```ts
owner = { runId };
sender = buildAgentRunMessageSenderContext({
  senderRunId: runId,
  senderName: runContext.config.agentDefinitionId,
  runtimeKind: runContext.config.runtimeKind,
  memberTeamContext: null,
});
```

Team-member Claude/Codex run:

```ts
owner = {
  runId,
  teamRunId: memberTeamContext.teamRunId,
  memberRunId: memberTeamContext.memberRunId,
  memberRouteKey: memberTeamContext.memberRouteKey,
  memberName: memberTeamContext.memberName,
};
sender = buildAgentRunMessageSenderContext({
  senderRunId: runId,
  senderName: memberTeamContext.memberName,
  runtimeKind: runContext.config.runtimeKind,
  memberTeamContext,
});
```


### Route-Backed Memory Trace Shape

The route-backed memory trace should store the same logical tool result that the external runtime saw from MCP, not the legacy Claude in-process handler object or Codex dynamic-tool text-result wrapper. A successful `send_message_to` raw trace should therefore be accepted if it records the canonical tool name and an MCP content-style result, for example:

```ts
{
  kind: "tool_result",
  toolName: "send_message_to",
  invocationId: "call_...",
  result: {
    content: [{ type: "text", text: "..." }],
  },
}
```

Exact text is not the architectural contract; canonical tool identity, invocation correlation, trace presence, and preservation of the route-backed content result shape are the contract.

## Implementation Sequence

1. Add Claude Agent Tools MCP name/materializer helpers and unit tests.
2. Update `resolveClaudeSessionToolingOptions` to use the new Agent Tools MCP send-message name and remove old team send-message allowed tool.
3. Refactor `buildClaudeTeamMcpServers` to task-delegation-only and update its tests.
4. Update `buildClaudeSessionMcpServers` / `claude-session-mcp-server-config` to accept an Agent Tools descriptor and merge `autobyteus_agent_tools` separately.
5. Add `AgentToolMcpSessionService` dependency to `ClaudeSession`/manager and implement lazy descriptor creation from current run context.
6. Remove old Claude send-message handler/definition files and imports.
7. Update Claude event coordinator/converter to normalize the new prefixed tool name and stop suppressing it.
8. Add Codex Agent Tools MCP materializer and unit tests for descriptor -> thread `config.mcp_servers.autobyteus_agent_tools` shape.
9. Update Codex runtime setup to build owner/sender context and create an Agent Tools MCP session when `send_message_to` is configured.
10. Update Codex bootstrap strategies/configured-tool filtering so dynamic tool specs/handlers exclude `send_message_to` after cutover while preserving other dynamic tool families.
11. Update `CodexThreadConfig`/`CodexThreadManager` to pass thread-scoped app-server `config` on `thread/start` and `thread/resume` instead of `config: null` when configured.
12. Update Codex event/history conversion to normalize Agent Tools MCP `send_message_to` to canonical application-facing names and prevent server-qualified/secret leakage.
13. Add or lock focused invariant coverage proving fresh standard mixed-team member configs receive non-empty `memoryDir` before `MixedAgentMemberHandle` starts the AgentRun.
14. Add a `MixedAgentMemberHandle` fail-fast assertion for recordable non-AutoByteus executable configs missing `memoryDir`; do not add fallback derivation.
15. Add or lock restore/task-agent memoryDir coverage at `TeamRunMetadataMapper` and `MixedTeamMemberRegistry` as the owning boundaries.
16. Add canonical event-to-memory coverage for `send_message_to` tool call/result persistence through `AgentRunMemoryRecorder` / `RuntimeMemoryEventAccumulator` for route-backed external runtime tool events.
17. Update live Claude and Codex route-backed E2E memory/event expectations to require raw trace presence where product-contractual and MCP content result shape, not old handler/dynamic wrapper shapes.
18. If focused evidence proves write/read root mismatch, fix the stale app-memory-root owner in service lifecycle or test bootstrap before rerunning E2E.
19. Inventory existing all-active-runtime communication E2E coverage and map each directed runtime pair to Still Valid / Needs Update / Needs Addition under the new Codex MCP sender contract.
20. Add or update durable live E2E coverage for missing mixed-runtime directed pairs, preferably as a focused top-level AutoByteus/Codex/Claude matrix test gated by `RUN_LMSTUDIO_E2E`, `RUN_CODEX_E2E`, and `RUN_CLAUDE_E2E`.
21. Ensure the matrix uses shared assertions for sender runtime tool execution, canonical lifecycle where emitted, team communication projection, recipient input acceptance, and provider/secret leak absence.
22. Replace obsolete tests with materializer/session/event tests, then run focused Claude + Codex + Agent Tools MCP tests, all required runtime matrix E2E validations available in the environment, and build.

## Test Plan / Acceptance Coverage

Required durable coverage:

| Acceptance | Planned Test Area |
| --- | --- |
| AC-RMCP-001 | New `claude-agent-tools-mcp-materializer.test.ts` validates descriptor -> SDK config shape and helper names. |
| AC-RMCP-002 | `claude-session-tool-gating.test.ts` or dedicated tooling-options test validates allowedTools cutover. |
| AC-RMCP-003 | `build-claude-session-mcp-servers.test.ts` validates separate `autobyteus_agent_tools` merge and task-only `autobyteus_team`. |
| AC-RMCP-004 / 005 | `claude-session.test.ts` or new focused test validates session service calls with standalone/member context and no call when unconfigured. |
| AC-RMCP-006 | `claude-session-event-converter.test.ts` and/or `claude-session-tool-use-coordinator.test.ts` validates canonical event output. |
| AC-RMCP-007 | No production imports remain for deleted old files; obsolete tests removed. |
| AC-RMCP-008 | Existing `tests/unit/agent-tools/mcp/agent-tool-mcp-session-service.test.ts` and `tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts`. |
| AC-RMCP-009 | Existing Claude browser/media/publish/task tests updated and passing. |
| AC-RMCP-010 | `pnpm -C autobyteus-server-ts run build`. |
| AC-RMCP-011 | Focused mixed-team creation/restore tests prove recordable member `AgentRunConfig.memoryDir` is non-empty before `AgentRunManager.createAgentRun`. |
| AC-RMCP-012 | `MixedAgentMemberHandle` test proves missing `memoryDir` fails fast with upstream-invariant error and does not derive fallback. |
| AC-RMCP-013 | `MixedTeamMemberRegistry` task-agent coverage proves task-agent memoryDir is derived at the registry owner. |
| AC-RMCP-014 | `AgentRunMemoryRecorder` / accumulator coverage proves canonical `send_message_to` `TOOL_EXECUTION_STARTED` and `TOOL_EXECUTION_SUCCEEDED` events write `tool_call` and `tool_result` traces. |
| AC-RMCP-015 | Live Claude team inter-agent E2E proves route-backed `send_message_to` succeeds, canonical lifecycle events are emitted, and sender memory raw traces include MCP content result shape. |
| AC-RMCP-016 | If memory root mismatch is reproduced, focused service-lifecycle/test-bootstrap coverage proves write/read root consistency without member fallback. |
| AC-RMCP-017 | API/E2E coverage investigation matrix inventory for active runtime pairs. |
| AC-RMCP-018 | `autobyteus-team-runtime-graphql.e2e.test.ts` or successor proves AutoByteus -> AutoByteus. |
| AC-RMCP-019 | `codex-team-inter-agent-roundtrip.e2e.test.ts` or successor proves Codex -> Codex. |
| AC-RMCP-020 | `claude-team-inter-agent-roundtrip.e2e.test.ts` proves Claude -> Claude route-backed send-message. |
| AC-RMCP-021 | Focused all-runtime matrix or mapped existing/new scenarios prove AutoByteus -> Codex, Codex -> AutoByteus, AutoByteus -> Claude, Claude -> AutoByteus, Codex -> Claude, and Claude -> Codex. |
| AC-RMCP-022 | Shared matrix assertions prove canonical lifecycle/projection/recipient acceptance and no provider-name or secret leaks. |
| AC-RMCP-023 | Existing or updated failure-path E2E/API coverage proves invalid recipient or unavailable exact target does not project false delivery. |
| AC-RMCP-024 | `codex-agent-tools-mcp-materializer.test.ts` validates descriptor -> app-server thread config shape and redaction discipline. |
| AC-RMCP-025 | `codex-thread-manager.test.ts` / bootstrap tests validate thread-scoped config passthrough on start/resume and no config when unconfigured. |
| AC-RMCP-026 | Codex dynamic-tool tests validate `send_message_to` dynamic specs/handlers are absent after cutover while other dynamic tools remain. |
| AC-RMCP-027 | Codex event/history tests validate MCP `send_message_to` canonicalization and no server-qualified/secret leak. |
| AC-RMCP-028 | Focused Codex app-server protocol/materializer smoke or durable integration coverage proves `thread/start` with `config.mcp_servers.autobyteus_agent_tools` initializes and calls a tool. |
| AC-RMCP-029 | Cleanup/restore tests prove Codex-created Agent Tools MCP sessions are owner-revoked and recreated on restore/new thread rather than persisted. |

Suggested focused commands for implementation handoff:

```bash
pnpm -C autobyteus-server-ts exec vitest run \
  tests/unit/agent-tools/mcp/agent-tool-mcp-session-service.test.ts \
  tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts \
  tests/unit/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-materializer.test.ts \
  tests/unit/agent-execution/backends/codex/agent-tools-mcp/codex-agent-tools-mcp-materializer.test.ts \
  tests/unit/agent-execution/backends/codex/thread/codex-thread-manager.test.ts \
  tests/unit/agent-execution/backends/codex/events/codex-item-event-converter.test.ts \
  tests/unit/agent-execution/backends/codex/history/codex-thread-history-item-normalizer.test.ts \
  tests/unit/agent-execution/backends/claude/session/build-claude-session-mcp-servers.test.ts \
  tests/unit/agent-execution/backends/claude/session/claude-session-tool-gating.test.ts \
  tests/unit/agent-execution/backends/claude/session/claude-session-tool-use-coordinator.test.ts \
  tests/unit/agent-execution/backends/claude/events/claude-session-event-converter.test.ts \
  tests/unit/agent-execution/backends/claude/team-communication/claude-team-mcp-server-builder.test.ts \
  tests/unit/agent-team-execution/mixed-agent-member-handle-memory-invariant.test.ts \
  tests/unit/agent-team-execution/mixed-team-run-backend-factory.test.ts \
  tests/unit/agent-team-execution/mixed-team-member-registry-task-agent-memory.test.ts \
  tests/unit/agent-memory/agent-run-memory-recorder.test.ts \
  tests/unit/agent-memory/runtime-memory-event-accumulator.test.ts \
  --no-watch

# Default-gated compile/skip pass for live runtime matrix files
pnpm -C autobyteus-server-ts exec vitest run \
  tests/e2e/runtime/autobyteus-team-runtime-graphql.e2e.test.ts \
  tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts \
  tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts \
  tests/e2e/runtime/mixed-team-runtime-graphql.e2e.test.ts \
  tests/e2e/runtime/nested-mixed-team-runtime-graphql.e2e.test.ts \
  tests/e2e/runtime/codex-standalone-send-message-global-routing.e2e.test.ts \
  --no-watch

# Release-validation environment pass when live runtimes are available
RUN_LMSTUDIO_E2E=1 RUN_CODEX_E2E=1 RUN_CLAUDE_E2E=1 pnpm -C autobyteus-server-ts exec vitest run \
  tests/e2e/runtime/autobyteus-team-runtime-graphql.e2e.test.ts \
  tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts \
  tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts \
  tests/e2e/runtime/mixed-team-runtime-graphql.e2e.test.ts \
  tests/e2e/runtime/all-runtime-send-message-matrix.e2e.test.ts \
  --no-watch

pnpm -C autobyteus-server-ts run build
git diff --check
```

API/E2E engineer should decide whether to run a real Claude SDK HTTP MCP smoke after implementation. If real Claude credentials/client state make that infeasible, record that limitation and rely on route integration plus SDK-option unit coverage.



## Branch-Comparison Evidence For Memory Design

Static comparison with `origin/personal` shows the memory subsystem itself is not the meaningful difference. `AgentRunMemoryRecorder`, `RuntimeMemoryEventAccumulator`, the team memory layout service, and the standard mixed-team member memoryDir materialization path are effectively the same. The difference is the source of Claude `send_message_to` lifecycle events and result shape.

Old `origin/personal` path:

```text
Claude SDK in-process MCP tool mcp__autobyteus_team__send_message_to
  -> ClaudeSendMessageToolCallHandler.handle(...)
  -> handler manually emits ITEM_ADDED + ITEM_COMMAND_EXECUTION_STARTED
  -> handler calls SendMessageToDispatcher
  -> handler manually emits ITEM_COMMAND_EXECUTION_COMPLETED + ITEM_COMPLETED
  -> ClaudeSessionEventConverter converts canonical send_message_to events
  -> AgentRunMemoryRecorder writes raw_traces.jsonl
```

New route-backed path:

```text
Claude SDK remote MCP tool mcp__autobyteus_agent_tools__send_message_to
  -> /mcp/agent-tools/:sessionId tools/call
  -> Agent Tools MCP route/dispatcher/executor
  -> SendMessageToDispatcher
  -> MCP content result returned to Claude
  -> ClaudeSessionToolUseCoordinator observes SDK tool chunks
  -> ClaudeSessionEventConverter emits canonical send_message_to AgentRun events
  -> AgentRunMemoryRecorder writes raw_traces.jsonl if attached with correct memoryDir/root
```

Design implication: the old handler worked partly because it was both executor and synthetic lifecycle emitter. The clean route-backed design must not restore that dual path. It must instead enforce the already-intended AgentRun memory spine: active recordable team-member runs have a concrete `memoryDir`, the recorder is attached by `AgentRunManager`, and raw traces preserve the route-backed MCP content result shape.

Codex has an analogous duplicate-path cleanup: the old/current Codex dynamic `send_message_to` handler directly calls `SendMessageToDispatcher` and maps the result to a Codex dynamic-tool text result. After the Codex Agent Tools MCP cutover, Codex should rely on app-server MCP tool-call lifecycle and canonical event/history conversion, not on the dynamic handler or its result wrapper.


## Backward-Compatibility Rejection Log

| Rejected Compatibility Shape | Reason |
| --- | --- |
| Keep `mcp__autobyteus_team__send_message_to` allowed | Would preserve duplicate active Claude send-message path. |
| Keep old handler but unused | Dead code/tests increase drift and make imports ambiguous. |
| Add both old and new send-message MCP names | Makes provider histories and approval events ambiguous. |
| Keep Codex dynamic `send_message_to` as fallback | Would preserve duplicate active Codex send-message path and stale dynamic-tool result semantics. |
| Use Codex process-level `-c mcp_servers...` or `CODEX_APP_SERVER_ARGS` for bearer descriptors | Shared cwd-keyed app-server reuse can leak one run/member descriptor into another. |
| Write `.mcp.json` for Claude SDK or `.codex/config.toml` for Codex | Programmatic/thread-scoped paths exist; bearer-token files are unnecessary risk. |
| Generic all-runtime materializer | Hides runtime-specific process/file cleanup rules already identified upstream. |
| Agent Tools MCP route-side raw-trace writer | Would create a second memory persistence path outside canonical AgentRun events. |
| `MixedAgentMemberHandle` fallback memoryDir derivation | Would mask the upstream executable-run invariant failure at the final consumer boundary. |
| Coerce route-backed MCP result into `{ accepted: true }` | Would preserve stale old-handler semantics instead of the real provider/result contract. |

## Risks And Mitigations

| Risk | Mitigation |
| --- | --- |
| Claude SDK remote MCP emits lifecycle events with unexpected names/shapes | Unit-test normalization against expected prefixed name; API/E2E investigates real SDK if feasible. |
| Raw descriptor accidentally logged through query options, thread config, or test snapshots | Keep materializers pure, do not log; tests should not snapshot full descriptor with real token; use fake token only in unit tests and redact config in diagnostics. |
| Long-lived Claude/Codex runtime session reuses expired descriptor | Store `session.expiresAt` with descriptor if practical and recreate when stale; route denial remains safe fallback. |
| Existing task-delegation server behavior regresses | Keep `autobyteus_team` builder focused on task delegation and preserve existing tests. |
| Active member run reaches `AgentRunMemoryRecorder` without `memoryDir` and silently loses traces | Enforce upstream member memoryDir invariant and add fail-fast assertion in `MixedAgentMemberHandle` before AgentRun creation. |
| Write/read memory roots diverge under tests or app bootstrap | Fix service lifecycle/test bootstrap ownership; do not derive per-member fallback paths to hide the root mismatch. |
| E2E coverage preserves old handler result shape and fails after traces are restored | Update route-backed memory assertions to expect MCP content result shape while keeping canonical tool name and invocation correlation. |
| All-runtime matrix live validation requires LM Studio, Codex, and Claude credentials/binaries | Keep matrix files default-gated with compile/skip validation, but require API/E2E execution report to state which live rows ran and which were unavailable; do not claim all-runtime proof for unavailable rows. |
| Codex thread-scoped config unexpectedly unsupported in installed app-server | Route back to solution design before using process-wide/file-backed bearer config or dynamic fallback; local protocol/probe evidence suggests the thread field is viable. |
| Matrix implementation becomes a generic runtime abstraction or changes AutoByteus unnecessarily | Keep runtime entry adapters separate and route all entries into `SendMessageToDispatcher`; AutoByteus remains local unless a real defect is found. |
| Claude Code CLI/AGY expected by ticket owner | Requirements explicitly leave those runtime backends out of scope; architecture reviewer should route Requirement Gap if needed. |

## Design Principles Validation Pass

| Principle / Check | Validation Result | Evidence In This Spec | Residual Action |
| --- | --- | --- | --- |
| Data-flow spine inventory and span sufficiency | Pass | DS-RMCP-001 starts at run/member creation and continues to SDK query options; DS-RMCP-002 covers remote tool call; DS-RMCP-006/007 cover Codex thread config and MCP execution; DS-RMCP-009 spans runtime chunks through memory readback; DS-RMCP-010 spans team creation/restore through AgentRun registration; DS-RMCP-011 covers active-runtime communication from runtime entry adapters through recipient AgentRun input. | Architecture review should confirm Claude session is the correct live descriptor owner, mixed-team creation/restore are the correct memoryDir owners, and the all-runtime matrix is coverage scope rather than a generic runtime abstraction. |
| Ownership clarity | Pass | Session service, Claude/Codex materializers, Claude session, Codex thread setup, team builder, event owners, member config owners, and memory recorder owners are separate. | Keep implementation from moving trace writing into MCP routes or fallback derivation into member handles. |
| Authoritative boundary | Pass | Claude and Codex consume `AgentToolMcpDescriptor`; server route executes through `SendMessageToDispatcher`; memory persists only through AgentRun recorder sidecar with supplied `memoryDir`. | Tests should fail if old handler imports or route-side trace writers remain. |
| Existing-tool refactor | Pass | Old Claude send-message handler and Codex dynamic send-message path removed/gated; task-delegation remains separate; memory invariant is enforced at existing mixed-team owner boundaries. | Future tool families still need catalog adapters before Agent Tools MCP exposure. |
| Secret-bearing structure tightness | Pass | Descriptor lives only in service return and live runtime/session/thread setup memory; no files/process args. | Review logging/test snapshots. |
| Legacy cleanup | Pass | Explicit deletion/gating list and no old MCP/dynamic fallback; stale old memory result shapes rejected. | Code review verifies no imports/fallback expectations remain. |

## Notes For Downstream Implementation

- Do not change the Agent Tools MCP route or catalog unless a focused test failure proves a route defect. The current ticket is runtime materialization.
- Prefer small, backend-local helpers over expanding shared abstractions.
- Do not persist raw descriptor in `ClaudeAgentRunContext`, `CodexAgentRunContext`, run history, team metadata, or project config; those contexts can be restored/serialized or surfaced.
- Keep prompt/instruction wording canonical (`send_message_to`) while provider wire naming is allowed-tool prefixed.
- If TypeScript types around Claude SDK MCP config or Codex app-server config are loose (`Record<string, unknown>`), keep materializer returns typed locally enough for tests without importing broad provider internals into shared code.
- Do not fix empty memory traces by writing traces inside the Agent Tools MCP route or by reintroducing the old Claude send-message handler.
- Do not fix Codex by falling back to dynamic `send_message_to`, process-level `-c` config, or `.codex/config.toml`; use thread-scoped app-server config or route back to design.
- Do not fix missing member `memoryDir` by deriving fallback paths in `MixedAgentMemberHandle`; assert there and fix the upstream owner if the assertion fires.
- Route-backed memory assertions should verify canonical `send_message_to`, invocation correlation, trace presence where product-contractual, and MCP content result shape.
- For the all-runtime matrix, prefer adding/updating durable E2E coverage over production abstractions. The matrix should prove corrected runtime entries converge on `SendMessageToDispatcher`: AutoByteus local, Codex Agent Tools MCP, and Claude Agent Tools MCP.
- API/E2E must not mark delivery-ready until the matrix inventory and live execution evidence are recorded, including any explicit environment-gated unavailable rows.
