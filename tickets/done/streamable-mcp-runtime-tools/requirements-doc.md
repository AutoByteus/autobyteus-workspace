# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready prerequisite ticket, bootstrapped 2026-06-11 and refreshed against latest `origin/personal` on 2026-06-13. Requirements and design have been updated for latest `agent-communication` code, configured-tool materialization, runtime MCP config materializer boundaries, explicit existing-tool schema/adapter refactor spines, Round-1 architecture review findings AR-001/AR-002/AR-003, and the narrow Round-2 AR-001 precision findings. User approved sending the updated package to architecture review on 2026-06-13; Round-3 package is ready for architecture re-review.

## Goal / Problem Statement

Add a generic AutoByteus-hosted Streamable HTTP MCP endpoint that exposes selected server-owned agent tools to external runtimes, starting with Antigravity CLI mixed-team support.

Current runtime backends can expose tools through backend-specific mechanisms: AutoByteus uses local `BaseTool` instances, Claude Agent SDK uses SDK-created in-process MCP servers, and Codex App Server uses dynamic tool registrations. Antigravity CLI is an external process and cannot call server-owned tools directly. It can, however, load MCP servers from workspace `.agents/mcp_config.json` and can call Streamable HTTP or stdio MCP servers.

The prerequisite capability should make the running AutoByteus backend itself an MCP tool host. The backend should expose an agent-scoped MCP endpoint that lists and executes only the tools configured for a specific agent run/team member. `send_message_to` is the first mandatory tool because Antigravity mixed-team members cannot participate correctly without it.

## Relationship To Antigravity CLI Runtime Ticket

This ticket should be implemented before full Antigravity CLI mixed-team runtime support. Antigravity standalone `agy --print` runtime can be prototyped without this endpoint, but Antigravity team membership needs `send_message_to` and other configured server tools through MCP.

## Investigation Findings

- Dedicated worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools`.
- Branch: `codex/streamable-mcp-runtime-tools`.
- Base: latest `origin/personal` at `97ea4ae2055510bcfc657624e3f9b2c5c6048227`, divergence `0 0` at bootstrap.
- AutoByteus server is Fastify-based (`autobyteus-server-ts/src/server-runtime.ts`) and already registers REST, GraphQL, websocket, CORS, and multipart plugins.
- The server already derives a loopback/internal base URL through `AUTOBYTEUS_INTERNAL_SERVER_BASE_URL` in `autobyteus-server-ts/src/config/server-runtime-endpoints.ts`. This is the natural base for generated MCP `serverUrl` values.
- Existing MCP code is primarily client/consumer side:
  - `autobyteus-ts/src/tools/mcp/types.ts` defines `STREAMABLE_HTTP`, `STDIO`, and `WEBSOCKET` MCP client config types.
  - `autobyteus-ts/src/tools/mcp/server/http-managed-mcp-server.ts` uses `@modelcontextprotocol/sdk/client/streamableHttp.js` to connect to external Streamable HTTP MCP servers.
  - `autobyteus-server-ts/src/mcp-server-management/**` configures external MCP servers and registers their discovered tools into AutoByteus.
- There is no existing generic server-side MCP endpoint that exposes AutoByteus tools outward to external MCP clients.
- Tool exposure is partially centralized:
  - `configured-agent-tool-exposure.ts` classifies configured browser/media/task-delegation/send-message/publish-artifacts tool names.
  - Browser/media/task-delegation tools have manifest-like definitions used by runtime adapters.
  - `send_message_to` already has shared contract, parameter schema, parser, validator, and delivery-intent builder, but runtime adapters still wrap it separately.
- `send_message_to` requires live server context: `MemberTeamContext`, mixed-team delivery handler, recipient/task-agent routing, reference file normalization, event emission, and configured tool exposure. It cannot be implemented correctly as a standalone child process without calling back to the AutoByteus server.
- Antigravity CLI can load workspace `.agents/mcp_config.json` in print mode and call a stdio MCP tool. Antigravity docs/config also support remote MCP entries through `serverUrl`. Therefore an AutoByteus Streamable HTTP MCP endpoint is a viable prerequisite.
- Local probes with a temporary `/mcp/agent-tools/probe-session` Streamable HTTP server verified that Codex App Server can consume `autobyteus_agent_tools` through launch-time `-c mcp_servers...` config overrides, list tools through `mcpServerStatus/list`, and call `dummy_ping` through `mcpServer/tool/call`.
- Local probes also verified Codex App Server can load project `.codex/config.toml` only after the project is trusted and when status/tool calls are resolved against a thread/cwd.
- Local probes verified Claude Code can connect to the same HTTP MCP endpoint through private local `claude mcp add --scope local`, project `.mcp.json` after approval, and command-line `--mcp-config --strict-mcp-config`.
- Claude Agent SDK supports MCP config directly through programmatic `mcpServers`; current AutoByteus Claude SDK wrapper already passes `mcpServers` into SDK query options, so the preferred materializer can avoid writing project files.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / enabling infrastructure / refactor.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue and Duplicated Policy Or Coordination risk.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed.
- Evidence basis: Existing runtime integrations each translate server tools into runtime-specific surfaces. Adding Antigravity by embedding another bespoke tool path would further duplicate tool policy and delivery behavior. A server-hosted MCP layer gives external runtimes a common protocol boundary while keeping tool ownership inside the server. Current agent-tool architecture is not fully pure: several wrappers mix argument parsing, validation, domain intent construction, approval/event policy, result formatting, and transport/runtime-specific concerns. `send_message_to` shows this most clearly across AutoByteus `BaseTool`, Codex dynamic tool, and Claude Agent SDK handler.
- Requirement or scope impact: Implement an agent-scoped MCP tool-session registry and Streamable HTTP MCP route before enabling Antigravity mixed-team runtime support.

## Runtime Materialization Principle

The reusable boundary should mirror the existing/desired skill-materialization model: AutoByteus owns canonical capabilities, while each runtime backend/materializer materializes those capabilities into the runtime's native configuration format.

```text
Canonical AutoByteus capability
  -> runtime-specific materialization
     - skills: runtime-specific skill files/config/layout
     - MCP tools: runtime-specific MCP config shape
  -> external runtime consumes native config
```

For MCP tools, the canonical capability is the AutoByteus Agent Tools MCP Server plus its `AgentToolMcpDescriptor`. Runtime backends/materializers should not reimplement tool behavior; they should generate the config their runtime understands:

- Claude Agent SDK: programmatic `mcpServers` / `allowedTools` passed into SDK query options, no file for session bearer config.
- Claude Code CLI: generated ephemeral `--mcp-config` for the run/session.
- Codex App Server: generated ephemeral per-run/session config layer; materializer must account for current cwd-keyed app-server process reuse.
- Antigravity CLI: generated workspace `.agents/mcp_config.json` with `serverUrl`, because no better programmatic API is known.
- Project-root `.mcp.json`: durable/shared Claude MCP config only, not default per-run bearer-token materialization.
- Project `.claude/`: settings/commands/skills/memory area; do not use for per-run MCP bearer config by default.
- Future runtimes: their native MCP config mechanism.

This makes AutoByteus align with common agent-runtime practice: skills and MCP servers are configured as runtime-native capabilities, while business behavior remains server-owned and shared.

### Configured-Tool Materialization Rule

Runtime MCP config materialization must be derived from the agent's configured AutoByteus tools. If an agent definition/run is configured with only `send_message_to`, the generated MCP config for that runtime session should expose only `send_message_to`. If the configured tool set later includes browser/media/task-delegation/publish-artifacts tools that have server-owned MCP adapters, the generated config may include only those configured and supported tools.

The client-side `enabled_tools` or equivalent runtime config is a narrowing/materialization convenience, not the security boundary. The AutoByteus server-side `AgentToolMcpSession` must independently store/resolve the configured exposure for the bound agent run and reject list/call attempts for unconfigured tools even if a client edits its local MCP config.

## Multi-Surface Tool Architecture Principle

STDIO, Streamable HTTP MCP, Codex dynamic tools, Claude Agent SDK tools, and AutoByteus local `BaseTool` instances should be treated as different transport/runtime surfaces over the same server-owned tool behavior. The target design should not duplicate business logic per surface.

Architectural rule:

```text
Authoritative service/domain owner
  -> shared server-owned tool executor / contract adapter
    -> surface-specific wrapper
       - AutoByteus BaseTool
       - Codex dynamic tool registration
       - Claude Agent SDK tool handler
       - Agent Tools MCP Server over Streamable HTTP
       - future stdio/other MCP surface if needed
```

For this ticket, existing Codex and Claude paths may remain in place, but `send_message_to` behavior should be extracted or aligned behind a shared executor so the new HTTP MCP server and existing wrappers do not fork parsing, validation, delivery intent construction, approval/event handling, or result semantics.

The challenge is not that HTTP cannot call the services. It can. The challenge is that the current wrappers are not pure enough to make another surface free: they carry some policy that should belong in a shared executor/contract layer. The design should introduce the seam needed for HTTP MCP while avoiding a broad rewrite of every existing tool.

Target purity boundary:

```text
Domain/service layer:
  authoritative business behavior

Shared server-owned tool executor/contract:
  tool name/description/schema, raw argument parsing, semantic validation,
  context requirements, service invocation, canonical success/error result,
  approval/event hook points where needed

Surface wrappers:
  translate that canonical contract/result into BaseTool, Codex dynamic tool,
  Claude SDK handler, or MCP tools/list/tools/call wire shapes
```

The implementation should start with the minimal extraction needed for `send_message_to`, then reuse the same seam for future browser/media/task-delegation/publish-artifacts exposure.

## Recommended Architecture

Introduce a **Agent Tools MCP Session** subsystem:

1. When a runtime/backend needs external MCP tool access, it registers a session in the AutoByteus server process.
2. The session stores or resolves:
   - session ID and optional short-lived capability token,
   - agent run ID,
   - client runtime kind for diagnostics/config generation,
   - configured tool exposure derived from the agent's configured AutoByteus tool names,
   - `AgentRunMessageSenderContext` and `MemberTeamContext` when the run is a team member,
   - `autoExecuteTools`,
   - event emission hooks,
   - lifecycle/expiry metadata.
3. The server exposes a Streamable HTTP MCP endpoint, e.g. `/mcp/agent-tools/:sessionId`.
4. MCP `tools/list` returns only tools enabled for that session.
5. MCP `tools/call` dispatches to server-owned tool executors using existing parsers/validators/services.
6. The session is cleaned up when the run/turn terminates or after TTL expiry.

The first required tool executor is `send_message_to`. The endpoint should be designed generically so browser/media/task-delegation/publish-artifacts tools can be added using shared manifests rather than per-client duplication.

Follow-up architecture understanding from 2026-06-11 discussion: this should be treated as a **client-neutral AutoByteus Agent Tools MCP server**, not as an Antigravity-only `send_message_to` bridge. Antigravity CLI, a future Claude CLI runtime, Codex-like external runtimes, and other process-based runtimes should all consume the same server-hosted Streamable HTTP endpoint through their native MCP config shapes. Runtime backends/materializers should own only process launch, workspace setup, MCP config materialization, and output/event parsing; server-owned tool executors and team communication should remain authoritative for tool behavior.

## Terminology / Naming Requirement

Do not name the subsystem, external MCP server entry, or route `runtime_tools` / `runtime-tools`. In AutoByteus, `runtime` already means the execution backend family such as Codex, Claude, or Antigravity, while this feature is a server-owned tool surface consumed by those runtimes.

Use **AutoByteus Agent Tools MCP Server** as the subsystem/product name, **AgentToolMcpSession** for the session concept, and `autobyteus_agent_tools` as the generated MCP server config name. The preferred route candidate is `/mcp/agent-tools/:sessionId`.

Preferred generated Codex-style config shape:

```toml
[mcp_servers.autobyteus_agent_tools]
url = "http://127.0.0.1:8080/mcp/agent-tools/session-abc"
http_headers = { "Authorization" = "Bearer <capability-token>" }
enabled_tools = ["send_message_to"]
```

## Backend MCP Endpoint Contract

The backend should expose one session-scoped Streamable HTTP MCP endpoint for the AutoByteus Agent Tools MCP Server. The public MCP endpoint is the URL that external clients receive in generated MCP config.

### Standards Requirement

The endpoint must conform to the MCP Streamable HTTP transport specification rather than inventing a custom HTTP protocol. The configured `url` should identify one MCP endpoint path, and that same path must handle the standard Streamable HTTP methods and JSON-RPC lifecycle. Prefer the official MCP SDK server transport if it can be integrated cleanly with Fastify and AutoByteus session lookup; otherwise a manual implementation must follow the same wire contract.

Standard-conformance requirements include:

- use JSON-RPC messages encoded as UTF-8,
- accept `POST` JSON-RPC requests/notifications/responses on the MCP endpoint,
- return `202 Accepted` with no body for accepted notifications/responses,
- return either `application/json` or `text/event-stream` for JSON-RPC requests,
- support `GET` on the same endpoint for SSE or intentionally return standard-compliant `405`; for this ticket, implement SSE because Codex App Server and Claude Code opened it,
- handle `MCP-Protocol-Version` according to the negotiated protocol version,
- if the server emits an `MCP-Session-Id` response header, keep it stable for that MCP transport session and require/validate it on later requests per the spec,
- validate `Origin` on incoming HTTP requests where present, bind local endpoints to loopback for generated local URLs, and require authentication/capability binding.

### Public MCP Transport Endpoint

```text
POST    /mcp/agent-tools/:sessionId
GET     /mcp/agent-tools/:sessionId
DELETE  /mcp/agent-tools/:sessionId
OPTIONS /mcp/agent-tools/:sessionId
```

Responsibilities:

- `POST`: JSON-RPC request/response path for MCP messages.
- `GET`: Streamable HTTP SSE path; required because Codex App Server and Claude Code probes both opened this stream.
- `DELETE`: best-effort session/transport close for clients that send it. It must not delete the AutoByteus run by itself; session revocation remains owned by the session registry/run lifecycle.
- `OPTIONS`: CORS/preflight support if needed for local browser-like MCP clients.

### Tool Execution / Streaming Posture

Current AutoByteus server-owned tools are mostly **request/response wrappers around existing server services**. They may use `async`/`await` internally, but their public tool contract is not a stream: the caller provides arguments, the wrapper validates/parses them, invokes the owning service/domain handler, and returns one result.

Current-code examples:

- `send_message_to`: parses/validates arguments, builds an inter-agent delivery intent, awaits `memberTeamContext.deliverInterAgentMessage(...)`, and returns a delivered/error text result.
- Browser tools: `BrowserToolService` validates input and forwards one call to `BrowserBridgeClient`, returning one result.
- Media tools: wrapper parses input and calls `getMediaGenerationService()` through manifest entries, returning one result.
- Task-delegation tools: `TaskDelegationToolService` resolves the bound team run and calls the task-delegation service, returning one result.
- `publish_artifacts`: normalizes input, calls `PublishedArtifactPublicationService.publishManyForRun(...)`, and returns one JSON string result.

Expected first-milestone behavior:

- `tools/call` executes the selected server-owned service wrapper and returns one MCP JSON result.
- `send_message_to` returns success/failure as a normal JSON-RPC result.
- Existing AutoByteus event pipelines remain the primary place for internal tool lifecycle/progress events.
- The GET/SSE path exists for Streamable HTTP client compatibility and future server-to-client messages, not because current tools require streamed results.
- Do not implement complex streaming tool results, resumable replay, or broad server-push behavior unless a concrete tool/use case requires it later.

### Required MCP JSON-RPC Methods

The endpoint must handle at least:

```text
initialize
notifications/initialized
tools/list
tools/call
resources/list
resources/templates/list
ping
```

Required behavior:

- `initialize`: return server identity, protocol version, and tool capability metadata for `autobyteus_agent_tools`.
- `notifications/initialized`: accept as a notification with no JSON-RPC result body.
- `tools/list`: return only tools enabled for the resolved `AgentToolMcpSession`. First mandatory tool: `send_message_to`.
- `tools/call`: dispatch only enabled tools through server-owned tool executors; unknown/unconfigured tools are rejected.
- `resources/list`: return an empty resource list unless this subsystem intentionally adds resources later.
- `resources/templates/list`: return an empty template list unless this subsystem intentionally adds resources later.
- `ping`: return a normal empty/success result.

Codex App Server probes called `resources/list` and `resources/templates/list` even though this feature is tool-only, so the endpoint should return harmless empty results rather than method-not-found errors.

### Session ID Purpose

The `:sessionId` path segment is not required by the MCP protocol itself; it is an AutoByteus application-level session identifier. For this feature, it should be treated as mandatory in the generated endpoint URL because the backend must bind each MCP client request to one specific agent run/team member context.

The `sessionId` is used to resolve an `AgentToolMcpSession` from the server registry. That session supplies:

- the owning agent run/team member identity,
- the available tool set for that agent,
- `MemberTeamContext` for `send_message_to`,
- lifecycle/expiry/revocation state,
- event routing context for tool start/completion/error projection,
- the expected capability token or authorization binding.

This is separate from the MCP transport-level `Mcp-Session-Id` header that some clients use internally. AutoByteus's `:sessionId` identifies the server-owned agent-tool session; the MCP header identifies a transport/session negotiation between client and MCP server.

A token-only design such as `POST /mcp/agent-tools` with only `Authorization: Bearer ...` could work, but then the token must carry or look up the same session binding. The path `:sessionId` keeps routing, diagnostics, and revocation simpler while the bearer token still proves possession of the capability.

### Authentication / Session Binding

Each generated config should include both an unguessable session URL and a capability token header:

```toml
[mcp_servers.autobyteus_agent_tools]
url = "http://127.0.0.1:<autobyteus-port>/mcp/agent-tools/<session-id>"
http_headers = { "Authorization" = "Bearer <capability-token>" }
enabled_tools = ["send_message_to"]
```

The backend must validate that the session exists, is not expired/revoked, the bearer token matches the session binding, and the requested tool is enabled for the associated agent run/team member.

### Internal Non-MCP Session API

The creation/revocation of `AgentToolMcpSession` is an internal server-side API/service, not a public MCP endpoint. Runtime adapters call this internal service before launching or configuring external clients. The service returns:

```ts
{
  sessionId: string;
  serverUrl: string;
  capabilityToken: string;
  enabledTools: string[]; // configured-and-supported tools for this session
}
```

Runtime materializers then materialize the appropriate client-specific config from this descriptor/allowlist. They must not invent or add tools that were not configured for the bound agent run:

- Claude Agent SDK: programmatic `mcpServers` + `allowedTools` query options.
- Claude Code CLI: generated ephemeral `--mcp-config` JSON.
- Codex App Server: generated ephemeral `mcp_servers.autobyteus_agent_tools` config layer for that run/session, with app-server process/config isolation.
- Antigravity CLI: generated `.agents/mcp_config.json` with its `serverUrl` shape.

## Scope Classification (`Small`/`Medium`/`Large`)

Large.

This is a reusable external-client-facing infrastructure layer that touches server routing, agent run/team context, tool definitions, team communication, security/capability scoping, and tests.

## In-Scope Use Cases

- UC-MCP-001: AutoByteus server exposes a Streamable HTTP MCP endpoint after startup.
- UC-MCP-002: A runtime backend can create a scoped MCP tool session for an agent run.
- UC-MCP-003: An MCP client can initialize a session and list only tools configured for that run.
- UC-MCP-004: An MCP client can call `send_message_to`, and the message is delivered through the existing mixed-team delivery path.
- UC-MCP-005: Unauthorized, expired, or unknown sessions cannot list or call tools.
- UC-MCP-006: Tool call start/completion/error events are projected into existing agent/team event pipelines where applicable.
- UC-MCP-007: The architecture supports later adding browser/media/task-delegation/publish-artifacts tools without a new transport design.
- UC-MCP-008: The Antigravity runtime can generate `.agents/mcp_config.json` with `serverUrl` pointing to this endpoint in a later ticket.
- UC-MCP-009: The design defines runtime materializer boundaries for Claude Agent SDK, Claude Code CLI, Codex App Server, Antigravity CLI, and future runtimes without creating one generic materializer that hides runtime-specific config safety rules.

## Out Of Scope For This Ticket

- Full Antigravity CLI runtime implementation.
- AGY model catalog, `agy --print`, `agy --model`, or AGY conversation restoration.
- Mutating Antigravity workspace `.agents/mcp_config.json` as part of this ticket, except possibly tests/fixtures.
- Exposing all AutoByteus tools globally without run scoping.
- OAuth or internet-facing MCP hosting.
- Replacing the existing MCP client/consumer management system.
- Implementing every server tool in the first pass if the design explicitly phases tool adapters; `send_message_to` is mandatory.
- Implementing production materializers for Claude Code CLI, Codex App Server, or Antigravity CLI in this ticket unless the ticket is explicitly expanded; this ticket must still define their boundaries and descriptor contract.

## Functional Requirements

- REQ-MCP-001: The server must register a Streamable HTTP MCP route in the existing Fastify application without launching a second HTTP server.
- REQ-MCP-002: The endpoint must support MCP JSON-RPC initialize, notifications/initialized, tools/list, and tools/call flows sufficient for standard MCP clients, and should return empty resource/resource-template lists if clients probe `resources/list` or `resources/templates/list`.
- REQ-MCP-003: The endpoint must support normal JSON responses for short tool calls and must not require every tool result to stream, while also accepting the Streamable HTTP GET/SSE connection pattern observed from Codex App Server and Claude Code clients.
- REQ-MCP-004: An agent-scoped MCP tool-session registry must create, resolve, expire, revoke, and revoke-by-owner sessions; v1 may keep sessions in memory and should clear access on server restart.
- REQ-MCP-005: Session resolution must bind requests to a specific agent run and configured tool exposure; tools not configured for the session must not be listed or callable.
- REQ-MCP-006: Runtime MCP config materialization must include only configured-and-supported tools for the bound agent run; client-side `enabled_tools` is allowed as narrowing metadata but server-side session exposure remains authoritative.
- REQ-MCP-007: Session access must use both an unguessable session ID and a bearer capability token/header to prevent cross-run/local-process tool access; v1 tokens should be generated in memory, returned once, stored only as hashes, and redacted from logs.
- REQ-MCP-008: The server must expose `send_message_to` as an MCP tool when and only when the session's configured tools include `send_message_to` and a valid `AgentRunMessageSenderContext` exists; team-local `recipient_name` delivery additionally requires a valid `MemberTeamContext`/delivery handler.
- REQ-MCP-009: `send_message_to` MCP execution must reuse the current shared `agent-communication` dispatch path, including `SendMessageToDispatcher`, parser/validator, direct agent-run routing, team-local delivery, and existing delivery services; it must not maintain separate communication state.
- REQ-MCP-010: `send_message_to` MCP execution must emit or allow projection of tool start/completion/error events consistent with existing runtime event behavior.
- REQ-MCP-011: Tool results must use MCP content/result shapes that clients like Antigravity, Claude Code, and Codex App Server can consume as text output.
- REQ-MCP-012: Errors must be returned as MCP-compatible errors or text results without leaking secrets, raw tokens, or sensitive account metadata.
- REQ-MCP-013: The endpoint must be compatible with local loopback `serverUrl` generation using the server's existing internal base URL facility.
- REQ-MCP-014: The design must define how future tools are adapted from existing manifests/contracts into MCP tool definitions.
- REQ-MCP-015: The implementation must include focused tests for session scoping, configured-tool materialization, tool listing, `send_message_to` success, validation failure, unknown session, expired session, and unconfigured tool denial.
- REQ-MCP-016: Existing AutoByteus, Codex, Claude Agent SDK, and external MCP-client behavior must remain unchanged.
- REQ-MCP-017: The design must define runtime MCP config materializer responsibilities from `AgentToolMcpDescriptor`: Claude Agent SDK uses programmatic `mcpServers`/`allowedTools`, Claude Code CLI uses ephemeral `--mcp-config`, Codex App Server uses ephemeral per-run/session config with app-server isolation, Antigravity CLI uses workspace `.agents/mcp_config.json`, and project `.mcp.json` is reserved for durable/shared Claude config rather than default per-run bearer-token materialization.
- REQ-MCP-018: `tools/list` schema generation must use server-owned tool contract/manifest/schema sources through MCP definition providers and schema mapping; the MCP catalog must not instantiate existing runtime wrappers only to discover tool schemas. For v1, `send_message_to` must use the shared send-message contract/schema and execution must delegate to `SendMessageToDispatcher`.
- REQ-MCP-019: The design and implementation must define and follow an exact Streamable HTTP protocol/auth/status/error matrix for the MCP route, including all non-OPTIONS auth/session validation, Origin handling, content/accept negotiation, `MCP-Protocol-Version`, v1 `MCP-Session-Id` decision, GET/SSE, notifications `202` no-body, DELETE behavior, malformed JSON, unknown methods, unknown/unconfigured tools, and protocol-vs-tool execution error classification.
- REQ-MCP-020: `AgentToolMcpDescriptor` must be treated as secret-bearing runtime-only data because it carries the raw bearer token. The implementation must provide a redacted descriptor/debug view, must not persist or log raw descriptor headers or raw materialized config contents, and runtime materializers must own cleanup/redaction for any generated bearer-token files.
- REQ-MCP-021: The design and implementation must define session lifetime and revocation semantics for v1, including session granularity, run close, active turn end, mixed member lifecycle, direct revoke, TTL expiry, server restart, restored standalone runs, restored mixed-team members, client DELETE, and stale bearer config attempts.

## Acceptance Criteria

- AC-MCP-001: Starting/building the Fastify app registers a reachable MCP route without changing existing REST/GraphQL/websocket routes.
- AC-MCP-002: A test MCP client can send `initialize` to an agent tool MCP session endpoint, establish the expected Streamable HTTP GET/SSE path, and receive a valid MCP server identity/capability response; clients that also probe `resources/list` or `resources/templates/list` receive harmless empty results.
- AC-MCP-003: Generated runtime MCP config for a session with only `send_message_to` configured includes only `send_message_to` as the AutoByteus Agent Tools MCP allowlist.
- AC-MCP-003A: Design artifacts identify the preferred materializer shape for Claude Agent SDK, Claude Code CLI, Codex App Server, and Antigravity CLI, and state that materializers consume `AgentToolMcpDescriptor` rather than session registry internals.
- AC-MCP-004: `tools/list` for a session with only `send_message_to` configured returns exactly `send_message_to` and does not expose unrelated tools.
- AC-MCP-005: `tools/list` for a session without `send_message_to` does not include `send_message_to`, even if a client-side config was manually edited to request it.
- AC-MCP-006: `tools/call` for `send_message_to` with valid arguments delivers through the existing mixed-team delivery handler and returns a success text/result.
- AC-MCP-007: `tools/call` for `send_message_to` with invalid target selectors or empty content returns a validation failure equivalent to existing runtimes.
- AC-MCP-008: Unknown, revoked, expired, or capability-mismatched sessions cannot list or call tools.
- AC-MCP-009: Calling an unconfigured tool in a valid session is rejected.
- AC-MCP-010: Tool execution events can be observed in the existing event path or in a documented event bridge suitable for runtime backends/materializers.
- AC-MCP-011: Existing test suites for MCP client configuration/registration continue to pass.
- AC-MCP-012: The endpoint URL can be generated from the active server listen address/internal base URL for local runtime clients.
- AC-MCP-013: The implementation documents how an external runtime such as AGY should configure `serverUrl` using a session-scoped endpoint.
- AC-MCP-014: Design artifacts include explicit schema/projection and tool-call adapter spines showing how `send_message_to` and future browser/media/task-delegation/publish-artifacts tools use definition providers, existing contracts/manifests, existing owning services/dispatchers, and MCP result/schema mappers rather than runtime-wrapper introspection.
- AC-MCP-015: Route integration coverage exercises the DS-007 matrix: authenticated initialize/list/call/resources/ping, `notifications/initialized` and other notifications returning `202` no body, GET/SSE, DELETE authenticated `405`, unsupported HTTP method authenticated/session-resolved then `405`, Origin rejection, missing/malformed auth, unknown/expired/revoked session, token mismatch, malformed JSON, invalid request envelope `400`/`-32600`, method-level invalid params `200`/`-32602`, unknown method `-32601`, unknown tool and unconfigured tool as `200` JSON-RPC `-32602` with no MCP tool result, content/accept handling, and protocol-version fallback/rejection.
- AC-MCP-016: Unit or integration coverage proves raw bearer tokens and raw `Authorization` headers are not stored in the session registry, not emitted by redacted descriptor views, and not included in protocol/tool error bodies or expected log/debug/event surfaces.
- AC-MCP-017: Session lifecycle coverage or implementation checks prove run/member cleanup revokes owned sessions, active turn end does not revoke by default, expired/revoked/stale configs cannot list/call tools, restored runs/team members create fresh sessions before materializing config, and client DELETE does not revoke the app session in v1.

## Constraints / Dependencies

- Current date: 2026-06-13.
- Current base: `origin/personal` at `08078c265902955e5a570721e03763c5f39398f6` after fast-forward refresh; bootstrap base was `97ea4ae2055510bcfc657624e3f9b2c5c6048227`.
- Server framework: Fastify 4.x.
- MCP TypeScript SDK dependency currently exists in `autobyteus-ts`; `autobyteus-server-ts` may need a direct dependency or shared helper if using SDK server utilities.
- Existing external MCP management is client-side and must not be confused with this new outbound server endpoint.
- `send_message_to` requires a valid `AgentRunMessageSenderContext`; team-local `recipient_name` delivery requires a valid member context, while direct `target_agent_run_id` routing follows the current `agent-communication` grant/routing rules.
- The endpoint is intended for local runtime clients first. Remote/internet exposure would require a separate security design.

## Assumptions

- Streamable HTTP MCP is the preferred transport for AGY and future external runtimes because it connects directly back to the already-running AutoByteus server.
- Short `tools/call` operations may return ordinary JSON responses over POST; the endpoint should still support the Streamable HTTP GET/SSE connection path observed from Codex App Server and Claude Code.
- A per-run/per-member session is acceptable and safer than a single global MCP endpoint that exposes all tools.
- V1 session/token state can be memory-only; persistence/restoration of MCP sessions is not required for the first implementation.
- V1 app-level `AgentToolMcpSession` is per external runtime run/member runtime session, not per tool call. Active turn end does not revoke by default; run/member cleanup and explicit revoke own revocation.
- V1 does not emit MCP transport `MCP-Session-Id`; AutoByteus app `:sessionId` plus bearer token remain authoritative. Client DELETE is authenticated but does not revoke the app session in v1.
- The generated runtime MCP config should be derived from configured AutoByteus tools for that agent/run and should not expose unsupported or unconfigured tools.
- The Antigravity runtime ticket will own AGY-specific workspace MCP config materialization.

## Risks / Open Questions

- Whether to use the official MCP SDK server transport directly or implement a minimal Fastify JSON-RPC route first and verify it with the MCP SDK client.
- Exact route prefix: `/mcp/agent-tools/:sessionId` vs `/rest/agent-tools-mcp/:sessionId`.
- AGY exact Streamable HTTP behavior still needs validation before the Antigravity runtime ticket proceeds, but Codex App Server and Claude Code probes both used Streamable HTTP GET/SSE alongside POST JSON-RPC, so this endpoint should implement the standard GET/SSE path rather than POST-only behavior.
- How long agent tool MCP sessions should live after a run ends, especially for restored team members.
- Whether first implementation should include only `send_message_to`, or also task delegation/browser/media/publish-artifacts adapters.
- How to handle multiple AGY runs sharing the same repository workspace when a later ticket materializes `.agents/mcp_config.json`.

## Requirement-To-Use-Case Coverage

| Requirement | Covered Use Cases |
| --- | --- |
| REQ-MCP-001 | UC-MCP-001 |
| REQ-MCP-002 | UC-MCP-001, UC-MCP-003 |
| REQ-MCP-003 | UC-MCP-003, UC-MCP-004 |
| REQ-MCP-004 | UC-MCP-002, UC-MCP-005 |
| REQ-MCP-005 | UC-MCP-002, UC-MCP-003, UC-MCP-005 |
| REQ-MCP-006 | UC-MCP-002, UC-MCP-003, UC-MCP-005, UC-MCP-007, UC-MCP-008 |
| REQ-MCP-007 | UC-MCP-005 |
| REQ-MCP-008 | UC-MCP-004 |
| REQ-MCP-009 | UC-MCP-004 |
| REQ-MCP-010 | UC-MCP-006 |
| REQ-MCP-011 | UC-MCP-003, UC-MCP-004 |
| REQ-MCP-012 | UC-MCP-005 |
| REQ-MCP-013 | UC-MCP-008 |
| REQ-MCP-014 | UC-MCP-007 |
| REQ-MCP-015 | UC-MCP-003, UC-MCP-004, UC-MCP-005 |
| REQ-MCP-016 | UC-MCP-001 |
| REQ-MCP-017 | UC-MCP-008, UC-MCP-009 |
| REQ-MCP-018 | UC-MCP-003, UC-MCP-004, UC-MCP-007 |
| REQ-MCP-019 | UC-MCP-001, UC-MCP-003, UC-MCP-005 |
| REQ-MCP-020 | UC-MCP-002, UC-MCP-005, UC-MCP-008, UC-MCP-009 |
| REQ-MCP-021 | UC-MCP-002, UC-MCP-003, UC-MCP-005, UC-MCP-008 |

## Approval Status

Approved by user for architecture review on 2026-06-13. Round-1 architecture review returned Design Impact; Round-2 resolved AR-002/AR-003 and left a narrow AR-001 precision issue; this revision pins the remaining DS-007 unsupported-method, unknown/unconfigured-tool, and invalid-envelope behaviors and is ready for architecture re-review. Recommended first milestone: Streamable HTTP MCP infrastructure plus `send_message_to` support, secret/redacted descriptor handling, explicit route protocol/auth matrix, explicit session lifecycle policy, explicit tool schema/adapter refactor seams, and documented runtime materializer boundaries; production runtime materializers can be implemented per runtime ticket unless this ticket is explicitly expanded.
