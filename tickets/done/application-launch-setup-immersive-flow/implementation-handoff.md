# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-launch-setup-immersive-flow/tickets/in-progress/application-launch-setup-immersive-flow/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-launch-setup-immersive-flow/tickets/in-progress/application-launch-setup-immersive-flow/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-launch-setup-immersive-flow/tickets/in-progress/application-launch-setup-immersive-flow/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-launch-setup-immersive-flow/tickets/in-progress/application-launch-setup-immersive-flow/design-review-report.md`

## What Changed

- Refactored `ApplicationShell.vue` into explicit `setup` and `immersive` route phases.
- Added `ApplicationImmersiveControlPanel.vue` for the tiny trigger, resizable side panel, inline `Details` / `Configure` disclosures, and emitter-only `Reload application` / `Exit application` intents.
- Adjusted the collapsed immersive trigger into a visible top-right floating control with inline SVG iconography so the closed state reads like the reviewed control affordance instead of a blank or dark orb over the embedded app canvas; added direct component coverage for that closed-state presentation contract.
- Flipped the immersive control panel to the right side so opening it pushes the app canvas left, then refined the panel chrome away from the earlier black slab toward a light, app-matched surface with inline SVG close/disclosure icons and lighter section/action styling.
- Reused `ApplicationLaunchSetupPanel.vue` in both phases via a presentation-only `page | panel` prop.
- Restored immersive shell suppression through `appLayoutStore` and route-level cleanup on exit/unmount.
- Kept post-entry setup saves setup-local while making `Reload application` the only in-route relaunch path.
- Tightened `applicationHostStore.ts` so `clearLaunchState(applicationId)` invalidates in-flight launches instead of letting stale async completions recreate launch state after exit/route leave.
- Preserved per-application launch generation across `clearLaunchState()` so exit/route leave + later re-entry now produces a fresh `launchInstanceId` for the current binding/capability lifetime.
- Restyled `ApplicationSurface.vue` so the live app reads as the dominant immersive canvas instead of a dashboard card.
- Removed dead touched localization residue (`ApplicationShell.showDetails` / `hideDetails`) from both applications catalogs.
- Removed the remaining dead touched localization residue (`ApplicationShell.reloadApplication`) from both applications catalogs so reload copy now lives only under `ApplicationImmersiveControlPanel.reloadApplication`.
- Removed live-verification runtime artifacts under `autobyteus-server-ts/applications/` and ignored that repo-local runtime-output root in `.gitignore` so future live browser checks do not leave untracked sqlite/log/status files in the worktree.
- Cleaned the Brief Studio homepage so the landing experience stays business-first: removed the homepage-level `Advanced app details` / backend-notification surfaces, introduced a workflow-first hero plus step strip, and kept the homepage focused on create/list/review work instead of app metadata.
- Simplified Brief Studio homepage/runtime copy and stopped rendering homepage metadata/notification UI while preserving notification-driven refresh of the brief workflow.
- Updated applications docs, English/Chinese copy, and focused tests for the new setup-first / immersive-after-entry flow.
- Hardened the ready-runtime storage repair path end-to-end: `ApplicationEngineHostService.ensureApplicationEngine()` still detects empty/missing app storage before ready-runtime reuse, and `ApplicationStorageLifecycleService.ensureStoragePrepared()` now clears stale applied-migration ledger rows when `app.sqlite` is empty so migrations are deterministically reapplied instead of being skipped behind a preserved platform ledger.

## Key Files Or Areas

- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-launch-setup-immersive-flow/autobyteus-web/components/applications/ApplicationShell.vue`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-launch-setup-immersive-flow/autobyteus-web/components/applications/ApplicationImmersiveControlPanel.vue`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-launch-setup-immersive-flow/autobyteus-web/components/applications/ApplicationLaunchSetupPanel.vue`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-launch-setup-immersive-flow/autobyteus-web/components/applications/ApplicationSurface.vue`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-launch-setup-immersive-flow/autobyteus-web/stores/applicationHostStore.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-launch-setup-immersive-flow/autobyteus-web/components/applications/__tests__/ApplicationShell.spec.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-launch-setup-immersive-flow/autobyteus-web/components/applications/__tests__/ApplicationImmersiveControlPanel.spec.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-launch-setup-immersive-flow/autobyteus-web/components/applications/__tests__/ApplicationLaunchSetupPanel.spec.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-launch-setup-immersive-flow/autobyteus-web/stores/__tests__/applicationHostStore.spec.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-launch-setup-immersive-flow/autobyteus-server-ts/src/application-engine/services/application-engine-host-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-launch-setup-immersive-flow/autobyteus-server-ts/tests/unit/application-engine/application-engine-host-service.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-launch-setup-immersive-flow/autobyteus-server-ts/src/application-storage/services/application-storage-lifecycle-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-launch-setup-immersive-flow/autobyteus-server-ts/tests/unit/application-storage/application-storage-lifecycle-service.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-launch-setup-immersive-flow/autobyteus-web/localization/messages/en/applications.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-launch-setup-immersive-flow/autobyteus-web/localization/messages/zh-CN/applications.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-launch-setup-immersive-flow/autobyteus-web/docs/applications.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-launch-setup-immersive-flow/.gitignore`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-launch-setup-immersive-flow/applications/brief-studio/frontend-src/index.html`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-launch-setup-immersive-flow/applications/brief-studio/frontend-src/styles.css`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-launch-setup-immersive-flow/applications/brief-studio/frontend-src/brief-studio-runtime.js`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-launch-setup-immersive-flow/applications/brief-studio/frontend-src/brief-studio-renderer.js`

## Important Assumptions

- Route entry should always start in setup phase, even when saved setup is already valid.
- Reload remains disabled whenever the authoritative setup gate is not launch-ready.
- The embedded configure form is lazy-mounted on first disclosure open, then preserved for subsequent panel open/close cycles during the same immersive visit.
- Exit and route leave are both intended to invalidate any in-flight launch request for that application route visit.
- Brief Studio homepage metadata belongs in host controls / details, not on the app landing page itself.

## Known Risks

- The embedded setup panel still needs real-browser validation at narrower side-panel widths even though resize coverage was added in unit tests.
- The host-launch invalidation plus fresh route-reentry identity contract are unit-covered, but browser validation should still confirm exit/route-leave behavior during real async launch latency.
- The immersive canvas now depends on the route owner restoring `standard` presentation on every leave path; downstream validation should explicitly cover route changes and browser back navigation.
- The refreshed Brief Studio homepage was visually spot-checked through the rebuilt local `ui/index.html` preview; downstream validation should still confirm the same business-first presentation through a provisioned/local-imported live bundle route.
- Ready-runtime storage repair is now covered both at the storage-lifecycle layer (preserved ledger + emptied `app.sqlite`) and at the host-service reuse layer, but downstream validation should still exercise reuse of an already-running Brief Studio runtime against a real embedded route to confirm the `no such table: briefs` regression stays closed.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes:
  - `ApplicationShell.vue` had a large route-flow delta; the new `ApplicationImmersiveControlPanel.vue` was extracted so panel-local resize/disclosure behavior did not bloat the route owner further.
  - `applicationHostStore.ts` stayed setup-agnostic; the fix preserves launch-generation identity across route-visit teardown instead of adding setup compatibility metadata.

## Environment Or Dependency Notes

- This worktree initially lacked `node_modules`, so `pnpm install --frozen-lockfile` was run in `autobyteus-web/` before local checks.
- `pnpm exec nuxi prepare` was required to generate `.nuxt/tsconfig.json` before running Vitest in this worktree.

## Local Implementation Checks Run

Record only implementation-scoped checks here, such as build, typecheck, unit tests, and narrow integration checks around the changed code.
Do not stand up API/E2E validation environments or treat that work as part of this section.
Do not report API, E2E, or broader executable validation as passed in this artifact.

- `env NUXT_TEST=true pnpm exec vitest run components/applications/__tests__/ApplicationShell.spec.ts components/applications/__tests__/ApplicationImmersiveControlPanel.spec.ts components/applications/__tests__/ApplicationLaunchSetupPanel.spec.ts components/applications/__tests__/ApplicationSurface.spec.ts stores/__tests__/applicationHostStore.spec.ts` ✅
- `pnpm guard:web-boundary` ✅
- `pnpm guard:localization-boundary` ✅
- `pnpm audit:localization-literals` ✅
- `env NUXT_TEST=true pnpm exec vitest run components/applications/__tests__/ApplicationImmersiveControlPanel.spec.ts` ✅
- `pnpm guard:web-boundary` ✅
- `env NUXT_TEST=true pnpm exec vitest run components/applications/__tests__/ApplicationImmersiveControlPanel.spec.ts components/applications/__tests__/ApplicationShell.spec.ts` ✅
- `pnpm guard:web-boundary` ✅
- `pnpm build` (in `/Users/normy/autobyteus_org/autobyteus-worktrees/application-launch-setup-immersive-flow/applications/brief-studio`) ✅
- `git status --short` confirms no regenerated `autobyteus-server-ts/applications/` residue ✅
- `pnpm exec vitest run tests/unit/application-storage/application-storage-lifecycle-service.test.ts tests/unit/application-engine/application-engine-host-service.test.ts` (in `/Users/normy/autobyteus_org/autobyteus-worktrees/application-launch-setup-immersive-flow/autobyteus-server-ts`) ✅
- `pnpm build:full` (in `/Users/normy/autobyteus_org/autobyteus-worktrees/application-launch-setup-immersive-flow/autobyteus-server-ts`) ✅
- `pnpm typecheck` (in `/Users/normy/autobyteus_org/autobyteus-worktrees/application-launch-setup-immersive-flow/autobyteus-server-ts`) ⚠️ existing unrelated `TS6059` rootDir/include issues under repo test paths still fail; not introduced by this fix

Code-review local-fix rerun notes:
- Added direct store coverage that `clearLaunchState()` followed by later `startLaunch()` for the same application yields a different `launchInstanceId` (`::launch-2` after `::launch-1`).
- Removed dead `ApplicationShell.showDetails` / `hideDetails` localization keys from both touched catalogs.
- Removed dead `ApplicationShell.reloadApplication` localization keys from both touched catalogs and reran the focused localization/boundary checks.
- Live-browser local fix: moved the trigger to the top-right, switched it to a visible inline-SVG control affordance, and rechecked the real Brief Studio immersive route so the closed trigger now renders at the reviewed top-right placement in the live DOM.
- Live-browser UX refinement: opened the right-side panel against the real Brief Studio immersive route and replaced the earlier black panel treatment with a light app-matched surface; current live verification shows the panel pushing the canvas left while retaining visible close/disclosure icons and lighter neutral controls.
- Cleanup fix for `CR-LAUNCH-IMM-004`: deleted the generated `autobyteus-server-ts/applications/...` sqlite/log/status artifacts left by live verification and ignored `autobyteus-server-ts/applications/` so future local browser checks do not reintroduce untracked runtime-output residue.
- Brief Studio homepage cleanup: rebuilt the repo-local app package and visually spot-checked `/Users/normy/autobyteus_org/autobyteus-worktrees/application-launch-setup-immersive-flow/applications/brief-studio/ui/index.html`; the landing page now removes homepage metadata/details, leads with the brief workflow, and keeps creation/list/detail as the dominant content.

## API/E2E Round-4/5 Local Fix — Ready Runtime Storage Self-Heal

- Authoritative failure addressed: live embedded Brief Studio post-bootstrap route surfaced the app-owned runtime error banner `no such table: briefs` instead of a clean ready homepage.
- Root cause: `ApplicationEngineHostService.ensureApplicationEngine()` correctly detected an empty ready-runtime app DB, but `ApplicationStorageLifecycleService.ensureStoragePrepared()` reused the preserved `__autobyteus_app_migrations` ledger, so `ApplicationMigrationService.applyPendingMigrations()` skipped recreating the missing app schema.
- Durable fix: before reapplying migrations, `ApplicationStorageLifecycleService` now checks whether `app.sqlite` contains zero user tables while the platform migration ledger still has applied rows; when that inconsistent state is detected, it clears the stale ledger rows so migrations are replayed deterministically against the empty app DB.
- Ready-runtime reuse still enters through `ApplicationEngineHostService`, which now re-runs storage preparation for empty/missing ready-runtime app DBs before returning the reused runtime.
- Durable coverage now proves both layers: `application-storage-lifecycle-service.test.ts` preserves an applied migration ledger, empties `app.sqlite`, reruns `ensureStoragePrepared()`, and verifies the `briefs` table plus ledger row are restored; `application-engine-host-service.test.ts` reuses a ready runtime against that same persisted-ledger empty-DB shape and proves the required table is rebuilt before reuse.
- Live local recheck after repair: re-entered the embedded host route, clicked `Enter application`, and confirmed the post-bootstrap immersive app-ready surface renders without the red `no such table: briefs` banner; screenshot artifact: `/Users/normy/.autobyteus/browser-artifacts/ac672d-1776920295393.png`.

## Downstream Validation Hints / Suggested Scenarios

- Open `/applications/:id` with already-valid saved setup and confirm the route still lands in setup phase first.
- Enter immersive mode, open the tiny trigger, expand `Details`, expand `Configure`, resize the panel, and close it to confirm the app canvas re-dominates.
- Save setup from the immersive configure panel and confirm the current app stays mounted until explicit `Reload application` is invoked.
- Trigger `Reload application` and confirm a fresh `launchInstanceId` is used.
- Exit immersive mode and also navigate away via route change/browser navigation during launch preparation to confirm host launch state is cleared and standard shell presentation is restored.
- Re-provision or re-import the rebuilt Brief Studio package, then confirm the application homepage no longer shows homepage-level advanced app metadata and instead opens directly into the brief workflow hero/create/list/detail experience.
- Reuse an already-running Brief Studio runtime after storage cleanup or delayed backend reuse and confirm the embedded post-bootstrap route still lands on a clean ready homepage instead of surfacing `no such table: briefs`.

## API / E2E / Executable Validation Still Required

- Real browser validation of immersive shell suppression/restoration through `appLayoutStore -> layouts/default.vue`.
- Real browser validation of embedded setup usability/responsiveness inside the resizable immersive control panel.
- End-to-end confirmation that exit/route-leave invalidates in-flight host launches under actual backend latency and prevents stale launch reuse on route re-entry.
- Real browser validation of the refreshed Brief Studio homepage through a provisioned/local-imported live bundle route, not only the rebuilt static `ui/` preview.
- Real browser/API validation that reusing an already-ready Brief Studio runtime with existing storage roots no longer leaks app-owned schema errors onto the embedded post-bootstrap ready surface.

## Architecture Rerun Addendum — Lifecycle / Reveal Ownership

Reviewed rerun note implemented exactly as passed:
- `ApplicationShell.vue` remains the authoritative immersive loading/error owner only **before** a `launchInstanceId` exists.
- `ApplicationSurface.vue` now remains the authoritative post-launch reveal owner **after** a `launchInstanceId` exists.
- No new iframe/backend readiness protocol was introduced; the reveal gate still opens on the existing reviewed `bootstrap-delivered` boundary.

Implementation details:
- `ApplicationSurface.vue` now keeps the iframe canvas visually hidden at `opacity-0` until bootstrap succeeds for the active launch instance.
- The pending and failure transition overlays are now intentionally opaque host-owned canvases (`bg-slate-950`) so pre-bootstrap business DOM cannot bleed through visually.
- Direct surface coverage now asserts pending hidden state, stale-ready rejection, success reveal, and failure/retry behavior.
- Brief Studio’s remaining host-bootstrap placeholder copy was cleaned to the app-local `Preparing brief workspace…` state so post-reveal app-local loading no longer reads like host lifecycle leakage.

Additional implementation-scoped checks for the rerun:
- `env NUXT_TEST=true pnpm exec vitest run components/applications/__tests__/ApplicationShell.spec.ts components/applications/__tests__/ApplicationSurface.spec.ts` ✅
- `env NUXT_TEST=true pnpm exec vitest run components/applications/__tests__/ApplicationImmersiveControlPanel.spec.ts components/applications/__tests__/ApplicationLaunchSetupPanel.spec.ts components/applications/__tests__/ApplicationShell.spec.ts components/applications/__tests__/ApplicationSurface.spec.ts stores/__tests__/applicationHostStore.spec.ts` ✅
- `pnpm guard:web-boundary` ✅
- `pnpm build` (in `/Users/normy/autobyteus_org/autobyteus-worktrees/application-launch-setup-immersive-flow/applications/brief-studio`) ✅
- `rg -n "Waiting for the host bootstrap payload|Preparing brief workspace|Advanced app details" applications/brief-studio -S` confirms generated Brief Studio outputs now carry `Preparing brief workspace…` and no `Advanced app details` residue ✅

Downstream validation emphasis:
- Enter immersive mode and confirm the app homepage remains hidden until bootstrap succeeds; the only visible pre-bootstrap state should be the host-owned transition canvas.
- Re-provision or re-import the rebuilt Brief Studio package before live route validation so the live bundle uses the cleaned homepage and placeholder copy.
- Local browser preview spot-check: opened `file:///Users/normy/autobyteus_org/autobyteus-worktrees/application-launch-setup-immersive-flow/applications/brief-studio/ui/index.html` and confirmed the rebuilt homepage shows the workflow-first hero/status/create/list/detail layout without `Advanced app details`; screenshot artifact: `/Users/normy/.autobyteus/browser-artifacts/9a8701-1776918198210.png` ✅
