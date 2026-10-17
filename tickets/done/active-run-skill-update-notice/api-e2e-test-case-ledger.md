# API/E2E Test-Case Ledger — `active-run-skill-update-notice`

## Ledger Meta

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/active-run-skill-update-notice`
- Coverage investigation: `api-e2e-coverage-investigation.md`; execution report: `api-e2e-execution-coverage-report.md`; revision record: `api-e2e-revision-record.md`
- Scope: API-REV-001 (round 1), API-REV-002 (round 2, APE-001 rerun) and API-REV-003 (round 3, DR-001 re-entry).
- Last updated: 2026-10-13

## Planned Cases

| Case ID | Case | Requirement / AC | Surface | Order |
| --- | --- | --- | --- | --- |
| REPO-001 | autobyteus-ts build + unit | N-1 | Vitest | 1 |
| REPO-002 | server typecheck | — | tsc | 2 |
| REPO-003 | server unit | — | Vitest | 3 |
| REPO-004 | server integration | AC-002/004–009 | Vitest | 4 |
| REPO-005 | web test:nuxt | REQ-007 | Vitest | 5 |
| SUN-E2E-001 | roots targeting (Team user/plain, Org member, delegated copy) | AC-007 | real server + scripted AGY | 6 |
| SUN-E2E-002 | delegated copy idle shutdown → not woken → restored by message, one notice | AC-003 | same | 7 |
| SUN-E2E-003 | GitHub skill-source Update → new generation → updated + new path; new folder watched | AC-005b | same + controlled GitHub HTTP | 8 |
| LIVE-001 | live Codex/Claude (append), AutoByteus/Grok (next turn): busy, re-read, idle combined, history | AC-001/002, REQ-011 | real models | 9 |
| REG-001 | AGY families + delegation + copy idle lifetime | regression | scripted AGY | 10 |
| DESK-001 | AC-010 PR-merge journey (Project Task Manager busy on Codex, Agent Package Creator copy idle) incl. QR-001 timing | AC-010, QR-001 | isolated desktop, human-like | 11 |
| DESK-002 | app closed → skill edited → app reopened → stopped run continued | AC-003 | isolated desktop | 12 |
| MEAS-001 | R-5 `ALL_INSTALLED` on the user's real skill sources | QR-002, R-5 | desktop measurement | 13 |
| RR-001…007 | round 2 reruns (see investigation § Round 2 Delta) | QR-002, REQ-012, AC-001/003/005b/007 | probe, Docker Linux, Vitest, gated E2E, live | 14 |
| MEAS-002 | R-5 measurement after the fix, with notice and re-watch | QR-002, R-5, AC-002 | isolated desktop | 15 |
| R3-001…006 | round 3 (see investigation § Round 3 Delta) | AC-003, DR-001, QR-003 | Vitest, gated E2E, live, isolated desktop | 16 |

## Execution Events

| Seq | Case | Time | Event | Command / Config | Expected | Observed | Result | Evidence | Next |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | REPO-001 | 2026-10-13 | Completed | `pnpm -C autobyteus-ts build`; `env -i … vitest run tests/unit` | pass | build ok; 299 files pass | Pass | `api-e2e-evidence/ts-build.log`, `ts-unit.log` | — |
| 2 | REPO-002 | 2026-10-13 | Completed | `pnpm -C autobyteus-server-ts typecheck` | clean | clean | Pass | `typecheck.log` | — |
| 3 | SUN-E2E-001…003 | 2026-10-13 | Completed (run 1) | new `agy-skill-update-notice-roots.e2e.test.ts` (gated) | 3/3 | 3/3. Copy echo shows the notice then the Manager's message in one turn; the plain member has no notice; the copy went offline at 60.0 s, was not relaunched by the change and was restored by the message; the GitHub update reported the new generation path, not "no longer available" | Pass | `sun-e2e-run1.log`, `sun-run1/skill-update-notice-roots.json` | repeat ×2 |
| 4 | LIVE-001 (Grok) | 2026-10-13 | Completed | `RUN_SKILL_NOTICE_E2E=1 SKILL_NOTICE_E2E_RUNTIMES=grok_build` (temporary GROK_HOME) | next-turn class | pass: busy notice as its own next turn (turn id ≠ busy turn), re-read new codeword, idle combined, 2 system notices in history | Pass | `live-grok-run1.log` | — |
| 5 | LIVE-001 (Codex, Claude, Grok, AutoByteus) | 2026-10-13 | Completed | external: normal env; AutoByteus: `env -i` temp HOME + OPENAI key into the test vault | 4/4 | all pass; no key material in logs | Pass | `live-codex-claude-grok.log`, `live-autobyteus.log` | — |
| 6 | REPO-003 | 2026-10-13 | Completed | `test:unit` | pass | 683 files pass, 4 skipped | Pass | `server-unit.log` | — |
| 7 | REPO-004 | 2026-10-13 | Completed | `test:integration` | baseline | 74 pass; only the 2 documented `agent-status-websocket` cases fail | Pass (baseline) | `server-integration.log` | — |
| 8 | REPO-005 | 2026-10-13 | Completed | `test:nuxt --run` | pass | 610 files / 4259 tests | Pass | `web-nuxt.log` | — |
| 9 | REG-001, SUN ×2 | 2026-10-13 | Started | AGY families + roots ×2 | pass | running | — | `reg-agy-families.log`, `sun-e2e-run{2,3}.log` | — |
| 10 | REG-001, SUN ×2 | 2026-10-13 | Completed | same | pass | 7 files / 34 tests pass; roots 3/3 in runs 2 and 3; committed `c9e100778` | Pass | same | — |
| 11 | DESK-001 | 2026-10-13 | Completed | `iso-54346-c6e4` (built at `c9e100778`, `--keep`), clicks and typing, real Codex | AC-010, QR-001 | The Agent Package Creator's PR commit `1a0a55f` was made in a worktree. The merge happened while the PTM ran `sleep 45`, and the notice was traced +1.01 s later inside the busy turn. The PTM re-read and answered PTM-REV-2. The copy was not woken; reactivated by the PTM, it got the notice plus the message in one turn, re-read and answered APC-REV-2 | Pass | `desktop/ac010-human-journey.mp4`, `d01/d02*.png` | — |
| 12 | DESK-002 | 2026-10-13 | Completed | `isolated-app stop --keep`; skill edited; `start --from-worktree --data-root` (`iso-54969-2202`) | AC-003 restart | one new notice (`SKILL.md`); re-read gave PTM-REV-3 | Pass | `desktop/ac003-app-restart.mp4`, `d03-restart-notice.png` | — |
| 13 | MEAS-001 | 2026-10-13 | Completed | the user's 5 skill sources registered read-only (72 skills); Daily Assistant (`ALL_INSTALLED`) chat; lsof sampling; terminate | bounded; released at end | +703 handles, stable about 7 s; **not released** after terminate (1,005 after 60 s). The probe reproduces it: `syncWatchedFolders([])` keeps 31/31 handles; only `close()` releases | Fail | `desktop/meas-001-fd-samples.txt`, `ape-001-unwatch-probe*.{mjs,json}` | APE-001 |
| 14 | — | 2026-10-13 | Completed | cleanup | owned resources removed | instances stopped; data root removed; `/tmp/apar-sun` removed; 0 files modified in the user's real skill folders | Pass | console | — |
| 15 | RR-001 | 2026-10-13 | Completed | `pnpm build`; `node ape-001-unwatch-probe.mjs $PWD/dist` (`f181b9b13`) | released | `afterWatch 31 → afterSyncEmpty 0 → afterRewatch 31 → afterSecondSyncEmpty 0 → afterClose 0` | Pass | `rerun/ape-001-unwatch-probe-output-f181b9b13.json`, `rerun/server-build.log` | — |
| 16 | RR-002 | 2026-10-13 | Completed | pre-fix watcher (`c9e100778`) transpiled alone with esbuild; same probe | defect reproduced | 31 → 31 → 31 → 31 → 0 (only `close()`) | Pass (control) | `rerun/control-prefix-macos-probe.json` | — |
| 17 | RR-003 | 2026-10-13 | Completed | `docker run node:22-slim` (linux 6.12 arm64), worktree mounted read-only; fixed and pre-fix | inotify watches released | fixed: both 68 → kept 34 → empty 0 → re-watch 34 → 0; kept and re-watched folders report changes. Pre-fix: 68 → 67 → 66 → 67 → 67 | Pass | `rerun/ape-001-linux-inotify-probe.mjs`, `rerun/linux-inotify-probe-output.txt` | — |
| 18 | RR-004 | 2026-10-13 | Completed | notice unit + integration; typecheck | pass | 4 files / 33 tests; typecheck clean | Pass | `rerun/sun-unit-integration.log`, `rerun/typecheck.log` | — |
| 19 | RR-006 | 2026-10-13 | Completed | gated AGY roots + transport | pass | 5/5 (SUN-E2E-001…003, transport ×2) | Pass | `rerun/sun-transport-rerun.log`, `rerun/sun-rerun/` | — |
| 20 | RR-007 | 2026-10-13 | Completed | live Codex | pass | 1/1 (busy, re-read, idle combined, history) | Pass | `rerun/live-codex-rerun.log` | — |
| 21 | MEAS-002 | 2026-10-13 | Completed | `iso-56918-0731` built at `f181b9b13` (packaged watcher contains `closeWatch`); 72 real skills read-only + test-owned `rerun-probe`; Daily Assistant on Codex GPT-6.1-Sol low; clicks and typing; recorded | bounded; released at end; notices still work | chat 1: 59 → 769 (+710), stable +6.6 s; RP-REV-1. Edit → next message got one "SKILL UPDATED" notice (`SKILL.md`), re-read, RP-REV-2. Terminate: 768 → 55 within about 2 s; 0 skill-folder handles. Chat 2 (re-watch): 55 → 769; edit of SKILL.md and a reference → one notice listing both, RP-REV-3. Terminate: 769 → 56; 0 skill-folder handles | Pass | `rerun/desktop/meas-002-*.txt`, `meas-002-handle-release.mp4`, `d05`–`d07*.png` | — |
| 22 | RR-005 | 2026-10-13 | Completed | `test:unit` | pass | 683 files / 5399 tests pass, 4 files skipped | Pass | `rerun/server-unit.log` | — |
| 23 | — | 2026-10-13 | Completed | cleanup | owned resources removed | instance stopped (not forced), data root removed, ports released; `/tmp/apar-rerun` and `.apar-prefix-dist` removed; user repositories' status unchanged; no files changed in `~/.codex/skills` | Pass | `rerun/desktop/isolated-stop.json` | — |
| 24 | R3-001 | 2026-10-13 | Completed | `typecheck`; `build` at `141268a74` | clean | clean; build ok | Pass | `round3/typecheck.log`, `round3/server-build.log` | — |
| 25 | R3-002 | 2026-10-13 | Completed | notice unit + integration, 5 consecutive runs | pass, no flake | 37/37 in each of the 5 runs; no `ENOTEMPTY` | Pass | `round3/notices-run{1..5}.log` | — |
| 26 | R3-004 | 2026-10-13 | Failed (test authoring) | live Codex + Claude with the new case | — | transform error: `**/` inside my doc comment closed it. Test-side defect, fixed before any test ran | — | `round3/live-codex-claude.log` (overwritten by event 27) | rerun |
| 27 | R3-004 | 2026-10-13 | Completed | `RUN_SKILL_NOTICE_E2E=1 SKILL_NOTICE_E2E_RUNTIMES=codex_app_server,claude_agent_sdk` | 4/4 | 4/4. Restore case on Codex and Claude: the record was on disk when the first turn ended; terminate → change → continue gave 1 notice and the new codeword; `deleteStoredRun` → folder gone, still absent 22 s later | Pass | `round3/live-codex-claude.log` | — |
| 28 | R3-003 | 2026-10-13 | Completed | gated AGY roots + transport ×2 | 5/5 ×2 | 5/5 in both runs | Pass | `round3/sun-transport-run{1,2}.log` | — |
| 29 | R3-004 (AutoByteus via env) | 2026-10-17 | Stopped | `env -i … OPENAI_API_KEY` from the shell | — | stopped on user direction (keys must go through the importer); not counted | — | — | R3-006 |
| 30 | R3-006 | 2026-10-17 | Completed | `iso-54264-fe7b` (`--build`, `141268a74`); `pnpm secrets:import` dry run (9 CREATE, 0 BLOCKED) then import via pty `IMPORT`; `isolated-app restart` | AutoByteus restore and delete | Anthropic key: HTTP 400 "credit balance is too low" (environment, not product), so that run was terminated. Note: AutoByteus creates the memory folder at run start and the record was already there. `gpt-5.5`: RS-REV-1; record lists `restore-probe` at its path. Terminate → edit (RS-REV-2) while stopped → continue: one "SKILL UPDATED" notice (`SKILL.md`), re-read, RS-REV-2. Terminate → UI "Delete run permanently" → confirm: folder removed at once; skill edited again; folder not re-created in 75 s | Pass | `round3/desktop/desk-003-autobyteus-restore-delete.mp4`, `d08-*.png`, `d09-*.png` | — |
| 31 | R3-005 | 2026-10-17 | Completed | `test:unit` | pass | 683 files / 5400 tests pass, 4 files skipped | Pass | `round3/server-unit.log` | — |
| 32 | — | 2026-10-17 | Completed | cleanup; commit `06c4a62f1` (live case, explicit path) | owned resources removed | instance stopped (not forced), data root and vault removed with it, ports released; `/tmp/apar-r3` removed; `iso-54255-c1c9` belongs to another worktree and was left alone | Pass | `round3/desktop/isolated-stop.json` | — |

## Re-entry And Reconciliation

- Last durably recorded event: 32
- Cases still running or not started: none
- Reconciled into the execution coverage report: `Yes` (round 3)
