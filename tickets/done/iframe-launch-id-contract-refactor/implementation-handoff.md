# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/iframe-launch-id-contract-refactor/tickets/in-progress/iframe-launch-id-contract-refactor/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/iframe-launch-id-contract-refactor/tickets/in-progress/iframe-launch-id-contract-refactor/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/iframe-launch-id-contract-refactor/tickets/in-progress/iframe-launch-id-contract-refactor/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/iframe-launch-id-contract-refactor/tickets/in-progress/iframe-launch-id-contract-refactor/design-review-report.md`

## What Changed

Implemented the clean-cut iframe launch identity contract refactor for ticket `iframe-launch-id-contract-refactor`.

- Bumped hosted iframe/bootstrap contract to v3 and frontend SDK compatibility to `"3"`.
- Replaced public `launchInstanceId` iframe contract surfaces with top-level `iframeLaunchId` and URL query `autobyteusIframeLaunchId`.
- Kept stale iframe protection at the iframe boundary with source, origin, contract-version, application-id, and iframe-launch-id checks.
- Narrowed normal application backend `ApplicationRequestContext` to durable `{ applicationId }` only.
- Removed iframe launch identity from frontend backend transport headers, REST context normalization, gateway normalization, worker handler contexts, docs, tests, built-in samples, generated vendors, and importable sample outputs.
- Updated package/manifest compatibility gates so frontend SDK contract `"3"` is required and retired frontend SDK contract versions are rejected early.
- Removed host technical-detail UI exposure of the launch id and refreshed terminology in developer docs.

## Key Files Or Areas

Hand-authored implementation areas:

- Shared SDK contracts:
  - `autobyteus-application-sdk-contracts/src/application-iframe-contract.ts`
  - `autobyteus-application-sdk-contracts/src/index.ts`
  - `autobyteus-application-sdk-contracts/src/manifests.ts`
  - `autobyteus-application-sdk-contracts/tests/application-iframe-contract.test.mjs`
- Frontend SDK:
  - `autobyteus-application-frontend-sdk/src/hosted-application-startup.ts`
  - `autobyteus-application-frontend-sdk/src/application-client.ts`
  - `autobyteus-application-frontend-sdk/src/create-application-backend-mount-transport.ts`
  - `autobyteus-application-frontend-sdk/tests/hosted-application-startup.test.mjs`
- Web host iframe flow:
  - `autobyteus-web/stores/applicationHostStore.ts`
  - `autobyteus-web/utils/application/applicationLaunchDescriptor.ts`
  - `autobyteus-web/utils/application/applicationAssetUrl.ts`
  - `autobyteus-web/components/applications/ApplicationSurface.vue`
  - `autobyteus-web/components/applications/ApplicationIframeHost.vue`
  - `autobyteus-web/components/applications/ApplicationShell.vue`
  - related web tests and localization entries
- Server/backend boundary:
  - `autobyteus-server-ts/src/api/rest/application-backends.ts`
  - `autobyteus-server-ts/src/application-backend-gateway/services/application-backend-gateway-service.ts`
  - `autobyteus-server-ts/src/application-engine/worker/application-worker-runtime.ts`
  - `autobyteus-server-ts/src/application-bundles/utils/application-manifest.ts`
  - `autobyteus-server-ts/src/application-bundles/utils/application-backend-manifest.ts`
  - related unit/integration tests
- Docs:
  - `autobyteus-web/docs/application-bundle-iframe-contract-v3.md`
  - `autobyteus-web/docs/applications.md`
  - `autobyteus-server-ts/docs/modules/application_backend_gateway.md`
  - `autobyteus-server-ts/docs/modules/application_sessions.md`
  - `autobyteus-server-ts/docs/modules/application_orchestration.md`
  - SDK README files
- Built-in samples:
  - `applications/brief-studio/**`
  - `applications/socratic-math-teacher/**`

Generated/refreshed areas to expect as noisy but intentional:

- SDK package `dist/` outputs for `@autobyteus/application-sdk-contracts` and `autobyteus-application-frontend-sdk`.
- Sample `ui/vendor/**` SDK vendor copies.
- Sample runtime `ui/**` outputs.
- Sample `dist/importable-package/**` committed importable-package outputs.

## Important Assumptions

- The approved target bootstrap shape is top-level `iframeLaunchId` plus `requestContext: { applicationId }`; no nested `iframe: { launchId }` wrapper was introduced.
- This is a breaking contract cleanup; no v2/`launchInstanceId` compatibility aliases, query fallbacks, backend headers, or request-context fields were preserved.
- REST route `:applicationId` remains authoritative for normal app backend calls; direct gateway calls still reject mismatched `requestContext.applicationId`.
- Backend definition contract version remains v2; only hosted frontend SDK compatibility moved to `"3"` for this ticket.

## Known Risks

- The diff is broad because generated SDK dist, sample vendors, runtime outputs, and importable sample packages were refreshed.
- API/E2E validation still needs to exercise a real host + packaged iframe bootstrap path, including stale iframe rejection and old package rejection.
- `pnpm -C autobyteus-server-ts typecheck` is not currently a useful pass/fail signal: the script includes `tests` while `rootDir` is `src`, producing TS6059 rootDir errors unrelated to this change. `build:full` and targeted Vitest coverage passed instead.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes:
  - Legacy identifier scan across live source/tests/docs/SDK dist/sample vendors/sample importable outputs returned no `launchInstanceId`, `autobyteusLaunchInstanceId`, launch-instance header/query constant, v2 iframe constant, or v2 payload helper names.
  - One intentional `autobyteusContractVersion=2` literal remains only in `autobyteus-application-sdk-contracts/tests/application-iframe-contract.test.mjs` as a negative stale-version rejection test.
  - Changed hand-authored source implementation files are below 500 non-empty lines; no file had a changed-line delta above 220.

## Environment Or Dependency Notes

- `node_modules` was absent at implementation start; ran `pnpm install` successfully.
- Web tests needed `pnpm -C autobyteus-web exec nuxi prepare` before targeted Vitest execution.
- Server worker tests needed generated Prisma client/build output; ran Prisma generate and `build:full` before server-targeted tests.
- A couple of early broad test invocations used the wrong `pnpm --` argument shape and were stopped or failed on unrelated broad-suite setup. The checks listed below are the implementation-scoped evidence to use.

## Local Implementation Checks Run

Passed:

- `pnpm install`
- `pnpm -C autobyteus-application-sdk-contracts test`
- `pnpm -C autobyteus-application-frontend-sdk test`
- `pnpm -C autobyteus-application-backend-sdk build`
- `pnpm -C autobyteus-ts build`
- `pnpm -C autobyteus-web exec nuxi prepare`
- `NUXT_TEST=true pnpm -C autobyteus-web exec vitest run components/applications/__tests__/ApplicationIframeHost.spec.ts components/applications/__tests__/ApplicationSurface.spec.ts components/applications/__tests__/ApplicationShell.spec.ts stores/__tests__/applicationHostStore.spec.ts utils/application/__tests__/applicationAssetUrl.spec.ts`
- `pnpm -C autobyteus-server-ts exec prisma generate --schema ./prisma/schema.prisma && pnpm -C autobyteus-server-ts build:full`
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/api/rest/application-backends-prefix.test.ts tests/unit/application-backend-gateway/application-backend-gateway-service.test.ts tests/unit/application-engine/application-engine-host-service.test.ts tests/integration/application-backend/application-backend-mount-route-transport.integration.test.ts tests/unit/application-bundles/file-application-bundle-provider.test.ts tests/unit/application-backend/app-owned-graphql-executors.test.ts tests/unit/application-backend/app-owned-binding-intent-correlation.test.ts`
- `pnpm -C autobyteus-server-ts exec vitest run tests/integration/application-backend/application-backend-rest-ws.integration.test.ts tests/unit/application-storage/application-storage-lifecycle-service.test.ts`
- `pnpm -C applications/brief-studio build`
- `pnpm -C applications/socratic-math-teacher build`
- `pnpm -C applications/brief-studio typecheck:backend && pnpm -C applications/socratic-math-teacher typecheck:backend`
- `git diff --check`
- Legacy identifier scan:
  - `rg -n "launchInstanceId|autobyteusLaunchInstanceId|x-autobyteus-launch-instance-id|Launch instance id|launch-instance-id|APPLICATION_IFRAME_CONTRACT_VERSION_V2|APPLICATION_FRONTEND_SDK_CONTRACT_VERSION_V2|APPLICATION_IFRAME_QUERY_LAUNCH_INSTANCE_ID|EnvelopeV2|PayloadV2|BootstrapPayloadV2" autobyteus-application-sdk-contracts autobyteus-application-frontend-sdk autobyteus-application-backend-sdk autobyteus-web autobyteus-server-ts applications/brief-studio applications/socratic-math-teacher --glob '!**/node_modules/**'`

Known failing / non-actionable in this scope:

- `pnpm -C autobyteus-server-ts typecheck` fails with TS6059 because `tsconfig.json` includes `tests` while `rootDir` is `src`. This appears to be a pre-existing script/config mismatch rather than a failure introduced by this contract refactor.

## Downstream Validation Hints / Suggested Scenarios

- Launch Brief Studio and Socratic Math Teacher through the real host UI and verify the child iframe receives v3 URL hints, posts ready with `{ applicationId, iframeLaunchId }`, receives bootstrap with top-level `iframeLaunchId`, and sees `bootstrap.requestContext` as `{ applicationId }` only.
- Exercise stale iframe protection by forcing a reload/retry and confirming old ready/bootstrap messages with stale `iframeLaunchId`, wrong source, wrong origin, wrong app id, or wrong contract version are ignored or fail safely.
- Try importing/serving a package manifest or backend bundle manifest with retired frontend SDK contract version and confirm the v3 gate rejects it early with clear unsupported-version errors.
- Verify frontend SDK backend mount transport requests no longer emit launch correlation headers and server app handlers receive only `{ applicationId }` as platform request context.
- Smoke-test generated sample importable packages, not only hand-authored sample source.

## API / E2E / Executable Validation Still Required

API/E2E validation remains required and is owned by `api_e2e_engineer` after code review. This implementation handoff does not claim end-to-end product validation or validation-environment sign-off.
