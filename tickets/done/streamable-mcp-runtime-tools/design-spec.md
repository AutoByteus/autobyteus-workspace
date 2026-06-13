# Design Spec

## Review Status

Round-3 draft for architecture re-review after Round 2 returned one narrow remaining AR-001 precision issue. Updated on 2026-06-13 to pin unsupported-method auth/session behavior, unknown/unconfigured `tools/call` error shape, and invalid JSON-RPC envelope stage behavior. AR-002 and AR-003 were resolved in Round 2. Base remains latest `origin/personal` (`08078c265902955e5a570721e03763c5f39398f6`).

## Architecture Review Rework Log

| Finding | Status | Design Update |
| --- | --- | --- |
| AR-001 Streamable HTTP compliance/auth/error matrix | Addressed in this revision | DS-007 now owns an explicit route protocol/auth/status matrix, `MCP-Protocol-Version` policy, v1 `MCP-Session-Id` decision, all-method auth requirement, and protocol-vs-tool execution error mapping. |
| AR-002 Secret-bearing descriptor lifecycle | Addressed in this revision | `AgentToolMcpDescriptor` is marked secret-bearing/runtime-only; redacted descriptor view, non-persistence rules, materialized-file cleanup rules, and redaction tests are added. |
| AR-003 Session lifetime/revocation/DELETE/restore semantics | Addressed in this revision | DS-008 now defines v1 session granularity and a lifetime policy table for run close, turn end, mixed member lifecycle, TTL, server restart, restore, direct revoke, and client DELETE. |
| Round-2 AR-001 remaining precision issue | Addressed in this revision | DS-007 now authenticates/resolves session before unsupported-method `405`, returns exact JSON-RPC `-32602` for unknown/unconfigured tools with no MCP tool result, and pins invalid-envelope failures to HTTP `400` JSON-RPC `-32600` before method-level `200` errors. |

## Current-State Read

AutoByteus has three relevant current capabilities:

1. Runtime-specific tool exposure surfaces:
   - native AutoByteus runtime uses local `BaseTool` wrappers;
   - Claude Agent SDK builds in-process SDK/MCP-style tool handlers;
   - Codex App Server uses dynamic tool registrations.
2. Client-side MCP consumption:
   - `autobyteus-ts` models external MCP configs and uses the MCP SDK Streamable HTTP client for external MCP servers;
   - `autobyteus-server-ts/src/mcp-server-management/**` manages external MCP servers consumed by AutoByteus.
3. Shared agent communication in latest base:
   - `autobyteus-server-ts/src/agent-communication/services/send-message-to-dispatcher.ts` centralizes `send_message_to` parsing, validation, direct `target_agent_run_id` routing, team-local `recipient_name` routing, and delivery result shaping;
   - AutoByteus/Codex/Claude wrappers have moved toward `agent-communication` paths and already call this dispatcher or align with it.

What is missing is the inverse capability: AutoByteus server itself hosting selected server-owned tools outward through a standard MCP Streamable HTTP endpoint for external process runtimes.

The enabling runtime need is broader than Antigravity CLI:

- Antigravity CLI can consume workspace `.agents/mcp_config.json` with remote `serverUrl`.
- Future Claude Code runtime can consume generated `--mcp-config`, `.mcp.json`, or local/private Claude MCP config.
- Codex App Server can consume `mcp_servers.*` TOML config through launch-time `-c` overrides or trusted `.codex/config.toml` project config, but current app-server process reuse by normalized `cwd` makes per-run config injection sensitive.
- Future external runtimes should consume the same AutoByteus-hosted MCP server rather than copying tool behavior.
- Claude Agent SDK should also be treated as MCP-config-capable: it supports programmatic `mcpServers` in query options and `.mcp.json` via project setting sources. Current AutoByteus code already passes `mcpServers` into SDK query options.

Important constraints from current code and probes:

- The server is Fastify-based and should register the MCP route in the existing app, not start a second HTTP server.
- `AUTOBYTEUS_INTERNAL_SERVER_BASE_URL` already provides the loopback base for generated local `serverUrl` values.
- `ConfiguredAgentToolExposure` already derives configured browser/media/task/send-message/publish-artifacts tool exposure from agent tool names.
- Tool schemas are not all owned by one runtime surface. `send_message_to` has shared contract/schema sources and a dispatcher; browser/media/task-delegation have manifest/schema files; published-artifacts may need schema/contract extraction before MCP exposure.
- Existing server tools are request/response service wrappers; v1 does not need streamed tool results.
- Codex App Server and Claude Code probes opened GET/SSE on the Streamable HTTP endpoint and probed `resources/list` / `resources/templates/list`; the endpoint should support those compatibility paths.
- Localhost is not an authority boundary. Any local process can try to call loopback URLs, and generated endpoint URLs may leak through config/log/debug artifacts. A session ID plus bearer capability token is therefore required even in local-first v1.

### Current Longer Runtime Creation Paths

Standalone agent run creation currently flows through:

```text
GraphQL AgentRunResolver.createAgentRun / prepare+activate
  -> AgentRunService
  -> AgentRunProvisioningService.activatePreparedRun
  -> AgentRunManager.createAgentRun
  -> runtime-specific AgentRunBackendFactory
  -> runtime-specific bootstrapper
  -> AgentDefinitionService + SkillService + ConfiguredAgentToolExposure
  -> runtime-specific tool/skill materialization
  -> runtime session/thread/process startup
```

Mixed-team member runtime creation is longer and lazy:

```text
GraphQL AgentTeamRunResolver.createAgentTeamRun
  -> TeamRunService.createTeamRun
  -> AgentTeamRunManager.createTeamRun
  -> MixedTeamRunBackendFactory / MixedTeamManager
  -> member receives input or inter-agent delivery
  -> MixedTeamMemberRegistry.getOrCreate
  -> MixedAgentMemberHandle.ensureReady
  -> build MemberTeamContext + AgentRunConfig
  -> AgentRunManager.createAgentRun
  -> runtime-specific backend bootstrapper
  -> runtime tool/MCP config materialization
  -> member runtime starts
```

Therefore the Agent Tools MCP session creation call site is not the HTTP route and not a generic top-level runtime adapter in isolation. The "adapter" is reached through the existing run creation spine: `AgentRunManager.createAgentRun()` selects the runtime-specific `AgentRunBackendFactory`, and that backend's bootstrapper/materializer is the place future AGY/Claude Code/Codex-external runtimes call `AgentToolMcpSessionService`. For team members, the same backend path is reached only after `MixedAgentMemberHandle.ensureReady()` builds `MemberTeamContext` and calls `AgentRunManager.createAgentRun()` for the member. That is the point where the server can bind sender identity, configured tools, session URL, token, and runtime-native config materialization.

Current code anchors for this call-site decision:

| Current Path | Evidence | Design Impact |
| --- | --- | --- |
| Standalone public creation | `api/graphql/types/agent-run.ts` -> `agent-execution/services/agent-run-service.ts` -> `agent-execution/services/agent-run-provisioning-service.ts` -> `agent-execution/services/agent-run-manager.ts` | External-process runtime MCP session creation is below `AgentRunManager`, not in GraphQL/Fastify. |
| Runtime factory selection | `AgentRunManager.createAgentRun()` calls `resolveBackendFactory(runtimeKind)` and then `backendFactory.createBackend(config, runId)` | A future AGY/Claude Code backend factory/bootstrapper is the production caller of the session service. |
| Team member activation | `agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts` builds `MemberTeamContext`, then calls `AgentRunManager.createAgentRun(memberRunConfig, memberRunId)` | Member-scoped MCP config must wait until the member sender/team context exists. |
| Current Codex materialization pattern | `CodexThreadBootstrapper.bootstrapInternal()` resolves configured exposure and builds dynamic tool specs before `CodexThreadManager.startRemoteThread()` | New external-process materializers should derive MCP config after configured exposure, before launch/start-turn. |
| Current Claude SDK materialization pattern | `ClaudeSessionBootstrapper.bootstrapInternal()` stores configured exposure; `ClaudeSession.executeTurn()` builds MCP server config/allowed tools before `sdkClient.startQueryTurn()` | Claude Code should be a separate external-process runtime kind consuming the hosted MCP descriptor, not a copy of Claude Agent SDK handlers. |
| Current `send_message_to` authority | `agent-communication/services/send-message-to-dispatcher.ts` | MCP tools/call must delegate to the dispatcher, not reimplement parse/route/deliver. |


## Intended Change

Introduce an **AutoByteus Agent Tools MCP Server**: a server-owned, runtime-neutral, session-scoped Streamable HTTP MCP endpoint that exposes configured AutoByteus agent tools to external process runtimes.

First implementation milestone:

1. Create a minimal in-memory `AgentToolMcpSession` subsystem.
2. Generate one canonical runtime MCP descriptor per session:

   ```ts
   {
     name: "autobyteus_agent_tools",
     transport: "streamable_http",
     serverUrl: "http://127.0.0.1:<port>/mcp/agent-tools/<sessionId>",
     headers: { Authorization: "Bearer <capabilityToken>" },
     enabledTools: ["send_message_to"]
   }
   ```

3. Derive `enabledTools` from:

   ```text
   configured AutoByteus tools for the bound agent/run
     ∩ tools supported by the Agent Tools MCP Server
   ```

4. Register `/mcp/agent-tools/:sessionId` in the existing Fastify app.
5. Implement MCP methods needed by current clients: `initialize`, `notifications/initialized`, `tools/list`, `tools/call`, `resources/list`, `resources/templates/list`, and `ping`.
6. Expose only `send_message_to` in v1, dispatched through the latest shared `SendMessageToDispatcher` / `agent-communication` path.
7. Keep existing AutoByteus/Codex/Claude Agent SDK surfaces working; do not force them to consume the HTTP MCP endpoint.
8. Provide a clean seam for future browser/media/task-delegation/publish-artifacts MCP adapters without implementing all of them now.

This design now treats runtime MCP config materialization as a first-class boundary. The central Agent Tools MCP Server owns the canonical descriptor and session capability; each runtime backend/materializer owns conversion from `AgentToolMcpDescriptor` into that runtime's native config shape. The first implementation milestone may still stop at the central server plus canonical descriptor unless the ticket is explicitly expanded, but the target design must reserve the correct file placement and dependency rules for Claude Agent SDK, Claude Code CLI, Codex App Server, Antigravity CLI, and future runtimes.

Materializer direction after Claude Agent SDK verification:

| Runtime Surface | MCP Config Capability | Preferred AutoByteus Materialization |
| --- | --- | --- |
| Claude Agent SDK | Supports programmatic `mcpServers`; project `.mcp.json` can load via `settingSources` | Build the MCP config object from `AgentToolMcpDescriptor` and pass it directly to `sdkClient.startQueryTurn({ mcpServers, allowedTools })`; no file for the per-run/session bearer config. |
| Claude Code CLI | Supports `--mcp-config`, `.mcp.json`, `claude mcp add-json`, local/user config | Generate an ephemeral `--mcp-config` file for the run/session; use project `.mcp.json` only for durable/shared non-secret config. |
| Codex App Server | Supports normal Codex MCP config layers / `-c` overrides, but current process reuse is cwd-keyed | Generate an ephemeral Codex config layer for that agent run/session. The materializer must isolate app-server process/config lifetime or otherwise prevent one run's session URL/token from leaking into another run sharing the same cwd-keyed app-server process. |
| Antigravity CLI | Supports workspace `.agents/mcp_config.json` with remote `serverUrl`; no better programmatic API is known | Materialize session-scoped Streamable HTTP config into runtime workspace `.agents/mcp_config.json`. |
| AutoByteus native runtime | Already has direct server-owned tool wrappers and external MCP client support | Do not force a localhost self-call in v1; future unification should reuse catalog/executor semantics without adding unnecessary HTTP loopback. |

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature plus enabling infrastructure and targeted refactor.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary/ownership issue plus duplicated policy/coordination risk.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, but targeted.
- Evidence: External runtimes need server-owned tools, but current runtime-specific surfaces are not the correct integration point for external process runtimes. Latest base already created `SendMessageToDispatcher`, reducing prior `send_message_to` duplication. Adding another runtime-specific `send_message_to` implementation would reintroduce duplication and bypass the current communication owner.
- Design response: Add a server-hosted MCP transport/session/catalog layer that delegates tool behavior to existing server-owned dispatch/services. For v1, route `send_message_to` through `SendMessageToDispatcher` with an MCP session-bound `AgentRunMessageSenderContext`.
- Refactor rationale: The MCP route must not become a business tool implementation. It should own protocol/session concerns only. Tool execution authority stays in `agent-communication` / domain services.
- Intentional deferrals and residual risk, if any: Browser/media/task-delegation/publish-artifacts MCP adapters are deferred. The first design includes catalog/definition seams so later adapters can be added without new transport/session architecture. MCP session persistence/restoration is deferred; v1 memory-only sessions intentionally expire on server restart.

## Terminology

- **AutoByteus Agent Tools MCP Server**: server-hosted MCP endpoint exposing AutoByteus-owned tools to external clients.
- **AgentToolMcpSession**: AutoByteus application-level session that binds one MCP endpoint URL/token to one agent run/sender/configured tool context.
- **MCP transport session**: optional protocol-level session represented by `MCP-Session-Id`; distinct from AutoByteus `:sessionId`.
- **Canonical MCP descriptor**: AutoByteus-internal config object returned to runtime adapters (`name`, `transport`, `serverUrl`, `headers`, `enabledTools`).
- **Runtime materialization**: runtime adapter turns the canonical descriptor into runtime-native config shape.
- **Configured-and-supported tools**: intersection of the agent's configured AutoByteus tool names and the MCP server's currently supported tool adapters.
- **Surface wrapper**: BaseTool, Codex dynamic tool, Claude SDK tool handler, or MCP tool adapter that maps a runtime/protocol shape to server-owned tool execution.

## Design Reading Order

1. Runtime-neutral MCP host spine.
2. Session/capability/configured-tool ownership.
3. `send_message_to` dispatch through current `agent-communication` owner.
4. Concrete file placement and migration sequence.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: do not add `/mcp/runtime-tools/*`, `runtime_tools`, or Antigravity-specific endpoint aliases.
- Keep existing AutoByteus/Codex/Claude Agent SDK tool surfaces, but do not implement new business logic inside them for this ticket.
- Do not add an MCP route that calls `AutoByteusSendMessageToTool` as a shortcut. The MCP route must use session/catalog/dispatcher boundaries.
- No global unauthenticated MCP endpoint that lists all tools.

## Data-Flow Spine Inventory

The spines are split by use case. The session/materialization spines are intentionally stretched to the initiating GraphQL/runtime creation path because that is where the runtime adapter is actually invoked.

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Standalone run creation / activation request | External process runtime launched with runtime-native MCP config | Runtime backend bootstrapper + `AgentToolMcpSessionService` | Shows where a future Claude Code/AGY standalone runtime should create the MCP session and materialize config. |
| DS-002 | Primary End-to-End | Team run creation plus lazy member activation | Team member external process runtime launched with member-scoped MCP config | Mixed team member handle + runtime backend bootstrapper + `AgentToolMcpSessionService` | Shows that team-member sessions need `MemberTeamContext` and sender identity before config is generated. |
| DS-003 | Primary End-to-End | External runtime MCP client `initialize` / `tools/list` | Runtime receives concrete MCP tool definitions | Agent Tools MCP Server + `AgentToolMcpCatalog` | Shows how a tools/list response is generated from session allowlist and supported tool definitions, not raw strings. |
| DS-004 | Primary End-to-End | External runtime model/tool call decision | AutoByteus communication delivery result returned to runtime | Agent Tools MCP Server + `SendMessageToDispatcher` | Executes `send_message_to` through current communication owner. |
| DS-005 | Primary End-to-End | Invalid/expired/tampered MCP request | MCP-compatible denial without domain dispatch | `AgentToolMcpSessionRegistry` + catalog | Makes unauthorized/unconfigured denial a first-class use case. |
| DS-006 | Return-Event | MCP tool execution lifecycle/result | Existing run/team event visibility path | Tool execution observer/event bridge | Keeps AutoByteus event visibility separate from MCP SSE transport. |
| DS-007 | Bounded Local | HTTP request on `/mcp/agent-tools/:sessionId` | JSON-RPC/SSE/HTTP response | Streamable HTTP route/dispatcher | Implements MCP transport behavior and client compatibility. |
| DS-008 | Bounded Local | Session creation | Session revoke/expiry/server restart | `AgentToolMcpSessionRegistry` | Enforces local-process isolation, configured-tool binding, and cleanup. |
| DS-009 | Bounded Local | Secret-bearing `AgentToolMcpDescriptor` returned to runtime backend | Runtime-native MCP config object/file consumed by the runtime with redaction/cleanup policy | Runtime-specific MCP config materializer | Prevents one generic config writer from hiding runtime-specific safety rules and prevents bearer token persistence/logging. |
| DS-010 | Bounded Local | Existing tool contract/manifest/schema source | MCP `tools/list` tool definition item | `AgentToolMcpCatalog` + definition providers + schema mapper | Makes schema construction explicit and prevents `tools/list` from returning raw allowlist strings. |
| DS-011 | Bounded Local | MCP `tools/call` for any supported AutoByteus tool | Existing server-owned tool/service result mapped back to MCP | `AgentToolMcpToolExecutor` + per-tool adapters | Defines how existing tools are refactored into MCP without wrapping one runtime surface inside another. |

## Primary Execution Spine(s)

### DS-001 Standalone External-Process Runtime MCP Materialization

```text
GraphQL AgentRunResolver.createAgentRun / prepare+activate
  -> AgentRunService.createAgentRun / activatePreparedRun
  -> AgentRunProvisioningService.activatePreparedRun
  -> AgentRunManager.createAgentRun
  -> AgentRunManager.resolveBackendFactory(runtimeKind)
  -> future external-process AgentRunBackendFactory.createBackend(config, runId)
  -> runtime bootstrapper resolves workspace + AgentDefinitionService + SkillService
  -> resolveConfiguredAgentToolExposure(agentDefinition)
  -> build AgentRunMessageSenderContext from runId + agent/runtime context
  -> AgentToolMcpSessionService.createSession(configured exposure + sender context + runtime kind)
  -> AgentToolMcpCatalog computes configured-and-supported tools
  -> AgentToolMcpSessionRegistry stores sessionId + token hash + enabledTools + context
  -> session service returns canonical AgentToolMcpDescriptor
  -> runtime-specific materializer writes/passes MCP config
  -> external runtime process launches / starts turn with that config
  -> external runtime MCP client later enters DS-003 tools/list
```

### DS-002 Mixed-Team Member External-Process Runtime MCP Materialization

```text
GraphQL AgentTeamRunResolver.createAgentTeamRun
  -> TeamRunService.createTeamRun
  -> AgentTeamRunManager.createTeamRun
  -> MixedTeamRunBackendFactory.createBackend
  -> MixedTeamManager.postMessage / deliverInterAgentMessage
  -> MixedTeamMemberRegistry.getOrCreate
  -> MixedAgentMemberHandle.postMessage / deliverInterMemberMessage
  -> MixedAgentMemberHandle.ensureReady
  -> MixedAgentMemberHandle.buildMemberRunConfig builds MemberTeamContext
  -> AgentRunManager.createAgentRun(member AgentRunConfig, memberRunId)
  -> AgentRunManager.resolveBackendFactory(member runtimeKind)
  -> future external-process AgentRunBackendFactory.createBackend(config, memberRunId)
  -> runtime bootstrapper resolves AgentDefinitionService + configured tools
  -> build AgentRunMessageSenderContext(memberRunId, memberName, runtimeKind, MemberTeamContext)
  -> AgentToolMcpSessionService.createSession(...)
  -> canonical AgentToolMcpDescriptor
  -> runtime-specific materializer writes/passes MCP config
  -> member external runtime process launches / receives turn
  -> member external runtime MCP client later enters DS-003 tools/list
```

### DS-003 MCP Tool List Generation

```text
Runtime-specific materializer from DS-001/DS-002 writes/passes config containing serverUrl + Authorization header
  -> external runtime process starts and loads MCP config
  -> runtime MCP client reads `autobyteus_agent_tools.serverUrl` and bearer header
  -> runtime MCP client POST `initialize` to `/mcp/agent-tools/:sessionId`
  -> Fastify AgentToolsMcpRoute validates Origin + auth + app session + protocol headers + HTTP shape
  -> AgentToolsMcpMethodDispatcher returns MCP initialize capabilities
  -> runtime MCP client optionally opens GET/SSE and sends `notifications/initialized`
  -> runtime MCP client POST `tools/list`
  -> Fastify AgentToolsMcpRoute
  -> AgentToolsMcpMethodDispatcher
  -> AgentToolMcpSessionRegistry.resolve(sessionId + bearer token + expiry/revocation)
  -> read session.enabledTools snapshot (created from configured-tools ∩ supported-tools)
  -> AgentToolMcpCatalog loads supported tool definitions
  -> filter definitions by session.enabledTools
  -> per-tool definition provider builds canonical definition (v1: send_message_to name/description/schema)
  -> AgentToolsMcpSchemaMapper converts canonical/input schema to MCP tool schema
  -> dispatcher returns `{ tools: [...] }`
  -> runtime registers available tool definitions for the model
```

### DS-004 MCP `send_message_to` Tool Call

```text
External runtime model selects send_message_to
  -> runtime MCP client POST tools/call
  -> Fastify AgentToolsMcpRoute
  -> AgentToolsMcpMethodDispatcher
  -> AgentToolMcpSessionRegistry.resolve(sessionId + bearer token)
  -> AgentToolMcpCatalog.canCall(session, "send_message_to")
  -> AgentToolMcpToolExecutor.executeSendMessageTo(session.sender, raw arguments)
  -> SendMessageToDispatcher.dispatch
  -> parse/validate target/content/reference_files
  -> target_agent_run_id path: GlobalAgentRunMessageRouter.deliver
     OR recipient_name path: MemberTeamContext.deliverInterAgentMessage
  -> AgentOperationResult
  -> AgentToolsMcpResultMapper maps to MCP content/error result
  -> runtime receives tool result and continues turn
```

### DS-005 Unauthorized / Unconfigured Request Denial

```text
External/local process sends MCP request
  -> Fastify AgentToolsMcpRoute
  -> OPTIONS preflight path
     -> CORS/preflight response without app-session resolution
  OR any non-OPTIONS request
     -> Origin validation
     -> Authorization header extraction
     -> AgentToolMcpSessionRegistry.resolve(sessionId + bearer token + expiry/revocation)
     -> MCP-Protocol-Version / content negotiation / JSON-RPC parse validation
  -> missing/malformed bearer token
     -> 401, no server identity/catalog/tool dispatch
  OR unknown/expired/revoked session OR token mismatch
     -> 404 redacted session-not-found response, no server identity/catalog/tool dispatch
  OR invalid Origin / unacceptable content / unsupported protocol version / malformed JSON
     -> protocol HTTP/JSON-RPC error, no catalog/tool dispatch
  OR valid session but requested tool not in session.enabledTools
     -> catalog denial response, no SendMessageToDispatcher call
```

## Return Or Event Spine(s)

### DS-006 Tool Lifecycle/Event Projection

```text
MCP tool call adapter
  -> ToolExecutionObserver / event hook
  -> Existing AgentRun/TeamRun event projection
  -> WebSocket/history/external callback consumers
```

V1 should document or implement a small observer hook around MCP tool execution. It must not turn MCP SSE into the primary AutoByteus event bus. Tool results still return via POST JSON-RPC for current request/response tools.

## Bounded Local / Internal Spines

### DS-007 Streamable HTTP Dispatch

Parent owner: `AgentToolsMcpRoute` / transport boundary.

```text
HTTP request
  -> route method guard / origin-header policy
  -> sessionId param extraction
  -> authorization header extraction
  -> MCP protocol version / optional MCP-Session-Id handling
  -> JSON-RPC parse or SSE setup
  -> method dispatch
  -> JSON/SSE/empty HTTP response
```

DS-007 owns transport gatekeeping before any MCP method returns server identity, tools, resources, ping, SSE, or DELETE behavior. V1 rule: every non-`OPTIONS` request validates AutoByteus app `:sessionId`, bearer token, expiry/revocation, Origin policy, and protocol/content expectations before method dispatch. `OPTIONS` is the only unauthenticated path and exists only for CORS/preflight behavior.

### DS-007 Protocol / Auth / Status Matrix

| Request Class | Owner | Validation Order | Success Behavior | Failure Behavior |
| --- | --- | --- | --- | --- |
| `OPTIONS /mcp/agent-tools/:sessionId` | `AgentToolsMcpRoute` | Origin/preflight policy only; no app-session resolution | CORS/preflight response (`204` or configured Fastify preflight status) | Invalid Origin -> `403` |
| Unsupported HTTP method | `AgentToolsMcpRoute` | Origin -> auth syntax -> registry resolve -> method guard; no JSON-RPC dispatch | N/A | With valid auth/session, `405 Method Not Allowed` with no tool dispatch. If auth/session fails, return the standard auth/session error first. |
| Any non-`OPTIONS` request with invalid `Origin` | `AgentToolsMcpRoute` | Check before auth/session to block browser rebinding | N/A | `403 Forbidden`; no session/catalog/tool dispatch |
| Any non-`OPTIONS` request missing/malformed `Authorization: Bearer ...` | `AgentToolsMcpRoute` | Origin -> auth syntax | N/A | `401 Unauthorized` with redacted body; no session/catalog/tool dispatch |
| Any non-`OPTIONS` request with unknown/expired/revoked session or token mismatch | `AgentToolMcpSessionRegistry` via route/dispatcher | Origin -> auth syntax -> registry resolve | N/A | `404 Not Found` redacted as session unavailable; do not reveal whether session ID or token was wrong |
| `POST` wrong `Content-Type` | `AgentToolsMcpRoute` | Origin -> auth/session -> content type | N/A | `415 Unsupported Media Type` |
| `POST` unacceptable `Accept` header | `AgentToolsMcpRoute` | Origin -> auth/session -> content type -> accept | N/A | `406 Not Acceptable`; POST clients should accept JSON, and Streamable HTTP clients may also advertise SSE |
| Unsupported or malformed `MCP-Protocol-Version` | `AgentToolsMcpRoute` / method dispatcher | Origin -> auth/session -> headers | N/A | `400 Bad Request` with JSON-RPC invalid request shape when possible |
| Missing `MCP-Protocol-Version` | `AgentToolsMcpRoute` | Origin -> auth/session -> headers | Treat as compatible fallback (`2025-03-26`) for v1 because no transport-session state is emitted | If later unsupported by implementation, fail as unsupported version before method dispatch |
| `POST initialize` JSON-RPC request | Method dispatcher | Route gate -> parse JSON-RPC -> method dispatch | `200 application/json` MCP initialize result; includes capabilities for tools and no `MCP-Session-Id` header in v1 | Invalid params -> JSON-RPC `-32602`; internal failure -> `-32603` |
| `POST notifications/initialized` notification | Method dispatcher | Route gate -> parse JSON-RPC notification | `202 Accepted` with no body | Malformed JSON -> parse error; invalid transport gate -> HTTP error above |
| Other valid JSON-RPC notification or client response | Method dispatcher | Route gate -> parse JSON-RPC | `202 Accepted` with no body; ignored unless explicitly supported | Malformed JSON -> parse error; invalid transport gate -> HTTP error above |
| `POST tools/list` | Method dispatcher + catalog | Route gate -> parse -> catalog list | `200 application/json` with `{ tools: [...] }` from DS-010 | Catalog/provider failure -> JSON-RPC `-32603`; auth/session failure handled before dispatch |
| `POST tools/call` unknown tool name | Catalog / result mapper | Route gate -> valid JSON-RPC request envelope -> catalog exact-name lookup | N/A | `200 application/json` JSON-RPC error `-32602 Invalid params` with redacted message such as `Unknown MCP tool`; no MCP tool result and no domain dispatch |
| `POST tools/call` unconfigured tool | Catalog / result mapper | Route gate -> valid JSON-RPC request envelope -> session allowlist check | N/A | `200 application/json` JSON-RPC error `-32602 Invalid params` with redacted message such as `Tool is not enabled for this session`; no MCP tool result and no domain dispatch |
| `POST tools/call` semantic/tool failure | Tool executor / result mapper | Route gate -> catalog -> owning dispatcher/service | `200 application/json` MCP tool result with `isError: true` / text content when the tool ran and rejected semantically | Transport/protocol errors stay JSON-RPC errors; unexpected executor crash -> JSON-RPC `-32603` with redacted message |
| `POST resources/list` / `resources/templates/list` | Method dispatcher | Route gate -> parse -> method dispatch | `200 application/json` with empty list result | Invalid params -> `-32602` |
| `POST ping` | Method dispatcher | Route gate -> parse -> method dispatch | `200 application/json` empty ping result | Invalid params -> `-32602` |
| `POST` unknown JSON-RPC method | Method dispatcher | Route gate -> parse -> method dispatch | N/A | JSON-RPC `-32601 Method not found` |
| `POST` malformed JSON | Method dispatcher / route parser | Route gate if headers/auth can be read -> JSON parse | N/A | `400` with JSON-RPC `-32700 Parse error`, `id: null` |
| `POST` invalid JSON-RPC envelope | Method dispatcher | Route gate -> JSON parse -> envelope validation | N/A | Gross envelope failure before a valid request/notification/response object exists -> `400` with JSON-RPC `-32600 Invalid Request`, `id` copied only if safely inferable, otherwise `null`. Valid request envelope with invalid method params is not this row; method rows return `200` JSON-RPC `-32602`. |
| `GET` with valid auth/session and acceptable SSE `Accept` | `AgentToolsMcpRoute` | Origin -> auth/session -> `Accept: text/event-stream` | `200 text/event-stream`; v1 may keep compatibility stream open or send keepalive/no event payloads | If SSE unsupported by implementation build, `405` is allowed, but this design requires compatibility because target clients opened GET/SSE in probes |
| `GET` unacceptable `Accept` | `AgentToolsMcpRoute` | Origin -> auth/session -> accept | N/A | `406 Not Acceptable` |
| `DELETE` | `AgentToolsMcpRoute` / session registry | Origin -> auth/session | V1 returns `405 Method Not Allowed` after auth/session validation; it does not revoke AutoByteus app session because v1 does not issue MCP transport sessions | Auth/session failures use standard auth/session errors; app revocation remains `revokeAgentToolMcpSession` / run lifecycle owned |

### DS-007 `MCP-Session-Id` Decision

V1 does **not** emit or require the MCP transport `MCP-Session-Id` header. AutoByteus already has an application-level `:sessionId` in the endpoint URL, and that app session is bound to bearer token, run/member context, configured tools, TTL, and revocation. Adding an MCP transport session ID in v1 would create a second session lifecycle without a current need.

Consequences:

- `initialize` responses do not include `MCP-Session-Id`.
- Incoming `MCP-Session-Id` headers, if present, are ignored for identity and never replace app `:sessionId` + bearer token validation.
- `DELETE` does not revoke app `AgentToolMcpSession`; it returns `405` after auth/session validation.
- If future implementation emits `MCP-Session-Id`, the design must be revised to add transport-session storage, validation, protocol-version association, invalid-session `404`, and DELETE close semantics.

### DS-007 Protocol Version Policy

- Supported v1 values: absent header fallback, `2025-03-26`, `2025-06-18`, and `2025-11-25`, all using the same minimal tool-only behavior unless the SDK/server transport requires narrower support.
- Missing header is treated as the spec fallback version and must not bypass auth/session validation.
- Malformed or unsupported values fail before method dispatch.
- The negotiated/effective version is a request-local transport fact in v1, not persisted in `AgentToolMcpSession` because no MCP transport session is emitted.

### DS-007 Error Classification

- HTTP errors are for transport gate failures before JSON-RPC method execution: invalid Origin, missing/malformed auth, unresolved app session/token, content negotiation, unsupported media type, unsupported HTTP method, and unsupported protocol version.
- JSON-RPC errors are for malformed JSON-RPC or protocol method failures after route gate validation: parse error, invalid request, unknown method, invalid params, unknown tool, unconfigured tool, and unexpected internal failure.
- MCP tool `isError` results are only for semantic failures after the requested tool name was known, enabled for the session, and dispatched to the owning tool service/dispatcher.
- Raw bearer tokens, raw descriptor headers, internal stack traces, account metadata, and full materialized config contents must never appear in any HTTP/JSON-RPC/MCP error body.

### DS-008 Session Lifecycle

Parent owner: `AgentToolMcpSessionRegistry`.

```text
create in-memory session
  -> generate random sessionId + raw token
  -> store token hash + context + enabledTools + expiry
  -> resolve per request
  -> validate token/tool/context
  -> revoke by run cleanup or explicit service call
  -> expire by TTL
  -> clear on server restart
```

V1 session granularity: one `AgentToolMcpSession` is created per external runtime run/member runtime session, not per individual tool call. A turn ending does not revoke the app session. The runtime backend/materializer must recreate a fresh session/descriptor when it launches a new external runtime process or when an existing session is unavailable/expired before a future turn. Native AutoByteus-only runtimes do not need an HTTP self-call.

### DS-008 Session Lifetime / Revocation / Restore Policy

| Lifecycle Event | Owning Boundary | V1 Outcome | Runtime / Client Consequence | Required Check |
| --- | --- | --- | --- | --- |
| Session creation | `AgentToolMcpSessionService` + registry | Create app session with random session ID, raw token returned once in secret descriptor, token hash stored, enabledTools snapshot stored, sender context bound, expiry set | Runtime materializer receives descriptor and configures external MCP client | Unit test session creation stores no raw token |
| Successful authenticated MCP request | Registry/route | Validate token hash, expiry, revocation; optionally refresh sliding expiry if configured | Active runtime can continue using same descriptor until run cleanup/TTL/restart | Route integration covers repeated list/call |
| Active turn end | Runtime backend | Do **not** revoke app session by default | External runtime/session can continue if process spans turns; next turn can reuse if still valid | Unit/integration test documents no turn-end revoke |
| Normal standalone run close / cleanup | `AgentRunManager` or backend cleanup hook calling `revokeAgentToolMcpSession` | Revoke all MCP sessions owned by that run | Stale generated config receives session-unavailable response on later use | Cleanup test asserts revoked session cannot list/call |
| Mixed-team member deactivation / member backend cleanup | `MixedAgentMemberHandle` / member backend cleanup hook calling `revokeAgentToolMcpSession` | Revoke sessions owned by that member run | Recreated member must create a new session/descriptor before launching/continuing external runtime | Mixed member cleanup/recreate test |
| Direct `revokeAgentToolMcpSession(sessionId)` | Session service/registry | Mark revoked and remove or deny future resolves | Any stale client request gets redacted session-unavailable response | Unit test revoke behavior |
| TTL expiry | Registry cleanup / resolve path | Expired session resolves as unavailable; no automatic reuse of old token | Runtime backend must call session service again and rematerialize config before continuing | Expired-session route tests |
| Server restart | Process memory boundary | All in-memory sessions disappear; old generated configs are stale | Restored runs/team members must create fresh sessions and rewrite/pass fresh runtime config before tool use | Restart/restore note plus stale config test if feasible |
| Restored standalone run | Restore path / runtime backend bootstrapper | Create a new session after agent definition/configured exposure and sender context are reconstructed | Fresh descriptor replaces stale config; old config fails with unavailable session | Restore path design check / test fixture |
| Restored mixed-team member | `MixedAgentMemberHandle.ensureReady()` after restore | Create a new session after `MemberTeamContext` exists | Fresh member-scoped descriptor; team-local delivery remains bound to restored member context | Mixed restore design check / test fixture |
| Client `DELETE` | MCP route | V1 validates auth/session then returns `405`; app session is not revoked | Clients that send DELETE as transport cleanup do not accidentally kill run-scoped app session | Route test for valid DELETE and invalid auth DELETE |
| Stale bearer config attempt | Route + registry | Missing/expired/revoked session/token mismatch denied before server identity/tools/resources/ping/SSE | No domain tool behavior occurs | Route tests for stale URL/token |

Implementation placement for cleanup hooks:

- The session service should expose owner-based revocation APIs in addition to single-session revoke, for example `revokeAgentToolMcpSessionsForRun(runId)` and, if needed, `revokeAgentToolMcpSessionsForMemberRun(memberRunId)` or an equivalent owner identity. This prevents runtime backends from storing individual session IDs in persistent run history only for cleanup.
- Runtime backends may hold raw descriptors only in memory long enough to materialize runtime config. Persistent run state should store at most redacted session metadata or owner identity, never raw bearer headers.
- If a future runtime requires per-turn sessions instead of per-run sessions, that runtime materializer must call the session service per turn and own cleanup of the prior materialized config; that is a runtime-specific extension, not the v1 default.

### DS-009 Runtime MCP Config Materialization

Parent owner: the runtime-specific backend/bootstrapper/materializer selected by `AgentRunManager`.

```text
AgentToolMcpSessionService returns AgentToolMcpDescriptor
  -> runtime-specific materializer consumes descriptor only, not registry internals
  -> Claude Agent SDK materializer maps descriptor to query options `{ mcpServers, allowedTools }`
     OR Claude Code CLI materializer writes generated ephemeral `--mcp-config`
     OR Codex App Server materializer creates an ephemeral per-run/session config layer with process/config isolation
     OR Antigravity CLI materializer writes workspace `.agents/mcp_config.json`
  -> runtime launch/start-turn consumes the native MCP config
```

This is a bounded local spine under each runtime backend. It does not replace DS-001/DS-002; it explains the final conversion step after the central MCP session service has done the authoritative session/tool/capability work.

### Secret-Bearing Descriptor Policy

`AgentToolMcpDescriptor` is not a normal loggable DTO. It is a runtime-only, secret-bearing value because it contains `headers.Authorization: Bearer <raw capability token>`.

Required shape:

```ts
type AgentToolMcpDescriptor = {
  name: "autobyteus_agent_tools";
  transport: "streamable_http";
  serverUrl: string;              // contains app session ID
  headers: { Authorization: string }; // raw bearer token; secret
  enabledTools: string[];
};

type RedactedAgentToolMcpDescriptor = {
  name: "autobyteus_agent_tools";
  transport: "streamable_http";
  serverUrl: string;              // session ID redacted or fingerprinted
  headers: { Authorization: "Bearer <redacted>" };
  enabledTools: string[];
};
```

Rules:

- The session registry stores only token hash, session metadata, enabled tools, owner identity, expiry, and sender context. It never stores the raw token.
- The raw descriptor may be returned from `AgentToolMcpSessionService.createSession(...)` only to the immediate runtime backend/materializer caller.
- Raw descriptor values must not be written to run history, `AgentRunContext`, team event payloads, websocket events, durable handoff artifacts, logs, or serialized platform state.
- Any debug/log/event view must call `redactAgentToolMcpDescriptor(...)` or equivalent and must redact both bearer token and session ID by default. If a diagnostic session fingerprint is useful, use a short hash/fingerprint that cannot reconstruct the session URL.
- Error messages must never echo request `Authorization`, descriptor headers, raw materialized config contents, or full secret-bearing URLs.
- Tests must cover redaction and no raw-token persistence at the session service/registry boundary.

Materialized-file rules, even for deferred production materializers:

| Runtime Materializer | Secret Handling Policy |
| --- | --- |
| Claude Agent SDK | Prefer programmatic `mcpServers`/`allowedTools`; no file by default. Raw descriptor lives only in memory for the turn/session startup path. |
| Claude Code CLI | Generated `--mcp-config` must be ephemeral, private to the run/session, file mode `0600` where supported, outside repository-tracked paths, redacted in logs, and deleted on run cleanup/revoke/TTL best effort. |
| Codex App Server | Prefer per-run/session launch override or isolated temp config with dedicated process/config context. Never inject a bearer token into a reused cwd-keyed app-server process without isolation. Cleanup temp config on process/session cleanup. |
| Antigravity CLI | Workspace `.agents/mcp_config.json` is workspace-resident and therefore highest leak risk. The AGY materializer must own rewrite/removal on run cleanup/revoke, token redaction in logs, conflict handling, and repository-state exclusion before production use. |
| Project `.mcp.json` / durable config | Not default for per-run bearer tokens. If intentionally used, it requires explicit approval, cleanup ownership, and token redaction/exclusion policy. |

Good shape:

```text
createSession -> raw descriptor in local variable -> materializer writes/passes config -> logger receives redacted descriptor only
```

Bad shape:

```text
createSession -> store descriptor in run history / event payload / handoff artifact / untracked project config without cleanup
```

### DS-010 Tool Definition / Schema Projection

```text
Existing tool contract / manifest / parameter schema source
  -> per-tool AgentToolMcpDefinitionProvider reads the server-owned name + description + input schema
  -> provider returns canonical AgentToolMcpSupportedToolDefinition
  -> AgentToolMcpCatalog indexes supported definitions by exact tool name
  -> tools/list reads session.enabledTools from DS-003
  -> catalog filters supported definitions by the session allowlist
  -> AgentToolsMcpSchemaMapper normalizes existing schema shape into MCP `inputSchema`
  -> AgentToolsMcpMethodDispatcher returns `{ tools: [{ name, description, inputSchema }] }`
```

This is a bounded local spine under `AgentToolMcpCatalog`. It is intentionally separate from DS-003: DS-003 shows the full client request path, while DS-010 shows how each returned tool definition is built. The important rule is that `tools/list` is not `enabledTools.map(name)`. It is `session allowlist ∩ supported definition providers -> MCP tool definitions`.

V1 source mapping:

- `send_message_to` name/description/schema come from the current send-message contract/schema files (`SEND_MESSAGE_TO_TOOL_NAME`, `SEND_MESSAGE_TO_TOOL_DESCRIPTION`, and the existing send-message parameter schema builder/contract). If implementation discovers that the current schema is still trapped inside a runtime wrapper, extract only the schema/contract into `agent-communication` or another server-owned contract file rather than making the MCP catalog depend on `AutoByteusSendMessageToTool`.

Future source mapping:

- Browser tools: read from `agent-tools/browser/browser-tool-manifest.ts` and `browser-tool-parameter-schemas.ts`.
- Media tools: read from `agent-tools/media/media-tool-manifest.ts` and `media-tool-parameter-schemas.ts`.
- Task-delegation tools: read from `agent-tools/task-delegation/task-delegation-tool-manifest.ts` and `task-delegation-tool-parameter-schemas.ts`.
- Publish-artifacts tool: extract or reuse a server-owned contract/schema from the published-artifacts tool/contract files before exposing it through MCP; do not make the MCP catalog instantiate a `BaseTool` wrapper only to read schema.

### DS-011 Existing Tool Call Adapter Refactor

```text
MCP tools/call with supported tool name
  -> AgentToolMcpSessionRegistry.resolve(sessionId + bearer token)
  -> AgentToolMcpCatalog.canCall(session, toolName)
  -> AgentToolMcpToolExecutor selects a per-tool MCP adapter by exact tool name
  -> adapter maps raw MCP arguments + AgentToolMcpExecutionContext into existing server-owned dispatcher/service input
  -> existing domain dispatcher/service validates semantic rules and performs behavior
  -> adapter receives AgentOperationResult / canonical tool result
  -> AgentToolsMcpResultMapper emits MCP content/error shape
```

This is the refactor path for existing tools. The MCP executor is a surface adapter, not a second implementation. Existing runtime surfaces may continue to exist, but they should either already share the same server-owned dispatcher/service or be migrated toward it as each tool family is added to MCP.

V1 `send_message_to` adapter:

- Allowed only when session exposure contains `send_message_to`.
- Builds/uses the session-bound `AgentRunMessageSenderContext`.
- Delegates to `SendMessageToDispatcher.dispatch(...)`.
- Does not call `AutoByteusSendMessageToTool._execute`, the Codex dynamic tool registration, the Claude SDK handler, `GlobalAgentRunMessageRouter`, or `MemberTeamContext` directly.
- Lets `SendMessageToDispatcher` own target-selector parsing, validation, direct run routing, team-local delivery, and result shaping.

Future adapter requirements:

- Browser/media/task-delegation/publish-artifacts adapters must be added per tool family with the same pattern: definition provider + executor adapter + existing owning service/dispatcher + result mapper.
- If a tool family currently has validation or schema logic only inside a runtime wrapper, the implementation must extract the reusable contract/schema into that tool family before exposing it through MCP.
- Approval, auto-execution, and event behavior must be explicit adapter context/hook behavior; it must not be hidden in the transport route or copied from one runtime wrapper.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A standalone external-process runtime is launched from the existing agent-run creation path. Its backend bootstrapper resolves the agent definition and configured tool exposure, creates an MCP session, receives a canonical descriptor, materializes runtime-native config, and launches the runtime. | GraphQL resolver, AgentRunService, AgentRunManager, runtime backend factory/bootstrapper, session service, runtime materializer | Runtime backend bootstrapper + session service | Workspace resolution, skill materialization, internal base URL, token generation |
| DS-002 | A mixed-team member is lazily activated after a team run starts. The member handle builds `MemberTeamContext`, then the member runtime backend creates an MCP session bound to that member sender context before launching the external process. | TeamRunService, AgentTeamRunManager, MixedTeamManager, MixedAgentMemberHandle, AgentRunManager, runtime bootstrapper, session service | Mixed member handle + runtime backend bootstrapper + session service | Member route identity, parent boundary, task-agent identity, configured tools |
| DS-003 | A runtime client asks the MCP server for tools. The route first passes DS-007 auth/protocol gate, then the server reads the session allowlist, gets supported definitions from the catalog, maps schemas, and returns concrete MCP tool definitions. | MCP route, method dispatcher, session registry, catalog, schema mapper | Agent Tools MCP Server + catalog | Protocol version, SSE compatibility, empty resources |
| DS-004 | A runtime calls `send_message_to`. The MCP layer validates access, delegates to the MCP tool adapter, which calls `SendMessageToDispatcher`; the dispatcher handles parse/validate/direct-or-team delivery and returns a result mapped back to MCP. | MCP route, session registry, catalog, tool executor, `SendMessageToDispatcher`, communication services | MCP server for access/protocol; `SendMessageToDispatcher` for tool behavior | Result mapping, event observer, reference-file validation |
| DS-005 | A local process with a bad token/session, invalid protocol/auth headers, or an edited config tries to access the endpoint. The route/registry/catalog reject before identity, list, ping, SSE, DELETE, or domain dispatch is reached. | Route, session registry, catalog | Route + session registry/catalog | Redacted errors, audit/log policy |
| DS-006 | Tool execution lifecycle can be projected to existing event consumers through an observer; MCP SSE remains transport compatibility. | Tool executor, event observer, existing event sinks | Existing event owners | Event redaction/mapping |
| DS-007 | One HTTP endpoint handles Streamable HTTP request/SSE/notification behavior using the explicit protocol/auth/status matrix and delegates only after route gate validation. | HTTP route, method dispatcher | MCP transport boundary | Origin policy, JSON-RPC errors, protocol version, no v1 MCP-Session-Id |
| DS-008 | Session registry owns memory session state from creation through run/member cleanup, explicit revoke, TTL expiry, stale config denial, and restart/restore recreation. | Session service, registry, runtime cleanup hooks | Session registry | Clock, random IDs/tokens, hash comparison, owner-based revocation |
| DS-009 | A runtime backend converts the secret-bearing descriptor into the runtime's MCP config shape without bypassing session/catalog ownership and without logging/persisting the raw bearer token. | Runtime backend/bootstrapper/materializer, descriptor | Runtime-specific materializer | Temp files, project config conflict handling, app-server process isolation, redaction/cleanup |
| DS-010 | A catalog definition provider converts existing server-owned tool contracts/manifests/schema builders into canonical MCP-supported definitions, then the schema mapper emits MCP `inputSchema` for `tools/list`. | Tool contract/manifest/schema source, definition provider, catalog, schema mapper | Agent Tools MCP Server catalog | Existing tool schema sources, schema normalization, unsupported-tool filtering |
| DS-011 | The MCP executor selects a per-tool adapter and delegates behavior to the existing owning service/dispatcher, starting with `SendMessageToDispatcher` for `send_message_to`. | Method dispatcher, catalog, tool executor, per-tool adapter, existing service/dispatcher, result mapper | Tool executor + existing tool-family owner | Approval/event hooks, result mapping, context binding |

## Spine Actors / Main-Line Nodes

- `AgentRunResolver` / `AgentRunService` / `AgentRunProvisioningService`: public standalone run creation/activation facades; they do not own MCP config, but they lead to the runtime backend call site.
- `AgentRunManager`: active-run owner and runtime factory selector. It is where a future runtime kind reaches its backend factory, but it should not materialize MCP config itself.
- Runtime-specific backend factory/bootstrapper/materializer: production caller of `AgentToolMcpSessionService` for external-process runtimes; owns runtime-native config/process launch, not tool behavior.
  - Claude Agent SDK materializer passes `{ mcpServers, allowedTools }` programmatically.
  - Claude Code CLI materializer writes generated ephemeral `--mcp-config`.
  - Codex App Server materializer builds an ephemeral per-run/session Codex config layer and must handle cwd-keyed process reuse.
  - Antigravity CLI materializer writes runtime workspace `.agents/mcp_config.json` because no better programmatic API is known.
- `TeamRunService` / `AgentTeamRunManager` / `MixedTeamManager`: top-level mixed-team creation and delivery owners that eventually activate member runs.
- `MixedAgentMemberHandle`: lazy member-run activation owner; creates `MemberTeamContext` before delegating to `AgentRunManager`.
- `AgentToolMcpSessionService`: internal API for creating/revoking sessions and generating canonical descriptors.
- `ConfiguredAgentToolExposure`: current source for the agent's configured AutoByteus tools.
- `AgentToolMcpCatalog`: owns supported MCP tool definitions and filters them by session allowlist.
- Per-tool MCP definition providers: read existing server-owned tool contracts/manifests/schema builders and produce canonical `AgentToolMcpSupportedToolDefinition` objects.
- `AgentToolMcpSessionRegistry`: owns in-memory session lifecycle, token hash validation, expiry, revocation, and bound sender context.
- `AgentToolsMcpRoute`: Fastify route boundary for `/mcp/agent-tools/:sessionId`.
- `AgentToolsMcpMethodDispatcher`: JSON-RPC/MCP method handler if SDK transport does not fully own dispatch.
- `AgentToolMcpToolExecutor`: MCP-facing dispatch adapter for supported tools; for v1, maps `send_message_to` to `SendMessageToDispatcher`.
- `SendMessageToDispatcher`: current authoritative shared dispatch path for `send_message_to` argument parsing, validation, direct routing, team-local delivery, and result shaping.
- Agent Communication / Team delivery services: authoritative delivery and event behavior.

## Ownership Map

| Node | Ownership |
| --- | --- |
| Runtime-specific backend factory/bootstrapper/materializer | Process lifecycle, workspace setup, skills/materialized MCP config, stdout/event parsing, restoration. Called from `AgentRunManager` after runtime-kind selection. Must not own server-tool behavior. |
| Runtime MCP config materializer | Conversion from secret-bearing `AgentToolMcpDescriptor` to one runtime-native MCP config shape. Owns temp-file/project-file/process-config safety, redaction, and cleanup for that runtime only. |
| `AgentRunManager` | Runtime-kind selection and active-run registration; deliberately not the owner of MCP descriptor internals. |
| `MixedAgentMemberHandle` | Lazy member activation and `MemberTeamContext` construction before member runtime creation. |
| `AgentToolMcpSessionService` | Creation/revocation API, derivation of configured-and-supported tools, secret descriptor generation, redacted descriptor projection, and owner-based revoke entrypoints. |
| `ConfiguredAgentToolExposure` | Existing classification of configured AutoByteus tool names by tool family. |
| `AgentToolMcpCatalog` | Supported MCP tool definitions and session-filtered list/call allowlist. |
| Per-tool MCP definition providers | Definition projection from existing server-owned contract/manifest/schema sources into canonical MCP-supported tool definitions. |
| `AgentToolMcpSessionRegistry` | In-memory app session state, token hash, expiry/revocation, sender context, tool allowlist, owner identity, and stale-session denial. |
| `AgentToolsMcpRoute` | Fastify HTTP entrypoint, accepted methods, route params, Origin policy, all non-OPTIONS auth/session gate, protocol-version/content negotiation, and SSE/DELETE behavior. |
| `AgentToolsMcpMethodDispatcher` | MCP JSON-RPC method mapping, notification handling, protocol response behavior, and protocol-vs-tool error classification; no tool business logic. |
| `AgentToolMcpToolExecutor` | Thin MCP-to-tool dispatch adapter and canonical result mapping; no independent communication state. |
| `SendMessageToDispatcher` | Canonical `send_message_to` parsing, validation, routing, and delivery result behavior. |
| Existing event owners | Run/team event visibility; MCP SSE is not the AutoByteus event pipeline. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `AutoByteusSendMessageToTool` | `SendMessageToDispatcher` | Native AutoByteus `BaseTool` surface | MCP transport or separate delivery policy |
| Codex dynamic `send_message_to` registration | `SendMessageToDispatcher` | Current Codex App Server dynamic-tool surface | Server-hosted MCP session or separate delivery behavior |
| Claude Agent SDK `ClaudeSendMessageToolCallHandler` | `SendMessageToDispatcher` + Claude event/approval mapper | Current in-process Claude Agent SDK surface | External Claude Code runtime config or independent delivery state |
| MCP `tools/call` adapter | `AgentToolMcpSessionRegistry` + `AgentToolMcpCatalog` + `SendMessageToDispatcher` | External process runtime MCP surface | Tool behavior outside current communication owner |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `/mcp/runtime-tools/*` naming/design | `runtime` is ambiguous in AutoByteus and implies runtime-owned tools | `/mcp/agent-tools/:sessionId`, `autobyteus_agent_tools` | In This Change | Do not add alias. |
| Any unauthenticated global MCP tools endpoint | Would expose tools without run/config/session context | `AgentToolMcpSession` + bearer token | In This Change | Endpoint must be session-scoped. |
| MCP route calling `AutoByteusSendMessageToTool` | Would use one surface wrapper from another surface and bypass the shared communication boundary | `AgentToolMcpToolExecutor` -> `SendMessageToDispatcher` | In This Change | Native tool remains for native runtime. |
| Duplicate HTTP-specific `send_message_to` parser/delivery implementation | Would reintroduce duplicated policy | Existing `SendMessageToDispatcher` | In This Change | Add only MCP mapping around dispatcher. |
| MCP catalog deriving schema by instantiating runtime wrappers | Would couple one surface to another and hide schema ownership | Per-tool definition provider reading server-owned contract/schema sources | In This Change for `send_message_to`; follow-up for future families | Extract reusable schema/contract first if a future family lacks one. |
| Persistent session storage for v1 | Not needed for local-first first milestone and would keep stale access alive across restarts | In-memory `AgentToolMcpSessionRegistry` | Deferred / rejected for v1 | Can be revisited only for restored-runtime requirements. |
| Browser/media/task/publish MCP adapters | Not mandatory for first milestone | Future per-family MCP adapters through catalog | Follow-up | Do not block v1 `send_message_to`. |

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Internal base URL resolver | DS-001, DS-002 | Session service | Build loopback `serverUrl` from existing server endpoint config | Reuse current URL authority | Runtime adapters duplicate URL construction |
| Capability token generator/hasher | DS-001, DS-002, DS-003, DS-004, DS-005, DS-008 | Session registry | Generate raw token once, store hash, compare safely, redact logs | Local-process isolation | Route logs/sees raw secrets as durable state |
| Configured-and-supported tool resolver | DS-001, DS-002, DS-003, DS-005 | Session service/catalog | Intersect agent configured tools with MCP-supported tool adapters | Prevent overexposure | Runtime config materializer invents tools |
| Protocol/auth gate matrix | DS-003, DS-005, DS-007 | Route/method dispatcher | Apply exact Origin/auth/session/protocol/content/error behavior before method dispatch | Security and client compatibility | Implementation invents inconsistent status/error behavior |
| Descriptor redactor | DS-001, DS-002, DS-006, DS-009 | Session service/materializers/event owners | Convert secret-bearing descriptor/config data into safe log/event/debug views | Prevent token leakage | Raw bearer headers leak into logs/history/events |
| Runtime MCP config materializers | DS-001, DS-002, DS-009 | Runtime-specific backend/bootstrapper | Convert secret descriptor to Claude SDK query options, Claude Code `--mcp-config`, Codex ephemeral config, AGY `.agents/mcp_config.json`, or future runtime shapes; own cleanup/redaction | Runtime-specific concern | Tool behavior leaks into runtime adapters or one generic materializer hides process/config isolation rules/token cleanup |
| MCP definition providers | DS-003, DS-010 | Catalog | Read each tool family's existing name/description/schema source and produce canonical tool definitions | Keeps schema projection reusable and surface-neutral | `tools/list` returns raw names or imports runtime wrappers |
| MCP schema mapper | DS-003 | Catalog | Convert canonical tool schemas to MCP input schemas | Keep definitions reusable | Dispatcher becomes protocol-specific |
| MCP result mapper | DS-004, DS-005 | Method dispatcher/tool executor | Convert communication results to MCP content/error shape | Transport concern | `SendMessageToDispatcher` becomes MCP-specific |
| Tool event observer | DS-006 | Tool executor/event owners | Project start/completion/error to existing event pipelines | Preserve observability | SSE becomes accidental internal event bus |
| Empty resource responders | DS-007 | Method dispatcher | Return empty resource/template lists for tool-only server | Client compatibility | Clients see avoidable method-not-found failures |
| Session owner cleanup / TTL cleanup | DS-008 | Session registry + run/member cleanup hooks | Expire stale sessions and revoke by run/member owner | Prevent leaked/stale access and stale restored configs | Sessions live indefinitely or restored runs reuse stale tokens |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Fastify route registration | `server-runtime.ts` / existing app bootstrap | Extend | Existing owner of HTTP routes | N/A |
| Loopback server URL | `config/server-runtime-endpoints.ts` | Reuse | Already normalizes listen address to internal base URL | N/A |
| Configured tool exposure | `agent-execution/shared/configured-agent-tool-exposure.ts` | Reuse/Extend | Already classifies configured tool names | N/A |
| `send_message_to` execution | `agent-communication/services/send-message-to-dispatcher.ts` | Reuse | Latest shared communication dispatch seam | N/A |
| `send_message_to` schema/contract | `agent-communication/services/send-message-to-tool-contract.ts`; `agent-tools/agent-communication/send-message-to-parameter-schema.ts` | Reuse/Extract If Needed | Existing shared name/description/schema source for the first MCP definition | If the current schema is still wrapper-coupled, extract a surface-neutral contract file before MCP catalog usage. |
| Browser/media/task-delegation tool definitions | Existing family manifests and parameter schema files under `agent-tools/browser`, `agent-tools/media`, `agent-tools/task-delegation` | Reuse Later | Already provide future definition inputs | Not in first milestone unless scope expands. |
| Published-artifacts tool definition | `agent-tools/published-artifacts/publish-artifacts-tool.ts`; `services/published-artifacts/published-artifact-tool-contract.ts` | Extract/Reuse Later | Needs a surface-neutral schema/contract before MCP exposure | Avoid catalog dependency on a `BaseTool` wrapper. |
| External MCP client management | `mcp-server-management/**` | Do Not Reuse as owner | It manages MCP servers AutoByteus consumes, not AutoByteus as MCP server | New outbound server-hosted subsystem required |
| Agent Tools MCP sessions/transport | None | Create New | No current owner for AutoByteus-hosted MCP server | Existing runtime wrappers are wrong direction |
| Runtime config materialization | Runtime backend folders | Design now / implementation per runtime ticket unless expanded | Each runtime has own config/process semantics: Claude SDK object, Claude Code temp config, Codex app-server config layer, AGY workspace file | Agent Tools MCP Server owns descriptor/session only; runtime folders own final materialization. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent Tools MCP Server | Route, protocol/auth matrix, sessions, redacted descriptor view, catalog, per-tool MCP definition providers, MCP method/result/schema mapping, secret descriptor | DS-001..DS-011 | External process runtimes and runtime materializers | Create New | Under `agent-tools/mcp/`; does not own runtime-native config files or tool-family business behavior. |
| Agent Communication | `send_message_to` dispatch, direct run routing, team-local delivery | DS-004 | Communication domain | Reuse | Use `SendMessageToDispatcher`. |
| Agent execution shared exposure | Configured tool classification | DS-001, DS-002, DS-003 | Session service/catalog | Reuse/Extend | May add helper for MCP-supported intersection. |
| Runtime MCP config materializers | Final runtime-native config object/files/flags plus redaction/cleanup for any bearer-token artifact | DS-001, DS-002, DS-009 | Claude Agent SDK, Claude Code, Codex App Server, AGY/future | Design now / implementation per runtime ticket unless expanded | Server returns secret descriptor; materializers choose programmatic config, temp file, private config, or workspace file per runtime and own cleanup/conflict/token handling. |
| Fastify server runtime | Route bootstrap | DS-007 | MCP route | Extend | Register outside `/rest` as `/mcp`. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `agent-tools/mcp/agent-tool-mcp-session.ts` | Agent Tools MCP Server | Session model | Session fields, secret descriptor type, redacted descriptor type, token/session status types | One subject: app-level MCP session | Exposure/sender types |
| `agent-tools/mcp/agent-tool-mcp-session-registry.ts` | Agent Tools MCP Server | Session registry | In-memory create/resolve/revoke/expire/token validation, owner identity, owner-based revocation | Owns lifecycle | Session model |
| `agent-tools/mcp/agent-tool-mcp-session-service.ts` | Agent Tools MCP Server | Internal session API | Create/revoke session, derive configured-and-supported tools, build secret descriptor URL/header, redacted descriptor view | Public internal entry for runtime adapters | Registry, catalog, URL resolver |
| `agent-tools/mcp/agent-tool-mcp-catalog.ts` | Agent Tools MCP Server | Tool catalog | Supported MCP tool definitions; session-filtered list/call allowlist | Keeps list policy out of route | Configured exposure, schema mapper |
| `agent-tools/mcp/agent-tool-mcp-definition-provider.ts` | Agent Tools MCP Server | Definition provider contract | Interface/type for per-tool definition providers | Keeps catalog generic without importing runtime wrappers | Supported definition type |
| `agent-tools/mcp/providers/send-message-to-mcp-definition-provider.ts` | Agent Tools MCP Server | `send_message_to` definition provider | Build canonical `send_message_to` definition from existing contract/schema | First concrete DS-010 provider | Send-message contract/schema |
| `agent-tools/mcp/agent-tool-mcp-tool-executor.ts` | Agent Tools MCP Server | MCP tool executor adapter | Dispatch supported MCP tool calls to server-owned dispatchers | Separates tool-call mapping from JSON-RPC method handling | Dispatcher/result mapper |
| `agent-tools/mcp/agent-tools-mcp-routes.ts` | Agent Tools MCP Server | Fastify route | Register POST/GET/DELETE/OPTIONS endpoint; implement Origin/auth/session/protocol/content negotiation matrix | Transport entrypoint only | Registry/dispatcher |
| `agent-tools/mcp/agent-tools-mcp-method-dispatcher.ts` | Agent Tools MCP Server | MCP method dispatcher | initialize, notifications/initialized 202/no-body, tools/list, tools/call, empty resources, ping, unknown method behavior | Bounded protocol flow | Catalog/executor/result mapper |
| `agent-tools/mcp/agent-tools-mcp-result-mapper.ts` | Agent Tools MCP Server | Transport mapper | Map `AgentOperationResult`/canonical result to MCP result/error and distinguish protocol JSON-RPC errors from tool `isError` results | Keeps communication layer protocol-neutral | Result types |
| `agent-tools/mcp/agent-tools-mcp-schema-mapper.ts` | Agent Tools MCP Server | Schema mapper | Map current tool schema shapes to MCP JSON schema | Keeps catalog readable | Send-message schema |
| Runtime-specific materializer files under each backend folder | Runtime backend folders | MCP config materialization | Convert secret `AgentToolMcpDescriptor` into runtime-native MCP config object/file/flags and own redaction/cleanup of bearer-token artifacts | Runtime safety differs by backend; keep close to process launch code | Session registry, catalog internals, tool behavior |
| `server-runtime.ts` | Server runtime | App bootstrap | Register MCP routes | Existing app bootstrap owner | Route module |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Secret session descriptor returned to runtime adapters | `agent-tool-mcp-session.ts` | Agent Tools MCP Server | AGY/Claude/Codex materializers need same semantic fields, but raw token must be runtime-only | Yes | Yes | Loggable/persistable DTO |
| Redacted session descriptor view | `agent-tool-mcp-session.ts` | Agent Tools MCP Server | Logs/events/debug output need safe descriptor representation | Yes | Yes | Alternate source of runtime config |
| Session identity/token/context shape | `agent-tool-mcp-session.ts` | Agent Tools MCP Server | Registry/service/route/tests need same shape | Yes | Yes | Generic agent runtime session |
| Configured-and-supported tool resolution | `agent-tool-mcp-catalog.ts` or service helper | Agent Tools MCP Server | Session creation and tools/list/call need consistent allowlist | Yes | Yes | Client-side-only filter |
| Supported tool definition provider contract | `agent-tool-mcp-definition-provider.ts` | Agent Tools MCP Server | Each tool family needs the same name/description/schema projection boundary | Yes | Yes | Runtime-wrapper import pattern |
| MCP result mapping | `agent-tools-mcp-result-mapper.ts` | Agent Tools MCP Server | All MCP tools need protocol result shapes | Yes | Yes | Business result owner |
| MCP schema mapping | `agent-tools-mcp-schema-mapper.ts` | Agent Tools MCP Server | Tool definitions need MCP schemas | Yes | Yes | Validation policy owner |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentToolMcpSession` | Yes | Yes | Medium | Separate AutoByteus `sessionId`, token hash, owner identity, and v1 no-MCP-transport-session decision. Do not store raw token. |
| `AgentToolMcpDescriptor` | Yes | Yes | Medium | Mark as secret-bearing runtime-only: name, transport, serverUrl, Authorization header, enabledTools. Runtime-specific files live elsewhere. |
| `RedactedAgentToolMcpDescriptor` | Yes | Yes | Low | Safe logs/events/debug view with redacted bearer token and redacted/fingerprinted session URL. Must not be usable as runtime config. |
| `AgentToolMcpSupportedToolDefinition` | Yes | Yes | Medium | Keep tool name/description/schema/requirements; do not embed runtime process config. |
| `AgentToolMcpDefinitionProvider` | Yes | Yes | Low | Provider returns one canonical definition for one exact tool/family source; do not include execution logic or runtime config. |
| `AgentToolMcpExecutionContext` | Yes | Yes | Medium | Include session, sender context, event observer; do not become kitchen-sink runtime context. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session.ts` | Agent Tools MCP Server | Session/descriptor model | App session, secret descriptor, redacted descriptor, lifecycle/status, token validation input types | Session identity subject | Configured exposure, sender context |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session-registry.ts` | Agent Tools MCP Server | Session registry | Memory storage, create, resolve, revoke, owner-based revoke, expire, token hash/timing-safe compare | Lifecycle owner | Session model |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session-service.ts` | Agent Tools MCP Server | Internal service | Create/revoke session, call catalog for allowlist, build secret descriptor URL/header, expose redacted descriptor projection | Adapter-facing internal API | Registry/catalog/URL resolver |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-catalog.ts` | Agent Tools MCP Server | Tool catalog | Supported tool definitions, configured-and-supported filtering, tool availability checks | One concern: exposed MCP catalog | Configured exposure/schema mapper |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-definition-provider.ts` | Agent Tools MCP Server | Definition provider contract | Canonical provider interface/type for tool name/description/schema projection | Shared DS-010 seam | Supported definition type |
| `autobyteus-server-ts/src/agent-tools/mcp/providers/send-message-to-mcp-definition-provider.ts` | Agent Tools MCP Server | `send_message_to` definition provider | Build canonical definition from send-message contract/schema without using runtime wrappers | First concrete schema provider | Existing send-message contract/schema |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-tool-executor.ts` | Agent Tools MCP Server | MCP tool-call adapter | Dispatch `send_message_to` to `SendMessageToDispatcher`; later tools register here or by small per-tool adapter | Keeps method dispatcher protocol-focused | Catalog/result mapper |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-routes.ts` | Agent Tools MCP Server | Fastify route | Register `/mcp/agent-tools/:sessionId` methods and implement route-level Origin/auth/session/protocol/content negotiation matrix | Transport entrypoint only | Dispatcher/registry |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-method-dispatcher.ts` | Agent Tools MCP Server | MCP method owner | JSON-RPC method handling, resources empty lists, ping, initialize, notification 202/no-body, unknown method behavior | Bounded protocol flow | Catalog/executor/result mapper |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-result-mapper.ts` | Agent Tools MCP Server | MCP result mapper | Convert operation results into MCP content/error shape and classify protocol JSON-RPC errors vs tool `isError` results | Protocol mapping concern | Current operation result shape |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-schema-mapper.ts` | Agent Tools MCP Server | MCP schema mapper | Convert current parameter schemas to MCP tool input schemas | Protocol mapping concern | Existing send-message schema |
| Future `autobyteus-server-ts/src/agent-execution/backends/claude/.../claude-agent-tools-mcp-materializer.ts` or equivalent | Claude Agent SDK backend | Programmatic materializer | Map secret descriptor to SDK `mcpServers` + `allowedTools` query options without file persistence | Claude SDK-specific config owner | Filesystem `.mcp.json` writes by default |
| Future `autobyteus-server-ts/src/agent-execution/backends/claude-code/.../claude-code-mcp-config-materializer.ts` or equivalent | Claude Code backend | Ephemeral CLI config materializer | Generate private `--mcp-config` file from secret descriptor and own file cleanup/redaction | Claude Code process owner | Project `.claude/` MCP config or durable token file by default |
| Future `autobyteus-server-ts/src/agent-execution/backends/codex/.../codex-agent-tools-mcp-config-materializer.ts` or equivalent | Codex backend | Ephemeral Codex config materializer | Generate per-run/session Codex MCP config while respecting cwd-keyed app-server reuse and cleaning temp token artifacts | Codex process/config owner | Shared process config leakage |
| Future `autobyteus-server-ts/src/agent-execution/backends/antigravity/.../antigravity-mcp-config-materializer.ts` or equivalent | Antigravity backend | Workspace MCP config materializer | Write `.agents/mcp_config.json` from secret descriptor with rewrite/removal/conflict/redaction policy | AGY workspace config owner | Tool execution behavior |
| `autobyteus-server-ts/src/server-runtime.ts` | Server runtime | App bootstrap | Register Agent Tools MCP routes | Existing app owner | Route module |
| Existing `agent-communication` files | Agent Communication | Communication owner | Keep `send_message_to` parsing/routing/delivery in dispatcher | Existing authoritative path | N/A |

## Ownership Boundaries

- Agent Tools MCP Server owns MCP transport, the DS-007 protocol/auth/status matrix, application session validation, configured-tool exposure at the MCP boundary, redacted descriptor projection, and protocol result/schema mapping.
- Agent Communication owns `send_message_to` semantics. MCP code may call `SendMessageToDispatcher`; it must not duplicate parser/validator/routing/delivery behavior.
- Runtime backend/materializers own runtime-native config materialization and process launch. They must consume the secret descriptor instead of constructing session URLs/tokens themselves, must redact logs, must own cleanup for any generated token-bearing files, and must not add unconfigured tools.
- `AgentToolMcpSessionRegistry` owns memory session state, owner identity, bearer token validation, TTL, and revocation. The route must not keep its own session state.
- Per-tool MCP definition providers own schema projection only. Tool-family domain services/dispatchers own behavior; runtime wrappers remain surfaces, not sources of truth.
- Existing MCP client-management subsystem remains for external MCP servers consumed by AutoByteus. It must not own this server-hosted MCP surface.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgentToolMcpSessionService` | registry, token generation, URL building, configured-supported tool derivation, secret/redacted descriptor projection | Runtime-specific backend/materializers | Materializer hand-builds `/mcp/...` URL/token/tool allowlist or logs raw descriptor | Extend descriptor/session creation/redaction input/output |
| Runtime-specific MCP config materializer | one runtime's config object/file/flags and cleanup/conflict/redaction rules | Runtime backend/bootstrapper | Central generic materializer writes every runtime config or reaches into session registry | Add a small backend-local materializer using only `AgentToolMcpDescriptor` and redaction helpers |
| `AgentToolMcpSessionRegistry` | memory session lifecycle, token hash validation, owner identity, expiry/revocation | MCP route/method dispatcher, session service cleanup hooks | Route stores or validates session state ad hoc; runtime persists raw descriptor only for cleanup | Add registry resolve/revoke/revoke-by-owner APIs |
| DS-007 route gate | Origin/auth/session/protocol/content negotiation and HTTP/JSON-RPC status classification | All non-OPTIONS MCP HTTP requests | Method dispatcher returns server identity/resources/tools before route gate validation | Extend route gate matrix, not individual tool handlers |
| `AgentToolMcpCatalog` | supported tool definitions and session filtering | `tools/list`, `tools/call`, session service | Route exposes raw configured tools or all tools | Add catalog list/check method |
| Per-tool MCP definition provider | one tool/family's name, description, and schema projection from server-owned sources | Catalog | Catalog imports `BaseTool`, Codex dynamic registration, or Claude handler to discover schema | Extract/reuse a surface-neutral contract/schema file |
| `SendMessageToDispatcher` | parser, validator, direct routing, team-local delivery invocation, result shaping | MCP tool executor, BaseTool, Codex, Claude SDK | MCP route calls parser + router + member context directly | Add dispatcher options/hook wrapper |
| Existing event owners | run/team event projection | MCP executor observer | MCP SSE becomes internal event bus | Add event observer/bridge |

## Dependency Rules

Allowed:

- Runtime-specific backend/bootstrapper -> `AgentToolMcpSessionService` for secret descriptor creation, redacted descriptor view, and revocation.
- MCP routes -> session registry/service and method dispatcher.
- Method dispatcher -> catalog and MCP tool executor.
- MCP tool executor -> `SendMessageToDispatcher` for `send_message_to`.
- Catalog -> per-tool MCP definition providers and server-owned contract/schema sources.
- Per-tool definition providers -> existing manifest/contract/schema files only, not runtime wrapper execution surfaces.
- Catalog/service -> `ConfiguredAgentToolExposure` and existing tool contract/schema files.
- Result/schema mappers -> protocol-neutral tool result/definition data.
- Runtime-specific MCP config materializers -> secret `AgentToolMcpDescriptor` plus redaction helper only; they must not depend on session registry internals.

Forbidden:

- Runtime-specific materializers must not implement `send_message_to` behavior.
- Runtime-specific materializers must not add tools to generated MCP config that are not in the descriptor returned by the session service.
- Runtime-specific materializers must not log, persist, emit, or hand off raw bearer headers or raw materialized config content.
- MCP route must not call `AutoByteusSendMessageToTool` directly.
- MCP catalog/definition providers must not instantiate or depend on `AutoByteusSendMessageToTool`, Codex dynamic registrations, or Claude SDK handlers to obtain schemas.
- MCP route must not expose all AutoByteus tools or trust client-side `enabled_tools` as authority.
- MCP method dispatcher must not store raw tokens or log bearer tokens.
- MCP method dispatcher must not return server identity, tools/resources, ping, SSE, or DELETE behavior before the DS-007 route gate resolves session/auth successfully.
- `mcp-server-management/**` must not become the server-hosted MCP owner.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `createAgentToolMcpSession(input)` | Agent tool MCP session | Create in-memory session and return secret descriptor | sender context + owner identity/run id + configured exposure/tool names + runtime kind + optional TTL | Internal server API for runtime backends/materializers. |
| `redactAgentToolMcpDescriptor(descriptor)` | Agent tool MCP descriptor | Produce safe log/event/debug view | secret descriptor or session metadata | Must redact bearer token and session URL/session ID. |
| `revokeAgentToolMcpSessionsForOwner(owner)` | Agent tool MCP session | Revoke all sessions for run/member owner | run id or member-run owner identity | Used by run/member cleanup without persisting raw descriptors. |
| `materializeClaudeAgentSdkMcpConfig(descriptor)` | Claude SDK runtime config | Build SDK query options fragment | secret `AgentToolMcpDescriptor` | Returns `{ mcpServers, allowedTools }`; no file. |
| `materializeClaudeCodeMcpConfig(descriptor, runWorkspace)` | Claude Code runtime config | Generate ephemeral CLI `--mcp-config` | secret descriptor + runtime temp/workspace context | Future runtime-specific file; owns cleanup/redaction. |
| `materializeCodexAppServerMcpConfig(descriptor, appServerContext)` | Codex runtime config | Generate per-run/session config layer | secret descriptor + app-server process/config context | Must handle cwd-keyed app-server reuse and token isolation. |
| `materializeAntigravityMcpConfig(descriptor, runWorkspace)` | AGY runtime config | Write `.agents/mcp_config.json` | secret descriptor + runtime workspace | Future AGY runtime file; owns workspace cleanup/rewrite. |
| `revokeAgentToolMcpSession(sessionId)` | Agent tool MCP session | Revoke one session | AutoByteus app `sessionId` | Called on explicit revocation; run/member cleanup should prefer owner-based revoke. |
| `resolveAgentToolMcpSession(request)` | Agent tool MCP session | Resolve and validate session/token | `sessionId` path + bearer token + request method class + effective protocol version; v1 ignores `MCP-Session-Id` | Route boundary for all non-OPTIONS requests. |
| `listMcpToolsForSession(session)` | MCP tool catalog | Return session-filtered tool definitions | `AgentToolMcpSession` | Filters configured-and-supported tools. |
| `buildAgentToolMcpDefinition(toolName)` / provider equivalent | MCP tool definition provider | Build one canonical supported tool definition from existing contract/schema source | exact tool name | Used by catalog before schema mapping; not an execution API. |
| `canCallMcpTool(session, toolName)` | MCP tool catalog | Check call allowlist | session + exact tool name | Server-side authority. |
| `executeAgentToolMcpCall(input)` | MCP tool call | Execute supported tool through server-owned dispatch | session + exact tool name + raw arguments | V1 supports `send_message_to`. |
| `SendMessageToDispatcher.dispatch(input)` | `send_message_to` | Parse/validate/route/deliver message | raw arguments + `AgentRunMessageSenderContext` | Existing communication boundary. |
| `registerAgentToolsMcpRoutes(app)` | MCP transport | Register route | Fastify instance / prefix | Called from `buildApp`. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `createAgentToolMcpSession` | Yes | Yes | Low | Keep configured exposure and sender context explicit. |
| `redactAgentToolMcpDescriptor` | Yes | Yes | Low | Redacted view must not be usable as runtime config. |
| `revokeAgentToolMcpSessionsForOwner` | Yes | Yes | Low | Owner identity must be explicit run/member identity, not generic string. |
| `resolveAgentToolMcpSession` | Yes | Yes | Low | Distinguish AutoByteus app `sessionId` from ignored v1 MCP transport session headers and include request method/protocol classification. |
| `listMcpToolsForSession` | Yes | Yes | Low | Use session allowlist, not raw client config. |
| `buildAgentToolMcpDefinition` / provider equivalent | Yes | Yes | Low | Exact tool name/family provider; no generic wrapper introspection. |
| `executeAgentToolMcpCall` | Yes | Yes | Medium | Require exact tool name; no generic runtime object. |
| `SendMessageToDispatcher.dispatch` | Yes | Yes | Low | Existing target selector parsing remains inside dispatcher. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Server-hosted MCP tool surface | AutoByteus Agent Tools MCP Server | Yes | Low | Avoid `runtime-tools`. |
| App session | `AgentToolMcpSession` | Yes | Medium | Document difference from MCP transport session. |
| Generated MCP server config name | `autobyteus_agent_tools` | Yes | Low | Use consistently in examples/tests. |
| Secret session descriptor | `AgentToolMcpDescriptor` | Yes | Medium | Keep canonical, runtime-only, and secret-bearing. |
| Redacted session descriptor | `RedactedAgentToolMcpDescriptor` | Yes | Low | Safe view only; not runtime config. |
| Tool catalog | `AgentToolMcpCatalog` | Yes | Low | Must filter by configured-and-supported tools. |

## Applied Patterns (If Any)

- **Adapter**: MCP result/schema mappers adapt server-owned tool contracts to MCP protocol shapes.
- **Registry**: Session registry stores in-memory capability sessions; catalog indexes supported tools. Both are lookup/lifecycle infrastructure, not business owners.
- **Thin facade/wrapper**: MCP tool adapter is a thin surface over `SendMessageToDispatcher` for v1.
- **Bounded local dispatch**: MCP method dispatcher owns JSON-RPC method routing inside the transport boundary.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/mcp/` | Folder | Agent Tools MCP Server | Sessions, route, catalog, MCP method/schema/result mapping | Server-hosted MCP surface for agent tools | External MCP client management or runtime-specific config files |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session.ts` | File | Session model | App session and descriptor types | One concrete subject | Runtime-specific config unions |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session-registry.ts` | File | Session registry | Memory lifecycle/token validation | Lifecycle owner | Tool business logic |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session-service.ts` | File | Internal API | Create/revoke sessions and descriptors | Runtime-adapter entrypoint | Direct runtime materialization |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-catalog.ts` | File | Catalog | Supported tools + configured-session filtering | Exposure owner for MCP | Parser/delivery logic |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-definition-provider.ts` | File | Definition provider contract | Canonical supported-tool definition provider shape | Schema projection seam | Tool execution or runtime config |
| `autobyteus-server-ts/src/agent-tools/mcp/providers/send-message-to-mcp-definition-provider.ts` | File | Send-message definition provider | `send_message_to` name/description/schema projection | First concrete provider | Delivery behavior |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-tool-executor.ts` | File | Tool adapter | MCP calls to server dispatchers | Keeps dispatcher protocol-neutral | Direct team internals |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-routes.ts` | File | HTTP route | Fastify method registration plus DS-007 route gate matrix | Existing server style | Tool behavior |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-method-dispatcher.ts` | File | MCP method dispatcher | JSON-RPC method handling, notifications, empty resources, ping, unknown methods | Bounded local flow | Session storage |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-result-mapper.ts` | File | Result mapper | Protocol JSON-RPC errors and tool result mapping | Protocol adapter | Domain decisions |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-schema-mapper.ts` | File | Schema mapper | Existing schemas -> MCP input schemas | Protocol adapter | Validation policy beyond schema mapping |
| `autobyteus-server-ts/src/server-runtime.ts` | File | Server bootstrap | Register `/mcp` route | Existing app owner | MCP method logic |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `agent-tools/mcp/` | Mixed justified: transport + session/catalog for one MCP subsystem | Yes | Medium | Keep tool behavior out; all files serve one server-hosted MCP surface. |
| `agent-communication/` | Domain/service owner | Yes | Low | Existing communication owner remains authoritative. |
| Runtime backend folders | Runtime materialization/surface wrappers | Yes | Medium | Do not add MCP host logic there. |
| `mcp-server-management/` | External MCP client management | Yes | Medium | Do not reuse for server-hosted MCP direction. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Tool allowlist | `configured tools ∩ supported MCP tools -> session.enabledTools -> tools/list` | Client config says `enabled_tools=["browser_click"]`, so server lists it | Server-side session is authoritative. |
| Tool schema projection | `send-message contract/schema -> definition provider -> catalog -> schema mapper -> MCP inputSchema` | Catalog instantiates `AutoByteusSendMessageToTool` or returns only the name | Keeps schema ownership surface-neutral and makes `tools/list` complete. |
| Session auth | `/mcp/agent-tools/<sessionId>` + `Authorization: Bearer <token>` validated against token hash | URL-only secret on localhost | Localhost is reachable by unrelated local processes. |
| Route gate | `Origin/auth/session/protocol/content checks -> method dispatch` for every non-OPTIONS request | `initialize` or `GET` works without bearer token because it is local | Prevents unauthenticated identity/tools/SSE exposure. |
| Secret descriptor | `raw descriptor -> materializer only; logs/events use redacted descriptor` | Store `headers.Authorization` in run history/debug event/temp handoff | Prevents bearer token leaks. |
| DELETE semantics | Valid DELETE returns `405` and does not revoke app session in v1 | Client transport cleanup revokes run-scoped app session | Keeps app session lifecycle owned by run/member cleanup, not client transport quirks. |
| `send_message_to` execution | `MCP tools/call -> catalog -> MCP tool executor -> SendMessageToDispatcher` | `MCP tools/call -> AutoByteusSendMessageToTool._execute` | Avoids one surface wrapping another. |
| Runtime materialization | `AgentToolMcpDescriptor -> Claude SDK mcpServers` / `Claude Code --mcp-config` / `Codex ephemeral config` / `AGY .agents/mcp_config.json` | Runtime materializer constructs token/URL itself or one generic writer ignores runtime process/config safety | Keeps session/capability/tool exposure server-owned while preserving runtime-specific config ownership. |
| SSE posture | GET accepts Streamable HTTP SSE path; tool results return via POST JSON-RPC | Stream all v1 tool results through SSE | Current tools are request/response wrappers. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| `/mcp/runtime-tools/:sessionId` alias | Earlier naming draft used runtime-tools | Rejected | Use `/mcp/agent-tools/:sessionId` only. |
| No bearer token because local-only | Simpler first demo | Rejected | Require memory-generated token + token hash validation. |
| Token-only endpoint without path session ID | Could work if token maps to session | Rejected for v1 clarity | Use path session ID plus bearer token. |
| Persistent MCP session store in v1 | Could support restoration | Rejected for first milestone | Memory-only sessions; recreate after restart. |
| V1 emitting MCP transport `MCP-Session-Id` | Could follow optional stateful transport session path | Rejected for v1 | App `:sessionId` + bearer token remains the only session authority; incoming MCP-Session-Id is ignored and DELETE returns 405 after auth. |
| Client DELETE revokes app session | Could map transport close to app-session revoke | Rejected for v1 | Run/member lifecycle and explicit revoke APIs own app-session revocation. |
| MCP route calling `AutoByteusSendMessageToTool` | Fast reuse | Rejected | Call `SendMessageToDispatcher` through MCP adapter. |
| MCP schema discovery by runtime wrapper introspection | Fast way to reuse existing tools | Rejected | Use server-owned contracts/manifests/schema builders through per-tool definition providers. |
| Persist raw `AgentToolMcpDescriptor` in run context/history/logs | Convenient diagnostics or restore | Rejected | Persist only owner/session metadata or redacted descriptor; raw token exists only for immediate materialization. |
| POST-only MCP endpoint | Current tools do not need streamed results | Rejected | Implement GET/SSE compatibility due observed clients. |
| Durable project MCP config as default runtime strategy | AGY/Codex/Claude support project config and project-root `.mcp.json` is simple | Rejected as universal default, not rejected per runtime | Return canonical descriptor; each runtime materializer chooses programmatic, ephemeral file, private local config, or managed project `.mcp.json` and owns cleanup/conflict/token handling. |
| Project `.claude/` for MCP server config | It looks like a natural Claude project folder | Rejected | Use Claude SDK programmatic config, Claude Code `--mcp-config`, or root `.mcp.json` when durable/shared config is intentionally needed. |

## Derived Layering (If Useful)

```text
Runtime backend/materializer layer
  - process launch, workspace setup, runtime-native config materialization, bearer-token artifact cleanup/redaction

Agent Tools MCP Server layer
  - sessions, bearer token validation, DS-007 MCP protocol/auth route gate, catalog dispatch, redacted descriptor view

Server-owned tool dispatch layer
  - MCP tool adapter delegates to existing domain/tool dispatchers

Domain/service layer
  - Agent Communication, Team delivery, Browser, Media, Task Delegation, Published Artifacts
```

Dependency direction flows downward. Higher layers must not skip the authoritative boundary below them.

## Migration / Refactor Sequence

1. Confirm latest base and keep ticket branch aligned with `origin/personal`.
2. Add `agent-tools/mcp/agent-tool-mcp-session.ts` with session, secret descriptor, redacted descriptor, lifecycle/status, owner identity, and token-validation input types.
3. Add in-memory `AgentToolMcpSessionRegistry` with random session ID, random bearer token, token hash storage, owner identity, TTL/sliding expiry if configured, revoke, owner-based revoke, resolve, and redacted error behavior.
4. Add `AgentToolMcpCatalog`, `AgentToolMcpDefinitionProvider` contract, and the first `send_message_to` definition provider derived from existing send-message name/description/schema.
5. Add `AgentToolMcpSessionService` that accepts sender context/owner identity/configured exposure, computes configured-and-supported tools, registers the session, returns a secret descriptor, and exposes a redacted descriptor view.
6. Add MCP schema/result mappers; schema mapper converts provider output to MCP `inputSchema`, and result mapper classifies transport JSON-RPC errors separately from tool `isError` results.
7. Add `AgentToolMcpToolExecutor` that validates exact tool name through catalog and routes `send_message_to` to `SendMessageToDispatcher`.
8. Add method dispatcher for `initialize`, `notifications/initialized`, `tools/list`, `tools/call`, `resources/list`, `resources/templates/list`, `ping`, unknown methods, and JSON-RPC notification/response `202` handling.
9. Add Fastify routes for `POST`, `GET`, `DELETE`, `OPTIONS` at `/mcp/agent-tools/:sessionId`; implement DS-007 route gate matrix, GET/SSE compatibility, no v1 `MCP-Session-Id` emission, and `DELETE` -> authenticated `405` without app-session revoke.
10. Register routes from `buildApp` in `server-runtime.ts`.
11. Add unit tests for registry token validation, expiry/revoke, owner-based revoke, configured-and-supported tool resolution, descriptor redaction/no raw-token storage, and `send_message_to` MCP adapter behavior.
12. Add Fastify route integration tests for initialize/list/call/resources/ping, notification `202` no-body, unknown session, token mismatch, expired/revoked session, unconfigured/unknown tool denial, GET/SSE compatibility, DELETE `405`, Origin rejection, malformed JSON, invalid params, unknown method, Accept/Content-Type handling, protocol-version fallback/rejection, and no raw token in error bodies.
13. Update docs or handoff notes with secret descriptor and runtime materialization guidance: Claude Agent SDK uses programmatic `mcpServers`, Claude Code CLI uses ephemeral `--mcp-config`, Codex App Server uses ephemeral per-run/session config with app-server isolation, AGY writes workspace `.agents/mcp_config.json` only with cleanup/rewrite policy, and AutoByteus-native does not need HTTP self-call in v1.
14. Add a small internal test fixture or unit-level caller for `AgentToolMcpSessionService` so the descriptor/session path is validated even before AGY/Claude Code production adapters exist.
15. Document exact future integration points: external-process backend bootstrapper after `resolveConfiguredAgentToolExposure`, and team-member path after `MixedAgentMemberHandle.buildMemberRunConfig()`.
16. Document runtime materializer contracts and target placements: Claude SDK programmatic `{ mcpServers, allowedTools }`, Claude Code ephemeral `--mcp-config`, Codex ephemeral per-run/session config with app-server isolation, and AGY workspace `.agents/mcp_config.json`.
17. Do not implement production runtime materializers in this ticket unless explicitly expanded; if the ticket is expanded, add each materializer inside its runtime-specific backend folder and call only the canonical session service, never the registry/route directly.

## Key Tradeoffs

- **Session + bearer token vs URL-only**: URL-only is simpler but unsafe even locally. Session ID plus bearer token gives local capability isolation with small implementation cost.
- **Memory-only sessions vs persistence**: memory-only is simpler and safer for v1 because stale configs die on restart. Persistence can be revisited if restored external runtimes need session continuity.
- **No v1 MCP-Session-Id vs transport session state**: not emitting MCP transport sessions avoids a second lifecycle because AutoByteus already has app `:sessionId` + bearer token. The cost is that DELETE is authenticated `405` and cannot be used for app-session revoke.
- **DELETE as app revoke vs authenticated 405**: app revoke on DELETE would let client transport cleanup accidentally kill a run/member session. V1 keeps app-session revocation owned by AutoByteus run/member lifecycle and explicit revoke APIs.
- **Secret descriptor vs loggable descriptor**: one descriptor is convenient, but unsafe. The design uses a secret runtime-only descriptor plus redacted view so materializers can configure clients without leaking bearer tokens to logs/history/events.
- **SDK transport vs manual dispatcher**: official MCP SDK may reduce protocol risk, but Fastify/session binding may require adapter work. Manual implementation is acceptable only if small and covered by MCP SDK/Codex/Claude compatibility tests.
- **Generic executor abstraction vs current dispatcher**: latest base already has `SendMessageToDispatcher`; v1 should reuse it rather than create a parallel executor. A thin MCP adapter can provide result/event hooks without owning communication behavior.
- **Expose all configured tool families now vs first `send_message_to` only**: first milestone stays focused on `send_message_to`; catalog/seams prepare future tools.
- **Definition providers vs wrapper introspection**: providers add one small seam, but keep schemas reusable and surface-neutral. Introspecting `BaseTool`, Codex, or Claude wrappers would be faster initially but would violate the same boundary rule we are trying to enforce for execution.
- **One generic config writer vs runtime-specific materializers**: one writer sounds simpler but would hide real differences: Claude SDK can accept objects, Claude Code prefers `--mcp-config`, Codex app-server has cwd-keyed process reuse, and AGY appears file-only. Keep one canonical descriptor, but materialize near each runtime backend.

## Risks

- MCP Streamable HTTP compliance details can be subtle; DS-007 now pins the v1 matrix, but implementation should still be verified against SDK/real clients.
- Token leakage through logs/config artifacts would grant local tool access. Mitigate by secret descriptor, redacted descriptor view, raw token returned once, hash storage only, no persistence, and materializer cleanup.
- `send_message_to` direct `target_agent_run_id` and team-local `recipient_name` have different context requirements. Tests must cover both allowed and denied paths if both are in v1 scope.
- Codex App Server shared `cwd` process reuse can make per-run config unsafe. This ticket should not solve Codex materialization; it should return canonical descriptors and document the caveat.
- Future tools may need richer approval/event hooks than `send_message_to`; keep the MCP adapter/context shape extensible but not kitchen-sink.
- Future tool families may expose schemas differently today. The first MCP exposure for each family must extract/reuse a surface-neutral contract before adding it to the catalog, rather than importing a runtime wrapper for schema.
- Runtime config files containing bearer tokens can leak through repository state, logs, or stale workspaces. Materializers must redact logs and clean up or intentionally own durable file behavior.
- Codex App Server materialization is the highest-risk runtime-specific path because a cwd-keyed app-server process can outlive one AutoByteus run and serve another run.
- Restored runs/team members must not reuse stale materialized configs after server restart or TTL expiry; runtime bootstrap/restore paths must recreate sessions and rewrite/pass fresh config.

## Design Principles Validation Pass

| Principle / Check | Validation Result | Evidence In This Spec | Residual Action |
| --- | --- | --- | --- |
| Data-flow spine inventory and span sufficiency | Pass | DS-001 and DS-002 start at GraphQL/run creation and continue through runtime backend launch; DS-003 continues from materialized config to concrete `{ tools: [...] }`; DS-007 now has explicit protocol/auth matrix; DS-008 now has lifecycle/restore policy; DS-009 names secret runtime materialization; DS-010/DS-011 name schema projection and existing-tool adapter refactor as bounded local spines. | Architecture review should verify no missing app-launch entrypoint beyond GraphQL/application bindings. |
| Ownership clarity | Pass | Session service owns secret/redacted descriptor creation; registry owns token/session lifecycle and owner-based revoke; route owns protocol/auth matrix; catalog owns tool definitions; runtime materializers own runtime-native config cleanup; `SendMessageToDispatcher` owns `send_message_to` behavior. | Keep materializers out of session registry internals. |
| Off-spine concerns around the spine | Pass | URL resolver, token generator, descriptor redactor, protocol gate, schema/result mappers, event observer, and materializers are attached to named owners. | Future tool adapters must be added through catalog/executor seams. |
| Authoritative Boundary Rule | Pass | Runtime materializers consume secret `AgentToolMcpDescriptor` plus redaction helper, not registry/catalog internals; MCP tool executor calls `SendMessageToDispatcher`, not lower-level team routers; route gate owns all non-OPTIONS request auth before dispatcher. | Tests should fail if route or materializer bypasses service/catalog/dispatcher. |
| Existing-tool refactor and schema projection | Pass | DS-010 says how schemas are built from server-owned contracts/manifests through definition providers; DS-011 says MCP tools/call delegates through per-tool adapters to existing owning dispatchers/services. | Future browser/media/task/publish adapters must follow the same provider+adapter pattern. |
| Secret-bearing shared-structure tightness | Pass | `AgentToolMcpDescriptor` remains canonical/runtime-neutral but explicitly secret-bearing; `RedactedAgentToolMcpDescriptor` is the only log/event/debug view; runtime-specific fields stay in materializer files. | Do not add optional per-runtime config fields or persistable raw token fields to the descriptor. |
| Legacy/compatibility cleanup | Pass | Rejects `/mcp/runtime-tools`, unauthenticated endpoint, MCP route calling `AutoByteusSendMessageToTool`, and `.claude/` for MCP server config. | Existing runtime surfaces remain only because they are current supported surfaces, not compatibility aliases for this endpoint. |
| File placement from ownership | Pass | Agent Tools MCP server files live under `agent-tools/mcp`; runtime materializers live under each runtime backend folder; communication behavior remains in `agent-communication`. | If implementation adds materializers, create backend-local files rather than a generic catch-all materializer. |
| Interface identity shape | Pass | Session APIs use explicit app `sessionId` + bearer token + owner identity; v1 explicitly does not emit MCP transport `MCP-Session-Id`; materializer APIs accept explicit secret descriptor; team delivery still uses `MemberTeamContext`. | If future transport sessions are added, revise DS-007/DS-008 before implementation. |
| Bounded local spines | Pass | DS-007 covers Streamable HTTP dispatch with status/auth matrix; DS-008 covers session lifecycle/restore/DELETE; DS-009 covers secret runtime config materialization. | Add bounded local spine if future approval/event streaming grows beyond current observer hook. |

## Guidance For Implementation

- Treat the MCP route as a transport adapter, not a tool implementation.
- Do not introduce a vague generic `RuntimeAdapter` service. The production call site is each external-process runtime backend/bootstrapper reached through `AgentRunManager.createAgentRun`; a shared helper may exist only for descriptor-to-config conversion if multiple runtime folders need it.
- For Claude Agent SDK, "programmatic materialization" means constructing the MCP server config object from `AgentToolMcpDescriptor` and passing it directly through SDK query options (`mcpServers` / `allowedTools`) for the run/turn; no file is needed for session bearer config. Root `.mcp.json` is still possible but should be treated as durable/shared config or as a file-based materializer with explicit cleanup/conflict/token handling. `.claude/` is not the normal per-project MCP server file location.
- For Codex App Server, materialization should be ephemeral for the concrete agent run/session and must account for current cwd-keyed app-server process reuse before injecting session URL/token.
- For Antigravity CLI, use workspace `.agents/mcp_config.json` because no direct programmatic materialization API is known, but the AGY materializer must own rewrite/removal/redaction of that token-bearing file.
- Keep `AgentToolMcpSession` application-level session distinct from MCP transport `MCP-Session-Id`; v1 does not emit MCP-Session-Id and DELETE is authenticated 405, not app-session revocation.
- Generate session ID and token with cryptographically strong randomness; store token hash only.
- Validate Origin, session ID, bearer token, expiry/revocation, protocol/content expectations, and request class on every non-OPTIONS request before method dispatch.
- Validate tool allowlist on every `tools/list` / `tools/call` request after route gate validation.
- Treat `AgentToolMcpDescriptor` as secret-bearing. Use a redacted descriptor for logs/events/debug and never store raw headers in run history or serialized state.
- Revoke sessions by run/member owner on runtime cleanup; recreate sessions and rematerialize config after restore/server restart/TTL expiry.
- Derive session `enabledTools` from configured AutoByteus tools intersected with MCP-supported tools.
- Use existing `getInternalServerBaseUrlOrThrow()` or adjacent internal base URL facility to build `serverUrl`.
- Use existing `SEND_MESSAGE_TO_TOOL_NAME`, description, schema, and `SendMessageToDispatcher`.
- Build `tools/list` through catalog definition providers and schema mapper. Do not expose raw `enabledTools` strings as tool definitions and do not import runtime wrappers for schema discovery.
- Add future tool families only after defining both a definition provider and an executor adapter that call that family's owning service/dispatcher.
- Keep runtime-native config files out of this subsystem; return secret descriptor for adapters and redacted descriptor for diagnostics.
- Prefer tests around owner boundaries: registry, redaction, catalog, MCP tool executor, method dispatcher, DS-007 route matrix, and Fastify route integration.
