# API/E2E Coverage Investigation

- Task: Universal Application Dual-Host Architecture
- Current API/E2E revision: `API-REV-012`
- Current reviewed implementation: `IR-018`
- Source-review gate: `CRR-033` Pass
- Reviewed HEAD: `4266ec7ebd60fbf06981159d6e1f7b0c9e6f6ca5`
- Investigation status: Complete
- Execution outcome: Pass
- Final confidence: `97%` (`96.6%` unrounded)

## Investigation Meta

- Trigger: `code_reviewer` requested the full SR-013 executable matrix after IR-018 resolved `CR-022`.
- Primary behavior basis: `REQ-010`, `AC-019`–`AC-023`, `UC-025`–`UC-027`, plus preserved dual-host behavior in `AC-001`, `AC-003`, `AC-005`, `AC-006`, `AC-009`, `AC-010`, `AC-011`, `AC-014`–`AC-018`.
- Supplemental architecture basis: `application-framework-architecture-simplification.md`.
- Prior authoritative API/E2E result: `API-REV-011`, Pass / 99%.
- Historical `APIE2E-REPO-005`: remains separate and unattributed. This round neither broadens nor reclassifies it.

## Current Requirement And Design Basis

SR-013 requires behavior-neutral structural simplification while preserving the previously passed Studio and standalone behavior. The directly executable requirements are:

1. Four exact outward runtime projections and current routes remain valid (`AC-019`).
2. Package state, commands, and reconciliation retain their current behavior (`AC-020`).
3. Removed bind-once and broad-host types do not remain in current test fixtures, and the acyclic runtime creates no runs during construction (`AC-021`).
4. A provider run can publish after its application worker exits; delivery must ensure/restart the worker before handler invocation and preserve projection (`AC-022`).
5. Exact run removal attempts all session/file/artifact/memory cleanup once, continues across failures, does not delete a replacement, and shutdown/restart remains correct (`AC-023`).
6. Both real hosts continue to execute the package-owned Brief team, authenticated Agent Tools publication, recipient-name handoff, application projection, remount/restart, and byte-identical package behavior.

The implementation handoff continues to declare a clean legacy removal and `Directly Usable — No Migration`; no migration or compatibility branch is required.

## Changed Behavior Summary

Production behavior is intended to be unchanged. IR-018 changes exact run cleanup continuation after inactive-pruning errors. The API/E2E-specific repository problem was stale coverage: five requested integrations and six additional affected tests still constructed the deliberately removed `ApplicationEngineHostService` or older dependency shapes.

The durable test package now constructs the real narrow controller/launcher/gateway/runtime contracts and retains the original route, WebSocket, context, imported-package, availability, relay, session, Agent Tools, communication, and standalone assertions. No production source was changed by API/E2E.

## Changed Surface And Boundary Classification

| Surface | Classification | Required Evidence |
| --- | --- | --- |
| Active-run identity/resource cleanup | Agent lifecycle / failure aggregation | IR-018 focused tests, stop-all continuation, stale replacement, exact-once cleanup |
| Application engine ownership | Worker/controller/launcher process boundary | Narrow real test runtime; no broad host import; live worker-exit recovery |
| Artifact delivery | Queue / worker restart / application projection | Durable delivery/lifecycle tests and real post-worker-exit publication |
| Agent Tools | Authenticated internal MCP route and session lifecycle | Actual `publish_artifacts`, `send_message_to`, old-session rejection, 401/404 semantics |
| Studio | Browser/iframe/setup/remount boundary | Exact Brief team/Luna defaults, real run, one-iframe remount, projected state |
| Standalone | CLI/browser/same-origin host boundary | Real start, business run, active stop, same-data restart/recovery |
| Package integrity | Read-only dual-host package | Exact 73-path digest equality before/after live hosts |
| Maintained developer workflows | Build/validate/typecheck | Devkit and maintained Brief/Socratic command matrix |
| Persistence | Existing current readers, no migration | Same data root across standalone restart; app/platform SQLite recovery |

## Project Execution Discovery

Authoritative execution sources inspected:

- root `package.json` and `scripts/development/run-dev.mjs`
- `scripts/development/development-runtime.mjs`
- `autobyteus-application-devkit/package.json`
- `autobyteus-server-ts/package.json`
- `autobyteus-web/package.json` and `nuxt.config.ts`
- `applications/brief-studio/package.json`
- `applications/socratic-math-teacher/package.json`
- current test configuration and the prior API-REV-011 report/evidence

Execution constraints and choices:

- Node 22 / pnpm workspace commands are authoritative.
- The devkit must be built before an authoring folder consumes its linked `dist/cli.js`; the normal published-package user does not build the devkit separately.
- An unrelated user-owned Python listener already occupied port 8000 and was not stopped. Final Studio validation therefore used an isolated backend on 8010 and Nuxt on 3010 with all backend URL variables pointed at 8010.
- Standalone used 43126 and `/tmp/api-rev012-standalone-data`.
- Studio used `/tmp/api-rev012-studio-data2` with explicit data/database/log/memory/workspace environment values.
- System Chrome was driven through repository-available Playwright Core. No Electron shell-specific behavior changed, so an Electron launch was unnecessary.
- Two unrelated user-owned Codex app-server processes were preserved.

## Persisted Data Transition Coverage Basis (When Applicable)

- Approved decision: `Directly Usable — No Migration`.
- Standalone was stopped with three recorded attached team bindings, restarted with the same data root, restored the recorded team runs, displayed prior business records, and completed a fresh post-restart publication/handoff run.
- The old pre-restart Agent Tools session identifier returned `404 session_unavailable` after restart; session ID and credential were excluded from durable evidence.
- Studio remount reused current app/platform SQLite state and retained the completed Brief projection.
- No package bytes were mutated and no compatibility reader/migration was added.

## Existing Durable Coverage Inventory

| Coverage | Decision | Result |
| --- | --- | --- |
| IR-018 `agent-run-manager.test.ts`, registry/resource manager, shutdown coordinator, lifecycle | Still Valid | 5 files / 22 tests Pass |
| Application backend REST/custom WS/mount/context/imported Brief integrations | Needs Update, then Still Valid | Migrated to narrow runtime; final affected matrix Pass |
| Application backend WebSocket session unit | Needs Update, then Still Valid | Uses narrow gateway/session dependencies; Pass |
| Availability and published-artifact relay units | Needs Update, then Still Valid | Current state registry/reentry/delivery-queue contracts; Pass |
| Agent Tools MCP route integration | Needs Update, then Still Valid | Current `activeRunReader`; Pass |
| Agent communication WS integration | Needs Update, then Still Valid | Current `ApplicationAgentEventMapper`; Pass |
| Standalone server integration | Needs Update, then Still Valid | Current lifecycle/rest/realtime/hostManagement projections; Pass |
| Application delivery queue, event dispatcher, runtime isolation, route, publication and package tests in affected selection | Still Valid | 31 files / 116 tests Pass |
| Devkit atomic pack/watch/browser ownership tests | Still Valid | 20/20 Pass |

## Stale Or Obsolete Coverage Decisions

| Path Group | Obsolete Fixture Behavior | Current Replacement | Decision |
| --- | --- | --- | --- |
| Five requested application-backend integrations | Construct/import removed broad `ApplicationEngineHostService` | Shared real narrow controller/launcher/gateway test runtime | Replace fixture only; preserve behavior assertions |
| WebSocket session unit | Old broad host-shaped session dependency | Current gateway/session service dependencies | Update |
| Availability unit | Old host-owned availability/re-entry API | `ApplicationAvailabilityStateRegistry` and `ApplicationReentryService` | Update |
| Artifact relay unit | Old direct engine-host invocation | Exact delivery-queue acceptance command | Update |
| Agent Tools route integration | Ignored old manager option | Current `activeRunReader` | Update |
| Agent communication integration | Missing current event mapper | Supply real current mapper | Update |
| Standalone server integration | Old single runtime object | Exact four projections | Update |

No current-behavior assertion was removed, skipped, weakened, or replaced by a compatibility path.

## Durable Coverage To Add

| Artifact | Purpose | Status |
| --- | --- | --- |
| `autobyteus-server-ts/tests/integration/application-backend/application-engine-test-runtime.ts` | Reusable real narrow application engine controller/launcher/gateway test assembly | Added and passing |

## Durable Coverage To Update

1. `autobyteus-server-ts/tests/integration/application-backend/application-backend-custom-websocket.integration.test.ts`
2. `autobyteus-server-ts/tests/integration/application-backend/application-backend-mount-route-transport.integration.test.ts`
3. `autobyteus-server-ts/tests/integration/application-backend/application-backend-rest-ws.integration.test.ts`
4. `autobyteus-server-ts/tests/integration/application-backend/application-context-capabilities.integration.test.ts`
5. `autobyteus-server-ts/tests/integration/application-backend/brief-studio-imported-package.integration.test.ts`
6. `autobyteus-server-ts/tests/unit/application-backend-api-gateway/application-backend-websocket-session-service.test.ts`
7. `autobyteus-server-ts/tests/unit/application-orchestration/application-availability-service.test.ts`
8. `autobyteus-server-ts/tests/unit/application-orchestration/application-published-artifact-relay-service.test.ts`
9. `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts`
10. `autobyteus-server-ts/tests/integration/application-backend/application-agent-communication-ws.integration.test.ts`
11. `autobyteus-server-ts/tests/integration/application-backend/standalone-application-server.integration.test.ts`

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Executable Check | Result | Evidence |
| --- | --- | --- | --- |
| 1 | IR-018 manager/registry/resource/shutdown/lifecycle selection | 5 files / 22 tests Pass | `api-rev-012-ir018-first-gate.log` |
| 2 | Migrated requested fixtures and narrow WS session unit | 6 files / 15 tests Pass | `api-rev-012-migrated-fixtures-pass.log` |
| 3 | Updated availability and relay units | 2 files / 10 tests Pass | `api-rev-012-stale-narrow-unit-rerun.log` |
| 4 | Final affected server matrix | 31 files / 116 tests Pass | `api-rev-012-affected-server-matrix-pass.log` |
| 5 | Server build-config TypeScript no-emit | Pass | `api-rev-012-server-tsc.log` |
| 6 | Devkit full test/build | 20/20 Pass | `api-rev-012-build-maintained-app-matrix.log` |
| 7 | Server full build and frontend SDK build | Pass | `api-rev-012-build-maintained-app-matrix.log` |
| 8 | Brief and Socratic build, validate, backend typecheck | Pass for both maintained apps | `api-rev-012-build-maintained-app-matrix.log` |
| 9 | Retired broad-host scan and `git diff --check` | Pass | final repository audit |

The initial failures in `api-rev-012-stale-fixture-baseline.log`, `api-rev-012-stale-narrow-unit-baseline.log`, and the first affected selection were validated as stale test fixtures, not production regressions. Their corrected reruns pass.

## Post-Repository Confidence Scorecard (Mandatory)

| Category | Score | Basis | Repository-only Gap |
| --- | ---: | --- | --- |
| Requirement and acceptance-criteria proof | 94% | Exact IR-018 continuation plus affected route/runtime/lifecycle coverage | Real host worker-exit and dual-host publication still required |
| Changed-boundary execution directness | 96% | Real manager/registry/queue/controller/launcher contracts execute | Live provider/worker boundary not yet exercised |
| Cross-boundary integration realism and mock gap | 92% | Real SQLite/workers/routes in integrations | Provider/browser/remount still absent |
| Environment, configuration, identity, and fixture fidelity | 93% | Current package, current IDs, maintained builds | Real host config/identity still required |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | Cleanup aggregation, stale replacement, queue drain, lifecycle ordering | Live process exit/restart still required |
| User-surface/browser confidence | 90% | Existing frontend and build evidence | Round-12 browser journey required |
| Durable regression quality and relevance | 96% | Narrow shared runtime, preserved assertions, no broad-host imports | Proportional test-code review pending |

- Repository-only confidence: `94%` (`93.7%` unrounded).
- Broader validation: Required because AC-022's worker-exit witness, real Agent Tools dispatch, browser remount, process restart, and exact byte parity cannot be inferred from repository tests alone.

## Broader Validation Decision (Mandatory)

- Decision: `Required — completed`.
- Modes: CLI, live API, browser, process lifecycle, SQLite read-only correlation, exact digests.
- Expected evidence gain: close the worker-restart, authenticated tool dispatch, real dual-host, remount, restart, session revocation, package integrity, and leak-cleanup gaps.
- Outcome: all selected scenarios passed.

## Desktop Application Validation Decision (When Applicable)

The changed surface is web-equivalent. System Chrome exercised the real Nuxt Studio and standalone browser surfaces. No preload, IPC, native window, packaging, signing, or OS integration changed, so actual Electron execution would not add requirement-linked evidence.

## Live Environment And Fixture Plan (Required When Broader Validation Runs)

- Standalone: `pnpm -C applications/brief-studio start -- --port 43126 --data-dir /tmp/api-rev012-standalone-data`.
- Studio backend: built server on 127.0.0.1:8010 with isolated data and SQLite paths.
- Studio frontend: Nuxt on 127.0.0.1:3010 with all backend/WS endpoints on 8010.
- Studio package client: `pnpm -C applications/brief-studio dev:studio -- --studio-url http://127.0.0.1:8010`.
- Browser: installed Chrome through Playwright Core.
- Team/runtime/model: exact package-owned Brief Studio Team; researcher/writer; `codex_app_server`; `gpt-5.6-luna`.
- Data: fresh isolated roots; created only through public UI/host flows; inspected read-only with SQLite.
- Cleanup: owned services, browsers, workers, Codex child, data roots, and temporary harnesses removed; unrelated 8000 and Codex processes retained.

## Temporary Executable Validation Plan

| Scenario | Temporary Method | Why Not Durable |
| --- | --- | --- |
| `APIE2E-WORKER-012` | Browser request plus exact application-worker PID termination and replacement observation | OS/process timing and real provider are environment-sensitive; direct queue/launcher behavior is durable separately |
| `APIE2E-STANDALONE-012` | Real same-origin Browser/CLI journey, active multi-run stop, same-data restart | Full provider/browser/process orchestration is expensive and environment-sensitive |
| `APIE2E-STUDIO-012` | Real Studio setup/iframe/run/remount | Browser/provider/host orchestration is retained as evidence, while surface logic is durable elsewhere |
| `APIE2E-PARITY-012` | Exact pre/post SHA-256 comparison of 73 maintained paths | Cross-process byte parity is an execution conformance check |
| `APIE2E-CLEANUP-012` | Listener/PID/data-root audit | OS-specific |

All temporary scripts were removed after evidence capture.

## Not Tested / Infeasible / Deferred

| Boundary | Decision | Risk / Follow-up |
| --- | --- | --- |
| Historical whole-repository `APIE2E-REPO-005` | Not rerun or reattributed | Separate historical uncertainty; no supported connection to IR-018/SR-013 was found |
| Electron shell | Not applicable to changed behavior | Existing delivery-owned Electron evidence remains separate |
| Multi-node deployment/public authentication | Outside approved local-first scope | None for current acceptance criteria |

## Ambiguities Or Reroute Triggers

None. No implementation failure, requirement gap, design impact, blocker, or new supported origin for `APIE2E-REPO-005` was found.

## Investigation Decision

- Proceeded to execution: Yes.
- Durable coverage added/updated/removed: 1 helper added, 11 test files updated, 0 removed.
- Final result: `Pass`.
- Final confidence: `97%` (`96.6%`).
- Every critical acceptance criterion directly proven: Yes, through combined durable and real executable evidence.
- Any category below 90%: No.
- Clean target met: Yes.
- Recommended recipient: `code_reviewer` for the required proportional durable-test review.
