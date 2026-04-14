# Investigation Notes

- Date: `2026-04-14`
- Scope Triage: `Small`

## Relevant Surface

- `autobyteus-web/components/settings/ServerSettingsManager.vue` owns the Basics card grid and the loading spinner shown while server settings are being fetched.
- `autobyteus-web/stores/serverSettings.ts` fetches Server Settings and Search Config through Apollo but currently does not wait for `windowNodeContextStore.waitForBoundBackendReady()`.
- `autobyteus-web/stores/applicationsCapabilityStore.ts` does wait for bound-backend readiness before querying.
- `autobyteus-web/tests/stores/serverSettingsStore.test.ts` currently verifies store mutations and search-config behavior but does not cover backend-readiness gating.

## Reopened Regression

1. In the built Electron app, entering `Settings -> Server Settings -> Basics` can leave the screen stuck on the manager loading spinner.
2. My earlier focused tests only covered component layout/toggle behavior and did not cover the packaged app's backend-readiness timing.
3. The previous top-mounted Applications card indirectly masked this because it used a readiness-gated capability fetch and then forced a server-settings reload.

## Root Cause Confirmed

1. `ServerSettingsManager` now owns the Applications card placement inside the Basics grid.
2. While the manager is loading, the Applications card does not mount, so its readiness-gated sync path no longer runs first.
3. `serverSettingsStore.fetchServerSettings()` can therefore query Apollo before the bound backend is ready, which is enough to reproduce the stuck loading state in the packaged Electron runtime.

## Stage 8 Re-Entry Findings

1. The embedded-node load regression is fixed, but `windowNodeContextStore.waitForBoundBackendReady()` now has a deeper authority issue:
   - in Electron it routes every caller through `window.electronAPI.checkServerHealth()`,
   - the main-process health bridge only probes the embedded internal server,
   - so a non-embedded bound-node window can get the wrong readiness answer.
2. `serverSettingsStore` still does not scope cached settings/search-config state to `bindingRevision`.
   - `fetchServerSettings()` returns cached state before any binding check,
   - the store has no invalidation path when the bound node changes,
   - stale settings can therefore outlive the authoritative node binding.

## Implementation Direction

1. Add the same bound-backend readiness boundary to `serverSettingsStore` query actions that drive the Basics load path.
2. Fail predictably with a surfaced error instead of letting the manager spinner stay active indefinitely.
3. Add targeted store tests for readiness gating so UI composition order cannot hide this class of bug again.

## Re-Entry Direction

1. Keep `windowNodeContextStore` as the authoritative bound-node readiness owner, but only use the Electron health bridge for the embedded node.
2. For remote-node bindings, probe `boundEndpoints.health` directly even inside Electron so the readiness result stays aligned with the currently bound node.
3. Tie `serverSettingsStore` cache lifetime to `bindingRevision`, invalidate bound-node state when the binding changes, and prove that stale cached settings are not reused after rebinding.
4. Re-run focused executable validation for:
   - embedded Electron readiness,
   - Electron remote-node readiness path selection,
   - server-settings cache invalidation on binding change.

## Repeat Independent Review Findings

1. `applicationsCapabilityStore.setEnabled()` still lacks `bindingRevision` stale-response protection.
   - `fetchCapability()` correctly discards late read results after rebinding, but `setEnabled()` writes success/error state unconditionally.
   - If the user toggles Applications and the window rebinds before the mutation resolves, the old node's mutation response can overwrite the new node's refreshed capability state.
2. `windowNodeContextStore.waitForBoundBackendReady()` still has an embedded-Electron timeout contract gap.
   - the renderer computes `requestTimeoutMs` per probe,
   - but the embedded Electron path awaits `window.electronAPI.checkServerHealth()` directly,
   - and `serverStatusManager.checkServerHealth()` uses a fixed `axios` timeout of `5000ms`.
   - This means the declared renderer timeout is not actually enforced on the embedded Electron bridge path.
3. The current validation set does not cover either of those edge cases.
   - `applicationsCapabilityStore.spec.ts` covers rebinding after capability reads, but not rebinding during `setEnabled()`.
   - `windowNodeContextStore.spec.ts` proves hung `fetch` probes time out, but not hung embedded-Electron bridge probes.

## Next Re-Entry Direction

1. Bind `applicationsCapabilityStore.setEnabled()` to `bindingRevision` the same way the read path already is, and discard late old-node mutation completions.
2. Add a focused stale-mutation test proving rebinding during the Applications toggle does not overwrite current-node capability state.
3. Enforce the `waitForBoundBackendReady({ timeoutMs })` timeout contract on the embedded Electron bridge path too.
4. Add an embedded-Electron timeout test so Stage 7 proves both readiness transports honor the same caller contract.
