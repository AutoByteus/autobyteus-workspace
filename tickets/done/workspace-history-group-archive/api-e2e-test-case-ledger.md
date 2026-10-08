# API/E2E Test-Case Ledger — `workspace-history-group-archive`

## Ledger Meta

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-history-group-archive`
- Coverage investigation: `tickets/in-progress/workspace-history-group-archive/api-e2e-coverage-investigation.md`
- Execution coverage report: `tickets/in-progress/workspace-history-group-archive/api-e2e-execution-coverage-report.md`
- API/E2E revision record: `tickets/in-progress/workspace-history-group-archive/api-e2e-revision-record.md`
- Ledger scope and reason: several independent server E2E cases, repository suites and a long-running isolated desktop journey (build + live runs) with interruption risk.
- Last updated: 2026-10-08

## Planned Cases

| Case ID | Case / Journey | Requirement / AC IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| API-001 | Group archive >6 runs, scoping, canonical root, files kept, listing | REQ-002, AC-002, BEH-003 | Server GraphQL E2E | `vitest run tests/e2e/workspaces/archive-run-history-graphql.e2e.test.ts` | 1 | durable |
| API-002 | Live run (visible + hidden) → `activeRunIds`, nothing archived; stopped → all archived | REQ-004 rev, AC-005 rev, AC-008 rev | Server GraphQL E2E | same | 1 | durable |
| API-003 | AC-010 per-run guard refusal → `failedRunIds` | AC-010 | Server GraphQL E2E | same | 1 | durable |
| API-004 | Empty inputs → GraphQL error, nothing written | design interface | Server GraphQL E2E | same | 1 | durable |
| REPO-01 | Broader server suites | AC-009 | Vitest | see investigation order 2 | 2 | |
| REPO-02 | Web targeted + full suite + guards | AC-001..009, QR-001..003 | Vitest/guards | see investigation orders 3–5 | 3 | |
| LIVE-01 | Agent group with a live run → blocked toast, no dialog; stop → Archive all → all archived (incl. hidden) | AC-005 rev, AC-008 rev, AC-002 | Isolated desktop instance | browser-automation | 4 | temporary |
| LIVE-02 | Team group with a live run → blocked | AC-005 rev (team) | Isolated desktop instance | browser-automation | 5 | temporary |
| LIVE-03 | Org group with a live run → blocked | AC-005 rev (org) | Isolated desktop instance | browser-automation | 6 | temporary |
| LIVE-04 | Open run of the group → selection cleared after Archive all | AC-007 | Isolated desktop instance | browser-automation | 7 | temporary |
| LIVE-05 | zh-CN dialog + toasts | QR-003 (zh-CN) | Isolated desktop instance | browser-automation | 8 | temporary |
| LIVE-06 | Per-run archive still works | AC-009 | Isolated desktop instance | browser-automation | 9 | temporary |

## Execution Events

| Sequence | Case ID | Timestamp | Event | Command / Entry Point / Material Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | API-001..004 | 2026-10-08 07:00 | Completed | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/workspaces/archive-run-history-graphql.e2e.test.ts --no-watch` | 4 new cases pass; 2 existing pass | 6/6 pass after harness fixes (schema built once; resolver services delegate to the current test). Mutation checks: removing all-or-nothing → API-002 fails; removing input canonicalization → API-001 fails | Pass | test file | — |
| 2 | REPO-01 | 2026-10-08 07:08 | Completed | `vitest run tests/unit/run-history tests/integration/run-history tests/e2e/workspaces tests/unit/api/graphql` | No new failures | 328 pass / 11 fail — the same 11 pre-existing failures named in the implementation handoff | Pass (no regression) | `api-e2e-evidence/repo-01-server-broader.log` | baseline failures → report (TESTING rule 9) |
| 3 | REPO-02 | 2026-10-08 07:12 | Completed | `pnpm -C autobyteus-web test:nuxt --run` | No new failures | 3950 pass / 10 fail (all `TokenUsageMeterPanel.spec.ts`, host-locale, pre-existing) | Pass (no regression) | `api-e2e-evidence/repo-02-web-full.log` | — |
| 4 | LIVE-01 | 2026-10-08 07:20 | Checkpoint | isolated instance `iso-55378-bafd` (`--from-worktree`, fake AGY via data-root `.env`), seed `live-seed.mjs` | — | Seeded: agent A 8 stopped + 1 live (oldest, beyond cap); Keeper 1 stopped + 1 live; Bridge Team 1+1; Delivery Org 1+1. No AGY process spawned (no messages) | — | `api-e2e-evidence/live-seed.json` | — |
| 5 | LIVE-01 | 2026-10-08 07:24 | Checkpoint | Click Archive all on "Archive Group Agent" (live run beyond cap shown as a `local` row, `isActive:false`) → dialog → Cancel; then confirm | Hidden live run: client pre-check cannot see it; server re-check refuses (REQ-004 rev) | Dialog "Archive Group Agent — all runs will be hidden from history."; Cancel → nothing; Confirm → toast "Stop running runs first."; `run_history_index.json` SHA unchanged; group still (7) | Pass | `live-01a-agent-blocked.png` (dialog), `live-01b-agent-hidden-live-server-blocked.png` | visible-live case next |
| 6 | LIVE-01/02/03 | 2026-10-08 07:30 | Completed | Click Archive all on Keeper Agent (visible live run), Bridge Team (live run), Delivery Org (live run) | Toast "Stop running runs first.", no dialog, nothing archived | All three: toast seen, no dialog | Pass | `live-03-org-blocked.png`, `blocked-check.js` | — |
| 7 | LIVE-01/04 | 2026-10-08 07:36 | Completed | Stop A's live run (GraphQL terminate); open A's run `…6dd84d` (`#/chat?id=…`); Archive all → confirm | All 9 stored runs archived (incl. the formerly hidden one); open run handled like per-run archive | Dialog agent text; toast "Archived 9 runs."; header gone; server index 9/9 `archivedAt`, 9 run dirs kept. Route stays on the archived run and its view re-hydrates (`local` row) — same as per-run archive (seq 8) | Pass | `live-04a-agent-run-open.png`, `live-04b-agent-group-archived-open-run.png`, `live-index-after-agent-archives.json` | pre-existing open-run behaviour → observation |
| 8 | LIVE-06 | 2026-10-08 07:42 | Completed | Open Keeper stopped run; per-run row Archive | "Run archived."; Keeper live run untouched | Toast "Run archived."; index: stopped archived, live not; route/selection/context end state identical to seq 7 | Pass | `live-06-per-run-archive-open-run.png` | — |
| 9 | LIVE-02 | 2026-10-08 07:45 | Completed | Stop team live run; Archive all on Bridge Team → confirm | Counted dialog; "Archived 2 runs."; group gone | "Bridge Team · 2 runs will be hidden from history."; "Archived 2 runs."; header gone; team index 2/2 archived, dirs kept | Pass | `live-02b-team-archived.png` | — |
| 10 | LIVE-03 | 2026-10-08 07:48 | Completed | Stop org live run; open Org run route; Archive all → confirm | Counted dialog; toast; route leaves archived Org | "Delivery Org · 2 runs will be hidden from history."; "Archived 2 runs."; `#/workspace?rootSubjectKind=agent_org…` → `#/workspace`; org index 2/2 archived, dirs kept | Pass | `live-03b-org-archived-route-left.png` | — |
| 11 | LIVE-05 | 2026-10-08 07:55 | Completed | Settings → Language → Simplified Chinese; Keeper live → click; stop; click → confirm 全部归档 | zh-CN label, blocked toast, dialog, success toast | Label "全部归档"; toast "请先停止正在运行的运行。" (no dialog); dialog "全部归档？" / "Keeper Agent — 所有运行将从历史记录中隐藏。"; toast "已归档 1 个运行。"; server listing empty | Pass | `live-05a-zh-blocked.png`, `live-05b-zh-archived.png` | — |
| 12 | cleanup | 2026-10-08 07:57 | Completed | `isolated-app stop iso-55378-bafd`; rm temp workspace | No owned instance/data left | `dataRootRemoved: true`; `isolated-app list` → none; `/tmp/wsga-live-*` removed; fake AGY never spawned (no argv log) | Pass | — | — |
| 13 | REPO-03 | 2026-10-08 08:20 | Checkpoint | Baseline fixes (TESTING rule 9): 7 server test files + `TokenUsageMeterPanel.spec.ts` | Previously failing tests pass | Each fixed file passes in isolation; broader reruns in progress | — | `repo-0*-after-baseline-fixes.log` | reconcile |
| 14 | REPO-03 | 2026-10-08 08:40 | Completed | Reruns: server affected suites; `pnpm -C autobyteus-web test:nuxt --run` | 0 failures | Server 343/343 (73 files); web 3960 pass / 0 fail / 3 skipped (585 files). Commits `85d2ec346`, `dc70e7f44` | Pass | `repo-01-server-broader-after-baseline-fixes.log`, `repo-02-web-full-after-baseline-fixes.log` | — |

## Re-entry And Reconciliation

- Last durably recorded event: 14 (REPO-03 completed)
- Last completed case and result: REPO-03 — Pass
- Cases still running, interrupted, or not started: none
- Next case or recovery action: none (round complete)
- Interruption note: none
- Reconciled into execution coverage report: `Yes` — `api-e2e-execution-coverage-report.md`, "Test-Case Ledger Reconciliation"
- Reconciliation note: every planned case has a terminal result
