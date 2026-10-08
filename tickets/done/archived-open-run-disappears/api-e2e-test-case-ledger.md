# API/E2E Test-Case Ledger

## Ledger Meta

- Assigned task workspace / worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/archived-open-run-disappears` (HEAD `fd5f32ba5` + API/E2E test addition)
- Coverage investigation: `api-e2e-coverage-investigation.md` (same folder)
- Execution coverage report: `api-e2e-execution-coverage-report.md` (same folder)
- API/E2E revision record: `api-e2e-revision-record.md` (same folder)
- Ledger scope and reason it is required: several independent live desktop journeys with an app restart in the middle; interruption risk.
- Last updated: 2026-10-08

## Planned Cases

| Case ID | Case / Journey | Requirement / Acceptance-Criteria IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| REPO-01 | Changed/new web specs | AC-001..AC-009 (logic) | Vitest (Nuxt) | `pnpm -C autobyteus-web test:nuxt <5 paths> --run` | 1 | |
| REPO-02 | API-001 server resume-config contract | REQ-008, AC-008 | Vitest (server) | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/run-history/services/agent-run-resume-config-service.test.ts --no-watch` | 2 | new durable test |
| REPO-03 | Full web renderer suite | regression | Vitest (Nuxt) | `pnpm -C autobyteus-web test:nuxt --run` | 3 | |
| REPO-04 | Server run-history unit + archive GraphQL e2e | regression | Vitest (server) | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/run-history tests/e2e/workspaces/archive-run-history-graphql.e2e.test.ts --no-watch` | 4 | |
| REPO-05 | Web boundary guard | design dependency rules | script | `pnpm -C autobyteus-web guard:web-boundary` | 5 | |
| LIVE-01 | Agent run open in Chat, Keeper loaded → row Archive | AC-001, AC-007, REQ-006 | Isolated desktop | sidebar row archive | 6 | |
| LIVE-02 | Agent run open → agent group "Archive all" | AC-002 | Isolated desktop | group header archive + confirm | 7 | |
| LIVE-03 | Team view open, other team loaded → row archive | AC-003 | Isolated desktop | team row archive | 8 | UNK-001 |
| LIVE-04 | Member view open → team "Archive all" | AC-003 | Isolated desktop | group header archive + confirm | 9 | |
| LIVE-05 | Agent run open → Delete; team member view open → Delete; team view open → Delete | AC-009 | Isolated desktop | row delete + in-page confirm | 10 | |
| LIVE-06 | Org open → per-run Archive; Org open → Delete | AC-004, AC-009 | Isolated desktop | Org row actions | 11 | Org delete not exercised by implementation |
| LIVE-07 | Running agent/team/Org: archive refused | AC-006 | Isolated desktop | row actions / group header | 12 | not exercised live by implementation |
| LIVE-08 | Stale `#/chat?id=<archived>` address | AC-008, REQ-008 | Isolated desktop + GraphQL resume config | navigate hash | 13 | |
| LIVE-09 | Window reload, then app restart | AC-005 | Isolated desktop + `isolated-app restart` | reload / restart | 14 | |
| LIVE-10 | Draft discard on `/chat?id=temp-*` while stored run loaded | SCN-A1 (design risk RSK-001) | Isolated desktop | draft row × | 15 | |

## Execution Events

| Sequence | Case ID | Timestamp | Event | Command / Entry Point / Material Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | REPO-01 | 2026-10-08 16:02 | Completed | see plan | all pass | 9 files, 68 tests passed | Pass | console | — |
| 2 | REPO-02 | 2026-10-08 16:04 | Completed | see plan | 2 pass | 2 passed | Pass | console | — |
| 3 | REPO-03 | 16:13 | Completed | full web suite | green | 587 files passed, 2 skipped; 3985 tests | Pass | api-e2e-evidence/web-full-suite.log | — |
| 4 | REPO-04 | 16:10 | Completed | server run-history + archive e2e | green | 1 fail: `agent-run-history-catalog-service.test.ts` timeout (5 s), fails alone too, independent of this change | Fail (baseline) | server-run-history.log (first run) | find cause (TESTING rule 9) |
| 5 | REPO-04 | 16:20 | Completed | same, after baseline test fix (stub `collaborationRoots`) | green | 47 files, 233 tests passed; catalog file 1.4 s (was 21 s with 60 s timeout) | Pass | api-e2e-evidence/server-run-history.log | baseline fix commit |
| 6 | REPO-05 | 16:06 | Completed | guard:web-boundary | pass | Passed | Pass | api-e2e-evidence/guard-web-boundary.log | — |
| 7 | LIVE-01 | 16:31 | Completed | iso-60534-519f; Keeper loaded, Open Agent run `c808…` open in Chat → row "Archive run" | toast, empty view, row gone, Keeper not selected, no local row | Toast "Run archived."; first 50 ms sample already `#/workspace|EMPTY` (no missing/opening/run-frame flash); contexts: live + keeper only; selection null; rows: keeper + 4 open; local 0 | Pass | live-01-action.json, live-01-state.txt, live-01b-agent-archived.png | — |
| 8 | LIVE-01 (AC-007) | 16:32 | Completed | Keeper open → archive Open Agent run `33f9…` | Keeper stays open, `33f9…` gone | Toast; route stayed `#/chat?id=keeper…` run frame throughout; selection keeper; row gone | Pass | live-01c-other-run-action.json, live-01c-state.txt | — |
| 9 | LIVE-05 (agent) | 16:34 | Completed | `25175…` open → "Delete run permanently" → first Cancel (nothing changed), then Delete | empty view, no "chat not found", no jump | Cancel: run stayed open/listed. Delete: toast "Run deleted permanently."; `#/workspace|EMPTY` from first sample; chat-missing never shown; Keeper not selected | Pass | live-05a-agent-delete-action.json, live-05a-state.txt, live-05a-agent-deleted.png | — |
| 10 | LIVE-02 | 16:36 | Completed | `cad4…` open → Open Agent "Archive all" → confirm | empty view, whole group gone | Dialog "Archive all runs? Open Agent — all runs will be hidden from history."; toast "Archived 2 runs."; `#/workspace|EMPTY`; only Keeper row left; no local row | Pass | live-02-action.json, live-02-state.txt, live-02-agent-archive-all.png | — |
| 11 | LIVE-03 | 16:40 | Completed | Bridge team view `eaec…` open, 6 other teams loaded → row "Archive team history" | empty view, no other team selected | "Team history archived."; empty view; selection null; 6 other team contexts kept | Pass | live-03-* | UNK-001 closed |
| 12 | LIVE-05 (team view) | 16:41 | Completed | `0835…` team view → "Delete team history permanently" → Delete | same | "Team history deleted permanently."; empty view; selection null | Pass | live-05b-* | — |
| 13 | LIVE-05 (member view) | 16:45 | Completed | `/lead` of `3a81…` → Delete → confirm | same | "Team history deleted permanently."; empty view; selection null | Pass | live-05c-* | — |
| 14 | LIVE-04 | 16:46 | Completed | `/lead` of `53b9…` open → Bridge Team "Archive all" | empty view, group gone | "Archived 2 runs."; empty view; Live/Other Team loaded, not selected | Pass | live-04-* | — |
| 15 | LIVE-06 | 16:48 | Completed | Org open → Archive; Org open → Delete; Org open → group Archive all | `#/workspace` empty | three toasts; empty view each time | Pass | live-06* | — |
| 16 | LIVE-07 | 16:52 | Completed | running Agent (fresh run, the seeded one went offline by itself) / Team / Org | refusal | Agent row: only Terminate; Team/Org rows: no archive/delete; all group headers "Stop running runs first."; server `archivedAt:null` | Pass | live-07* | — |
| 17 | LIVE-08 | 16:54 | Completed | GraphQL resume config + `#/chat?id=<archived>`; also a deleted id | `RUN_ARCHIVED`; empty view; deleted → "chat not found" | as expected; `#/workspace` after ~26 ms; no context | Pass | live-08* | — |
| 18 | LIVE-09 (reload) | 16:57 | Completed | `#/chat?id=<archived>` + `location.reload()` | empty view, no archived rows | as expected; no archived ids in the DOM | Pass | live-09a-* | — |
| 19 | LIVE-09 (restart) | 16:59 | Completed | `isolated-app restart` + sidebar + 2 stale archived addresses on the cold process | archived absent; empty view | start route `#/chat` (default); only non-archived groups; stale → `#/workspace`, no context | Pass | live-09b-*, live-08c-* | — |
| 20 | LIVE-10 | 16:56 | Completed | "New run with this agent" (Keeper) | `temp-*` draft row to discard | no `temp-*` row is created on desktop outside a first send; cannot be produced through a simple real trigger | Not Tested | live-10-new-run-no-temp-draft.* | covered by chat.spec |

## Re-entry And Reconciliation

- Last durably recorded event: 20
- Last completed case and result: LIVE-09 Pass (LIVE-10 Not Tested)
- Cases still running, interrupted, or not started: none
- Next case or recovery action: none
- Interruption, context-compression, or rerun note: —
- Reconciled into execution coverage report: `Yes` — `api-e2e-execution-coverage-report.md` → Test-Case Ledger Reconciliation
- Reconciliation note for any case missing a terminal result: none
