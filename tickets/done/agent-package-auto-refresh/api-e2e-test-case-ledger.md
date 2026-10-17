# API/E2E Test-Case Ledger — `agent-package-auto-refresh`

## Ledger Meta

- Assigned task workspace / worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh`
- Coverage investigation: `tickets/in-progress/agent-package-auto-refresh/api-e2e-coverage-investigation.md`
- Execution coverage report: `tickets/in-progress/agent-package-auto-refresh/api-e2e-execution-coverage-report.md`
- API/E2E revision record: `tickets/in-progress/agent-package-auto-refresh/api-e2e-revision-record.md`
- Ledger scope and reason it is required: API-REV-001. There are many independent server E2E cases, a long desktop journey with real-model turns, and a risk of interruption.
- Last updated: 2026-10-11

## Planned Cases

| Case ID | Case / Journey | Requirement / Acceptance-Criteria IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| REPO-001 | Catalog unit + journey integration | AC-001…007, 011, 012, 015, 016 | Vitest (in-process) | `vitest run tests/unit/definition-catalog tests/integration/definition-catalog` | 1 | — |
| REPO-002 | Server typecheck | — | tsc | `pnpm -C autobyteus-server-ts typecheck` | 2 | — |
| REPO-003 | Server unit baseline | — | Vitest | `pnpm -C autobyteus-server-ts test:unit` | 3 | — |
| REPO-004 | Server integration baseline | — | Vitest | `pnpm -C autobyteus-server-ts test:integration` | 4 | known exception: 2 `agent-status-websocket` cases |
| REPO-005 | Web unit/component | REQ-005/006/009 | Vitest (Nuxt) | `pnpm -C autobyteus-web test:nuxt --run` | 5 | — |
| DCF-E2E-001 | Feed contract + remote-access auth | QR-006, REQ-005 | real Studio HTTP/WS | new E2E file | 6 | ungated |
| DCF-E2E-002 | Imported package live GraphQL + frames, issues, diagnostics, skills no-op | AC-001…005, 007, REQ-009, 014 | real Studio HTTP/WS | new E2E file | 7 | ungated |
| DCF-E2E-003 | Root missing/restored; package removed | AC-011, AC-012, REQ-015 | real Studio HTTP/WS | new E2E file | 8 | ungated |
| DCF-E2E-004 | Reload mutations notify another client | AC-013, REQ-017 | real Studio HTTP/WS | new E2E file | 9 | ungated |
| DCF-E2E-005 | GitHub Check/Update pushes to another client; root re-armed | AC-009, REQ-013, DSN-001 | real Studio HTTP/WS + controlled GitHub HTTP | new E2E file | 10 | ungated |
| DCF-E2E-006 | Duplicate Team across packages unavailable everywhere | DSN-002 | real Studio HTTP/WS | new E2E file | 11 | ungated |
| DCF-E2E-007 | SCN-012 via real tools (list, delegate, spawned members/prompt, deleted not found, inside settle window) | AC-015, AC-016 | real HTTP/WS/scoped MCP + scripted AGY | new E2E file | 12 | gated `RUN_AGY_FAILURE_E2E` |
| DCF-E2E-008 | Run continuity across edit/delete; restore → not found | AC-008, REQ-012 | real HTTP/WS + scripted AGY | new E2E file | 13 | gated |
| REG-001 | Sibling E2E touched by the change | regression | Vitest E2E | `tests/e2e/agent-definitions`, `agent-team-definitions`, `skills/skill-name-catalog-graphql`, `projects/ad-hoc-task-delegation` | 14 | base failures investigated (Rule 9) |
| DESK-001 | Isolated desktop: SCN-012 with real Project Task Manager + Agent Package Creator (create agent + Team, edit Team members + agent instructions, delete agent, delegate again; list, `@`, Teams page, Codex launch) | AC-001, 002, 003, 015, SCN-012 | isolated desktop instance (worktree build), real Codex | `pnpm --silent isolated-app start --build` + CDP | 15 | real model |
| DESK-002 | Broken nested agent: Team usable, badge rendered; fix clears | AC-004, DSN-003, REQ-009 | isolated desktop | CDP | 16 | — |
| DESK-003 | Second client (browser on same node) updates on Reload/package action | AC-009, AC-013 | isolated desktop + Chrome | CDP | 17 | — |
| DESK-004 | Backend restart / reconnect: changes made while disconnected appear | AC-010, REQ-006 | isolated desktop restart | `isolated-app restart` | 18 | — |
| DESK-005 | Settings row states (WATCHING / ROOT_MISSING / restored) | AC-012, REQ-015 | isolated desktop | CDP | 19 | — |
| MEAS-001 | Idle CPU and watch count with copies of the user's packages | AC-014, QR-001, QR-002 | process measurement | `ps`/`lsof` | 20 | Linux count from the implementation probe |

## Execution Events

| Sequence | Case ID | Timestamp | Event | Command / Entry Point / Material Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | REPO-001 | 2026-10-11 13:33 | Completed | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/definition-catalog tests/integration/definition-catalog --no-watch` | all pass | 7 files, 86 tests pass | Pass | console | — |
| 2 | REPO-002 | 2026-10-11 13:34 | Completed | `pnpm -C autobyteus-server-ts typecheck` | clean | clean | Pass | console | — |
| 3 | REPO-003 | 2026-10-11 13:35 | Started | `pnpm -C autobyteus-server-ts test:unit` | all pass | running | — | `api-e2e-evidence/server-unit.log` | — |
| 4 | REPO-003 | 2026-10-11 13:40 | Completed | same | all pass | 673 files pass, 4 skipped; exit 0 | Pass | `api-e2e-evidence/server-unit.log` | — |
| 5 | DCF-E2E-001…006 | 2026-10-11 13:41 | Completed (run 1, ungated) | `env -u AUTOBYTEUS_AGENT_PACKAGE_ROOTS … vitest run tests/e2e/agent-definitions/definition-catalog-live-refresh.e2e.test.ts` | all pass | 001, 004, 005, 006 pass; 002/003 failed on a test defect (instructions compared without trimming the trailing newline) | Fail (test defect, fixed) | `api-e2e-evidence/dcf-e2e-ungated-run1.log` | trim fixed |
| 6 | DCF-E2E-007/008 | 2026-10-11 13:42 | Completed (run 1, gated) | `+ RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=…agy-failure-cli.mjs` | pass | 008: restore error is the base per-runtime `AGY_AGENT_DEFINITION_MISSING` (my regex was too narrow; test fixed). 007: `list_available_agents` issued ~40 ms after the writes missed them (no frame yet) | Fail (investigated) | `api-e2e-evidence/dcf-e2e-gated-run1.log` | probe |
| 7 | DCF-E2E-007 | 2026-10-11 13:44–13:50 | Checkpoint (probe) | temporary timing probe in the case (removed afterwards) | — | isolated: tool sees the change at 66 ms (read flushed); full suite: tool at 59 ms had not been detected yet, visible at ≤ 638 ms; detection latency over 5 trials: 4–28 ms (full) / 14–28 ms (isolated). The miss is a detection race of tens of ms, inside REQ-018's "already detected" scope; real use has a model turn between the last write and the next lookup. The refusal shape for a deleted agent is `{delegated:false, message:"… not … an available agent of this run."}` (assertion fixed) | — | `api-e2e-evidence/dcf-e2e-007-probe1.log`, `dcf-e2e-latency-{full,isolated}.log`, `dcf-e2e-gated-run2.log` | made the AC-016 step deterministic: 300 ms pause plus an assertion that nothing has been published yet |
| 8 | DCF-E2E-001…008 | 2026-10-11 13:52 | Completed (3 consecutive gated runs) | as in 6 | all pass | 8/8 pass ×3; 54 frames, all match the strict schema; cleanup complete; Team copy members lead/mate → chief/scout; the earlier copy keeps its V1 prompt; edited agent copy gets V2; deleted agent refused; active run not relaunched (6 = 6 launches); restore → `AGY_AGENT_DEFINITION_MISSING` | Pass | `api-e2e-evidence/dcf-e2e-gated-final-{1,2,3}.log`, `dcf-gated-final-*/definition-catalog-live-refresh.json` | — |
| 9 | REPO-004 | 2026-10-11 13:54 | Started | `test:integration:prepare` then `test:integration` | all pass except the 2 documented cases | running | — | `api-e2e-evidence/server-integration.log` | — |
| 10 | MEAS-001 | 2026-10-11 14:05 | Completed | `node api-e2e-evidence/apar-macos-watch-probe.mjs autobyteus-server-ts/dist <copies of the user's 2 packages>` | hundreds of watches; none under skills/.git/node_modules; ~0 idle CPU | macOS: 604 live fs.watch handles (461 dirs in the kind trees); 0 under `skills/`, `.git`, `node_modules`; ready 71 ms; idle CPU 0.079 % over 30 s; 0 events idle; 0 handles after close. Linux (implementation probe, container): 603 inotify watches | Pass | `api-e2e-evidence/apar-macos-watch-probe-output.json`; `implementation-evidence/apar-linux-monitor-probe-output.txt` | desktop idle CPU in DESK |
| 11 | REPO-004 | 2026-10-11 14:12 | Completed | same | as baseline | 72 files pass; 1 file fails with exactly the 2 documented `agent-status-websocket` cadence cases (TESTING.md Known exception) | Pass (baseline) | `api-e2e-evidence/server-integration.log` | — |
| 12 | REPO-005 | 2026-10-11 14:25 | Completed | `pnpm -C autobyteus-web test:nuxt --run` | all pass | 599 files / 4149 tests pass, 2 files skipped | Pass | `api-e2e-evidence/web-nuxt.log` | — |
| 13 | REG-001 | 2026-10-11 14:28 | Completed | `vitest run tests/e2e/agent-definitions tests/e2e/agent-team-definitions tests/e2e/skills/skill-name-catalog-graphql.e2e.test.ts` | base-identical | 10 failed / 33 passed. Causes (all present on base `359d2c0ef`): (a) `agent-packages-graphql` ×3: the service's `githubClient` (added in c6c4afbf4) was not controlled, so live GitHub was hit → **fixed as baseline commit `6b3a10822`**, 8/8 pass; (b) `agent-team-definitions-graphql` ×5: uses `refType` and `buildTeamLocalTeamDefinitionId`, removed by 37d05c7f7 (flat orgs), so a rewrite to the flat model is needed → reported to owner; (c) `agent-package-private-skills` ×2: calls `bootstrapForCreate` without its guard (028cca231) and the now-private `createBackend` without its ownership hooks (54eaac53a) → reported to owner | Pass (no regression; 1 baseline fixed, 2 reported) | `api-e2e-evidence/reg-sibling-e2e.log`, `reg-agent-packages-graphql-fixed.log` | — |
| 14 | REG-002 | 2026-10-11 14:35 | Completed | AGY fixture coexistence: `agy-failure-cli-routing.test.ts`, `agy-native-tool-arguments-transport.e2e`, `ad-hoc-task-delegation.e2e` (gated) | pass | 17 + 4 + 3 pass | Pass | `api-e2e-evidence/reg-agy-fixture-coexistence.log` | — |
| 15 | DESK-* | 2026-10-11 14:37 | Started | `pnpm --silent isolated-app start --build` | instance ready | building | — | `api-e2e-evidence/desktop/` | — |
| 16 | DESK-002 | 2026-10-11 ~14:57 | Completed | instance `iso-53228-c43b`; editor writes on the package copy | badge on a broken definition, file and reason; Team usable with a nested break | Shared agent: card live in 1,048 ms; badge 691 ms ("File … agent-config.json; Reason: Invalid JSON …"); cleared 683 ms. **Nested `evidence-driven-delivery-team/validator` broken: Team listed and usable, backend `usingLastGood:true`, but no indicator on the Agents page (TEAM_LOCAL filtered), Teams list (notice filters usingLastGood) or Team detail** | Fail (nested) | `desktop/d02-*.png`, `d03-*.png` | APE-001 |
| 17 | DESK-001 | 2026-10-11 15:00–15:25 | Completed | Project Task Manager (Codex GPT-6.1-Sol) → Agent Package Creator copy (Codex) | create/edit/delete reach list, `@`, Teams page and delegation; Codex launch uses current | created: card 1.13 s after the creator's write; listed; Codex copy V1; Team copy poet/researcher. Edited/deleted: card gone 1.29 s; refusal `delegated:false`; copies V2; Team copy lead/analyst; old copy keeps V1; `@` menus current | Pass | `desktop/desktop-journey-receipt.json` | Codex turn stalled once (Stop + resend), observation |
| 18 | DESK-004, DESK-005 | 2026-10-11 15:32–15:33 | Completed | real Restart server button; package rename away/back | reconnect re-read; row states | new agent written while down is visible after reconnect (marker kept); "Folder not found" 818 ms (37 kept with issue); "Auto-refreshing" 717 ms | Pass | receipt; `desktop/d07-folder-not-found.png` | — |
| 19 | DESK-003 | 2026-10-11 15:33 | Completed | second GraphQL client creates an agent | desktop list updates | 449 ms, marker kept | Pass | receipt | — |
| 20 | MEAS-001 (desktop) | 2026-10-11 15:34 | Completed | `ps` cputime of the embedded server over 60 s | ~0 | 0.03 s / 60 s = 0.05 %; 442 fds | Pass | receipt | — |
| 21 | — | 2026-10-11 15:35 | Completed | `pnpm --silent isolated-app stop iso-53228-c43b`; `rm -rf /tmp/apar-desk` | owned resources removed | stopped (not forced), data root removed, both ports released; temp removed; `iso-63369-6c20` (not mine) untouched | Pass | console | — |
| 22 | — | 2026-10-11 15:40 | Completed | reconciliation | — | reconciled into the execution report | — | `api-e2e-execution-coverage-report.md` | — |

### Round 2 (API-REV-002, after CRR-004 / IR-003 / SR-008)

New case: DCF-E2E-009 (org-owned nodes on the Org's `catalogIssues`; REQ-007, REQ-009, DSN-003, DSN-004). Rechecked first: APE-001 (DESK-002 nested) and the org-owned desktop case (DESK-006).

| Sequence | Case ID | Timestamp | Event | Command / Entry Point / Material Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R2-1 | DCF-E2E-* | 2026-10-11 | Completed (run 1) | gated suite at `214836c83`, with the test moved to `catalogIssues` for Teams/Orgs, the nested Team assertion and DCF-E2E-009 | 9/9 | 8 pass. DCF-E2E-007: after 300 ms with nothing published, the tool listed the new agent but not the new Team | Fail (investigated) | `api-e2e-evidence/round2/dcf-e2e-run1.log` | probe |
| R2-2 | DCF-E2E-007 | 2026-10-11 | Checkpoint | 11 more full runs with a probe (removed afterwards); `apar-detection-tail-probe.mjs` (built monitor, 40 trials) | — | 11/11 pass, probe never triggered. Isolated detection: agent 4–23 ms, Team 5–23 ms, none over 300 ms. `settle()` flushes all pending units (code read). The miss is a rare slow detection of a new folder under load, inside REQ-018's scope and the QR-003 5 s bound | — | `round2/dcf-e2e-probe2-*.log`, `round2/apar-detection-tail-probe-output.json` | AC-016 asserted on the first-written agent; Team awaited within 5 s (AC-015) |
| R2-3 | DCF-E2E-001…009 | 2026-10-11 | Completed (×3 gated + ungated) | final test (commit `33d290187`) | 9/9 | 9/9 ×3; ungated 7 pass, 2 skipped | Pass | `round2/dcf-e2e-final-{1,2,3}.log`, `round2/dcf-final-*/…json`, `round2/dcf-e2e-ungated.log` | — |
| R2-4 | REPO-002…005 | 2026-10-11 | Started | typecheck → unit → integration (prepare) → web, sequential | baseline | running | — | `round2/*.log` | — |
| R2-5 | REPO-002…005 | 2026-10-11 | Completed | same | baseline | typecheck clean; unit 674 files pass (4 skipped); integration 72 pass, only the 2 documented `agent-status-websocket` cases fail; web 600 files / 4157 tests | Pass | `round2/{typecheck,server-unit,server-integration,web-nuxt}.log` | — |
| R2-6 | DESK-002 (APE-001 recheck) | 2026-10-11 | Completed | isolated instance `iso-58692-7f20` (worktree build at `33d290187`); broken team-local `validator` with the Teams page open | owning Team card badge with name, file and reason ≤ 5 s; clears after the fix | "Using last working version (1)": validator, file, reason, 1,344 ms; cleared 1,046 ms; Team listed; no reload | Pass | `round2/desktop/desktop-round2-receipt.json`, `r2-d01-team-card-nested-badge.png` | APE-001 resolved |
| R2-7 | DESK-006 (new, org-owned) | 2026-10-11 | Completed | Nested Classroom Test Org: break org-owned agent `teacher` and the local agent `student-one`, then the org-owned Team `team.md` | Org card lists each issue in path order ≤ 5 s; clears | (2) at 1,302 ms; (3) at 983 ms: Test Teacher → Student Study Group → Student One with file and reason; Org not unavailable; cleared 1,088 ms | Pass | receipt, `r2-d02-org-card-nested-badge.png` | — |
| R2-8 | DESK-002 shared / DESK-007 / DESK-001 | 2026-10-11 | Completed | shared agent badge; new invalid team-local folder; live Team add/remove | badges and live list | shared (1) at 865 ms, cleared; "Some members couldn't be loaded (1) · No working version" plus list notice, cleared; Team live 1,010 ms / gone 1,119 ms | Pass | receipt, `r2-d03-team-card-unusable-member.png` | — |
| R2-9 | — | 2026-10-11 | Completed | `pnpm --silent isolated-app stop iso-58692-7f20`; `rm -rf /tmp/apar-desk2` | owned resources removed | stopped (not forced), data root removed, both ports released; temp removed | Pass | console | — |

### Round 3 rehearsal (non-authoritative; user request 2026-10-12)

The user asked for a fully human-like desktop run with agents making the changes. Meanwhile CRR-006 (naming, Design Impact) had started the SR-009 public-contract rename, and the implementer's work is uncommitted and in flight in this worktree. So this ran as a rehearsal on the existing IR-003 build (`--from-worktree`, no build, working tree untouched). It is not an API-REV round.

| Sequence | Case ID | Timestamp | Event | Command / Entry Point / Material Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R3-R1 | HUMAN-001…012 | 2026-10-12 | Completed | instance `iso-62126-fb22`; clicks and typing only; APAR Package Breaker plus PTM → Agent Package Creator on real Codex; second client = phone-paired `/mobile` in a separate Chrome; whole run recorded | live lists, badges (team-local, org-owned), `@`, delegation, phone live update, restart/reconnect, Settings row | all pass; see receipt for timings (1.1–1.3 s live updates; phone 1.23 s; reconnect on both clients) | Pass (rehearsal) | `round3-rehearsal/rehearsal-receipt.json`, `round3-human-journey.mp4`, `r3-*.png`, `apar-ux-test-package/` | rerun the same journey on the IR-004 build when routed |

### Round 3 (API-REV-003, authoritative; IR-004 renamed contracts)

| Sequence | Case ID | Timestamp | Event | Command / Entry Point / Material Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R3-1 | DCF-E2E-001…010 | 2026-10-12 | Completed (×3 gated + ungated) | renamed E2E reviewed as a faithful rename; new DCF-E2E-010 (`705e699b1`) | 10/10 | 10/10 ×3; ungated 8 pass, 2 skipped; retired route HTTP 404; 7 retired GraphQL names rejected | Pass | `round3/apd-e2e-run{1,2,3}.log`, `round3/apd-run*/…json`, `round3/apd-e2e-ungated.log` | — |
| R3-2 | REPO-002…005, REG-001/002 | 2026-10-12 | Completed | typecheck → unit → integration → web → sibling E2E + AGY fixture | baseline | typecheck clean; unit 673 files; integration 72 (only the 2 documented cases fail); web 606 files; sibling: only the 7 known base failures (reported) | Pass | `round3/*.log` | — |
| R3-3 | HUMAN-001…012, N7-001 | 2026-10-12 | Completed | isolated instance `iso-53429-718d` built at `705e699b1`; human-like journey recorded; real Codex agents; phone-paired second client | as receipt | all pass (live 1.06–1.28 s; phone 1.09 s; Reload buttons publish the new frame; restart/reconnect both clients; Settings row; N-7 lists intact) | Pass | `round3/desktop/desktop-round3-receipt.json`, `round3-human-journey.mp4`, `r4-*.png` | — |
| R3-4 | — | 2026-10-12 | Completed | cleanup | owned resources removed | instance stopped, ports released, data removed; owned Chrome terminated; temp removed | Pass | console | — |

## Re-entry And Reconciliation

- Last durably recorded event: R3-4 (round 3)
- Last completed case and result: round 3: all Pass
- Cases still running, interrupted, or not started: none
- Next case or recovery action: none (proportional test-code review)
- Interruption, context-compression, or rerun note: round 3 was interrupted once by a session restart after H11. The instance was still running, so it resumed at H12.
- Reconciled into execution coverage report: `Yes` — round 3 section
