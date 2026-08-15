# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-universal-task-delegation/tickets/in-progress/agent-team-universal-task-delegation/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-universal-task-delegation/tickets/in-progress/agent-team-universal-task-delegation/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-universal-task-delegation/tickets/in-progress/agent-team-universal-task-delegation/design-spec.md`
- Supplemental Task Artifacts: `solution-self-validation.md`, `universal-task-delegation-behavior-contract.md`, `task-delegation-interaction-contract.md`, `agent-team-collaboration-system-instruction.md`, `team-execution-ownership-analysis.md`, `team-run-persistence-architecture-contract.md`, `team-execution-tree-ui-ux-spec.md`, `team-run-management-contract.md`, `execution-model-visualization.html`, and the five normative `persistence-scenarios/` directories in this ticket.
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-universal-task-delegation/tickets/in-progress/agent-team-universal-task-delegation/solution-revision-record.md` (`SR-009` current)
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-universal-task-delegation/tickets/in-progress/agent-team-universal-task-delegation/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-universal-task-delegation/tickets/in-progress/agent-team-universal-task-delegation/architecture-review-revision-record.md` (`ARCH-REV-005` current)
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-universal-task-delegation/tickets/in-progress/agent-team-universal-task-delegation/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-universal-task-delegation/tickets/in-progress/agent-team-universal-task-delegation/implementation-revision-record.md` (`IR-007` current)
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-universal-task-delegation/tickets/in-progress/agent-team-universal-task-delegation/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-universal-task-delegation/tickets/in-progress/agent-team-universal-task-delegation/code-review-revision-record.md` (`CRR-010` current)
- Delivery Revision Record: `N/A`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-universal-task-delegation/tickets/in-progress/agent-team-universal-task-delegation/api-e2e-revision-record.md` (`API-REV-001` through `API-REV-004` historical; `API-REV-005` in progress)
- Current API/E2E Revision ID: `API-REV-005`
- Current Investigation Round: `5`
- Trigger: `CRR-013 Pass / 9.3`; IR-008 source-resolves API-F-005 and IR-009 closes cleanup-only CR-F-012; resume complete cumulative SR-009 validation.
- User execution directive: all `UC-001–UC-021` and `AC-001–AC-056` require explicit validation accounting. Real Agent and AgentTeam execution must use the maintained classroom and nested-classroom packages from `/Users/normy/autobyteus_org/autobyteus-agents`; credentials may be imported from `/Users/normy/.autobyteus/server-data/.env` only into the checked disposable database/vault.
- Prior Investigation Reviewed: `API-REV-004 Fail / 80.1%; API-UTD-STARTUP-005 must be rechecked first.`
- Latest Authoritative Investigation: this file, initialized before API/E2E-owned durable edits, test execution, database setup, provider launch, or browser launch.
- Reviewed repository state: worktree HEAD `8a0494e8b55a3debc7acbee7b61d286d5311d1a8`, with CRR-010 review-passed cumulative SR-009 implementation and the preserved intentionally dirty durable-test package.

### API-REV-002 Resumption After CRR-008

- CRR-008 independently resolves API-F-002/API-F-003 and establishes IR-006 source readiness. The post-fix focused migration selection passes `5 files / 24 tests`, and the clean exact affected server selection now passes `112 files / 501 tests`.
- The resumed frontend selection identifies two bounded stale durable seams rather than a production contradiction:
  - `toolLifecycleParsers.spec.ts` imports removed `parseToolApprovalTarget`. Standalone lifecycle projection intentionally owns no Team approval target, while exact Team execution-address approval routing is exercised by `TeamStreamingService.execution-address.spec.ts`. Decision: remove the deleted-function assertions and retain explicit proof that legacy selector fields do not create a standalone approval target.
  - `AgentStreamingService.spec.ts` asserts removed `AgentContext.isSubscribed` state even though `AgentStreamingService.connectionState/isReady` is the current transport authority, and its `SEGMENT_END` fixture carries the retired `segment_type` field rejected by the exact canonical boundary. Decision: replace subscription assertions with current transport-readiness/status-preservation proof and currentize the exact end payload; do not add compatibility fields or restore the deleted context flag.
- These decisions were recorded before the bounded durable edits below. They preserve strict current boundaries and do not change product source.
- The resumed frontend import audit also finds `currentTaskExecutionFixture.ts`, `teamStreamMemberContextResolver.spec.ts`, `teamTaskTeamExecutionProjection.spec.ts`, and the old `TeamStreamingService` suites manufacturing the removed four-field `TeamExecutionAddress` and driving deleted `TeamExecutionState`/snapshot owners. Decision: remove the three test-only obsolete owner fixtures/suites; rewrite the retained Team streaming coverage against exact current `agent_run_id` commands and `TeamExecutionViewState` effects. Nested task-Agent/task-Team materialization, exact parentage, settlement/focus repair, sequence gaps, and persistent non-substitution remain durably owned by `teamExecutionViewState.spec.ts` and will be expanded where an actual gap is found.

## Current Requirement And Design Basis

The required behavior is the approved universal same-root delegation model in R-001–R-048 and AC-001–AC-056. One public `RootTeamRun` owns exact logical resolution, one private task-command FIFO, authoritative task state, the root execution index, and the persistence coordinator. Any mounted non-root Agent or AgentTeam may be targeted by a canonical absolute address. The concrete host is selected deterministically from the caller's actual TeamRun ancestry and configured-member descent; no sibling/global search, adjacency rule, inferred chain, or fallback is allowed.

Every successful delegation produces a fresh AgentRun or TeamRun subtree, returns the exact assignee/coordinator AgentRun ID, persists one exact task execution reference, and keeps logical placement separate from concrete run identity. Submit/review/message authorization uses exact AgentRun IDs and current root state. Same-root messages reserve the receiver's existing FIFO before one sealed append plan is durably committed. Task lifecycle, reversible quiescence, activation, settlement, restart repair, and persistence fail-stop obey the phase-aware `not_renamed` / `renamed_finalization_indeterminate` / `committed` contract.

The current Team runtime has exactly three JSON authorities: `team_run_execution_tree.json`, `task_delegation_records.json`, and `team_communication_messages.json`. Runtime readers are target-only. Predecessor Team/task/message/token/external data is transformed only by the isolated, root-independent, retryable migration; invalid roots are preserved and excluded without teaching runtime code compatibility. Application V5 data is discard/rebuild, while V6 run-ID contracts are current.

One frontend aggregate/reducer projects the same initial/live exact execution, task, message, status, focus, history, timeline, and cleanup model. Active Agent and AgentTeam tasks render as distinct `Task: <description prefix>` rows under truthful logical placement, with exact AgentRun/TeamRun selection and without persistent substitution or ordinary run-ID display.

CRR-003 establishes source readiness, not API/E2E acceptance. It directly re-proved 5 files / 38 tests around AgentRun reservations, task queueing, current task invariants, message append plans, and persistence fail-stop. It explicitly leaves broad durable validity, provider/runtime, restart/reopen, migration, API, and populated responsive UI proof to this stage.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| R-001–R-016, AC-001–AC-018 | Changed | SR-009 requirements, universal behavior contract, ownership design | Exercise absolute target matrix, exact caller/host selection, fresh task Agent/Team identity, queue ordering, submit/review/settlement, and nested/cross-branch behavior. |
| R-019, R-037, R-040, AC-027, AC-037, AC-042 | Changed | persistence architecture; IR-002–IR-003; CRR-003 | Directly prove phase-aware write results, hidden indeterminate preparation/reservation, fail-stop before later physical work, reversible quiescence, and no replay/retry. |
| R-032–R-045, AC-033–AC-050 | Changed / Removed | exact three-file clean cut; migration design | Validate all 15 normative files, strict schemas/correlation, restart repair, isolated migration, token transaction rollback, target-only runtime, and absence of legacy runtime selectors. |
| R-015–R-016, R-047, AC-018, AC-039–AC-041, AC-052–AC-054 | Changed | UI/UX spec and frontend aggregate design | Revalidate restore/live parity, sequence-gap refresh, task rows, nested task Team expansion, exact focus, status, history, and settlement cleanup in repository and browser. |
| R-014, R-019–R-021 | Changed / Preserved | exact collaboration instruction and provider-neutral seams | Prove identical AutoByteus/Codex/Claude identity/tool behavior and imported nested-classroom execution using disposable state. |
| R-017, R-024, R-045, AC-024, AC-050, AC-056 | Removed | clean-removal requirements and CRR-003 static audit | Reject stale tests that only protect composite addresses, member paths/route keys, adjacency, per-Team ledgers, legacy readers, or old frontend materializers. |
| CR-F-005 | Changed | IR-003 / CRR-003 | Recheck two-terminal-task fail-stop so task B cannot prepare/write/publish/teardown and task A cannot retry after an indeterminate physical commit. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | root resolver/index, task service/FIFO, local Team manager, AgentRun reservation/quiescence | focused units and new current invariant tests | complete target/host/caller/lifecycle matrix and real provider execution | Integration + live API |
| API / transport / contract | Yes | GraphQL/WS/projectors use logical address plus exact run IDs | existing integration/E2E suites, not yet adjudicated | legacy fixtures may bypass or assert removed DTOs | Currentize API/integration tests + live WebSocket/browser |
| Frontend component / state | Yes | one `TeamExecutionViewState` aggregate and current selectors | new aggregate spec plus existing component/store tests | populated live/restore parity, sequence races, exact focus and nested rows | Nuxt tests + browser |
| Browser integration / user journey | Yes | Team navigation, task rows, messages, history, mobile | existing component tests; no current SR-009 browser result | real stream/API integration and responsive behavior | Browser (desktop and mobile viewport) |
| Authentication / session / permissions | No material change | provider credentials only | live harness and secret vault | credential fidelity must be isolated | disposable secret import/preflight |
| Desktop renderer / web-equivalent UI | Yes | Electron renderer is Nuxt web-equivalent for this scope | Nuxt/component coverage | real renderer journey | browser-preferred validation |
| Desktop shell / Electron-specific integration | No | no preload/IPC/window/package change identified | Electron shell tests exist | none material to task delegation | not required unless browser cannot exercise behavior |
| Process / lifecycle | Yes | startup migration, strict reopen/repair, shutdown, fail-stop | unit migration/reopen/persistence tests | actual process restart and listen gating | checked disposable server lifecycle |
| Persisted-data transition | Yes | predecessor V3 to exact V1 three-file package; token/external correlation; V5 application discard/rebuild | normative fixtures and new migration/schema/token tests | actual disposable migration/startup/reopen | integration + checked disposable lifecycle |
| Worker / queue / distributed coordination | Yes | one in-process task FIFO and one root physical commit lock | queue/persistence units | real overlapping operations across API/provider events | concurrent API/lifecycle probe |
| External integration | Yes | AutoByteus, Codex, Claude provider seams; external-channel identity | capability-gated E2Es | provider/runtime execution is explicitly required | live provider matrix |

## Project Execution Discovery

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-universal-task-delegation`
- Project type and runtime stack: pnpm TypeScript monorepo; Node server with Vitest/GraphQL/WebSocket/SQLite/Prisma; Nuxt/Vue/Pinia frontend embedded in Electron; browser-preferred renderer validation.
- Conflicting, missing, or unclear project instructions: none material. The large reviewed implementation remains a dirty worktree, so inventory and evidence must use the actual worktree rather than a commit diff alone.
- Required environment variables or secrets available: user authorized importing `/Users/normy/.autobyteus/server-data/.env` only through the repository secret importer into an explicit disposable test database. Secret values will never be printed or copied into evidence.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-server-ts/AGENTS.md` | server tests | Use `pnpm -C autobyteus-server-ts exec vitest run ... --no-watch`; never watch mode. |
| `autobyteus-web/AGENTS.md` | web tests | Use `pnpm -C autobyteus-web test:nuxt ... --run`; browser preferred for renderer behavior; no release action. |
| `autobyteus-server-ts/package.json` | production verification | `pnpm -C autobyteus-server-ts build:full`; production TypeScript is part of this build. |
| `autobyteus-web/package.json` | frontend verification | `pnpm -C autobyteus-web build`; focused Nuxt tests via `test:nuxt --run`. |
| `test-support/live-e2e/test-runtime-bootstrap.mjs` | checked runtime boundary | Sanitizes inherited environment, confines SQLite below `autobyteus-server-ts/db`, materializes an exact runtime `.env`, uses loopback ports, starts built server, and exposes owned cleanup. |
| `test-support/live-e2e/run-live-e2e.mjs` | live preflight/provider runner | Starts only through `startBuiltTestServer`, passes explicit disposable URL/runtime variables, scans evidence, and verifies the tracked test environment is unchanged. |
| root `package.json` / server README | secret import | Build then invoke `pnpm secrets:import -- --source /absolute/path --database-url file:/absolute/disposable.db`; target must be explicitly disposable and verified before import. |
| incident disclosure | safety authority | Preserve `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-universal-task-delegation/tickets/in-progress/agent-team-universal-task-delegation/implementation-evidence/operational-production-db-reset-incident.md`; do not inspect, target, repair, copy, reset, or roll back operational data. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| repository server checks | worktree | focused `pnpm -C autobyteus-server-ts exec vitest run ... --no-watch`, then `build:full` | explicit `DATABASE_URL`/`DATABASE_URL_TEST` for any DB command | exit code/log | process exits |
| repository web checks | worktree | `pnpm -C autobyteus-web test:nuxt <selection> --run`, then `pnpm -C autobyteus-web build` | no server required for component state checks | exit code/log | process exits |
| disposable server | worktree | `startBuiltTestServer()` through checked launcher | dynamically reserved loopback port; DB confined under server `db`; runtime under `tests/.tmp` | launcher listen marker plus exact PID/path verification | launcher `stop()`, then owned runtime cleanup |
| disposable frontend | `autobyteus-web` | `BACKEND_NODE_BASE_URL=<owned-loopback-url> pnpm dev --host 127.0.0.1 --port <owned-port>` | must not use protected 31004 | HTTP readiness | terminate only owned PID |
| providers | checked server | repository live harness / exact scenario runner | credentials imported from authorized source into disposable vault only | capability/model/provider checks | stop owned server; remove owned runtime/database after evidence |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| 15 normative JSON examples | ticket `persistence-scenarios/` | read-only source fixtures | retain |
| repository test database | explicit file URL under `autobyteus-server-ts/db` | never allow ambient DB variables | remove only API/E2E-owned files |
| provider secrets | root `secrets:import` from user-authorized `.env` to exact disposable DB | preflight exact path; never print values; never target `$HOME/.autobyteus` | remove disposable DB/vault only |
| imported nested classroom | maintained Agent package `/Users/normy/autobyteus_org/autobyteus-agents` through product import/setup path | do not mutate unrelated agent packages; test-specific copied/imported state only | remove disposable runtime state |
| task identities | public API/provider execution | assert root ID, canonical address, AgentRun/TeamRun IDs and exact task/message correlations | persisted evidence in ticket only; runtime removed |

## Persisted Data Transition Coverage Basis

- Approved decision: `Migration Required` for framework Team/history/task/communication/token/external data; `Directly Usable — No Migration` for physical Agent memory directories; `Discard or Rebuild` for application catalog/bundles; a supported Team history's single application binding is preserved.
- Design/implementation references: requirements `Persisted Data Outcome`, design migration slices, `team-run-persistence-architecture-contract.md`, and implementation-handoff `Persisted Data Transition Check`.
- Representative setup: the five normative scenario directories plus predecessor root/task/message/token/external fixtures, incomplete target residue, ambiguous correlation, already-current target, and stale nonterminal restart state.
- Planned evidence: strict validation of all 15 target JSON files; root-isolated migration admission/exclusion; protected backup and idempotent retry; full token transaction rollback; startup completion before listen; strict current package admission; restart interrupt/settle exactly once; no communication replay.
- Migration recovery: `not_renamed`, post-rename indeterminate, incomplete creation, ambiguous root, independent valid root, later retry, and already-valid target skip.
- Upstream ambiguity or reroute required: none.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / AC | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| five CRR-003 focused files (`agent-run`, task queue/invariants, persistence coordinator, message append plan) | reservation/quiescence, FIFO, lifecycle, physical fail-stop | R-007, R-019, R-037, R-040; AC-027/037/042 | Still Valid | CRR-003 38/38; assertions match SR-009 | rerun first and retain |
| new `team-run-v1-package-schema.test.ts` + 15 ticket JSON fixtures | strict exact three-file schema | R-032–R-039; AC-033–AC-038 | Still Valid | new tests explicitly enumerate fixtures/unknown-field rejection | run and retain |
| new migration/token/writer tests | isolated migration, phase writer, token transaction rollback | R-040–R-045; AC-042–AC-050 | Still Valid | scenarios match approved transition | run, then broaden to integration/startup |
| `current-team-run-fixtures.ts`, logical-address, prompt/provider parity tests | current rooted config, canonical absolute addresses, identical provider instruction | R-001–R-006, R-014; AC-001–AC-007, AC-019–AC-021 | Still Valid pending execution | changed fixtures align with current names | run and audit no legacy selector |
| deleted `sub-team-active-run-directory.test.ts` | task-specific active-run directory | R-017, AC-024/050/056 | Stale / Remove | owner is explicitly removed by approved architecture | replacement: root index/current task invariant coverage |
| deleted `teamExecutionState.task-lifecycle.spec.ts` | retired frontend state/materializer | R-015–R-016, AC-039–AC-041 | Replace | approved single `TeamExecutionViewState` owner | replacement: new `teamExecutionViewState.spec.ts` plus component/browser proof |
| `teamExecutionViewState.spec.ts` | fresh task-Team/task-Agent identity, accepted-before-settlement, exact cleanup/focus, gap rejection | R-015–R-016, R-047; AC-018/039–041/052–054 | Still Valid | assertions match approved aggregate | run and retain; extend only if actual integration gaps remain |
| current server Team execution integration suites | real manager/run/service/task/API boundaries | R-001–R-016, R-048; AC-001–AC-018/055 | Needs Update | broad static scan shows pre-clean-cut symbol/fixture residue in surrounding suites | run focused selection, classify each failure against current contract, currentize rather than add compatibility |
| current runtime E2Es (`mixed-task-delegation`, `nested-mixed-team`, provider Team roundtrips, all-runtime send matrix) | real provider/runtime Team flows | R-019–R-021; AC-019–AC-032 | Needs Update | capability-gated and some files retain `memberPath`/`memberRouteKey`/composite expectations | currentize supported seams and use checked disposable execution |
| token/runtime GraphQL E2Es using `TeamExecutionAddress`, `taskTeamRunIds`, `memberRouteKey`, or `memberPath` as current input | old composite identity projection | R-017, R-034, R-045; AC-024/050 | Needs Update / Replace | static scan identifies old current-contract builders | preserve historical migration-only evidence; rewrite current-runtime scenarios to exact run IDs or remove duplicate obsolete cases |
| current GraphQL/run-history/application/external integration/E2E suites | DTO, V6 application, exact history and external correlations | R-016, R-030, R-042–R-046 | Needs Update | likely broad clean-cut impact; not covered by CRR focused units | run affected selections and currentize current-only contracts |
| frontend Team aggregate/store/component/history/mobile suites | restore/live selection, messages, task navigation, mobile | R-015–R-016, R-047 | Needs Update | only new aggregate spec has direct current evidence; surrounding tests may construct removed state/composite models | run current relevant selection; update fixtures to real aggregate and exact run IDs |
| Electron shell browser tests | shell-owned browser IPC/runtime | no changed shell boundary | Out Of Scope | changed UX is web-equivalent renderer state | browser Nuxt journey is preferred; no actual Electron launch planned |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/agent-team-execution/sub-team-active-run-directory.test.ts` | task-Team-specific active-run directory | task-specific directory and composite routing are prohibited | R-017/R-048; AC-024/050/055/056 | task root index, current invariants, manager/root routing coverage | N/A |
| `autobyteus-web/services/teamExecution/__tests__/teamExecutionState.task-lifecycle.spec.ts` | old `teamExecutionState` lifecycle materialization | one aggregate/reducer is authoritative | R-015/R-016; AC-039–041 | `teamExecutionViewState.spec.ts` and affected component/browser selection | N/A |
| current-runtime assertions for `TeamExecutionAddress`, task-Team chains, member route/path keys | composite/parallel runtime identity | only logical address + intrinsic run IDs are current; historical fields are migration-only | R-017/R-034/R-045; AC-024/050 | exact AgentRun/TeamRun API/projection tests; migration tests may retain historical fixtures | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / AC | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| API-UTD-001 | universal target/host/caller matrix through current root authority | R-001–R-012; AC-001–AC-018 | existing current integration suite or one new focused integration test after gap audit | unit invariants do not prove real manager/index/API composition |
| API-UTD-002 | exact GraphQL/WS initial/live projection and frontend aggregate admission | R-015–R-016; AC-018/039/040 | current server integration + web service/store tests | shared DTO/reducer parity is critical and cross-boundary |
| API-UTD-003 | restart repair and migration lifecycle through built disposable server | R-041–R-045; AC-043–AC-050 | current startup E2E/integration tests, adding only missing current seams | unit-only migration evidence cannot prove listen gating/catalog exposure |
| API-UTD-004 | exact same-root message reservation/commit/delivery and no replay | R-029–R-031/R-037; AC-029–AC-032/037 | current API/integration/provider suite | cross-owner behavior needs executable integration |
| API-UTD-005 | task row/nested Team expansion/exact focus/settlement cleanup desktop + mobile | R-047; AC-052–AC-054 | current Nuxt component/store tests; browser journey for realism | user-visible tree is critical |
| API-UTD-006 | imported nested-classroom AutoByteus/Codex/Claude real runtime | R-019–R-021; AC-019–AC-032 | existing capability-gated live E2Es plus retained runtime evidence; durable changes only where current contract is stale | explicit acceptance requirement |
| API-UTD-010 | complete UC/AC accounting matrix | UC-001–UC-021; AC-001–AC-056 | execution report matrix backed by durable scenario IDs and retained evidence | the user explicitly requires complete rather than sampled refactor acceptance |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / AC | Notes |
| --- | --- | --- | --- | --- |
| API-UTD-007 | affected server integration/E2E fixtures | replace removed composite/member-path fields with logical address and exact run IDs; route through current root owner | R-017/R-034/R-045; AC-024/050 | do not restore compatibility APIs |
| API-UTD-008 | affected frontend Team/history/mobile fixtures | construct actual current aggregate/snapshot DTO and select by AgentRun/TeamRun IDs | R-015/R-016/R-047; AC-039/040/052–054 | no serialized composite-key substitute |
| API-UTD-009 | runtime/provider tests | remove adjacency/relative assumptions and assert universal absolute address, fresh run identity, and exact result | R-001–R-014/R-025–R-031 | real provider call election is observed separately from deterministic capability/routing |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / AC | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| `sub-team-active-run-directory.test.ts` | removed production owner and forbidden architecture | R-017/R-048; AC-024/050/056 | root index/current invariant coverage |
| `teamExecutionState.task-lifecycle.spec.ts` | replaced frontend owner | R-015/R-016; AC-039–041 | `teamExecutionViewState.spec.ts` |
| any duplicate current-runtime-only composite identity assertion found during execution | protects rejected compatibility rather than current behavior | R-017/R-045; AC-024/050 | exact run-ID scenario or explicit no-replacement if already covered |

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | focused CRR-003 five-file Vitest selection | worktree; repository test DB only | fail-stop, FIFO, reservation, settlement | Pass — 5 files / 38 tests | `api-e2e-evidence/api-rev-001/repository/crr003-focused-current.log` |
| 2 | new strict package/writer/migration/token focused selection | repository test DB only | AC-033–AC-050 | Pass — 4 files / 12 tests | `api-e2e-evidence/api-rev-001/repository/strict-package-migration-token.log` |
| 3 | affected server unit/integration/API selection after validity edits | repository test DB only | universal delegation, routing, persistence, GraphQL/WS | Partial: current core 7/17, AgentTeam unit 28/87, memory 4/10, run history 4/18, streaming 3/10, AgentTeam integration 7/35 all Pass; broad selection 101 files / 471 tests Pass with 11 stale-or-invalid files / 30 tests failing | `api-e2e-evidence/api-rev-001/repository/currentized-core-round1.log`; `server-agent-team-unit-current.log`; `currentized-memory-final.log`; `currentized-run-history-final.log`; `server-agent-team-integration-current.log`; `server-affected-units-broad-round1.log` |
| 4 | affected Nuxt aggregate/component/store/history/mobile selection | `autobyteus-web`, `--run` | UI restore/live/navigation exactness | Planned | ticket evidence directory |
| 5 | `pnpm -C autobyteus-server-ts build:full` | sanitized environment | production TypeScript/build/bootstrap | Planned | ticket evidence directory |
| 6 | `pnpm -C autobyteus-web build` | standard production build | Nuxt production bundle/prerender | Planned | ticket evidence directory |
| 7 | current migration/startup/reopen E2Es | checked disposable SQLite only | lifecycle/listen/catalog/migration boundaries | Planned | ticket evidence directory |

### Initial Repository Evidence And Revised Validity Decisions

The pre-edit executions changed the coverage decision materially:

- The CRR-003 focused current selection passes `5 files / 38 tests`; the strict package/writer/migration/token selection passes `4 files / 12 tests`; and the new frontend aggregate passes `1 file / 3 tests`.
- The broader server `tests/unit/agent-team-execution` selection is not maintained against the clean cut: `36 files failed / 8 passed`; 29 failing files cannot even load because they import production owners explicitly deleted by R-017/R-048, and 7 current-subject files retain retired constructor/identity/output seams.
- The initial relevant Nuxt selection is likewise not maintained: `23 files failed / 22 passed`, with 6 assertion failures and 17 suites importing deleted TeamExecutionAddress, task/message stores, run-history materializers, or other retired projection owners.
- A static relative-import audit (with `.js`-to-`.ts` resolution) found 179 missing test imports repository-wide and 57 files in directly relevant Team/history/token/application/external surfaces. This is test-suite staleness, not implementation failure: the production build and source review intentionally removed these owners.
- Current-runtime prohibited-symbol search is intentionally a triage input, not a blanket deletion rule. Historical migration fixtures may retain predecessor names; current API/runtime/frontend tests may not.
- The first API/E2E-currentized core selection passes `7 files / 17 tests`; it directly covers current TeamRun dispatch/status/settlement boundaries, exact current manager lifecycle, logical-plus-intrinsic intent identity, current reference projection, input events, and mixed runtime context construction.

Evidence:

- `api-e2e-evidence/api-rev-001/repository/crr003-focused-current.log`
- `api-e2e-evidence/api-rev-001/repository/strict-package-migration-token.log`
- `api-e2e-evidence/api-rev-001/repository/web-team-execution-view-state.log`
- `api-e2e-evidence/api-rev-001/repository/server-agent-team-unit-initial.log`
- `api-e2e-evidence/api-rev-001/repository/web-team-current-initial.log`
- `api-e2e-evidence/api-rev-001/investigation/missing-relative-test-imports.log`
- `api-e2e-evidence/api-rev-001/investigation/prohibited-test-symbols.log`
- `api-e2e-evidence/api-rev-001/repository/currentized-core-round1.log`

Before any deletion, the following additional decisions are now recorded:

| Coverage Group | Validity Decision | Obsolete Assertion / Current Replacement | Action |
| --- | --- | --- | --- |
| tests whose subject is a deleted task directory, per-Team ledger/store, activation barrier, target mapper, settlement coordinator, route-key conversation router, task-Team instance/chain, old metadata service/store/mapper, or old frontend task/message/run-history store/materializer | Stale / Remove | These protect the exact parallel owners and composite identities prohibited by R-017, R-032–R-048 and AC-024/050/055/056. Current replacements are `RootTeamRun`, `TaskDelegationService`, `TeamExecutionIndex`, `TeamRunResolver`, `TeamRunPersistenceCoordinator`, strict V1 package/projector services, and `TeamExecutionViewState`. | Remove obsolete files after listing the final exact path inventory; rely on/extend replacement-owner tests rather than recreating compatibility seams. |
| tests of still-existing `TeamRun`, `MemberCommandStatusOverlayStore`, `MixedTeamRunBackendFactory`, current reference-content service, current input-event builder, current intent builder, current Agent streaming service, and current UI components | Needs Update | Scenario intent remains current, but setup/assertions use old constructors, route keys, instance wrappers, store fields, or removed parser helpers. | Update to exact `teamRunId`/`agentRunId`/`memberAddress`, current binding/snapshot, current public owner, and current wire shapes. |
| old integration/E2E suites that combine deleted owners and pre-clean-cut contracts | Replace | A partial fixture edit would still bypass the new root/persistence/index boundary. | Replace with lifecycle-faithful current integration/API cases; retain provider-specific outer journeys only after their setup reaches current public APIs. |
| migration-only predecessor fixtures containing old field names | Still Valid only inside isolated migration scope | R-042–R-045 require historical evidence at the migration boundary. | Retain only where the test imports current migration owner and proves transformation/exclusion; remove dependencies on deleted runtime migrations/readers. |

### Exact Stale-Removal Inventory Before Deletion

The following repository tests import a deleted production owner as their subject, or exclusively assert a prohibited pre-clean-cut runtime identity. They are therefore `Stale / Remove`; this list is recorded before deletion. Current replacement evidence is the RootTeamRun / TaskDelegationService / TeamExecutionIndex / V1 package / TeamExecutionViewState coverage identified below. No production compatibility API will be restored for them.

| Exact Path | Deleted / Obsolete Subject | Replacement Evidence |
| --- | --- | --- |
| `autobyteus-server-ts/tests/unit/agent-team-execution/backends/mixed/conversation-target/mixed-conversation-target-router.test.ts` | route-key/adjacency conversation target router | current absolute `TeamRecipientResolver` plus root message-delivery matrix |
| `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-task-team-member-handle-termination.test.ts` | deleted task-Team instance handle/directory | RootTeamRun task subtree termination/settlement coverage |
| `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-team-event-bridge.test.ts` | deleted task-Team instance/stream-scope bridge | current TeamRun event publisher/execution view projector coverage |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-address-builder.test.ts` | composite `TeamExecutionAddress` builder | canonical absolute logical-address and exact run-ID coverage |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-records-service.test.ts` | deleted per-Team records service/store | `task-delegation-records-v1-store` and strict V1 package coverage |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-reference-file.test.ts` | deleted reference-file owner | current `TaskDelegationReferenceContentService` and reference projection coverage |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-settlement-coordinator.test.ts` | deleted settlement coordinator | TaskDelegationService/RootTeamRun prepared settlement and persistence coordinator coverage |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-target-mapper.test.ts` | composite target mapper | TeamRecipientResolver / TeamExecutionScopeResolver universal matrix |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-service.test.ts` | pre-clean-cut service assembled from deleted activation barrier, task directories, composite address, and per-Team record service | `task-delegation-current-invariants.test.ts`, task FIFO, persistence coordinator, and new root integration matrix |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-team-active-run-directory.test.ts` | deleted task-Team directory and instance identity | TeamExecutionIndex plus current task execution projection |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-team-settlement-coordinator.test.ts` | deleted directory-based settlement owner | RootTeamRun task service and settlement lifecycle coverage |
| `autobyteus-server-ts/tests/unit/agent-team-execution/team-logical-placement-resolver.test.ts` | deleted tree index | current TeamExecutionIndex / TeamRecipientResolver / scope resolver coverage |
| `autobyteus-server-ts/tests/unit/agent-team-execution/team-member-delivery-coordinator.test.ts` | deleted local delivery coordinator/composite address | current root message router, reservation, sealed append-plan coverage |
| `autobyteus-server-ts/tests/unit/agent-team-execution/team-run-launch-identity-assignment.test.ts` | deleted parallel launch-identity owner | current TeamRun/root identity allocation coverage |
| `autobyteus-server-ts/tests/unit/agent-team-execution/team-run-metadata-mapper.test.ts` | deleted metadata mapper/schema | exact `team_run_execution_tree.json` builder/projector coverage |
| `autobyteus-server-ts/tests/unit/agent-team-execution/team-run-runtime-context-support.test.ts` | deleted restore compatibility context builder | current RootTeamRun V1 package restore coverage |
| `autobyteus-server-ts/tests/unit/run-history/team-run-metadata-service.test.ts` | deleted metadata service | current V1 package catalog/loader coverage |
| `autobyteus-server-ts/tests/unit/run-history/services/team-run-metadata-flattener.test.ts` | deleted metadata flattener | current execution-tree projector/catalog coverage |
| `autobyteus-server-ts/tests/unit/run-history/store/team-run-metadata-store.test.ts` | deleted metadata store | current execution-tree store/commit-writer coverage |
| `autobyteus-web/stores/__tests__/runHistoryMetadata.spec.ts` | deleted run-history metadata model | current run-history Team execution rows / `TeamExecutionViewState` coverage |
| `autobyteus-web/stores/__tests__/runHistoryTeamMemberProjectionHydrator.spec.ts` | deleted member hydrator | current aggregate context factory/hydration coverage |
| `autobyteus-web/stores/__tests__/teamCommunicationStore.spec.ts` | deleted separate communication store and composite address | TeamExecutionViewState communication projection plus component/browser coverage |
| `autobyteus-web/utils/__tests__/teamActiveExecutionMembers.spec.ts` | deleted parallel active-member utility and composite DTO | current aggregate selectors and navigation projection coverage |
| `autobyteus-web/utils/__tests__/teamConversationTargetAddress.spec.ts` | deleted conversation-address helper | canonical `AgentTeamAddress` and current conversation selection coverage |
| `autobyteus-server-ts/tests/unit/services/agent-streaming/team-conversation-target-address-parser.test.ts` | deleted route/path/composite conversation-target parser | strict `agent_run_id` Team command parsing plus RootTeamRun exact AgentRun execution |
| `autobyteus-server-ts/tests/unit/services/agent-streaming/team-run-event-websocket-message-mapper.test.ts` | deleted parallel Team event mapper and composite execution address | current `team-execution-view-projector` event coverage |
| `autobyteus-server-ts/tests/unit/services/agent-streaming/team-runtime-snapshot-service.test.ts` | deleted status-only runtime snapshot owner | atomic V1 `TEAM_EXECUTION_VIEW_SNAPSHOT` projection coverage |

The two already-deleted stale tests remain in the cumulative removal inventory: `autobyteus-server-ts/tests/unit/agent-team-execution/sub-team-active-run-directory.test.ts` and `autobyteus-web/services/teamExecution/__tests__/teamExecutionState.task-lifecycle.spec.ts`.

Repository execution will now pause broad reruns while this bounded coverage package is currentized. No production source will be changed to satisfy obsolete tests.

## API-REV-001 Repository Update And Reroute Trigger

Repository execution began only after this investigation existed. Current clean-contract coverage now directly proves the root task/message persistence owners and public task lifecycle, but the broad affected selection exposed one critical production-copy contradiction that must be resolved before live provider/browser work:

- Current deterministic passes: CRR-003 `5 files / 38 tests`; strict package/migration/token `4 / 12`; frontend aggregate `1 / 3`; currentized core `7 / 17`; AgentTeam units `28 / 87`; memory `4 / 10`; run history `4 / 18`; streaming `3 / 10`; current AgentTeam integration `7 / 35`.
- The current AgentTeam integration includes a real `RootTeamRun`, real three-file V1 persistence, delegate -> submit -> revision -> resubmit -> accept, nested task-Agent delegation, fresh task AgentTeam creation, nested child delegation, absolute-address negative cases, references, current WebSocket selection, restore, and all three configured provider kinds.
- The broad affected unit selection completed at `101 files / 471 tests passed` and `11 files / 30 tests failed`. Most failures are already-classified stale test seams (removed identities, old constructors, or retired migration fixtures) and remain API/E2E-owned currentization work.
- **API-F-001 / API-UTD-SCHEMA-001:** `buildDelegateTaskParameterSchema()` still describes `recipient_address` as supporting `immediate-Team-relative ./... syntax` and requiring a `direct child of the caller's immediate Team`. This directly contradicts R-006, R-013, R-014, AC-020, AC-021, the authoritative collaboration instruction, and the same runtime manifest, all of which require one canonical absolute non-root same-root address with universal mounted-target semantics. The schema is used by the AutoByteus tool and the MCP adapters for Codex/Claude, so this is a real provider-facing source boundary, not merely a stale assertion.
- A temporary diagnostic passed by proving the exact contradiction and was removed after execution. Evidence: `api-e2e-evidence/api-rev-001/repository/api-utd-f001-delegate-schema-diagnostic.log`. Static source evidence is `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-parameter-schemas.ts:17` versus `task-delegation-tool-manifest.ts:50`.
- Because AC-021 is critical and currently false, final builds, secret import, checked-disposable server startup, provider execution, and browser/mobile journeys were not started. Continuing them would not allow a truthful Pass and would create evidence against a known invalid public contract.

## API-REV-002 Resumption After CRR-006

- Trigger: CRR-006 Pass / 92.9% at HEAD `8a0494e8b55a3debc7acbee7b61d286d5311d1a8`; CR-F-006/CR-F-007 and API-F-001 are resolved in source/test.
- Prior failure recheck: exact provider/schema/prompt selection passes `6 files / 51 tests` at the current HEAD. The `delegate_task.recipient_address` field now exposes only canonical absolute non-root any-mounted same-root semantics, and shared/native prompt parity remains exact. Evidence: `api-e2e-evidence/api-rev-002/repository/api-f001-postfix-provider-schema-prompt.log`.
- Coverage decision: resume the preserved currentization package. Re-adjudicate the 11 broad non-clean files against the current clean-cut contract, rerun broad repository/build selections, then run the checked-disposable secret/package/provider/browser/lifecycle matrix.
- Safety remains unchanged: no operational database inspection/action; only exact disposable test/runtime targets; no action on protected ports 60004/31004; preserve the incident disclosure.

## Post-Repository Confidence Scorecard

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation |
| --- | ---: | --- | --- | --- |
| Requirement and acceptance-criteria proof | 70% | Direct current lifecycle and strict persistence evidence; API-F-001 precisely maps to R-006/R-013/R-014 and AC-020/021 | one critical public-copy criterion fails; remaining UC/AC matrix incomplete | source fix, then complete mapped execution |
| Changed-boundary execution directness | 85% | real RootTeamRun/current integration and 471 passing broad unit cases | affected API/provider/browser surfaces not completed | current API/build/live rows |
| Cross-boundary integration realism and mock gap | 75% | actual persistence stores, WebSocket boundary, restore, nested Agent/AgentTeam integration | no checked-disposable live provider/browser round | real imported Team matrix |
| Environment, configuration, identity, and fixture fidelity | 65% | repository test DB only; exact current identity fixtures in currentized core | disposable runtime/vault/API-key import not started | checked launcher and exact-path/PID guards |
| Failure, edge-case, lifecycle, and recovery evidence | 82% | fail-stop/FIFO, negative address matrix, revision/settlement/restore deterministic proof | process restart/provider interruption/live cleanup incomplete | lifecycle and restart matrix |
| User-surface, browser, and desktop-shell confidence | 50% | frontend aggregate deterministic coverage only | no browser/mobile run in this round | desktop/mobile browser journeys after fix |
| Durable regression coverage quality and relevance | 72% | substantial clean-contract replacements pass | 11 broad files remain stale/non-maintained; cumulative durable package not review-ready | finish currentization and proportional review |

- Overall post-repository confidence: `71.3%` (simple average, one decimal).
- Every critical acceptance criterion directly proven: `No — AC-021 currently fails at the provider-facing delegate_task schema.`
- Default clean-confidence target met: `No`.
- Material residual risks: API-F-001; incomplete currentization of 11 broad test files; unexecuted builds, checked-disposable server, real providers, browser/mobile, restart/cleanup, and full UC/AC mapping.

## Broader Validation Decision

- Decision: `Required`
- Selected execution mode: `Live API + Lifecycle + Browser`
- Specific gap: R-021 explicitly requires AutoByteus/Codex/Claude imported nested-classroom validation; the source review did not run providers, startup/reopen, or populated desktop/mobile UI.
- Expected confidence after selected validation: at least 95%, with every applicable category at least 90%, if all critical rows pass.
- Browser rationale: task tree, exact focus, nested Team expansion, restored/live state, message visibility, and responsive behavior are web-equivalent Electron renderer concerns and materially require real frontend/backend execution. Actual Electron is not needed because no shell boundary changed.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron wrapping Nuxt.
- Web-equivalent behavior: Team workspace, task rows, messages, selection, restore/live updates, desktop/mobile responsive UI.
- Shell-specific behavior: none changed.
- Chosen approach: real browser against owned disposable server/frontend; repository Electron tests only if evidence unexpectedly implicates shell behavior.
- Effect on already-running desktop/application: none. Protected `127.0.0.1:60004` / `127.0.0.1:31004` will not be stopped, repointed, or mutated.

## Live Environment And Fixture Plan

- Startup order: build server; create unique runtime/DB below allowed test roots; materialize checked runtime; prove ambient DB variables absent; run migrations/import secrets only against exact disposable target; start server; verify listen and PID database path; start frontend on dynamically chosen nonprotected loopback port; import maintained classroom package through public product path.
- Environment choices: checked launcher, sanitized environment, exact file URL, no operational DB inspection, no protected port reuse.
- Health checks: server listen marker/HTTP API, frontend HTTP response, PID `lsof` exact disposable DB path, negative scan for operational path.
- Provider identities: AutoByteus, Codex, Claude with current Team identity; standalone comparison where needed; model choice follows available/imported configuration rather than hard-coded secret data.
- Journeys: universal absolute delegation, Agent and AgentTeam fresh execution, nested/cross-branch host placement, submit/review/message, settlement/cleanup, refresh/restore, task row selection/expansion, desktop/mobile, and restart repair.
- Completeness rule: no use case or acceptance criterion may be omitted silently. Each UC and AC will map to at least one direct deterministic or real journey result, with any unavoidable shared-evidence grouping stated explicitly.
- Evidence: JSON API/WS traces, three persisted JSON files, process logs, DOM snapshots/assertions, screenshots as supporting evidence, and cleanup/path checks.
- Cleanup: stop owned frontend/server PIDs and remove only API/E2E-owned runtime/database/vault/temp files after evidence finalization.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why Temporary |
| --- | --- | --- | --- |
| API-UTD-T01 | checked launcher environment/path/PID probe | exact disposable DB and protected-target exclusion | environment assertion belongs to evidence, not product regression suite unless a gap is found |
| API-UTD-T02 | browser semantic journey driver | populated desktop/mobile live/restore behavior | retain screenshots/traces; durable component/API tests own deterministic regressions |
| API-UTD-T03 | concurrent public API lifecycle probe | real queue/commit ordering and no fallback | use only if existing integration suite cannot directly exercise concurrency |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up |
| --- | --- | --- | --- |
| Electron-only preload/window/package behavior | no changed shell boundary | negligible | none unless browser reveals shell-specific fault |
| live crash exactly between OS rename and directory fsync | deterministic writer injection is authoritative; timing a real OS crash is unsafe/nondeterministic | bounded | retain direct phase-injection and strict reopen tests |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| none at investigation start | N/A | CRR-003 reports no source/design finding | N/A |

## Investigation Decision

- Proceed To API/E2E Execution: `No — pause at API-F-001 and request focused source-origin review before broader validation.`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes — the reviewed worktree already contains additions/removals that must be executed and surrounding stale current-contract tests are expected to require bounded API/E2E maintenance.`
- Post-repository confidence: `Pending`
- Broader validation decision: `Required`
- Reroute Required Before Validation Execution: `Yes` — API-F-001 / API-UTD-SCHEMA-001 to `code_reviewer` for focused failure-origin review.
- Notes: Repository execution followed the plan until the critical provider-facing schema contradiction was proven. Preserve all current durable work and resume the remaining completeness matrix only after the failure origin is reviewed and corrected.

## API-REV-002 Broad-Failure Adjudication Before Edits

| File / Group | Decision | Current-contract rationale |
| --- | --- | --- |
| `migrate-native-working-context-snapshots-v5-migration.test.ts`, `raw-trace-active-file-name-migration.test.ts`, `remove-external-runtime-working-context-snapshots-migration.test.ts` | Needs Update | historical migration behavior remains required, but team fixtures/order assertions predate the current execution-tree migration inserted ahead of the snapshot pipeline; currentize only fixture/order boundaries. |
| `team-run-metadata-member-tree-migration.test.ts` | Needs Update | predecessor migration remains required; fixtures omit current prerequisite handoff facts and fail before the intended boundary. |
| `agent-tool-mcp-session-service.test.ts` | Needs Update | session ownership is now exact `runId` plus optional canonical `teamIdentity`; remove the retired parallel `agentRunId` owner field. |
| `task-delegation-autobyteus-context.test.ts` | Replace assertions in place | the production native boundary is the exact three-field execution identity, not the removed managed addressing/execution-address shape. |
| `task-delegation-tool-run-router.test.ts` | Replace assertions in place | the router is intentionally a thin `RootTeamRun` resolver; removed per-Team service/directory fallback assertions are prohibited by R-017. |
| `get-handoff-rules.test.ts`, `send-message-to.test.ts` | Needs Update | keep native/MCP parity and delivery semantics; bind through current `MemberTeamContext.identity`. |
| `team-communication-service.test.ts` | Replace assertions in place | the current service is root-owned append-plan delivery, not the retired event-listener/file-writer owner; cover exact live identities, reservation/commit/publish and rejection. |
| `task-delegation-runtime-descriptions.test.ts` | Still Valid after IR-004/IR-005 | current absolute/universal assertions now pass and directly close API-F-001. |


## API-REV-002 Current Repository Result And Reroute

API-F-001 is resolved: the post-fix provider/schema/prompt selection passes `6 files / 51 tests`. API/E2E then continued the pre-recorded broad-failure adjudication and currentized only still-valid current seams. The exact currentization rerun passes `send-message-to` (`6/6`) and current root-owned `TeamCommunicationService` (`4/4`), but exposes two production migration defects at required registered startup boundaries:

| Finding / Scenario | Expected current behavior | Observed current behavior | Direct evidence | Preliminary owner |
| --- | --- | --- | --- | --- |
| `API-F-002 / API-UTD-MIGRATION-002` | Exact V1 Team execution-tree configured `AUTOBYTEUS` / `CODEX` / `CLAUDE` launch kinds classify to current `RuntimeKind`, so team-member native V5 conversion and external-snapshot removal execute. | `team-run-execution-tree-builder.ts` persists uppercase Team kinds, while `RuntimeMemoryLocationClassifier` feeds those strings to `runtimeKindFromString`, which recognizes only `autobyteus`, `codex_app_server`, and `claude_agent_sdk`. Exact configured Team locations are found but classified with `runtimeKind: null`; native Team migration scans zero items and Codex/Claude Team snapshots are preserved as unsupported. | `api-e2e-evidence/api-rev-002/repository/broad-failure-currentization-round2.log`; `api-rev-002-migration-diagnostic.log`; `api-rev-002-migration-source-origin-audit.log` | implementation source, subject to code-review confirmation |
| `API-F-003 / API-UTD-MIGRATION-003` | The required registered predecessor member-tree migration accepts a valid historical flat direct-Agent record, validates the staged successor, creates a backup, and converges for the following V1 package migration. | `convertLegacyTeamRunMetadata()` sends each Agent through `cloneTeamRunNode()`, which intentionally drops historical `applicationExecutionContext`; it then validates against the exact legacy schema that requires that field. Both flat conversion and already-memberTree predecessor fixtures fail with `TeamRun metadata.rootTeam.children[0] has unsupported or missing field(s).` | same three artifacts; required ordering in `app-data-migration-registry.ts` | implementation source, subject to code-review confirmation |

Coverage-validity conclusion: these are not retired test expectations. Both migrations remain `requiredOnStartup`, are registered before current V1 runtime admission, and directly implement the approved `Migration Required` transition. The tests use `mkdtemp` memory roots and the repository-only SQLite test database; no operational database path, secret import, live server, browser, provider, or protected port was used.

### API-REV-002 Post-Repository Confidence

| Category | Score | Basis |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 76% | API-F-001 is resolved and substantial root/task/message coverage passes, but required persisted transition is false. |
| Changed-boundary execution directness | 90% | Failures occur through actual registered migration implementations and current execution-tree fixtures. |
| Cross-boundary integration realism and mock gap | 78% | Current persistence/service integration is direct; live process/provider/browser matrix has not started. |
| Environment, configuration, identity, and fixture fidelity | 82% | Exact current Team V1 fixtures and temp roots are used; live disposable vault/server remains unmaterialized. |
| Failure, edge-case, lifecycle, and recovery evidence | 82% | Required migration failure modes are direct; full restart and provider lifecycle remain pending. |
| User-surface, browser, and desktop-shell confidence | 50% | No post-CRR-006 browser/mobile run because required startup transition already fails. |
| Durable regression coverage quality and relevance | 78% | Currentized seams pass, but cumulative package remains incomplete and unreviewed. |

Overall confidence: `76.6%` (simple average). Broader validation remains `Required after source correction`; it is not truthful or safe to claim complete refactor acceptance while required startup migrations reject exact valid inputs.

### Updated Ambiguities / Reroute Decision

- Proceed To Broader API/E2E: `No — fail-fast at API-F-002 and API-F-003.`
- Classification: `Local Fix`, preliminary implementation-source origin; no requirement or design ambiguity found.
- Required recipient: `code_reviewer` for focused failure-origin review.
- Preserved next work: complete broad repository currentization, builds, then checked-disposable classroom/nested-classroom AutoByteus/Codex/Claude Team and standalone browser/mobile/restore/lifecycle matrix with explicit UC/AC accounting.


## API-REV-002 Resumption After CRR-008

- Trigger: CRR-008 Pass / 92.8%; IR-006 resolves API-F-002 and API-F-003 without runtime aliases, compatibility readers, or historical fields in current runtime models.
- Required first action: rerun the exact five-file currentization/migration selection and confirm the two prior migration findings are closed in API/E2E-owned evidence.
- Preserved coverage decisions: finish the existing broad currentization package; do not restore removed owners or legacy identities; retain predecessor fields only at the isolated migration boundary.
- Required remaining execution: broader server/web selections, production builds, checked disposable startup/reopen/migration, authorized secret import into only that disposable vault, real classroom/nested-classroom AutoByteus/Codex/Claude Team and standalone rows, desktop/mobile browser, restore/recovery, cleanup, and explicit UC/AC accounting.
- Safety: no operational database inspection/action; no protected 60004/31004 action; no live setup until the checked launcher proves the exact disposable target.

## API-REV-003 Current Coverage Decision And Failure Reroute

API-REV-003 began by rechecking the prior failures. API-F-002 and API-F-003 are resolved: the exact post-fix migration selection passes `5 files / 24 tests`, and the clean affected server selection passes `112 files / 501 tests`. Currentized frontend selections also pass across the present streaming, Team workspace, mobile/history, lazy-hydration, Team-run store, and related current-contract seams. The representative results are:

| Selection | Current Result | Evidence |
| --- | --- | --- |
| exact API-F-002/API-F-003 post-fix selection | Pass — 5 files / 24 tests | `api-e2e-evidence/api-rev-002/repository/api-f002-f003-postfix-focused.log` |
| clean affected server selection | Pass — 112 files / 501 tests | `api-e2e-evidence/api-rev-002/repository/server-affected-units-broad-postfix-clean.log` |
| current Team core web selection | Pass — 4 files / 26 tests | `api-e2e-evidence/api-rev-002/repository/web-current-team-core.log` |
| Team workspace currentization | Pass — 3 files / 13 tests | `api-e2e-evidence/api-rev-002/repository/web-team-workspace-currentization-final.log` |
| six-file web currentization | Pass — 6 files / 21 tests | `api-e2e-evidence/api-rev-002/repository/web-currentization-six.log` |
| mobile/history currentization | Pass — 2 files / 11 tests | `api-e2e-evidence/api-rev-002/repository/web-currentization-mobile-history.log` |
| mobile regression selection | Pass — 1 file / 11 tests | `api-e2e-evidence/api-rev-002/repository/web-currentization-mobile-regression.log` |
| historical Team lazy hydration | Pass — 1 file / 1 test | `api-e2e-evidence/api-rev-002/repository/web-currentization-history-integration-r3.log` |
| Team-run store | Pass — 1 file / 13 tests | `api-e2e-evidence/api-rev-002/repository/web-currentization-team-run-store.log` |

The current navigation projection is **Still Valid / Needs Source Correction**, not stale. `team-execution-tree-ui-ux-spec.md` requires task Agent rows beneath their canonical logical Agent placement, task AgentTeam rows beneath their logical AgentTeam placement, and no extra task subgroup or duplicate execution where a placement has no task. The currentized durable fixture uses only the V1 tree, current `TeamExecutionViewState`, current task records, exact `agentRunId` identities, and current row keys.

Focused execution of `pnpm test:nuxt --run stores/__tests__/runHistoryNavigationProjection.spec.ts` is deterministic at `1 failed / 5 passed`. It expects the stable configured Agent and its live task Agent. It instead receives an additional `transient_execution:team:team-a` root row before those two rows. The source audit shows that `projectNavigationRows()` emits the configured root Team, while `buildRunHistoryTeamExecutionRows()` creates stable matches only for `rootTeam.children`; the unmatched root is therefore reclassified as `task_team_child`. Historical component evidence renders the same duplicate `Team team-a` row at `/`, nesting the logical Agent and task Agent underneath it.

| Finding / Scenario | Governing behavior | Expected | Observed | Decision |
| --- | --- | --- | --- | --- |
| `API-F-004 / API-UTD-UI-004` | R-015–R-016, R-047; AC-018, AC-040, AC-052–AC-054 | one root Team container, then configured placements with active task rows grouped beneath the exact logical placement | a duplicate transient root Team is invented and classified as `task_team_child`, shifting the hierarchy | `Fail`; preliminary implementation-source Local Fix, subject to focused code-review confirmation |

Evidence:

- `api-e2e-evidence/api-rev-003/failure/api-f004-root-navigation-duplication-analysis.md`
- `api-e2e-evidence/api-rev-003/repository/api-f004-navigation-projection-focused.log`
- `api-e2e-evidence/api-rev-003/repository/api-f004-source-origin-audit.log`
- `api-e2e-evidence/api-rev-002/repository/web-currentization-history-integration-r2.log`

Execution decision: stop before builds, disposable database/vault materialization, secret or Agent-package import, server/provider/browser launch, or complete UC/AC execution. A critical required UI projection is directly failing, so more live rows would not produce an overall Pass and must not conceal the contradiction. Resume the full checked-disposable classroom/nested-classroom AutoByteus/Codex/Claude Team and standalone, desktop/mobile, migration/reopen, restore/recovery, and explicit UC/AC matrix after failure-origin review and correction.

Safety result for API-REV-003: `/Users/normy/.autobyteus/server-data/.env` was not read or imported; `/Users/normy/autobyteus_org/autobyteus-agents` was not imported; no live process, database, vault, provider, browser, operational-data, or protected-port action occurred.

## API-REV-004 Resumption After CRR-010

- CRR-010 independently confirms API-F-004 / CR-F-010 resolved in IR-007 and records a complete cumulative SR-009 source/structural Pass at 92.6%.
- Required first check: rerun `runHistoryNavigationProjection.spec.ts` and `runHistoryTeamExecutionRows.spec.ts` through the current store owner, then the mounted current history component seam.
- Four older exploratory web suites remain `Needs Update` or `Stale / Remove` because they retain removed `TeamExecutionAddress` / `focusedExecutionAddress` fixtures or incomplete store mocks. Currentize them only against the exact V1 `TeamExecutionViewState` and present store seams; do not restore retired identity, compatibility fields, or a second execution materializer.
- Preserved required matrix: all repository/build checks necessary for the cumulative change; checked-disposable startup and reopen/migration; authorized secret import and classroom/nested-classroom package import only into that isolated target; AutoByteus/Codex/Claude Team and standalone; exact universal delegation, submit/review/message, FIFO/fail-stop, restore/recovery, desktop/mobile-equivalent browser, cleanup, and explicit UC-001–UC-021 / AC-001–AC-056 accounting.
- Safety gate before any live action: prove ambient `DATABASE_URL`/`DATABASE_URL_TEST` are absent from the child, materialized runtime configuration resolves the exact disposable SQLite path without initialization, and post-listen PID `lsof` matches that path. Operational database and protected 60004/31004 actions remain forbidden.

## API-REV-004 Repository Currentization And Broader-Validation Gate

API-F-004 is resolved downstream. The exact current history projection selection passes `2 files / 8 tests`; the current nine-file history/navigation/component aggregate passes `9 files / 114 tests`. The configured `/` root is not duplicated, logical placements remain stable, task rows rebase beneath their authoritative parents, and disclosure/focus use the current exact row key.

The preserved durable package was then currentized only at tests that still asserted removed state or fabricated retired identities. No production compatibility seam was added. The principal decisions and executed results are:

| Coverage group | Decision and current result | Evidence |
| --- | --- | --- |
| current changed server selection | `Still Valid / Needs Update` completed; `63 files / 265 tests` pass | `api-e2e-evidence/api-rev-004/repository/changed-server-current.log` |
| current changed web selection | `Still Valid / Needs Update` completed; `34 files / 257 tests` pass | `api-e2e-evidence/api-rev-004/repository/changed-web-current.log` |
| current history/navigation UI | `Still Valid / Needs Update` completed; `9 files / 114 tests` pass | `api-e2e-evidence/api-rev-004/repository/history-nine-currentized.log` |
| memory, active context, focused interrupt, context-file ownership | stale fixture fields replaced with current `agentRunId`, exact Team focus, and current workspace metadata; focused `8 files / 27 tests` pass | `api-e2e-evidence/api-rev-004/repository/currentized-focused-round1.log` |
| run configuration, member override, selection, token usage, run open/recovery, navigation and current GraphQL DTOs | retired `selectedType` state, `memberRouteKey`, `memberAgentRunId`, `executionAddress`, `isSubscribed`, and old create-run payloads removed from tests; all focused reruns pass | focused command output retained in the API/E2E shell transcript; final aggregate rerun remains in the current selection |
| server production build/bootstrap | Pass, including production TypeScript and sanitized bootstrap | `api-e2e-evidence/api-rev-004/repository/server-build-full.log` |
| Nuxt production build | Pass, including 15-route prerender | `api-e2e-evidence/api-rev-004/repository/web-production-build.log` |
| complete web suite | `400 files / 2,192 tests` pass, `1` intentional release test skips, and `2` failures observed. The managed-extension installation failure passed on immediate isolated rerun and is classified a parallel-suite timing flake. The sole repeatable failure is the unrelated pre-existing zh-CN settings string `代理`, outside SR-009 production scope; API/E2E did not alter unrelated localization source or weaken the glossary guard. | `api-e2e-evidence/api-rev-004/repository/web-full-current-round2.log` and isolated managed-extension rerun output |

The remaining repeatable full-suite failure is `Out Of Scope`, not hidden acceptance evidence: the glossary guard correctly detects an unrelated localized product string in an implementation path that SR-009 did not change. All SR-009-relevant frontend suites and the complete changed-web inventory are clean. The browser/provider matrix remains mandatory because repository tests cannot substitute for real package import, provider execution, WebSocket/API correlation, responsive navigation, process reopen, or current persisted package inspection.

### API-REV-004 Pre-Live Confidence

| Category | Score | Basis and remaining gap |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 90% | Deterministic owners cover the full SR-009 contract map; real provider and UI rows remain. |
| Changed-boundary execution directness | 95% | Current server/web selections and production builds exercise actual owners. |
| Cross-boundary integration realism and mock gap | 85% | Current integration/store coverage is direct; checked-disposable process/browser/provider work has not yet run. |
| Environment, configuration, identity, and fixture fidelity | 65% | Repository test DB only so far; isolated secret/package import and PID/path proof remain. |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | Queue, fail-stop, migration, strict identity, restore and negative cases are direct; real process reopen remains. |
| User-surface, browser, and desktop-shell confidence | 82% | Current mounted/component and production-build evidence passes; populated desktop/mobile browser journeys remain. |
| Durable regression coverage quality and relevance | 94% | Current changed selections are clean and retired identities were removed; proportional review remains after overall Pass. |

- Overall pre-live confidence: `85.9%` (simple average).
- Broader validation: `Required`.
- Proceed to checked-disposable live setup and execution: `Yes`.
- Live safety state at this decision: no secret file import, Agent package import, disposable runtime creation, server/frontend/provider/browser action, operational-database action, or protected-port action has occurred in API-REV-004.

## API-REV-004 Checked-Disposable Startup Result And Failure Reroute

The broader-validation safety gate passed before any live launch:

- the checked launcher materialized runtime root `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-universal-task-delegation/autobyteus-server-ts/tests/.tmp/api-rev-004-live-20260815-1`;
- the exact database target was `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-universal-task-delegation/autobyteus-server-ts/db/api-rev-004-live-20260815-1.db` and did not match the operational database;
- child `DATABASE_URL` and `DATABASE_URL_TEST` were absent;
- the materialized runtime `.env` named the exact disposable absolute SQLite target;
- configuration-only resolution matched that target without initializing it;
- 21 Prisma migrations applied only to the disposable database;
- the user-authorized importer read `/Users/normy/.autobyteus/server-data/.env` without printing secret values and configured nine credentials only in that disposable vault.

The checked built-server launch then failed before listen. The process completed database migrations, Agent-definition initialization, and AgentTeam-definition cache initialization, then exited with `RangeError: Maximum call stack size exceeded`. The exact built stack and source audit prove a recursive construction cycle:

`AgentToolMcpSessionService -> AgentToolMcpCatalog -> TaskDelegationToolsMcpAdapterProvider -> TaskDelegationToolService -> TaskDelegationToolRunRouter -> TeamRunService -> AgentRunIdentityAllocator -> AgentRunManager -> CodexAgentRunBackendFactory -> CodexThreadBootstrapper -> AgentToolMcpSessionService`.

The first `AgentToolMcpSessionService` singleton is not assigned until its constructor returns, so the last edge re-enters an unassigned singleton and repeats until stack overflow.

| Finding / Scenario | Governing behavior | Expected | Observed | Decision |
| --- | --- | --- | --- | --- |
| `API-F-005 / API-UTD-STARTUP-005` | R-020, R-041, AC-049; prerequisite for every requested live UC/AC row | current built server finishes its migration attempt and listens on the checked disposable port | server exits before listen with recursive singleton construction and stack overflow | `Fail`; preliminary implementation-source Local Fix, subject to focused code-review confirmation |

Evidence:

- `api-e2e-evidence/api-rev-004/environment/safe-target-preflight.log`
- `api-e2e-evidence/api-rev-004/environment/prisma-migrate-deploy.log`
- `api-e2e-evidence/api-rev-004/environment/secret-import-summary.log`
- `api-e2e-evidence/api-rev-004/environment/safe-server-diagnostic.log`
- `api-e2e-evidence/api-rev-004/environment/safe-server-stack-diagnostic.log`
- `api-e2e-evidence/api-rev-004/failure/api-f005-source-cycle-audit.log`
- `api-e2e-evidence/api-rev-004/failure/api-f005-safe-startup-recursive-construction-analysis.md`

This is not an environment collision, stale test expectation, provider model behavior, or operational-data failure. It occurs in the built production composition graph before package import or listen. No source compatibility, retry, fallback, or alternate launcher was added by API/E2E.

The requested classroom/nested-classroom package import, AutoByteus/Codex/Claude Team and standalone execution, universal delegation/message/submit/review journeys, browser/mobile rows, reopen/restore, and explicit UC-001–UC-021 / AC-001–AC-056 live matrix are therefore `Not Tested` in API-REV-004. Continuing is impossible until the required server process can listen and would not permit a truthful Pass.

### API-REV-004 Final Confidence

| Category | Final Score | Evidence and limitation |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 76% | Broad deterministic SR-009 evidence passes and API-F-004 is resolved, but AC-049 and every requested live row are blocked by a real startup failure. |
| Changed-boundary execution directness | 95% | Current server/web owners, builds, exact checked built process, and direct source/stack ownership were exercised. |
| Cross-boundary integration realism and mock gap | 50% | The actual process and disposable DB boundary were reached, but no API/WebSocket/provider/browser boundary became available. |
| Environment, configuration, identity, and fixture fidelity | 98% | Exact disposable DB, sanitized child environment, target-only migration and secret import, and checked cleanup are directly proven. |
| Failure, edge-case, lifecycle, and recovery evidence | 88% | Startup failure and repository lifecycle/fail-stop coverage are direct; process reopen/restore cannot run. |
| User-surface, browser, and desktop-shell confidence | 60% | Current mounted/component suites and production build pass, but the required real browser/mobile journeys cannot start. |
| Durable regression coverage quality and relevance | 94% | Changed current selections are green and obsolete identity fixtures were removed; the cumulative package remains incomplete and unreviewed because the round failed. |

- Overall final confidence: `80.1%` (simple mean).
- Every critical acceptance criterion directly proven: `No — AC-049 fails at production startup; live UC/AC rows are Not Tested.`
- Default clean target met: `No`.
- Critical startup failure overrides the numeric score: `Yes`.
- Broader validation decision: `Required but stopped at a product failure`, not `Blocked` by an external dependency.
- Reroute: `code_reviewer` for focused failure-origin review.

### Cleanup And Protected-State Result

The checked cleanup owner removed only the API-REV-004 runtime root, disposable database, secret key, WAL, SHM, and journal candidates. Those exact paths are absent. Ports `60309`, `31309`, `60004`, and `31004` have no listener. Operational database inspection/action: `NONE`. Protected-port process action: `NONE`. No automatic database rollback, repair, or operational-data action is claimed. Evidence: `api-e2e-evidence/api-rev-004/cleanup/owned-runtime-cleanup.log` and `api-e2e-evidence/api-rev-004/cleanup/final-cleanup-verification.log`.

## API-REV-005 Resumption After CRR-013

- CRR-012's complete cumulative review resolves CR-F-011 / API-F-005 in source through IR-008's mandatory typed use-time `RootTeamRunResolver`; its independent fresh built construction proof terminates without recursion. CRR-013 changes no source/test state and closes only cleanup-only CR-F-012.
- Prior API/E2E result remains `API-REV-004 Fail / 80.1%`; source review cannot substitute for the required production process recheck or live provider/browser evidence.
- The first execution scenario is unchanged `API-UTD-STARTUP-005`: fresh checked disposable runtime and SQLite target, ambient `DATABASE_URL` and `DATABASE_URL_TEST` removed, configuration-only exact-target preflight without initialization, isolated secret import, built server start, readiness, and post-listen PID/path verification.
- If and only if startup passes, execute the preserved complete matrix:
  1. import the user-authorized classroom and nested-classroom packages from `/Users/normy/autobyteus_org/autobyteus-agents` through the normal current API;
  2. AutoByteus, Codex, and Claude Team-bound provider rows for canonical prompt/tool exposure, universal Agent/AgentTeam delegation, direct/deep/cross-branch/nested task-Team host selection, exact bidirectional messages, submit/revise/resubmit/accept, statuses, persistence, and fail-closed invalid addresses;
  3. equivalent standalone Agent rows proving ordinary execution and absence of Team-only tools/context;
  4. desktop browser and mobile-equivalent task tree, focus, status, details, communication/reference, and live-to-restored state;
  5. process stop/reopen, stale-task repair, package restore, accepted history retention, no message replay, current V1 file inspection, and exact cleanup;
  6. explicit UC-001–UC-021 and AC-001–AC-056 accounting using deterministic repository evidence plus real rows without treating model call election as a deterministic product invariant.
- Existing API/E2E-owned durable coverage decisions remain current. No new durable edit/removal is planned before the startup recheck. If live evidence exposes a real durable gap, update this investigation before making that edit.
- The cumulative durable package remains incomplete/unreviewed and will return for proportional review only after an overall Pass.
- Safety remains mandatory: operational database and `$HOME/.autobyteus` operational data action `NONE`; protected ports `60004`/`31004` process action `NONE`; exact API-REV-005-owned runtime, DB, ports, browser state, and imported disposable data only; preserve incident disclosure, stash, and backup.

### API-REV-005 Pre-Execution Coverage Decision

| Coverage Area | Existing Coverage Status | API-REV-005 Decision |
| --- | --- | --- |
| API-UTD-STARTUP-005 | source-resolved by IR-008/CRR-012; prior live Fail | `Recheck First` through checked built process |
| 63-file current server selection | API-REV-004 Pass / 265 tests; CRR-012 current 273-test server proof | `Still Valid`; rerun targeted startup/default graph first and broader only if state changes |
| 34-file current web selection | API-REV-004 Pass / 257 tests; CRR-012 current 257-test proof | `Still Valid`; no pre-live rerun required absent source/test state change |
| production server and Nuxt builds | CRR-012 Pass on current source | `Still Valid`; retain reviewer evidence and rerun if API/E2E changes repository source/tests |
| classroom/nested-classroom three-provider Team rows | prior round Not Tested | `Required Live` |
| three-provider standalone Agent rows | prior round Not Tested | `Required Live` |
| browser/mobile Team task and communication UI | prior round Not Tested | `Required Browser` |
| migration/reopen/restore/recovery | prior round Not Tested | `Required Process/Lifecycle` |
| invalid address/fail-stop/FIFO/concurrency matrix | strong deterministic evidence; no live rows | `Retain Durable + targeted real boundary` |
| operational database | explicitly forbidden | `Out Of Scope / No Action` |

### API-REV-005 Initial Confidence And Broader-Validation Gate

The current source/build reviews materially raise startup expectation but do not raise live acceptance confidence by themselves. Initial scores carry API-REV-004's final limitations forward: requirement proof 76%, directness 95%, cross-boundary realism 50%, environment fidelity 98%, lifecycle 88%, browser/UI 60%, durable quality 94%; overall `80.1%`. Broader validation is `Required`. A critical startup failure or any unproven live critical criterion prevents Pass regardless of score.

### API-REV-005 Post-Startup Coverage Update

This update was recorded after the startup prerequisite and provider/API rows, and before the remaining browser, reopen, and final repository execution.

| Coverage Area | Current Evidence | Validity Decision / Remaining Work |
| --- | --- | --- |
| API-UTD-STARTUP-005 | Fresh checked launcher completed configuration-only exact-target preflight, applied 21 migrations to the disposable SQLite target, imported nine secrets into the disposable runtime through the supported CLI, listened on `60310`, and PID `lsof` named only the exact disposable DB | `Pass`; CR-F-011 / API-F-005 is closed downstream for the built startup path |
| authorized Agent package import | The normal GraphQL import admitted the user-authorized `/Users/normy/autobyteus_org/autobyteus-agents` package: seven shared Agents, 57 Team-local Agents, and 14 AgentTeams | `Pass`; use imported `classroom-simulation-team` for real collaboration and the imported nested topology plus a disposable public-API nested fixture for nested-Team coverage |
| AutoByteus Team runtime | The real classroom professor created a fresh task Agent through `delegate_task`; the task Agent emitted a file-backed exact message to the professor; the persistent professor also sent `E2E_AUTOBYTEUS_MESSAGE` to `/student` and received a persisted file-backed reply | `Pass` for real task activation, exact same-root messaging, request/reply, reference persistence, and provider/tool reachability |
| Codex Team runtime | A real Team coordinator delegated a fresh `/worker` task, delegated a fresh `/lab` task Team whose coordinator delegated a fresh `/lab/researcher` child task, and sent persisted `E2E_CODEX_MESSAGE` to `/worker` | `Pass` for real task Agent, nested task Team, nested child task Agent, and exact messaging |
| Claude Team runtime | A real Team coordinator delegated a fresh `/worker` task and sent persisted `E2E_CLAUDE_MESSAGE` to `/worker` | `Pass` for real task activation, provider/tool reachability, and exact messaging |
| standalone AutoByteus/Codex/Claude | Each runtime completed a real standalone turn with an exact marker and matching persisted projection | `Pass`; browser/history correlation remains to be inspected |
| task submit/revise/accept election | Several real task Agents returned natural-language results or invoked another intrinsic tool rather than formally electing `submit_task_result` | `Nonblocking model-behavior observation`, not a product failure; rerun the maintained production-tool integration for deterministic delegate -> submit -> revise -> resubmit -> accept and pair it with the real provider activation evidence |
| first AutoByteus attempt | API/E2E supplied unsupported native `reasoningEffort`, and the provider rejected the request; the row was rerun without that field and passed | `API/E2E configuration correction`; not a product finding and not acceptance evidence |
| browser/mobile | Not yet executed in this revision | `Required Browser` against the active classroom and nested Codex run, including task count/details/rows, exact focus, communication/reference open-close, and mobile-equivalent state |
| stop/reopen/restore | Not yet executed in this revision | `Required Process/Lifecycle` on the same disposable target, including stale-task repair, stable records, no replay, and refreshed browser state |

No repository-resident durable coverage was added or modified by these live rows. The evidence-only runners under the ticket evidence directory are disposable orchestration, not durable product coverage. The remaining repository selection must re-execute the maintained task-tool lifecycle and current root/persistence/FIFO/fail-stop owners; no runtime compatibility will be added for stale expectations.

### API-REV-005 Final Execution Decision And Reroute

The maintained task-tool lifecycle integration passed `1 file / 5 tests`, and fresh public-API fixtures configured the exact three formal task tools. Real AutoByteus, Codex, and Claude runs then each completed delegate -> task submit -> delegator accept with exact accepted durable records. Real Chrome also proved the active classroom task count/details, the distinct indented task-Agent navigation row, exact task AgentRun focus, three communication rows, and reference presentation.

Execution then exposed `API-F-006 / API-UTD-CODEX-EVENT-006`: the fresh Codex Team formal lifecycle emitted terminal `TEAM_AGENT_EVENT_ADMISSION_FAILED` with `Rejected TOOL_LOG: tool_name is required`. The task truth still reached accepted, so this is neither model call-election variance nor a failed task-tool capability. Source correlation shows the Codex raw-response converter creates a `TOOL_LOG` for a completed `functioncalloutput` without `tool_name`, while the one strict Team adapter requires it.

The result is `Fail / 93.3%`. The stop rule prevents completing or claiming the remaining mobile, reopen/restore, and complete UC/AC matrix against known-failing source. No durable repository coverage changed in API-REV-005, so this routes to `code_reviewer` for focused failure-origin review rather than proportional successful-test review. Full analysis: `api-e2e-evidence/api-rev-005/failure/api-f006-codex-team-tool-log-admission-analysis.md`.

Cleanup removed only the exact API-REV-005-owned runtime root, disposable DB/key/WAL/SHM/journal, frontend, backend, and browser processes. Ports `60310` and `31310` are absent. Operational database action and protected-port `60004`/`31004` process action remain `NONE`.

## API-REV-006 Post-IR-010 Coverage Investigation

- Trigger: `CRR-015 Pass / 92.7%`; CR-F-013 / API-F-006 is source-resolved by IR-010.
- Current source state: HEAD remains `8a0494e8b55a3debc7acbee7b61d286d5311d1a8` with the reviewed IR-010 working-tree source/test delta preserved.
- Prior API/E2E authority: `API-REV-005 Fail / 93.3%`. Its successful AutoByteus/Claude, standalone, task/message, desktop active-task, safe-target, and deterministic lifecycle evidence remains historical and useful, but it cannot accept the changed Codex producer boundary or the stopped mobile/reopen rows.
- First required execution: fresh checked-disposable Codex Team formal lifecycle through the exact current provider -> AgentRun -> Team adapter/projector -> WebSocket path. Required result: exact accepted task truth, no `TEAM_AGENT_EVENT_ADMISSION_FAILED`, and coordinator `TURN_COMPLETED`.
- Source-focused repository coverage status: CRR-015 independently passed 3 files / 20 tests; IR-010 passed 7 files / 136 tests plus production TypeScript and full build/bootstrap. API/E2E will retain this reviewed evidence and rerun the exact real boundary rather than infer live acceptance.
- If the Codex recheck passes, complete the stopped coverage:
  1. mobile-equivalent task tree, task-Agent focus, Team message/reference count and open/close;
  2. process stop/reopen on the same exact disposable database, startup stale-task repair, strict package admission, accepted-history retention, no communication replay, restore/reconnect, and browser refresh;
  3. final complete UC-001–UC-021 / AC-001–AC-056 evidence accounting using current deterministic coverage plus the real API-REV-005/API-REV-006 rows;
  4. current production builds and a proportionate final repository selection if the live state stays clean.
- Durable coverage decision: IR-010 added one implementation-owned Codex correlation test. API/E2E will not edit it before live recheck. The pre-existing cumulative API/E2E durable package remains to be re-adjudicated and returned for proportional review only after an overall Pass.
- Fresh environment: new API-REV-006-owned runtime root, SQLite database, secret vault, ports `60311`/`31311`, browser context, imported definitions, and workspaces only. Ambient database variables must be removed before every server/database command; configuration-only preflight and PID exact-path `lsof` remain mandatory.
- Operational database and `$HOME/.autobyteus` operational data action: `NONE`. The user-authorized `.env` may be read only by the supported importer into the disposable target; values must not be printed. Protected `60004`/`31004` process action: `NONE`. Preserve stashes, backups, incident disclosure, and no-rollback/no-repair state.

### API-REV-006 Initial Confidence And Stop Gate

Initial scores carry API-REV-005's executed evidence forward without converting source review into acceptance: requirement proof 88%, directness 99%, cross-boundary realism 96%, environment fidelity 99%, lifecycle/recovery 92%, browser/mobile 85%, durable quality 94%; overall `93.3%`. Broader validation is `Required`. Any recurrence of API-F-006 or another material product failure stops the remaining matrix and reroutes through failure-origin review.

### API-REV-006 Final Coverage Adjudication

API-F-006 is closed downstream. The fresh post-IR-010 real Codex Team lifecycle completed the same delegate -> submit -> exact-delegator accept path with coordinator `TURN_COMPLETED`, zero WebSocket `ERROR` frames, and zero `TEAM_AGENT_EVENT_ADMISSION_FAILED`. The stopped mobile and process-reopen rows also pass on the same checked disposable target.

The cumulative durable package was adjudicated before final execution as follows:

| Coverage area | Prior state | API-REV-006 decision | Final evidence |
| --- | --- | --- | --- |
| current affected server tests | mixed `Still Valid`, `Needs Update`, `Remove`, and replacement coverage accumulated during API-REV-001–005 | retain every active current-contract test; retain clean-cut removals; no compatibility restoration | `api-e2e-evidence/api-rev-006/repository/all-active-changed-server.log`: 66 files / 327 tests Pass |
| current affected web tests | mixed currentized/removed fixtures across streaming, stores, navigation, mobile, history, configuration, recovery, and projection | retain every active current-contract test; retain obsolete-owner removals | `repository/all-active-changed-web.log`: 66 files / 472 tests Pass |
| exact IR-010 Codex event boundary | prior API-F-006 required new correlation proof | retain the new same-turn/same-invocation correlation suite and all affected converter/tracker suites | `repository/codex-ir010-current.log`: 7 files / 136 tests Pass |
| active test integrity | missing imports or skipped tests would make green transpilation insufficient | require zero missing relative imports and zero `.skip`/`.only`/`.todo` across all 132 active changed tests | `repository/cumulative-durable-import-audit.log`; `repository/current-contract-static-audit.log`: Pass |
| deleted coverage | 31 retired composite-identity, duplicate-owner, metadata, and compatibility-path suites | keep removed; replacement/current owners are directly exercised | cumulative inventory/patch and the two complete active selections |
| real provider/browser/process evidence | API-REV-005 had passed Team/standalone rows but stopped mobile/reopen at API-F-006 | retain unchanged provider rows, freshly recheck Codex defect, add real imported classroom, paired mobile, stop/reopen/restore and restored desktop | `live/browser-provider-lifecycle-matrix-summary.json`: Pass |
| UC/AC accounting | incomplete at API-REV-005 stop | explicitly map UC-001–UC-021 and AC-001–AC-056; no required row remains Not Tested | `investigation/uc-ac-verification.tsv`: 21 UC + 56 AC Pass |

Cumulative durable package accounting is `164 paths = 11 added / 122 updated / 31 removed`. Inventory and patch path sets match exactly, reverse application passes, all diff checks pass, and all active changed tests have resolvable relative imports. The package must return through proportional code review before delivery because repository-resident durable coverage changed cumulatively.

Coverage gaps after execution are residual, not open critical rows: probabilistic providers may choose different tools in future turns; real UI validation used Chrome web-equivalent desktop/mobile rather than the Electron shell; and unchanged provider rows other than the IR-010 defect seam were retained from API-REV-005 rather than unnecessarily rerun. These constraints lower confidence below 100% but do not leave a relevant UC/AC row untested.
