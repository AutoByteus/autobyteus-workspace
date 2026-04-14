# API / E2E / Executable Validation

## Validation Scope

- This reopened round validates the shared readiness fix that unblocked `Settings -> Server Settings -> Basics` in Electron.
- The important proof points are no longer only card placement and toggle interaction; they now include bound-backend readiness ownership, predictable failure behavior, binding-safe Applications mutation behavior, and executable confirmation that the embedded Electron path still builds cleanly.

## Executed Checks

1. `pnpm exec vitest run stores/__tests__/windowNodeContextStore.spec.ts`
   - Result: `Pass`
   - Evidence:
     - bound-backend readiness still succeeds against the health endpoint,
     - the Electron health bridge path is exercised,
     - Electron remote-node windows stay on the bound node health endpoint instead of using the embedded bridge,
     - hung fetch probes time out instead of leaving the caller waiting forever,
     - hung embedded Electron bridge probes also honor the caller timeout contract,
     - a timed-out embedded Electron bridge probe does not poison later readiness attempts.
2. `pnpm exec vitest run tests/stores/serverSettingsStore.test.ts`
   - Result: `Pass`
   - Evidence:
     - `serverSettingsStore` now waits for bound-backend readiness before querying,
     - readiness failure is surfaced as a deterministic store error instead of leaving the Basics spinner active.
     - rebinding invalidates cached server settings,
     - rebinding invalidates cached search config.
3. `pnpm exec vitest run components/settings/__tests__/ApplicationsFeatureToggleCard.spec.ts components/settings/__tests__/ServerSettingsManager.spec.ts pages/__tests__/settings.spec.ts`
   - Result: `Pass`
   - Evidence:
     - the Applications card still renders as a normal Basics card,
     - the toggle still uses the capability store mutation path,
     - removing the mount-time raw-settings reload does not break the page shell tests.
4. `pnpm exec vitest run stores/__tests__/applicationsCapabilityStore.spec.ts components/settings/__tests__/CompactionConfigCard.spec.ts`
   - Result: `Pass`
   - Evidence:
      - bound-node capability rebinding behavior still works after the shared readiness changes,
      - another server-settings consumer still behaves correctly with the binding-aware store,
      - rebinding during `setEnabled(...)` no longer lets a stale old-node mutation overwrite the current node's capability state.
5. Executable retest in Electron
   - Result: `Pass`
   - Evidence:
     - after the reopened readiness fix, the user confirmed the Basics page now loads successfully instead of staying on the spinner.
6. `pnpm build:electron:mac`
   - Result: `Pass`
   - Evidence:
     - Electron mac build completed successfully,
     - updated artifacts were produced under `autobyteus-web/electron-dist/`.

## Validation Totals

- Focused tests passed: `55`
- Executable build passed: `1`

## Acceptance Criteria Mapping

| Acceptance Criterion | Validation Evidence | Result |
| --- | --- | --- |
| Basics page no longer hangs on initial load in Electron | `windowNodeContextStore.spec.ts`, `serverSettingsStore.test.ts`, executable retest | Pass |
| Server settings queries wait for the bound backend readiness boundary | `serverSettingsStore.test.ts`, `windowNodeContextStore.spec.ts` | Pass |
| Readiness failures surface predictably instead of leaving an indefinite spinner | `serverSettingsStore.test.ts` | Pass |
| Remote-node Electron windows probe the correct bound backend | `windowNodeContextStore.spec.ts` | Pass |
| Binding changes invalidate bound-node settings/search-config cache | `serverSettingsStore.test.ts` | Pass |
| Rebinding during Applications toggle does not overwrite current-node capability state | `applicationsCapabilityStore.spec.ts` | Pass |
| Embedded Electron health bridge honors the caller timeout contract | `windowNodeContextStore.spec.ts` | Pass |
| Applications still renders as a normal Basics card with a single toggle | `ApplicationsFeatureToggleCard.spec.ts`, `ServerSettingsManager.spec.ts`, `settings.spec.ts` | Pass |
