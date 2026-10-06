# API/E2E Test-Case Ledger

`<T>` = `/home/autobyteus/workspace/.codex/worktrees/standalone-collaborator-artifact-hydration/tickets/in-progress/standalone-collaborator-artifact-hydration`

## Ledger Meta

- Worktree: `/home/autobyteus/workspace/.codex/worktrees/standalone-collaborator-artifact-hydration`
- Coverage investigation: `<T>/api-e2e-coverage-investigation.md`
- Execution coverage report: `<T>/api-e2e-execution-coverage-report.md`
- API/E2E revision record: `<T>/api-e2e-revision-record.md`
- Scope: browser and live-API journeys on one owned stack, plus a source swap
- Last updated: 2026-10-06 (round 1)

## Planned Cases

| Case ID | Case / Journey | Requirement / AC IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| R-001 | changed + related web suites; pre-existing check on base | AC-001..AC-005 | Vitest | see investigation | 1 | — |
| B-001 | Active host, fresh load: collaborator Agent, collaborator-Team member, non-producing lead | AC-001 | Browser | `/chat?id=<host>` | 2 | — |
| API-001 | `getRunFileChanges` and `/file-change-content` for collaborator IDs (active and inactive host) | ASM-001 | Live API | curl | 3 | — |
| B-002 | Terminate host; fresh load; collaborators | AC-002 | Browser | `/workspace` → host row | 4 | — |
| M-001 | B-002 on base `autobyteus-web`, then restore | defect detection | Browser | `git checkout 0d3e6e82f -- autobyteus-web` | 5 | — |
| B-003 | Regression: standalone host (historical), Team member, Org nested member (active) | AC-004 | Browser | — | 6 | — |

## Execution Events

| Sequence | Case ID | Timestamp (UTC) | Event | Command / Entry Point / Material Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | setup | 09:4x | Checkpoint | restored the predecessor harness into `/tmp/scah-api` (`/tmp/cmah` scratch was gone); server built (exit 0); stack ports 36541/34609 | — | ready | N/A | `harness/` | `/tmp/scah` and `/tmp/scah-*.log` belong to the implementer and were not touched; the empty `/tmp/scah` dir my own `mkdir` created was removed |
| 2 | R-001 | — | Completed | changed + related suites | only pre-existing failures | 221/239; 18 fail (`teamTaskApprovalHydration`) | Pass | `web-specs.log` | base check at the end |
| 3 | fixtures | — | Checkpoint | host run + `SEND_MESSAGE` with `mentions` [Illustrator agent, Art Studio team] | collaborators admitted | ACK accepted; tree: `/illustrator`, `/art_studio` (`art_lead`, `painter`); turns via `/ws/agent-collaboration/<host>` → Illustrator 3 images (`0fd7034a`), painter 3 images (`ecc8db31`) | N/A | `browser/main-agy-launches.jsonl` | — |
| 4 | API-001 (active) | — | Completed | `getRunFileChanges` for illustrator, painter, art_lead | 3, 3, 0 | 3, 3, 0 | Pass | console (report) | — |
| 5 | B-001 | — | Completed | fresh load `/chat?id=host_planner_8354…`; select illustrator, painter, art lead | 3/3, 3/3, empty | illustrator 3/3 (`0fd7034a`); painter 3/3 (`ecc8db31`); art lead "No touched files yet" | Pass | `browser/ac001-active-collaborator-team-painter.png` | — |
| 6 | API-001 (inactive) | — | Completed | `terminateAgentRun(host)`; host `isActive: false`; list 3/3; REST painter ×3 | 200 | lists 3 and 3; REST 200 image/png ×3 | Pass | console | ASM-001 holds |
| 7 | B-002 | — | Completed | fresh load → Host Planner row → illustrator, painter | 3/3 each | Offline; 3/3 (`0fd7034a`), 3/3 (`ecc8db31`) | Pass | `browser/ac002-historical-collaborator-team-painter.png` | — |
| 8 | M-001 | — | Completed | `git checkout 0d3e6e82f -- autobyteus-web` (8 files) → fresh load → same journey | empty (defect) | both 0 rows, "No touched files yet" | Pass (defect detected) | DOM | restore |
| 9 | M-001 | — | Completed | `git checkout HEAD -- autobyteus-web` (0 diff) → same journey | 3/3 | 3, 3 | Pass | DOM | — |
| 10 | B-003 | — | Completed | host (standalone, historical); fixtures `r`: Team `/creator`, Org `/eng/creator` (`mode=active`) | 3/3 each | host 3/3 (`cdd6d07f`); Team creator 3/3 (`7e082f81`); Org nested 3/3 (`e597f899`) | Pass | DOM | — |
| 11 | cleanup | — | Completed | tab closed; launcher SIGTERM by exact PID | owned processes/dirs gone | `CLEANED /tmp/scah-browser-main-XxUa4M`; 0 content-route warnings; user server untouched | N/A | `browser/main-backend.log` | — |
| 12 | R-001 (base) | — | Completed | `teamTaskApprovalHydration.spec.ts` on base `0d3e6e82f`, restored (0 diff) | fails on base | 18/18 fail | Pass (pre-existing) | `web-base-preexisting.log` | — |

## Re-entry And Reconciliation

- Last durably recorded event: 12
- Last completed case and result: R-001 (base), Pass
- Cases not started or interrupted: none
- Reconciled into execution report: `Yes`
