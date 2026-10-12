# API/E2E Test-Case Ledger

## Ledger Meta

- Assigned task workspace / worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-launch-config-defaults`
- Coverage investigation: `tickets/in-progress/delegated-launch-config-defaults/api-e2e-coverage-investigation.md`
- Execution coverage report: `tickets/in-progress/delegated-launch-config-defaults/api-e2e-execution-coverage-report.md`
- API/E2E revision record: `tickets/in-progress/delegated-launch-config-defaults/api-e2e-revision-record.md`
- Ledger scope and reason it is required: API-REV-001; repository suites, a multi-case server E2E and a browser probe, each multi-minute.
- Last updated: 2026-10-12 (API-REV-003, UI coverage extension at the user's request)

## Planned Cases

| Case ID | Case / Journey | Requirement / Acceptance-Criteria IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| REPO-001 | Server typecheck + unit | all server | Repository | `typecheck`, `test:unit` | 1 | — |
| REPO-002 | Contract package tests | DS-005 | Repository | `pnpm -C autobyteus-*-stream-contracts test` | 2 | — |
| REPO-003 | Web unit/component + guards | AC-010..013 | Repository | `test:nuxt --run`, guards | 3 | — |
| DLC-001 | Catalog Team copy per root, four reasons in `launch_notes` | AC-001, AC-002, AC-005, AC-015 | Server E2E | new E2E file | 4 | Agent, Team, Org roots |
| DLC-002 | Mixed-runtime member starts on its runtime | AC-001 | Server E2E | same | 4 | Grok fake + AGY argv |
| DLC-003 | Agent bring-in / agent copy notes per root | AC-003..005 | Server E2E | same | 4 | — |
| DLC-004 | Team bring-in + extra copy at its address | AC-004, AC-007 | Server E2E | same | 4 | — |
| DLC-005 | Teammate delegation in copy (no notes); helper bring-in note | AC-007, AR-002 | Server E2E | same | 4 | — |
| DLC-006 | Inherited layer unusable | AC-006 | Server E2E | same | 5 | Agent root |
| DLC-007 | Definition edit after start, restore | AC-008 | Server E2E | same | 5 | Agent root |
| DLC-008 | Old-shape saved tree restore | AC-009 | Server E2E | same | 5 | Agent + Team roots |
| REG-001 | Existing delegation E2E suites | AC-014 | Server E2E | lazy activation, ad-hoc, contact host, existing copy | 6 | — |
| REG-002 | Server integration suite | AC-014 | Repository | `test:integration` | 7 | — |
| DLP-001 | New chat Team seeding + Run readback | AC-011, AC-013 | Browser probe | `test:e2e:delegated-launch-defaults` | 8 | — |
| DLP-002 | Org launch seeding + Run readback | AC-012 | Browser probe | same | 8 | — |
| DLP-003 | Manager chat from the UI: copy (5 notes), Pair/Writer bring-ins, extra copy from its composer; teammate, helper, Grok engineer from the copy lead's conversation; Settings rows | AC-001, AC-003..AC-005, AC-007, AC-010 | Browser probe (UI-driven, round 3) | same | 8 | — |
| DLP-004 | Team run (New chat) and Org run (Org launch) driven from the composer; Settings rows | AC-004, AC-005, AC-010 | Browser probe (UI-driven, round 3) | same | 8 | — |
| DLP-005 | Root model retired mid-run: failures shown in the conversation, nothing added, own default works | AC-006, REQ-004 | Browser probe (round 3) | same | 8 | probe-owned `agy models` file |
| DLP-006 | Pre-change saved runs (Agent + Team) after a backend restart: Settings "Source not recorded"; member starts on the Team value | AC-009, QR-002 | Browser probe (round 3) | same | 8 | — |
| DLP-007 | Definition edited in the Agents editor after copy A; copy B; stop/reopen from Settings; copy A engineer on Grok | AC-008, DEC-008 | Browser probe (round 3) | same | 8 | runs last |
| MOB-001 | Mobile Team start seeding through the setup controller; stale seed dropped | AC-011 (mobile), DS-006 | Web component | `MobileRunSetupMemberSeeding.spec.ts` | 8 | mobile needs pairing; no browser surface |
| ISO-001 | Isolated desktop instance (worktree build), real runtimes: Claude delegator, Codex coordinator default, native AutoByteus member default, unusable Codex default; tool card note, member context, Settings, New-chat seeding | AC-015 shape, AC-001, AC-005, AC-010, AC-011, AR-001 | Isolated desktop instance | `isolated-app start --build`, browser-automation attach | 9 | real provider calls (user-provided key file imported into the instance DB) |

## Execution Events

| Sequence | Case ID | Timestamp | Event | Command / Entry Point / Material Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | REPO-001..003 | 2026-10-12 | Started | background chain: typecheck → unit → contracts → web → guards | all exit 0 | running | — | `api-e2e-evidence/*.log` | write E2E meanwhile |
| 2 | REPO-001 | 2026-10-12 | Checkpoint | typecheck; `test:unit` (ran concurrently with E2E authoring runs) | exit 0 | typecheck exit 0; unit 5276 pass / 1 fail (`native-compaction-terminal-drain.test.ts`, timing under load); chain then cut by host power-off during web suite | — | `api-e2e-evidence/server-typecheck.log`, `server-unit.log` | isolated rerun 3/3 pass; full clean rerun at end |
| 3 | REPO-002 | 2026-10-12 | Completed | both contract packages | exit 0 | team 0, collaboration 0 | Pass | `api-e2e-evidence/contracts.log` | — |
| 4 | DLC-001..008 | 2026-10-12 | Checkpoint | new E2E runs 1–3 | — | test defects fixed: coordinator param; configured `/worker` not a catalog agent in Team root (product rule) → `plain` agent; casing helper turned camelCase `null` into `undefined`; extra copy at collaborator address has no `source` (reviewed residual) → prove at runtime; `@` mention only resolves (BEH-002 preserved) → assert nothing admitted. Host power-off interrupted run 3 (own temp HOME removed afterwards) | — | `api-e2e-evidence/server-e2e/run-1..3.log` | rerun |
| 5 | DLC-001..008 | 2026-10-12 | Completed | run 4, full file, clean env | 3/3 pass | 3/3 pass in 20 s; receipt cleanup all true | Pass | `server-e2e/run-4.log`, `delegated-launch-config-defaults.json` | stability repeats + regression suites |
| 6 | DLC-001..008 | 2026-10-12 | Completed | two stability repeats | 3/3 each | 3/3, 3/3 | Pass | `server-e2e/delegated-launch-config-defaults{,-repeat}.log` | — |
| 7 | REG-001 | 2026-10-12 | Completed | lazy activation, ad-hoc delegation, copy-member contact host, existing-copy assignment (gate on) | all pass | 2+1 skipped (live Claude gate), 3, 1, 7+1 skipped | Pass | `server-e2e/*.log` | — |
| 8 | DLP-001..004 | 2026-10-12 | Checkpoint | probe run 1 | — | DLP-001 pass; others failed on test assumptions: model display names ("Gemini test", "Retiring test model") vs IDs; a member without its own default shows its Team's source and note (DS-005, by design) | — | `browser-probe-run-1/` | fixed assertions |
| 9 | DLP-001..004 | 2026-10-12 | Completed | probe run 2 | 4/4 | 4/4, no browser errors, cleanup receipt complete | Pass | `browser-probe-run-2/` | repeat |
| 10 | REPO-003 | 2026-10-12 | Completed | clean serialized: `test:nuxt --run`, three guards | exit 0 | 604 files / 4193 tests pass; guards 0/0/0 | Pass | `web-nuxt.log`, `web-guards.log` | — |
| 11 | MOB-001 | 2026-10-12 | Completed | new `MobileRunSetupMemberSeeding.spec.ts`; mutation: controller seeding call removed | pass; mutation fails | 2/2 pass; with the mutation 2/2 fail; source restored (no diff) | Pass | console | — |
| 12 | REPO-001 | 2026-10-12 | Completed | clean serialized `test:unit`, `typecheck` | exit 0 | 673 files / 5277 tests pass, 7 skipped; typecheck 0 | Pass | `server-unit.log`, `server-typecheck.log` | earlier flake confirmed load-only |
| 13 | REG-002 | 2026-10-12 | Completed | `test:integration:prepare`, `test:integration` | baseline | 356 pass; 2 fail = the TESTING.md known baseline exception (`agent-status-websocket` content cadence) | Pass (baseline) | `server-integration.log` | — |
| 14 | DLP-001..004 | 2026-10-12 | Completed | probe repeat (run 3) | 4/4 | 4/4 | Pass | `browser-probe-run-3/` | — |
| 15 | ISO-001 | 2026-10-12 | Started | `isolated-app start --build` (worktree desktop build) | instance ready | building | — | `isolated-instance/start*.{json,log}` | import vault into instance DB, restart, run journey |
| 16 | ISO-001 | 2026-10-12 | Checkpoint | instance `iso-49330-a48e`; `secrets:import` of the user-named key file into the instance DB only; restart; definitions via GraphQL (`iso-setup.mjs`) | ready | 10 provider entries imported (names only shown); catalogs Codex 7 / native 35 / Claude 12; models chosen gpt-5.6-luna, deepseek-v4-flash, haiku | — | `isolated-instance/start.json`, `restart.json`, `iso-definitions.json` | journey |
| 17 | ISO-001 | 2026-10-12 | Completed | browser-automation attach-only (control port 49330), recorded | AC-011 seeding; delegation on real runtimes; note in tool result; Settings rows; member contexts | New-chat drawer: lead Codex Luna, engineer native deepseek seeded, auditor note; Claude-haiku manager delegated `/iso_se_team`; recorded lead Codex/agent_default, engineer native/agent_default, reviewer inherited, auditor inherited+model_unavailable; token ledger: manager claude_agent_sdk/claude-haiku-5-5, lead codex_app_server/gpt-5.6-luna, engineer autobyteus/deepseek-v4-flash (~$0.01 total); tool Result shows `launch_notes`; Settings rows match; "+" from lead/engineer prefills their own runtime/model | Pass | `isolated-instance/iso-0*.png`, `iso-journey.mp4` | stopped instance: data root (incl. vault) removed, ports released |
| 18 | MOB-001 | 2026-10-12 | Checkpoint | CRR-003 TR-001 (Local Fix): the catalog gate kept one resolver; two held loads → the seed never resolved, so the switch case passed regardless | — | Valid finding; gate now collects every held resolver (`releaseAll`); positive control added (held → released, same Team → reviewer seed applied); switch case kept | — | spec diff | rerun + mutations |
| 19 | MOB-001 | 2026-10-12 | Completed | spec 3 cases; mutations M0 seeding call removed, M1 controller guard removed, M2 store draft-ID check removed, M3 both removed; restored | M0 fails all; M3 fails the switch case | baseline 3/3 pass; M0 3/3 fail; M1 3/3 pass; M2 3/3 pass; M3 switch case fails, others pass; restored (no diff) 3/3; related web suites 16 files / 98 tests pass | Pass | console | the two guards are redundant: either alone drops the stale seed |
| 20 | DLP-003..007 | 2026-10-12 | Checkpoint | probe extended so every action goes through the UI (user request: cover as many cases as possible through the real UI); runs 4–6 with `--cases` | — | run 4: run-view composer has no `chat-composer` test ID → visible textarea; run 5: DLP-005 pass, others: reader took the Team messages panel (`main.last()`) → read all `main` regions; run 6: DLP-003, 004, 006, 007 pass | — | `browser-probe-run-4..6/` | full runs |
| 21 | DLP-001..007 | 2026-10-12 | Checkpoint | full run 7 | — | interrupted by a host restart during DLP-001 (browser closed); orphan probe process stopped; temp root already removed | — | `browser-probe-run-7-interrupted-by-host-restart/` | rerun twice |
| 22 | DLP-001..007 | 2026-10-12 | Completed | full runs 8 and 9 (fresh stack each) | 7/7 | 7/7 and 7/7; no browser errors; cleanup receipts complete (first backend `already-exited` = DLP-006's intended stop) | Pass | `browser-probe-run-8/`, `browser-probe-run-9/` | — |

## Re-entry And Reconciliation

- Last durably recorded event: 22
- Last completed case and result: DLP-001..007 full runs 8–9, Pass
- Cases still running, interrupted, or not started: none
- Next case or recovery action: none
- Interruption, context-compression, or rerun note: host power-off during the first chain (web suite and E2E run 3 interrupted); a host restart during probe run 7. All rerun cleanly.
- Reconciled into execution coverage report: `Yes` — `api-e2e-execution-coverage-report.md`, Test-Case Ledger Reconciliation
- Reconciliation note for any case missing a terminal result: none missing
