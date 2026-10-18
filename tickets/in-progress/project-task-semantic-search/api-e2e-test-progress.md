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
