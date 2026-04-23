# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/tickets/done/hosted-application-lifecycle-ownership/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/tickets/done/hosted-application-lifecycle-ownership/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/tickets/done/hosted-application-lifecycle-ownership/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/tickets/done/hosted-application-lifecycle-ownership/design-review-report.md`

## What Changed

- Moved the iframe/bootstrap contract into the shared contracts package via `autobyteus-application-sdk-contracts/src/application-iframe-contract.ts`, including shared event names, launch-hint names, transport shape, payload types, validators/builders, and host-origin helpers.
- Added the framework-owned hosted application startup boundary in `@autobyteus/application-frontend-sdk`:
  - `startHostedApplication(...)`
  - explicit bundle-local startup states `unsupported_entry`, `waiting_for_bootstrap`, `starting_app`, `startup_failed`, `handoff_complete`
  - neutral default startup screen rendering
  - runtime-context creation plus mount-callback handoff ownership
  - public `HostedApplicationRootElement = HTMLElement` typing for DOM-authored bundle mounts
- Kept the reviewed host reveal boundary intact:
  - `ApplicationShell.vue` unchanged as the pre-launch owner
  - `ApplicationSurface.vue` still reveals on bootstrap delivery
  - `ApplicationIframeHost.vue` stays thin and now imports the shared contract package
- Removed the obsolete host-local contract files:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/autobyteus-web/types/application/ApplicationIframeContract.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/autobyteus-web/types/application/ApplicationHostTransport.ts`
- Refactored Brief Studio and Socratic Math Teacher to the reviewed authoring pattern:
  - minimal `index.html` root only
  - thin `app.js` entry wrapper calling `startHostedApplication(...)`
  - no manual launch-hint parsing or ready/bootstrap `postMessage` wiring
  - no pre-bootstrap `status-banner` teaching pattern
  - business UI mounts only after bootstrapped handoff
- Made the shipped sample/browser runtime self-contained:
  - sample package build scripts now vendor the shared contracts runtime beside the frontend SDK
  - vendored browser `.js` and `.d.ts` imports are rewritten from bare `@autobyteus/application-sdk-contracts` specifiers to relative vendor paths
  - sample package builds now fail if any shipped browser UI module still contains a bare module specifier
- Added repository-resident durable tests in the new shared owners:
  - contract tests for launch-hint parsing, origin matching, and envelope validation
  - frontend SDK tests for unsupported entry, ready/bootstrap success, post-delivery startup failure, mismatched bootstrap rejection, and DOM root-element type coverage
- Updated sample runtime packaging outputs (`ui/`, `dist/importable-package/.../ui/`, vendored frontend SDK files) by rerunning the sample package builds after the self-contained vendor fix.
- Updated durable docs and SDK README to teach the framework-owned startup boundary and shared contract owner.

## Follow-up UX Fix — Immersive Host Controls Panel

### What Was Wrong

- The immersive right-side Host Controls surface reused `ApplicationLaunchSetupPanel` in `presentation="panel"` but the component still relied on viewport breakpoints such as `sm:`, `lg:`, and `xl:`.
- On a large desktop viewport with a narrow side panel, those viewport breakpoints still activated, which forced the configure UI into row/two-column layouts that only made sense on a full page.
- The result was unreadable setup content in the immersive panel: compressed columns, overly aggressive wrapping, and a panel that could not be widened far enough to comfortably use the embedded setup UI.
- Reload / Exit controls also lived in the same scrollable column as the configuration content, so they were easy to push away while working inside the panel.

### Files Changed For This UX Fix

- `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/autobyteus-web/components/applications/ApplicationImmersiveControlPanel.vue`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/autobyteus-web/components/applications/ApplicationLaunchSetupPanel.vue`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/autobyteus-web/components/applications/ApplicationLaunchDefaultsFields.vue`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/autobyteus-web/components/applications/__tests__/ApplicationImmersiveControlPanel.spec.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/autobyteus-web/components/applications/__tests__/ApplicationLaunchSetupPanel.spec.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/autobyteus-web/components/applications/__tests__/ApplicationLaunchDefaultsFields.spec.ts`

### What Changed In The Fix

- `ApplicationLaunchSetupPanel.vue` now treats `presentation="panel"` as a real layout mode instead of just smaller padding:
  - panel mode keeps the header stacked
  - slot summary + current-selection card stay stacked
  - the resource/defaults body stays single-column in panel mode
  - slot action rows stack vertically with full-width buttons in panel mode
- `ApplicationLaunchDefaultsFields.vue` now also understands panel presentation so the locked tool-execution block stops using a row layout that squeezes the content.
- `ApplicationImmersiveControlPanel.vue` now gives the panel more usable resize space:
  - minimum panel width increased to `420px`
  - default panel width increased to `560px`
  - max panel width increased to `960px`
  - minimum remaining canvas width preserved at `480px`
  - resize clamping now reacts to actual window resize events
- Reload / Exit moved into a dedicated footer outside the scrollable configure content so they remain visible while the user scrolls inside the panel.
- Configure/details containers were tightened with `min-w-0`, larger inner padding, and non-squeezing stacked layouts so content no longer degrades into character-by-character wrapping at realistic panel widths.

### Live Validation Performed

- Backend started locally:
  - `node dist/app.js --data-dir /Users/normy/.autobyteus/server-data --host 0.0.0.0 --port 8000`
- Frontend started locally:
  - `pnpm dev` in `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/autobyteus-web`
- Opened the live browser route with the browser tab tools:
  - `http://127.0.0.1:3000/applications/bundle-app__6170706c69636174696f6e2d6c6f63616c3a25324655736572732532466e6f726d792532466175746f6279746575735f6f72672532466175746f6279746575732d776f726b73706163652d73757065727265706f2532466170706c69636174696f6e7325324662726965662d73747564696f25324664697374253246696d706f727461626c652d7061636b616765__62726965662d73747564696f`
- Entered the immersive route, opened `Host Controls`, opened `Configure`, and validated the panel directly in the live browser.
- Exercised resize behavior in both directions:
  - widened panel to about `767px` live (`configure` content width about `734px`)
  - narrowed panel to the enforced minimum `420px` live (`configure` content width about `387px`)
- Verified in the live DOM/browser state that:
  - panel-mode setup header stayed stacked
  - slot header stayed stacked
  - slot body stayed single-column
  - tool-execution block stayed stacked
  - action footer remained pinned while the inner content scrolled (`footerPinned=true` after scrolling the inner panel content)
- Visual result: the configure surface remained readable and usable at both the widened and minimum panel widths, with no character-by-character broken wrapping and with Reload / Exit still visible.

### Screenshot Artifacts

- Wide immersive panel with Configure open: `/Users/normy/.autobyteus/browser-artifacts/853552-1776941872905.png`
- Minimum-width immersive panel with Configure still readable: `/Users/normy/.autobyteus/browser-artifacts/853552-1776941893668.png`


## Follow-up Local Fix — Hosted Brief Studio Business Flow

### What Was Wrong

- The real hosted Brief Studio business flow could create a brief and attach a drafting-team run, but the downstream team-member publication/projection path was not reliable enough across the new hosted ownership boundaries.
- Codex-hosted application launches also exposed coordinator/default-target and member-runtime context propagation gaps that direct non-application Codex usage did not surface.
- During investigation I temporarily added narrow debug logging to trace the hosted launch and team-member publication path, but those logs were only for local diagnosis and were removed after the issue was verified and fixed.

### What Changed In This Fix

- `application-orchestration-host-service.ts` now resolves team-member published artifacts through the binding-owned member memory path instead of widening public single-run authority into a mixed public/internal authority layer.
- `codex-team-manager.ts` now preserves the configured member runtime context that the hosted path needs, including member `workspaceId`, `memoryDir`, and application execution context, so team-member publication remains durable in the hosted Codex path.
- Brief Studio launch/prompt guidance was tightened so the team uses the researcher -> publish -> handoff -> writer -> publish sequence consistently, with `publish_artifact` receiving the exact absolute path returned by the write step.
- Temporary debug logging added during diagnosis was removed from:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/autobyteus-server-ts/src/application-orchestration/services/application-run-binding-launch-service.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/autobyteus-server-ts/src/application-orchestration/services/application-orchestration-host-service.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/autobyteus-server-ts/src/agent-team-execution/backends/codex/codex-team-manager.ts`
- The local backend was restarted without raw-event debug environment flags after cleanup so normal logs are no longer flooded by the temporary tracing.

### Frontend-Driven Live Recheck

- Trigger path used for the final recheck: real hosted frontend route `/applications/:id` -> host launch gate -> `Enter application` -> `Create brief` -> `Generate draft`.
- Fresh frontend-created brief:
  - `brief-21ec754e-8157-4e99-8bde-6a6def5b9f66`
  - title `HALO Codex Recheck 2026-04-23T17-04-21-060Z`
- Live result:
  - researcher artifact published
  - writer artifact published
  - application emitted `brief.ready_for_review`
  - brief transitioned to `in_review`
- Recorded evidence:
  - result JSON: `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/.local/hosted-application-lifecycle-ownership-local-fix-round14/host-route-codex-rerun-results.json`
  - screenshots:
    - `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/.local/hosted-application-lifecycle-ownership-local-fix-round14/screenshots/round14-host-gate.png`
    - `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/.local/hosted-application-lifecycle-ownership-local-fix-round14/screenshots/round14-before-create.png`
    - `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/.local/hosted-application-lifecycle-ownership-local-fix-round14/screenshots/round14-created-brief.png`
    - `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/.local/hosted-application-lifecycle-ownership-local-fix-round14/screenshots/round14-after-generate-click.png`
    - `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/.local/hosted-application-lifecycle-ownership-local-fix-round14/screenshots/round14-final.png`



## Follow-up Local Fix — TeamRunService Source-Pressure Split

### What Was Wrong

- `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts` had grown to 573 effective non-empty lines after absorbing nested team-definition traversal, coordinator leaf resolution, restore-context rebuilding, and run-metadata mapping on top of its normal orchestration role.
- That file-size growth crossed the implementation guardrail and made the service own both orchestration and multiple mapping/traversal concerns that could live in tighter dedicated owners.

### What Changed In This Fix

- Extracted nested team-definition traversal and coordinator leaf-resolution into:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/autobyteus-server-ts/src/agent-team-execution/services/team-definition-traversal-service.ts`
- Extracted restore-context rebuilding plus run-metadata mapping into:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/autobyteus-server-ts/src/agent-team-execution/services/team-run-metadata-mapper.ts`
- Reduced `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts` to the orchestration boundary that now delegates those responsibilities to the new owner files.
- Post-split source pressure:
  - `team-run-service.ts` now measures `367` effective non-empty lines locally.
- The split is intentionally behavioral-noop relative to the already-fixed hosted business flow: create, restore, metadata refresh, coordinator resolution, and hosted artifact projection paths still use the same runtime behavior, but through dedicated files.


## Key Files Or Areas

- `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/autobyteus-application-sdk-contracts/src/application-iframe-contract.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/autobyteus-application-sdk-contracts/src/index.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/autobyteus-application-frontend-sdk/src/application-client.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/autobyteus-application-frontend-sdk/src/default-startup-screen.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/autobyteus-application-frontend-sdk/src/hosted-application-startup.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/autobyteus-application-frontend-sdk/src/index.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/autobyteus-application-frontend-sdk/tests/hosted-application-startup.test.mjs`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/autobyteus-application-frontend-sdk/tests/hosted-application-startup.type-test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/autobyteus-application-frontend-sdk/tsconfig.type-tests.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/autobyteus-application-sdk-contracts/tests/application-iframe-contract.test.mjs`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/autobyteus-web/components/applications/ApplicationIframeHost.vue`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/autobyteus-web/components/applications/ApplicationSurface.vue`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/autobyteus-web/utils/application/applicationAssetUrl.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/autobyteus-web/utils/application/applicationHostTransport.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/autobyteus-web/utils/application/applicationLaunchDescriptor.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/autobyteus-server-ts/src/agent-team-execution/services/team-definition-traversal-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/autobyteus-server-ts/src/agent-team-execution/services/team-run-metadata-mapper.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/applications/brief-studio/frontend-src/*`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/applications/brief-studio/scripts/build-package.mjs`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/applications/socratic-math-teacher/frontend-src/*`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/applications/socratic-math-teacher/scripts/build-package.mjs`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/autobyteus-web/docs/application-bundle-iframe-contract-v1.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/autobyteus-web/docs/applications.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/autobyteus-application-frontend-sdk/README.md`

## Important Assumptions

- The reviewed product policy stands: raw bundle entry without valid host launch context is unsupported by default in this ticket.
- Neutral framework-owned startup copy/styling in the frontend SDK is acceptable for the shared startup surface.
- External/imported bundles still on the manual startup pattern remain follow-up migration work rather than an in-scope compatibility target.

## Known Risks

- External/imported bundles that still own manual startup are not migrated by this change and will not automatically gain the new startup boundary until they adopt the SDK pattern.
- The host still reveals on bootstrap delivery by design, so downstream API/E2E should explicitly verify the bundle-local `starting_app` / `startup_failed` behavior after delivery with a controlled failing bundle callback.
- The repo diff is large because the sample package builds intentionally resynced tracked `ui/`, vendored SDK + shared-contract runtime, and importable-package outputs after the source changes.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes:
  - No changed source implementation file was left above 500 effective lines.
  - The overall repo diff is large because tracked generated/runtime outputs were intentionally regenerated after the source split; the source responsibilities themselves were kept split and bounded.

## Environment Or Dependency Notes

- This worktree did not have installed workspace dependencies initially, so `pnpm install` was run at `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership` before local checks.
- `autobyteus-web` required `nuxi prepare` once in this fresh worktree so `.nuxt/tsconfig.json` existed before running the targeted Vitest checks.
- `autobyteus-web/package.json` now explicitly depends on `@autobyteus/application-sdk-contracts` and `pnpm-lock.yaml` was refreshed by the workspace install.
- The sample package build scripts now enforce a self-contained browser-module boundary by failing on bare shipped specifiers inside `ui/`.

## Local Implementation Checks Run

Record only implementation-scoped checks here, such as build, typecheck, unit tests, and narrow integration checks around the changed code.
Do not stand up API/E2E validation environments or treat that work as part of this section.
Do not report API, E2E, or broader executable validation as passed in this artifact.

- `pnpm install` at `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership` ✅
- `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/autobyteus-application-sdk-contracts test` ✅
- `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/autobyteus-application-frontend-sdk test` ✅
- `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/autobyteus-web exec nuxi prepare` ✅
- `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/autobyteus-web test:nuxt --run components/applications/__tests__/ApplicationIframeHost.spec.ts components/applications/__tests__/ApplicationSurface.spec.ts utils/application/__tests__/applicationAssetUrl.spec.ts` ✅
- `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/autobyteus-web test:nuxt --run components/applications/__tests__/ApplicationImmersiveControlPanel.spec.ts components/applications/__tests__/ApplicationLaunchSetupPanel.spec.ts components/applications/__tests__/ApplicationLaunchDefaultsFields.spec.ts` ✅
- `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/applications/brief-studio build` ✅
- `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/applications/socratic-math-teacher build` ✅
- `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/autobyteus-server-ts test --run tests/unit/application-orchestration/application-orchestration-host-service.test.ts tests/unit/application-orchestration/application-published-artifact-relay-service.test.ts tests/unit/services/published-artifacts/published-artifact-publication-service.test.ts tests/unit/agent-tools/published-artifacts/publish-artifact-tool.test.ts tests/unit/agent-team-execution/team-run-service.test.ts tests/unit/agent-team-execution/team-run.test.ts tests/unit/agent-team-execution/team-run-runtime-context-support.test.ts tests/integration/application-backend/brief-studio-team-config.integration.test.ts tests/integration/agent-team-execution/team-run-service.integration.test.ts tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts tests/integration/agent-team-execution/codex-team-run-backend-factory.integration.test.ts` ✅ (11 files / 55 tests passed; rerun after the CR-HALO-004 service split)
- `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/autobyteus-server-ts build` ✅ (rerun after the CR-HALO-004 service split)
- `rg -n "@autobyteus/application-sdk-contracts" applications/brief-studio/ui applications/brief-studio/dist/importable-package/applications/brief-studio/ui applications/socratic-math-teacher/ui applications/socratic-math-teacher/dist/importable-package/applications/socratic-math-teacher/ui -g '*.js' -g '*.d.ts'` returned no matches after the rebuilt vendor outputs ✅
- Earlier `node --input-type=module` smoke check against built `startHostedApplication(...)` for unsupported-entry and successful handoff scenarios still remains valid context; the durable package tests now cover unsupported-entry, success, post-delivery failure, and mismatched bootstrap rejection ✅
- Live browser validation with the running backend + frontend, immersive Brief Studio route, Host Controls open, Configure expanded, resize exercised wide/min, and screenshots captured with browser tools ✅

## Downstream Validation Hints / Suggested Scenarios

- Supported host route:
  - launch `/applications/:id`
  - confirm `ApplicationSurface.vue` still keeps the iframe visually hidden until bootstrap delivery
  - confirm the bundle-local startup boundary takes over only after delivery
- Raw bundle entry:
  - open the bundled `ui/index.html` asset directly without launch hints
  - confirm the framework-owned unsupported-entry surface renders instead of app-owned homepage/status UI
- Startup failure containment:
  - use a controlled bundle or temporary failing callback so bootstrap is delivered successfully but the mount callback throws/rejects
  - confirm the bundle shows the framework-owned startup-failure surface and business UI ownership never begins
- Sample app regression checks:
  - Brief Studio loads briefs and reacts to notifications after the new bootstrapped handoff
  - Socratic Math Teacher loads lessons, renders metadata, and continues notification updates after the new bootstrapped handoff

## API / E2E / Executable Validation Still Required

- Full supported `/applications/:id` API/E2E coverage for the reviewed host launch + bootstrap journey
- Executable validation of direct/raw bundle entry unsupported behavior in a real browser/app shell environment
- Executable validation of post-delivery bundle-local startup failure behavior (`starting_app` -> `startup_failed`) in a realistic hosted bundle run
- Regression coverage that the sample app bundles still package/import/run correctly through the normal product surface, not only through local source/build checks
