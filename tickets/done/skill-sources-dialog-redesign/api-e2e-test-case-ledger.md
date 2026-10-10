# API/E2E Test-Case Ledger — skill-sources-dialog-redesign

## Ledger Meta

- Assigned task workspace / worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-sources-dialog-redesign`
- Coverage investigation: `api-e2e-coverage-investigation.md`
- Execution coverage report: `api-e2e-execution-coverage-report.md`
- API/E2E revision record: `api-e2e-revision-record.md`
- Ledger scope and reason it is required: 8 probe cases plus 13 browser journey cases, each independently meaningful
- Last updated: 2026-10-10 (round 2)

Evidence paths are relative to `tickets/in-progress/skill-sources-dialog-redesign/api-e2e-evidence/`.

## Planned Cases

| Case ID | Case / Journey | Requirement / AC IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| WEB-001..WEB-005, WEB-CHAT-A/B, WEB-INTERRUPT | GitHub skill source lifecycle through the new popup | AC-003/004/006, REQ-009 | Real UI + built backend + controlled GitHub | `node autobyteus-web/tests/e2e/github-skill-sources-probe.mjs <dir>` | 1 | Durable probe |
| J-01 | Open: focus on the panel, order, rows, counts, display names, sr-only kind, title, status/tooltip, auto-check, no Try again, no Browse… | AC-001/002/006/007, REQ-007, VIS-022 | Browser on the real stack | `skill-sources-dialog-journey.mjs` | 2 | |
| J-02 | 1024×700 with 17 sources: list-only scroll; 390×844 narrow layout | AC-005, VIS-019/020/023 | Browser | same | 3 | |
| J-03 | Folder add via Enter: success alert, input cleared, new row, GraphQL readback | AC-004 | Browser | same | 4 | |
| J-04 | Missing folder: red alert above the form, input kept | AC-004, BEH-006 | Browser | same | 5 | |
| J-05 | Duplicate skill name: conflict dialog above the popup, input kept, no source added | AC-004, VIS-016 | Browser | same | 6 | |
| J-06 | URL detection hint variants; non-GitHub URL import error, URL kept | AC-004, DC-017 | Browser | same | 7 | |
| J-07 | Update available → text-only Update chip → confirmation version line → Up to date | AC-006, SR-003 | Browser | same | 8 | |
| J-08 | Check failed + error line → Try again → Up to date | AC-006 | Browser | same | 9 | |
| J-09 | Local remove: card shows path; Cancel no change; Remove unlinks (folder kept) | AC-003 | Browser | same | 10 | |
| J-10 | Keyboard: Tab cycle/wrap, Shift+Tab wrap, focus ring on trash, Esc during confirmation, focus after Cancel, Esc close, focus return | AC-007, REQ-008, VIS-017 | Browser | same | 11 | |
| J-11 | Close paths ×/overlay/Done; inside click keeps open; copy path → clipboard + Copied 1.5 s | REQ-008, TR-011 | Browser | same | 12 | |
| J-12 | zh-CN rendering, trust hint, no raw keys, no clipped buttons | REQ-010, VIS-021 | Browser | same | 13 | |
| J-13 | Keyboard focus after operations: Enter-add; keyboard remove confirm; Esc afterwards | REQ-008, AC-007 | Browser | same | 14 | Added after J-10 observation |
| D-01 (a/b/c) | Electron: Browse… eligible with the real preload; keyboard add/remove on the embedded backend; Browse… invokes the native dialog without submitting | AC-004, AC-007, DEC-002 | Isolated desktop instance (worktree build) | `pnpm --silent isolated-app start --build`, then `api-e2e-evidence/desktop-browse-check.mjs <controlEndpoint> <dir>` | 16 | Round 2 |
| J-14 | Fix edge paths: Esc on the conflict dialog, stray Tab/Shift+Tab, focus after keyboard Try again / Update, Esc after close | REQ-008, AC-007 | Browser | journey | 15 | Round 2 (new) |

## Execution Events

| Sequence | Case ID | Timestamp (UTC) | Event | Command / Entry Point / Material Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | WEB-001 | 04:42 | Completed | probe attempt 1 | Import via single input | Imported, 2 skills | Pass | `github-skill-sources-probe-attempt1/result.json` | — |
| 2 | WEB-CHAT-A | 04:43 | Completed | probe attempt 1 | Codex fixture model selectable | Runtime submenu did not open; model option timeout | Fail | `github-skill-sources-probe-attempt1/WEB-CHAT-A-failure.png` | Rerun (unchanged chat surface) |
| 3 | all 8 probe cases | ~04:47 | Completed | probe attempt 2 | 8/8 | 8/8 Pass; cleanup all true | Pass | `github-skill-sources-probe/result.json` | O-002 recorded as a flake |
| 4 | J-01..J-12 | — | Completed | journey attempt 1 | — | J-01 and J-11 failed on journey assertion defects (innerText includes sr-only; copy race). Others Pass | Superseded | `dialog-journey-attempt1/result.json` | Fixed the journey assertions |
| 5 | J-01..J-13 | — | Completed | journey attempt 2 | — | J-13 failed on a journey defect (zh-CN page not reloaded) | Superseded | `logs/dialog-journey.log` (overwritten) | Added a reload |
| 6 | J-01 | observation run | Completed | journey final, 1280×800 | as planned | All assertions pass; focus on the panel on open | Pass | `dialog-journey/result.json`, `J-01-open-overview.png` | — |
| 7 | J-02 | observation run | Completed | 1024×700, 390×844 | List scrolls; fixed areas | list 1135/384 px, scrolled to 751; header/add/footer unchanged; panel 35–665 px; no page scroll; narrow wraps, tile hidden | Pass | `J-02-scrolled.png`, `J-02-narrow-390.png` | — |
| 8 | J-03 | observation run | Completed | Enter submit | Success, cleared, row, readback | As expected | Pass | `J-03-add-folder-success.png` | — |
| 9 | J-04 | observation run | Completed | Add click | Red alert above form, kept | As expected | Pass | `J-04-…png` | — |
| 10 | J-05 | observation run | Completed | Duplicate `solo` | Conflict over popup, kept, not added | As expected (19 → 19 sources) | Pass | `J-05-…png` | — |
| 11 | J-06 | observation run | Completed | Hint variants; gitlab URL | Trust/folder hints; import error kept | "Use a public HTTPS github.com repository-root URL (no branch or subfolder)." | Pass | `J-06-…png` | — |
| 12 | J-07 | observation run | Completed | Upstream rev b | Text-only chip; version line; Up to date | Chip has 0 svg; `main aaaaaaaaaa bbbbbbbbbb`; installed = b… | Pass | `J-07-…png` | — |
| 13 | J-08 | observation run | Completed | Upstream fail → ok | Check failed + Try again → Up to date | As expected | Pass | `J-08-…png` | — |
| 14 | J-09 | observation run | Completed | Remove empty-folder | Cancel no-op; Remove unlinks | As expected; folder still on disk | Pass | `J-09-…png` | — |
| 15 | J-10 | observation run | Completed | Keyboard | Trap/Esc/return | Tab cycle (39 stops) wraps ×↔Done inside the panel; ring 2 px blue-500; Esc ignored while confirming. **After Cancel: focus on BODY, next Tab → sidebar "Chat" (outside), Esc did not close the popup**; focus returned to Sources after close | Fail (F-001) | `dialog-journey-observation-run/result.json` J-10 observed, `J-10-focus-ring-trash.png` | Asserted in event 20 |
| 16 | J-11 | observation run | Completed | Close paths, copy | Close ×/overlay/Done; clipboard | All closed correctly; clipboard = full path; Copied resets | Pass | `J-11-…png` | — |
| 17 | J-12 | observation run | Completed | zh-CN | Strings, no raw keys | 添加技能来源 / 添加 / 已是最新 / 1 个技能 / trust hint; 0 clipped buttons | Pass | `J-12-zh-CN.png` | — |
| 18 | J-13 | observation run | Completed | Keyboard ops | Focus stays in the panel | Enter-add: focus BODY (next Tab landed on Done, inside). Keyboard Remove confirmed: focus BODY, next Tab → "Chat" outside | Fail (F-001) | `dialog-journey-observation-run/result.json` J-13 observed | Asserted in event 20 |
| 19 | D-01 | — | — | — | — | Not run in round 1 | Not Tested | — | Round 2 |
| 20 | J-01..J-13 | authoritative run | Completed | journey with the trap asserted in J-10/J-13 | J-10/J-13 trap holds | J-01..J-09, J-11, J-12 Pass. **J-10 Fail**: Tab after Cancel → `BUTTON "Chat"` (outside the panel). **J-13 Fail**: after Enter-add focus = `BODY`. Cleanup all true | J-10 Fail, J-13 Fail, others Pass | `dialog-journey/result.json`, `logs/dialog-journey.log` | Route F-001 |

| 21 | (round 2) web/guard/audit/server | — | Completed | `round2/logs/*` | Pass | web 151/151; guard, audit pass; server 220/220 | Pass | `round2/logs/` | — |
| 22 | J-10, J-13 (F-001 recheck first) + J-01..J-14 | round 2 | Completed | journey on HEAD `a7d2fc85f` | Trap holds; Esc closes | J-10: after Cancel focus = "Remove one-skill", Tab → "Copy path", Esc closed. J-13: focus = input after Enter-add and after a keyboard remove; Esc closed. J-14 all asserted. 14/14 Pass, 0 page errors, cleanup all true | Pass | `round2/dialog-journey/result.json` | F-001 resolved |
| 23 | WEB-001..005, CHAT-A/B, INTERRUPT | round 2 | Completed | probe | 8/8 | 8/8 on the first attempt; cleanup all true | Pass | `round2/github-skill-sources-probe/result.json` | — |
| 24 | D-01a/b/c | round 2 | Completed | isolated instance `iso-52227-7ac9` (worktree build) | Browse… present; focus kept; Browse… pending without submit | `hasShowFolderDialog: true`; order input/Browse…/Add; add `1 skill`, focus = input after add and remove, Esc closed, focus → Sources; Browse… disabled (pending native sheet), value `keep-me`, rows 1 → 1, no alerts | Pass | `round2/desktop-check/result.json`, `logs/isolated-start.json`, `logs/isolated-stop.json` | Native picker answer: Not Tested (AC-008) |

## Re-entry And Reconciliation

- Last durably recorded event: 24 (round 2, D-01)
- Last completed case and result: D-01c, Pass (round 2)
- Cases still running, interrupted, or not started: none. The native OS picker answer is `Not Tested` by design (AC-008).
- Next case or recovery action: none (round 2 complete)
- Interruption, context-compression, or rerun note: this ledger was written after execution from the per-case `result.json` records. The journey and probe write each case's result immediately after it completes. No case was inferred.
- Reconciled into execution coverage report: `Yes` — `api-e2e-execution-coverage-report.md` §Test-Case Ledger Reconciliation
- Reconciliation note: the observation run (events 6–18, `dialog-journey-observation-run/`) and the authoritative assertion run (event 20, `dialog-journey/`) agree. F-001 reproduced in 3 of 3 runs.
