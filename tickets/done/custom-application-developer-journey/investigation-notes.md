# Investigation Notes: Custom Application Developer Journey — Milestone 1

## Investigation Status

- Bootstrap Status: Existing dedicated ticket worktree reused; remote refs refreshed successfully with `git fetch origin --prune` on 2026-04-26.
- Current Status: Requirements refined to design-ready Milestone 1 after user approval; design production in progress.
- Investigation Goal: Determine the current application package/import/iframe/SDK state and shape the first external custom-application developer milestone around the existing codebase.
- Scope Classification (`Small`/`Medium`/`Large`): Large
- Scope Classification Rationale: The milestone touches a new external devkit package, template/source layout, build/package validation, dev iframe bootstrap, SDK install docs, and stale v3 vocabulary cleanup while preserving production import/runtime contracts.
- Scope Summary: Add a developer-facing bridge from external source projects to current AutoByteus application package/runtime contracts. External source projects should use `src/` inputs and `dist/` outputs, while generated packages keep the existing runtime `applications/<id>/application.json`, `ui/`, and `backend/` shape.
- Primary Questions To Resolve:
  - What production application package contract must remain unchanged?
  - Which current sample-folder conventions should be replaced for external authors?
  - What v3 iframe/bootstrap behavior must dev mode reproduce?
  - Which validation/build concerns belong in a new devkit versus existing server import/runtime owners?
  - What safety wording is accurate for user import versus backend execution trust?

## Request Context

The user asked to review `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-application-developer-journey/tickets/in-progress/custom-application-developer-journey/requirements.md` against the current codebase. After discussion, the user approved narrowing the ticket to a first milestone and explicitly agreed to improve the author-facing folder structure so source lives under `src/` and generated outputs live under `dist/`.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-application-developer-journey`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-application-developer-journey/tickets/in-progress/custom-application-developer-journey`
- Current Branch: `codex/custom-application-developer-journey`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-application-developer-journey`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-04-26.
- Task Branch: `codex/custom-application-developer-journey`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `origin/personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Requirements artifact existed as draft before this continuation; it has now been rewritten in-place to the approved Milestone 1 scope.

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-26 | Command | `git fetch origin --prune && git status --short --branch && git rev-parse --show-toplevel && git branch -vv` | Verify dedicated worktree/branch and refresh tracked refs. | Worktree is `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-application-developer-journey`, branch `codex/custom-application-developer-journey`, tracking `origin/personal`; only ticket artifacts are untracked/changed. | No |
| 2026-04-26 | Doc | `tickets/in-progress/custom-application-developer-journey/requirements.md` | Review bootstrapped draft. | Original draft correctly targeted v3 iframe baseline but was too broad for one ticket and used current sample layout implicitly. | Refined to Milestone 1. |
| 2026-04-26 | Code | `autobyteus-application-sdk-contracts/src/application-iframe-contract.ts` | Verify iframe contract and query names. | Contract version is `3`; query keys include `autobyteusContractVersion`, `autobyteusApplicationId`, `autobyteusIframeLaunchId`, `autobyteusHostOrigin`; bootstrap payload includes top-level `iframeLaunchId` and `requestContext: { applicationId }`. | Dev bootstrap must reuse this shape. |
| 2026-04-26 | Code | `autobyteus-application-sdk-contracts/src/index.ts` | Verify backend request context and backend bundle contract. | `ApplicationRequestContext` is only `{ applicationId }`; backend bundle manifest v1 requires self-contained ESM, Node target, SDK compatibility, supported exposures. | Validation and docs must keep request context narrow. |
| 2026-04-26 | Code | `autobyteus-application-sdk-contracts/src/manifests.ts` | Verify application manifest v3. | Manifest v3 points to `ui.entryHtml` and `backend.bundleManifest`; supports `resourceSlots[]`. | Generated package must keep this runtime shape. |
| 2026-04-26 | Code | `autobyteus-application-frontend-sdk/src/hosted-application-startup.ts` | Verify app frontend startup owner. | `startHostedApplication(...)` parses v3 launch hints, emits ready, validates bootstrap, creates backend mount transport, and treats missing launch hints as unsupported raw entry. | Dev mode must supply launch hints/bootstrap instead of changing app code. |
| 2026-04-26 | Code | `autobyteus-application-frontend-sdk/src/create-application-backend-mount-transport.ts` and `src/application-client.ts` | Verify frontend backend transport. | Client derives query/command/GraphQL/route endpoints from `backendBaseUrl`; route headers carry `x-autobyteus-application-id` from request context. | Dev bootstrap must provide usable or explicitly mock transport URLs. |
| 2026-04-26 | Code | `autobyteus-web/components/applications/ApplicationSurface.vue` and `ApplicationIframeHost.vue` | Verify production host bootstrap owner. | Host builds iframe descriptor, waits for matching ready event, posts bootstrap envelope, and reveals iframe after bootstrap delivery. | Dev host should emulate the same handshake at a smaller scope. |
| 2026-04-26 | Code | `autobyteus-web/utils/application/applicationLaunchDescriptor.ts` and `applicationHostTransport.ts` | Verify launch descriptor and backend transport URL derivation. | Production host appends v3 launch hints and builds backend transport URLs under `/rest/applications/<id>/backend`. | Devkit can mirror launch-hint generation with dev host origin. |
| 2026-04-26 | Code | `autobyteus-server-ts/src/application-packages/utils/application-package-root-summary.ts` | Verify package root expectations. | Package root must be absolute directory containing `applications/`. | Devkit package output must generate top-level `applications/`. |
| 2026-04-26 | Code | `autobyteus-server-ts/src/application-packages/services/application-package-registry-service.ts` | Verify import path behavior. | Local path import validates package root and package contents, registers root, refreshes catalogs; GitHub import downloads/extracts archive and validates package root before registry update. | Production import remains authoritative and prebuilt-only. |
| 2026-04-26 | Code | `autobyteus-server-ts/src/application-bundles/providers/file-application-bundle-provider.ts` | Verify bundle scan/validation. | Scans `applications/<local-id>/application.json`, validates UI/backend paths, backend entry, migrations/assets, application-owned agents/teams, resource slot defaults. | Devkit validator should catch author errors early but not replace server validation. |
| 2026-04-26 | Code | `autobyteus-server-ts/src/application-bundles/utils/application-manifest.ts` and `application-backend-manifest.ts` | Verify manifest parser constraints. | Manifest paths must be relative, stay inside bundle, and point under required prefixes (`ui/`, `backend/`); versions must match v3/v1. | Devkit validation should mirror these constraints for generated packages. |
| 2026-04-26 | Code | `autobyteus-server-ts/src/api/rest/application-backends.ts` and `application-bundles.ts` | Verify runtime/asset REST boundaries. | UI assets served from bundle `ui/`; backend gateway routes are mounted under `/applications/:applicationId/backend`; REST request context is derived from route application id. | Dev mode can target real backend URLs or mock; should not change production routes. |
| 2026-04-26 | Code | `autobyteus-server-ts/src/application-engine/services/application-engine-host-service.ts` and `application-engine/worker/application-worker-runtime.ts` | Verify backend runtime execution. | Worker starts from prebuilt backend entry module, prepares storage, loads definition, validates exposures, and runs lifecycle/handlers. | Safety docs must state imported backend code still executes at launch. Full dev backend engine reproduction is out of scope. |
| 2026-04-26 | Code | `applications/brief-studio` and `applications/socratic-math-teacher` | Inspect current samples/build scripts. | Samples use `frontend-src/`, `backend-src/`, generated `ui/`, generated `backend/`, and duplicate per-app `scripts/build-package.mjs`. | External milestone should replace this mental model with `src/` + `dist/` and reusable devkit. |
| 2026-04-26 | Doc | `autobyteus-server-ts/docs/modules/applications.md`, `autobyteus-web/docs/applications.md`, `autobyteus-web/docs/application-bundle-iframe-contract-v3.md`, SDK READMEs | Verify current documented ownership. | Docs already state current app host/import/runtime boundaries and v3 contract. SDK READMEs explain `startHostedApplication` and request context. | Need new external developer docs, not only internal module docs. |
| 2026-04-26 | Command | `rg -n "devkit|scaffold|template|create.*application|developer journey|external developer|validatePackageRoot|package validator|build-package|importable-package" ...` | Check for existing external devkit/scaffold. | No reusable application devkit or scaffold found; package build logic exists only in samples. | Create new capability. |
| 2026-04-26 | Command | `rg -n "launchInstanceId|autobyteusLaunchInstanceId|v1 ready/bootstrap|iframeLaunchId|autobyteusIframeLaunchId" ...` | Check stale contract vocabulary. | No active `launchInstanceId` found in scoped source; stale `v1 ready/bootstrap handshake` exists in English and Chinese application localization messages. | Update stale strings in implementation. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary:
  - Production user import starts through application package settings/import GraphQL, reaching `ApplicationPackageRegistryService.importPackage(...)`.
  - Production app launch starts from frontend `ApplicationShell` / `ApplicationSurface`, reaches `applicationHostStore.startLaunch(...)`, then backend `ensure-ready`, then iframe bootstrap.
  - App frontend startup starts at app-authored `startHostedApplication(...)`.
- Current execution flow:
  - Import: Settings UI / GraphQL mutation -> `ApplicationPackageRegistryService` -> `validateApplicationPackageRoot` -> `ApplicationBundleService.validatePackageRoot` -> `FileApplicationBundleProvider` scan/validate -> registry/settings update -> catalog refresh.
  - Launch: User enters app -> frontend host store ensures backend ready -> `ApplicationBackendGatewayService.ensureApplicationReady` -> `ApplicationEngineHostService.ensureApplicationEngine` -> worker loads prebuilt backend entry -> frontend iframe host appends v3 hints -> app emits ready -> host posts v3 bootstrap -> app creates application client.
  - Current sample packaging: app-specific `scripts/build-package.mjs` compiles/copies `backend-src` and `frontend-src` into root-level generated `backend/` and `ui/`, then copies those generated folders into `dist/importable-package/applications/<id>/`.
- Ownership or boundary observations:
  - Server import/runtime owners are already clear and should remain authoritative.
  - `startHostedApplication(...)` is the correct app-side startup owner and should remain the only app-authored startup model.
  - Existing sample packaging scripts are not a reusable owner; they are duplicated app-local scripts.
  - External authoring layout needs a new devkit/template owner because current runtime owners should not become developer tooling owners.
- Current behavior summary:
  - Production runtime is ready for prebuilt packages and v3 bootstrap.
  - The missing piece is a reusable, external, developer-facing path that produces those prebuilt packages without exposing confusing root-level generated folders as source.

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-application-sdk-contracts/src/application-iframe-contract.ts` | Shared iframe v3 contract and validators/builders. | Authoritative for launch hints and bootstrap payload shape. | Devkit dev bootstrap should import/reuse this package, not invent local constants. |
| `autobyteus-application-sdk-contracts/src/index.ts` | Shared backend/request/runtime contracts. | `ApplicationRequestContext` is narrowed to `{ applicationId }`; backend manifest v1 and definition contract v2 live here. | Devkit generated files and docs must align with these constants. |
| `autobyteus-application-frontend-sdk/src/hosted-application-startup.ts` | Hosted app startup lifecycle. | Already supports one startup model and blocks unsupported raw entry. | Dev mode should wrap the app with a host page/provider, not add app-side alternate startup. |
| `autobyteus-web/components/applications/ApplicationSurface.vue` | Production frontend host launch and bootstrap envelope creation. | Produces v3 bootstrap and transport. | Dev host should be a lightweight analogue, not a production host change. |
| `autobyteus-web/components/applications/ApplicationIframeHost.vue` | Production iframe bridge. | Validates child ready envelope origin/app/iframeLaunchId. | Dev host should use same ready/bootstrap semantics. |
| `autobyteus-server-ts/src/application-packages/services/application-package-registry-service.ts` | Package registry/import authority. | Runs validation and refreshes catalogs without app-owned build/install. | Must stay production import authority; devkit only pre-validates. |
| `autobyteus-server-ts/src/application-bundles/providers/file-application-bundle-provider.ts` | File package discovery/validation. | Requires generated package root with `applications/<id>/application.json`, `ui/`, `backend/`. | Generated package output must preserve this contract. |
| `autobyteus-server-ts/src/application-engine/worker/application-worker-runtime.ts` | Worker-side backend definition loader/invoker. | Imports prebuilt backend entry module and executes app code. | Docs must clarify backend code execution trust at launch. |
| `applications/brief-studio/scripts/build-package.mjs` | App-specific sample build/package script. | Duplicated source-to-runtime output logic. | Replace external path with devkit-owned reusable pack command; sample scripts may be refactored or left internal. |
| `applications/socratic-math-teacher/scripts/build-package.mjs` | App-specific sample build/package script. | Same duplicated packaging pattern. | Same as above. |
| `autobyteus-web/localization/messages/en/applications.ts` and `zh-CN/applications.ts` | User-facing application strings. | Stale `v1 ready/bootstrap handshake` text remains. | Correct to v3 in milestone. |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-26 | Static probe | `rg -n "launchInstanceId|autobyteusLaunchInstanceId|v1 ready/bootstrap|iframeLaunchId|autobyteusIframeLaunchId" ...` | Active scoped code uses `iframeLaunchId`; only stale `v1` text was found in localization. | New developer-facing surfaces should use v3; update stale copy. |
| 2026-04-26 | Static probe | `find autobyteus-server-ts/src/application-packages autobyteus-server-ts/src/application-bundles -maxdepth 4 -type f` plus targeted `nl -ba` reads | Import/discovery owners are separated from runtime engine owners. | Avoid mixing dev tooling into production server internals. |
| 2026-04-26 | Static probe | Sample app tree and build script reads under `applications/brief-studio` and `applications/socratic-math-teacher` | Current sample layout has generated `ui/` and `backend/` beside source. | External template should improve source/output structure. |

## External / Public Source Findings

No external web or public API source was needed. Investigation used local code and docs only.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for design investigation.
- Required config, feature flags, env vars, or accounts: None for design investigation.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: `git fetch origin --prune` refreshed tracked refs.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

1. Production package/import shape is not the authoring layout.
   - Current import expects package root -> `applications/<app-id>/application.json` -> runtime `ui/` and `backend/` folders.
   - External source repos can and should use a cleaner source layout, then generate the runtime shape under `dist/importable-package`.

2. The v3 iframe baseline is stable enough for dev bootstrap.
   - Shared contracts already expose launch hint names and bootstrap envelope validators/builders.
   - App-side startup already requires valid launch hints and bootstrap, so a dev host can exercise the same app startup path.

3. Import safety is narrower than sandboxing.
   - User import does not build/install, but app backend code is still executed by the application worker when the app launches.
   - Developer docs must not imply untrusted third-party code is sandboxed.

4. Devkit validation should not become production authority.
   - Production server import remains authoritative.
   - Devkit validation should catch package errors earlier for developer CI and local workflows.

5. Current samples are useful behavior examples but not ideal external templates.
   - They demonstrate contracts and runtime flows.
   - They also expose confusing root-level generated folders, which the new template should avoid.

## Constraints / Dependencies / Compatibility Facts

- Production manifest v3 and backend bundle manifest v1 are hard constraints.
- Generated package must keep `applications/<local-app-id>/application.json` and runtime `ui/` / `backend/` folders.
- New external authoring layout should not require changes to server import/discovery.
- `startHostedApplication(...)` remains the app frontend startup boundary.
- The backend worker expects a self-contained ESM entry module path declared in `backend/bundle.json`.
- The server import path should not run external app package scripts.
- Dev mode may run developer-owned build/dev processes because it is explicitly developer-side.

## Open Unknowns / Risks

- Public package publishing may need release workflow work beyond source changes.
- Devkit validator may duplicate server manifest validation in Milestone 1; future extraction of shared Node validation could reduce drift.
- Dependency bundling policy must be explicit so generated backend output does not rely on a source repo `node_modules` folder at runtime.
- Dev bootstrap without a real AutoByteus backend can only validate frontend startup and mocked transport behavior.

## Notes For Architect Reviewer

- The design should keep production import/runtime owners unchanged.
- The new primary owner should be `@autobyteus/application-devkit` for external authoring commands, package assembly, validation, dev bootstrap, and template materialization.
- The package contract should remain generated-output-facing: `dist/importable-package/applications/<app-id>/{application.json,ui,backend}`.
- New external docs should explicitly teach source inputs vs generated runtime package outputs.
- The stale v1 localization string is a small but important contract-vocabulary cleanup in this scope.
