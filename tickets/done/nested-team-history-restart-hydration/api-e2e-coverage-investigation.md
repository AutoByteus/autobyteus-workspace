# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/design-spec.md`
- Supplemental Task Artifacts: the restart reproduction and three browser captures under `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/investigation-evidence/`, plus the four retained user screenshot paths catalogued in `requirements.md`.
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/solution-revision-record.md`; current `SR-007`.
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/architecture-review-revision-record.md`; current pass `ARCH-REV-003`.
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/implementation-handoff.md`; current `IR-002`.
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/code-review-report.md`; current failure-origin authority `CRR-005`, which confirms API/E2E environment/execution origin rather than a source/navigation defect.
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/code-review-revision-record.md`; current `CRR-005`.
- Delivery Revision Record (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/api-e2e-revision-record.md`; prior completed result `API-REV-003`.
- Current API/E2E Revision ID: `API-REV-004`.
- Current Investigation Round: `4`
- Trigger: the user-approved backed-up incident recovery deleted exactly the single contaminated ledger row while the packaged app was stopped; the user then started the reviewed ticket package and the unchanged production migration completed against the real paired filesystem/database. `/solution_designer` directs API/E2E to reconcile the completed recovery, verify the exact packaged cold-start user surface, harden isolation, and supersede API-REV-003 if direct evidence passes.
- Prior Investigation Reviewed: `Yes` — `API-REV-003` was `Fail` at `82.1%` because API/E2E had contaminated the production ledger. `CRR-005` confirms the origin as API/E2E environment/execution `Local Fix`, not a source/navigation defect. API-REV-002's isolated fresh A/B/C `Pass` remains valid.
- Latest Authoritative Investigation: this file.

## Round 4 Incident-Recovery Coverage Investigation (Completed)

### Approved Recovery Basis

- Authority: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/investigation-evidence/production-ledger-contamination-recovery-assessment.md`, explicit user approval, and `CRR-005`.
- Supported deployment invariant: one app-data filesystem root and its operational database are one paired state. Arbitrary cross-root/shared-ledger re-pairing is unsupported.
- Approved incident-only action: with the packaged app stopped and a checksum-verified backup of the full migration-visible memory tree plus database/key/sidecars, transactionally match and delete exactly the one contaminated row, then let the unchanged reviewed migration run on normal packaged startup.
- Prohibited substitutions: no manual directory move, product-source change, follow-up migration, generic terminal retry/delete behavior, runtime flat fallback, or new release.
- API/E2E correction: future realistic runtimes must isolate both app-data and `DATABASE_URL`; neither value may be inherited or omitted independently.

### Existing Recovery Evidence Validity

| Evidence | Coverage Decision | Reason / Remaining Gap |
| --- | --- | --- |
| Full backup and checksum summary | `Still Valid / Pass` | 9,202 source and backup memory files; rsync checksum verification passed. |
| Exact-row deletion log | `Still Valid / Pass` | One matched row deleted in a transaction; post-delete count zero; SQLite `quick_check=ok`; no open DB handles; memory checksum unchanged. |
| Normal packaged migration row/log | `Still Valid / Pass` | Real-data row reports `SUCCEEDED`, attempt 1, `Scanned 112; migrated 9; skipped 103; failed 0`, with log under real app data. The production log lists the exact affected canonical targets. |
| Exact six-member disk/GraphQL verification | `Still Valid / Pass` | All flat sources absent, canonical targets present, byte-identical to stopped-state backup, and public projections/Event Monitor non-empty in the authoritative post-restart verification. |
| Packaged Electron rendered click evidence | `User-Executed / Pass` | The user performed the packaged restart and confirmed the recovered configured/task histories render successfully. The user explicitly directed API/E2E to record this as success; no additional UI automation is required. |
| API/E2E environment isolation guard | `Recorded Mandatory Harness Invariant` | Every future realistic runtime must set both app-data and `DATABASE_URL` to the same test-owned root and assert neither resolves to `/Users/normy/.autobyteus/server-data` before process start. No repository source/test change was needed in this recovery round. |

### Round 4 Final Result

1. **Recovery integrity passed.** The user-approved stopped-state operation used a checksum-verified backup of the full possible mutation scope, deleted exactly the matched false row transactionally, returned SQLite `quick_check=ok`, and changed no memory file during cleanup.
2. **Normal migration passed.** The reviewed packaged startup ran the unchanged migration against the real paired state: `SUCCEEDED`, attempt `1`, `Scanned 112; migrated 9; skipped 103; failed 0`, with a real production log path.
3. **Exact data passed.** For configured Student One/Two and four data-bearing task Student One executions, all flat sources are absent, canonical targets are present, and target directories are byte-identical to the stopped-state backup sources.
4. **Exact public history passed.** All six projections and Event Monitor pages are non-empty. Configured Student One returns `60` conversation entries, `17` activities, `60` Event Monitor events, and a non-null last activity; task members return `3/1/3`, `3/1/3`, `3/1/3`, and `6/2/6` conversation/activity/event counts.
5. **Packaged UI passed.** The user performed the packaged restart/click verification and explicitly confirmed success, then instructed API/E2E to update the authoritative documents without additional automation.
6. **Isolation correction recorded.** App-data and `DATABASE_URL` are a coupled test-owned identity for every future realistic API/E2E runtime; inherited/shared production database use is forbidden and must be asserted before process startup.
7. **Scope preserved.** No product source, durable test, fixture, manual memory move, follow-up migration, generic retry, fallback, or new release was introduced.

Round-4 result: `Pass` at `98.7%` confidence. `API-REV-004` supersedes API-REV-003's incident-state failure while retaining it as historical evidence.

## Round 3 User Electron Reinvestigation (Completed)

| Item | User Observation / Current Evidence | Validity Decision | Planned Read-Only Evidence |
| --- | --- | --- | --- |
| Actual packaged app | Electron PID `23582` is running from this ticket worktree's `electron-dist/mac-arm64/AutoByteus.app`; embedded server PID `24203` listens on `29695` with `--data-dir /Users/normy/.autobyteus/server-data`. | Required real environment, not substitutable by the prior isolated browser run. | Do not stop or mutate either process. Query health/public GraphQL and inspect the exact persisted paths. |
| User-visible configured member | Screenshots show Nested Classroom run “give student team …” with configured `student_one` selected, an empty center pane, and Team messages still visible. | Direct current failure evidence until disproved. | Identify exact TeamRun/AgentRun IDs, query projection/Event Monitor, and compare flat versus canonical path content. |
| User-visible task members | Historical task rows are present, but screenshots show task child loading indicators and configured member blank. | Must distinguish migration/storage failure from frontend-only hydration failure. | Query each exact task member projection and inspect every task-Team canonical directory. |
| Startup migration | The packaged server started at `2026-08-23 20:55` against the real data. | Status cannot be inferred from startup health. | Query `getAppDataMigrations`, inspect the layout migration log, and verify the exact filesystem result. |
| Prior API-REV-002 method | Used a built backend, runtime-specific production Nuxt/Chrome, isolated current data, real stop/cold restart, then semantic clicks/API checks. | Still valid for fresh canonical data; insufficient for the older user's migration cohort and actual Electron instance. | Record the method distinction explicitly and reroute if the user's real migration or reader is failing. |

Round-3 execution remained read-only against user data. No server/app stop, retry mutation, directory move, database write, or durable test/source edit occurred.

### Round 3 Coverage Result

- Exact affected root: `nested_classroom_test_team_83a531dc8def4e82bbc946a02661bb8a`, created `2026-08-20T16:38:54.598Z` and currently inactive.
- Configured Student One and Student Two plus all four data-bearing task Student One executions still have their trace files only in the released flat layout. Their required nested canonical directories do not exist.
- The live packaged server's public GraphQL boundary returns zero conversation, zero activities, `lastActivityAt: null`, and zero Event Monitor events for every affected member. The direct-root Teacher control returns `90` conversation items, `34` activities, `90` Event Monitor events, and a non-null last activity.
- The production migration ledger reports `20260823_repair_team_agent_memory_layout` as terminal `SUCCEEDED`, but its log path points into API/E2E's deleted isolated runtime and no corresponding repair log exists in the user's real app-data logs. The status summary was `Scanned 12; migrated 0; skipped 12; failed 0.`
- The ledger/path mismatch is direct evidence that an isolated-runtime success record was written into the shared production database. Correlation with the previously disclosed restart that omitted `DATABASE_URL` is a strong inference, not a claim beyond the retained evidence.
- Because the shared ledger says `SUCCEEDED`, the packaged startup does not run this migration against the real user memory; `canRetry` is false and `recoveryAction` is `NONE`. The approved persisted-data transition is therefore unfulfilled for this installation.
- The user then performed another real packaged-app stop/start. A repeated read-only probe against replacement Electron PID `30790` / server PID `31397` returned the same flat-only locations, empty affected projections/Event Monitor, and terminal ledger row. Newly created nested data remains readable across restart, so fresh canonical behavior is a passing control and the failure is isolated to old-data repair.
- Result: `Fail`. API-REV-002 remains valid only for its isolated fresh canonical A/B/C data. It does not prove upgrade of this older user cohort.
- Evidence: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/api-e2e-evidence/round-3/user-electron-data/user-electron-migration-failure-analysis.md` and the raw/summary/process evidence in the same directory.

## Current Requirement And Design Basis

The approved change must prove one canonical physical scope for live writes and cold reads across direct-root, configured nested, delegated task-Agent, delegated task-Team, and deeper TeamRun ancestry. Already-affected flat nested AgentRun directories must move as complete directories during required startup migration before public history access. Cold GraphQL projection and Event Monitor reads must then return real conversation/activity data, while a genuinely empty subject stays empty. Direct-root history and root Team Communication, including references and ordering, are controls.

The migration must be `requiredOnStartup` and `ANYTIME`: an invalid/unavailable canonical target produces truthful `FAILED` without preventing health/startup, exposes `MANUAL_RETRY` and `canRetry: true`, blocks not-yet-run canonical-location dependents through prerequisites, and succeeds idempotently after the obstruction is corrected. A real source plus independently valid canonical target is instead the approved bounded `SUCCEEDED_WITH_WARNINGS` no-mutation state.

Memory Sync v1 remains recursive, replace-only, and without delete propagation. Durable evidence must prove both local conflict paths can be exported, a pre-upgrade flat import can remain after local relocation, and imported semantic Team memory resolves only the V1 canonical member target. No sync filter, delete/tombstone, remote cleanup, sync gate, frontend behavior change, runtime fallback, or dual reader/writer is valid in scope.

Round 2 adds the approved purpose-aware historical navigation correction: inactive historical views must recursively expose persisted settled task Agents, task Teams, their members, and nested task executions, while active views continue excluding settled task subtrees. Row listing, exact focus, and focus repair must share that lifecycle-derived projection. AC-017 additionally requires three independent real Nested Classroom routes—team-address ordinary messaging, direct-member ordinary messaging, and task-Team delegation—each with its own marker/run, cold restart, exact history reload, and a new same-route/tool interaction after restart.

## Round 2 Prior-Failure And Coverage Reinvestigation

| Item | Prior State | Current Approved Source State | Round 2 Coverage Decision |
| --- | --- | --- | --- |
| `NTH-BR-001` / AC-002 / browser AC-012 | `Fail`: cold backend projection was non-empty, but the settled task-Team row was absent and exact focus rejected “not live.” | `CRR-003` confirms inactive historical purpose recursively includes persisted settled task subtrees and exact focus uses the same projection. | Recheck first through the normal real cold browser path. Require exact settled task-Team/member row, selection, conversation, Activity, Event Monitor, and last activity. Source tests cannot substitute. |
| Configured nested browser AC-001 | Not directly live-proven in round 1. | Backend canonical location/projection unchanged; historical browser consumers use the corrected purpose-aware view. | Execute independently. The configured member produced by ordinary message routes may supply the data, but exact configured-member UI/API assertions remain separate from task-Team assertions. |
| `NTH-LIVE-002A/B/C` / AC-017 | Added by user after round 1; not executed. | Production Team Communication/delegation behavior remains unchanged; fixture-only instruction/handoff edits are approved. | Execute three separate real root runs. No route/tool substitution. Every run gets its own stop/restart, history verification, and post-restart same-route/tool continuation. |
| Prior server durable `NTH-E2E-001`–`004` | 3 files / 7 tests Pass. | Backend/migration/Memory Sync source unchanged in IR-002. | Still Valid; rerun the three files once at current HEAD as retained cumulative regression evidence. |
| IR-002 mapped frontend regressions | Not present in API-REV-001; reviewer 6 files / 32 tests Pass. | Directly represent live exclusion, historical recursive visibility/focus, exact open, and active transition repair. | Still Valid; rerun as round-2 repository evidence. |
| `HistoricalTeamLazyHydration.integration.spec.ts` | Fails before its scenario because its unchanged mocked `agentTeamRunStore` lacks `stopPendingTeamIds`. | The component/store contract is valid; the mock is stale and unrelated to IR-002 production. | `Needs Update`: this integration test is directly relevant to cold historical workspace hydration, so add the missing ref-shaped mock only and rerun. Do not alter production code or assertions to accommodate it. |

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `BEH-001` / cold nested projection and Event Monitor | Changed | REQ-001–REQ-003; AC-001, AC-002, AC-006, AC-007, AC-011 | Execute real filesystem-backed GraphQL reads after process restart and assert non-empty exact-member data plus genuine-empty control. |
| `BEH-002` / live write scope | Changed | REQ-001, REQ-003, REQ-006; AC-001–AC-003, AC-007, AC-010 | Retain focused construction tests and add lifecycle proof that current canonical member paths are the sole read/write result; runtime matrix remains focused repository evidence. |
| `BEH-003` / direct-root history | Preserved | REQ-004; AC-003, AC-011 | Keep a direct-root trace at `<root>/<agentRunId>` and assert it survives the same startup/restart journey. |
| `BEH-004` / Team Communication | Preserved | REQ-004; AC-004 | Query public Team Communication after restart and assert exact content, participants, timestamps, ordering, and reference paths. |
| `BEH-005` / startup migration and recovery | Added | REQ-005; AC-005, AC-006, AC-008, AC-009, AC-012–AC-014 | Add actual built-server startup/restart/manual-retry E2E over isolated V1 packages; update stale exact-ledger cardinality. |
| `BEH-006` / sync-visible residue and canonical imported read | Preserved and newly locked by coverage | REQ-008; AC-015, AC-016; MP-001/MP-002 | Extend the real two-process Memory Sync E2E with both-path export, two-sync no-delete retention, and imported canonical-only semantic reads. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Immutable physical scope, child append, task-Agent leaf, index derivation | Changed unit/integration suites and production build passed source review | Cross-process persistence and API composition | Actual built-server lifecycle E2E |
| API / transport / contract | Behavior changes, schema unchanged | Existing projection, Event Monitor, migration status/retry, communication, Memory Explorer queries | Direct-root projection E2E, generic migration runner unit, generic Memory Sync API E2E | Nested canonical target, manual retry for this definition, imported nested canonical selection | GraphQL/REST E2E against real processes |
| Frontend component / state | Yes in IR-002 | Lifecycle-derived `LIVE_EXECUTION` / `HISTORICAL_INSPECTION` row eligibility, exact focus, and focus repair | Reviewer 6 files / 32 tests and production build passed | Actual settled task cold reopen and configured-member rendering | Browser development path |
| Browser integration / user journey | Yes | Historical workspace selection -> nested conversation/Activity/Event Monitor, plus three exact communication/delegation routes across restart/continuation | Prior defect reproduction and source regressions | Real post-fix cold state, route non-substitution, continuation | Browser against isolated built backend and current web dev server |
| Authentication / session / permissions | No | Local trusted desktop/backend path; no auth change | Existing system behavior | None material to this change | N/A |
| Desktop renderer / web-equivalent UI | Yes | Web-equivalent Electron renderer journey | Web code and contracts unchanged | Rendered post-fix nested history | Browser preferred per skill |
| Desktop shell / Electron-specific integration | No | No preload/IPC/window/package change | Static diff and architecture | None | No actual desktop run |
| Process / lifecycle | Yes | Startup migration before Fastify, cold restart, idempotence | Unit migration and generic runner tests | Actual process order and restart state | Built server process lifecycle |
| Persisted-data transition | Yes | Current-V1-directed whole-directory rename and state classification | New migration unit state table/byte/rerun coverage | Public cold read, failed startup plus manual retry | Built startup/API E2E |
| Worker / queue / distributed coordination | Yes, preserved | Memory Sync source/hub process boundary | Existing two-process E2E | MP-001/MP-002 and imported nested semantic selection | Two real backend processes |
| External integration | No required external provider/hub | Runtime/provider kind does not select paths; hub is locally emulated by real server | All-runtime focused tests; local real source/hub path | Live cloud provider adds no material path evidence | Not required |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`
- Project type and runtime stack: pnpm TypeScript monorepo; Fastify/GraphQL/REST/WebSocket backend, Nuxt web frontend, Electron wrapper, Vitest, Prisma/SQLite.
- Conflicting, missing, or unclear project instructions: none. Repository-wide server `pnpm typecheck` has the upstream `tests` outside `rootDir: src` `TS6059` baseline; `pnpm build` is the authoritative production compilation path.
- Required environment variables or secrets available: deterministic repository coverage needs no provider secret. For the user-requested realistic journey, secrets were imported from `/Users/normy/.autobyteus/server-data/.env` into an isolated test database with the documented `pnpm secrets:import` command; no values were logged. The private Nested Classroom package came from `/Users/normy/autobyteus_org/autobyteus-private-agents`, and the agent package came from `/Users/normy/autobyteus_org/autobyteus-agents`.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/README.md` | Monorepo setup and Memory Sync overview | `pnpm install`; persistent local development and trusted node model. |
| `autobyteus-server-ts/AGENTS.md` | Closest server test instruction | Use `pnpm -C autobyteus-server-ts exec vitest run ... --no-watch`; narrow before broad. |
| `autobyteus-server-ts/README.md` | Authoritative build/run/E2E/environment instruction | `pnpm -C autobyteus-server-ts build`; `node dist/app.js --data-dir ...`; `pnpm test:e2e`; tests must not use development or user databases. |
| `autobyteus-server-ts/docs/design/production_data_migration_conventions.md` | Persisted-transition constraints | Isolated fixtures, one normal writer, deterministic current target, current-only runtime, bounded evidence, ordinary retry/idempotence. |
| `autobyteus-server-ts/docs/features/memory_sync.md` | Sync process/storage/API/test contract | v1 full-file replace, no deletes; real two-process test is supported realistic boundary. |
| `autobyteus-web/AGENTS.md` and `autobyteus-web/README.md` | Frontend test and desktop/web execution | `pnpm test:nuxt ... --run`; prefer browser dev path for web-equivalent behavior. |
| `autobyteus-web/docs/memory.md` | Current canonical nested storage and Memory UI contract | V1 tree plus `rootTeamRunId + ancestorTeamRunIds + agentRunId`; imported corpus is read-only and canonical. |
| Root and package `package.json` files | Executable scripts | Root `test:e2e`; server build/test; web build/test/probes. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Deterministic repository E2E | worktree root/server | `pnpm -C autobyteus-server-ts exec vitest run <files> --no-watch` | Uses isolated test SQLite/temp app-data | Vitest result | Test hooks remove owned temp roots/processes |
| Built backend for browser | worktree root | `pnpm -C autobyteus-server-ts build`; `node autobyteus-server-ts/dist/app.js --data-dir <owned-temp> --host 127.0.0.1 --port <free>` | Sanitized isolated HOME/data/database; no user profile | `/rest/health` | SIGTERM only the recorded PID; remove owned temp root |
| Nuxt frontend for browser | `autobyteus-web` | documented dev command with backend base URL and a free owned port | Web-equivalent renderer; no Electron shell need | HTTP response/DOM | Stop only recorded PID; clear owned browser tab/state |
| Memory Sync source/hub | server multiprocess E2E | Existing `memory-sync-multiprocess.e2e.test.ts` starts two built server processes | Isolated app-data roots and loopback ports | Both `/rest/health` | Existing `afterAll` stops both and removes temp root |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Current V1 configured/task/deep topology | `tests/fixtures/app-data-migrations/team-run-execution-tree-v1/case-003-nested-task-team` | Strict current package; exact TeamRun/AgentRun identities | Copy into per-test/per-browser owned app-data only |
| Released flat nested memory | Write full member directories at `<root>/<agentRunId>` using synthetic raw traces/sibling sentinels | Never touch `/Users/normy/.autobyteus` or Docker production volume | Removed with owned runtime |
| Direct-root and empty controls | Synthetic trace under `<root>/<rootAgentRunId>` and one V1 member without traces | Exact same root/package as nested case | Removed with owned runtime |
| Team Communication | Case-003 V1 communication record/reference data | Public read only; no production data | Removed with owned runtime |
| Invalid canonical target for retry | Regular file at the canonical member directory path, plus preserved flat source | Safe deterministic obstruction, not a mechanical failure matrix | Delete only the test-owned blocker before manual Retry |
| Memory Sync conflict/retention | Synthetic valid V1 roots with flat/canonical member paths | Real loopback source/hub, isolated app-data | Existing multiprocess cleanup |

## Persisted Data Transition Coverage Basis

- Approved decision: `Migration Required`
- Design-spec and implementation-handoff references: `design-spec.md` persisted-data decision, migration plan/state table, DS-006/DS-007; `implementation-handoff.md` Persisted Data Transition Check.
- Representative existing-data setup and required behavior: strict current V1 package with direct-root memory, multiple flat configured/task/deep member directories, full sibling files, Team Communication, and one unmaterialized member.
- Evidence planned: first actual built-server startup moves complete eligible directories before GraphQL access; public nested projection and Event Monitor hydrate exact traces; direct root and communication remain unchanged; process restart leaves ledger/bytes/read results stable.
- Migration-specific completion/recovery scenarios: success/rerun, valid-target conflict warning through unit plus sync E2E, invalid canonical target causing non-blocking `FAILED`/`MANUAL_RETRY`/`canRetry`, dependent prerequisite block, correction plus public manual retry to success.
- Upstream ambiguity or reroute required: none.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| 18 changed unit/integration files listed in `implementation-handoff.md` | Live root/configured/task/deep scopes, migration state table, bytes, idempotence, registration/prerequisites | REQ-001, REQ-003, REQ-005–REQ-007; AC-003, AC-005–AC-010, AC-013 | Still Valid | `CRR-001` passed all changed files | Rerun focused set after E2E edits. |
| `tests/unit/agent-memory/agent-memory-location-service.test.ts` | Canonical direct/configured/task locations | REQ-001–REQ-003; AC-001–AC-003, AC-007 | Still Valid | Canonical reader authority is unchanged and approved | Include focused owner run. |
| `tests/unit/agent-memory/team-memory-explorer-service.test.ts` | Current V1 semantic member discovery | REQ-008; AC-015/016 | Still Valid but insufficient alone | Direct-root only and single-process | Retain; add real imported nested proof in multiprocess E2E. |
| `tests/unit/app-data-migrations/app-data-migration-runner.test.ts` | Generic prerequisite, recovery action, manual retry/idempotence | AC-013/014 | Still Valid but generic | `CRR-001` owner-focused pass | Retain and add definition-specific public lifecycle E2E. |
| `tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts` ledger transition | Released ledger preserves old records and adds the three current definitions | REQ-005/007; AC-005, AC-012–AC-014 | Updated / Still Valid | Round 1 changed the stale two-record cardinality and asserted the exact layout migration ID. | Retain; round-2 rerun passed in the 3-file / 7-test server E2E run. |
| Same production-upgrade E2E overall | Actual startup, V1 conversion, health, restart immutability | AC-005, AC-009, AC-012/013 | Still Valid | Real built process and isolated released-shape cohort | Retain; focused new layout lifecycle gets a separate E2E file to avoid coupling unrelated assertions. |
| `tests/e2e/run-history/recent-run-projection-graphql.e2e.test.ts` | Filesystem-backed projection/Event Monitor, active-window and empty behavior | AC-001, AC-002, AC-011 | Still Valid but lacks nested ancestry/process restart | Direct team member path only, in-process GraphQL | Retain; new lifecycle E2E uses same public queries for nested members. |
| `tests/e2e/runtime/nested-mixed-team-runtime-graphql.e2e.test.ts` | Real configured nested team across AutoByteus/Codex/Claude and restore | REQ-003/006; AC-007/010 | Still Valid, conditional broader evidence | Real provider/model configuration required and restore is same-process; not deterministic restart coverage | Do not weaken or repurpose; focused deterministic tests cover invariant. Run only if configured broader evidence is needed. |
| `tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` and task construction integration tests | Task-Agent/task-Team execution semantics | REQ-003; AC-002/007 | Still Valid | Shared factories/registries are the changed boundary | Include focused deterministic files selected by changed test list. |
| `tests/e2e/memory-sync/memory-sync-api.e2e.test.ts` | Public sync config/REST ingestion/imported standalone reads | REQ-008 | Still Valid but insufficient for MP-001/002 | In-process source/hub and standalone imported target | Retain unchanged unless execution reveals a reusable assertion need. |
| `tests/e2e/memory-sync/memory-sync-multiprocess.e2e.test.ts` | Two real backend processes prove MP-001 conflict and MP-002 no-delete relocation with canonical imported semantic reads | REQ-008; AC-015/016 | Updated / Still Valid | Round 1 added both-path export/retention and canonical-only imported view assertions. | Retain; round-2 rerun passed. |
| IR-002 purpose-aware tests (`teamExecutionViewState.spec.ts`, run-history execution rows/navigation projection, team-run open coordinator) | Active views exclude settled tasks; inactive historical views recursively include/focus settled task-Agent/task-Team descendants; exact open avoids live stream connection; activation repairs focus | REQ-002/007; AC-002/012; DS-009; MP-003 | Still Valid | `CRR-003` passed mapped owner/integration assertions; source ownership matches design. | Rerun all four plus adjacent workspace interaction files. |
| Existing hydration/query/Settings tests (`teamRunContextHydrationService.spec.ts`, run-history queries/store, Settings migration tests) | Existing backend projection/communication/retry payload reaches renderer state | REQ-002/004/005/007 | Still Valid but insufficient alone | Round-1 focused mocked tests passed; mocks do not prove real persisted settled-task navigation. | Retain prior evidence; real browser is mandatory. |
| `components/workspace/history/__tests__/HistoricalTeamLazyHydration.integration.spec.ts` | Normal historical workspace tree lazy hydration and member selection | REQ-002/007; AC-001/002/012 | Needs Update -> Updated / Still Valid | Before-edit execution reproduced the missing `stopPendingTeamIds` mock failure; adding the three already-existing store contract members made the unchanged scenario pass. | Retain the narrow mock correction; 1/1 and combined 7 files / 33 tests passed. |

## Stale Or Obsolete Coverage Decisions

No durable coverage was deleted. Round 1 updated, rather than removed, the obsolete exact “two new migration records” cardinality. Round 2 updated, rather than removed, the stale historical-workspace store mock. No current obsolete assertion remains in the selected scope.

## Round 1 Durable Coverage Additions (Completed And Retained)

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| `NTH-E2E-001` | Successful startup migration, configured/deep/task nested cold projection and Event Monitor, direct-root/empty/communication controls, process restart idempotence | REQ-001–REQ-007; AC-001–AC-013; DS-002/004/005/006 | New `autobyteus-server-ts/tests/e2e/run-history/nested-team-history-restart.e2e.test.ts` | No current deterministic test crosses strict V1 filesystem -> startup migration -> public nested history -> process restart. |
| `NTH-E2E-002` | Invalid canonical target leaves startup healthy, layout status `FAILED` with `MANUAL_RETRY`/`canRetry`, dependents blocked, public Retry succeeds after correction | REQ-005/007; AC-008/013/014; DS-006/007 | Same new lifecycle E2E file | Generic runner unit evidence does not prove this registered definition through actual startup and GraphQL. |
| `NTH-BR-001` | Historical workspace nested member renders non-empty conversation and Activity after cold process reopen | REQ-002/007; AC-001/002/012 | Browser automation against isolated built backend/current Nuxt; retained screenshot/log evidence | Round 1 failed and exposed the frontend gap. IR-002 supplied deterministic durable purpose/view/focus coverage; round 2 directly passed the real cold browser scenario. |

## Durable Coverage Updates (Completed)

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| `NTH-E2E-003` | `tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts` ledger transition | Identifies three new migration records, including `20260823_repair_team_agent_memory_layout` | REQ-005/007; AC-005/012/013; `CRR-001` residual-risk note | Completed in round 1; round-2 rerun Pass. |
| `NTH-E2E-004` | `tests/e2e/memory-sync/memory-sync-multiprocess.e2e.test.ts` | MP-001 local conflict export, MP-002 pre-upgrade flat import retention across two real syncs, and imported canonical nested GraphQL read | REQ-008; AC-015/016; DS-008; MP-001/002 | Completed in round 1; production Memory Sync unchanged; round-2 rerun Pass. |

## Durable Coverage To Remove

None.

## Round 1 Repository Coverage Execution Results (Preserved)

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/run-history/nested-team-history-restart.e2e.test.ts tests/e2e/memory-sync/memory-sync-multiprocess.e2e.test.ts tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts --no-watch` | worktree; isolated test runtimes and real built processes | Direct durable changes: restart/retry, ledger, MP-001/MP-002 | Pass — 3 files / 7 tests | `api-e2e-evidence/repository-focused-e2e.log` |
| 2 | `pnpm -C autobyteus-server-ts test --run <23 changed/owner files>` | worktree/server | Scope/factory/migration/reader/runner/imported owners | Pass — 23 files / 101 tests | `api-e2e-evidence/repository-owner-focused.log`; file list in `repository-owner-focused-files.txt` |
| 3 | `pnpm test:e2e` | worktree root | Broad server API/E2E regression surface | Fail outside ticket surface — 47 files pass, 7 fail, 14 skip; 185 tests pass, 7 fail, 51 skip | `api-e2e-evidence/server-full-e2e.log` |
| 4 | Serial rerun of the seven full-suite failing files with `--maxWorkers=1` | server | Failure isolation | Five unrelated stale/baseline failures persist; file-watcher and token-analytics failures pass serially and are concurrency flakes | `api-e2e-evidence/server-full-e2e-failures-serial.log` |
| 5 | `pnpm -C autobyteus-server-ts build` | worktree root | Production compile/bootstrap | Pass | `api-e2e-evidence/server-build.log` |
| 6 | Focused `pnpm -C autobyteus-web test:nuxt ... --run` over four hydration/query/store/Settings files | web | Existing client-contract controls | Pass — 4 files / 18 tests | `api-e2e-evidence/frontend-focused.log` |
| 7 | `git diff --check` and protected production-source audit | worktree | Patch integrity/no API/E2E-owned production drift | Pass | `api-e2e-evidence/repository-audits.log` |

## Round 1 Post-Repository Confidence Scorecard (Preserved)

| Confidence Category | Score | Evidence And Remaining Gap |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 90% | Durable restart/retry, controls, migration, and MP-001/MP-002 passed, but critical browser cold reopen remained unproven. |
| Changed-boundary execution directness | 95% | Real built server processes, public GraphQL, physical files, restart, and two-process sync directly exercised the changed backend boundary. |
| Cross-boundary integration realism and mock gap | 92% | Strong server/process evidence; frontend results were still mocked before broader execution. |
| Environment, configuration, identity, and fixture fidelity | 92% | Strict current V1 and isolated app-data/database fixtures were realistic, but no provider-created run had yet crossed the UI. |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | Invalid target, truthful failed state, dependency blocking, manual retry, idempotent restart, and no-delete sync were direct. |
| User-surface, browser, and desktop-shell confidence | 75% | Existing frontend tests passed but browser-visible cold task selection was still indirect; Electron-only behavior was inapplicable. |
| Durable regression coverage quality and relevance | 95% | Three narrow requirement-linked durable E2Es covered the changed backend and persistence boundaries. |

- Overall post-repository confidence: `90.6%` (simple average of seven applicable categories).
- Result at this gate: not eligible for `Pass`; browser broader validation remained mandatory because one applicable category was below 90% and AC-012 explicitly requires it.

## Round 2 Repository Coverage Execution Results

| Order | Command | Boundary / Scenario | Result | Evidence |
| --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-web test:nuxt components/workspace/history/__tests__/HistoricalTeamLazyHydration.integration.spec.ts --run` before and after the mock correction | Stale-test validity and normal historical workspace integration | Before: Fail at missing `stopPendingTeamIds`; after: Pass, 1 file / 1 test | `api-e2e-evidence/round-2/historical-team-lazy-hydration-before-fix.log`; `historical-team-lazy-hydration.log` |
| 2 | Focused Nuxt Vitest over the seven IR-002 mapped/adjacent files | Historical recursive visibility/focus/open, live exclusion, workspace interaction, lazy hydration | Pass, 7 files / 33 tests | `api-e2e-evidence/round-2/frontend-focused.log` |
| 3 | `pnpm -C autobyteus-web guard:web-boundary`; `guard:localization-boundary`; `build` | Protected frontend boundaries and production renderer bundle | Pass | `frontend-guards.log`; `frontend-build.log` |
| 4 | Focused Vitest over the three retained server E2Es | Restart/retry/migration ledger/MP-001/MP-002 using actual built processes | Pass, 3 files / 7 tests | `api-e2e-evidence/round-2/server-durable-e2e.log` |
| 5 | `pnpm -C autobyteus-server-ts build` | Current production server artifact | Pass | `api-e2e-evidence/round-2/server-build.log` |
| 6 | Runtime-specific production frontend build with backend endpoints `127.0.0.1:62318` | Exact browser bundle/backend contract used live | Pass | `api-e2e-evidence/round-2/real-classroom/frontend-runtime-build.log` |
| 7 | `git diff --check`, private fixture JSON/diff checks, port/runtime cleanup and secret-value audit | Patch/fixture integrity, resource cleanup, credential hygiene | Pass | `api-e2e-evidence/round-2/repository-audits.log`; `runtime-audits.log`; real-classroom `cleanup-report.txt`; `secret-leak-audit.txt` |

## Round 2 Post-Repository Confidence Scorecard

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation |
| --- | ---: | --- | --- | --- |
| Requirement and acceptance-criteria proof | 92% | Server restart/retry/sync plus purpose-aware frontend regressions pass. | Real cold configured/task UI and AC-017 routes remain unexecuted at this gate. | Three independent real browser/restart flows. |
| Changed-boundary execution directness | 96% | Built servers, filesystem layout, GraphQL, migration retry, and actual state/view owners execute directly. | Renderer integration is still repository-scoped. | Browser against the production bundle. |
| Cross-boundary integration realism and mock gap | 93% | Server E2Es cross real process/storage/API boundaries; frontend integration passes with mocks. | Real provider -> persistence -> cold browser boundary remains. | Isolated provider-created runs. |
| Environment, configuration, identity, and fixture fidelity | 94% | Current V1 data, real built processes, isolated SQLite/app-data, and dedicated private package are available. | Real identities/routes are not yet observed. | Import secrets and both real package roots into isolated runtime. |
| Failure, edge-case, lifecycle, and recovery evidence | 96% | Invalid target, truthful `FAILED`/`MANUAL_RETRY`/`canRetry`, prerequisites, manual retry, relaunch, and two-process no-delete sync pass. | Browser cold continuation remains. | Real stop/restart for A/B/C. |
| User-surface, browser, and desktop-shell confidence | 85% | Purpose/focus/component regressions and production build pass. | Critical cold browser proof remains absent; shell is unchanged. | Normal Chrome workspace journey. |
| Durable regression coverage quality and relevance | 98% | Direct backend E2Es plus the repaired lazy-hydration integration and IR-002 view tests are narrow and requirement-linked. | Credential-dependent full live flow is intentionally temporary. | No additional durable coverage needed before live proof. |

- Overall post-repository confidence: `93.4%` (simple average of seven applicable categories).
- Every critical acceptance criterion directly proven at this gate: `No` — AC-001/002 browser proof and AC-017 remained.
- Any applicable category below 90%: `Yes` — user-surface/browser confidence `85%`.
- Default clean-confidence target of 95% met: `No`.
- Broader validation: `Required`.

## Broader Validation Decision

- Decision: `Required`
- Selected execution mode: `Lifecycle` + `Worker or Distributed` in durable E2E, followed by `Browser` for the web-equivalent renderer journey.
- Specific confidence gap or residual risk addressed: real configured/task history, exact A/B communication routing, C delegation lifecycle, cold restart, exact DOM rendering, and continuation were not fully proven by repository tests.
- Why the selected mode can materially improve confidence: it crosses provider -> tool route -> persisted filesystem -> real server stop/restart -> GraphQL -> production Nuxt/Chrome.
- Expected confidence after selected validation: at least 95% overall with no category below 90%, provided all critical scenarios pass.
- Browser-specific decision and rationale: required by AC-012/AC-017 and because the prior defect was a browser-visible historical navigation failure. The stable production Nuxt static bundle is used against an isolated built backend; no Electron-shell behavior changed.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron wrapper around the Nuxt renderer.
- Relevant README or development instructions: `autobyteus-web/AGENTS.md`, `autobyteus-web/README.md`, root/server README.
- Web-equivalent behavior: workspace history tree selection, conversation hydration, Activity/Event Monitor presentation, migration Settings status.
- Shell-specific or lifecycle behavior: none changed; backend process restart is exercised independently.
- Chosen validation approach and why it fits the project: browser against the documented web development path and an isolated built backend. This directly proves renderer behavior while avoiding unnecessary Electron interference.
- Effect on any already-running desktop application: none; use distinct loopback ports and an owned browser tab.
- Behavior not directly proven and confidence consequence: Electron preload/IPC/window management is out of scope and does not reduce confidence because no shell source or contract changed.

## Round 1 Live Environment And Fixture Execution (Preserved Failure History)

- Startup and isolation: production server build; isolated runtime root/database/HOME; secrets imported with `pnpm secrets:import`; private Nested Classroom and agent packages imported; backend on owned port `58376`; current Nuxt frontend on the owned IPv4 `3000` listener; readiness through `/rest/health`, frontend HTTP, and DOM.
- Real identity/runtime: actual `deepseek-v4-flash` AutoByteus provider created root TeamRun `nested_classroom_test_team_ef79cfb19d364f558b6f5e5ae2e08194` and delegated task-Team AgentRun `student_one_e7a87cdb646e4678ac5ffacf5a82dcbe` with exact token `API_E2E_REAL_ACTIVE_COLD_RESTART_OK`.
- Lifecycle: the task rendered live, the backend was stopped with `SIGKILL`, then restarted cold with the same isolated data and database. One misconfigured restart omitted `DATABASE_URL`; it was stopped before explicit validation and is excluded in `excluded-misconfigured-restart.txt`. Correctly configured restart evidence is authoritative.
- Backend result: task projection `4` conversation / `2` activities / non-null last activity, Event Monitor `4` events, direct-root `6` / `2`, task record `interrupted`, and task raw SHA-256 byte-identical.
- Browser result: direct-root and Team task-record controls passed, but historical task-row count was `0`; normal exact history selection rejected the task AgentRun as “not live.” `NTH-BR-001`, AC-002, and browser AC-012 failed.
- Cleanup: isolated runtime/database/secrets/package deleted; owned backend/frontend stopped; owned browser tab closed; unrelated IPv6 port-3000 listener PID `37602` untouched. See `api-e2e-evidence/real-classroom/cleanup-report.txt`.

## Round 2 Live Environment, Fixture, And Result

- Isolation: owned runtime/database/HOME under `autobyteus-server-ts/tests/.tmp/api-e2e-round2-classroom.omOfCe`, backend `127.0.0.1:62318`, production Nuxt static bundle `127.0.0.1:62319`, no auth change, and both user-authorized package roots.
- Secrets: imported through the documented `pnpm secrets:import` path; dry-run/actual logs retain no values; a value-level audit checked 12 secret-like environment values and found zero evidence hits.
- Fixture: only the dedicated private `nested-classroom-test` instructions, handoffs, and launch config changed. Production source was not modified for the live tests.
- Runtime: real `deepseek-v4-flash` AutoByteus executions. A/B/C used distinct root TeamRun IDs and distinct markers.
- Lifecycle: each scenario recorded its own server stop, cold backend restart with the exact database/app-data, historical DOM/API assertions, and supported post-restart same-route/tool continuation.
- Browser: Google Chrome `151.0.7922.170`, headless semantic DOM assertions, 1600x1100 viewport, production Nuxt build. Screenshots support but do not replace DOM/API evidence.

| Scenario | Exact Route / Tool | Cold History And Continuation Result | Evidence |
| --- | --- | --- | --- |
| `NTH-LIVE-002A` / configured AC-001 | Teacher `send_message_to` recipient `/StudentStudyGroup`; Student One reply via `send_message_to` | Pass. Four exact ordered root-scoped messages after continuation; sender/receiver/content/timestamps/reference association exact. Configured Student One conversation, Activity `2 Events`, Event Monitor, Team Communication, last activity, and four cold GraphQL markers pass. Same team-address route/tool continues. | `real-classroom/nth-live-002a-pre-result.json`; `nth-live-002a-post-result.json`; cold/continuation PNGs; `real-boundary-graphql-summary.json` |
| `NTH-LIVE-002B` / configured AC-001 | Teacher `send_message_to` recipient `/StudentStudyGroup/student_one`; Student One reply | Pass. Separate run and markers. Four exact ordered messages and pre reference association pass. Configured conversation, Activity `3 Events`, Event Monitor, Team Communication, last activity, and cold GraphQL markers pass. Same direct-member route/tool continues. | `nth-live-002b-pre-result.json`; `nth-live-002b-post-result.json`; cold/continuation PNGs; GraphQL summary |
| `NTH-BR-001` + `NTH-LIVE-002C` | Teacher `delegate_task` recipient `/StudentStudyGroup`; task Student One `submit_task_result`; Teacher `review_task_result accept` | Pass. After real cold restart, exact settled task-Team row and child row are visible/selectable; task conversation, `submit_task_result`, Event Monitor, Activity `2 Events`, Task panel, root last activity render. A second same-route delegation is submitted/accepted. Inactive history has two settled task rows; restored active view excludes both. Cold GraphQL has 5/2/5 and 9/3/9 conversation/activity/event counts with non-null last activity for the two exact task Students. | `nth-live-002c-pre-result.json`; `nth-live-002c-post-result.json`; `nth-live-002c-live-projection-result.json`; five PNGs; GraphQL raw/summary |
| `NTH-E2E-002` | Invalid target then public `runAppDataMigration` | Pass. Startup stays healthy; layout `FAILED`, `MANUAL_RETRY`, `canRetry: true`; dependents `NOT_RUN`; correction and public retry succeed and unblock dependent. | `round-2/server-durable-e2e.log`; durable test |
| `NTH-E2E-004` / MP-001/MP-002 | Real source backend -> HTTP hub backend -> imported canonical reader | Pass. MP-001 exports flat+canonical conflict but imported semantic view returns canonical only. MP-002 second sync retains old flat plus canonical copy and semantic view uses canonical location. | Same server E2E log; durable test source |

The first A harness disconnected before its conditional pending-tool button became actionable; the exact pending `send_message_to` invocations were then approved through the same real browser/WebSocket/canonical root route. The canonical messages, tool args, cold history, and continuation are direct. One aborted B harness was terminated before validation because its wait predicate was over-broad; that root was deleted and is excluded in `nth-live-002b-aborted-cleanup.json`. The first C post script made two overstrict harness assumptions (a transient child row should display a timestamp, and immediate live pruning); component inspection plus the separate live restore probe established the actual contract, and the final assertion passed. These harness corrections did not change production or substitute routes/tools.

- Cleanup: all three root runs were terminated; backend/frontend PIDs stopped; ports 62318/62319 have zero listeners; isolated runtime/database/HOME removed; unrelated processes untouched. Evidence: `real-classroom/cleanup-report.txt`, `runtime-artifact-hashes.txt`, `runtime-audits.log`.
- Current result: every critical scenario passes; no reroute trigger remains.

## Temporary Executable Validation Results

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Does Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `NTH-BR-001` round-1 baseline | Test-owned real-provider phase scripts and semantic cold UI probe | Historical failure: settled task row absent and exact focus rejected. | Preserved only as prior-failure evidence; source repair added durable view/focus regressions. |
| `NTH-BR-001` / `NTH-LIVE-002C` round 2 | Real provider, built backend, production Nuxt/Chrome, actual stop/restart, DOM plus GraphQL | Pass: exact settled task-Team/member navigation/rendering and same-route delegation continuation. | Credential/provider/package-dependent full-system probe is retained as evidence, while deterministic state/view behavior is durable. |
| `NTH-LIVE-002A/B` | Same isolated real system with two separate communication routes/runs | Pass: team-address and member-address messages, canonical Team Communication, cold configured-member UI/API, same-route continuation. | Dedicated live fixture and external provider make this unsuitable for the repository's deterministic suite. |

## Round 2 User-Mandated Live Communication Coverage Disposition

All three user-mandated routes were executed independently and passed in round 2. The planned requirements below are retained as the validity basis; observed evidence is in the round-2 live matrix above.

| Scenario ID | Required Independent Flow | Required Evidence |
| --- | --- | --- |
| `NTH-LIVE-002A` | Give Teacher a user prompt that requires ordinary `send_message_to` to the nested `/StudentStudyGroup` **team address**. Do not substitute direct-member messaging or `delegate_task`. | Prove team-address routing reaches the nested coordinator, appears in Team Communication with exact sender/recipient/content/order/reference data, survives a server stop/cold restart, reloads the exact history, and permits a new follow-up message after restart. |
| `NTH-LIVE-002B` | In a separate independently identifiable prompt/run, require Teacher to use ordinary `send_message_to` directly to `/StudentStudyGroup/student_one`. Do not substitute team-address messaging or `delegate_task`. | Prove exact individual routing and receipt, Team Communication data, cold history reload after server stop/restart, and successful continued two-way communication after restart. |
| `NTH-LIVE-002C` | In a third independently identifiable prompt/run, require Teacher to use `delegate_task` to `/StudentStudyGroup`. Do not substitute either `send_message_to` route. | Prove task-Team creation, student execution/submission/review, task record, exact task member history, cold-reopen selection/render, and successful continuation of the supported task/team interaction after server stop/restart. |

- Use distinct content markers and independently addressable runs so team-address communication, individual-address communication, and delegation cannot satisfy each other's assertions.
- The Nested Classroom package is a dedicated validation fixture. Its Teacher instructions, agent instructions, and fixture-owned handoff rules may be updated as needed to enable these flows, provided each agent remains independently addressable and production handoff behavior is not changed merely for the test.
- Each of the three flows must cross a real server stop/cold restart, reload the exact relevant history, and then perform a new supported interaction proving the flow can continue rather than only rendering old data.
- This is additional live coverage, not a replacement for the durable settled-task frontend regression required by `NTH-BR-001`.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Codex/Claude provider variants in live UI | Scope selection remains provider-independent and deterministic runtime-kind coverage passed. The broader journey used real AutoByteus `deepseek-v4-flash`; runtime-kind deterministic coverage proves the scope algorithm remains provider-independent. | Low | None for failure classification. |
| Actual Electron shell | No shell/preload/IPC/package source changed. | Negligible | None. |
| Docker/Kubernetes network routing to a remote hub | Operational network setup is unchanged and documented; real loopback multi-process HTTP crosses the application boundary. | Low | None for this ticket. |
| Arbitrary kernel/device/power/syscall/concurrent-writer failure matrix | Explicitly excluded by approved migration convention and AC-013. | N/A by contract | Do not add. |

## Ambiguities Or Reroute Triggers

None remain. `CRR-005` confirmed the API-REV-003 origin as API/E2E environment/execution contamination, not a source/navigation defect. Explicit user approval and the authoritative recovery assessment resolved the recovery ambiguity through one backed-up stopped-state exact-row reset. The unchanged production migration then succeeded normally against the real paired state, and the user confirmed the recovered packaged UI.

The isolation incident remains permanently recorded: future realistic API/E2E execution must couple a test-owned app-data root with its test-owned `DATABASE_URL` and reject the user's production database before process startup.

## Investigation Decision

- Proceed To API/E2E Execution: `Completed`.
- Repository-Resident Durable Coverage Added / Updated / Removed In Round 4: `No`.
- Dedicated external fixture changes in round 4: `No`.
- Prior result / confidence: `API-REV-003` `Fail` / `82.1%` for the contaminated incident state.
- Round-4 final confidence: `98.7%`.
- Broader validation decision: `Required and completed` — backed-up exact-row recovery, normal packaged migration, exact six-member byte/identity/filesystem/public-history verification, and user-executed packaged restart/click confirmation.
- Reroute Required: `No` failure reroute.
- Recommended Recipient: `/code_reviewer` for a proportional `Not Applicable`/reconciliation review because round 4 changed no repository-resident durable coverage, then `/delivery_engineer` after review.
- Notes: `API-REV-004` and the canonical execution report are current. API-REV-003 remains historical incident evidence only and is superseded by the successful recovery result.
