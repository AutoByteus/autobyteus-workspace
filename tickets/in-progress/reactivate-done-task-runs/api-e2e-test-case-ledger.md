# API/E2E Test-Case Ledger — `reactivate-done-task-runs`

## Ledger Meta

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs`
- Coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/api-e2e-coverage-investigation.md`
- Execution coverage report: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/api-e2e-execution-coverage-report.md`
- API/E2E revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/api-e2e-revision-record.md`
- Scope: API-REV-001. The run is multi-case and includes long browser/restart and live-model cases.
- Last updated: 2026-10-07

## Planned Cases

| Case ID | Case / Journey | Requirement / AC IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| REPO-UNIT | Focused server unit suites | All (logic) | Vitest unit | see investigation order 2 | 1 | |
| REPO-INT | Integration lifecycle | AC-012/014 | Vitest integration | order 3 | 2 | |
| REPO-CONTRACT | Stream contracts | REQ-008 | node:test | order 4 | 3 | |
| REPO-WEB | Web closure specs | REQ-008 | Vitest Nuxt | order 5 | 4 | |
| REPO-E2E-BASE | Existing `tests/e2e/projects` | AC-014 | Real HTTP/WS/MCP | order 6 | 5 | |
| E2E-RA-AGENT | Reactivation journey, standalone Agent root | AC-001..003, 005, 006, 008, 010, 012, 014, 015; QR-002 | Real HTTP/WS/MCP, scripted AGY | new e2e file | 6 | |
| E2E-RA-TEAM | Same, Agent Team root (+ AC-007) | + AC-002, 007 | same | same | 7 | |
| E2E-RA-ORG | Same, Agent Org root (+ AC-007) | same | same | same | 8 | |
| E2E-RA-RACE | Cross-root DONE racing reactivation | QR-001 | same | same | 9 | |
| E2E-RA-LIVE-CLAUDE | Real-model recall after reactivation | AC-001 | Real Claude runtime worker | same file, `RUN_CLAUDE_E2E=1` | 10 | |
| BR-008 | Browser: Agent root reactivation live | AC-004, 005 | Built backend + Nuxt + Chrome | probe `--cases` | 11 | |
| BR-009 | Browser: Team root reactivation live | AC-004, 002 | same | same | 12 | |
| BR-010 | Browser: Org root reactivation live | AC-004, 002 | same | same | 13 | |
| BR-011 | Restart: reactivated rows persist; DONE → restart → reopen → message | AC-004, 010, 011 | same + real backend restart | same | 14 | |
| BR-ALL | Full probe BR-001..BR-011 regression | AC-014 + above | same | probe, all cases | 15 | |
| LIVE-MIXED | `mixed-task-delegation.e2e.test.ts` | AC-012 pins | LM Studio + Codex + Claude | `RUN_LMSTUDIO_E2E=1 RUN_CODEX_E2E=1 RUN_CLAUDE_E2E=1` | 16 | |

## Execution Events

| Sequence | Case ID | Timestamp | Event | Command / Entry Point / Material Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | REPO-UNIT | 2026-10-07 | Completed | order 2 | All pass | 145 files / 1087 tests pass | Pass | `api-e2e-evidence/unit-focused.log` | — |
| 2 | REPO-INT | 2026-10-07 | Completed | order 3 | All pass | 2 files / 16 tests pass | Pass | `api-e2e-evidence/integration.log` | — |
| 3 | REPO-CONTRACT | 2026-10-07 | Completed | order 4 | New tests pass; no new failures | Team 8/8. Collab 14/7; base 13/7 has the same 7 failures | Pass (pre-existing failures recorded) | `api-e2e-evidence/*contracts.log` | — |
| 4 | REPO-WEB | 2026-10-07 | Completed | order 5 | All pass | 131/131; changed specs 21/21 | Pass | `api-e2e-evidence/web*.log` | — |
| 5 | REPO-E2E-BASE | 2026-10-07 | Completed | order 6 | All pass | 6 files / 27 tests | Pass | `api-e2e-evidence/e2e-projects-baseline.log` | — |
| 6 | E2E-RA-AGENT | 2026-10-07 | Checkpoint | new e2e, `-t "standalone Agent root"` | — | 1st attempt failed on my own regex: the helper refusal returns the documented assigner-only text (projects.md table row "Not the assigner; a helper"). Test assertion corrected (test defect, not product) | — | — | rerun |
| 7 | E2E-RA-AGENT/TEAM/ORG, RACE | 2026-10-07 | Checkpoint | full file | — | 2nd attempt: conversation-binding check looked for the run ID in the file path. The binding lives on the worker's node of the root run-tree file, so the check now reads that node (test defect). Race: `TASK_EXECUTION_RESTORE_FAILED` "…was reactivated (its Task work is open again) but did not receive…". Diagnosed: the reactivation committed, then the other root's DONE cancelled the restore. Final state DONE / entry closed; no live worker process (lsof cwd); later input refused. This is the design's accepted P-001 outcome, so the assertions now allow the three designed orderings and keep the invariants | — | — | rerun |
| 8 | E2E-RA-AGENT / TEAM / ORG / RACE | 2026-10-07 | Completed | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<fake> TASK_REACTIVATION_E2E_EVIDENCE_DIR=… vitest run tests/e2e/projects/task-reactivation-root-visibility.e2e.test.ts` | All pass | 4 passed, 1 skipped (live). Race outcome in 3/3 rounds: done-during-restore | Pass | `api-e2e-evidence/server-e2e-scripted.{json,log}` | — |
| 9 | E2E-RA-LIVE-CLAUDE | 2026-10-07 | Completed | same + `RUN_CLAUDE_E2E=1 -t "real model"` | Real Claude worker recalls a pre-DONE codeword | READY, then after DONE → IN_PROGRESS → message: "was reactivated."; codeword recalled | Pass | `api-e2e-evidence/server-e2e-live-claude.{json,log}` | — |
| 10 | BR-008..BR-011 | 2026-10-07 | Checkpoint | probe `--cases BR-008,BR-009,BR-010,BR-011` | — | BR-008..010 Pass. BR-011 timed out on the Manager's DONE after the restart: the probe sent to a stopped root without the app's restore mutation (probe defect). Added `restoreRoot` (`restoreAgentRun` / `restoreAgentTeamRun` / `restoreAgentOrgRun`, as the web stores do) | — | — | rerun |
| 11 | BR-008, BR-009, BR-010, BR-011 | 2026-10-07 | Completed | probe `--output-dir …/api-e2e-evidence/browser-reactivation --cases BR-008,BR-009,BR-010,BR-011` | Rows return live, after reload, after restart; restart-path reactivation | All 4 Pass. Cleanup: browser closed, frontend/backend terminated, data root removed | Pass | `api-e2e-evidence/browser-reactivation/evidence.json` + screenshots | — |
| 12 | USER-JOURNEY | 2026-10-07 | Started | Isolated desktop instance of a worktree build + test agent package (real-model agents), driven through the UI (user request 2026-10-07) | Real Manager reopens the Task itself and reactivates the same worker; rows/conversation in the app; app restart | — | — | — | — |
| 13 | USER-JOURNEY | 2026-10-07 | Checkpoint | `build:electron:mac` exit 0; `isolated-app start --from-worktree` → `iso-52015-541c`; package imported via Settings | — | The writer row seemed missing before DONE; the stored tree showed the real Manager had already set the writer's Task DONE on "Good." (agent decision, correct product behavior) | — | `user-journey/manager-conversation.txt` | continue |
| 14 | USER-JOURNEY | 2026-10-07 | Completed | Claude Agent SDK `claude-opus-5-5`; 9 steps incl. 2 app restarts | See receipt | The real Manager reopened (IN_PROGRESS), then `send_message_to` the run ID for the writer (×2, once after restart) and the Team coordinator. Rows reappeared live; same runs/members; workers recalled earlier context; reactivated row persisted after restart; closed Team stayed hidden. Cleanup: stopped, data root removed, ports released | Pass | `api-e2e-evidence/user-journey/journey-receipt.md`, `shots/`, `final-state/` | — |
| 15 | LIVE-MIXED | 2026-10-07 | Started | `RUN_LMSTUDIO_E2E=1 RUN_CODEX_E2E=1 RUN_CLAUDE_E2E=1 vitest run tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` (LM Studio fallback qwen model; test DB from `.env.test`) | `target_kind` pins and live lifecycle pass | — | — | `/tmp/rdtr-api/live-mixed.log` | — |
| 16 | LIVE-MIXED | 2026-10-07 | Checkpoint | same | — | Suite setup failed: "No codex model available" (its hard-coded Codex model names are not in the installed list). Environment, unrelated to the change; documented override `CODEX_E2E_TOOL_MODEL` | — | — | rerun |
| 17 | LIVE-MIXED | 2026-10-07 | Completed | same + `CODEX_E2E_TOOL_MODEL=gpt-5.6-luna` | 4/4 | LIVE-001/004, 002, 003, 005 pass (1054 s); spawn results `{target_agent_run_id, target_kind}` with `agent`/`team` | Pass | `api-e2e-evidence/live-mixed-task-delegation.log` | — |
| 18 | E2E-RA-* + LIVE-CLAUDE | 2026-10-07 | Completed | final full file run with `RUN_CLAUDE_E2E=1` | 5/5 | 5 passed. Race outcomes: reactivated-then-done, done-during-restore ×2. Live worker answered the codeword | Pass | `api-e2e-evidence/server-e2e/` | — |
| 19 | BR-ALL | 2026-10-07 | Completed | probe all cases | 11/11 | BR-001..BR-011 Pass; cleanup complete | Pass | `api-e2e-evidence/browser-full/evidence.json` | — |
| 20 | REPO-E2E-FINAL | 2026-10-07 | Checkpoint | gated `vitest run tests/e2e/projects` | — | 1 fail: E2E-RA-RACE met a 4th ordering. The reactivation committed, then DONE closed the entry before delivery and the live-input fence refused it (`TASK_AGENT_RESOURCE_CLOSED` + "was reactivated … but did not receive"). My classifier treated every CLOSED as "DONE first": a test defect. Now classified by message; invariants unchanged | — | `api-e2e-evidence/e2e-projects-final-attempt1-test-defect.log` | fix + rerun |
| 21 | E2E-RA-RACE | 2026-10-07 | Completed | `-t QR-001` ×3 | Pass | 3/3 runs pass (all rounds done-after-commit) | Pass | `/tmp/rdtr-api/race-{1,2,3}.log` | — |
| 22 | REPO-E2E-FINAL | 2026-10-07 | Completed | gated `vitest run tests/e2e/projects` | All pass | 7 files: 31 passed, 1 skipped (live, gated) | Pass | `api-e2e-evidence/e2e-projects-final.log` | — |

## Re-entry And Reconciliation

- Last durably recorded event: 22
- Last completed case and result: REPO-E2E-FINAL, Pass
- Cases still running, interrupted or not started: none
- Next action: report and handoff
- Interruption note: the user interrupted twice. They asked for real-user testing, which was added as USER-JOURNEY, and asked for a status. No case was left unresolved.
- Reconciled into execution coverage report: Yes, `api-e2e-execution-coverage-report.md` › Test-Case Ledger Reconciliation
