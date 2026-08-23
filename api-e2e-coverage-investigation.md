# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/design-spec.md`
- Supplemental Task Artifacts: the restart reproduction and three browser captures under `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/investigation-evidence/`, plus the four retained user screenshot paths catalogued in `requirements.md`.
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/solution-revision-record.md`; current `SR-004`.
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/architecture-review-revision-record.md`; current pass `ARCH-REV-002`.
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/implementation-handoff.md`; current `IR-001`.
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/code-review-report.md`; pass at implementation commit `e6bca7a8b`.
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/code-review-revision-record.md`; current `CRR-001`.
- Delivery Revision Record (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- API/E2E Revision Record: created after the first completed result; no prior record exists.
- Current API/E2E Revision ID: `N/A`
- Current Investigation Round: `1`
- Trigger: initial API/E2E stage after `CRR-001` pass, including the reviewer-identified exact-ledger expectation that predates the new registered migration.
- Prior Investigation Reviewed: `N/A`; no prior API/E2E result or confidence is inferred.
- Latest Authoritative Investigation: this file.

## Current Requirement And Design Basis

The approved change must prove one canonical physical scope for live writes and cold reads across direct-root, configured nested, delegated task-Agent, delegated task-Team, and deeper TeamRun ancestry. Already-affected flat nested AgentRun directories must move as complete directories during required startup migration before public history access. Cold GraphQL projection and Event Monitor reads must then return real conversation/activity data, while a genuinely empty subject stays empty. Direct-root history and root Team Communication, including references and ordering, are controls.

The migration must be `requiredOnStartup` and `ANYTIME`: an invalid/unavailable canonical target produces truthful `FAILED` without preventing health/startup, exposes `MANUAL_RETRY` and `canRetry: true`, blocks not-yet-run canonical-location dependents through prerequisites, and succeeds idempotently after the obstruction is corrected. A real source plus independently valid canonical target is instead the approved bounded `SUCCEEDED_WITH_WARNINGS` no-mutation state.

Memory Sync v1 remains recursive, replace-only, and without delete propagation. Durable evidence must prove both local conflict paths can be exported, a pre-upgrade flat import can remain after local relocation, and imported semantic Team memory resolves only the V1 canonical member target. No sync filter, delete/tombstone, remote cleanup, sync gate, frontend behavior change, runtime fallback, or dual reader/writer is valid in scope.

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
| Frontend component / state | No production change | Existing hydration and Settings clients consume unchanged contracts | Focused mocked hydration/store/component tests | Actual rendered cold-reopen result | Browser development path |
| Browser integration / user journey | Yes as observable result | Historical workspace selection -> nested conversation/Activity/Event Monitor | Prior defect reproduction only; no post-fix evidence | The exact false-empty symptom after restart | Browser against isolated built backend and current web dev server |
| Authentication / session / permissions | No | Local trusted desktop/backend path; no auth change | Existing system behavior | None material to this change | N/A |
| Desktop renderer / web-equivalent UI | Yes | Web-equivalent Electron renderer journey | Web code and contracts unchanged | Rendered post-fix nested history | Browser preferred per skill |
| Desktop shell / Electron-specific integration | No | No preload/IPC/window/package change | Static diff and architecture | None | No actual desktop run |
| Process / lifecycle | Yes | Startup migration before Fastify, cold restart, idempotence | Unit migration and generic runner tests | Actual process order and restart state | Built server process lifecycle |
| Persisted-data transition | Yes | Current-V1-directed whole-directory rename and state classification | New migration unit state table/byte/rerun coverage | Public cold read, failed startup plus manual retry | Built startup/API E2E |
| Worker / queue / distributed coordination | Yes, preserved | Memory Sync source/hub process boundary | Existing two-process E2E | MP-001/MP-002 and imported nested semantic selection | Two real backend processes |
| External integration | No required external provider/hub | Runtime/provider kind does not select paths; hub is locally emulated by real server | All-runtime focused tests; local real source/hub path | Live cloud provider adds no material path evidence | Not required |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration`
- Project type and runtime stack: pnpm TypeScript monorepo; Fastify/GraphQL/REST/WebSocket backend, Nuxt web frontend, Electron wrapper, Vitest, Prisma/SQLite.
- Conflicting, missing, or unclear project instructions: none. Repository-wide server `pnpm typecheck` has the upstream `tests` outside `rootDir: src` `TS6059` baseline; `pnpm build` is the authoritative production compilation path.
- Required environment variables or secrets available: deterministic repository coverage needs no provider secret. For the user-requested realistic journey, secrets were imported from `/Users/normy/.autobyteus/server-data/.env` into an isolated test database with the documented `pnpm secrets:import` command; no values were logged. The private Nested Classroom package came from `/Users/normy/autobyteus_org/autobyteus-private-agents`, and the agent package came from `/Users/normy/autobyteus_org/autobyteus-agents`.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/README.md` | Monorepo setup and Memory Sync overview | `pnpm install`; persistent local development and trusted node model. |
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
| `tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts` exact `beforeRows.length + 2` | Released ledger preserves old records and adds currently pending definitions | REQ-005/007; AC-005, AC-012–AC-014 | Needs Update | Approved implementation registers a third new migration; source reviewer explicitly identified this expectation | Change to three and assert the exact layout migration ID/one record. |
| Same production-upgrade E2E overall | Actual startup, V1 conversion, health, restart immutability | AC-005, AC-009, AC-012/013 | Still Valid | Real built process and isolated released-shape cohort | Retain; focused new layout lifecycle gets a separate E2E file to avoid coupling unrelated assertions. |
| `tests/e2e/run-history/recent-run-projection-graphql.e2e.test.ts` | Filesystem-backed projection/Event Monitor, active-window and empty behavior | AC-001, AC-002, AC-011 | Still Valid but lacks nested ancestry/process restart | Direct team member path only, in-process GraphQL | Retain; new lifecycle E2E uses same public queries for nested members. |
| `tests/e2e/runtime/nested-mixed-team-runtime-graphql.e2e.test.ts` | Real configured nested team across AutoByteus/Codex/Claude and restore | REQ-003/006; AC-007/010 | Still Valid, conditional broader evidence | Real provider/model configuration required and restore is same-process; not deterministic restart coverage | Do not weaken or repurpose; focused deterministic tests cover invariant. Run only if configured broader evidence is needed. |
| `tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` and task construction integration tests | Task-Agent/task-Team execution semantics | REQ-003; AC-002/007 | Still Valid | Shared factories/registries are the changed boundary | Include focused deterministic files selected by changed test list. |
| `tests/e2e/memory-sync/memory-sync-api.e2e.test.ts` | Public sync config/REST ingestion/imported standalone reads | REQ-008 | Still Valid but insufficient for MP-001/002 | In-process source/hub and standalone imported target | Retain unchanged unless execution reveals a reusable assertion need. |
| `tests/e2e/memory-sync/memory-sync-multiprocess.e2e.test.ts` | Two real backend processes sync files and list imported standalone memory | REQ-008; AC-015/016 | Needs Update | Best existing real boundary; no delete/dual-path/canonical nested assertion yet | Extend narrowly with conflict and two-sync relocation scenarios plus imported nested view. |
| Web hydration/store/query tests (`teamRunContextHydrationService.spec.ts`, run-history queries/store, Settings migration tests) | Existing projection/communication/retry result reaches renderer state | REQ-002/004/005/007 | Needs Update after source repair | Focused mocked tests passed, but realistic cold recovery proved that settled task executions are filtered from navigation and cannot be focused. Existing coverage does not represent AC-002/AC-012. | Preserve current valid assertions; after implementation repair add a settled historical delegated-task TeamRun regression for row projection and exact task-Agent focus. |

## Stale Or Obsolete Coverage Decisions

No durable coverage will be deleted. The only obsolete assertion is the exact “two new migration records” cardinality in `team-run-v1-production-upgrade.e2e.test.ts`; the scenario remains authoritative and will be updated rather than removed.

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| `NTH-E2E-001` | Successful startup migration, configured/deep/task nested cold projection and Event Monitor, direct-root/empty/communication controls, process restart idempotence | REQ-001–REQ-007; AC-001–AC-013; DS-002/004/005/006 | New `autobyteus-server-ts/tests/e2e/run-history/nested-team-history-restart.e2e.test.ts` | No current deterministic test crosses strict V1 filesystem -> startup migration -> public nested history -> process restart. |
| `NTH-E2E-002` | Invalid canonical target leaves startup healthy, layout status `FAILED` with `MANUAL_RETRY`/`canRetry`, dependents blocked, public Retry succeeds after correction | REQ-005/007; AC-008/013/014; DS-006/007 | Same new lifecycle E2E file | Generic runner unit evidence does not prove this registered definition through actual startup and GraphQL. |
| `NTH-BR-001` | Historical workspace nested member renders non-empty conversation and Activity after cold process reopen | REQ-002/007; AC-001/002/012 | Browser automation against isolated built backend/current Nuxt; retained screenshot/log evidence | Executed and failed: the exact task projection is non-empty at GraphQL but the settled task-Team execution disappears from navigation and exact focus rejects. This identifies a durable frontend coverage gap that must be filled after source repair. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| `NTH-E2E-003` | `tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts` ledger transition | Expect and identify three new migration records, including `20260823_repair_team_agent_memory_layout` | REQ-005/007; AC-005/012/013; `CRR-001` residual-risk note | Proportionate one-helper update; not a source defect. |
| `NTH-E2E-004` | `tests/e2e/memory-sync/memory-sync-multiprocess.e2e.test.ts` | Add MP-001 local conflict export, MP-002 pre-upgrade flat import retention across two real syncs, and imported canonical nested GraphQL read | REQ-008; AC-015/016; DS-008; MP-001/002 | Production Memory Sync code stays unchanged. |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/run-history/nested-team-history-restart.e2e.test.ts tests/e2e/memory-sync/memory-sync-multiprocess.e2e.test.ts tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts --no-watch` | worktree; isolated test runtimes and real built processes | Direct durable changes: restart/retry, ledger, MP-001/MP-002 | Pass — 3 files / 7 tests | `api-e2e-evidence/repository-focused-e2e.log` |
| 2 | `pnpm -C autobyteus-server-ts test --run <23 changed/owner files>` | worktree/server | Scope/factory/migration/reader/runner/imported owners | Pass — 23 files / 101 tests | `api-e2e-evidence/repository-owner-focused.log`; file list in `repository-owner-focused-files.txt` |
| 3 | `pnpm test:e2e` | worktree root | Broad server API/E2E regression surface | Fail outside ticket surface — 47 files pass, 7 fail, 14 skip; 185 tests pass, 7 fail, 51 skip | `api-e2e-evidence/server-full-e2e.log` |
| 4 | Serial rerun of the seven full-suite failing files with `--maxWorkers=1` | server | Failure isolation | Five unrelated stale/baseline failures persist; file-watcher and token-analytics failures pass serially and are concurrency flakes | `api-e2e-evidence/server-full-e2e-failures-serial.log` |
| 5 | `pnpm -C autobyteus-server-ts build` | worktree root | Production compile/bootstrap | Pass | `api-e2e-evidence/server-build.log` |
| 6 | Focused `pnpm -C autobyteus-web test:nuxt ... --run` over four hydration/query/store/Settings files | web | Existing client-contract controls | Pass — 4 files / 18 tests | `api-e2e-evidence/frontend-focused.log` |
| 7 | `git diff --check` and protected production-source audit | worktree | Patch integrity/no API/E2E-owned production drift | Pass | `api-e2e-evidence/repository-audits.log` |

## Post-Repository Confidence Scorecard

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

## Broader Validation Decision

- Decision: `Required`
- Selected execution mode: `Lifecycle` + `Worker or Distributed` in durable E2E, followed by `Browser` for the web-equivalent renderer journey.
- Specific confidence gap or residual risk addressed: actual startup ordering, cross-process restart, public retry status, physical no-delete replication, and the rendered false-empty symptom are not fully proven by focused repository tests as currently written.
- Why the selected mode can materially improve confidence: it crosses the same persisted filesystem/process/GraphQL/DOM boundaries involved in the reproduced defect without using external providers or user data.
- Expected confidence after selected validation: at least 95% overall with no category below 90%, assuming every critical scenario passed. It did not: the browser journey found a critical AC-002/AC-012 failure.
- Browser-specific decision and rationale: required by AC-012 and because the original failure was a browser-visible successful-empty result. Use the Nuxt development path; no Electron-shell behavior changed.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron wrapper around the Nuxt renderer.
- Relevant README or development instructions: `autobyteus-web/AGENTS.md`, `autobyteus-web/README.md`, root/server README.
- Web-equivalent behavior: workspace history tree selection, conversation hydration, Activity/Event Monitor presentation, migration Settings status.
- Shell-specific or lifecycle behavior: none changed; backend process restart is exercised independently.
- Chosen validation approach and why it fits the project: browser against the documented web development path and an isolated built backend. This directly proves renderer behavior while avoiding unnecessary Electron interference.
- Effect on any already-running desktop application: none; use distinct loopback ports and an owned browser tab.
- Behavior not directly proven and confidence consequence: Electron preload/IPC/window management is out of scope and does not reduce confidence because no shell source or contract changed.

## Live Environment And Fixture Execution

- Startup and isolation: production server build; isolated runtime root/database/HOME; secrets imported with `pnpm secrets:import`; private Nested Classroom and agent packages imported; backend on owned port `58376`; current Nuxt frontend on the owned IPv4 `3000` listener; readiness through `/rest/health`, frontend HTTP, and DOM.
- Real identity/runtime: actual `deepseek-v4-flash` AutoByteus provider created root TeamRun `nested_classroom_test_team_ef79cfb19d364f558b6f5e5ae2e08194` and delegated task-Team AgentRun `student_one_e7a87cdb646e4678ac5ffacf5a82dcbe` with exact token `API_E2E_REAL_ACTIVE_COLD_RESTART_OK`.
- Lifecycle: the task rendered live, the backend was stopped with `SIGKILL`, then restarted cold with the same isolated data and database. One misconfigured restart omitted `DATABASE_URL`; it was stopped before explicit validation and is excluded in `excluded-misconfigured-restart.txt`. Correctly configured restart evidence is authoritative.
- Backend result: task projection `4` conversation / `2` activities / non-null last activity, Event Monitor `4` events, direct-root `6` / `2`, task record `interrupted`, and task raw SHA-256 byte-identical.
- Browser result: direct-root and Team task-record controls passed, but historical task-row count was `0`; normal exact history selection rejected the task AgentRun as “not live.” `NTH-BR-001`, AC-002, and browser AC-012 failed.
- Cleanup: isolated runtime/database/secrets/package deleted; owned backend/frontend stopped; owned browser tab closed; unrelated IPv6 port-3000 listener PID `37602` untouched. See `api-e2e-evidence/real-classroom/cleanup-report.txt`.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `NTH-BR-001` | Test-owned real-provider phase scripts and semantic cold UI probe against current Nuxt and built backend | Fail — pre-restart exact task conversation/activity rendered; post-restart direct-root and task-record controls rendered, but the settled historical task row disappeared and normal exact focus rejected | Temporary evidence is retained because the stage fails. After source repair, add durable frontend regression coverage for settled historical task navigation/focus rather than retaining credential-dependent real-provider automation. |

## Next-Round User-Mandated Live Communication Coverage

The user added this requirement after round 1 completed. It does not change `API-REV-001`, but it is mandatory for the next API/E2E rerun after rework.

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
| Codex/Claude provider variants in live UI | Scope selection remains provider-independent and deterministic runtime-kind coverage passed. The broader journey used real AutoByteus `deepseek-v4-flash`, which was sufficient to reproduce the task lifecycle/UI integration defect. | Low | None for failure classification. |
| Actual Electron shell | No shell/preload/IPC/package source changed. | Negligible | None. |
| Docker/Kubernetes network routing to a remote hub | Operational network setup is unchanged and documented; real loopback multi-process HTTP crosses the application boundary. | Low | None for this ticket. |
| Arbitrary kernel/device/power/syscall/concurrent-writer failure matrix | Explicitly excluded by approved migration convention and AC-013. | N/A by contract | Do not add. |

## Ambiguities Or Reroute Triggers

Execution produced one unambiguous reroute trigger: `NTH-BR-001` failed against AC-002 and AC-012. Backend projection and bytes are correct, but frontend historical tree projection drops settled task executions and `focusAgent()` rejects the exact task AgentRun. Preliminary classification is a bounded implementation `Local Fix`; `/code_reviewer` must perform focused failure-origin review. The broad server-suite failures are separately classified as unrelated existing stale/baseline/concurrency issues and did not produce this result.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes` — completed.
- Repository-Resident Durable Coverage Added / Updated / Removed: `Yes` — added one focused server lifecycle E2E; updated the exact ledger transition and two-process Memory Sync E2E; removed none.
- Post-repository confidence: `90.6%`; browser evidence remained mandatory.
- Broader validation decision: `Required` — completed with a real-provider Nested Classroom process-restart browser journey.
- Latest result: `Fail` — AC-002 and the browser portion of AC-012 fail even though the exact backend projection and Event Monitor data are non-empty.
- Reroute Required: `Yes`
- Recommended Recipient: `/code_reviewer` for focused failure-origin review.
- Notes: this artifact was created before API/E2E-owned durable coverage edits and has been kept current through repository and realistic execution. The final execution report and `API-REV-001` carry the complete result and confidence scorecard.
