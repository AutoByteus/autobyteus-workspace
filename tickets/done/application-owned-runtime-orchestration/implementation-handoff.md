# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/design-review-report.md`
- Most recent implementation review report already folded into this cumulative package: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/review-report.md`

## Current Status

Implemented the cumulative round-12 authoritative design for application-owned runtime orchestration, including the app-scoped availability/hot-reentry, authoritative `ApplicationManifestV3.resourceSlots`, authoritative host-managed pre-entry setup gate, and business-first teaching-app/catalog cleanup on top of the already-resolved round-1 through round-7 findings:

- hosted app backends now expose one authoritative iframe/bootstrap transport base, `backendBaseUrl`, plus the non-derivable notifications URL,
- platform SDK/web host ownership now stops at schema-agnostic transport helpers while app business schema/codegen artifacts stay app-local,
- Brief Studio now teaches the “many runs over one business record” pattern with app-owned GraphQL plus app-owned pending binding intent and `briefId -> bindingId[]` correlation, and
- Socratic Math Teacher now teaches the “one long-lived conversational binding with follow-up input” pattern with a real app-owned GraphQL API,
- application discovery now produces a diagnostic-aware catalog snapshot plus app-scoped availability state so broken imported packages can be quarantined and hot-reentered without broad platform downtime, and
- application-owned backend launches now resolve runtime resources through authoritative manifest-declared `resourceSlots` plus `runtimeControl.getConfiguredResource(...)` instead of hardcoded bundle-local runtime targets,
- `/applications/:id` now blocks entry behind a host-managed saved-setup gate that mirrors the familiar team/agent config form, including required resource selection plus bounded runtime/model/workspace defaults, and
- the Applications catalog plus Brief Studio / Socratic Math Teacher primary canvases now keep business/setup wording on the main surface while raw runtime/resource identifiers remain in advanced/details views only.

The previously blocked Local Fix findings remain resolved in this cumulative state:

- `AOR-LF-001` dispatch drain tail race
- `AOR-LF-002` `RUN_STARTED` ordering before `initialInput` artifact ingress
- `AOR-LF-003` oversized implementation file split
- `AOR-LF-004` retry/backoff timer preservation during dispatcher tail rechecks
- `AOR-LF-005` backend-mount route helper now preserves JSON route-body round-tripping by sending JSON bodies with a JSON content type
- `AOR-LF-006` Brief Studio and Socratic Math Teacher GraphQL executors now accept valid single-operation requests that omit `operationName`
- `AOR-LF-007` Brief Studio and Socratic Math Teacher now preserve already-projected same-binding state when `startRun(...)` succeeds after an early event has already reconciled that binding
- `AOR-LF-008` `getConfiguredResource(...)` now revalidates effective selections on read and rejects stale persisted overrides or invalid manifest defaults before app launch code can consume them
- `AOR-LF-009` `/applications/:id` now keeps the pre-entry host setup gate authoritative and blocks entry until saved setup is launch-ready
- `AOR-LF-010` successful repair/reload re-entry now invalidates any pre-existing app worker before returning the application to `ACTIVE`, so the next ready path cannot reuse stale backend code
- `AOR-LF-011` repaired-app availability now preserves `REENTERING` until recovery and dispatch resume fully finish, so backend/runtime-control admission stays blocked for the whole re-entry window
- `AOR-LF-012` live package remove/reload now reuses the persisted-known-application reconciliation path, so removed or temporarily undiscoverable apps with durable platform state remain under authoritative quarantined/persisted-only availability ownership until a valid catalog entry returns
- API/E2E round-11 `AOR-E2E-018` long-canonical-id persisted-state reconciliation fix: persisted-known application inventory now resolves the real `applicationId` from platform-state metadata for hashed storage directories, so live imported-package remove/reload keeps the actual long canonical app id under authoritative persisted-only quarantine instead of quarantining the hashed storage key
- round-3 API/E2E packaged-client Local Fix: Brief Studio and Socratic Math Teacher importable UI packages now ship the full frontend SDK ESM dependency set required by the generated GraphQL clients
- round-5 API/E2E live-runtime Local Fix: app-owned teaching runs now launch with automatic tool execution, and `publish_artifact` normalizes the real provider shorthand `artifactRef` shapes observed in the live LM Studio run

This cumulative package also implements the round-6 architecture rework for `AOR-DI-005`:

- shared runtime-control contracts now use opaque `bindingIntentId` instead of the removed generic `executionRef` business-reference field,
- the platform persists and echoes `bindingIntentId` on run bindings and execution-event envelopes,
- `runtimeControl.getRunBindingByIntentId(...)` is now the authoritative reconciliation lookup, and
- both teaching apps now persist app-owned pending binding intents before direct `startRun(...)`, then reconcile/finalize binding ownership through app-owned state even if early events or post-start failures race the mapping commit.

The latest round-7 Local Fix closes the remaining monotonic-finalization gap on top of that design:

- Brief Studio launch success now re-reads the projected brief after binding finalization and preserves same-binding writer/final lifecycle state instead of overwriting it back to launch-default `researching`,
- Socratic lesson launch success now preserves same-binding lifecycle failure state instead of reviving the lesson to `active`,
- both success paths remain free to replace stale state from older bindings with the newly launched binding, and
- focused regression tests now prove a successful `startRun(...)` cannot regress an already-reconciled early event before the handler returns.

The latest API/E2E Local Fix closes the packaged-client delivery gap without changing the hosted backend contract:

- both app packaging scripts now vendor the full `autobyteus-application-frontend-sdk/dist` module set into `ui/vendor/` instead of copying only `dist/index.js`,
- each packaged UI still exposes the stable `vendor/application-frontend-sdk.js` entry expected by the generated clients,
- packaged generated-client import probes now succeed for both Brief Studio and Socratic Math Teacher, and
- the Brief Studio imported-package integration test now passes its packaged-client launch path end to end.

The latest API/E2E Local Fix closes the implementation-owned live Brief Studio blockers from the 2026-04-20 provider-backed run:

- Brief Studio and Socratic teaching-team launches now set `autoExecuteTools: true`, removing the out-of-band manual approval requirement for application-owned tool calls,
- the LLM-facing `publish_artifact` boundary now canonicalizes the exact live shorthand shapes observed in retained runtime traces (`artifactRef.type/data` and kindless object payloads) into `INLINE_JSON`,
- the Brief Studio researcher/writer instructions now show the exact `artifactRef` payload shape expected by the runtime and explicitly forbid the live-invalid `type/data` / kindless-object forms, and
- focused durable tests now cover both shorthand normalization and the app-owned launch preset auto-execute contract.

The latest round-8 architecture implementation adds the app-scoped re-entry and resource-slot ownership contract:

- `ApplicationBundleService` now exposes a diagnostic-aware `getCatalogSnapshot()` / `reloadApplication(applicationId)` boundary backed by provider-level manifest parsing and per-application discovery diagnostics instead of all-or-nothing discovery failure,
- `ApplicationAvailabilityService` is now the authoritative application liveness owner for `ACTIVE`, `QUARANTINED`, and `REENTERING`, including app-scoped reload-and-reenter recovery that resumes bindings and pending event dispatch only for the repaired application,
- startup recovery now synchronizes availability from the current catalog snapshot before rebinding live orchestration state, and hosted backend/runtime-control entrypoints reject quarantined applications with explicit availability detail,
- `ApplicationManifestV3.resourceSlots` is now the authoritative declaration for app-consumable runtime resources, with manifest validation for slot identity, allowed owners/kinds, and bundle-local default resource existence,
- runtime control now exposes `getConfiguredResource(slotKey)` and the platform persists per-application resource-slot overrides/launch defaults in platform state while falling back cleanly to manifest defaults, and
- Brief Studio and Socratic Math Teacher now declare required team slots in their manifests and resolve team launches through those slots rather than hardcoded team refs.

The latest Local Fix closes the authoritative slot-read gap identified in round-8 code review:

- `ApplicationResourceConfigurationService` now validates the effective selection on read, not only on write,
- both `getConfiguredResource(...)` and `listConfigurations(...)` reuse that effective-selection validation path,
- stale persisted overrides now fail immediately at the configuration owner instead of leaking invalid resource refs to app launch code,
- invalid or unresolved manifest defaults, including shared defaults, now fail immediately at the same authoritative boundary, and
- Brief Studio and Socratic launch paths now have durable coverage proving `startRun(...)` is not attempted when configured-resource readback rejects the slot selection.

The latest Local Fix closes the repaired-worker re-entry gap identified in deep cumulative review round 15:

- `ApplicationAvailabilityService.reloadAndReenter(...)` now marks the application `REENTERING` immediately, which suspends dispatch and blocks backend entry even when the app was previously `ACTIVE`,
- successful re-entry now calls `ApplicationEngineHostService.stopApplicationEngine(applicationId)` before bundle reload/recovery resume, so any pre-existing ready worker is invalidated before the repaired app returns to `ACTIVE`,
- reload/reentry failures while stopping/reloading/resuming now leave the application quarantined instead of reactivating it with a stale worker,
- the next `/backend/ensure-ready` path must therefore rebuild from the revalidated bundle after a successful repair/re-entry, and
- focused durable coverage now proves re-entry stops an already-ready worker before reactivating the repaired application.

The latest Local Fix closes the premature-`ACTIVE` re-entry gap identified in the follow-up re-review:

- `synchronizeWithCatalogSnapshot(...)` now preserves an existing `REENTERING` record for discovered applications instead of resetting it back to `ACTIVE` during the middle of repair/re-entry,
- successful repair/re-entry therefore keeps backend/runtime-control admission blocked for the entire recovery window and only transitions back to `ACTIVE` after both binding recovery and pending-event dispatch resume succeed,
- `ApplicationBackendGatewayService.ensureApplicationReady(...)` now remains blocked behind `ApplicationUnavailableError(... state = REENTERING ...)` while that window is in flight, and
- focused durable coverage now proves both the availability owner and the backend gateway preserve the `REENTERING` admission block until re-entry is fully complete.

The latest Local Fix closes the live package remove/reload persisted-state ownership gap identified in code review round 18:

- `ApplicationPackageRegistryService.refreshCatalogCaches()` now reuses the same persisted-known-application reconciliation path that startup uses instead of synchronizing only the current discoverable catalog snapshot,
- live package removal or reload that temporarily drops a persisted application out of the catalog now preserves authoritative quarantined ownership with the required persisted-only detail until a valid catalog entry returns,
- backend/runtime-control admission therefore remains blocked for removed or invalid-yet-persisted applications instead of falling back to no availability record, and
- focused durable coverage now proves both live package removal and live reload preserve quarantined/persisted-only ownership when platform state still exists.

The latest API/E2E Local Fix closes the long-canonical-id persisted-state identity gap found in round 11:

- `ApplicationStorageLifecycleService` now persists the authoritative `application_id` into per-app platform-state metadata whenever platform state is prepared,
- `ApplicationPlatformStateStore.listKnownApplicationIds()` now resolves real application ids from that metadata (with safe fallback recovery from readable non-hashed storage keys and known in-database application-id tables),
- live package remove/reload therefore reconciles persisted-known applications by the real long canonical `applicationId` instead of the hashed storage key used for compact storage paths, and
- durable tests now prove both platform-state inventory and live package remove/reload preserve persisted-only quarantine for long canonical imported application ids.

This implementation is ready to return through code review before API/E2E starts.

## What Changed

### 1) Hosted backend mount + iframe/bootstrap transport cleanup

- kept one authoritative hosted backend namespace under the application mount and moved the browser/app contract to `transport.backendBaseUrl`
- retained only the non-derivable `backendNotificationsUrl` alongside that base
- added a schema-agnostic frontend SDK helper that derives GraphQL/query/command/route invokers from `backendBaseUrl` instead of duplicating parallel URL sources of truth
- updated web host transport utilities and iframe-host tests to use the new transport shape

### 2) Platform-vs-app schema/codegen ownership split

- kept platform packages transport-oriented rather than turning them into a universal business-schema layer
- added app-local GraphQL schema/codegen ownership under each sample app workspace
- refreshed SDK/docs/readmes to teach that generated business clients belong inside each application, not in the shared platform SDKs

### 3) Brief Studio upgraded to the authoritative app-owned example

- added `applications/brief-studio/api/graphql/schema.graphql`
- migrated the app business API from public query/command handlers to app-owned GraphQL resolvers
- changed the lifecycle so `createBrief` creates only the brief business record, while `launchDraftRun(briefId)` starts or restarts a run later
- the round-6 rework now persists one app-owned pending binding intent before each direct launch, finalizes `briefId -> bindingId[]` in app state, and reconciles early events or post-start failures by `bindingIntentId`
- exposed binding history through `briefExecutions(briefId)` from app-owned brief-binding rows plus authoritative binding lookup
- split frontend authoring into `frontend-src/app.js`, `frontend-src/brief-studio-runtime.js`, and `frontend-src/brief-studio-renderer.js`, then regenerated runnable `ui/` output and importable-package output
- updated the package build to copy frontend authoring, refresh the vendored frontend SDK, emit the new backend bundle manifest, and keep the importable package aligned
- removed the obsolete public query/command business API files from the sample

### 4) Socratic Math Teacher upgraded from placeholder to real teaching app

- created an app-owned package/build layout with `package.json`, `tsconfig.backend.json`, `scripts/build-package.mjs`, `api/graphql/schema.graphql`, `frontend-src/`, and `backend-src/`
- implemented a lesson-centric GraphQL API with `lessons`, `lesson`, `startLesson`, `askFollowUp`, `requestHint`, and `closeLesson`
- introduced one long-lived conversational binding per lesson and routed follow-up input through `runtimeControl.postRunInput(...)`
- the round-6 rework now persists one pending binding intent before `startLesson(...)`, finalizes lesson binding ownership in app state, and reconciles post-start failures or early tutor events by `bindingIntentId`
- projected run lifecycle and artifact events into app-owned lesson/message storage, including a migration-backed local database shape
- updated the teaching team/agent definitions so the in-repo app now teaches the intended tutoring pattern instead of the historical placeholder flow

### 5) Server built-in app mirrors + narrow validation updates

- rebuilt the root app packages and synced the repo-local Brief Studio and Socratic Math Teacher application roots into `autobyteus-server-ts/application-packages/platform/applications/...`
- updated the Brief Studio imported-package integration test to exercise the GraphQL-first flow through `/backend/graphql`
- refreshed targeted SDK/web docs/readmes so the repo teaches the current backend-mount contract

### 6) Round-5 Local Fix corrections

- updated `createApplicationBackendMountTransport(...).invokeRoute(...)` so JSON-compatible request bodies are serialized with a JSON content type instead of being delivered to `/backend/routes/*` as raw strings
- kept explicit non-JSON route-body pass-through for string/binary/form-like payloads instead of forcing everything through JSON serialization
- replaced the brittle GraphQL fallback parse in both sample-app executors with a stable operation-key resolver that accepts requests with omitted `operationName`
- added executor fallbacks for root-field dispatch keys so valid single-operation requests can still dispatch when the document omits `operationName`
- added durable regression coverage for:
  - JSON route-body round-tripping through `/backend/routes/*` via the backend-mount transport helper
  - Brief Studio GraphQL requests without `operationName` on the imported-package path
  - both app-owned GraphQL executors accepting valid single-operation requests without `operationName`

### 7) Round-6 direct `startRun(...)` handoff rework

- replaced the shared/public `executionRef` runtime-control contract field with opaque `bindingIntentId`
- added `runtimeControl.getRunBindingByIntentId(...)` through the worker bridge and orchestration host
- updated platform run-binding persistence, journal persistence, runtime ingress, and publish-artifact responses to carry binding-centric identity
- added app-owned pending binding intent repositories/correlation services for Brief Studio and Socratic Math Teacher
- added a Brief Studio `brief_bindings` app-owned history table and migration-backed pending-intent tables for both apps
- updated both app event-projectors to reconcile business ownership from `event.binding.bindingIntentId` instead of `event.executionRef`
- added focused regression coverage for:
  - Brief Studio post-start failure reconciliation by `getRunBindingByIntentId(...)`
  - Brief Studio early-event reconciliation by `bindingIntentId`
  - Socratic post-start failure reconciliation by `getRunBindingByIntentId(...)`
  - Socratic early-event reconciliation by `bindingIntentId`

### 8) Round-7 monotonic launch finalization fix

- updated Brief Studio launch success finalization so it commits the binding, re-reads the current projected brief, and preserves same-binding projected status/title/error state when an early writer event already landed
- updated Socratic `startLesson(...)` success finalization so it preserves same-binding blocked/closed/error state when an early lifecycle event already reconciled the binding
- kept the success-path overwrite behavior only for stale rows that still belong to no binding or an older binding
- added durable race regressions covering:
  - a successful Brief Studio `launchDraftRun(...)` whose early `final_brief` artifact arrives before the handler returns
  - a successful Socratic `startLesson(...)` whose early `RUN_FAILED` event arrives before the handler returns

### 9) API/E2E packaged-client vendor fix

- updated both application packaging scripts to replace the old one-file frontend-SDK vendor copy with a full sync of `autobyteus-application-frontend-sdk/dist`
- retained `ui/vendor/application-frontend-sdk.js` as the packaged stable entrypoint by copying `dist/index.js` to that compatibility filename after syncing the full dist set
- rebuilt both runnable roots and importable-package mirrors so packaged generated GraphQL clients can resolve sibling frontend-SDK ESM modules such as `create-application-backend-mount-transport.js`
- fixed the new durable Brief Studio imported-package integration test harness so the packaged-client same-binding scenario uses the shared `lookupStore` created in `beforeEach`

### 10) API/E2E live-runtime tool-execution + artifactRef fix

- updated Brief Studio `launchDraftRun(...)` and Socratic `startLesson(...)` to launch app-owned team runs with `autoExecuteTools: true`
- updated the orchestration `publish_artifact` tool schema/description to show the canonical inline JSON artifact shape expected by app-owned teaching runs
- added tool-side normalization so the live provider shorthand payloads observed in retained traces are converted into canonical `INLINE_JSON` artifact refs before ingress validation
- strengthened the Brief Studio researcher/writer agent instructions with exact `artifactRef` examples and an explicit prohibition on `artifactRef.type`, `artifactRef.data`, or raw kindless objects
- updated the Brief Studio imported-package integration fake team-launch preset wiring to mirror the new auto-execute launch behavior
- added durable regression coverage for:
  - `publish_artifact` normalization of live shorthand inline-json payloads
  - app-owned Brief Studio and Socratic launch presets carrying `autoExecuteTools: true`

### 11) Round-8 application availability + manifest resource-slot rework

- split manifest/runtime-resource contract ownership in `@autobyteus/application-sdk-contracts` so `ApplicationManifestV3.resourceSlots` and runtime resource configuration types live in authoritative dedicated files and flow through the backend SDK re-export surface
- added diagnostic-aware application catalog snapshots, including valid discoverable bundles plus quarantined diagnostics for invalid imported packages instead of aborting discovery for the whole package root
- validated manifest-declared resource slots during discovery:
  - `slotKey` regex/uniqueness
  - non-empty unique `allowedResourceKinds`
  - defaulted `allowedResourceOwners` to `bundle/shared`
  - bundle-local default resource refs must resolve against discovered bundle agents/teams
- added `ApplicationAvailabilityService` plus app-scoped reload/reenter flow so repaired applications can transition `QUARANTINED -> REENTERING -> ACTIVE` without restarting unrelated applications
- gated hosted backend access and live runtime-control paths on authoritative application availability and surfaced quarantined application reload through `/rest/applications/:applicationId/backend/reload`
- added persisted application resource-slot configuration storage/service plus `runtimeControl.getConfiguredResource(slotKey)` through the worker bridge and orchestration host
- updated startup recovery, dispatcher resume logic, and package-root refresh flows to synchronize availability from catalog snapshots and resume only the affected application when re-entering
- updated Brief Studio and Socratic Math Teacher manifests to declare authoritative required team slots and updated their launch services to resolve team refs from configured resources
- added focused unit coverage for:
  - manifest/resource-slot discovery validation
  - application availability quarantine/reentry behavior
  - persisted resource-slot configuration validation and default resolution
  - imported-package orchestration using the same bundle/storage/availability singletons exercised by hosted runtime control

### 12) Round-8 Local Fix for authoritative resource-slot read validation

- changed `ApplicationResourceConfigurationService` so readback no longer returns unchecked `buildEffectiveConfiguration(...)` output
- introduced one shared effective-selection validation path used by:
  - `getConfiguredResource(applicationId, slotKey)`
  - `listConfigurations(applicationId)`
- chose the strict branch of the approved design: stale persisted overrides or invalid defaults are rejected clearly rather than silently falling back
- wrapped read-time validation failures with slot/source context (`persisted override` vs `manifest default`) so the repair surface is explicit
- added durable regressions covering:
  - stale persisted overrides that now violate the declared slot kind/owner contract
  - unresolved shared manifest defaults during host/readback configuration listing
  - Brief Studio launch aborting before `startRun(...)` when configured-resource readback rejects the slot selection
  - Socratic `startLesson(...)` aborting before `startRun(...)` when configured-resource readback rejects the slot selection

## Key Files Or Areas

- `autobyteus-application-frontend-sdk/src/index.ts`
- `autobyteus-application-frontend-sdk/src/application-client-transport.ts`
- `autobyteus-application-frontend-sdk/src/create-application-backend-mount-transport.ts`
- `autobyteus-application-sdk-contracts/src/index.ts`
- `autobyteus-application-sdk-contracts/src/manifests.ts`
- `autobyteus-application-sdk-contracts/src/runtime-resources.ts`
- `autobyteus-application-backend-sdk/src/index.ts`
- `autobyteus-web/types/application/ApplicationHostTransport.ts`
- `autobyteus-web/utils/application/applicationHostTransport.ts`
- `autobyteus-web/graphql/queries/applicationQueries.ts`
- `autobyteus-web/stores/applicationStore.ts`
- `autobyteus-web/generated/graphql.ts`
- `autobyteus-web/utils/application/applicationLaunchSetup.ts`
- `autobyteus-web/components/applications/ApplicationCard.vue`
- `autobyteus-web/components/applications/ApplicationLaunchSetupPanel.vue`
- `autobyteus-web/components/applications/ApplicationShell.vue`
- `autobyteus-web/components/applications/__tests__/ApplicationCard.spec.ts`
- `autobyteus-web/components/applications/__tests__/ApplicationIframeHost.spec.ts`
- `autobyteus-web/components/applications/__tests__/ApplicationLaunchSetupPanel.spec.ts`
- `autobyteus-web/components/applications/__tests__/ApplicationShell.spec.ts`
- `autobyteus-web/components/applications/__tests__/ApplicationSurface.spec.ts`
- `applications/brief-studio/api/graphql/schema.graphql`
- `applications/brief-studio/backend-src/graphql/index.ts`
- `applications/brief-studio/backend-src/repositories/brief-binding-repository.ts`
- `applications/brief-studio/backend-src/repositories/pending-binding-intent-repository.ts`
- `applications/brief-studio/backend-src/services/brief-read-service.ts`
- `applications/brief-studio/backend-src/services/brief-run-launch-service.ts`
- `applications/brief-studio/backend-src/services/run-binding-correlation-service.ts`
- `applications/brief-studio/backend-src/migrations/004_pending_binding_intents.sql`
- `applications/brief-studio/agent-teams/brief-studio-team/agents/researcher/agent.md`
- `applications/brief-studio/agent-teams/brief-studio-team/agents/writer/agent.md`
- `applications/brief-studio/frontend-src/app.js`
- `applications/brief-studio/frontend-src/brief-studio-runtime.js`
- `applications/brief-studio/frontend-src/brief-studio-renderer.js`
- `applications/brief-studio/scripts/build-package.mjs`
- `applications/socratic-math-teacher/api/graphql/schema.graphql`
- `applications/socratic-math-teacher/backend-src/index.ts`
- `applications/socratic-math-teacher/backend-src/repositories/pending-binding-intent-repository.ts`
- `applications/socratic-math-teacher/backend-src/services/lesson-projection-service.ts`
- `applications/socratic-math-teacher/backend-src/services/lesson-runtime-service.ts`
- `applications/socratic-math-teacher/backend-src/services/run-binding-correlation-service.ts`
- `applications/socratic-math-teacher/backend-src/event-handlers/on-artifact.ts`
- `applications/socratic-math-teacher/backend-src/migrations/001_create_lessons.sql`
- `applications/socratic-math-teacher/backend-src/migrations/002_pending_binding_intents.sql`
- `applications/socratic-math-teacher/frontend-src/app.js`
- `applications/socratic-math-teacher/frontend-src/socratic-runtime.js`
- `applications/socratic-math-teacher/frontend-src/socratic-renderer.js`
- `applications/socratic-math-teacher/scripts/build-package.mjs`
- `applications/brief-studio/ui/vendor/**`
- `applications/socratic-math-teacher/ui/vendor/**`
- `autobyteus-server-ts/src/application-bundles/domain/application-catalog-snapshot.ts`
- `autobyteus-server-ts/src/application-bundles/domain/models.ts`
- `autobyteus-server-ts/src/application-bundles/providers/file-application-bundle-provider.ts`
- `autobyteus-server-ts/src/application-bundles/services/application-bundle-service.ts`
- `autobyteus-server-ts/src/application-bundles/utils/application-manifest.ts`
- `autobyteus-server-ts/src/api/rest/application-backends.ts`
- `autobyteus-server-ts/src/application-backend-gateway/services/application-backend-gateway-service.ts`
- `autobyteus-server-ts/src/application-engine/runtime/protocol.ts`
- `autobyteus-server-ts/src/application-engine/services/application-engine-host-service.ts`
- `autobyteus-server-ts/src/application-engine/worker/application-worker-runtime.ts`
- `autobyteus-server-ts/src/application-orchestration/services/application-availability-service.ts`
- `autobyteus-server-ts/src/application-orchestration/services/application-execution-event-dispatch-service.ts`
- `autobyteus-server-ts/src/application-orchestration/services/application-orchestration-host-service.ts`
- `autobyteus-server-ts/src/application-orchestration/services/application-orchestration-recovery-service.ts`
- `autobyteus-server-ts/src/application-orchestration/services/application-resource-configuration-service.ts`
- `autobyteus-server-ts/src/application-orchestration/stores/application-resource-configuration-store.ts`
- `autobyteus-server-ts/src/application-orchestration/stores/application-execution-event-journal-store.ts`
- `autobyteus-server-ts/src/application-orchestration/stores/application-run-binding-store.ts`
- `autobyteus-server-ts/src/application-orchestration/tools/publish-artifact-tool.ts`
- `autobyteus-server-ts/src/application-packages/services/application-package-service.ts`
- `autobyteus-server-ts/src/application-storage/stores/application-platform-state-store.ts`
- `autobyteus-server-ts/src/server-runtime.ts`
- `autobyteus-server-ts/application-packages/platform/applications/brief-studio/**`
- `autobyteus-server-ts/application-packages/platform/applications/socratic-math-teacher/**`
- `autobyteus-server-ts/tests/integration/application-backend/application-backend-mount-route-transport.integration.test.ts`
- `autobyteus-server-ts/tests/integration/application-backend/brief-studio-imported-package.integration.test.ts`
- `autobyteus-server-ts/tests/unit/application-orchestration/application-availability-service.test.ts`
- `autobyteus-server-ts/tests/unit/application-orchestration/application-resource-configuration-service.test.ts`
- `autobyteus-server-ts/tests/unit/application-backend/app-owned-binding-intent-correlation.test.ts`
- `autobyteus-server-ts/tests/unit/application-backend/app-owned-graphql-executors.test.ts`
- `autobyteus-server-ts/tests/unit/application-bundles/file-application-bundle-provider.test.ts`
- `autobyteus-server-ts/tests/unit/application-backend-gateway/application-backend-gateway-service.test.ts`
- `autobyteus-server-ts/tests/unit/application-orchestration/publish-artifact-tool.test.ts`

## Important Assumptions

- No compatibility wrapper is retained for the removed platform-owned `applicationSession` / singular `runtimeTarget` model.
- `ApplicationOrchestrationStartupGate` remains the owner for startup-sensitive live runtime-control and artifact-ingress admission.
- `backendBaseUrl` is the authoritative hosted backend transport hint; GraphQL/query/command/route URLs derive from it rather than becoming parallel bootstrap fields.
- Platform SDKs stay business-schema agnostic; each application owns its own business schema, generated clients, and resolver/business behavior.
- Brief Studio and Socratic Math Teacher are intentional teaching artifacts and should continue demonstrating distinct application-owned orchestration patterns.
- Direct `startRun(...)` callers must persist pending binding intent state before launch; the platform does not delay early events while app-owned mapping commits.
- App-owned teaching teams that rely on `publish_artifact` are expected to auto-execute that safe application tool; the implementation does not introduce a separate in-app tool-approval surface for those flows.
- `ApplicationAvailabilityService` is the authoritative app-liveness owner for hosted backend/runtime-control entry, while bundle discovery remains the source of truth for whether an application is discoverable or quarantined.
- `ApplicationManifestV3.resourceSlots` is the authoritative declaration of app-consumable runtime resources; app backends should resolve launch resources through `runtimeControl.getConfiguredResource(...)` instead of hardcoded bundle refs.

## Known Risks

- API/E2E validation is still required for restart recovery, startup gating, real notification streaming, and live runtime-control behavior on real runs.
- Imported-package validation beyond the narrow Brief Studio integration test is still required for the rebuilt sample apps.
- The web doc filename `autobyteus-web/docs/application-bundle-iframe-contract-v1.md` is now historical; its contents document the current `backendBaseUrl`-based contract.
- The server built-in application mirrors are intentionally synced copies of the root sample apps; future edits must keep those mirrors aligned.
- Existing runtime journals still use a legacy internal `execution_ref` SQLite column name for storage compatibility, but the public/shared runtime-control and event contracts now use only `bindingIntentId`.
- API/E2E should still exercise the new monotonic launch-success behavior against live runs because the new regression coverage is local/unit-level rather than full-stack runtime validation.
- packaged UI vendor copies now intentionally mirror the frontend SDK dist module set; future frontend-SDK surface growth must continue to ship the whole dist dependency set rather than a single copied entry file.
- LM Studio / provider model availability remains an external runtime dependency; the retained `qwen3.6` `Model unloaded` failure from 2026-04-20 was not reproducible or fixable in repo-owned implementation code and must be revalidated in the next live API/E2E run.
- API/E2E should still validate app-scoped hot re-entry against a genuinely broken then repaired imported package, because the new availability/resource-slot coverage is local and narrow rather than full live-browser/runtime validation.
- The web GraphQL codegen step still depends on a live local schema endpoint (`http://localhost:8000/graphql` in this worktree config); when that endpoint is unavailable, query/schema drift must be reconciled manually and then verified through focused web tests and build output.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes:
  - `autobyteus-application-frontend-sdk/src/create-application-backend-mount-transport.ts` is `316` effective non-empty lines.
  - Brief Studio frontend authoring is split into `frontend-src/app.js` (`7`), `frontend-src/brief-studio-runtime.js` (`296`), and `frontend-src/brief-studio-renderer.js` (`281`).
  - Round-7 changed source files remain below the hard limit, including `backend-src/services/brief-run-launch-service.ts` (`244`) and `backend-src/services/lesson-runtime-service.ts` (`279`).
  - Socratic Math Teacher’s larger new modules stay below the hard limit, including `frontend-src/socratic-runtime.js` (`256`).
  - Round-3 API/E2E Local Fix changed source implementation files also stayed below the hard limit, including `applications/brief-studio/scripts/build-package.mjs` (`199`) and `applications/socratic-math-teacher/scripts/build-package.mjs` (`198`); the touched integration test file is exempt from the hard source-file limit.
  - Round-5 API/E2E Local Fix changed source implementation files also stayed below the hard limit, including `autobyteus-server-ts/src/application-orchestration/tools/publish-artifact-tool.ts` (`249`), `applications/brief-studio/backend-src/services/brief-run-launch-service.ts` (`245`), and `applications/socratic-math-teacher/backend-src/services/lesson-runtime-service.ts` (`280`); touched test files remain outside the hard source-file limit.

## Environment Or Dependency Notes

- No new third-party runtime dependencies were introduced for this implementation slice.
- The workspace lockfile was refreshed after adding the new Socratic app package workspace metadata and running a workspace install needed for local builds.
- Root sample app build outputs and server built-in package mirrors were regenerated as part of this implementation.

## Local Implementation Checks Run

### Latest rerun after API/E2E round-11 Local Fix `AOR-E2E-018`

- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts exec vitest run tests/unit/application-packages/application-package-service.test.ts tests/unit/application-bundles/file-application-bundle-provider.test.ts tests/unit/application-storage/application-platform-state-store.test.ts tests/unit/application-orchestration/application-orchestration-recovery-service.test.ts tests/unit/application-orchestration/application-availability-service.test.ts tests/unit/application-backend-gateway/application-backend-gateway-service.test.ts tests/integration/application-backend/brief-studio-imported-package.integration.test.ts` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts build` ✅

### Latest rerun after Local Fix `AOR-LF-012`

- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts exec vitest run tests/unit/application-packages/application-package-service.test.ts tests/unit/application-bundles/file-application-bundle-provider.test.ts tests/unit/application-storage/application-platform-state-store.test.ts tests/unit/application-orchestration/application-orchestration-recovery-service.test.ts tests/unit/application-orchestration/application-availability-service.test.ts tests/unit/application-backend-gateway/application-backend-gateway-service.test.ts tests/integration/application-backend/brief-studio-imported-package.integration.test.ts` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts build` ✅

### Latest rerun after the round-5 API/E2E live-runtime Local Fix finding

- `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/brief-studio build` ✅
- `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/socratic-math-teacher build` ✅
- synced rebuilt root sample apps into `autobyteus-server-ts/application-packages/platform/applications/brief-studio/` and `autobyteus-server-ts/application-packages/platform/applications/socratic-math-teacher/` via `rsync -a --delete --exclude node_modules ...` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts build` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts exec vitest run tests/unit/application-orchestration/publish-artifact-tool.test.ts tests/unit/application-backend/app-owned-binding-intent-correlation.test.ts tests/integration/application-backend/brief-studio-imported-package.integration.test.ts` ✅

### Latest rerun after the round-8 architecture pass

- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-application-sdk-contracts build` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-application-backend-sdk build` ✅
- `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/brief-studio build` ✅
- `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/socratic-math-teacher build` ✅
- synced rebuilt root sample apps into `autobyteus-server-ts/application-packages/platform/applications/brief-studio/` and `autobyteus-server-ts/application-packages/platform/applications/socratic-math-teacher/` via `rsync -a --delete --exclude node_modules ...` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts exec vitest run tests/unit/application-bundles/file-application-bundle-provider.test.ts tests/unit/application-backend-gateway/application-backend-gateway-service.test.ts tests/unit/application-orchestration/application-orchestration-host-service.test.ts tests/unit/application-orchestration/application-execution-event-dispatch-service.test.ts tests/unit/application-orchestration/application-resource-configuration-service.test.ts tests/unit/application-orchestration/application-availability-service.test.ts tests/unit/application-backend/app-owned-binding-intent-correlation.test.ts tests/integration/application-backend/brief-studio-imported-package.integration.test.ts` ✅

### Latest rerun after Local Fix `AOR-LF-008`

- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-application-sdk-contracts build` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-application-backend-sdk build` ✅
- `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/brief-studio build` ✅
- `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/socratic-math-teacher build` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts exec vitest run tests/unit/application-bundles/file-application-bundle-provider.test.ts tests/unit/application-backend-gateway/application-backend-gateway-service.test.ts tests/unit/application-orchestration/application-execution-event-dispatch-service.test.ts tests/unit/application-orchestration/application-orchestration-host-service.test.ts tests/unit/application-orchestration/application-availability-service.test.ts tests/unit/application-orchestration/application-resource-configuration-service.test.ts tests/unit/application-backend/app-owned-binding-intent-correlation.test.ts tests/integration/application-backend/brief-studio-imported-package.integration.test.ts` ✅

### Latest rerun after the round-3 API/E2E Local Fix finding

- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-application-frontend-sdk build` ✅
- `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/brief-studio build` ✅
- `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/socratic-math-teacher build` ✅
- synced rebuilt root sample apps into `autobyteus-server-ts/application-packages/platform/applications/brief-studio/` and `autobyteus-server-ts/application-packages/platform/applications/socratic-math-teacher/` via `rsync -a --delete --exclude node_modules ...` ✅
- `node --input-type=module` import probes for:
  - `file:///Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/brief-studio/dist/importable-package/applications/brief-studio/ui/generated/graphql-client.js`
  - `file:///Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/socratic-math-teacher/dist/importable-package/applications/socratic-math-teacher/ui/generated/graphql-client.js` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts exec vitest run tests/integration/application-backend/brief-studio-imported-package.integration.test.ts` ✅

### Latest rerun after the round-7 Local Fix finding

- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-application-sdk-contracts build` ✅
- `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/brief-studio build` ✅
- `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/socratic-math-teacher build` ✅
- synced rebuilt root sample apps into `autobyteus-server-ts/application-packages/platform/applications/brief-studio/` and `autobyteus-server-ts/application-packages/platform/applications/socratic-math-teacher/` via `rsync -a --delete --exclude node_modules ...` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts build` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts exec vitest run tests/unit/application-orchestration/application-orchestration-host-service.test.ts tests/unit/application-backend/app-owned-binding-intent-correlation.test.ts tests/integration/application-backend/brief-studio-imported-package.integration.test.ts` ✅

### Latest rerun after the round-5 Local Fix findings

- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-application-frontend-sdk build` ✅
- `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/brief-studio build` ✅
- `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/socratic-math-teacher build` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts exec vitest run tests/integration/application-backend/application-backend-mount-route-transport.integration.test.ts tests/unit/application-backend/app-owned-graphql-executors.test.ts tests/integration/application-backend/brief-studio-imported-package.integration.test.ts` ✅

### Latest rerun after the round-6 architecture rework

- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-application-sdk-contracts build` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-application-backend-sdk build` ✅
- `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/brief-studio typecheck:backend` ✅
- `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/socratic-math-teacher typecheck:backend` ✅
- `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/brief-studio build` ✅
- `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/socratic-math-teacher build` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts build` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts exec vitest run tests/unit/application-orchestration/application-execution-event-dispatch-service.test.ts tests/unit/application-orchestration/application-orchestration-host-service.test.ts tests/unit/application-orchestration/application-orchestration-recovery-service.test.ts tests/unit/application-orchestration/publish-artifact-tool.test.ts tests/unit/application-backend/app-owned-binding-intent-correlation.test.ts` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts exec vitest run tests/unit/application-orchestration/application-execution-event-dispatch-service.test.ts tests/unit/application-orchestration/application-orchestration-host-service.test.ts tests/unit/application-backend/app-owned-graphql-executors.test.ts tests/unit/application-backend/app-owned-binding-intent-correlation.test.ts tests/integration/application-backend/brief-studio-imported-package.integration.test.ts` ✅

- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-application-sdk-contracts build` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-application-backend-sdk build` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-application-frontend-sdk build` ✅
- `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/brief-studio typecheck:backend` ✅
- `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/socratic-math-teacher typecheck:backend` ✅
- `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/brief-studio build` ✅
- `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/socratic-math-teacher build` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-web codegen` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-web exec vitest run components/applications/__tests__/ApplicationIframeHost.spec.ts components/applications/__tests__/ApplicationSurface.spec.ts` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-web build` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts build` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts exec vitest run tests/unit/application-orchestration/application-execution-event-dispatch-service.test.ts tests/unit/application-orchestration/application-orchestration-host-service.test.ts` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts exec vitest run tests/integration/application-backend/brief-studio-imported-package.integration.test.ts` ✅
- `node --check /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/brief-studio/ui/app.js` ✅
- `node --check /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/brief-studio/ui/brief-studio-runtime.js` ✅
- `node --check /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/brief-studio/ui/brief-studio-renderer.js` ✅
- `node --check /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/brief-studio/ui/generated/graphql-client.js` ✅
- `node --check /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/socratic-math-teacher/ui/app.js` ✅
- `node --check /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/socratic-math-teacher/ui/socratic-runtime.js` ✅
- `node --check /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/socratic-math-teacher/ui/socratic-renderer.js` ✅
- `node --check /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/socratic-math-teacher/ui/generated/graphql-client.js` ✅

Record only implementation-scoped checks here, such as build, typecheck, unit tests, and narrow integration checks around the changed code.
Do not stand up API/E2E validation environments or treat that work as part of this section.
Do not report API, E2E, or broader executable validation as passed in this artifact.

## Downstream Validation Hints / Suggested Scenarios

- Launch Brief Studio from the Applications surface and verify the host only ensures readiness and provides iframe bootstrap with `backendBaseUrl`; the app should decide later when to create or relaunch runs.
- Verify Brief Studio keeps business identity on `briefId`, persists one pending binding intent before each direct launch, and projects `RUN_STARTED`, `ARTIFACT`, and terminal run events into app-owned state by reconciling `bindingIntentId`.
- Import the rebuilt Brief Studio and Socratic Math Teacher packages and verify the packaged apps match the repo-local runnable roots.
- Exercise one `/backend/routes/*` JSON request through the backend-mount helper and verify the application route receives a parsed object body rather than a raw JSON string.
- Send valid single-operation GraphQL requests without `operationName` to both teaching apps and verify they still dispatch on the app-owned GraphQL path.
- Exercise a crash/retry style direct launch where binding creation succeeds but app-owned mapping commit is interrupted, then verify `getRunBindingByIntentId(...)` plus app-owned pending-intent state can finalize ownership without losing early events.
- Exercise a successful direct launch where an early same-binding event lands before `startRun(...)` returns, and verify Brief Studio does not regress `final_brief` back to `researching` and Socratic does not regress early `RUN_FAILED` back to `active`.
- Import both packaged generated GraphQL clients directly from their `dist/importable-package/.../ui/generated/graphql-client.js` paths and verify the vendored frontend SDK dependency set resolves without missing sibling ESM modules.
- Re-run the 2026-04-20 live Brief Studio qwen3.5 scenario and verify `publish_artifact` no longer pauses for external approval and successfully projects a durable artifact when the model emits the previously observed shorthand `artifactRef` forms.
- Re-run the live qwen3.6 scenario only as a provider/runtime recheck; if `Model unloaded` persists while qwen3.5 succeeds, treat that remaining issue as external LM Studio availability rather than an app-owned contract failure.
- Open Socratic Math Teacher, start a lesson, send follow-up questions and hint requests, and verify they reuse the existing binding via `postRunInput(...)` instead of relaunching through the host.
- Quarantine one imported application with an invalid manifest/resource-slot declaration, repair it in place, hit `POST /rest/applications/:applicationId/backend/reload`, and verify only that application re-enters to `ACTIVE` while other applications remain available.
- Exercise `runtimeControl.getConfiguredResource(...)` with both manifest-default and persisted override resource selections and verify slot owner/kind validation rejects invalid overrides while valid bundle/shared team selections launch correctly.
- Restart the server with live/nonterminal bindings and verify startup recovery rebuilds bindings, reattaches observers, and only then admits live runtime-control and artifact-ingress traffic.
- Re-run the timing-sensitive cases already covered by unit tests: append during dispatch-drain shutdown, preserve future retry/backoff timers, and start a run with `initialInput` that immediately tries to publish an artifact.

## API / E2E / Executable Validation Still Required

- end-to-end validation of app-owned `startRun(...)` and `postRunInput(...)` flows against real agent-team resources
- restart/recovery validation for `ApplicationOrchestrationStartupGate`, recovered bindings, and orphan/failure handling
- live artifact-ingress gating validation while startup recovery is still in progress
- notification streaming validation under real application launches
- UI/E2E validation of the updated Applications launch flow, Brief Studio review workflow, and Socratic Math Teacher lesson workflow
- app-scoped reload/reenter validation for imported-package quarantine/repair flows
- live validation of manifest-declared resource-slot defaults and overrides through the hosted backend/runtime-control path

### Latest implementation update after the round-10 architecture pass and API/E2E round-6 Local Fix

- Added an explicit host-managed pre-entry configuration gate to `autobyteus-web/components/applications/ApplicationShell.vue`; the app page now loads saved setup first and only launches the backend/iframe after the user enters the application.
- Added `ApplicationLaunchSetupPanel.vue` plus `applicationLaunchSetup.ts` so `/applications/:id` can persist app-declared resource-slot configuration and bounded host-understood launch defaults without starting a run.
- Extended the manifest contract to make `ApplicationManifestV3.resourceSlots.supportedLaunchDefaults` authoritative for host-visible defaults (`llmModelIdentifier`, `runtimeKind`, `workspaceRootPath`) and wired parser validation plus teaching-app declarations to that contract.
- Tightened `ApplicationResourceConfigurationService` so writes reject unsupported launch-default keys, while readback strips stale unsupported persisted defaults and always normalizes `autoExecuteTools = true` for application-mode setup.
- Updated Brief Studio and Socratic Math Teacher to read host-saved `runtimeKind` / `llmModelIdentifier` / `workspaceRootPath` from `runtimeControl.getConfiguredResource(...)`, removed inline model picking from their primary canvases, and kept application-mode launches auto-executing tools.
- Added an LM Studio-specific chat renderer that flattens prior tool-call / tool-result history into plain text before sending follow-up turns, avoiding the retained qwen3.6 `safe`-filter chat-template failure path observed in the live run.

### Latest rerun after the round-10 architecture pass and API/E2E round-6 Local Fix

- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-ts exec vitest run tests/unit/llm/prompt-renderers/lmstudio-chat-renderer.test.ts tests/unit/llm/api/lmstudio-llm.test.ts` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts exec vitest run tests/unit/application-bundles/file-application-bundle-provider.test.ts tests/unit/application-orchestration/application-resource-configuration-service.test.ts tests/unit/application-backend/app-owned-binding-intent-correlation.test.ts tests/integration/application-backend/brief-studio-imported-package.integration.test.ts` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-web exec vitest run components/applications/__tests__/ApplicationIframeHost.spec.ts components/applications/__tests__/ApplicationSurface.spec.ts components/applications/__tests__/ApplicationLaunchSetupPanel.spec.ts components/applications/__tests__/ApplicationShell.spec.ts` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-application-sdk-contracts build` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-application-backend-sdk build` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-ts build` ✅
- `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/brief-studio build` ✅
- `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/socratic-math-teacher build` ✅
- synced rebuilt root sample apps into `autobyteus-server-ts/application-packages/platform/applications/brief-studio/` and `autobyteus-server-ts/application-packages/platform/applications/socratic-math-teacher/` via `rsync -a --delete --exclude node_modules ...` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts build` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-web build` ✅

### Latest implementation update after code-review Local Fix `AOR-LF-009`

- Made the `/applications/:id` pre-entry gate authoritative in `autobyteus-web/components/applications/ApplicationShell.vue`; the shell now waits for launch-setup readiness before exposing any initial app-entry path and blocks retry/reload entry while setup is unresolved.
- Extended `ApplicationLaunchSetupPanel.vue` to emit authoritative gate state upward (`loading` / `error` / `ready`) instead of keeping setup readiness private to the panel.
- Centralized host-gate readiness rules in `autobyteus-web/utils/application/applicationLaunchSetup.ts`, including blocking on setup load failure, in-flight saves, unsaved draft changes, missing required resource selection, and missing required saved `llmModelIdentifier`.
- Replaced the prior shell regression expectation with bounded coverage that incomplete setup and setup-load failure keep entry disabled, and added panel coverage for both not-ready and load-failure gate emissions.

### Latest rerun after code-review Local Fix `AOR-LF-009`

- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-web exec vitest run components/applications/__tests__/ApplicationLaunchSetupPanel.spec.ts components/applications/__tests__/ApplicationShell.spec.ts components/applications/__tests__/ApplicationIframeHost.spec.ts components/applications/__tests__/ApplicationSurface.spec.ts` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-web build` ✅

### Latest rerun after Local Fix `AOR-LF-010`

- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts exec vitest run tests/unit/application-orchestration/application-availability-service.test.ts tests/unit/application-backend-gateway/application-backend-gateway-service.test.ts tests/unit/application-orchestration/application-orchestration-recovery-service.test.ts` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts build` ✅

### Latest rerun after Local Fix `AOR-LF-011`

- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts exec vitest run tests/unit/application-orchestration/application-availability-service.test.ts tests/unit/application-backend-gateway/application-backend-gateway-service.test.ts tests/unit/application-orchestration/application-orchestration-recovery-service.test.ts` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts build` ✅

### Latest implementation continuation after the round-12 architecture pass

- Extended the application GraphQL surface to expose resource-slot summaries on catalog entries so the web catalog can describe setup readiness from declared slot metadata instead of leaking raw bundle-resource detail into the primary card surface.
- Updated `ApplicationCard.vue` to keep the primary catalog card business/setup-first:
  - required slots now show a required host-setup summary,
  - optional-only slots show optional setup wording, and
  - apps with no declared setup continue to show a business-flow entry summary.
- Kept `/applications/:id` on the authoritative saved-setup gate path while preserving the already-implemented business-first canvas cleanup in Brief Studio and Socratic Math Teacher.
- Rebuilt both teaching applications and re-synced the server built-in mirrors so the root runnable apps, importable packages, and server-bundled copies remain aligned after the catalog/business-surface cleanup.
- Manually aligned `autobyteus-web/generated/graphql.ts` with the new `resourceSlots` query/schema addition because the configured codegen endpoint was unavailable in this environment.

### Latest rerun after the round-12 implementation continuation

- `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/brief-studio build` ✅
- `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/socratic-math-teacher build` ✅
- synced rebuilt root sample apps into `autobyteus-server-ts/application-packages/platform/applications/brief-studio/` and `autobyteus-server-ts/application-packages/platform/applications/socratic-math-teacher/` via `rsync -a --delete --exclude node_modules ...` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-web exec vitest run stores/__tests__/applicationStore.spec.ts components/applications/__tests__/ApplicationLaunchSetupPanel.spec.ts components/applications/__tests__/ApplicationShell.spec.ts components/applications/__tests__/ApplicationCard.spec.ts components/applications/__tests__/ApplicationIframeHost.spec.ts components/applications/__tests__/ApplicationSurface.spec.ts` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts build` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-web build` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-web codegen` ⚠️ blocked in this environment because `http://localhost:8000/graphql` was unavailable (`ECONNREFUSED`); `autobyteus-web/generated/graphql.ts` was updated manually to match the query/schema change and the focused web tests/build above passed against that aligned output.

### Latest implementation update after the round-14 architecture pass

- Added the concrete package-registry owner under `autobyteus-server-ts/src/application-packages/`:
  - introduced `ApplicationPackageRegistryService`,
  - introduced the shared `ApplicationPackageRegistrySnapshot` domain shape, and
  - kept `ApplicationPackageService` as a compatibility alias while moving runtime ownership to the new registry boundary.
- Moved imported-package root metadata and package-level diagnostics behind `ApplicationPackageRegistryService.getRegistrySnapshot()` so callers no longer need to read package-root settings/registry stores directly.
- Refactored `ApplicationBundleService` to consume package-registry snapshots instead of reading `ApplicationPackageRootSettingsStore` / `ApplicationPackageRegistryStore` directly, while preserving legacy test-provider compatibility through the registry boundary.
- Updated `FileApplicationBundleProvider` so catalog discovery now derives bundle roots from the authoritative package-registry snapshot.
- Extended `ApplicationPlatformStateStore` with the authoritative startup inventory / presence APIs:
  - `listKnownApplicationIds()` now enumerates persisted app ids from existing platform state,
  - `getExistingStatePresence(applicationId)` now reports `PRESENT` / `ABSENT` without preparing new state.
- Refactored startup recovery to use `ApplicationPlatformStateStore` as the known-app inventory owner and to return explicit per-app recovery outcomes (`RECOVERED`, `QUARANTINED`, `NO_PERSISTED_STATE`).
- Added `ApplicationAvailabilityService.applyStartupRecoveryOutcome(...)` and updated `server-runtime.ts` so startup admission now explicitly maps:
  - catalog-active + no persisted state -> `ACTIVE`,
  - catalog-quarantined -> `QUARANTINED`,
  - persisted-only recovered state -> `QUARANTINED` until a valid package returns.
- Updated startup dispatch resume to enumerate candidate app ids through `ApplicationPlatformStateStore` instead of store-specific filesystem scans.
- Added focused regression coverage for:
  - package-registry diagnostics,
  - bundle discovery from registry snapshots,
  - startup `NO_PERSISTED_STATE` handling without preparing new state,
  - persisted-state inventory/presence probing,
  - startup availability mapping, and
  - the imported-package Brief Studio path under the refactored registry/bootstrap flow.

### Latest rerun after the round-14 implementation update

- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts exec vitest run tests/unit/application-packages/application-package-service.test.ts tests/unit/application-bundles/file-application-bundle-provider.test.ts tests/unit/application-storage/application-platform-state-store.test.ts tests/unit/application-orchestration/application-orchestration-recovery-service.test.ts tests/unit/application-orchestration/application-availability-service.test.ts tests/unit/application-backend-gateway/application-backend-gateway-service.test.ts tests/integration/application-backend/brief-studio-imported-package.integration.test.ts` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts build` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts exec vitest run tests/e2e/applications/application-packages-graphql.e2e.test.ts` ⚠️ still blocked by a pre-existing stale import in the suite (`tests/e2e/applications/application-packages-graphql.e2e.test.ts` imports missing `src/application-sessions/services/application-session-service.js` before any of the refactored package-registry code executes).
