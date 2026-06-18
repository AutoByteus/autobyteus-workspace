# Design Spec

## Current-State Read

Current code supports two browser paths:

1. **Host Electron embedded browser path**: Electron starts `BrowserRuntime`, starts `BrowserBridgeServer`, receives `AUTOBYTEUS_BROWSER_BRIDGE_BASE_URL` and `AUTOBYTEUS_BROWSER_BRIDGE_TOKEN`, then injects those env vars into the bundled backend server process. Backend browser support is available when `BrowserBridgeConfigResolver` can read those env vars.
2. **Remote/Docker host-browser pairing path**: Electron can expose its local browser bridge to a remote node. The UI shows Remote Browser Sharing and Pair/Unpair controls; Electron issues an expiring descriptor; the frontend sends it to the remote node via GraphQL; the remote backend stores it in `RuntimeBrowserBridgeRegistrationService` and dynamically registers embedded browser tools.

The user clarified that remote/Docker nodes should not use the host Electron browser. They should use BrowserServer MCP configured inside the container/node. Therefore path 2 is now legacy and should be removed in this ticket.

There is also an independent Agent Tools MCP exposure bug: the catalog always treats static embedded browser adapter names as reserved even when Electron browser support is absent. This causes configured BrowserServer MCP tools such as `open_tab` to be dropped. `tools/list` and `tools/call` also derive ownership by static adapter name, so the target design must store explicit route ownership per session.

## Intended Change

Simplify the browser-source model and fix Agent Tools MCP routing:

```text
Host Electron-started server:
  embedded browser tools via env-injected local bridge

Remote/Docker server:
  BrowserServer MCP tools if configured/selected
  otherwise no browser tools

Remote/Docker server:
  no host Electron browser pairing
```

Implementation design:

1. Remove remote browser sharing/pairing UI, Electron IPC/state, frontend store/client, backend GraphQL mutations, backend runtime binding service, dynamic browser tool registry sync, generated types, tests, and docs.
2. Keep host Electron embedded browser support through env injection only.
3. Simplify backend browser support resolution to env-only.
4. Refactor Agent Tools MCP session exposure to build a source-aware route table from active providers and configured MCP sources.
5. Ensure `enabledTools`, `tools/list`, and `tools/call` all derive from the frozen session route table.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix + Behavior Change + Removal/Cleanup.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue plus Legacy Or Compatibility Pressure.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes.
- Evidence: Runtime Docker server has BrowserServer MCP registered and no Electron bridge env. Catalog still reserves embedded browser names, and remote pairing code adds a second unsupported browser source for remote nodes.
- Design response: Remove the remote pairing source entirely and make Agent Tools MCP source ownership explicit through route-backed sessions.
- Refactor rationale: Removing pairing without route-backed exposure still leaves static-name suppression and static-first call routing. Route ownership is needed for correctness.
- Intentional deferrals and residual risk, if any: Persisted source-aware agent tool selection is deferred. The current bare-name configuration remains, with deterministic runtime source routing. Any future need for user-selectable browser source on host Electron should be a separate source-aware configuration feature.

## Terminology

- Embedded browser: AutoByteus-owned Electron/local bridge browser tools for the host Electron-started bundled server.
- Remote pairing: removed flow that allowed remote/Docker nodes to use the host Electron browser bridge.
- Configured MCP source: a tool registered from a user-configured MCP server such as BrowserServer.
- Effective provider: a provider that participates in a specific runtime/session.
- Route: per-session source ownership for one Agent Tools MCP wire tool name.
- Protected static tool: internal platform/control tool that must not be overridden by configured MCP, e.g. `send_message_to`.

## Design Reading Order

1. DS-001: browser-source simplification.
2. DS-002: Agent Tools MCP route-backed exposure.
3. DS-003: UI/Electron/backend removal of remote pairing.
4. File responsibility and removal plan.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove remote “Pair local browser” functionality instead of hiding it behind a flag or keeping fallback APIs.
- The design is invalid if it preserves remote bridge GraphQL mutations, remote pairing IPC APIs, or runtime remote browser binding as compatibility paths.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Browser source setup | Effective browser provider availability | Browser tool service / Electron runtime | Defines host Electron only vs remote MCP. |
| DS-002 | Primary End-to-End | Agent selected tool names | Agent Tools MCP route table and descriptor | `AgentToolMcpCatalog` | Fixes MCP browser exposure and static collision policy. |
| DS-003 | Primary End-to-End | Nodes settings / Electron IPC / GraphQL pairing surfaces | Removed code paths | Frontend/Electron/backend owners | Ensures Pair local browser is actually gone. |
| DS-004 | Return-Event | Runtime tool execution event | Canonical UI tool event | Existing backend event converters | Must remain stable after BrowserServer MCP tools become visible. |

## Primary Execution Spine(s)

- Host Electron: `Electron BrowserRuntime -> BrowserBridgeServer -> env overrides -> serverManager spawn -> BrowserBridgeConfigResolver(env) -> embedded browser provider active`.
- Docker/remote MCP: `MCP config -> MCP registry -> AgentToolMcpCatalog route table -> descriptor enabledTools -> runtime tools/list/call -> ConfiguredMcpRegistryToolAdapter`.
- Removed remote pairing: `RemoteBrowserSharing UI -> Electron pairing IPC -> remote GraphQL register binding -> runtime binding service` is deleted.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Host Electron remains the only embedded browser source. It injects env vars into its bundled server. Remote/Docker servers do not register an in-memory host-browser binding anymore. | BrowserRuntime, BrowserBridgeServer, BrowserBridgeConfigResolver | Electron runtime + browser tool service | Env override tests, docs |
| DS-002 | Agent selected names become a route table. Active static adapters and configured MCP sources are considered; one source route is chosen per wire name and stored on the session. | Configured names, active adapters, MCP sources, routes | `AgentToolMcpCatalog` | diagnostics, protected static collisions |
| DS-003 | All remote pairing surfaces are removed from UI, Electron IPC, backend GraphQL, generated types, tests, and docs. Node management continues without pairing cleanup. | NodeManager, preload/main IPC, GraphQL schema | Respective UI/Electron/backend boundaries | localization, generated files |
| DS-004 | Browser result events continue through existing runtime event conversion. BrowserServer MCP-origin tools should normalize under the same known `autobyteus_agent_tools` browser names. | Runtime event converters | Existing backend event system | result shape validation |

## Spine Actors / Main-Line Nodes

- `BrowserRuntime`: starts local browser bridge for host Electron.
- `BrowserBridgeServer`: local-only HTTP bridge for embedded host browser.
- `BrowserBridgeConfigResolver`: env-only backend browser support resolver after removal.
- `AgentToolMcpCatalog`: owner of effective route construction, list, call, and collision policy.
- `AgentToolMcpSession`: stores frozen route ownership.
- `ConfiguredMcpAgentToolSourceResolver`: resolves MCP-origin registry metadata.
- `NodeManager.vue`: node management UI after pairing controls are removed.

## Ownership Map

| Node | Owns |
| --- | --- |
| Electron browser runtime | Host local bridge lifecycle and env overrides. |
| Backend browser tool service | Whether embedded browser support exists in this server process. |
| Agent Tools MCP catalog | Effective tool source selection and runtime MCP exposure. |
| Configured MCP resolver/adapter | MCP source metadata validation and MCP registry execution. |
| Node Manager UI | Remote node add/open/rename/remove only, no browser pairing. |
| Backend GraphQL schema | No remote browser bridge mutations. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `AgentToolMcpSessionService.createAgentToolMcpSession` | `AgentToolMcpCatalog` | Creates session and descriptor. | Tool source policy. |
| Codex/Claude MCP materializers | Agent Tools MCP descriptor | Runtime-specific config projection. | Tool availability computation. |
| Electron preload API | Electron main | Renderer-safe host APIs. | Removed pairing APIs. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `RuntimeBrowserBridgeRegistrationService` | Remote nodes no longer pair to host browser. | Env-only `BrowserBridgeConfigResolver`; BrowserServer MCP for remote nodes. | In This Change | Delete file and tests. |
| `browser-tool-registry-sync.ts` | Only used by runtime remote binding. | Startup `registerBrowserTools()` env gate. | In This Change | Delete if no remaining references. |
| GraphQL `remote-browser-bridge.ts` resolver/types | Remote bridge registration removed. | No replacement. | In This Change | Remove schema import and generated frontend types. |
| Electron `BrowserPairingStateController` | Pairing state removed. | No replacement. | In This Change | Delete IPC handlers too. |
| Electron `RemoteBrowserSharingSettingsStore` | Remote sharing disabled permanently by removal. | Local bridge binds loopback. | In This Change | Delete settings file/tests. |
| Frontend `remoteBrowserSharingStore.ts` and `nodeRemoteBrowserPairingClient.ts` | Pair/unpair flow removed. | No replacement. | In This Change | Delete tests. |
| `RemoteBrowserSharingPanel.vue` and `RemoteNodePairingControls.vue` | UI surface removed. | NodeManager basic node actions. | In This Change | Delete component tests. |
| `browserPairing` node fields/types/update helpers | Pairing state no longer modeled. | Node profile without pairing field. | In This Change | Loader drops legacy field. |
| Browser bridge remote-token support | Remote bridge consumers removed. | Embedded token only. | In This Change | Simplify auth registry. |
| `reservedToolNames = listSupportedToolNames()` | Reserves inactive optional provider names. | Route-backed exposure. | In This Change | Remove from resolver flow. |
| Static-first `resolveToolCallAvailability` | Ignores selected route source. | Session route lookup. | In This Change | Required for same-name MCP tools. |
| Remote pairing docs/tests/localization | Obsolete. | MCP-based Docker docs/tests. | In This Change | Remove stale references. |

## Return Or Event Spine(s) (If Applicable)

Runtime event conversion stays in place. The implementation should verify that BrowserServer MCP-origin browser tool results under `autobyteus_agent_tools` continue to normalize into canonical browser tool events. No event architecture change is part of this ticket.

## Bounded Local / Internal Spines (If Applicable)

- `BrowserRuntime.start`: create tab manager -> create bridge server -> start local bridge -> set env overrides. Remote listener-host branching is removed.
- `AgentToolMcpCatalog.resolveConfiguredSessionToolExposure`: build active static map -> resolve MCP sources -> choose route per configured name -> freeze route table -> derive enabled names.
- Node removal: confirm -> remove remote node -> sync drafts. Remote browser cleanup branch is removed.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Generated GraphQL types | DS-003 | Frontend build | Remove generated remote bridge types after schema deletion. | Prevent stale API references. | Compile may pass with dead generated API. |
| Localization cleanup | DS-003 | Node Manager UI | Remove remote sharing strings and adjust remote-node description. | Avoid untranslated/dead strings. | Users see obsolete feature. |
| Docs cleanup | DS-003 | Product docs | Remove pair-local-browser instructions; mention BrowserServer MCP for Docker. | Align user guidance. | Users follow removed flow. |
| Diagnostics | DS-002 | Agent Tools MCP | Explain configured MCP route vs protected static collision. | Debugging. | Ambiguous warnings return. |
| Tests | All | Implementation | Remove stale tests and add route/removal tests. | Regression guard. | Dead code survives. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Host browser support | Electron BrowserRuntime + backend browser service | Reuse/Simplify | Already works through env injection. | N/A |
| Remote browser automation | Configured MCP management | Reuse | BrowserServer MCP is already registered. | N/A |
| Runtime source ownership | Agent Tools MCP | Extend | Existing owner of descriptor/list/call. | N/A |
| Pair local browser | Remote pairing subsystem | Remove | Product direction rejects host-browser pairing for remote nodes. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent Tools MCP | Route-backed exposure/list/call. | DS-002 | Runtime backends | Extend | Primary bug fix. |
| Backend browser tools | Env-only support detection and embedded tool execution. | DS-001 | Host Electron server | Simplify | Remove runtime binding source. |
| Electron browser runtime | Local bridge/env override only. | DS-001, DS-003 | Host desktop app | Simplify | Remove remote sharing settings/pairing. |
| Frontend Nodes settings | Node management without browser pairing. | DS-003 | User settings UI | Simplify | Remove pair controls. |
| GraphQL schema | App API excluding remote bridge mutations. | DS-003 | Backend/frontend | Simplify | Remove resolver/types. |
| Configured MCP | BrowserServer MCP source metadata/execution. | DS-002 | Remote/Docker browser automation | Reuse | No BrowserServer code change. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `agent-tool-mcp-tool-route.ts` | Agent Tools MCP | Route model | Define route union and clone helpers. | Shared by session/catalog/registry. | N/A |
| `agent-tool-mcp-adapter.ts` | Agent Tools MCP | Adapter/provider contract | Add provider activity and/or reservation policy metadata. | Existing adapter contract. | Route model lightly. |
| `agent-tool-mcp-catalog.ts` | Agent Tools MCP | Exposure owner | Build active adapter map, MCP routes, protected collisions, route-backed list/call. | Existing catalog. | Route model. |
| `browser-bridge-config-resolver.ts` | Backend browser tools | Support resolver | Env-only support. | Existing resolver. | Browser env parser. |
| `browser-runtime.ts` / `browser-bridge-server.ts` | Electron browser runtime | Local bridge | Remove remote host/listener APIs; keep env overrides. | Existing runtime. | Embedded token auth. |
| `NodeManager.vue` | Frontend settings | Nodes UI | Remove pairing panel/controls/store dependency. | Existing Node Manager owner. | Node store only. |
| GraphQL schema files | Backend GraphQL | API schema | Remove remote bridge resolver. | Existing schema. | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Tool route ownership | `agent-tool-mcp-tool-route.ts` | Agent Tools MCP | Needed by catalog/session/registry/tests. | Yes | Yes | A second registry. |
| Browser support source | Existing env config parser | Backend browser tools | Only env remains. | Yes | Yes | Runtime binding store. |
| Node profile shape | `types/node.ts` | Frontend/Electron shared types | Remove pairing fields. | Yes | Yes | Compatibility carrier for removed state. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentToolMcpToolRoute` | Yes | Yes | Low | One wire name, one source branch. |
| `NodeProfile` | Yes after cleanup | Yes | Low | Remove `browserPairing`. |
| Browser bridge config | Yes | Yes | Low | Env-only `{ baseUrl, authToken }`. |
| `enabledTools` | Yes as projection | Yes | Medium | Do not use as ownership; derive from routes. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-tool-route.ts` | Agent Tools MCP | Route model | Route union/projection/clone helper. | Shared route authority. | N/A |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-catalog.ts` | Agent Tools MCP | Exposure/routing owner | Active providers, route decisions, route-backed list/call. | Existing authority. | Route model. |
| `autobyteus-server-ts/src/agent-tools/mcp/configured-mcp/configured-mcp-agent-tool-source-resolver.ts` | Configured MCP | MCP metadata resolver | Resolve MCP sources without static reservation policy. | Keeps registry concern isolated. | Configured source type. |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session.ts` | Agent Tools MCP | Session contract | Add route table. | Existing session type. | Route model. |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session-registry.ts` | Agent Tools MCP | In-memory session storage | Store cloned route table. | Existing registry. | Route clone helper. |
| `autobyteus-server-ts/src/agent-tools/browser/browser-bridge-config-resolver.ts` | Backend browser tools | Support resolver | Remove runtime binding lookup; env-only. | Existing boundary. | Browser env parser. |
| `autobyteus-server-ts/src/agent-tools/browser/runtime-browser-bridge-registration-service.ts` | Backend browser tools | Removed | Delete. | Obsolete. | N/A |
| `autobyteus-server-ts/src/api/graphql/schema.ts` and `types/remote-browser-bridge.ts` | Backend GraphQL | API schema | Remove resolver/types. | Existing schema owner. | N/A |
| `autobyteus-web/electron/browser/*` pairing/sharing files | Electron runtime | Removed | Delete pairing controller/settings IPC. | Obsolete. | N/A |
| `autobyteus-web/components/settings/NodeManager.vue` | Frontend settings | Nodes UI | Remove pairing UI and cleanup calls. | Existing owner. | Node store. |
| `autobyteus-web/types/node.ts` and Electron re-export | Shared frontend/Electron types | Node profile model | Remove browser pairing types/fields. | Existing model. | N/A |

## Ownership Boundaries

- Agent Tools MCP owns runtime tool exposure. No backend materializer, frontend screen, or configured MCP resolver should duplicate exposure decisions.
- Browser tools own only embedded browser support detection/execution for host Electron server.
- Electron owns local bridge startup and env injection; it no longer owns remote node browser capability.
- Configured MCP owns remote/Docker browser automation via BrowserServer MCP registration/execution.
- Node Manager owns node CRUD; it no longer owns browser pairing state.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgentToolMcpCatalog.resolveConfiguredSessionToolExposure` | Active source selection and route table. | Session service. | Backends compute enabled tools from raw names. | Return route-backed exposure. |
| `AgentToolMcpCatalog.resolveToolCallAvailability` | Route-backed adapter dispatch. | MCP routes. | Static adapter lookup before route lookup. | Read `session.toolRoutes`. |
| `BrowserBridgeConfigResolver.resolve` | Env-only browser support. | Browser tool service. | Runtime remote binding fallback. | Remove binding code. |
| `NodeManager.vue` | Node CRUD UI. | Settings page. | Pair/unpair browser controls. | Delete pairing components. |

## Dependency Rules

- Backend browser support may depend on env parser only; it must not depend on runtime remote binding services.
- Agent Tools MCP catalog may depend on browser adapter provider and configured MCP resolver; browser provider must not call configured MCP code.
- Frontend Node Manager may depend on `nodeStore`; it must not depend on removed remote browser sharing store.
- Electron preload must not expose removed browser pairing APIs.
- GraphQL schema must not expose removed remote bridge mutations.
- Docs/tests must not refer to Pair local browser for remote nodes.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `BrowserBridgeConfigResolver.resolve(env)` | Host embedded browser support | Return env bridge config or null. | process env | No runtime binding fallback. |
| `resolveConfiguredSessionToolExposure(context)` | Runtime tool exposure | Return routes, enabled names, diagnostics. | configured names + context | Main route boundary. |
| `ConfiguredMcpAgentToolSourceResolver.resolve` | MCP metadata | Return MCP sources/missing diagnostics. | configured names | No reserved static names input. |
| Electron preload API | Renderer IPC | Host app operations. | explicit method calls | Pairing methods removed. |
| GraphQL schema | Backend API | App data operations. | typed GraphQL operations | Remote bridge mutations removed. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Browser bridge resolver | Yes | Yes | Low | Env-only. |
| Agent Tools MCP exposure | Yes | Yes | Low | Route output. |
| Node profile | Yes after cleanup | Yes | Low | Remove pairing fields. |
| GraphQL schema | Yes after cleanup | Yes | Low | Remove remote bridge operations. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Host embedded browser | `embedded browser` | Yes | Low | Use only for host Electron path. |
| Remote pairing | `remote browser sharing` / `Pair local browser` | Obsolete | High | Remove names and strings. |
| Route model | `AgentToolMcpToolRoute` | Yes | Low | Add explicit route type. |
| BrowserServer MCP | Existing name | Yes | Low | No change. |

## Applied Patterns (If Any)

- **Removal as simplification**: delete unsupported product path instead of adding more gating logic.
- **Conditional provider**: provider code can exist, but only active sources participate in runtime exposure.
- **Route table ownership**: session route table is the source of truth for list/call.
- **Thin facade**: runtime materializers consume descriptors only.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/mcp` | Folder | Agent Tools MCP | Route-backed exposure and MCP session behavior. | Existing subsystem. | Electron UI logic. |
| `autobyteus-server-ts/src/agent-tools/browser` | Folder | Backend browser tools | Env-only embedded browser support and tool implementations. | Existing browser capability area. | Remote runtime binding. |
| `autobyteus-server-ts/src/api/graphql/types` | Folder | GraphQL API | Remove remote bridge resolver. | API schema boundary. | Removed pairing operations. |
| `autobyteus-web/electron/browser` | Folder | Electron browser runtime | Local bridge and tab/session management. | Existing Electron runtime. | Remote pairing controller/settings. |
| `autobyteus-web/components/settings` | Folder | Settings UI | Node management without pairing controls. | Existing settings UI. | Remote browser sharing panel. |
| `autobyteus-web/stores` | Folder | Frontend state | Remove remote browser sharing store. | Store no longer needed. | Pairing state. |
| `autobyteus-web/types` | Folder | Shared frontend types | Node profile without browser pairing. | Existing type owner. | Removed pairing descriptors/settings. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `agent-tools/mcp` | Main-Line Domain-Control + transport | Yes | Low | Existing owner of runtime MCP exposure. |
| `agent-tools/browser` | Capability area | Yes | Low | Browser implementation/support only. |
| `electron/browser` | Electron runtime | Yes | Medium | After deletion, should contain only local browser runtime/session code. |
| `components/settings` | UI | Yes | Low | Remove obsolete pairing components. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Docker with BrowserServer MCP | `open_tab -> configured_mcp(BrowserServer)` route. | `open_tab` hidden by inactive embedded adapter. | Main bug fix. |
| Docker without BrowserServer MCP | no `open_tab` route. | Expose embedded `open_tab` with unavailable error. | Ensures inactive provider is absent. |
| Host Electron | `open_tab -> static_adapter(open_tab)` when no MCP duplicate. | Remove all embedded browser support. | Preserves desktop app. |
| Removed pairing | No Pair local browser button or GraphQL mutation. | Hide button but leave mutation/service. | Avoids dead compatibility path. |
| Protected static tool | `send_message_to -> static_adapter`, MCP duplicate diagnostic. | MCP overrides platform messaging. | Preserves internal control tools. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Hide Pair local browser UI but keep backend GraphQL/runtime binding | Lower implementation risk. | Rejected | Delete UI, IPC, GraphQL, service, tests, docs. |
| Keep remote pairing behind a feature flag | Could preserve old users. | Rejected | Product direction says remote browser = MCP. |
| Prefix BrowserServer MCP names | Avoids collision. | Rejected | Keep raw names; fix runtime routing. |
| Only change `reservedToolNames` without route table | Smaller patch. | Rejected | `tools/list`/`tools/call` would still re-derive wrong source. |
| Preserve `browserPairing` field in node model | Avoid registry migration concern. | Rejected | Drop/ignore legacy field; no behavior retained. |

## Derived Layering (If Useful)

Target layering:

1. Electron host local browser bridge: starts only for local host support and provides env overrides.
2. Backend browser service: reads env and executes embedded browser tools only when env support exists.
3. Configured MCP registry: owns BrowserServer MCP tools for Docker/remote browser automation.
4. Agent Tools MCP catalog: route-backed runtime exposure across static and configured MCP sources.
5. Runtime backends: consume descriptors; no exposure decisions.
6. Frontend settings: node CRUD; no browser pairing.

## Migration / Refactor Sequence

1. Remove backend remote bridge binding path:
   - delete `runtime-browser-bridge-registration-service.ts` and tests;
   - delete `browser-tool-registry-sync.ts` if only referenced there;
   - update `browser-bridge-config-resolver.ts` to env-only;
   - delete GraphQL `remote-browser-bridge.ts` and remove schema import.
2. Remove Electron remote pairing/sharing path:
   - delete pairing controller, IPC handler, remote sharing settings store and tests;
   - simplify `BrowserRuntime` options to remove `listenerHost` and remote bridge base URL helpers;
   - simplify `BrowserBridgeServer` to local bridge only;
   - simplify auth registry to embedded token only;
   - remove pairing setup from `electron/main.ts`, `preload.ts`, and Electron type declarations.
3. Remove frontend pairing UI/state:
   - delete `RemoteBrowserSharingPanel.vue`, `RemoteNodePairingControls.vue`, `remoteBrowserSharingStore.ts`, `nodeRemoteBrowserPairingClient.ts`, and tests;
   - update `NodeManager.vue` to remove panel/controls, busy state coupling, remote cleanup on node removal, and initialization call;
   - remove pairing/localization strings and adjust remote-node description;
   - remove pairing types from `types/node.ts` and Electron re-export types; update node registry loader to ignore/drop legacy field.
4. Regenerate/update GraphQL generated frontend types after schema removal.
5. Implement Agent Tools MCP route-backed exposure:
   - add route model;
   - add provider activity/reservation metadata;
   - make browser provider inactive when env support absent;
   - remove static reservation from configured MCP resolver;
   - route-backed `enabledTools`, `tools/list`, and `tools/call`.
6. Update tests:
   - remove obsolete pairing/sharing tests;
   - add absence tests for removed GraphQL/IPC/UI surfaces;
   - add Agent Tools MCP route tests for Docker BrowserServer MCP and host Electron env support;
   - keep host Electron env injection tests.
7. Update docs to remove remote pairing instructions and document BrowserServer MCP as Docker/remote browser path.

## Key Tradeoffs

- Removing remote pairing is larger than the original bug fix but simplifies the product model and reduces security/state complexity.
- Route-backed Agent Tools MCP adds a small internal model but prevents repeated source-ownership bugs.
- Dropping legacy `browserPairing` data may remove stale UI state for existing users, which is intended.

## Risks

- The broad removal may leave stale references in generated files, localization, tests, or docs; implementation should use repository-wide searches.
- GraphQL generated type updates may require the project’s codegen workflow.
- Host Electron browser support must be explicitly tested after simplifying `BrowserRuntime`/`BrowserBridgeServer`.
- Some result normalization tests may need updates once BrowserServer MCP browser tools are exposed.

## Guidance For Implementation

- Treat this as a clean-cut removal. Do not leave hidden GraphQL mutations or IPC methods for pairing.
- Keep host Electron env injection working; this is not removal of embedded browser for local desktop.
- Do not special-case BrowserServer MCP names. The generic rule is active source routing: inactive embedded browser provider reserves no names; configured MCP routes normally.
- Any code that dispatches by checking static adapter names before session route ownership is a regression.
- Run repository-wide searches for `RemoteBrowser`, `remoteBrowser`, `browserPairing`, `browser-pairing`, `Pair local browser`, `registerRemoteBrowserBridge`, `RuntimeBrowserBridge`, and `remote browser sharing` before handoff.
