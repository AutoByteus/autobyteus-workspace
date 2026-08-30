# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-scope-boundary-hardening/tickets/in-progress/application-execution-scope-boundary-hardening/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-scope-boundary-hardening/tickets/in-progress/application-execution-scope-boundary-hardening/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-scope-boundary-hardening/tickets/in-progress/application-execution-scope-boundary-hardening/design-spec.md`
- Supplemental Task Artifacts: `application-execution-scope-ownership-and-spine-map.md`, `application-execution-scope-contracts.md`, `application-execution-scope-transition-inventory.md`, and the explicitly out-of-scope `adjacent-application-agent-addressing-evaluation.md`
- Solution Revision Record: `solution-revision-record.md` (`SR-001`–`SR-003`)
- Design Review Report: `design-review-report.md`
- Architecture Review Revision Record: `architecture-review-revision-record.md` (`ARCH-REV-003` Pass)
- Implementation Handoff: `implementation-handoff.md`
- Implementation Revision Record: `implementation-revision-record.md` (`IR-001`, `IR-002`)
- Code Review Report: `code-review-report.md` (`CRR-002` Pass / 95)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md` after this round completes
- Current API/E2E Revision ID: `N/A` (initial round)
- Current Investigation Round: 1
- Trigger: `/code_reviewer` handoff after `CRR-002` accepted IR-002 construction-unwind proof
- Prior Investigation Reviewed: no task-local prior API/E2E result; the current-base completed Universal Application Framework `API-REV-011`/`API-REV-012` evidence is characterization only and will not substitute for current-HEAD execution
- Latest Authoritative Investigation: this document

## Current Requirement And Design Basis

This behavior-neutral refactor must preserve one graph-local application execution family per `ApplicationPlatformRuntime` in Studio and standalone while moving that family behind one concrete `ApplicationExecutionScope`. The scope privately owns Agent/Team services and managers, scoped Agent Tools sessions, activation/resources, memory/history, publication/projection, streaming source, admission, construction unwind, and ordered shutdown. Callers may receive only the seven reviewed frozen subject capabilities and immutable Agent/Team launch/input results. General-process execution remains a separate supervisor/family that shares canonical definitions but not mutable managers or sessions. Real launch/input, streaming, publication, nested tasks, multi-application isolation, reload/reentry, persisted state, and outer shutdown order must remain unchanged.

Critical executable obligations are `AC-001`–`AC-011`, with realistic dual-host behavior concentrated in `AC-001`, `AC-002`, `AC-008`, and `AC-009`; exact construction/capability/cleanup proof in `AC-003`–`AC-007`; and clean separation/removal in `AC-010`–`AC-011`. Persisted data is `Not Affected`: no migration, compatibility branch, dual path, or state rewrite is authorized.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `BEH-001` Studio one-runtime execution family | Preserved behind a changed owner boundary | REQ-001/008; AC-001/008/009; DS-001 | Run real Studio with both maintained apps concurrently, prove isolated bindings/streams/publications, remount/reentry, and one host cleanup |
| `BEH-002` standalone selected application execution | Preserved behind the same owner boundary | REQ-001/007; AC-002/008; DS-002 | Run a maintained standalone application through launch/input/tool publication/restart/shutdown |
| `BEH-003` launch/input/stream/publication/task/lifecycle access | Changed structurally; behavior preserved | REQ-002–007/010; AC-003/005–010; DS-003–009 | Execute changed durable tests first, then real provider/task/publication paths that mocks cannot fully prove |
| `BEH-004` general/application execution separation | Preserved and made explicit | REQ-004/009; AC-004/011 | Run a general Team while application execution exists, prove both remain operable and history/task identities do not cross |
| Old run-services bag, runtime shutdown path, stream singleton fallback, ambient application selectors | Removed | REQ-010; AC-005/010 | Architecture/source guards must pass; no stale coverage should protect removed paths |
| Persisted bindings/history/projections/packages | Preserved / not affected | design Persisted Data decision; handoff | Same-data restart/reentry and exact package-byte parity required; no migration coverage added |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | live-run access, immutable projections/dispositions, admission and shutdown now owned by scope | scope/orchestration/lifecycle unit tests | real backends and active run graph | Live API / provider |
| API / transport / contract | Preserved but material | REST/GraphQL/WS and Agent Tools must still reach same graph family | application backend and MCP route integrations | real session descriptor, publication, named messaging | Live API / Browser |
| Frontend component / state | No source delta | maintained application UI consumes unchanged contracts | existing Nuxt/application tests | real iframe/remount and stream rendering | Browser |
| Browser integration / user journey | Yes for confidence | real Studio and standalone maintained app journeys | no repository browser test directly executes this refactor | renderer/iframe lifecycle across live host | Installed Chrome |
| Authentication / session / permissions | Yes | application-scoped Agent Tools session owner moved behind scope | session/MCP route tests | live authenticated descriptor, revocation on restart/close | Live API |
| Desktop renderer / web-equivalent UI | Yes | same application surfaces used by Electron | browser path exists | Electron shell itself | Browser; shell deferred |
| Desktop shell / Electron-specific integration | No | no preload/IPC/window/package delta | delivery-owned Electron gates | shell packaging only | Deferred to delivery |
| Process / lifecycle | Yes | scope quiesce/close inserted into outer lifecycle and construction unwind | lifecycle/shutdown/unwind tests | active process stop/restart, old session invalidation, leak behavior | Lifecycle |
| Persisted-data transition | No transformation; preservation required | identity family moves in memory only | recovery/journal/history tests | same-data host restart/reentry | Lifecycle/API |
| Worker / queue / distributed coordination | Yes | publication relay and worker/reentry keep same scope | context/Brief integration tests | actual worker delivery, restart and drain | Worker/process |
| External integration | Yes for acceptance confidence | provider backend construction moved into scope | mocks and environment-gated suites | real Codex/AutoByteus execution and task messaging | Provider-backed live run |

## Project Execution Discovery

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-scope-boundary-hardening`
- Project type and runtime stack: pnpm monorepo; Node 22; TypeScript/Vitest; Fastify/GraphQL/WebSocket/SQLite; Nuxt/Vue; application devkit; Playwright Core/installed Chrome; Codex and AutoByteus provider backends.
- Conflicting, missing, or unclear project instructions: none. Server `AGENTS.md` requires `vitest run --no-watch`. Root/server READMEs separate deterministic E2E from isolated live-provider execution. Electron packaging remains downstream delivery-owned.
- Required environment variables or secrets available: Yes through the user-authorized owner-private assignment source; secret values will never be printed or retained.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-server-ts/AGENTS.md` | server tests | use `pnpm -C autobyteus-server-ts exec vitest run ... --no-watch` |
| root `README.md` and `autobyteus-server-ts/README.md` | deterministic and live E2E | `pnpm test:e2e`; `pnpm test:e2e:real:preflight`; isolated runtime/vault import only |
| `autobyteus-application-devkit/README.md` and app manifests | real app hosts | `pnpm dev` defaults to standalone; `dev:studio` uses public import/reload; no extra standalone `--` after the script name |
| implementation handoff | prerequisite/output ownership | install frozen; build shared contracts/devkit/server/app packages; generated outputs are not durable changes |
| completed current-base API/E2E artifacts | characterization and safe harness precedent | use unique ports/roots, installed Chrome, public APIs, supported secret importer, package hashing, and owned cleanup; do not reuse results as current proof |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| deterministic server suites | repository root | shared builds, then focused/full `vitest run` | test-owned DB/runtime | Vitest result | automatic + remove generated outputs created by this round |
| Studio backend | server/root | built server with explicit isolated app-data root and unique port | no shared user DB; explicit SQLite/vault | `/graphql`/HTTP and server log | SIGINT; verify port free; remove owned root |
| Nuxt web | `autobyteus-web` | dev server pointed at isolated backend | installed Chrome for web-equivalent desktop behavior | applications page/iframe ready | SIGINT; close browser |
| maintained app Studio sessions | app folders | `pnpm dev:studio` with explicit Studio URL and no automatic browser | public import/reload API | devkit ready/reload log + Studio GraphQL | SIGINT; remove app-owned `.autobyteus/dev` |
| maintained standalone app | app folder | `pnpm dev` or `pnpm start` with explicit port/data root | selected package only | root/application health and UI | SIGINT; verify port free; remove root |
| real provider/team execution | isolated Studio/standalone | public GraphQL/application APIs and authenticated Agent Tools descriptor | Codex Luna and AutoByteus DeepSeek where current definitions support them | run events, artifacts, messages/history | terminate through public API; host close |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| provider credentials | supported `pnpm secrets:import` into explicit isolated SQLite URL | dry-run first; never retain values | delete isolated DB/key/root |
| shared and private Agent/Team packages | public package import GraphQL for `/Users/normy/autobyteus_org/autobyteus-agents` and `/Users/normy/autobyteus_org/autobyteus-private-agents` | external package roots read-only; hash if exercised | terminate created runs; no package edits |
| maintained Brief/Socratic packages | devkit build/validate and real host commands | canonical package output is generated | compare hashes; remove only output created by this round |
| retained application/run state | normal launch/publication then graceful restart using same isolated root | no direct SQLite/file workaround used as behavioral proof | remove after restart/reentry evidence |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected`.
- References: design spec Persisted Data / State Transition Decision; implementation handoff Persisted Data Transition Check; REQ-007–010 and AC-008–010.
- Representative existing-data setup: current application bindings, event journal, published artifact projection, Team task/history and package metadata created through supported APIs in an isolated root.
- Evidence planned: exact affected recovery/history tests; same-data Studio/standalone stop/start; restored binding/history/projection; package/source hashes before/after.
- Migration-specific scenarios: N/A. Existing current-schema startup migrations may run normally but no ticket migration is introduced.
- Upstream ambiguity or reroute required: none.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/architecture/application-framework-boundaries.test.ts` | exact scope authority, required inputs, forbidden live aggregate/global bypass, retired-path absence | AC-005/010/011; AFB-004 | Still Valid | transition inventory and CRR-002 | run current |
| `tests/unit/application-platform/application-execution-scope.test.ts` | one identity family, frozen capabilities/projections, restore-aware input, quiesce/close, construction unwind | AC-003/006/007 | Still Valid | IR-002/CRR-002 | run first |
| `tests/unit/application-platform/application-execution-shutdown-coordinator.test.ts` | Team-before-Agent stop, continuation, aggregation, idempotence | AC-007 | Still Valid | reviewed rename and assertions | run first |
| `tests/unit/application-platform/application-platform-runtime-isolation.test.ts` | no eager run; post-scope/pre-publication abort without process-owner closure | AC-001/002/006/009/011 | Still Valid | IR-002/CRR-002 | run first |
| `tests/unit/application-platform/application-platform-lifecycle.test.ts` | readiness, runtime storage, quiesce-first and exact outer close order | AC-007/008/009 | Still Valid | reviewed lifecycle contract | run affected matrix |
| changed orchestration/streaming unit suites | immutable launch/input mapping, exact target, stream attribution/FIFO/failure | AC-003/005/008 | Still Valid | source review and current contracts | run affected matrix |
| changed application backend integrations | real worker/SDK/REST/WS capabilities and imported Brief path | AC-001/002/008 | Still Valid | transition inventory | run affected matrix |
| `standalone-application-server.integration.test.ts` | exact selected surface, confined routes, immutable package bytes | AC-002/008/010 | Still Valid | unchanged current owner | run |
| `agent-tools-mcp-routes.integration.test.ts` | authenticated route, publish, session revocation and configured tool dispatch | AC-002/003/008 | Still Valid | current route/session authority | run |
| `task-delegation-tool-lifecycle.integration.test.ts` | rooted task lifecycle and general/application root isolation | AC-003/004/008/011 | Still Valid | RootTeamRun remains unchanged | run |
| `nested-team-history-restart.e2e.test.ts` and hierarchical/nested runtime E2E | persisted nested topology, restart/history and mixed runtime routing | AC-003/008/009 | Still Valid | no storage or task contract change | run current deterministic coverage |
| maintained app build/validate/devkit suite | canonical package build/watch and byte safety | AC-002/008/010 | Still Valid | behavior preserved, package format unchanged | run proportionately and hash |
| prior `API-REV-011`/`API-REV-012` browser/live evidence | prior current-base dual-host and nested classroom characterization | AC-001/002/004/008/009 | Out Of Scope as current verdict | different HEAD; useful only for harness comparison | rerun current critical journeys |
| historical `APIE2E-REPO-005` | older unrelated broad-suite characterization | none in this ticket | Out Of Scope | explicitly separate in completed records | do not use or broaden |

## Stale Or Obsolete Coverage Decisions

No current relevant coverage was found asserting the removed run-services bag, old shutdown path, singleton stream fallback, or public live-run escape. The implementation already renamed/replaced the two directly obsolete unit paths and the architecture test asserts their absence. No API/E2E-owned removal is planned.

## Durable Coverage To Add

None planned. The changed repository tests already durably cover the new scope contracts, construction stages, admission, shutdown, consumer mappings, and architecture boundary. The remaining material gaps are realistic provider/process/browser journeys whose reusable durable owners already exist; current execution will use temporary system harnessing rather than add a private-external-fixture dependency.

## Durable Coverage To Update

None planned. Any failure that shows a current assertion is stale will pause execution and update this investigation before an edit.

## Durable Coverage To Remove

None planned.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm install --frozen-lockfile`, shared prerequisite builds, server build-config TypeScript, and full server build | workspace | reproducible current tree and exact generated-contract prerequisites | Pass | `evidence/api-e2e/api-rev-001-environment-build.log` |
| 2 | architecture + execution-scope + shutdown-coordinator + platform-runtime-isolation + lifecycle selection | server | changed owner, construction unwind, quiescence, exact close, AFB separation | Pass — 5 files / 37 tests | `evidence/api-e2e/api-rev-001-scope-core.log` |
| 3 | complete 16-file affected selection from IR-002 | server | every changed consumer and directly affected integration | Pass — 16 files / 90 tests after the documented Brief package build prerequisite | `evidence/api-e2e/api-rev-001-affected-server.log` |
| 4 | standalone/application transports, Agent Tools MCP, task delegation, hierarchical configuration, and nested history E2E | server | selected-host routes, scoped sessions/publication, nested identity/task/history and restart | Pass — 11 files / 48 tests | `evidence/api-e2e/api-rev-001-retained-server.log` |
| 5 | `pnpm test:e2e` | workspace | broad current repository characterization | Command Fail — 44 files / 174 tests passed; 11 files / 19 tests failed in the broad run. Isolated reruns left 10 files failing and made the token-usage file pass. No failing path intersects this ticket's diff; every isolated failure follows the already separated historical `APIE2E-REPO-005` stale/broad-fixture area and is not current-ticket Pass evidence. | `evidence/api-e2e/api-rev-001-deterministic-e2e.log`, `api-rev-001-broad-failures-isolated.log`, `api-rev-001-broad-failure-scope-correlation.log` |
| 6 | devkit full test command; Brief/Socratic build, validate, and backend typecheck | workspace/apps | canonical command/package/watch behavior | Pass — devkit 21/21; both maintained app build/validate/typecheck paths pass | `evidence/api-e2e/api-rev-001-devkit-tests.log`, `api-rev-001-app-builds.log` |

## Post-Repository Confidence Scorecard

The changed and retained valid matrix passed. The broad repository command also exposed the separately characterized historical `APIE2E-REPO-005` stale-fixture area; those command failures are retained transparently but have no changed-path or supported behavioral connection to this ticket. Browser/live execution remained required because repository coverage could not directly prove the real composition, provider, worker, iframe, or process boundaries.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 94% | all 37 changed-core, 90 affected, and 48 retained tests passed | real dual-host/provider journeys still indirect | run the selected live/browser matrix |
| Changed-boundary execution directness | 99% | exact scope, construction-unwind, immutable-capability, lifecycle, and architecture owners executed | negligible live composition gap | real host construction |
| Cross-boundary integration realism and mock gap | 91% | REST/WS/worker/MCP/task/history integrations passed | provider and iframe paths still partially mocked | real Codex and browser journeys |
| Environment, configuration, identity, and fixture fidelity | 92% | frozen install, real builds, real SQLite integrations and package validation passed | isolated credentialed runtime not yet materialized | import into isolated roots and run live |
| Failure, edge-case, lifecycle, and recovery evidence | 96% | construction unwind, quiescence, close aggregation, session revocation, and nested restart passed | active real-process close/restart still missing | stop/restart live hosts |
| User-surface, browser, and desktop-shell confidence | 78% | no frontend contract delta and repository application tests pass | no current browser journey yet; Electron shell deferred | installed Chrome dual-host execution |
| Durable regression coverage quality and relevance | 96% | reviewed exact durable coverage is strong and all current relevant selections pass | broad stale-fixture debt remains separately characterized | no ticket-local durable edit needed |

- Overall post-repository confidence: 92% (rounded simple average)
- Calculation method: simple average of seven applicable categories
- Every critical acceptance criterion directly proven: No — AC-001/002/008/009 still required live dual-host evidence
- Any applicable category below `90%`: Yes — user-surface/browser at 78%
- Default clean-confidence target of `95%` met: No
- Material residual risks: real scope identity continuity under provider-backed load; application/general separation; session/publication routing; reentry and active shutdown.

## Broader Validation Decision

- Decision: `Required`
- Selected execution mode: Browser + Live API + Lifecycle + real provider/task execution
- Specific confidence gap: repository tests cannot alone prove real Codex/AutoByteus backends, process-owned/application-scoped session separation, application iframe streams, publication delivery, same-data restart, or active graph cleanup.
- Why this can materially improve confidence: these modes cross the exact composition, process, worker, session, provider, persistence, and UI boundaries moved or depended on by the refactor.
- Expected confidence after validation: at least 95% with no category below 90% if all critical scenarios pass.
- Browser-specific decision: required for web-equivalent application UI/iframe/remount behavior; Electron shell is unchanged and remains delivery-owned.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron wrapping the same Nuxt/HTTP/WS application surface.
- Relevant instructions: root and `autobyteus-web/README.md` browser development and Electron E2E sections.
- Web-equivalent behavior: application list/setup, iframe mount, stream/projection/remount.
- Shell-specific behavior: preload/IPC/window/packaging is unchanged by this backend refactor.
- Chosen approach: installed Chrome against isolated real Studio/standalone hosts; strongest direct web boundary without disrupting the user's desktop app.
- Effect on any already-running desktop application: None; unique ports/data roots and owned processes only.
- Behavior not directly proven: Electron packaging/shell; no material API/E2E confidence penalty because no shell source or contract changed, delivery retains the gate.

## Live Environment And Fixture Plan

- Startup order: build prerequisites -> isolated SQLite/app-data root -> Prisma/current startup -> supported secret import -> Studio backend -> Nuxt -> import both maintained packages and optional Agent packages -> Chrome journeys; standalone uses a separate root/port.
- Environment choices: unique ports; explicit data roots/database URL; inherited conflicting DB/app-data variables removed; installed Chrome; no shared user DB.
- Health checks: HTTP/GraphQL response, application availability/readiness, watcher logs, iframe DOM, run/publication/history queries.
- Seed fixtures: maintained Brief/Socratic packages; public/private Team packages only through public import API; canonical definitions and saved launch profiles through supported product APIs.
- Identities/authentication: current exact binding/member IDs, actual Agent Tools descriptor/bearer, Codex Luna and AutoByteus DeepSeek if available.
- Journeys: Studio two-app isolation, Brief publication/named handoff, Socratic turn, general Classroom/nested task routing alongside application execution, standalone selected-app journey, explicit remount, same-data restart/reentry, active close/restart/session invalidation, package hash parity.
- Evidence: commands/logs, semantic DOM/API JSON, screenshots, process/port state, pre/post hashes, secret-value-free scan.
- Cleanup: terminate API-created runs, close browser/processes, remove only API-owned roots and generated outputs, verify ports free and external package hashes unchanged.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `APIE2E-DUALHOST-001` | current maintained app commands + isolated Studio/standalone + Chrome | real launch/input/stream/projection in both hosts | application/browser durable owners already exist; process orchestration is environment-heavy |
| `APIE2E-SCOPE-IDENTITY-001` | simultaneous general Classroom/nested Team and application runs | canonical definitions shared while mutable run/session/task identities remain isolated | private external packages must not be repository dependencies |
| `APIE2E-PUBLICATION-001` | real Brief Researcher publication, named writer handoff, final projection | actual scoped Agent Tools/session/provider/relay/delivery path | live provider output is nondeterministic and externally billed |
| `APIE2E-REENTRY-001` | same-data restart/remount and retained binding/history | scope-dependent recovery/reentry and persisted state | durable restart/history coverage already exists |
| `APIE2E-SHUTDOWN-001` | active run host stop, old descriptor rejection, restart and port/root audit | quiescence, close, process-owner separation, leak-free cleanup | exact deterministic ordering is already unit-covered; live probe adds realism |
| `APIE2E-PARITY-001` | canonical pre/post SHA-256 manifest | package/source bytes unaffected | evidence is current-build specific, not a code fixture |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Electron shell packaging/IPC | unchanged and delivery-owned | Low | delivery gate |
| deferred application Agent addressing/schema simplification | explicitly out of scope | None for ticket | separate approved ticket only |
| historical `APIE2E-REPO-005` broad-suite stale fixtures | The full command was executed for characterization: 10 files remained failing in isolation, none intersects this ticket's changed paths, and their assertions still follow the separately recorded definition-authority/session/history/workspace fixture debt. | No supported current-ticket attribution; repository-wide green remains separately unavailable | keep separate; do not modify these tests or broaden this ticket without independent origin evidence |

## Ambiguities Or Reroute Triggers

None at investigation time.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No` planned
- Post-repository confidence: 92%
- Broader validation decision: Required
- Reroute Required Before Validation Execution: No
- Recommended Recipient If Reroute Required: N/A
- Notes: live/browser validation completed after the repository gate and is recorded authoritatively in `api-e2e-execution-coverage-report.md`; no repository-resident durable coverage changed.
