# API, E2E, And Executable Validation Report

## Validation Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/iframe-launch-id-contract-refactor/tickets/in-progress/iframe-launch-id-contract-refactor/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/iframe-launch-id-contract-refactor/tickets/in-progress/iframe-launch-id-contract-refactor/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/iframe-launch-id-contract-refactor/tickets/in-progress/iframe-launch-id-contract-refactor/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/iframe-launch-id-contract-refactor/tickets/in-progress/iframe-launch-id-contract-refactor/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/iframe-launch-id-contract-refactor/tickets/in-progress/iframe-launch-id-contract-refactor/implementation-handoff.md`
- Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/iframe-launch-id-contract-refactor/tickets/in-progress/iframe-launch-id-contract-refactor/review-report.md`
- Current Validation Round: `1`
- Trigger: Code-review pass for ticket `iframe-launch-id-contract-refactor`; proceed to API/E2E validation.
- Prior Round Reviewed: `N/A`
- Latest Authoritative Round: `1`

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Code-review pass requesting API/E2E validation | N/A | 0 product failures; 1 validation-harness issue fixed in durable test code | Pass | Yes | Because repository-resident durable validation was updated after code review, handoff returns to `code_reviewer` before delivery. |

## Validation Basis

Validation was derived from REQ-001 through REQ-007 and AC-001 through AC-008 in the requirements document, with extra focus on residual risks called out by code review:

- Real generated/importable sample iframe bootstrap, not only unit-level contract parsing.
- Stale source/origin/version/application/`iframeLaunchId` rejection under realistic hosted startup conditions.
- Actual package admission/import rejection for retired frontend SDK contract version `"2"`.
- Backend transport/handlers receiving only durable `{ applicationId }` request context.
- No compatibility wrappers, public dual paths, old v2 aliases, old launch headers/query names, or retained `launchInstanceId` public behavior.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable validation added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: `N/A`
- Upstream recipient notified: `N/A`

A legacy identifier scan passed with no hits across in-scope packages/samples/docs/dist/vendor outputs:

```bash
rg -n "launchInstanceId|autobyteusLaunchInstanceId|x-autobyteus-launch-instance-id|Launch instance id|launch-instance-id|APPLICATION_IFRAME_CONTRACT_VERSION_V2|APPLICATION_FRONTEND_SDK_CONTRACT_VERSION_V2|APPLICATION_IFRAME_QUERY_LAUNCH_INSTANCE_ID|EnvelopeV2|PayloadV2|BootstrapPayloadV2" \
  autobyteus-application-sdk-contracts autobyteus-application-frontend-sdk autobyteus-application-backend-sdk autobyteus-web autobyteus-server-ts applications/brief-studio applications/socratic-math-teacher \
  --glob '!**/node_modules/**'
```

Result: no output, exit handled as clean.

## Validation Surfaces / Modes

- Durable repository tests: shared iframe contracts, frontend SDK startup, web iframe host/surface/shell/store utilities, server manifest/package admission, server backend mount transport, server REST/WS, imported Brief Studio package integration.
- Temporary real-browser E2E probe: Chrome + Playwright Core, local HTTP origins for host and generated sample iframe assets, real module loading of generated importable sample UI/vendor files.
- Temporary API/import probe: local package roots through `ApplicationPackageRegistryService.importApplicationPackage(...)` with actual `FileApplicationBundleProvider.validatePackageRoot(...)` validation.
- Static executable checks: `git diff --check` and legacy identifier scan.

## Platform / Runtime Targets

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/iframe-launch-id-contract-refactor`
- OS: macOS 26.2 (`25C56`)
- Node: `v22.21.1`
- pnpm: `10.28.2`
- Browser used for temporary E2E: Google Chrome `147.0.7727.102` via Playwright Core from `autobyteus-web` dependencies.

## Lifecycle / Upgrade / Restart / Migration Checks

- Route-visit/reload-scoped iframe bootstrap was covered by web host/store tests and browser probes with a fresh `iframeLaunchId` per hosted startup page load.
- Stale bootstrap variants were tested as failure/ignore cases before valid bootstrap handoff.
- No data migration, native restart, installer, or updater behavior is in scope for this contract refactor.

## Coverage Matrix

| Scenario ID | Requirement / AC | Surface | Mode | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| VE-001 | AC-001, REQ-001/003/005 | Shared iframe contract v3 parser/validators | Durable test | Pass | `pnpm -C autobyteus-application-sdk-contracts test` passed, 4 tests. |
| VE-002 | AC-002, REQ-001/002/003 | Frontend SDK startup ready/bootstrap flow | Durable test | Pass | `pnpm -C autobyteus-application-frontend-sdk test` passed, 4 node tests plus type tests. |
| VE-003 | AC-003, REQ-001/003/007 | Web host iframe descriptor/surface/shell/store flow | Durable tests | Pass | Targeted Nuxt/Vitest set passed, 13 tests. |
| VE-004 | AC-006, REQ-001/006/007 | Generated/importable Brief Studio and Socratic UI bootstrap | Temporary browser E2E | Pass | Browser probe loaded generated importable UI/vendor modules; both samples emitted v3 ready and reached business UI. |
| VE-005 | AC-002/003, REQ-003/005 | Stale/mismatched bootstrap rejection | Temporary browser E2E + durable tests | Pass | Browser probe rejected wrong `iframeLaunchId`, application id, host origin, and contract version; synthetic wrong origin/source messages were ignored then valid bootstrap succeeded. |
| VE-006 | AC-004, REQ-002 | Backend query/command/GraphQL/route context | Durable integration tests | Pass | Server REST/WS and backend mount route tests passed; observed handler contexts are `{ applicationId }`. |
| VE-007 | AC-005, REQ-005/006 | Manifest/package compatibility gate | Durable tests + temporary import probe | Pass | `file-application-bundle-provider` and `application-package-service` tests passed; temporary import probe accepted v3 and rejected app/backend frontend SDK `"2"`. |
| VE-008 | AC-006 | Packaged Brief Studio client through generated importable package backend mount | Durable integration test | Pass after validation-code fix | `brief-studio-imported-package.integration.test.ts` passed after helper was corrected to instantiate the packaged vendor `createApplicationClient` and backend mount transport. |
| VE-009 | AC-008, REQ-004/005 | Legacy public contract removal | Static scan | Pass | Legacy identifier scan returned no in-scope public-contract hits. |

## Test Scope

In scope:

- New v3 URL query hints, ready envelopes, bootstrap envelopes, and strict shape validation.
- Real browser postMessage handoff against generated/importable sample UI bundles.
- Rejection or ignore behavior for stale/mismatched iframe bootstrap conditions.
- Frontend SDK request context exposed as `{ applicationId }` only.
- Backend server gateway/worker/route/GraphQL request context propagation.
- Manifest/package admission gates rejecting retired frontend SDK contract `"2"`.
- Generated package smoke validation for Brief Studio and Socratic Math Teacher.

Not in scope:

- Full Electron packaged app build/run.
- Long-running native restart/installer/updater flows.
- External third-party packages outside this repository.

## Validation Setup / Environment

- Existing workspace dependencies were already installed.
- Temporary browser probe served generated importable sample UI directories from local HTTP origins and a separate local host origin that supplied bootstrap envelopes and a mock GraphQL backend endpoint.
- Temporary import probe created throwaway local application package roots under the OS temp directory.
- Temporary scripts were stored under `/tmp` only and removed after execution.

## Tests Implemented Or Updated

Updated repository-resident durable validation:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/iframe-launch-id-contract-refactor/autobyteus-server-ts/tests/integration/application-backend/brief-studio-imported-package.integration.test.ts`

Reason:

- The imported Brief Studio package integration test had a validation-harness issue: its helper bypassed the generated package's real frontend SDK client boundary and passed a raw `{ transport }` object into `createBriefStudioGraphqlClient(...)`, which expects an `ApplicationClient` with `.graphql(...)` and `.subscribeNotifications(...)` methods.
- The helper now imports the generated package vendor `application-frontend-sdk.js`, creates an actual `ApplicationClient` with `createApplicationClient(...)`, and uses `createApplicationBackendMountTransport(...)` for the hosted backend mount. This makes the durable test exercise the actual packaged client/admission surface intended by the validation scenario.

## Durable Validation Added To The Codebase

- Repository-resident durable validation added or updated this round: `Yes`
- Paths added or updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/iframe-launch-id-contract-refactor/autobyteus-server-ts/tests/integration/application-backend/brief-studio-imported-package.integration.test.ts`
- If `Yes`, returned through `code_reviewer` before delivery: `Yes` (this report recommends and handoff sends to `code_reviewer`)
- Post-validation code review artifact: pending code-review re-review after this handoff.

## Other Validation Artifacts

- Canonical validation report: `/Users/normy/autobyteus_org/autobyteus-worktrees/iframe-launch-id-contract-refactor/tickets/in-progress/iframe-launch-id-contract-refactor/api-e2e-validation-report.md`

## Temporary Validation Methods / Scaffolding

Temporary scripts were created under `/tmp`, executed, and removed:

- Browser E2E probe: served generated importable Brief Studio and Socratic Math Teacher UI assets, hosted a parent page on a separate local origin, drove Chrome through Playwright Core, and verified ready/bootstrap handoff plus rejection cases.
- Package admission probe: created temporary valid and retired-v2 local package roots and invoked `ApplicationPackageRegistryService.importApplicationPackage(...)` with real bundle validation.

Cleanup evidence:

```bash
rm -f /tmp/iframe-contract-browser-validation.cjs /tmp/application-package-admission-validation.mjs && test ! -e /tmp/iframe-contract-browser-validation.cjs && test ! -e /tmp/application-package-admission-validation.mjs
# temporary validation scripts removed
```

## Dependencies Mocked Or Emulated

- Browser probe emulated only the host backend GraphQL endpoint with local JSON responses for initial sample UI data (`briefs: []`, `lessons: []`).
- Browser probe used real browser module loading, real `postMessage`, generated importable UI/vendor files, and generated frontend SDK startup/client code.
- Package admission probe used temporary package roots and real manifest/bundle validation; it injected no-op catalog refresh services because validation target was admission rejection before registration/refresh.
- Existing server integration tests use their established in-test Fastify, SQLite, worker, and mocked agent-run plumbing.

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | First validation round. |

## Scenarios Checked

### VE-001 Shared contract v3

Passed via `pnpm -C autobyteus-application-sdk-contracts test`:

- valid v3 launch hints parse with `autobyteusIframeLaunchId`;
- stale/missing/malformed launch-hint inputs reject;
- file/null host-origin equivalence preserved;
- ready/bootstrap validators accept tight v3 envelopes and reject malformed variants;
- bootstrap request context is `{ applicationId }` only.

### VE-002 Frontend SDK startup

Passed via `pnpm -C autobyteus-application-frontend-sdk test`:

- unsupported direct entry remains framework-owned;
- startup emits ready with `iframeLaunchId`;
- matching bootstrap reaches `handoff_complete`;
- mount errors remain startup failures;
- mismatched bootstrap rejects before business handoff;
- type tests pass.

### VE-003 Web host iframe flow

Passed via:

```bash
NUXT_TEST=true pnpm -C autobyteus-web exec vitest run \
  components/applications/__tests__/ApplicationIframeHost.spec.ts \
  components/applications/__tests__/ApplicationSurface.spec.ts \
  components/applications/__tests__/ApplicationShell.spec.ts \
  stores/__tests__/applicationHostStore.spec.ts \
  utils/application/__tests__/applicationAssetUrl.spec.ts
```

Result: 5 files, 13 tests passed.

### VE-004 Real generated/importable sample browser bootstrap

Temporary browser probe output:

```text
[browser] brief happy bootstrap passed: ready={"applicationId":"bundle-app__browser-package__brief-studio","iframeLaunchId":"bundle-app__browser-package__brief-studio::iframe-launch-browser-1"} requestContext=not displayed
[browser] socratic happy bootstrap passed: ready={"applicationId":"bundle-app__browser-package__socratic-math-teacher","iframeLaunchId":"bundle-app__browser-package__socratic-math-teacher::iframe-launch-browser-1"} requestContext=applicationId bundle-app__browser-package__socratic-math-teacher
```

Observed:

- Both generated importable sample UIs emitted v3 ready payloads.
- Ready payloads contained `iframeLaunchId`, not `launchInstanceId`.
- Parent delivered v3 bootstrap with top-level `iframeLaunchId` and `requestContext: { applicationId }`.
- Sample business UI rendered after bootstrap.
- Socratic Math Teacher displayed `requestContext` as `applicationId ...` and displayed the active `iframeLaunchId`.
- Sample UI text did not expose `launchInstanceId`.

### VE-005 Stale/mismatched bootstrap rejection

Temporary browser probe output:

```text
[browser] brief wrongIframeLaunch rejection passed
[browser] brief wrongApplication rejection passed
[browser] brief wrongHostOrigin rejection passed
[browser] brief wrongVersion rejection passed
[browser] brief syntheticWrongOrigin ignored then valid bootstrap passed
[browser] brief syntheticWrongSource ignored then valid bootstrap passed
```

Observed:

- Wrong `iframeLaunchId`, wrong application id, wrong bootstrap `host.origin`, and wrong contract version failed startup safely before business UI handoff.
- Synthetic wrong-origin and wrong-source message events were ignored and did not poison the startup listener; a later valid bootstrap succeeded.

### VE-006 Backend context and transport

Passed via server durable integration tests:

```bash
pnpm -C autobyteus-server-ts exec vitest run \
  tests/unit/application-bundles/file-application-bundle-provider.test.ts \
  tests/unit/application-packages/application-package-service.test.ts \
  tests/integration/application-backend/application-backend-mount-route-transport.integration.test.ts \
  tests/integration/application-backend/application-backend-rest-ws.integration.test.ts \
  tests/integration/application-backend/brief-studio-imported-package.integration.test.ts
```

Result: 5 files, 28 tests passed.

Observed:

- Backend mount route transport returned handler `requestContext: { applicationId }`.
- REST/WS query, command, route, GraphQL, and notifications carried `{ applicationId }` only.
- Imported Brief Studio packaged frontend client reached backend GraphQL through generated package vendor SDK/client after durable helper fix.

### VE-007 Package admission of retired frontend SDK contract `"2"`

Temporary import probe output:

```text
[admission] v3 local package import flow accepted
[admission] retired application manifest frontendSdkContractVersion=2 rejected
[admission] retired backend bundle frontendSdkContractVersion=2 rejected
```

Observed:

- Actual local-package import flow accepted a v3 package.
- Application manifest `ui.frontendSdkContractVersion: "2"` rejected with unsupported-version error.
- Backend bundle manifest `sdkCompatibility.frontendSdkContractVersion: "2"` rejected with unsupported-version error.

### VE-008 Static legacy removal

Passed:

- `git diff --check` produced no output.
- Legacy identifier scan produced no output.


### VE-009 Full-stack Brief Studio browser/runtime smoke

Passed after the user-requested full-stack check against the worktree runtime:

- Copied the main-repo `.env` files into the worktree before startup; secret values were not printed.
- Restarted the backend and frontend after the computer shutdown using the README-style local stack:
  - Backend: `node autobyteus-server-ts/dist/app.js --host 127.0.0.1 --port 8000 --data-dir autobyteus-server-ts/.validation-data-brief-studio`
  - Frontend: `pnpm -C autobyteus-web dev --host 127.0.0.1 --port 3000`
- Confirmed backend health and frontend availability on `127.0.0.1:8000` and `127.0.0.1:3000`.
- Opened Brief Studio through the real web Applications UI and confirmed the iframe source uses contract v3 query hints including `autobyteusIframeLaunchId`, not the retired launch-instance identifier.
- Saved/verified the Brief Studio launch setup with the bundled `Brief Studio Team`, Codex App Server runtime, `gpt-5.5`, and the validation temp workspace.
- Created a real Brief Studio business record:
  - `briefId`: `brief-23a9165f-212b-4ef3-9ea9-9dc0a13b48e1`
  - title: `Browser validation brief 2026-04-25 11:16:07`
  - initial status after create: `not_started`
- Investigated the initial `not_started` state in logs. It was expected for create-only: worker stdout showed `createBrief` and list/detail reads, with no `launchDraftRun` call yet and no worker stderr error beyond Node's SQLite experimental warning.
- Launched a draft run for that brief through the hosted Brief Studio GraphQL backend mount:
  - `bindingId`: `eacbaa84-c5f3-4899-9eb0-fb364a9856d6`
  - `runId`: `team_bundle-team-6170706c69636174696f6e2d6c6f_d9551490`
  - launch response status: `ATTACHED`
- Confirmed status progression and generated outputs:
  - `not_started` immediately after create/launch attachment
  - `researching` after researcher artifact projection
  - `in_review` after writer final artifact projection
  - final UI state showed `Draft outputs: 2`, `1 final`, with `brief-studio/research.md` and `brief-studio/final-brief.md` visible.
- Screenshot evidence: `/Users/normy/.autobyteus/browser-artifacts/d78750-1777108997035.png`

Log observations:

- Worker stdout contains `brief.draft_run_started`, `brief.ready_for_review`, `getPublishedArtifactRevisionText`, and GraphQL detail responses showing the projected research/final artifacts.
- Worker stderr contains only the Node SQLite experimental warning for this smoke run.
- Backend startup warnings about Anthropic/Ollama discovery were unrelated to Brief Studio and did not block the Codex App Server/gpt-5.5 run.

## Passed

- `git diff --check`
- `pnpm -C autobyteus-application-sdk-contracts test`
- `pnpm -C autobyteus-application-frontend-sdk test`
- Targeted `autobyteus-web` Vitest iframe host/surface/shell/store/URL set: 5 files, 13 tests.
- Targeted `autobyteus-server-ts` package/backend/imported-sample set: 5 files, 28 tests.
- Temporary browser E2E probe for generated/importable Brief Studio and Socratic Math Teacher.
- Temporary package admission/import probe for v3 acceptance and retired v2 rejection.
- Legacy public-contract identifier scan.

## Failed

No product or implementation validation failures remain.

During validation, the first run of the imported Brief Studio integration test failed with:

```text
TypeError: applicationClient.graphql is not a function
```

Classification: validation-harness gap in repository-resident durable validation, not a product implementation failure. The test helper bypassed the generated package vendor frontend SDK client boundary. The helper was corrected to construct an actual packaged `ApplicationClient` using `createApplicationClient(...)` and `createApplicationBackendMountTransport(...)`, then the test and broader targeted server set passed.

## Not Tested / Out Of Scope

- Full Electron packaged application run.
- Native installer/updater/restart lifecycle.
- External third-party packages outside the repository.
- True malicious cross-window browser attack using an independent external origin; the browser probe covered real parent/iframe `postMessage` for happy/failure paths and synthetic wrong-origin/source listener rejection. Existing host component tests cover iframe source/origin checks on the host side.

## Blocked

None.

## Cleanup Performed

- Removed temporary browser and package-admission scripts from `/tmp`.
- Temporary local HTTP servers and browser instances were closed by the probes.
- Temporary package roots were removed by the admission probe.

## Classification

- Latest validation result: `Pass`
- No `Local Fix`, `Design Impact`, `Requirement Gap`, or `Unclear` reroute is needed for product implementation.
- Repository-resident durable validation was updated after the prior code review; per workflow, the next recipient is `code_reviewer` for a narrow validation-code re-review before delivery.

## Recommended Recipient

`code_reviewer`

## Evidence / Notes

Key command evidence:

```bash
git diff --check
pnpm -C autobyteus-application-sdk-contracts test
pnpm -C autobyteus-application-frontend-sdk test
NUXT_TEST=true pnpm -C autobyteus-web exec vitest run components/applications/__tests__/ApplicationIframeHost.spec.ts components/applications/__tests__/ApplicationSurface.spec.ts components/applications/__tests__/ApplicationShell.spec.ts stores/__tests__/applicationHostStore.spec.ts utils/application/__tests__/applicationAssetUrl.spec.ts
pnpm -C autobyteus-server-ts exec vitest run tests/unit/application-bundles/file-application-bundle-provider.test.ts tests/unit/application-packages/application-package-service.test.ts tests/integration/application-backend/application-backend-mount-route-transport.integration.test.ts tests/integration/application-backend/application-backend-rest-ws.integration.test.ts tests/integration/application-backend/brief-studio-imported-package.integration.test.ts
```

All commands listed above passed in the latest validation state.

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Notes: API/E2E/executable validation passed. Because durable validation code changed in `/Users/normy/autobyteus_org/autobyteus-worktrees/iframe-launch-id-contract-refactor/autobyteus-server-ts/tests/integration/application-backend/brief-studio-imported-package.integration.test.ts`, this package must return to `code_reviewer` before delivery.
