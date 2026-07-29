# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/design-spec.md`
- Supplemental task artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/proposal-critical-analysis.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/design-self-validation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/sources/autobyteus-vertical-application-developer-experience-proposal.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/solution-revision-record.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/design-review-report.md`
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence, when applicable:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/code-review-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/code-review-revision-record.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/api-e2e-execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/api-e2e-revision-record.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/evidence/api-e2e/brief-dev-studio.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/evidence/api-e2e/studio-root-dev.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/evidence/api-e2e/devkit-studio-existing-package-regression.log`
  - Failure-origin result `CRR-003`: `Fail — Local Fix`; finding `CR-003`, linked to `APIE2E-007`, `APIE2E-F001`, and `API-REV-001`.

## Current Implementation Summary

The complete implementation spans the initial source commit `247795f5f4fd9fda2e45347b7a9680b4c385e0a7`, the deterministic development-lifecycle fix `0762cd7e37122e0c6c4e5d4ed463a28c9030d38f`, and the current Studio repeated-edit fix `b0eaa5f8aa9bce49be61a916349e04eb5c2eb28f` on `codex/universal-application-framework-proposal-analysis`.

- Replaced the iframe-specific application entry with one unversioned `startApplication` API, a strict host-neutral runtime bootstrap, and Studio-iframe and standalone-same-origin providers.
- Added explicit graph-local application platform composition, readiness, recovery, lifecycle, gateway, engine, storage, orchestration, communication, streaming, notification, and run authorities.
- Split Studio and selected-application standalone Fastify compositions while reusing the same runtime graph and service owners.
- Added a public `startStandaloneApplicationHost` boundary, exact standalone selection, static/SPA routing, bootstrap/health routes, fixed-application REST/WebSocket mounts, WebSocket origin enforcement, isolated data-root materialization, and staged cleanup.
- Replaced mock-capable devkit product development with real standalone and Studio sessions, atomic repack/watch/restart behavior, and build-free production `start`.
- Migrated the starter, Brief Studio, and Socratic Math Teacher to the shared SDK/devkit owners; removed custom builders, source-root generated mirrors, vendor trees, and stale hosted-startup outputs.
- Regenerated the two maintained importable packages through the devkit pack owner and refreshed directly affected docs.
- Added cleanup/reset support needed for in-process standalone restart, including event-pipeline, worker, gateway, socket, notification, observer, streaming, vault, and Prisma boundaries.
- Replaced the stateless OS URL launcher with one devkit-owned controlled Chrome/Edge page. Initial standalone start navigates once; a successful same-origin watched host restart explicitly invokes a full document reload, while an effective port change navigates that same page to the new host URL.
- Made long-running project watching re-resolve and replace configured input subscriptions after every successful rebuild. Standalone and Studio rebuilds now re-read current config/manifest state; standalone uses the current manifest ID and non-overridden config port, while Studio refreshes the current output-root package registration and resolves the current canonical application selection before reload.
- Corrected Studio repeated-edit handling without weakening unique-root enforcement: the devkit resolves an existing package root before import, invokes a dedicated Studio package-reload mutation backed by the existing registry/cache refresh owner, resolves the current manifest identity after that refresh, and only then invokes the existing backend reload/re-entry endpoint. Initial roots still use the import owner exactly once.

- Implementation cycle: `Rework`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/implementation-revision-record.md`
- Current implementation revision ID: `IR-003`
- Related solution revision IDs: `SR-003`
- Related architecture-review revision IDs: `ARCH-REV-003`
- Related code-review revision IDs: `CRR-001`, `CRR-002`, `CRR-003`
- Related API/E2E revision IDs: `API-REV-001`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `CR-003`, `APIE2E-F001`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| DS-001 | Studio iframe bootstrap becomes provider-local while application source receives one runtime contract/client. | `autobyteus-application-sdk-contracts/src/{application-iframe-contract,application-runtime-bootstrap}.ts`; `autobyteus-application-frontend-sdk/src/application-startup/{application-startup-coordinator,studio-iframe-bootstrap-provider}.ts`; `autobyteus-web/components/applications/{ApplicationSurface,ApplicationIframeHost}.vue` | Implemented. Iframe correlation/origin validation remains in the provider/Studio host; application callbacks receive no iframe-only fields. |
| DS-002 | A selected current package starts standalone at `/` and mounts through the same application client. | `autobyteus-server-ts/src/standalone-application-host/**`; `autobyteus-application-frontend-sdk/src/application-startup/standalone-same-origin-bootstrap-provider.ts`; `autobyteus-application-sdk-contracts/src/standalone-application-bootstrap.ts` | Implemented. Live Brief startup mounted the business UI from a fresh isolated data root with the strict same-origin bootstrap. |
| DS-003 | Studio and standalone mounts delegate backend operations to one gateway/engine path. | `autobyteus-server-ts/src/compositions/{build-studio-server-composition,build-standalone-application-server-composition}.ts`; `src/api/rest/application-backend-route-handlers.ts`; `src/application-backend-api-gateway/**` | Implemented with explicit injected graph authorities and host-specific ingress cardinality. No host imports application business backend code. |
| DS-004 | Resource resolution, run launch, events, artifacts, streaming, and communication remain shared runtime authorities. | `autobyteus-server-ts/src/application-platform/runtime/{create-application-orchestration-authorities,create-application-run-authorities}.ts`; `src/application-orchestration/**`; `src/application-agent-{communication,streaming}/**` | Implemented. Existing orchestration semantics are retained behind graph-local service construction; exact runtime execution remains a downstream executable-coverage target. |
| DS-005 | Explicit reusable preparation/readiness/recovery/stop lifecycle for both compositions. | `autobyteus-server-ts/src/application-platform/runtime/{application-platform-lifecycle,application-definition-runtime-readiness,application-runtime-definition-validator,create-application-platform-runtime-graph}.ts`; `src/server-runtime.ts` | Implemented. Readiness includes the exact seven tool groups and definition/resource validation; selected-app diagnostics fail standalone and quarantine invalid Studio apps. Stop is idempotent and aggregates cleanup errors. |
| DS-006 | Real native standalone and Studio development sessions use the shared pack owner and checked-in mappings. | `autobyteus-application-devkit/src/development/{application-development-project-state,application-project-watch,development-browser-session,standalone-development-session,studio-development-session,studio-application-client}.ts`; `autobyteus-server-ts/src/api/graphql/types/application-packages.ts`; `src/commands/dev.ts`; maintained `autobyteus-app.config.mjs`/`package.json`; starter templates | Implemented through `IR-003`. Standalone retains one controlled browser page and explicitly reloads it after successful same-host restart. Both session modes re-read current config/manifest state and replace resolved source subscriptions. Studio now distinguishes absent-root import from existing-root package refresh, resolves current identity only after catalog refresh, and then requests backend reload. Unique-root rejection remains authoritative. Mock dev-server product files and custom maintained-app builders remain deleted. Full live API/E2E rerun is pending. |
| DS-007 | One current package remains directly consumable by both hosts without mutation or host-specific rebuild. | Devkit `packApplicationProject` output; Studio local-package client; standalone selection/start boundary; regenerated `applications/*/dist/importable-package` | Production paths consume the package read-only and `start` performs validation only. Durable digest-based dual-host conformance proof remains for API/E2E ownership. |
| DS-008 | Standalone root/assets/eligible SPA fallback are confined to selected `ui/`; platform routes remain reserved. | `autobyteus-server-ts/src/standalone-application-host/api/{standalone-application-static-routes,register-standalone-application-rest,standalone-browser-websocket-origin}.ts` | Implemented. Live smoke returned root and HTML-navigation fallback, reserved-route 404, API-style asset 404, invalid-origin WebSocket close `1008`, and matching-origin connection. |
| DS-009 | Studio launch/reload/teardown remains explicit and compatible with the new iframe provider. | `autobyteus-web/components/applications/{ApplicationSurface,ApplicationIframeHost}.vue`; `utils/application/applicationLaunchDescriptor.ts`; focused component tests | Implemented without adding implicit relaunch or runtime-run behavior. Existing launch-state owner remains authoritative. |
| DS-010 | `build`/`validate` then build-free production `start` runs the real standalone composition with separate durable data and graceful stop. | `autobyteus-application-devkit/src/commands/start.ts`; `src/development/development-process-lifetime.ts`; `autobyteus-server-ts/src/standalone-application-host/start-standalone-application-host.ts` | Implemented. Direct CLI SIGTERM smoke exited `0`, released the listener, and left the isolated database/root key in the configured data root. |

## Key Files Or Areas

- Frontend/runtime contracts: `autobyteus-application-sdk-contracts/src/`
- Application startup SDK: `autobyteus-application-frontend-sdk/src/application-startup/`
- Runtime graph/lifecycle: `autobyteus-server-ts/src/application-platform/runtime/`
- Explicit compositions: `autobyteus-server-ts/src/compositions/`
- Standalone host: `autobyteus-server-ts/src/standalone-application-host/`
- Shared ingress adaptations: `autobyteus-server-ts/src/api/{graphql,rest,websocket}/`
- Devkit commands/development sessions: `autobyteus-application-devkit/src/{commands,development}/`
- Maintained applications: `applications/{brief-studio,socratic-math-teacher}/`
- Studio iframe presentation: `autobyteus-web/components/applications/` and `autobyteus-web/utils/application/`

## Important Assumptions

- Manifest v4 remains the one current package format; serialized contract/version values remain data while public current-contract symbols are unversioned.
- Studio's GraphQL package list/import/reload operations and application backend reload route form the supported `dev:studio` integration boundary; package reload delegates to the existing registry/catalog refresh service rather than duplicate registration.
- Standalone execution selects one explicit local application ID and runs in its own process/data root; it does not attempt concurrent independent process-global AppConfig instances in one Node process.
- A missing standalone data-root `.env` may be materialized as an empty non-secret file; existing files are never overwritten.
- API/E2E owns durable conformance/test updates and broader real-host execution, including exact team-run equivalence.

## Known Risks

- API/E2E determined the previously failing REST assertions and several related integrations remained behaviorally valid but had stale implicit-owner setup. Its preserved uncommitted durable updates passed the 50-file affected server selection at 216/216; proportional test-code review remains pending after a successful full rerun.
- API/E2E round `API-REV-001` exercised real Brief `dev:studio` and exposed the repeated-root failure now addressed by `IR-003`; its full rerun and remaining live matrix are required before any pass claim.
- Dual-host immutable digest conformance, the complete same-Brief journey, the complete starter/Brief/Socratic command matrix, and Studio browser remount remain incomplete according to the current API/E2E report.
- The rendered implementation check covered standalone Brief startup/empty state at the browser tool's narrow responsive viewport. Studio rendering, Socratic rendering, transient startup failure UI, and business mutations remain independently unverified.
- Restart cleanup is proven for two sequential standalone graph generations in one process; broader long-running leak detection remains downstream coverage.
- `IR-002` added focused source-level and narrow live-browser evidence for config-driven watch replacement and explicit document reload. `IR-003` adds focused ordering evidence for one-time initial import and repeated existing-root package refresh/current identity/backend reload. Full repeated live execution and Studio presentation remount remain downstream API/E2E ownership.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: larger cross-cutting feature/refactor.
- Reviewed root-cause classification: boundary/ownership issue with duplicated host-specific startup/composition coordination.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `Refactor Needed Now`.
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`.
- Evidence / notes: provider wire concerns, lifecycle sequencing, graph construction, ingress mounting, project commands, and package assembly now have explicit owners. Host adapters depend on the graph/gateway boundaries rather than global application registrars or copied server implementations.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes: removed `startHostedApplication`, version-suffixed current-contract symbols, mock dev server product files, custom maintained-app builders, generated source-root mirrors/vendor trees, broad application route registration, and the stateless `openDevelopmentBrowser` launcher. The current browser lifecycle, project-state resolution, watch replacement, and host sessions have distinct owners; no changed source implementation file exceeds 500 effective lines.

## Persisted Data Transition Check (When Applicable)

- Approved decision (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`): `Directly Usable — No Migration`
- Design-spec decision reference: persisted-data decision and direct-use matrix in `design-spec.md`; `SR-003`/`ARCH-REV-003`.
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result, when applicable: the current Brief manifest/package parsed and started unchanged; a new isolated operational database ran the existing core/app-data migration chain; a second in-process start reused that current database/root key successfully. No package-vNext or application-data conversion was added.
- Migration implementation and focused checks, only when `Migration Required`: `N/A`
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- Node.js `v22.23.1`; pnpm `10.28.2`.
- `pnpm install --no-frozen-lockfile` completed; existing peer-dependency warnings remained non-blocking.
- Devkit declares workspace `autobyteus-server-ts`, `chokidar`, and now direct `playwright-core` for the controlled development-browser lifecycle; `pnpm-lock.yaml` is updated.
- Automatic browser opening requires an installed Chrome or Edge channel. `AUTOBYTEUS_DEVELOPMENT_BROWSER_EXECUTABLE` and `AUTOBYTEUS_DEVELOPMENT_BROWSER_CHANNEL` provide explicit selection, and `--no-open` disables browser control without changing the real host path.
- Nuxt focused tests required the normal `pnpm -C autobyteus-web exec nuxt prepare` generated-type setup because `.nuxt/tsconfig.json` was initially absent.
- Initial implementation commit: `247795f5f4fd9fda2e45347b7a9680b4c385e0a7`.
- Deterministic development-lifecycle source commit: `0762cd7e37122e0c6c4e5d4ed463a28c9030d38f`.
- Current Studio repeated-edit source commit: `b0eaa5f8aa9bce49be61a916349e04eb5c2eb28f`.

## Local Implementation Checks Run

- `pnpm -C autobyteus-server-ts build` — passed, including Prisma generation and sanitized built-in agent bootstrap smoke.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — passed.
- `pnpm -C autobyteus-application-sdk-contracts test` — 6/6 passed.
- `pnpm -C autobyteus-application-frontend-sdk test` — 12/12 passed, including type tests.
- `pnpm -C autobyteus-application-devkit test` after `IR-002` historically reported 19/19. Its retained-page and real-chokidar scenarios remain valid; `API-REV-001` correctly invalidated the mocked successful duplicate-import expectation in the former Studio scenario, so that historical assertion is not current proof.
- Focused server unit selection covering 19 current bundle/engine/orchestration/storage/config files — 19 files and 85 tests passed.
- The initial implementation run of two implicit-registrar REST files failed 6 assertions because of stale setup. `API-REV-001` superseded that existing-test assessment, updated the API/E2E-owned setups, and reports the 50-file affected server selection at 216/216.
- Brief Studio and Socratic Math Teacher: `pnpm build`, `pnpm validate`, and `pnpm typecheck:backend` — all passed for both projects.
- After `nuxt prepare`, focused Studio host tests — 3 files and 9 tests passed.
- Narrow live standalone implementation smoke:
  - two sequential `startStandaloneApplicationHost` generations with the same fresh data root both reached ready;
  - root and eligible SPA navigation returned the Brief entry;
  - reserved platform route returned 404;
  - strict bootstrap returned the stable canonical identity;
  - invalid WebSocket origin closed with `1008`, matching origin connected;
  - close/restart succeeded and the isolated database/root key existed under the requested data root.
- Direct `autobyteus-app start` CLI SIGTERM smoke — ready health observed, process exited `0`, listener closed, and isolated database/root key persisted.
- `IR-002` narrow real-browser smoke with the compiled browser owner and system Chrome in headless mode — initial navigation reached host generation one; after closing and replacing the server on the same port, explicit `reload()` reached generation two on the same retained page; controlled browser cleanup completed.
- Brief Studio and Socratic Math Teacher `pnpm build` and `pnpm validate` were rerun after `IR-002` — passed for both configured package roots.
- `git diff --check`, obsolete application-facing identifier search, generated package-shape inspection, and changed-source effective-line guard — passed; all `IR-002` changed implementation files remain under 500 effective non-empty lines.
- `pnpm -C autobyteus-application-devkit build` after `IR-003` — passed.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` after `IR-003` — passed.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/application-packages/application-package-service.test.ts --no-file-parallelism --maxWorkers=1` — 13/13 passed, including the existing local-package reload/cache-refresh authority.
- `IR-003` disposable client/session-order probe — passed. Initial root sequence was lookup -> import -> resolve root -> current identity -> backend reload. Two existing-root generations each ran lookup -> package reload -> refreshed current identity -> backend reload, selected the renamed current canonical IDs, and never invoked import.
- The shared-worktree devkit suite currently reports 18/19 passed. The sole failure is the API/E2E-owned uncommitted regression mock rejecting the newly required `DevkitReloadApplicationPackage` operation as “Unexpected query” before its final no-import assertion. Source inspection and the disposable probe confirm no duplicate import; the durable mock must be extended by `api_e2e_engineer` during the mandatory rerun. No implementation-owned test file was changed or committed in `IR-003`.
- `IR-003` owned-source `git diff --check`, focused commit-content check, and effective-line guard — passed; the changed devkit client and GraphQL resolver remain at 99 and 153 effective non-empty lines.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: application document startup/handoff and the maintained Brief Studio standalone application surface.
- Approved UI/UX, interaction, requirement, or design references: `requirements.md` UC-004/UC-006/UC-016 and AC-002/AC-003/AC-007/AC-009/AC-011; `design-spec.md` DS-001, DS-002, DS-008, and the frontend startup state machine. No separate behavior-defining UI/UX supplement exists.
- Existing design system, shared components, and adjacent product surfaces reviewed: Brief `frontend-src` renderer/styles and Studio `ApplicationSurface`/`ApplicationIframeHost` reveal-gate behavior.
- Project development / preview instructions and rendered surface used: built Brief package through real `pnpm start`; browser tab at `http://127.0.0.1:43246/`.
- States, layouts, viewports, and interactions inspected: completed standalone bootstrap/business handoff, responsive narrow layout, form/button/list/detail empty state, hierarchy, spacing, typography, labels, and absence of startup-screen leakage or clipping. DOM snapshot showed the business UI under `#app-root`.
- Visual or interaction issues found and corrected: no remaining in-scope visual defect was observed after the host-neutral startup migration.
- Supporting evidence and remaining unverified states or limitations: screenshot `/Users/normy/.autobyteus/browser-artifacts/2b731a-1785320622629.png`; `IR-002` changes only development-session browser lifecycle/watching and does not alter product layout or styling. Its narrow real-browser check confirmed a new document request after host replacement. Studio-hosted rendering, Socratic, transient error/loading screens, keyboard/focus traversal, and business mutations remain for independent coverage. This is implementation self-validation, not API/E2E sign-off.

## Downstream Coverage Hints / Suggested Scenarios

- Update or replace the two stale REST tests against explicit Studio/standalone compositions; verify long canonical application IDs and execution-resource configuration routes through the current injected graph.
- Prove two independent composition graphs do not share availability, gateway, engine, storage, run lookup, notification, WebSocket, or orchestration state.
- Rerun `API-REV-001` after updating its durable Studio-client mock to model the dedicated existing-package reload mutation; require repeated real Brief `dev:studio` edits to complete package refresh, current identity selection, backend reload, and explicit Studio remount without a second import.
- Run the remaining `dev`, `dev:studio`, `build`, `validate`, and build-free `start` matrix from the starter, Brief, and Socratic roots; mutate current source inputs, `application.json`, and `autobyteus-app.config.mjs` mappings/port/output root and verify subscription replacement, current selection, atomic rebuild/restart, standalone full document reload, Studio explicit remount, and cleanup.
- Hash the generated package before Studio and standalone runs and after shutdown; require an unchanged package and identical relevant entry/backend digests.
- Execute the real Brief team through `context.agentExecution` in both hosts with the same resource/launch profile and assert event/artifact/notification equivalence.
- Exercise missing/ambiguous/invalid selection; invalid runtime/tool/skill/resource setup; worker crash followed by supported ensure-ready/recovery; pending event/binding recovery.
- Probe traversal, symlink escape, malformed encoding, content types, cache behavior, API-style 404 versus HTML navigation fallback, reserved namespace, visible-host/TLS bootstrap normalization, and WebSocket origin/Host matching.
- Verify event-pipeline, vault, Prisma, workers, notification sockets, custom WebSockets, streaming subscriptions, and listeners are released across repeated starts/stops and signal termination.
- Independently render Studio and standalone surfaces, including loading/failure/dispose/reload/exit and responsive/accessibility states.

## API / E2E / Executable Coverage Investigation And Execution Still Required

The API/E2E engineer must investigate existing coverage validity, own durable test changes, execute broader repository and real dual-host scenarios, score confidence, and report residual risks. The local checks above do not constitute API/E2E sign-off.
