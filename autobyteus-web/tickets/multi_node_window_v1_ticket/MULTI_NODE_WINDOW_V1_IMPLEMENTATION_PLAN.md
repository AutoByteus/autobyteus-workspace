# Multi-Node Window-Per-Node Implementation Plan (v6)

## Scope Classification
- Classification: Large
- Reasoning: Electron lifecycle + registry sync + window-bound transport routing + embedded/remote UX gates across many modules.
- Workflow Depth:
  - Large -> design doc -> runtime simulation -> implementation plan -> progress tracking

## Plan Version
- Current Version: v6
- Version Intent: Updated plan after v8 runtime simulation to lock plugin ownership/order and host-validation behavior.

## Public API / Interface Changes
1. Electron preload APIs:
- `openNodeWindow(nodeId: string)`
- `focusNodeWindow(nodeId: string)`
- `listNodeWindows()`
- `getWindowContext()`
- `upsertNodeRegistry(change)`
- `getNodeRegistrySnapshot()`
- `onNodeRegistryUpdated(callback)`

2. Shared types:
- `NodeType = 'embedded' | 'remote'`
- `NodeProfile`, `NodeEndpoints`, `WindowNodeContext`
- `NodeRegistrySnapshot { version, nodes }`
- `CapabilityProbeState = 'unknown' | 'ready' | 'degraded'`

3. Renderer stores:
- `windowNodeContextStore` adds immutable context + bound readiness API.
- `nodeStore` adds versioned snapshot application.
4. New utility boundaries:
- `probeNodeCapabilities(baseUrl)` in `utils/nodeCapabilityProbe.ts`
- `validateServerHostConfiguration(baseUrl, sampleUrls?)` in `utils/nodeHostValidation.ts`

## Use Case Simulation Gate

| Use Case | Simulation Location | Primary Path Covered | Fallback/Error Covered | Gaps | Status |
| --- | --- | --- | --- | --- | --- |
| Launch embedded window | `MULTI_NODE_WINDOW_V1_RUNTIME_SIMULATION.md` | Yes | Yes | None | Pass |
| Add remote and open window | `MULTI_NODE_WINDOW_V1_RUNTIME_SIMULATION.md` | Yes | Yes | None | Pass |
| Concurrent runs across windows | `MULTI_NODE_WINDOW_V1_RUNTIME_SIMULATION.md` | Yes | Yes | None | Pass |
| Focus existing node window | `MULTI_NODE_WINDOW_V1_RUNTIME_SIMULATION.md` | Yes | Yes | None | Pass |
| Registry sync across windows | `MULTI_NODE_WINDOW_V1_RUNTIME_SIMULATION.md` | Yes | Yes | None | Pass |
| Simultaneous registry updates | `MULTI_NODE_WINDOW_V1_RUNTIME_SIMULATION.md` | Yes | Yes | None | Pass |
| Remove remote with open window | `MULTI_NODE_WINDOW_V1_RUNTIME_SIMULATION.md` | Yes | Yes | None | Pass |
| Close one window without app quit | `MULTI_NODE_WINDOW_V1_RUNTIME_SIMULATION.md` | Yes | Yes | None | Pass |
| App quit lifecycle | `MULTI_NODE_WINDOW_V1_RUNTIME_SIMULATION.md` | Yes | Yes | None | Pass |
| Embedded-down + remote active | `MULTI_NODE_WINDOW_V1_RUNTIME_SIMULATION.md` | Yes | Yes | None | Pass |
| Embedded-only local FS guard | `MULTI_NODE_WINDOW_V1_RUNTIME_SIMULATION.md` | Yes | Yes | None | Pass |
| Bound readiness for fetches | `MULTI_NODE_WINDOW_V1_RUNTIME_SIMULATION.md` | Yes | Yes | None | Pass |
| Embedded-only settings surfaces | `MULTI_NODE_WINDOW_V1_RUNTIME_SIMULATION.md` | Yes | Yes | None | Pass |
| Single-owner server-status fanout | `MULTI_NODE_WINDOW_V1_RUNTIME_SIMULATION.md` | Yes | Yes | None | Pass |
| REST client bound-context lifecycle | `MULTI_NODE_WINDOW_V1_RUNTIME_SIMULATION.md` | Yes | Yes | None | Pass |
| Apollo error-link rebinding | `MULTI_NODE_WINDOW_V1_RUNTIME_SIMULATION.md` | Yes | Yes | None | Pass |
| Capability gating for unsupported features | `MULTI_NODE_WINDOW_V1_RUNTIME_SIMULATION.md` | Yes | Yes | None | Pass |
| Deterministic plugin ownership/order | `MULTI_NODE_WINDOW_V1_RUNTIME_SIMULATION.md` | Yes | Yes | None | Pass |
| Remote onboarding host URL validation | `MULTI_NODE_WINDOW_V1_RUNTIME_SIMULATION.md` | Yes | Yes | None | Pass |

## Simulation Cleanliness Checklist

| Check | Result | Notes |
| --- | --- | --- |
| Use case is fully achievable end-to-end | Pass | 19 use cases covered |
| Separation of concerns is clean per file/module | Pass | lifecycle/routing/gating ownership is explicit |
| Boundaries and API ownership are clear | Pass | main process + context store canonical boundaries |
| Dependency flow is reasonable | Pass | no mandatory cycles |
| No major structure/design smell in call stack | Pass | v8 pass closes plugin-order and host-validation coverage gaps |

## Go / No-Go Decision
- Decision: Go
- Rationale: simulation gate is clean and decision-complete.

## Principles
1. Bottom-up order: contracts -> main lifecycle -> preload -> context -> transport -> UI.
2. Test-driven updates for each boundary.
3. Main process is single source of truth for registry/window/lifecycle.
4. Use `isEmbeddedWindow` for node-specific UI/FS behavior (not `isElectron`).
5. Remove global embedded readiness coupling from remote-window data flows.

## Dependency And Sequencing Map

| Order | File/Module | Depends On | Why This Order |
| --- | --- | --- | --- |
| 1 | `/Users/normy/autobyteus_org/autobyteus-web/types/node.ts` | N/A | shared contracts first |
| 2 | `/Users/normy/autobyteus_org/autobyteus-web/utils/nodeEndpoints.ts` | node types | endpoint derivation |
| 3 | `/Users/normy/autobyteus_org/autobyteus-web/electron/main.ts` | node contracts | canonical window/lifecycle/registry/status fanout |
| 4 | `/Users/normy/autobyteus_org/autobyteus-web/electron/preload.ts`, `/Users/normy/autobyteus_org/autobyteus-web/electron/types.d.ts`, `/Users/normy/autobyteus_org/autobyteus-web/types/electron.d.ts` | main IPC handlers | typed bridge |
| 5 | `/Users/normy/autobyteus_org/autobyteus-web/stores/windowNodeContextStore.ts` | preload + node utils | immutable context + readiness gate |
| 6 | `/Users/normy/autobyteus_org/autobyteus-web/stores/nodeStore.ts` | preload + node contracts | versioned snapshot state |
| 7 | `/Users/normy/autobyteus_org/autobyteus-web/plugins/10.serverStore.client.ts`, `/Users/normy/autobyteus_org/autobyteus-web/plugins/20.windowNodeBootstrap.client.ts` | context/node stores | deterministic startup |
| 8 | `/Users/normy/autobyteus_org/autobyteus-web/plugins/30.apollo.client.ts`, `/Users/normy/autobyteus_org/autobyteus-web/utils/apolloClient.ts`, `/Users/normy/autobyteus_org/autobyteus-web/nuxt.config.ts` | context store | window-bound GraphQL client |
| 9 | `/Users/normy/autobyteus_org/autobyteus-web/plugins/serverStore.ts`, `/Users/normy/autobyteus_org/autobyteus-web/plugins/apolloErrorLink.client.ts` | ordered plugins | remove/merge legacy overlap for deterministic ownership |
| 10 | `/Users/normy/autobyteus_org/autobyteus-web/utils/nodeCapabilityProbe.ts`, `/Users/normy/autobyteus_org/autobyteus-web/utils/nodeHostValidation.ts` | node endpoints/types | capability and host-validation boundaries |
| 11 | `/Users/normy/autobyteus_org/autobyteus-web/services/api.ts` | context store | bound REST routing |
| 12 | stream modules (`agentRunStore`, `agentTeamRunStore`, `applicationRunStore`, `workspace`, `useTerminalSession`) | context + apollo | bound WS routing |
| 13 | readiness-coupled stores (`agentDefinitionStore`, `agentTeamDefinitionStore`, `workspace`) | bound readiness API | remove embedded global wait coupling |
| 14 | local-access guards (`fileExplorer`, `WorkspaceSelector.vue`, `ContextFilePathInputArea.vue`, `AgentUserInputTextArea.vue`) | context store | embedded-only local FS behavior |
| 15 | embedded-settings surfaces (`pages/settings.vue`, `ServerLoading.vue`, `ServerShutdown.vue`, `ServerMonitor.vue`, `ServerSettingsManager.vue`) | context + server stores | hide embedded controls in remote windows |
| 16 | URL builders (`ArtifactContentViewer.vue`, `HtmlPreviewer.vue`) | context store | bound REST/static URL correctness |
| 17 | shell components (`app.vue`, `layouts/default.vue`, `NodeManager.vue`) | node/context/server stores | final UX and node identity |

## Step-By-Step Plan
1. Add node contracts including versioned registry snapshot.
2. Refactor `main.ts` for node-window manager, versioned registry queue, close-vs-quit lifecycle, and single server-status fanout listener.
3. Extend preload bridge and typings for snapshot and window APIs.
4. Implement immutable context store with `waitForBoundBackendReady`.
5. Implement `nodeStore` snapshot sync with stale-version rejection.
6. Add ordered bootstrap plugins for server/context initialization.
7. Replace static Nuxt Apollo endpoint configuration with explicit bound Apollo plugin.
8. Remove/merge overlapping legacy plugins (`plugins/serverStore.ts` and standalone error-link owner path) so startup ownership is deterministic.
9. Add capability probe and host-validation utility boundaries.
10. Migrate REST and WS modules to bound endpoints.
11. Remove `serverStore.waitForServerReady` from remote-capable data fetch paths.
12. Convert node-specific UI/file guards from `isElectron` to `isEmbeddedWindow`.
13. Scope embedded server settings/status surfaces to embedded windows.
14. Migrate artifact/static preview URL builders to bound REST endpoints.
15. Add capability probing and feature gating for unsupported remote capabilities with conservative defaults.
16. Add onboarding host URL sanity warning/error path.
17. Run unit + integration + manual lifecycle/concurrency verification.

## Per-File Definition Of Done

| File | Implementation Done Criteria | Unit Test Criteria | Integration Test Criteria | Notes |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-web/electron/main.ts` | node-window + lifecycle + status fanout implemented | `electron/__tests__/nodeWindowManager.spec.ts` | manual close-vs-quit + status fanout | ensure no per-window listener leak |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/windowNodeContextStore.ts` | immutable context + bound readiness API | `stores/__tests__/windowNodeContextStore.spec.ts` | remote usable while embedded down | |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/nodeStore.ts` | versioned snapshot apply/reject works | `stores/__tests__/nodeStore.spec.ts` | concurrent edits across windows | stale snapshot test required |
| `/Users/normy/autobyteus_org/autobyteus-web/utils/nodeCapabilityProbe.ts`, `/Users/normy/autobyteus_org/autobyteus-web/utils/nodeHostValidation.ts` | probe state + host validation behavior deterministic | `utils/__tests__/nodeCapabilityProbe.spec.ts`, `utils/__tests__/nodeHostValidation.spec.ts` | add-node flow with warning/error outcomes | default `unknown`/`degraded` must disable optional features |
| `/Users/normy/autobyteus_org/autobyteus-web/plugins/serverStore.ts`, `/Users/normy/autobyteus_org/autobyteus-web/plugins/apolloErrorLink.client.ts`, `/Users/normy/autobyteus_org/autobyteus-web/plugins/10.serverStore.client.ts`, `/Users/normy/autobyteus_org/autobyteus-web/plugins/30.apollo.client.ts` | plugin ownership/order is singular and deterministic | plugin bootstrap tests | manual startup sanity across embedded+remote windows | no duplicate bootstrap owner |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/agentDefinitionStore.ts`, `/Users/normy/autobyteus_org/autobyteus-web/stores/agentTeamDefinitionStore.ts`, `/Users/normy/autobyteus_org/autobyteus-web/stores/workspace.ts` | bound-node readiness gate | store tests updated | remote fetch when embedded down | replace `serverStore.waitForServerReady` |
| `/Users/normy/autobyteus_org/autobyteus-web/components/workspace/config/WorkspaceSelector.vue`, `/Users/normy/autobyteus_org/autobyteus-web/components/agentInput/ContextFilePathInputArea.vue`, `/Users/normy/autobyteus_org/autobyteus-web/components/agentInput/AgentUserInputTextArea.vue`, `/Users/normy/autobyteus_org/autobyteus-web/stores/fileExplorer.ts` | local FS convenience blocked in remote windows | updated component/store tests | manual embedded-vs-remote behavior | `isEmbeddedWindow` guard |
| `/Users/normy/autobyteus_org/autobyteus-web/pages/settings.vue`, `/Users/normy/autobyteus_org/autobyteus-web/components/server/ServerLoading.vue`, `/Users/normy/autobyteus_org/autobyteus-web/components/server/ServerShutdown.vue`, `/Users/normy/autobyteus_org/autobyteus-web/components/server/ServerMonitor.vue`, `/Users/normy/autobyteus_org/autobyteus-web/components/settings/ServerSettingsManager.vue` | embedded server UI hidden/disabled in remote windows | settings/component tests | manual settings behavior per window type | avoid misleading embedded controls in remote |
| `/Users/normy/autobyteus_org/autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue`, `/Users/normy/autobyteus_org/autobyteus-web/components/fileExplorer/viewers/HtmlPreviewer.vue` | URLs from bound node endpoints | component tests | artifact/static preview in multiple node windows | remove static `getServerUrls` |

## Cross-Reference Exception Protocol

| File | Cross-Reference With | Why Unavoidable | Temporary Strategy | Unblock Condition | Design Follow-Up Status | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| None expected | N/A | N/A | N/A | N/A | Not Needed | N/A |

## Design Feedback Loop

| Smell/Issue | Evidence | Design Section Updated | Action | Status |
| --- | --- | --- | --- | --- |
| Window close path implicitly coupled to app quit | current `main.ts` close interception | lifecycle rules | split close-vs-quit handling | Closed |
| Remote flows blocked by embedded readiness | `app.vue` + `waitForServerReady` in fetch stores | readiness boundary | add bound-node readiness API | Closed |
| Local FS convenience leaked to remote windows | `isElectron` guards in workspace/input/file modules | guard rules | switch to `isEmbeddedWindow` | Closed |
| Embedded settings/status controls visible in remote windows | `pages/settings.vue` + server components | UI boundaries | scope embedded controls to embedded windows | Closed |
| Server status fanout ownership leaked by per-window listener pattern | `main.ts` listener registration per created window | main-process ownership | single fanout listener, no accumulation | Closed |
| Transcription no longer supported in backend | user scope update | feature scope | remove transcription from v1 implementation scope | Closed |
| Plugin ownership/order ambiguity between new numbered plugins and legacy plugins | startup ownership split | plugin bootstrap boundaries | remove/merge overlapping plugin owners | Closed |
| Host-validation and capability default semantics not represented in implementation tasks | runtime simulation v8 findings | capability/validation boundaries | add dedicated utility and tests | Closed |

## Test Strategy
- Unit tests:
  - node endpoint derivation + registry version model
  - main-process lifecycle and status fanout
  - bound readiness and snapshot rejection
  - embedded-only UI/FS guards
  - capability-gated feature disable paths
  - plugin bootstrap ownership/order determinism
  - onboarding host-validation warning/error behavior

- Integration tests:
  - add/focus/remove node windows
  - concurrent runs across embedded+remote windows
  - close one window without app quit
  - app quit with single server shutdown
  - remote window stays usable when embedded down
  - add-node with host-validation warning and recovery path

- Verification commands (target):
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-web exec vitest --run`
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-web exec vitest --run electron`
  - manual Electron verification with embedded + 2 remote Docker nodes
