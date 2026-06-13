# Investigation Notes

## Ticket

- Ticket slug: `streamable-mcp-runtime-tools`
- Purpose: prerequisite capability for exposing AutoByteus server-owned configured agent tools over Streamable HTTP MCP for external process runtimes, including Antigravity CLI now and future Claude Code / Codex-like runtimes.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools`
- Branch: `codex/streamable-mcp-runtime-tools`
- Base branch: `origin/personal`
- Bootstrap base commit: `97ea4ae2055510bcfc657624e3f9b2c5c6048227`
- Divergence at bootstrap: `0 0`
- Latest origin refresh: 2026-06-13 fast-forwarded `codex/streamable-mcp-runtime-tools` to `origin/personal` at `08078c265902955e5a570721e03763c5f39398f6`; current divergence `0 0`.
- Post-refresh design impact: latest base moved `send_message_to` ownership toward the broader `agent-communication` subsystem and introduced `SendMessageToDispatcher`; downstream requirements/design should extend that seam rather than creating a parallel `send_message_to` executor from the older draft paths.

## Source Log

| Date | Type | Source / Path / Command | Purpose | Finding | Impact |
| --- | --- | --- | --- | --- | --- |
| 2026-06-11 | Git | `git fetch origin --prune`; `git worktree add -b codex/streamable-mcp-runtime-tools ... origin/personal` | Create dedicated prerequisite worktree | Worktree is based on latest `origin/personal` at `97ea4ae2055510bcfc657624e3f9b2c5c6048227`. | Ticket artifacts isolated from Antigravity runtime ticket. |
| 2026-06-11 | Code | `autobyteus-server-ts/src/server-runtime.ts` | Server bootstrap | Server uses Fastify and registers REST, GraphQL, websocket, CORS, multipart. | New MCP endpoint should be registered in existing server, not a second server. |
| 2026-06-11 | Code | `autobyteus-server-ts/src/config/server-runtime-endpoints.ts` | Server URL discovery | Existing code derives `AUTOBYTEUS_INTERNAL_SERVER_BASE_URL` from listen address and normalizes loopback/wildcard hosts to `127.0.0.1`. | Use this to generate local MCP `serverUrl` for external runtime clients. |
| 2026-06-11 | Code | `autobyteus-ts/src/tools/mcp/types.ts` | Existing MCP model | Core package already models `STREAMABLE_HTTP`, `STDIO`, and `WEBSOCKET` MCP client configs. | AutoByteus consumes external MCP servers already; new ticket is outbound server-hosting, not client config. |
| 2026-06-11 | Code | `autobyteus-ts/src/tools/mcp/server/http-managed-mcp-server.ts` | Existing Streamable HTTP client | Uses `@modelcontextprotocol/sdk/client/streamableHttp.js` to connect to external Streamable HTTP MCP servers. | SDK is already part of workspace dependency graph via `autobyteus-ts`; server-side route can be tested with SDK client. |
| 2026-06-11 | Code | `autobyteus-server-ts/src/mcp-server-management/**` | MCP management | Manages external MCP server configs and registers discovered remote tools into AutoByteus. | Do not extend this as if it were server hosting; build a new Agent Tools MCP server subsystem. |
| 2026-06-11 | Code | `autobyteus-server-ts/src/agent-execution/shared/configured-agent-tool-exposure.ts` | Configured tool scoping | Centralizes configured browser/media/task/send-message/publish-artifacts exposure. | Natural input for agent-scoped MCP session allowed-tool list. |
| 2026-06-11 | Code | `agent-tools/browser/*manifest.ts`, `media/*manifest.ts`, `task-delegation/*manifest.ts` | Tool definition reuse | Several tool families already have manifest-like definitions. | Future MCP tool definitions can be adapted from shared manifests. |
| 2026-06-11 | Code | `agent-tools/team-communication/send-message-to.ts`; `agent-team-execution/services/send-message-to-*` | `send_message_to` ownership | Shared parser/validator/delivery-intent exist; actual execution needs `MemberTeamContext.deliverInterAgentMessage`. | First mandatory MCP tool can reuse server-owned delivery path. |
| 2026-06-11 | Probe from Antigravity ticket | Temporary `.agents/mcp_config.json` with stdio MCP server; `agy --print` | Verify external runtime can call MCP | AGY launched stdio MCP server, listed tools, called tool, and printed result. | Confirms MCP bridge is viable for AGY, though this ticket should implement server-hosted HTTP first. |
| 2026-06-11 | Docs from Antigravity ticket | Antigravity docs assets `cli-plugins.md`, `antigravity-2-0/mcp.md`, `gcli-migration.md` | AGY MCP config | Docs describe workspace `.agents/mcp_config.json`, stdio `command`/`args`, and remote `serverUrl` Streamable HTTP. | Later AGY runtime can configure this server endpoint through workspace MCP config. |
| 2026-06-11 | Web / Official Docs | OpenAI Codex MCP docs: `https://developers.openai.com/codex/mcp`; Codex CLI reference: `https://developers.openai.com/codex/cli/reference` | Verify Codex MCP client/config support for cross-runtime reuse | Codex supports STDIO and Streamable HTTP MCP servers; MCP config lives in `config.toml`, can be project-scoped with `.codex/config.toml`, and `codex mcp add` can register a server by streamable HTTP `--url`. | Confirms AutoByteus Streamable HTTP MCP host can be consumed by Codex-like external runtimes through config rather than bespoke tool wrappers. |
| 2026-06-11 | Web / Official Docs | Claude Code MCP docs: `https://code.claude.com/docs/en/mcp`; Claude Code CLI reference: `https://code.claude.com/docs/en/cli-reference` | Verify Claude CLI MCP client/config support for future runtime reuse | Claude Code supports remote HTTP MCP servers, `.mcp.json`, `claude mcp add-json`, and `--mcp-config`; JSON config accepts `streamable-http` as an alias for `http`. | Confirms a future Claude CLI runtime should consume the same AutoByteus MCP host instead of copying the current Claude Agent SDK in-process handler. |
| 2026-06-11 | Web / Official Spec | MCP Streamable HTTP transport spec: `https://modelcontextprotocol.io/specification/2025-11-25/basic/transports` | Verify server-side protocol/security constraints | Streamable HTTP uses JSON-RPC over a single MCP endpoint with POST and optional GET/SSE; the spec calls out Origin validation, localhost binding for local servers, and authentication. | Endpoint design must keep protocol/security at the MCP transport boundary and avoid putting team-delivery logic in the route. |
| 2026-06-11 | Command | `codex --version`; `codex app-server --help`; `codex mcp --help`; `claude --version`; `claude --help | rg -n "mcp|MCP|config" -C 2` | Smoke-check local CLI surfaces for MCP config and app-server config support | Local Codex is `codex-cli 0.139.0`; `codex app-server` exposes generic `-c, --config <key=value>` overrides but no dedicated `--mcp-config` flag; `codex mcp` manages MCP entries. Local Claude Code is `2.1.170` and exposes `--mcp-config` plus `--strict-mcp-config`. | Codex app-server can likely receive MCP server config through normal Codex config layers/overrides; Claude CLI can receive per-run MCP config more directly. |
| 2026-06-11 | Code | `autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-launch-config.ts`; `codex-app-server-client-manager.ts` | Verify how AutoByteus launches Codex app-server | AutoByteus launches `codex app-server` by default; launch args can be overridden through `CODEX_APP_SERVER_ARGS` / `CODEX_APP_SERVER_ARGS_JSON`; client manager keys app-server processes by `cwd` and reuses one app-server per normalized working directory. | Passing per-run MCP config via app-server process args is only safe if process lifetime/keying is per-run or per-session; shared cwd app-server reuse makes ephemeral per-run config risky. |
| 2026-06-11 | Web / Official Docs | OpenAI Codex app-server docs: `https://developers.openai.com/codex/app-server`; OpenAI Codex MCP docs: `https://developers.openai.com/codex/mcp` | Distinguish Codex app-server support from generic Codex CLI support | Official docs state Codex MCP config lives in `config.toml` and can be project-scoped with `.codex/config.toml` in trusted projects. App-server docs expose config RPCs (`config/read`, `config/value/write`, `config/batchWrite`), MCP startup notifications, and MCP tool-call approvals, indicating app-server participates in the same MCP/config runtime rather than a separate non-MCP surface. | For Codex app-server runtime integration, use normal Codex config/overrides rather than inventing an app-server-specific MCP flag. |
| 2026-06-11 | Local Probe | Temporary Streamable HTTP MCP server at `/tmp/autobyteus-agent-tools-mcp-probe-20260611-100433/dummy-agent-tools-mcp-server.mjs` | Verify a session-scoped Agent Tools MCP endpoint shape with `/mcp/agent-tools/probe-session` and bearer header | Curl, Codex app-server, and Claude Code reached the dummy endpoint; server log at `/tmp/autobyteus-agent-tools-mcp-probe-20260611-100433/dummy-mcp-server.ndjson` records `initialize`, `tools/list`, and `tools/call` requests. | Confirms the renamed endpoint/config shape is protocol-consumable by the target client surfaces. |
| 2026-06-11 | Local Probe | `codex app-server --stdio -c 'mcp_servers.autobyteus_agent_tools.url=...' -c 'mcp_servers.autobyteus_agent_tools.http_headers={Authorization="Bearer ..."}' ...` plus app-server JSON-RPC `mcpServerStatus/list` and `mcpServer/tool/call` | Verify Codex App Server can consume a generated MCP server config from launch-time config overrides | App-server initialized `autobyteus_agent_tools`, listed `dummy_ping` and `send_message_to`, and `mcpServer/tool/call` returned `pong:cli-override`; result artifact: `/tmp/autobyteus-agent-tools-mcp-probe-20260611-100433/codex-cli-override-result.json`. | Per-session MCP config can be injected through app-server `-c` overrides, but AutoByteus must avoid applying session-specific config to a shared cwd-keyed app-server process. |
| 2026-06-11 | Local Probe | Project `.codex/config.toml` under `/tmp/autobyteus-agent-tools-mcp-probe-20260611-100433/codex-project-config-project/.codex/config.toml` and trusted-project variant | Verify Codex App Server project/workspace config behavior | Untrusted project config was visible as a disabled layer and produced no MCP status. With `[projects."/tmp/.../codex-project-config-trusted-project"] trust_level = "trusted"`, `thread/start` plus `mcpServerStatus/list` initialized the same HTTP server and `mcpServer/tool/call` returned `pong:project-config-trusted`; result artifact: `/tmp/autobyteus-agent-tools-mcp-probe-20260611-100433/codex-project-config-trusted-result.json`. | Workspace `.codex/config.toml` is viable only for trusted projects and appears thread/cwd-scoped in app-server status; generated per-run config should prefer temporary trusted workspace or launch override. |
| 2026-06-11 | Local Probe | `claude mcp add --transport http --scope local autobyteus_agent_tools ... --header 'Authorization: Bearer ...'`; `claude mcp list`; `claude mcp get` | Verify Claude Code local/private MCP config can point at a generated HTTP endpoint | Claude wrote the local project-private config under fake HOME `.claude.json`, health-checked the server, and reported `✔ Connected`; output artifacts: `/tmp/autobyteus-agent-tools-mcp-probe-20260611-100433/claude-mcp-add-local.out`, `claude-mcp-list-local.out`, `claude-mcp-get-local.out`. | Future Claude CLI runtime can materialize a private per-project config without writing `.mcp.json` to the repository. |
| 2026-06-11 | Local Probe | `claude mcp add --transport http --scope project ...` and approved `.mcp.json` variant | Verify Claude Code workspace `.mcp.json` behavior | Project scope wrote `/tmp/autobyteus-agent-tools-mcp-probe-20260611-100433/claude-project-scope-project/.mcp.json`; before approval, Claude reported `Pending approval`; after enabling `enabledMcpjsonServers` in fake HOME, `claude mcp list/get` reported `✔ Connected`. | Repository `.mcp.json` is supported but introduces an approval step; AutoByteus should prefer ephemeral/private config for unattended runtime launches unless it owns approval state materialization. |
| 2026-06-11 | Local Probe | `claude -p --mcp-config /tmp/.../claude-mcp-config.json --strict-mcp-config --mcp-debug ...` with fake HOME/no login | Verify Claude Code command-line `--mcp-config` is actually loaded before model authentication | The command exited with `Not logged in`, but the dummy server log recorded Claude Code `2.1.170` sending `initialize`, `notifications/initialized`, `GET` SSE, and `tools/list` with the configured bearer header. | `--mcp-config` is a strong fit for generated session-scoped MCP config in a future Claude CLI runtime because it avoids durable project config and approval prompts. |
| 2026-06-11 | Code | `agent-tools/team-communication/send-message-to.ts`; `agent-tools/browser/browser-tool-service.ts`; `agent-tools/media/media-autobyteus-tools.ts`; `agent-tools/task-delegation/task-delegation-tool-service.ts`; `agent-tools/published-artifacts/publish-artifacts-tool.ts` | Verify current server-owned tool execution style | Existing tools are wrappers that parse/validate arguments, call owning services/domain handlers with `async`/`await`, and return one result. They are asynchronous in implementation but not streaming result producers. | MCP `tools/call` should map to normal JSON-RPC request/response results first; GET/SSE is for Streamable HTTP compatibility/future server-to-client messages, not first-wave tool output streaming. |
| 2026-06-13 | Git / Code Refresh | `git fetch origin --prune`; `git merge --ff-only origin/personal`; `git rev-list --left-right --count HEAD...origin/personal`; latest-code read of `autobyteus-server-ts/src/agent-communication/**`, `autobyteus-server-ts/src/agent-tools/agent-communication/**`, Codex/Claude agent-communication wrappers | Refresh dedicated worktree to latest integration branch before further design/implementation | Branch fast-forwarded from `97ea4ae2055510bcfc657624e3f9b2c5c6048227` to `08078c265902955e5a570721e03763c5f39398f6`; divergence is now `0 0`. Latest base already adds `agent-communication/services/send-message-to-dispatcher.ts` and moves tool wrappers from old `team-communication` paths to `agent-communication` paths. | Investigation/design artifacts must be revised to reflect latest code reality: use/evolve `SendMessageToDispatcher` as the canonical `send_message_to` execution seam for the MCP endpoint; avoid creating a duplicate executor based on stale draft paths. |
| 2026-06-13 | Requirement Clarification | User discussion in current design session | Clarify configured-tool materialization and local security posture | Runtime MCP config must be derived from each agent/run configured AutoByteus tool set; server-side session exposure remains authoritative even if a client edits config. User agreed that application-level `AgentToolMcpSession` plus bearer capability token are both needed in v1 despite local-first deployment, because localhost is shared by local processes and stale/leaked URLs should not be sufficient authority. | Requirements/design should make configured-and-supported tool intersection, session ID, and token validation first-version requirements, while keeping v1 in-memory/minimal. |
| 2026-06-13 | Code | `api/graphql/types/agent-run.ts`; `agent-execution/services/agent-run-service.ts`; `agent-execution/services/agent-run-provisioning-service.ts`; `agent-execution/services/agent-run-manager.ts`; runtime backend factories/bootstrapper files | Trace standalone agent run creation to find the real call site for future MCP session materialization | Standalone run starts at GraphQL `AgentRunResolver.createAgentRun` or prepared-run activation, flows through `AgentRunService`/`AgentRunProvisioningService`, then `AgentRunManager.createAgentRun`, then a runtime-specific backend factory. Codex and Claude Agent SDK bootstrappers resolve `AgentDefinitionService`, `SkillService`, `ConfiguredAgentToolExposure`, workspace, instructions, and tool configuration before starting their runtime session/thread. | Future external-process runtime adapters such as Claude Code/AGY should call `AgentToolMcpSessionService` inside their runtime bootstrapper after agent definition/configured exposure is resolved and before runtime-native config/process launch. |
| 2026-06-13 | Code | `api/graphql/types/agent-team-run.ts`; `agent-team-execution/services/team-run-service.ts`; `agent-team-execution/services/agent-team-run-manager.ts`; `agent-team-execution/backends/mixed/**`; `mixed-agent-member-handle.ts` | Trace mixed-team member runtime creation to stretch session-materialization spine beyond local adapter | Team run starts at GraphQL `AgentTeamRunResolver.createAgentTeamRun`, flows through `TeamRunService`, `AgentTeamRunManager`, `MixedTeamRunBackendFactory`, `MixedTeamManager`, and lazy member handles. A concrete member run is created when `MixedAgentMemberHandle.ensureReady()` builds `MemberTeamContext`, creates `AgentRunConfig`, and calls `AgentRunManager.createAgentRun`; then runtime-specific backend bootstrap happens. | For team members, `AgentToolMcpSessionService` should be called after `MemberTeamContext` and sender identity exist, so the MCP session can bind `AgentRunMessageSenderContext`, configured tools, and team-local delivery context. |
| 2026-06-13 | Code | `codex-thread-bootstrapper.ts`; `team-member-codex-thread-bootstrap-strategy.ts`; `claude-session.ts`; `claude-session-mcp-server-config.ts`; `build-claude-session-mcp-servers.ts`; `claude-session-tooling-options.ts` | Trace current tool-list generation/materialization patterns | Codex currently resolves configured exposure during thread bootstrap and builds dynamic tool registrations/specs from configured tools. Claude Agent SDK resolves configured exposure in session context, then per turn derives tooling options, builds in-process MCP server maps, allowed tool names, and starts the provider query with `mcpServers` and `allowedTools`. | Agent Tools MCP Server should mirror this materialization principle: supported tool definitions are generated from canonical tool adapters and filtered by configured exposure; runtime clients consume a config-derived MCP server but server-side catalog/session remains authoritative. |
| 2026-06-13 | Code / Design Critique Response | Exact current-code reads: `api/graphql/types/agent-run.ts`, `agent-run-service.ts`, `agent-run-provisioning-service.ts`, `agent-run-manager.ts`, `api/graphql/types/agent-team-run.ts`, `team-run-service.ts`, `agent-team-run-manager.ts`, `mixed-team-run-backend-factory.ts`, `mixed-team-manager.ts`, `mixed-team-member-registry.ts`, `mixed-agent-member-handle.ts`, `codex-thread-bootstrapper.ts`, `codex-thread-manager.ts`, `claude-session-bootstrapper.ts`, `claude-session.ts`, `build-claude-session-mcp-servers.ts`, `send-message-to-dispatcher.ts` | Respond to critique that data-flow spines were too short and did not show where the runtime adapter is called or how `tools/list` is produced | Confirmed the production adapter call site is runtime-specific backend/bootstrapper selected by `AgentRunManager`, with team member activation passing through `MixedAgentMemberHandle.ensureReady()` first. `tools/list` should be generated after runtime config materialization, MCP initialize, session/token resolution, session allowlist read, catalog definition lookup, and schema mapping. | Updated design spec to stretch DS-001/DS-002/DS-003 and to replace vague `RuntimeAdapter` language with runtime-specific backend/bootstrapper/materializer ownership. |
| 2026-06-13 | Web / Official Docs + Code | Claude Agent SDK docs `https://code.claude.com/docs/en/agent-sdk/mcp`; Claude Code MCP docs `https://code.claude.com/docs/en/mcp`; local `claude-sdk-client.ts` | Verify whether Claude Agent SDK supports MCP config and whether project `.claude/` is the right materialization target | Official docs say Agent SDK supports `mcpServers` directly in `query()` options and supports `.mcp.json` loaded when `project` setting source is enabled. Programmatic SDK config uses `type: "http"`; JSON config accepts `streamable-http` as an alias. Claude Code CLI project-shared MCP config is root `.mcp.json`; local/user MCP config is stored in `~/.claude.json`. General `.claude/` project files are for settings/skills/commands/memory, not the normal MCP config file. Local code already passes `mcpServers` into SDK query options and loads runtime setting sources `user`, `project`, `local`. | Claude Agent SDK should be treated as MCP-config-capable. For current AutoByteus Claude Agent SDK runtime, the safest materializer is programmatic `mcpServers` + `allowedTools`, not writing session tokens into project `.mcp.json`/`.claude`. Future Claude Code CLI can use `--mcp-config` or private local config; project `.mcp.json` should be reserved for durable/shared MCP config, not per-run bearer tokens. |
| 2026-06-13 | Design Update | `design-spec.md`, `requirements-doc.md` | Incorporate accepted runtime materializer direction and design-principles validation | Added DS-009 runtime MCP config materialization bounded local spine; updated requirements for Claude Agent SDK programmatic config, Claude Code ephemeral `--mcp-config`, Codex ephemeral per-run/session config with app-server isolation, AGY `.agents/mcp_config.json`, project `.mcp.json` as durable/shared only, and `.claude/` not used for MCP server config by default. Added explicit design-principles validation table. | The design now separates central Agent Tools MCP Server ownership from runtime-specific config materializer ownership and validates the spine/ownership/boundary model against the shared principles. |
| 2026-06-13 | Design Update / Code Review | `agent-communication/services/send-message-to-tool-contract.ts`, `agent-tools/agent-communication/send-message-to-parameter-schema.ts`, `agent-tools/agent-communication/send-message-to.ts`, browser/media/task-delegation manifests and schema files, published-artifacts contract/tool files, `design-spec.md`, `requirements-doc.md` | Tighten existing-tool refactor and schema-flow coverage after user asked whether `send_message_to`, other tools, and returned schemas were explicitly covered | `send_message_to` has shared contract/schema and `SendMessageToDispatcher` seams for v1. Browser/media/task-delegation have manifest/schema sources suitable for future MCP definition providers. Published-artifacts may require extracting a surface-neutral schema/contract before MCP exposure. `tools/list` must build full `{ name, description, inputSchema }` entries through definition providers and schema mapper, not raw allowlist names or runtime wrapper introspection. | Added DS-010 schema projection and DS-011 existing-tool adapter refactor. Requirements now include REQ-MCP-018 / AC-MCP-014. Future tool families must use the same provider + adapter + existing owning service/dispatcher pattern. |
| 2026-06-13 | User Approval / Handoff | User instruction in current session | Approve updated package for architecture review | User asked to send for review and specifically requested that architecture reviewer be critical and review all data-flow spines and design principles. | Marked requirements/design as approved for architecture review and handed off the cumulative package to `architecture_reviewer`. |
| 2026-06-13 | Architecture Review | `tickets/in-progress/streamable-mcp-runtime-tools/design-review-report.md` | Read Round-1 architecture review result | Review decision was `Fail / Design Impact` with three required updates: AR-001 exact Streamable HTTP protocol/auth/status/error matrix, AR-002 secret-bearing descriptor lifecycle, and AR-003 session lifetime/revocation/DELETE/restore semantics. | Requirements/design must be revised and resent to `architecture_reviewer` before implementation. |
| 2026-06-13 | Official Docs / Protocol Recheck | MCP transport spec `https://modelcontextprotocol.io/specification/2025-11-25/basic/transports`, MCP tools spec `https://modelcontextprotocol.io/specification/2025-11-25/server/tools`, MCP schema spec `https://modelcontextprotocol.io/specification/2025-11-25/schema`, JSON-RPC 2.0 spec `https://www.jsonrpc.org/specification` | Verify AR-001 protocol matrix details | Official MCP transport defines POST/GET same endpoint, Origin validation for local servers, Accept/content expectations, `MCP-Protocol-Version`, optional `MCP-Session-Id`, `202` no-body for notifications/responses, GET SSE/405 behavior, DELETE session termination semantics when sessions are used; MCP tools distinguish tool execution error results from protocol errors; JSON-RPC defines parse/invalid request/method/params/internal errors. | Design now pins v1: all non-OPTIONS requests require app session + bearer auth; no v1 MCP-Session-Id emitted; DELETE validates auth then returns 405; route matrix distinguishes HTTP gate errors, JSON-RPC protocol errors, and MCP tool `isError` results. |
| 2026-06-13 | Design Rework | `design-spec.md`, `requirements-doc.md`, `investigation-notes.md`, `design-rework-response-round-1.md` | Address AR-001/AR-002/AR-003 | Added DS-007 protocol/auth/status matrix and v1 `MCP-Session-Id` decision; marked `AgentToolMcpDescriptor` as secret-bearing with redacted descriptor and non-persistence/materializer cleanup rules; added DS-008 session lifetime policy for run close, turn end, mixed member lifecycle, direct revoke, TTL, server restart, restore, and DELETE. | Round-2 package is ready for architecture re-review with the review report and rework response included in the cumulative artifact package. |
| 2026-06-13 | Architecture Review Round 2 / Design Rework | `design-review-report.md`, `design-spec.md`, `requirements-doc.md`, `design-rework-response-round-2.md` | Address narrow remaining AR-001 precision findings | Round 2 resolved AR-002 and AR-003. Remaining AR-001 issue required exact DS-007 behavior for unsupported HTTP methods, unknown/unconfigured `tools/call`, and invalid JSON-RPC envelope stage. | DS-007 now authenticates/resolves session before unsupported-method `405`; unknown/unconfigured tools return exact JSON-RPC `-32602` with no MCP tool result/domain dispatch; gross invalid envelopes return HTTP `400` with JSON-RPC `-32600`, while method-level invalid params use HTTP `200` with `-32602`. Round-3 package is ready for architecture re-review. |
| 2026-06-11 | Artifact | `tickets/in-progress/streamable-mcp-runtime-tools/design-spec.md` | Produce draft refactoring design for user review | Draft design applies design-principles spine/ownership model to Agent Tools MCP Server, shared executor seam, `send_message_to` refactor, session registry, and Streamable HTTP endpoint. | Wait for explicit user review/approval before architecture reviewer handoff. |

## Current Architecture Summary

AutoByteus currently has both:

1. Runtime-specific ways to expose server tools to agents:
   - AutoByteus runtime: local `BaseTool` registry/tools.
   - Claude Agent SDK: SDK-created in-process MCP servers and tools.
   - Codex App Server: dynamic tool registrations.
2. Client-side MCP support for consuming external MCP servers:
   - Config service, managed MCP server instances, tool registrar, streamable HTTP client.
3. Latest-base shared agent communication support:
   - `autobyteus-server-ts/src/agent-communication/services/send-message-to-dispatcher.ts` now centralizes `send_message_to` parsing, validation, direct `target_agent_run_id` routing, team-local `recipient_name` routing, and delivery result shaping.
   - AutoByteus, Codex, and Claude wrappers now live under `agent-communication` paths and call or are aligned with this dispatcher.

What is still missing is the inverse MCP-host capability: AutoByteus server exposing selected server-owned agent tools outward as an MCP server for external runtime clients such as AGY and future Claude Code. The post-refresh design should treat `SendMessageToDispatcher` as the current shared `send_message_to` execution seam unless a later architecture review requires a narrower executor abstraction around it.

## Why This Should Be A Separate Ticket

Antigravity CLI runtime has two independent layers:

- Runtime execution: `agy --print`, `--model`, model catalog, conversation restoration.
- Tool/team integration: `send_message_to` and other server-owned tools through MCP.

The second layer is runtime-agnostic infrastructure. If it is implemented inside the AGY runtime ticket, it risks becoming AGY-specific and will not benefit future external runtimes. A separate prerequisite ticket forces the correct boundary: AutoByteus owns the MCP tool host; AGY only consumes it.

## Naming Decision: Agent Tools MCP Server

Follow-up discussion clarified that `runtime tools` is a misleading name in AutoByteus. In this codebase, `runtime` already means the execution backend family such as Codex, Claude, or Antigravity. The MCP feature is not a tool owned by a runtime; it is a server-owned MCP surface that a runtime adapter consumes.

Use this terminology going forward:

- Product/subsystem name: **AutoByteus Agent Tools MCP Server**.
- Session name: **AgentToolMcpSession** or **agent-scoped MCP tool session**.
- Registry name: **AgentToolMcpSessionRegistry**.
- External MCP server config name: `autobyteus_agent_tools`.
- Route prefix candidate: `/mcp/agent-tools/:sessionId` rather than `/mcp/runtime-tools/:sessionId`.

Preferred external config example:

```toml
[mcp_servers.autobyteus_agent_tools]
url = "http://127.0.0.1:8080/mcp/agent-tools/session-abc"
http_headers = { "Authorization" = "Bearer <capability-token>" }
enabled_tools = ["send_message_to"]
```

This keeps the consumer distinction clear: a runtime adapter may materialize the MCP config, but the exposed tools are AutoByteus server-owned agent tools bound to an agent run/team member context.

## Cross-Client MCP Host Understanding

The important architecture conclusion from the ticket and follow-up discussion is that this should not be framed as "add `send_message_to` for Antigravity." The durable capability is an AutoByteus-hosted, client-runtime-neutral Agent Tools MCP server that external process runtimes can consume through their native MCP configuration mechanisms.

Target reusable shape:

```text
runtime-specific backend/bootstrapper/materializer
  -> creates AgentToolMcpSession
  -> receives serverUrl + capability token/session binding
  -> materializes client-specific MCP config
  -> external runtime calls AutoByteus Streamable HTTP MCP endpoint
  -> server dispatches to server-owned tool executors
```

External client examples:

```text
Antigravity CLI runtime -> workspace `.agents/mcp_config.json` with session-scoped `serverUrl`
Future Claude CLI runtime -> `--mcp-config`, `.mcp.json`, or `claude mcp add-json` pointing at same endpoint
Codex-like external runtime -> `config.toml`, project `.codex/config.toml`, or `codex mcp add --url` pointing at same endpoint
Future external CLI runtimes -> their own config shape, same AutoByteus MCP host
```

This means the reusable split should be:

```text
Runtime-specific backend/bootstrapper/materializer owns:
- process launch / lifecycle
- workspace setup
- client-specific MCP config materialization
- stdout/stderr/event parsing
- conversation restoration if the runtime supports it

Agent Tools MCP server owns:
- run/member-scoped tool sessions
- capability token / session validation
- MCP initialize / tools/list / tools/call protocol behavior
- tool catalog dispatch from configured AutoByteus capabilities
- transport-level security such as Origin/header handling

Server-owned tool executors own:
- tool argument parsing/validation
- domain intent construction
- approval/event hooks where applicable
- invocation of the authoritative domain owner

Agent Communication / Team delivery owns:
- canonical `send_message_to` dispatch through `SendMessageToDispatcher`
- direct `target_agent_run_id` routing and grant checks
- team-local `recipient_name` delivery through `MemberTeamContext` when available
- recipient/task-agent/parent-boundary routing
- communication event projection
```

The current Claude Agent SDK runtime has an in-process MCP/tool path, and current Codex support uses dynamic tool registration. Those can remain initially, but the new server-side MCP host should become the preferred bridge for external-process runtimes such as Antigravity CLI and a future Claude CLI runtime. Future external-process runtimes should not copy the Claude Agent SDK `send_message_to` handler; they should consume the same AutoByteus MCP endpoint.

Codex app-server-specific finding: AutoByteus currently launches `codex app-server` through `CodexAppServerClientManager` with one shared process per normalized `cwd`. The local app-server CLI exposes generic `-c/--config` overrides, and official Codex docs say MCP servers are configured through `config.toml` / trusted project `.codex/config.toml`; app-server docs expose config RPCs and MCP startup/tool-call events. Therefore Codex app-server should be treated as capable of consuming AutoByteus's MCP host through normal Codex config layers or launch-time `-c` overrides, but not through a dedicated `--mcp-config` flag. Because AutoByteus reuses app-server processes per `cwd`, per-run/session MCP URLs or tokens should not be injected into a shared app-server process unless the client manager key/lifetime is changed or a per-run temporary config/cwd strategy is introduced.

Claude CLI-specific finding: Claude Code exposes `--mcp-config` and `--strict-mcp-config`, and official docs also support `.mcp.json` / `claude mcp add-json`. A future Claude CLI runtime can likely pass an ephemeral session-scoped MCP config file/string more directly than Codex app-server.

Claude Agent SDK-specific finding: the current SDK supports MCP config directly through the `mcpServers` query option, and can also load project-root `.mcp.json` when `project` setting source is enabled. The SDK docs distinguish this from Claude Code CLI installation scopes. The current AutoByteus SDK wrapper already has an `mcpServers` option in `ClaudeSdkClient.buildQueryOptions`, so a Claude SDK MCP materializer can map `AgentToolMcpDescriptor` to the SDK option shape without writing any file. This is safer for per-run session URLs/tokens than placing credentials in repository files.

Claude config-file placement clarification: project-shared Claude MCP config is root `.mcp.json`; local/user Claude MCP config is `~/.claude.json`. The project `.claude/` folder is still relevant for settings, skills, commands, memory, and local settings, but it is not the normal place to put the per-project MCP server JSON. Therefore AutoByteus should not materialize per-run bearer-token MCP config into `.claude/` by default.

Requested durable summary of Claude MCP config options:

```text
Agent SDK: programmatic mcpServers, or project-root .mcp.json
Claude Code CLI: --mcp-config, .mcp.json, claude mcp add-json, local/user config
Local/user Claude config is generally ~/.claude.json
Project .claude/ is more for settings/commands/skills/memory, not the normal per-project MCP server config file
```

Design note: project-root `.mcp.json` can be the simplest file materializer shape for durable/shared Claude MCP servers. In this ticket, however, the generated MCP config is not a stable global config: it points at one AutoByteus `AgentToolMcpSession` created for a concrete agent run or team-member run, and includes a bearer token for that session. "Programmatic materialization" means passing the MCP server config object directly into a runtime API for that run/turn instead of writing a project file. For Claude Agent SDK, AutoByteus can build `{ mcpServers: { autobyteus_agent_tools: { type: "http", url, headers } } }` from `AgentToolMcpDescriptor` and pass it into `sdkClient.startQueryTurn(...)` with `allowedTools` from the descriptor. For Codex App Server, the intended shape is also a per-agent-run/session materializer, but it must produce an ephemeral Codex config layer safely because the current app-server process is reused by normalized `cwd`; the materializer must avoid leaking one run's session URL/token into another run sharing the app-server process. For Antigravity CLI, no better programmatic API is known, so the materializer should write the runtime workspace `.agents/mcp_config.json` with the session-scoped Streamable HTTP server config. Project-root `.mcp.json` should remain for durable/shared Claude MCP config, not default per-run bearer-token materialization.

Preferred materializer direction accepted for design:

```text
Claude Agent SDK: programmatic mcpServers, no file
Claude Code CLI: generated ephemeral --mcp-config
Codex App Server: generated ephemeral config for that agent run/session, with app-server process/config isolation
Antigravity CLI: workspace .agents/mcp_config.json because no better runtime API is known
Project .mcp.json: only for durable/shared config, not per-run bearer tokens
Project .claude/: do not use for per-run MCP bearer config by default

AgentToolMcpDescriptor
  -> Claude Agent SDK materializer
  -> Claude Code CLI materializer
  -> Codex App Server materializer
  -> Antigravity CLI materializer
  -> future runtime materializers
```

Architectural implication after the 2026-06-13 origin refresh: `send_message_to` is already partially extracted behind `SendMessageToDispatcher` in `agent-communication`. The MCP endpoint should call that shared dispatcher, or a very thin server-owned executor wrapper around it if needed for common result/approval/event hooks. It must not call `AutoByteusSendMessageToTool` directly because that class is an AutoByteus local-runtime wrapper, not the authoritative communication owner.

Recommended first milestone remains narrow: implement the Agent Tools MCP server infrastructure and expose only `send_message_to`, while designing the catalog/adapter seam for future task-delegation, browser, media, and publish-artifacts tools.

## Local Probe Results: Codex App Server And Claude Code

A temporary Streamable HTTP MCP server was generated under `/tmp/autobyteus-agent-tools-mcp-probe-20260611-100433/` with endpoint:

```text
http://127.0.0.1:58117/mcp/agent-tools/probe-session
Authorization: Bearer probe-token
```

The dummy server exposed `dummy_ping` and a placeholder `send_message_to` to prove config loading, tool listing, and tool-call plumbing without requiring real AutoByteus team delivery.

### Codex App Server

- Launch-time config override worked:

  ```bash
  codex app-server --stdio \
    -c 'mcp_servers.autobyteus_agent_tools.url="http://127.0.0.1:58117/mcp/agent-tools/probe-session"' \
    -c 'mcp_servers.autobyteus_agent_tools.http_headers={Authorization="Bearer probe-token"}' \
    -c 'mcp_servers.autobyteus_agent_tools.enabled_tools=["dummy_ping","send_message_to"]'
  ```

  Through app-server JSON-RPC, `mcpServerStatus/list` returned `autobyteus_agent_tools` with both tools, and `mcpServer/tool/call` returned `pong:cli-override`.

- Project `.codex/config.toml` behavior is trust-gated. In an untrusted temp project, app-server exposed the layer as disabled and listed no MCP servers. After adding the temp project to `[projects."/tmp/..."] trust_level = "trusted"`, app-server loaded `.codex/config.toml`; with a `thread/start` carrying that cwd, `mcpServerStatus/list` and `mcpServer/tool/call` succeeded.

- Codex's MCP client sent `initialize`, `notifications/initialized`, `GET` SSE, `tools/list`, `resources/templates/list`, `resources/list`, `DELETE`, and `tools/call` requests. The real endpoint should return empty resource/resource-template lists instead of relying on clients tolerating method-not-found responses.

### Claude Code

- `claude mcp add --transport http --scope local autobyteus_agent_tools <url> --header "Authorization: Bearer probe-token"` wrote a private project-local entry under fake HOME `.claude.json`; `claude mcp list/get` health-checked it and reported `✔ Connected`.
- `claude mcp add --transport http --scope project ...` wrote workspace `.mcp.json`; Claude reported `Pending approval` until fake HOME `enabledMcpjsonServers` included `autobyteus_agent_tools`, then `claude mcp list/get` reported `✔ Connected`.
- `claude -p --mcp-config /tmp/.../claude-mcp-config.json --strict-mcp-config --mcp-debug ...` with fake HOME and no login exited with `Not logged in`, but the dummy server log proves Claude loaded the command-line MCP config first and sent `initialize`, `notifications/initialized`, `GET` SSE, and `tools/list` with the configured bearer header.

Probe conclusion: Codex App Server and Claude Code can both consume a generated AutoByteus Agent Tools MCP Server endpoint. For unattended per-run use, generated ephemeral config is safest: Codex via dedicated app-server process/config override or trusted temp cwd, Claude via `--mcp-config` or private local scope. Durable repository config is possible but introduces trust/approval concerns.

## Backend Endpoint Contract From Probes

Standards note: this endpoint must be a standard MCP Streamable HTTP endpoint, not an AutoByteus-specific REST protocol. The path can include AutoByteus's application-level `:sessionId`, but once a client reaches that URL the wire behavior should follow the MCP transport spec: POST/GET on the same MCP endpoint, JSON-RPC payloads, correct notification/status handling, optional-but-correct `MCP-Session-Id` transport session semantics, protocol-version handling, Origin validation, loopback binding for local URLs, and authentication.

The durable backend surface should be a single session-scoped Streamable HTTP MCP endpoint named around Agent Tools, not runtimes:

```text
POST    /mcp/agent-tools/:sessionId
GET     /mcp/agent-tools/:sessionId
DELETE  /mcp/agent-tools/:sessionId
OPTIONS /mcp/agent-tools/:sessionId
```

Observed client behavior and endpoint implications:

Tool execution posture from current codebase: most existing AutoByteus tools are async-capable request/response wrappers around existing server services, not streaming output producers. `send_message_to` awaits `deliverInterAgentMessage`, browser/media/task-delegation/publish-artifacts wrappers validate/parse arguments then call their owning services and return one result. The Agent Tools MCP Server should therefore return normal JSON-RPC results for tool calls by default. SSE should be implemented as Streamable HTTP compatibility/future server-to-client channel, not as the primary execution model for `send_message_to` or other first-wave tools. Avoid complex streaming results/resumability until a specific tool requires it.

- Codex App Server and Claude Code both used `POST` for JSON-RPC `initialize`, `notifications/initialized`, `tools/list`, and `tools/call`.
- Codex App Server and Claude Code both opened `GET` as the Streamable HTTP SSE path. Therefore the implementation should not be POST-only.
- Codex App Server sent `resources/templates/list` and `resources/list`; because AutoByteus Agent Tools MCP Server is initially tool-only, those methods should return empty lists.
- Some clients send `DELETE` to close the MCP transport/session. Round-2 design decision: v1 does not emit MCP transport `MCP-Session-Id`, so `DELETE` validates Origin/auth/app session and then returns `405` without revoking the AutoByteus app session. Actual AutoByteus session revocation remains owned by run/member lifecycle cleanup or explicit session-service revoke.

Session identity note: `:sessionId` is an AutoByteus application-level `AgentToolMcpSession` identifier, not an MCP protocol requirement and not the same as a client-supplied `Mcp-Session-Id` transport header. It should be mandatory in the generated AutoByteus URL so the server can resolve the run/member context, enabled tools, `MemberTeamContext`, lifecycle state, and expected capability token before returning initialize capabilities, listing tools/resources, answering ping, opening GET/SSE, handling DELETE, or calling tools. A token-only endpoint is possible in theory, but would still need equivalent session lookup semantics.

Round-2 protocol/auth matrix conclusion:

- `OPTIONS` is the only unauthenticated route path and is limited to CORS/preflight behavior.
- Every non-`OPTIONS` request validates Origin policy, bearer auth, app session ID, token hash, expiry/revocation, and request protocol/content expectations before method dispatch.
- V1 does not emit `MCP-Session-Id`; incoming `MCP-Session-Id` is ignored for identity.
- Missing `MCP-Protocol-Version` is accepted as spec fallback; known current protocol versions are accepted for the v1 tool-only behavior; malformed/unsupported values fail before method dispatch.
- `notifications/initialized` and other JSON-RPC notifications/client responses return `202` with no body after route gate validation.
- GET/SSE is supported for client compatibility but is not the primary tool-result channel.
- Protocol gate failures are HTTP errors; malformed/invalid JSON-RPC is JSON-RPC protocol error; semantic tool execution failures are MCP tool results with error content/`isError`, not transport failures.

Minimum JSON-RPC method set to implement:

```text
initialize
notifications/initialized
tools/list
tools/call
resources/list
resources/templates/list
ping
```

The external MCP config should point to this endpoint as `autobyteus_agent_tools`; session creation itself is internal server API, returning secret-bearing `serverUrl`, bearer header/capability token, and `enabledTools` to the runtime adapter for immediate config materialization. The raw descriptor must not be persisted or logged; use a redacted descriptor for diagnostics.

## Runtime Kind And MCP Config Matrix

AutoByteus should treat similarly named providers as distinct runtime adapters when their integration surfaces differ. In particular, `claude_agent_sdk` and `claude_code` are different runtime kinds even though both target Claude-family models.

| Runtime kind | Integration surface | MCP config/materialization strategy | Notes |
| --- | --- | --- | --- |
| `claude_agent_sdk` | Library/SDK integration inside the server process | Current SDK/in-process tool wiring can remain initially; may not need generated external MCP config for this ticket. | Existing Claude Agent SDK handler has custom approval/event behavior. It should eventually call shared server-owned executors, but does not need to consume the HTTP MCP endpoint unless that becomes desirable later. |
| `claude_code` / future Claude CLI runtime | External `claude` process | Prefer generated `--mcp-config <json>` plus `--strict-mcp-config` for session-scoped config. Project `.mcp.json` is supported but approval-gated and durable/shared. Local private scope writes to `~/.claude.json` under the project path. | Treat as a process runtime like AGY/Codex: adapter owns process launch, skills materialization, MCP config materialization, stdout/event parsing, and restoration. |
| `codex_app_server` | External `codex app-server` process controlled over app-server stdio/websocket JSON-RPC | `mcp_servers.autobyteus_agent_tools` TOML via launch `-c` overrides for dedicated process/session, or trusted temporary/project `.codex/config.toml` with thread/cwd binding. | AutoByteus currently reuses app-server per normalized cwd, so per-session MCP URL/token injection must avoid leaking into shared processes. |
| `antigravity_cli` | External `agy` process | Generate workspace/runtime `.agents/mcp_config.json` pointing to AutoByteus `/mcp/agent-tools/:sessionId` via AGY `serverUrl` shape. | Antigravity runtime ticket should own exact config materialization and process launch, while this ticket owns the server-side MCP host. |
| `autobyteus_local` | Native AutoByteus tool registry | Existing `BaseTool` wrappers may remain. | Should share executor/contract logic with MCP surface over time, but no external MCP config is required. |

Design implication: runtime adapters materialize skills and MCP config in the way their runtime understands; they should not reimplement `send_message_to` or other server-owned tool behavior. The Agent Tools MCP Server is the common external-process tool surface, while SDK/native runtimes may keep direct wrappers that call the same shared executors.

## Runtime Materialization Understanding

Follow-up architecture discussion clarified that MCP config should be handled like skill materialization: AutoByteus keeps one canonical capability model, and runtime adapters materialize that model into runtime-native files/flags/config. For skills this means runtime-specific skill layout/config; for tools it means runtime-specific MCP config pointing to the same AutoByteus Agent Tools MCP Server.

The runtime-specific work should therefore be config materialization and process integration, not tool behavior duplication.

## Multi-Surface Wrapper Understanding

STDIO and HTTP are transports; MCP JSON-RPC is the protocol shape; current AutoByteus/Codex/Claude tools are surface wrappers around server-owned service/domain behavior. Therefore the Agent Tools MCP Server should not be a separate business implementation. It should be another surface wrapper over shared server-owned tool executors.

Target layering:

```text
Agent communication / browser / media / task delegation / publish artifact services
  -> shared server-owned dispatch/executor contract
    -> existing AutoByteus BaseTool / Codex dynamic tool / Claude SDK handler
    -> new Streamable HTTP MCP tools/list + tools/call surface
```

Supporting both current wrappers and the new HTTP MCP server is valid. The refactor pressure is that several current wrappers still duplicate parser/validator/intent/result/event policy, especially `send_message_to`. The current agent-tool architecture is therefore not fully pure for multi-surface reuse: the services are reusable, but wrapper layers still own too much behavior. The design should make the HTTP MCP route a thin protocol adapter over a shared executor/contract layer, not another copy of wrapper policy.

Purity gaps observed:

- Pre-refresh `send_message_to` repeated parsing/validation/intent/result behavior across AutoByteus `BaseTool`, Codex dynamic tool, and Claude SDK handler; latest `origin/personal` has reduced that duplication through `SendMessageToDispatcher`.
- Remaining MCP design work should reuse/evolve the dispatcher for canonical execution and still keep approval/event emission surface-specific through explicit hook points, especially for Claude-family integrations.
- Tool schemas/results still need a canonical contract or mapper that can be converted to BaseTool/Codex/Claude/MCP shapes without putting MCP protocol code into the communication dispatcher.
- Tool execution context (`AgentRunMessageSenderContext`, optional `MemberTeamContext`, run id, runtime kind, `autoExecuteTools`, event emitter/observer) needs an explicit shared shape for the MCP session boundary rather than being hidden in each wrapper.


## Deeper Current-State Flow Trace (2026-06-13)

The first design draft had spines that were too local. The longer current flow shows where runtime adapters are actually invoked and where an MCP session should be created.

### Standalone agent run creation

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

Current examples:

- Codex App Server: `CodexThreadBootstrapper` resolves agent definition, configured skills, configured tool exposure, builds dynamic tool specs/handlers, then `CodexThreadManager.startRemoteThread` passes those to `thread/start`.
- Claude Agent SDK: `ClaudeSessionBootstrapper` resolves agent definition, configured skills, configured tool exposure, and `ClaudeSession.executeTurn` later uses `resolveClaudeSessionToolingOptions` to build MCP server config and allowed tools for `sdkClient.startQueryTurn`.

Design implication: future external process backends such as Claude Code and AGY should create the AutoByteus Agent Tools MCP session inside their runtime bootstrapper after configured exposure and sender context are known, before writing native MCP config and launching the process.

### Mixed-team member run creation

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

Design implication: team-member MCP sessions must be created after `MixedAgentMemberHandle.buildMemberRunConfig()` has a `MemberTeamContext` and before the external process runtime consumes its config. This is what allows `send_message_to` to bind both direct `target_agent_run_id` sender identity and team-local `recipient_name` delivery.

### Tool list response generation target

For the new MCP server, `tools/list` should not simply return the session `enabledTools` strings. The longer flow is:

```text
runtime-specific materializer from the external-process backend
  -> writes/passes config with `autobyteus_agent_tools.serverUrl` + bearer header
  -> external runtime process starts and loads MCP config
  -> runtime MCP client POSTs `initialize`
  -> Fastify MCP route validates Origin/auth/app session/protocol/content and parses JSON-RPC
  -> method dispatcher returns initialize capabilities
  -> runtime MCP client optionally opens GET/SSE and sends `notifications/initialized`
  -> runtime MCP client POSTs `tools/list`
  -> route / method dispatcher validates request shape
  -> AgentToolMcpSessionRegistry has already resolved app session by path session ID + bearer token + expiry/revocation
  -> session.enabledTools snapshot provides configured-and-supported names
  -> AgentToolMcpCatalog looks up supported definition providers
  -> catalog filters supported definitions by session.enabledTools
  -> v1 `send_message_to` provider builds name + description + canonical input schema from existing contracts
  -> MCP schema mapper emits MCP tool schema
  -> method dispatcher returns `{ tools: [...] }`
  -> runtime registers those available tool definitions for the model
```

This keeps runtime materialization, configured tool gating, and MCP wire response generation as separate concerns. It also answers why the server-side catalog is needed: `enabledTools` is an allowlist snapshot, not the full tool definition response.

### Adapter call-site conclusion

There should not be a vague top-level `RuntimeAdapter` service that both launches processes and owns MCP sessions. Current code reaches runtime-specific behavior through:

```text
standalone: AgentRunManager.createAgentRun -> resolveBackendFactory(runtimeKind) -> backendFactory.createBackend(config, runId)
team member: MixedAgentMemberHandle.ensureReady -> AgentRunManager.createAgentRun(memberRunConfig, memberRunId) -> resolveBackendFactory(member runtimeKind) -> backendFactory.createBackend(...)
```

Therefore future AGY/Claude Code/Codex-external production integration should put the session-service call inside that runtime-specific backend bootstrapper/materializer after `resolveConfiguredAgentToolExposure(agentDefinition)`, and after `MemberTeamContext` exists for team members. The HTTP route only consumes the session later when the runtime's MCP client calls it.

## Recommended Design Direction

Create an Agent Tools MCP session subsystem. The v1 session should be minimal but mandatory: an application-level session ID plus bearer capability token, in-memory lifecycle, configured-and-supported tool allowlist, sender context binding, expiry, and revocation. Localhost-only deployment does not remove the need for the token because localhost is reachable by unrelated local processes and generated URLs can leak through logs/config/debug output.

Create an Agent Tools MCP session subsystem:

```text
runtime-specific backend/bootstrapper or team member runtime path
  -> create AgentToolMcpSession
    -> session registry stores run/team/tool context
      -> Fastify Streamable HTTP MCP route lists/calls tools
        -> existing server-owned tool executors
```

Initial route shape candidate:

```text
POST /mcp/agent-tools/:sessionId
GET  /mcp/agent-tools/:sessionId   # Streamable HTTP/SSE compatibility; auth required
DELETE /mcp/agent-tools/:sessionId # v1 authenticated 405; app revocation is run/member lifecycle-owned
```

Potential MCP messages:

```json
{ "jsonrpc": "2.0", "id": 1, "method": "initialize", "params": { ... } }
{ "jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {} }
{ "jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": { "name": "send_message_to", "arguments": { ... } } }
```

Short tool calls such as `send_message_to` can return ordinary JSON MCP responses over POST. Because Codex App Server and Claude Code both opened GET/SSE streams during probes, the route should implement the standard Streamable HTTP GET/SSE path even though individual tool results do not need to stream.

## First Tool: `send_message_to`

Required MCP definition should match existing contract:

- name: `send_message_to`
- description: from `SEND_MESSAGE_TO_TOOL_DESCRIPTION`
- input schema:
  - `recipient_name?: string`
  - `target_agent_run_id?: string`
  - `content: string`
  - `message_type?: string`
  - `reference_files?: string[]`

Execution path:

1. Resolve the Agent Tools MCP session and confirm `send_message_to` is in `session.enabledTools`.
2. Build/use the session-bound `AgentRunMessageSenderContext`; team-local `recipient_name` paths require the session-bound `MemberTeamContext`.
3. Delegate raw arguments to `SendMessageToDispatcher.dispatch(...)`.
4. Let the dispatcher own parsing, validation, direct `target_agent_run_id` routing, team-local `recipient_name` delivery, and operation-result shaping.
5. Emit/bridge tool lifecycle events from the MCP adapter/observer, without moving event policy into the route.
6. Map the dispatcher result to MCP text/content/error shape.

The MCP adapter should not call `AutoByteusSendMessageToTool`, the Codex dynamic registration, the Claude SDK handler, `GlobalAgentRunMessageRouter`, or `MemberTeamContext` directly. Those are either runtime surfaces or internals already encapsulated by `SendMessageToDispatcher`.

## Existing Tool Schema / Adapter Refactor Notes

`tools/list` must return full MCP tool definitions, not only the configured tool names. The intended schema spine is:

```text
existing tool contract/manifest/schema source
  -> per-tool MCP definition provider
  -> AgentToolMcpCatalog
  -> AgentToolsMcpSchemaMapper
  -> MCP `{ name, description, inputSchema }`
```

V1 uses the shared send-message name/description/schema source. Future browser, media, and task-delegation adapters can read their existing manifest and parameter schema files. Published artifacts likely needs a surface-neutral contract/schema extraction before MCP exposure. Execution follows a parallel adapter spine:

```text
MCP tools/call
  -> catalog allowlist
  -> per-tool MCP executor adapter
  -> existing owning dispatcher/service
  -> result mapper
  -> MCP result
```

## Security / Capability Notes

This endpoint is local-first, but it still needs capability scoping:

- Session IDs must be unguessable.
- Bearer token/header is required even on loopback for local capability isolation; store only a token hash after creation and redact token values from logs.
- `AgentToolMcpDescriptor` is secret-bearing because it includes `Authorization: Bearer ...`; raw descriptor is runtime-only and must not be persisted/logged. Use redacted descriptor for diagnostics.
- Sessions should expire and be revocable by explicit session ID and by run/member owner cleanup.
- V1 sessions are per external runtime run/member session, not per tool call. Active turn end does not revoke by default; server restart clears sessions and restored runs/team members must create fresh sessions before materializing config.
- V1 does not emit MCP transport `MCP-Session-Id`; incoming transport session IDs do not replace app session validation.
- Tool listing/calling must be constrained by configured tool exposure and context.
- Generated runtime MCP config must include only configured-and-supported tools for the bound agent/run.
- Generated runtime config files containing bearer tokens must be ephemeral or have an explicit materializer-owned cleanup/rewrite policy; AGY workspace `.agents/mcp_config.json` is the highest-risk future materializer.
- Never expose all server tools globally.

This is not primarily user authentication; it is run/team context binding and cross-run isolation.

## Open Questions For Design

- Should the route live outside `/rest` as `/mcp/...` or under `/rest/agent-tools-mcp/...`?
- Should implementation use official MCP SDK server transport or a small Fastify JSON-RPC handler plus validation against SDK client?
- Codex App Server and Claude Code probes both opened `GET` SSE on the Streamable HTTP endpoint; AGY still needs validation, but the implementation should include the standard GET/SSE path rather than POST-only behavior.
- Should first implementation include only `send_message_to`, or also task-delegation tools because team workflows often use both?
- How should API/E2E coverage simulate restored runs/team members for the v1 fresh-session recreation policy?
- Should `autoExecuteTools: false` block MCP tool calls, request UI approval, or only apply to tool types that need approval?

## Artifact Links

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/in-progress/streamable-mcp-runtime-tools/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/in-progress/streamable-mcp-runtime-tools/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/in-progress/streamable-mcp-runtime-tools/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/in-progress/streamable-mcp-runtime-tools/design-review-report.md`
- Design rework response round 1: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/in-progress/streamable-mcp-runtime-tools/design-rework-response-round-1.md`
- Design rework response round 2: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/in-progress/streamable-mcp-runtime-tools/design-rework-response-round-2.md`
