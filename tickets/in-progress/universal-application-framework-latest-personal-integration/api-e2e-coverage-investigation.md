# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/design-spec.md`
- Supplemental Task Artifacts: `integration-strategy-analysis.md`, `integration-runtime-contracts.md`, merge/conflict/overlap/path inventories
- Solution Revision Record: `solution-revision-record.md` (`SR-001`–`SR-004`)
- Design Review Report: `design-review-report.md`
- Architecture Review Revision Record: `architecture-review-revision-record.md` (`ARCH-REV-004` Pass)
- Implementation Handoff: `implementation-handoff.md`
- Implementation Revision Record: `implementation-revision-record.md` (`IR-007`)
- Code Review Report: `code-review-report.md`
- Code Review Revision Record: `code-review-revision-record.md` (`CRR-012` Pass / 94)
- Delivery Revision Record: `delivery-revision-record.md` (`DR-001` packaged Electron baseline relevant)
- API/E2E Revision Record: `api-e2e-revision-record.md` (`API-REV-001`–`API-REV-007`)
- Current API/E2E Revision ID: `API-REV-007` complete
- Current Investigation Round: `7`
- Trigger: `/code_reviewer` `CRR-012` Pass for newest-Personal semantic refresh `IR-007`
- Prior Investigation Reviewed: API-REV-006 Pass / 99%, API-REV-004 Pass / 98%, CRR-010/011 proportional dispositions, and delivery DR-004 refresh evidence
- Latest Authoritative Investigation: this document

## Current Requirement And Design Basis

The integrated candidate must preserve latest-Personal lifecycle, migration, provider/model, rooted identity, activation, publication and cleanup semantics while running the same maintained Brief and Socratic packages through explicit Studio and standalone hosts. `AC-001`–`AC-011` require clean merge/topology, native application commands, immutable build-once packages, package-owned Codex App Server/Luna defaults, one ordered required-tool owner, application-scoped Agent Tools, real recipient-name messaging/publication/projection, supported recovery/restart, current provider migration/model behavior, obsolete-path removal, integrated regressions, and downstream Electron verification.

IR-003 changes the existing-state execution-event journal reader from an accidental mutator to a genuinely read-only optional inspection. Absent initialized journal state must remain absent; retained pending work must dispatch during lifecycle restart/reentry; explicit append/write retains journal initialization authority. The approved persisted-data decision is `Directly Usable — No Migration` and forbids compatibility or repair paths.

## Changed Behavior Summary

| Behavior / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Exact application team-member input identity | Changed | IR-006 / CRR-009 / AC-005/008 | direct real-`RootTeamRun` identity cases plus the exact fresh Socratic browser journey required |
| Existing-state journal inspection | Changed | IR-003 / CR-003 / AC-008 | Direct actual-SQLite absent/existing byte-stability and pending dispatch recovery tests required |
| Standalone prerequisite phases 5–10 | Changed by IR-002, preserved by IR-003 | CR-001 resolution / AC-003/005/008/009 | Retained focused lifecycle plus real standalone start/restart required |
| Launch get/list read-only storage | Changed by IR-002, preserved by IR-003 | CR-002 resolution / AC-006/009 | Actual SQLite no-write tests and real Studio setup required |
| Dual-host package/runtime/tool behavior | Preserved from semantic integration | BEH-002–BEH-006 / AC-003–AC-011 | Full current real host and package parity validation required |
| Compatibility/migration behavior | Removed/forbidden | REQ-006, DS-009, handoff | No legacy-only durable coverage; audit and direct-use proof required |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised | Broader Mode |
| --- | --- | --- | --- | --- | --- |
| Domain/backend logic | Yes | pending journal read and event dispatch | real SQLite unit/lifecycle tests | actual retained work across host processes | Lifecycle/API |
| API/transport/contract | Yes | application REST/GraphQL/WS, Agent Tools routes | integration and architecture tests | real bearer/session/tool dispatch | Live API/browser |
| Frontend component/state | Yes | Studio setup, sparse overrides, iframe | focused Nuxt tests | real setup/remount/provider state | Browser |
| Browser journey | Yes | Brief and Socratic UI in two hosts | repository component tests only | actual provider runs and projection | Browser |
| Authentication/session | Yes | scoped Agent Tools bearer/session lifecycle | route integration tests | actual descriptor/session dispatch/revocation | Live API/process |
| Desktop renderer/web-equivalent | Yes | application page/iframe behavior | Nuxt tests | real browser integration | Browser |
| Desktop shell/Electron | No for API/E2E ownership | downstream delivery gate | Electron suites/build scripts exist | shell/package integration | Deferred to delivery |
| Process/lifecycle | Yes | standalone/Studio start, stop, reentry | lifecycle/reentry unit tests | real same-data stop/restart and leak behavior | Process lifecycle |
| Persisted-data transition | Yes | direct-use current SQLite, no migration/repair | actual SQLite tests | process restart on retained data | Lifecycle/API |
| Worker/queue/coordination | Yes | application worker, journal, publication relay | focused unit/integration tests | worker exit and retained dispatch | Worker/process |
| External integration | Yes | real Codex/Luna provider path | environment-gated tests | actual provider/team/tool behavior | Real provider |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration`
- Stack: pnpm monorepo, Node 22, TypeScript/Vitest, Fastify/GraphQL/WebSockets/SQLite, Nuxt/Vue, application devkit, Playwright Core/installed Chrome.
- Conflicting instructions: none. Server `AGENTS.md` requires `vitest run --no-watch`; web guide requires `--run`.
- Required provider credentials: available through the existing local environment/vault path; values will not be recorded.

| Instruction / Configuration | Authority / Purpose | Learned command or constraint |
| --- | --- | --- |
| `autobyteus-server-ts/AGENTS.md` | server tests | use `pnpm -C autobyteus-server-ts exec vitest run ... --no-watch` |
| `autobyteus-web/AGENTS.md` | web tests/build | use `pnpm test:nuxt ... --run`; Electron belongs downstream |
| root/server/web/package manifests | canonical scripts | build/typecheck/test and real application commands |
| maintained application manifests | app developer journey | `dev`, `dev:studio`, `build`, `validate`, `start`, `typecheck:backend` |
| implementation handoff | environment caveat | build products are generated; macOS watcher uses polling |

| Component | Working Directory | Start / Setup | Resource Notes | Readiness | Cleanup |
| --- | --- | --- | --- | --- | --- |
| Studio backend | repository root/server dist | isolated data root, unique port | unset inherited conflicting app-data/host variables | HTTP/GraphQL and logs | SIGINT; remove owned root |
| Nuxt frontend | `autobyteus-web` | `nuxi dev` with backend URL, unique port | browser web-equivalent | `/applications` loads | SIGINT |
| App Studio watcher | maintained app | `dev:studio -- --studio-url ...` | devkit must be built | package import/reload log | SIGINT |
| Standalone host | maintained app | `start -- --port ... --data-dir ...` | isolated app data | root 200 | SIGINT |
| Browser | repository Playwright Core | installed Chrome | headless semantic DOM + screenshots | page/iframe ready | close browser |

| Data / Identity Need | Creation Method | Safety | Cleanup |
| --- | --- | --- | --- |
| clean and retained platform SQLite | isolated `--data-dir` and supported APIs | no shared/user DB | remove owned temp roots |
| package-owned team/defaults | maintained bundle manifest | exact current identity | host stop |
| pending/reentry state | normal real publication/run and graceful/worker restart | no direct production data manipulation | same-root then remove |
| package integrity baseline | SHA-256 canonical source/package paths | read-only | retain evidence only |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`.
- References: DS-009; implementation handoff Persisted Data Transition Check; IR-002/IR-003.
- Representative data: absent platform DB, existing empty/current DB, retained event journal/publication/application state, same-root host restart.
- Planned evidence: direct actual-SQLite tests; launch read byte stability; actual real publication followed by graceful same-data restart/reentry; no read-time table/cursor/schema mutation; retained work drains and application returns ready/active.
- Migration-specific scenarios: N/A. Current Personal startup migrations/readable-provider gates remain normal prerequisite behavior and will be observed, not replaced by ticket migration.
- Upstream ambiguity: none.

## Existing Durable Coverage Inventory

| Path / Scenario | Intent | Related AC | Validity | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/application-orchestration/application-execution-event-journal-recovery.test.ts` | absent/existing journal byte stability; lifecycle/reentry dispatch | AC-008/009 | Still Valid | IR-003 + CRR-003 | run first |
| `tests/unit/application-orchestration/application-launch-override-store.test.ts` | get/list no-write; Save/Reset explicit mutations | AC-006/009 | Still Valid | IR-002 + CRR-003 | run focused |
| `tests/unit/application-storage/application-platform-state-store.test.ts` | read-only existing-state authority | AC-009 | Still Valid | IR-002 + CRR-003 | run focused |
| `tests/unit/standalone-application-host/standalone-application-host-lifecycle.test.ts` | prerequisite ordering, readiness, catalog, unwind | AC-003/005/008/009 | Still Valid | CRR-003 | run focused |
| `tests/architecture/application-framework-boundaries.test.ts` | removed seams and exact authority boundaries | AC-005/007/010/011 | Still Valid | 15/15 review pass | run current |
| application backend/Agent Tools integrations | route, WS, package, messaging, projection contracts | AC-004/007/008 | Still Valid | integrated source suite | run affected selection |
| application platform/run/lifecycle unit tests | graph isolation, run authority, stop/recovery | AC-005/008 | Still Valid | integrated source suite | run affected selection |
| devkit 20-test suite | command/watch/atomic package/browser behavior | AC-003/004/010 | Still Valid | implementation pass | run full |
| SDK contract/backend/frontend suites | serialized/transport/startup contract | AC-004/009 | Still Valid | implementation pass | run full |
| application launch/setup Nuxt tests | sparse defaults/overrides/readiness/iframe | AC-006/009/011 | Still Valid | implementation pass | run affected |
| maintained Brief/Socratic build/validate/typecheck | canonical package generation | AC-003/004/010 | Still Valid | implementation pass | rerun current |
| `tests/integration/agent/team-lifecycle-websocket.integration.test.ts` | legacy nested-team leaf snapshot projection | AC-005/010 | Stale / Remove | imports `team-leaf-agent-status-snapshot`, which current Personal deliberately removed in `57ab99fcc`; the current strict team stream contract has replacement integration/unit coverage | remove before rerunning the current matrix |
| 16 inherited application/Agent Tools fixture files listed below | current application route, package, launch, binding, event, recovery, and Agent Tools behavior through feature-era fixture shapes | AC-003–09/011 | Needs Update | the assertions remain requirement-relevant, but fixtures still emit SDK contract v4/v5, route-key/run-id aliases, pre-current team event envelopes, and partial launch/resource mocks after current Personal made v6 and exact identities authoritative | update only fixtures/expected exact current values, then rerun |
| broad server inherited suite failures | historical baseline debt | none directly | Out Of Scope for verdict unless candidate-only | implementation characterization | use affected/current matrix; do not misattribute |

## Stale Or Obsolete Coverage Decisions

Execution identified one stale feature-branch test: `autobyteus-server-ts/tests/integration/agent/team-lifecycle-websocket.integration.test.ts`. Its sole scenario constructs and prefixes `TeamLeafAgentStatusSnapshot`, asserting the pre-Personal nested-team projection contract. Current Personal commit `57ab99fcc` deliberately removed `team-leaf-agent-status-snapshot.ts` and replaced that projection with `TeamAgentEvent`, `TeamAgentStatus`, the strict team stream DTOs, and current projectors. `AC-005` makes current Personal behavior authoritative and `AC-010` requires obsolete owners and paths to remain absent. Exact latest Personal therefore does not compile this old assertion and the approved behavior forbids restoring its production seam.

Replacement durable coverage already exists at the current owners:

- `tests/integration/agent/agent-team-websocket.integration.test.js` proves team event streaming and client routing.
- `tests/integration/agent-team-execution/team-conversation-target-websocket.integration.test.ts` proves exact persistent/task/nested AgentRun targets and strict stale/legacy rejection.
- `tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts` proves atomic current snapshots, strict live status/event admission, exact-ID routing, and rejection.
- `tests/unit/services/agent-streaming/team-execution-view-projector.test.ts` proves nested execution placement, live status/event projection, concrete run identity, and communication correlation.
- `tests/unit/services/agent-streaming/agent-stream-websocket-egress.test.ts` proves ordering, duplicate suppression, immutable payloads, disposal, and bounded failure behavior.
- Real Studio/standalone browser and WebSocket journeys will additionally prove current live projection and reconnect behavior.

Decision: remove the stale one-scenario file without replacement because adding a parallel test would duplicate the current-owner coverage and protect an obsolete contract.

The first prerequisite-complete current matrix also identified 16 requirement-relevant files whose behavior is still valid but whose fixtures were not semantically rebased to current Personal. These are **Needs Update**, not production failures: the failures occur at explicit current guards (`definitionContractVersion '6'`, canonical `memberAddress`/`agentRunId`, exact `ApplicationAgentBinding`, current `TeamRunEvent.execution`/`payload`, complete `agentResources.requireRunnable`, and current run-service dependencies) before the intended assertion is reached. The affected paths are:

- `tests/integration/application-backend/application-agent-communication-ws.integration.test.ts`
- `tests/integration/application-backend/application-backend-custom-websocket.integration.test.ts`
- `tests/integration/application-backend/application-backend-mount-route-transport.integration.test.ts`
- `tests/integration/application-backend/application-backend-rest-ws.integration.test.ts`
- `tests/integration/application-backend/application-context-capabilities.integration.test.ts`
- `tests/integration/application-backend/brief-package-team-prompt.integration.test.ts`
- `tests/integration/application-backend/brief-studio-imported-package.integration.test.ts`
- `tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts`
- `tests/unit/application-agent-streaming/application-agent-runtime-source.test.ts`
- `tests/unit/application-backend/app-owned-launch-request-correlation.test.ts`
- `tests/unit/application-backend/app-published-artifact-semantic-path-resolvers.test.ts`
- `tests/unit/application-backend/socratic-lesson-target-projection.test.ts`
- `tests/unit/application-bundles/file-application-bundle-provider.test.ts`
- `tests/unit/application-orchestration/application-agent-target-authorization-service.test.ts`
- `tests/unit/application-orchestration/application-orchestration-recovery-service.test.ts`
- `tests/unit/application-orchestration/application-run-binding-launch-service.test.ts`

The approved update is fixture/expectation reconciliation only: preserve each scenario's behavioral intent, adopt exact current v6/identity/event/dependency shapes, and do not add aliases, production fallbacks, or legacy acceptance. Execution reconciled 15 of the 16 paths. Fourteen updated files now pass together (14 files / 60 tests). The updated Socratic target projection test reaches the real application source and fails because production passes the feature-era member token `"tutor"` to an SDK helper that now requires the exact bound `agentRunId`; that failure is `APIE2E-SOCRATIC-001` / `APIE2E-F001`, not stale coverage. `app-owned-launch-request-correlation.test.ts` remains unreconciled because fail-fast rerouting began after two critical production defects were established.

## Durable Coverage To Add / Update / Remove

- Add: none. IR-003 already adds direct actual-SQLite/lifecycle coverage at the correct durable boundary.
- Update completed: 15 current-behavior files, restricted to v6 manifests/definitions, exact current binding and target identity, current team event envelopes, complete current application context/run-service fakes, current collaboration prompt sections, and exact current diagnostics.
- Update pending after source correction: `tests/unit/application-backend/app-owned-launch-request-correlation.test.ts` remains a known current-Personal fixture reconciliation item.
- Remove completed: `autobyteus-server-ts/tests/integration/agent/team-lifecycle-websocket.integration.test.ts` because it protects the deliberately removed leaf-snapshot contract. Existing current strict-contract tests replace its durable intent; planned live host evidence could not execute past startup.
- These repository-resident durable changes must return through `code_reviewer`; because the result is Fail, the immediate request is focused failure-origin review rather than successful proportional test-code review.

## Repository Coverage Execution Plan And Results

| Order | Command / Selection | Boundary | Result | Evidence |
| --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts prepare:shared` | built shared workspace prerequisites | Pass | `api-rev-001-environment-prepare.log` |
| 2 | IR-003 recovery test | exact changed read/recovery path | Pass: 1 file / 5 tests | `api-rev-001-ir003-recovery.log` |
| 3 | CRR-003 8-file affected selection | retained CR-001–CR-003 boundaries | Pass: 8 files / 50 tests, architecture 15/15 | `api-rev-001-affected-server.log` |
| 4 | initial current application/Agent Tools/platform matrix | existing-coverage validity discovery | Expected investigation failure: exposed stale/feature-era fixtures and drove the recorded decisions; not used as product verdict | `api-rev-001-current-server-matrix.log` |
| 5 | final 14-file reconciled durable selection | current v6 route, package, prompt, identity, event, recovery and tool fixtures | Pass: 14 files / 60 tests | `api-rev-001-durable-reconciliation-final.log` |
| 6 | Socratic target projection | exact current SDK `agentRunId` target authority through application source | **Fail: 1 file / 1 failed, 2 passed (`APIE2E-F001`)** | `api-rev-001-socratic-target-failure.log` |
| 7 | server, devkit, frontend SDK and both maintained app builds | executable package prerequisites and package generation | Pass after documented prerequisite order; both importable packages generated | `api-rev-001-maintained-build-prerequisites.log` |
| 8 | both maintained app `validate` and `typecheck:backend` | package contract validation and backend compilation | Pass: 4 commands | `api-rev-001-maintained-apps-focused.log` |
| 9 | real Socratic `pnpm start` with isolated data | normal built standalone host journey | **Fail before listen (`APIE2E-F002`)** | `api-rev-001-socratic-standalone.log`, `api-rev-001-socratic-standalone-server.log` |
| 10 | instrumented temporary startup probe | exact process-owner failure origin | Reproduced: migration/run-file location readers call `AgentTeamRunManager.getInstance()` before supervisor `initializeProcessInstance()` | `api-rev-001-standalone-manager-stack-probe.log`, `api-rev-001-source-correlation.log` |

## Post-Repository Confidence Scorecard

| Category | Score | Support | Uncertainty | Improvement |
| --- | ---: | --- | --- | --- |
| Requirement/AC proof | 60% | IR-003, affected architecture/lifecycle, package builds and 60 reconciled tests execute directly | AC-003/007/008/011 fail or remain incomplete | correct both production defects, then rerun full matrix |
| Changed-boundary directness | 85% | actual SQLite recovery plus exact application-source target failure | host/provider execution stops before listen | correct startup ownership and exercise live boundary |
| Cross-boundary realism | 65% | worker/host integration tests and a real packaged standalone startup attempt | no listening host, browser, real provider, handoff or projection | both real hosts and provider journeys |
| Environment/config/identity fidelity | 85% | Node 22, real built package, isolated SQLite/data root, exact current identities in durable tests | provider/vault/browser runtime not reached | live two-host execution |
| Failure/lifecycle/recovery | 72% | 5 direct recovery tests, 50 affected tests, startup failure/unwind and source stack | active run stop/restart and same-data reentry not live-tested | lifecycle rerun after fix |
| User/browser/desktop | 30% | web-equivalent mode was planned; Electron correctly deferred | host failed pre-listen, so no browser journey ran | listening hosts plus semantic browser assertions |
| Durable coverage quality | 88% | 14 updated files / 60 tests pass; one current exact-target regression correctly fails; stale test removed with replacement rationale | one inherited fixture remains unreconciled; failure package has not had test review | finish reconciliation and proportional review after source fix |

- Overall post-repository confidence: **69%** (simple average, rounded).
- Every critical criterion directly proven: **No**. Critical AC-003, AC-007, AC-008 and AC-011 are failing or incomplete.
- Broader validation decision: **Required and attempted**. The real standalone journey failed before listen, increasing failure-origin certainty but preventing the remaining selected modes.

## Broader Validation Decision

- Decision: **Required; partially executed; result Fail**.
- Modes selected: Browser, Live API, CLI, process lifecycle, worker recovery, real provider.
- Executed mode: real CLI/process startup from the maintained Socratic package, isolated data root, plus an instrumented executable stack probe.
- Material result: package validation and all database migrations completed, but `createGeneralProcessRunSupervisor()` failed before `app.listen()` with `The process AgentTeamRunManager is already initialized.`
- Fail-fast rationale: the shared standalone startup owner is critical to AC-003/007/008/011. Browser/provider/restart evidence cannot be validly produced without a listening host. The exact source stack was captured rather than masking the issue with a test-only singleton reset.

## Desktop Application Validation Decision

- Framework: Electron wrapping the Nuxt/server stack.
- Web-equivalent behavior selected: application setup, browser/iframe business flows, HTTP/GraphQL/WS, restart/remount.
- Execution result: **Not Tested after the real host failed before listen**; no browser was opened and no screenshot is claimed.
- Shell-specific behavior remains downstream delivery-owned and was not disturbed.
- Confidence consequence: user/browser category remains 30% and AC-011 cannot pass.

## Live Environment And Fixture Result

- Real command: `pnpm -C applications/socratic-math-teacher start -- --port 43141 --host 127.0.0.1 --data-dir /private/tmp/api-rev001-socratic-standalone.6xr1kb`.
- Package: normal devkit-generated Socratic importable package; `validate` and `typecheck:backend` passed.
- Data: unique owned temporary data root; 23 Prisma migrations applied successfully.
- Expected readiness: standalone host listens on `http://127.0.0.1:43141` and the Socratic UI/API can be exercised.
- Observed: process exited 1 before listen with `The process AgentTeamRunManager is already initialized.`
- Runtime correlation: migration registry construction eagerly creates a runtime-memory classifier whose location service calls `AgentTeamRunManager.getInstance()`; the general-process supervisor later requires exclusive `initializeProcessInstance()`. AgentRunManager's default run-file-change service has a second eager path to the same team manager.
- Cleanup: ports 43141/43142 free, owned data roots and generated outputs removed, no browser created.

## Not Tested / Deferred

| Boundary | Reason | Risk | Follow-up |
| --- | --- | --- | --- |
| Real Studio host and iframe/remount | fail-fast after shared current runtime ownership defect and standalone pre-listen failure | critical AC-007/008/011 evidence absent; Studio uses the same general supervisor and requires independent rerun | rerun exact same-data Studio journey after implementation fix |
| Real Brief standalone and Studio provider/team runs | no listening standalone and no valid second-host baseline | critical named handoff/publication/projection proof absent | rerun both maintained apps and both hosts |
| Real Codex/Luna provider, Agent Tools dispatch, recipient messaging | host did not listen | critical AC-006–008 evidence absent | run normal Luna journeys after fix |
| Same-data stop/restart/reentry, worker recovery, cleanup/leak matrix | startup stopped before application lifecycle | critical AC-008 evidence absent | execute full lifecycle matrix after fix |
| Exact build-once 73/73 package parity and watch loops | fail-fast after critical host defect; normal build/validate passed only | AC-004/010/011 incomplete | capture pre/post hashes and repeat edits after fix |
| Nuxt/browser and broader web selection | cannot validate real mounted behavior without a host; repository web suite not reached | user-surface confidence low | rerun focused Nuxt and real browser matrix |
| `app-owned-launch-request-correlation.test.ts` fixture reconciliation | reroute began after two source defects were directly established | one known durable fixture remains stale | reconcile during API/E2E rerun |
| Electron shell/package | explicitly delivery-owned | shell-specific residual | delivery engineer after API/E2E and test review pass |

## Ambiguities Or Reroute Triggers

Two unambiguous implementation-origin failures require focused review:

1. `APIE2E-SOCRATIC-001` / `APIE2E-F001`: Socratic `deriveTutorTargetAddress()` passes `"tutor"` to the current SDK helper whose second argument is the exact bound `agentRunId`; the durable exact-identity regression fails before a target can be returned.
2. `APIE2E-STANDALONE-001` / `APIE2E-F002`: normal maintained `pnpm start` applies migrations then exits before listen because an existing-state/memory location reader eagerly creates the process team manager before `GeneralProcessRunSupervisor` calls exclusive initialization.

Preliminary classification for both is **Local Fix / implementation defect**. No requirement or design ambiguity was needed to reproduce them. Final failure-origin ownership belongs to `code_reviewer`.

## Investigation Decision

- Proceed To API/E2E Execution: **Completed to critical fail-fast point**.
- Repository-Resident Durable Coverage Added / Updated / Removed: **Yes — 15 updated current-contract files and one stale file removed; one additional fixture remains pending**.
- Post-repository confidence: **69%**.
- Final confidence after partial live execution: **73%**.
- Broader validation decision: **Required; attempted; Failed before listen**.
- Reroute Required: **Yes — `/code_reviewer` for focused failure-origin review of `APIE2E-F001` and `APIE2E-F002`**.
- Latest authoritative result: **Fail**.

## API-REV-002 Re-entry Investigation — CRR-005 / IR-004

- Re-entry trigger: `CRR-005` Pass at reviewed implementation `ae5a1c7bcffbc4c8a54a5e3d1059d73861359b13`; current review artifact HEAD `c4d7267b611ab516320aa651f0dcf8f4eb36cb11`.
- Prior authoritative result: `API-REV-001` **Fail / 73%**.
- Prior failures to recheck first: `APIE2E-SOCRATIC-001` / `APIE2E-F001` and `APIE2E-STANDALONE-001` / `APIE2E-F002`.
- Source-review resolution basis:
  1. Socratic selects configured `/tutor` and forwards its exact binding `agentRunId`; missing configuration fails closed.
  2. Runtime-memory migrations and the supervisor-owned `RunFileChangeService` receive one explicit stored-history-only execution-tree location service and cannot claim the live process team manager.
  3. initial TeamRun state is durable/catalog-admitted before materialization, preserving stored-only location validity.
- Existing durable coverage decision revised before edit: `tests/unit/application-backend/socratic-lesson-target-projection.test.ts` remains current and required, but its missing-tutor expected diagnostic is stale after the production correction changed failure ownership from SDK missing-agentRunId validation to Socratic configured-member resolution. Decision: **Needs Update**, change only the expected current error; retain the exact successful agentRunId assertion and wrong-subject guard.
- All other API-REV-001 durable changes remain **Still Valid** pending rerun. The removed `team-lifecycle-websocket.integration.test.ts` remains **Stale / Remove** for the reasons already recorded.
- The remaining `app-owned-launch-request-correlation.test.ts` fixture remains **Needs Update** and must be reconciled before a successful final repository matrix.

### API-REV-002 Execution Order

1. Update only the stale Socratic missing-tutor expected error, then rerun `APIE2E-SOCRATIC-001`.
2. Rebuild prerequisites/packages and rerun the exact real Socratic `pnpm start` path for `APIE2E-STANDALONE-001` with an isolated root; require listen/readiness and clean close.
3. If both prior failures pass, reconcile the last inherited launch-correlation fixture and rerun all API-owned changed durable coverage plus the CRR-005 affected selection.
4. Run proportional server, devkit, SDK, web, maintained app build/validate/typecheck and integrity coverage.
5. Execute real standalone and Studio journeys for both maintained applications: package defaults, provider/tool session, named handoff, publication/projection, same-data restart/reentry, iframe/remount, route separation, worker recovery and cleanup.
6. Capture pre/post canonical package/authoring hashes and prove immutable build-once parity across relevant command/watch cycles.
7. Update the canonical investigation/report and append `API-REV-002`; route any new Fail to focused origin review, or a complete Pass plus every durable delta to proportional test-code review.

### API-REV-002 Broader Validation Gate

- Decision: **Required**. The prior round failed before a listening host and therefore left every real user/provider/restart/parity criterion open.
- Browser strategy: browser validation remains required for Studio/standalone web-equivalent UI once hosts are ready; Electron stays delivery-owned.
- Environment: Node 22, generated packages from current source, unique loopback ports and unique owned data roots; no direct SQLite/file publication workaround.
- Current round status: **completed Fail**; prior F001/F002 resolved, new F003 blocks continuation.

### API-REV-002 Investigation Result Update

- `APIE2E-SOCRATIC-001` / prior `APIE2E-F001`: **Resolved / Pass** after the API-owned expected diagnostic was reconciled; 3/3 focused tests pass and the exact binding member `agentRunId` is returned.
- `APIE2E-STANDALONE-001` / prior `APIE2E-F002`: the prior process-manager ownership failure is **Resolved**. Startup now passes exclusive manager initialization and reaches current Codex provider readiness.
- New finding `APIE2E-F003`: **Fail**. On a fresh isolated application data root, the normal standalone lifecycle supplies the application storage `runtimeDir` as Codex readiness `cwd` before any owner creates that directory. The configured executable exists and is authenticated, but Node spawn returns `ENOENT` because `cwd` is absent. A direct executable probe returns the same `ENOENT` for the missing application runtime directory and succeeds from the existing data root.
- Preliminary classification: **Local Fix / implementation defect** in fresh-root storage/readiness ordering or exact workspace preparation ownership. No test-only directory creation or direct data workaround is valid AC-003/007/009/011 proof.
- Broader execution stopped at the critical pre-listen failure. Real Studio, Brief, provider run/tool dispatch, handoff/publication/projection, restart/remount, parity and browser evidence remain Not Tested.
- Post-repository confidence: **71%**.
- Final confidence after live fresh-root startup and executable correlation: **75%**.
- Current broader-validation result: **Required; attempted; Fail before listen**.
- Cleanup: the owned temporary data root, path marker and generated package/build outputs were removed; port 43141 is free; `git diff --check` passes. Evidence: `api-rev-002-cleanup.log` and `api-rev-002-durable-test-diff.log`.
- Required reroute: `/code_reviewer` for focused failure-origin review of `APIE2E-F003`.

## API-REV-003 Re-entry Investigation — CRR-007 / IR-005

- Re-entry trigger: `CRR-007` Pass / 93 at reviewed implementation `ad2ef7597f615c673e2998e083f412fdae4e7854`; current review-artifact HEAD `63000f7bc1d07f3b9b3164594c60fadb8ed6a8b8`.
- Prior authoritative result: `API-REV-002` **Fail / 75%**.
- Prior failure to recheck first: `APIE2E-STANDALONE-001` / `APIE2E-CODEX-CWD-001` / `APIE2E-F003` with the exact authenticated executable and a new isolated data root.
- Source-review resolution basis:
  1. the shared `ApplicationPlatformLifecycle` invokes the graph-local storage owner after catalog validation and before definition/provider readiness;
  2. `ApplicationStorageLifecycleService.ensureRuntimeDirectoryPrepared()` validates the cataloged application and materializes only its canonical `runtimeDir`;
  3. provider identity, path resolution, launch reads, database creation/migration and stop/unwind behavior remain unchanged.
- Existing coverage validity:
  - IR-005 lifecycle/storage/recovery tests are **Still Valid** and directly cover runtime-directory preparation order, exact adapter cwd, dormant-selection exclusion, no database side effect, failure short-circuit and cleanup; rerun them in the affected selection.
  - the cumulative API-owned 15-file current-contract update remains **Still Valid** and must be rerun/reviewed before Pass.
  - removal of `tests/integration/agent/team-lifecycle-websocket.integration.test.ts` remains **Stale / Remove** because current Personal deliberately replaced the retired leaf-snapshot contract.
  - `tests/unit/application-backend/app-owned-launch-request-correlation.test.ts` remains **Needs Update** from API-REV-001 and must be reconciled before a successful full repository result.
- No new durable regression is initially required for IR-005: implementation-owned tests exercise the exact source boundary. The real maintained command is required to close the executable gap. Any new supported failure or uncovered reusable boundary will revise this decision before test edits or rerouting.

### API-REV-003 Planned Execution Order

1. Rebuild the cleaned server/devkit/SDK/application prerequisites and rerun the exact authenticated fresh-root Socratic standalone command; require canonical runtime cwd creation, credential readiness, listen, and clean close.
2. If the prior failure passes, rerun CRR-007 affected lifecycle/storage/recovery/architecture coverage and the Socratic exact-target regression.
3. Reconcile the last inherited `app-owned-launch-request-correlation.test.ts` fixture, then run every cumulative API-owned durable test and the proportional affected/current server matrix.
4. Run server/devkit/SDK/web and both maintained application build/validate/typecheck commands.
5. Exercise fresh and same-data standalone plus Studio for Socratic and Brief as relevant: provider readiness, exact bindings, real tool dispatch, named handoff, publication/projection, restart/reentry, stop/recovery, Studio iframe/remount, route separation and browser-visible behavior.
6. Capture canonical package/authoring hashes before and after maintained `dev` / `dev:studio` command cycles and require exact parity with no scratch residue.
7. Clean every owned process, port, browser and data root; update the authoritative report and append `API-REV-003`. Route Fail for focused origin review or Pass plus the complete durable delta for proportional test-code review.

### API-REV-003 Broader Validation Gate

- Decision: **Required**. Previous execution never reached listen, so the real provider, business, restart/remount, browser and package-integrity boundaries remain materially unproven.
- Selected modes: maintained CLI/process, live HTTP/GraphQL/WebSocket and provider/tool execution, browser for web-equivalent Studio/standalone behavior, lifecycle/recovery probes, and exact filesystem hashes.
- Environment plan: Node 22; current generated packages; `/Applications/Codex.app/Contents/Resources/codex` as the known existing authenticated executable; unique loopback ports and owned temporary roots; no direct SQLite/file repair or manually-created runtime cwd.
- Current round status at investigation time: **Ready to execute; no API-REV-003 result inferred**.

### API-REV-003 Investigation Result Update (Authoritative)

This section supersedes the round-three planning status above.

- `APIE2E-F003` is **Resolved**. The exact authenticated fresh-root Socratic standalone command created the canonical application runtime directory before provider readiness, listened on port 43141, served HTTP 200, stopped cleanly, and left no process/port leak.
- The CRR-007 affected selection is **Pass: 7 files / 45 tests**. The cumulative API-owned durable selection is **Pass: 16 files / 77 tests**, including the final reconciled launch-correlation fixture.
- Server build-config TypeScript, full devkit 20/20, SDK contracts/backend/frontend gates, both application build/validate/backend typecheck, and exact package generation passed.
- Broad inherited characterization remains separate: the whole server command reports 66 failed / 522 passed / 32 skipped files and 177 failed / 2,975 passed / 119 skipped tests; unit+architecture reports 36 failed / 435 passed files and 102 failed / 2,583 passed / 1 skipped tests. These are not used as Pass evidence and are consistent with the independently recorded inherited current-Personal debt; all requirement-linked current selections above are green.
- Real Brief standalone passed through package-owned Codex/Luna generation, authenticated Agent Tools, researcher `publish_artifacts`, recipient-address `/writer` `send_message_to`, writer publication, app projection, browser rendering, same-data restart, internal-route 401 and external-gateway 404 separation, and cleanup.
- Maintained Brief and Socratic `dev` commands both listened, repacked and restarted after source edits, and returned HTTP 200 before and after restart.
- Real Studio Brief passed exact package-owned team/Luna setup, business generation to `in_review` with two projected outputs, real publication and named handoff, one-iframe explicit remount, same-data backend restart, two repeated `dev:studio` refreshes, and state preservation. Studio internal Agent Tools returned 401 unauthenticated while the Studio-only external gateway returned a valid MCP 200 response.
- Socratic Studio setup and iframe mounting passed with the exact current local package, `/tutor`, Luna default and enabled entry.
- Exact pre/post package and authoring digests are **73/73 unchanged** across the maintained command loops.

#### New Current Coverage Finding — `APIE2E-SOCRATIC-002` / `APIE2E-F004`

- Expected current behavior: starting a fresh Socratic lesson should create the exact package-owned team and `/tutor` member binding, accept the initial math problem after the application-agent connection reports ready, stream a tutor response and durably save the tutor turn.
- Observed current behavior: two independent fresh Studio lessons each created a current v6 package binding and exact `/tutor` `agentRunId`, emitted `lesson.started`, and then rejected the initial input with `Application agent input was rejected.` The UI entered `Tutor connection failed` and each new lesson retained only its student prompt.
- Disambiguation: reopening the first lesson established a connection to the same exact target; a follow-up was accepted, streamed from real Luna/Codex, and produced a durable three-message transcript. Identity, provider availability, package registration and target authorization therefore work; the failure is limited to fresh team-member readiness/input-admission sequencing.
- Reproduction fidelity: installed headless Chrome, real Studio backend/frontend, real generated Socratic package, explicit isolated SQLite/data root, real authenticated Codex executable, no direct data/file workaround. The second fresh lesson reproduced the same failure deterministically.
- Preliminary classification: **implementation/source behavior**; focused failure-origin review is required. No design ambiguity is needed to state the expected user journey.

#### Existing Coverage Validity Revision

- `tests/unit/application-backend/socratic-lesson-target-projection.test.ts` remains **Still Valid** and now passes exact target identity, but it cannot prove target readiness or real input admission.
- `tests/unit/application-backend/socratic-live-tutor-session.test.ts` remains **Still Valid** for client state handling but mocks the connection and therefore treats `INPUT_REJECTED` as an injected error rather than exercising fresh runtime materialization.
- Current application-agent WebSocket integration remains **Still Valid** for protocol/session behavior but does not create the package-owned Socratic team and immediately deliver its first message.
- Durable gap decision: **Add Durable Coverage after source correction** at the real application/team/communication boundary for fresh start -> exact member materialization -> first input accepted. Do not add a fallback/retry assertion that would normalize the current user-visible failure.
- The 16 modified current-contract fixture files and one removed obsolete file remain the authoritative cumulative durable delta. Because this round is Fail, they return to `code_reviewer` for focused failure-origin review, not proportional successful-test review.

#### API-REV-003 Final Investigation Decision

- Repository confidence before live execution: **91%**; all affected/current durable and build gates pass, but live cross-process/browser evidence remained required.
- Final validation confidence: **93%**. Evidence is direct and realistic, but a critical Socratic fresh-start user journey fails; requirement-proof and user-surface categories remain below 90%.
- Broader validation: **Required; executed; Fail**.
- Result: **Fail** due to new `APIE2E-F004`; `APIE2E-F001`–`F003` are resolved.
- Remaining unexecuted after fail-fast: a full second post-failure web production build/focused Nuxt selection and later recovery/isolation expansions. They cannot change the critical failure verdict.
- Reroute: `/code_reviewer` for focused origin review with exact browser, worker, binding, SQLite and source-correlation evidence.

## API-REV-004 Re-entry Investigation — CRR-009 / IR-006

- Re-entry trigger: `CRR-009` Pass / 93 at reviewed implementation `b3ddefe1a079e1bc52eb36688595462861b7415a`; current review-artifact HEAD `e2c9e2e4c89875c61aad57dea5a40d45832e6884`.
- Prior authoritative result: `API-REV-003` **Fail / 93%**.
- Prior failure to recheck first: `APIE2E-SOCRATIC-002` / `APIE2E-F004`, using the maintained current Socratic package in an isolated real Studio, then `Start lesson` -> application agent `READY` -> immediate initial problem delivered to the exact binding-owned `/tutor` member.
- Source-review resolution basis:
  1. the public `AGENT_TEAM_MEMBER` address is validated and mapped once through the launch binding's exact `runtime.members` identity;
  2. `ApplicationOrchestrationHostService` now forwards that exact `agentRunId` through `RootTeamRun.postMessage` rather than re-selecting by member definition;
  3. unknown member addresses and IDs reject before root lookup, while coordinator targeting remains `null`;
  4. no retry, delay, global/coordinator fallback, provider, persistence, schema, or lifecycle path was added.
- Existing coverage validity:
  - `tests/unit/application-orchestration/application-orchestration-host-service.test.ts`, `application-team-input-root-dispatch.test.ts`, and `application-agent-target-authorization-service.test.ts` are **Still Valid**. CRR-009 reports 12 direct cases including four real `RootTeamRun` target-identity cases; rerun them before live execution.
  - `tests/architecture/application-framework-boundaries.test.ts` is **Still Valid** and must retain the approved application/runtime ownership boundary (15/15 expected).
  - the cumulative API-owned 16-file current-contract delta is **Still Valid** and must be rerun; the obsolete `tests/integration/agent/team-lifecycle-websocket.integration.test.ts` removal remains **Stale / Remove**.
  - the prior Socratic projection and real Studio evidence remain valid for configuration, exact binding identity, provider availability and failure reproduction, but are insufficient alone to prove first-message admission after IR-006.
- Durable gap decision at re-entry: **Use the implementation-owned direct real-RootTeamRun regression plus realistic browser/API execution**. No additional API-owned durable test is initially required because IR-006 already adds the reusable exact boundary cases. Revise this decision before edits if the live rerun exposes an uncovered reusable behavior.

### API-REV-004 Planned Execution Order

1. Rebuild only prerequisites removed during API-REV-003 cleanup; run the IR-006 3-file/12-test selection, architecture 15/15, server build-config TypeScript, and the cumulative API-owned durable selection.
2. Launch a fresh isolated Studio backend/frontend and maintained Socratic `dev:studio`; in installed Chrome select the exact current local Socratic package, retain the package-owned `/tutor` and Luna default, start a fresh lesson, and require the immediate problem to stream and save a real tutor response without reopen/retry.
3. Correlate the browser outcome with exact binding member identity, worker/application events and durable messages. Direct file/SQLite mutation is not valid journey proof.
4. If `F004` resolves, rerun the proportional retained dual-host matrix: Socratic standalone business; Brief standalone and Studio Codex/Luna publication, recipient-name handoff and projection; same-data restart/reentry; explicit Studio remount; internal Agent Tools versus Studio-only external gateway; maintained `dev` and `dev:studio` refresh; active-run recovery/cleanup.
5. Require exact 73/73 package/authoring digests before and after live maintained commands; execute current devkit, SDK, application, server and web gates proportionately.
6. Stop only owned processes, remove owned roots/build scratch, prove ports and provider children are clean, update the canonical reports and append `API-REV-004`. Route Pass plus the full durable delta for proportional test-code review, or Fail for focused origin review.

### API-REV-004 Broader Validation Gate

- Decision: **Required**. The prior failure occurred only in the real fresh browser-to-Studio-to-package-team first-message boundary; mocked or repository-only evidence cannot close it.
- Selected modes: focused Vitest/TypeScript/build gates, maintained CLI processes, live HTTP/GraphQL/WebSocket/provider/tool execution, installed Chrome for web-equivalent user journeys, restart/remount/recovery, and exact filesystem digests.
- Environment plan: Node `22.23.1`; real authenticated `/Applications/Codex.app/Contents/Resources/codex`; installed Google Chrome; new loopback ports and owned `/private/tmp/api-rev004-*` data roots with explicit isolated SQLite/log/memory/temp environment; do not touch the user's ports `8000`/`3000`, Desktop process, or home data.
- Current round status at investigation time: **Ready to execute; no API-REV-004 result inferred**.

### API-REV-004 Repository Evidence Revision Before Durable Edits

- The documented prerequisite build is required after cleanup: the first focused attempt could not resolve the cleaned `@autobyteus/application-sdk-contracts` output. After the normal server prerequisite build, the IR-006 selection passed **4 files / 27 tests** (the expected 12 target tests plus architecture 15/15), and server build-config TypeScript passed.
- The cumulative 16-file API-owned selection then reported **75 pass / 2 stale assertions**. Production behavior supplied exact authorized runtime member IDs (`researcher-run` and `team-run-1::researcher`), while two API-owned fixtures still expected the public address `/researcher` to be forwarded into `RootTeamRun.postMessage`.
- Validity revisions made before editing:
  - `tests/integration/application-backend/application-agent-communication-ws.integration.test.ts`: **Needs Update**. Keep the public WebSocket input address `/researcher`, but assert the exact binding-owned `agentRunId` reaches the real team dispatch boundary.
  - `tests/integration/application-backend/application-context-capabilities.integration.test.ts`: **Needs Update** for the same reason on the explicit initial-team-input capability path.
- These are approved durable current-contract corrections, not implementation failures. They must be rerun in isolation and in the complete cumulative selection, and included explicitly in proportional test-code review after a Pass.

### API-REV-004 Investigation Result Update (Authoritative)

This section supersedes the round-four planning status above.

- The two exact-identity fixture corrections pass in isolation (**2 files / 3 tests**) and the complete cumulative API-owned durable selection passes **16 files / 77 tests**. The public `/researcher` address remains the input contract while the actual team dispatch now asserts the exact binding-owned runtime ID. No production fallback or compatibility behavior was added.
- The IR-006 direct selection plus architecture gate passes **4 files / 27 tests** and server build-config TypeScript passes. Normal prerequisite builds, full devkit **20/20**, both maintained package validation/backend typecheck gates, web boundary guard and Nuxt production build pass.
- `APIE2E-SOCRATIC-002` / `APIE2E-F004` is **Resolved** in the exact real journey: a new isolated Studio, maintained Socratic `dev:studio`, package-owned `/tutor` with Luna/Codex, and installed Chrome accepted the initial problem immediately after readiness, streamed the real tutor response and durably stored both messages. There was no reopen, retry, delay, direct database edit or file workaround. Browser, worker and binding evidence agree on the exact member `agentRunId`.
- Socratic standalone also passed a fresh real business turn, real provider streaming, durable two-message projection and supported same-data watcher restart with the transcript and connected target retained. Socratic Studio explicit remount preserved one iframe, the same transcript and target readiness.
- Brief standalone and Studio both passed package-owned researcher/writer Luna/Codex execution, actual `publish_artifacts`, named `/writer` `send_message_to`, writer continuation/publication, two projected artifacts and `in_review` browser state. Raw provider traces and projection snapshots are retained; no direct file/SQLite manipulation was used as publication or handoff proof.
- Standalone internal Agent Tools returned `401` without a scoped session and standalone `/mcp/gateway` remained `404`; Studio internal Agent Tools likewise returned `401` while the Studio-only external gateway returned a valid MCP `200` initialize response.
- Explicit Studio remount and same-data backend restart restored both live applications. Graceful stop removed the two application workers and two Codex app-server children; restart remounted one iframe per application and retained the Socratic transcript plus completed Brief outputs.
- Both maintained standalone `dev` watchers and both `dev:studio` watchers observed the repeated source change and returned to ready. Exact pre/post SHA-256 comparison is **73/73 unchanged**, including canonical generated metadata, with no staging/previous residue.
- Final cleanup stopped only owned processes. Ports `8015`, `3015`, `43145` and `43146` are free; no owned worker/provider child remains; isolated roots, generated build/package outputs and test scratch were removed. `git diff --check` passes.

#### Final Coverage Validity And Durable Decision

- All 16 updated current-contract files are **Still Valid** and green together. The two round-four corrections are necessary exact-identity assertions and require proportional successful test-code review.
- Removal of `tests/integration/agent/team-lifecycle-websocket.integration.test.ts` remains **Stale / Remove** because current Personal deliberately removed the leaf-snapshot contract and already has strict current team event/status replacement coverage.
- No additional durable API/E2E test was added for IR-006. The implementation-owned real-`RootTeamRun` regression directly covers the reusable identity mapping, while the retained browser/process evidence covers the cross-system first-message behavior that exposed F004.
- Historical broad inherited server-suite debt remains separate characterization, not current Pass evidence and not attributed to IR-006. Electron shell verification remains downstream delivery-owned.

#### API-REV-004 Final Confidence Scorecard

| Category | Final | Evidence / Residual |
| --- | ---: | --- |
| Requirement and acceptance proof | 98% | every critical dual-host business, identity, publication, restart and parity criterion passed |
| Changed-boundary directness | 100% | direct IR-006 real-`RootTeamRun` cases plus exact live binding/worker/browser correlation |
| Cross-boundary realism | 98% | real Chrome, HTTP/GraphQL/WebSocket/MCP, workers, Codex/Luna and durable projection |
| Environment/config/identity fidelity | 99% | current packages, exact IDs, real executable/Chrome, isolated roots and unique ports |
| Failure/lifecycle/recovery | 98% | same-data restart, remount, watcher restart, active-child cleanup and leak checks |
| User/browser/desktop-equivalent | 98% | both maintained apps pass standalone and Studio browser journeys; Electron remains downstream |
| Durable regression quality | 97% | 16 files / 77 tests green; stale coverage removed and two exact-identity assertions reconciled |

- Overall final validation confidence: **98%** (simple average, rounded).
- Critical acceptance criteria all pass: **Yes**.
- Categories below 90%: **None**.
- Broader validation: **Required; executed; Pass**.
- Result: **Pass**; `APIE2E-F001` through `APIE2E-F004` are resolved.
- Required next route: `/code_reviewer` for proportional review of every cumulative repository-resident durable addition/update/removal before delivery.

## API-REV-005 User-Requested Packaged-Electron Real-Provider Expansion

- Trigger: explicit user request to go beyond the completed browser-equivalent/API-REV-004 and packaged-isolation/DR-001 evidence by exercising a real packaged Electron renderer, importing owner-supplied provider assignments from `/Users/normy/.autobyteus/server-data/.env`, importing the maintained agent package at `/Users/normy/autobyteus_org/autobyteus-agents`, and running the `Classroom Simulation Team` with Professor on Codex `gpt-5.6-luna` and Student on an available AutoByteus-runtime DeepSeek V4 Flash model.
- Source baseline: current checkpoint `42496b808df16f4ed24ca66bac03372c578f1f89`; no new implementation-source change is under review. `API-REV-004` remains **Pass / 98%**, `CRR-010` passed the cumulative durable delta, and delivery's `DR-001` packaged macOS ARM64 build/isolation result remains valid.
- Changed/selected boundaries for this expansion: packaged Electron main/preload/renderer lifecycle; isolated embedded server and SQLite/vault; supported secret-import CLI; Settings UI local agent-package import; provider/model catalog and credential readiness; team launch configuration with per-member runtime/model selection; real Codex and AutoByteus provider execution; `run_bash` and recipient-address `send_message_to`; workspace files, team event/communication rendering, and process/root cleanup.
- Existing packaged coverage validity:
  - `DR-001` `E2E-PKG-001` through `E2E-PKG-005`: **Still Valid** for artifact identity, endpoint selection, renderer GraphQL/WebSocket connectivity, provider-settings rendering, concurrent isolation, fail-closed profiles, updater suppression, and cleanup. It does not execute a credentialed business agent team.
  - `API-REV-004` real Brief/Socratic Chrome journeys: **Still Valid** for application-framework dual-host provider/tool/publication behavior, but they are web-equivalent and do not prove the packaged Electron shell plus imported external agent package.
  - Classroom package definitions and package-local `send_message_to`/`run_bash` declarations: **Still Valid as fixtures**, but definition presence alone is not run evidence.
- Coverage gap decision: **Use Temporary Executable Probe Only**. The requested journey depends on owner-private credentials, a locally installed Codex authentication state, a mutable external agent package, and real billed/network providers. It is appropriate as recorded realistic-system evidence, not as a deterministic repository-resident regression. No durable production or test file will be changed unless execution exposes a reusable current-contract gap.
- Supported setup decisions:
  1. reuse the exact unsigned local Electron artifact already built and verified by delivery at `autobyteus-web/electron-dist/mac-arm64/AutoByteus.app` rather than rebuild identical source;
  2. create a new caller-owned `/private/tmp` root and a non-production loopback port under the documented `AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE=e2e` contract, never touching the running ordinary application or `~/.autobyteus/server-data` target;
  3. initialize the isolated database through the packaged host, then use the sole supported `pnpm secrets:import -- --source ... --database-url ...` workflow, first with `--dry-run` and then explicit `IMPORT` confirmation; never print assignment values;
  4. import `/Users/normy/autobyteus_org/autobyteus-agents` through the packaged Electron Settings UI;
  5. query the isolated current model catalog to select the exact requested runtime/model identities, failing or blocking rather than silently substituting a provider/model;
  6. run the team through the packaged UI, require an actual Professor -> Student -> Professor named handoff plus owned workspace assignment/answer files, correlate UI events with backend/provider traces, and capture a screenshot only as supporting evidence;
  7. stop only the owned Electron process tree, verify the selected port is free and the ordinary application identity/health is unchanged, then remove only the owned temporary root after evidence extraction.
- Planned scenario: `APIE2E-ELECTRON-CLASSROOM-001`. Critical pass conditions are packaged renderer readiness; value-safe credential import into the isolated DB; visible imported `Classroom Simulation Team`; exact Professor `codex` / `gpt-5.6-luna`; exact Student `autobyteus` / DeepSeek V4 Flash catalog identity; real two-way recipient-name messaging; real tool/file activity; visible final Professor outcome; no page/backend/provider fatal error; and leak-free isolated cleanup.
- Broader validation: **Required by user; ready to execute**. This round does not imply a result until the complete real-provider journey and cleanup are observed.

### API-REV-005 Investigation Result Update (Authoritative)

- Setup and identity: **Pass**. The exact packaged macOS ARM64 artifact started under the documented Electron E2E profile with a caller-owned isolated data root. The supported `pnpm secrets:import` workflow imported nine configured credential assignments into the isolated encrypted database without printing values. The Settings UI showed the imported local package `autobyteus-agents` with `Classroom Simulation Team`.
- Exact model selection: **Pass**. The packaged catalog exposed Codex App Server `gpt-5.6-luna` and AutoByteus runtime `DeepSeek / deepseek-v4-flash`; the Electron team setup applied Professor `CODEX` / `gpt-5.6-luna`, Student `AUTOBYTEUS` / `deepseek-v4-flash`, and tool auto-approval.
- Real business execution: **Blocked**. The packaged UI created team run `classroom_simulation_team_4546771832f1495e8e23af139e5cb0cc`. The real Codex Professor ran `run_bash`, created `assignment.md`, and successfully called `send_message_to` for `/student`. The real AutoByteus Student was instantiated with `DeepSeekLLM` and seven tools, but all four provider attempts rolled back before a usable response; it could not read/write the answer or reply to `/professor`.
- Exact external dependency correlation: a value-safe direct request using the same owner-supplied `DEEPSEEK_API_KEY` and exact `deepseek-v4-flash` model returned **HTTP 402**, `invalid_request_error`, `Insufficient Balance`. The key was present; its value was never printed or retained in evidence.
- Harness deviation: the first post-run metadata poll filtered for a proposed custom workspace while the UI launched the team in its built-in isolated Temp Workspace, so the harness JSON ended with `last=null`. Filesystem/runtime correlation found the exact real team, members, tools, messages, assignment and provider rollbacks. This harness observation issue is not the execution blocker and did not alter application data.
- Coverage validity decision: prior `API-REV-004` and `DR-001` evidence remains **Still Valid**. No current source or durable coverage defect was established. No repository-resident durable test was added, updated, or removed in this expansion.
- Cleanup: the owned Electron process group stopped gracefully; ports `53376` and `54491` are free; the credential-bearing isolated root and raw provider response were removed. The user's ordinary Electron backend remained PID `37991` on port `29695` and returned HTTP `200`.
- Broader-validation result: **Blocked by external provider account balance**. A passing two-way Professor -> Student -> Professor journey requires DeepSeek account balance/access restoration and rerunning `APIE2E-ELECTRON-CLASSROOM-001`.
- Final validation confidence for the added scenario: **88%**. The exact shell, package, identities, Codex half, delivery, provider activation failure and cleanup are directly proven, but the critical Student completion and return handoff remain unproven.
- Required action: user restores/loads DeepSeek balance for the credential in `/Users/normy/.autobyteus/server-data/.env`, then API/E2E resumes the exact scenario. Under the outcome-routing rules this Blocked result is not handed to another team member.

## API-REV-006 Re-entry Investigation — DeepSeek Balance Restored

- Re-entry trigger: the user explicitly reports that the DeepSeek account has been topped up and the prior `HTTP 402 Insufficient Balance` condition should be resolved.
- Prior blocker to recheck first: `APIE2E-ELECTRON-CLASSROOM-001` / `APIE2E-BLOCKER-001` with the same source credential and exact `deepseek-v4-flash` model.
- Existing coverage validity:
  - `API-REV-005` packaged startup, supported credential import, local package discovery, exact Professor/Student model configuration, Professor tool/file/message behavior, and cleanup evidence remain **Still Valid**.
  - The prior Student provider failure is **Needs Rerun**; the user changed only external account balance, not repository source, durable tests, agent package identity, or requested runtime/model selection.
  - `API-REV-004` approved application-framework Pass and `DR-001` packaged-isolation Pass remain **Still Valid** and do not need broad repetition.
- Durable coverage decision: **No repository-resident change planned**. The recheck remains a private-credential/billed-provider temporary executable journey.
- Execution plan:
  1. issue one value-safe direct request with the same `DEEPSEEK_API_KEY` and exact `deepseek-v4-flash`; require a usable HTTP 200 model response before spending time on Electron setup;
  2. create a new marked isolated Electron root and unique loopback ports; initialize the real packaged backend/renderer and import the local agent package through Settings;
  3. import credentials with the supported `pnpm secrets:import` CLI without exposing values;
  4. run `Classroom Simulation Team` in the packaged UI with Professor `CODEX` / `gpt-5.6-luna`, Student `AUTOBYTEUS` / `deepseek-v4-flash`, tool auto-approval and the isolated Temp Workspace;
  5. require real Professor assignment-file creation, Professor -> Student delivery, Student file-backed answer and Student -> Professor reply, Professor read/evaluation, quiescence, exact runtime/model correlation and visible final state;
  6. stop only owned processes, remove the credential-bearing root after evidence extraction, verify test ports are free and the user's ordinary app remains healthy.
- Harness correction before rerun: query the actual built-in isolated Temp Workspace selected by the UI rather than filtering for an uncommitted custom workspace. Accept the exact Student reply sender from the persisted communication record, including a package-supported Student task execution if the coordinator delegates.
- Broader validation: **Required and ready**. No result is inferred until the complete two-way business journey and cleanup finish.

### API-REV-006 Investigation Result Update (Authoritative)

- Prior blocker recheck: **Resolved**. The same credential source and exact `deepseek-v4-flash` model returned HTTP `200`, exact response-model identity, content `OK`, and finish reason `stop`; no 402 or balance error remained.
- Fresh isolated setup: **Pass**. The packaged macOS ARM64 application started through the documented E2E launcher. After stripping only parent test-runner overrides (`ELECTRON_RUN_AS_NODE`, `AUTOBYTEUS_*`, `DATABASE_URL`), the launcher owned the exact isolated root/ports. The external agent package was imported through Settings and exposed `Classroom Simulation Team`. The supported CLI configured nine credential assignments without value exposure.
- Exact configuration: **Pass**. The run tree persisted Professor `CODEX` / `gpt-5.6-luna`, Student `AUTOBYTEUS` / `deepseek-v4-flash`, auto-approved tools and the owned Temp Workspace.
- `APIE2E-ELECTRON-CLASSROOM-001`: **Pass**. Professor created the assignment and delivered it to `/student`; the real DeepSeek Student read it, calculated 42, wrote and returned `student-answer.md`; Professor read it, reported correctness, wrote and delivered feedback; Student read the feedback, wrote an acknowledgement and replied. The persisted run contains four recipient-name messages, four files, real provider traces and sixteen tool calls. The checkpoint is quiescent and the final state is visible in the packaged renderer.
- Transport/browser/shell state: **Pass**. The harness observed 76 requests, 76 responses, one WebSocket, zero request failures, zero page errors and zero console errors. The Electron process group stopped gracefully without force.
- Cleanup/isolation: **Pass**. Ports `55888` and `55889` are free, the credential-bearing owned root and temporary harnesses were removed, and the ordinary application remains PID `37991` on port `29695` with health HTTP `200`. A value comparison against sensitive assignments in the source `.env` found zero secret values in retained API-REV-006 text evidence.
- Coverage validity: prior `API-REV-004`, `CRR-010` and `DR-001` remain **Still Valid**. `API-REV-005` remains historical evidence of the external 402 condition, now resolved by `API-REV-006`.
- Durable coverage decision: **No repository-resident addition, update or removal**. The exact live paid-provider permutation remains temporary executable evidence; no reusable current-contract coverage gap was exposed.
- Final confidence: **99%** for the added packaged real-provider scenario; every critical requested condition passed, no category is below 90%, and the default target is met.
- Broader-validation result: **Required; executed; Pass**.
- Required route: `/code_reviewer` for the workflow-required proportional test-code review, expected `Not Applicable` because this round changed no durable test file.

## API-REV-007 Current-Personal Semantic Refresh Investigation

- Trigger: `/code_reviewer` `CRR-012` Pass for `IR-007`, reviewed semantic merge `5cf9b8eb22a3b83c114dbb4199341a65aaee8cea`; current reviewer artifact HEAD `fdc18bfcb39f6de80df9b7f5d21b1ba2d00c4342`.
- Current-round rule: prior `API-REV-004` dual-host Pass, `API-REV-006` packaged-provider Pass, `CRR-010` prior durable-test review and `DR-001` prior Electron result are **characterization only**, not proof of the refreshed current-base combination.
- Required acceptance surface: `AC-001`–`AC-015`, with direct emphasis on `AC-003`–`AC-004` maintained CLI/package parity, `AC-006`/`AC-012` current/stale/external model behavior, `AC-007`–`AC-008` scoped tools/handoff/publication/recovery/cleanup, `AC-009` current Personal provider/migration behavior, `AC-013` native-versus-application error projection, and `AC-015` refreshed integrated execution.

### Current Changed Boundaries

1. **Merge/topology and legacy removal:** newest Personal ancestry, 11 semantic conflict resolutions, two marker-free overlaps, five retained deletions, no generated maintained truth.
2. **Current-model selection:** one exact policy shared by readiness, Save and direct run; AutoByteus membership only; stale identifiers remain visible but block without mutation; Codex/Claude remain provider-owned.
3. **Provider/native error:** safe original message plus native metadata at core transports; application agent/team projection remains exact message-only v6 ERROR with no metadata or extra keys.
4. **Provider/catalog/pricing/secret behavior:** newest Personal catalog membership, model metadata, provider credentials, pricing and native streaming changes.
5. **Dual-host executable system:** refreshed maintained Brief/Socratic packages, real provider/tool/messaging/publication behavior, same-data restart/remount, package bytes and cleanup.
6. **Persisted data:** `Directly Usable — No Migration`; existing sparse rows are read directly, stale values are neither rewritten nor removed, and explicit Reset remains the sole deletion path.

### Authoritative Execution Instructions Discovered

- Root `package.json`: current repository E2E uses `pnpm test:e2e`; real provider checks use `pnpm test:e2e:real:preflight` / `pnpm test:e2e:real`; secret import uses `pnpm secrets:import`.
- Maintained app directories expose the native `pnpm dev`, `pnpm dev:studio`, `pnpm build`, `pnpm validate` and `pnpm start` journeys through `@autobyteus/application-devkit`.
- `applications/brief-studio/README.md` defines the package-owned Brief team, launch slot, `publish_artifacts`, recipient handoff, durable projection and restart catch-up contract.
- `applications/socratic-math-teacher/README.md` defines the package-owned `/tutor` exact identity, READY-before-input, first-turn/follow-up projection and current Codex App Server default.
- `test-support/live-e2e/live-e2e-scenarios.mjs` defines the current live DeepSeek model as `deepseek-v4-flash`; owner-provided credentials are available through the supported isolated import workflow already proven in API-REV-006.
- Execution will use Node 22, the installed absolute Codex executable, installed Chrome for web-equivalent journeys, unique loopback ports and caller-owned `/private/tmp/api-rev007-*` roots. It will not touch the ordinary Electron process or home data.

### Durable Coverage Inventory And Validity Decisions

| Durable path / group | Current decision | Reason / required action |
| --- | --- | --- |
| `tests/unit/application-platform/application-current-model-selection-policy.test.ts` | **Still Valid** | directly proves AutoByteus current/stale membership and Codex/Claude bypass at the single policy owner |
| `tests/unit/application-platform/application-launch-host-capability-validator.test.ts` | **Still Valid** | proves stale saved/default selections remain visible but block readiness with exact issue |
| `tests/unit/application-platform/application-launch-configuration-service.test.ts` | **Still Valid** | proves exact baseline/effective provenance, pre-upsert Save rejection, no mutation and Reset semantics |
| `tests/unit/application-orchestration/application-run-binding-launch-service.test.ts` | **Still Valid** | proves direct agent/team stale rejection before allocation/creation and mixed external-runtime behavior |
| `tests/unit/application-agent-streaming/application-agent-stream-event-projector.test.ts` and application communication integrations | **Still Valid** | prove message-only application ERROR, exact v6 identity and metadata exclusion |
| `autobyteus-application-frontend-sdk/tests/application-connections.test.mjs` | **Still Valid** | exact-key SDK validation rejects native/provider metadata at the application boundary |
| core provider error/notifier/stream tests under `autobyteus-ts/tests/unit/...` | **Still Valid** | newest Personal native safe message/metadata owner; must be executed with the application tests to prove the intentional split |
| model catalog/pricing/secret/e2e tests | **Still Valid** | current Personal regression coverage for membership/provenance/pricing/credential readiness |
| architecture `application-framework-boundaries.test.ts` | **Still Valid** | retained removal/ownership/import/export guard after the semantic merge |
| maintained Brief/Socratic integration tests and prior exact-identity fixtures | **Still Valid** | current-contract durable protection remains relevant; execute after canonical SDK/devkit build prerequisites |
| prior API-owned real-browser/process scenarios | **Replace as current execution evidence, not durable code** | scenario definitions remain valid, but live results must be repeated on IR-007 current HEAD |
| prior packaged Classroom scenario | **Out Of Scope for repetition in API-REV-007** | it proved the user-requested external package/provider permutation on the old checkpoint; refreshed Electron build/smoke is downstream delivery-owned after API/E2E Pass |
| historical `APIE2E-REPO-005` broad-suite debt | **Unclear / separate characterization** | do not count as Pass or attribute to IR-007 without new supported origin evidence |

### Coverage Gaps And Decisions

- `APIE2E-CURRENT-MODEL-001`: repository coverage already directly exercises current/stale/external read, readiness, Save and direct-run boundaries. **No new durable case planned**; execute the exact grouped suites.
- `APIE2E-PROVIDER-ERROR-001`: core native and application/SDK projections have direct durable cases. **No new durable case planned**; execute both sides together and add a temporary focused probe only if their combined evidence is ambiguous.
- `APIE2E-DUAL-HOST-007`: refreshed real Brief and Socratic standalone/Studio behavior is not covered by source tests alone. **Use real browser/process execution**, reusing supported current harnesses and isolated data.
- `APIE2E-RECOVERY-007`: same-data standalone restart, Studio restart/remount, scoped tool/session revocation and cleanup require real lifecycle evidence. **Use temporary executable probes**; promote only a reusable deterministic gap if discovered.
- `APIE2E-PARITY-007`: exact maintained package/authoring bytes before/after `dev` and `dev:studio` need refreshed live evidence. **Use hashes plus devkit durable pack tests**.
- Repository-resident durable coverage change before execution: **None planned**. Any failing assertion will first be revalidated against SR-004 current behavior before update/removal.

### Planned Execution Order

1. ancestry/index/retired-path/marker audit, canonical SDK/server/devkit prerequisites;
2. focused current-model read/readiness/Save/direct agent/team suites;
3. core native provider error plus application projector/communication/frontend SDK strictness;
4. newest Personal provider/catalog/pricing/secret/web regression selections and affected server integrations;
5. maintained app build/validate/typecheck and devkit full suite;
6. pre-live exact hashes, both maintained `dev`/`dev:studio` command loops and `start` smoke;
7. real Socratic first-turn/follow-up in standalone and Studio with exact provider-owned defaults;
8. real Brief team handoff, Agent Tools publication/projection in standalone and Studio;
9. same-data restart/recovery, Studio remount, route separation, active cleanup and post-live exact hashes;
10. cleanup/leak checks, confidence reassessment, canonical `API-REV-007` reports and outcome routing.

### Pre-Execution Confidence And Broader-Validation Gate

| Category | Pre-execution confidence | Gap |
| --- | ---: | --- |
| Requirement/acceptance proof | 75% | current refreshed real hosts/packages not yet executed |
| Changed-boundary directness | 90% | source tests are direct; live combined boundary pending |
| Cross-boundary realism | 75% | prior live evidence is old-base characterization only |
| Environment/config/identity fidelity | 85% | exact current packages/credentials/roots pending |
| Failure/lifecycle/recovery | 75% | current merge restart/remount/cleanup pending |
| User/browser/desktop-equivalent | 75% | current renderer journeys pending; Electron downstream |
| Durable regression quality | 95% | direct current tests exist; grouped execution/reconciliation pending |

- Overall pre-execution confidence: **81%** (simple average, rounded).
- Critical acceptance criteria proven on current refreshed HEAD: **No**.
- Broader validation: **Required**. Selected mode is repository + real browser/process dual-host execution; Electron rebuild/smoke remains the explicitly downstream delivery gate after API/E2E and proportional test review.

### API-REV-007 Post-Execution Coverage Resolution (Authoritative)

- Current-tree identity: reviewer HEAD `fdc18bfcb39f6de80df9b7f5d21b1ba2d00c4342`, semantic merge `5cf9b8eb22a3b83c114dbb4199341a65aaee8cea`, protected checkpoint parent `663f44d31deb05bf47f0eda780de4d754187a51b`, newest-Personal parent `7edfb162559ec5a6eb4c00c23a929920eabe3dc1`.
- Topology and legacy-removal audit: **Pass**. Both reviewed parents are ancestors, the index has no unmerged entries, all five required deleted paths remain absent, retired-reference count is zero, and the exact Git conflict-marker scan is clean.
- Focused repository evidence: **Pass**. Current-model read/readiness/Save/direct-run coverage passed `4 files / 26 tests`; the native-versus-application ERROR boundary passed `5 files / 37 tests`; architecture passed `15/15`; native provider behavior passed `8 files / 39 tests`; affected current integrations passed `4 files / 10 tests`; current web service coverage passed `5 files / 106 tests`; frontend SDK passed `12/12`; devkit passed `20/20`; server, web, SDK, Brief and Socratic build/type/validate gates passed.
- Durable validity revision: the broad server run exposed two assertions that no longer represented the approved newest-Personal model catalog. They are now **Updated** rather than attributed to production:
  - `autobyteus-server-ts/tests/e2e/llm-management/qwen-configuration-lifecycle-graphql.e2e.test.ts` now requires the current global GLM `glm-5.3` entry with its `1,000,000` context while retaining the independent custom Qwen `qwen:glm-5.2` lifecycle assertions.
  - `autobyteus-server-ts/tests/unit/llm-management/services/model-catalog-service.test.ts` now requires the current Gemini `gemini-3.7-flash` entry instead of the retired `gemini-3.5-flash` identifier.
  - The reconciled six-file current-model selection passed **28/28** after a canonical server rebuild. No durable test was removed and no production source was changed.
- Broad-suite characterization: full web execution produced `419 passed / 3 failed / 2 skipped` files (`2292 passed / 3 failed / 2 skipped` tests). The three focused failures are unchanged historical fixtures: an interrupt snapshot fixture, a deprecated zh-CN glossary string, and a lazy-hydration mock missing `stopPendingTeamIds`. Full server execution produced `527 passed / 69 failed / 32 skipped` files (`3011 passed / 187 failed / 119 skipped` tests). After the two stale model assertions were corrected and one token-analytics case passed on focused rerun, the remaining file/test count aligns with the separately recorded API-REV-003 inherited baseline. This remains `APIE2E-REPO-005` **Unclear / separate characterization**; it is neither current Pass evidence nor a finding against IR-007.
- Maintained standalone execution: **Pass**. Socratic ran through installed Chrome and authenticated Codex Luna, solved `7x + 4 = 25` as `x = 3`, retained the two-message transcript across graceful same-data restart, and remained ready. Brief ran a real package-owned Researcher -> `/writer` team journey, dispatched real `publish_artifacts` and `send_message_to`, reached `in_review`, and projected research/final artifacts.
- Maintained Studio execution: **Pass**. Exact current Brief and Socratic packages were imported into an isolated Studio. Socratic accepted the fresh first turn, returned `x = 5`, remounted with one iframe, and retained its transcript. Brief completed real Luna research, recipient-name writer handoff, final publication, two-artifact projection and explicit remount. A supported `dev:studio` refresh occurred while the Brief run was active; the worker restarted, catch-up continued, and the run finalized.
- Route/lifecycle/persisted-data behavior: **Pass**. Standalone exposed its authenticated internal Agent Tools boundary while `/mcp/gateway` remained `404`; Studio retained the internal authenticated route and returned `200` for the external gateway initialize. Graceful Studio shutdown released workers, and the same isolated data root restarted with both applications, one iframe each, the Socratic transcript and Brief artifacts intact. This directly proves the approved `Directly Usable — No Migration` reader/recovery outcome without a compatibility path.
- Maintained commands and package integrity: **Pass**. Both application `dev` loops restarted after an input edit, both `dev:studio` loops reloaded, and all **73/73** maintained package/authoring digests remained byte-identical before and after live execution. Default build/validate and production server/web builds also passed.
- Harness-only observations: initial Studio preflight inherited a user `DATABASE_URL` and was stopped before business/package execution; the accepted run used the explicit isolated root. The first Nuxt command forwarded an incorrect port and was replaced by the supported direct command. A later concurrent production web build invalidated the already-completed dev server's `.nuxt` cache; it did not affect the accepted browser results and the production build itself passed. These were test-environment corrections, not product changes.
- Cleanup and isolation: **Pass**. Owned ports `43271`, `43272`, `8027`, and `3027` are free; no owned process or `/private/tmp/api-rev007-*` root remains; generated build outputs were removed; the ordinary AutoByteus server on port `29695` remained health `200`; and a value comparison across 55 retained text artifacts found zero matches for 12 sensitive assignments.
- Final coverage decision: `APIE2E-CURRENT-MODEL-001`, `APIE2E-PROVIDER-ERROR-001`, `APIE2E-DUAL-HOST-007`, `APIE2E-PUBLICATION-007`, `APIE2E-RECOVERY-007`, `APIE2E-REMOUNT-007`, and `APIE2E-PARITY-007` are **Pass** on the refreshed current tree. No current API/E2E failure ID remains.
- Final validation confidence: **98%**. Every critical acceptance criterion has direct current-tree evidence, every applicable category is at least 95%, and broader validation was **Required; executed; Pass**. The historical broad-suite debt remains separately characterized, and refreshed Electron packaging/shell coordination remains downstream delivery-owned rather than an API/E2E blocker.
- Required route: `/code_reviewer` for proportional review of the two repository-resident durable test updates before delivery resumes.

## API-REV-008 IR-008 Nested-Scope And Provider-Granularity Investigation

- Trigger: `/code_reviewer` `CRR-014` Pass / 95 for `IR-008`; reviewed artifact/current HEAD `5492815bd66d5714abc7c2c19fd478f043b3c3e6`, semantic merge `9a9150bea90a94ff43e67c417e5a424fd9dc76ce`, protected checkpoint parent `a23849f165879050e2c9b676a2e9652d8a593c93`, reviewed Personal parent `c5b87df4d6db15969ba70adee9dfd8394b1e7385`.
- Governing solution/review revisions: `SR-005`–`SR-007`, `ARCH-REV-005`–`ARCH-REV-007`, `IR-008`, `CRR-014`, and delivery re-entry `DR-006`.
- Current-round rule: `API-REV-007` is the prior current-base characterization at the protected parent and is not proof of the new nested physical-scope/provider-granularity merge. `API-REV-006` remains recorded packaged-provider characterization only. Electron rebuild/smoke remains delivery-owned after this API/E2E result.
- Final-base limitation: `origin/personal` moved after the exact reviewed merge to `52b4be02e`. API-REV-008 validates only the reviewed exact-input candidate; delivery must perform its governed final refresh and reroute any new semantic conflict rather than treating this result as final-base integration.

### Current Changed Runtime Surfaces And Boundaries

1. **Persisted-data transition and process lifecycle:** old flat nested Team Agent memory is `Migration Required`; the shared `AppDataMigrationRunner` must execute `20260823_repair_team_agent_memory_layout` once after TeamRun V1 and before dependent working-context snapshots in both hosts. Current/direct-root/unmaterialized layouts no-op; conflict/failure preserves both sides and follows the approved warning/retry policy. Runtime must never dual-read.
2. **Nested TeamRun execution identity:** immutable root/child `TeamRunPhysicalScope`, configured children, delegated task teams and task agents must extend the containing TeamRun chain exactly once. Application construction must retain the exact graph-local memory, session, activation, platform-binding and cleanup family.
3. **Provider/model availability:** static AutoByteus membership remains network-free. Canonical dynamic identifiers resolve to one owning provider, run provider-granularity ensure, pass exact identifier/endpoint post-check, and receive a fresh exact `ModelInfo` per leaf. No runtime-only model-list cache may let leaf B reuse leaf A's pre-mutation catalog.
4. **Credential authority:** application readiness must use network-free `getProviderCredentialSetting`, distinguish API/custom/AutoByteus/local/Codex/Claude authority, and reuse readiness only for collision-safe equivalent authority keys. Missing model/source/credential outcomes must stop before upsert or allocation.
5. **Studio model selection:** sparse stored -> inherited -> optional-default runtime precedence, immediate current rows, background missing-provider settlement, post-settlement same-runtime row/status re-read, and retained `ERROR`/`STALE_ERROR` state. Normal provider failure is snapshot state rather than aggregate rejection.
6. **Dual-host application system:** the unchanged Brief/Socratic package, real business behavior, Agent Tools, named handoff/publication/projection, route separation, worker refresh/remount, restart/recovery, dev loops, package bytes and cleanup must remain coherent with the new underlying owners.
7. **Source/build topology:** exact merge ancestry, five conflict/ten overlap dispositions, removed aggregate/cached provider/media owners, unchanged root workspace membership, and byte-identical isolated prototype outside production imports.

### Authoritative Project Execution Instructions

- Root `package.json` and server/web package scripts remain authoritative for build, typecheck, Vitest and E2E selections. Build the SDK/core prerequisites before server tests because generated package outputs are intentionally absent from the reviewed tree.
- `applications/brief-studio/README.md` and `applications/socratic-math-teacher/README.md` continue to define the maintained `pnpm dev`, `dev:studio`, `build`, `validate`, `start`, package-owned launch, publication and first-turn workflows.
- Real web-equivalent validation will use installed Chrome, authenticated `/Applications/Codex.app/Contents/Resources/codex`, unique loopback ports and caller-owned marked `/private/tmp/api-rev008-*` roots. It will not reuse or stop the ordinary AutoByteus process/data.
- Old-data migration proof will use repository-owned actual-process/SQLite fixtures first, then one isolated real host root seeded only through the supported released-shape fixture or exact copied bytes. Direct mutation is acceptable only for pre-start historical fixture construction, never as proof of current publication/handoff behavior.
- Dynamic provider proof will use deterministic durable providers/mocks for source mutation, failure ordering and authority identity because external local provider availability is mutable. Real application business execution remains Codex-backed and unmocked.

### Durable Coverage Inventory And Validity Decisions

| Durable path / group | Decision | Current rationale / action |
| --- | --- | --- |
| `tests/unit/agent-team-execution/team-run-physical-scope.test.ts` | **Still Valid** | directly covers immutable root/child/deep scope, invalid duplicates and index-derived configured/task chains |
| `tests/unit/agent-team-execution/mixed-agent-member-handle-memory-invariant.test.ts` | **Still Valid** | covers root/configured nested memory coordinates together with application activation/platform binding/session revoke |
| `tests/unit/agent-team-execution/mixed-team-member-registry-task-agent-memory.test.ts` | **Still Valid** | covers task-agent containing scope, commit-before-release and injected cleanup |
| `tests/unit/agent-team-execution/mixed-sub-team-run-factory.test.ts` | **Still Valid** | covers configured and delegated task-Team scope extension exactly once |
| `tests/unit/app-data-migrations/team-agent-memory-layout-app-data-migration.test.ts` | **Still Valid** | directly covers move, skip, conflict, invalid source/target, warning bound, idempotence and registry ordering |
| `tests/e2e/run-history/nested-team-history-restart.e2e.test.ts` | **Still Valid; critical current execution** | actual server/SQLite/process proof for configured/task old-flat migration, public history, restart idempotence and ANYTIME retry |
| `tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts` | **Still Valid** | actual released-shape upgrade, migration ledger/relaunch and current work proof; execute proportionately with the nested-specific E2E |
| `tests/e2e/memory-sync/memory-sync-multiprocess.e2e.test.ts` and nested history/navigation web coverage | **Still Valid** | proves imported conflict visibility and current settled historical navigation; execute affected selection rather than infer from unit tests |
| current application launch policy/configuration/direct-run suites | **Still Valid** | retain stale/static/external behavior while extending canonical dynamic availability and failure ordering |
| `tests/unit/application-platform/application-launch-host-capability-validator.test.ts` | **Still Valid; critical current execution** | includes two-leaf/two-provider ensure -> fresh model -> credential order and authority-key reuse |
| `tests/unit/application-platform/application-provider-credential-readiness-adapter.test.ts` | **Still Valid** | exact runtime-to-authority mapping, network-free missing-key, native runtime checks and collision-safe keys |
| `tests/unit/llm-management/services/model-availability-service.test.ts` and `dynamic-model-source-lifecycle.test.ts` | **Still Valid** | exact provider/endpoint matching, source coalescing, generations, cold failure and stale-row retention |
| `autobyteus-ts` dynamic identifier/endpoint/provider tests | **Still Valid** | current core provider-granularity ownership and endpoint identity |
| `autobyteus-web/composables/__tests__/useRuntimeScopedModelSelection.spec.ts` | **Still Valid; critical current execution** | immediate rows, inherited/null precedence, settled refresh and defensive aggregate rejection |
| `autobyteus-web/tests/stores/llmProviderConfigStore.test.ts` plus settings/config component selections | **Still Valid** | source-level `ERROR`/`STALE_ERROR`, stale rows, generation isolation, credential-only reads and UI consumption |
| prior real dual-host scenarios | **Replace as current execution evidence, not durable code** | scenario definitions stay valid; results must be repeated on IR-008 because new process/memory/provider owners sit below both hosts |
| prior `APIE2E-REPO-005` broad debt | **Unclear / separate characterization** | do not attribute to IR-008 or count as Pass without new supported current-origin evidence |
| isolated prototype tests | **Out Of Scope for application behavior; verify isolation/byte identity** | prototype is upstream byte-preserved non-workspace content, not a new application or root-test obligation |

### Coverage Gaps And Decisions

- `APIE2E-MIGRATION-008`: adequate durable actual-process coverage exists for old flat configured/task memory, restart and retry. **No new durable test planned**; execute both nested-history restart scenarios and the proportional production-upgrade/memory-sync selections. Add coverage only if a current approved outcome remains unprotected.
- `APIE2E-NESTED-008`: direct physical-scope/application injection coverage exists across configured child, task team and task agent. **No new durable test planned**; execute the complete coupled selection and correlate one real application team run with its canonical memory path/cleanup.
- `APIE2E-PROVIDER-DYNAMIC-008`: the exact two-leaf mutation/order and authority-equivalence contract has a direct durable case. **No new durable test planned**; execute it with provider availability, endpoint and failure-state owners. Use a temporary probe only if call-order evidence is ambiguous.
- `APIE2E-STUDIO-SELECTION-008`: current store/composable/component suites directly protect immediate/settled inherited selection. **No new durable test planned**; run them and exercise the real Studio setup UI with package-owned defaults.
- `APIE2E-DUAL-HOST-008`, `APIE2E-PUBLICATION-008`, `APIE2E-RECOVERY-008`, `APIE2E-PARITY-008`: source tests cannot prove the real combined process/UI/worker/filesystem boundary. **Use temporary real browser/process execution** and retain sanitized evidence.
- Repository-resident durable change before execution: **None planned**. Any failure will first be classified against SR-007 current behavior before changing tests or production.

### Planned Execution Order

1. Record exact HEAD/parents/ancestry, index/marker state, five/ten dispositions, retired-owner absence, prototype byte identity/workspace/import isolation and initial dirty-state ownership.
2. Build required SDK/core/server prerequisites; run the authoritative CRR-014 focused 14-file/89-test physical-scope/migration/provider/application/architecture selection.
3. Run nested-history restart E2E first, then production-upgrade/memory-sync/history-navigation selections; require old-data whole-directory relocation, canonical reads, warning/retry policy, immutable relaunch and current work.
4. Run core dynamic-provider/endpoint selection, server credential/Qwen/Gemini/custom provider/media/GraphQL cases, and web store/composable/config selections; require two-leaf freshness, source-state failure and exact no-upsert/no-allocation ordering.
5. Run server/frontend SDK/devkit/app build/type/validate and proportionate affected/broad regression gates. Keep historical `APIE2E-REPO-005` separate unless current evidence changes its origin.
6. Capture pre-live 73-path package/authoring hashes; run both maintained standalone `dev` loops and built `start` smokes; execute real Socratic first turn and Brief Researcher -> `/writer` publication/projection.
7. Run isolated Studio plus both `dev:studio` loops; import exact packages, exercise setup/defaults, real Socratic and Brief, explicit remount, active worker refresh, route separation and same-data restart/recovery.
8. Correlate real team physical memory scope/session cleanup, migration status and projection files without direct publication workarounds; capture post-live 73-path hashes.
9. Stop only owned processes, remove only marked roots/generated outputs, verify ports/processes and ordinary app health, scan retained text evidence for secret values, reassess confidence and update the canonical reports/revision record.

### Pre-Execution Confidence And Broader-Validation Gate

| Category | Confidence | Current gap |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 72% | current exact-input migration/provider/dual-host matrix not yet executed |
| Changed-boundary execution directness | 90% | source review is strong; API-owned rerun and actual old-data process evidence pending |
| Cross-boundary integration realism | 72% | prior real runs are parent-checkpoint characterization only |
| Environment/configuration/identity fidelity | 82% | exact current packages, isolated data and dynamic-source fixtures pending |
| Failure/lifecycle/recovery evidence | 72% | migration warning/retry, active worker refresh and current restart pending |
| User/browser/desktop-equivalent confidence | 72% | current renderer/iframe journeys pending; Electron downstream |
| Durable regression quality/relevance | 96% | direct cases exist; current execution and validity reconciliation pending |

- Overall pre-execution confidence: **79%** (simple average, rounded).
- Every critical criterion directly proven on current reviewer HEAD: **No**.
- Broader validation: **Required**. Repository-only proof cannot close old-data process migration, real dynamic/business integration, browser remount, worker restart, package integrity or cleanup risk.

### API-REV-008 Post-Execution Coverage Resolution (Authoritative)

- Exact reviewed tree: reviewer HEAD `5492815bd66d5714abc7c2c19fd478f043b3c3e6`; semantic merge `9a9150bea90a94ff43e67c417e5a424fd9dc76ce`; exact parents `a23849f165879050e2c9b676a2e9652d8a593c93` and `c5b87df4d6db15969ba70adee9dfd8394b1e7385`.
- Topology and removal audit: **Pass**. Both parents are ancestors, there are no unmerged entries or exact governed Git conflict markers, all retired aggregate/cached provider/media owners remain absent, affected legacy-reference count is zero, and the isolated 1,934-file prototype is byte-identical, outside workspace membership and absent from production imports.
- Coupled repository boundary: **Pass**. The authoritative physical-scope, migration, provider, credential, Studio-selection and architecture selection passed `14 files / 89 tests`; server build-config TypeScript and the production build passed. Current AutoByteus provider/discovery coverage passed `5 files / 19 tests`; current Studio selection/store/components passed `5 files / 53 tests`; frontend SDK passed `12/12`; devkit passed `20/20`; both maintained applications passed backend typecheck, build and validation.
- Old-data migration/restart: **Pass for the IR-008 changed boundary**. The exact actual-process/SQLite nested Team history suite passed `2/2` after the canonical build prerequisite, proving configured/task nested whole-directory relocation, public history, restart idempotence and retry. Memory-sync multiprocess passed `1/1`.
- `APIE2E-REPO-005` validity remains **Unclear / separate characterization**. The broader production-upgrade selection again passed its migration case but failed the same three post-migration general current-run tails with the exact inherited `AgentDefinition ... cannot be loaded for agent run identity allocation` signature already recorded in API-REV-003 and API-REV-007. This unchanged historical fixture/owner issue is neither IR-008 failure evidence nor Pass evidence.
- Dynamic provider behavior: **Pass**. Durable provider-granular/fresh-leaf/credential authority coverage passed. A real Studio GraphQL reload independently published three AutoByteus leaf failures (`LLM`, `AUDIO`, `IMAGE`) as separate safe `ERROR` source states with no aggregate rejection, while the LM Studio dynamic LLM source reached `READY` with 15 models. No credential or endpoint value is retained.
- Maintained standalone execution: **Pass**. Socratic ran through installed Chrome and authenticated Codex Luna, solved `9x - 8 = 28` as `x = 4`, published the tutor artifact and recovered the two-message transcript after same-data restart. Brief completed real Researcher publication, recipient-name `/writer` handoff, Writer publication, two application projections and `in_review`; its state also recovered after same-data restart. Physical traces are rooted under each exact TeamRun and member path.
- Maintained Studio execution: **Pass**. Both exact packages were registered through `dev:studio`. Brief completed real Researcher -> `/writer` -> Writer publication/projection and explicit one-iframe remount. Socratic solved `6x + 5 = 29` as `x = 4`, published and explicitly remounted. After graceful Studio stop and the same isolated data-root restart, both launch setups could be reconfirmed without mutation, each mounted one iframe, and the exact Brief artifacts/status and Socratic transcript/status were retained.
- Route, command and parity behavior: **Pass**. Standalone returned `401` for a fake internal Agent Tools session and `404` for `/mcp/gateway`; Studio returned the same internal `401` and a valid external-gateway initialize `200`. Two repeated source touches produced three standalone ready cycles per app and two Studio reload cycles per app. Pre/post SHA-256 comparison remained exactly `73/73` byte-identical.
- Cleanup and evidence safety: **Pass**. All owned ports `8038`, `3038`, `43281`–`43284` are free; marked roots, per-app development data and generated outputs were removed; the ordinary application on `29695` remained listening; zero of 12 secret-like source values appeared in 36 retained text evidence files.
- Harness-only corrections: an initial nested-history invocation used the wrong Vitest config before the canonical prerequisite build; the rerun passed `2/2`. The first Studio restart JSON reducer incorrectly compared numeric `iframeCount` to boolean `true`; every recorded browser assertion had passed and the same evidence file records the transparent result correction. Two initial malformed provider GraphQL probes returned schema validation `400`; the corrected current-schema mutation produced the retained provider evidence. None is a product failure.
- Durable coverage result: **No repository-resident test was added, updated or removed in API-REV-008**. All affected current coverage remains valid; proportional test-code review is expected to be `Not Applicable` for this round.
- Final confidence: **98%**, with every category at least 96% and every critical current acceptance surface directly proven.
- Broader validation: **Required; executed; Pass**.
- Current failure IDs: **None**. Historical `APIE2E-REPO-005` remains separate/Unclear. Current Electron build/package validation and the later final-base refresh remain downstream delivery-owned.
