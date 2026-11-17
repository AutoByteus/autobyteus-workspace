# API/E2E Execution Coverage Report

The run record and the result. The coverage investigation (`api-e2e-coverage-investigation.md`) is the plan; `api-e2e-revision-record.md` is the history (round 1's `Fail` is API-REV-001).

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-003`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: **round 3**, code review CRR-005 `Pass` of IR-003, which resolves TR-001 of the test review (CRR-004): `agentRuns` takes a standalone run's definition from its metadata alone (the unreachable history-row fallback is gone). Round 2 (API-REV-002) was triggered by CRR-003 / IR-002, which resolved round 1's API-09 failure
- Round 3 rerun plan (TESTING.md rerun by impact): `git diff --name-only 63fa073eb8 1324c3e8f4` = `run-folder-discovery.ts` (`agentRuns` only), its unit test, `agent_episodic_catalog.md`. **Rerun:** API-00 (build), API-04…API-10 (the E2E file; EC-06's title and one comment updated, the reviewer's non-blocking note), API-16 (server typecheck, test edited), API-17 (new: the unit files outside IMP-16's scope that reach discovery: `search-memory-tool.test.ts`, `application-framework-boundaries.test.ts`, plus `run-folder-discovery.test.ts`). **Reused** on `1324c3e8f4`: IMP-16 (407 discovery/memory-search/catalog/journal units), IMP-17 (memory e2e), IMP-18 (both typechecks). **Still valid** from round 2: the rest of API-11, API-12 and API-13; the other unit and integration files never construct discovery, and the other E2E files reach it only through the catalog's background start pass, whose output none of them reads; the delta changes which definition a standalone run is attributed to, not the I/O or control flow (`readMetadataState` was already read)
- Prior round reviewed: round 1 (API-REV-001, `Fail` on API-09 / AC-009). Prior failure rechecked first: API-09 now passes
- Rerun plan (TESTING.md rerun by impact): `git diff --name-only 0be36462ef 159286c1c1` changes `src/agent-memory/services/run-folder-discovery.ts`, `domain/discovered-run.ts`, `agent-work-journal/{services,store,domain}`, `agent-episodic-catalog/services/episodic-catalog.ts`, `memory-search/runs/memory-run-mapping.ts`. Every case exercises discovery or the catalog, so every case is **Rerun**. API-01 is reused from IMP-10 (same code commit); the web typecheck from IMP-12 (same code; it does not compile server E2E files)
- Deviations from the investigation's plan, and why:
  - Round 2: EC-06 extended for IR-002's outcomes: an unreadable journal manifest (left out, `EPISODIC_CATALOG_RUN_LEFT_OUT`) and a damaged standalone `run_metadata.json`. The first round-2 run expected that run to stay catalogued by its history row (the handoff's wording). In real use the history catalog offers only admitted rows (`agent-run-history-catalog-service.ts:141`, `listCatalogRows` filters by `readiness.isAdmitted("agent", …)`), and a run with unreadable metadata is not admitted. So the run is left out, with `RUN_FOLDER_DISCOVERY_RECORD_UNREADABLE` naming it. REQ-012 allows exactly this ("left out with a logged warning naming it"), so the test expects it. The handoff's "history row still attributes" branch only applied if the readiness index admitted the run; the test review made it TR-001, and IR-003 (round 3) removed the branch, so the code now states what EC-06 observes
  - Round-2 run 1 was interrupted by an application restart (update to v1.5.13-beta.9) in EC-05; its temp data were removed and the file rerun
  - After the first scoring (94%), EC-06 also damages an org run's tree (O3), closing the one gap that was proven only by unit test and reading. **Round-2 run 4 is the result** (`API-04-10-episodic-catalog-e2e.log`); runs 2–3 are kept as `API-04-10-r2-run*.log`
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/per-agent-episodic-catalog/tickets/in-progress/per-agent-episodic-catalog/evidence/` (round 1's and round 2's authoritative E2E files are in `evidence/round1/` and `evidence/round2/`; the files at the top are round 3's or still valid from round 2)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`: the new durable E2E file `autobyteus-server-ts/tests/e2e/memory/episodic-catalog.e2e.test.ts`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | round 3: code `1324c3e8f4` (HEAD `91ea06d8d0` adds docs only) plus the E2E file as committed with this report; round 2: code `159286c1c1` | macOS 26.5.2 (Darwin 25.5), shared host, load average 70–110 throughout | Node v22.23.1; in-process Studio server (`startCollaborationHarness`), then `dist/app.js` built on `159286c1c1` (API-00) | `env -i PATH HOME=<resolved temp> TMPDIR USER`, `RUN_AGY_FAILURE_E2E=1`, `ANTIGRAVITY_CLI_COMMAND=<worktree>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` (`linked_skills`); test-owned temp data dir; production catalog timings (5 s / 30 s) |
| ENV-2 | round 2 suites on `159286c1c1`; round 3 API-16/API-17 on `1324c3e8f4` | same | vitest suites (`test:unit`, `test:integration`, `pnpm test:e2e`) | E2E: `env -i PATH HOME=<temp> TMPDIR USER`, no gates |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-00 | — | build | `pnpm -C autobyteus-server-ts build` (round 3, `1324c3e8f4`) | ENV-1 | Pass | `API-00-server-build.log` | `Built-in agents bootstrap smoke check passed.` / `exit 0` | the `dist/app.js` of EC-05…EC-07 |
| API-01 | AC-001, AC-007 (work counts), AC-008, AC-009 (unit), AC-013 | catalog, discovery, journal units | Reused: IMP-16 (round 3; IMP-10 in round 2) | — | Pass (reused) | handoff IMP-16 | `Tests  407 passed \| 2 skipped (409)` | ran on `1324c3e8f4`; nothing in `src` changed since |
| API-02 | AC-010 (measurement), QR-002, REQ-004 support | build over a clone of real data | Reused: IMP-14, IMP-15 | — | Pass (reused) | handoff IMP-14/15 | `"passMs": 12532` / `12064`, `"rewrittenAtSecondStart": []`, `"changedOutsideEpisodic": 0`; `summaries found in episodic files: 0` | same commit; measured at load ~119; no server start on a clone (TESTING.md) |
| API-03 | AC-011 | web typecheck | Reused: IMP-18 (round 3; IMP-12 in round 2) | — | Pass (reused) | handoff IMP-18 | `87 in 37 files (baseline 87 in 37 files)` | ran on `1324c3e8f4`; the web typecheck does not compile server E2E files |
| API-04 | AC-001, AC-002, AC-003, AC-008, AC-013, REQ-011 | live server: real runs of every kind; files | `episodic-catalog.e2e.test.ts` EC-01 (command in the file header) | ENV-1 | Pass | `API-04-10-episodic-catalog-e2e.log`; `API-04-EC01-catalog-files.md`; `API-04-10-r3-excerpt.md`; `API-04-10-e2e-evidence/episodic-catalog-e2e.json` | log `✓ EC-01`; excerpt `{"user": true, "reply": true, "call": true, "result": true, "summary": true}`; catalog files: `7 runs, oldest first.`, `- About: EC P1 launch checklist …` (the Project Task copy), `- About: EC P2 …` (the task agent team), `team-local-agent%3A…%3Alead/catalog.md` | D's seven runs: standalone, delegated copy (Project Task), delegated copy (described work), task agent team member, team member, org member, team-local team member; each entry equals the one computed from the journal files on disk; no team/org name or address, Task key, runtime or state |
| API-05 | AC-004, QR-001 | live upkeep, production timings | EC-02 | ENV-1 | Pass | same log; excerpt `EC-02` | `"updateMs": 5006`, `"addMs": 5050`, `"burstMs": 6238`, `"catalogRewrites": 1` | four turns 2 s apart (each token absent from the journal before its send) → one rewrite |
| API-06 | AC-005, QR-001 | GraphQL archive / delete of agent, team, org runs | EC-03 | ENV-1 | Pass | same log; excerpt `EC-03` | `"message": "Run is active. Terminate it before deleting history."`; three `deleted permanently.`; `"deleteMs": 5190` | archive (3 kinds) and a refused delete: nothing under `episodic/` written in 40 s; deletes: entries gone in 5.1 s, every other entry identical, catalogs with no deleted run keep their inode |
| API-07 | AC-009 (live) | live containment | EC-04 | ENV-1 | Pass | same log; excerpt `EC-04` | `EPISODIC_CATALOG_WRITE_FAILED {"file":"ec-writer-…","error":"EACCES: permission denied…"}` | hand edit replaced at the next change; unwritable folder: logged, the run's two turns and journal go on; writable again: healed; no `.tmp` left |
| API-08 | AC-007 (b), AC-009 (edited at start), SCN-A2 | built server start | EC-05 | ENV-1 | Pass | same log; excerpt `EC-05` | `"written": [<E>, <D>, "index.md", <team-local lead>]`; `migrationLines` | stop inside the 5 s window leaves the catalog stale; the start writes exactly the changed catalogs and index.md. Outside `episodic/` only the run-history indexes and `.backup-<time>` copies change, written by the app-data migrations of the data dir's first `dist/app.js` start |
| API-09 | AC-006, AC-009 (damaged records), REQ-008, REQ-012, QR-004, SCN-A3/A4/A5, API-15's manifest case | built server start with no `episodic/` | EC-06 | ENV-1 | **Pass** (round 1: Fail) | same log; `API-09-EC06-rebuilt-catalogs.md`; excerpt `EC-06` | `RUN_FOLDER_DISCOVERY_RECORD_UNREADABLE { root: 'agent_team:ec_squad_…', record: 'team_run_execution_tree.json', reason: 'ROOT_RUN_PACKAGE_CURRENT_VALIDATION_FAILED: Unterminated string in JSON …', runFolders: 1 }`; `RUN_FOLDER_DISCOVERY_RECORD_UNREADABLE { root: 'agent_org:ec_org_…', record: 'agent_org_run_execution_tree.json', …`; `EPISODIC_CATALOG_RUN_LEFT_OUT { root: 'agent:ec_writer_…', run: 'agents/ec_writer_…', reason: 'work_journal_manifest.json is not JSON: …' }`; `RUN_FOLDER_DISCOVERY_RECORD_UNREADABLE { root: 'agent:ec_writer_…', record: 'run_metadata.json', … }`; `"outsideEpisodicChanged": []` | every catalog rebuilt byte for byte; no journal → `no journal yet (run folder …)` with the recorded start; the older manifest lists its file; the damaged team tree, the damaged org tree, the damaged standalone metadata and the non-JSON manifest are each left out with one warning naming the root or run, the record and the reason; every other run still catalogued; nothing under `memory/` outside `episodic/` changed. The memory search discovery did not run (the index was never started), so one warning per record, not two |
| API-10 | AC-007 (a) | built server restart, no change | EC-07 | ENV-1 | Pass | same log; excerpt `EC-07` | `"changed": []`, `"outsideEpisodicChanged": []` | 25 s after listening: nothing written |
| API-11 | AC-011 | whole server unit suite | `pnpm -C autobyteus-server-ts test:unit` | ENV-2 | Pass for this change (1 failure, FU-003) | `API-11-server-unit-suite.log` | `Tests  1 failed \| 8331 passed \| 9 skipped (8341)` | the failure: `agent-package-folder-watcher.test.ts` "moves a root to FOLDER_MISSING…" `Test timed out in 5000ms`; its import closure holds no changed file; the same file failed alone in round 1 at this load |
| API-12 | AC-011 | server integration | `pnpm -C autobyteus-server-ts test:integration:prepare` then `test:integration` | ENV-2 | Pass for this change (8 failures, FU-003) | `API-12-server-integration.log`, `API-12b-watcher-integration-rerun.log` | `Tests  8 failed \| 498 passed \| 69 skipped (575)`; rerun alone: `Tests  10 failed \| 19 passed (29)` with a different set | all 8 in `file-system-watcher.integration.test.ts` (import closure holds no changed file) and `package-auto-refresh.integration.test.ts` (composes definition services and the package feed only: no catalog, discovery, journal or run service; the changed files are imported, not run). Messages: `Timed out waiting for event`, `expected 9237 to be less than 5000`, `Condition not met within 5000 ms; last value: "FOLDER_MISSING"`. Cause: file-event latency at load 70–110 |
| API-13 | AC-011 | whole server E2E suite | `env -i PATH HOME=<temp> TMPDIR USER pnpm test:e2e`; failing files rerun alone (13b), on the base commit `2b73308ce5` in an own worktree (13c, 13d), and one with temporary timing logs (13e) | ENV-2 | Pass for this change (22 failing files, each explained; none caused by it) | `API-13-server-e2e-suite.log`, `API-13b-failing-e2e-rerun.log`, `API-13c-failing-e2e-on-base.log`, `API-13d-four-files-per-agent-episodic-catalog.log`, `API-13d-four-files-ec493-api-e2e-base.log`, `API-13e-embedding-settings-diag.log` | full run `Test Files  22 failed \| 104 passed \| 146 skipped (272)`; 13b `Test Files  14 failed \| 9 passed (23)`; 13c (base) `Test Files  10 failed \| 4 passed (14)`; 13e `ECDIAG startPass end 98` … `394`, `ECDIAG stop end 0`, `Tests  6 passed (6)` ×4 | **9** pass when rerun alone. **11** fail on the base too (FU-004): `available-agent-runtimes` (a real `dsh` 0.2.2-rc.1 in `~/.local/bin` adds `deepseek_harness`), `configured-skill-on-demand-loading` (expects no `## Long-Running Commands`, added on the base by autobyteus-483 `30aec70770`), and 9 built-server start/stop lifecycle files (`Hook timed out in 10000ms`, `TEST_SERVER_EXITED_NONZERO`). **3** failed twice on the branch and passed alone: `grok-build-compaction-replay`, `file-explorer-websocket-lifecycle` (13d), `embedding-settings` (first test 6.3 s against 5 s in 13d; reproduced 4× with temporary timing logs: first test 140–217 ms, base 166 ms; the catalog's start pass 98–394 ms, `stop()` 0–1 ms with no pass running). Measured: the catalog is not the slow part; load spikes (to 154) are. The logs were removed before handoff (`src` identical to `159286c1c1`). The new E2E file is gated and skips here; it ran gated as API-04…API-10 |
| API-14 | AC-011 | watcher files on a quieter host | — | — | Not Tested | — | — | the host's load never fell below 60 in either round; FU-003 carries the rerun |
| API-15 | AC-012 | docs | read `docs/modules/agent_episodic_catalog.md`, `agent_work_journal.md`, `GLOSSARY.md` against the contract and IR-002 | — | Pass | — | — | round 1's note is resolved: the doc now describes an unreadable manifest as left out with `EPISODIC_CATALOG_RUN_LEFT_OUT`, as API-09 shows. Round 2's docs-sync note is resolved by IR-003: § unreadable now says an agent run's `run_metadata.json` "that exists but cannot be read (with or without a history row)" is not catalogued, as API-09 shows |
| API-17 | AC-001, AC-009, AC-011 | unit files outside IMP-16's scope that reach discovery, and the discovery unit test | `pnpm exec vitest run tests/unit/agent-tools/memory/search-memory-tool.test.ts tests/architecture/application-framework-boundaries.test.ts tests/unit/agent-memory/run-folder-discovery.test.ts` | ENV-2 | Pass | `API-17-discovery-units.log` | `Tests  34 passed (34)` | round 3 (new case for the delta) |
| API-16 | AC-011 | server typecheck with the E2E file | `pnpm -C autobyteus-server-ts typecheck` (round 3) | ENV-2 | Pass | `API-16-server-typecheck.log` | `production errors: 0; test-file errors: 1012 in 316 files (baseline 1012 in 316 files)` / `[typecheck] PASS` | `tsconfig.tests.json` includes `tests/`, so the round-2 test adds no error |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-04, API-01 | Proven | — |
| AC-002 | Yes | API-04 | Proven | — |
| AC-003 | Yes | API-04 (markers in a user message, tool call, tool result, reply, Task description and the run-history summary; none in any episodic file), API-02 (IMP-15 on real data) | Proven | — |
| AC-004 | Yes | API-05 | Proven | — |
| AC-005 | Yes | API-06 | Proven | — |
| AC-006 | Yes | API-09, API-08 | Proven | — |
| AC-007 | Yes | API-10 (a), API-08 (b), API-01 (records read once) | Proven | — |
| AC-008 | No | API-04, API-01 | Proven | — |
| AC-009 | Yes | API-07 (live), API-08 (hand edit at start), API-09 (damaged team tree, damaged org tree, damaged standalone metadata, non-JSON manifest), API-17 | Proven | — |
| AC-010 | Yes | API-02 (IMP-14: the start build over an APFS clone of the founder's memory, 12.5 s / 12.1 s at load ~119; no server start) | Proven for the build time; the server start on his data is **Only The User Can Check** | TESTING.md forbids a startup on real user data or a copy of it; the full start path is proven on test-owned data (API-08…API-10). His first start, after his approval and a backup (already a delivery gate), is the remaining check |
| AC-011 | Yes | API-11, API-12, API-13, API-16, API-17, API-03 | Proven: no regression from this change. Every failing test's cause was found: host load (file events, timeouts), or failing on the base commit too (FU-003, FU-004) | — |
| AC-012 | No | API-15 | Proven | — |
| AC-013 | Yes | API-04, API-01 | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | 97% | API-04…API-10 prove AC-001…AC-009 and AC-013 directly; AC-011 with every failure explained; AC-012 read; AC-010's build time measured on a clone | AC-010's server start on real data is the user's part (TESTING.md) and, per the gate, not scored here | the founder's first start (delivery gate) |
| Changed-boundary execution directness | 96% | 96% | real composition root, real record admission (the damaged records go through the real readiness index), real journals, GraphQL deletes, `dist/app.js` starts | the standalone application host's catalog is proven by its lifecycle unit test only | — |
| Cross-boundary integration realism and mock gap | 94% | 94% | only the AGY CLI is scripted; Task titles from real Project Tasks | no real model (not needed for this boundary) | — |
| Environment, configuration, identity, and fixture fidelity | 92% | 93% | data made through public APIs; a file-authored team-local agent loaded by the app's Reload; damaged shapes synthesized on test-owned runs (TESTING.md) | load 70–150 throughout; real-data start is the user's part | a quiet host |
| Failure, edge-case, lifecycle, and recovery evidence | 93% | 97% | damaged team tree, damaged org tree (added after the first scoring), damaged run metadata, non-JSON manifest, missing journal, older manifest, unwritable folder, hand edits, stop inside the debounce window, restart with and without changes | a whole-scan failure of the readiness index (`*`) is unit-tested only | — |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | no UI (requirements); the desktop app runs the same `buildStudioServer` | — | — |
| Durable regression coverage quality and relevance | 93% | 93% | the gated E2E file covers SCN-001…SCN-004 and the added scenarios with production timings | gated (`RUN_AGY_FAILURE_E2E`), ~5 min | — |

- Overall post-repository confidence: 94% (first scoring, before the org-tree case)
- Overall final confidence: 95% (97 + 96 + 94 + 93 + 97 + 93 = 570 / 6)
- Calculation method: simple average of the six applicable categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`; no material broader-validation risk remains that a further run here could close
- Confidence-limiting residual risks: AC-010 start on the founder's data (his approval and backup, delivery gate); Task-title lookup cost on real data not measured; FU-003 and FU-004 suite failures on this host

## Broader Validation Decision (Mandatory)

- Decision: `Required`, executed: the E2E file is the broader validation
- Execution mode: `Live API` + `Lifecycle` (real server, GraphQL/WebSocket, built-server restarts)
- Confidence gap it addresses: the units fake discovery, journals and the clock; the real composition root, record admission, deletes and restarts are only proven here
- Browser validation needed: no; no UI or browser boundary changed

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Discard or Rebuild` (`episodic/**`); `Not Affected` (every other file)
- Representative existing data used: runs of every kind made on a test server; synthesized older manifest, run without a journal, damaged team tree, damaged run metadata, non-JSON manifest (all test-owned)
- Approved transition followed without an unnecessary migration: `Yes`
- Cases proving the discard/rebuild outcome: API-09, API-08, API-10
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: a start on the founder's real data (AC-010, delivery gate); damaged files are never rewritten (API-09: no file outside `episodic/` changed)

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/memory/episodic-catalog.e2e.test.ts` | Added (round 1), updated (round 2: EC-06 extended for IR-002, expectations for the damaged standalone record, evidence written before assertions) | API-04…API-10 | — |

- Added or updated paths attached for proportional test-code review: `Yes`

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| AGY CLI (agent runtime) | `tests/fixtures/agy-failure-cli.mjs` (`linked_skills`): real tools via `CALL_TOOL`, replies via `REPLY_FILE` | no inference needed to produce turns, tool calls and journals (TESTING.md "Runtimes without a model") | turns finish in 7–70 ms; the test spaces burst turns 2 s apart |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| temp `HOME` and data dir per E2E run | Yes | the test's `afterAll` and the command's `rm -rf`; the interrupted run's two folders removed by hand | removed |
| in-process server, scripted AGY processes, `dist/app.js` processes | Yes | harness `stopServer()`/`close()`, `SIGTERM` + wait | stopped; `pgrep -f episodic-catalog-e2e` empty |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check (IDs): AC-010's server start on the founder's real data (Only The User Can Check; the build time is measured on a clone)
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: `/code_reviewer` (Large / High: proportional test-code review of `tests/e2e/memory/episodic-catalog.e2e.test.ts`; round 3 changes only EC-06's `it` title and one comment)
- Notes: round 3 (IR-003) passes with the same confidence; round 1's failure (API-09) is resolved by IR-002; TR-001 by IR-003. Follow-ups FU-003 (load-sensitive watcher and migration tests, integration watcher files added) and FU-004 (E2E files failing on the base too). 
