# Investigation Notes - node-registry-localstorage-removal

## Sources Consulted
- `/Users/normy/autobyteus_org/worktrees/team-history-restore/autobyteus-web/stores/nodeStore.ts`
- `/Users/normy/autobyteus_org/worktrees/team-history-restore/autobyteus-web/stores/federatedCatalogStore.ts`
- `/Users/normy/autobyteus_org/worktrees/team-history-restore/autobyteus-web/stores/nodeDiscoveryStore.ts`
- `/Users/normy/autobyteus_org/worktrees/team-history-restore/autobyteus-web/electron/main.ts`
- `/Users/normy/autobyteus_org/worktrees/team-history-restore/autobyteus-web/utils/remoteNodeIdentityResolver.ts`
- `/Users/normy/autobyteus_org/worktrees/team-history-restore/autobyteus-server-ts/src/federation/catalog/federated-catalog-service.ts`
- `/Users/normy/autobyteus_org/worktrees/team-history-restore/autobyteus-server-ts/src/distributed/policies/placement-constraint-policy.ts`

## Key Findings
1. Browser mode (`pnpm dev`, no Electron bridge) loads node registry from frontend localStorage and persists registry back to localStorage.
2. The federated catalog query uses `nodeStore.nodes` as input. Any stale node ID in browser registry is forwarded to backend catalog query.
3. Team definitions persist the selected member `homeNodeId`; placement validation later fails when that ID is not in backend known node directory (`UnknownHomeNodeError`).
4. Electron mode does not use browser localStorage for node registry. Electron registry is file-based (`node-registry.v1.json` under app userData).
5. Auto discovery can repopulate discovered nodes at runtime; localStorage persistence in browser mode is not required for discovered-node correctness.

## Risk / Impact Analysis
- Keeping browser localStorage persistence can reintroduce stale node IDs across reloads.
- Removing browser localStorage persistence trades persistence convenience for correctness/stability.
- Manual remote nodes in browser mode will no longer survive full page reload; they must be rediscovered or re-added.

## Scope Decision
- Scope: `Small`
- Rationale: isolated to frontend `nodeStore` browser fallback behavior + tests; no backend API/schema changes.
