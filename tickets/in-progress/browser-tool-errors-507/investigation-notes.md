# Investigation Notes

## Investigation Meta

- Package identifier: `browser-tool-errors-507` (Project Task `autobyteus-507`)
- Request / ticket: autobyteus-507, "BUG: the Product team gets many errors from the browser tools (screenshot, set_device_emulation and others): find out whether the tools or the way they are used is at fault, and fix it"
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/browser-tool-errors-507`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/browser-tool-errors-507`, branch `codex/browser-tool-errors-507`
- Resolved base remote / branch / revision: `origin/personal` at `e4f4b3e1765669cf2c411652770199234ff6c214` (fetched 2026-11-17)
- Finalization target remote / branch: `origin` / `personal` (RELEASE.md)
- Bootstrap result: worktree created from the freshly fetched `origin/personal`
- Bootstrap blocker: None
- Current solution revision ID: `SR-002`
- Authorities read (2026-11-17): requirements gate `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`; design gate `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md`
- Investigation status: Complete for requirements; architecture findings added below

## Initial Request And Clarifications

- Original request: the founder (via the PM, 2026-11-17, phone screenshot) says the Product team copy started for autobyteus-506 "has tons of errors when it uses the screenshot and some browser tools"; he is not sure whether our tools have a problem. Analyze the Product team's journals first-hand; report the real cause before fixing: which calls fail, exact error text, how often, in which order; product bug vs agent misuse vs environment; fix a product bug with a test that fails before and passes after; say whether other teams are hit; check earlier Product team runs.
- Clarifications received: none needed.
- User-supplied facts and constraints: app 1.5.13-beta.7 on his Mac; the failing member is `ui_baseline_bootstrapper`; the page is the baseline dev server `http://127.0.0.1:4506/mobile` at 412 px. Founder's data and other agents' runs are read-only; do not stop other agents. Release only on his word.
- Initial ambiguity: whether "tons of errors" means many failing calls in this run, or a pattern across runs. Both were measured.

## Product And Domain Understanding

- Product area: the built-in browser tool set (`open_tab`, `navigate_to`, `screenshot`, `set_device_emulation`, `run_script`, `read_page`, `dom_snapshot`, `list_tabs`, `close_tab`). The server-side tools (`autobyteus-server-ts/src/agent-tools/browser/`) call the desktop app's browser bridge (`autobyteus-web/electron/browser/browser-bridge-server.ts`), which runs each call on an Electron `WebContentsView` per tab (`browser-tab-manager.ts`, `browser-tab-page-operations.ts`).
- Affected actors: every agent that takes screenshots with the built-in browser: Product team (UI/UX designer, baseline bootstrapper), Software Engineering team (implementation engineer, API/E2E engineer validation), Article Writing team (browser check), standalone agents (daily assistant, resume designer, product prototyper).
- Terminology: a tab is *shown* when its view is attached to the app window that is on screen, which happens only when the user has the browser panel open on that tab (the frontend focuses a tab after `open_tab` only in the embedded Electron window that is streaming that run: `services/agentStreaming/browser/browserToolExecutionSucceededHandler.ts`). Otherwise the tab is *not shown*: detached, or in a hidden/minimized/covered window.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-11-17 | Data | `…/agent_teams/product_team_b622eeee720f41d18073dbd374fea33f/ui_baseline_bootstrapper_6ad2aea9c2274132af4a83d42f8dee25/raw_traces_active.jsonl` (seq 66–79) | The founder's failing run | Exact sequence and errors, BEH-001 below | — |
| 2026-11-17 | Data | Same team, `product_ui_ux_designer_2b619f247dd042348fa33e0141bbbb56` (raw traces, `work_journal/work_journal_active.md`) | Designer's part of the run | No browser tool calls yet in this run | — |
| 2026-11-17 | Command | `python3 -I evidence/scan.py ~/.autobyteus/server-data/memory` → `evidence/trace-scan-all-runs.txt` | Every browser tool outcome in every saved run | screenshot 3,967 ok / 255 failed; error texts and counts | — |
| 2026-11-17 | Command | `python3 -I evidence/scan2.py <memory> UnknownVizError` | Each failure with its tab's history | 89 of 156 `UnknownVizError` failures sit between successful screenshots of the same tab; the retry 1–3 s later succeeds | — |
| 2026-11-17 | Command | `python3 -I evidence/first-shot.py <memory>` | What the failing screenshot follows | Failure rate of the first screenshot after `navigate_to` 11.4 %, after `open_tab` 6.4 %, after another screenshot 1.7 % | — |
| 2026-11-17 | Command | `python3 -I evidence/by-team.py <memory>` | Which teams are hit | Product team 72 `UnknownVizError` of 747 screenshots; SE team 72 `UnknownVizError` + 22 surface + 8 no-bytes of ~1,660; Article Writing 4 of 10 | — |
| 2026-11-17 | Data | All raw traces with ts 1794893760–1794893860 (06:36:00–06:37:40) | Was another agent using the browser at the same time? | Only the bootstrapper made browser calls; tab `c0cde0` appears in no other run | — |
| 2026-11-17 | Code | `autobyteus-web/electron/browser/browser-tab-page-operations.ts` `captureSessionPage` | How screenshot captures | One `webContents.capturePage()` call, no retry, no wait for a frame | Fix owner |
| 2026-11-17 | Code | `autobyteus-web/electron/browser/browser-bridge-server.ts:203-218` | Error code of a capture rejection | Any non-`BrowserTabError` becomes `browser_navigation_failed` | Fix |
| 2026-11-17 | Code | `autobyteus-server-ts/src/agent-tools/browser/browser-bridge-client.ts:42-53,193-198` vs `autobyteus-web/electron/browser/browser-tab-types.ts:157-164` | Error code vocabulary | Electron codes `browser_session_not_found`, `browser_session_closed`, `browser_screenshot_failed`, `browser_popup_session_mismatch` are not in the server's canonical list and become `browser_bridge_unavailable` | Fix |
| 2026-11-17 | Code | `autobyteus-web/electron/browser/browser-shell-controller.ts` `applyShellProjection`; `services/agentStreaming/browser/browserToolExecutionSucceededHandler.ts` | When a tab is attached to a window | Only the active tab of a shell with host bounds is attached; an agent tab is focused only by an embedded window streaming that run | — |
| 2026-11-17 | Web | Chromium `content/public/browser/render_widget_host_view.h` | Meaning of `UnknownVizError` | `CopyFromSurfaceError::kUnknownVizError` (6); "If the view's renderer is suspended … this may result in copying old data or failing" | — |
| 2026-11-17 | Command | `strings "Electron Framework"` in `/Applications/AutoByteus.app` (1.5.13-beta.7) | Which layer produces the text | `UnknownVizError`, `Current display surface not available for capture` are Electron/Chromium strings | — |
| 2026-11-17 | Runtime | `evidence/main.js`, `evidence/time-to-capture.js`, `evidence/kick.js`, `evidence/strategies.js` run in Electron 42.11.16 (the app's pinned version) | Reproduce and measure | See Runtime findings | — |
| 2026-11-17 | Data | `~/.autobyteus/logs/app.log` | Electron-side log of the failure | No browser capture logging exists | — |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | An agent calls `screenshot` on a tab it opened | Server tool → bridge `/browser/screenshot` → `BrowserTabManager.captureScreenshot` → one `capturePage()` | When the tab is not shown on screen, the first capture after the page loaded or navigated is rejected by Chromium; the tool returns `{"code":"browser_navigation_failed","message":"UnknownVizError"}` (or `…"Current display surface not available for capture"`). The failed attempt wakes the page; a later attempt usually succeeds. | Founder's run seq 72–78; 149 `UnknownVizError` + 27 surface errors in all runs; probes | Reproduced |
| BEH-002 | System | An agent calls a browser tool with a tab id that does not exist or was closed | Bridge → `getOpenSessionOrThrow` → `browser_session_not_found` / `browser_session_closed` → server client | Arrives as `browser_bridge_unavailable` ("bridge unavailable") with the message "Browser session 'x' was not found." | Founder's run seq 69; code | Read + seen in trace |
| BEH-003 | System | A screenshot of a page that produces no bytes | `captureScreenshot` throws `browser_screenshot_failed` | Arrives as `browser_bridge_unavailable` (18 occurrences) | trace scan; code | Read + seen in trace |
| BEH-004 | System | Shown tab (user watching) | Same path | Capture succeeds right after navigation (probe: 24 of 24) | `evidence/kick.js` attached-shown | Reproduced |
| BEH-005 | System | `set_device_emulation` on an open tab | Bridge → `setDeviceEmulation` | Works; it does not cause the capture failure (probe: capture right after emulation succeeds 6 of 6) | founder run seq 70–71; `time-to-capture.js` | Reproduced |

## The Founder's Run, Call By Call (bootstrapper, 2026-11-17, local time)

| Time | Call | Result |
| --- | --- | --- |
| 06:36:49.203 | `open_tab {url: http://127.0.0.1:4506/mobile, title: baseline}` | ok at 06:36:50.423, tab `c0cde0` |
| 06:36:49.617 | `set_device_emulation {tab_id: "pending", mobile 412x915}`, issued in parallel with `open_tab`, before its result | failed: `{"error":{"code":"browser_bridge_unavailable","message":"Browser session 'pending' was not found."}}` |
| 06:36:51.950 | `set_device_emulation {tab_id: c0cde0, mobile 412x915, dsf 2}` | ok |
| 06:36:52.127 | `screenshot {tab_id: c0cde0}` (1.7 s after the page loaded) | failed in 42 ms: `{"error":{"code":"browser_navigation_failed","message":"UnknownVizError"}}` |
| 06:36:53.397 | agent: "Screenshots are failing, so I'm checking the page another way." | — |
| 06:36:53.920 | `run_script` (href, size, text) | ok: `/mobile`, 405x900, body text empty |
| 06:36:56.541 | `screenshot {tab_id: c0cde0}` | failed in 54 ms: same `UnknownVizError` |
| 06:36:59 → | agent gives up on the built-in browser and looks for Playwright/Chrome through Bash | — |

The run has 2 screenshot calls, both failed; 2 `set_device_emulation` calls, 1 failed (its own mistake). The designer member had made no browser calls yet. Body text empty: the baseline page had not rendered content (the agent later says the dev server "broke after an `.env` restart"); an empty page still captures when the tab can draw (probe `/empty` page), so this does not explain the screenshot failures.

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `autobyteus-web/electron/browser/browser-tab-page-operations.ts` | `captureScreenshot` → `captureSessionPage` → `capturePage()` once; full page resizes the view, waits 60 ms, captures once | The screenshot must survive a page that has not drawn since it loaded | Owner of the capture; retry belongs here |
| `autobyteus-web/electron/browser/browser-bridge-server.ts` | Maps any non-`BrowserTabError` to `browser_navigation_failed` | A screenshot failure must say it is a screenshot failure | — |
| `autobyteus-web/electron/browser/browser-tab-types.ts` | Electron error codes | — | Vocabulary differs from the server's |
| `autobyteus-server-ts/src/agent-tools/browser/browser-bridge-client.ts` | Unknown codes become `browser_bridge_unavailable` | A missing tab must say "tab not found" | Align vocabulary |
| `autobyteus-server-ts/src/agent-tools/browser/browser-tool-contract.ts` | `BrowserToolErrorCode` (no screenshot code) | — | Add `browser_screenshot_failed` |
| `autobyteus-web/electron/browser/browser-shell-controller.ts` | Attaches only the active tab of a shell with bounds | Agent tabs are usually not shown | Do not change UI projection in this ticket |

## Runtime, Probe, Or Reproduction Findings

All probes ran in a scratch Electron 42.11.16 (`/tmp/sd507/electron-probe`, own `--user-data-dir`), never the founder's app. Scripts are copied into `evidence/`.

| Method / Command | Scenario | Observation | Established | Requirement Implication | Artifact |
| --- | --- | --- | --- | --- | --- |
| `electron evidence/kick.js` | Tab not shown (detached view), navigate, wait 0 / 0.5 / 2 / 5 s, capture once, retry 300 ms later | First capture fails `UnknownVizError` 12 of 12 at every wait; the retry succeeds 12 of 12. Captures without a new navigation, or after a DOM change by script, succeed 18 of 18 | Reproduced | Waiting longer does not help; a second attempt does | `evidence/kick.js` |
| same | Tab shown (attached to a window in front) | Capture right after navigation succeeds 12 of 12 | Reproduced | Explains why most screenshots work while the user watches | same |
| `evidence/kick.js`, `minimized.js`, `minimized2.js`, `throttling.js` | Tab in a hidden or minimized window | Captures fail (`UnknownVizError`) or never answer (> 2–5 s), also after a resize nudge or with `stayHidden`; the same tab detached from the window captures at once (2/2) | Reproduced | A window that is not visible must not hold the tab's view | `evidence/minimized*-out.txt`, `throttling-out.txt` |
| `electron evidence/main.js` (earlier probe) | Tab attached to a shown window that may have been covered by other windows (not controlled) | Capture right after navigation fails `UnknownVizError` 3 of 3; after 8 s idle fails 2 of 3 | Reproduced | A covered window behaves like a hidden tab | `evidence/main.js` |
| `electron evidence/time-to-capture.js` | Founder's sequence: open, mobile emulation 412x915, capture at 1.7 s, capture at 6 s (not shown) | Capture at 1.7 s fails `UnknownVizError` 6 of 6 (same as the founder); capture at 6 s succeeds 6 of 6 | Reproduced | The founder's first failure is reproduced exactly; his second failure means his tab stayed asleep, as a hidden/covered window or sleeping display does | `evidence/time-to-capture.js` |
| same | Fresh tab never shown, no resize, capture polled every 100 ms for 15 s | Never succeeds: `Current display surface not available for capture` | Reproduced | A tab that has never drawn needs a nudge to draw | same |
| same | After `set_device_emulation` | Capture succeeds at the first try (6 of 6) | Reproduced | Emulation is not the cause | same |
| `electron evidence/strategies.js` | Retry strategies, 3 situations x 3 reps | Never-drawn tab: plain retry, `invalidate()`, `stayHidden` 0/3 each; 1 px resize nudge 3/3 (≤ 222 ms). After navigation (shown or not): every strategy 3/3 within ≤ 225 ms | Measured | Resize nudge + retry | `evidence/strategies-out.txt` |
| `electron evidence/nudge-kinds.js` | Resize vs move nudge, with and without mobile emulation | Move: never-drawn tab 0/3; resize 6/6; emulated `innerWidth` unchanged; the page sees 1–2 `resize` events | Measured | Resize, only after a failed attempt | `evidence/nudge-out.txt` |
| `electron evidence/throttling.js` | `backgroundThrottling: false` | No help: never-drawn 0/3, after navigation 0/3 first capture, hidden window hangs | Measured | Rejected | `evidence/throttling-out.txt` |
| `electron evidence/design-check.js` | The designed mechanism | 24/24 ok, max 358 ms: fresh tab, after navigate, full page, founder's emulated sequence (`innerWidth`/`innerHeight` same before and after), minimized and hidden window with the window rule, and after restore | Measured | Design confirmed | `evidence/design-check-out.txt` |
| `evidence/throttling.js` (first runs) | Destroying a view while a capture is pending | The probe's Electron crashed (SIGTRAP) | Reproduced | Not this ticket: FU-002 | — |
| `python3 -I evidence/durations.py <memory>` | Do real screenshot calls hang? | No built-in-tool screenshot took ≥ 30 s; all 27 such calls are the old Playwright tool on the Docker node | Measured | No per-attempt timeout needed | — |

- Temporary diagnostics: None in product code; probes only in `/tmp/sd507`.
- Reproduction for implementation to start from: `evidence/kick.js` (run with `env -u ELECTRON_RUN_AS_NODE <electron 42.11.16> --user-data-dir=<tmp> evidence/kick.js`); the design spec turns it into a real-Electron spec in the pattern of `electron/browser/__tests__/browser-file-document-request.electron.spec.ts`.

## Measured Across All Saved Runs

Built-in browser tool outcomes in every saved run under `~/.autobyteus/server-data/memory` (2026-04 to 2026-11-17; `evidence/trace-scan-all-runs.txt`):

| Tool | ok | failed | Main failure texts |
| --- | --- | --- | --- |
| screenshot | 3,967 | 255 (6.0 %) | `UnknownVizError` 149; `Current display surface not available for capture` 27; old Playwright tool timeouts/crashes 32 (not this tool set); "produced no image bytes" (as `browser_bridge_unavailable`) 18 |
| run_script | 18,415 | 729 (3.8 %) | Agents' own script errors (thrown errors, non-cloneable return values, `await` outside async): agent-side, not the tool |
| open_tab | 1,473 | 83 | Server not running (`ERR_CONNECTION_REFUSED`), old tool-set errors |
| navigate_to | 2,152 | 43 | — |
| set_device_emulation | 141 | 2 | invented/closed tab ids (incl. the founder's `pending`) |

Screenshot failures per team (AutoByteus tool set): Product team 72 `UnknownVizError` + 7 no-bytes + 2 surface of 747 (~11 %); Software Engineering team 72 + 22 + 8 of ~1,660 (~6 %); Article Writing team 4 of 10; daily assistant / resume designer / prototyper agents a few each. The Computer Use Operator and marketing agents in the saved data run on a Docker node with a different (Playwright) browser tool; their failures are of that tool, not this one.

Per month, screenshot failures have been present since 2026-05 (13) and grew with use (2026-10: 98 of 1,106). Earlier Product team runs show the same error: e.g. `agent_orgs/autobyteus_org_197705caccfd4d2abefd0552ce44a561/product_team_bfe0223811e64280abe2c7cce0ba95b6/product_ui_ux_designer_7c5b22b105584140bb57ad0d2169efb2` 37 failures of 254; `agent_teams/product_team_f4c754df20bf4af0adb9563f9b2e28da/product_ui_ux_designer_…` 9 of 63.

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| Founder via PM | Agents get many browser-tool errors; wants to know tools vs agents | Direct report + trace | The answer must be stated plainly | — |
| Bootstrapper agent | After two failures it concluded "Screenshots are failing" and left the built-in browser for Playwright via Bash | Trace | A transient failure the tool can absorb costs agent time and tool trust | — |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Electron `webContents.capturePage` | 42.11.16 (`autobyteus-web/package.json`) | Rejects with Chromium `CopyFromSurfaceError` names when the copy fails | probes; `strings` | Future Electron may change the texts; the fix must not depend on exact texts |
| Chromium `RenderWidgetHostView::CopyFromSurface` | main | Suspended (hidden/occluded) renderer: copy "may result in copying old data or failing" | render_widget_host_view.h | — |

## Persisted Data And State Facts

- Affected stored or external subject: none. Screenshots are written as new artifacts; no persisted data changes.

## Product Design Request Context

- Product Design request in the current input: `Not stated`

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/scan.py`, `scan2.py`, `first-shot.py`, `by-team.py` | Solution Designer | Read-only trace analysis | All saved runs | REQ-001..REQ-004 | Final | Evidence only |
| `evidence/trace-scan-all-runs.txt` | Solution Designer | Output of `scan.py` | All saved runs | — | Final | Evidence only |
| `evidence/main.js`, `time-to-capture.js`, `kick.js`, `strategies.js` | Solution Designer | Real-Electron probes | Capture behaviour | REQ-001, AC-001..AC-003 | Final | Evidence only |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| UNK-001 | Unknown | Whether the founder's Mac window was hidden, covered or the display asleep at 06:36 | Explains why his second capture also failed | Not needed: all three are "not shown" and covered by REQ-001 | Closed |
| RSK-001 | Risk | A tab in a hidden/minimized window may not be capturable at all | Then retry cannot help and the tool must say why | Measured in kick.js / strategies.js | See findings |

## Requirement Implications

- The failure is in the product: one capture attempt where Chromium needs the tab to draw a frame first. Agents used the tool correctly (`open_tab` → `screenshot` on the tab they opened). Only the parallel `set_device_emulation` with `tab_id: "pending"` is an agent mistake: 1 occurrence in all saved runs, corrected by the agent at once; no skill change is warranted.
- The misleading error codes (`browser_navigation_failed` for a screenshot, `browser_bridge_unavailable` for a missing tab) made the agent conclude the screenshot tool was broken.
- No environment cause: no other agent used the browser at that time; tab `c0cde0` belonged only to the bootstrapper.

## Architecture Investigation Findings

- Capture owner: `autobyteus-web/electron/browser/browser-tab-page-operations.ts:36-56,162-216`, one `capturePage()` per screenshot; full page enlarges the view, waits 60 ms, captures once, restores bounds and re-applies mobile emulation through `afterOriginalBoundsRestored` (`browser-tab-manager.ts:107-114,400-413`).
- Window projection owner: `autobyteus-web/electron/shell/workspace-shell-window.ts:98-136`; no visibility condition. The app never calls `hide()`/`minimize()` itself (`grep` in `autobyteus-web/electron`); the user can minimize or hide (macOS Cmd+H) the app.
- Error vocabulary: desktop `browser-tab-types.ts:157-166` vs server `browser-tool-contract.ts:211-220` and pass-through list `browser-bridge-client.ts:42-53`. `browser_popup_session_mismatch` never reaches the bridge (popup creation catches it: `browser-tab-manager.ts:263-296`). Only one bridge implementation exists (`grep /browser/screenshot`), so local and remote-node use share it.
- Test pattern for real Electron: `autobyteus-web/electron/browser/__tests__/browser-file-document-request.electron.spec.ts` (transpile sources, spawn the pinned Electron, parse a `RESULT` line), run by `pnpm test:electron` (`autobyteus-web/electron/vitest.config.ts`).
- Side finding: after `set_device_emulation` 412x915 the founder's page measured `innerWidth` 405 and `innerHeight` 900 (run seq 76): the presentation scale (`browser-device-emulation.ts:110-127`) shrinks the emulated CSS viewport when the host bounds (1280x900) are shorter than the profile; FU-003.

## Notes For Architecture Design

- Realize SCN-001..SCN-003 inside the Electron capture owner; keep the bridge/server contract shape (`tab_id`, `artifact_path`, `mime_type`).
- Do not attach agent tabs to the window or change what the user sees.
