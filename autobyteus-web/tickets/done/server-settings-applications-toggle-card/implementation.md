# Implementation

## Solution Sketch

1. Remove the dedicated Applications card mount from `autobyteus-web/pages/settings.vue` so the page shell no longer treats it as a special top-level panel.
2. Render `ApplicationsFeatureToggleCard` from `autobyteus-web/components/settings/ServerSettingsManager.vue` inside the Basics card grid so it inherits the same page rhythm as the other cards.
3. Replace the dual action buttons inside `autobyteus-web/components/settings/ApplicationsFeatureToggleCard.vue` with a single switch-style button that:
   - reflects the resolved enabled state,
   - shows a disabled/busy state while capability data is loading or saving,
   - reuses the existing `setEnabled(...)` path and raw server settings refresh.
4. Update the focused Vue tests to validate:
   - the card is no longer mounted from `pages/settings.vue`,
   - the switch toggles the capability on and off through the existing store method.

## Reopened Fix Sketch

1. Add a shared readiness helper in `autobyteus-web/stores/serverSettings.ts` that waits for `windowNodeContextStore.waitForBoundBackendReady()` before firing server-settings queries.
2. Use that helper in the query actions that drive the Basics screen load path.
3. Add store-level tests for the readiness behavior so the page does not rely on unrelated component mount order to become usable.

## Stage 8 Re-Entry Fix Sketch

1. Refine `autobyteus-web/stores/windowNodeContextStore.ts` so `waitForBoundBackendReady()` stays aligned with the bound-node boundary:
   - embedded node in Electron: main-process health bridge is allowed,
   - non-embedded node in Electron: use the bound node health endpoint directly,
   - browser/non-Electron path: continue to use the bound node health endpoint directly.
2. Make `autobyteus-web/stores/serverSettings.ts` binding-aware instead of cache-by-array-length:
   - record which `bindingRevision` produced the current settings/search-config state,
   - clear cached bound-node state when the binding changes,
   - return cached values only when they belong to the current binding revision.
3. Keep `ApplicationsFeatureToggleCard.vue` as a pure card-level owner:
   - no hidden page bootstrap behavior,
   - only user-triggered capability mutation plus best-effort raw settings refresh after mutation.
4. Extend focused tests to prove:
   - Electron remote-node windows do not use the embedded health bridge,
   - rebinding invalidates server-settings cache and forces fresh fetches for the new node.

## Repeat Independent Review Fix Sketch

1. Keep `autobyteus-web/stores/serverSettings.ts` as-is for binding-aware cache lifetime.
   - The earlier server-settings cache finding is already resolved in the current source.
   - This re-entry should not reopen that area unless new evidence appears.
2. Tighten `autobyteus-web/stores/applicationsCapabilityStore.ts` so the typed capability boundary owns stale-response protection for both reads and writes:
   - capture `bindingRevisionAtStart` inside `setEnabled(...)`,
   - if the binding changes during readiness wait or mutation completion, do not write old-node success/error state back into the store,
   - resolve against the current binding's capability instead of letting a stale mutation repopulate the store.
3. Tighten `autobyteus-web/stores/windowNodeContextStore.ts` so `waitForBoundBackendReady({ timeoutMs })` keeps one timeout contract across both readiness transports:
   - HTTP probe path: keep request-level abort timeout,
   - embedded Electron bridge path: add an equivalent renderer-side timeout guard around `window.electronAPI.checkServerHealth()`.
4. Extend focused tests to prove:
   - rebinding during `applicationsCapabilityStore.setEnabled(...)` does not overwrite the new node's refreshed capability state,
   - embedded Electron health bridge probes honor the caller timeout contract,
   - the existing binding-aware server-settings cache behavior still remains intact.

## Execution Notes

- This is a presentation and interaction refactor only.
- No API, GraphQL, store contract, or localization-domain expansion is expected unless the switch UI needs one small accessibility label.
- The current re-entry is a lifecycle-hardening pass inside existing stores. No backend contract change is required.

## Completed Work

- Removed the top-level Applications card mount from `autobyteus-web/pages/settings.vue`.
- Added `ApplicationsFeatureToggleCard` to the Basics card grid owned by `autobyteus-web/components/settings/ServerSettingsManager.vue`.
- Replaced the card's dual-button controls with a switch-style button in `autobyteus-web/components/settings/ApplicationsFeatureToggleCard.vue`.
- Updated the page and component tests that cover placement and toggle interaction.
- Tightened `autobyteus-web/stores/applicationsCapabilityStore.ts` so `setEnabled(...)` now discards stale old-node mutation completions after rebinding and resolves against the current binding instead of overwriting capability state.
- Tightened `autobyteus-web/stores/windowNodeContextStore.ts` so the embedded Electron health bridge also honors the caller timeout contract.
- Added focused tests for rebinding during the Applications toggle mutation and for a hung embedded Electron health bridge.

## Implementation Validation

- `pnpm exec vitest run components/settings/__tests__/ApplicationsFeatureToggleCard.spec.ts`
- `pnpm exec vitest run pages/__tests__/settings.spec.ts`
- `pnpm exec vitest run components/settings/__tests__/ServerSettingsManager.spec.ts`
- Re-entry validation must add:
  - `pnpm exec vitest run stores/__tests__/applicationsCapabilityStore.spec.ts`
  - `pnpm exec vitest run stores/__tests__/windowNodeContextStore.spec.ts`
  - `pnpm exec vitest run tests/stores/serverSettingsStore.test.ts`
- Current re-entry validation executed:
  - `pnpm exec vitest run stores/__tests__/applicationsCapabilityStore.spec.ts`
  - `pnpm exec vitest run stores/__tests__/windowNodeContextStore.spec.ts`
  - `pnpm exec vitest run tests/stores/serverSettingsStore.test.ts`
  - `pnpm exec vitest run components/settings/__tests__/ApplicationsFeatureToggleCard.spec.ts components/settings/__tests__/ServerSettingsManager.spec.ts pages/__tests__/settings.spec.ts components/settings/__tests__/CompactionConfigCard.spec.ts`
  - `pnpm build:electron:mac`
