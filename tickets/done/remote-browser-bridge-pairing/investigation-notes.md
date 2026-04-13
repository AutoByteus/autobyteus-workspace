# Investigation Notes

## Investigation Status

- Current Status: `Current`
- Scope Triage: `Large`
- Triage Rationale: The feature crosses Electron main-process browser ownership, embedded-server startup wiring, remote-node onboarding, runtime server capability exposure, GraphQL/UI tool selection, security-sensitive pairing state, and cross-surface validation.
- Investigation Goal: Establish the current browser bridge, node onboarding, and server tool-exposure architecture so later requirements and design work can target the real extension seams for remote-node pairing.
- Primary Questions To Resolve:
  - Where does Electron currently own and expose the browser bridge?
  - How does the embedded server receive and use bridge configuration today?
  - How does the server decide whether browser tools exist at startup and at agent-run bootstrap time?
  - Where can remote-node add/open flows inject explicit pairing?
  - What persistence and API patterns already exist for node-scoped desktop data and runtime server mutations?
  - Which tests already cover adjacent behavior, and what feature-level coverage is currently missing?

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-10 | Code | `autobyteus-web/electron/browser/browser-bridge-server.ts` | Verify browser bridge bind mode, auth model, and request surface | Bridge binds to `127.0.0.1` on an ephemeral port, issues one token, and serves the full browser operation surface over HTTP | Yes |
| 2026-04-10 | Code | `autobyteus-web/electron/browser/browser-runtime.ts` | Verify Electron runtime ownership of bridge startup | Browser runtime starts the bridge and passes the resulting env overrides into the embedded server manager | No |
| 2026-04-10 | Code | `autobyteus-web/electron/main.ts` | Verify Electron bootstrap sequence and browser-runtime startup timing | Browser runtime starts during Electron bootstrap before the embedded server is initialized | No |
| 2026-04-10 | Code | `autobyteus-web/electron/server/baseServerManager.ts`, `autobyteus-web/electron/server/serverRuntimeEnv.ts`, `autobyteus-web/electron/server/linuxServerManager.ts` | Verify how embedded server env is formed and injected | Runtime env overrides are stored in the Electron server manager and merged into spawned server process env at process start | Yes |
| 2026-04-10 | Code | `autobyteus-server-ts/src/agent-tools/browser/browser-tool-service.ts`, `autobyteus-server-ts/src/agent-tools/browser/browser-bridge-client.ts` | Verify server-side browser support checks and request path | Browser support is purely env-driven; the server later `fetch()`es the bridge URL and sends the auth token header on every call | No |
| 2026-04-10 | Code | `autobyteus-server-ts/src/agent-tools/browser/register-browser-tools.ts`, `autobyteus-server-ts/src/startup/agent-tool-loader.ts` | Verify startup-time browser tool registration behavior | Browser tools are only loaded into the global tool registry if browser support exists at server startup | Yes |
| 2026-04-10 | Code | `autobyteus-server-ts/src/agent-execution/shared/configured-agent-tool-exposure.ts`, `autobyteus-server-ts/src/agent-execution/backends/codex/browser/build-browser-dynamic-tool-registrations.ts`, `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | Verify agent-run gating behavior for Codex | Codex browser dynamic tools require both bridge support and browser tool names in the agent definition | No |
| 2026-04-10 | Code | `autobyteus-web/components/settings/NodeManager.vue`, `autobyteus-web/stores/nodeStore.ts`, `autobyteus-web/utils/nodeCapabilityProbe.ts`, `autobyteus-web/types/node.ts`, `autobyteus-web/electron/nodeRegistryStore.ts` | Verify node add/open flow, stored node metadata, and capability probing | Current node add flow validates URL, probes health-derived capabilities, stores node metadata, and opens a node window; there is no browser-pairing metadata or action | Yes |
| 2026-04-10 | Code | `autobyteus-server-ts/src/api/graphql/types/agent-customization-options.ts`, `autobyteus-web/stores/agentDefinitionOptionsStore.ts` | Verify how UI gets selectable tool names | Available tool names come directly from the server’s global tool registry, so startup browser-tool registration affects agent-definition UI | Yes |
| 2026-04-10 | Code | `autobyteus-server-ts/src/api/graphql/types/server-settings.ts`, `autobyteus-server-ts/src/api/graphql/types/node-sync-control.ts`, `autobyteus-server-ts/src/api/graphql/types/node-sync.ts` | Inspect current runtime mutation patterns on the server | GraphQL mutations exist for mutable server/runtime actions, but there is no existing browser-pairing or node-pairing mutation | Yes |
| 2026-04-10 | Code | `autobyteus-server-ts/docker/docker-compose.yml` | Verify Docker-node startup wiring | Docker server startup exposes no browser bridge env or pairing channel today | No |
| 2026-04-10 | Code | `autobyteus-server-ts/tests/unit/agent-tools/browser/register-browser-tools.test.ts`, `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts`, `autobyteus-web/components/settings/__tests__/NodeManager.spec.ts`, `autobyteus-web/electron/server/__tests__/serverRuntimeEnv.spec.ts` | Check existing coverage | Adjacent tests exist for startup browser registration, embedded env propagation, node add flow, and Codex browser dynamic-tool gating; no tests cover remote pairing because the feature does not exist | Yes |
| 2026-04-10 | Command | `rg -n "browser-bridge|AUTOBYTEUS_BROWSER_BRIDGE|isBrowserSupported|BrowserToolService|buildBrowserDynamicToolRegistrations|register-browser-tools|toolNames|enabledBrowserToolNames" autobyteus-server-ts autobyteus-web` | Find all browser bridge and gating touchpoints | Confirmed Electron and server ownership seams and test locations | No |
| 2026-04-10 | Command | `rg -n "add node|Add Node|NodeManager|probe capabilities|capabilityProbe|terminalSupported|fileExplorerStreamingSupported|browser" autobyteus-web/components autobyteus-web/utils autobyteus-web/types` | Find node add flow and capability probe logic | Confirmed node capability model currently includes only terminal and file explorer streaming | No |
| 2026-04-10 | Command | `rg -n "settings|preferences|config|advanced" autobyteus-web/electron autobyteus-web/stores autobyteus-web/components/settings` | Check for existing advanced-setting or persistence patterns | No dedicated remote-browser-sharing setting exists today; Electron has node-registry and extension-registry persistence patterns but no generic desktop settings store for this feature | Yes |

## Current Behavior / Codebase Findings

### Entrypoints And Boundaries

- Primary entrypoints:
  - Electron browser runtime bootstrap: `autobyteus-web/electron/main.ts` -> `startBrowserRuntime(...)`
  - Embedded server env injection: `autobyteus-web/electron/server/*ServerManager.ts` via `buildServerRuntimeEnv(...)`
  - Server startup tool registration: `autobyteus-server-ts/src/startup/agent-tool-loader.ts` -> `registerBrowserTools()`
  - Codex agent-run browser dynamic-tool exposure: `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts`
  - Remote node add/open UX: `autobyteus-web/components/settings/NodeManager.vue` and `autobyteus-web/stores/nodeStore.ts`
- Execution boundaries:
  - Electron main owns the browser runtime, browser shell controller, and HTTP bridge.
  - Embedded server is a separate process and only sees browser support through env variables.
  - Remote nodes are external servers addressed by base URL; they are not currently coupled to Electron browser ownership.
  - Renderer/UI stores use GraphQL for server-driven options and Electron IPC for desktop-only state.
- Owning subsystems / capability areas:
  - Electron browser ownership: `autobyteus-web/electron/browser/`
  - Embedded server process lifecycle: `autobyteus-web/electron/server/`
  - Browser tool contract and execution: `autobyteus-server-ts/src/agent-tools/browser/`
  - Codex tool exposure: `autobyteus-server-ts/src/agent-execution/backends/codex/`
  - Remote-node UX and registry persistence: `autobyteus-web/components/settings/`, `autobyteus-web/stores/nodeStore.ts`, `autobyteus-web/electron/nodeRegistryStore.ts`
  - Agent-definition customization options: `autobyteus-server-ts/src/api/graphql/types/agent-customization-options.ts`, `autobyteus-web/stores/agentDefinitionOptionsStore.ts`
- Optional modules involved:
  - GraphQL mutation surface for runtime operations (`server-settings`, `node-sync-control`) is available but currently unrelated to browser pairing.
  - Docker packaging provides remote-node deployment but no browser bridge integration.
- Folder / file placement observations:
  - Browser execution logic is already clearly split between Electron main and server tool client code.
  - Remote-node metadata is centralized in shared node types and Electron-persisted node registry files, which is the natural place for per-node pairing status if it must be visible in the desktop UI.
  - Server runtime mutability currently lives in GraphQL resolvers/services rather than ad hoc REST endpoints, suggesting a pairing registration mutation would fit the repo’s server-side API style.

### Relevant Files / Symbols

| Path | Symbol / Area | Current Responsibility | Finding / Observation | Ownership / Placement Implication |
| --- | --- | --- | --- | --- |
| `autobyteus-web/electron/browser/browser-bridge-server.ts` | `BrowserBridgeServer` | Starts local HTTP bridge and routes browser operations | Hardcoded to `listen(0, '127.0.0.1', ...)`; auth is one runtime token checked from `x-autobyteus-browser-token` | Remote sharing needs either configurable bind behavior or a second transport, plus stronger per-node auth scope |
| `autobyteus-web/electron/browser/browser-runtime.ts` | `BrowserRuntime.start()` | Starts browser session manager, shell controller, and bridge | Electron main is already the authoritative owner of browser lifecycle and bridge env generation | Remote pairing should reuse this ownership rather than create a separate browser runtime |
| `autobyteus-web/electron/main.ts` | `bootstrap()` | Starts browser runtime before server initialization | Current startup order favors embedded-server env injection at process launch | Restart-sensitive desktop settings can integrate here cleanly |
| `autobyteus-web/electron/server/baseServerManager.ts` | `runtimeEnvOverrides` | Stores env overrides for the embedded server process | Overrides are process-start state, not mutable runtime server config | Remote pairing cannot rely only on this mechanism because remote nodes already exist as running servers |
| `autobyteus-web/electron/server/serverRuntimeEnv.ts` | `buildServerRuntimeEnv()` | Merges runtime overrides into embedded server env | Bridge env is just part of the spawned process env | Current pattern is embedded-only |
| `autobyteus-server-ts/src/agent-tools/browser/browser-tool-service.ts` | `BrowserToolService.isBrowserSupported()` | Determines whether browser support exists | Support is purely `BrowserBridgeClient.fromEnvironment(env) !== null` | Remote support will require broadening support lookup beyond process env if pairing is runtime-registered |
| `autobyteus-server-ts/src/agent-tools/browser/browser-bridge-client.ts` | `BrowserBridgeClient` | Dispatches server browser requests to Electron bridge over HTTP | Client already only needs `baseUrl` and `authToken`; every request reuses the token header | Runtime pairing can reuse the existing request contract if the server can obtain credentials dynamically |
| `autobyteus-server-ts/src/agent-tools/browser/register-browser-tools.ts` | `registerBrowserTools()` | Registers browser tools in the global tool registry | Registration is skipped entirely when browser support is absent at startup | Runtime pairing alone does not make browser tools appear in the global tool registry today |
| `autobyteus-server-ts/src/api/graphql/types/agent-customization-options.ts` | `availableToolNames()` | Exposes selectable tool names to the UI | Returns `defaultToolRegistry.listToolNames()` | Remote nodes started without browser support will not advertise browser tools unless startup registration rules change |
| `autobyteus-server-ts/src/agent-execution/shared/configured-agent-tool-exposure.ts` | `buildConfiguredAgentToolExposure()` | Derives enabled browser tool names from agent definition `toolNames` | Browser tool gating is already separated from generic tool names | Existing tool-name gate should stay authoritative |
| `autobyteus-server-ts/src/agent-execution/backends/codex/browser/build-browser-dynamic-tool-registrations.ts` | `buildBrowserDynamicToolRegistrationsForEnabledToolNames()` | Builds Codex browser dynamic tools | Returns `null` unless browser support exists and the enabled tool set is non-empty | Good execution-time seam for preserving existing agent tool gating |
| `autobyteus-web/components/settings/NodeManager.vue` | `onAddRemoteNode()`, `onFocusNode()` | Validates/probes/adds remote nodes and opens windows | No pairing step exists during add or open; current flow optionally does bootstrap sync only | Node Manager is the natural user-facing pairing entrypoint |
| `autobyteus-web/stores/nodeStore.ts` | `addRemoteNode()` | Persists node metadata and opens the node window | Node metadata currently tracks base URL, type, capabilities, and probe state only | Pairing status/descriptor references would require extending node types and persistence |
| `autobyteus-web/utils/nodeCapabilityProbe.ts` | `probeNodeCapabilities()` | Performs health-based capability probe | Capability model is hardcoded to terminal and file explorer streaming based on `/rest/health` success | Browser pairing is not currently discoverable or represented as a capability |
| `autobyteus-web/electron/nodeRegistryStore.ts` | node registry load/save helpers | Persists node registry JSON under Electron user data | There is an established migration-capable JSON persistence path for node metadata | Per-node pairing UI state can likely extend this store if durable desktop state is needed |
| `autobyteus-server-ts/src/api/graphql/types/server-settings.ts` | GraphQL settings resolver | Example of mutable server-side GraphQL operations | Shows existing mutation pattern for runtime configuration-like changes | Remote pairing API likely fits better as GraphQL mutation/service than as env-only state |
| `autobyteus-server-ts/src/api/graphql/types/node-sync-control.ts` | `runNodeSync()` | Example runtime action mutation with node endpoint inputs | Demonstrates node-aware GraphQL mutation style already used in the repo | A future pair/unpair mutation can follow similar conventions |
| `autobyteus-server-ts/docker/docker-compose.yml` | Docker service env | Defines Docker-node runtime env | No browser bridge env variables or pairing channel are present | Current Docker deployment has no path to Electron browser integration |

### Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-10 | Probe | Code inspection of `BrowserBridgeServer.start()` | Browser bridge binds to `127.0.0.1` and exposes an ephemeral `http://127.0.0.1:<port>` base URL | Current bridge is intentionally local-only; remote access needs explicit design |
| 2026-04-10 | Probe | Code inspection of `BaseServerManager.setRuntimeEnvOverrides()` + `buildServerRuntimeEnv()` | Embedded bridge config is injected only into the spawned server process env | Runtime pairing for already-running remote nodes needs a mutable server-side credential source |
| 2026-04-10 | Probe | Code inspection of `registerBrowserTools()` + `availableToolNames()` | Browser tools never enter the default tool registry when startup browser support is absent | Design must address both execution-time support and UI/registry-time availability |
| 2026-04-10 | Probe | Code inspection of Codex bootstrap path | Codex browser dynamic tools are rebuilt per run and already filtered by configured browser tool names | Execution-time gating for Codex is compatible with runtime pairing if browser support lookup becomes dynamic |
| 2026-04-10 | Probe | Code inspection of `NodeManager` add/open flow | Add-node flow already performs explicit user action, host validation, capability probe, registry add, and optional bootstrap sync | Pairing can be modeled as an explicit post-add or open-node action in an existing UX seam |
| 2026-04-10 | Probe | Code inspection of `NodeProfile` / `NodeCapabilities` | No browser capability or pairing status exists in node metadata | UI/status work requires extending shared node types and persistence/migration |

### External Code / Dependency Findings

- Upstream repo / package / sample examined: None
- Version / tag / commit / release: N/A
- Files, endpoints, or examples examined: N/A
- Relevant behavior, contract, or constraint learned: N/A
- Confidence and freshness: N/A

### Reproduction / Environment Setup

- Required services, mocks, or emulators: None
- Required config, feature flags, or env vars: None for investigation-only code reading
- Required fixtures, seed data, or accounts: None
- External repos, samples, or artifacts cloned/downloaded for investigation: None
- Setup commands that materially affected the investigation:
  - `git pull --rebase origin personal`
  - `rg -n "browser-bridge|AUTOBYTEUS_BROWSER_BRIDGE|isBrowserSupported|BrowserToolService|buildBrowserDynamicToolRegistrations|register-browser-tools|toolNames|enabledBrowserToolNames" autobyteus-server-ts autobyteus-web`
  - `rg -n "add node|Add Node|NodeManager|probe capabilities|capabilityProbe|terminalSupported|fileExplorerStreamingSupported|browser" autobyteus-web/components autobyteus-web/utils autobyteus-web/types`
  - `rg -n "settings|preferences|config|advanced" autobyteus-web/electron autobyteus-web/stores autobyteus-web/components/settings`
- Cleanup notes for temporary investigation-only setup:
  - Temporary ticket files were stashed during the `personal` pull and restored afterward; no source changes were made during Stage 1.

## External / Internet Findings

- None. Investigation used local repository evidence only.

## Constraints

- Technical constraints:
  - Electron browser ownership currently resides in Electron main and its browser shell/runtime.
  - Embedded browser support depends on process env wiring at server startup.
  - Global browser tool registration into the default tool registry is startup-gated by bridge support.
  - Codex execution-time browser exposure is separately gated by both browser support and agent `toolNames`.
- Environment constraints:
  - Remote nodes and Docker nodes are already-running servers; they cannot receive embedded-style bridge env only through the Electron spawn path.
  - Current browser bridge listener is loopback-only.
  - Current node capability probe only checks `/rest/health` and infers coarse capabilities.
- Third-party / API constraints:
  - None discovered in Stage 1.

## Unknowns / Open Questions

- Unknown: Whether first delivery should support same-host Docker only or any user-added remote node reachable over LAN.
  - Why it matters: Listener bind behavior, token transport, TLS expectations, and testing scope change materially based on this decision.
  - Planned follow-up: Lock scope in Stage 2 requirements.
- Unknown: Whether remote browser credentials should be stored in server memory only, persisted across remote-server restarts, or re-paired on each add/open action.
  - Why it matters: Persistence affects security posture, UX friction, and artifact/storage design.
  - Planned follow-up: Resolve in requirements and design stages.
- Unknown: Whether browser tools should become globally listed/available on a remote node once remote pairing is enabled, or whether listing should remain conditional on active pairing.
  - Why it matters: The current startup-only tool registry model conflicts with runtime-only capability changes.
  - Planned follow-up: Decide whether to decouple browser tool advertisement from immediate bridge reachability.
- Unknown: Whether the bridge transport should remain HTTP with a configurable bind address or shift to another channel for remote pairing.
  - Why it matters: Security, bind/restart semantics, and implementation surface depend on this choice.
  - Planned follow-up: Evaluate in design stage after scope and threat model are refined.

## Implications

### Requirements Implications

- Requirements must cover two distinct gates:
  - capability reachability or pairing existence
  - agent-definition `toolNames` authorization
- Requirements must explicitly address tool-advertisement behavior, not only execution-time behavior, because the current server UI gets available tools from startup-loaded registry state.
- Requirements should state whether remote pairing is same-host-only initially or intended for broader remote-node support.
- Requirements should define pairing lifecycle states visible in the desktop UI, because current node metadata has no concept of paired, expired, revoked, or unsupported browser access.

### Design Implications

- A runtime registration API on the server is likely required because embedded env injection does not generalize to already-running remote nodes.
- `BrowserToolService.isBrowserSupported()` likely needs an indirection that can resolve browser bridge credentials from runtime state, not only process env.
- Startup browser tool registration and `availableToolNames()` likely need redesign or decoupling if remote nodes are expected to configure browser tool names after the server starts without embedded bridge env.
- Electron likely needs a new advanced desktop setting and new persisted desktop state for node pairing or remote-browser-sharing enablement; there is no existing generic store for that feature today.
- Per-node pairing state belongs conceptually with node registry metadata on the Electron side, while runtime credential state likely belongs in an in-memory server-side service.

### Implementation / Placement Implications

- Desktop UI changes likely land in:
  - `autobyteus-web/components/settings/NodeManager.vue`
  - `autobyteus-web/stores/nodeStore.ts`
  - `autobyteus-web/types/node.ts`
  - `autobyteus-web/electron/nodeRegistryStore.ts`
  - new Electron IPC surface in `autobyteus-web/electron/preload.ts`, `autobyteus-web/electron/types.d.ts`, and `autobyteus-web/electron/main.ts`
- Browser bridge runtime changes likely land in:
  - `autobyteus-web/electron/browser/browser-bridge-server.ts`
  - `autobyteus-web/electron/browser/browser-runtime.ts`
- Remote server runtime pairing changes likely land in:
  - `autobyteus-server-ts/src/agent-tools/browser/`
  - new server-side runtime pairing service/resolver under `autobyteus-server-ts/src/api/graphql/types/` plus a supporting service module
- Tool-advertisement changes likely touch:
  - `autobyteus-server-ts/src/agent-tools/browser/register-browser-tools.ts`
  - `autobyteus-server-ts/src/api/graphql/types/agent-customization-options.ts`
  - possibly related tests for available tool names and browser tool registration
- Validation scope must include:
  - Electron-side node add/open UI and persistence
  - server-side runtime pairing registration and rejection paths
  - browser tool advertisement behavior
  - Codex/agent execution gating preservation
  - non-regression of embedded browser flow

## Test Coverage Snapshot

- Existing positive/negative adjacent coverage:
  - `autobyteus-server-ts/tests/unit/agent-tools/browser/register-browser-tools.test.ts`
    - verifies startup browser-tool registration only occurs when browser support exists
  - `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts`
    - verifies Codex browser dynamic tools require both bridge env and configured browser tool names
  - `autobyteus-web/electron/server/__tests__/serverRuntimeEnv.spec.ts`
    - verifies embedded Electron env propagation includes browser bridge overrides
  - `autobyteus-web/components/settings/__tests__/NodeManager.spec.ts`
    - verifies add-node validation, capability probe, registry add, and bootstrap sync behavior
  - `autobyteus-web/stores/__tests__/nodeStore.spec.ts`
    - verifies remote node persistence/open-window behavior
- Missing coverage for the proposed feature:
  - no Electron tests for advanced remote-browser-sharing setting
  - no node registry tests for browser-pairing metadata migration/persistence
  - no server tests for runtime browser pairing registration/unpair/revocation
  - no tests for browser tool advertisement behavior when browser support becomes runtime-configurable
  - no end-to-end tests connecting Electron pairing, remote node registration, and actual remote browser tool execution

## Re-Entry Additions

Append new dated evidence here when later stages reopen investigation.

- 2026-04-10 (`Stage 6` re-entry, `Design Impact`)
  - Independent implementation review found two structural gaps that require upstream design correction before more source edits:
    - paired-node removal does not route through an authoritative Electron cleanup boundary, so local bridge tokens and expiry timers can outlive the node record;
    - `autobyteus-web/components/settings/NodeManager.vue` now exceeds the workflow source-file size gate and mixes general node management, sync UX, advanced browser-sharing settings, and pair/unpair orchestration.
  - The current product threat model for first delivery is same-host Docker plus trusted home-LAN nodes explicitly added by the user. That lowers the priority of heavyweight remote-mutation auth for this round, but it does not remove the need to keep pairing cleanup authoritative and renderer ownership coherent.
  - Re-entry focus:
    - split remote-browser-sharing UX into a dedicated settings component so `NodeManager.vue` returns to a host/composition role;
    - make Electron main and `BrowserPairingStateController` own pairing cleanup when a remote node is removed;
    - tighten pairing-state transitions so confirm/revoke logic does not assume the node record is always still present.
