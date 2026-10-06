# API/E2E Test-Case Ledger

`<T>` = `/home/autobyteus/workspace/.codex/worktrees/collaboration-member-artifact-hydration/tickets/in-progress/collaboration-member-artifact-hydration`

## Ledger Meta

- Assigned worktree: `/home/autobyteus/workspace/.codex/worktrees/collaboration-member-artifact-hydration`
- Coverage investigation: `<T>/api-e2e-coverage-investigation.md`
- Execution coverage report: `<T>/api-e2e-execution-coverage-report.md`
- API/E2E revision record: `<T>/api-e2e-revision-record.md`
- Scope: multiple browser journeys on one owned stack plus a temporary source swap
- Last updated: 2026-10-06 (round 1)

## Planned Cases

| Case ID | Case / Journey | Requirement / AC IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| R-001 | 17 changed web specs | AC-001..AC-007 | Vitest | `test:nuxt <specs> --run` | 1 | — |
| B-001 | Active Team, fresh load, select non-coordinator `creator` | AC-001 | Browser | Team `b` | 2 | — |
| B-002 | Coordinator `lead` shows no artifacts | RU-001 | Browser | Team `b` | 3 | — |
| B-003 | Active Org, fresh load, `/designer` and nested `/eng/creator` | AC-003 | Browser | Org `b` | 4 | — |
| B-004 | Standalone fresh load | AC-006 | Browser | standalone `b` | 5 | — |
| B-005 | Reload while a gated member's images are released near the open | AC-005 / SCN-005 (best effort) | Browser | Team `c` | 6 | — |
| B-006 | Member hydrated mid-turn; images arrive live while it is displayed | REQ-003 / RU-002 | Browser | Team `d` | 7 | — |
| B-007 | Historical Team, fresh load, `creator` | AC-002 | Browser | Team `b` terminated | 8 | — |
| B-008 | Historical Org, fresh load, `/designer` and `/eng/creator` | AC-004 | Browser | Org `b` terminated | 9 | — |
| M-001 | B-007/B-008 against base `autobyteus-web` | defect detection | Browser | `git checkout db39803d4 -- autobyteus-web`, then restore | 10 | temporary |

## Execution Events

| Sequence | Case ID | Timestamp (UTC) | Event | Command / Entry Point / Material Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | R-001 | 08:01 | Completed | 17 specs | pass except the known pre-existing case | 227/228 | Pass | `web-changed-specs.log` | — |
| 2 | setup | 08:05 | Checkpoint | stack ports 35065/34871; fixtures `a` failed (Org `llmConfig: {}` rejected; stray Team `a` terminated), fixtures `b` created | — | Team `b` creator, Org `b` designer, `/eng/creator`, standalone: 3 images each, `available` | N/A | `harness/setup.py`, `browser/main-agy-launches.jsonl` | first Org sends used the Team command shape (rejected, `AGENT_ORG_COMMAND_INVALID`); fixed the harness to the web client's Org shape |
| 3 | B-001 | 08:07 | Completed | fresh load → Content Team b → creator → Artifacts | 3 listed, 3 previews | 3 listed; 3/3 blob, 64 px, conversation `2a24c09e` (creator's own); no "File not found" | Pass | `browser/ac001-team-active-reload-creator.png` | — |
| 4 | B-002 | 08:07 | Completed | select `lead` | no rows | "No touched files yet" | Pass | DOM | — |
| 5 | B-003 | 08:08 | Completed | fresh load → Studio Org b → designer; expand `eng` → creator | 3+3 listed and previewed | designer: 3/3 (`8069ad62`); `/eng/creator`: 3/3 (`d45671f8`); URL `mode=active&memberAddress=/eng/creator` | Pass | `browser/ac003-org-active-reload-eng-creator.png` | — |
| 6 | B-004 | 08:09 | Completed | standalone `/chat?id=creator_b_3039…` fresh load | 3 listed, previews | 3/3 (`86cacb0b`) | Pass | DOM | — |
| 7 | B-005 | 08:12 | Completed | Team `c` gated; image 1 recorded; reload ×2 with background release of image 2 (−4 s vs open) and image 3 (−367 ms vs open; first list render +108 ms after the open click) | complete, no duplicates, latest status | after each reload: correct rows (1–2, then 1–3), no duplicates, Idle at end | Pass (near-concurrent, not a provable in-flight interleave) | `browser/send-c.out`, DOM timeline | exact interleave stays unit-proven |
| 8 | B-006 | 08:15 | Completed | Team `d` gated; fresh load; creator hydrated with image 1 while Running; release images 2, 3 | rows grow live, no duplicates | timeline: `1` → `2,1` → `3,2,1`; 3/3 preview (`96290533`); turn completed | Pass | `browser/send-d.out`, DOM timeline | — |
| 9 | B-007 | 08:17 | Completed | terminate Team `b` (server: inactive, 3 entries); fresh load; creator | 3 listed, previews | Offline; 3/3 (`2a24c09e`) | Pass | `browser/ac002-team-historical-creator.png` | — |
| 10 | B-008 | 08:18 | Completed | terminate Org `b` (inactive, 3+3 entries); fresh load; designer, `/eng/creator` | 3+3 | Offline; designer 3/3, `/eng/creator` 3/3; URL `mode=history` | Pass | `browser/ac004-org-historical-eng-creator.png` | — |
| 11 | logs | 08:18 | Checkpoint | backend log | no content-route errors | 0 `file-change-content` warnings | N/A | `browser/main-backend.log` | — |
| 12 | M-001 | 08:20 | Completed | base `autobyteus-web` hot-reloaded; repeat B-007 and the B-008 nested member | empty (defect) | both "No touched files yet", 0 rows | Pass (defect detected) | DOM | restore |
| 13 | M-001 | 08:21 | Completed | `git checkout HEAD -- autobyteus-web`; 0 diff vs HEAD; repeat B-007 | 3 rows | 3 rows | Pass | DOM | — |
| 14 | cleanup | 08:22 | Completed | launcher SIGTERM by PID; tab closed | owned processes/dirs gone | `CLEANED /tmp/cmah-browser-main-PvRbmp`; user server `:8000` untouched | N/A | — | — |

## Re-entry And Reconciliation

- Last durably recorded event: 14
- Last completed case and result: M-001, Pass
- Cases still running, interrupted, or not started: none
- Next action: none
- Interruption note: none
- Reconciled into execution report: `Yes` (§ Test-Case Ledger Reconciliation)
- Missing terminal results: none
