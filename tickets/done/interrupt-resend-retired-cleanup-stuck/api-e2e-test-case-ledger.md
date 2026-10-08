# API/E2E Test-Case Ledger

## Ledger Meta

- Assigned task workspace / worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/interrupt-resend-retired-cleanup-stuck`
- Coverage investigation: `tickets/in-progress/interrupt-resend-retired-cleanup-stuck/api-e2e-coverage-investigation.md`
- Execution coverage report: `tickets/in-progress/interrupt-resend-retired-cleanup-stuck/api-e2e-execution-coverage-report.md`
- API/E2E revision record: `tickets/in-progress/interrupt-resend-retired-cleanup-stuck/api-e2e-revision-record.md`
- Ledger scope and reason it is required: several long-running live-CLI cases (AGY, Codex) plus repeated fake-AGY runs; interruption risk.
- Last updated: 2026-10-08

## Planned Cases

| Case ID | Case / Journey | Requirement / Acceptance-Criteria IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| R-01 | Focused unit suites | C-1..C-5, AC-003..AC-006, AC-008, QR-001 | Unit (real manager/registry) | vitest 4 files | 1 | |
| R-02 | Fake-AGY E2E as shipped | AC-001, AC-002, AC-005 | WS + fake CLI | vitest e2e | 2 | |
| R-03 | Stale-assertion grep | Removal plan | Repo | rg | 3 | |
| E2E-TEAM-INT | Fake-AGY Team member interrupt + immediate work | AC-006 | Team WS + fake CLI | vitest e2e | 4 | new |
| R-04 | Fake-AGY E2E + sibling AGY fake suites ×3 | AC-001/002/005/006, fixture coexistence | WS + fake CLI | vitest e2e | 5 | |
| R-05 | Broader affected suites | Regression | Unit/integration | vitest dirs | 6 | |
| R-06 | Source typecheck | — | tsc | `tsc -p tsconfig.build.json --noEmit` | 7 | |
| L-01 LIVE-STANDALONE-INT | Real AGY standalone: Stop → immediate double send; Stop → later send; recall; one `agy` | AC-001, AC-002, AC-005, ASM-001 | WS + real `agy` | `RUN_AGY_RECOVERY_E2E=1 … -t LIVE-STANDALONE-INT` | 8 | new |
| L-02 LIVE-TEAM-INT | Real AGY Team member: Stop → immediate work; recall | AC-006 live | Team WS + real `agy` | `-t LIVE-TEAM-INT` | 9 | new |
| L-03 LIVE-ORG-R7 | Real AGY Org root agent + Team member Stop → later message | AC-006 live (existing) | Org WS + real `agy` | `-t LIVE-ORG-R7` | 10 | existing |
| L-05 | Full live AGY recovery file (regression of existing crash/stop/shutdown cases) | REQ-006 regression | real `agy` | `RUN_AGY_RECOVERY_E2E=1` whole file | 12 | added during execution |
| D-01 | Isolated desktop (worktree build): AGY agent, long command, Stop, immediate Send; reply rendered, no error card, status not Error | AC-001 desktop intent, SCN-001 | Packaged Electron + embedded server + real `agy` | `pnpm --silent isolated-app start --build` + browser-automation | 13 | added to close user-surface gap |
| L-04 LIVE-CODEX-EXIT | Real Codex standalone: app-server killed → next send restores thread; recall | AC-003 live | WS + real `codex app-server` | `RUN_CODEX_E2E=1 … codex-runtime-exit-resend.e2e.test.ts` | 11 | new |

## Execution Events

| Sequence | Case ID | Timestamp | Event | Command / Entry Point / Material Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | R-01 | 2026-10-08 17:19 | Completed | 4 unit files | All pass | 88 passed | Pass | `evidence/api-e2e/R-01-focused-units.log` | — |
| 2 | R-02 | 2026-10-08 17:19 | Completed | fake-AGY E2E | 2/2 | 2 passed | Pass | `evidence/api-e2e/R-02-fake-agy-e2e-initial.log` | — |
| 3 | R-03 | 2026-10-08 17:22 | Completed | `grep "retired cleanup"` over server src/tests and web | Only negative assertions remain | Single hit: the new E2E's `not.toContain` | Pass | ledger | — |
| 4 | E2E-TEAM-INT | 2026-10-08 17:26 | Completed | fake-AGY E2E file (3 cases) | Member restarts after old process exit; same conversation; no rejected ack | 3/3 passed | Pass | `evidence/api-e2e/E2E-TEAM-INT-first.log` | — |
| 5 | R-04 | 2026-10-08 17:27–17:33 | Completed | fake-AGY interrupt-resend + failure + background-task + native-arguments E2E + CLI routing unit, ×3 | All pass each time | 49 passed, 1 skipped ×3 | Pass | `evidence/api-e2e/R-04-fake-agy-repeat-{1,2,3}.log` | — |
| 6 | L-01 LIVE-STANDALONE-INT | 2026-10-08 17:29 | Completed | `RUN_AGY_RECOVERY_E2E=1 … -t LIVE-STANDALONE-INT` (real agy 1.3.1, gemini-3.8-flash-high) | Immediate double send and later send accepted; recall of code; one agy with same `--conversation`; final idle | Old process alive at send (in stopping window); recall `CODE-S-2e15ac19`, `SECOND-OK`, `LATER-OK`; one agy, same conversation across both restarts; last status idle; no rejected acks | Pass | `evidence/api-e2e/L-01-live-standalone-int.log`, `evidence/api-e2e/live-agy/live-standalone-int.json` | Status shows transient `offline`→`initializing` twice per restart (cosmetic, design risk) |
| 7 | L-02 LIVE-TEAM-INT + L-03 LIVE-ORG-R7 | 2026-10-08 17:31 | Completed | `-t "LIVE-TEAM-INT|LIVE-ORG-R7"` | Member restarts at once with recall; Org root/member Stop then message resumes | Both passed; Team member old process alive at send; recall `CODE-TI-3915abb9`; one agy with `--conversation` | Pass | `evidence/api-e2e/L-02-L-03-live-team-org.log`, `evidence/api-e2e/live-agy/live-team-int.json`, `live-org-r7.json` | — |
| 8 | L-04 LIVE-CODEX-EXIT | 2026-10-08 17:37 | Completed | `RUN_CODEX_E2E=1 … codex-runtime-exit-resend.e2e.test.ts` (codex-cli 0.161.0, gpt-5.6-luna) | After app-server SIGKILL, next send accepted, restored, recalls code | ERROR + status error after crash; next send accepted; new app-server pid; recall `CODE-C-5800f1e0`; final idle | Pass | `evidence/api-e2e/L-04-live-codex-exit.log`, `evidence/api-e2e/live-codex/live-codex-exit.json` | — |
| 9 | L-04 (base source control) | 2026-10-08 17:39 | Completed | Same test with the 5 production files checked out at `ace86bf1f`, then restored to HEAD | Test must fail on base | Fails: ack `failed`/`ACTIVATION_FAILED` "Agent run '…' still owns retired cleanup." | Pass (discriminates) | `evidence/api-e2e/L-04-live-codex-exit-BASE-SOURCE.log`, `evidence/api-e2e/live-codex-base/live-codex-exit.json` | Source restored; `git diff HEAD -- src` empty |
| 10 | R-05 | 2026-10-08 17:41 | Completed | unit agent-execution, agent-collaboration, standalone-agent-run-root, agent-team-execution, agent-org-execution; integration standalone-agent-run-root, agent-team-execution, memory-layout | No new failures | 1972 passed, 23 failed — all 23 are in the base list `evidence/implementation-preexisting-server-test-failures.txt` | Pass (no regression) | `evidence/api-e2e/R-05-broader-suites.log` | Baseline item reported separately |
| 11 | R-06 | 2026-10-08 17:42 | Completed | `npx tsc -p tsconfig.build.json --noEmit` | exit 0 | exit 0 | Pass | `evidence/api-e2e/R-06-tsc.log` | — |
| 12 | L-05 full live AGY recovery file | 2026-10-08 17:32–17:37 | Completed | `RUN_AGY_RECOVERY_E2E=1` whole file (7 cases) | All pass | 6 passed, 1 failed: LIVE-ORG-R7 read the Stop ack before it arrived (`stopAck: null`; `turnEnd: TURN_INTERRUPTED`; `agyGone: true`). This is a test race: AGY acks Stop after its process stops. | Fail (test race) | `evidence/api-e2e/L-05-live-agy-recovery-full-file.log`, `evidence/api-e2e/live-agy-full/live-org-r7.json` | Local test fix in `stopMidTurn` (wait for the ack) |
| 13 | L-05 rerun after the test fix | 2026-10-08 17:44–17:49 | Completed | same, whole file | 7/7 | 7 passed; both R7 Stop acks `accepted`; no leftover agy | Pass | `evidence/api-e2e/L-05-live-agy-recovery-full-file-rerun.log`, `evidence/api-e2e/live-agy-full-rerun/` | — |
| 14 | D-01 | 2026-10-08 17:50–18:12 | Completed | `pnpm --silent isolated-app start --build` (worktree build 1.4.99-beta.1, bundle contains the fix); instance `iso-50614-5374`; browser-automation attach-only on control port 50614; Antigravity CLI, Gemini 3.8 Flash (High) | The message sent right after Stop is answered in the same conversation; no error card; status not Error | Send clicked 93 ms after Stop, while the old agy pid 28751 was still alive (last sample 122 ms before send; gone at the next sample, 226 ms after send). The replacement pid 55563 launched with `--conversation 8b721126…` only after 28751 exited. The reply `CODE-D-7f3a91` was rendered. Status trail Offline → Running → Idle; no error text. | Pass | `evidence/api-e2e/d01-after-stop-and-send.png`, `d01-stop-then-send.mp4`, `d01-agy-process-timeline.txt`, `d01-agy-before-stop.txt`, `D-01-isolated-start.json`, `D-01-isolated-stop.json` | Stop was `forced: true` (graceful close exceeded its wait; observation only); data root removed, ports released |

## Re-entry And Reconciliation

- Last durably recorded event: 14 (D-01)
- Last completed case and result: D-01 Pass
- Cases still running, interrupted, or not started: none
- Next case or recovery action: none
- Interruption, context-compression, or rerun note: L-05 rerun after the test-only fix; first attempt retained.
- Reconciled into execution coverage report: `Yes` — `api-e2e-execution-coverage-report.md`, Test-Case Ledger Reconciliation
