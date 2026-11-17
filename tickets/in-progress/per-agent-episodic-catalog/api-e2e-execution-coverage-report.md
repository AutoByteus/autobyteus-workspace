# API/E2E Execution Coverage Report

The run record and the result. The coverage investigation (`api-e2e-coverage-investigation.md`) is the plan; `api-e2e-revision-record.md` is the history.

## Round

- Coverage investigation (the plan; it lists the upstream documents): `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log (when used): `api-e2e-test-progress.md`
- Round and trigger: round 1, code review CRR-001 `Pass` (Large / High)
- Prior round reviewed: N/A
- Deviations from the investigation's plan, and why:
  - API-13 (the whole server E2E suite) is `Next Round`: this round ends in `Fail` (API-09), the fix will change server code that every E2E file starts, so the whole suite runs once on the fixed commit (TESTING.md: one run per case per round).
  - The new E2E file took test-only corrections before its result was stable: runs 1–4 found test bugs (listed in the progress log), runs 7–8 stopped at the first run creation on an environment timeout (`AgyDiscoveryError: Antigravity model discovery timed out` under host load), and runs 4, 5, 6 and 9 agree on the product result. **Run 9 is the result** (`API-04-10-episodic-catalog-e2e.log`); earlier logs are kept as `API-04-10-run*.log`.
- Evidence folder (absolute path; the handoff message gives the commit that holds it): `/Users/normy/autobyteus_org/autobyteus-worktrees/per-agent-episodic-catalog/tickets/in-progress/per-agent-episodic-catalog/evidence/`

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (on `Pass`); this round is `Fail`, so failure-origin review is requested instead

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter (data, identity, locale, viewport) |
| --- | --- | --- | --- | --- |
| ENV-1 | worktree at `89f35132ed` (code `0be36462ef`) plus the new test file (uncommitted during the runs, committed with this report unchanged since run 9) | macOS 26.5.2 (Darwin 25.5), shared host, load average 65–95 throughout (other agents' suites running) | Node v22.23.1; in-process Studio server (`startCollaborationHarness`) then `dist/app.js` built at API-00 | `env -i PATH HOME=<resolved temp> TMPDIR USER`, `RUN_AGY_FAILURE_E2E=1`, `ANTIGRAVITY_CLI_COMMAND=<worktree>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` (`AGY_FAKE_CASE=linked_skills`); test-owned temp data dir; production catalog timings (5 s / 30 s) |
| ENV-2 | same | same | `pnpm -C autobyteus-server-ts test:unit` (vitest, its own isolation setup) | — |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-00 | — | build | `pnpm -C autobyteus-server-ts build` | ENV-1 | Pass | `API-00-server-build.log` | `Built-in agents bootstrap smoke check passed.` / `exit 0` | the `dist/app.js` EC-05…EC-07 start |
| API-01 | AC-001, AC-007 (work counts), AC-008, AC-009 (unit), AC-013 | catalog units | Reused: IMP-01, IMP-06 | — | Pass (reused) | handoff IMP-06 | handoff | ran on `0be36462ef`; `git diff --name-only 0be36462ef 89f35132ed` lists only `tickets/` files; no source changed since |
| API-02 | AC-010 (measurement), QR-002, REQ-004 support | build over a clone of real data | Reused: IMP-07, IMP-08 | — | Pass (reused) | handoff IMP-07/08 | `"passMs": 9910` / `3381`; `summaries found in episodic files: 0` | same commit; no server start on a clone (TESTING.md), see AC-010 below |
| API-03 | AC-011 | both typechecks | Reused: IMP-02, IMP-03 | — | Pass (reused) | handoff IMP-02/03 | baselines unchanged | same source commit; the new test file is checked by API-16 |
| API-04 | AC-001, AC-002, AC-003, AC-008, AC-013, REQ-011 | live server: real runs of every kind; files | `episodic-catalog.e2e.test.ts` EC-01 (command in the file header) | ENV-1 | Pass | `API-04-10-episodic-catalog-e2e.log`; `API-04-EC01-catalog-files.md`; `API-04-10-run9-excerpt.md`; `API-04-10-e2e-evidence/episodic-catalog-e2e.json` | log `✓ EC-01`; excerpt `{"user": true, "reply": true, "call": true, "result": true, "summary": true}`; catalog files show `7 runs, oldest first.`, `- About: EC P1 launch checklist …` on the Project Task copy only, `team-local-agent%3A…%3Alead/catalog.md` | D's seven runs: standalone, delegated copy (Project Task), delegated copy (described work), task agent team member, team member, org member, team-local team member; each entry equal to the entry computed from the journal files on disk; no team/org name or address, Task key, runtime, state |
| API-05 | AC-004, QR-001 | live upkeep, production timings | EC-02 | ENV-1 | Pass | same log; excerpt `EC-02` | `"updateMs": 5059`, `"addMs": 4975`, `"burstMs": 6057`, `"catalogRewrites": 1` | turn → entry current 5.1 s after the journal write; a new run's first turn → entry 5.0 s after; 4 turns 2 s apart (each token proven absent before its send, journal written 7–11 ms after it) → 1 rewrite |
| API-06 | AC-005, QR-001 | GraphQL archive / delete of agent, team, org runs | EC-03 | ENV-1 | Pass | same log; excerpt `EC-03` | `"refused": {"success": false, "message": "Run is active. Terminate it before deleting history."}`; three `deleted permanently.`; `"deleteMs": 5145` | archive of 3 kinds and a refused delete: no file under `episodic/` written in 40 s; deletes: the entries leave within `deleteMs` (≤ 60 s asserted); every other entry identical; a catalog with no deleted run keeps its inode |
| API-07 | AC-009 (live: hand edit, unwritable folder) | live server containment | EC-04 | ENV-1 | Pass | same log; excerpt `EC-04` | `EPISODIC_CATALOG_WRITE_FAILED {"file":"ec-writer-…","error":"EACCES: permission denied…"}`; `turnsDuringFailure` two journal sizes | hand edit replaced 5.0 s after the next journal change; unwritable: write failure logged, two turns of the run complete and their journal is written; writable again: the new run's entry appears; no `.tmp` left |
| API-08 | AC-007 (b), AC-009 (edited at start), SCN-A2 | built server start | EC-05 | ENV-1 | Pass | same log; excerpt `EC-05` | `"written": [<E>, <D>, "index.md", <team-local lead>]`; `migrationLines` | stopped < 5 s after a journal write → catalog stale after stop (pass dropped); at start exactly D (A current, A2 gone), E (`0 runs.`), the hand-edited lead catalog and index.md are written; every other catalog keeps its inode. Outside `episodic/`: only `run_history_index.json`, `team_run_history_index.json` and their `.backup-<time>` copies, written by the app-data migrations of the data dir's first `dist/app.js` start (the in-process test server runs none; `migrationLines` show them running) |
| API-09 | AC-006, REQ-008, QR-004, SCN-A3, SCN-A4, SCN-A5 / AC-009 (damaged record) | built server start with no `episodic/` | EC-06 | ENV-1 | **Fail** | same log (`× EC-06`); `API-09-EC06-rebuilt-catalogs.md`; excerpt `EC-06` | `AssertionError: a warning names the damaged run ec_squad_…: []: expected 0 to be greater than 0`; `"outsideEpisodicChanged": []`; `"t3Lines": []` | **Passes:** every catalog rebuilt byte for byte (E, with no run left and no folder, correctly gets none); O1's manager without a journal → `- Journal: no journal yet (run folder …)` with its recorded start; the older-manifest run (runtime once per manifest) lists its file; the damaged team run T3 is left out and every other team run (T1, the task team, the team-local team) is still catalogued; no file under `memory/` outside `episodic/` changed (path, size, mtime). **Fails:** no line of the server's output (stdout + stderr) names T3. Same result in runs 4, 5, 6 and 9 |
| API-10 | AC-007 (a) | built server restart, no change | EC-07 | ENV-1 | Pass | same log; excerpt `EC-07` | `"changed": []`, `"outsideEpisodicChanged": []` | 25 s after listening: no file under `episodic/` or elsewhere under `memory/` written |
| API-11 | AC-011 | whole server unit suite | `pnpm -C autobyteus-server-ts test:unit` | ENV-2 | Pass for this change (5 failures, causes found, none caused by it) | `API-11-server-unit-suite.log`, `API-14-unit-failures-rerun.log`, `API-14b-migration-and-skill-watcher-rerun.log` | `Tests  5 failed \| 8321 passed \| 9 skipped (8335)` | 4 × `agent-package-folder-watcher.test.ts` (import closure holds no changed file; fails alone too at load 65–90: fixed 5 s/10 s waits on macOS file events; IMP-04/05); 1 × `append-only-message-logs-v1` "own-run fails in start 1…" `Test timed out in 5000ms` (1.7 s alone; two migration starts on disk under CPU contention; it calls no method this change added). FU-003 |
| API-12 | AC-011 | server integration | `test:integration:prepare`, `test:integration` | — | Next Round | — | — | run once on the fixed commit (one integration file changed, mechanically); see Deviations |
| API-13 | AC-011 | whole server E2E suite | `pnpm test:e2e` (clean env) | — | Next Round | — | — | see Deviations; IMP-09 (memory search, journal vocabulary, semantic memory e2e) passed on `0be36462ef` |
| API-14 | AC-011 | folder-watcher files on a quieter host | `vitest run` the two watcher files | ENV-2 | Pass for this change (agent-package watcher still fails under load; skill watcher passes) | `API-14-unit-failures-rerun.log`, `API-14b-…log` | skill watcher `✓ … (CR-005) 4294ms`; agent-package watcher `Tests  4 failed` at load 65–91 | no quiet host was available (load never below 65); cause as API-11; FU-003 |
| API-16 | AC-011 | server typecheck with the new test file | `pnpm -C autobyteus-server-ts typecheck` | ENV-2 | Pass | `API-16-server-typecheck.log` | `production errors: 0; test-file errors: 1012 in 316 files (baseline 1012 in 316 files)` / `[typecheck] PASS` | `tsconfig.tests.json` includes `tests/`, so the new file adds no error. The web typecheck does not compile server E2E files |
| API-15 | AC-012 | docs | read `docs/modules/agent_episodic_catalog.md`, `agent_memory.md`, `agent_work_journal.md`, `memory_search.md`, `GLOSSARY.md` against the contract | — | Pass | — | — | folder rule, format, update rules, privacy rule and failure codes described. One wording note for docs sync: `agent_episodic_catalog.md` says `EPISODIC_CATALOG_REFRESH_FAILED` covers "a run whose journal cannot be read; that run is left out", but an unreadable manifest gives "no journal yet" (`readManifestJournalFileNames` returns null), not a left-out run |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-04, API-01 | Proven | — |
| AC-002 | Yes | API-04 | Proven | — |
| AC-003 | Yes | API-04 (markers in user message, tool call, tool result, reply, Task description, run-history summary; none in any episodic file), API-02 (IMP-08 on real data) | Proven | — |
| AC-004 | Yes | API-05 | Proven | — |
| AC-005 | Yes | API-06 | Proven | — |
| AC-006 | Yes | API-09 (rebuild, no journal, listing), API-08 | Proven (the AC-006 checks of EC-06 all pass; the failing assertion in EC-06 is AC-009's) | — |
| AC-007 | Yes | API-10 (a), API-08 (b), API-01 (records read once: unit count) | Proven | — |
| AC-008 | No (Should) | API-04, API-01 | Proven | — |
| AC-009 | Yes | API-07 (hand edit live, unwritable folder), API-08 (hand edit at start), API-09 (damaged record) | **Not Proven**: a damaged team record is left out with others catalogued, but no warning names it | — |
| AC-010 | Yes | API-02 (IMP-07: the start build over an APFS clone of the founder's memory, 9.9 s / 3.4 s, no server start) | Proven for the build time; the server start on a clone is **Only The User Can Check** | TESTING.md forbids a startup on real user data or a copy of it; the build alone was measured on the clone and the full start path on test-owned data (API-08…API-10). The founder's first start on his node, after his approval and a backup (already a delivery gate), is the remaining check |
| AC-011 | Yes | API-11, API-14 (unit); API-03 (typechecks); IMP-09 (memory e2e) | Not Proven this round (integration and the whole E2E suite are Next Round) | — |
| AC-012 | No | API-15 | Proven | — |
| AC-013 | Yes | API-04, API-01 | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 85% | API-04…API-10 prove AC-001…008, AC-013 directly | AC-009 damaged-record warning fails; AC-011 integration/E2E not yet run | the fix, then API-09, API-12, API-13 |
| Changed-boundary execution directness | 95% | 95% | real composition root, real records, real journals, real GraphQL deletes, real `dist/app.js` starts | the standalone application host's catalog is proven only by its lifecycle unit test | — |
| Cross-boundary integration realism and mock gap | 92% | 92% | only the AGY CLI is scripted; Task titles from real Project Tasks | no real model (not needed for this boundary) | — |
| Environment, configuration, identity, and fixture fidelity | 90% | 90% | test-owned data made through public APIs; team-local agent file-authored + app Reload | older-manifest, no-journal and damaged shapes synthesized on test-owned runs; real-data start not allowed (AC-010) | the founder's own start (delivery gate) |
| Failure, edge-case, lifecycle, and recovery evidence | 75% | 75% | stop inside the debounce window, hand edits, unwritable folder, refused delete, restart with/without changes | damaged record: left out silently (fails rule 7's logged warning) | the fix |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | no UI (requirements: UI not applicable); the desktop app runs the same `buildStudioServer` | — | — |
| Durable regression coverage quality and relevance | 92% | 92% | new gated E2E file covering SCN-001…004 and the added scenarios | gated (`RUN_AGY_FAILURE_E2E`); production timings make it ~7 min | — |

- Overall post-repository confidence: 88%
- Overall final confidence: 88%
- Calculation method: simple average of the six applicable categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `No` (AC-009, AC-011)
- Any final applicable category below `90%`: `Yes`: requirement proof 85%, failure/lifecycle evidence 75%
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: AC-009 damaged-record warning (failing); AC-011 integration and whole E2E (next round); AC-010 real-data start (user/delivery gate); Task-title lookup cost on real data not measured (one `findTask` per distinct Task id per pass)

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed in this round: the E2E file is the broader validation)
- Execution mode: `Live API` + `Lifecycle` (real server, GraphQL/WebSocket, built-server restarts)
- Confidence gap or residual risk it addresses, and the expected gain: the units fake discovery, journals and the clock; the real composition root, record attribution, deletes and restarts are only proven here
- Browser validation needed, and why or why not: no; no UI and no browser boundary is changed
- If `Blocked`: N/A

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Discard or Rebuild` (`episodic/**`); `Not Affected` (every other file)
- Representative existing data used: runs of every kind made on a test server; synthesized older manifest, run without a journal, damaged team tree (all test-owned)
- Approved transition followed without an unnecessary migration: `Yes`
- Cases proving the discard/rebuild outcome: API-09 (rebuild from nothing, byte for byte), API-08 (heal), API-10 (no change → nothing written)
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No` (the older manifest is read by the names-only reader, no version branch)
- Residual untested persisted-data risk: a start on the founder's real data (AC-010, delivery gate)

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No` (the older-manifest case proves the current reader on data that exists, SCN-005)
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/memory/episodic-catalog.e2e.test.ts` | Added | API-04…API-10 | — |

- Added or updated paths attached for proportional test-code review: `Not Applicable` this round (`Fail`: failure-origin review); attached for reference
- Diff or repository evidence supplied for removed paths: N/A

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| AGY CLI (agent runtime) | `tests/fixtures/agy-failure-cli.mjs` (`linked_skills`): real tools via `CALL_TOOL`, replies via `REPLY_FILE` | no inference needed to produce turns, tool calls and journals (TESTING.md "Runtimes without a model") | turns are very fast (7–11 ms); burst spacing is set by the test |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| temp `HOME` per E2E run | Yes | `rm -rf` after the run; the test's `vi.hoisted` home removed in `afterAll` | removed |
| test data dir (`episodic-catalog-e2e-*`) with its memory folder | Yes | harness `close()` removes it; `episodic/` made writable first | removed |
| in-process server, scripted AGY processes | Yes | harness `stopServer()` / run termination | stopped |
| `dist/app.js` processes (EC-05…EC-07) | Yes | `SIGTERM`, waited for exit (`stopBuilt`, also in `afterAll`) | stopped; `pgrep -f episodic-catalog-e2e` empty after the runs |

## Preliminary Classification (On `Fail`)

- **Failing case:** API-09 (EC-06), criterion AC-009 / REQ-012 ("a run's records are damaged → left out with a warning naming it, others catalogued"; DESIGN.md rule 7 "Record it with a logged warning that names the run and the reason").
- **Observed:** with `agent_teams/<T3>/team_run_execution_tree.json` truncated while stopped, the start leaves T3's member out and catalogues every other run, but neither the catalog, the discovery nor any other part of the server logs a line naming T3 (whole stdout + stderr of `dist/app.js`; `"t3Lines": []`).
- **Why (code read, not changed by this ticket):** `RunFolderDiscovery` attributes team members through `TeamRunExecutionTreeLocationService.listAgents`, which skips roots the shared `RootRunPackageReadinessIndex` did not admit (`team-run-execution-tree-location-service.ts:86`, `if (!this.packageCatalog.isAdmitted(rootTeamRunId)) continue;`). The readiness index records an unreadable package only as an in-memory diagnostic (`root-run-package-readiness-index.ts:94`, `this.state.diagnostics = snapshot.diagnostics;`) and logs only when the whole scan fails (`:89`). The member folder is then a folder no record attributes (`agentDefinitionId: null`), which the catalog leaves out by design without a warning (DEC-007's old folders). So the error never reaches `EPISODIC_CATALOG_REFRESH_FAILED` or `RUN_FOLDER_DISCOVERY_SOURCE_FAILED`. The same holds for an org tree (same admission path), by reading.
- **Preliminary classification:** `Design Impact`. The design places rule-7 containment in the catalog's refresh (`EPISODIC_CATALOG_REFRESH_FAILED`, "one unreadable run is left out") and discovery's guarded sources. Damaged team and org records never reach either, because the shared admission index filters them silently. Deciding who logs the warning is a design decision: the admission index (run-history, outside the Change Scope, and also behind the run history lists), or discovery reading the index's `listDiagnostics()`. A logged line per pass could also repeat at every refresh. ticket-scope.md "an old bug in code the ticket calls makes an in-scope acceptance criterion fail" applies: this ticket when the fix is in the functionality it changes, a prerequisite otherwise.
- **Recommended owner:** failure-origin review by the code reviewer; then the Solution Designer if confirmed as `Design Impact`.

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven, or parts only the user can check (IDs): AC-009 (damaged-record warning) Not Proven; AC-011 integration + whole E2E Next Round; AC-010 server start on real data: Only The User Can Check
- Preliminary classification and recommended owner: `Design Impact`, failure-origin review by `/code_reviewer`
- Next recipient from `get_handoff_rules`: `/code_reviewer` (API/E2E validation fails → focused failure-origin review)
- Notes: everything else in the new E2E file passes on the current code (runs 5, 6, 9). Follow-up FU-003 added (load-sensitive unit tests, not caused by this change).
