# Implementation Plan

## Scope

Implement Electron auto-updates with persistent renderer UX and release artifact compatibility.

## Execution Order

1. Add main-process updater module + IPC wiring.
2. Extend preload bridge + shared typings.
3. Add renderer update store + global notification component + startup plugin.
4. Integrate component into app shell.
5. Update build config and release workflow for updater metadata/artifacts.
6. Add/adjust targeted tests.
7. Run verification commands and record outcomes.

## Change List

| Change ID | Type | Files | Depends On | Expected Outcome |
| --- | --- | --- | --- | --- |
| C-001 | Add | `autobyteus-web/electron/updater/appUpdater.ts` | None | Main updater manager with normalized state/events/IPC |
| C-002 | Modify | `autobyteus-web/electron/main.ts` | C-001 | Main bootstrap installs updater manager + startup check |
| C-003 | Modify | `autobyteus-web/electron/preload.ts`, `autobyteus-web/electron/types.d.ts`, `autobyteus-web/types/electron.d.ts` | C-001 | Typed renderer update API bridge |
| C-004 | Add | `autobyteus-web/stores/appUpdateStore.ts` | C-003 | Renderer state/actions for updater flow |
| C-005 | Add | `autobyteus-web/components/app/AppUpdateNotice.vue` | C-004 | Persistent bottom-right update UX card |
| C-006 | Add/Modify | `autobyteus-web/plugins/15.appUpdater.client.ts`, `autobyteus-web/app.vue` | C-004,C-005 | Startup initialization + app-level render integration |
| C-007 | Modify | `autobyteus-web/build/scripts/build.ts` | None | Publish metadata configuration for updater feed |
| C-008 | Modify | `.github/workflows/release-desktop.yml` | C-007 | Upload updater-required mac/linux assets |
| C-009 | Add | updater-focused tests in electron/store/component scopes | C-001..C-006 | Regression safety and AC coverage |

## Verification Plan

- `pnpm -C autobyteus-web test:electron --run`
- `pnpm -C autobyteus-web test:nuxt --run stores/__tests__/appUpdateStore.spec.ts components/app/__tests__/AppUpdateNotice.spec.ts __tests__/app.spec.ts`
- `pnpm -C autobyteus-web transpile-electron`
- `pnpm -C autobyteus-web build:electron:linux` (packaged artifact + metadata validation)

## Stage 6 Scenario Mapping

- `S6-001` Startup auto-check: C-001, C-002
- `S6-002` Update available UI: C-004, C-005, C-006
- `S6-003` Download progress: C-001, C-004, C-005
- `S6-004` Install/restart action: C-001, C-003, C-004, C-005
- `S6-005` Error handling/retry: C-001, C-004, C-005
- `S6-006` Build metadata: C-007
- `S6-007` Release assets: C-008
- `S6-008` Test coverage: C-009

## Risks and Mitigations

- Risk: Provider metadata mismatch in local builds.
  - Mitigation: env override support + explicit error state.
- Risk: macOS update failure due missing zip assets.
  - Mitigation: include zip + zip.blockmap upload patterns.
- Risk: accidental updater activity during dev.
  - Mitigation: packaged-only auto-check guard.

## Reopen Scope (2026-02-27)

Implement a canonical `Settings > About` section that shows app version and allows manual update checks using existing updater store/actions.

## Reopen Execution Order

1. Add About settings component with version/status/actions from `appUpdateStore`.
2. Add `about` section into settings sidebar + content router in `pages/settings.vue`.
3. Extend settings page tests for About section navigation/query behavior.
4. Add About component tests for manual check action and CTA rendering.
5. Run targeted Nuxt/Electron verification and record evidence.

## Reopen Change List

| Change ID | Type | Files | Depends On | Expected Outcome |
| --- | --- | --- | --- | --- |
| C-011 | Add | `autobyteus-web/components/settings/AboutSettingsManager.vue` | C-004 | Canonical About panel for version + manual update controls |
| C-012 | Modify | `autobyteus-web/pages/settings.vue` | C-011 | Single settings entrypoint for About section |
| C-013 | Modify | `autobyteus-web/pages/__tests__/settings.spec.ts` | C-012 | Coverage for About section selection/query |
| C-014 | Add | `autobyteus-web/components/settings/__tests__/AboutSettingsManager.spec.ts` | C-011 | Coverage for About panel updater interactions |

## Reopen Verification Plan

- `pnpm -C autobyteus-web test:nuxt --run pages/__tests__/settings.spec.ts components/settings/__tests__/AboutSettingsManager.spec.ts`
- `pnpm -C autobyteus-web test:nuxt --run stores/__tests__/appUpdateStore.spec.ts components/app/__tests__/AppUpdateNotice.spec.ts`
- `pnpm -C autobyteus-web transpile-electron`
