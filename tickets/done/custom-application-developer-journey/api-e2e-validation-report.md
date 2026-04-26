# API, E2E, And Executable Validation Report

## Validation Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-application-developer-journey/tickets/in-progress/custom-application-developer-journey/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-application-developer-journey/tickets/in-progress/custom-application-developer-journey/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-application-developer-journey/tickets/in-progress/custom-application-developer-journey/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-application-developer-journey/tickets/in-progress/custom-application-developer-journey/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-application-developer-journey/tickets/in-progress/custom-application-developer-journey/implementation-handoff.md`
- Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-application-developer-journey/tickets/in-progress/custom-application-developer-journey/review-report.md`
- Current Validation Round: `1`
- Trigger: Code-review pass after CR-001 Local Fix; proceed to API/E2E validation.
- Prior Round Reviewed: `N/A`
- Latest Authoritative Round: `1`

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Code-review pass after CR-001 Local Fix | N/A | None | Pass | Yes | Devkit happy/failure flows, browser dev bootstrap, real-backend identity rules, and production local import path passed. |

## Validation Basis

Validation covered the approved Milestone 1 requirements and reviewed implementation with emphasis on:

- canonical external `src/` authoring and `dist/importable-package` output separation;
- generated package shape under `applications/<local-application-id>/`;
- devkit package validation success and actionable failure diagnostics;
- iframe contract v3 dev bootstrap through `startHostedApplication(...)`;
- real-backend dev mode identity constraints;
- existing AutoByteus local package import path staying prebuilt-only and authoritative.

Implementation handoff `Legacy / Compatibility Removal Check` was reviewed and was clean: no old `frontend-src` / `backend-src` fallback, no alternate app startup model, no retained stale v1 contract vocabulary in changed scope.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable validation added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: `N/A`
- Upstream recipient notified: `N/A`

## Validation Surfaces / Modes

- Package-local durable tests: reran existing devkit test suite.
- CLI executable validation: built devkit CLI, ran `create`, `pack`, and `validate` against clean temporary starter projects.
- Negative package validation: mutated generated packages for missing files, unsupported versions, and path escapes.
- Browser E2E validation: opened local dev host in the in-app browser and inspected host/iframe runtime state.
- Process/lifecycle validation: started and stopped the dev server, verified real-backend startup rejection and explicit identity session construction.
- Production import integration validation: ran a temporary Vitest harness through `ApplicationPackageService.importApplicationPackage(...)` with `FileApplicationBundleProvider.validatePackageRoot(...)` as the production content gate.

## Platform / Runtime Targets

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-application-developer-journey`
- Branch: `codex/custom-application-developer-journey`
- Base/tracking: `origin/personal`
- OS/runtime observed: macOS local filesystem; Node `v22.21.1`; pnpm workspace package manager.
- Browser target: in-app browser tab at `http://127.0.0.1:43129/`.
- Server test target: `autobyteus-server-ts` Vitest with isolated temporary package settings/registry roots.

## Lifecycle / Upgrade / Restart / Migration Checks

- Dev server lifecycle was exercised: CLI dev server started on port `43129`, browser bootstrap completed, browser tab was closed, and server processes on port `43129` were killed (`27895`, `70788`).
- Server Vitest setup reset its isolated SQLite test database via Prisma migrations before the temporary import harness.
- No application upgrade, installer, updater, or restart migration path is in Milestone 1 scope.

## Coverage Matrix

| Scenario ID | Requirement / AC | Surface | Result | Evidence |
| --- | --- | --- | --- | --- |
| VAL-001 | AC-001, AC-002 | Devkit CLI create/pack | Pass | Clean temp starter created canonical files and no root `ui/` or `backend`; pack emitted `dist/importable-package/applications/api-e2e-starter/...`. |
| VAL-002 | AC-003, AC-004 | Devkit validate happy path | Pass | `autobyteus-app validate --package-root <starter>/dist/importable-package` exited `0`; manifest summary had app manifest v3, frontend SDK contract v3, backend bundle contract v1, backend definition contract v2. |
| VAL-003 | AC-003 | Missing generated files | Pass | Removing `backend/bundle.json` and `backend/dist/entry.mjs` produced `MISSING_PACKAGE_FILE` diagnostics for `backend.bundleManifest` and `backend.entryModule`. |
| VAL-004 | AC-003 | Unsupported versions | Pass | Mutating app manifest version and backend bundle contract version produced `UNSUPPORTED_CONTRACT_VERSION` diagnostics. |
| VAL-005 | AC-003 | Manifest path escapes | Pass | Mutating `ui.entryHtml` and backend `entryModule` to escape paths produced `INVALID_MANIFEST_PATH` diagnostics. |
| VAL-006 | AC-005, AC-006 | Browser dev bootstrap | Pass | Dev host iframe URL included v3 launch hints; host status became `posted autobyteus.application.host.bootstrap`; iframe app rendered after `startHostedApplication(...)` with matching request context. |
| VAL-007 | AC-005 | Real-backend dev identity rules | Pass | CLI rejected `--backend-base-url` without `--application-id`; explicit id was used in session identity, bootstrap application id, and `requestContext.applicationId`. |
| VAL-008 | AC-004, AC-007 | Existing production import path | Pass | Temporary Vitest harness imported generated package via `ApplicationPackageService.importApplicationPackage(...)`, invoked `FileApplicationBundleProvider.validatePackageRoot(...)`, registered one local application, and did not run package `postinstall`/`build` scripts. |
| VAL-009 | AC-010 | Cleanup / legacy signal | Pass | Existing code-review stale vocabulary grep already passed; API/E2E observed no legacy source-root fallback or alternate startup path in exercised flows. |

## Test Scope

### Commands/checks run

- `pnpm --filter @autobyteus/application-devkit build && pnpm --filter @autobyteus/application-devkit test` — passed (`8` top-level subtests / `12` TAP tests).
- Clean temporary CLI starter harness using `node autobyteus-application-devkit/dist/cli.js create|pack|validate` — passed.
- Mutated package validation harness for missing backend manifest, missing backend entry, unsupported app manifest version, unsupported backend bundle contract version, app manifest path escape, and backend manifest path escape — passed with expected non-zero validation exits and diagnostics.
- Browser dev host validation at `http://127.0.0.1:43129/` — passed.
- Real-backend dev mode CLI rejection/session identity harness — passed.
- `API_E2E_PACKAGE_ROOT=<generated package> pnpm --filter autobyteus-server-ts exec vitest run tests/.tmp/api-e2e-generated-starter-import.test.ts --pool=forks --fileParallelism=false` — passed (`1` test).

## Validation Setup / Environment

- Built `@autobyteus/application-devkit` to obtain `dist/cli.js` and public `dist/index.js` for temporary validation only.
- Temporary starter projects were created below `autobyteus-application-devkit/.tmp-api-e2e*` so esbuild could resolve local workspace SDK dependencies while still exercising the external starter layout.
- Browser dev host used devkit mock backend routes for frontend startup and transport-shape validation.
- Production import harness used isolated temporary app-data, registry, and built-in source roots. It stubbed cache-refresh and availability reconciliation side effects while using the real local import service method and real `FileApplicationBundleProvider.validatePackageRoot(...)` content validator.

## Tests Implemented Or Updated

- No repository-resident durable validation was added or updated in this API/E2E round.
- A temporary server Vitest file was created at `autobyteus-server-ts/tests/.tmp/api-e2e-generated-starter-import.test.ts` for the current validation run and removed afterward.

## Durable Validation Added To The Codebase

- Repository-resident durable validation added or updated this round: `No`
- Paths added or updated: `N/A`
- If `Yes`, returned through `code_reviewer` before delivery: `N/A`
- Post-validation code review artifact: `N/A`

## Other Validation Artifacts

- Browser screenshot artifact from dev-host run: `/Users/normy/.autobyteus/browser-artifacts/6fb585-1777181527343.png`
- Canonical validation report: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-application-developer-journey/tickets/in-progress/custom-application-developer-journey/api-e2e-validation-report.md`

## Temporary Validation Methods / Scaffolding

- Temporary CLI starter roots under `autobyteus-application-devkit/.tmp-api-e2e*`.
- Temporary dev server project under `autobyteus-application-devkit/.tmp-api-e2e-dev.*`.
- Temporary real-backend session project under `autobyteus-application-devkit/.tmp-api-e2e-real-backend.*`.
- Temporary production-import package project under `autobyteus-application-devkit/.tmp-api-e2e-import.*`.
- Temporary server Vitest file under `autobyteus-server-ts/tests/.tmp/`.
- Generated `autobyteus-application-devkit/dist/`, `autobyteus-application-devkit/.tmp-tests/`, and `autobyteus-server-ts/tests/.tmp/` artifacts.

## Dependencies Mocked Or Emulated

- Dev browser flow used devkit's mock backend endpoints, which returned the query `status` payload and echoed `requestContext.applicationId`.
- Production import validation used real package import and bundle validation code but isolated settings/registry/app-data stores and stubbed catalog-refresh side effects to avoid changing user state.
- Real backend network behavior was not contacted; validation targeted the required CLI rejection and launch/bootstrap identity construction for real-backend mode.

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | First API/E2E validation round. |

## Scenarios Checked

### VAL-001 / VAL-002 — clean starter create, pack, validate, generated shape

Observed generated shape under `dist/importable-package/applications/api-e2e-starter/`:

```text
agent-teams/.gitkeep
agents/.gitkeep
application.json
backend/assets/.gitkeep
backend/bundle.json
backend/dist/entry.mjs
backend/migrations/.gitkeep
ui/app.js
ui/icon.svg
ui/index.html
ui/styles.css
```

Manifest summary:

```json
{
  "appId": "api-e2e-starter",
  "manifestVersion": "3",
  "uiEntry": "ui/index.html",
  "frontendSdkContractVersion": "3",
  "backendManifest": "backend/bundle.json",
  "backendContractVersion": "1",
  "backendEntryModule": "backend/dist/entry.mjs",
  "backendDefinitionContractVersion": "2",
  "backendFrontendSdkContractVersion": "3"
}
```

### VAL-003 / VAL-004 / VAL-005 — package validation failures

Expected non-zero validation exits were observed for:

- missing backend manifest: `[ERROR] MISSING_PACKAGE_FILE backend/bundle.json: backend.bundleManifest file does not exist at backend/bundle.json.`
- missing backend entry: `[ERROR] MISSING_PACKAGE_FILE backend/dist/entry.mjs: backend.entryModule file does not exist at backend/dist/entry.mjs.`
- unsupported app manifest version: `[ERROR] UNSUPPORTED_CONTRACT_VERSION manifestVersion: manifestVersion must be "3"; received "99".`
- unsupported backend contract version: `[ERROR] UNSUPPORTED_CONTRACT_VERSION backend.contractVersion: backend.contractVersion must be "1"; received "99".`
- app manifest path escape: `[ERROR] INVALID_MANIFEST_PATH ui.entryHtml: ui.entryHtml must stay inside the application package root.`
- backend manifest path escape: `[ERROR] INVALID_MANIFEST_PATH backend.entryModule: backend.entryModule must stay inside the application package root.`

### VAL-006 — browser dev bootstrap v3

Browser-inspected dev-host state:

```json
{
  "hostUrl": "http://127.0.0.1:43129/",
  "iframeSrc": "/ui/index.html?autobyteusContractVersion=3&autobyteusApplicationId=dev%3Aapi-e2e-dev&autobyteusIframeLaunchId=dev%3Aapi-e2e-dev%3A%3Af3f355ce-7daf-4bb3-80e9-a74fbb658b89&autobyteusHostOrigin=http%3A%2F%2F127.0.0.1%3A43129",
  "params": {
    "autobyteusContractVersion": "3",
    "autobyteusApplicationId": "dev:api-e2e-dev",
    "autobyteusIframeLaunchId": "dev:api-e2e-dev::f3f355ce-7daf-4bb3-80e9-a74fbb658b89",
    "autobyteusHostOrigin": "http://127.0.0.1:43129"
  },
  "status": "posted autobyteus.application.host.bootstrap",
  "frameTextContains": [
    "This custom application started through the AutoByteus iframe contract v3",
    "applicationId: dev:api-e2e-dev",
    "requestContext.applicationId: dev:api-e2e-dev",
    "mock query status"
  ]
}
```

### VAL-007 — real-backend dev identity

- Reject check: `node dist/cli.js dev --backend-base-url ...` without `--application-id` exited `1` with `Real-backend dev mode requires explicit --application-id.`
- Explicit identity session summary:

```json
{
  "sessionApplicationId": "application-local:%2Ftmp%2Fapi-e2e-real",
  "bootstrapApplicationId": "application-local:%2Ftmp%2Fapi-e2e-real",
  "requestContextApplicationId": "application-local:%2Ftmp%2Fapi-e2e-real",
  "iframeLaunchId": "application-local:%2Ftmp%2Fapi-e2e-real::5096d935-fc4e-4525-bc5e-5cdd4e99538d",
  "backendBaseUrl": "http://127.0.0.1:59999/rest/applications/application-local:%2Ftmp%2Fapi-e2e-real/backend",
  "backendNotificationsUrl": "ws://127.0.0.1:59999/ws/applications/application-local:%2Ftmp%2Fapi-e2e-real/backend/notifications"
}
```

### VAL-008 — generated starter through production local import path

Temporary Vitest harness assertions:

- Added a generated package-root `package.json` containing `postinstall` and `build` scripts that would write `script-ran.txt` if executed.
- Called `ApplicationPackageService.importApplicationPackage({ sourceKind: "LOCAL_PATH", source: <generated package root> })`.
- Verified the service called `FileApplicationBundleProvider.validatePackageRoot(...)` with the generated package root and local package id.
- Verified returned package list included one local package with `applicationCount: 1`, `isPlatformOwned: false`, and `isRemovable: true`.
- Verified root settings and registry record pointed to the generated package root.
- Verified `script-ran.txt` was absent after import, proving no package install/build/lifecycle script was executed by the import path.

## Passed

All checked scenarios passed.

## Failed

None.

## Not Tested / Out Of Scope

- Public npm publishing or release-channel availability for SDK/devkit packages.
- GitHub application package installer path for generated packages.
- Full AutoByteus backend worker launch of the generated starter backend after import; Milestone 1 import validation covers prebuilt package compatibility and import safety, while backend code execution remains an existing launch-time runtime boundary.
- Full real-backend browser query roundtrip; API/E2E validated required real-backend dev identity rules and session construction without standing up a live AutoByteus application backend route.

## Blocked

None.

## Cleanup Performed

- Closed the browser tab used for dev-host inspection.
- Killed dev-server processes listening on port `43129` (`27895`, `70788`).
- Removed temporary starter/import/dev/real-backend project roots under `autobyteus-application-devkit/.tmp-api-e2e*`.
- Removed temporary server Vitest file from `autobyteus-server-ts/tests/.tmp/`.
- Removed generated `autobyteus-application-devkit/dist/`, `autobyteus-application-devkit/.tmp-tests/`, and `autobyteus-server-ts/tests/.tmp/` after validation.

## Classification

- `Local Fix`: N/A
- `Design Impact`: N/A
- `Requirement Gap`: N/A
- `Unclear`: N/A

No validation failure was found.

## Recommended Recipient

`delivery_engineer`

## Evidence / Notes

- Devkit existing durable tests passed before broader API/E2E probes.
- Temporary CLI and browser probes covered the downstream review focus items.
- Temporary production import harness proved the generated starter passes the current authoritative server import validator and that import remains prebuilt-only.
- No repository-resident durable validation was added or updated during API/E2E, so no validation-code re-review is required before delivery.

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Notes: API/E2E validation passed. Proceed to delivery with the cumulative artifact package.
