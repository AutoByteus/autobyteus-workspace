# Handoff — browser-tool-errors-507 (Architecture Design Complete)

- Package: `browser-tool-errors-507`, Project Task `autobyteus-507` (project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) for the founder
- Classification: `Architecture Design Complete`, `task_size: Small`, `architectural_risk: Low` → direct implementation route (handoff rule: Small/Medium + Low → `/implementation_engineer`)
- Solution revision: SR-002 (requirements approved at SR-001 by the Solution Designer within the Task's direction, user informed; design approval by the user not required)
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/browser-tool-errors-507`, branch `codex/browser-tool-errors-507`, base `origin/personal` at `e4f4b3e1765669cf2c411652770199234ff6c214`; finalization target `origin/personal` (RELEASE.md). Release only on the founder's word.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/browser-tool-errors-507/tickets/in-progress/browser-tool-errors-507/`

## Original request (Task, abridged)

The founder: the Product team copy for autobyteus-506 "has tons of errors when it uses the screenshot and some browser tools"; is it our tools? Analyze the journals first-hand, report the real cause before fixing, fix a product bug with a test that fails before and passes after, say which other teams are hit, check earlier Product runs. Founder's data and other runs read-only.

## Cause (evidence: investigation-notes.md)

- **The tools.** `screenshot` makes one `capturePage()`; Chromium copies only a frame the tab has drawn, and a tab not shown on screen (the usual case for agent tabs; also a covered, minimized or hidden window) has not drawn since its page loaded or navigated. Exact errors: `{"error":{"code":"browser_navigation_failed","message":"UnknownVizError"}}` and `…"Current display surface not available for capture"`. Founder's run: 2 of 2 screenshots failed this way (06:36:52, 06:36:56); reproduced exactly in the pinned Electron 42.11.16.
- Error codes mislead: capture failure reported as `browser_navigation_failed`; missing tab as `browser_bridge_unavailable`.
- Agents: one own mistake only (`set_device_emulation` with `tab_id: "pending"` in parallel with `open_tab`; 1 of 143 calls in all saved runs; self-corrected). No skill Task.
- Environment: excluded (no other browser use at the time; tab used by one agent only).
- Scale: 176 such failures in 4,222 screenshots across Product, Software Engineering, Article Writing and standalone agents; earlier Product runs too. The Docker-node Computer Use Operator uses another (Playwright) browser tool and is not affected.

## What to build (design-spec.md)

1. `autobyteus-web/electron/browser/browser-tab-page-operations.ts`: bounded attempt loop (DS-002): on a rejected or empty capture, nudge the view (current `session.viewportBounds` +1 px wide, then back), wait 100 ms, retry; after 2 s throw `browser_screenshot_failed` with the last Chromium reason. First attempt unchanged (no nudge when it succeeds). Viewport and full page.
2. `autobyteus-web/electron/shell/workspace-shell-window.ts`: hold the browser view only while the window is visible and not minimized; re-apply projection on `minimize`/`restore`/`hide`/`show` (DS-003).
3. Error vocabulary: desktop `browser_session_not_found` → `browser_tab_not_found`, `browser_session_closed` → `browser_tab_closed`; server contract gains `browser_screenshot_failed` and passes it through.
4. Tests: new real-Electron spec `browser-screenshot-capture.electron.spec.ts` (AC-001..AC-005) that fails on the current code first; unit tests for AC-006..AC-008; docs `autobyteus-web/docs/browser_sessions.md` screenshot section.

Reproduction to start from: `evidence/kick.js`, `evidence/design-check.js` (`env -u ELECTRON_RUN_AS_NODE <pinned electron> --user-data-dir=<tmp> <script>`); `evidence/design-check-out.txt` shows the designed mechanism at 24/24.

## Constraints

- REQ-002: nothing visible changes for a user watching a tab; mobile emulation kept.
- QR-001: ≤ 2 s extra on the retry path; nothing extra when the first capture works.
- DESIGN.md rule 9: clean cut for codes, no compatibility path.
- Do not destroy a view with a capture pending in tests (FU-002 crash).

## Follow-ups (not this ticket)

`follow-ups.md`: FU-001 (bridge default code), FU-002 (crash on close during pending capture), FU-003 (emulated viewport 405x900 instead of 412x915). Sent by the Solution Designer when the ticket leaves the team.

## Expected output

Implementation per the design with `implementation-handoff.md`; the Electron spec's failing-before output recorded.

## Route record

- 2026-11-17: `get_handoff_rules` → rule "Small or Medium and Low" → `/implementation_engineer` (sent with this file and the four solution documents).
- 2026-11-17: cause report sent to `/project_task_manager` as the Task asked ("report the real cause before fixing"); follow-ups held until the ticket leaves the team.
