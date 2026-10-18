# API/E2E Test Progress — autobyteus-140 `agent-run-input-state-cleanup`

Progress log while tests run. Only add rows. Read it first when picking the run back up.

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: `api-e2e-coverage-investigation.md` › Planned Cases
- Code under test: `a3c4982721` (HEAD `24b6017a7e` adds only the ticket folder)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-10-18 16:30 | CODE-01 | Started | — | Code reading of the diff, call-site comparison, grep |
| 2026-10-18 16:31 | CODE-01 | Completed | Pass | evidence/CODE-01-code-reading.txt: AC-001..AC-004 hold; behavior-equivalent ordering |
| 2026-10-18 16:31 | REPO-01 | Started | — | own rerun at HEAD: agent-run.test.ts, agent-status-websocket |
| 2026-10-18 16:31 | REPO-01 | Completed | Pass | evidence/REPO-01-own-rerun.log: 46/46, 8/8 |
| 2026-10-18 16:31 | MUT-01 | Started | — | mutants (a) no revision advance, (b) read order swapped; restore with git checkout after each |
| 2026-10-18 16:32 | MUT-01 | Completed | Pass | evidence/MUT-01-mutants.txt: (a) killed by 5 PB-001 cases; (b) survives as an equivalent mutant (calls commute); source restored |
| 2026-10-18 16:32 | LIVE-01 | Started | — | PB-001 probe on built dist (16:23, contains the refactor), LM Studio qwen JIT; out evidence/LIVE-01 |
| 2026-10-18 16:46 | LIVE-01 | Completed | Pass | evidence/LIVE-01: revisions 1..8, 0 repeats (A and B); window gaps 492–789 ms; queued revision after 2 ms right after flushed content; B snapshot rev 5 then 6..8. Probe end-wait timed out (turn 2 runaway, model); model unloaded |
| 2026-10-18 16:47 | — | Checkpoint | — | All cases complete (Pass). Report and revision record written; committing, then the handoff |
