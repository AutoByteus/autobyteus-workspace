# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete; reusing the existing branch-specific dedicated worktree because the user explicitly anchored the analysis in the origin Streamable MCP runtime tools branch.
- Current Status: Requirements direction approved by user; design spec produced and ready for architecture review.
- Investigation Goal: Understand how configured MCP definitions/tool assignments currently flow through `autobyteus-ts` and `autobyteus-server-ts`, why Codex/Claude SDK runtime materialized configs only include the server Agent Tools MCP, and what architecture is needed to expose configured MCP tools to those runtimes.
- Scope Classification (`Small`/`Medium`/`Large`): Large
- Scope Classification Rationale: The request crosses server-side MCP configuration persistence, agent-definition tool assignment, native runtime tool execution, Codex/Claude runtime materialization, per-run identity/secrets, provider config schemas, and runtime event canonicalization.
- Scope Summary: Analyze server-configured MCP support and define a path for agent-definition-selected configured MCP tools to be usable by Codex and Claude SDK runtimes.
- Primary Questions Resolved: Where are MCP definitions configured and persisted? How does native Autobyteus consume configured MCP tools? How are agent-definition tools represented? Where are Codex/Claude materialized MCP configs produced? Should external configured MCPs be materialized directly or exposed through the existing Agent Tools MCP boundary?

## Request Context

The user reports that on the origin Streamable MCP runtime tools branch, Codex and Claude use a materializer to create agent-run-specific MCP configs based on the server Agent Tools MCP. Separately, `autobyteus-ts` and `autobyteus-server-ts` support configured MCPs: after configuring an MCP and assigning its tools to an agent definition, native Autobyteus can use those tools. However, the same configured MCP tools cannot currently be used by Codex or Claude Agent SDK runtimes because there is no bridge from server-configured MCP definitions into the materialized runtime configs consumed by Codex/Claude. The desired outcome is that configured MCP tools on an agent definition can also be used by Codex and Claude SDK runtimes.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git monorepo
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/server-configured-mcp-runtime-materialization`
- Current Branch: `codex/streamable-mcp-runtime-tools`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools`
- Bootstrap Base Branch: Existing dedicated task branch tracking `origin/codex/streamable-mcp-runtime-tools`; remote default for the superrepo is `origin/personal`.
- Remote Refresh Result: `git fetch --all --prune` succeeded from `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` before bootstrap. Local task branch HEAD matches `origin/codex/streamable-mcp-runtime-tools` at `c572fcd6`.
- Task Branch: `codex/streamable-mcp-runtime-tools`
- Expected Base Branch (if known): `origin/codex/streamable-mcp-runtime-tools` for branch-specific analysis; eventual integration target likely depends on the Streamable MCP feature branch before merge to `personal`.
- Expected Finalization Target (if known): Streamable MCP runtime tools branch.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Existing uncommitted changes are present from the prior `open_tab` Streamable MCP browser regression ticket. Do not overwrite those files; this ticket adds analysis artifacts under its own ticket folder.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-16 | Command | `pwd; git rev-parse --show-toplevel; git branch --show-current; git status --short --branch; git remote -v; git worktree list` from `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` | Discover repo mode, branch, worktrees, and existing task branches | Main checkout is `personal`; relevant existing worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools` is on `codex/streamable-mcp-runtime-tools`; current main checkout has unrelated untracked article files. | No |
| 2026-06-16 | Command | `git fetch --all --prune` | Refresh tracked remote refs before branch-specific investigation | Succeeded. | No |
| 2026-06-16 | Command | `git branch -a | grep -i 'streamable\|mcp-runtime\|runtime-tools'; git symbolic-ref refs/remotes/origin/HEAD; git for-each-ref ...` | Resolve explicit user branch and base context | `origin/codex/streamable-mcp-runtime-tools` exists and matches local branch `codex/streamable-mcp-runtime-tools` at `c572fcd6`; remote HEAD is `origin/personal`. | No |
| 2026-06-16 | Command | `pwd; git status --short --branch; git rev-parse --short HEAD; git rev-parse --short origin/codex/streamable-mcp-runtime-tools` from task worktree | Verify authoritative task workspace | Worktree is on `codex/streamable-mcp-runtime-tools`, tracks origin, HEAD matches remote. Existing uncommitted files belong to another ticket. | No |
| 2026-06-16 | Other | User approval in chat after analysis summary | Lock requirements direction before design production | User approved the bigger direction: use Agent Tools MCP as the runtime-facing gateway and execute configured MCPs through existing AutoByteus MCP ownership; user requested ticket kickoff while allowing deeper detail investigation. | No |
| 2026-06-16 | Code | `autobyteus-ts/src/tools/mcp/types.ts` | Inspect core configured MCP config model | Core supports `stdio`, `streamable_http`, and `websocket`; configs include `tool_name_prefix`; stdio includes `cwd`; HTTP includes `url`, `token`, `headers`; WebSocket has separate TLS/subprotocol fields. | Yes: materialization cannot assume every core transport maps to provider schemas. |
| 2026-06-16 | Code | `autobyteus-ts/src/tools/mcp/config-service.ts` | Understand core config parsing/loading | Parses server-keyed config dictionaries, supports snake/camel aliases for transport/tool prefix, stores configs in memory. | No |
| 2026-06-16 | Code | `autobyteus-ts/src/tools/mcp/tool-registrar.ts` | Understand discovery/registration of configured MCP tools | Discovers remote tools, maps schema, registers `ToolDefinition` with registered name possibly prefixed by `tool_name_prefix`, origin `MCP`, category = `server_id`, and metadata `{ mcp_server_id }`. Remote tool name is captured privately in `McpToolFactory`, not public metadata. | Yes: if direct provider materialization is pursued later, metadata needs remote tool name. |
| 2026-06-16 | Code | `autobyteus-ts/src/tools/mcp/tool.ts` and `autobyteus-ts/src/tools/mcp/server-instance-manager.ts` | Inspect native configured MCP execution path | `GenericMcpTool` executes by creating `McpServerProxy(agentId, serverId)` and calling the stored remote tool name. `McpServerInstanceManager` owns per-agent/server instances and applies `AUTOBYTEUS_AGENT_WORKSPACE` to stdio env if a workspace path provider is configured. | Yes: Agent Tools MCP proxy path should delegate to this owner to preserve native semantics. |
| 2026-06-16 | Code | `autobyteus-server-ts/src/mcp-server-management/services/mcp-config-service.ts` | Inspect server configured MCP service | Server wraps core service, persists configs through provider, syncs into core config service, and calls `McpToolRegistrar` to register discovered tools. | No |
| 2026-06-16 | Code | `autobyteus-server-ts/src/mcp-server-management/providers/file-provider.ts` | Inspect persistence shape | Persists `mcpServers` file entries. HTTP persistence writes `url`, `headers`, enabled/prefix, but omits `token`; parse can read token if present. | Yes: auth/token shape is loose; avoid runtime-specific direct token behavior. |
| 2026-06-16 | Code | `autobyteus-ts/src/tools/mcp/server/http-managed-mcp-server.ts` | Inspect effective native streamable HTTP auth behavior | Native HTTP client passes `headers` into Streamable HTTP transport; `token` is not used here. | Yes: direct provider materializers must not invent token semantics independently. |
| 2026-06-16 | Code | `autobyteus-server-ts/src/agent-definition/domain/models.ts` | Inspect agent-definition tool selection shape | Agent definitions store `toolNames: string[]`; no MCP server ID or remote tool ID field exists. | No |
| 2026-06-16 | Code | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.ts` | Inspect native runtime tool resolution | Native resolver iterates agent `toolNames`, special-cases `send_message_to`, otherwise creates tools from `defaultToolRegistry`. This includes MCP-origin `GenericMcpTool`s, so native configured MCP execution already works. | No |
| 2026-06-16 | Code | `autobyteus-server-ts/src/agent-execution/shared/configured-agent-tool-exposure.ts` | Inspect configured tool exposure used by provider runtimes | Normalizes `configuredToolNames` but derives explicit provider-exposed families only for browser, media, task delegation, send-message, and publish-artifacts. MCP-origin registry tools remain unclassified. | Yes: this is the immediate exposure gap. |
| 2026-06-16 | Code | `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session.ts` and `agent-tool-mcp-session-service.ts` | Inspect Agent Tools MCP descriptor/session owner | Creates run-scoped `autobyteus_agent_tools` Streamable HTTP descriptor with bearer capability token and `enabledTools` resolved from catalog. | Yes: target should extend descriptor enabled tools, not leak raw external config. |
| 2026-06-16 | Code | `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-catalog.ts` | Inspect current Agent Tools MCP catalog | Static adapter-backed catalog built from default providers; lists supported built-in names and filters by configured exposure. It does not consult `defaultToolRegistry` for MCP-origin tools. | Yes: needs dynamic registry-backed configured MCP bridge. |
| 2026-06-16 | Code | `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-adapter.ts`, `agent-tool-mcp-tool-executor.ts`, `agent-tools-mcp-result-mapper.ts` | Inspect adapter execution/result contract | Adapters return `AgentOperationResult`; result mapper turns that into MCP text content. Arbitrary remote MCP results may need a raw/pass-through result variant to avoid lossy proxying. | Yes |
| 2026-06-16 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/agent-tools-mcp/codex-agent-tools-mcp-materializer.ts` | Inspect Codex materializer | Materializes one `mcp_servers.autobyteus_agent_tools` entry with URL, headers, `enabled_tools`, and startup timeout from `AgentToolMcpDescriptor`. | No |
| 2026-06-16 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | Inspect Codex bootstrap | Gets agent definition, resolves configured exposure, creates Agent Tools MCP session, and stores materialized app-server config in `codexThreadConfig.appServerConfig`. Unknown MCP-origin configured names do not become enabled tools because catalog ignores them. | Yes |
| 2026-06-16 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-materializer.ts`, `session/build-claude-session-mcp-servers.ts`, `session/claude-session-tooling-options.ts`, `session/claude-session.ts` | Inspect Claude materialization and allowed tools | Claude builds `mcpServers.autobyteus_agent_tools` from descriptor; allowed tools are generated from Agent Tools MCP enabled names. Unknown MCP-origin configured names do not become enabled names because catalog ignores them. | Yes |
| 2026-06-16 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts` and `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-session-event-converter.ts` | Inspect provider event canonicalization | Event converters normalize provider-qualified names for `autobyteus_agent_tools` back to canonical tool names. Direct external provider config would need additional per-server mapping; proxying through `autobyteus_agent_tools` reuses existing normalization. | No |
| 2026-06-16 | Doc | `autobyteus-server-ts/docs/modules/mcp_server_management.md` and `agent_tools_mcp_server.md` | Inspect local module docs | Docs distinguish MCP Server Management (consumes external MCPs) from Agent Tools MCP Server (exposes selected AutoByteus-owned tools to external runtimes). Codex/Claude materialization is documented as live-session scoped and bearer descriptors must not be persisted. | Yes: design should consciously expand Agent Tools MCP boundary or document it. |
| 2026-06-16 | Local Package Spec | `autobyteus-server-ts/node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts` around `McpServerConfig` | Verify installed Claude SDK config shapes | SDK supports `McpHttpServerConfig` (`type: 'http'`, `url`, `headers`), `McpSSEServerConfig`, `McpStdioServerConfig` (`command`, `args`, `env`), and SDK server config; stdio type does not include `cwd`; no WebSocket config observed in the union. | No |
| 2026-06-16 | Command | `codex --version; codex mcp --help; codex mcp add --help` | Verify installed Codex CLI MCP surface from local environment | Installed `codex-cli 0.140.0`; `codex mcp add` accepts stdio command or `--url` for streamable HTTP; env only for stdio; bearer token env var only for HTTP. CLI help does not cover all Autobyteus fields such as `cwd` or WebSocket. | No |

| 2026-06-16 | Code | `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session-registry.ts` | Inspect session snapshot cloning and registry shape for design detail | Sessions currently clone configured exposure and enabled tool names only. Adding configured MCP tool source snapshots requires extending session/create input and clone logic. | No |
| 2026-06-16 | Code | `autobyteus-server-ts/tests/unit/agent-tools/mcp/agent-tool-mcp-catalog.test.ts` and `agent-tool-mcp-session-service.test.ts` | Inspect existing coverage patterns for catalog/session/executor | Tests use injectable catalogs/adapters/registries; target coverage can be added without heavy runtime setup. | No |
| 2026-06-16 | Code | `autobyteus-ts/tests/unit/tools/mcp/tool.test.ts` | Verify `GenericMcpTool` execution contract | `GenericMcpTool.execute` validates args, accepts context `{ agentId }`, creates `McpServerProxy(agentId, serverId)`, forwards remote tool name and AbortSignal, and propagates result/failure. | No |
| 2026-06-16 | Code | `autobyteus-ts/src/tools/mcp/server/base-managed-mcp-server.ts` | Inspect remote call result shape and timeout behavior | `callTool` returns the MCP SDK result verbatim and applies a default timeout and AbortSignal. Proxy path can preserve arbitrary MCP results if Agent Tools MCP result mapping supports pass-through. | Yes: result mapping design must avoid text-only lossy flattening. |
| 2026-06-16 | Code | `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-method-dispatcher.ts` and `agent-tools-mcp-routes.ts` | Inspect JSON-RPC tools/list/tools/call local dispatch loop for final design detail | Dispatcher validates JSON-RPC, checks catalog availability before execution, calls executor, and maps `AgentOperationResult` through result mapper; route owns bearer/session gate. Target design must update dispatcher/mapper for typed MCP result pass-through while preserving session gate. | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Agent definition `toolNames` and configured MCP persistence/registration.
- Current execution flow for native Autobyteus:
  1. User configures MCP server through server GraphQL/UI/import.
  2. Server `McpConfigService` saves config and syncs it into `autobyteus-ts` `McpConfigService`.
  3. `McpToolRegistrar` discovers remote tools and registers `ToolDefinition`s in `defaultToolRegistry` with `ToolOrigin.MCP`.
  4. Agent definition stores selected registered tool names in `toolNames`.
  5. Native Autobyteus backend calls `resolveAutoByteusAgentTools` and creates each registry tool, including MCP-origin `GenericMcpTool`s.
  6. `GenericMcpTool` executes through `McpServerProxy` and the core MCP server instance manager.
- Current execution flow for Codex/Claude:
  1. Bootstrap loads agent definition and calls `resolveConfiguredAgentToolExposure`.
  2. Provider runtime path asks `AgentToolMcpSessionService` for a session when built-in Agent Tools MCP families are configured.
  3. `AgentToolMcpCatalog.resolveConfiguredSupportedToolNames` checks its static built-in adapter names against `configuredToolNames`.
  4. Materializer emits one `autobyteus_agent_tools` MCP server config with only those built-in enabled names.
  5. Configured external MCP-origin registry tool names are not exposed, even though they remain present in `configuredToolNames`.
- Ownership or boundary observations:
  - MCP Server Management / `autobyteus-ts` owns external MCP config and execution semantics.
  - Agent Tools MCP owns the provider-runtime-facing session capability boundary.
  - Codex/Claude bootstrappers should not reconstruct external MCP configs independently when a server-owned exposure boundary already exists.
- Current behavior summary: Native runtime can execute selected configured MCP-origin tools; Codex/Claude cannot because the materialized provider-facing MCP session only exposes static built-in Agent Tools MCP adapters.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement / Feature
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue with Shared Structure Looseness
- Refactor posture evidence summary: Refactor likely needed in the Agent Tools MCP catalog/session boundary. A direct addition in Codex/Claude bootstrappers would duplicate provider-specific external MCP materialization policy and would not preserve all core config semantics.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `configured-agent-tool-exposure.ts` | Unknown configured tool names are kept but only known built-in families are classified. | Existing exposure type is too narrow for configured MCP-origin tools. | Add/split resolver for MCP-origin registry tools. |
| `agent-tool-mcp-catalog.ts` | Static adapter map only; no registry bridge. | Provider-facing MCP boundary cannot expose dynamically registered configured MCP tools. | Extend catalog ownership. |
| `tool-registrar.ts` | Registered/prefixed tool name differs from remote tool name; remote name not in public metadata. | Direct provider materialization would need metadata tightening. | Prefer proxy path; if direct later, add metadata. |
| Claude SDK d.ts | Stdio MCP config lacks `cwd`; no WebSocket union observed. | Direct materialization cannot faithfully map all Autobyteus config fields. | Keep direct external materialization out of scope. |
| `http-managed-mcp-server.ts` and `file-provider.ts` | HTTP native path uses `headers`; `token` is loose/ineffective in observed owner. | Runtime-specific token mapping would create divergent behavior. | Keep auth semantics behind core execution owner. |
| `agent-tools-mcp-result-mapper.ts` | Current adapter result contract maps to text content. | Proxying arbitrary MCP-origin tools may need richer result preservation. | Include as requirement/design item. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/tools/mcp/types.ts` | Core MCP config model | Supports stdio/http/websocket and config fields beyond provider materializers. | Core remains authoritative config shape. |
| `autobyteus-ts/src/tools/mcp/tool-registrar.ts` | Discover/register external MCP tools | Registers MCP-origin tools in shared registry by registered name. | Catalog bridge should use registry. |
| `autobyteus-ts/src/tools/mcp/tool.ts` | Generic configured MCP tool wrapper | Stores server id, remote tool name, registered name privately and calls `McpServerProxy`. | Execution should delegate here or to same owner. |
| `autobyteus-server-ts/src/mcp-server-management/services/mcp-config-service.ts` | Server persistence/sync service | Syncs persisted configs into core service and registrar. | Materializer should not bypass this service. |
| `autobyteus-server-ts/src/agent-definition/domain/models.ts` | Agent definition data model | `toolNames` is the only selection identity. | Requirements must use registered tool names. |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.ts` | Native runtime tool resolver | Resolves arbitrary registry tool names. | Native path is the behavior baseline. |
| `autobyteus-server-ts/src/agent-execution/shared/configured-agent-tool-exposure.ts` | Configured built-in tool family classifier | Does not classify MCP-origin tools. | Needs extension/sibling. |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-catalog.ts` | Agent Tools MCP tool catalog | Static built-in adapters only. | Main refactor owner. |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session-service.ts` | Session descriptor materialization owner | Builds descriptor with enabled tools from catalog. | Descriptor should include MCP-origin selected names after catalog extension. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/agent-tools-mcp/codex-agent-tools-mcp-materializer.ts` | Codex provider config mapper | Maps descriptor to one `mcp_servers.autobyteus_agent_tools` entry. | Should remain thin. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-materializer.ts` | Claude provider config mapper | Maps descriptor to one `mcpServers.autobyteus_agent_tools` entry. | Should remain thin. |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-result-mapper.ts` | MCP call result mapping | Text-only operation result mapping. | May need raw MCP result pass-through for configured MCP proxy. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-16 | Probe | `codex --version` | Installed local Codex CLI is `codex-cli 0.140.0`. | Local Codex behavior should be treated as current installed target for this repo. |
| 2026-06-16 | Probe | `codex mcp add --help` | MCP add supports stdio command or streamable HTTP URL; env only for stdio, bearer token env only for HTTP. | Direct config mapping would not trivially preserve every Autobyteus config field. |
| 2026-06-16 | Probe | Reading `@anthropic-ai/claude-agent-sdk/sdk.d.ts` | Claude `mcpServers` supports stdio/http/sse/sdk; stdio config lacks `cwd`; no WebSocket union seen. | Direct config mapping would be lossy for some configured MCPs. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used. Investigation relied on local repository and installed local SDK/CLI artifacts.
- Version / tag / commit / freshness: Worktree branch `codex/streamable-mcp-runtime-tools` at `c572fcd6`; installed Codex CLI `0.140.0`; installed `@anthropic-ai/claude-agent-sdk` package from `autobyteus-server-ts/node_modules`.
- Relevant contract, behavior, or constraint learned: Local Claude SDK d.ts and Codex CLI help constrain direct provider config feasibility.
- Why it matters: The recommended design avoids direct per-provider external MCP config mapping in this change.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for this investigation phase.
- Required config, feature flags, env vars, or accounts: None.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: `git fetch --all --prune`.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

1. The current configured MCP data-flow spine for native runtime is coherent and already works: persisted config -> core config service -> registrar -> registry tool -> agent definition toolNames -> native resolver -> `GenericMcpTool` -> `McpServerProxy`.
2. The current Codex/Claude data-flow spine stops at the built-in Agent Tools MCP catalog: agent definition toolNames -> configured exposure -> static Agent Tools MCP catalog -> descriptor -> provider materializer. MCP-origin registry tools never enter the descriptor.
3. Direct provider materialization would need a separate spine: agent definition registered names -> registry metadata -> persisted config -> provider-specific external server config -> provider event name normalization. Current code lacks enough metadata and provider-compatible shape to make that direct path clean.
4. Extending Agent Tools MCP to include selected MCP-origin registry tools keeps provider materialization thin and one-level: agent definition registered names -> Agent Tools MCP session catalog -> existing MCP execution owner.

## Constraints / Dependencies / Compatibility Facts

- `autobyteus_agent_tools` is a reserved runtime MCP server name.
- Existing materializers are live-session-scoped and intentionally avoid durable provider config files.
- Current Agent Tools MCP route gates by session-enabled tools; provider-side `enabled_tools`/`allowedTools` is only a narrowing convenience.
- `ToolDefinition` enforces MCP-origin definitions must have `metadata.mcp_server_id`.
- Direct external materialization would need remote tool names; current public metadata does not expose them.
- Claude SDK local stdio config lacks `cwd`; Autobyteus core stdio config has `cwd`.
- Autobyteus core has WebSocket MCP support; local Claude/Codex provider surfaces inspected do not show equivalent direct WebSocket config support.

## Open Unknowns / Risks

- Whether `AgentOperationResult` should be replaced or extended at the Agent Tools MCP adapter boundary to pass through raw MCP `CallToolResult` content from proxied configured MCP-origin tools.
- Whether `McpServerInstanceManager.setWorkspacePathProvider` must be wired in server startup or whether the Agent Tools MCP adapter can execute configured MCP tools with a direct working-directory-aware context.
- Whether configured MCP `token` should be removed/tightened or mapped centrally into `headers`; current native owner does not use it.
- Whether collision handling belongs in `McpToolRegistrar`, `AgentToolMcpCatalog`, or both.

## Notes For Architect Reviewer

Design spec produced at `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/server-configured-mcp-runtime-materialization/design-spec.md`. Requirements were approved by the user on 2026-06-16. Please review the Agent Tools MCP session/catalog bridge design, especially configured-MCP source snapshots, collision policy, execution agent identity, and raw MCP result pass-through contract.
