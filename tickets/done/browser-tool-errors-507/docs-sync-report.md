# Docs Sync Report — browser-tool-errors-507

## Scope

- Ticket: `browser-tool-errors-507` (Project Task `autobyteus-507`), delivery revision `DR-001`
- Trigger: API/E2E validation passed (`API-REV-001`, direct low-risk route: `task_size` Small, `architectural_risk` Low; review gates `Not Applicable`)
- Bootstrap base reference: `origin/personal` at `e4f4b3e1765669cf2c411652770199234ff6c214`
- Integrated base reference used for docs sync: `origin/personal` at `d8dbeaa9ba892b53241a7b101e509de96950db91`, merged into the ticket branch as `a53b93db9c` (merge commit, no conflicts)
- Post-integration verification reference: `a53b93db9c`; checks in `evidence/delivery/` (see the release/deployment report)

## Why Docs Were Updated

- Summary: the change makes a screenshot of a tab that is not shown on screen work (bounded retry with a view nudge; the shell window holds its Browser view only while visible and not minimized), renames two desktop tab error codes (`browser_session_not_found` → `browser_tab_not_found`, `browser_session_closed` → `browser_tab_closed`) and makes the server pass `browser_screenshot_failed` through. The Browser desktop-shell design doc must describe this behavior, the codes and the one known limit.
- Why this should live in long-lived project docs: `autobyteus-web/docs/browser_sessions.md` is the contract for tab capture, the shell window's view ownership and the tab error codes; a later change to capture or to window projection reads it first.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/browser_sessions.md` | Owns the screenshot artifact contract, shell lease model and tab error behavior | Updated | Implementation (`927079c6cd`) wrote the capture-of-hidden-tab section, the window rule and the error codes; delivery added the one known limit (a `capturePage()` that never answers is not cut off: FU-004), so the doc does not over-claim the 2 s bound |
| `DESIGN.md` | Project-level design rules; checked for a rule or design case this change teaches | No change | The change adds no new owner, API or convention. The clean cut for the renamed codes is rule 9, already there. No browser section exists in its index of design documents, and the area contract is `browser_sessions.md` |
| `TESTING.md` | Test layers and rules; checked for a command or rule the ticket changed or a discrepancy its reports recorded | No change | The ticket's tests run on existing layers (`pnpm -C autobyteus-web test:electron`, server unit). The discrepancies recorded (FU-004, FU-005) are follow-ups, not wrong rules: the Electron spec's lock-state dependence is stated in `browser_sessions.md` |
| `RELEASE.md` | Release guide; read before finalization | No change | No release step changed; delivery followed it (finalize branch, Secret Gate, `--no-ff` merge). No deviation, no proposed fix |
| `autobyteus-server-ts/docs/modules/agent_tools.md`, `agent_tools_mcp_server.md`, `agent_execution.md`, `codex_integration.md`, `codex_raw_event_mapping.md`, `mcp_gateway.md` | They mention browser tools | No change | They describe browser tool exposure and result normalization, not error codes or capture. `git grep` for the old and new codes outside `tickets/` finds them only in code, tests and `browser_sessions.md` |
| Old-code sweep | REQ-004 clean cut | No change needed | `git grep -n -E "browser_session_(not_found|closed)" -- ':!tickets'` → exit 1 (no match), on the integrated state |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/browser_sessions.md` (by implementation, `927079c6cd`) | Behavior contract | Screenshot section: why a tab not shown cannot be captured at first, the attempt loop (nudge the view 1 px wider and back, wait 100 ms, 2 s limit, `browser_screenshot_failed` with the last reason, no artifact), full-page uses the same attempts; tab error codes and server pass-through; `WorkspaceShellWindow` holds its view only while the window is visible and not minimized | Final implemented behavior |
| `autobyteus-web/docs/browser_sessions.md` (by delivery) | Known limit | Added: the 2 s limit is checked after each attempt answers; a capture Chromium never answers is not cut off (seen only for an app hidden while the macOS screen was locked); the Electron spec has no app-hidden case because it depends on the lock state | The validated evidence (E2E-03 run 1, E2E-08, E2E-09) shows the bound is not absolute; the doc must not say otherwise |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Why a tab not shown cannot be captured | Chromium copies only a drawn frame; a tab that is not shown stops drawing; a 1 px resize of the view makes it draw, moving it does not | `investigation-notes.md`, `design-spec.md` (DS-002) | `autobyteus-web/docs/browser_sessions.md` |
| Window rule | A minimized or hidden window cannot draw even after the resize, so the shell window detaches its Browser view then and attaches the selected view again on restore/show | `design-spec.md` (DS-003) | `autobyteus-web/docs/browser_sessions.md` (screenshot section and Shell Lease Model) |
| Tab error vocabulary | `browser_tab_not_found`, `browser_tab_closed`, `browser_screenshot_failed` reach the agent unchanged | `requirements-doc.md` (REQ-003, REQ-004) | `autobyteus-web/docs/browser_sessions.md` |
| Unbounded capture risk | A capture Chromium never answers is not cut off | `follow-ups.md` FU-004 | `autobyteus-web/docs/browser_sessions.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Desktop tab error codes `browser_session_not_found`, `browser_session_closed` (the server relabelled them `browser_bridge_unavailable`) | `browser_tab_not_found`, `browser_tab_closed`, accepted by the server's tool contract | `autobyteus-web/docs/browser_sessions.md` (error paragraph below the screenshot section) |
| A capture failure reported as `browser_navigation_failed` (`UnknownVizError`) | A retry that makes the capture work, then `browser_screenshot_failed` with the reason | `autobyteus-web/docs/browser_sessions.md` |
| Browser view held by the shell window while the window is minimized or hidden | Held only while the window is visible and not minimized | `autobyteus-web/docs/browser_sessions.md` (Shell Lease Model bullet) |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: finish the post-integration checks on `a53b93db9c`, write the handoff summary, move the ticket to `tickets/done/`, finalize (Secret Gate, finalize branch, `--no-ff` merge, push), then bring the user's checkout up to date and clean up.
- Notes: problems found outside this ticket are `FU-001`..`FU-005` in `follow-ups.md`; the Solution Designer sends them when the ticket leaves the team. FU-004 is cited in the docs above as a known limit, not fixed here.
