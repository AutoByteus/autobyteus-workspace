# Multi-Node Window-Per-Node Design (Iteration v9)

## Summary
Implement concurrent multi-node support by binding each Electron window to one immutable node context.

- Embedded node exists by default.
- Add Node is remote-only.
- Same full UI shell in each node window.
- Users can run agents concurrently across node windows.

This design keeps nodes independent and does not introduce a coordinator.

## Scope Classification
- Large

## Goals
1. Preserve embedded startup behavior.
2. Add deterministic remote-node window operations.
3. Enable true concurrent multi-node execution.
4. Keep transport/cache/file responsibilities clean.
5. Ensure multi-window lifecycle correctness (window close vs app quit).
6. Ensure node-specific UX gates (embedded-only controls and local FS).
7. Ensure users have explicit node-management entry and visible per-window node identity.

## Non-Goals
1. No scheduler/coordinator service.
2. No distributed single run across multiple nodes.
3. No merged cross-node timeline in one runtime context.
4. No mandatory backend schema changes for v1.

## Requirements And Use Cases
1. Launch app with embedded-bound window.
2. Add remote node and open/focus its dedicated window.
3. Run agents concurrently in different windows.
4. Synchronize node registry across windows.
5. Resolve simultaneous registry updates deterministically.
6. Remove remote node while its window is open.
7. Close one node window without quitting app.
8. Quit app from any window and stop embedded server once.
9. Keep remote windows usable when embedded server is down.
10. Restrict local file/folder conveniences to embedded windows.
11. Restrict embedded server settings/monitor surfaces to embedded windows.
12. Broadcast embedded server status without per-window listener leaks.
13. Ensure Apollo and REST clients are bound-context safe across bootstrap/rebuild.
14. Handle backend capability differences without breaking core UX.
15. Ensure backend-generated URLs stay reachable in Docker/remote deployments.

## Product Decisions (Locked)
1. Window binding is immutable for a window lifetime.
2. Selecting another node opens/focuses that node’s window; no in-window rebinding.
3. Embedded node is system-defined and non-removable.
4. Only remote nodes are user-addable.
5. Node type remains minimal: `embedded | remote`.
6. Apollo uses explicit window-bound client wiring (no static `@nuxtjs/apollo` endpoint coupling).
7. Remote node `baseUrl` is immutable in v1 (rename allowed; URL change is remove+add).
8. Node type remains minimal, but each node also has runtime capability metadata.
9. Unsupported capabilities are disabled per-node with explicit UI messaging (no silent failure).
10. Remote node onboarding includes host-URL sanity checks for backend-generated URLs.
11. Nuxt plugin bootstrap order is explicit and legacy overlapping plugins are removed/merged to avoid duplicate initialization.
12. Capability defaults are conservative: unknown capability state disables optional features until probe success.

## Architecture Overview

### Plane A: Electron Main Process
Responsibilities:
- Canonical node registry + persistence.
- Canonical nodeId <-> window mapping.
- Open/focus/close node windows.
- Versioned registry broadcast to all windows.
- App lifecycle handling for close vs quit.
- Embedded server status fanout.

Rules:
1. `open-node-window(nodeId)` focuses existing window, else creates one.
2. Normal window close removes only that window mapping.
3. App quit path is explicit and global; embedded server stops once.
4. Registry broadcasts include `version`; renderers ignore stale snapshots.
5. `serverStatusManager` listener is installed once globally and fans out to windows, not one new listener per window.

### Plane B: Renderer Window Context
Responsibilities:
- Bootstrap immutable bound node context.
- Resolve GraphQL/REST/WS endpoints from bound node.
- Expose `isEmbeddedWindow` for node-specific UI behavior.

Rules:
1. No in-window node switching.
2. One Apollo client per window context.
3. `waitForBoundBackendReady` gates node-specific readiness; remote windows must not wait on embedded lifecycle.

### Plane C: Embedded Server Lifecycle
Responsibilities:
- Embedded process startup/status/restart/logs.
- Embedded-only overlays and controls.

Rules:
1. Embedded readiness/failure affects embedded windows only.
2. Remote windows remain interactive while embedded is down.

## File And Module Breakdown

| File/Module | Concern / Responsibility | Public APIs | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-web/electron/main.ts` | Node registry/window manager, close-vs-quit lifecycle, single server-status fanout listener | node/window IPC handlers, lifecycle handlers | Input: IPC/events. Output: windows, broadcasts, lifecycle effects. | Electron |
| `/Users/normy/autobyteus_org/autobyteus-web/electron/preload.ts` | Secure bridge for node/window APIs and events | `electronAPI` methods/listeners | Input: renderer calls. Output: IPC bridge. | `ipcRenderer` |
| `/Users/normy/autobyteus_org/autobyteus-web/types/node.ts` | Node and registry contracts | `NodeType`, `NodeProfile`, `NodeEndpoints`, `WindowNodeContext`, `NodeRegistrySnapshot` | Input: state. Output: shared contracts. | TS |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/windowNodeContextStore.ts` | Immutable bound context + node readiness API | `initializeFromWindowContext`, `getBoundEndpoints`, `isEmbeddedWindow`, `waitForBoundBackendReady` | Input: context/status. Output: routing and readiness state. | Pinia |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/nodeStore.ts` | Node registry state + versioned snapshot apply | `applyRegistrySnapshot`, `addRemoteNode`, `removeRemoteNode` | Input: snapshots/UI actions. Output: registry state. | Pinia |
| `/Users/normy/autobyteus_org/autobyteus-web/plugins/10.serverStore.client.ts` | Embedded server bootstrap only | plugin init | Input: startup. Output: embedded status init. | serverStore |
| `/Users/normy/autobyteus_org/autobyteus-web/plugins/20.windowNodeBootstrap.client.ts` | Window context bootstrap + registry listeners | plugin init | Input: startup. Output: context ready. | context/node stores |
| `/Users/normy/autobyteus_org/autobyteus-web/plugins/30.apollo.client.ts`, `/Users/normy/autobyteus_org/autobyteus-web/plugins/apolloErrorLink.client.ts`, `/Users/normy/autobyteus_org/autobyteus-web/utils/apolloClient.ts` | Window-bound Apollo client lifecycle and error-link rebinding | `getApolloClient` | Input: bound endpoints/client lifecycle. Output: per-window GraphQL client with stable error reporting. | Apollo |
| `/Users/normy/autobyteus_org/autobyteus-web/utils/nodeCapabilityProbe.ts` | Capability probing for optional remote features | `probeNodeCapabilities` | Input: node base URL. Output: capability snapshot + probe status. | Fetch |
| `/Users/normy/autobyteus_org/autobyteus-web/utils/nodeHostValidation.ts` | Validate backend-generated URL reachability assumptions on onboarding | `validateServerHostConfiguration` | Input: node base URL + sample generated URLs. Output: warnings/errors. | URL utils |
| `/Users/normy/autobyteus_org/autobyteus-web/components/settings/NodeManager.vue` | User-facing node management (add/open/rename/remove) with validation/probe integration | add/open/rename/remove handlers | Input: user actions. Output: nodeStore/electronAPI calls with warnings/errors. | node store + validation/probe utils |
| `/Users/normy/autobyteus_org/autobyteus-web/services/api.ts` | REST routing by bound node | existing REST helpers | Input: request. Output: node-scoped HTTP calls. | Axios |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/agentRunStore.ts`, `/Users/normy/autobyteus_org/autobyteus-web/stores/agentTeamRunStore.ts`, `/Users/normy/autobyteus_org/autobyteus-web/stores/applicationRunStore.ts`, `/Users/normy/autobyteus_org/autobyteus-web/stores/workspace.ts`, `/Users/normy/autobyteus_org/autobyteus-web/composables/useTerminalSession.ts` | WS endpoint routing by bound node | existing APIs | Input: actions/events. Output: node-scoped streams. | context store |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/mediaLibraryStore.ts`, `/Users/normy/autobyteus_org/autobyteus-web/stores/fileUploadStore.ts` | Bound-node REST usage for media/upload flows | existing store APIs | Input: media/upload actions. Output: node-scoped REST calls. | `services/api.ts` |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/agentDefinitionStore.ts`, `/Users/normy/autobyteus_org/autobyteus-web/stores/agentTeamDefinitionStore.ts`, `/Users/normy/autobyteus_org/autobyteus-web/stores/workspace.ts` | Bound-node readiness gating for fetches | existing fetch actions | Input: fetch lifecycle. Output: no remote-blocking on embedded state. | context store |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/fileExplorer.ts`, `/Users/normy/autobyteus_org/autobyteus-web/components/workspace/config/WorkspaceSelector.vue`, `/Users/normy/autobyteus_org/autobyteus-web/components/agentInput/ContextFilePathInputArea.vue`, `/Users/normy/autobyteus_org/autobyteus-web/components/agentInput/AgentUserInputTextArea.vue` | Embedded-only local path/folder behavior | existing APIs | Input: UI actions. Output: guarded local FS behavior. | context store + preload |
| `/Users/normy/autobyteus_org/autobyteus-web/pages/settings.vue`, `/Users/normy/autobyteus_org/autobyteus-web/components/server/ServerLoading.vue`, `/Users/normy/autobyteus_org/autobyteus-web/components/server/ServerShutdown.vue`, `/Users/normy/autobyteus_org/autobyteus-web/components/server/ServerMonitor.vue`, `/Users/normy/autobyteus_org/autobyteus-web/components/settings/ServerSettingsManager.vue` | Embedded-only server controls/status surfaces | existing settings/overlay APIs | Input: node context + server store. Output: scoped UI. | context/server stores |
| `/Users/normy/autobyteus_org/autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue`, `/Users/normy/autobyteus_org/autobyteus-web/components/fileExplorer/viewers/HtmlPreviewer.vue` | Artifact/static URL routing by bound node | existing props/APIs | Input: file/artifact info. Output: node-scoped URLs. | context store |
| `/Users/normy/autobyteus_org/autobyteus-web/app.vue`, `/Users/normy/autobyteus_org/autobyteus-web/layouts/default.vue` | Embedded-only startup overlays + per-window node identity shell affordance | shell computed state | Input: bound node context + node store + server store. Output: scoped overlays + node label. | context/node/server stores |

## Dependency Flow And Cross-Reference Risk

| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation / Boundary Strategy |
| --- | --- | --- | --- | --- |
| `electron/main.ts` | Electron primitives | preload + all renderers | Medium | single ownership for registry/window/lifecycle and server-status fanout |
| `stores/windowNodeContextStore.ts` | preload + node contracts | transport and UI gating modules | Medium | read-only context + explicit bound readiness API |
| `stores/serverStore.ts` | embedded IPC | embedded-only surfaces | Medium | never used as global remote readiness gate |
| `stores/nodeStore.ts` | preload + node contracts | NodeManager | Medium | versioned snapshot apply to avoid stale writes |
| `utils/nodeCapabilityProbe.ts` | node endpoints + health contracts | node store + settings flows | Medium | isolate probe logic from UI/store orchestration |
| `services/api.ts` | context store | media/upload stores | High | remove import-time singleton binding; resolve base URL lazily per call |
| `plugins/apolloErrorLink.client.ts` | Apollo client lifecycle | all GraphQL flows | Medium | re-attach error link whenever bound client is rebuilt |
| server settings/monitor UI modules | context + server stores | settings page | Medium | render/mount only in embedded windows |

## Data Models

```ts
export type NodeType = 'embedded' | 'remote'

export interface NodeProfile {
  id: string
  name: string
  baseUrl: string
  nodeType: NodeType
  capabilities?: NodeCapabilities
  isSystem: boolean
  createdAt: string
  updatedAt: string
}

export interface NodeEndpoints {
  graphqlHttp: string
  graphqlWs: string
  rest: string
  agentWs: string
  teamWs: string
  terminalWs: string
  fileExplorerWs: string
  health: string
}

export interface NodeCapabilities {
  terminal: boolean
  fileExplorerStreaming: boolean
}

export type CapabilityProbeState = 'unknown' | 'ready' | 'degraded'

export interface WindowNodeContext {
  windowId: number
  nodeId: string
}

export interface NodeRegistrySnapshot {
  version: number
  nodes: NodeProfile[]
}
```

## Error Handling And Edge Cases
1. Duplicate remote base URL rejected.
2. Remote node unreachable: keep node, mark health unreachable, allow retry.
3. Missed registry event: force snapshot pull.
4. Stale snapshot version ignored.
5. Embedded removal rejected.
6. Invalid/missing window context falls back to embedded.
7. Close one remote window does not quit app.
8. App quit path is idempotent for server shutdown.
9. Embedded down does not block remote windows.
10. Local file/folder operations in remote windows are blocked with explicit feedback.
11. Remote windows do not expose embedded server restart/reset/settings controls.
12. Backend-generated media/file URLs are validated against node reachability expectations; onboarding warns when server host configuration is likely incorrect.
13. If capability probe state is `unknown` or `degraded`, optional features are disabled until the next successful probe.

## Performance / Security Considerations
1. One Apollo cache per window for isolation.
2. IPC-only node context handoff (no URL/query binding).
3. Keep `contextIsolation` and preload-only bridge.
4. Versioned minimal registry payloads.
5. Remove per-window server-status listener accumulation in main process.
6. `local-file` and local text-file access are always gated by embedded-window checks and optional path allowlisting.
7. Remote-node trust model is explicit: unsupported/unsafe features are disabled by capability.

## Migration / Rollout
1. Add node contracts and endpoint derivation.
2. Refactor `main.ts` for node-window manager + versioned registry + close-vs-quit + single status fanout listener.
3. Add preload APIs and typed contracts.
4. Add window context bootstrap and bound readiness API.
5. Replace static Apollo module coupling with bound Apollo plugin.
6. Migrate all WS/REST/URL builders (excluding transcription, out of scope) to bound endpoints.
7. Replace node-specific `isElectron` guards with `isEmbeddedWindow`.
8. Scope embedded server UI surfaces to embedded windows.
9. Refactor `services/api.ts` away from import-time singleton baseURL binding.
10. Make Apollo error-link lifecycle resilient to client rebuild.
11. Add capability probing and UX gating for unsupported remote features.
12. Validate with embedded + two remote Docker nodes and full lifecycle scenarios.
13. Remove/merge legacy overlapping plugins (`plugins/serverStore.ts`, old error-link ownership path) so bootstrap order is deterministic.

## Design Feedback Loop Notes

| Date | Trigger | Design Smell | Update Applied | Status |
| --- | --- | --- | --- | --- |
| 2026-02-08 | runtime inspection pass 1 | single-active-node not meeting concurrency | switched to window-per-node | Updated |
| 2026-02-08 | runtime inspection pass 2 | registry sync/removal ambiguity | canonical main-process sync + deterministic removal | Updated |
| 2026-02-08 | runtime inspection pass 3 | in-window rebinding cache/routing risk | immutable window binding | Updated |
| 2026-02-08 | runtime inspection pass 4 | close/quit and embedded-gating leaks | close-vs-quit rules + bound readiness + embedded guards | Updated |
| 2026-02-08 | runtime inspection pass 5 | server-status fanout leaks, static endpoints still global, embedded settings shown in remote windows | added single status fanout ownership and embedded-only settings surfaces | Updated |
| 2026-02-08 | runtime inspection pass 6 | import-time REST/Apollo lifecycle coupling and endpoint capability differences | added capability-aware gating, lazy REST binding, Apollo error-link rebinding | Updated |
| 2026-02-08 | scope update pass 7 | transcription no longer supported in backend | removed transcription from v1 scope/design/runtime/tests | Updated |
| 2026-02-08 | runtime inspection pass 8 | plugin ownership/order ambiguity and capability default behavior not explicit | added plugin de-overlap rule, explicit capability probe state/default behavior, dedicated probe/host-validation modules | Updated |
| 2026-02-08 | implementation pass 9 | missing explicit node management entry + weak per-window node identity visibility | added NodeManager/settings node entry + shell node identity and embedded-only overlay gating refinements | Updated |

## Open Questions
- None for v1. Design is decision-complete for implementation.
