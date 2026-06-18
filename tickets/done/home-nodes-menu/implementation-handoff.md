# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/home-nodes-menu/tickets/done/home-nodes-menu/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/home-nodes-menu/tickets/done/home-nodes-menu/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/home-nodes-menu/tickets/done/home-nodes-menu/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/home-nodes-menu/tickets/done/home-nodes-menu/design-review-report.md`

## What Changed

- Added a shared shell primary navigation owner at `autobyteus-web/composables/useShellPrimaryNavigation.ts`.
  - Active primary keys are now `agents`, `agentTeams`, `applications`, `skills`, `memory`, and `nodes`.
  - `nodes` routes to `/nodes`, uses `shell.navigation.nodes`, and uses the `heroicons:circle-stack` icon.
  - `media` is not a shell primary navigation key anymore; `/media` page/subsystem was left untouched.
  - Existing Applications capability/runtime filtering was preserved, and `nodes` is hidden in mobile remote runtime by the existing `desktopSettings` feature gate.
- Updated both shell sidebar presentations to consume the shared nav owner:
  - `autobyteus-web/components/AppLeftPanel.vue`
  - `autobyteus-web/components/layout/LeftSidebarStrip.vue`
- Added `/nodes` as a thin page facade over the existing `NodeManager`:
  - `autobyteus-web/pages/nodes.vue`
- Removed Settings-level `Nodes` access:
  - Removed Settings sidebar item.
  - Removed `nodes` from `SettingsSection` and `validSections`.
  - Removed `NodeManager` import/render from `pages/settings.vue`.
  - `settings?section=nodes` now falls back to the default `api-keys` section as an invalid section.
- Added `/nodes` mobile remote runtime classification as unsupported `desktopSettings` in `mobileFeatureForRouteLocation()`.
- Updated shell/settings localization:
  - Added `shell.navigation.nodes` in English and Chinese.
  - Removed unused `shell.navigation.media` and `settings.page.sections.nodes` labels.
- Updated source copy/tests that pointed users to `Settings -> Nodes` in mobile pairing diagnostics to point to `Nodes -> Phone Setup`.
- Updated focused frontend/unit coverage for shared nav, expanded/collapsed sidebars, `/nodes`, Settings removal, and mobile route gating.

## Key Files Or Areas

- `autobyteus-web/composables/useShellPrimaryNavigation.ts`
- `autobyteus-web/pages/nodes.vue`
- `autobyteus-web/components/AppLeftPanel.vue`
- `autobyteus-web/components/layout/LeftSidebarStrip.vue`
- `autobyteus-web/pages/settings.vue`
- `autobyteus-web/utils/mobileFeatureGates.ts`
- `autobyteus-web/localization/messages/en/shell.ts`
- `autobyteus-web/localization/messages/zh-CN/shell.ts`
- `autobyteus-web/localization/messages/en/settings.ts`
- `autobyteus-web/localization/messages/zh-CN/settings.ts`
- `autobyteus-web/components/mobile/MobilePairingBootstrap.vue`
- `autobyteus-android/app/src/main/java/org/autobyteus/mobile/connection/ConnectionDiagnosticMapper.kt`
- `autobyteus-ios/AutoByteusMobileCore/ConnectionDiagnostic.swift`
- Tests under `autobyteus-web/components/__tests__`, `autobyteus-web/components/layout/__tests__`, `autobyteus-web/composables/__tests__`, `autobyteus-web/pages/__tests__`, and `autobyteus-web/middleware/__tests__`.

## Important Assumptions

- `/media` should remain directly reachable; this implementation only removes it from shell primary navigation.
- `NodeManager.vue` remains under `components/settings/` as approved residual risk; the new page facade does not move or re-own node-management behavior.
- Durable documentation files still containing `Settings -> Nodes` are left for the delivery/docs-sync stage unless source-code/runtime copy required immediate update.

## Known Risks

- Some durable docs still reference `Settings -> Nodes` and should be synchronized by `delivery_engineer` against the integrated branch state.
- The `/nodes` page depends on existing `NodeManager` route-query handling for `nodeTab`; no node-management internals were changed.
- Focused web tests passed using the existing installed dependency tree from the main checkout because this fresh ticket worktree does not have local `node_modules` installed.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Behavior Change`
- Reviewed root-cause classification: `Duplicated Policy Or Coordination`
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `Refactor Needed Now`
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`
- Evidence / notes: The duplicated primary nav item/route/active policy was removed from both sidebar components and centralized in `useShellPrimaryNavigation`; `/nodes` is a facade over `NodeManager`; Settings no longer contains a hidden nodes section.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes: No changed source implementation file exceeds 500 effective non-empty lines. `pages/settings.vue` remains 330 non-empty lines after removal; all other changed implementation files are smaller.

## Environment Or Dependency Notes

- The ticket worktree did not have local `node_modules`, so the initial package-script test command failed with `cross-env: command not found`.
- For focused web test execution only, I temporarily symlinked this worktree to the existing installed dependency tree and `.nuxt` directory from `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`, ran Vitest from `autobyteus-web`, then removed those temporary symlinks.
- No dependency or lockfile changes were made.

## Local Implementation Checks Run

- `git diff --check` — passed.
- Focused Nuxt/Vitest command — passed, `6` files / `31` tests:
  - `NUXT_TEST=true node_modules/.bin/vitest --run components/__tests__/AppLeftPanel.spec.ts components/layout/__tests__/LeftSidebarStrip.spec.ts composables/__tests__/useShellPrimaryNavigation.spec.ts pages/__tests__/nodes.spec.ts pages/__tests__/settings.spec.ts middleware/__tests__/mobileFeatureGate.global.spec.ts`
- Static source scan after changes:
  - No `shell.navigation.media` or `settings.page.sections.nodes` references remain in active web source/localization.
  - `AppLeftPanel.vue`, `LeftSidebarStrip.vue`, and `pages/settings.vue` no longer retain local `media` nav or settings-node mount code.

## Downstream Coverage Hints / Suggested Scenarios

- Verify expanded sidebar shows `Nodes` and not `Media`, and clicking `Nodes` reaches `/nodes`.
- Verify collapsed strip shows `Nodes` tooltip/icon and not `Media`, and clicking `Nodes` reaches `/nodes`.
- Verify `/nodes?nodeTab=phoneSetup` opens the existing Phone Setup tab through `NodeManager`.
- Verify `/settings?section=nodes` does not render `NodeManager` and falls back to normal Settings default.
- Verify `/media` remains directly reachable but no longer appears in primary shell nav.
- Verify mobile remote runtime redirects `/nodes` with unsupported feature `desktopSettings`.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Required after code review. Implementation-scoped checks only were run here; API/E2E coverage investigation and execution remain owned by `api_e2e_engineer`.
