# Design Spec

## Current-State Read

Configured external MCP support already has a coherent native-runtime spine in `autobyteus-ts`: persisted MCP configs are loaded into `McpConfigService`, `McpToolRegistrar` discovers remote tools, discovered tools are registered in `defaultToolRegistry` as `ToolOrigin.MCP`, and `GenericMcpTool` executes the selected registered tool through `McpServerProxy` and `McpServerInstanceManager`. Agent definitions store only registered tool names in `toolNames`; they do not store MCP server IDs, remote tool names, or provider-specific MCP config fragments.

The provider-runtime path is different. Codex and Claude do not execute `autobyteus-ts` tools in-process. They receive a run-scoped Streamable HTTP MCP descriptor for the server-owned `autobyteus_agent_tools` endpoint. That endpoint is currently backed by `AgentToolMcpSessionService`, `AgentToolMcpSessionRegistry`, `AgentToolMcpCatalog`, `AgentToolsMcpMethodDispatcher`, and `AgentToolMcpToolExecutor`. `AgentToolMcpCatalog` is static and only knows built-in server-owned adapters from default providers. `ConfiguredAgentToolExposure` preserves all configured tool names, but only classifies browser/media/task-delegation/send_message/publish_artifacts families. MCP-origin registry tools therefore remain present in `configuredToolNames` but never enter `enabledTools`, `tools/list`, or provider allowed-tool lists.

Directly materializing configured external MCP servers into Codex/Claude provider configs is not a clean current-code fit. The configured MCP model supports stdio/http/websocket, stdio `cwd`, custom headers, `tool_name_prefix`, and registry-level registered names. Local Claude SDK types and Codex CLI help do not expose equivalent support for every field, and direct provider materialization would need new secret-copying, remote-name mapping, provider wire-name canonicalization, and event normalization policy. The current design must instead extend the existing Agent Tools MCP boundary so provider runtimes still depend on one server-owned materialized MCP session while configured MCP execution remains delegated to the existing MCP execution owner.

## Intended Change

Expose agent-definition-selected configured MCP-origin registry tools through the existing run-scoped `autobyteus_agent_tools` MCP session for Codex and Claude. The session catalog should include two kinds of tools:

1. built-in server-owned Agent Tools MCP adapter tools, and
2. configured MCP-origin registry tools selected on the agent definition and resolved from `defaultToolRegistry`.

When Codex or Claude calls a configured MCP-origin tool through `autobyteus_agent_tools`, the server should dispatch through a new configured-MCP bridge adapter/source, create/execute the registered `GenericMcpTool`, and return a valid MCP tool result while preserving non-text remote MCP result content where possible.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement / Feature
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue with Shared Structure Looseness
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence: `AgentToolMcpCatalog` is a static built-in adapter map; provider bootstrappers consume only the `AgentToolMcpDescriptor`; `ConfiguredAgentToolExposure` keeps all names but lacks a configured-MCP source model; `AgentToolMcpToolAdapter.execute` can only return `AgentOperationResult`, causing lossy text-only mapping for arbitrary MCP results; direct provider materialization would bypass `McpConfigService`/`GenericMcpTool` and duplicate transport/secret/prefix policy.
- Design response: Make Agent Tools MCP session exposure the authoritative provider-runtime boundary. Extend the catalog/session model with immutable configured-MCP tool source snapshots. Add a configured-MCP registry-backed adapter path that delegates execution to `GenericMcpTool` and preserves raw MCP tool results through a tightened result contract.
- Refactor rationale: Without refactoring the catalog/session/result boundary, configured MCP-origin names can only be bolted into Codex/Claude materializers or provider config files, which would duplicate ownership and break the Authoritative Boundary Rule. The refactor is narrow: it stays inside Agent Tools MCP session/catalog/executor/result mapping and adds a bridge to the already-authoritative MCP registry/execution owner.
- Intentional deferrals and residual risk, if any: Direct external MCP provider config materialization remains deferred. It may be useful later for provider-native MCP UX, but it requires a separate provider-schema compatibility design for WebSocket, stdio `cwd`, auth/token semantics, registered-to-remote name mapping, and event canonicalization. This deferral does not block the in-scope behavior because the Agent Tools MCP proxy path is coherent and keeps current native execution semantics.

## Terminology

- `Configured MCP-origin tool`: a `ToolDefinition` from `defaultToolRegistry` whose `origin` is `ToolOrigin.MCP` and whose metadata includes `mcp_server_id`.
- `Registered tool name`: the name selected in an agent definition, possibly prefixed by `tool_name_prefix` during MCP discovery, e.g. `db_query`.
- `Remote MCP tool name`: the original tool name on the external MCP server, e.g. `query`. This remains owned by `GenericMcpTool`/`McpToolFactory` for this change.
- `Agent Tools MCP session`: the run-scoped server-owned Streamable HTTP MCP capability exposed to Codex/Claude as `autobyteus_agent_tools`.
- `Configured MCP source snapshot`: an immutable session-time record proving that a selected registered tool was MCP-origin and tied to a specific MCP server ID when the run session was created.

## Design Reading Order

Read this design from the runtime flow first, then the ownership model, then concrete files:

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: replace the current implicit provider omission of configured MCP-origin tools with explicit session exposure. Do not keep a fallback path where Codex/Claude silently drop selected MCP-origin registry tools once this feature lands.
- Direct external MCP provider materialization is not a legacy path being replaced; it is a rejected candidate design and must not be introduced as a parallel in-scope path.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Agent definition selected registered tool name | External configured MCP server remote tool execution | Agent Tools MCP session/catalog boundary delegating to configured MCP execution owner | This is the core user behavior: Codex/Claude can call the same configured MCP tool selected for native runs. |
| DS-002 | Primary End-to-End | Run bootstrap for Codex/Claude | Provider materialized `autobyteus_agent_tools` descriptor and allowed tools | `AgentToolMcpSessionService` | Provider runtimes only see tools that enter the descriptor/session enabled list. |
| DS-003 | Return-Event | External MCP `CallToolResult` | Provider JSON-RPC `tools/call` response and existing run tool event | `AgentToolsMcpResultMapper` plus existing provider event converters | Arbitrary remote MCP result content must not be flattened into unusable text, and canonical tool names must remain stable. |
| DS-004 | Bounded Local | `tools/call` JSON-RPC request | Adapter execution result or JSON-RPC error | `AgentToolsMcpMethodDispatcher` / `AgentToolMcpToolExecutor` | This local dispatch loop gates sessions, enabled tools, adapter lookup, observer notifications, and result mapping. |

## Primary Execution Spine(s)

- DS-001: `Provider Runtime Tool Call -> Agent Tools MCP Route/Dispatcher -> Agent Tools MCP Catalog Availability -> Configured MCP Registry Tool Adapter -> GenericMcpTool -> McpServerProxy/McpServerInstanceManager -> External Configured MCP Server`
- DS-002: `Agent Definition toolNames -> ConfiguredAgentToolExposure -> AgentToolMcpCatalog Session Exposure Resolution -> AgentToolMcpSessionRegistry Snapshot -> AgentToolMcpDescriptor -> Codex/Claude Materializer`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Codex/Claude call `mcp__autobyteus_agent_tools__db_query` or the unqualified allowed alias; the server receives `tools/call` for `db_query`, verifies the run session and enabled source snapshot, resolves a configured-MCP adapter, creates the registry tool, and delegates to the existing remote MCP execution path. | Provider runtime, Agent Tools MCP dispatcher, catalog availability, configured MCP bridge adapter, GenericMcpTool, MCP server proxy | Agent Tools MCP catalog owns exposure and dispatch selection; `autobyteus-ts` MCP owns remote execution | Session auth, source snapshot validation, result normalization, observer notifications |
| DS-002 | During run bootstrap, the server resolves configured tool names once, combines available built-in adapters with configured MCP-origin registry tools, stores both enabled names and configured-MCP source snapshots in the session, then materializes the same `autobyteus_agent_tools` descriptor used today. | Agent definition, configured exposure, catalog exposure resolver, session registry, descriptor materializer | `AgentToolMcpSessionService` | Collision diagnostics, source snapshot cloning, redaction |
| DS-003 | Remote MCP results are returned as MCP call results when already shaped correctly; built-in operation results still map to text MCP content. Existing provider event converters normalize the reserved `autobyteus_agent_tools` names to canonical registered names. | Remote MCP result, adapter execution result, result mapper, JSON-RPC response, provider event converter | `AgentToolsMcpResultMapper` for HTTP response shape; provider event converters for history names | Error/accepted semantics, non-text content preservation, secret redaction |
| DS-004 | The dispatcher validates JSON-RPC request shape, checks catalog availability before execution, calls the executor, and maps the typed execution result to JSON-RPC. The executor owns observer start/complete/error sequencing around adapter execution. | Dispatcher, catalog, executor, adapter, mapper | Dispatcher/executor local loop | JSON-RPC invalid params, observer completion acceptance, internal error hygiene |

## Spine Actors / Main-Line Nodes

- Agent definition selected `toolNames`
- `ConfiguredAgentToolExposure`
- `AgentToolMcpSessionService`
- `AgentToolMcpCatalog`
- `AgentToolMcpSessionRegistry`
- Codex/Claude materializer
- `AgentToolsMcpMethodDispatcher`
- `AgentToolMcpToolExecutor`
- `ConfiguredMcpRegistryToolAdapter`
- `GenericMcpTool`
- `McpServerProxy` / `McpServerInstanceManager`
- External configured MCP server

## Ownership Map

- Agent definition owns the user-selected registered tool names. It does not own remote MCP server IDs or provider config details.
- `ConfiguredAgentToolExposure` owns normalized configured tool-name lists and built-in family classification. It remains a shared input shape, not the configured-MCP source owner.
- `AgentToolMcpSessionService` owns run-scoped provider-facing MCP session creation and descriptor materialization. It asks the catalog for a complete session exposure object instead of only a string list.
- `AgentToolMcpCatalog` owns the provider-facing catalog of tools available inside an Agent Tools MCP session. It combines static built-in adapters and session-snapshotted configured-MCP sources.
- `ConfiguredMcpAgentToolSourceResolver` owns deriving configured-MCP source snapshots from `defaultToolRegistry` for the exact configured registered tool names.
- `ConfiguredMcpRegistryToolAdapter` owns converting an Agent Tools MCP `tools/call` into a registry-created `GenericMcpTool.execute(...)` call. It does not parse persisted MCP configs and does not open provider-specific external MCP clients.
- `GenericMcpTool` / `McpServerProxy` / `McpServerInstanceManager` remain the authoritative owner of external MCP transport, remote tool name, timeout, AbortSignal propagation, and connection reuse.
- `AgentToolsMcpResultMapper` owns converting typed adapter execution results into valid MCP JSON-RPC `tools/call` results.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| Codex/Claude Agent Tools MCP materializers | `AgentToolMcpSessionService` and `AgentToolMcpDescriptor` | Convert one server descriptor into provider-specific config shape | External MCP config reconstruction, auth mapping, remote-name mapping |
| `AgentToolsMcpMethodDispatcher` JSON-RPC methods | `AgentToolMcpCatalog`, `AgentToolMcpToolExecutor`, `AgentToolsMcpResultMapper` | HTTP/JSON-RPC entrypoint for the Streamable MCP endpoint | Registry source discovery or external MCP transport policy |
| `ConfiguredAgentToolExposure` | Agent definition `toolNames` normalization | Shared normalized selected-name input | Dynamic registry availability decisions or execution source snapshots |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Silent omission of selected MCP-origin registry tools from Codex/Claude Agent Tools MCP sessions | The session catalog will explicitly resolve configured-MCP sources | `AgentToolMcpCatalog.resolveConfiguredSessionToolExposure(...)` and configured-MCP source snapshots | In This Change | Tests should fail if a selected MCP-origin tool is absent without diagnostic. |
| Text-only adapter execution result assumption for Agent Tools MCP | Configured MCP proxy may return image/resource/structured content and `isError` | `AgentToolMcpExecutionResult` union and `AgentToolsMcpResultMapper.toolResultFromExecutionResult(...)` | In This Change | Built-in adapters can be wrapped as `operation_result`. |
| Any provider-bootstrap local filtering that recomputes built-in-only Agent Tools MCP names when descriptor enabled tools are available | It would diverge from the session catalog owner | Use descriptor/session `enabledTools` as the source for Codex/Claude provider allowed tools | In This Change where found | Claude already accepts `agentToolsMcpEnabledToolNames`; ensure configured-MCP names flow through that argument. |
| Direct external MCP materializer candidate path | It duplicates current MCP config/execution ownership and cannot faithfully represent all config fields | Agent Tools MCP configured-MCP bridge | Follow-up only if redesigned separately | Do not add in this change. |

## Return Or Event Spine(s) (If Applicable)

- DS-003: `External MCP CallToolResult -> ConfiguredMcpToolResultNormalizer -> AgentToolMcpExecutionResult(kind: "mcp_tool_result") -> AgentToolsMcpResultMapper -> JSON-RPC tools/call success response -> Provider runtime -> Existing provider event converter canonicalizes autobyteus_agent_tools tool name`
- Built-in tools retain: `AgentOperationResult -> AgentToolMcpExecutionResult(kind: "operation_result") -> text MCP content -> JSON-RPC tools/call success response`.
- If the remote MCP result has `isError: true`, the JSON-RPC response should still be a successful JSON-RPC `result` containing an MCP tool result with `isError: true`, matching MCP tool-call semantics. Observer completion should report `accepted: false` for that result.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `AgentToolsMcpMethodDispatcher`
  - Chain: `validate JSON-RPC envelope -> validate method params -> catalog availability check -> executor call -> result mapper -> JSON-RPC response`
  - Why it matters: configured-MCP calls must be rejected before remote execution if the name is unknown, not enabled, or not present in the session source snapshot.
- Parent owner: `AgentToolMcpToolExecutor`
  - Chain: `build observer event -> notify start -> adapter execute -> notify complete/error -> return typed execution result`
  - Why it matters: observer completion must understand both operation results and MCP tool results.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Configured MCP source resolution | DS-001, DS-002 | `AgentToolMcpCatalog` | Inspect configured registered names in `defaultToolRegistry`, validate `ToolOrigin.MCP`, capture `mcp_server_id` | Keeps registry-derived source identity explicit and session-scoped | Bootstrappers would parse registry/config details directly. |
| Collision diagnostics | DS-002 | `AgentToolMcpCatalog` | Detect built-in adapter vs configured-MCP name collisions and skip dynamic source deterministically | Prevents ambiguous tool ownership | Ambiguous execution owner could vary by call path. |
| Result normalization | DS-003 | `AgentToolsMcpResultMapper` and configured-MCP adapter | Preserve remote MCP content/isError/structured data while keeping built-in results supported | Avoids unusable flattened remote results | Adapter code would each invent result shapes. |
| Secret redaction | DS-002, DS-003 | Session descriptor and event/log emitters | Keep bearer tokens, external headers/env, session URL IDs out of durable logs/events | Provider materialization and debugging touch sensitive session values | Secrets could be copied to provider configs or run history. |
| Execution agent identity resolution | DS-001 | Configured-MCP bridge adapter | Choose the per-run/per-member `agentId` used by `McpServerProxy` | Keeps MCP server instances isolated consistently with runtime execution | Incorrect identity could share configured MCP process/connection/workspace between members. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Provider-facing MCP server for Codex/Claude | `autobyteus-server-ts/src/agent-tools/mcp` | Extend | It already owns run-scoped Streamable HTTP MCP descriptors, session auth, tools/list, tools/call, and provider materializer input. | N/A |
| External MCP transport/config execution | `autobyteus-ts/src/tools/mcp` | Reuse | It already owns `GenericMcpTool`, `McpServerProxy`, remote names, transports, timeout, and connection management. | N/A |
| Agent-definition selected-name normalization | `configured-agent-tool-exposure.ts` | Reuse with sibling resolver | Existing shape remains the normalized input; configured-MCP source resolution needs registry access and belongs in Agent Tools MCP catalog area. | N/A |
| Provider materialization | Existing Codex/Claude Agent Tools MCP materializers | Reuse | They should remain thin descriptor-to-provider-config mappers. | N/A |
| Configured MCP session source snapshot model | None | Create New under Agent Tools MCP configured-MCP grouping | Session needs a compact provider-facing source snapshot distinct from persisted MCP config and remote tool metadata. | Existing config models are too broad/secret-bearing. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent Tools MCP | Session exposure, tools/list, tools/call, session gating, adapter dispatch, result mapping | DS-001, DS-002, DS-003, DS-004 | Provider runtimes | Extend | Main implementation area. |
| Configured MCP bridge under Agent Tools MCP | Source snapshots, registry source resolution, registry-backed adapter execution, raw result normalization | DS-001, DS-002, DS-003 | Agent Tools MCP catalog/executor | Create New module grouping | Keep physically under `agent-tools/mcp/configured-mcp/` to avoid mixing with built-in providers. |
| Core MCP tools (`autobyteus-ts`) | Config parsing, discovery, registry definitions, remote execution | DS-001 | Configured MCP execution | Reuse | No direct provider materializer should bypass it. |
| Codex backend | Descriptor-to-Codex app-server config mapping | DS-002 | Provider bootstrap | Reuse | Should only consume descriptor enabled tools. |
| Claude backend | Descriptor-to-Claude SDK config and allowed-tool mapping | DS-002 | Provider session creation | Reuse | Ensure configured source names are included in allowed tools. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `agent-tool-mcp-session.ts` | Agent Tools MCP | Session model | Add configured-MCP source snapshot type/field and execution result type imports if local | Session shape is the run-scoped state boundary | Yes |
| `agent-tool-mcp-catalog.ts` | Agent Tools MCP | Catalog/exposure owner | Resolve complete session exposure and call availability for built-in and configured-MCP tools | Catalog is where tools/list and tools/call availability meet | Yes |
| `configured-mcp-agent-tool-source.ts` | Configured MCP bridge | Shared source model | Define `ConfiguredMcpAgentToolSource` and exposure diagnostics | Avoids duplicating source object shapes across session/catalog/adapter | N/A |
| `configured-mcp-agent-tool-source-resolver.ts` | Configured MCP bridge | Registry source resolver | Resolve configured registered names to MCP-origin source snapshots | Registry lookup policy is one responsibility | Yes |
| `configured-mcp-registry-tool-adapter.ts` | Configured MCP bridge | Execution adapter | Execute a session-snapshotted configured MCP registry tool | Keeps bridge execution out of static catalog and provider bootstrappers | Yes |
| `configured-mcp-tool-result-normalizer.ts` | Configured MCP bridge | Result normalizer | Normalize arbitrary `GenericMcpTool` returns into MCP tool results | Remote result preservation is specialized to configured-MCP proxy | Yes |
| `agent-tool-mcp-adapter.ts` | Agent Tools MCP | Adapter contract | Replace text-only return contract with typed execution result union | All adapters need one execution result contract | Yes |
| `agent-tool-mcp-tool-executor.ts` | Agent Tools MCP | Execution local loop | Notify observers based on typed execution result | Executor owns observer sequencing | Yes |
| `agent-tools-mcp-result-mapper.ts` | Agent Tools MCP | JSON-RPC/MCP result mapper | Map typed execution result to MCP tool result | Result mapping is already centralized | Yes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Configured MCP source object used by session, catalog, adapter | `configured-mcp/configured-mcp-agent-tool-source.ts` | Agent Tools MCP configured-MCP bridge | Same run-scoped source identity is needed in multiple owners | Yes | Yes | A copy of full MCP server config or secret-bearing DTO |
| Adapter execution result for built-in operation vs raw MCP tool result | `agent-tool-mcp-adapter.ts` or new `agent-tool-mcp-execution-result.ts` | Agent Tools MCP | Executor, dispatcher, mapper, and adapters need a shared typed result | Yes | Yes | A generic `unknown` result without accepted/error semantics |
| MCP tool result type | `agent-tools-mcp-result-mapper.ts` or extracted local type file | Agent Tools MCP | Built-in mapper and configured-MCP normalizer both shape MCP content | Yes | Yes | Text-only content type |
| Execution agent identity resolver | `configured-mcp/configured-mcp-execution-agent-id.ts` if logic is non-trivial; otherwise private function in adapter | Configured MCP bridge | Avoids repeated `memberRunId ?? runId` logic in tests/adapter if reused | Yes | Yes | A generic owner selector that guesses unrelated identity subjects |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `ConfiguredMcpAgentToolSource` | Yes | Yes | Low | Fields should be `kind`, `registeredToolName`, `mcpServerId`; do not include URL, headers, remote name, or full `ToolDefinition`. |
| `AgentToolMcpSessionToolExposure` | Yes | Yes | Low | Fields should be `enabledToolNames`, `configuredMcpToolSources`, and diagnostics; do not keep a parallel configured-MCP names list separate from map keys. |
| `AgentToolMcpExecutionResult` | Yes | Yes | Medium | Use discriminant `kind: "operation_result" | "mcp_tool_result"`; derive `accepted` through a helper instead of duplicating acceptance fields in both variants. |
| `McpToolResult` | Yes | Yes | Medium | Broaden content from text-only to safe MCP content records while preserving existing text result support. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session.ts` | Agent Tools MCP | Session state model | Add `configuredMcpToolSources: Record<string, ConfiguredMcpAgentToolSource>` to `AgentToolMcpSession`/create input and clone/redaction-safe helpers | Session is the immutable run-scoped source of enabled tools | `ConfiguredMcpAgentToolSource` |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session-registry.ts` | Agent Tools MCP | Session registry | Clone and store configured-MCP source snapshots; do not recompute after session creation | Registry owns session state lifetime | `ConfiguredMcpAgentToolSource` |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session-service.ts` | Agent Tools MCP | Session creation/descriptor owner | Call catalog `resolveConfiguredSessionToolExposure(...)`; pass `enabledToolNames` and `configuredMcpToolSources` into registry; build descriptor from session enabled tools | Keeps provider materializers thin | `AgentToolMcpSessionToolExposure` |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-catalog.ts` | Agent Tools MCP | Catalog owner | Combine static adapters and configured-MCP source snapshots for exposure, tools/list, and call availability; create dynamic configured-MCP adapter when source exists | Catalog is the authoritative provider-facing tool list | Source/execution result types |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-adapter.ts` | Agent Tools MCP | Adapter contract | Change `execute` return type to `Promise<AgentToolMcpExecutionResult>`; provide helper/wrapper for built-in `AgentOperationResult` if needed | One contract prevents lossy adapter-specific handling | Execution result union |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-tool-executor.ts` | Agent Tools MCP | Execution loop | Return `AgentToolMcpExecutionResult`; compute observer accepted/code through helper | Maintains one observer sequencing owner | Execution result helper |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-method-dispatcher.ts` | Agent Tools MCP | JSON-RPC dispatcher | Map executor result with `toolResultFromExecutionResult(...)` | Keeps JSON-RPC local loop unchanged except typed result | Execution result union |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-result-mapper.ts` | Agent Tools MCP | Result mapping | Broaden `McpToolResult`; add `toolResultFromExecutionResult(...)`; preserve operation-result mapping | Central response shape owner | Execution result union |
| `autobyteus-server-ts/src/agent-tools/mcp/configured-mcp/configured-mcp-agent-tool-source.ts` | Configured MCP bridge | Source model | Define source snapshot and diagnostics types | Prevents full config leakage and duplicate shapes | N/A |
| `autobyteus-server-ts/src/agent-tools/mcp/configured-mcp/configured-mcp-agent-tool-source-resolver.ts` | Configured MCP bridge | Registry source resolver | Resolve selected registered names from `defaultToolRegistry`; validate `ToolOrigin.MCP` and metadata; emit diagnostics for missing/collision cases | One registry policy owner | Source model |
| `autobyteus-server-ts/src/agent-tools/mcp/configured-mcp/configured-mcp-registry-tool-adapter.ts` | Configured MCP bridge | Dynamic adapter | Build tool definition from registry definition/schema and execute the registered tool with session execution identity | Bridge execution is separate from static provider adapters | Result normalizer/source model |
| `autobyteus-server-ts/src/agent-tools/mcp/configured-mcp/configured-mcp-tool-result-normalizer.ts` | Configured MCP bridge | MCP result normalizer | Preserve `content`, `isError`, `structuredContent`, and `_meta` from remote MCP results when safe; fallback unknown values to text/JSON | Remote result shape is specialized | `McpToolResult` |
| `autobyteus-server-ts/src/agent-execution/backends/codex/...` | Codex backend | Provider materialization | Use descriptor enabled tools produced by session service; no direct external MCP mapping | Thin provider mapper remains provider-specific only | Descriptor |
| `autobyteus-server-ts/src/agent-execution/backends/claude/...` | Claude backend | Provider session tooling | Ensure `agentToolsMcpEnabledToolNames` from descriptor/session flow into allowed tools and tooling requested state | Claude allowed-tool gating needs configured names | Descriptor |

## Ownership Boundaries

The authoritative boundary for provider runtimes is `AgentToolMcpSessionService` plus the `AgentToolMcpDescriptor`; Codex and Claude bootstrappers may create sessions and materialize descriptors but must not read persisted MCP config or registry internals to build separate provider MCP configs.

The authoritative boundary for configured external MCP execution remains `GenericMcpTool`/`McpServerProxy`. The configured-MCP bridge adapter may create the registered tool and call `execute`, but it must not reimplement MCP transport clients, parse server configs, or infer remote tool names outside the registry-created tool.

The authoritative boundary for session-visible tool availability is `AgentToolMcpCatalog`. The session registry stores snapshots that the catalog resolved; the dispatcher/executor consume those snapshots but do not recompute configured-MCP registry availability at call time except to validate stale/missing registry definitions before execution.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgentToolMcpSessionService` | Catalog exposure resolution, session registry, descriptor redaction | Codex/Claude bootstrappers | Bootstrappers directly building enabled tools from static built-in names or external MCP configs | Add required fields to session exposure/descriptor API |
| `AgentToolMcpCatalog` | Built-in adapter map, configured-MCP source resolver, dynamic call availability | Session service, dispatcher, executor | Dispatcher reads `session.configuredMcpToolSources` and manually creates tools | Add catalog call-availability variant/API |
| `GenericMcpTool` / `McpServerProxy` | Remote tool name, server ID binding, transport, timeout, AbortSignal | Configured-MCP bridge adapter | Adapter re-parses persisted MCP configs and constructs provider clients | Add a core API/metadata only if execution cannot be performed through registered tool |
| `AgentToolsMcpResultMapper` | JSON-RPC success/error and MCP tool result shaping | Dispatcher | Adapters return arbitrary JSON-RPC bodies | Broaden typed result contract and mapper methods |

## Dependency Rules

- Codex/Claude provider code may depend on `AgentToolMcpSessionService` and materialized descriptors. It must not depend on `McpConfigService`, `McpToolRegistrar`, `McpServerInstanceManager`, or persisted MCP provider classes for this feature.
- `AgentToolMcpCatalog` may depend on the configured-MCP source resolver and static built-in adapter providers. It may depend on registry interfaces/types needed to identify MCP-origin tools, but it must not own remote transport execution.
- The configured-MCP adapter may depend on `defaultToolRegistry`/`ToolRegistry` to create the selected registered tool and on `GenericMcpTool` through the registry-created `BaseTool` interface. It must not import provider-specific Codex or Claude code.
- Result mapper/executor may depend on the shared `AgentToolMcpExecutionResult` type. Built-in adapters should use a helper to wrap existing `AgentOperationResult` rather than each hand-writing result unions.
- No layer above Agent Tools MCP should depend on both the `AgentToolMcpSessionService` and the internal configured-MCP source resolver.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `AgentToolMcpCatalog.resolveConfiguredSessionToolExposure(input)` | Session-visible tool exposure | Return enabled built-in and configured-MCP tool names plus source snapshots/diagnostics | `{ configuredExposure, sender, executionContext }` | Replaces the old string-only exposure query as the session-service path. |
| `AgentToolMcpCatalog.resolveToolCallAvailability(session, toolName)` | Call availability | Return either static adapter availability or dynamic configured-MCP adapter availability | `AgentToolMcpSession`, registered tool name | Must verify `session.enabledTools` and configured source snapshot. |
| `ConfiguredMcpAgentToolSourceResolver.resolve(input)` | Configured MCP source snapshots | Resolve selected registered tool names to MCP-origin source records | `{ configuredToolNames, reservedToolNames }` | Does not return full configs or secrets. |
| `ConfiguredMcpRegistryToolAdapter.execute(input)` | Configured MCP bridge execution | Create/execute selected registry tool through existing MCP owner | `{ session, rawArguments }` and source snapshot | Uses run/member-scoped execution agent ID. |
| `AgentToolsMcpResultMapper.toolResultFromExecutionResult(toolName, result)` | MCP tool result response | Convert typed execution results into MCP-compatible tool results | Registered tool name and execution result union | Replaces `toolResultFromOperationResult` in dispatcher path. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `resolveConfiguredSessionToolExposure` | Yes | Yes | Low | Use configured registered names plus context; do not accept raw MCP server IDs. |
| `resolveToolCallAvailability` | Yes | Yes | Low | Return a discriminated availability result if needed to distinguish built-in vs configured-MCP adapter. |
| `ConfiguredMcpAgentToolSourceResolver.resolve` | Yes | Yes | Low | Require registered tool names and reserved built-in names. |
| `ConfiguredMcpRegistryToolAdapter.execute` | Yes | Yes | Medium | Validate session source still matches registry metadata before executing; reject stale/mismatched source. |
| `toolResultFromExecutionResult` | Yes | Yes | Low | Keep JSON-RPC response creation separate from MCP tool result shape. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Runtime-facing provider MCP server | `Agent Tools MCP` / `autobyteus_agent_tools` | Yes | Low | Keep existing reserved name. |
| Dynamic configured MCP source | `ConfiguredMcpAgentToolSource` | Yes | Low | Avoid generic `DynamicToolSource`. |
| Registry bridge adapter | `ConfiguredMcpRegistryToolAdapter` | Yes | Low | Name says it bridges registry-created configured MCP tools. |
| Source resolver | `ConfiguredMcpAgentToolSourceResolver` | Yes | Low | Keep separate from config persistence service. |
| Execution result | `AgentToolMcpExecutionResult` | Yes | Medium | Use only for Agent Tools MCP adapter/executor boundary, not global operation results. |

## Applied Patterns (If Any)

- Adapter pattern: existing `AgentToolMcpToolAdapter` continues to adapt provider-facing MCP calls to server-owned tool implementations. The configured-MCP registry adapter is a new adapter variant under the same owner.
- Snapshot pattern: session creation captures configured-MCP source snapshots so a run's exposure does not drift just because the global registry changes later. Execution still validates the registry at call time to fail safely if a source becomes stale.
- Result union pattern: `AgentToolMcpExecutionResult` models the two real result families instead of forcing remote MCP results into `AgentOperationResult`.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/mcp/configured-mcp/` | Folder | Configured MCP bridge under Agent Tools MCP | Source resolution, registry adapter, result normalization | This is a meaningful sub-area of Agent Tools MCP, not a built-in adapter provider | Provider-specific Codex/Claude materialization or persisted config parsing |
| `.../configured-mcp-agent-tool-source.ts` | File | Source model | Compact session source and diagnostics types | Shared by session/catalog/adapter | Headers, env, tokens, full config DTOs |
| `.../configured-mcp-agent-tool-source-resolver.ts` | File | Source resolver | Registry lookup and collision diagnostics | Keeps registry policy centralized | Tool execution or provider config generation |
| `.../configured-mcp-registry-tool-adapter.ts` | File | Adapter | Execute selected registered MCP-origin tool through registry-created tool | Keeps dynamic execution behind catalog adapter | Manual transport clients |
| `.../configured-mcp-tool-result-normalizer.ts` | File | Result normalizer | Preserve raw MCP result shape safely | Keeps remote-MCP-specific normalization out of generic mapper | JSON-RPC response envelopes |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session.ts` | File | Session model | Add source snapshot field and cloning/redaction-safe types | Existing session state owner | Provider-specific config shapes |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-catalog.ts` | File | Catalog | Merge built-in and configured-MCP tools for session exposure and call availability | Existing tools/list and availability owner | External MCP transport logic |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-adapter.ts` | File | Adapter contract | Typed execution result union and adapter return signature | Existing adapter contract owner | JSON-RPC response bodies |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-result-mapper.ts` | File | Result mapping | MCP tool result and JSON-RPC mapping | Existing mapper owner | Remote execution or registry lookup |
| `autobyteus-server-ts/src/agent-tools/mcp/providers/` | Folder | Built-in adapter providers | Continue static built-in adapters | Existing built-in provider grouping | Configured MCP registry bridge files |
| `autobyteus-server-ts/src/agent-execution/backends/codex/agent-tools-mcp/` | Folder | Codex descriptor mapping | Continue mapping descriptor to Codex config | Provider-specific translation only | Configured MCP registry/config lookup |
| `autobyteus-server-ts/src/agent-execution/backends/claude/agent-tools-mcp/` and session tooling files | Folder/File | Claude descriptor/allowed tool mapping | Include descriptor enabled names in allowed tools | Provider-specific translation only | Configured MCP registry/config lookup |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `agent-tools/mcp/` | Mixed Justified | Yes | Medium | Existing folder mixes route, session, catalog, providers. New configured-MCP folder avoids making it flatter/more mixed. |
| `agent-tools/mcp/configured-mcp/` | Off-Spine Concern | Yes | Low | Contains only registry-backed bridge concerns serving Agent Tools MCP. |
| `agent-tools/mcp/providers/` | Off-Spine Concern | Yes | Low | Static built-in adapter providers remain separate from dynamic configured-MCP bridge. |
| `agent-execution/backends/codex/...` | Transport/provider mapping | Yes | Low | Should remain descriptor-only. |
| `agent-execution/backends/claude/...` | Transport/provider mapping | Yes | Low | Should remain descriptor/allowed-tool-only. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Provider config shape | Codex receives `{ mcp_servers: { autobyteus_agent_tools: { url, http_headers, enabled_tools: ["db_query"] } } }`; Claude receives one `autobyteus_agent_tools` server and allowed names for `db_query`. | Codex/Claude receive separate direct external server configs for the user's `db` MCP server with copied headers/env. | Shows the boundary stays server-owned and session-scoped. |
| Execution path | `tools/call db_query -> ConfiguredMcpRegistryToolAdapter -> defaultToolRegistry.createTool("db_query") -> tool.execute({ agentId }, args)` | `tools/call db_query -> read mcps.json -> reconstruct streamable HTTP client -> call remote "query"` | Preserves existing registered-to-remote-name and transport semantics. |
| Source snapshot | `{ kind: "configured_mcp_tool", registeredToolName: "db_query", mcpServerId: "sqlite" }` | `{ server_id, url, headers, token, remoteToolName, registeredToolName }` | Snapshot should prove authorization/source without leaking full config or duplicating remote-name ownership. |
| Collision policy | If static `open_tab` adapter exists and an external MCP also registers `open_tab`, expose the static `open_tab` only and log/diagnose skipped configured-MCP collision. | Expose both or choose whichever is registered last in `ToolRegistry`. | Prevents ambiguous tool ownership and call routing. |
| Result mapping | Remote `{ content: [{ type: "text", text: "ok" }], isError: true }` remains an MCP tool result with `isError: true`; observer completion uses `accepted: false`. | Convert every remote result into one JSON string text block and mark accepted true unless an exception was thrown. | Preserves common MCP result semantics. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep Codex/Claude built-in-only exposure and add direct external MCP provider configs next to it | Seems to use provider-native MCP support | Rejected | Extend Agent Tools MCP catalog/session exposure and bridge execution to existing core MCP owner. |
| Keep `AgentToolMcpToolAdapter.execute` returning only `AgentOperationResult` and stringify configured MCP results | Minimal contract change | Rejected | Introduce typed `AgentToolMcpExecutionResult` and raw MCP result variant. |
| Allow provider materializers to filter/augment enabled tools independently after session creation | Quick provider-local fix | Rejected | Session catalog is the authoritative enabled-tools owner; materializers consume descriptors. |
| Preserve silent omission of unknown configured tool names | Existing behavior | Rejected | MCP-origin configured names are resolved explicitly; missing/unavailable/colliding names generate diagnostics and are not silently hidden. |
| Add broad compatibility wrapper that accepts both old and new session fields indefinitely | Would reduce refactor surface | Rejected | Update session creation/registry/tests cleanly; old string-only service path should not remain the main path. |

## Derived Layering (If Useful)

- Provider layer: Codex/Claude bootstrappers and materializers translate an `AgentToolMcpDescriptor` into provider config/allowed tools.
- Agent Tools MCP boundary layer: sessions, catalog, dispatcher, executor, result mapper own provider-facing MCP behavior.
- Configured-MCP bridge module: source snapshots and registry adapter connect Agent Tools MCP to core configured MCP execution.
- Core MCP execution layer: `autobyteus-ts` `GenericMcpTool` and `McpServerProxy` own external MCP calls.

The provider layer must not skip the Agent Tools MCP boundary and reach into core MCP config/execution directly.

## Migration / Refactor Sequence

1. Add shared configured-MCP source and execution result types.
   - Create `configured-mcp/configured-mcp-agent-tool-source.ts`.
   - Add/extract `AgentToolMcpExecutionResult`, helpers for operation-result wrapping, and broaden `McpToolResult` content type.
2. Add configured-MCP source resolution.
   - Implement `ConfiguredMcpAgentToolSourceResolver` against injectable `ToolRegistry`/`defaultToolRegistry`.
   - Validate `ToolOrigin.MCP` and `metadata.mcp_server_id`.
   - Accept reserved built-in names from catalog so collisions skip dynamic exposure with diagnostics.
3. Extend catalog/session exposure.
   - Replace `AgentToolMcpSessionService` use of `resolveConfiguredSupportedToolNames(...)` with `resolveConfiguredSessionToolExposure(...)`.
   - Store `enabledToolNames` and `configuredMcpToolSources` in `AgentToolMcpSession` through registry clone logic.
   - Keep `resolveConfiguredSupportedToolNames(...)` only as a test/internal convenience if still useful; do not let production session creation depend on the old string-only behavior.
4. Add configured-MCP dynamic adapter and tools/list support.
   - Build MCP tool definitions for configured-MCP sources from registry `ToolDefinition` description/schema through existing schema mapper.
   - Make `resolveToolCallAvailability(...)` return a configured-MCP adapter when the session has a matching source snapshot and the name is enabled.
5. Refactor executor/dispatcher/result mapper.
   - Built-in adapters return/wrap `operation_result`.
   - Configured-MCP adapter returns `mcp_tool_result` after normalizing `GenericMcpTool.execute(...)` result.
   - Dispatcher maps typed execution results to JSON-RPC `tools/call` results.
   - Observer completion derives `accepted` from the union (`operation_result.accepted` or `!toolResult.isError`).
6. Verify provider bootstrap/materializer flow.
   - Codex app-server config must include configured-MCP names in `enabled_tools` through descriptor only.
   - Claude session tooling must include configured-MCP names in `agentToolsMcpEnabledToolNames` and `allowedTools`; `agentToolsMcpToolingRequested` should be true if descriptor/session enabled tools are non-empty, not only if built-in families are present.
7. Add/update tests.
   - Catalog source resolution and collision tests.
   - Session service descriptor/source snapshot tests.
   - Method dispatcher `tools/list`/`tools/call` tests for configured-MCP tool with fake registry tool.
   - Executor observer accepted/error tests for raw MCP `isError` results.
   - Codex materialization/bootstrap test showing `enabled_tools` includes configured-MCP name.
   - Claude tooling/session test showing allowed names include configured-MCP name and `mcp__autobyteus_agent_tools__<tool>`.
   - Secret/redaction regression: descriptor/history/log-facing shapes do not include external headers/env/tokens.
8. Documentation sync after implementation.
   - Update Agent Tools MCP server docs to describe configured-MCP proxy exposure.
   - Update MCP server management docs to state provider runtimes use the server Agent Tools MCP bridge, not direct external MCP config materialization.

## Key Tradeoffs

- Proxying through `autobyteus_agent_tools` adds one server hop for Codex/Claude tool calls, but it preserves existing transport, prefix, auth/header, connection lifecycle, and event canonicalization semantics.
- Source snapshots avoid run-time exposure drift, but execution still needs a call-time stale-registry check because a global registry entry may be unregistered after session creation. The correct behavior is fail closed with a clear non-secret error.
- Keeping direct provider external MCP materialization out of scope avoids lossy mappings now, but means provider-native UI may only see the AutoByteus proxy server name. Existing event converters already canonicalize tool names under that reserved server, which is preferable for this change.

## Risks

- `GenericMcpTool.execute({ agentId }, ...)` requires the correct run/member identity for `McpServerProxy`. The adapter should use `session.owner.memberRunId ?? session.owner.runId` unless implementation finds native runtime uses a stricter identity; tests should cover team-member isolation.
- `ToolDefinition` public metadata only includes `mcp_server_id`; the remote tool name is private in `McpToolFactory`/`GenericMcpTool`. This is acceptable for proxy execution because the registry-created tool owns remote name binding. Do not design direct materialization without adding explicit metadata in a separate change.
- Existing `McpToolRegistrar`/`ToolRegistry` behavior for name collisions may overwrite or reject earlier entries depending on registry semantics. Agent Tools MCP must still protect static built-in adapter names from dynamic configured-MCP exposure.
- Broadening MCP result content types must remain safe and protocol-compatible. Unknown result shapes should fallback to text/JSON rather than leaking internal objects with secrets.
- Existing uncommitted work from the `open-tab` regression ticket is present in the worktree; implementation must avoid overwriting those unrelated files.

## Guidance For Implementation

- Keep Codex and Claude materializers descriptor-driven. If implementation code starts reading MCP config persistence or `mcps.json` from provider bootstrappers, it is violating the design.
- Prefer dependency injection for registry/source resolver in catalog tests. Existing unit tests already use injectable catalogs/adapters/registries and should be extended rather than requiring live MCP servers.
- Keep source snapshots compact and redaction-safe. They should be safe to inspect in tests/logs because they contain only registered name and MCP server ID, not headers/env/token/url.
- Use existing schema mapping for `tools/list`; configured-MCP tool definitions should expose the registered tool name and the registry definition's description/input schema.
- Call-time validation should fail closed if the session source says `mcpServerId: "sqlite"` but the current registry definition is missing, is not `ToolOrigin.MCP`, or has a different `mcp_server_id`.
- Result normalization should preserve MCP tool-result fields that provider runtimes understand (`content`, `isError`, `structuredContent`, `_meta`) and should not wrap an already-valid MCP result in another text string.
- Implement collision diagnostics without secrets. A log like `Configured MCP tool 'open_tab' was not exposed because it collides with a built-in Agent Tools MCP adapter.` is acceptable; dumping config headers/env is not.
