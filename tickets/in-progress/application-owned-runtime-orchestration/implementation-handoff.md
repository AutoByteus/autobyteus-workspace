# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/design-review-report.md`
- Most recent implementation review report already folded into this cumulative package: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/review-report.md`

## Current Status

Implemented the round-4 authoritative design expansion for application-owned runtime orchestration and the follow-on round-5 Local Fix corrections:

- hosted app backends now expose one authoritative iframe/bootstrap transport base, `backendBaseUrl`, plus the non-derivable notifications URL,
- platform SDK/web host ownership now stops at schema-agnostic transport helpers while app business schema/codegen artifacts stay app-local,
- Brief Studio now teaches the “many runs over one business record” pattern with app-owned GraphQL and `executionRef = briefId`, and
- Socratic Math Teacher now teaches the “one long-lived conversational binding with follow-up input” pattern with a real app-owned GraphQL API.

The previously blocked Local Fix findings remain resolved in this cumulative state:

- `AOR-LF-001` dispatch drain tail race
- `AOR-LF-002` `RUN_STARTED` ordering before `initialInput` artifact ingress
- `AOR-LF-003` oversized implementation file split
- `AOR-LF-004` retry/backoff timer preservation during dispatcher tail rechecks
- `AOR-LF-005` backend-mount route helper now preserves JSON route-body round-tripping by sending JSON bodies with a JSON content type
- `AOR-LF-006` Brief Studio and Socratic Math Teacher GraphQL executors now accept valid single-operation requests that omit `operationName`

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
- bound runs with `executionRef = briefId` and exposed binding history through `briefExecutions(briefId)` via runtime-control listing
- split frontend authoring into `frontend-src/app.js`, `frontend-src/brief-studio-runtime.js`, and `frontend-src/brief-studio-renderer.js`, then regenerated runnable `ui/` output and importable-package output
- updated the package build to copy frontend authoring, refresh the vendored frontend SDK, emit the new backend bundle manifest, and keep the importable package aligned
- removed the obsolete public query/command business API files from the sample

### 4) Socratic Math Teacher upgraded from placeholder to real teaching app

- created an app-owned package/build layout with `package.json`, `tsconfig.backend.json`, `scripts/build-package.mjs`, `api/graphql/schema.graphql`, `frontend-src/`, and `backend-src/`
- implemented a lesson-centric GraphQL API with `lessons`, `lesson`, `startLesson`, `askFollowUp`, `requestHint`, and `closeLesson`
- introduced one long-lived conversational binding per lesson and routed follow-up input through `runtimeControl.postRunInput(...)`
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

## Key Files Or Areas

- `autobyteus-application-frontend-sdk/src/index.ts`
- `autobyteus-application-frontend-sdk/src/application-client-transport.ts`
- `autobyteus-application-frontend-sdk/src/create-application-backend-mount-transport.ts`
- `autobyteus-web/types/application/ApplicationHostTransport.ts`
- `autobyteus-web/utils/application/applicationHostTransport.ts`
- `autobyteus-web/components/applications/__tests__/ApplicationIframeHost.spec.ts`
- `applications/brief-studio/api/graphql/schema.graphql`
- `applications/brief-studio/backend-src/graphql/index.ts`
- `applications/brief-studio/backend-src/services/brief-read-service.ts`
- `applications/brief-studio/backend-src/services/brief-run-launch-service.ts`
- `applications/brief-studio/frontend-src/app.js`
- `applications/brief-studio/frontend-src/brief-studio-runtime.js`
- `applications/brief-studio/frontend-src/brief-studio-renderer.js`
- `applications/brief-studio/scripts/build-package.mjs`
- `applications/socratic-math-teacher/api/graphql/schema.graphql`
- `applications/socratic-math-teacher/backend-src/index.ts`
- `applications/socratic-math-teacher/backend-src/services/lesson-runtime-service.ts`
- `applications/socratic-math-teacher/backend-src/event-handlers/on-artifact.ts`
- `applications/socratic-math-teacher/backend-src/migrations/001_create_lessons.sql`
- `applications/socratic-math-teacher/frontend-src/app.js`
- `applications/socratic-math-teacher/frontend-src/socratic-runtime.js`
- `applications/socratic-math-teacher/frontend-src/socratic-renderer.js`
- `applications/socratic-math-teacher/scripts/build-package.mjs`
- `autobyteus-server-ts/application-packages/platform/applications/brief-studio/**`
- `autobyteus-server-ts/application-packages/platform/applications/socratic-math-teacher/**`
- `autobyteus-server-ts/tests/integration/application-backend/application-backend-mount-route-transport.integration.test.ts`
- `autobyteus-server-ts/tests/integration/application-backend/brief-studio-imported-package.integration.test.ts`
- `autobyteus-server-ts/tests/unit/application-backend/app-owned-graphql-executors.test.ts`

## Important Assumptions

- No compatibility wrapper is retained for the removed platform-owned `applicationSession` / singular `runtimeTarget` model.
- `ApplicationOrchestrationStartupGate` remains the owner for startup-sensitive live runtime-control and artifact-ingress admission.
- `backendBaseUrl` is the authoritative hosted backend transport hint; GraphQL/query/command/route URLs derive from it rather than becoming parallel bootstrap fields.
- Platform SDKs stay business-schema agnostic; each application owns its own business schema, generated clients, and resolver/business behavior.
- Brief Studio and Socratic Math Teacher are intentional teaching artifacts and should continue demonstrating distinct application-owned orchestration patterns.

## Known Risks

- API/E2E validation is still required for restart recovery, startup gating, real notification streaming, and live runtime-control behavior on real runs.
- Imported-package validation beyond the narrow Brief Studio integration test is still required for the rebuilt sample apps.
- The web doc filename `autobyteus-web/docs/application-bundle-iframe-contract-v1.md` is now historical; its contents document the current `backendBaseUrl`-based contract.
- The server built-in application mirrors are intentionally synced copies of the root sample apps; future edits must keep those mirrors aligned.

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
  - Socratic Math Teacher’s larger new modules stay below the hard limit, including `backend-src/services/lesson-runtime-service.ts` (`237`) and `frontend-src/socratic-runtime.js` (`256`).

## Environment Or Dependency Notes

- No new third-party runtime dependencies were introduced for this implementation slice.
- The workspace lockfile was refreshed after adding the new Socratic app package workspace metadata and running a workspace install needed for local builds.
- Root sample app build outputs and server built-in package mirrors were regenerated as part of this implementation.

## Local Implementation Checks Run

### Latest rerun after the round-5 Local Fix findings

- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-application-frontend-sdk build` ✅
- `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/brief-studio build` ✅
- `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/socratic-math-teacher build` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts exec vitest run tests/integration/application-backend/application-backend-mount-route-transport.integration.test.ts tests/unit/application-backend/app-owned-graphql-executors.test.ts tests/integration/application-backend/brief-studio-imported-package.integration.test.ts` ✅

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
- Verify Brief Studio keeps business identity on `briefId`, binds runs with `executionRef = briefId`, and projects `RUN_STARTED`, `ARTIFACT`, and terminal run events into app-owned state.
- Import the rebuilt Brief Studio and Socratic Math Teacher packages and verify the packaged apps match the repo-local runnable roots.
- Exercise one `/backend/routes/*` JSON request through the backend-mount helper and verify the application route receives a parsed object body rather than a raw JSON string.
- Send valid single-operation GraphQL requests without `operationName` to both teaching apps and verify they still dispatch on the app-owned GraphQL path.
- Open Socratic Math Teacher, start a lesson, send follow-up questions and hint requests, and verify they reuse the existing binding via `postRunInput(...)` instead of relaunching through the host.
- Restart the server with live/nonterminal bindings and verify startup recovery rebuilds bindings, reattaches observers, and only then admits live runtime-control and artifact-ingress traffic.
- Re-run the timing-sensitive cases already covered by unit tests: append during dispatch-drain shutdown, preserve future retry/backoff timers, and start a run with `initialInput` that immediately tries to publish an artifact.

## API / E2E / Executable Validation Still Required

- end-to-end validation of app-owned `startRun(...)` and `postRunInput(...)` flows against real agent-team resources
- restart/recovery validation for `ApplicationOrchestrationStartupGate`, recovered bindings, and orphan/failure handling
- live artifact-ingress gating validation while startup recovery is still in progress
- notification streaming validation under real application launches
- UI/E2E validation of the updated Applications launch flow, Brief Studio review workflow, and Socratic Math Teacher lesson workflow
