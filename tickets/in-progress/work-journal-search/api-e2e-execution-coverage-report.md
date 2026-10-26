# API/E2E Execution Coverage Report

## Round

- Coverage investigation (the plan; it lists the upstream documents): `tickets/in-progress/work-journal-search/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, the code reviewer's pass CRR-002 (reviewed source `41501c5a41`; ticket folder `e183aded53`).
- Prior round reviewed: none.
- Deviations from the investigation's plan, and why:
  - **Host sleep.** The shared Mac went into idle sleep from 17:52 to 18:42 UTC while the Meaning index embedded (`pmset -g log`: DarkWake from Deep Idle). AC-008's meaning time is reported both as wall-clock and as awake time. From then on, `caffeinate -i -s -w <instance pid>` held the host awake; no setting was changed.
  - **API-L05 phrasing (the user's direction during the run).** Real-agent questions are asked the way a user asks for memory: "Please search your memory: …". The earlier unprompted runs are kept as observation O-1.
  - **API-L05/L07 definitions.** Only one Project Task Manager definition could be linked at a time (`SKILL_NAME_CONFLICT`). So AC-013 ran first on the shipped definition, and then `search_memory` was selected in the definition editor: the user's own opt-in path.
  - **API-L11 restart.** It was done as `stop` then `start --from-worktree` on the same data root, not `restart`, so that the R-016 evaluation command (API-L04 part 2) and the meaning-score probe could read the index while the node was down.
  - **API-L04 question file.** As in IMP-17: Q30 is left out (its run has no raw traces in the copy), and Q13 has two rephrasings. Mine are an Electron-upgrade phrasing and a "when did we upgrade" phrasing; the implementer's are not in the private file.
  - **Off-topic probe.** I added a probe (F-001) beyond the plan, after a codename search returned Strong matches during API-L12.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/work-journal-search/tickets/in-progress/work-journal-search/evidence/api-e2e/` (the handoff message gives the commit). Private outputs: question texts, results, full tool-call lists and answers are in `/Users/normy/autobyteus_org/autobyteus-delivery-receipts/work-journal-search-evidence/api-e2e/`. They are not committed here, because the repository is public.

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` for API-D01 (on a later Pass); this round is a `Fail`, so failure-origin review comes first.

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `06fdc1306a` (= reviewed source `41501c5a41` + test API-D01) | macOS 26 (Darwin 25.5) arm64, M1 Max, 64 GB; shared host | Node 22.23.1 | Load average recorded with every timing (8–64) |
| ENV-2 | `06fdc1306a` | same | Repository probe `memory-search-probe.mjs`: built server, Nuxt dev, headless Chrome, probe-written memory | Clean env, resolved temp `HOME` |
| ENV-D | `06fdc1306a` | same | Packaged desktop, `isolated-app start --build` → `iso-53567-504c`; later `start --from-worktree` on the same data root → `iso-50688-fbfc` | Data root `/private/tmp/wjs-api/root`. Its `server-data/memory` is an APFS clone of the implementer's isolated copy `/tmp/wjs-copy/memory` (taken 2026-10-21): 3,680 run folders, 7.7 GB of raw traces, with every `work_journal/` removed so Index now is a true first build. Never `~/.autobyteus`. Embedding model Granite R2 (default), later LEAF-IR. `CODEX_HOME` is a throwaway home linked to the Codex login. LM Studio on `localhost:1234` was saved as a provider in the instance's own data. Browser locale German (dates and numbers show as `26.10.2026`, `3.680`) |
| ENV-S | `06fdc1306a` | same | Second isolated instance `iso-59036-3979` (`--from-worktree`, own temp data root) | Memory Sync source pushing to ENV-D as the hub |
| ENV-K | image `autobyteus/autobyteus-server:beta` (2026-10-25) | Docker Desktop linux/arm64 | Node 22.23.3, SQLite 3.51.3 | Throwaway container, `--network none`, no volumes |

## Cases

Evidence paths are relative to the evidence folder. `../IMP-*` are the implementer's files.

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R01 | all server | Unit, memory e2e, typecheck | Reused: IMP-16 (`41501c5a41`) | — | Pass | `../IMP-16-server-tests-ir002.log` | `Tests  369 passed`; e2e `Tests  20 passed \| 3 skipped (23)`; `exit 0` | Nothing changed since apart from `tickets/` and API-D01 |
| API-R02 | AC-011, R-015 | Web specs, guards | Reused: IMP-09, IMP-10 (`c66708b44b`) | — | Pass | `../IMP-09-web-memory-specs.log`, `../IMP-10-web-guards.log` | `Tests  123 passed (123)`; `Passed with zero unresolved findings.` | Web unchanged after `c66708b44b` |
| API-D01 | AC-006 | Discovery | New test "never finds runs imported from another node by Memory Sync (AC-006)"; `pnpm -C autobyteus-server-ts exec vitest run tests/unit/memory-search/memory-run-discovery.test.ts --no-watch`; two temporary controls (reverted) | ENV-1 | Pass | `API-D01-discovery-imports-test.log` | `Tests  4 passed (4)`; control 2: `× never finds runs imported from another node` with `+ "imports/docker-node-1/agents/imported_run_1"` | Commit `06fdc1306a`. Control 1 (dropping only the `imports` skip) still passes: the walk starts at the family roots, which is the guard; control 2 (walking from the memory folder) fails the test |
| API-R03 | — | Server build | `pnpm -C autobyteus-server-ts build` | ENV-1 | Pass | `API-R03-server-build.log` | `exit 0`; `Built-in agents bootstrap smoke check passed.` | — |
| API-R04 | R-013, R-014, AC-004, AC-011 | Real-stack browser probe | `env -i PATH HOME=<resolved temp> TMPDIR COREPACK_HOME node autobyteus-web/tests/e2e/memory-search-probe.mjs --output-dir <evidence>/API-R04-memory-page-probe` | ENV-2 | Pass | `API-R04-memory-page-probe/memory-search-probe-evidence.json`, VIS screenshots | `"result": "Pass"`, 21 checks, `"pageErrors": []` | Server dist changed since IMP-12 |
| API-L01 | **AC-008**, R-005, R-009, R-013, AC-011 (index panel), UD-018 | Desktop Memory page, first build on real-size data | Before: open a local run (Work Journal), Search and Index tabs; Index now; status sampler every 2 s; tab switches timed; page search during the Meaning step | ENV-D | Pass | `API-L01-01-first-build-timeline.txt`, `API-L01-02-page-during-build.txt`, `API-L01-01…04-*.png` (05: private) | `"No Work Journal yet. Index your memory to create it."`; `Journals step done: first sample 17:24:48.9 (1 min 52 s after the click)`; `Text index done … (3 min 30 s after the click)`; `wall 88.5 min; …awake time … 40.3 min`; tab switches 54–66 ms (first Browse list load 3,387 ms) | Journals 1.78 GB of Markdown; store 610 MB (O-2) |
| API-L02 | AC-003 (page), AC-011, UC-007, R-002, R-010 | Desktop: search → open at lines; a 6.7 MB journal | Search; open a RUN_FOLDER result (86,296 lines); Jump to day; Go to line 70000; earlier and later windows; Match 2; Back; DDNS run and Raw Traces | ENV-D | Pass | `API-L02-06-journal-navigation.txt` (its screenshots show real journal text: private folder) | `"Lines 1–300 of 86.296"`, highlighted 5…22, `Large file: lines load in parts.`; `Lines 69.850–70.149 of 86.296`, 290 ms; Back 90 ms | On the page (no asking run) the DDNS run is #3 |
| API-L03 | AC-010, AC-011, UD-008, R-015 | Desktop Browse | Agent Teams and Agents tabs on real data | ENV-D | Pass | `API-L03-03-browse-observations.txt`, `API-L03-01/02-*.png` | 4 cards with `Task team`; tooltip `Task team · started by Project Task Manager`; `episodic=false` | The copy's team history index is empty, so configured team runs have no list record (copy limitation); their folders are still searched |
| API-L04 | **AC-001, AC-002** (rank, latency), AC-003, AC-004, AC-005, AC-007 (curated set) | (1) page search over HTTP; (2) R-016 evaluation command on the instance's own index | (1) `probes/API-PROBE-graphql-gates.mjs <graphql> <private queries> --rounds 2`; (2) `evaluate-memory-search.mjs --memory-dir <root>/server-data/memory --index-dir <root>/server-data --questions <private adjusted> --model granite… --asking-run solution_designer_8062…` | ENV-D | Pass | `API-L04-01-page-search-gates-http.txt`, `API-L04-02-evaluation-command-gates.txt` | (2) `gate1 {"passed": 31, "oneSearchTop10": 30, "withinThreeSearches": 31}`; `"top3": 26, "top3Share": 0.8387…, "p90Ms": 508, "maxMs": 900`; `unmaskedSecrets 0`; `offTopic {"questions": 3, "passed": 3, "failed": []}`; `falseOnlyWeak []`. (1) `"p90Ms": 640, "maxMs": 1198` over HTTP | Load 8.5–14 (no idle machine); this run's test chats quote Q01/Q06/Q07/Q13 and now compete for them |
| API-L05 | **AC-012**, AC-002 (agent steps), AC-003, AC-004, AC-006 (own run) | Codex runtime, MCP adapter | Project Task Manager with `search_memory` selected in the definition editor; one chat per question from the UI | ENV-D | Pass | `API-L05-01-definition-search-memory-selected.png`, `API-L05-02-codex-agent-search-memory.txt` | Q07: `1 / 1` calls, accepted run `#2`, 2 steps; Q13: accepted run `#3, then #2`; absent codename: `"My memory search found only your message just now"`; the asking run never in its own results | Without "search your memory", the agent rarely called the tool (O-1) |
| API-L06 | AC-012 | AutoByteus runtime, native tool | The same definition; LM Studio `qwen/qwen3.6-35b-a3b`; Q06 in the user's words | ENV-D | Pass | `API-L06-01-native-agent-search-memory.txt` | `search_memory {"query": "bunny tortoise race game"}`; accepted run `#3`; answer names the right run and day | 1 search, 0 reads; qwen unloaded afterwards |
| API-L07 | **AC-013** | Codex and AutoByteus runtimes | Shipped definition (no `search_memory`): ask it to call the tool; Codex also calls `mcp__autobyteus_agent_tools__search_memory` directly | ENV-D | Pass | `API-L07-02-codex-no-tool.txt`, `API-L07-03-native-no-tool.txt`, `API-L07-01-codex-without-tool.png` | `TypeError: tools.mcp__autobyteus_agent_tools__search_memory is not a function`; native: `I don’t have a tool named “search_memory”` | — |
| API-L08 | **AC-009**, R-006, CR-002 | Running app: live updates | A Codex turn carrying a new word; `probes/API-PROBE-freshness.mjs`; status and search sampled during the live pass (2 s, then 250 ms) | ENV-D | Pass | `API-L08-01-turn-findable-by-text.txt` | `"foundAtMs": 21103` and `"foundAtMs": 25217`; `states {'READY': 173} non-null search coverage notes 0` | — |
| API-L09 | **CR-001**, SCN-E | A turn during a full pass | Rebuild clicked; a new Codex chat's turn with a new word during the Journals step | ENV-D | Pass | `API-L09-01-turn-during-rebuild.txt` | `"foundAtMs": 120779` (1.6 s after the pass ended at 19:51:39) | The run did not exist when Find runs listed 3,693 runs |
| API-L10 | Model change (UXJ-005, VIS-016), R-013 Rebuild | Settings → Embedding; Memory Index and Search | Use LEAF-IR (download 24 MB); Index tab; Search; Rebuild with confirmation; Meaning index rebuilt with LEAF-IR | ENV-D | Pass | `API-L10-01-index-model-changed.png`, (02: private), `API-L10-03-rebuild-confirm.png`, `API-L10-04-model-change-rebuild.txt` | `state":"MODEL_CHANGED"`; `"The Meaning index was built with granite-embedding-small-english-r2. Rebuild to use mdbr-leaf-ir."`; search coverage `results are by words only until the user rebuilds`; after Rebuild `MEANING_INDEX:DONE:…` with `mdbr-leaf-ir` | Index tab amber dot `bg-amber-400` |
| API-L11 | DS-006, MP-001 | Restart | Stop; evaluation and score probe on the stopped index; start on the same data root; watch server threads and footprint; first searches | ENV-D | Pass | `API-L11-01-restart.txt`, `API-L11-02-index-after-restart.png` | `threads 27 Footprint 243 MB` before any search; first search `"The meaning index is loading: these results are by words only."`; then `threads 31 Footprint 468 MB`, `coverage null` | Store reused (READY at once) |
| API-L12 | **AC-006**, R-004, imported view | Real Memory Sync, hub = ENV-D | Source turn with a new word; hub credential, hub and source config; Sync now; search; Browse source picker; open the imported run | ENV-D, ENV-S | Pass | `API-L12-03-imported-memory.txt`, `API-L12-01/02-*.png` | `imports/api-e2e-source-node/agents/daily_assistant_b7049c63…`; searches return 0 imported runs; again after the restart catch-up and after Rebuild (`imports hits: 0`, files unchanged); `Imported · read-only` | An imported run without a journal could not be produced (a synced live run brings its journal); covered by component specs |
| API-L13 | Design risk: Node `node:sqlite` on Docker | Server image runtime | `docker run --rm --network none --entrypoint node autobyteus/autobyteus-server:beta -e '<the store's DDL, insert, delete, MATCH, vocab>'` | ENV-K | Pass | `API-L13-docker-node-sqlite.txt` | `{"node":"v22.23.3","sqlite":"3.51.3","match":[1,2],"cjkPhrase":[2],"afterDelete":0,…}` | — |
| F-001 probe | **AC-007, R-009** beyond the curated set | Page search (GraphQL) on the complete index; meaning scores | `probes/API-PROBE-offtopic.mjs <graphql>`; `probes/API-PROBE-meaning-scores.mjs <memory> <appData> granite… <cues>` | ENV-D | **Fail** | `F-001-01-offtopic-cues.txt`, `F-001-02-meaning-scores.txt`, `F-001-03-offtopic-cues-leaf-ir.txt` | `"passed": 2, "of": 11`; e.g. C1 `{'MEANING/STRONG': 10}` with `onlyWeakNote False`; scores `[0.7826, …] relevant 70` vs floor `0.78` | See Findings |
| API-R05 | — | Repository checks | `python3 scripts/check_licensing.py`; `python3 scripts/check_repository_artifact_hygiene.py` | ENV-1 | Pass | `API-R05-licensing-hygiene.log` | `Licensing is consistent.`; `Repository artifact hygiene check passed.` | After the commit |

## Findings

### F-001 — Off-topic cues get Strong meaning matches and no only-weak note (AC-007, R-009) — Fail

- **Scenario.** An agent or the user asks about something that is in no local run. For example, work that happened on another node (the Task's own DDNS story), or a codename: "Do you remember the project codenamed X? Where is it?" R-009 and AC-007 require the only-weak note, with every match weak, so that the agent tries other words instead of trusting the results.
- **Observed (Reproduced, complete index, Granite R2).** 9 of 11 off-topic cues fail:
  - every key word was verified by count to occur in no journal;
  - 7 of the 8 codename cues (alone or in a sentence) return 4–10 `MEANING/STRONG` matches and `note: null`;
  - the plain-words cue "What did we decide about the sauerkraut supplier contract?" also returns 4 `MEANING/STRONG`;
  - T2 is `partial` under SR-004b and not gated;
  - the curated set (N02, N04, N05) passes, as in IMP-17;
  - the same failures appeared at partial meaning coverage (2 of 11 passed);
  - after the Rebuild with LEAF-IR (floor 0.3), C1, C2, C4, T1 and T3 again get `MEANING/STRONG` (`F-001-03-offtopic-cues-leaf-ir.txt`; C3 and S1–S4 are by then contaminated by this run's own chats). So it is not specific to Granite.
- **Mechanism (Measured; read in `relevance.ts` and `embedding-index.ts`).**
  - A meaning match is `relevant` (shown Strong) when the best card scores at least the model's `clearMatchFloor` (Granite 0.78, calibrated for Project Tasks) and is within `nearBestMargin` 0.02 of the best.
  - Off-topic cues score 0.77–0.80 against journal cards, right on that floor. Whether a cue gets 0 or 70–84 "relevant" cards depends on a 0.01 difference: "pelicanmarigold9152" best is 0.7826 with 70 relevant; "falconsaffron3381" best is 0.7706 with 0.
  - Real answers score 0.89–0.93, with 1 relevant card.
- **Impact.** An agent is told several unrelated runs are Strong matches for something that never happened on this node. In API-L05 the prompted agent stayed honest about an absent codename only because my own earlier chat contained it. Results are pointers to verify, but the strength word is what tells the agent whether to try other words.
- **Why repository checks did not catch it.** The R-016 off-topic set has 3 cues, all plain-word phrases whose best meaning scores fall under the floor (lasagna 0.7445, aquarium 0.7771).
- **Preliminary classification:** `Design Impact`. The design maps the embedding layer's Project-Task relevance (`relevant` → Strong, `aboveFloor` → Fair) onto journal cards without a calibration for this collection. The R-016 off-topic check is too narrow to calibrate it. Recommended owner: failure-origin review by the code reviewer, then the Solution Designer.

### Observations (not failures)

- **O-1, tool adoption without the word "memory".** With `search_memory` selected, the Codex Project Task Manager called it for "Do you remember … ?" (Q01) but not for "Where is the racing game we made before?" (English or Chinese) or "When did we bump …?". It tried Projects and the Codex login's connectors instead. The user's direction is that users ask with "search your memory", and with that phrasing every question used the tool (API-L05).
- **O-2, store size.** `memory-search.sqlite` is 610 MB for 1.78 GB of journals; the design estimated 100–300 MB. There is no second copy of the text, so R-013's disk rule holds.
- **O-3, earlier questions outrank the answer.** Runs that ask or discuss the same question rank above the run that did the work. These are this ticket's design run, the user's earlier chats and this run's own test chats. In Q01 the DDNS run was #6 for the unprompted agent, which needed 7 searches. This is the known R-016 "self-references" candidate.
- **O-4, Embedding switch dialog.** It says every Project must be re-indexed but does not mention the memory index; the Memory page shows "Embedding model changed" correctly. The dialog is autobyteus-146 copy, outside this ticket's Change Scope.
- **O-5, Browse dates.** Agent cards show the instance's first-start time on this copied data (fresh database). This is environment fidelity, not this change.

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-L04 (31/31 within 3 searches) | Proven | — |
| AC-002 | Yes | API-L04: top 3 26/31 = 84%; p90 508 ms, max 900 ms in-process, 640/1,198 ms over HTTP, at load 8.5–14. API-L05 and API-L06: 2 steps for the prompted questions | Proven (the idle reference machine was not available; the numbers are on a shared host) | — |
| AC-003 | Yes | API-L04 (#3), API-L05 (Q01 reached) | Proven | — |
| AC-004 | Yes | API-L04 (5 Chinese questions in the top 10), API-L05 (Q07), API-R04 | Proven | — |
| AC-005 | Yes | API-L04 (`unmaskedSecrets 0`) | Proven | — |
| AC-006 | Yes | API-L12, API-D01; API-L05 (asking run absent) | Proven | — |
| AC-007 | Yes | API-L04 (curated set passes); **F-001 probe fails** | **Not Proven** (F-001) | — |
| AC-008 | Yes | API-L01 | Proven on the copy | The build on the user's own memory needs the user's approval and a backup (task rule). Delivery takes it to the user |
| AC-009 | Yes | API-L08, API-L09 | Proven | — |
| AC-010 | Yes | API-L02 (RUN_FOLDER old-format member), API-L03, API-L04 | Proven | — |
| AC-011 | Yes | API-L01, API-L02, API-L03, API-L10, API-R04 | Proven | — |
| AC-012 | Yes | API-L05 (Codex, MCP), API-L06 (native) | Proven (with the user's "search your memory" phrasing; O-1) | — |
| AC-013 | Yes | API-L07 | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | 50% | All ACs exercised on real data and agents | AC-007 fails beyond the curated set (F-001) | Fix and recheck F-001 |
| Changed-boundary execution directness | 85% | 95% | Real tool calls (MCP and native), real pipeline, page, restart, sync | — | — |
| Cross-boundary integration realism and mock gap | 80% | 95% | Real models, real runtimes, real Memory Sync, real 3,680-run memory | — | — |
| Environment, configuration, identity, and fixture fidelity | 75% | 90% | Packaged desktop on a copy of real memory | Copy from 2026-10-21; shared and sleeping host; no idle reference machine | The user's own build (delivery) |
| Failure, edge-case, lifecycle, and recovery evidence | 80% | 90% | Restart, model change, Rebuild, turns during passes, imports | Imported run without a journal not producible | — |
| User-surface, browser, and desktop-shell confidence | 85% | 95% | Electron page journeys, probe | — | — |
| Durable regression coverage quality and relevance | 85% | 85% | API-D01; existing suites | No durable check would catch F-001 (curated off-topic set too small) | Add codename-like off-topic cues to the R-016 check |

- Overall post-repository confidence: 81%
- Overall final confidence: 87% (simple average)
- Calculation method: simple average.
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `No`; AC-007 (F-001).
- Any final applicable category below `90%`: `Yes`. Requirement proof is at 50% and durable coverage at 85%.
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: F-001; O-1 (agent adoption depends on phrasing); O-3 (self-references); latency was not measured on an idle reference machine.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Project Desktop Validation` (isolated packaged instances), `Live API`, `Lifecycle`, `Worker or Distributed` (Memory Sync), plus the repository's browser probe.
- Confidence gap: real agents (UD-007), the first build at real size, live updates and passes together, restart, model change, imports, and gate 2 under lower load.
- Browser validation needed: yes, for the Memory page in Electron and in the probe.

## Desktop Application Validation

- Approach executed: `isolated-app start --build --data-root` (a test-owned root holding the memory clone), CDP-driven; a second instance as the Memory Sync source.
- Web-equivalent cases: API-L01–L03, L08–L10, L12. Lifecycle: API-L11 (embedded server start, catch-up, model load on the first search).
- Effect on any already-running desktop application: `None` (own ports, data roots and process groups).
- Behavior not directly proven: Windows, Linux and macOS x64 builds.

## Persisted-Data Transition Checks

- Approved persisted-data decision: the store and vectors are `Discard or Rebuild`; journals and `runtime_kind: null` are `Directly Usable — No Migration`.
- Representative existing data used: 3,680 real run folders (copy), many without metadata; journals generated through the journal service.
- Approved transition followed without an unnecessary migration: `Yes`. Rebuild dropped and rebuilt (API-L10); the store was reused after the restart (API-L11).
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none material.
- Note: the instance's existing app-data migrations ran on the copy at first start (`20260814_team_run_execution_tree_v1`, `run_metadata.json.backup-…`). This is test-owned data and not this ticket's code.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No` (no "Episodic", "Semantic" or "Working Context" on the page: API-L03)
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/memory-search/memory-run-discovery.test.ts`: "never finds runs imported from another node by Memory Sync (AC-006)" | Added (commit `06fdc1306a`) | API-D01 | — |

- Added or updated paths attached for proportional test-code review: `Yes` (for the review after the failure is resolved)
- Diff or repository evidence supplied for removed paths: N/A

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| The user's memory | APFS clone of the implementer's isolated copy, journals removed | Task rule and TESTING.md: never `~/.autobyteus`; the first build on the user's data needs the user's approval and a backup | The copy is from 2026-10-21; today's memory is larger |
| A second node | A second isolated desktop instance as the Memory Sync source | No other node; test-owned | — |
| LM Studio provider configuration | Saved with a placeholder key in the instance's own data root | The local provider needs no key; the UI marks it "Configured" | — |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Probes and helpers in `evidence/api-e2e/probes/` (`API-PROBE-memory-page.mjs`, `-index-sampler`, `-graphql-gates`, `-freshness`, `-offtopic`, `-meaning-scores`; `API-HELPER-q.mjs`, `-sync.mjs`, `-codex-ask.sh`, `-calls.py`) | Yes | Kept as evidence | Kept |
| Screenshots that show real journal text (API-L01-05, API-L02-01…05, API-L10-02) | Yes | Moved to the private evidence folder (the repository is public) | Kept privately |
| Instance `iso-53567-504c`, then `iso-50688-fbfc` (data root `/private/tmp/wjs-api/root`) | Yes | `isolated-app stop` (`wasRunning True`), then `rm -rf` of the provided data root and `/private/tmp/wjs-api` | `isolated-app list` → `[]`; ports 53567/53568/50688/50689 free; the implementer's `/tmp/wjs-copy/memory` untouched (3680 `work_journal` dirs, as before) |
| Source instance `iso-59036-3979` and its temp data root | Yes | `isolated-app stop` | `wasRunning True, dataRootRemoved True` |
| Throwaway `CODEX_HOME`, test agent package, samplers, `caffeinate` | Yes | Removed; samplers killed; `caffeinate -w` ended with the instance | No process left (`pgrep caffeinate` empty); sampler files kept in the private folder |
| LM Studio `qwen/qwen3.6-35b-a3b` (loaded on demand by API-L06/L07) | Yes | `lms unload` | `No models are currently loaded.` |
| Throwaway Docker container (API-L13) | Yes | `--rm` | Removed |
| `/tmp/wjs-copy/memory` (the implementer's copy) | No | Left untouched (`work_journal` count unchanged at 3680) | Kept |
| Private outputs | Yes | Kept in the private evidence folder (not committed) | Kept |

## Preliminary Classification (On `Fail`)

- `Design Impact`: F-001. The meaning strength rule reuses the embedding layer's Project-Task relevance calibration for journal cards; off-topic cues sit on its floor, so they are shown as Strong and the only-weak note is not given (AC-007, R-009). Recommended owner: code reviewer failure-origin review, then the Solution Designer.

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven, or parts only the user can check (IDs):
  - AC-007 (F-001);
  - AC-008 on the user's own memory (the user only).
- Preliminary classification and recommended owner: `Design Impact` → failure-origin review by `/software_engineering_team/code_reviewer`.
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (rule: "When API/E2E validation fails and the complete failure package requires focused failure-origin review by the code reviewer.")
- Notes: every other case passed. A rerun after the fix needs only:
  - the F-001 probe and the R-016 gates (API-L04), if the strength rule or calibration changes;
  - the cases whose code changes.
