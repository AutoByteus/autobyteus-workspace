# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/tickets/done/application-bundle-agent-architecture-analysis/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/tickets/done/application-bundle-agent-architecture-analysis/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/tickets/done/application-bundle-agent-architecture-analysis/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/tickets/done/application-bundle-agent-architecture-analysis/design-review-report.md`
- Existing ticket validation artifact from earlier local-fix rounds: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/tickets/done/application-bundle-agent-architecture-analysis/validation-report.md`

## What Changed

This canonical implementation worktree now carries the reviewed platform slice, the reviewed repo-root `applications/` model, the authoritative `ApplicationPackageService` boundary, and the stricter round-8 v1 publication-model refactor.

### 1. Application package boundary is now explicit and authoritative

- Added the reviewed higher-layer application-package boundary under:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-server-ts/src/application-packages/`
- `ApplicationPackageService` now owns author-facing package registration/import flows, backed by:
  - `application-package-root-settings-store.ts`
  - `application-package-registry-store.ts`
  - GitHub/local package installers and import plumbing
  - GraphQL resolvers under `src/api/graphql/types/application-packages.ts`
- `ApplicationBundleService` remains scoped to discovery / validation / catalog ownership and no longer acts as the author-facing package boundary.
- The web app now exposes the application-package surface through:
  - `autobyteus-web/components/settings/ApplicationPackagesManager.vue`
  - `autobyteus-web/stores/applicationPackagesStore.ts`
  - matching GraphQL operations and settings-page wiring
- The shared repo-root `applications/` container remains the runnable built-in application root, with built-in root precedence protected from same-path additional-root collisions.

### 2. The platform publication model is now artifact-centric

- `@autobyteus/application-sdk-contracts` now exposes the v1-normalized durable publication families:
  - `SESSION_STARTED`
  - `SESSION_TERMINATED`
  - `ARTIFACT`
- The normalized event producer shape now carries platform-owned provenance:
  - `memberRouteKey`
  - optional `memberName`
  - optional `role`
- The author-facing runtime publication tool is now:
  - `publish_artifact`
- Removed the superseded server tool file:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-server-ts/src/application-sessions/tools/publish-application-event-tool.ts`
- Added the reviewed replacement:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-server-ts/src/application-sessions/tools/publish-artifact-tool.ts`
- `ApplicationPublicationService` remains authoritative for:
  - validation of runtime publication input
  - normalization into durable journal rows
  - stable `eventId`
  - stable `journalSequence`
  - retained host projection updates
  - enqueueing ordered per-app `AT_LEAST_ONCE` dispatch
- `ApplicationPublicationValidator` now accepts only the artifact contract and rejects legacy family-selection fields such as `publicationFamily`, delivery-state fields, or progress-style fields.
- `ApplicationPublicationProjector` now retains artifact-centric member state only:
  - `members[*].artifactsByKey`
  - `members[*].primaryArtifactKey`
- The worker runtime event-handler registry is now the reviewed v1 shape:
  - `SESSION_STARTED -> sessionStarted`
  - `SESSION_TERMINATED -> sessionTerminated`
  - `ARTIFACT -> artifact`
- Durable dispatch ownership remains unchanged:
  - `ApplicationPublicationDispatchService` still owns ordered per-app restart-safe `AT_LEAST_ONCE` delivery using `ApplicationEventDispatchEnvelope`.

### 3. Brief Studio now teaches the stricter v1 publication contract

The canonical sample remains at:
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/applications/brief-studio`

The sample now teaches:
- app-local `README.md`
- runnable repo-local root under `applications/brief-studio/`
- generated importable package under `applications/brief-studio/dist/importable-package/`
- a two-member application-owned team:
  - `researcher`
  - `writer`
- app-owned queries / commands / repositories / migrations / UI / notifications

The Brief Studio backend changed as follows:
- backend definition now registers only:
  - `eventHandlers: { artifact: onArtifact }`
- removed the superseded handlers:
  - `backend-src/event-handlers/on-member-artifact.ts`
  - `backend-src/event-handlers/on-delivery-state.ts`
- added the reviewed replacement:
  - `backend-src/event-handlers/on-artifact.ts`
- `brief-projection-service.ts` remains the single app-owned owner of:
  - `brief_id = brief::<applicationSessionId>`
  - `processed_events` claim by `eventId`
  - atomic projection into app-owned tables in one `app.sqlite` transaction
- producer mapping is explicit and rejecting:
  - `researcher -> researcher`
  - `writer -> writer`
  - unknown producers throw
- artifact-type validation is explicit per producer:
  - researcher: `research_note`, `source_summary`, `research_blocker_note`
  - writer: `brief_draft`, `final_brief`, `brief_blocker_note`
- sample brief status is now derived from producer provenance plus artifact type rather than a separate delivery-state publication family.
- `brief.ready_for_review` is emitted when the writer publishes `final_brief`.
- sample schema / projection updates landed in:
  - `backend-src/migrations/002_artifact_publication_model.sql`
  - `backend-src/repositories/artifact-repository.ts`
  - `backend-src/repositories/brief-repository.ts`
  - `backend-src/services/brief-projection-service.ts`
- agent instructions now teach `publish_artifact`.
- the sample UI now renders artifact/status-oriented app state instead of delivery/progress fields.

### 4. Host-facing session views now match the artifact model

- Server GraphQL application-session types now expose artifact-centric retained member state.
- Web application-session types and queries now use:
  - `artifactsByKey`
  - `primaryArtifactKey`
- `ApplicationExecutionWorkspace.vue` now renders the selected member’s retained primary artifact and any additional retained artifacts.
- Delivery/progress-oriented host execution panels were removed from the retained session view.
- `HostArtifactRenderer.vue` now renders `ApplicationArtifactProjection` cleanly, including nullable titles.
- `autobyteus-web/docs/applications.md` now documents the retained-artifact execution view.

### 5. Earlier local fixes remain intact in the cumulative package

The cumulative implementation package still includes the earlier bounded local fixes that already landed in this worktree:
- app-scoped backend gateway with optional session context
- restart-safe pending dispatch resume after host restart
- corrected server-doc cross-repo relative paths
- long canonical imported `applicationId` support across Fastify route params and storage-root derivation
- protected built-in repo-local `applications/` identity precedence and additional-root filtering
- hidden `platform.sqlite` / app-owned `app.sqlite` split with reviewed migration enforcement

### 6. Follow-on Brief Studio import / launch bugfix

- Brief Studio application-owned agents are now valid frontmatter-based `agent.md` files with explicit `name`, `description`, `category`, and `role`.
- Both Brief Studio artifact-producing agents now expose `publish_artifact` in `agent-config.json`.
- Rebuilt `applications/brief-studio/dist/importable-package` so the fixed agent definitions/configs are present in the generated importable payload.
- Application-bundle validation now parses application-owned agent definitions transitively during package validation / refresh, so malformed embedded agents fail package import and bundle refresh immediately.
- `FileAgentDefinitionProvider` no longer silently skips malformed application-owned agents during catalog reads; malformed embedded agents now surface as errors instead of degrading into later launch-time missing-definition failures.

### 7. `app-config.ts` was re-split to restore the hard source-file guardrail

- Extracted the reintroduced application-package-root parsing and shared config/path parsing logic into:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-server-ts/src/config/config-value-parsers.ts`
- `app-config.ts` now delegates:
  - configured data-relative directory resolution
  - additional agent/application package root parsing
  - shared optional string / base-URL normalization
  - positive numeric config parsing
- Verified `autobyteus-server-ts/src/config/app-config.ts` is back under the hard limit at `458` effective non-empty lines.
- Added focused config coverage for application package root parsing in:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-server-ts/tests/unit/config/app-config.test.ts`

### 7. Imported application launch preparation now refreshes app-owned definition catalogs correctly

- `autobyteus-web/stores/applicationPackagesStore.ts` now refreshes the full dependent catalog set after application-package import/removal:
  - application catalog
  - agent definition catalog
  - agent team definition catalog
- The store now mirrors the already-established dependent-catalog refresh pattern used by `agentPackagesStore`.
- This closes the real host-owned failure where an imported application became discoverable immediately after import, but `prepareLaunchDraft()` still read stale pre-import agent/team catalogs and failed to resolve the imported app-owned runtime target.
- Added/updated durable web coverage in:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/stores/__tests__/applicationPackagesStore.spec.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/stores/__tests__/applicationLaunchPreparation.integration.spec.ts`

### 8. Packaged Electron Brief Studio launch path now matches the real `/rest` transport spine

- Fixed the packaged/runtime transport bug in:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-server-ts/src/api/rest/application-backends.ts`
- Root cause was concrete and implementation-owned:
  - `server-runtime.ts` registers REST routes under the parent `/rest` prefix
  - `application-backends.ts` had reintroduced hard-coded child paths beginning with `/rest/...`
  - packaged/runtime requests therefore hit framework routes effectively mounted under `/rest/rest/applications/...`
  - the application iframe/frontend SDK correctly called `/rest/applications/...`
  - requests died with framework `404 Not Found` before reaching `ApplicationBackendGatewayService`
- Fixed the route declarations so application backend child routes are now registered prefix-relative:
  - `/applications/:applicationId/backend/status`
  - `/applications/:applicationId/backend/queries/:queryName`
  - `/applications/:applicationId/backend/commands/:commandName`
  - `/applications/:applicationId/backend/graphql`
  - `/applications/:applicationId/backend/routes/*`
- Updated focused server coverage to prove the real prefixed transport shape for long imported application ids in:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-server-ts/tests/unit/api/rest/application-backends-prefix.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-server-ts/tests/integration/application-backend/application-backend-rest-ws.integration.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-server-ts/tests/integration/application-backend/brief-studio-imported-package.integration.test.ts`
- Added targeted renderer-side diagnostics for future iframe/bootstrap debugging:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/electron/rendererConsoleDiagnostics.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/electron/__tests__/rendererConsoleDiagnostics.spec.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/components/applications/ApplicationIframeHost.vue`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/applications/brief-studio/ui/app.js`
- New diagnostics now log these spine checkpoints when the desktop app runs:
  - iframe loaded
  - ready event received
  - bootstrap payload posted
  - Brief Studio ready event posted
  - Brief Studio bootstrap received
  - Brief Studio initial refresh failure, if any

### 9. Host launch ownership now follows the reviewed ApplicationSurface -> iframe bridge spine

- Updated `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/docs/applications.md` so the module doc now matches the cutover launch ownership boundary and no longer describes bootstrap state in `applicationSessionStore`.
- Refactored the web launch path so `ApplicationSurface.vue` is now the authoritative host launch owner for one resolved live application session.
- `ApplicationIframeHost.vue` is now an internal DOM/message bridge only:
  - renders the iframe for a supplied immutable descriptor
  - forwards `ready` / `bootstrap-delivered` / bridge-error signals upward
  - logs `iframe loaded` diagnostically only
  - no longer owns remount policy, ready timeout state, or session-store bootstrap mutation
- Added the reviewed descriptor helper:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/utils/application/applicationLaunchDescriptor.ts`
- The host launch descriptor now carries the reviewed invariants explicitly:
  - `applicationSessionId`
  - `entryHtmlUrl`
  - `expectedIframeOrigin`
  - `normalizedHostOrigin`
  - `contractVersion`
  - `launchInstanceId`
- `launchInstanceId` now participates in:
  - iframe query hints
  - ready envelopes
  - bootstrap envelopes
- Added explicit packaged-host origin normalization / matching helpers so packaged `file://` hosts use one reviewed rule instead of ad hoc string equality.
- `applicationSessionStore.ts` and `ApplicationSession` types no longer own host bootstrap state; session snapshots are back to backend-owned session truth only.
- The host spinner/error boundary now ends at bootstrap delivery; any first-query loading or empty/error state after that belongs to the bundled app UI itself.
- Updated the canonical iframe contract reference in:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/docs/application-bundle-iframe-contract-v1.md`
- Updated both repo-local teaching apps to the new launch contract fields so the reviewed v1 bridge remains coherent for:
  - `applications/brief-studio/ui/app.js`
  - `applications/socratic-math-teacher/ui/index.html`

### 10. Host bootstrap envelopes are now structured-clone safe for Electron iframe delivery

- Live Electron logs on `2026-04-15` showed a concrete host-side failure shape after the launch-owner refactor:
  - `[ApplicationSurface] accepted ready event ...` persisted
  - but `[ApplicationIframeHost] posted bootstrap payload ...` never appeared
  - the renderer then fell into the Nuxt error page with `Failed to execute 'postMessage' on 'Window': #<Object> could not be cloned.`
- Root cause was implementation-owned inside the new host launch spine:
  - `ApplicationSurface.vue` stored the bootstrap envelope inside a deep `ref(...)`, which proxied the envelope object
  - the proxied envelope then reached `contentWindow.postMessage(...)`
  - Electron/browser structured-clone rejected the proxied object before bootstrap delivery
- Fixed the boundary cleanly by:
  - keeping launch-descriptor / launch-input / pending-bootstrap objects in `shallowRef(...)` so host-local state does not proxy the transport envelope
  - materializing the runtime payload as a plain literal object before creating the bootstrap envelope
  - catching `postMessage(...)` failures in `ApplicationIframeHost.vue` and surfacing them as bridge errors instead of crashing the entire page into a generic Error 500 shell
- Added focused regression coverage so this specific Electron failure shape is now executable:
  - `ApplicationSurface.spec.ts` proves the pending bootstrap envelope is `structuredClone(...)` safe before delivery
  - `ApplicationIframeHost.spec.ts` proves clone failures are converted into a bridge error instead of an unhandled renderer exception

## Key Files Or Areas

### Application package boundary
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-server-ts/src/application-packages/services/application-package-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-server-ts/src/application-packages/stores/application-package-root-settings-store.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-server-ts/src/application-packages/stores/application-package-registry-store.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-server-ts/src/api/graphql/types/application-packages.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/components/settings/ApplicationPackagesManager.vue`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/stores/applicationPackagesStore.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/stores/__tests__/applicationPackagesStore.spec.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/stores/__tests__/applicationLaunchPreparation.integration.spec.ts`

### Config extraction for package-root parsing
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-server-ts/src/config/app-config.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-server-ts/src/config/config-value-parsers.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-server-ts/tests/unit/config/app-config.test.ts`

### Publication/session boundaries
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-application-sdk-contracts/src/index.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-server-ts/src/application-sessions/domain/models.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-server-ts/src/application-sessions/services/application-publication-validator.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-server-ts/src/application-sessions/services/application-publication-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-server-ts/src/application-sessions/services/application-publication-projector.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-server-ts/src/application-sessions/tools/publish-artifact-tool.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-server-ts/src/application-engine/worker/application-worker-runtime.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-server-ts/src/api/graphql/types/application-session.ts`

### Canonical sample app
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/applications/brief-studio/README.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/applications/brief-studio/application.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/applications/brief-studio/backend-src/index.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/applications/brief-studio/backend-src/event-handlers/on-artifact.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/applications/brief-studio/backend-src/services/brief-projection-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/applications/brief-studio/backend-src/repositories/brief-repository.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/applications/brief-studio/backend-src/repositories/artifact-repository.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/applications/brief-studio/backend-src/migrations/002_artifact_publication_model.sql`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/applications/brief-studio/agents/researcher/agent.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/applications/brief-studio/agents/researcher/agent-config.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/applications/brief-studio/agents/writer/agent.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/applications/brief-studio/agents/writer/agent-config.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/applications/brief-studio/ui/app.js`

### Web execution surface
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/components/applications/ApplicationSurface.vue`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/components/applications/__tests__/ApplicationSurface.spec.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/utils/application/applicationLaunchDescriptor.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/docs/application-bundle-iframe-contract-v1.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/types/application/ApplicationSession.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/graphql/queries/applicationSessionQueries.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/components/applications/execution/ApplicationExecutionWorkspace.vue`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/components/applications/ApplicationIframeHost.vue`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/components/applications/renderers/HostArtifactRenderer.vue`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/docs/applications.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/electron/rendererConsoleDiagnostics.ts`

### Packaged runtime transport alignment
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-server-ts/src/api/rest/application-backends.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-server-ts/tests/unit/api/rest/application-backends-prefix.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-server-ts/tests/integration/application-backend/application-backend-rest-ws.integration.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-server-ts/tests/integration/application-backend/brief-studio-imported-package.integration.test.ts`

## Important Assumptions

- Imported application backends remain prebuilt/self-contained; the platform imports runnable artifacts and does not install app dependencies at import time.
- The v1 author-facing runtime publication model is now one `publish_artifact` contract plus platform-generated lifecycle events.
- Producer provenance is platform-owned and derived from runtime context; app authors do not supply their own producer identity.
- Brief Studio intentionally teaches a simple v1 shape: one launched application session becomes one logical brief (`brief::<applicationSessionId>`).
- Brief Studio intentionally teaches a small two-member team (`researcher`, `writer`) rather than a generalized multi-role workflow.
- Repo-local runnable apps live under `applications/<application-id>/`; nested `dist/importable-package/...` trees are packaging-only mirrors.
- The host execution workspace is intentionally a retained-artifact host view; domain-specific workflow state remains app-owned and is rendered by the app UI.
- Host-side launch completion is defined as bootstrap delivery to the matching iframe launch instance; app-local first-query loading stays app-owned after that point.

## Known Risks

- Brief Studio is a teaching sample, not a production auth/permissions or multi-user collaboration example.
- Platform delivery remains ordered per-app `AT_LEAST_ONCE`; app correctness still depends on app-owned idempotent projection via `processed_events`.
- Brief Studio’s artifact-type rules and status transitions are intentionally sample-specific and should not be mistaken for a platform-wide ontology.
- The sample build still uses a local packaging script to copy runnable assets and emit the importable package; future SDK/runtime growth may justify a more formal bundling path.
- Broad `autobyteus-web` type debt outside this ticket still exists; this handoff only reports `nuxi prepare` plus targeted application-surface tests.
- The final native Electron click-through still needs user retest; my local evidence reaches the rebuilt desktop artifact, the importable package, persisted `[ApplicationSurface]` / `[ApplicationIframeHost]` / `[BriefStudio]` renderer diagnostics, and focused launch-surface tests, but not full human-driven desktop confirmation.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes:
  - removed the old runtime publication tool / handler split in favor of the clean-cut `publish_artifact` path
  - removed retained delivery/progress publication state from the host session projection
  - kept projection/idempotency authority singular in `brief-projection-service.ts`
  - re-split `app-config.ts` so the file is back under the hard guardrail at `458` effective non-empty lines

## Environment Or Dependency Notes

- Fresh-worktree bootstrap for this implementation worktree still requires:
  - `pnpm install`
  - `pnpm --dir autobyteus-server-ts prepare:shared`
  - `pnpm --dir autobyteus-server-ts exec prisma generate --schema ./prisma/schema.prisma`
- The server-side targeted publication/runtime tests expect emitted server build artifacts to be current; after the publication-contract cutover I ran both:
  - `pnpm --dir autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`
  - `pnpm --dir autobyteus-server-ts exec tsc -p tsconfig.build.json`
- The workspace already includes:
  - `autobyteus-application-sdk-contracts`
  - `autobyteus-application-backend-sdk`
  - `autobyteus-application-frontend-sdk`
  - `applications/*`
  so the sample app and platform build against the in-repo SDK packages directly.

## Local Implementation Checks Run

Record only implementation-scoped checks here.
Do not treat API/E2E or broader validation as passed in this artifact.

### 1. Workspace package builds
```bash
pnpm --filter @autobyteus/application-sdk-contracts build
pnpm --filter @autobyteus/application-backend-sdk build
pnpm --filter @autobyteus/application-frontend-sdk build
```
Result:
- passed

### 2. Brief Studio runnable-root / packaging build
```bash
pnpm --dir applications/brief-studio build
```
Result:
- passed
- refreshed the runnable app payload under `applications/brief-studio/`
- regenerated the importable package under `applications/brief-studio/dist/importable-package/`

### 3. Server source build + typecheck
```bash
pnpm --dir autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit
pnpm --dir autobyteus-server-ts exec tsc -p tsconfig.build.json
```
Result:
- passed

### 4. Targeted server publication/runtime/backend suite
```bash
pnpm --dir autobyteus-server-ts exec vitest run \
  tests/unit/application-sessions/application-publication-dispatch-service.test.ts \
  tests/unit/application-sessions/application-publication-projector.test.ts \
  tests/unit/application-sessions/application-publication-service.test.ts \
  tests/unit/application-sessions/publish-artifact-tool.test.ts \
  tests/unit/application-engine/application-engine-host-service.test.ts \
  tests/integration/application-backend/application-backend-rest-ws.integration.test.ts \
  tests/integration/application-backend/brief-studio-imported-package.integration.test.ts
```
Result:
- passed: `7 files / 12 tests`

### 5. Web application-surface prepare step
```bash
pnpm --dir autobyteus-web exec nuxi prepare
```
Result:
- passed

### 6. Targeted web application execution tests
```bash
pnpm --dir autobyteus-web exec vitest run \
  components/applications/__tests__/ApplicationIframeHost.spec.ts \
  components/applications/__tests__/ApplicationSurface.spec.ts \
  components/applications/execution/__tests__/ApplicationExecutionWorkspace.spec.ts \
  utils/application/__tests__/applicationAssetUrl.spec.ts \
  stores/__tests__/applicationSessionStore.spec.ts \
  stores/__tests__/applicationPackagesStore.spec.ts \
  stores/__tests__/applicationLaunchPreparation.integration.spec.ts \
  electron/__tests__/rendererConsoleDiagnostics.spec.ts
```
Result:
- passed: `8 files / 19 tests`

### 7. Focused config/application-package regression checks for the `app-config.ts` local fix
```bash
pnpm --dir autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit
pnpm --dir autobyteus-server-ts exec vitest run \
  tests/unit/config/app-config.test.ts \
  tests/unit/application-packages/application-package-root-settings-store.test.ts \
  tests/unit/application-packages/application-package-service.test.ts \
  tests/unit/application-bundles/file-application-bundle-provider.test.ts
```
Result:
- passed: `4 files / 27 tests`

### 8. Focused web import -> launch-preparation regression checks for the imported Brief Studio local fix
```bash
pnpm --dir autobyteus-web exec nuxi prepare
pnpm --dir autobyteus-web exec vitest run \
  stores/__tests__/applicationPackagesStore.spec.ts \
  stores/__tests__/applicationLaunchPreparation.integration.spec.ts
```
Result:
- passed: `2 files / 3 tests`

### 9. Follow-on malformed app-owned agent validation + Brief Studio relaunch checks
```bash
pnpm --dir applications/brief-studio build
pnpm --dir autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit
pnpm --dir autobyteus-server-ts exec vitest run \
  tests/unit/application-bundles/file-application-bundle-provider.test.ts \
  tests/unit/application-packages/application-package-service.test.ts \
  tests/integration/agent-definition/md-centric-provider.integration.test.ts \
  tests/integration/application-backend/brief-studio-imported-package.integration.test.ts
pnpm --dir autobyteus-web exec nuxi prepare
pnpm --dir autobyteus-web exec vitest run \
  stores/__tests__/applicationPackagesStore.spec.ts \
  stores/__tests__/applicationLaunchPreparation.integration.spec.ts
pnpm --dir autobyteus-web build:electron:mac
```
Result:
- passed
- server focus: `4 files / 18 tests`
- web focus: `2 files / 3 tests`
- regenerated desktop artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.2.76.dmg`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.2.76.zip`

### 10. Packaged Electron transport-spine regression + renderer-diagnostics checks
```bash
pnpm --dir autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit
pnpm --dir autobyteus-server-ts exec vitest run \
  tests/unit/api/rest/application-backends-prefix.test.ts \
  tests/integration/application-backend/application-backend-rest-ws.integration.test.ts \
  tests/integration/application-backend/brief-studio-imported-package.integration.test.ts
pnpm --dir applications/brief-studio build
pnpm --dir autobyteus-web exec nuxi prepare
pnpm --dir autobyteus-web exec vitest run \
  electron/__tests__/rendererConsoleDiagnostics.spec.ts \
  components/applications/__tests__/ApplicationIframeHost.spec.ts \
  stores/__tests__/applicationPackagesStore.spec.ts \
  stores/__tests__/applicationLaunchPreparation.integration.spec.ts
pnpm --dir autobyteus-web build:electron:mac
```
Result:
- passed
- server focus: `3 files / 6 tests`
- web focus: `4 files / 6 tests`
- packaged-runtime smoke using the rebuilt `.app` server bundle:
  - copied `.env` into a temporary app-data dir
  - started `AutoByteus.app/Contents/Resources/server/dist/app.js`
  - verified imported Brief Studio on the packaged server returns:
    - `GET /rest/applications/:applicationId/backend/status` → `200`
    - `POST /rest/applications/:applicationId/backend/queries/briefs.list` → `200`
- direct frontend-asset smoke against the packaged server:
  - loaded the rebuilt Brief Studio entry asset through `/rest/application-bundles/.../assets/ui/index.html`
  - posted the same host bootstrap envelope shape the iframe host uses
  - confirmed the UI leaves the waiting state and renders:
    - `applicationName = Brief Studio`
    - `status = Brief Studio is ready. Use the list/detail/command flow backed by the frontend SDK.`
  - screenshot artifact captured at:
    - `/Users/normy/.autobyteus/browser-artifacts/d2ffa0-1776256423018.png`


### 11. Design-aligned host launch-surface / iframe-contract regression checks
```bash
pnpm --dir applications/brief-studio build
pnpm --dir autobyteus-web exec nuxi prepare
pnpm --dir autobyteus-web exec vitest run \
  components/applications/__tests__/ApplicationIframeHost.spec.ts \
  components/applications/__tests__/ApplicationSurface.spec.ts \
  utils/application/__tests__/applicationAssetUrl.spec.ts \
  stores/__tests__/applicationSessionStore.spec.ts \
  components/applications/execution/__tests__/ApplicationExecutionWorkspace.spec.ts \
  stores/__tests__/applicationPackagesStore.spec.ts \
  stores/__tests__/applicationLaunchPreparation.integration.spec.ts \
  electron/__tests__/rendererConsoleDiagnostics.spec.ts
pnpm --dir autobyteus-web build:electron:mac
```
Result:
- passed
- web focus: `8 files / 19 tests`
- Brief Studio importable package regenerated with `launchInstanceId`-aware UI bootstrap handling
- rebuilt desktop artifacts now include the design-aligned launch owner/bridge refactor:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.2.76.dmg`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.2.76.zip`
- generated renderer smoke confirms the packaged build now contains:
  - `autobyteusLaunchInstanceId` query hints
  - `[ApplicationSurface]` launch-state diagnostics
  - `[ApplicationIframeHost]` bridge diagnostics
- Electron renderer log persistence now includes the authoritative owner prefix in `~/.autobyteus/logs/app.log`:
  - `[ApplicationSurface] ...`
  - `[ApplicationIframeHost] ...`
  - `[BriefStudio] ...`

## Validation Hints / Suggested Scenarios

- Try importing a deliberately malformed local package whose `applications/<app-id>/agents/<agent-id>/agent.md` is missing frontmatter and confirm import is rejected immediately instead of registering a broken package.
- Import `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/applications/brief-studio/dist/importable-package` through the application-package surface and confirm Brief Studio is discovered as an imported application.
- Import `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/applications/brief-studio/dist/importable-package` after shared agent/team catalogs were already loaded in the same UI session, then confirm `Launch Application` still resolves the imported app-owned team and member definitions immediately.
- Exact manual retest path after this slice:
  - open `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`
  - remove any previously imported Brief Studio package entry
  - re-import `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/applications/brief-studio/dist/importable-package`
  - go to `Applications -> Brief Studio` and click `Launch again`
- In the rebuilt Electron app, inspect `~/.autobyteus/logs/app.log` for the design-aligned renderer diagnostics if launch/bootstrap stalls:
  - `[ApplicationSurface] committed launch descriptor ...`
  - `[ApplicationIframeHost] iframe loaded ...`
  - `[ApplicationIframeHost] received ready event ...`
  - `[ApplicationSurface] accepted ready event ...`
  - `[ApplicationIframeHost] posted bootstrap payload ...`
  - `[ApplicationSurface] bootstrap delivered ...`
  - `[BriefStudio] ready event posted ...`
  - `[BriefStudio] bootstrap received ...`
- Launch a Brief Studio session and confirm the host execution view shows retained artifacts through `artifactsByKey` / `primaryArtifactKey` rather than delivery/progress panels.
- Exercise the real sample flow so:
  - `researcher` publishes research artifacts via `publish_artifact`
  - `writer` publishes `brief_draft` and `final_brief`
  - the app UI loads `briefs.list` / `briefs.getDetail`
  - `brief.ready_for_review` arrives over backend notifications
- Redeliver the same journal event and confirm `processed_events` prevents duplicate domain writes.
- Restart the host with a pending journal row and confirm durable dispatch resumes without waiting for a new publication.
- Verify imported long canonical `applicationId` values still reach:
  - `/rest/applications/:applicationId/backend/*`
  - `/ws/applications/:applicationId/backend/notifications`

## What Needs Validation

- Full UI/API/E2E coverage for the author-facing application-package import/manage flow.
- Real runtime validation that actual researcher/writer runs publish the intended artifact types and drive the expected Brief Studio state transitions.
- Cross-boundary validation that the host execution surface and the app-owned Brief Studio UI stay correctly separated during real sessions.
- Durable validation around restart/resume and imported-package execution with the generated Brief Studio bundle in realistic product flows.

### 12. App-first launch-shell / execution-handoff UX cleanup
```bash
pnpm --dir autobyteus-web exec nuxi prepare
pnpm --dir autobyteus-web exec vitest run \
  components/applications/__tests__/ApplicationShell.spec.ts \
  components/applications/__tests__/ApplicationSurface.spec.ts \
  components/applications/execution/__tests__/ApplicationExecutionWorkspace.spec.ts \
  services/workspace/__tests__/workspaceNavigationService.spec.ts \
  composables/workspace/__tests__/useWorkspaceRouteSelection.spec.ts \
  stores/__tests__/applicationLaunchPreparation.integration.spec.ts \
  stores/__tests__/applicationPackagesStore.spec.ts
pnpm --dir applications/brief-studio build
pnpm --dir autobyteus-web build:electron:mac
```
Result:
- passed
- web focus: `7 files / 14 tests`
- Brief Studio importable package regenerated at:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/applications/brief-studio/dist/importable-package`
- rebuilt desktop artifacts now include the UX cleanup:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.2.76.dmg`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.2.76.zip`
- App-first page-shell refactor now lands in the live-session path:
  - `ApplicationShell.vue` owns the minimal app-first live-session chrome
  - operational metadata moved behind an explicit details toggle
  - `ApplicationSurface.vue` gets a taller near-full-screen canvas for the app UI
- Execution handoff boundary added:
  - `types/workspace/WorkspaceExecutionLink.ts`
  - `services/workspace/workspaceNavigationService.ts`
  - `composables/workspace/useWorkspaceRouteSelection.ts`
  - Applications now navigate to `/workspace` through that typed contract instead of mutating workspace selection stores directly
- `ApplicationExecutionWorkspace.vue` is now member/artifact focused:
  - left member rail
  - retained artifact view
  - explicit `Open full execution monitor` action
  - removed run-id / route metadata from the default execution surface
- Brief Studio default UI is now app-first:
  - hero keeps only title/description/status
  - app/session/backend details moved into a collapsed `Teaching details` panel
