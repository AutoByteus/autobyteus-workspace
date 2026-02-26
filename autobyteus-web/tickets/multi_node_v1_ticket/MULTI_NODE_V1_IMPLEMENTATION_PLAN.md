# Implementation Plan (Iteration v3)

## Scope Classification
- Classification: `Large`
- Reasoning:
  - Cross-cutting changes across readiness, endpoint routing, Apollo lifecycle, stream teardown, and UI behavior.

## Plan Version
- Current Version: `v3`
- Delta from v2:
  - Adds deterministic plugin ordering/naming.
  - Adds explicit node-switch cache hygiene contract.
  - Fixes file explorer local-path branch ownership by `nodeType`.
  - Consolidates Apollo error-link ownership with Apollo lifecycle owner.

## Locked Product Decisions
- No coordinator in v1.
- Single active node.
- `nodeType` is only `embedded` | `remote`.

## Public API / Interface Changes
- New/updated in `/Users/normy/autobyteus_org/autobyteus-web/stores/nodeStore.ts`:
  - `registerNodeSwitchHook(hook)` and two-phase switch execution (`beforeSwitch`, `afterSwitch`).
- New plugin filenames and responsibility split:
  - `/Users/normy/autobyteus_org/autobyteus-web/plugins/10.embeddedServerBootstrap.client.ts`
  - `/Users/normy/autobyteus_org/autobyteus-web/plugins/20.nodeBootstrap.client.ts`
  - `/Users/normy/autobyteus_org/autobyteus-web/plugins/30.apollo.client.ts`
- Remove standalone Apollo error-link plugin role from `/Users/normy/autobyteus_org/autobyteus-web/plugins/apolloErrorLink.client.ts`.

## Simulation Gate (v3)
- Status: `Pass`
- Basis: `/Users/normy/autobyteus_org/autobyteus-web/tickets/multi_node_v1_ticket/MULTI_NODE_V1_RUNTIME_SIMULATION.md`
- Preconditions to keep pass status during implementation:
  - all endpoint sourcing moved to `nodeStore` at call/connect time,
  - switch hooks implemented in all stream/node-scoped stores,
  - cache reset and local-path nodeType guard implemented.

## Dependency And Sequencing Map

| Order | File/Module | Depends On | Why This Order |
| --- | --- | --- | --- |
| 1 | `/Users/normy/autobyteus_org/autobyteus-web/types/node.ts` | None | Base contracts. |
| 2 | `/Users/normy/autobyteus_org/autobyteus-web/utils/nodeEndpoints.ts` | node types | Endpoint derivation foundation. |
| 3 | `/Users/normy/autobyteus_org/autobyteus-web/stores/nodeStore.ts` | node types/utils | Source of truth + switch hook contract. |
| 4 | `/Users/normy/autobyteus_org/autobyteus-web/plugins/10.embeddedServerBootstrap.client.ts` | `serverStore` | Deterministic embedded init. |
| 5 | `/Users/normy/autobyteus_org/autobyteus-web/plugins/20.nodeBootstrap.client.ts` | `nodeStore` | Deterministic node init. |
| 6 | `/Users/normy/autobyteus_org/autobyteus-web/plugins/30.apollo.client.ts`, `/Users/normy/autobyteus_org/autobyteus-web/utils/apolloClient.ts` | nodeStore | Apollo lifecycle + error link in one owner. |
| 7 | `/Users/normy/autobyteus_org/autobyteus-web/plugins/apolloErrorLink.client.ts` | apollo.client.ts | deprecate/remove to avoid split ownership. |
| 8 | `/Users/normy/autobyteus_org/autobyteus-web/nuxt.config.ts`, `/Users/normy/autobyteus_org/autobyteus-web/codegen.ts` | Apollo migration decision | Remove Nuxt Apollo/module coupling. |
| 9 | `/Users/normy/autobyteus_org/autobyteus-web/app.vue` | nodeStore + serverStore | readiness/overlay decoupling. |
| 10 | `/Users/normy/autobyteus_org/autobyteus-web/components/server/ServerLoading.vue`, `/Users/normy/autobyteus_org/autobyteus-web/components/server/ServerShutdown.vue`, `/Users/normy/autobyteus_org/autobyteus-web/components/server/ServerMonitor.vue`, `/Users/normy/autobyteus_org/autobyteus-web/pages/settings.vue` | nodeStore + serverStore | correct embedded-only UI semantics. |
| 11 | `/Users/normy/autobyteus_org/autobyteus-web/services/api.ts` | nodeStore | dynamic REST base URL per request. |
| 12 | `/Users/normy/autobyteus_org/autobyteus-web/stores/agentDefinitionStore.ts`, `/Users/normy/autobyteus_org/autobyteus-web/stores/agentTeamDefinitionStore.ts`, `/Users/normy/autobyteus_org/autobyteus-web/stores/workspace.ts` | nodeStore + apollo | replace embedded-only readiness dependency and add node-scoped reset hooks. |
| 13 | `/Users/normy/autobyteus_org/autobyteus-web/stores/agentRunStore.ts`, `/Users/normy/autobyteus_org/autobyteus-web/stores/agentTeamRunStore.ts`, `/Users/normy/autobyteus_org/autobyteus-web/stores/applicationRunStore.ts` | nodeStore + switch hooks | route WS from active node and disconnect on switch. |
| 14 | `/Users/normy/autobyteus_org/autobyteus-web/stores/fileExplorer.ts` | nodeStore | add `nodeType` guard for local absolute-path branch + endpoint migration. |
| 15 | `/Users/normy/autobyteus_org/autobyteus-web/composables/useTerminalSession.ts`, `/Users/normy/autobyteus_org/autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue`, `/Users/normy/autobyteus_org/autobyteus-web/components/fileExplorer/viewers/HtmlPreviewer.vue` | nodeStore | remove remaining static endpoint paths. |
| 16 | `/Users/normy/autobyteus_org/autobyteus-web/components/settings/NodeManager.vue`, `/Users/normy/autobyteus_org/autobyteus-web/components/workspace/config/WorkspaceSelector.vue` | nodeStore | expose node CRUD/select and nodeType UX gating. |
| 17 | `/Users/normy/autobyteus_org/autobyteus-web/stores/agentArtifactsStore.ts` | Apollo migration | replace lazy vue-apollo generated query usage with explicit client query path. |

## Step-by-Step Plan
1. Implement node contracts/utilities and `nodeStore` with switch hooks.
2. Rename/create bootstrap plugins with deterministic order.
3. Implement Apollo lifecycle plugin with integrated error link management.
4. Remove standalone Apollo error-link plugin behavior and Nuxt Apollo module wiring.
5. Update Apollo accessor and codegen strategy.
6. Refactor readiness/overlay gating in root and server-related UI.
7. Refactor REST + WS endpoint sourcing to `nodeStore` across all use-case paths.
8. Add node-scoped cache/state reset strategy on switch.
9. Fix file explorer local absolute-path branch with `nodeType===embedded` condition.
10. Migrate remaining Vue Apollo composable usage (`agentArtifactsStore`) to explicit client query.
11. Run regression matrix and finalize.

## Test Cases And Scenarios

### Unit Tests
- `nodeStore`:
  - switch hook order: `beforeSwitch` then Apollo clear/rebuild then `afterSwitch`.
  - fallback to embedded when active removed.
  - runtime status transitions.
- `fileExplorer`:
  - local absolute path branch only when `isElectron` and active node is `embedded`.
  - remote absolute path remains server-routed.
- Apollo plugin:
  - error link attached on initial client and after client rebuild.
- `api.ts`:
  - base URL resolved per request from current active node.

### Integration Tests
- boot with deterministic plugin order and no race in readiness.
- switch node with active streams: no old-stream events after switch.
- switch node and query same resource name: no stale cross-node data leak.
- remote active + embedded error: app remains usable.
- artifact/html previews after node switch hit new node REST endpoint.

### Manual Smoke
- Embedded-only flow unchanged.
- Remote-only active node while embedded unhealthy.
- Embedded -> Remote -> Embedded switching with agent/team/workspace actions.

## Acceptance Criteria
- Each in-scope module has one primary responsibility and no split lifecycle ownership.
- All app-traffic endpoints resolve from active node state at runtime.
- No node switch leaks stale stream events or stale cached domain data.
- File preview/open behavior is correct for embedded vs remote node path semantics.

## Risks And Mitigations
- Risk: hidden static endpoint literals remain.
  - Mitigation: grep gate for runtimeConfig endpoint usage and `getServerUrls()` in app-traffic modules.
- Risk: migration from vue-apollo generated composables misses one path.
  - Mitigation: grep gate for `use*Query` from `generated/graphql` in stores.
- Risk: plugin rename/order causes startup regressions.
  - Mitigation: explicit startup integration test + smoke in Electron.

## Assumptions And Defaults
- Remote node API shape matches embedded server API shape.
- v1 uses safe default of cache clear on switch (not per-node persistent cache map).
- v1 keeps single active node and no fan-out.
