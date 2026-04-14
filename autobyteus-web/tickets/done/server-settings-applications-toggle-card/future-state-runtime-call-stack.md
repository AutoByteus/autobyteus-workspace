# Future-State Runtime Call Stack

## Use Case 1: Server Settings Basics renders Applications as a normal card

1. User opens `Settings -> Server Settings -> Basics`.
2. `pages/settings.vue` renders `ServerSettingsManager` for the server settings section without mounting a separate top-level Applications card.
3. `ServerSettingsManager.vue` asks `serverSettingsStore` to load Basics data.
4. `serverSettingsStore` waits for `windowNodeContextStore.waitForBoundBackendReady()` before issuing server-settings queries.
5. Once ready, the Basics card grid renders and includes `ApplicationsFeatureToggleCard` as one grid item alongside the other settings cards.
6. `ApplicationsFeatureToggleCard.vue` resolves the Applications capability and displays the current state within its card body.

## Use Case 2: User enables or disables Applications with a single switch

1. User clicks the switch control inside `ApplicationsFeatureToggleCard`.
2. The card computes the next desired enabled state from the current resolved capability.
3. The card calls `applicationsCapabilityStore.setEnabled(nextEnabled)`.
4. `applicationsCapabilityStore` captures the current `bindingRevision` before waiting for readiness or applying mutation results.
5. If the window rebinds while the mutation is in flight, the old mutation completion is ignored and the store resolves against the current node's capability instead of repopulating stale state.
6. If the original binding is still current when the mutation succeeds, the capability store applies the returned capability.
7. After the authoritative mutation path succeeds for the current binding, the card runs the existing best-effort raw server settings refresh through `serverSettingsStore.reloadServerSettings()`.
8. The card updates its switch position, inline state label, and status/error messaging from the store state.

## Use Case 3: Bound backend readiness stays aligned with the currently bound node

1. A caller asks `windowNodeContextStore.waitForBoundBackendReady()`.
2. `windowNodeContextStore` reads the current bound node identity and endpoints.
3. If the bound node is the embedded Electron node, the store may use the Electron main-process health bridge, but the renderer still enforces the caller timeout contract around that bridge.
4. If the bound node is not the embedded node, the store probes `boundEndpoints.health` directly, even in Electron.
5. The readiness result therefore always describes the currently bound node, not a different internal backend, and the timeout behavior is consistent across both readiness transports.

## Use Case 4: Server settings cache is invalidated when node binding changes

1. `serverSettingsStore` has already loaded settings/search config for one `bindingRevision`.
2. `windowNodeContextStore.bindingRevision` changes because the window binding changes.
3. `serverSettingsStore` invalidates bound-node state owned by the previous binding revision.
4. The next server-settings or search-config fetch re-runs against the new binding instead of serving stale cached state.

## Use Case 5: Applications capability ignores stale mutation completions after rebinding

1. `applicationsCapabilityStore` has resolved capability for one bound node.
2. The user toggles Applications, which starts `setEnabled(nextEnabled)` for that node.
3. Before the mutation resolves, `windowNodeContextStore.bindingRevision` changes because the window rebinds.
4. The capability store invalidates old-node state and refreshes for the new node.
5. When the old mutation eventually succeeds or fails, the capability store discards that stale completion instead of restoring old-node capability or error state.
6. All Applications-gated UI therefore continues to reflect the new node's capability only.

## Invariants

1. The typed Applications capability boundary remains the authoritative source of truth.
2. No new server setting write path is introduced.
3. The visual placement change does not alter the existing server settings tabs or route structure.
4. Server settings queries must not run before the bound backend is ready.
5. Bound-backend readiness must always mean the currently bound node, not the embedded backend by accident.
6. Cached server settings and search config must never outlive the binding revision that produced them.
7. A stale Applications toggle completion must never overwrite capability state for a newer bound node.
8. `waitForBoundBackendReady({ timeoutMs })` must honor one timeout contract regardless of whether readiness uses HTTP fetch or the embedded Electron health bridge.
