# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/design-review-report.md`
- Most recent implementation review report already folded into this cumulative package: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/review-report.md`

## Current Status

Implemented the round-6 authoritative design for application-owned runtime orchestration, including the direct `startRun(...)` handoff rework on top of the already-resolved round-1 through round-5 findings:

- hosted app backends now expose one authoritative iframe/bootstrap transport base, `backendBaseUrl`, plus the non-derivable notifications URL,
- platform SDK/web host ownership now stops at schema-agnostic transport helpers while app business schema/codegen artifacts stay app-local,
- Brief Studio now teaches the “many runs over one business record” pattern with app-owned GraphQL plus app-owned pending binding intent and `briefId -> bindingId[]` correlation, and
- Socratic Math Teacher now teaches the “one long-lived conversational binding with follow-up input” pattern with a real app-owned GraphQL API.

The previously blocked Local Fix findings remain resolved in this cumulative state:

- `AOR-LF-001` dispatch drain tail race
- `AOR-LF-002` `RUN_STARTED` ordering before `initialInput` artifact ingress
- `AOR-LF-003` oversized implementation file split
- `AOR-LF-004` retry/backoff timer preservation during dispatcher tail rechecks
- `AOR-LF-005` backend-mount route helper now preserves JSON route-body round-tripping by sending JSON bodies with a JSON content type
- `AOR-LF-006` Brief Studio and Socratic Math Teacher GraphQL executors now accept valid single-operation requests that omit `operationName`
- `AOR-LF-007` Brief Studio and Socratic Math Teacher now preserve already-projected same-binding state when `startRun(...)` succeeds after an early event has already reconciled that binding
- round-3 API/E2E packaged-client Local Fix: Brief Studio and Socratic Math Teacher importable UI packages now ship the full frontend SDK ESM dependency set required by the generated GraphQL clients

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

## Key Files Or Areas

- `autobyteus-application-frontend-sdk/src/index.ts`
- `autobyteus-application-frontend-sdk/src/application-client-transport.ts`
- `autobyteus-application-frontend-sdk/src/create-application-backend-mount-transport.ts`
- `autobyteus-web/types/application/ApplicationHostTransport.ts`
- `autobyteus-web/utils/application/applicationHostTransport.ts`
- `autobyteus-web/components/applications/__tests__/ApplicationIframeHost.spec.ts`
- `applications/brief-studio/api/graphql/schema.graphql`
- `applications/brief-studio/backend-src/graphql/index.ts`
- `applications/brief-studio/backend-src/repositories/brief-binding-repository.ts`
- `applications/brief-studio/backend-src/repositories/pending-binding-intent-repository.ts`
- `applications/brief-studio/backend-src/services/brief-read-service.ts`
- `applications/brief-studio/backend-src/services/brief-run-launch-service.ts`
- `applications/brief-studio/backend-src/services/run-binding-correlation-service.ts`
- `applications/brief-studio/backend-src/migrations/004_pending_binding_intents.sql`
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
- `autobyteus-server-ts/application-packages/platform/applications/brief-studio/**`
- `autobyteus-server-ts/application-packages/platform/applications/socratic-math-teacher/**`
- `autobyteus-server-ts/tests/integration/application-backend/application-backend-mount-route-transport.integration.test.ts`
- `autobyteus-server-ts/tests/integration/application-backend/brief-studio-imported-package.integration.test.ts`
- `autobyteus-server-ts/tests/unit/application-backend/app-owned-binding-intent-correlation.test.ts`
- `autobyteus-server-ts/tests/unit/application-backend/app-owned-graphql-executors.test.ts`

## Important Assumptions

- No compatibility wrapper is retained for the removed platform-owned `applicationSession` / singular `runtimeTarget` model.
- `ApplicationOrchestrationStartupGate` remains the owner for startup-sensitive live runtime-control and artifact-ingress admission.
- `backendBaseUrl` is the authoritative hosted backend transport hint; GraphQL/query/command/route URLs derive from it rather than becoming parallel bootstrap fields.
- Platform SDKs stay business-schema agnostic; each application owns its own business schema, generated clients, and resolver/business behavior.
- Brief Studio and Socratic Math Teacher are intentional teaching artifacts and should continue demonstrating distinct application-owned orchestration patterns.
- Direct `startRun(...)` callers must persist pending binding intent state before launch; the platform does not delay early events while app-owned mapping commits.

## Known Risks

- API/E2E validation is still required for restart recovery, startup gating, real notification streaming, and live runtime-control behavior on real runs.
- Imported-package validation beyond the narrow Brief Studio integration test is still required for the rebuilt sample apps.
- The web doc filename `autobyteus-web/docs/application-bundle-iframe-contract-v1.md` is now historical; its contents document the current `backendBaseUrl`-based contract.
- The server built-in application mirrors are intentionally synced copies of the root sample apps; future edits must keep those mirrors aligned.
- Existing runtime journals still use a legacy internal `execution_ref` SQLite column name for storage compatibility, but the public/shared runtime-control and event contracts now use only `bindingIntentId`.
- API/E2E should still exercise the new monotonic launch-success behavior against live runs because the new regression coverage is local/unit-level rather than full-stack runtime validation.
- packaged UI vendor copies now intentionally mirror the frontend SDK dist module set; future frontend-SDK surface growth must continue to ship the whole dist dependency set rather than a single copied entry file.

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

## Environment Or Dependency Notes

- No new third-party runtime dependencies were introduced for this implementation slice.
- The workspace lockfile was refreshed after adding the new Socratic app package workspace metadata and running a workspace install needed for local builds.
- Root sample app build outputs and server built-in package mirrors were regenerated as part of this implementation.

## Local Implementation Checks Run

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
- Open Socratic Math Teacher, start a lesson, send follow-up questions and hint requests, and verify they reuse the existing binding via `postRunInput(...)` instead of relaunching through the host.
- Restart the server with live/nonterminal bindings and verify startup recovery rebuilds bindings, reattaches observers, and only then admits live runtime-control and artifact-ingress traffic.
- Re-run the timing-sensitive cases already covered by unit tests: append during dispatch-drain shutdown, preserve future retry/backoff timers, and start a run with `initialInput` that immediately tries to publish an artifact.

## API / E2E / Executable Validation Still Required

- end-to-end validation of app-owned `startRun(...)` and `postRunInput(...)` flows against real agent-team resources
- restart/recovery validation for `ApplicationOrchestrationStartupGate`, recovered bindings, and orphan/failure handling
- live artifact-ingress gating validation while startup recovery is still in progress
- notification streaming validation under real application launches
- UI/E2E validation of the updated Applications launch flow, Brief Studio review workflow, and Socratic Math Teacher lesson workflow
