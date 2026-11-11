# Docs Sync Report — autobyteus-452

## Scope

- Ticket: autobyteus-452. An open workspace file refreshes by itself when it changes on disk, on the desktop and the phone (450's FU-001).
- Trigger: delivery DR-001, after API/E2E's Pass (API-REV-001). Direct route (Medium / Low).
- Bootstrap base reference: `origin/personal` before autobyteus-471.
- Integrated base reference used for docs sync: `origin/personal` `ed481ae4ca`, merged by API/E2E as `2da34f6644`. The branch was current at delivery.
- Post-integration verification reference: `api-e2e-execution-coverage-report.md` (all runs on the merge) and `release-deployment-report.md`.

## Why Docs Were Updated

- Summary:
  - The node now sends `modify` with the file's path for every file change, add and move, whatever its tree has loaded.
  - The window reloads an open file on `modify`.
  - autobyteus-450 had documented the opposite: "a viewer that is left open does not refresh by itself".
- Why this should live in long-lived project docs:
  - The event rule is a contract between the node and every client.
  - "Ignore paths that are not open" is what keeps bursts cheap.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/file_explorer.md` | Reopen rules and the live stream | Updated | Stale sentence corrected; new "Open Files Follow The Disk" |
| `autobyteus-server-ts/docs/modules/file_explorer.md` | Watcher and stream contract | Updated | New "Content-change events (`modify`)" |
| `autobyteus-web/docs/remote_access.md` | Phone files | Updated | An open workspace file refreshes on the phone; node files by absolute path do not |
| `DESIGN.md` | Project design rules | No change | No new rule |
| `TESTING.md` | Testing guideline | No change | The five baseline test fixes are test corrections; no rule changed |
| `RELEASE.md` | Release guide | No change | Its steps matched |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/file_explorer.md` | Correction and addition | Open workspace files refresh while the live stream is open. The node's `modify` on change, add and move; the window: own-save mark, then `_reloadOpenFile` for an open path, else nothing; burst behavior | New behavior; a stale statement removed |
| `autobyteus-server-ts/docs/modules/file_explorer.md` | Addition | The `modify` event rule in `watchdog-handler` | Stream contract |
| `autobyteus-web/docs/remote_access.md` | Addition | The phone's open file refreshes | User-visible phone behavior |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Path-based `modify` | Content refresh no longer depends on the tree having the node. An atomic rewrite arrives as a move | `design-spec.md` DS-001; `watchdog-handler.ts` | both `file_explorer.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| "A viewer left open does not refresh by itself" (450) | Open workspace files follow the disk | `autobyteus-web/docs/file_explorer.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, then finalization.
