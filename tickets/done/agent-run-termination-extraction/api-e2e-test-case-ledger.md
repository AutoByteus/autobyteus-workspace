# API/E2E Test-Case Ledger — agent-run-termination-extraction

## Ledger Meta

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-termination-extraction` (branch `codex/agent-run-termination-extraction`, head `a5a244d66`, code `1b83c8f88`, base `03d5db06b`)
- Coverage investigation / execution report / revision record: same folder, `api-e2e-*.md`
- Evidence: `api-e2e-evidence/`
- Reason: long paid live runs and a desktop journey

## Planned Cases

| Case ID | Case | AC | Surface | Command / Entry |
| --- | --- | --- | --- | --- |
| T-01 | LE-O1 Codex ×10 consecutive | AC-004 | Live server + Codex | `-t "codex_app_server: LE-O1"` loop |
| T-02 | Mention suite Claude + Codex | AC-004 | Live | `RUN_CLAUDE_E2E=1 RUN_CODEX_E2E=1` |
| T-03 | Agent-initiated suite Claude | AC-004 | Live | `RUN_CLAUDE_E2E=1` |
| T-04 | Agent-initiated suite Codex (root cases) | AC-004 | Live | `RUN_CODEX_E2E=1 AIC_ROOT_RUNTIMES=codex_app_server` |
| T-05 | AC-009 scoped baseline command, branch vs base | AC-009 | Vitest | baseline command |
| T-06 | Full server branch vs base | AC-009 | Vitest | `tests/unit tests/integration tests/architecture` |
| T-07 | F-4 warning census | REQ-003 | Logs | grep |
| T-08 | Busy quit of the real desktop app (agent, Team, Org mid-turn) → relaunch → continue; plus Stop of a busy run in the UI | SCN-001/002 | Isolated desktop app | Playwright over CDP |

## Execution Events

| Seq | Case | Event | Command / Config | Expected | Observed | Result | Evidence | Next |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | static | Completed | `wc`/grep | AC-002; import scope | `agent-run.ts` 383 effective (415 total); `agent-run-termination.ts` 196; only `agent-run.ts` imports `./agent-run-termination.js` | Pass | — | — |
| 2 | T-01 | Completed | `RUN_CODEX_E2E=1 AIC_ROOT_RUNTIMES=codex_app_server … -t "codex_app_server: LE-O1"` ×10 | 10 consecutive | **10/10 pass**, F-4 warnings 0 | Pass | `t01-le-o1-codex-{1..10}.log` | — |
| 3 | T-08a | Completed | Isolated app from the worktree (`iso-58242-9afe`); imported `sar-test-agents` (UI); SAR Host + `@SAR Helper`, SAR Squad, SAR Org (auto-approve switched on) on Codex gpt-6-astra; code words KILO-ONE/LIMA-TWO/MIKE-THREE | Setup | All worked | Pass | `t08/shots/t08-01…t08-11*` | — |
| 4 | T-08b | Completed | Host, chief, lead and helper all mid-turn (`sleep 240/600`), then `isolated-app stop --keep` (process-group SIGTERM) | Quit | Server "Received SIGTERM … Server closed cleanly" exit 0 in 0.24 s. The group signal also killed the codex app-server at once (Codex "write_stdin failed"); Electron main needed force (`forced:true`, 10 s) | Observed | `t08/isolated-stop-busy.json`, `t08/isolated-app-busy-quit.log` | Not the real Cmd+Q path |
| 5 | T-08c | Completed | Relaunch on the same data root (`iso-60088-d5c3`); continue each run | Continue | Host recalled KILO-ONE; helper replied; lead recalled LIMA-TWO; chief recalled MIKE-THREE. The interrupted turn shows the tool card + "Thinking" in history (cosmetic) | Pass | `t08/shots/t08-20…t08-26*` | — |
| 6 | T-08d | Completed | Four agents busy again, then **SIGTERM to the Electron main process only** (real quit path: before-quit → will-quit → server SIGTERM) | App quits cleanly | **Main exited after 29 s; the embedded server (pid 96211) was orphaned under PID 1 and stayed alive with its codex app-server and 4 `sleep 600`**; it exited only at 05:51:45 when the last sleep finished (≈10 min) | **Pre-existing defect (see #7–#8)** | `t08/isolated-app.log` excerpt in report | Base comparison |
| 7 | T-09 | Completed | Probe `zz-tmp-busy-shutdown-probe` on **base**: Codex run busy in `sleep 300`, then `fastify.close()` (the SIGTERM path) | Close completes | Busy: `TIMEOUT-150s`, sleep left running. Idle control: closed in 0.3 s | Base reproduces | `t09-base-busy.log`, `t09-base-idle.log` | — |
| 8 | T-08e | Completed | **Base** isolated app (`iso-62735-96cd`): one busy Codex run (`sleep 420`), SIGTERM main | Same as branch? | Main exited after 33 s; embedded server orphaned with the sleep running; it exited once the sleep was killed | **Base identical; not a regression** | console output | Report as separate pre-existing issue |
| 9 | T-09 | Completed | Same probe on the **branch** (temporary file, removed after) | Parity | Busy: `TIMEOUT-150s`, sleep left; idle: closed in 0.4 s. Identical to base | Not a regression | `t09-branch-busy.log`, `t09-branch-idle.log` | — |
| 10 | T-02 | Completed | `RUN_CLAUDE_E2E=1 RUN_CODEX_E2E=1` mention suite (branch, in chain) | 4/4 or base-identical failures | Codex first test × ("pre-mention delegate_task result" timeout), Claude DI-001 × ("lead → mate → lead → host" timeout); others ✓ | See #13 | `t02-mention-claude-codex.log` | Paired comparison |
| 11 | T-03 | Completed | Agent-initiated suite on Claude | 6/6 | LE-A1/A2/A3/T1/O1/F1 ✓, warnings 0 | Pass | `t03-aic-claude.log` | — |
| 12 | T-04 | Completed | Agent-initiated suite on Codex (root cases) | 5/5 | LE-A1/A2/A3/T1/O1 ✓ (LE-O1 now 11/11), warnings 0 | Pass | `t04-aic-codex.log` | — |
| 13 | T-02 | Completed | Paired mention suite ×3 base and ×3 branch, in parallel | Branch no worse than base | Base: Codex first × in 2/3, Claude DI-001 × in 2/3. Branch: Codex first × in 2/3, Claude DI-001 × in 1/3. Same tests and signatures; every other test ✓; warnings 0 | Pass (AC-004 "failure not also on base": none) | `t02-{base,branch}-mention-{1,2,3}.log` | — |
| 14 | T-05/T-06 | Completed | Full server branch vs base (parallel-free; base earlier) + baseline-file check | 0 new | Branch 4935/147 failed, base 4934/170; **0 new**; 7 noise diffs; all 27 `baseline-server-failures.txt` entries fail identically; 0 scoped failures outside the baseline | Pass (AC-009) | `t06-server-{branch,base}.json`, `t06-server-compare.txt` | — |
| 15 | T-07 | Completed | F-4 census over all live logs | Record warnings | 0 `[AgentRun] root shutdown interrupt` warnings | N/A | all `t0*.log` | — |
| 16 | cleanup | Completed | Instances stopped, records removed, data roots deleted, temp probes removed from both worktrees, orphan processes ended | Clean | `git status` clean (apart from pre-existing SDK `dist/`); no leftover sleep/codex/app processes of mine; others' instances untouched | Pass | — | — |

## Re-entry And Reconciliation

- Last event: #16. All cases T-01 to T-09 have terminal results. Reconciled into the execution report: `Yes`.
