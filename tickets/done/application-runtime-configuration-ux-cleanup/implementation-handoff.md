# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-runtime-configuration-ux-cleanup/tickets/in-progress/application-runtime-configuration-ux-cleanup/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-runtime-configuration-ux-cleanup/tickets/in-progress/application-runtime-configuration-ux-cleanup/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-runtime-configuration-ux-cleanup/tickets/in-progress/application-runtime-configuration-ux-cleanup/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-runtime-configuration-ux-cleanup/tickets/in-progress/application-runtime-configuration-ux-cleanup/design-review-report.md`
- Review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-runtime-configuration-ux-cleanup/tickets/in-progress/application-runtime-configuration-ux-cleanup/review-report.md`
- Validation report: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-runtime-configuration-ux-cleanup/tickets/in-progress/application-runtime-configuration-ux-cleanup/api-e2e-report.md`

## What Changed

- Replaced the application runtime-config contract from flat `launchDefaults` / `supportedLaunchDefaults` to kind-aware `launchProfile` / `supportedLaunchConfig` across SDK contracts, manifests, server persistence, REST payloads, frontend queries, and app-backend launch mapping.
- Updated bundle manifests and app-backend services for `brief-studio` and `socratic-math-teacher` to consume the new launch-profile shape, including team member overrides and workspace-root propagation.
- Tightened backend configuration readback so slot-local invalid saved state is returned as recoverable `ApplicationResourceConfigurationView` data instead of failing the entire panel load.
- Added a dedicated backend helper file (`application-resource-configuration-launch-profile.ts`) to own launch-profile normalization, migration, and legacy `launch_defaults_json` translation; this kept the touched service below the 500 non-empty-line guardrail.
- Made friendly application/runtime presentation the default UI path: catalog cards and shell surfaces now hide technical metadata unless the user explicitly expands technical details.
- Replaced the old application setup field stack with application-owned setup editors under `autobyteus-web/components/applications/setup/` instead of reusing standalone `AgentRunConfigForm.vue` / `TeamRunConfigForm.vue` wrappers.
- Added app-specific launch-profile utilities and gate-state helpers (`applicationLaunchProfile.ts`, `applicationSetupGate.ts`, `teamLaunchReadinessCore.ts`) plus guided workspace-root selection.
- Removed obsolete replaced paths: `ApplicationLaunchDefaultsFields.vue`, its test, and `applicationLaunchSetup.ts`.
- Added/updated targeted tests for:
  - standalone run-form regression coverage (`AgentRunConfigForm.spec.ts`, `TeamRunConfigForm.spec.ts`),
  - stale team-profile repair path (`ApplicationTeamLaunchProfileEditor.spec.ts`),
  - contract migration + recoverable invalid saved state (`application-resource-configuration-service.test.ts`),
  - deterministic bundled/shared resource-name fallback (`application-runtime-resource-resolver.test.ts`),
  - updated application shell/panel/store/surface behavior.
- Applied the code-review local fix for `LF-APP-001`:
  - shared backend team launch expansion now accepts `defaults: null` when each member resolves explicitly,
  - app launch services no longer reintroduce a flat global-default-model requirement before calling the shared helper,
  - backend save validation now rejects team profiles that still leave any member without an effective `llmModelIdentifier`,
  - direct regression tests now cover both `defaults: null` per-member launch success and rejected unresolved inherited-model saves.
- Applied the code-review local fix for `LF-APP-002`:
  - `sendGatewayError(...)` in `autobyteus-server-ts/src/api/rest/application-backends.ts` now classifies `LaunchProfileValidationError` directly as HTTP 400 instead of relying on brittle message-text heuristics,
  - added a route-level regression that submits the unresolved inherited-model save payload and asserts the REST client-validation response status/body,
  - refreshed the existing REST-prefix unit expectation to the current `launchInstanceId` request-context shape while rechecking the touched route module.
- Applied the API/E2E local fix for packaged bundled-app bootstrap:
  - both bundled app packagers now sync the full backend SDK vendor payload (`index.js`, `launch-profile.js`, and maps) into the packaged backend vendor directory instead of copying only the SDK entry file,
  - emitted backend files now rewrite `@autobyteus/application-backend-sdk` imports relative to each packaged module so nested `services/` files resolve `../vendor/application-backend-sdk.js` correctly,
  - both packagers now assert every packaged backend module's relative imports resolve during `build-package`, so missing vendored siblings or broken nested import rewrites fail the build before API/E2E.
- Regenerated tracked package/build artifacts for the shared contracts/backend SDK and both bundled applications so the repo now reflects the new runtime-config contract end to end.

## Key Files Or Areas

- Contracts and shared SDK
  - `autobyteus-application-sdk-contracts/src/manifests.ts`
  - `autobyteus-application-sdk-contracts/src/runtime-resources.ts`
  - `autobyteus-application-backend-sdk/src/launch-profile.ts`
  - `autobyteus-application-backend-sdk/src/index.ts`
- Bundled application manifests, packaging, and backend launch mapping
  - `applications/brief-studio/application.json`
  - `applications/brief-studio/scripts/build-package.mjs`
  - `applications/brief-studio/backend-src/services/brief-run-launch-service.ts`
  - `applications/socratic-math-teacher/application.json`
  - `applications/socratic-math-teacher/scripts/build-package.mjs`
  - `applications/socratic-math-teacher/backend-src/services/lesson-runtime-service.ts`
- Server configuration/readback path
  - `autobyteus-server-ts/src/api/rest/application-backends.ts`
  - `autobyteus-server-ts/src/application-bundles/utils/application-manifest.ts`
  - `autobyteus-server-ts/src/application-orchestration/services/application-resource-configuration-service.ts`
  - `autobyteus-server-ts/src/application-orchestration/services/application-resource-configuration-launch-profile.ts`
  - `autobyteus-server-ts/src/application-orchestration/services/application-runtime-resource-resolver.ts`
  - `autobyteus-server-ts/src/application-orchestration/stores/application-resource-configuration-store.ts`
- Frontend presentation/setup flow
  - `autobyteus-web/components/applications/ApplicationCard.vue`
  - `autobyteus-web/components/applications/ApplicationLaunchSetupPanel.vue`
  - `autobyteus-web/components/applications/ApplicationShell.vue`
  - `autobyteus-web/components/applications/ApplicationSurface.vue`
  - `autobyteus-web/components/applications/setup/ApplicationAgentLaunchProfileEditor.vue`
  - `autobyteus-web/components/applications/setup/ApplicationResourceSlotEditor.vue`
  - `autobyteus-web/components/applications/setup/ApplicationTeamLaunchProfileEditor.vue`
  - `autobyteus-web/components/applications/setup/ApplicationTeamMemberOverrideItem.vue`
  - `autobyteus-web/components/applications/setup/ApplicationWorkspaceRootSelector.vue`
  - `autobyteus-web/utils/application/applicationLaunchProfile.ts`
  - `autobyteus-web/utils/application/applicationSetupGate.ts`
  - `autobyteus-web/utils/teamLaunchReadinessCore.ts`
  - `autobyteus-web/graphql/queries/applicationQueries.ts`
  - `autobyteus-web/stores/applicationStore.ts`
- Directly relevant tests
  - `autobyteus-server-ts/tests/unit/api/rest/application-backends-prefix.test.ts`
  - `autobyteus-server-ts/tests/unit/api/rest/application-backends-resource-configurations.test.ts`
  - `autobyteus-server-ts/tests/unit/application-orchestration/application-resource-configuration-service.test.ts`
  - `autobyteus-server-ts/tests/unit/application-orchestration/application-runtime-resource-resolver.test.ts`
  - `autobyteus-web/components/applications/setup/__tests__/ApplicationTeamLaunchProfileEditor.spec.ts`
  - `autobyteus-web/components/workspace/config/__tests__/AgentRunConfigForm.spec.ts`
  - `autobyteus-web/components/workspace/config/__tests__/TeamRunConfigForm.spec.ts`

## Important Assumptions

- The application-managed persisted contract remains intentionally narrower than the downstream runtime launch contract: only host-editable runtime/model/workspace-root settings are stored in `launchProfile`.
- Team stale-profile repair is keyed by the canonical tuple `(memberRouteKey, agentDefinitionId)`; same route key with a changed agent definition is treated as stale and dropped.
- Friendly resource-name fallback stays deterministic when definition lookup is missing:
  - bundled resources fall back to `localId || definitionId`,
  - shared resources fall back to `definition.name || definition.id`.
- Technical metadata (`packageId`, `localApplicationId`, bundle resource mapping, writable source, launch diagnostics) is still available for diagnostics/bootstrapping, but only behind the explicit technical-details affordance in the normal UX.

## Known Risks

- `pnpm -C autobyteus-server-ts typecheck` still fails with repo-baseline `TS6059` errors because `autobyteus-server-ts/tsconfig.json` includes `tests/**` outside `rootDir: src`; this does not appear to be introduced by this ticket, but it prevents a clean server typecheck signal.
- The change touches tracked generated artifacts (`dist/`, bundled importable-package outputs, vendored d.ts/js outputs). Review should treat those as intentional contract/build sync outputs, not accidental churn.
- API/E2E coverage is still needed to re-run live packaged-app bootstrap plus the saved-config migration and pre-entry/immersive runtime behavior against a live app host after the packaging fix.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes:
  - `autobyteus-server-ts/src/application-orchestration/services/application-resource-configuration-service.ts` was split so the touched service now sits at 309 non-empty lines.
  - Larger touched UI owners remain under the non-empty-line guardrail (`ApplicationShell.vue` 480, `ApplicationLaunchSetupPanel.vue` 446).

## Environment Or Dependency Notes

- `pnpm install --frozen-lockfile` succeeded at the worktree root.
- Nuxt tests required one local prep step before Vitest: `pnpm -C autobyteus-web exec nuxi prepare`.
- Server typecheck automatically rebuilt shared workspace packages via the existing `pretypecheck` hook.

## Local Implementation Checks Run

Record only implementation-scoped checks here, such as build, typecheck, unit tests, and narrow integration checks around the changed code.
Do not stand up API/E2E validation environments or treat that work as part of this section.
Do not report API, E2E, or broader executable validation as passed in this artifact.

- `pnpm install --frozen-lockfile` ✅
- `pnpm -C autobyteus-application-sdk-contracts build` ✅
- `pnpm -C autobyteus-application-backend-sdk build` ✅
- `pnpm -C applications/brief-studio build` ✅
- `pnpm -C applications/socratic-math-teacher build` ✅
- `pnpm -C autobyteus-server-ts build` ✅
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/application-orchestration/application-resource-configuration-service.test.ts tests/unit/application-orchestration/application-runtime-resource-resolver.test.ts tests/unit/application-bundles/file-application-bundle-provider.test.ts tests/unit/application-backend/app-owned-binding-intent-correlation.test.ts` ✅ (`23` tests passed)
- `pnpm -C autobyteus-web exec nuxi prepare` ✅
- `pnpm -C autobyteus-web exec vitest run components/applications/__tests__/ApplicationCard.spec.ts components/applications/__tests__/ApplicationLaunchSetupPanel.spec.ts components/applications/__tests__/ApplicationShell.spec.ts components/applications/__tests__/ApplicationSurface.spec.ts components/applications/setup/__tests__/ApplicationTeamLaunchProfileEditor.spec.ts stores/__tests__/applicationStore.spec.ts components/workspace/config/__tests__/AgentRunConfigForm.spec.ts components/workspace/config/__tests__/TeamRunConfigForm.spec.ts` ✅ (`26` tests passed)
- `pnpm -C autobyteus-application-backend-sdk build` ✅ (rerun after code-review local fix so app-source imports use the updated shared launch helper)
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/application-orchestration/application-resource-configuration-service.test.ts tests/unit/application-backend/app-owned-binding-intent-correlation.test.ts tests/unit/application-orchestration/application-runtime-resource-resolver.test.ts` ✅ (`19` tests passed, including the new `defaults: null` per-member launch and unresolved-save rejection regressions)
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/api/rest/application-backends-prefix.test.ts tests/unit/api/rest/application-backends-resource-configurations.test.ts tests/unit/application-orchestration/application-resource-configuration-service.test.ts tests/unit/application-backend/app-owned-binding-intent-correlation.test.ts tests/unit/application-orchestration/application-runtime-resource-resolver.test.ts` ✅ (`22` tests passed, including the new REST invalid-save -> HTTP 400 regression)
- `pnpm -C autobyteus-web exec vitest run components/applications/__tests__/ApplicationLaunchSetupPanel.spec.ts components/applications/setup/__tests__/ApplicationTeamLaunchProfileEditor.spec.ts components/workspace/config/__tests__/AgentRunConfigForm.spec.ts components/workspace/config/__tests__/TeamRunConfigForm.spec.ts` ✅ (`11` tests passed)
- `pnpm -C applications/brief-studio build` ✅
- `pnpm -C applications/socratic-math-teacher build` ✅
- `pnpm -C applications/brief-studio build` ✅ (rerun after packaged bundled-app bootstrap fix; `build-package` now validates packaged backend relative imports)
- `pnpm -C applications/socratic-math-teacher build` ✅ (rerun after packaged bundled-app bootstrap fix; `build-package` now validates packaged backend relative imports)
- `node --input-type=module <<'NODE' ... import(pathToFileURL(entry).href) ... NODE` ✅ (direct import of both packaged backend `entry.mjs` files after rebuild)
- `pnpm -C autobyteus-server-ts typecheck` ⚠️ repo-baseline failure: `TS6059` because test files are included outside `rootDir: src`

## Downstream Validation Hints / Suggested Scenarios

- Verify a host-managed application slot backed by a bundled team resource can save defaults + per-member overrides, exit the route, and re-open with the same effective state.
- Seed a persisted legacy `launch_defaults_json` record and confirm the setup panel reads it as `launchProfile`, then re-saves in the new contract shape.
- Seed a stale saved team profile where:
  - one member is removed,
  - one member keeps the same route key but gets a different `agentDefinitionId`,
  - one member is unchanged,
  and confirm only the exact tuple match is preserved.
- Seed a saved team profile with `defaults: null` and explicit per-member runtime/model overrides, then verify both bundled app launch services start successfully without requiring an extra global default model.
- Re-run live `POST /rest/applications/:id/backend/ensure-ready` for both packaged applications to confirm the repaired vendor copy + nested relative-import rewrite now allow backend bootstrap before immersive launch.
- Attempt to save a team profile where one member still inherits a missing model and confirm the backend rejects the save before persistence.
- Attempt the same unresolved inherited-model save through the REST route and confirm the client receives HTTP 400 (not 500) with the validation detail.
- Verify deterministic naming/readback when bundled/shared resource definitions cannot provide a friendly display name directly.
- Recheck standalone `AgentRunConfigForm` / `TeamRunConfigForm` flows in the live app to confirm application-specific changes did not regress normal runtime/model/workspace fields.
- Exercise the setup-first route and immersive configure panel as the same authoritative owner: blocked entry before save, successful entry after save, blocked reload when setup becomes invalid again.

## API / E2E / Executable Validation Still Required

- REST/API validation for `GET /applications/:applicationId/resource-configurations` and `PUT /applications/:applicationId/resource-configurations/:slotKey` with valid, missing, stale, and legacy-migrated saved configuration.
- Executable validation for the two touched bundled applications (`brief-studio`, `socratic-math-teacher`) using the new launch-profile mapping and the repaired packaged-backend bootstrap path.
- UI/E2E validation for:
  - setup-page technical-details hiding,
  - immersive technical-details toggle,
  - pre-entry gating,
  - immersive reload/exit behavior,
  - application surface bootstrap after the new detail-model split.
