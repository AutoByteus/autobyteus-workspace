# API/E2E Test-Case Ledger — mention-delegation-dismissal

## Ledger Meta

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/mention-delegation-dismissal`
- Coverage investigation: `api-e2e-coverage-investigation.md`
- Execution coverage report: `api-e2e-execution-coverage-report.md`
- API/E2E revision record: `api-e2e-revision-record.md`
- Ledger scope and reason it is required: multiple independent repository, server-E2E, browser-probe and live-runtime cases; long-running live-model probes.
- Last updated: 2026-10-06 (round 1 complete)

## Planned Cases

| Case ID | Case / Journey | REQ / AC IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| R-00 | Source typecheck | — | tsc | `tsc -p tsconfig.build.json --noEmit` | 1 | |
| R-01 | Focused server unit/integration | all | Vitest | TESTING.md Projects + collaboration suites | 2 | |
| R-02 | Contracts + web note specs | AC-002 | Vitest | contracts `test`; web `test:nuxt` specs | 3 | |
| R-03 | Fresh prebuild + build | — | dist | `prebuild`, `build` | 4 | |
| R-04 | `tests/e2e/projects` (incl. mutation pair, migration) | AC-014, REQ-012 ctx | in-process + dist nodes | `vitest run tests/e2e/projects` | 5 | gated file skips here |
| R-05 | Gated task-closure-root-visibility | AC-014, REQ-006 | real HTTP/WS/MCP, scripted AGY | gated vitest | 6 | |
| R-06 | New gated ad-hoc-task-delegation (agent/team/org) | AC-001..013, AC-015 | real HTTP/WS/MCP, scripted AGY | gated vitest | 7 | new durable file |
| B-01 | task-closure-tree browser probe | REQ-006, AC-014 | browser + built backend | `test:e2e:task-closure-tree --output-dir` | 8 | |
| B-02 | projects-feature browser probe | REQ-008, AC-014 | browser + built backend | `test:e2e:projects --output-dir=` | 9 | |
| L-CLAUDE | Rewritten live mentions probe, Claude runtime | AC-001..012 | browser + real backend + Claude CLI | `test:e2e:cross-scope-agent-mentions --runtime claude_agent_sdk` | 10 | |
| L-CODEX | Same, Codex runtime | AC-001..012 | browser + real backend + Codex | `--runtime codex_app_server` | 11 | |
| L-AUTOBYTEUS | Same, AutoByteus runtime | AC-009 | browser + real backend + model | `--runtime autobyteus` | 12 | needs a model |

## Execution Events

| Sequence | Case ID | Timestamp | Event | Command / Entry Point / Material Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | R-03 | 2026-10-06 12:12 | Completed | `prebuild` + `build` | exit 0 | exit 0; bootstrap smoke passed | Pass | `api-e2e-evidence/logs/R-03-prebuild-build.log` | — |
| 2 | R-00 | 2026-10-06 12:16 | Completed | `tsc -p tsconfig.build.json --noEmit` | exit 0 | exit 0 | Pass | `logs/R-00-typecheck.log` | — |
| 3 | R-01 | 2026-10-06 12:17 | Completed | focused server suites (171 files) | all pass, except known baseline | 169 files pass; 2 files / 5 tests fail (`team-run-history-catalog-service`, `published-artifact-projection-service`). They fail identically on base `3c8e49ad5` (re-run in a temp base worktree). Files and sources are untouched by the diff | Pass (baseline failures only) | `logs/R-01-server-focused.log` | — |
| 4 | R-02 | 2026-10-06 12:18 | Completed | contracts test; 19 web specs | pass | contracts pass; web 19 files / 127 tests pass | Pass | `logs/R-02-*.log` | — |
| 5 | R-06 | 2026-10-06 12:21 | Checkpoint | new gated E2E, first runs | — | Harness fixes only (standalone host projection query, Team member launch config, `.lock` filter, explicit Org restore before its stream, GraphQL message text). No product defect | — | `logs/R-06-ad-hoc-task-delegation.log` | rerun |
| 6 | R-06 | 2026-10-06 12:24 | Completed | `RUN_AGY_FAILURE_E2E=1 … ad-hoc-task-delegation.e2e.test.ts` | 3/3 | 3/3 pass; cleanup receipts clean | Pass | `R-06/ad-hoc-task-delegation.json` | — |
| 7 | R-04 | 2026-10-06 12:27 | Completed | `vitest run tests/e2e/projects` | non-gated pass | 4 files / 21 tests pass (incl. the mutation pair on the fresh dist, and the startup migration); the 2 gated files skip | Pass | `logs/R-04-projects-e2e.log` | — |
| 8 | R-05 | 2026-10-06 12:28 | Completed | gated `task-closure-root-visibility` + `ad-hoc-task-delegation` together | 6/6 | 6/6 pass; both cleanup receipts clean | Pass | `logs/R-05-R-06-gated.log`, `R-05/`, `R-06/` | — |
| 9 | B-01 | 2026-10-06 12:33 | Completed | `test:e2e:task-closure-tree --output-dir` | BR-001..007 | 7/7 Pass; browser closed, processes terminated, data root removed | Pass | `B-01-task-closure-tree/evidence.json` | — |
| 10 | B-02 | 2026-10-06 12:38 | Completed | `test:e2e:projects --skip-server-build` (fresh dist) | PT-E2E-001..016 | 16/16 Pass; cleanup clean | Pass | `B-02-projects-feature/result.json` | — |
| 11 | L-CLAUDE | 2026-10-06 12:30 | Checkpoint | shakedown-1/2 (A01–A04) | — | Claude delegated correctly. After the Code Reviewer's report, it marked the ad-hoc Task DONE on its own (allowed by the note; SCN-002 "agent decides"), so the probe's "row stays open" expectation was wrong. The probe now accepts and asserts agent-initiated DONE for reporting copies, and uses a non-reporting Note Taker for the user-driven DONE | — | `L-CLAUDE-shakedown-1/2/` | probe adjusted |
| 12 | L-CLAUDE | 2026-10-06 12:58 | Checkpoint | shakedown-3 A01–A06 | — | 6/6 Pass (incl. real backend restart) | — | `L-CLAUDE-shakedown-3/` | full run started |
| 14 | R-07 | 2026-10-06 13:20 | Completed | `vitest run tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.test.ts` (2 added cases) | the AutoByteus runtime materializes a real `create_or_update_task` for a delegating host and a Team member with no tools selected | 4/4 pass | Pass | console | — |
| 15 | L-CLAUDE | 2026-10-06 13:42 | Completed | full run 2, `--runtime claude_agent_sdk` (model `haiku`) | all cases Pass; L01/L02 N/A | 18 Pass, 2 N/A (L01/L02 need AGY). F01 failed on a harness false positive: `messageSent` read the page text, which includes the composer mention mirror. The refusal itself held: notice shown, draft and highlight kept, 0 collaborators/copies/Tasks. Agent-initiated DONE observed in A01 (reviewer) and T01 (Team copy). Cleanup clean | Pass (after F01 rerun) | `L-CLAUDE-run2/`, `L-CLAUDE-run2-ledger.md` | F01 rerun |
| 16 | L-CLAUDE | 2026-10-06 13:47 | Completed | `--cases F01` with the server-side stored-conversation check | F01 Pass | Pass: notice, draft kept, nothing stored, no row/Task; cleanup clean | Pass | `L-CLAUDE-F01-rerun/` | — |
| 17 | L-CODEX | 2026-10-06 13:48 | Started | full run, `--runtime codex_app_server` | — | — | — | `L-CODEX/` | — |
| 18 | L-CODEX | 2026-10-06 14:26 | Completed | full run, `--runtime codex_app_server` (model `gpt-5.6-luna`) | all cases Pass; L01/L02 N/A | 19 Pass, 0 Fail, 2 N/A. The agent closed reporting copies on its own in A01, T01 and O01 (supported). Cleanup clean; no browser errors; probe exited | Pass | `L-CODEX/`, `L-CODEX-ledger.md` | — |
| 19 | R-06 | 2026-10-06 14:30 | Completed | added AC-003 alternate (rejected delegation) step; final gated run of R-05 + R-06 + R-07 | 10/10 | 10/10 pass; rejected delegation → `target_agent_run_id: null`, no `task_id`, no Task; receipts clean | Pass | `logs/R-final-gated.log` | — |
| 20 | L-AUTOBYTEUS | 2026-10-06 14:30 | Completed | — | — | Not run. No model: LM Studio is down, and provider keys exist only in the user's data (TESTING.md rule 2). AC-009 AutoByteus is covered by the exposure unit test and R-07 | Not Tested | — | residual |
| 13 | L-CLAUDE | 2026-10-06 12:37 | Checkpoint | full run 1 (`L-CLAUDE/`) | — | A01 failed in harness `pickModel`: the model list was read empty during a cold Nuxt start, giving `chat-model-option-undefined`. A02 cascaded. Run deliberately stopped. Probe, backend, Nuxt and Chrome groups were terminated, the temp root is gone, and no orphaned CLI remains. `pickModel` now waits for a non-empty list | Not Tested (aborted) | `L-CLAUDE/`, `L-CLAUDE-ledger.md` | full run 2 |

## Re-entry And Reconciliation

- Last durably recorded event: seq 20 (L-AUTOBYTEUS Not Tested)
- Last completed case and result: R-06 final gated run, Pass
- Cases still running, interrupted, or not started: none. The aborted L-CLAUDE run 1 (seq 13) was superseded by run 2 (seq 15/16).
- Next case or recovery action: none
- Reconciled into execution coverage report: `Yes` — `api-e2e-execution-coverage-report.md` § Test-Case Ledger Reconciliation
