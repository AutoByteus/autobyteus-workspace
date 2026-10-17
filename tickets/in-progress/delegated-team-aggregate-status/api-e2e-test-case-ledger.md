# API/E2E Test-Case Ledger — Universal Team status

## Ledger Meta

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status`
- Coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status/tickets/in-progress/delegated-team-aggregate-status/api-e2e-coverage-investigation.md`
- Execution coverage report: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status/tickets/in-progress/delegated-team-aggregate-status/api-e2e-execution-coverage-report.md`
- API/E2E revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status/tickets/in-progress/delegated-team-aggregate-status/api-e2e-revision-record.md`
- Ledger scope and reason: four long-running live journeys (real backend, Nuxt cold start, Chrome), plus repository suites; interruption risk.
- Last updated: 2026-10-09

## Planned Cases

| Case ID | Case / Journey | Requirement / AC IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| RC-001 | Changed and adjacent web specs | AC-001..010 (mocked inputs) | Vitest/jsdom | `pnpm exec vitest run <changed spec dirs>` (autobyteus-web) | 1 | |
| RC-002 | Controlled-input nested/delegated/TEAMS dot rendering | AC-009, AC-010 | Nuxt dev + Chrome | `test:e2e:nested-team-aggregate-status` | 2 | |
| RC-003 | Team glyph identity preserved | REQ-006 icon | Nuxt dev + Chrome | `test:e2e:team-group-icon` | 3 | |
| RC-004 | Scripted AGY fixture routing incl. new `HOLD_TURN` | Fixture coexistence | Node process boundary | server `vitest run …agy-failure-cli-routing.test.ts` | 4 | |
| RC-005 | Full web unit suite | Regression | Vitest | `pnpm -C autobyteus-web test:nuxt --run` | 5 | |
| TS-001 | Delegated Team under Agent run: idle → busy collapsed → busy+error → error after Stop generation → gray on terminate | SCN-001; AC-001..005, AC-007, AC-009, AC-010 | Built backend + Nuxt + Chrome | `test:e2e:team-status-live --cases …` | 6 | |
| TS-002 | TEAMS run/group rows across three runs; Stop button; all stopped | SCN-004/005; AC-002, AC-007, AC-008, AC-010; ASM-002 | same | same | 7 | |
| TS-003 | Team run: member-delegated Team; run row counts delegated agents; stop | SCN-002; AC-009, REQ-002, AC-007 | same | same | 8 | |
| TS-004 | Org run: delegated + Org-internal Team rows; Org root unchanged; stop | SCN-003; AC-009, AC-007, BEH-006 | same | same | 9 | |

## Execution Events

| Sequence | Case ID | Timestamp | Event | Command / Entry Point / Material Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | RC-001 | 2026-10-09 20:58 | Completed | vitest changed/adjacent specs | all pass | 33 files / 409 tests pass | Pass | `api-e2e-evidence/vitest-changed-specs.log` | — |
| 2 | RC-002 | 2026-10-09 21:01 | Completed | `test:e2e:nested-team-aggregate-status --output-dir api-e2e-evidence/nested` | Pass | Pass | Pass | `api-e2e-evidence/nested/evidence.json` | — |
| 3 | RC-003 | 2026-10-09 21:02 | Completed | `test:e2e:team-group-icon --output-dir api-e2e-evidence/group-icon` | Pass | Pass; ports released | Pass | `api-e2e-evidence/group-icon/result.json` | — |
| 4 | TS-001..004 (dev) | 2026-10-09 21:04 | Checkpoint | Development runs in `/tmp/tsl-dev1`, `/tmp/tsl-dev2` (probe authoring) | — | All four passed; two soft checks hardened afterwards | N/A | temporary | Authoritative rerun below |
| 5 | RC-004 | 2026-10-09 21:08 | Completed | routing test with the new HOLD_TURN case | all pass | 18 / 18 pass | Pass | `api-e2e-evidence/agy-fixture-routing.log` | — |
| 6 | RC-005 | 2026-10-09 21:10 | Checkpoint | First attempt was plain `vitest run` (no `NUXT_TEST`), which also ran the Electron spec outside its config: 2 fails in `electron/server/__tests__/platformServerEnvironment.spec.ts`. That spec passes under `test:electron` (2/2). | — | Runner-choice artifact, not a product failure | N/A | `api-e2e-evidence/vitest-full-web.log` | Documented `test:nuxt --run` running |
| 7 | RC-005 | 2026-10-09 21:14 | Completed | `pnpm -C autobyteus-web test:nuxt --run` | all pass | 590 files / 4035 tests pass, 5 skipped, 0 failed | Pass | `api-e2e-evidence/vitest-test-nuxt.log` | — |
| 8 | TS-001..004 | 2026-10-09 21:15 (19:15Z) | Completed (attempt 1) | `test:e2e:team-status-live --output-dir api-e2e-evidence/live` | 4 Pass | TS-001..003 Pass. TS-004 Fail: the probe looked up the icon by `[data-team-icon]`, which the Org-internal Team row's icon lacks (pre-existing markup); the DOM order was correct. | Fail (probe) | moved to `api-e2e-evidence/live-attempt1/` (the first four appended lines below point at `live/` from before the move) | Fix the probe selector; rerun |
| 9 | TS-001..004 | 2026-10-09 21:16 (19:16Z) | Completed (attempt 2, authoritative) | same, fresh `live/` | 4 Pass | 4 Pass; cleanup complete | Pass | `api-e2e-evidence/live/evidence.json` | — |
| 10 | TS-001..004 | 2026-10-09 21:17 | Completed (stability repeats) | same, `live-repeat2/`, `live-repeat3/` | 4 Pass each | 4 Pass each | Pass | `api-e2e-evidence/live-repeat{2,3}/` | — |

## Re-entry And Reconciliation

- Last durably recorded event: sequence 10
- Last completed case and result: TS-004 Pass (stability repeat 3)
- Cases still running, interrupted, or not started: none
- Next case or recovery action: none (handoff)
- Interruption, context-compression, or rerun note: attempt-1 evidence moved to `live-attempt1/`
- Reconciled into execution coverage report: `Yes`, `api-e2e-execution-coverage-report.md` § Test-Case Ledger Reconciliation
- Reconciliation note for any case missing a terminal result: none

## Probe-Appended Events

(The live probe appended one line per case; the first four are attempt 1.)

- 2026-10-09T19:15:03.859Z TS-001: Pass — Agent run: delegated Team idle → busy while collapsed → busy+error → error after Stop generation → gray when the run stops. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status/tickets/in-progress/delegated-team-aggregate-status/api-e2e-evidence/live/evidence.json

- 2026-10-09T19:15:09.154Z TS-002: Pass — TEAMS rows: idle run green, alive unstarted gray with Stop, group = highest run, Stop button → gray, all stopped → gray. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status/tickets/in-progress/delegated-team-aggregate-status/api-e2e-evidence/live/evidence.json

- 2026-10-09T19:15:12.136Z TS-003: Pass — Team run: member-delegated Team row and the run row count the delegated agents; Stop → gray. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status/tickets/in-progress/delegated-team-aggregate-status/api-e2e-evidence/live/evidence.json

- 2026-10-09T19:15:14.411Z TS-004: Fail — Org run: delegated and Org-internal Team rows, Org root row unchanged; stop → gray (Org-internal Team, no member started: dot is not before the people-group icon). Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status/tickets/in-progress/delegated-team-aggregate-status/api-e2e-evidence/live/evidence.json

- 2026-10-09T19:15:52.025Z TS-001: Pass — Agent run: delegated Team idle → busy while collapsed → busy+error → error after Stop generation → gray when the run stops. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status/tickets/in-progress/delegated-team-aggregate-status/api-e2e-evidence/live/evidence.json

- 2026-10-09T19:15:57.382Z TS-002: Pass — TEAMS rows: idle run green, alive unstarted gray with Stop, group = highest run, Stop button → gray, all stopped → gray. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status/tickets/in-progress/delegated-team-aggregate-status/api-e2e-evidence/live/evidence.json

- 2026-10-09T19:16:00.385Z TS-003: Pass — Team run: member-delegated Team row and the run row count the delegated agents; Stop → gray. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status/tickets/in-progress/delegated-team-aggregate-status/api-e2e-evidence/live/evidence.json

- 2026-10-09T19:16:03.132Z TS-004: Pass — Org run: delegated and Org-internal Team rows, Org root row unchanged; stop → gray. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status/tickets/in-progress/delegated-team-aggregate-status/api-e2e-evidence/live/evidence.json

## Round 2 (API-REV-002, DR-004) — HEAD `ebf5ca614c`

| Sequence | Case ID | Timestamp (local) | Event | Command / Configuration | Observed | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R2-1 | TS-001..004 | 2026-10-17 09:16 | Completed | `test:e2e:team-status-live --output-dir …/rev002/live` (before the layout checks) | 4/4 | Pass | `rev002/live-before-layout/` |
| R2-2 | NTAS-BR-001..004 | 09:18 | Completed (attempt 1) | `test:e2e:nested-team-aggregate-status` | BR-004 failed: `/ws/agent-package-definitions` refused (fixture has no backend); BR-001..003 Pass | Fail (probe drift) | `rev002/nested-attempt1/` |
| R2-3 | B01..B04 | 09:19 | Completed (attempt 1) | `test:e2e:team-group-icon` | Browser-error check failed on the same socket | Fail (probe drift) | `rev002/group-icon-attempt1/` |
| R2-4 | NTAS / group-icon | 09:21 | Completed | Both rerun after `routeWebSocket` of the feed | 4/4 and 4/4; cleanup OK | Pass | `rev002/nested/`, `rev002/group-icon/` |
| R2-5 | TS-001,003,004 (dev) | 09:23 | Checkpoint | Layout checks authored; dev run `/tmp/tsl-r2dev` | 3/3 | N/A | temporary |
| R2-6 | TS-001..004 | 09:24 | Completed | `test:e2e:team-status-live --output-dir …/rev002/live` (with layout checks) | 4/4; cleanup OK | Pass | `rev002/live/evidence.json` |
| R2-7 | Desktop build | 09:27 | Completed | `CODEX_HOME=<throwaway> pnpm --silent isolated-app start --build` → `iso-55445-b74c` (55445/55446) | Built and started | Pass | `rev002/desktop/isolated-start.json`, `isolated-build.log`, `build-identity.txt` |
| R2-8 | A1..C2 (attempt 1) | 09:32 | Completed | Codex `gpt-5.6-sol` | Manager turn: provider usage limit; no delegation | Blocked (quota) | `rev002/desktop/attempt1-codex-quota/` |
| R2-9 | Instance config | 09:36 | Completed | `updateServerSetting` ANTIGRAVITY_CLI_COMMAND / AGY_FAKE_CASE, then `isolated-app restart iso-55445-b74c` | Same ports and data root | Pass | `scripted-runtime-settings.json`, `isolated-restart.json` |
| R2-10 | A1..C2 (attempt 2) | 09:38 | Completed | `ac011-desktop.mjs … AGY` | A1–B1 Pass; C1 failed on my gray RGB assumption (class correct; renders rgb(153,153,153)) | Fail (assertion) | `rev002/desktop/attempt2-gray-assertion/` |
| R2-11 | A1..C2 (attempt 3) | 09:38 | Completed | `ac011-desktop.mjs … R2` (fresh rows) | 6/6; no page errors | Pass | `rev002/desktop/ac011-evidence.json`, screenshots |
| R2-12 | Cleanup | 09:40 | Completed | `isolated-app stop iso-55445-b74c`; throwaway `CODEX_HOME` removed | Stopped (forced), data root removed, ports free; other worktrees' instances untouched | Pass | `rev002/desktop/isolated-stop.json` |

- Round-2 reconciliation: all cases terminal and reconciled into the execution coverage report, "Round 2 — API-REV-002".
