# Design Spec

## Current-State Read

The merged base branch has the right top-level runtime-neutral boundary for external runtime tool exposure: `autobyteus_agent_tools`, served by `autobyteus-server-ts/src/agent-tools/mcp/**` at `/mcp/agent-tools/:sessionId`. The current route/session/method dispatcher shape is not the problem. The remaining issue is that the shared MCP boundary is still a `send_message_to`-only implementation while other server-owned backend agent tools remain duplicated in runtime-specific projections.

Current primary flow for `send_message_to` is healthy and should be generalized:

```text
Claude/Codex runtime materializer
  -> AgentToolMcpSessionService.createAgentToolMcpSession
  -> AgentToolMcpDescriptor { name: autobyteus_agent_tools, url, headers, enabledTools }
  -> runtime-native MCP config
  -> /mcp/agent-tools/:sessionId tools/list / tools/call
  -> AgentToolsMcpMethodDispatcher
  -> AgentToolMcpCatalog / AgentToolMcpToolExecutor
  -> SendMessageToDispatcher
  -> canonical runtime events/history/memory traces
```

Current duplicated paths for non-send-message families:

- Claude Agent SDK builds SDK-created local MCP servers:
  - `autobyteus_browser` for browser tools.
  - `autobyteus_image_audio` for media tools.
  - `autobyteus_team` for task-delegation tools.
  - `autobyteus_published_artifacts` for `publish_artifacts`.
- Codex App Server builds `dynamicTools` and runtime-local dynamic handlers for browser, media, task-delegation, and `publish_artifacts`.
- Each runtime-specific path repeats schema mapping, handler binding, result/error wrapping, and gating.

Current ownership observations:

- `agent-tools/mcp` should own external-runtime MCP sessions, descriptors, catalog, tool availability, route execution, MCP result shape, and no-secret transport behavior.
- Family-specific behavior belongs to existing family owners:
  - Browser: `agent-tools/browser/**`.
  - Media: `agent-tools/media/**`.
  - Task delegation: `agent-tools/task-delegation/**` plus team-run/task-delegation services.
  - Published artifacts: `services/published-artifacts/**` plus the tool contract in `agent-tools/published-artifacts/**`.
  - Send message: `agent-communication/services/**` and `agent-tools/agent-communication/**`.
- Claude/Codex runtime backends should own only runtime-native materialization, startup, approval/event conversion, and cleanup. They should not own family behavior or schemas for these server-owned backend tools.

Constraints the target design must respect:

- No persisted bearer descriptors or file-backed MCP config.
- Codex must keep using thread-scoped `config.mcp_servers`, not process-wide launch args or `.codex/config.toml` writes.
- Claude must keep using SDK query `mcpServers`, not project/user config files.
- AutoByteus native remains local/in-process.
- Browser support remains unavailable unless the browser bridge/service is configured.
- Task delegation remains team-member-only.
- Application events/history/memory must show canonical tool names and no secrets.

## Intended Change

Extend `autobyteus_agent_tools` from a send-message-only MCP route into the authoritative external-runtime MCP projection for all currently duplicated server-owned backend agent tool families in Claude Agent SDK and Codex App Server:

- `send_message_to`
- Browser tools: `open_tab`, `navigate_to`, `close_tab`, `list_tabs`, `read_page`, `screenshot`, `dom_snapshot`, `run_script`, `set_device_emulation`
- Media tools: `generate_image`, `edit_image`, `generate_speech`
- Task-delegation tools: `delegate_tasks`, `submit_task_result`, `review_task_result`
- `publish_artifacts`

The implementation should add a provider/adapter model inside the Agent Tools MCP subsystem, use existing family manifests/services for behavior, generalize Claude/Codex materializers to consume a descriptor with any enabled in-scope tools, and remove/decommission old runtime-specific local MCP/dynamic projections for migrated tools.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature plus architecture refactor and cleanup.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Duplicated Policy Or Coordination; Boundary Or Ownership Issue; File Placement Or Responsibility Drift; Legacy Or Compatibility Pressure if old paths remain active.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes.
- Evidence: `agent-tools/mcp/agent-tool-mcp-catalog.ts` defaults to one send-message definition provider; `agent-tool-mcp-tool-executor.ts` hard-codes `send_message_to`; Claude and Codex runtime backend folders each duplicate browser/media/task/publish schema conversion and execution binding. `ConfiguredAgentToolExposure` and family manifests already provide shared ownership points that make the duplicated runtime projections unnecessary.
- Design response: Introduce shared Agent Tools MCP adapters/providers; attach focused per-session execution context; expand descriptor creation/materialization to any enabled in-scope MCP tool; generalize Agent Tools MCP name normalization and redaction; remove old Claude local MCP and Codex dynamic projections for migrated tools.
- Refactor rationale: A local patch that only adds more `if (toolName === ...)` branches to the executor or copies more runtime-specific builders would amplify the current duplicated-policy problem. The catalog/executor boundary must become the one owner of external-runtime MCP tool projection.
- Intentional deferrals and residual risk, if any: Agent-management, agent-team-management, skills, and tool-management tool families remain out of scope because they do not currently have active Claude/Codex runtime-specific projections in this branch. If a future ticket exposes them to Claude/Codex, they should be added through the same adapter model.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.

## Design Reading Order

Read this design from abstract to concrete:

1. Data-flow spines and ownership.
2. Agent Tools MCP subsystem allocation.
3. Family adapter responsibilities.
4. Claude/Codex runtime materializer changes.
5. Removal plan and tests.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove/decommission active Claude local MCP builders and Codex dynamic tool builders for all migrated tool families after Agent Tools MCP adapters are in place.
- The design is invalid if it leaves old and new active execution paths for the same migrated tool.
- Retaining generic Codex dynamic-tool infrastructure is acceptable only if it is no longer used to expose the migrated backend tool families. Stale family-specific dynamic builders and tests should be removed or rewritten.
- Retaining generic result normalizers is acceptable when they serve route-backed MCP result parsing rather than preserving old server names.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-UATM-001 | Primary End-to-End | Agent definition configured tool names | Agent Tools MCP descriptor with enabled tools | Agent Tools MCP Session Service / Catalog | Governs which tools are exposed for a runtime session. |
| DS-UATM-002 | Primary End-to-End | Claude turn execution | Claude SDK receives one `autobyteus_agent_tools` HTTP MCP server | Claude Session + Claude Agent Tools MCP materializer | Replaces multiple Claude local MCP servers. |
| DS-UATM-003 | Primary End-to-End | Codex thread bootstrap | Codex app-server receives thread-scoped `mcp_servers.autobyteus_agent_tools` | Codex Thread Bootstrapper + Codex materializer | Replaces Codex dynamic backend tool projections. |
| DS-UATM-004 | Primary End-to-End | Runtime MCP client `tools/call` | Family service result mapped to MCP result | Agent Tools MCP Tool Executor / Adapters | Central execution path for all migrated tools. |
| DS-UATM-005 | Return-Event | Runtime provider tool lifecycle payload | Canonical AgentRun events/history/memory | Runtime event/history converters | Prevents provider-name and secret leakage while preserving UI/history semantics. |
| DS-UATM-006 | Bounded Local | Agent Tools MCP JSON-RPC request | JSON-RPC response | AgentToolsMcpMethodDispatcher | Existing internal route loop remains the method dispatcher. |
| DS-UATM-007 | Bounded Local | Tool adapter execution | Family-specific success/error result | Individual MCP tool adapters | Keeps family behavior near manifests/services without bloating executor. |

## Primary Execution Spine(s)

Claude materialization:

```text
AgentRun create/restore -> ClaudeSessionBootstrapper -> ClaudeSession.executeTurn -> AgentToolMcpSessionService -> Claude Agent Tools MCP materializer -> ClaudeSdkClient.startQueryTurn
```

Codex materialization:

```text
AgentRun create/restore -> CodexThreadBootstrapper -> AgentToolMcpSessionService -> Codex Agent Tools MCP materializer -> CodexThreadManager.thread/start-or-resume
```

Tool execution:

```text
Claude/Codex MCP client -> Agent Tools MCP route -> Method Dispatcher -> Catalog availability -> Tool Adapter -> Family Service -> MCP result -> Runtime event/history normalization
```

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-UATM-001 | Configured agent tool names are normalized into `ConfiguredAgentToolExposure`; the Agent Tools MCP catalog resolves which configured tools are both supported and available for the session context; the session service creates a secret descriptor with that enabled tool list. | Agent definition, configured exposure, MCP catalog, MCP session descriptor | Agent Tools MCP Session Service / Catalog | Browser availability, task team-context eligibility, workspace execution context |
| DS-UATM-002 | Claude prepares a turn, asks session state for a descriptor if any Agent Tools MCP tool is enabled, materializes that descriptor into SDK HTTP MCP config, and passes only the unified server into query options. | ClaudeSession, ClaudeAgentToolsMcpSessionState, Claude materializer, ClaudeSdkClient | ClaudeSession | Allowed-tools derivation, SDK permission callback, skills |
| DS-UATM-003 | Codex bootstrap resolves working directory and configured tools, creates a descriptor if any Agent Tools MCP tool is enabled, passes it through thread-scoped `config.mcp_servers`, and stops adding migrated tools to `dynamicTools`. | CodexThreadBootstrapper, Codex materializer, CodexThreadManager | CodexThreadBootstrapper | Skills materialization, approval/sandbox settings, dynamic infrastructure cleanup |
| DS-UATM-004 | A runtime MCP client calls a tool; the route validates auth/session/protocol; the dispatcher validates JSON-RPC; the catalog confirms the tool is enabled; the executor delegates to the matching adapter, which calls the family service and returns a text MCP result. | Route, method dispatcher, catalog, executor, adapter, family service | Agent Tools MCP Tool Executor / Adapter Registry | Result mapping, family error serialization, observer lifecycle |
| DS-UATM-005 | Provider raw lifecycle/history payloads containing `mcp__autobyteus_agent_tools__<tool>` or server metadata are normalized to canonical tool names and redacted before becoming application events/history/memory. | Runtime event converter, history normalizer, no-leak sanitizer | Runtime backend event/history converters | Secret redaction, result normalization, invocation correlation |

## Spine Actors / Main-Line Nodes

- Agent definition configured tool names.
- `ConfiguredAgentToolExposure`.
- Agent Tools MCP Catalog / adapter registry.
- Agent Tools MCP Session Service.
- Claude Session / Codex Thread Bootstrapper materialization owners.
- Agent Tools MCP Route / Method Dispatcher.
- Agent Tools MCP Tool Executor.
- Family adapters.
- Family services/manifests.
- Runtime event/history converters.

## Ownership Map

- `ConfiguredAgentToolExposure` owns product-level configured-tool normalization from `agentDefinition.toolNames`; it does not own runtime availability.
- Agent Tools MCP Catalog owns supported MCP tool definitions, configured-tool intersection, per-session availability, and name lookup.
- Agent Tools MCP Session Service owns secret session creation, owner identity, sender identity, enabled tool list, descriptor generation, TTL, redaction, and revocation.
- Agent Tools MCP Tool Executor owns generic execution lifecycle around a tool call and adapter lookup; it must not own family-specific business rules.
- Family MCP adapters own only MCP projection concerns: definition projection, availability predicate, context adaptation, family service invocation, and MCP result/error serialization.
- Browser/media/task-delegation/published-artifact/send-message services remain behavior owners.
- ClaudeSession owns Claude query/turn lifecycle and SDK materialization. It is a runtime owner, not a family tool owner.
- CodexThreadBootstrapper owns Codex thread config construction. It is a runtime owner, not a family tool owner.
- Runtime event/history converters own provider-payload normalization into application-facing canonical events/history.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `/mcp/agent-tools/:sessionId` Fastify route | Agent Tools MCP route gate + method dispatcher + session registry | Public HTTP MCP entry for runtime clients | Family behavior, runtime materialization, descriptor persistence |
| Claude Agent Tools MCP materializer | ClaudeSession + AgentToolMcpDescriptor | Maps descriptor to Claude SDK server config | Tool schemas/execution, bearer creation, family gating |
| Codex Agent Tools MCP materializer | CodexThreadBootstrapper + AgentToolMcpDescriptor | Maps descriptor to Codex app-server thread config | Tool schemas/execution, bearer creation, process-wide config |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `agent-execution/backends/claude/browser/build-claude-browser-mcp-servers.ts` | Browser exposure moves to unified Agent Tools MCP | Browser MCP adapters under `agent-tools/mcp/providers` | In This Change | Remove active production import from `build-claude-session-mcp-servers.ts`. |
| `agent-execution/backends/claude/browser/build-claude-browser-tool-definitions.ts` | Browser schema/handler mapping becomes shared MCP adapter | Browser manifest + MCP adapter | In This Change | Reuse `browser-tool-parameter-schemas.ts`. |
| `agent-execution/backends/claude/media/build-claude-media-mcp-server.ts` | Media exposure moves to unified Agent Tools MCP | Media MCP adapter | In This Change | Keep result normalizer only if still used for route-backed result parsing. |
| `agent-execution/backends/claude/media/build-claude-media-tool-definitions.ts` | Media schema/handler mapping becomes shared MCP adapter | Media manifest + MCP adapter | In This Change | Remove stale tests. |
| `agent-execution/backends/claude/published-artifacts/build-claude-publish-artifacts-mcp-server.ts` | Publish exposure moves to unified Agent Tools MCP | Publish-artifacts MCP adapter | In This Change | No separate `autobyteus_published_artifacts` server. |
| `agent-execution/backends/claude/published-artifacts/build-claude-publish-artifacts-tool-definition.ts` | Publish schema/handler mapping becomes shared MCP adapter | Published-artifact contract/schema helper + MCP adapter | In This Change | Extract reusable schema builder first if needed. |
| `agent-execution/backends/claude/task-delegation/build-claude-task-delegation-tool-definitions.ts` | Task delegation exposure moves to unified Agent Tools MCP | Task-delegation MCP adapter | In This Change | Team-context gating moves to adapter/catalog availability. |
| `agent-execution/backends/claude/team-communication/claude-team-mcp-server-builder.ts` | `autobyteus_team` no longer owns migrated task delegation | Agent Tools MCP task-delegation adapter | In This Change | If no other tools use it, remove. |
| `agent-execution/backends/codex/browser/build-browser-dynamic-tool-registrations.ts` | Browser no longer exposed through Codex `dynamicTools` | Browser MCP adapter | In This Change | Remove production import from bootstrapper. |
| `agent-execution/backends/codex/media/build-media-dynamic-tool-registrations.ts` | Media no longer exposed through Codex `dynamicTools` | Media MCP adapter | In This Change | Existing media E2E should be updated. |
| `agent-execution/backends/codex/published-artifacts/build-codex-publish-artifacts-dynamic-tool-registration.ts` | Publish no longer exposed through Codex `dynamicTools` | Publish-artifacts MCP adapter | In This Change | Old singular `publish_artifact` remains unsupported. |
| `agent-execution/backends/codex/task-delegation/build-task-delegation-dynamic-tool-registrations.ts` | Task delegation no longer exposed through Codex `dynamicTools` | Task-delegation MCP adapter | In This Change | Remove production import from team bootstrap strategy. |
| Old Claude/Codex tests asserting family-specific local/dynamic exposure | They assert obsolete paths | Route-backed Agent Tools MCP tests | In This Change | Rewrite behavior assertions; do not leave as compatibility tests. |
| Send-message-specific Agent Tools MCP name helpers | Generalized MCP server now supports multiple tools | Generic Agent Tools MCP tool-name helpers | In This Change | Keep send-message constants only where service contracts need them. |

## Return Or Event Spine(s) (If Applicable)

Generic Agent Tools MCP event normalization:

```text
Runtime provider raw tool event
  -> runtime backend notification/chunk processor
  -> provider-specific event converter / history normalizer
  -> generic Agent Tools MCP tool-name normalizer strips autobyteus_agent_tools provider wrapper
  -> no-leak sanitizer removes bearer/header/session/provider config details
  -> canonical AgentRun event/history/memory payload
```

The route/executor must not write application run history or memory directly. Runtime provider lifecycle remains the source of canonical application events.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `AgentToolsMcpMethodDispatcher`
  - Local spine: `Validate JSON-RPC envelope -> Dispatch initialize/tools/list/tools/call -> Map JSON-RPC success/error -> HTTP response`.
  - Why it matters: Existing method loop is generic enough; the tool expansion should not bypass it.
- Parent owner: `AgentToolMcpToolExecutor`
  - Local spine: `Build execution event -> adapter lookup -> adapter execute -> map success/error -> notify observer`.
  - Why it matters: Prevents one hard-coded switch from becoming the execution coordinator for every family.
- Parent owner: Codex MCP approval bridge
  - Local spine: `MCP item started -> track pending call -> MCP elicitation request -> approval record/auto-approve -> app-server response`.
  - Why it matters: Already supports MCP tool approval; expansion must preserve it for non-send tools.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Browser availability gate | DS-UATM-001, DS-UATM-004 | Browser MCP adapter / Catalog | Suppress browser tools when bridge unsupported | Browser support is environment-dependent | Runtime materializers would duplicate support policy. |
| Session execution context | DS-UATM-001, DS-UATM-004 | Agent Tools MCP Session | Carry working directory/workspace root for adapters | Media and path-based tools need runtime workspace | Family adapters would reach into runtime internals. |
| Task member-context gate | DS-UATM-001, DS-UATM-004 | Task-delegation MCP adapter / Catalog | Enable task tools only for member sessions | Standalone task delegation is invalid | Runtime-specific team paths would stay duplicated. |
| Family result serialization | DS-UATM-004 | Family MCP adapters | Return JSON text/error payloads consistent with existing behavior | MCP content is text-oriented | Executor would become family-specific. |
| Secret redaction | DS-UATM-005 | Runtime event/history converters | Remove bearer/session/config leaks | Runtime payloads may contain MCP metadata | Route or family adapters would bypass canonical event spine. |
| Coverage migration | All | API/E2E Engineer | Decide stale/valid/replacement tests | Old tests assert old paths | Implementation might keep stale tests for compatibility. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| HTTP MCP route/session/descriptor | `agent-tools/mcp` | Extend | Correct boundary already exists | N/A |
| Tool schemas and parse/execute behavior | Family manifests in `agent-tools/browser`, `agent-tools/media`, `agent-tools/task-delegation`, published-artifact contracts | Reuse | These are authoritative family owners | N/A |
| Send-message dispatch | `SendMessageToDispatcher` | Reuse | Already route-backed and validated | N/A |
| Claude SDK config mapping | `agent-execution/backends/claude/agent-tools-mcp` | Extend | Runtime-specific materializer belongs in Claude backend | N/A |
| Codex thread config mapping | `agent-execution/backends/codex/agent-tools-mcp` | Extend | Runtime-specific materializer belongs in Codex backend | N/A |
| Generic Agent Tools MCP adapter registry | None beyond single-definition provider | Create New / Extend existing provider concept | Required to avoid hard-coded executor switch | Existing single provider interface returns one definition only and has no execution/availability contract. |
| Published-artifact parameter schema builder | Private builder in `publish-artifacts-tool.ts` | Extend/extract | Need reusable schema without duplication | New duplicate schema file would drift. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent Tools MCP | Catalog, adapters, sessions, descriptors, route, executor, MCP result mapping, generic Agent Tools MCP tool-name helpers | DS-UATM-001, DS-UATM-004, DS-UATM-006, DS-UATM-007 | External runtime MCP exposure | Extend | This is the central change. |
| Browser Tools | Browser manifest, parse, service execution, serialization | DS-UATM-004 | Browser MCP adapter | Reuse | Adapter imports manifest/service. |
| Media Tools | Media manifest, parse, service execution, serialization, model defaults | DS-UATM-004 | Media MCP adapter | Reuse | Adapter supplies session workspace context. |
| Task Delegation Tools | Task delegation manifest, parse, context builder, service execution | DS-UATM-004 | Task-delegation MCP adapter | Reuse | Adapter gates by `MemberTeamContext`. |
| Published Artifacts | Tool input contract, publication service, artifact projection | DS-UATM-004 | Publish MCP adapter | Reuse/Extend | Extract schema builder if needed. |
| Claude Runtime Backend | Session turn lifecycle, SDK MCP config, allowed tools, event conversion | DS-UATM-002, DS-UATM-005 | Claude Agent SDK runtime | Extend | Remove local family MCP builders. |
| Codex Runtime Backend | Thread bootstrap/config, MCP approval bridge, event/history conversion | DS-UATM-003, DS-UATM-005 | Codex App Server runtime | Extend | Remove migrated dynamic builders. |
| AutoByteus Runtime Backend | Local/in-process tool resolution | UC-UATM-010 | AutoByteus native runtime | Reuse unchanged | Must not become HTTP MCP client. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `agent-tools/mcp/agent-tool-mcp-adapter.ts` | Agent Tools MCP | Adapter contract | Define adapter/provider input, definition, availability, and execute result types | One interface file keeps catalog/executor aligned | Yes |
| `agent-tools/mcp/agent-tool-mcp-catalog.ts` | Agent Tools MCP | Catalog | Store adapters by canonical tool name, resolve enabled tools, build MCP tool definitions | Existing catalog owner | Yes |
| `agent-tools/mcp/agent-tool-mcp-tool-executor.ts` | Agent Tools MCP | Executor | Lookup adapter and run generic execution lifecycle | Existing executor owner | Yes |
| `agent-tools/mcp/agent-tool-mcp-session.ts` | Agent Tools MCP | Session identity | Add `executionContext` with working directory/workspace root | Existing session owner | Yes |
| `agent-tools/mcp/agent-tools-mcp-tool-name.ts` | Agent Tools MCP | Name normalization | Build/normalize `mcp__autobyteus_agent_tools__<tool>` and related Codex variants | Shared by Claude/Codex | Yes |
| `agent-tools/mcp/providers/browser-tools-mcp-provider.ts` | Agent Tools MCP projection | Browser adapter provider | Project browser manifest entries into MCP adapters | Projection concern, not family behavior | Browser manifest/schema/service |
| `agent-tools/mcp/providers/media-tools-mcp-provider.ts` | Agent Tools MCP projection | Media adapter provider | Project media manifest entries into MCP adapters | Projection concern | Media manifest/service |
| `agent-tools/mcp/providers/task-delegation-tools-mcp-provider.ts` | Agent Tools MCP projection | Task adapter provider | Project task delegation manifest into team-context-gated adapters | Projection concern | Task manifest/service/context builder |
| `agent-tools/mcp/providers/publish-artifacts-mcp-provider.ts` | Agent Tools MCP projection | Publish adapter provider | Project publish artifacts into MCP adapter | Projection concern | Publication service/contract |
| `agent-tools/mcp/providers/send-message-to-mcp-provider.ts` | Agent Tools MCP projection | Send adapter provider | Existing send-message definition + execution adapter | Converts old provider into adapter shape | Send message schema/dispatcher |
| `services/published-artifacts/published-artifact-tool-contract.ts` or `agent-tools/published-artifacts/publish-artifacts-tool.ts` | Published Artifacts | Publish schema | Expose reusable `buildPublishArtifactsParameterSchema` | Avoid duplicating private schema | Yes |
| `agent-execution/backends/claude/session/claude-session-tooling-options.ts` | Claude Runtime | Allowed tools | Derive Agent Tools MCP allowed names from descriptor enabled tools | Runtime concern | Generic name helper |
| `agent-execution/backends/claude/session/build-claude-session-mcp-servers.ts` | Claude Runtime | MCP server config | Materialize only Agent Tools MCP plus unrelated non-migrated servers if any | Runtime concern | Descriptor materializer |
| `agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | Codex Runtime | Thread bootstrap | Create Agent Tools MCP config for any enabled tool; stop migrated dynamic registrations | Runtime concern | Descriptor materializer |
| `agent-execution/backends/codex/team-communication/team-member-codex-thread-bootstrap-strategy.ts` | Codex Runtime | Team member instructions | Remove task dynamic registrations; keep instructions | Runtime concern | Configured exposure |
| `agent-execution/backends/{claude,codex}/...event/history...` | Runtime backends | Event/history normalization | Use generic Agent Tools MCP canonicalization/no-leak sanitizer | Runtime concern | Generic helper |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Agent Tools MCP tool definition + availability + execution contract | `agent-tools/mcp/agent-tool-mcp-adapter.ts` | Agent Tools MCP | Needed by catalog and executor | Yes | Yes | Generic service locator; adapters stay explicit |
| Agent Tools MCP wire-name construction/normalization | `agent-tools/mcp/agent-tools-mcp-tool-name.ts` | Agent Tools MCP | Claude and Codex both need canonical names | Yes | Yes | Runtime-specific send-message-only helper |
| Publish artifacts argument schema | Published-artifact contract/schema helper | Published Artifacts | Claude/Codex/MCP previously duplicated schema | Yes | Yes | Duplicate hand-built schema in provider |
| Family result JSON/error wrapping | Existing family serialization files | Family subsystems | Already family-owned | Yes | Yes | Central catch-all serializer with family rules |
| Session execution context | `AgentToolMcpSession.executionContext` | Agent Tools MCP | Adapters need working directory without importing runtime contexts | Yes | Yes | Full runtime context dump or secret-bearing config |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentToolMcpSessionOwnerIdentity` | Yes | Yes | Low | Keep owner identity as run/team/member identity. |
| New `AgentToolMcpExecutionContext` | Yes, if limited to workspace/run execution data | Yes | Medium | Include only `workingDirectory` / `workspaceRootPath` style fields needed by adapters; do not copy full runtime context. |
| `AgentToolMcpDescriptor.enabledTools` | Yes | Yes | Low | Continue using canonical tool names. |
| Adapter definition/execution contract | Yes | Yes | Medium | Avoid optional kitchen-sink fields; use explicit methods for availability and execute. |
| Published-artifact schema helper | Yes | Yes | Low | Extract from current private builder instead of duplicating. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-adapter.ts` | Agent Tools MCP | Adapter contract | Types for adapter/provider, availability input, execution input/result | Central contract for catalog/executor | Yes |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-catalog.ts` | Agent Tools MCP | Catalog | Register all adapters, list supported names, resolve enabled available names, build `tools/list` definitions, resolve call availability | Existing catalog boundary | Adapter contract |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-tool-executor.ts` | Agent Tools MCP | Executor | Generic adapter lookup, observer lifecycle, result propagation | Existing executor boundary | Adapter execution result |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session.ts` | Agent Tools MCP | Session model | Add focused execution context and clone/redaction helpers | Existing session model | Execution context |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session-service.ts` | Agent Tools MCP | Session service | Pass execution context into sessions; optionally expose create-if-enabled semantics | Existing session service | Catalog enabled names |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-result-mapper.ts` | Agent Tools MCP | MCP result mapper | Map adapter result or operation result into MCP text result/JSON-RPC response | Existing result owner | Adapter result type |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-tool-name.ts` | Agent Tools MCP | Tool-name helper | Generic Agent Tools MCP provider prefix build/strip/normalize | Shared by runtime backends | Canonical tool names |
| `autobyteus-server-ts/src/agent-tools/mcp/providers/send-message-to-mcp-provider.ts` | Agent Tools MCP projection | Send message adapter provider | Define and execute `send_message_to` through dispatcher | Keeps existing pattern in adapter model | Send schema/dispatcher |
| `autobyteus-server-ts/src/agent-tools/mcp/providers/browser-tools-mcp-provider.ts` | Agent Tools MCP projection | Browser adapter provider | Define and execute browser tools through browser manifest/service | One provider for one family | Browser manifest/serialization |
| `autobyteus-server-ts/src/agent-tools/mcp/providers/media-tools-mcp-provider.ts` | Agent Tools MCP projection | Media adapter provider | Define and execute media tools with session workspace context | One provider for one family | Media manifest/serialization |
| `autobyteus-server-ts/src/agent-tools/mcp/providers/task-delegation-tools-mcp-provider.ts` | Agent Tools MCP projection | Task adapter provider | Define and execute task-delegation tools from member context | One provider for one family | Task manifest/service |
| `autobyteus-server-ts/src/agent-tools/mcp/providers/publish-artifacts-mcp-provider.ts` | Agent Tools MCP projection | Published-artifact adapter provider | Define and execute `publish_artifacts` by active run id | One provider for one tool family | Publication service/contract |
| `autobyteus-server-ts/src/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-session-state.ts` | Claude Runtime | Descriptor state | Ensure/refresh descriptor for any enabled Agent Tools MCP tool, not send-only | Claude session-local secret owner | Session service |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-tooling-options.ts` | Claude Runtime | Allowed tools | Derive allowed MCP tool names from descriptor enabled tools | Claude policy owner | Tool-name helper |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/build-claude-session-mcp-servers.ts` | Claude Runtime | MCP server map | Return only unified Agent Tools MCP server for migrated tools | Runtime materialization | Claude materializer |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | Codex Runtime | Bootstrap config | Use Agent Tools MCP for migrated tools; no dynamic migrated tools | Codex bootstrap owner | Session service/materializer |
| `autobyteus-server-ts/src/agent-execution/backends/codex/agent-tools-mcp/codex-agent-tools-mcp-materializer.ts` | Codex Runtime | Thread config | Keep descriptor-to-`mcp_servers` mapping and generic tool-name helpers if runtime-specific wrappers remain needed | Codex config owner | Generic helper |
| `autobyteus-server-ts/src/agent-execution/backends/codex/agent-tools-mcp/codex-agent-tools-mcp-event-payload.ts` | Codex Runtime | Sanitizer | Generic Agent Tools MCP event payload sanitizer | Existing no-leak concern | Tool-name helper |

## Ownership Boundaries

Authority changes hands at these points:

1. Product configuration -> MCP availability: `ConfiguredAgentToolExposure` only says what the user configured. Agent Tools MCP Catalog decides what is actually MCP-supported and context-available for a session.
2. Runtime bootstrap -> session service: Claude/Codex pass run/member/workspace/sender context to `AgentToolMcpSessionService`; they do not build bearer URLs or enabled tool lists themselves.
3. MCP route -> adapter: The route/dispatcher validates transport/JSON-RPC/session. The catalog/executor selects an adapter. The adapter invokes the family owner.
4. Adapter -> family service: Adapters must call family manifests/parsers/services and must not reimplement business rules.
5. Provider event -> application event: Runtime event converters own the canonical app-facing event shape and secret redaction.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgentToolMcpSessionService` | Session registry, token generation/hash, enabled tool resolution, descriptor redaction | ClaudeSession, CodexThreadBootstrapper | Runtime materializers constructing session URLs/tokens/enabled lists directly | Add session-service method/return shape |
| `AgentToolMcpCatalog` | Adapter registry, definitions, availability | Method dispatcher, session service | Runtime backends importing family providers to calculate enabled tools | Add catalog query API |
| Family services/manifests | Parse/execute behavior | MCP adapters, AutoByteus local tools | Adapters duplicating schemas or business rules | Extract reusable schema/parser functions from family owner |
| ClaudeSession | Claude SDK query lifecycle | Claude backend factory/manager | Family MCP providers calling Claude SDK APIs | Add runtime materializer API |
| CodexThreadBootstrapper | Codex thread config lifecycle | Codex backend factory/manager | Family providers writing Codex config/dynamic tools | Add bootstrap/materializer API |
| Runtime event/history converters | Canonical app-facing event/history shape | Runtime backend message listeners | Agent Tools MCP route writing run history/memory directly | Extend converter normalization/sanitizer |

## Dependency Rules

Allowed:

- `agent-tools/mcp/providers/*` may import family manifests, family parsers/schemas, family services, and family serialization helpers.
- `agent-tools/mcp` core may depend on adapter interfaces and generic provider lists.
- Claude/Codex materializers may import `AgentToolMcpDescriptor`, `AGENT_TOOLS_MCP_SERVER_NAME`, and generic Agent Tools MCP tool-name helpers.
- Runtime event/history converters may import generic Agent Tools MCP canonicalization/redaction helpers.

Forbidden:

- Claude/Codex runtime backends must not import family services directly for migrated tool execution.
- Runtime materializers must not generate bearer tokens, session URLs, or descriptor contents directly.
- Agent Tools MCP adapters must not import Claude or Codex runtime classes.
- Agent Tools MCP route/executor must not emit run history/memory/application events directly.
- Migrated tools must not be active through both old runtime-specific paths and Agent Tools MCP.
- No code should write raw descriptors to `.codex/config.toml`, `.claude`, `.mcp.json`, logs, run history, or serialized runtime contexts.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `AgentToolMcpSessionService.createAgentToolMcpSession(...)` | MCP session | Create secret session and descriptor | Owner identity, sender identity, configured exposure, execution context | May return enabled tools empty today; implementation may add create-if-enabled helper. |
| `AgentToolMcpCatalog.resolveConfiguredSupportedToolNames(...)` | MCP tool availability | Return configured + supported + context-available canonical names | `ConfiguredAgentToolExposure`, session/execution availability input | Must account for browser support and member context. |
| `AgentToolMcpToolAdapter.execute(...)` | One MCP tool projection | Execute one canonical tool through family owner | `AgentToolMcpSession`, raw args | Returns MCP-ready result or adapter result. |
| `materializeClaudeAgentToolsMcpServers(descriptor)` | Claude MCP config | Map descriptor to SDK HTTP MCP config | `AgentToolMcpDescriptor` | No token generation. |
| `materializeCodexAgentToolsMcpThreadConfig(descriptor)` | Codex MCP config | Map descriptor to app-server config | `AgentToolMcpDescriptor` | Thread-scoped only. |
| `normalizeAgentToolsMcpToolNameForEvent(value)` | Tool-name canonicalization | Strip Agent Tools MCP provider wrapper | Raw provider tool name | Generic for all supported tools. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentToolMcpSessionService.createAgentToolMcpSession` | Yes | Yes | Low | Add explicit execution context rather than generic runtime context. |
| Adapter `execute` | Yes | Yes | Low | Tool name comes from adapter registration; raw args parsed by family owner. |
| Catalog enabled-name resolver | Yes | Yes | Medium | Include availability input/session context to avoid relying only on configured names. |
| Claude/Codex materializers | Yes | Yes | Low | Accept descriptor only. |
| Event normalizer | Yes | Yes | Medium | Use generic provider prefix stripping and known tool validation. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Shared external runtime MCP server | `autobyteus_agent_tools` | Yes | Low | Keep. |
| Tool projection contract | `AgentToolMcpToolAdapter` | Yes | Low | Prefer adapter over helper/provider-only because it adapts MCP to family owners. |
| Session execution data | `AgentToolMcpExecutionContext` | Yes | Medium | Keep fields focused; avoid full runtime context. |
| Browser provider | `BrowserToolsMcpProvider` or `BrowserToolsMcpAdapterProvider` | Yes | Low | Name by family. |
| Old `autobyteus_team` server | Existing old name | Yes for old path, now obsolete | High if retained | Remove for migrated task-delegation exposure. |

## Applied Patterns (If Any)

- Adapter: Agent Tools MCP adapters translate MCP definition/call/result shape to existing family manifests/services.
- Registry/Catalog: Agent Tools MCP Catalog indexes adapters by canonical tool name and resolves availability.
- Factory-like session service: Session service creates secret descriptors and stores live session state.
- Event normalization: Runtime event converters adapt provider-specific event payloads to canonical application events.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/mcp/` | Folder | Agent Tools MCP | Shared MCP route/session/catalog/executor/adapter boundary | Existing authoritative MCP subsystem | Runtime-specific SDK/app-server config logic |
| `autobyteus-server-ts/src/agent-tools/mcp/providers/` | Folder | Agent Tools MCP projections | Family adapter providers | Existing provider folder; projection concern is MCP-specific | Family business logic reimplementation |
| `autobyteus-server-ts/src/agent-tools/browser/` | Folder | Browser family | Browser manifest/service/parsers/schemas | Existing family owner | Claude/Codex runtime config |
| `autobyteus-server-ts/src/agent-tools/media/` | Folder | Media family | Media manifest/service/parsers/schemas | Existing family owner | Claude/Codex runtime config |
| `autobyteus-server-ts/src/agent-tools/task-delegation/` | Folder | Task delegation family | Task delegation manifest/service/parsers/schemas | Existing family owner | Runtime-specific dynamic/MCP config |
| `autobyteus-server-ts/src/services/published-artifacts/` | Folder | Published artifacts | Publication contract/service/projection | Existing service owner | Runtime MCP projection code |
| `autobyteus-server-ts/src/agent-execution/backends/claude/agent-tools-mcp/` | Folder | Claude runtime | Descriptor materialization/name helpers specific to Claude SDK | Existing Claude-specific materializer location | Family schemas/execution |
| `autobyteus-server-ts/src/agent-execution/backends/codex/agent-tools-mcp/` | Folder | Codex runtime | Codex app-server config and no-leak event payload sanitizer | Existing Codex-specific materializer location | Family schemas/execution |
| `autobyteus-server-ts/src/agent-execution/backends/claude/browser` | Folder | Obsolete after migration | Remove/decommission old browser local MCP projection | Old runtime-specific projection | New code |
| `autobyteus-server-ts/src/agent-execution/backends/codex/browser` | Folder | Obsolete after migration | Remove/decommission old browser dynamic projection | Old runtime-specific projection | New code |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `agent-tools/mcp` | Transport + main external-runtime tool projection | Yes | Medium | Keep route/session/catalog/executor central; move family projection into providers. |
| `agent-tools/mcp/providers` | Off-Spine Concern | Yes | Low | Projection adapters serve catalog/executor. |
| `agent-tools/browser` | Family behavior | Yes | Low | Existing family owner reused. |
| `agent-execution/backends/claude/session` | Runtime main-line control | Yes | Medium | Remove family-specific server builders from session composition. |
| `agent-execution/backends/codex/backend` | Runtime main-line control | Yes | Medium | Remove migrated dynamic registration assembly. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Tool execution ownership | `AgentToolMcpToolExecutor -> BrowserToolsMcpAdapter -> BROWSER_TOOL_MANIFEST entry -> BrowserToolService` | `Claude browser MCP handler` and `Codex browser dynamic handler` both directly calling `BrowserToolService` | Shows family behavior remains shared while runtime projections are removed. |
| Enabled tools descriptor | `{ enabledTools: ["send_message_to", "open_tab", "generate_image", "publish_artifacts"] }` under one `autobyteus_agent_tools` descriptor | Separate `autobyteus_agent_tools`, `autobyteus_browser`, `autobyteus_image_audio`, and Codex `dynamicTools` for same run | Shows one external runtime MCP server boundary. |
| Task delegation gating | Catalog enables `delegate_tasks` only when `session.sender.memberTeamContext !== null` | Standalone runtime exposes `delegate_tasks` and fails later in service | Prevents invalid tools from appearing in `tools/list`. |
| Event normalization | `mcp__autobyteus_agent_tools__generate_image` -> `generate_image` | UI/history shows `mcp__autobyteus_agent_tools__generate_image` or raw `autobyteus_agent_tools` server config | Preserves canonical app-facing tool names. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep Claude `autobyteus_browser` alongside Agent Tools MCP browser tools | Could reduce migration risk | Rejected | Remove old browser local MCP builder and expose browser only through `autobyteus_agent_tools`. |
| Keep Claude `autobyteus_image_audio` alongside Agent Tools MCP media tools | Could preserve old tests | Rejected | Remove old media local MCP builder and update tests. |
| Keep Claude `autobyteus_team` for task delegation | Existing team server worked | Rejected for migrated task tools | Move task tools to Agent Tools MCP and remove old builder if no other tools remain. |
| Keep Codex dynamic browser/media/task/publish tools as fallback | Could avoid Codex MCP event risk | Rejected | Use thread-scoped Agent Tools MCP config; update event handling/tests. |
| Write Codex/Claude MCP bearer config to project/user files | Could avoid runtime descriptor plumbing | Rejected | Continue in-memory descriptor materialization only. |
| Build a second MCP server per family | Mirrors old Claude names | Rejected | One `autobyteus_agent_tools` server owns all in-scope backend tools. |
| Expand AutoByteus native to HTTP MCP | Would make all runtimes superficially uniform | Rejected / Out of scope | Keep local in-process AutoByteus tool registry. |

## Derived Layering (If Useful)

The useful layer view is secondary to ownership:

```text
Runtime Materialization Layer: ClaudeSession / CodexThreadBootstrapper
MCP Transport Layer: Agent Tools MCP route + method dispatcher
MCP Tool Projection Layer: Catalog + adapters/providers
Family Behavior Layer: Browser/Media/Task/PublishedArtifact/SendMessage services
Application Event Layer: Runtime event/history converters + memory/run-history recorders
```

Runtime materialization must not bypass the MCP tool projection layer to call family behavior directly.

## Migration / Refactor Sequence

1. Add `AgentToolMcpToolAdapter` contract and convert send-message provider/executor to the adapter model without changing behavior.
2. Add `AgentToolMcpExecutionContext` to session creation/registry cloning and thread it from Claude/Codex runtime creation points.
3. Add generic Agent Tools MCP tool-name helper and update send-message-specific Claude/Codex helper usages to use the generic helper while preserving existing send-message tests.
4. Add browser/media/task-delegation/publish-artifacts MCP adapter providers using existing manifests/services/serializers.
5. Update `AgentToolMcpCatalog` and session service to resolve configured + supported + available tools from all adapters.
6. Update Claude session state/tooling/mcp-server composition so any descriptor with enabled tools materializes one `autobyteus_agent_tools` server and allowed tool names derive from `descriptor.enabledTools`.
7. Remove Claude local MCP family builders and rewrite affected unit/integration tests.
8. Update Codex bootstrap so any descriptor with enabled tools materializes `config.mcp_servers.autobyteus_agent_tools`; remove migrated dynamic registration imports/builders from bootstrap and team strategy.
9. Remove Codex family dynamic builder files/tests or leave only generic dynamic infrastructure if still required by unrelated code.
10. Generalize Claude/Codex event/history/no-leak normalization for all Agent Tools MCP tools.
11. Update route/unit/integration tests for catalog, tools/list, tools/call, Claude materialization, Codex materialization, event/history redaction, and stale path removal.
12. Run implementation-scoped checks, then pass to code review and API/E2E coverage investigation/execution.

Temporary seams allowed during implementation:

- A feature-in-progress commit may convert one family at a time locally, but the final handoff must not leave dual active paths for any migrated family.
- Generic Codex dynamic infrastructure may remain if no migrated tool registrations use it.

## Key Tradeoffs

- One MCP server vs per-family MCP servers: one `autobyteus_agent_tools` server makes configured-tool gating, descriptor secrecy, and runtime materialization simpler and matches the merged send-message pattern. Per-family servers would reproduce old runtime fragmentation.
- Adapter providers under `agent-tools/mcp/providers` vs family folders: providers belong under MCP because they own projection, not behavior. They explicitly reuse family manifests/services.
- Session execution context vs importing runtime contexts in adapters: a focused context keeps adapters runtime-neutral and avoids mixed-level dependencies.
- Remove old files vs leave unused compatibility code: removal is required to prevent accidental dual exposure and stale tests.

## Risks

- Codex app-server non-send-message MCP events may differ from send-message payloads; event/history tests must cover at least one non-send family.
- Claude SDK allowed-tool behavior for many remote MCP tools may need exact wire-name confirmation.
- Browser/media live validation depends on environment services and credentials; coverage investigation must plan default mock/probe tests plus live-gated evidence where possible.
- Published-artifact path behavior depends on active run/memory/workspace roots; tests must prove route-backed execution still emits artifact persisted state.
- Removing old dynamic/local files may require broad test updates.

## Guidance For Implementation

- Start by preserving existing `send_message_to` behavior under the new adapter abstraction; do not expand families before the adapter model is passing existing MCP route tests.
- Keep adapter execution small and family-owned:
  - Browser adapter: manifest entry parse/execute with `getBrowserToolService`; gate by `isBrowserSupported`; serialize with browser serialization helpers.
  - Media adapter: manifest entry parse/execute with `getMediaGenerationService`; use `session.executionContext.workingDirectory` as `workspaceRootPath` and include run/sender ids where available; serialize with media helpers.
  - Task adapter: require `session.sender.memberTeamContext`; derive context with `buildTaskDelegationToolContextFromMemberTeamContext`; serialize with task helpers.
  - Publish adapter: normalize input with published-artifact contract; call publication service with `session.owner.runId`; return `{ success: true, artifacts }` JSON.
  - Send adapter: call `SendMessageToDispatcher` as today.
- Do not place family business validation in Claude or Codex runtime folders.
- Update tests by behavior, not by preserving old server names.
- Add negative assertions/static scans for old migrated server names/dynamic registrations in production code.
- Keep secrets redacted in all test fixtures and logs.
