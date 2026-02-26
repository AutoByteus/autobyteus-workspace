# Proposed-Design-Based Runtime Call Stack - node-registry-localstorage-removal

## Use Case UC-1: Browser startup ignores stale localStorage node registry
1. `plugins/20.windowNodeBootstrap.client.ts:default export` -> calls `nodeStore.initializeRegistry()`.
2. `stores/nodeStore.ts:initializeRegistry()`
3. Branch: `!window.electronAPI?.getNodeRegistrySnapshot` (browser mode)
4. Apply `createDefaultSnapshot(resolveDefaultEmbeddedBaseUrl())`.
5. `ensureEmbeddedNodePresent()` guard (no-op unless missing embedded node).
6. Mark `initialized=true` and return.

State mutation: in-memory `registryVersion/nodes` set from deterministic default only.

## Use Case UC-2: Browser node mutations remain in-memory only
1. UI action invokes `addRemoteNode` / `renameNode` / `removeRemoteNode` / discovery upsert.
2. `stores/nodeStore.ts` executes non-Electron branch.
3. Update `nodes` and `registryVersion` only.
4. No localStorage write path exists.

State mutation: in-memory registry only.

## Use Case UC-3: Electron unaffected
1. `initializeRegistry()` receives snapshot through `window.electronAPI.getNodeRegistrySnapshot()`.
2. Node changes use `upsertRegistry(...)` IPC.
3. Electron main persists file registry (`node-registry.v1.json`).

State mutation: Electron file-backed snapshot unchanged by this ticket.
