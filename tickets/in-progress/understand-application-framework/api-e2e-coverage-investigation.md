# API/E2E Coverage Investigation — Application Backend Context Capability Naming Refactor

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/understand-application-framework/tickets/in-progress/understand-application-framework/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/understand-application-framework/tickets/in-progress/understand-application-framework/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/understand-application-framework/tickets/in-progress/understand-application-framework/design-spec.md`
- Supplemental Task Artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/understand-application-framework/tickets/in-progress/understand-application-framework/application-context-api-contract.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/understand-application-framework/tickets/in-progress/understand-application-framework/framework-understanding.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/understand-application-framework/tickets/in-progress/understand-application-framework/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/understand-application-framework/tickets/in-progress/understand-application-framework/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/understand-application-framework/tickets/in-progress/understand-application-framework/code-review-report.md`
- Current Investigation Round: `2`
- Trigger: Implementation-source review round 4 passed the bounded `CR-002` documentation fix at `ef1e083678e8966c5a30936000442d679dd14191`; API/E2E must recheck the prior `INV-001` / `AC-005` failure and proportionate regressions.
- Prior Investigation Reviewed: `1`
- Latest Authoritative Investigation: `2` (prior coverage decisions remain valid; updated with failure resolution and round-2 evidence)

## Current Requirement And Design Basis

The approved scope is one forward-only v3 application-backend contract and one canonical launch-request-named fresh schema. Validation must prove:

1. a v3 worker receives only `agentExecution`, `agentResources`, and `publishedArtifacts`, with both explicit start methods routed through the real worker/engine-host reverse-call boundary;
2. shared execution operations, resource resolution/configuration, artifact list/read, launch-request lookup, initial/later input data, targeting, termination, scoping, and error behavior remain intact;
3. interrupted application/platform handoff recovery attaches the existing binding by `launchRequestId` without a duplicate launch;
4. v2 is rejected before handler execution while current v3 source/generated built-in packages load;
5. isolated fresh platform and built-in app storage contains only canonical launch-request schema, current binding/event JSON, and platform schema metadata version `1`, without a transition path;
6. existing REST, mounted-route, app-owned GraphQL, notifications, lifecycle/event dispatch, and WebSocket behavior remains unchanged; and
7. active product source, generated output, templates, baseline SQL, and current docs contain no removed public/current tokens, and prohibited migration/version/checkpoint work is absent.

The approved persisted-data outcome is `Discard or Rebuild`. Old pre-release application databases are deliberately not exercised as supported input. All database execution must use isolated temporary roots.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `BEH-001` / handler context | Changed | `REQ-001`, `REQ-005`; `AC-001`, `AC-005`; `DS-001`, `DS-004` | Compile public contract and execute a v3 handler that uses all three capabilities. |
| `BEH-002` / explicit agent and team starts | Changed, semantics preserved | `REQ-002`, `REQ-006`; `AC-002`, `AC-006`, `AC-007`; code-review `CR-001` resolution | Retain the six-case authoritative launch-kind suite and add direct actual-worker/host traversal for both valid starts plus shared operations. |
| `BEH-003` / resource capability | Changed, semantics preserved | `REQ-003`, `REQ-006`; `AC-003`, `AC-006` | Execute list/configured operations through worker/host; retain focused resolver/configuration tests. |
| `BEH-004` / artifact capability | Changed, semantics preserved | `REQ-004`, `REQ-006`; `AC-004`, `AC-006` | Execute list/revision through worker/host for an application-owned binding; retain member-memory relay coverage. |
| `BEH-005` / `launchRequestId` and recovery | Changed, semantics preserved | `REQ-007`; `AC-002`, `AC-005`, `AC-007`, `AC-008`; `DS-002`, `DS-005` | Prove persistence, lookup, app scope, nullable behavior, current event JSON, and both built-in recovery paths. |
| `BEH-006` / v3 and forward schema cutover | Changed | `REQ-008`, `REQ-009`; `AC-009`, `AC-011`; `DS-003` | Prove fresh platform/app schemas, repeated current preparation, v3 package loading, v2 early rejection, generated-output consistency, and no prohibited migration/version path. |
| `BEH-007` / external and streaming boundary | Preserved / no addition | `REQ-010`; `AC-010` | Run existing REST/GraphQL/WebSocket regression coverage; confirm no new streaming/transport code. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Explicit start-kind admission, launch correlation naming, built-in correlation services | Focused launch, host, built-in business-service tests | Combined current-capability traversal through the child worker is not yet durable | Worker/process integration |
| API / transport / contract | Yes | Public backend TypeScript contract and worker/host reverse JSON-RPC protocol; external routes intentionally unchanged | Contract/devkit tests, engine-host tests, application REST/WS integration | Existing tests do not call every renamed capability through the worker bridge | Worker/process integration plus existing live-loopback HTTP/WS |
| Frontend component / state | No | No frontend/UI source behavior changed | Existing mounted transport and packaged generated client integration | None material for this backend-only refactor | None |
| Browser integration / user journey | No | No browser-dependent state or API changed | External boundary is exercisable without a browser | Browser execution would not add direct evidence for the changed backend/worker boundary | None |
| Authentication / session / permissions | No | Application scoping is preserved, not redesigned | REST app-scope and orchestration ownership tests | No new identity mechanism exists | Existing API integration |
| Desktop renderer / web-equivalent UI | No | No renderer change | N/A | N/A | None |
| Desktop shell / Electron-specific integration | No | No shell/preload/IPC change | N/A | N/A | None |
| Process / lifecycle | Yes | v3 definition admission, worker context construction, reverse calls, lifecycle current binding JSON | Engine-host child-worker tests and event dispatch tests | All renamed operations have not yet been exercised in one child-worker session | Worker/process integration |
| Persisted-data transition | Yes | Canonical DDL/baseline SQL edited directly; supported result is fresh rebuild | Storage tests, built-in migration replay, Brief imported-package integration | Exact no-old-column/index/current-JSON/schema-version matrix needs explicit assertions | Fresh temporary SQLite execution |
| Worker / queue / distributed coordination | Yes | Worker/host reverse JSON-RPC and durable execution event journal | Engine host/worker plus journal/dispatch unit tests | Valid starts/resources/artifacts/shared operations across the actual process boundary remain partially indirect | Worker/process integration |
| External integration | Preserved | HTTP, mounted route, app GraphQL, notification WebSocket are unchanged | Three application-backend integration files use real loopback Fastify/WS and child worker | No material browser or third-party dependency gap | Existing live-loopback integration |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/understand-application-framework`
- Project type and runtime stack: pnpm `10.28.2` TypeScript monorepo; Node.js `v22.23.1`; Fastify REST/GraphQL/WebSocket server; child-process application worker over JSON-RPC; SQLite (`node:sqlite`) for application platform/app state; Vitest `4.0.18` and Node test runner.
- Conflicting, missing, or unclear project instructions: Server `AGENTS.md` correctly requires `vitest run --no-watch`; `package.json` `test` defaults to watch mode and will not be used directly. Root/server README describes a live server, but no browser/UI startup is needed because the changed and preserved boundaries are directly covered by worker and loopback network integration. Known repository `pnpm typecheck` TS6059 is upstream-recorded; use `tsconfig.build.json`.
- Required environment variables or secrets available: `N/A` — selected coverage uses isolated SQLite, fake deterministic runtime services at the LLM boundary, and loopback HTTP/WS; no provider secret or external account is required.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/understand-application-framework/autobyteus-server-ts/AGENTS.md` | Closest test instruction | Use `pnpm -C autobyteus-server-ts exec vitest run ... --no-watch`; integration directory is a supported target. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/understand-application-framework/autobyteus-server-ts/README.md` | Server development/runtime | Node 18+; `pnpm install`; build before live start; `--data-dir` isolates server state; `AUTOBYTEUS_SERVER_HOST` is required for full server startup. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/understand-application-framework/autobyteus-server-ts/package.json` | Authoritative scripts | `prepare:shared`; Prisma generation; `build:full`; Vitest. Build-specific compile is `tsc -p tsconfig.build.json`. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/understand-application-framework/autobyteus-server-ts/vitest.config.ts` and `tests/setup/prisma-{env,global-setup}.ts` | Test runner/environment | Node environment, forks, no file parallelism, test SQLite reset through Prisma global setup. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/understand-application-framework/pnpm-workspace.yaml` and affected package manifests | Workspace package execution | Use package filters for contracts, backend SDK, devkit, and built-in builds/typechecks. |
| Built-in `applications/*/scripts/build-package.mjs` and package scripts | Generated package authority | Rebuild through scripts; do not hand-edit checked-in backend/importable-package output. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Workspace dependencies | worktree root | Already provisioned upstream with `pnpm install --frozen-lockfile`; verify `pnpm --version` and package availability | Worktree-local `node_modules` | Package commands resolve | No cleanup; existing assigned dependency state |
| Prisma test database | `autobyteus-server-ts` | Automatic Vitest global setup (`prisma migrate reset --force --skip-generate`) | Test DB path from `tests/setup/prisma-test-config.ts`; not production | Vitest setup succeeds | Test runner owns/reset state |
| Application child worker | Created by integration test through `ApplicationEngineHostService` | Test invokes `ensureApplicationEngine`/handler; supervisor launches worker | Temporary application root and logs | Engine status `ready`; handler result returned | `stopApplicationEngine` in `afterEach` |
| Loopback Fastify REST/GraphQL/WS | Integration test process | Existing tests bind `127.0.0.1` port `0` | Ephemeral port; no shared service | HTTP status and WS connected message | `app.close()` and socket close in `afterEach` |
| Fresh application storage | Temporary root created by each test | `ApplicationStorageLifecycleService` and baseline replay | Per-test `platform.sqlite`/`app.sqlite`; no user data | Schema and operation assertions | Recursive removal of only the created temp root |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| v3 backend fixture | Runtime-written `entry.mjs` plus `ApplicationBundle` fixture | Located under per-test temporary root | Delete with temp root |
| Agent/team resources and runs | Deterministic fake leaf runtime/definition services behind real launch/orchestration/worker boundaries | No LLM/network calls; fakes stop at external runtime creation while real launch/store/protocol paths execute | In-memory only |
| Current platform storage | Real `ApplicationStorageLifecycleService`, `ApplicationPlatformStateStore`, binding store, and journal store | Fresh isolated root only | Delete with temp root |
| Built-in app schema | Existing Brief/Socratic baseline SQL via current lifecycle or focused fresh replay | Fresh empty SQLite only; no old-state migration test | Delete with temp root |
| External transport fixture | Existing Fastify/WS integration tests | Loopback ephemeral ports and temporary state | Existing `afterEach` cleanup |

## Persisted Data Transition Coverage Basis

- Approved decision: `Discard or Rebuild`.
- Design-spec and implementation-handoff references: `design-spec.md` sections “Persisted Data / State Transition Decision,” “Fresh-Storage Cutover Plan,” and “Focused Fresh-Storage Test Matrix”; `implementation-handoff.md` “Persisted Data Transition Check.”
- Representative existing-data setup and required behavior: No old database is supported. Start from empty isolated roots; create current platform/app state; repeat current preparation to prove stable generic startup.
- Evidence planned for the approved discard/rebuild outcome: exact platform binding/journal columns and JSON, launch-request lookup, unique index, schema metadata `1`; exact Brief/Socratic pending tables/columns; built-in launch/finalize/reconcile scenarios; inventory proving no transition implementation.
- Migration-specific completion/recovery scenarios: `N/A` — migration is prohibited for this ticket.
- Upstream ambiguity or reroute required: `No`.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-application-sdk-contracts/tests/application-iframe-contract.test.mjs` plus contract build | Public declarations compile and existing frontend/iframe contract is unchanged | `AC-001`, `AC-010` | Still Valid | Contract source contains exact v3 capability shape; upstream check passed | Rerun package test. |
| `autobyteus-application-devkit/tests/application-devkit.test.mjs` v3 pack and explicit v2 fixture | Current template/package validates; v2 manifest reports actionable rejection | `AC-005`, `AC-009` | Still Valid | Explicit v2 is rejection-only, permitted by requirements | Rerun. |
| `tests/unit/application-bundles/file-application-bundle-provider.test.ts` v2 discovery rejection/current bundle discovery | Bundle discovery rejects backend compatibility v2 and accepts current v3 | `AC-009` | Still Valid | Assertion matches clean-cut rules | Rerun. |
| `tests/unit/application-engine/application-engine-host-service.test.ts` child-worker handlers and v2 pre-handler rejection | Actual worker loads v3, invokes handlers/events/artifacts; v2 fails before `onStart` | `AC-009`, `DS-004`, `DS-005` | Still Valid | Direct child-process boundary, not a mocked worker | Rerun; supplement missing capability matrix. |
| `tests/unit/application-orchestration/application-run-binding-launch-service.test.ts` six explicit-start cases | Valid agent/team route correctly; opposite payload and resolved kinds reject before side effects | `AC-002`, `AC-006`; code-review `CR-001` | Still Valid | Exact approved runtime invariant at authoritative launch owner | Rerun unchanged. |
| `tests/unit/application-orchestration/application-orchestration-host-service.test.ts` start timing, recovery lookup, artifacts, member paths, input targeting/error | Shared orchestration behavior and renamed methods remain intact | `AC-002`..`AC-004`, `AC-006`, `AC-007` | Still Valid | Assertions preserve current semantics and removed target-name behavior | Rerun unchanged. |
| Resource configuration/resolver/stale-state unit suites | Availability, filters, persisted/default slots, stale topology, validation failures | `AC-003`, `AC-006` | Still Valid | Behavior is explicitly preserved | Run affected resource suites unchanged. |
| Artifact relay/projection/application-backend artifact unit suites | Application ownership, member/nested memory paths, reconciliation, revision reads | `AC-004`, `AC-006` | Still Valid | Behavior is explicitly preserved | Run unchanged. |
| `tests/unit/application-backend/app-owned-launch-request-correlation.test.ts` | Fresh Brief/Socratic baseline replay; pending launch recovery; early lifecycle/artifact reconciliation; launch profiles | `AC-008`, `AC-011`, `DS-002`, `DS-005` | Still Valid | Uses current baseline SQL and current app services; no compatibility assertion | Rerun; add separate exact schema matrix rather than enlarge this 1,000+ line behavior suite. |
| `tests/unit/application-storage/application-storage-lifecycle-service.test.ts` | Fresh app/platform creation, repeated preparation/repair, forbidden SQL | `AC-011` | Still Valid | Exercises generic lifecycle without ticket-specific transition logic | Rerun unchanged. |
| `tests/integration/application-backend/brief-studio-imported-package.integration.test.ts` | Real generated package discovery, app-owned GraphQL, real worker/host, team launch with fake LLM/runtime boundary, events, artifacts, REST/WS, current pending row | `AC-002`, `AC-004`, `AC-006`, `AC-008`, `AC-010`, `AC-011` | Still Valid | High-realism generated-package and loopback network evidence; fake only at external runtime execution | Rerun unchanged. |
| `tests/integration/application-backend/application-backend-rest-ws.integration.test.ts` | Child worker through REST; query/command/route/GraphQL; backend notification WS; app scoping | `AC-006`, `AC-010` | Still Valid | Direct loopback HTTP/WS and worker evidence | Rerun unchanged. |
| `tests/integration/application-backend/application-backend-mount-route-transport.integration.test.ts` | Frontend SDK mount transport round-trip to backend route | `AC-010` | Still Valid | External contract unchanged | Rerun unchanged. |
| `tests/integration/application-backend/brief-studio-team-config.integration.test.ts` | Source and generated team/package consistency | `AC-005`, `AC-011` | Still Valid | Generated source is product output | Rerun unchanged. |
| Remaining changed gateway/GraphQL/event dispatch/recovery/package/storage tests listed in implementation diff | Renamed v3 fixtures and current `launchRequestId` values retain prior behavior | `AC-005`, `AC-006`, `AC-010` | Still Valid | Diffs are mechanical current-contract updates; code review found no stale assertions | Run as broader affected application suites. |

## Stale Or Obsolete Coverage Decisions

No existing durable scenario should be removed. Old v2 literals are retained only in explicit rejection fixtures and assert the approved failure mode, not compatibility behavior. Old public/current terminology was renamed within still-valid behavior tests rather than protected.

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| `CTX-E2E-001` | One real child worker uses resource list/configuration, both explicit starts, initial and later inputs, get/list/find, artifact list/read, and termination across the real engine-host reverse-call boundary and real binding persistence | `REQ-001`..`REQ-007`; `AC-001`..`AC-004`, `AC-006`, `AC-007`; `DS-001`, `DS-002`, `DS-004` | `autobyteus-server-ts/tests/integration/application-backend/application-context-capabilities.integration.test.ts` | Existing tests split these operations across mocked worker or host surfaces and do not directly prove all renamed capabilities traverse actual worker IPC. |
| `STORAGE-E2E-001` | Fresh platform binding/journal schema contains `launch_request_id`, no old correlation column, current JSON, unique lookup, and schema metadata remains `1`; repeat preparation stays stable | `REQ-007`, `REQ-009`; `AC-005`, `AC-008`, `AC-011`; `DS-003`, `DS-005` | Same focused integration file | Exact fresh-storage matrix is a critical acceptance criterion and current tests do not assert the complete physical schema/current JSON. |
| `STORAGE-E2E-002` | Fresh Brief and Socratic baseline replay exposes only `pending_launch_requests` / `launch_request_id` at the renamed correlation locations | `REQ-009`; `AC-005`, `AC-011`; `DS-003` | Same focused integration file | Existing behavior tests exercise these tables but do not explicitly assert absence of the replaced table/column names across both apps. |
| `RECOVERY-E2E-001` | A handler persists pending app state, suffers a simulated post-platform-persist launch response failure, finds the existing team binding by `launchRequestId`, and commits that binding to the business object without a second launch | `REQ-007`; `AC-008`; `DS-002`, `DS-004` | Same focused integration file | Initial execution review showed that existing app-service and real-worker lookup evidence were direct in isolation but not one combined interrupted-handoff journey; this addition closes that critical directness gap. |

## Durable Coverage To Update

None planned. Existing changed tests remain valid as written.

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm --filter @autobyteus/application-sdk-contracts test` | Worktree root | Public contract build/test | Pass — 4 tests | `tickets/in-progress/understand-application-framework/evidence/03-contract-devkit.log` |
| 2 | `pnpm --filter @autobyteus/application-devkit test` | Worktree root | Template/package v3 and explicit v2 rejection | Pass — 13 tests | `tickets/in-progress/understand-application-framework/evidence/03-contract-devkit.log` |
| 3 | Focused Vitest run for the new integration plus launch-service, engine-host, orchestration-host, app-owned correlation, bundle provider, and storage lifecycle; final current new-file rerun after recovery strengthening; same seven-file matrix rerun after `CR-002` | Worktree root, server Vitest `run --no-watch` | New scenarios and closest regression owners | Pass — round 1: 7 files / 52 tests and final current new file 1 file / 2 tests; round 2 authoritative rerun after documented server build: 7 files / 52 tests | `evidence/02-focused-boundaries.log`; `evidence/01-context-capabilities.log`; `evidence/11-round2-focused-boundaries.log`; `evidence/11b-round2-server-build.log` |
| 4 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/application-backend-gateway tests/unit/application-backend tests/unit/application-bundles tests/unit/application-capability tests/unit/application-engine tests/unit/application-orchestration tests/unit/application-packages tests/unit/application-storage tests/integration/application-backend --no-watch` | Worktree root | Broader affected application unit/integration suite, including real loopback REST/GraphQL/WS and generated Brief package | Pass — final rerun 29 files / 127 tests. One prior rerun observed a non-reproducing existing Brief lifecycle-projection polling timeout; the exact file then passed three consecutive runs before the full-suite pass. | `evidence/04-affected-application-suites.log`; `evidence/04a-brief-studio-failure-reproduction.log` |
| 5 | Backend SDK build; both built-in backend typechecks/builds; generated-output `git diff --exit-code` | Worktree root | Source/generated v3 consistency | Pass; regenerated output remained byte-clean against tracked state | `evidence/05-built-in-builds.log`; `evidence/06-generated-output-diff.log` |
| 6 | `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` and `pnpm -C autobyteus-server-ts run build:full` | Worktree root/server | Compile/build and built-in bootstrap | Pass | `evidence/07-server-build.log` |
| 7 | Final old-token, generated-output, schema-version, migration/checkpoint, manifest, production-diff, and diff-hygiene inventories; round-2 prior-failure recheck first | Worktree root | Clean-cut acceptance and prohibited path absence | **Pass** — the three round-1 current-doc failures are resolved; broader active/current/generated inventories are clean; v2 remains rejection-only; manifests are v3; schema metadata remains `1`; prohibited migration/checkpoint work is absent; diff hygiene passes. | `evidence/10-round2-prior-failure-recheck.log`; authoritative `evidence/08-final-inventories.log` |

## Post-Repository Confidence Scorecard

This scorecard records the gate after contract/devkit checks, the new direct worker/fresh-storage/recovery integration, and the closest seven-file focused server run, before the 29-file affected-suite, generated-package rebuild, full server build, and final inventories were counted as broader validation.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 93% | Direct public contract, v2 rejection, both starts, named operations, current schemas, and combined interrupted-handoff recovery passed | Broader external-boundary and generated-package regressions were not yet counted at this gate | Run the affected application integration/build/inventory matrix. |
| Changed-boundary execution directness | 98% | The actual child worker and engine-host reverse JSON-RPC executed every named capability, real launch/store owners, and recovery lookup | Leaf agent/team runtime creation is deterministic rather than a live LLM run | No live LLM execution is needed for this contract/process refactor. |
| Cross-boundary integration realism and mock gap | 90% | Real child process, real orchestration/SQLite, and real error propagation executed | The broader loopback REST/GraphQL/WS and generated Brief package matrix remained to run | Execute the affected integration directory. |
| Environment, configuration, identity, and fixture fidelity | 95% | Node 22, real SQLite, actual storage lifecycle, application-scoped engine identity, and fresh temp roots | Full built-in package rebuild/server build had not yet been counted | Rebuild and run broader package/server checks. |
| Failure, edge-case, lifecycle, and recovery evidence | 94% | Wrong payload/resource kind, early v2 failure, nullable get/find, post-persist recovery, lifecycle persistence, and built-in correlation suites passed | Broader event/transport regression remained to run | Run the affected application suites. |
| User-surface, browser, and desktop-shell confidence | N/A | No frontend/rendered/browser/shell behavior changed; preserved external HTTP/WS is tested directly | None material | Browser/desktop would not improve changed-boundary evidence. |
| Durable regression coverage quality and relevance | 96% | Existing tests remained valid and one requirement-linked integration file adds the exact missing worker/recovery/fresh-schema matrix | Proportional test-code review remains downstream | Request proportional review after final pass. |

- Overall post-repository confidence: `94.3%`
- Calculation method: Simple average of applicable categories; browser/desktop category is `N/A` for this backend-only change.
- Every critical acceptance criterion directly proven: `Yes` at the focused boundary level; broader preserved-boundary regression remained outstanding at this gate.
- Any applicable category below `90%`: `No`.
- Default clean-confidence target of `95%` met: `No` — overall was `94.3%`.
- Material residual risks: The preserved external HTTP/GraphQL/WebSocket paths and regenerated built-in packages had not yet been re-executed in the broadened matrix.

## Broader Validation Decision

- Decision: `Required`
- Selected execution mode: `Worker or Distributed` plus `Live API` (loopback integration) and `Lifecycle` (fresh SQLite/journal)
- Specific confidence gap or residual risk addressed: Cross-process capability routing, both start subjects, current-only fresh schemas/JSON, generated built-in package operation, and external HTTP/GraphQL/WebSocket preservation.
- Why the selected mode can materially improve confidence: It directly executes the changed JSON-RPC boundary and persistence definitions rather than relying on mocks or static compilation, while existing network integration uses real Fastify/WS and the child worker.
- Expected confidence after selected validation: At least `95%`, with no applicable category below `90%`, if all critical scenarios pass and inventories are clean.
- Browser-specific decision and rationale: Browser execution is not required. No UI/renderer/browser API changed; the preserved frontend mount transport and external network contract are exercised more directly and deterministically through repository integration clients.
- If `Not Required`: `N/A`
- If `Blocked`: `N/A`
- Execution disposition: Completed as planned. Round 1 established the full worker/API/lifecycle/build matrix but failed `INV-001` / `AC-005`. Round 2 rechecked that failure first at `ef1e083678e8966c5a30936000442d679dd14191`, confirmed the three stale doc references are gone, reran the seven-file focused boundary matrix (52/52 tests) after the documented server build prerequisite, and completed the comprehensive inventory with `Pass`. The authoritative result is recorded in `api-e2e-execution-coverage-report.md`.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron exists elsewhere in the repository, but no renderer, preload, IPC, window, package, or shell lifecycle file is in this ticket.
- Relevant README or development instructions: Server `README.md` and root README; no desktop path is relevant to the changed boundary.
- Web-equivalent behavior: Application backend REST/GraphQL/mounted routes and notification WebSocket.
- Shell-specific or lifecycle behavior: None in scope.
- Chosen validation approach and why it fits the project: Node child-worker integration plus loopback Fastify/WS; more direct than browser/desktop for backend capability routing.
- Effect on any already-running desktop application: `None`.
- Behavior not directly proven and confidence consequence: No Electron-shell behavior will be claimed or scored as applicable.

## Live Environment And Fixture Plan

- Startup order and commands: Vitest global Prisma setup; per-test temp application/data roots; real application child worker; existing tests start Fastify on `127.0.0.1:0`; invoke worker/HTTP/GraphQL/WS scenarios; stop worker/server/socket; delete only owned temp roots.
- Environment choices that materially affect the run: Node `v22.23.1`; `node:sqlite`; no provider credentials; fake runtime creation only below the real orchestration launch owner to avoid nondeterministic LLM work.
- Health / readiness checks: Engine status `ready`; loopback HTTP status; WS `connected`; SQLite schema/query assertions.
- Seed data / fixtures: Runtime-written v3 backend; deterministic agent/team definitions and run IDs; existing generated Brief package; existing baseline SQL.
- Test identities, authentication, permissions, or session state: Application identity comes from engine/route scope; no auth feature changed.
- Requirement-linked journeys or scenarios: `CTX-E2E-001`, `STORAGE-E2E-001`, `STORAGE-E2E-002`, existing v2 rejection, imported Brief journey, external REST/GraphQL/WS regression.
- Evidence to capture: Test logs, exact commands/results, SQLite physical schema and JSON assertions, inventory log, generated-output diff, cleanup status.
- Owned processes and temporary state to clean up: Child workers, Fastify listeners, WS clients, per-test temp directories; Vitest-managed test DB only through its setup.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `INV-001` | Final scoped `rg`/`git diff` inventory retained as `evidence/08-final-inventories.log`; exact prior-failure recheck retained as `evidence/10-round2-prior-failure-recheck.log` | **Pass in round 2** — no removed terminology remains in the two previously failing current docs or the broader active/current/generated scope; v2 is rejection-only; all current manifests are v3; prohibited migration/version/checkpoint work is absent. | Repository-history allowlists and generated-product scope are ticket-specific; a shell inventory is clearer than a brittle permanent grep test. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Old pre-release database upgrade/rejection/reset | Explicitly outside the product contract; approved outcome is `Discard or Rebuild` and product code must add no path | None within approved scope | Do not add coverage or runtime behavior. |
| Live LLM execution | The change is above provider/runtime behavior; deterministic fake leaf runtimes allow direct launch/store/worker proof without external nondeterminism | Negligible for naming/protocol/schema refactor | Existing runtime suites cover provider behavior independently. |
| Browser/Desktop | No applicable changed surface | None material | No follow-up. |
| Application-scoped runtime output streaming | Explicitly deferred by `REQ-010` | Known absent capability, not a defect in this ticket | Separate future feature. |

## Ambiguities Or Reroute Triggers

No requirement or design ambiguity was found. Round 1 exposed a bounded implementation-owned documentation mismatch and routed it through focused failure-origin review. `CR-002` corrected the three references in commit `ef1e083678e8966c5a30936000442d679dd14191`; round-2 exact and broader inventories pass. No reroute trigger remains.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` — add one focused integration file covering four requirement-linked scenarios; no updates/removals.
- Post-repository confidence: `94.3%`
- Broader validation decision: `Required`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `N/A`
- Notes: Existing tests remained valid. The added focused integration closes the real worker-capability, exact fresh-schema, and combined interrupted-handoff gaps without introducing browser, desktop, old-storage, or live-LLM scope. Round-2 `INV-001` and focused regressions pass, so the overall API/E2E result is `Pass` and the package proceeds to proportional review of the added durable test.
