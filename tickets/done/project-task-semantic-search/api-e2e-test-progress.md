# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)
- Note: rows up to 12:28 were written in an earlier case ledger (`api-e2e-test-case-ledger.md`, replaced by this log when the skill changed during the run) and are carried over here in order.

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 11:36 | (setup) | Started | — | Docker image build `ab-pts-validation:722b9b3918` (background) |
| 11:37 | API-R01 | Completed | Pass | typecheck exit 0 |
| 11:37 | API-R02 | Completed | Pass | 6 files, 38 tests |
| 11:38 | API-R03 | Started | — | server `test:unit` in background |
| 11:39 | API-D01 | Completed | Pass | new E2E 2/2 (also rerun in API-R05) |
| 11:40 | (setup) | Completed | — | image built, 9.43 GB |
| 11:44 | API-L01 | Started | — | container `pts-api-docker` on 127.0.0.1:60668 |
| 11:52 | API-L01 | Completed | Pass | container removed |
| 11:58 | API-R07b | Completed | Pass | web guards |
| 11:58 | API-R08 | Completed | Pass | licensing + hygiene |
| 12:08 | API-R03 | Completed | Pass | 726 files / 5,871 tests |
| 11:50 | API-L02a | Started | — | `isolated-app start --build` (background) |
| 12:10 | API-R05 | Completed | Pass | e2e projects folder 36 tests |
| 12:13 | API-R06 | Completed | Pass | gated real models 3/3 |
| 11:56 | API-L02a | Completed | Pass | instance iso-61890-f6ae |
| 11:59 | API-L03a | Completed | Pass | seeded; restarted as iso-62519-5afd on the kept data root |
| 11:59 | API-L02b | Started | — | first use on Backlog 1000 |
| 12:01 | API-L02b | Completed | Pass | ready ≈107 s, target shown without retyping |
| 12:01 | API-L03b | Completed | Pass | indexing + RSS peak (RSS later found unreliable; see 12:17) |
| 12:03 | API-L04 | Checkpoint | — | Backlog 1000 quality: 87.3% / unrelated 6 of 12 → characterize |
| 12:05 | API-L04 | Checkpoint | — | score analysis reproduces; repo texts also weak on unrelated |
| 12:07 | API-L03c | Completed | Pass | GraphQL p90 125 ms; board 327–446 ms |
| 12:07 | API-L03d | Started | — | idle window (no instance interaction) |
| 12:08 | API-L04 | Checkpoint | — | score analysis for 3 models running in background (`/tmp/pts-api/score-analysis-all.log`) |
| 12:16 | API-R07a | Completed | Pass | web suite 632 files / 4,479 tests |
| 12:17 | API-L03d | Checkpoint | — | switched memory sampling to `footprint` (swap makes RSS unreliable) |
| 12:19 | API-L03d | Completed | Pass | footprint 280 → 162 MB after the 10-min idle stop |
| 12:20 | API-L02c | Started | — | right panel, Backlog 1000 long (first search of that Project) |
| 12:21 | API-L02c | Completed | Pass | locate while preparing 131 ms; Refresh, Cancelled toggle, open/return |
| 12:21 | API-L03b | Checkpoint | — | footprint during 1,000 long-Task indexing: peak 562 MB |
| 12:27 | API-L04 | Checkpoint | — | long-form targets: 87.3% / 6 of 12 |
| 12:27 | API-L02d | Completed | Pass | exact "restart": 4 exact first (all containing), then 3 meaning |
| 12:28 | (process) | Checkpoint | — | skill updated: ledger replaced by this log; evidence moved to `evidence/` (symlink `api-e2e-evidence` kept until the background analysis ends) |
| 12:28 | API-L02e | Started | — | edit/delete/delete Project on Representative 60 |
| 12:29 | API-L02e | Completed | Pass | edit 3.8 s to meaning; delete row removed; Project delete drops vectors |
| 12:29 | API-L02c2 | Started | — | create Task while searching (Projects page) |
| 12:30 | API-L02c2 | Completed | Pass | creation cleared the search |
| 12:30 | API-L02g | Started | — | Settings UI: unknown id, then Granite with the models folder unwritable (AC-011 UI), Retry, then back |
| 12:32 | API-L02h | Completed | Pass | unavailable + Retry on the board (EACCES), exact matches kept, create OK |
| 12:33 | API-L02g | Completed | Pass | unknown id rejected in UI; Granite after Retry; back to default; only active model kept |
| 12:33 | API-L02f | Started | — | rebuild Backlog 1000 on LEAF-IR, then restart |
| 12:42 | API-L02f | Checkpoint | — | previous session ended; instance stopped; restarted as iso-65187-14ae on the kept data root; baseline footprint taken |
| 12:42 | API-L02f | Checkpoint | — | Rep60 post-restart search ran but its output was lost (pipe error); redoing AC-009 on Backlog 1000 |
| 12:48 | API-L02f | Completed | Pass | restart: 1,000-Task index ready 1.2 s after first search; edited-after-restart Task found by meaning |
| 12:48 | API-L03c | Completed | Pass | footprint: burst +436 MB peak; user-paced median +140 / max +330 MB; listing load alone +~100 MB |
| 12:48 | API-L04 | Started | — | Granite + EmbeddingGemma score analysis (background); board screenshots of unrelated queries |
| 12:48 | API-L05 | Completed | Pass | companion PTM imported in the instance; 1 of 57 definitions selects the tool |
| 12:59 | (process) | Checkpoint | — | investigation restructured to the updated template; the old case ledger removed (its events are in this log and in the report's Cases) |
| 13:00 | API-R04 | Started | — | test:integration (prerequisite check first) |
| 13:10 | API-R04 | Completed | Pass (in scope) | 74 files pass; package auto-refresh passes when rerun alone (load); 2 agent-status cadence cases fail alone too: pre-existing, outside this change |
| 18:37 | API-L04 | Completed | Fail | LEAF-IR fails AC-004 at 1,000 Tasks (6/12 generated, 4/12 real text); Granite 12/12; EmbeddingGemma 12/12 (fixture + real text) |
| 18:37 | (process) | Checkpoint | — | finalizing: report, evidence names/headers, cleanup, commit, handoff |
| 18:38 | (process) | Checkpoint | — | cleanup done (instance stopped, data root, test image, /tmp/pts-api removed); report and revision record final |
| 19:45 | (round 2) | Checkpoint | — | round 2 started for IR-003 (9f0df7eab3); plan in the investigation § Round 2 Rerun Plan |
| 19:45 | API-L02a | Started | — | isolated-app start --build (background) |
| 19:45 | API-R06 | Started | — | gated real-model check, default model, TEST_EMBEDDING_SCALE=1 (background) |
| 19:51 | API-L02a | Completed | Pass | round 2 build iso-60493-231f; prune + runtime check pass; packaged default = Granite |
| 19:52 | API-L03a | Started | — | round 2 seeding |
| 19:53 | API-L03a | Completed | Pass | 2,060 Tasks seeded; no embeddings/ |
| 19:53 | API-L02b | Started | — | round 2 first use on Backlog 1000 (Granite download + index) |
| 19:53 | API-R06 | Completed | Pass | Granite default at scale (see evidence) |
| 19:57 | API-L02b | Completed | Pass | Granite first use 221 s / 1,000 Tasks, target shown without retyping |
| 19:57 | API-L03b | Completed | Pass | peak footprint +265 MB; 55 MB model; index files |
| 19:57 | API-L04 | Started | — | round 2 in-app quality (Granite) on 60, 1,000 generated, 1,000 real text |
| 19:57 | API-R05 | Started | — | e2e projects folder, clean env |
| 19:59 | API-R05 | Completed | Pass | 6 files / 36 tests incl. API-D01 and the search E2E |
| 20:01 | API-L04 | Checkpoint | — | in-app: 96.8/93.7/92.1% shown in first 5; 23/24 unrelated no match on all three |
| 20:01 | API-L04 | Completed | Pass | board shows the no-match state for an unrelated query on both 1,000-Task Projects |
| 20:02 | API-L03c | Started | — | round 2 latency + footprint while searching |
| 20:03 | API-L03c | Completed | Pass | p90 46 ms; footprint while searching +298 MB; board update measured |
| 20:03 | API-L02e | Completed | Pass | QR-002 with Granite |
| 20:03 | API-L03d | Started | — | idle window: no instance interaction for 12 min |
| 20:16 | API-L03d | Completed | Pass | idle: 405 MB → 137 MB after the 10-min stop (baseline 185) |
| 20:16 | API-L02f | Started | — | round 2 restart + O-1 |
| 20:16 | API-L02f | Completed | Pass | LOADING (O-1) then READY 1.25 s; edited Task found |
| 20:16 | API-L02g | Started | — | Settings switch Granite → LEAF-IR → blank |
| 20:17 | API-L02g | Completed | Pass | unknown id rejected; LEAF-IR then blank (Granite); only active model kept |
| 20:17 | (process) | Checkpoint | — | round 2 cleanup: instance stopped, data root removed, /tmp/pts-api2 removed |
| 20:19 | (round 2) | Completed | Pass | report, revision record API-REV-002 and investigation updated; committing and handing off |
| 20:58 | (round 3) | Checkpoint | — | round 3 started for IR-004 merge (600d079b9c); plan in the investigation § Round 3 Rerun Plan (foundation change → all cases rerun or reused on 600d079b9c) |
| 20:59 | API-L02a | Started | — | round 3 isolated-app start --build (background) |
| 20:59 | API-L01 | Started | — | round 3 Docker image build ab-pts-validation:600d079b9c (background) |
| 20:59 | API-R08 | Completed | Pass | round 3 licensing + hygiene |
| 20:59 | API-R05 | Started | — | round 3 e2e projects, clean env, resolved HOME |
| 21:03 | API-R05 | Checkpoint | — | 5 files pass (incl. both search E2E, boundaries 13 with the seven-tool MCP list); projects-startup-migration 6 failures: spawns dist/app.js while my concurrent desktop build rebuilt dist (run-order error, TESTING 'serialize builds'); rerun that file after the build |
| 21:08 | API-R05 | Completed | Pass | 5 files pass in the folder run; startup-migration 6/6 when rerun after the build |
| 21:08 | API-L02a | Completed | Pass | round 3 build iso-64674-76e2 |
| 21:10 | API-L03a | Completed | Pass | round 3 seeding |
| 21:10 | API-L02b | Started | — | round 3 first use on Backlog 1000 |
| 21:15 | API-L02b | Completed | Pass | 291 s / 1,000 Tasks; target shown without retyping |
| 21:15 | API-L03b | Completed | Pass | round 3 first-use time/footprint |
| 21:15 | API-L02c | Started | — | round 3 right panel, real-text Project first search |
| 21:16 | API-L02c | Completed | Pass | round 3 locate while preparing 115 ms; Refresh kept the search |
| 21:16 | API-L04 | Started | — | round 3 in-app quality (background) |
| 21:17 | API-L01 | Completed | Pass | round 3 Docker: offline→Retry→ready, quality 96.8%/23 of 24, restart LOADING→READY; container+image removed |
| 21:21 | API-L04 | Checkpoint | — | round 3 in-app quality 96.8/93.7/92.1, 23/24 all |
| 21:21 | API-L04 | Completed | Pass | board no-match on both 1,000-Task Projects |
| 21:21 | API-L02d | Completed | Pass | exact first |
| 21:21 | API-L02c2 | Completed | Pass | create cleared search |
| 21:22 | API-L02e | Completed | Pass | round 3 QR-002 185 ms; delete Task/Project vectors removed; no failure logged |
| 21:24 | API-L03c | Completed | Pass | round 3 p90 45 ms; board 304–336 ms; +306 MB searching |
| 21:24 | API-L05 | Completed | Pass | companion definition selects the tool in the merged app |
| 21:24 | API-L02g/L02h | Started | — | round 3 Settings switch with models folder unwritable, board Retry, back to blank |
| 21:25 | API-L02g/L02h | Completed | Pass | round 3 unknown id rejected; unavailable + board Retry; LEAF-IR then blank; only active model kept |
| 21:25 | API-L02f | Started | — | round 3 rebuild Backlog 1000, restart, edit, first search |
| 21:29 | API-L02f | Completed | Pass | round 3 LOADING then READY 1.24 s; edited Task found |
| 21:29 | API-L03d | Started | — | round 3 idle window (no instance interaction); suites run meanwhile |
| 21:29 | API-R06 | Started | — | round 3 gated scale (background chain R06 → R07 → R04) |
| 21:41 | API-L03d | Completed | Pass | round 3 idle (see evidence) |
| 21:41 | API-R06 | Completed | Pass | round 3 gated scale |
| 21:41 | (process) | Checkpoint | — | round 3 instance stopped, data root removed |
| 21:44 | API-R07 | Completed | Pass | round 3 web 636 files / 4,519 tests; guards pass |
| 21:44 | API-R04 | Completed | Pass | round 3 integration 77 passed, no failures |
| 21:46 | (round 3) | Completed | Pass | report, revision record API-REV-003 written; committing and handing off |
