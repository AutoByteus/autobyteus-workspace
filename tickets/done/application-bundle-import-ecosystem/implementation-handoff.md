# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-import-ecosystem/tickets/done/application-bundle-import-ecosystem/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-import-ecosystem/tickets/done/application-bundle-import-ecosystem/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-import-ecosystem/tickets/done/application-bundle-import-ecosystem/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-import-ecosystem/tickets/done/application-bundle-import-ecosystem/design-review-report.md`

## What Changed

- Added a backend-owned application-session subsystem under `autobyteus-server-ts/src/application-sessions` covering `create / bind / query / terminate / send-input`, active-session indexing by application id, session snapshot streaming, publication validation entry, and family-tight retained projection updates.
- Added the route-authoritative `applicationSessionBinding(applicationId, requestedSessionId?)` GraphQL contract plus the application-session websocket stream route so `/applications/[id]` refresh/reconnect now reattaches through backend session authority instead of frontend memory.
- Introduced family-specific retained projection state for application delivery + member artifacts + member progress (`delivery.current`, `artifactsByKey`, `progressByKey`) and wired the new `publish_application_event` tool to project validated runtime publications into that state.
- Hardened publication v1 validation so the backend now rejects unsupported `publicationFamily` values, disallowed family fields, and `metadata` escape hatches before retained-state projection; the runtime-facing `publish_application_event` tool path now forwards the declared family verbatim instead of coercing unknown values to `PROGRESS`.
- Reworked the frontend application page into a thin route entry + `ApplicationShell` + `ApplicationSurface` + native `ApplicationExecutionWorkspace`, with backend-owned route binding, session-query canonicalization, and cached active-session indexing driven only from authoritative backend responses.
- Expanded the iframe bootstrap payload to send application-session transport metadata (`graphqlUrl`, `restBaseUrl`, `websocketUrl`, `sessionStreamUrl`) and updated the built-in Socratic bundle placeholder to display the revised transport contract.
- Implemented backend application-bundle discovery, catalog, asset serving, and package-refresh integration under `autobyteus-server-ts/src/application-bundles`.
- Revised the application catalog topology so the backend now surfaces transport-neutral asset paths only (`iconAssetPath`, `entryHtmlAssetPath`) instead of host-usable iframe/icon URLs.
- Added application-owned agent/team discovery + persistence plumbing, including provenance fields, canonical ids, default launch config surfacing, and the shared same-bundle integrity validator reused by discovery/import validation and `AgentTeamDefinitionService` update persistence.
- Reworked frontend Applications catalog/detail flow around the generic host shell, `applicationSessionStore`, the shared `applicationAssetUrl.ts` resolver, the exact topology-aware v1 iframe contract, and the shared host/bootstrap handshake.
- Updated native Agents/Teams surfaces to expose application-owned provenance, limit destructive/sync behaviors for non-shared definitions, and constrain app-owned team member selection to same-owner definitions as non-authoritative UX guidance.
- Applied code-review local fixes so same-session package import/remove now invalidates and reloads the Applications / Agents / Agent Teams catalogs instead of leaving stale in-memory results until manual reload.
- Extended the native agent create/edit workflow to author, validate, persist, and round-trip `defaultLaunchConfig`, including direct launch defaults and application-launched defaults.
- Split the oversized owner files called out in review into focused helpers/components (`agent-definition-config.ts`, `agent-definition-source-paths.ts`, `team-definition-config.ts`, `team-definition-source-paths.ts`, `applicationLaunch.ts`, `AgentDefaultLaunchConfigFields.vue`) so the changed source implementation files fall back under the hard size limit without introducing compatibility wrappers.
- Split `ApplicationSessionService` responsibilities into focused helpers (`application-session-launch-builder.ts`, `application-publication-validator.ts`) so session creation/provenance/publication behavior stays authoritative in the service while the file now sits at 384 effective non-empty lines, below the 500-line hard limit.
- Migrated the built-in Socratic Math Teacher application to the new bundle format under `autobyteus-server-ts/applications/socratic-math-teacher/` with static `ui/` assets plus embedded app-owned runtime definitions and the revised topology-aware iframe bootstrap behavior.
- Removed legacy application-specific runtime paths on both backend and frontend (`application-service`, hardcoded Socratic Vue app path, application run/profile/context stores, old app GraphQL mutation path, obsolete tests).
- Added executable regression coverage for the packaged topology boundary so backend-served iframe assets are resolved from the bound REST base and the host validates bootstrap against the resolved iframe origin instead of assuming same-origin with the host shell.
- Added the backend-owned runtime Applications capability boundary (`ApplicationCapabilityService`) so `ENABLE_APPLICATIONS` is now initialized once from current bundle discovery when absent, then persists as explicit bound-node runtime authority with no frontend build-flag fallback.
- Added the frontend `applicationsCapabilityStore`, capability GraphQL query/mutation plumbing, a first-class Settings toggle card, and runtime gating for sidebar visibility, `/applications` route access, and stale Applications catalog clearing across capability / bound-node changes.
- Removed the unreachable `activeSection === ''` empty-state branch from `autobyteus-web/pages/settings.vue` so the touched settings page no longer fails targeted typecheck with TS2367 after the round-7 capability changes.
- Added bound-node revision guards to `applicationStore` catalog/detail fetches so late old-node responses are discarded instead of repopulating stale application data after `bindNodeContext()` switches, and added durable in-flight catalog/detail switch regressions for that behavior.

## Key Files Or Areas

- Backend application-session subsystem
  - `autobyteus-server-ts/src/application-sessions/domain/models.ts`
  - `autobyteus-server-ts/src/application-sessions/services/application-session-service.ts`
  - `autobyteus-server-ts/src/application-sessions/services/application-session-launch-builder.ts`
  - `autobyteus-server-ts/src/application-sessions/services/application-publication-validator.ts`
  - `autobyteus-server-ts/src/application-sessions/services/application-publication-projector.ts`
  - `autobyteus-server-ts/src/application-sessions/streaming/application-session-stream-service.ts`
  - `autobyteus-server-ts/src/application-sessions/streaming/application-session-stream-handler.ts`
  - `autobyteus-server-ts/src/application-sessions/tools/publish-application-event-tool.ts`
  - `autobyteus-server-ts/src/application-sessions/utils/application-producer-provenance.ts`
  - `autobyteus-server-ts/src/api/graphql/types/application-session.ts`
  - `autobyteus-server-ts/src/api/websocket/application-session.ts`
- Backend application-session regressions
  - `autobyteus-server-ts/tests/unit/application-sessions/application-session-service.test.ts`
  - `autobyteus-server-ts/tests/unit/application-sessions/application-publication-projector.test.ts`
  - `autobyteus-server-ts/tests/unit/application-sessions/publish-application-event-tool.test.ts`
- Backend application-bundle subsystem
  - `autobyteus-server-ts/src/application-bundles/domain/models.ts`
  - `autobyteus-server-ts/src/application-bundles/providers/file-application-bundle-provider.ts`
  - `autobyteus-server-ts/src/application-bundles/services/application-bundle-service.ts`
  - `autobyteus-server-ts/src/application-bundles/utils/application-manifest.ts`
  - `autobyteus-server-ts/src/application-bundles/utils/application-bundle-identity.ts`
  - `autobyteus-server-ts/src/api/rest/application-bundles.ts`
  - `autobyteus-server-ts/src/api/graphql/types/application.ts`
- Backend runtime Applications capability
  - `autobyteus-server-ts/src/application-capability/domain/models.ts`
  - `autobyteus-server-ts/src/application-capability/services/application-capability-service.ts`
  - `autobyteus-server-ts/src/api/graphql/types/application-capability.ts`
  - `autobyteus-server-ts/src/services/server-settings-service.ts`
  - `autobyteus-server-ts/tests/unit/application-capability/application-capability-service.test.ts`
  - `autobyteus-server-ts/tests/unit/services/server-settings-service.test.ts`
- Backend app-owned definition support / invariant enforcement
  - `autobyteus-server-ts/src/agent-definition/providers/agent-definition-config.ts`
  - `autobyteus-server-ts/src/agent-definition/providers/agent-definition-source-paths.ts`
  - `autobyteus-server-ts/src/agent-definition/providers/application-owned-agent-source.ts`
  - `autobyteus-server-ts/src/agent-team-definition/providers/application-owned-team-source.ts`
  - `autobyteus-server-ts/src/agent-team-definition/providers/team-definition-config.ts`
  - `autobyteus-server-ts/src/agent-team-definition/providers/team-definition-source-paths.ts`
  - `autobyteus-server-ts/src/agent-team-definition/utils/application-owned-team-integrity-validator.ts`
  - `autobyteus-server-ts/src/agent-team-definition/utils/application-owned-team-ref-normalizer.ts`
  - `autobyteus-server-ts/src/agent-team-definition/services/agent-team-definition-service.ts`
  - `autobyteus-server-ts/src/agent-definition/providers/file-agent-definition-provider.ts`
  - `autobyteus-server-ts/src/agent-team-definition/providers/file-agent-team-definition-provider.ts`
  - `autobyteus-server-ts/tests/integration/agent-definition/md-centric-provider.integration.test.ts`
- Built-in migrated bundle
  - `autobyteus-server-ts/applications/socratic-math-teacher/application.json`
  - `autobyteus-server-ts/applications/socratic-math-teacher/ui/index.html`
  - `autobyteus-server-ts/applications/socratic-math-teacher/agents/socratic-math-tutor/*`
  - `autobyteus-server-ts/applications/socratic-math-teacher/agent-teams/socratic-math-team/*`
- Frontend application host + contract
  - `autobyteus-web/components/applications/ApplicationShell.vue`
  - `autobyteus-web/components/applications/ApplicationSurface.vue`
  - `autobyteus-web/components/applications/execution/ApplicationExecutionWorkspace.vue`
  - `autobyteus-web/stores/applicationStore.ts`
  - `autobyteus-web/stores/applicationSessionStore.ts`
  - `autobyteus-web/stores/applicationPageStore.ts`
  - `autobyteus-web/utils/application/applicationLaunch.ts`
  - `autobyteus-web/types/application/ApplicationSession.ts`
  - `autobyteus-web/types/application/ApplicationIframeContract.ts`
  - `autobyteus-web/utils/application/applicationSessionTransport.ts`
  - `autobyteus-web/utils/application/applicationAssetUrl.ts`
  - `autobyteus-web/components/applications/ApplicationIframeHost.vue`
  - `autobyteus-web/components/applications/ApplicationCard.vue`
  - `autobyteus-web/components/applications/ApplicationLaunchConfigModal.vue`
  - `autobyteus-web/pages/applications/[id].vue`
  - `autobyteus-web/pages/applications/index.vue`
  - `autobyteus-web/docs/application-bundle-iframe-contract-v1.md`
- Frontend runtime Applications capability gating
  - `autobyteus-web/stores/applicationsCapabilityStore.ts`
  - `autobyteus-web/graphql/queries/applicationCapabilityQueries.ts`
  - `autobyteus-web/graphql/mutations/applicationCapabilityMutations.ts`
  - `autobyteus-web/components/settings/ApplicationsFeatureToggleCard.vue`
  - `autobyteus-web/components/AppLeftPanel.vue`
  - `autobyteus-web/components/layout/LeftSidebarStrip.vue`
  - `autobyteus-web/middleware/feature-flags.global.ts`
  - `autobyteus-web/pages/settings.vue`
  - `autobyteus-web/tests/stores/serverSettingsStore.test.ts`
  - `autobyteus-web/stores/__tests__/applicationsCapabilityStore.spec.ts`
  - `autobyteus-web/components/settings/__tests__/ApplicationsFeatureToggleCard.spec.ts`
  - `autobyteus-web/stores/__tests__/applicationStore.spec.ts`
- Executable topology regressions
  - `autobyteus-web/utils/application/__tests__/applicationAssetUrl.spec.ts`
  - `autobyteus-web/utils/application/__tests__/applicationSessionTransport.spec.ts`
  - `autobyteus-web/components/applications/__tests__/ApplicationIframeHost.spec.ts`
  - `autobyteus-web/stores/__tests__/applicationSessionStore.spec.ts`
- Frontend provenance / app-owned editing UX
  - `autobyteus-web/stores/agentDefinitionStore.ts`
  - `autobyteus-web/stores/agentPackagesStore.ts`
  - `autobyteus-web/stores/agentTeamDefinitionStore.ts`
  - `autobyteus-web/stores/__tests__/agentPackagesStore.spec.ts`
  - `autobyteus-web/stores/__tests__/agentDefinitionStore.spec.ts`
  - `autobyteus-web/utils/definitionOwnership.ts`
  - `autobyteus-web/components/agents/AgentCard.vue`
  - `autobyteus-web/components/agents/AgentDefaultLaunchConfigFields.vue`
  - `autobyteus-web/components/agents/AgentDetail.vue`
  - `autobyteus-web/components/agents/AgentEdit.vue`
  - `autobyteus-web/components/agents/__tests__/AgentDefinitionForm.spec.ts`
  - `autobyteus-web/components/agentTeams/AgentTeamCard.vue`
  - `autobyteus-web/components/agentTeams/AgentTeamDetail.vue`
  - `autobyteus-web/components/agentTeams/AgentTeamDefinitionForm.vue`
  - `autobyteus-web/components/agentTeams/form/useAgentTeamDefinitionFormState.ts`

## Important Assumptions

- The built-in Socratic Math Teacher migration in this slice prioritizes the new bundle contract, catalog visibility, launchability, and exact iframe bootstrap path over preserving the previous hardcoded Vue application UI implementation.
- App-owned team membership integrity remains backend-authoritative; frontend filtering is only UX guidance.
- The v1 iframe contract is owned by `ApplicationIframeContract.ts`, `ApplicationIframeHost.vue`, and `application-bundle-iframe-contract-v1.md`; bundled UIs are consumers of that contract, not alternate owners.
- Asset URL resolution is frontend-owned and must flow through `windowNodeContextStore.getBoundEndpoints().rest` plus `applicationAssetUrl.ts`, not through backend-emitted host URLs or inline component concatenation.
- Runtime Applications availability is now backend-owned at the bound-node level; the frontend must resolve it through `applicationsCapabilityStore` / GraphQL rather than any baked `runtimeConfig` feature flag.

## Known Risks

- Built-in static-asset migration is intentionally minimal for this slice; richer built-in app UX can still be layered later on the same bundle contract.
- Canonical-id rollout spans many existing definition paths; downstream validation should watch for any remaining stale assumptions outside the touched surfaces.
- Editing writable imported package roots can still diverge locally from upstream package sources by design.
- `applicationQueries.ts` still appears in repo-wide `nuxi typecheck` output because the existing query layer baseline lacks a resolved `graphql-tag` type/module path; that baseline issue predates this slice and affects many existing GraphQL query files.
- Full repo-wide web/server typechecks still have unrelated baseline failures; focused validation passed, but downstream validation should rely on scenario execution rather than repo-wide typecheck green status.
- Bound-node switches now invalidate Applications capability/catalog state immediately; downstream validation should still watch for startup-error states or stale UI after switching between nodes with different application catalogs.
- The narrow server `tsc` pass for this slice still trips the long-standing `rootDir` + `autobyteus-ts` path baseline, but no remaining application-session-slice-specific type errors were left after the focused fixes.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes:
  - Removed backend `src/services/application-service.ts` and the app-specific frontend-builder tool path.
  - Removed frontend `applicationRunStore`, `applicationLaunchProfileStore`, `applicationContextStore`, old application mutations/types/tests, and the hardcoded Socratic application folder.
  - Removed the stale frontend `runtimeConfig.public.enableApplications` mapping so runtime Applications availability now comes only from the backend-owned capability contract.

## Environment Or Dependency Notes

- Web validation required `pnpm -C autobyteus-web exec nuxi prepare` first so `.nuxt/tsconfig.json` existed for Vitest/typecheck.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.json --noEmit` still fails on a pre-existing `rootDir`/`tests` configuration mismatch unrelated to this slice.
- `pnpm -C autobyteus-web exec nuxi typecheck` still reports many unrelated repo-wide baseline errors; filtered reruns against the touched application host/helper/session files emitted no matches after cleanup, while `applicationQueries.ts` still hits the existing repo-wide `graphql-tag` module-resolution baseline shared with other GraphQL query files.

## Validation Hints / Suggested Scenarios

- Applications catalog:
  - confirm built-in `Socratic Math Teacher` appears via the normal Applications page
  - open its detail route and verify metadata comes from the new catalog fields
- Runtime capability:
  - start against a node with discoverable applications and no persisted `ENABLE_APPLICATIONS`, then confirm the first capability resolution seeds `enabled=true`
  - start against an empty-catalog node with no persisted `ENABLE_APPLICATIONS`, then confirm the first capability resolution seeds `enabled=false`
  - switch between nodes with different application catalogs/capability states and confirm sidebar visibility, route access, and stale catalog clearing all update without a manual reload
  - simulate capability resolution failure or backend-not-ready startup and confirm Applications stays hidden / redirects cleanly instead of showing stale data
- Launch + iframe contract:
  - launch the built-in app, choose required runtime inputs, and verify the iframe transitions from waiting state to bootstrapped state
  - validate the packaged-topology path specifically: a packaged `file://` host window should still resolve the iframe/icon assets from the bound backend REST base and bootstrap the child served from backend HTTP origin
  - verify route query/session synchronization on relaunch, refresh/reconnect, and stop-session flows
  - verify backend binding outcomes explicitly: `requested_live`, `application_active`, and `none`
  - force a bad iframe-ready path (or asset edit) and confirm host-owned initialization failure UI / retry behavior
- Application execution shell:
  - verify artifact + progress coexistence for one member in native Execution mode instead of only the latest/happy-path publication
  - verify application-level `delivery.current` updates without clobbering retained member artifact/progress state
- Imported bundle validation:
  - import a valid package root containing one or more `applications/*/application.json` bundles and verify catalog entries plus embedded app-owned definitions appear
  - while staying in the same session/view, remove or import a package and confirm Applications / Agents / Agent Teams update immediately without a manual page reload
  - import an invalid bundle with a missing `ui` asset or missing runtime target and confirm the import fails cleanly
  - import/edit an app-owned team with an out-of-bundle ref and confirm backend rejection
- Native definitions surfaces:
  - verify app-owned agents/teams display owning application/package provenance
  - verify sync/delete/duplicate restrictions behave as designed for app-owned definitions
  - create and edit a native agent with `defaultLaunchConfig`, then confirm the values persist and seed application/direct-launch defaults
  - edit an app-owned team and ensure member library choices stay scoped to the same owning application

## What Needs Validation

- End-to-end GraphQL + UI flows for bundle import, app catalog discovery, and app-owned definition exposure.
- Runtime Applications capability initialization outcomes (`discovered -> true`, `empty catalog -> false`), explicit toggle persistence, and node-switch invalidation/error behavior.
- Late old-node catalog/detail responses after a bound-node switch, ensuring stale Applications entries cannot repopulate after `bindNodeContext()` changes.
- Same-session package import/remove refresh behavior for Applications / Agents / Agent Teams without a manual reload.
- The exact topology-aware v1 iframe handshake behavior in a live browser/session, including timeout and retry semantics.
- The packaged `file://` host + backend-served iframe asset topology that previously failed validation.
- Backend-owned route/session binding across `requested_live`, `application_active`, and `none`, including refresh/reconnect canonicalization on `/applications/[id]`.
- Coexistence of retained member `artifactsByKey` + `progressByKey` together with top-level `delivery.current`, not just single-family happy paths.
- Native agent create/edit persistence for `defaultLaunchConfig`, including downstream application-launch defaults.
- Persistence of writable app-owned agent/team edits back into the owning bundle roots.
- Backend rejection-path enforcement for AC-039: unsupported publication families, disallowed family fields, and `metadata` escape hatches must fail before projection and leave retained session state unchanged.
- Any remaining canonical-id assumptions in downstream sync/import/runtime paths not directly covered by the focused unit tests.
- Whether the minimal built-in Socratic bundle UI is acceptable for this slice or needs richer follow-up product behavior before release.

## Validation Executed During Implementation

- ✅ `pnpm -C autobyteus-server-ts exec vitest --run tests/integration/agent-definition/md-centric-provider.integration.test.ts tests/unit/application-bundles/file-application-bundle-provider.test.ts tests/unit/agent-team-definition/agent-team-definition-service.test.ts`
- ✅ `pnpm -C autobyteus-server-ts exec vitest run tests/unit/application-sessions/application-session-service.test.ts tests/unit/application-sessions/application-publication-projector.test.ts tests/unit/agent-execution/agent-run-create-service.test.ts tests/unit/agent-team-execution/team-run-service.test.ts tests/unit/application-bundles/file-application-bundle-provider.test.ts`
- ✅ `pnpm -C autobyteus-server-ts exec vitest run tests/unit/application-sessions/application-session-service.test.ts tests/unit/application-sessions/application-publication-projector.test.ts tests/unit/application-sessions/publish-application-event-tool.test.ts tests/unit/agent-execution/agent-run-create-service.test.ts tests/unit/agent-team-execution/team-run-service.test.ts tests/unit/application-bundles/file-application-bundle-provider.test.ts`
- ✅ `pnpm -C autobyteus-web exec nuxi prepare`
- ✅ `pnpm -C autobyteus-server-ts exec vitest run tests/unit/application-capability/application-capability-service.test.ts tests/unit/services/server-settings-service.test.ts tests/unit/api/graphql/types/server-settings.test.ts tests/unit/application-sessions/application-session-service.test.ts tests/unit/application-sessions/application-publication-projector.test.ts tests/unit/agent-execution/agent-run-create-service.test.ts tests/unit/agent-team-execution/team-run-service.test.ts tests/unit/application-bundles/file-application-bundle-provider.test.ts`
- ✅ `pnpm -C autobyteus-web exec vitest --run stores/__tests__/agentPackagesStore.spec.ts stores/__tests__/agentDefinitionStore.spec.ts components/agents/__tests__/AgentDefinitionForm.spec.ts stores/__tests__/applicationStore.spec.ts utils/application/__tests__/applicationAssetUrl.spec.ts components/applications/__tests__/ApplicationIframeHost.spec.ts`
- ✅ `pnpm -C autobyteus-web exec vitest run stores/__tests__/applicationStore.spec.ts stores/__tests__/applicationSessionStore.spec.ts utils/application/__tests__/applicationAssetUrl.spec.ts utils/application/__tests__/applicationSessionTransport.spec.ts components/applications/__tests__/ApplicationIframeHost.spec.ts`
- ✅ `pnpm -C autobyteus-web exec vitest --run stores/__tests__/applicationsCapabilityStore.spec.ts stores/__tests__/applicationStore.spec.ts stores/__tests__/applicationSessionStore.spec.ts components/layout/__tests__/LeftSidebarStrip.spec.ts components/__tests__/AppLeftPanel_v2.spec.ts middleware/__tests__/feature-flags.global.spec.ts pages/__tests__/settings.spec.ts components/settings/__tests__/ApplicationsFeatureToggleCard.spec.ts tests/stores/serverSettingsStore.test.ts components/applications/__tests__/ApplicationIframeHost.spec.ts utils/application/__tests__/applicationAssetUrl.spec.ts utils/application/__tests__/applicationSessionTransport.spec.ts`
- ✅ `pnpm -C autobyteus-web exec vitest --run pages/__tests__/settings.spec.ts`
- ✅ `pnpm -C autobyteus-web exec vitest --run stores/__tests__/applicationStore.spec.ts`
- ✅ `pnpm -C autobyteus-web exec nuxi typecheck` filtered with `rg "stores/applicationStore\.ts|stores/__tests__/applicationStore\.spec\.ts"` — no matches in the touched stale-response guard slice (repo-wide baseline still exits non-zero outside this slice)
- ✅ `pnpm -C autobyteus-web exec nuxi typecheck` filtered with `rg "pages/settings\.vue|components/settings/ApplicationsFeatureToggleCard\.vue|stores/applicationsCapabilityStore\.ts|stores/applicationStore\.ts|stores/serverSettings\.ts|middleware/feature-flags\.global\.ts|components/AppLeftPanel\.vue|components/layout/LeftSidebarStrip\.vue"` — no matches in the touched runtime-capability/settings files (repo-wide baseline still exits non-zero outside this slice)
- ✅ `pnpm -C autobyteus-web exec nuxi typecheck 2>&1 | rg "ApplicationIframeHost\\.vue|ApplicationCard\\.vue|applicationStore\\.ts|applicationSessionStore\\.ts|ApplicationIframeContract\\.ts|applicationAssetUrl\\.ts|ApplicationSession\\.ts|AgentDefinitionForm\\.vue|AgentDefaultLaunchConfigFields\\.vue|agentPackagesStore\\.ts|agentDefinitionStore\\.ts|agentTeamDefinitionStore\\.ts|applicationLaunch\\.ts"` — no matches
- ✅ `pnpm -C autobyteus-web exec nuxi typecheck 2>&1 | rg "ApplicationShell\\.vue|ApplicationSurface\\.vue|ApplicationExecutionWorkspace\\.vue|applicationSessionStore\\.ts|ApplicationIframeHost\\.vue|ApplicationIframeContract\\.ts|applicationSessionTransport\\.ts|pages/applications/\\[id\\]\\.vue|pages/applications/index\\.vue"` — no matches
- ⚠️ `pnpm -C autobyteus-web exec nuxi typecheck 2>&1 | rg "applicationQueries\\.ts"` — existing `graphql-tag` module-resolution baseline still matches this touched query file and many sibling query files
- ⚠️ `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.json --noEmit` — pre-existing repo baseline failure (`rootDir` vs included `tests`)
- ⚠️ temporary narrow `tsc` pass over the application-session slice still hits the long-standing `rootDir`/`autobyteus-ts` import baseline, but no remaining slice-specific errors were reported after filtering on the touched files
- ⚠️ `pnpm -C autobyteus-web exec nuxi typecheck` — unrelated repo-wide baseline failures remain outside the focused application-bundle topology validation
