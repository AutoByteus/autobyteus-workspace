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
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/evidence/api-e2e/api-rev-003-definition-catalog-refresh.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/evidence/api-e2e/api-rev-003-studio-gate-remount.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/evidence/api-e2e/api-rev-003-brief-real-team-run.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/evidence/api-e2e/api-rev-003-brief-real-team-failure-api.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/evidence/api-e2e/api-rev-003-brief-real-team-failure-browser.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/evidence/api-e2e/api-rev-003-brief-real-team-failure.png`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/evidence/api-e2e/api-rev-003-cleanup.log`
  - Failure-origin result `CRR-007`: `Fail — Local Fix`; finding `CR-005`, linked to `APIE2E-BRIEF-002`, `APIE2E-F003`, and `API-REV-003`.

## Current Implementation Summary

The complete implementation spans the initial source commit `247795f5f4fd9fda2e45347b7a9680b4c385e0a7`, the deterministic development-lifecycle fix `0762cd7e37122e0c6c4e5d4ed463a28c9030d38f`, the Studio repeated-edit fix `b0eaa5f8aa9bce49be61a916349e04eb5c2eb28f`, the Studio definition-authority fix `b14dee08fecf42beb8cb5eb78cccea3f149215ee`, and the current application run-identity authority fix `feb5e7a3efc284fd4eeef75dc42875a2b621eee6` on `codex/universal-application-framework-proposal-analysis`.

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
- Corrected the Studio definition-authority split: the existing composition-to-GraphQL authority holder now receives the exact `AgentDefinitionService` and `AgentTeamDefinitionService` created for the Studio application graph, and every agent/team GraphQL read, refresh, create, update, and delete operation uses those authorities. Process-global singleton lookup, catalog merging, and fallback access are absent from that surface.
- Corrected application team-member identity allocation: `createApplicationRunAuthorities()` constructs one allocator from the exact graph-local agent definition, active-run, agent metadata, team metadata, and memory authorities, then injects it into both the team and agent run services. Application launches share one graph-local reservation/collision authority instead of activating the allocator's process-global defaults.

- Implementation cycle: `Rework`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/implementation-revision-record.md`
- Current implementation revision ID: `IR-005`
- Related solution revision IDs: `SR-003`
- Related architecture-review revision IDs: `ARCH-REV-003`
- Related code-review revision IDs: `CRR-001`–`CRR-007`
- Related API/E2E revision IDs: `API-REV-001`–`API-REV-003`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `CR-005`, `APIE2E-BRIEF-002`, `APIE2E-F003`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| DS-001 | Studio iframe bootstrap becomes provider-local while application source receives one runtime contract/client. | `autobyteus-application-sdk-contracts/src/{application-iframe-contract,application-runtime-bootstrap}.ts`; `autobyteus-application-frontend-sdk/src/application-startup/{application-startup-coordinator,studio-iframe-bootstrap-provider}.ts`; `autobyteus-web/components/applications/{ApplicationSurface,ApplicationIframeHost}.vue` | Implemented. Iframe correlation/origin validation remains in the provider/Studio host; application callbacks receive no iframe-only fields. |
| DS-002 | A selected current package starts standalone at `/` and mounts through the same application client. | `autobyteus-server-ts/src/standalone-application-host/**`; `autobyteus-application-frontend-sdk/src/application-startup/standalone-same-origin-bootstrap-provider.ts`; `autobyteus-application-sdk-contracts/src/standalone-application-bootstrap.ts` | Implemented. Live Brief startup mounted the business UI from a fresh isolated data root with the strict same-origin bootstrap. |
| DS-003 | Studio and standalone mounts delegate backend operations to one gateway/engine path. | `autobyteus-server-ts/src/compositions/{build-studio-server-composition,build-standalone-application-server-composition}.ts`; `src/api/rest/application-backend-route-handlers.ts`; `src/application-backend-api-gateway/**` | Implemented with explicit injected graph authorities and host-specific ingress cardinality. No host imports application business backend code. |
| DS-004 | Resource resolution, run launch, events, artifacts, streaming, communication, and definition catalogs remain shared composition authorities. | `autobyteus-server-ts/src/application-platform/runtime/{create-application-definition-services,create-application-orchestration-authorities,create-application-run-authorities}.ts`; `src/api/graphql/{studio-application-api-authorities,types/agent-definition,types/agent-team-definition}.ts`; `src/application-orchestration/**`; `src/application-agent-{communication,streaming}/**` | Implemented through `IR-005`. The runtime graph and Studio GraphQL surface receive the exact same composition-created definitions. Application agent/team identity allocation also uses one graph-owned allocator with the exact definition, run-manager, metadata, and memory collision authorities; no composition-critical global lookup remains on this launch path. |
| DS-005 | Explicit reusable preparation/readiness/recovery/stop lifecycle for both compositions. | `autobyteus-server-ts/src/application-platform/runtime/{application-platform-lifecycle,application-definition-runtime-readiness,application-runtime-definition-validator,create-application-platform-runtime-graph}.ts`; `src/server-runtime.ts` | Implemented. Readiness includes the exact seven tool groups and definition/resource validation; selected-app diagnostics fail standalone and quarantine invalid Studio apps. Stop is idempotent and aggregates cleanup errors. |
| DS-006 | Real native standalone and Studio development sessions use the shared pack owner and checked-in mappings. | `autobyteus-application-devkit/src/development/{application-development-project-state,application-project-watch,development-browser-session,standalone-development-session,studio-development-session,studio-application-client}.ts`; `autobyteus-server-ts/src/api/graphql/types/application-packages.ts`; `src/commands/dev.ts`; maintained `autobyteus-app.config.mjs`/`package.json`; starter templates | Implemented through `IR-003`. Standalone retains one controlled browser page and explicitly reloads it after successful same-host restart. Both session modes re-read current config/manifest state and replace resolved source subscriptions. Studio now distinguishes absent-root import from existing-root package refresh, resolves current identity only after catalog refresh, and then requests backend reload. Unique-root rejection remains authoritative. Mock dev-server product files and custom maintained-app builders remain deleted. Full live API/E2E rerun is pending. |
| DS-007 | One current package remains directly consumable by both hosts without mutation or host-specific rebuild. | Devkit `packApplicationProject` output; Studio local-package client; standalone selection/start boundary; regenerated `applications/*/dist/importable-package` | Production paths consume the package read-only and `start` performs validation only. Durable digest-based dual-host conformance proof remains for API/E2E ownership. |
| DS-008 | Standalone root/assets/eligible SPA fallback are confined to selected `ui/`; platform routes remain reserved. | `autobyteus-server-ts/src/standalone-application-host/api/{standalone-application-static-routes,register-standalone-application-rest,standalone-browser-websocket-origin}.ts` | Implemented. Live smoke returned root and HTML-navigation fallback, reserved-route 404, API-style asset 404, invalid-origin WebSocket close `1008`, and matching-origin connection. |
| DS-009 | Studio setup/launch/reload/teardown remains explicit and compatible with the new iframe provider. | `autobyteus-server-ts/src/compositions/build-studio-server-composition.ts`; GraphQL definition authority files; `autobyteus-web/components/applications/{ApplicationSurface,ApplicationIframeHost}.vue`; `components/applications/setup/ApplicationTeamLaunchProfileEditor.vue`; focused component tests | Implemented through `IR-004` without adding implicit relaunch or runtime-run behavior. `API-REV-003` confirms the exact package team is visible, setup saves, entry enables, the iframe mounts, and explicit reload replaces launch 1 with launch 2 while preserving one iframe. |
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
- Studio's agent/team definition GraphQL surface is a composition adapter over the exact services created by `createApplicationDefinitionServices`; it is not an independent global catalog owner.
- Application run identity is allocated by one graph-owned allocator wired to the exact package definition service plus the graph's active-run and agent/team metadata collision authorities; ordinary allocator uniqueness semantics remain authoritative.
- Standalone execution selects one explicit local application ID and runs in its own process/data root; it does not attempt concurrent independent process-global AppConfig instances in one Node process.
- A missing standalone data-root `.env` may be materialized as an empty non-secret file; existing files are never overwritten.
- API/E2E owns durable conformance/test updates and broader real-host execution, including exact team-run equivalence.

## Known Risks

- API/E2E determined the previously failing REST assertions and several related integrations remained behaviorally valid but had stale implicit-owner setup. Its preserved uncommitted durable updates passed the current 51-file affected server selection at 219/219; proportional test-code review remains pending after a successful full rerun.
- `API-REV-002` confirms `CR-003`/`APIE2E-F001` resolved: devkit 19/19 and real initial plus two repeated Brief Studio refresh generations pass without duplicate import.
- `API-REV-003` confirms `CR-004`/`APIE2E-F002` resolved: the exact team is visible among 29 definitions, setup and entry succeed, and explicit remount maintains one fresh iframe.
- `API-REV-003` then exposed `CR-005`/`APIE2E-F003`: the real Brief team launch reached identity allocation, but the default allocator read the process-global definition catalog and could not load the package-owned `researcher`. `IR-005` corrects the graph-owned allocator wiring; successful binding/run/provider/artifact behavior requires rerun.
- Dual-host immutable digest conformance, the successful same-Brief execution journey, and the complete starter/Brief/Socratic command matrix remain incomplete according to the current API/E2E report.
- The rendered implementation check covered standalone Brief startup/empty state at the browser tool's narrow responsive viewport. Studio rendering, Socratic rendering, transient startup failure UI, and business mutations remain independently unverified.
- Restart cleanup is proven for two sequential standalone graph generations in one process; broader long-running leak detection remains downstream coverage.
- `IR-002` added focused source-level and narrow live-browser evidence for config-driven watch replacement and explicit document reload. `IR-003` corrected repeated package refresh and is API/E2E-confirmed. `IR-004` corrected definition authority and is API/E2E-confirmed. `IR-005` adds direct graph-local allocator/collision-authority evidence; successful in-Studio team execution remains downstream API/E2E ownership.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: larger cross-cutting feature/refactor.
- Reviewed root-cause classification: boundary/ownership issue with duplicated host-specific startup/composition coordination.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `Refactor Needed Now`.
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`.
- Evidence / notes: provider wire concerns, lifecycle sequencing, graph construction, ingress mounting, project commands, package assembly, Studio definition APIs, and application run identity allocation now have explicit owners. `CR-005` was a bounded construction defect; `IR-005` makes both application agent and team launch depend on one allocator created by the run-authority owner from exact graph-local definition/run/metadata collaborators.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes: removed `startHostedApplication`, version-suffixed current-contract symbols, mock dev server product files, custom maintained-app builders, generated source-root mirrors/vendor trees, broad application route registration, the stateless `openDevelopmentBrowser` launcher, Studio agent/team GraphQL singleton bypasses, and the application launch allocator's activation of process-global defaults. Browser lifecycle, project-state resolution, watch replacement, host sessions, definition APIs, and application run identity now have explicit owners; no changed source implementation file exceeds 500 effective lines.

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
- Studio repeated-edit source commit: `b0eaa5f8aa9bce49be61a916349e04eb5c2eb28f`.
- Studio definition-authority source commit: `b14dee08fecf42beb8cb5eb78cccea3f149215ee`.
- Current application run-identity authority source commit: `feb5e7a3efc284fd4eeef75dc42875a2b621eee6`.

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
- The `IR-003` shared-worktree devkit run reported 18/19 because the then-preserved API/E2E regression did not model package reload. `API-REV-002` supersedes that limitation: its updated durable regression and full devkit suite pass 19/19, and real repeated Studio refresh also passes.
- `IR-003` owned-source `git diff --check`, focused commit-content check, and effective-line guard — passed; the changed devkit client and GraphQL resolver remain at 99 and 153 effective non-empty lines.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` after `IR-004` — passed.
- `IR-004` resolver singleton guard — passed: neither Studio agent nor team definition resolver contains `AgentDefinitionService.getInstance()` or `AgentTeamDefinitionService.getInstance()`.
- `IR-004` disposable GraphQL authority probe — passed. The authority holder returned the exact configured services; agent/team list operations reached those services; agent refresh used the exact agent service; team refresh preserved agent-before-team order on the same configured pair.
- `API-REV-003` supersedes the prior `definition-catalog-refresh.test.ts` limitation: API/E2E updated its durable configured-authority coverage and it passes 3/3 and in the 219/219 affected server selection.
- `IR-004` owned-source diff/commit checks and size guard — passed. The authority holder, agent resolver, team resolver, and Studio composition remain at 44, 279, 293, and 162 effective non-empty lines; all are under 500 and the local deltas are below the 220-line split trigger.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` after `IR-005` — passed.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/agent-run-identity-allocator.test.ts tests/unit/agent-team-execution/team-run-launch-identity-assignment.test.ts tests/unit/agent-team-execution/team-run-service.test.ts` — passed, 3 files / 16 tests. Existing allocator collision/reservation semantics, assignment, and team-run launch behavior remain intact.
- `IR-005` disposable direct allocator-authority probe — passed 1/1. The real allocator constructed by `createApplicationRunAuthorities()` retained the exact package definition service, graph agent-run manager, agent/team metadata collision services, and memory root; the agent and team run services shared that allocator; the published-artifact projection shared the agent metadata authority; and package-owned `Researcher` identity allocation succeeded. The probe was removed after execution.
- `IR-005` diff/commit and source-size guards — passed. The only source delta is `create-application-run-authorities.ts` at 101 effective non-empty lines with a 16-addition/2-deletion delta; no API/E2E-owned durable file was staged or committed.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: application document startup/handoff and the maintained Brief Studio standalone application surface.
- Approved UI/UX, interaction, requirement, or design references: `requirements.md` UC-004/UC-006/UC-016 and AC-002/AC-003/AC-007/AC-009/AC-011; `design-spec.md` DS-001, DS-002, DS-008, and the frontend startup state machine. No separate behavior-defining UI/UX supplement exists.
- Existing design system, shared components, and adjacent product surfaces reviewed: Brief `frontend-src` renderer/styles and Studio `ApplicationSurface`/`ApplicationIframeHost` reveal-gate behavior.
- Project development / preview instructions and rendered surface used: built Brief package through real `pnpm start`; browser tab at `http://127.0.0.1:43246/`.
- States, layouts, viewports, and interactions inspected: completed standalone bootstrap/business handoff, responsive narrow layout, form/button/list/detail empty state, hierarchy, spacing, typography, labels, and absence of startup-screen leakage or clipping. DOM snapshot showed the business UI under `#app-root`.
- Visual or interaction issues found and corrected: no remaining in-scope visual defect was observed after the host-neutral startup migration.
- Supporting evidence and remaining unverified states or limitations: screenshot `/Users/normy/.autobyteus/browser-artifacts/2b731a-1785320622629.png`; `IR-002` changes only development-session browser lifecycle/watching. `IR-005` is backend composition wiring and has no rendered-frontend delta, so a new frontend render check is `Not Applicable`. API-REV-003 independently exercised Studio entry/remount and the Brief action up to the allocator failure; successful business output, Socratic, transient error/loading screens, and keyboard/focus traversal remain unverified. This is implementation self-validation, not API/E2E sign-off.

## Downstream Coverage Hints / Suggested Scenarios

- Update or replace the two stale REST tests against explicit Studio/standalone compositions; verify long canonical application IDs and execution-resource configuration routes through the current injected graph.
- Prove two independent composition graphs do not share availability, gateway, engine, storage, run lookup, notification, WebSocket, or orchestration state.
- Add the direct non-fake application allocator regression required by `CRR-007`: construct the application run-authority graph, assert the exact package definition/run/metadata collaborators, and allocate a package-owned member without singleton substitution.
- Rerun `APIE2E-BRIEF-002` first against `IR-005`; require binding and team-run IDs, provider invocation, successful completion, and published artifact output from the real package-owned Brief team.
- Run the remaining `dev`, `dev:studio`, `build`, `validate`, and build-free `start` matrix from the starter, Brief, and Socratic roots; mutate current source inputs, `application.json`, and `autobyteus-app.config.mjs` mappings/port/output root and verify subscription replacement, current selection, atomic rebuild/restart, standalone full document reload, Studio explicit remount, and cleanup.
- Hash the generated package before Studio and standalone runs and after shutdown; require an unchanged package and identical relevant entry/backend digests.
- After the focused Studio rerun passes, execute the real Brief team through `context.agentExecution` in standalone with the same resource/launch profile and assert event/artifact/notification equivalence.
- Exercise missing/ambiguous/invalid selection; invalid runtime/tool/skill/resource setup; worker crash followed by supported ensure-ready/recovery; pending event/binding recovery.
- Probe traversal, symlink escape, malformed encoding, content types, cache behavior, API-style 404 versus HTML navigation fallback, reserved namespace, visible-host/TLS bootstrap normalization, and WebSocket origin/Host matching.
- Verify event-pipeline, vault, Prisma, workers, notification sockets, custom WebSockets, streaming subscriptions, and listeners are released across repeated starts/stops and signal termination.
- Independently render Studio and standalone surfaces, including loading/failure/dispose/reload/exit and responsive/accessibility states.

## API / E2E / Executable Coverage Investigation And Execution Still Required

The API/E2E engineer must investigate existing coverage validity, own durable test changes, execute broader repository and real dual-host scenarios, score confidence, and report residual risks. The local checks above do not constitute API/E2E sign-off.
