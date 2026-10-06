# API/E2E Test-Case Ledger

`<T>` = `/home/autobyteus/workspace/.codex/worktrees/run-file-change-live-projection-ownership/tickets/in-progress/run-file-change-live-projection-ownership`

## Ledger Meta

- Assigned task workspace / worktree: `/home/autobyteus/workspace/.codex/worktrees/run-file-change-live-projection-ownership`
- Coverage investigation: `<T>/api-e2e-coverage-investigation.md`
- Execution coverage report: `<T>/api-e2e-execution-coverage-report.md`
- API/E2E revision record: `<T>/api-e2e-revision-record.md`
- Ledger scope and reason it is required: several independent repository, real-server and browser cases, plus two long-running owned stacks
- Last updated: 2026-10-06 (round 2, API-REV-002)

## Planned Cases

| Case ID | Case / Journey | Requirement / AC IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| R-001 | Targeted unit/REST/integration/architecture suites | AC-001..AC-005, CTR-001 | Vitest | investigation orders 1, 5 | 1 | baseline + after changes |
| E-001 | Standalone, three images in one turn; each opened and listed before the next | REQ-001/002, AC-002/003/006 | real Studio server + fake AGY | multi-artifact E2E | 2 | durable |
| E-002 | Team member, same journey over the team WebSocket | REQ-001/002, AC-001/006 | same | same | 2 | durable |
| E-003 | Standalone terminate → historical → restore → two more images | REQ-003, AC-004, RU-001 | same | same | 2 | durable |
| E-004 | Team member historical after team terminate | REQ-003, AC-004 | same | same | 2 | durable |
| I-001 | Integration regression incl. 409 → 200 | REQ-004, AC-005, RU-002 | Fastify inject + bound authority | integration file | 3 | durable update |
| E-005 | E-001/E-002 against base `src` | defect detection | same as E-001 | temp checkout | 4 | temporary |
| E-006 | Stability repeats | — | same | ×8 | 5 | — |
| R-002 | Existing AGY E2E + fixture routing + web viewer specs | regression | Vitest | investigation orders 5, 6, 8 | 6 | — |
| B-001 | Browser: standalone live preview of images 1..3 mid-turn, then reload | AC-006, ASM-001, SCN-001/002 | Nuxt + built backend + browser | `launch.mjs standalone` | 7 | temporary |
| B-002 | Browser: Team member live preview of images 1..3 mid-turn | AC-006, ASM-001, SCN-001 | same | `launch.mjs team` | 8 | temporary |
| B-003 | Browser: Team member Artifacts after page reload (team active) | SCN-002, ASM-001 | same | same | 9 | temporary |
| B-004 | Browser: Team member Artifacts after team terminate (historical) | SCN-003, ASM-001 | same | same | 10 | temporary; out of scope under SR-002 (with B-003) |
| B-005 | Browser: standalone run stopped through the UI, then reopened from history after a fresh load | amended AC-004 (standalone UI), SCN-003 | same | `launch.mjs historical` | 11 (round 2) | temporary |

## Execution Events

| Sequence | Case ID | Timestamp (UTC) | Event | Command / Entry Point / Material Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | R-001 | 05:53 | Completed | investigation order 1 | all pass except the known pre-existing case | 52/53; the failure is "hydrates historical AutoByteus team-member…" | Pass | console | — |
| 2 | E-001/E-002 | 05:56 | Checkpoint | first run (harness iteration) | — | Harness defects: env set after the CLI launch; team payload key `source_tool` | N/A | `api-e2e-evidence/run2-harness-env-ordering.log` | fix the harness |
| 3 | E-001..E-004 | 05:58 | Completed | multi-artifact E2E, fixed source | all images 200/listed live, after terminate, after restore | 2/2 tests pass | Pass | `api-e2e-evidence/run3.log` | — |
| 4 | E-005 | 06:00 | Completed | base `src` checkout (restored after) | E2E fails like the user report | standalone and Team member: `image_2_1.png` → 404 "File change not found" | Pass (defect detected) | `api-e2e-evidence/base-source-run.log` | First base attempt left an orphan fake CLI and temp HOME (gate never opened after the failure). Killed/removed both and hardened the test (gates opened in `finally`, afterAll 60 s). Re-ran on base: clean |
| 5 | E-006 | 06:01 | Completed | ×5 | stable | 5/5 pass | Pass | `api-e2e-evidence/repeat-1..5.log` | — |
| 6 | I-001, R-002 | 06:02 | Completed | integration + routing + architecture; AGY E2E set | pass except the pre-existing case | 63/64; AGY E2E 7 pass, 5 skipped (other opt-ins) | Pass | `repo-broad.log`, `agy-e2e.log` | — |
| 7 | R-002 | 06:03 | Completed | web viewer specs after `nuxt prepare` | pass | 19/19 | Pass | `web-viewer.log` | — |
| 8 | E-006 | 06:06 | Completed | hardened test ×3 + step-output; integration rerun | pass | 6/6 ×3; integration 19/20 (pre-existing) | Pass | `final-1..3.log`, `final-integration.log` | — |
| 9 | B-001 | 06:10 | Started | `launch.mjs standalone`, ports 39095/45053 | — | stack ready | — | `browser/launch.mjs` | — |
| 10 | B-001 | 06:14 | Completed | UI composer send; gates 2 and 3 released by hand | every image renders live and after reload | Image 1 auto-previewed while Running. Image 2 (and 1) rendered mid-turn. After completion 3/3 rendered. After reload (run active) 3 listed, 3/3 rendered (blob, 64 px, no "File not found"). No content-route warnings in the backend log | Pass | `browser/03..06*.png`, `browser/standalone-backend.log` | launcher stopped; owned dir removed |
| 11 | B-002 | 06:18 | Completed | `launch.mjs team`, ports 43527/45941; member `content_creator` | every image renders live | 1, then 1–2 mid-turn, then 1–3 after completion; all rendered | Pass | `browser/10, 11*.png` | — |
| 12 | B-003 | 06:20 | Completed | page reload; reselect member; Artifacts tab | 3 listed and rendered | **0 listed ("No touched files yet")**. Server `getRunFileChanges(member)` returns 3; REST 200 for each | Fail | `browser/12-team-after-reload.png` | frontend never hydrates Team-member artifacts → Requirement Gap (ASM-001) |
| 13 | B-004 | 06:22 | Completed | `terminateAgentTeamRun`; reload; member Artifacts | 3 listed and rendered | 0 listed. Server returns 3 entries; REST 200 image/png ×3 | Fail | `browser/13-team-historical-member-empty.png` | same gap |
| 14 | cleanup | 06:23 | Completed | team launcher SIGTERM by PID | owned processes/dirs gone | `CLEANED`; no fake CLI/backend/Nuxt left; user server `:8000` untouched | N/A | `browser/team-*.log` | — |
| 15 | E-001..E-004 | round 2 | Completed | multi-artifact + step-output E2E on HEAD `20258294c` | pass | 6/6 | Pass | `round2-e2e.log` | — |
| 16 | R-001 | round 2 | Completed | integration, unit (service, reader, supervisor, REST), routing, architecture | pass except the pre-existing stale-seed case | 110/111 | Pass | `round2-repo.log` | — |
| 17 | B-005 | round 2 | Completed | `launch.mjs historical`; composer send; UI stop control; fresh load; reopen from sidebar | 3 listed and previewable from history | Offline run, `isActive: false`; 3 listed; 3/3 rendered; 0 content-route warnings | Pass | `browser/20-standalone-historical-reopen.png`, `browser/historical-backend.log` | — |
| 18 | cleanup | round 2 | Completed | launcher SIGTERM by PID; tab closed | owned processes/dirs gone | `CLEANED`; user server `:8000` untouched | N/A | — | — |

## Re-entry And Reconciliation

- Last durably recorded event: 18 (round 2 cleanup)
- Last completed case and result: B-005, Pass. B-003/B-004 are out of scope under SR-002
- Cases still running, interrupted, or not started: none
- Next case or recovery action: none for this ticket. B-003/B-004 are the starting evidence for the Team-member hydration follow-up ticket
- Interruption, context-compression, or rerun note: none
- Reconciled into execution coverage report: `Yes`. `<T>/api-e2e-execution-coverage-report.md` § Test-Case Ledger Reconciliation
- Reconciliation note for any case missing a terminal result: none
