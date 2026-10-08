# API/E2E Test-Case Ledger

## Ledger Meta

- Assigned task workspace / worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks` (HEAD `330cc5cef` + API/E2E test changes, uncommitted)
- Coverage investigation: `tickets/in-progress/idle-shutdown-background-tasks/api-e2e-coverage-investigation.md`
- Execution coverage report: `tickets/in-progress/idle-shutdown-background-tasks/api-e2e-execution-coverage-report.md`
- API/E2E revision record: `tickets/in-progress/idle-shutdown-background-tasks/api-e2e-revision-record.md`
- Ledger scope and reason it is required: several long-running live cases (real Claude, AGY, Codex, LM Studio) and a multi-minute scripted lifecycle E2E
- Last updated: 2026-10-08

Round 1 (SR-002 removal) was stopped by the Solution Designer before any result: R-001 (focused suites, 1111 passed) and two attempts of the SR-002 version of E2E-IDLE ran; evidence `evidence/api-e2e/r1-*`, `e2e-idle-r1.log`, `e2e-idle-r2.log`. Those cases tested superseded behavior and are not part of any result. The table below is round 2 (SR-003).

## Planned Cases

| Case ID | Case / Journey | Requirement / Acceptance-Criteria IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| R-FOCUS | Focused unit + integration set (implementer's set + projects, agent-tools) | AC-001..AC-007 | Vitest | investigation order 1 | 1 | Compare failures with base |
| R-FOCUS-BASE | Same set on base `3a2496c95` | rule 9 / no new failures | Vitest, temp base worktree | same | 2 | |
| FIX-001 | Fixture routing case (`BACKGROUND_STEP`) | fixture | Local process | `vitest run …/agy-failure-cli-routing.test.ts` | 3 | |
| AC008 | Revert diff + contract grep | AC-008 | git | `git diff --stat 3a2496c95 a1dc499e4 -- . ':!tickets'` | 4 | |
| E2E-HYB | `task-copy-idle-lifetime.e2e.test.ts` (A/T/O roots) | AC-002, AC-003, AC-004, AC-006, AC-007 | Real server, scripted AGY | gated scripted-AGY | 5 | |
| E2E-HYB-BASE | Same on base source | sensitivity | Real server, scripted AGY | temp base worktree | 6 | Expected Fail |
| LIVE-CLAUDE | `claude-delegated-background-task` | AC-001, AC-005 | Real Claude | `RUN_CLAUDE_E2E=1` | 7 | |
| LIVE-AGY | `agy-delegated-background-task` | AC-002, AC-004 | Real AGY + Claude | `RUN_AGY_BACKGROUND_E2E=1 RUN_CLAUDE_E2E=1` | 8 | |
| E2E-REG | Scripted suites: reactivation, closure, ad-hoc, change feed, context files | AC-007, BEH-008, fixture coexistence | Real server, scripted AGY | gated | 9 | |
| LIVE-MIXED | `mixed-task-delegation` LIVE-001..005 | AC-006, AC-007 | LM Studio + Codex + Claude | gated | 10 | |
| R-UNIT | Full `tests/unit` | regression | Vitest | `vitest run tests/unit` | 11 | |

## Execution Events

| Sequence | Case ID | Timestamp | Event | Command / Entry Point / Material Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | R-FOCUS | 2026-10-08 | Completed | investigation order 1 | Only base failures | 2732 passed, 56 failed, 40 skipped (322 files) | Pass (relative to base) | `evidence/api-e2e/r2-focused.log`, `.json` | compare with base |
| 2 | FIX-001 | 2026-10-08 | Completed | routing unit test | new route parsed by production reader; other modes unchanged | 16 passed | Pass | console | — |
| 3 | E2E-HYB | 2026-10-08 | Completed (attempt 1) | scripted AGY, grace `.env` 60000 | all 3 roots pass | Org passed every check; Agent/Team failed my "beyond one grace" check: copies delegated after the quiet copy had less than one grace elapsed when checked (test-ordering bug) | Fail (test defect) | `r2-e2e-idle-1.log` | fix: wait until every background copy is past its own grace |
| 4 | E2E-HYB | 2026-10-08 | Completed (attempt 2) | same, fixed wait | all 3 roots pass | Pass. Quiet shutdown 61.4/61.5/61.6 s; Agent copy step 102.7–102.8 s, shutdown 59.6–60.7 s after exit; Team copy 61.2–64.3 s after exit; DONE stop 2.4/2.6/10.4 s (incl. scripted Manager round-trip), task `stopped` within 15 s; root stop 0.2/3.4/2.1 s; wake relaunch `--conversation` | Pass | `r2-e2e-idle-2.log`, `e2e-idle/task-copy-idle-lifetime.json` | — |
| 5 | E2E-HYB-BASE | 2026-10-08 | Completed | same test + fixture on base `3a2496c95` source | Fail at the hybrid check | Fails in all 3 roots: "offline while its step runs" | Expected Fail (sensitivity proven) | `r2-e2e-idle-base.log` | — |
| 6 | R-FOCUS-BASE | 2026-10-08 | Completed | same set on base | — | 57 failed on base; HEAD set ⊂ base set; extra base failure = `mixed-team-run-backend` test fixed by `ba0437e00`; 0 new | Pass (no regression) | `r2-focused-base.log`, `.json` | base worktree removed |
| 7 | LIVE-CLAUDE | 2026-10-08 | Completed | `RUN_CLAUDE_E2E=1`, haiku, grace 60 s | survives grace, completes, reports, offline one grace after quiet | completed 89.1 s, report 91.2 s after idle, no offline before, marker `done`, offline 60.3 s after quiet | Pass | `r2-live-claude.log`, `live-claude/` | — |
| 8 | LIVE-AGY | 2026-10-08 | Completed (attempt 1) | externally killed `http.server` daemon | task ends after kill | No exit message from AGY 1.3.1 for an externally killed daemon (only a "canceled" message at root terminate in cleanup; not the reader format). Grace-skip phases passed | Fail (unsupported test scenario) | `r2-live-agy-1.log` | switch to a self-exiting daemon (proven pattern) |
| 9 | LIVE-AGY | 2026-10-08 | Completed (attempt 2) | `sleep 180; echo …` daemon | — | All hybrid checks passed (completed 178.2 s, offline 60.1 s after); my marker-path assertion failed: AGY's project directory is its capsule, not the workspace | Fail (test defect) | `r2-live-agy-2.log` | drop marker assertion |
| 10 | LIVE-AGY | 2026-10-08 | Completed (attempt 3) | final test | pass | same AGY pid through two grace periods + follow-up "ALIVE"; `completed` "exited with code 0" at 178.2 s; offline 60.1 s after | Pass | `r2-live-agy-3.log`, `live-agy/` | — |
| 11 | E2E-REG | 2026-10-08 | Completed | 5 scripted suites, extended fixture | unchanged pass | reactivation 4 passed + 1 skipped (optional Claude-worker case), closure 3, ad-hoc 3, change feed 7, context files 1 | Pass | `r2-<suite>.log`, `r2-scripted-summary.txt` | — |
| 12 | LIVE-MIXED | 2026-10-08 | Completed (attempt 1) | default Codex model list | — | Setup refused: test's Codex model list stale for codex-cli 0.161.0 (offers `gpt-5.6-*`, `gpt-6*`); 4 skipped | Blocked (env) | `r2-live-mixed.log` | rerun with documented `CODEX_E2E_TOOL_MODEL` |
| 13 | LIVE-MIXED | 2026-10-08 | Started | `CODEX_E2E_TOOL_MODEL=gpt-5.6-luna`, `LMSTUDIO_TARGET_TEXT_MODEL=qwen3.8-27b` | LIVE-001..005 pass | running | — | `r2-live-mixed-2.log` | — |
| 14 | LIVE-MIXED | 2026-10-08 | Completed | same | LIVE-001..005 pass | 4 passed in 851 s (LIVE-002 approvals held 90 s) | Pass | `r2-live-mixed-2.log` | — |
| 15 | E2E-HYB | 2026-10-08 | Completed (attempt 3) | Agent copy step now exits 3 (`failed`), Team copy 0 (`completed`) | all 3 roots pass | Pass; Agent copy `failed` at ~100.9 s, offline 60.1 s after; Team copy offline 62.7 s after `completed`; quiet 61.0–61.3 s; DONE task stopped 1.4–6.8 s; root stop 0.7–3.5 s; cleanup clean | Pass | `r2-e2e-idle-3.log`, `e2e-idle/task-copy-idle-lifetime.json` | — |
| 16 | R-UNIT | 2026-10-08 | Completed | `vitest run tests/unit` | only base failures | 4977 passed, 43 failed in 15 out-of-scope files (identical to the known base set) | Pass (no new failures) | `r2-unit-full.log`, `.json` | — |

## Re-entry And Reconciliation

- Last durably recorded event: 16
- Last completed case and result: R-UNIT Pass (no new failures)
- Cases still running, interrupted, or not started: None
- Next case or recovery action: handoff
- Interruption, context-compression, or rerun note: —
- Reconciled into execution coverage report: `Yes` — `api-e2e-execution-coverage-report.md`, "Test-Case Ledger Reconciliation"
- Reconciliation note for any case missing a terminal result: None
