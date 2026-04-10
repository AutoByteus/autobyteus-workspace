# Proposed Design Document

## Design Version

- Current Version: `v3`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial draft | Defined runtime remote-pairing architecture, runtime tool-registry synchronization, Electron pairing state/persistence, and file-level change inventory | 1 |
| v2 | Stage 5 round 1 blocker | Added an explicit Electron-side pairing lifecycle controller so local expiry updates node status and stays aligned with remote expiry semantics | 1 |
| v3 | Stage 6 implementation review re-entry | Split remote-browser-sharing renderer ownership out of `NodeManager`, made node-removal cleanup authoritative in Electron, and documented the trusted-LAN threat-model tradeoff for minimal server-side auth in v1 | 4 |

## Artifact Basis

- Investigation Notes: `tickets/in-progress/remote-browser-bridge-pairing/investigation-notes.md`
- Requirements: `tickets/in-progress/remote-browser-bridge-pairing/requirements.md`
- Requirements Status: `Design-ready`
- Shared Design Principles: `/Users/normy/.codex/skills/software-engineering-workflow-skill/shared/design-principles.md`
- Common Design Practices: `/Users/normy/.codex/skills/software-engineering-workflow-skill/shared/common-design-practices.md`

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. In this template, `module` is not a synonym for one file and not the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.

## Design Reading Order

Read and write this design from abstract to concrete:

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Reading Rule

- This document is organized around the data-flow spine inventory first.
- Main domain subject nodes and ownership boundaries are the primary design story.
- Off-spine concerns are described in relation to the spine they serve.
- Existing capability areas/subsystems are reused or extended when they naturally fit an off-spine need.
- Files are the main concrete mapping target for concerns, and subsystems are the broader ownership context.

## Summary

The chosen design keeps Electron main as the only owner of browser lifecycle and bridge execution, then adds an explicit remote-pairing layer on both sides of the boundary:

- Electron gains a remote-browser-sharing settings store, a per-node bridge-token registry, and IPC handlers that issue or revoke per-node remote bridge descriptors.
- Electron also gains a pairing lifecycle controller that owns node-scoped expiry timers and visible pairing-status transitions.
- Electron main remains authoritative for node removal and must route node-delete cleanup through the pairing lifecycle controller before deleting the persisted node record.
- Renderer remote-browser-sharing UX moves into a dedicated settings panel so `NodeManager` remains a composition boundary instead of absorbing another full concern.
- Remote servers gain a runtime browser-bridge registration service and GraphQL mutation boundary that can accept or clear a bridge descriptor without server restart.
- Browser tool advertisement on remote nodes remains capability-aligned by runtime-registering browser tools into the global tool registry when pairing becomes active and unregistering them on revocation or expiry.
- Execution-time browser use still stays gated by agent `toolNames`; pairing only makes the capability reachable.

This direction reuses the existing HTTP bridge contract, avoids introducing a second browser runtime, solves the startup-only tool-advertisement constraint discovered in investigation, and keeps the security-sensitive boundary explicit and user-driven.

## Goal / Intended Change

Enable a user-added remote node to use the local Electron browser only when:

1. the user has explicitly enabled advanced remote-browser sharing on the desktop,
2. the user has explicitly paired that specific node, and
3. the agent definition on the remote node already includes the relevant browser `toolNames`.

The change must work without remote server restart, preserve the embedded Electron browser path, and keep tool advertisement aligned with actual runtime capability on the remote node.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action:
  - remove the single-auth-token assumption inside `BrowserBridgeServer`
  - remove the env-only browser-support assumption inside server browser capability resolution
  - remove the startup-only browser-tool-registration assumption as the only way remote nodes can expose browser tools
- Gate rule: the design is invalid if it depends on compatibility wrappers, dual-path behavior, or legacy fallback branches that keep the old limitations in place.

## Requirements And Use Cases

| Requirement ID | Description | Acceptance Criteria ID(s) | Acceptance Criteria Summary | Use Case IDs |
| --- | --- | --- | --- | --- |
| `R-001` | Electron keeps remote-browser sharing disabled by default | `AC-001` | Remote nodes stay unable to use the browser when the advanced setting is off | `UC-001`, `UC-005`, `UC-006` |
| `R-002` | Advanced opt-in control with warning and restart semantics | `AC-001`, `AC-002` | Listener/public reachability only changes after explicit user opt-in | `UC-001`, `UC-002` |
| `R-003` | Sharing applies only to explicitly added and explicitly paired nodes | `AC-002`, `AC-005` | No broad network-wide browser grant | `UC-002`, `UC-005` |
| `R-004` | Per-node pairing only | `AC-002`, `AC-004` | Credentials are node-specific | `UC-002`, `UC-004`, `UC-005` |
| `R-005` | Credentials are revocable, scoped, and time-bounded | `AC-005`, `AC-006` | Revocation and expiry disable access | `UC-002`, `UC-004`, `UC-005` |
| `R-006` | Runtime registration without remote restart | `AC-003`, `AC-004`, `AC-006` | Pair/unpair can happen on a live remote node | `UC-002`, `UC-004`, `UC-005` |
| `R-007` | Browser tool configuration remains usable without remote restart | `AC-003`, `AC-008` | Tool advertisement/configuration reflects pairing on a live node | `UC-003` |
| `R-008` | Agent `toolNames` gating remains authoritative | `AC-004`, `AC-005` | Pairing does not bypass existing agent authorization | `UC-004`, `UC-007` |
| `R-009` | Electron browser shell remains authoritative | `AC-004`, `AC-007` | No second browser runtime is introduced | `UC-004`, `UC-006` |
| `R-010` | Pairing status and failures are visible in node management | `AC-002`, `AC-005`, `AC-006` | UI shows pairing lifecycle state | `UC-002`, `UC-005` |
| `R-011` | Embedded flow remains unchanged | `AC-007` | Embedded browser stays functional without remote opt-in | `UC-006` |

## Current-State Read

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Current Spine Or Fragmented Flow | Electron starts one local HTTP bridge and injects its loopback URL into the embedded server env. Remote nodes do not participate. | `autobyteus-web/electron/browser/browser-runtime.ts`, `autobyteus-web/electron/main.ts`, `autobyteus-web/electron/server/serverRuntimeEnv.ts` | How to advertise a remote-reachable host safely and predictably |
| Current Ownership Boundaries | Electron main owns browser execution; server owns browser tool contract and agent-run exposure; NodeManager owns node add/open UX | `autobyteus-web/electron/browser/browser-bridge-server.ts`, `autobyteus-server-ts/src/agent-tools/browser/browser-tool-service.ts`, `autobyteus-web/components/settings/NodeManager.vue` | Whether pair/unpair orchestration should live directly in `NodeManager` or a dedicated store/helper |
| Current Coupling / Fragmentation Problems | Browser tool advertisement is startup-gated by the server’s default tool registry, but remote pairing must be runtime-driven | `autobyteus-server-ts/src/agent-tools/browser/register-browser-tools.ts`, `autobyteus-server-ts/src/api/graphql/types/agent-customization-options.ts` | Whether browser tools should be registered only while paired or always once remote sharing is enabled |
| Existing Constraints / Compatibility Facts | Codex execution-time browser tools already require both browser support and configured browser `toolNames`; agent definitions store raw tool names without registry validation | `autobyteus-server-ts/src/agent-execution/backends/codex/browser/build-browser-dynamic-tool-registrations.ts`, `autobyteus-server-ts/src/agent-definition/services/agent-definition-service.ts` | Whether all other runtime paths rely only on registry presence or also on direct support checks |
| Relevant Files / Components | Node registry persistence exists; Electron IPC boundary exists; GraphQL runtime-mutation pattern exists; tool registry supports runtime register/unregister | `autobyteus-web/electron/nodeRegistryStore.ts`, `autobyteus-web/electron/preload.ts`, `autobyteus-server-ts/src/api/graphql/types/server-settings.ts`, `autobyteus-ts/src/tools/registry/tool-registry.ts` | Exact UI wording and state model can still be refined |

## Current State (As-Is)

- Electron browser bridge:
  - one server instance
  - one runtime token
  - loopback-only bind
  - embedded env consumer only
- Remote node UX:
  - add node
  - health-based capability probe
  - registry persistence
  - open node window
  - no browser-pairing metadata or action
- Server browser capability:
  - browser support = env exists
  - startup browser tool registration = env exists
  - Codex dynamic browser tools = env exists and agent `toolNames` include browser tools
- Tool advertisement:
  - remote node tool forms query the server’s current registry
  - no runtime mechanism exists today to turn browser tools on for a running remote node

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Owning Node / Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| `DS-001` | `Primary End-to-End` | Electron settings / NodeManager pairing action | Remote server runtime browser capability becomes active and browser tools become advertised | Electron pairing controller -> remote runtime registration service | This is the enablement spine that makes remote pairing real without restart |
| `DS-002` | `Primary End-to-End` | Remote agent run with browser `toolNames` | Electron browser shell executes browser work | Browser tool service / Electron browser runtime | This is the actual user-visible browser execution spine |
| `DS-003` | `Primary End-to-End` | User unpairs a node, removes a paired node, or pairing expires | Remote node loses browser capability, Electron status becomes `revoked` or `expired`, and later agent runs fail safely | Electron pairing lifecycle controller -> runtime registration service | This is the negative-path/security spine |
| `DS-004` | `Bounded Local` | Runtime binding registration inside the remote server | Timed expiry, tool-registry sync, and binding cleanup | `RuntimeBrowserBridgeRegistrationService` | Expiry and registry synchronization materially shape correctness |
| `DS-005` | `Bounded Local` | Electron descriptor issuance / expiry state transition | Authorized bridge request acceptance or rejection plus node-visible status updates | `BrowserPairingStateController` + `BrowserBridgeAuthRegistry` | Multi-node pairing needs explicit local auth ownership and expiry-state ownership instead of one global token |

## Primary Execution / Data-Flow Spine(s)

- `DS-001`: `NodeManager Pair Intent -> Electron Pairing IPC -> Browser Bridge Auth Registry -> Remote GraphQL Pair Mutation -> Runtime Browser Bridge Registration Service -> Browser Tool Registry`
  - Narrative: a user action in Electron creates a node-scoped bridge descriptor, sends it to the selected remote server, and makes that server advertise browser tools on the live node without restart.
  - Main domain subject nodes: pairing intent, bridge descriptor, runtime binding, tool advertisement.
  - Governing owner: Electron owns descriptor issuance; remote server owns runtime acceptance and registry exposure.
  - Why the span is long enough: it starts at the user-facing initiation point, crosses the desktop/server boundary, reaches the authoritative runtime owner on the remote server, and ends at the downstream effect that matters to configuration UX.
- `DS-002`: `Remote Agent Run -> Agent Bootstrap / Tool Exposure -> Browser Tool Service -> Browser Bridge Client -> Electron Browser Bridge Server -> Browser Tab Manager / Browser Shell`
  - Narrative: an agent run on a paired remote node resolves browser capability, executes through the existing browser client contract, and the Electron-owned browser shell performs the real browser work.
  - Main domain subject nodes: agent run, tool exposure, bridge resolution, browser operation execution.
  - Governing owner: server browser tool service for execution contract; Electron browser runtime for actual browser lifecycle.
  - Why the span is long enough: it starts at the business initiator (agent run), crosses the authoritative execution boundary, and ends at the user-visible browser surface.
- `DS-003`: `Unpair Action / Node Removal / Local Expiry Timer -> Electron Pairing Lifecycle Controller -> Electron Auth Revocation + Remote Binding Clear/Expiry -> Browser Tool Registry Unregister -> Later Agent Run Denied`
  - Narrative: a manual revoke, explicit node removal, or timed expiry removes both the remote binding and the desktop-side token allowance, updates Electron node status to `revoked` or `expired` when applicable, and ensures subsequent runs fail safely rather than silently using stale access.
  - Main domain subject nodes: revocation, expiry, registry sync, denied execution.
  - Governing owner: Electron pairing lifecycle controller plus pairing registration services on each side of the boundary.
  - Why the span is long enough: it starts at the security trigger and reaches the downstream negative business effect that must be enforced.

## Spine Actors / Main-Line Nodes

| Node | Role In Spine | What It Advances |
| --- | --- | --- |
| `NodeManager` | User-facing initiator | Starts pair/unpair flow and shows node pairing status |
| `Electron pairing IPC/controller` | Desktop authoritative boundary | Invokes the pairing lifecycle controller from renderer actions |
| `BrowserPairingStateController` | Desktop pairing lifecycle owner | Issues descriptors, schedules local expiry, revokes local bindings, and persists node pairing status |
| `BrowserBridgeAuthRegistry` | Electron auth owner | Tracks embedded token plus remote node tokens and validates incoming bridge requests |
| `RemoteBrowserBridgeResolver` | Remote server mutation boundary | Accepts pair/unpair requests on a live server |
| `RuntimeBrowserBridgeRegistrationService` | Remote runtime capability owner | Stores active binding, expiry timer, and tool-registry synchronization |
| `BrowserToolRegistrySync` | Off-spine registry updater | Registers or unregisters browser tool definitions based on effective support |
| `BrowserBridgeConfigResolver` | Execution-time support boundary | Resolves browser bridge config from env or runtime binding |
| `BrowserToolService` | Server browser execution boundary | Validates semantics and dispatches browser operations |
| `BrowserBridgeClient` | Bridge transport client | Sends HTTP requests to Electron with bridge credentials |
| `BrowserBridgeServer` | Electron execution boundary | Authorizes requests and routes to browser session manager |
| `BrowserTabManager / BrowserShellController` | Browser lifecycle owner | Performs actual browser operations and updates Browser shell |

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-001` | Pairing starts in Electron UI, flows through Electron IPC into the pairing lifecycle controller to mint a node-scoped bridge descriptor, then crosses to a remote GraphQL mutation that activates runtime browser support and live browser tool advertisement on that remote server. | Pair action, descriptor, runtime binding, tool registry | Electron pairing lifecycle controller + remote registration service | desktop settings persistence, node registry status, GraphQL client helper |
| `DS-002` | Once paired, a remote agent run resolves browser support through the runtime binding, builds or executes only the configured browser tools, and reuses the existing HTTP bridge contract to drive the Electron browser shell. | Agent run, tool gating, bridge config, browser execution | Browser tool service + Electron browser runtime | tool-advertisement queries, semantic validators, screenshots/artifacts |
| `DS-003` | Revocation or expiry clears the remote server binding and desktop authorization record, while the Electron pairing lifecycle controller also updates persisted node status to `revoked` or `expired`, then browser tools disappear from the remote node registry view and later calls fail with browser-unavailable errors. | Revocation, expiry, status transition, registry sync, denial path | Electron pairing lifecycle controller + remote registration service | expiry timer, UI status transitions, error reporting |

## Ownership Map

| Node / Owner | Owns | Must Not Own | Notes |
| --- | --- | --- | --- |
| `NodeManager` | Node-management screen composition, add/remove/rename flows, sync surfaces | Remote browser-sharing state machine details, bridge token lifecycle, remote GraphQL mutation details | Host/composition boundary only |
| `RemoteBrowserSharingPanel` | Advanced browser-sharing settings UX, pair/unpair actions, pairing badges, and current-node tool refresh triggers | Token minting, bridge auth validation, remote runtime binding state | Dedicated renderer owner for the remote-browser-sharing concern |
| `Electron pairing controller` | Desktop-side renderer/main orchestration for pair/unpair actions | Browser request routing, token records, remote server registry mutation internals | Authoritative boundary for user-triggered local pairing actions |
| `BrowserPairingStateController` | Descriptor issuance, local expiry timer ownership, node-status persistence, and local revoke semantics | Browser request routing, raw renderer UI state, remote default tool registry mutation | Authoritative owner for local pairing lifecycle state |
| `BrowserBridgeAuthRegistry` | Active embedded token and active remote node tokens | UI concerns or remote server tool registry updates | Pure auth and token lifecycle owner |
| `RemoteBrowserBridgeResolver` | GraphQL mutation boundary for runtime pairing | Execution-time browser semantics or default tool exposure logic | Thin boundary over registration service |
| `RuntimeBrowserBridgeRegistrationService` | Active runtime binding, expiry timer, effective support state transitions | GraphQL transport, direct browser operation execution | Authoritative server-side runtime binding owner |
| `BrowserToolRegistrySync` | Register/unregister browser tool definitions | Storing runtime credentials or handling GraphQL input | Off-spine concern serving runtime registration service |
| `BrowserBridgeConfigResolver` | Resolve effective bridge config for execution | Tool registry mutation or UI state | Shared support boundary for startup and runtime states |
| `BrowserToolService` | Browser semantics + bridge execution | Owning runtime registration or pair lifecycle | Execution boundary only |
| `BrowserBridgeServer` | HTTP request auth and routing | Pairing UI state or remote server mutation semantics | Keeps Electron browser surface authoritative |

## Return / Event Spine(s) (If Applicable)

- `Remote pair mutation success -> BrowserPairingStateController marks node paired -> node-registry broadcast -> all open windows refresh pairing badges`
- `BrowserPairingStateController local expiry timer fires -> revoke local binding -> node status becomes expired -> node-registry broadcast -> Electron UI drops paired badge before any manual refresh`
- `Node removal request -> Electron main delegates to BrowserPairingStateController cleanup -> token/timer revoked before node record deletion -> no stale expiry callback remains`
- `Runtime binding expiry timer -> browser tool registry unregister -> later tool list queries stop returning browser tools`

## Bounded Local / Internal Spines (If Applicable)

- parent owner: `RuntimeBrowserBridgeRegistrationService`
  - bounded local spine: `Register Binding -> Validate/Normalize -> Persist In Memory -> Schedule Expiry -> Sync Tool Registry`
  - why it must be explicit: this owner is responsible for the capability state transition that makes browser tool advertisement live or dead on a running remote node.
- parent owner: `BrowserBridgeAuthRegistry`
  - bounded local spine: `Issue Descriptor -> Record Node Binding -> Authorize Request Header -> Resolve Token Record -> Allow / Reject`
  - why it must be explicit: the feature moves from one global token to multiple node-scoped authorizations.
- parent owner: `BrowserPairingStateController`
  - bounded local spine: `Issue Descriptor -> Persist Pairing Metadata -> Schedule Local Expiry -> On Timer Fire Revoke Token -> Persist Status Expired / Cleanup Missing Node`
  - why it must be explicit: pairing visibility, removal cleanup, and expiry semantics are product requirements, not incidental UI side effects.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Serves Which Owner | Responsibility | Must Stay Off Main Line? (`Yes`/`No`) |
| --- | --- | --- | --- |
| `RemoteBrowserSharingSettingsStore` | Electron pairing controller | Persist advanced setting and advertised host | Yes |
| `Node registry pairing status fields` | RemoteBrowserSharingPanel / Electron pairing controller | Persist user-visible node pairing intent/status | Yes |
| `Local pairing expiry scheduler` | BrowserPairingStateController | Keep Electron node status aligned with the same expiry deadline issued to the remote node | Yes |
| `GraphQL pairing client utility` | RemoteBrowserSharingPanel | Send pair/unpair mutations to arbitrary remote node base URLs | Yes |
| `BrowserToolRegistrySync` | Runtime registration service | Keep default tool registry aligned with effective browser support | Yes |
| `Expiry timer` | Runtime registration service | Revoke time-bounded runtime bindings automatically | Yes |
| `Tool/options store refresh` | RemoteBrowserSharingPanel in active node window | Re-fetch tool lists when pairing status changes for the current node | Yes |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Electron browser execution | `autobyteus-web/electron/browser/` | `Reuse` | Existing browser runtime and shell are already authoritative | N/A |
| Desktop persistence for node-visible state | `autobyteus-web/electron/nodeRegistryStore.ts` | `Extend` | Node pairing status is node-scoped UI state and fits existing registry persistence | N/A |
| Desktop persistence for browser-sharing setting | Electron browser subsystem | `Create New` | This is browser-bridge policy state, not node registry data | Node registry should not own global browser-sharing settings |
| Remote runtime mutation boundary | GraphQL resolvers in `src/api/graphql/types/` | `Reuse` | Existing runtime actions already use GraphQL mutations | N/A |
| Runtime browser support resolution | `src/agent-tools/browser/` | `Extend` | Current browser execution logic already lives here | N/A |
| Runtime tool advertisement synchronization | `src/agent-tools/browser/` + `defaultToolRegistry` | `Extend` | Registry already supports register/unregister and browser tool definitions already live here | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/electron/browser/` | bridge listener mode, token issuance, auth, pairing IPC | `DS-001`, `DS-003`, `DS-005` | Electron browser runtime | `Extend` | Keep browser authority in Electron main |
| `autobyteus-web/electron/node registry` | per-node pairing intent/status persistence | `DS-001`, `DS-003` | NodeManager + RemoteBrowserSharingPanel | `Extend` | Reuse existing node metadata path |
| `autobyteus-web/components/settings/` and web utilities | dedicated remote-browser-sharing panel, pair/unpair UX, and remote GraphQL calls | `DS-001`, `DS-003` | RemoteBrowserSharingPanel | `Extend` | Split the remote-browser-sharing concern out of `NodeManager` |
| `autobyteus-server-ts/src/agent-tools/browser/` | runtime bridge config resolution, execution, registry sync | `DS-001`, `DS-002`, `DS-003`, `DS-004` | Browser tool service | `Extend` | Keeps browser capability logic in one server subsystem |
| `autobyteus-server-ts/src/api/graphql/types/` | runtime pair/unpair mutation boundary | `DS-001`, `DS-003` | Remote server GraphQL API | `Create New` | New resolver is the right runtime boundary |

## Ownership-Driven Dependency Rules

- Allowed dependency directions:
  - `NodeManager -> RemoteBrowserSharingPanel`
  - `RemoteBrowserSharingPanel -> Electron pairing IPC boundary`
  - `Electron pairing IPC boundary -> BrowserPairingStateController`
  - `RemoteBrowserSharingPanel -> remote pairing GraphQL client utility`
  - `Electron main node-removal path -> BrowserPairingStateController`
  - `RemoteBrowserBridgeResolver -> RuntimeBrowserBridgeRegistrationService`
  - `RuntimeBrowserBridgeRegistrationService -> BrowserToolRegistrySync`
  - `BrowserToolService -> BrowserBridgeConfigResolver -> BrowserBridgeClient`
  - `BrowserBridgeServer -> BrowserBridgeAuthRegistry -> BrowserTabManager`
- Authoritative public entrypoints versus internal owned sub-layers:
  - Electron renderer callers use pairing IPC, not direct auth-registry internals.
  - Electron node-removal logic uses `BrowserPairingStateController` for cleanup, not direct auth-registry/timer manipulation.
  - Remote GraphQL callers use `RemoteBrowserBridgeResolver`, not direct registration-service internals.
  - Upper browser callers use `BrowserToolService`, not both `BrowserToolService` and raw runtime-binding service.
- Authoritative Boundary Rule per domain subject:
  - runtime remote pairing subject: `RemoteBrowserBridgeResolver -> RuntimeBrowserBridgeRegistrationService`
  - execution-time bridge configuration subject: `BrowserToolService -> BrowserBridgeConfigResolver`
  - desktop pairing subject: `RemoteBrowserSharingPanel -> Electron pairing IPC/controller -> BrowserPairingStateController`
  - node-removal cleanup subject: `Electron main node-registry change -> BrowserPairingStateController`
- Forbidden shortcuts:
  - renderer must not construct tokens locally
  - renderer must not persist or schedule expiry state directly
  - resolver must not mutate `defaultToolRegistry` directly
  - callers above `BrowserToolService` must not read env or runtime binding services directly
  - `NodeManager` or `RemoteBrowserSharingPanel` must not call `BrowserBridgeServer` directly
  - Electron main must not bypass `BrowserPairingStateController` and manipulate remote-pairing timers inline during node deletion
- Boundary bypasses that are not allowed:
  - `NodeManager -> BrowserBridgeAuthRegistry`
  - `RemoteBrowserSharingPanel -> BrowserBridgeAuthRegistry`
  - `RemoteBrowserBridgeResolver -> defaultToolRegistry`
  - `Codex bootstrapper -> runtime pairing service`
- Temporary exceptions and removal plan:
  - none planned; target design is clean-cut.

## Architecture Direction Decision (Mandatory)

- Chosen direction: `Runtime pairing service on the remote server + runtime tool-registry synchronization + Electron-issued node-scoped bridge descriptors`
- Rationale (`complexity`, `testability`, `operability`, `evolution cost`):
  - `complexity`: reuses the existing HTTP bridge instead of inventing a new transport
  - `testability`: pairing, expiry, and registry sync can be unit-tested independently on both sides
  - `operability`: no remote restart is needed; user intent remains explicit
  - `evolution cost`: future transport changes can stay behind the descriptor/resolver boundaries
- Data-flow spine clarity assessment: `Yes`
- Spine span sufficiency assessment: `Yes`
- Spine inventory completeness assessment: `Yes`
- Ownership clarity assessment: `Yes`
- Off-spine concern clarity assessment: `Yes`
- Authoritative Boundary Rule assessment: `Yes`
- File placement within the owning subsystem assessment: `Yes`
- Outcome (`Keep`/`Add`/`Split`/`Merge`/`Move`/`Remove`): `Add`, `Extend`, `Remove`
- Note: the key rejected alternative is “always advertise browser tools regardless of live capability.” The registry can already add/remove tools at runtime, so keeping advertisement aligned with actual pairing is cleaner than allowing unconditional selection followed by guaranteed runtime failures.

## Common Design Practices Applied (If Any)

| Practice / Pattern | Where Used | Why It Helps Here | Owner / Off-Spine Concern | Notes |
| --- | --- | --- | --- | --- |
| Registry synchronization | Remote server browser tool exposure | Matches existing default tool registry model and avoids restart-only behavior | `RuntimeBrowserBridgeRegistrationService` + `BrowserToolRegistrySync` | Runtime register/unregister is already supported by the registry |
| Adapter/resolver | Browser bridge config lookup | Hides env-vs-runtime pairing details from execution callers | `BrowserBridgeConfigResolver` | Preserves one authoritative execution boundary |
| Explicit runtime mutation boundary | Remote GraphQL pairing API | Fits current server pattern for mutable runtime actions | `RemoteBrowserBridgeResolver` | Avoids ad hoc REST |
| State store | Electron remote-browser-sharing settings | Keeps advanced settings and node pairing status durable and inspectable | Electron browser subsystem + node registry | Separate global setting from per-node state |

## Ownership And Structure Checks (Mandatory)

| Check | Result (`Yes`/`No`) | Evidence | Decision |
| --- | --- | --- | --- |
| Repeated coordination policy across callers exists and needs a clearer owner | Yes | Pair/unpair, expiry, and registry sync would otherwise repeat across resolver/startup/tool exposure paths | Extract clear owner |
| Responsibility overload exists in one file or one optional module grouping | Yes | `browser-tool-service.ts` currently owns execution and support lookup assumptions; `browser-bridge-server.ts` owns routing and single-token auth | Split |
| Proposed indirection owns real policy, translation, or boundary concern | Yes | `BrowserBridgeConfigResolver` and `BrowserToolRegistrySync` each own concrete subject boundaries | Keep |
| Every off-spine concern has a clear owner on the spine | Yes | Settings store, registry sync, and GraphQL client utility all serve specific spine owners | Keep |
| Primary spine is stretched far enough to expose the real business path instead of only a local edited segment | Yes | Spines start at user action or agent run and end at browser advertisement or browser execution | Keep |
| Authoritative Boundary Rule is preserved: authoritative public boundaries stay authoritative; callers do not depend on both an outer owner and one of its internal owned mechanisms | Yes | Resolver/service, NodeManager/IPC, BrowserToolService/config-resolver split is explicit | Keep |
| Existing capability area/subsystem was reused or extended where it naturally fits | Yes | Browser logic stays in browser subsystems on both Electron and server sides | Reuse/Extend |
| Repeated structures were extracted into reusable owned files where needed | Yes | Descriptor/config resolution and registry sync are lifted into dedicated files instead of hidden in callers | Extract |
| Current structure can remain unchanged without spine/ownership degradation | No | Startup-only registry and single-token bridge assumptions would break requirements | Change |

### Optional Alternatives (Use For Non-Trivial Or Uncertain Changes)

| Option | Summary | Pros | Cons | Decision (`Chosen`/`Rejected`) | Rationale |
| --- | --- | --- | --- | --- | --- |
| A | Runtime pair/unpair mutates remote binding service and runtime-registers/unregisters browser tools | Capability-aligned advertisement; no restart; preserves current tool-list semantics | Requires runtime registry sync and new service/resolver | `Chosen` | Best fit for current architecture and requirements |
| B | Always register browser tools on all nodes and rely only on runtime failure when unpaired | Simpler advertisement path | Misleads users, broadens negative-path surface, weakens capability semantics | `Rejected` | Registry already supports runtime sync, so unconditional advertisement is unnecessary |
| C | Introduce a separate remote transport instead of reusing HTTP bridge | Potentially stronger future security options | Much larger surface area and more new infrastructure | `Rejected` | Not needed for trusted same-host/LAN first delivery |

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `C-001` | `Add` | N/A | `autobyteus-web/electron/browser/remote-browser-sharing-settings-store.ts` | Persist global advanced remote-sharing setting and advertised host | Electron browser subsystem | New user-data JSON store |
| `C-002` | `Add` | N/A | `autobyteus-web/electron/browser/browser-bridge-auth-registry.ts` | Replace single-token assumption with embedded + remote node token records | Electron browser subsystem | Owns issuance, lookup, revocation |
| `C-003` | `Modify` | `autobyteus-web/electron/browser/browser-bridge-server.ts` | same path | Use auth registry, configurable bind host, remote descriptor generation | Electron browser subsystem | Embedded env still advertises loopback URL |
| `C-004` | `Modify` | `autobyteus-web/electron/browser/browser-runtime.ts` | same path | Inject settings/auth registry and expose pair/unpair helpers | Electron browser subsystem | Keeps runtime authoritative |
| `C-005` | `Add` | N/A | `autobyteus-web/electron/browser/browser-pairing-state-controller.ts` | Centralize descriptor issuance, local expiry timers, and node-status transitions | Electron browser subsystem | Keeps auth separate from visible lifecycle state |
| `C-006` | `Add` | N/A | `autobyteus-web/electron/browser/register-browser-pairing-ipc-handlers.ts` | Expose pairing settings and lifecycle operations to renderer | Electron/browser IPC | Separate from browser-shell IPC handlers |
| `C-007` | `Modify` | `autobyteus-web/electron/main.ts` | same path | Load settings store, pairing lifecycle controller, wire pairing IPC, and pass config into browser runtime | Electron bootstrap | Restart semantics live here |
| `C-008` | `Modify` | `autobyteus-web/electron/preload.ts` | same path | Expose pair/unpair and settings IPC APIs | Renderer boundary | Also update `electron/types.d.ts` |
| `C-009` | `Modify` | `autobyteus-web/types/node.ts` | same path | Add browser pairing state fields to `NodeProfile` | Shared node metadata | Supports UI status |
| `C-010` | `Modify` | `autobyteus-web/electron/nodeRegistryStore.ts` | same path | Persist and migrate node pairing fields; normalize stale states on load | Electron node registry | Existing registry path is reused |
| `C-011` | `Modify` | `autobyteus-web/stores/nodeStore.ts` | same path | Add actions to update node pairing state and react to pairing IPC results | Renderer state | Broadcast via existing registry updates |
| `C-012` | `Add` | N/A | `autobyteus-web/utils/nodeRemoteBrowserPairingClient.ts` | Send pair/unpair GraphQL requests to arbitrary remote node base URLs | Web utility | Keeps remote GraphQL logic out of component body |
| `C-013` | `Modify` | `autobyteus-web/components/settings/NodeManager.vue` | same path plus `autobyteus-web/components/settings/RemoteBrowserSharingPanel.vue` | Split remote-browser-sharing UX into a dedicated panel while keeping NodeManager as the host for node add/remove/rename and sync flows | Node UX | Refresh tool stores when current node is affected |
| `C-014` | `Add` | N/A | `autobyteus-server-ts/src/agent-tools/browser/browser-bridge-config-resolver.ts` | Resolve effective browser bridge config from env or runtime registration | Server browser subsystem | New authoritative support boundary |
| `C-015` | `Add` | N/A | `autobyteus-server-ts/src/agent-tools/browser/runtime-browser-bridge-registration-service.ts` | Store runtime remote binding, expiry timer, and status transitions | Server browser subsystem | In-memory only for first delivery |
| `C-016` | `Add` | N/A | `autobyteus-server-ts/src/agent-tools/browser/browser-tool-registry-sync.ts` | Register/unregister browser tools against the default tool registry | Server browser subsystem | Shared by startup and runtime state changes |
| `C-017` | `Modify` | `autobyteus-server-ts/src/agent-tools/browser/browser-tool-service.ts` | same path | Depend on config resolver instead of env-only lookup | Server browser subsystem | Removes env-only assumption |
| `C-018` | `Modify` | `autobyteus-server-ts/src/agent-tools/browser/browser-bridge-client.ts` | same path | Accept resolved runtime config object instead of only `process.env` path | Server browser subsystem | May keep `fromEnvironment()` as a helper for resolver only |
| `C-019` | `Modify` | `autobyteus-server-ts/src/agent-tools/browser/register-browser-tools.ts` | same path | Become idempotent runtime-usable register helper; pair with unregister helper | Server browser subsystem | Supports runtime tool advertisement |
| `C-020` | `Add` | N/A | `autobyteus-server-ts/src/api/graphql/types/remote-browser-bridge.ts` | Add pair/unpair mutation boundary for live remote nodes | Server GraphQL | May optionally include status query |
| `C-021` | `Modify` | tests across Electron/web/server browser paths | same paths | Add unit/integration coverage for settings, pairing, local expiry state sync, registry sync, and non-regression | Validation | See validation section |

## Removal / Decommission Plan (Mandatory)

- Remove `BrowserBridgeServer`’s single `authToken` field and replace it with registry-backed token records.
- Remove direct env-only browser support checks from execution callers by routing support resolution through `BrowserBridgeConfigResolver`.
- Remove the idea that startup browser-tool registration is the only source of local browser tool advertisement; keep startup registration for embedded env, but extend the same subsystem with runtime register/unregister support.
- Do not keep any compatibility wrapper that lets callers bypass the new authoritative boundaries.

## Future-State Design

### Core Design Decisions

1. Electron runs one browser bridge server instance.
   - When remote sharing is disabled: bind to `127.0.0.1`.
   - When remote sharing is enabled: bind to `0.0.0.0`.
   - Embedded server env still receives a loopback URL (`127.0.0.1`) so embedded behavior remains unchanged.
   - Remote descriptors use an explicitly configured advertised host from Electron settings, not `0.0.0.0`.

2. Electron issues per-node bridge descriptors.
   - Descriptor shape:
     - `baseUrl`
     - `authToken`
     - `expiresAt`
   - `BrowserPairingStateController` issues descriptors and persists the same `expiresAt` deadline into node-visible pairing metadata.
   - `BrowserBridgeAuthRegistry` stores node-scoped token records.
   - Tokens are time-bounded and revocable.

3. Electron owns local pairing lifecycle state separately from raw bridge auth.
   - `BrowserPairingStateController` schedules a local expiry timer for every issued remote descriptor.
   - When the timer fires, Electron revokes the local auth record and updates node pairing status to `expired` without waiting for manual interaction.
   - Manual unpair cancels the local timer and moves status to `revoked`.
   - Node removal delegates to the same controller so token and timer cleanup happens before the node record disappears.
   - This keeps `R-010` satisfied even if the remote server is idle until the next request.

4. Remote server stores one active runtime browser binding.
   - The remote server is one node, so it only needs one current runtime binding.
   - First delivery keeps this binding in memory only.
   - Binding expiry schedules automatic cleanup and tool-registry synchronization.

5. Browser tool advertisement stays aligned with actual remote capability.
   - Pair success on a remote node registers browser tools into `defaultToolRegistry`.
   - Unpair or expiry removes them if no embedded/env-based browser support remains.
   - Existing GraphQL tool queries and agent customization options then reflect live pairing state automatically.

6. Execution-time browser support is resolved through one authoritative boundary.
   - `BrowserToolService` uses `BrowserBridgeConfigResolver`.
   - Resolver chooses:
     - embedded env config if present
     - otherwise runtime remote binding if currently valid
     - otherwise `null`

### Concrete Pairing Flow

1. User enables `Remote Browser Sharing` in Electron settings and configures `advertisedHost`.
2. Electron restart applies listener-mode change if required.
3. `NodeManager` renders a dedicated `RemoteBrowserSharingPanel`; user adds or opens a remote node and clicks `Pair Local Browser` inside that panel.
4. Renderer requests a descriptor from Electron IPC for that `nodeId`.
5. `BrowserPairingStateController` issues a descriptor using the current advertised host and bridge port, records local pairing metadata, and schedules the local expiry timer.
6. Renderer calls the remote node GraphQL mutation `registerRemoteBrowserBridge(...)`.
7. Remote server registration service stores the binding, schedules expiry, and runtime-registers browser tools.
8. Electron marks node pairing status as `paired`; node-registry broadcast updates other windows.
9. If local post-registration confirmation fails after the remote binding was accepted, the renderer performs best-effort remote clear before leaving the node in a rejected state.
10. If the current window is for that remote node, the panel refreshes tool lists so browser tools become immediately selectable.

### Concrete Unpair / Expiry Flow

1. User clicks `Unpair Local Browser`, removes a paired node, or the shared `expiresAt` deadline is reached.
2. For manual unpair or remove-node flow, renderer performs best-effort remote clear if the server is reachable.
3. Remote registration service clears binding, cancels timer, and unregisters browser tools if no other support source remains.
4. Electron pairing lifecycle controller revokes the node token record immediately for manual unpair, on its own local timer when the descriptor expires, or from Electron main before node deletion is finalized.
5. For node removal, the controller cleanup path must tolerate the node record disappearing after cleanup without later expiry callbacks throwing.
6. Electron updates node pairing status to `revoked` or `expired` and broadcasts the change to open windows when a node record still exists.
7. Later agent runs fail through existing browser-unavailable errors because the config resolver no longer returns a valid bridge config.

### Concrete Execution Flow

1. Remote agent definition already includes browser `toolNames`.
2. Agent run bootstrap queries configured tool exposure as today.
3. Browser tool service resolves a valid runtime binding via `BrowserBridgeConfigResolver`.
4. Browser operations execute through `BrowserBridgeClient`.
5. Electron `BrowserBridgeServer` authorizes the token and routes to `BrowserTabManager`.
6. Browser shell updates in the Electron UI exactly as it does for embedded flows today.

## Interface / API Shape

### Electron IPC

- `browser-pairing:get-settings()`
- `browser-pairing:update-settings(input)`
- `browser-pairing:issue-descriptor(nodeId)`
- `browser-pairing:revoke-descriptor(nodeId)`

### Remote GraphQL

- `registerRemoteBrowserBridge(input)`
  - input:
    - `baseUrl: String!`
    - `authToken: String!`
    - `expiresAt: String!`
- `clearRemoteBrowserBridge()`
- optional query if later needed:
  - `remoteBrowserBridgeStatus`

The resolver stays thin and delegates all runtime state transitions to `RuntimeBrowserBridgeRegistrationService`.

## File Responsibility Draft

| File | Responsibility |
| --- | --- |
| `autobyteus-web/components/settings/RemoteBrowserSharingPanel.vue` | Own advanced remote-browser-sharing settings UI, pair/unpair actions, and current-node refresh behavior |
| `autobyteus-web/components/settings/NodeManager.vue` | Host node-management screen composition, add/remove/rename flows, sync panels, and the remote-browser-sharing panel |
| `autobyteus-web/electron/browser/remote-browser-sharing-settings-store.ts` | Persist advanced remote sharing setting and advertised host |
| `autobyteus-web/electron/browser/browser-pairing-state-controller.ts` | Own descriptor issuance, local expiry scheduling, and node-visible pairing state transitions |
| `autobyteus-web/electron/browser/browser-bridge-auth-registry.ts` | Own bridge auth descriptors for embedded and remote node consumers |
| `autobyteus-web/electron/browser/register-browser-pairing-ipc-handlers.ts` | Expose pairing settings and descriptor issuance to renderer |
| `autobyteus-web/utils/nodeRemoteBrowserPairingClient.ts` | Send remote GraphQL pair/unpair requests to any node base URL |
| `autobyteus-server-ts/src/agent-tools/browser/browser-bridge-config-resolver.ts` | Resolve effective bridge config for execution and support checks |
| `autobyteus-server-ts/src/agent-tools/browser/runtime-browser-bridge-registration-service.ts` | Own active runtime remote binding and expiry lifecycle |
| `autobyteus-server-ts/src/agent-tools/browser/browser-tool-registry-sync.ts` | Synchronize default tool registry with effective browser support |
| `autobyteus-server-ts/src/api/graphql/types/remote-browser-bridge.ts` | GraphQL mutation boundary for remote live pairing |

## Folder / Path Mapping

- Electron browser-side additions stay under:
  - `autobyteus-web/electron/browser/`
- Electron node-visible persisted state continues under:
  - `autobyteus-web/electron/nodeRegistryStore.ts`
  - `autobyteus-web/types/node.ts`
- Renderer utilities stay under:
  - `autobyteus-web/utils/`
- Remote server browser capability extensions stay under:
  - `autobyteus-server-ts/src/agent-tools/browser/`
- Remote server runtime mutation boundary stays under:
  - `autobyteus-server-ts/src/api/graphql/types/`

This layout keeps each concern inside the subsystem that already owns the surrounding subject.

## Migration / Refactor Sequence

1. Add Electron settings store and auth registry.
2. Add the Electron pairing lifecycle controller so descriptor issuance and local expiry state live outside the auth registry.
3. Refactor browser bridge server/runtime to consume settings + auth registry while preserving embedded env behavior.
4. Extend node metadata and registry persistence for pairing status.
5. Add pairing IPC boundary and renderer utility for remote GraphQL pair/unpair.
6. Add remote server runtime registration service and GraphQL resolver.
7. Add browser config resolver and registry sync on the server.
8. Update `BrowserToolService` and related browser support checks to use the resolver.
9. Split remote-browser-sharing UI into a dedicated settings panel and keep `NodeManager` as a host/composition boundary.
10. Route remote-node deletion through authoritative pairing cleanup in Electron main.
11. Add validation for pair, unpair, remove-node cleanup, local expiry status sync, advertisement refresh, and embedded non-regression.

## Validation Design Intent

- Electron unit tests:
  - settings store load/save
  - auth registry issue/revoke/expiry
  - pairing lifecycle controller local expiry status transition
  - browser bridge server auth with multiple tokens
  - node registry migration for browser pairing fields
- Web/component tests:
  - RemoteBrowserSharingPanel pair/unpair/remove-node UX paths
  - nodeStore pairing-state updates
  - current-node tool refresh after pair/unpair
- Server unit tests:
  - runtime registration service register/clear/expiry behavior
  - browser tool registry sync register/unregister behavior
  - browser config resolver env-vs-runtime precedence
  - GraphQL resolver mutation behavior
- Integration tests:
  - remote pair mutation turns browser tools visible in tool queries without restart
  - paired remote node executes browser tool successfully through bridge
  - unpaired/expired node fails safely
  - embedded browser flow still works unchanged

## Risks And Mitigations

| Risk | Why It Matters | Mitigation |
| --- | --- | --- |
| Advertised host misconfiguration | Remote node cannot reach Electron bridge even though feature is enabled | Make advertised host explicit in settings and block pairing until configured |
| Trusted-LAN mutation boundary remains minimally authenticated in v1 | A client on the same reachable network could register or clear a binding if it can already reach the node GraphQL surface | Keep this first delivery scoped to user-added same-host/trusted-LAN nodes, document the trust model, and preserve the runtime registration boundary so stronger auth can be added later without redesigning execution flow |
| Runtime or desktop expiry drift | Remote node may continue advertising browser tools after access is gone, or Electron UI may continue showing `paired` after local access is gone | Centralize remote expiry in the registration service and local expiry in the pairing lifecycle controller using the same issued `expiresAt` deadline |
| Electron restart invalidates remote descriptors | Persisted `paired` status could become stale | Normalize stale states on load and re-pair on explicit user action or open-node repair path |
| Remote server restart loses in-memory binding | Browser tools disappear until re-paired | Support quick re-pair on open/pair action; first delivery intentionally avoids durable credential storage |

## Concrete Example

- Good shape:
  - `NodeManager -> browser-pairing:issue-descriptor -> registerRemoteBrowserBridge mutation -> RuntimeBrowserBridgeRegistrationService -> BrowserToolRegistrySync`
- Bad shape:
  - `NodeManager -> build token locally -> direct defaultToolRegistry mutation -> BrowserToolService runtime state patch`

The good shape keeps one authoritative boundary per subject:

- Electron IPC is authoritative for local descriptor issuance.
- GraphQL resolver is authoritative for remote runtime registration.
- Registration service is authoritative for registry synchronization.
- Browser tool service is authoritative for execution.
