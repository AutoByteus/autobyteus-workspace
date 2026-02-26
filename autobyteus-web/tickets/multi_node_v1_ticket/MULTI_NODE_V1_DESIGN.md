# Design Document (Iteration v3)

## Summary
Implement v1 multi-node support in `autobyteus-web` so the Electron app can connect to one selected `autobyteus-server-ts` node at a time (`embedded` default, switchable to `remote`).

This v3 iteration tightens architecture cleanliness after another call-stack audit:
- preserves no-coordinator v1,
- keeps minimal `nodeType` (`embedded` | `remote`),
- resolves additional lifecycle, cache, and file-responsibility smells.

## Locked Decisions
- Coordinator/control-plane: **not included in v1**.
- Active execution target: **single active node only**.
- Node discriminator: **`nodeType` only** (`embedded` | `remote`).
- Embedded process lifecycle and active-node connectivity are **separate concerns**.

## Goals
- Keep embedded Electron server flow as default startup behavior.
- Allow users to add/select remote nodes.
- Route GraphQL/REST/WS traffic to active node at runtime.
- Keep native folder picker for embedded node only.
- For remote node, require manual path entry.
- Ensure node switch does not leak stale cache/state between nodes.

## Non-Goals
- Multi-node concurrent execution.
- Scheduler/load-balancer/failover coordinator.
- Cross-node merged state.
- Mandatory auth/TLS policy in v1.

## Requirements And Use Cases
- Use Case 1: App boots with embedded node seeded and active by default.
- Use Case 2: User adds remote node and switches active node.
- Use Case 3: Agent/team/application/file/terminal operations use active node endpoints.
- Use Case 4: Workspace/file UX behavior changes by `nodeType`.
- Use Case 5: Node switch tears down streams and clears node-scoped volatile/cache state.
- Use Case 6: Embedded process failure does not block remote-node operation.

## Additional v3 Inspection Findings
1. `/Users/normy/autobyteus_org/autobyteus-web/stores/fileExplorer.ts` treats absolute path as local file whenever Electron is present; this is unsafe for remote-node absolute paths.
2. `/Users/normy/autobyteus_org/autobyteus-web/plugins/apolloErrorLink.client.ts` binds once to current Apollo client; if client is rebuilt on node switch, error-link ownership can desync.
3. Node switch design lacked explicit node-scoped cache reset contract (Apollo cache + Pinia node-scoped state), risking cross-node stale data.
4. Plugin initialization order for bootstrap concerns should be deterministic by filename/registration order to avoid startup races.

## Architecture Overview (Revised)
Two separate planes:
- **Embedded Process Plane**: embedded server lifecycle, logs, restart/error handling.
- **Active Node Plane**: node registry, selection, endpoint derivation, active-node readiness.

Additional v3 boundary rules:
- Apollo lifecycle and Apollo error-link lifecycle are owned by the same module (`apollo.client.ts`).
- Node switch includes explicit cache/state hygiene:
  1. disconnect streams,
  2. clear active Apollo store and rebuild client,
  3. clear/reset node-scoped Pinia slices,
  4. activate new node and probe health.
- Local absolute-path file access is allowed only when `activeNode.nodeType === 'embedded'`.
- Startup plugins use deterministic order with explicit numeric prefixes.

## File And Module Breakdown (v3)

| File/Module | Concern / Responsibility | Public APIs | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-web/types/node.ts` | Node profile/runtime models | `NodeType`, `NodeProfile`, `NodeEndpoints`, `NodeRuntimeState` | Input: node config. Output: typed models. | None |
| `/Users/normy/autobyteus_org/autobyteus-web/utils/nodeEndpoints.ts` | Derive endpoint family from base URL | `deriveNodeEndpoints(baseUrl)` | Input: base URL. Output: GraphQL/REST/WS endpoints. | URL utils |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/nodeStore.ts` | Node registry, active node runtime state, switch orchestration | `initializeRegistry`, `setActiveNode`, `waitForActiveNodeReady`, `getActiveEndpoints`, `registerNodeSwitchHook` | Input: CRUD/select actions. Output: active node + readiness + switch events. | pinia, node types/utils |
| `/Users/normy/autobyteus_org/autobyteus-web/plugins/10.embeddedServerBootstrap.client.ts` (rename from `serverStore.ts`) | Initialize embedded-process plane only | plugin default export | Input: app boot. Output: starts embedded server store init. | `serverStore` |
| `/Users/normy/autobyteus_org/autobyteus-web/plugins/20.nodeBootstrap.client.ts` (new) | Initialize active-node plane | plugin default export | Input: app boot. Output: node registry + health probe init. | `nodeStore` |
| `/Users/normy/autobyteus_org/autobyteus-web/plugins/30.apollo.client.ts` (new/replace) | Own Apollo client + error link lifecycle + rebuild on node switch | `getActiveApolloClient`, `rebuildApolloClientForActiveNode` | Input: active node endpoints + switch events. Output: active client ready for stores. | `@apollo/client`, `nodeStore` |
| `/Users/normy/autobyteus_org/autobyteus-web/plugins/apolloErrorLink.client.ts` | Deprecated in v1 multi-node | N/A | N/A | N/A |
| `/Users/normy/autobyteus_org/autobyteus-web/utils/apolloClient.ts` | Store/service accessor (no vue-apollo composable dependency) | `getApolloClient()` | Input: none. Output: active client reference. | Apollo plugin runtime registry |
| `/Users/normy/autobyteus_org/autobyteus-web/services/api.ts` | REST wrapper with per-request active node base URL | existing `get/post/put/delete` | Input: request path + active node. Output: HTTP response from active node. | axios, nodeStore |
| `/Users/normy/autobyteus_org/autobyteus-web/app.vue` | Root app readiness + overlay gating | computed readiness/flags | Input: node/server runtime state. Output: layout gating. | nodeStore, serverStore |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/agentRunStore.ts` | Agent mutation + stream lifecycle for active node | existing actions + switch hook | Input: node endpoints. Output: stream lifecycle. | nodeStore, apollo, streaming service |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/agentTeamRunStore.ts` | Team mutation + stream lifecycle for active node | existing actions + switch hook | Input: node endpoints. Output: stream lifecycle. | nodeStore, apollo, streaming service |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/applicationRunStore.ts` | App-team mutation + stream lifecycle for active node | existing actions + switch hook | Input: node endpoints. Output: stream lifecycle. | nodeStore, apollo, streaming service |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/workspace.ts` | Workspace data + file stream routing + node-scoped reset hook | existing actions + switch hook | Input: active node readiness/endpoints. Output: workspace state + file stream lifecycle. | nodeStore, apollo |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/fileExplorer.ts` | File open/content/preview URL logic with nodeType-aware local access | existing actions | Input: active node type + endpoints + workspace id. Output: file contents/media URLs. | nodeStore |
| `/Users/normy/autobyteus_org/autobyteus-web/composables/useTerminalSession.ts` | Terminal ws endpoint from active node | existing composable API | Input: workspace/session + active endpoints. Output: terminal session lifecycle. | nodeStore |
| `/Users/normy/autobyteus_org/autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue` | Artifact URL from active node REST endpoint | existing props | Input: artifact/workspace + active endpoints. Output: fetch URL. | nodeStore |
| `/Users/normy/autobyteus_org/autobyteus-web/components/fileExplorer/viewers/HtmlPreviewer.vue` | Static preview URL from active node REST endpoint | existing props | Input: file path + active endpoints. Output: iframe src. | nodeStore |
| `/Users/normy/autobyteus_org/autobyteus-web/components/settings/NodeManager.vue` | Node CRUD/select UI | component events/actions | Input: user edits. Output: store mutations. | nodeStore |
| `/Users/normy/autobyteus_org/autobyteus-web/components/workspace/config/WorkspaceSelector.vue` | `nodeType` UX gating | existing emits | Input: active node type. Output: picker/manual behavior. | nodeStore, electron API |
| `/Users/normy/autobyteus_org/autobyteus-web/components/server/ServerLoading.vue`, `/Users/normy/autobyteus_org/autobyteus-web/components/server/ServerShutdown.vue`, `/Users/normy/autobyteus_org/autobyteus-web/components/server/ServerMonitor.vue` | Embedded-only status overlays/monitoring | existing | Input: active node type + embedded status. Output: scoped UI. | nodeStore, serverStore |
| `/Users/normy/autobyteus_org/autobyteus-web/nuxt.config.ts` | Remove `@nuxtjs/apollo` module and legacy Apollo config | config | Input: nuxt modules/plugins. Output: custom Apollo path only. | Nuxt |
| `/Users/normy/autobyteus_org/autobyteus-web/codegen.ts` | Remove vue-apollo composable generation strategy | codegen config | Input: schema/docs. Output: typed operations only. | graphql-codegen |

## Dependency Flow And Boundary Rules (v3)
- `serverStore` must not decide active-node routing.
- `nodeStore` must not import Electron process-manager internals.
- `apollo.client.ts` is the only owner of client rebuild + Apollo error link wiring.
- Transport callers resolve active endpoints at call/connect time via `nodeStore`.
- Any store that caches node-scoped domain data must register a node-switch reset hook.
- FileExplorer local absolute path flow requires both:
  - Electron runtime available, and
  - `activeNode.nodeType === 'embedded'`.

## Data Models
```ts
export type NodeType = 'embedded' | 'remote'
export type NodeRuntimeStatus = 'unknown' | 'checking' | 'ready' | 'unreachable'

export interface NodeProfile {
  id: string
  name: string
  baseUrl: string
  nodeType: NodeType
  isActive: boolean
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
}

export interface NodeRuntimeState {
  status: NodeRuntimeStatus
  lastCheckedAt: string | null
  latencyMs: number | null
  lastError: string | null
}
```

Persistence:
- localStorage key: `autobyteus.node_registry.v1`
- default seed node: `embedded-local` (`http://localhost:29695`, `nodeType: embedded`)

## Error Handling And Edge Cases
- Invalid node URL on add/update: inline validation.
- Active node unreachable: keep selection, set runtime `unreachable`, expose retry.
- Active node removal: fallback to embedded seed.
- Embedded failure while remote active: no global block, scoped warning only.
- Node switch cache hygiene:
  - clear Apollo store and dispose old subscriptions,
  - reset node-scoped pinia data (`agent definitions`, `team definitions`, `workspaces`, etc.),
  - reconnect only on user-initiated next action.
- Remote absolute paths in file explorer must never be treated as local Electron FS paths.

## Performance / Security Considerations
- Apollo rebuild only on node switch.
- Endpoint resolution at action/connect boundaries avoids stale endpoints.
- No remote credentials persisted in v1 registry.
- Keep v1 auth/TLS optional and explicit for future phase.

## Migration / Rollout
1. Introduce node types/endpoints/store and deterministic bootstrap plugins.
2. Decouple app readiness and overlay scope from embedded-only status.
3. Introduce custom Apollo lifecycle plugin and remove standalone Apollo error-link plugin.
4. Migrate REST/WS and preview URL callers to nodeStore-driven endpoints.
5. Add node-switch cache/state reset hooks.
6. Add NodeManager and `nodeType` UI behavior.
7. Run full regression with embedded and remote Docker node.

## Design Feedback Loop Notes (Iteration Log)

| Date | Trigger | Smell | Design Update Applied | Status |
| --- | --- | --- | --- | --- |
| 2026-02-08 | v1 simulation vs code | readiness blocked by embedded status | split process plane vs active-node plane | Updated |
| 2026-02-08 | endpoint audit | routing spread and stale endpoint risks | centralized endpoint policy via `nodeStore` | Updated |
| 2026-02-08 | deeper file/preview inspection | remote absolute paths could be misread as local files | require `nodeType === embedded` for local-file path branch | Updated |
| 2026-02-08 | Apollo lifecycle inspection | error-link lifecycle split from client rebuild | merge error-link ownership into Apollo lifecycle plugin | Updated |
| 2026-02-08 | bootstrap sequencing review | plugin startup order ambiguity | deterministic plugin naming/order with numeric prefixes | Updated |

## Open Questions
- Whether to keep per-node Apollo cache map (faster switches) or always reset cache on switch (safer isolation). v1 default: reset cache for correctness.
