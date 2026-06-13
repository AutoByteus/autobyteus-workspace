# Design Spec

## Status

Refined after design-impact reroute; sent to architecture review after user confirmation on 2026-06-13.

This design is a follow-up to the completed `streamable-mcp-runtime-tools` ticket archived at `tickets/done/streamable-mcp-runtime-tools`. The base branch already delivered the runtime-neutral Agent Tools MCP Server. This ticket implements the first production runtime materializer: Claude Agent SDK programmatic consumption of `autobyteus_agent_tools` for `send_message_to`.

## Requirements / Investigation Basis

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/investigation-notes.md`
- Upstream done-ticket investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/done/streamable-mcp-runtime-tools/investigation-notes.md`
- Upstream done-ticket design: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/done/streamable-mcp-runtime-tools/design-spec.md`
- Upstream done-ticket implementation handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/done/streamable-mcp-runtime-tools/implementation-handoff.md`

## Problem Summary

The base branch introduced an AutoByteus-hosted Streamable HTTP MCP server named `autobyteus_agent_tools`, with `send_message_to` v1 support and a canonical `AgentToolMcpDescriptor`. However, no production runtime uses it yet. Claude Agent SDK still exposes `send_message_to` through a Claude-specific in-process `autobyteus_team` MCP tool and handler.

That duplicate path should be removed for Claude Agent SDK. When a Claude run has `send_message_to` configured, Claude SDK should receive the server-hosted Agent Tools MCP descriptor as an HTTP MCP server config and call `send_message_to` through `/mcp/agent-tools/:sessionId`. `autobyteus_team` remains only for task-delegation tools.

## Task Design Health Assessment (Mandatory)

- Change posture: Feature plus targeted refactor.
- Current design issue found: Yes.
- Root cause classification: Duplicated Policy Or Coordination; Boundary Or Ownership Issue; Legacy Or Compatibility Pressure; Missing Invariant exposed by runtime-memory/run-history trace persistence after the route-backed send-message cutover.
- Refactor needed now: Yes. The original Claude materializer refactor remains, and the design-impact rework adds explicit enforcement of the executable team-member memoryDir/app-memory-root invariant without downstream fallback.
- Evidence: Upstream established `AgentToolMcpSessionService` and `AgentToolMcpToolExecutor -> SendMessageToDispatcher` as the server-owned MCP execution boundary. Claude still owns a second `send_message_to` handler and special event suppression. Keeping both active would preserve two execution projections for one configured server-owned tool.
- Design response: Add a backend-local Claude Agent Tools MCP materializer, create/memoize a live Agent Tools MCP descriptor for Claude sessions when configured, merge it into SDK query options, remove the old Claude-specific handler/definition path, and preserve memory persistence through canonical AgentRun events under an authoritative member memoryDir.

## Scope

### In Scope

1. Claude Agent SDK materialization of `AgentToolMcpDescriptor` into SDK `mcpServers` config.
2. Claude session setup that creates/uses an Agent Tools MCP session when `send_message_to` is configured.
3. Allowed-tool cutover from old `mcp__autobyteus_team__send_message_to` to `mcp__autobyteus_agent_tools__send_message_to`.
4. Removal of old Claude in-process `send_message_to` handler/definition and tests.
5. Event/tool-name normalization so application events remain canonical `send_message_to`.
6. Runtime-memory/run-history trace preservation for route-backed Claude `send_message_to`: canonical AgentRun events persist raw traces under the authoritative member memory directory.
7. Focused tests and build validation.

### Out of Scope

1. Codex App Server MCP config materialization.
2. Antigravity CLI or Claude Code CLI runtime/materializers.
3. Browser/media/task-delegation/publish-artifacts exposure through Agent Tools MCP Server.
4. Persisted MCP sessions or durable bearer-token files.
5. Compatibility fallback for `mcp__autobyteus_team__send_message_to`.
6. Agent Tools MCP route-side raw-trace persistence; memory must stay attached to canonical AgentRun events.
7. Downstream member-handle memoryDir fallback; missing memoryDir is an upstream executable-run invariant failure.

## Legacy Removal Policy (Mandatory)

- Policy: no backward compatibility; remove replaced paths.
- Remove the old Claude-specific send-message in-process MCP handler and definition files after the new materializer is wired.
- Remove old tests that assert `autobyteus_team` contains `send_message_to`; replace them with tests asserting `autobyteus_agent_tools` contains the descriptor-based HTTP server config.
- Do not keep `mcp__autobyteus_team__send_message_to` in allowed tools as a fallback.
- Do not add a second route, alias, generic runtime-tools name, or materializer that hand-builds session URLs/tokens.
- Do not make the Agent Tools MCP route, dispatcher, or executor write memory raw traces directly.
- Do not hide missing team-member `memoryDir` by deriving fallback paths inside `MixedAgentMemberHandle`; enforce the invariant at the creation/restore owner and assert at the consuming boundary.

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

### DS-RMCP-006 — Non-Target Runtime Deferrals

- Codex App Server remains on dynamic tools. Do not inject a bearer descriptor into its cwd-keyed shared app-server process in this ticket.
- Claude Code CLI and Antigravity CLI do not have runtime backends here. Do not add orphan materializer files without runtime owners.
- Browser/media/task-delegation/publish-artifacts remain on existing Claude MCP/in-process surfaces. Do not expose them through `autobyteus_agent_tools` until the Agent Tools MCP catalog has explicit adapters.


### DS-RMCP-007 — Route-Backed Tool Lifecycle Persists Through Canonical AgentRun Memory Spine

Return/event spine for the live route-backed Claude `send_message_to` result becoming durable memory:

```text
Claude SDK observed tool_use/tool_result chunks
  -> ClaudeSessionToolUseCoordinator emits ITEM_ADDED / ITEM_COMMAND_EXECUTION_STARTED / ITEM_COMMAND_EXECUTION_COMPLETED
  -> ClaudeSessionEventConverter normalizes mcp__autobyteus_agent_tools__send_message_to to send_message_to
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
- Raw memory traces preserve the route-backed MCP result shape that Claude received, including MCP content arrays. They must not coerce the result back into the old in-process handler shape `{ accepted: true, code, message }`.
- If write/read paths disagree because an app memory root is stale, the fix belongs to service lifecycle/test bootstrap ownership, not to per-member fallback path derivation.

### DS-RMCP-008 — Executable Team-Member MemoryDir Invariant

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

## Ownership Boundaries

| Owner | Owns | Must Not Own |
| --- | --- | --- |
| `AgentToolMcpSessionService` | Session creation, configured-supported tool resolution, secret/redacted descriptor creation, owner revoke API | Runtime-specific config object/file details |
| `AgentToolMcpSessionRegistry` | Token hash storage, session lifecycle, owner identity, expiry/revocation | Raw token persistence or Claude-specific state |
| Agent Tools MCP route/dispatcher/executor | Streamable HTTP protocol/session gate, MCP methods, list/call mapping, `send_message_to` call delegation | Runtime launch/query setup, Claude event policy, business delivery semantics, raw memory persistence |
| `SendMessageToDispatcher` | `send_message_to` parsing, validation, routing, delivery result | MCP protocol mapping, Claude SDK config, memory trace writing |
| Claude Agent Tools MCP materializer | Descriptor-to-Claude SDK config and prefixed allowed tool name | Session registry internals, tool execution, file writing |
| `ClaudeSession` | Live runtime-session memory, lazy descriptor creation, query setup | Durable raw descriptor storage, route/session internals, team memory path derivation |
| `ClaudeTeamMcpServerBuilder` | Task-delegation in-process team MCP server only | `send_message_to` after cutover |
| `ClaudeSessionToolUseCoordinator` / event converter | Runtime tool approval/lifecycle projection and canonical event names | Tool execution business behavior, raw trace persistence |
| `MixedTeamRunBackendFactory` | Fresh standard mixed-team member runtime identity and member memoryDir materialization | Tool execution, memory persistence, downstream fallback policy |
| `TeamRunMetadataMapper` | Restore-time team/member run config reconstruction and member memoryDir reconstruction from metadata/current app memory root | Creating live AgentRuns or writing raw traces |
| `MixedTeamMemberRegistry` | Member handle registry, dynamic task-agent config, task-agent memoryDir derivation | Standard member fallback derivation inside handles |
| `MixedAgentMemberHandle` | Consuming member config, building `MemberTeamContext`, starting/disposing member AgentRun, fail-fast invariant assertion | Deriving fallback memoryDir when config is missing one |
| `AgentRunManager` | Active `AgentRun` registration and sidecar attachment, including memory recorder attachment | Team memory path derivation or tool-specific trace shaping |
| `AgentRunMemoryRecorder` / `RuntimeMemoryEventAccumulator` | Canonical AgentRun event to raw trace persistence under supplied `memoryDir` | Inventing memory locations or writing route-specific traces |

## Dependency Rules

Allowed:

- Claude backend/session -> `AgentToolMcpSessionService` for descriptor creation.
- Claude materializer -> `AgentToolMcpDescriptor`, `AGENT_TOOLS_MCP_SERVER_NAME`, send-message tool name constants.
- Claude session config builder -> Claude materializer output and existing server builders.
- Event converter/coordinator -> shared Claude tool-name normalizer.
- Agent Tools MCP executor -> `SendMessageToDispatcher` (already true in base).
- `MixedTeamRunBackendFactory`, `TeamRunMetadataMapper`, and `MixedTeamMemberRegistry` -> `AgentMemoryLocationService` for their owned member/task memoryDir derivation.
- `MixedAgentMemberHandle` -> local invariant assertion that supplied executable member config already has `memoryDir`.
- `AgentRunManager` -> `AgentRunMemoryRecorder` attachment for active runs.
- `AgentRunMemoryRecorder` / `RuntimeMemoryEventAccumulator` -> memory writer using the supplied `AgentRunConfig.memoryDir`.
- Memory-view GraphQL resolver -> `AgentMemoryLocationService` using the current app memory root for readback.

Forbidden:

- Claude materializer -> `AgentToolMcpSessionRegistry` internals.
- Claude materializer -> route URL construction or bearer token generation.
- Claude team MCP builder -> old send-message handler/definition.
- Agent Tools MCP route/dispatcher/executor -> `RunMemoryWriter`, `AgentRunMemoryRecorder`, raw-trace files, or team memory path derivation.
- `MixedAgentMemberHandle` -> fallback memoryDir derivation for missing standard member config.
- Any code -> logging raw `descriptor.headers.Authorization` or full `mcpServers` containing the bearer header.
- Any code -> retaining old `mcp__autobyteus_team__send_message_to` as compatibility fallback.
- Durable E2E expectations -> old in-process handler result shape `{ accepted: true }` for the route-backed `autobyteus_agent_tools` path.

## Proposed File-Level Changes

### Add

| File | Purpose |
| --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-materializer.ts` | Convert `AgentToolMcpDescriptor` to Claude SDK MCP server map and expose helper for Agent Tools send-message allowed tool name. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-tool-name.ts` | Define/derive `mcp__autobyteus_agent_tools__send_message_to` and canonicalization helpers. This may replace or narrow existing `claude-send-message-tool-name.ts`. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-materializer.test.ts` | Descriptor-to-config and allowed-tool helper coverage. |

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
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts` | Add fail-fast assertion for recordable non-AutoByteus executable member configs missing `memoryDir`; do not derive a fallback path here. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.ts` | Keep/lock fresh standard member memoryDir materialization through `AgentMemoryLocationService`; adjust only if focused tests prove the invariant is not currently emitted. |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-metadata-mapper.ts` | Keep/lock restore-time member memoryDir reconstruction through `AgentMemoryLocationService`; add focused coverage if missing. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-team-member-registry.ts` | Keep/lock task-agent memoryDir derivation at the registry owner; add focused coverage if missing. |
| `autobyteus-server-ts/src/agent-memory/services/agent-run-memory-recorder.ts` and/or accumulator tests | Add canonical `send_message_to` event-to-raw-trace coverage; do not make recorder derive paths. |
| `autobyteus-server-ts/tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts` | Update live route-backed memory assertion to require trace presence and MCP content result shape, not old handler `{ accepted: true }`. |
| Claude unit tests under `tests/unit/agent-execution/backends/claude/**` | Update expected server maps, allowed tools, event conversion, and delete/replace obsolete handler tests. |

### Delete

| File | Reason |
| --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/claude/agent-communication/claude-send-message-tool-call-handler.ts` | Replaced by remote Agent Tools MCP execution plus generic Claude tool lifecycle. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/agent-communication/claude-send-message-tool-definition-builder.ts` | Replaced by Agent Tools MCP catalog definition and descriptor materializer. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/team-communication/claude-send-message-tool-call-handler.test.ts` | Obsolete old path coverage. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/team-communication/claude-send-message-tool-definition-builder.test.ts` | Obsolete old path coverage. |

## Interface Boundary Mapping

| Interface / API | Owner | Input | Output / Effect | Notes |
| --- | --- | --- | --- | --- |
| `AgentToolMcpSessionService.createAgentToolMcpSession(input)` | Agent Tools MCP Server | owner identity, sender context, configured exposure, runtime kind | `{ session, descriptor, redactedDescriptor }` | Claude calls this; no registry bypass. |
| `buildAgentToolsMcpSenderContext(runContext)` or inline equivalent | Claude session | Claude run context | `AgentRunMessageSenderContext` | Must use member name for team member, agent definition id for standalone. |
| `buildAgentToolsMcpOwner(runContext)` or inline equivalent | Claude session | Claude run context | `AgentToolMcpSessionOwnerIdentity` | Include run id and member fields when present. |
| `materializeClaudeAgentToolsMcpServers(descriptor)` | Claude materializer | `AgentToolMcpDescriptor` | `{ autobyteus_agent_tools: { type: "http", url, headers } }` | No file, no logging. |
| `CLAUDE_AGENT_TOOLS_SEND_MESSAGE_MCP_TOOL_NAME` | Claude materializer/name helper | constants | `mcp__autobyteus_agent_tools__send_message_to` | Derived from descriptor server name and canonical send-message name. |
| `normalizeClaudeToolNameForEvent(name)` | Claude event/name helper | raw provider tool name | canonical name or unchanged | Used by coordinator and converter. |
| `buildClaudeTeamMcpServers(options)` | Claude team communication | task delegation options only | `autobyteus_team` server or null | No send-message parameters. |
| `MixedTeamRunBackendFactory` member config materialization | Mixed team runtime backend | team definition, run ids, app memory root | member config with concrete `memoryDir` | Fresh standard members only. |
| `TeamRunMetadataMapper.memberMetadataToRunConfig(...)` | Team run metadata mapping | persisted metadata, current app memory root | restored member `AgentRunConfig` with concrete `memoryDir` | Restore path owner. |
| `MixedTeamMemberRegistry` task-agent config builder | Mixed team member registry | logical member + task identity | task-agent member config with concrete `memoryDir` | Task-agent path owner. |
| `MixedAgentMemberHandle.buildMemberRunConfig()` | Mixed member handle | supplied member config | `AgentRunConfig` or fail-fast invariant error | Asserts; does not derive fallback memoryDir. |
| `AgentRunMemoryRecorder.attach(run)` | Agent memory | active AgentRun with concrete `memoryDir` | raw trace subscription/write sidecar | Canonical events only; no route-specific logic. |

## Data Shape Details

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

### Session Owner / Sender Mapping

Standalone Claude run:

```ts
owner = { runId };
sender = buildAgentRunMessageSenderContext({
  senderRunId: runId,
  senderName: runContext.config.agentDefinitionId,
  runtimeKind: runContext.config.runtimeKind,
  memberTeamContext: null,
});
```

Team-member Claude run:

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

The route-backed memory trace should store the same logical tool result that the Claude SDK saw from MCP, not the legacy in-process handler object. A successful `send_message_to` raw trace should therefore be accepted if it records the canonical tool name and an MCP content-style result, for example:

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
7. Update event coordinator/converter to normalize the new prefixed tool name and stop suppressing it.
8. Add or lock focused invariant coverage proving fresh standard mixed-team member configs receive non-empty `memoryDir` before `MixedAgentMemberHandle` starts the AgentRun.
9. Add a `MixedAgentMemberHandle` fail-fast assertion for recordable non-AutoByteus executable configs missing `memoryDir`; do not add fallback derivation.
10. Add or lock restore/task-agent memoryDir coverage at `TeamRunMetadataMapper` and `MixedTeamMemberRegistry` as the owning boundaries.
11. Add canonical event-to-memory coverage for `send_message_to` tool call/result persistence through `AgentRunMemoryRecorder` / `RuntimeMemoryEventAccumulator`.
12. Update the live Claude route-backed E2E memory expectation to require raw trace presence and MCP content result shape.
13. If focused evidence proves write/read root mismatch, fix the stale app-memory-root owner in service lifecycle or test bootstrap before rerunning E2E.
14. Replace obsolete tests with materializer/session/event tests, then run focused Claude + Agent Tools MCP tests and build.

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

Suggested focused commands for implementation handoff:

```bash
pnpm -C autobyteus-server-ts exec vitest run \
  tests/unit/agent-tools/mcp/agent-tool-mcp-session-service.test.ts \
  tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts \
  tests/unit/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-materializer.test.ts \
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


## Backward-Compatibility Rejection Log

| Rejected Compatibility Shape | Reason |
| --- | --- |
| Keep `mcp__autobyteus_team__send_message_to` allowed | Would preserve duplicate active Claude send-message path. |
| Keep old handler but unused | Dead code/tests increase drift and make imports ambiguous. |
| Add both old and new send-message MCP names | Makes provider histories and approval events ambiguous. |
| Write `.mcp.json` for Claude SDK | Programmatic SDK path exists; bearer-token files are unnecessary risk. |
| Generic all-runtime materializer | Hides runtime-specific process/file cleanup rules already identified upstream. |
| Agent Tools MCP route-side raw-trace writer | Would create a second memory persistence path outside canonical AgentRun events. |
| `MixedAgentMemberHandle` fallback memoryDir derivation | Would mask the upstream executable-run invariant failure at the final consumer boundary. |
| Coerce route-backed MCP result into `{ accepted: true }` | Would preserve stale old-handler semantics instead of the real provider/result contract. |

## Risks And Mitigations

| Risk | Mitigation |
| --- | --- |
| Claude SDK remote MCP emits lifecycle events with unexpected names/shapes | Unit-test normalization against expected prefixed name; API/E2E investigates real SDK if feasible. |
| Raw descriptor accidentally logged through query options or test snapshots | Keep materializer pure, do not log; tests should not snapshot full descriptor with real token; use fake token only in unit tests. |
| Long-lived Claude session reuses expired descriptor | Store `session.expiresAt` with descriptor if practical and recreate when stale; route denial remains safe fallback. |
| Existing task-delegation server behavior regresses | Keep `autobyteus_team` builder focused on task delegation and preserve existing tests. |
| Active member run reaches `AgentRunMemoryRecorder` without `memoryDir` and silently loses traces | Enforce upstream member memoryDir invariant and add fail-fast assertion in `MixedAgentMemberHandle` before AgentRun creation. |
| Write/read memory roots diverge under tests or app bootstrap | Fix service lifecycle/test bootstrap ownership; do not derive per-member fallback paths to hide the root mismatch. |
| E2E coverage preserves old handler result shape and fails after traces are restored | Update route-backed memory assertions to expect MCP content result shape while keeping canonical tool name and invocation correlation. |
| Codex/AGY expected by ticket owner | Requirements explicitly call this out as a scope assumption; architecture reviewer should route Requirement Gap if needed. |

## Design Principles Validation Pass

| Principle / Check | Validation Result | Evidence In This Spec | Residual Action |
| --- | --- | --- | --- |
| Data-flow spine inventory and span sufficiency | Pass | DS-RMCP-001 starts at run/member creation and continues to SDK query options; DS-RMCP-002 covers remote tool call; DS-RMCP-007 spans SDK chunks through memory readback; DS-RMCP-008 spans team creation/restore through AgentRun registration. | Architecture review should confirm Claude session is the correct live descriptor owner and mixed-team creation/restore are the correct memoryDir owners. |
| Ownership clarity | Pass | Session service, materializer, Claude session, team builder, event owners, member config owners, and memory recorder owners are separate. | Keep implementation from moving trace writing into MCP routes or fallback derivation into member handles. |
| Authoritative boundary | Pass | Claude consumes `AgentToolMcpDescriptor`; server route executes through `SendMessageToDispatcher`; memory persists only through AgentRun recorder sidecar with supplied `memoryDir`. | Tests should fail if old handler imports or route-side trace writers remain. |
| Existing-tool refactor | Pass | Old Claude send-message handler removed; task-delegation remains separate; memory invariant is enforced at existing mixed-team owner boundaries. | Future tool families still need catalog adapters before Agent Tools MCP exposure. |
| Secret-bearing structure tightness | Pass | Descriptor lives only in service return and live ClaudeSession memory; no files. | Review logging/test snapshots. |
| Legacy cleanup | Pass | Explicit deletion list and no old MCP allowed-name fallback; stale old memory result shape rejected. | Code review verifies no imports/fallback expectations remain. |

## Notes For Downstream Implementation

- Do not change the Agent Tools MCP route or catalog unless a focused test failure proves a route defect. The current ticket is runtime materialization.
- Prefer small, backend-local helpers over expanding shared abstractions.
- Do not persist raw descriptor in `ClaudeAgentRunContext`; that context is a run runtime state object and can be restored/serialized.
- Keep prompt/instruction wording canonical (`send_message_to`) while provider wire naming is allowed-tool prefixed.
- If TypeScript types around Claude SDK MCP config are loose (`Record<string, unknown>`), keep the materializer return typed locally enough for tests without importing SDK internals into broad shared code.
- Do not fix empty memory traces by writing traces inside the Agent Tools MCP route or by reintroducing the old Claude send-message handler.
- Do not fix missing member `memoryDir` by deriving fallback paths in `MixedAgentMemberHandle`; assert there and fix the upstream owner if the assertion fires.
- Route-backed memory assertions should verify canonical `send_message_to`, invocation correlation, trace presence, and MCP content result shape.
