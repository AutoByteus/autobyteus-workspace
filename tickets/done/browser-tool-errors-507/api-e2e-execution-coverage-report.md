# API/E2E Execution Coverage Report — browser-tool-errors-507

## Round

- Coverage investigation (the plan; it lists the upstream documents): `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: Round 1, implementation IR-001 complete (direct route), message from `/implementation_engineer` 2026-11-17
- Prior round reviewed: None
- Deviations from the investigation's plan, and why:
  - E2E-02 ran as E2E-02a (Browser panel collapsed: no tab shown) and E2E-02b (panel opened by a real click, showing tab B while A is captured), because the narrow instance window (1200x768) starts with the panel collapsed.
  - E2E-03: CDP has no window domain in Electron (`'Browser.getWindowForTarget' wasn't found`), so window state was changed through macOS accessibility on the instance process only. The first attempt (run 1) happened while macOS had locked the screen, which led to the added cases E2E-06, E2E-07, E2E-08 (screen locked, app hidden) and to FU-004.
  - Added E2E-10 (AC-006 against real Chromium) to raise the failure-path evidence above the stubbed unit test.
  - E2E-09: a durable app-hidden case was tried and reverted (it depends on the screen lock state).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/browser-tool-errors-507/tickets/in-progress/browser-tool-errors-507/evidence/api-e2e/` (implementation checks in the parent `evidence/`)

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route` (no durable test code changed this round)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter (data, identity, locale, viewport) |
| --- | --- | --- | --- | --- |
| ENV-1 | `baf0439559` (code `927079c6cd`) | macOS Darwin 25.5.0 arm64 | Isolated instance `iso-49942-c50c` of the worktree build (`pnpm --silent isolated-app start --build`, `electron-dist/mac-arm64/AutoByteus.app`, Electron 42.11.16) | Own auto data root (removed at stop); isolated-launch flags `--disable-backgrounding-occluded-windows --disable-renderer-backgrounding`; agent `Screenshot Probe 507` (`E2E-tools-agent-definition.json`): tools open_tab, navigate_to, set_device_emulation, screenshot, close_tab, list_tabs; runtime `claude_agent_sdk` 2.1.325 (the founder's runtime), model `claude-haiku-5-5`, auto-approve on; window 1200x768 CSS px; test pages from `E2E-tools-page_server.py` on 127.0.0.1 |
| ENV-2 | released 1.5.13-beta.7 (founder's version) | same | Isolated instance `iso-58364-b826` of installed `/Applications/AutoByteus.app` (`pnpm --silent isolated-app start`) | Same agent definition, runtime, model, flags, page server |
| ENV-3 | `927079c6cd` (worktree `autobyteus-web/electron`) and base `e4f4b3e176` (`git archive`) | same | Pinned Electron 42.11.16 from `autobyteus-web/node_modules`, product modules transpiled from source (same harness as `browser-screenshot-capture.electron.spec.ts`), run with `node` from `autobyteus-web` | No isolated flags; test-owned temp `userData`; for E2E-06/E2E-08 the macOS screen had been locked by macOS itself (idle lock), recorded per case |
| ENV-4 | `baf0439559` | same | Repository | — |

## Cases

All local times 2026-11-17. "Page events" lines come from the test page reporting itself (`vis` = `document.visibilityState`, `w`/`h` = `innerWidth`/`innerHeight`). Harness effect (not product): every CDP control command (`send.sh`, screenshots of the instance window) flips all tab pages visible/hidden for about 0.5 s; no CDP command was sent between an agent's navigate/open and its screenshot.

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| E2E-R1 | AC-001..AC-005, REQ-005, QR-001 | Product capture modules in pinned Electron | Reused `IMP-01` (fail before), `IMP-02` (pass after) | see handoff | Pass | `../IMP-01-electron-spec-before-change.txt`, `../IMP-02-electron-spec-after-change.txt` | IMP-02 `Tests  7 passed (7)` | Ran on `927079c6cd`; only `tickets/` changed since. Re-observed in E2E-09: the original 7 cases pass also while the screen is locked |
| E2E-R2 | AC-006, AC-007 (desktop), AC-008, DS-003 | Electron main-process suite | Reused `IMP-03` | see handoff | Pass | `../IMP-03-electron-suite.txt` | `Tests  503 passed \| 1 skipped (504)` | Same commit |
| E2E-R3 | AC-007 (server), BEH-003 pass-through | Server browser tools | Reused `IMP-04` | see handoff | Pass | `../IMP-04-server-browser-unit.txt` | `Tests  33 passed (33)` | Same commit |
| E2E-R4 | — | Both typechecks | Reused `IMP-05`, `IMP-06` | see handoff | Pass | `../IMP-05-web-typecheck.txt`, `../IMP-06-server-typecheck.txt` | `[typecheck] PASS` | Same commit; this round changed no source or test file |
| E2E-00 | REQ-004 (clean cut) | Repository | `git grep -n -E "browser_session_(not_found\|closed)" -- ':!tickets'` | ENV-4 | Pass | `E2E-00-removed-codes-grep.txt` | `git grep exit code: 1 (1 = no match)` | — |
| E2E-B1 | Baseline for E2E-01, E2E-05 | Released app, real agent → MCP → server tool → bridge | Agent message `msg-b01` (founder sequence, then `pending`, then closed tab); window left to `#/agents` 1.5 s after sending | ENV-2 | Pass (reproduces the defect) | `E2E-B1-released-app-baseline.txt` | `screenshot TOOL_EXECUTION_FAILED result=null error="{\"error\":{\"code\":\"browser_navigation_failed\",\"message\":\"UnknownVizError\"}}"`; `browser_bridge_unavailable` for `'pending' was not found` and `'9514b6' has already been closed` | Shows the journeys reach the founder's exact errors under the isolated-launch flags, so E2E-01/E2E-05 discriminate |
| E2E-01 | AC-002, AC-003, REQ-001, REQ-002, QR-001 | Worktree app, real agent → agent-tools MCP → server tool → bridge → `BrowserTabManager` | Founder's sequence `open_tab` → `set_device_emulation` mobile 412x915 dsf 2 → `screenshot`; the user leaves the run view for `#/agents` 1.5 s after sending | ENV-1 | Pass | `E2E-01-founder-sequence-not-shown.txt`, `E2E-01-artifact-9c38d2.png`, `E2E-01-chat-view-after.png` | `08:01:52.569 seq=7 tool_result screenshot TOOL_EXECUTION_SUCCEEDED` (248 ms after the call); page `"kind": "load", ... "vis": "hidden"` and last event `"vis": "hidden"`; emulated `"w": 412, "h": 915` before and after; PNG `810 x 1800` | Retry path visible in the page log: one `resize` (the nudge) between the capture attempts, as the design accepted. 810x1800 = 405x900 CSS at 2x: FU-003 (known) |
| E2E-02a | AC-001, AC-003, AC-005, REQ-001 | same | Agent opens A, opens B, `navigate_to` A → `set_device_emulation` A → `screenshot` A → `screenshot` A `full_page`; Browser panel collapsed | ENV-1 | Pass | `E2E-02a-not-active-tab-panel-collapsed.txt`, `E2E-02a-artifact-de9ec9-viewport.png`, `E2E-02a-artifact-de9ec9-fullpage.png`, `E2E-02a-chat-view-after.png` | `seq=11 tool_result screenshot TOOL_EXECUTION_SUCCEEDED` (170 ms) and `seq=13 ... SUCCEEDED` full page (153 ms); `e02-a-next` load `"vis": "hidden"`; viewport PNG `810 x 1800`, full page `824 x 6738` | — |
| E2E-02b | AC-001, REQ-001 | same | Browser panel opened by a real click (B `0386db` becomes `visible` 450x604); `navigate_to` A → `screenshot` A | ENV-1 | Pass | `E2E-02b-not-active-tab-panel-shows-other.txt`, `E2E-02b-artifact-de9ec9.png`, `E2E-02b-window-browser-panel-open.png` | `08:11:53.834 seq=5 tool_result screenshot TOOL_EXECUTION_SUCCEEDED` (166 ms); `e02-a-third` load `"vis": "hidden"`, last `"vis": "hidden"` | The window screenshot shows the panel open with the agent's tabs; the native view itself is not part of a renderer capture |
| E2E-03a | AC-004, REQ-001, DS-003 | same + macOS window minimize of the instance window | Agent tab B shown in the panel; window minimized (`AXMinimized` true, = Window ▸ Minimize); `navigate_to` B → `screenshot` B; window restored; `screenshot` B | ENV-1 | Pass | `E2E-03-minimized-and-hidden-app.txt` (sections E2E-03a, restore), `E2E-03a-artifact-minimized.png` | minimized: page `"vis": "hidden"` at 08:30:26.358, `08:30:32.916 seq=5 tool_result screenshot TOOL_EXECUTION_SUCCEEDED` (157 ms); restore: page `"vis": "visible"` at 08:33:50.625, screenshot SUCCEEDED in 61 ms with no page event | Restore shows the tab again and captures at once |
| E2E-03b | AC-004 variant, REQ-001 | same + macOS app hide | App hidden (process `visible` false, = Hide AutoByteus / Cmd-H), screen unlocked; `navigate_to` B → `screenshot` B | ENV-1 | Pass | `E2E-03-minimized-and-hidden-app.txt` (section E2E-03b), `E2E-03b-artifact-app-hidden.png` | `08:37:27.207 seq=5 tool_result screenshot TOOL_EXECUTION_SUCCEEDED` (165 ms) | — |
| E2E-03 run 1 | — (observation) | same | App hidden at 08:25:02 while macOS had locked the screen (locked 08:18:00, unlocked ~08:26:00); `navigate_to` B → `screenshot` B | ENV-1 | Observation (not a real-use state) | `E2E-03-minimized-and-hidden-app.txt` (section run 1), `E2E-03-run1-artifact-hidden-locked.png` | `08:26:00.848 seq=5 tool_result screenshot TOOL_EXECUTION_SUCCEEDED` for the call at `08:25:17.971` (42.9 s) | Answered when the screen was unlocked. Isolated by E2E-07/E2E-08: only "app hidden while the screen is locked" does this; a user cannot hide an app on a locked screen. FU-004 |
| E2E-04 | AC-008, BEH-004, REQ-002 | same | Tab B shown in the open panel: `screenshot` B | ENV-1 | Pass | `E2E-04-shown-tab-no-extra-work.txt`, `E2E-04-artifact-0386db-shown.png` | `08:11:55.424 seq=7 tool_result screenshot TOOL_EXECUTION_SUCCEEDED` (49 ms); no `e02-b` event after `08:11:30.787` | Nothing visible happens to a shown tab |
| E2E-05 | AC-007, REQ-004 | same | `screenshot` `pending`; `open_tab` → `close_tab` → `screenshot` and `navigate_to` on the closed tab | ENV-1 | Pass | `E2E-05-error-codes-agent-received.txt` | `error="{\"error\":{\"code\":\"browser_tab_not_found\",\"message\":\"Browser session 'pending' was not found.\"}}"`; `\"code\":\"browser_tab_closed\"` for both calls on `32c4e6` | Compare E2E-B1 (`browser_bridge_unavailable`) |
| E2E-06 | REQ-001 (screen locked, tab shown in a visible window) | Product modules, pinned Electron | `node evidence/api-e2e/E2E-06-occluded_probe.mjs <src> <label>` (from `autobyteus-web`), changed and base, ×2 each, screen locked by macOS | ENV-3 | Pass | `E2E-06-locked-screen-attached-tab.txt`, `E2E-06-occluded_probe.mjs` | after: 5 of 5 `"ok":true` (156–236 ms, `"attached":true,"pageVisibility":"hidden"`); base: 5 of 5 `"message":"UnknownVizError"` | The founder's state "on the phone, display locked" with the tab shown in the panel |
| E2E-07 | AC-004 variant (app hidden) | same | `node evidence/api-e2e/E2E-07-apphide_probe.mjs <src> <label>`, changed and base, screen unlocked | ENV-3 | Pass | `E2E-07-app-hide-probe.txt`, `E2E-07-apphide_probe.mjs` | after `app-hidden-after-navigate` `"events":"blur,hide" ... "attached":false ... "ok":true`; base `"attached":true ... "UnknownVizError"` | — |
| E2E-08 | REQ-001, AC-001..AC-003 (screen locked, tabs never shown) | same | `node evidence/api-e2e/E2E-08-lock_probe.mjs <src> <label>`, started by a watcher when macOS locked the screen by itself (08:46:06); changed ×2, base ×1 | ENV-3 | Pass (with observation) | `E2E-08-locked-screen-probe.txt`, `E2E-08-lock_probe.mjs` | after: `detached-fresh`, `detached-after-navigate`, `detached-founder-emulated`, `attached-after-navigate` all `"locked":true ... "ok":true` (139–325 ms) in both runs; base: all `"ok":false` (`Current display surface not available for capture` / `UnknownVizError`); after `app-hidden-after-navigate`: `"attached":true,"windowVisible":false,"ok":false,"ms":8002 ... "no answer within 8 s (harness guard)"` | Observation = FU-004 (not real use) |
| E2E-09 | AC-004 variant | Real-Electron spec (durable, attempted) | App-hidden cases added to `browser-screenshot-capture.electron.spec.ts`; `pnpm -C autobyteus-web test:electron browser/__tests__/browser-screenshot-capture.electron.spec.ts --run` while the screen was locked; then reverted | ENV-3 | Not kept | `E2E-09-durable-app-hide-attempt.txt` | `Tests  1 failed \| 8 passed (9)`; `AC-004-app-hidden","ok":false,"ms":8002` with `"attachedWhileAppHidden":true` | Result depends on the lock state; reverted (`git checkout`); the spec is unchanged from `927079c6cd` |
| E2E-10 | AC-006, REQ-003, QR-001 | same | `node evidence/api-e2e/E2E-10-crash_probe.mjs <src> <label>`: renderer crashed (`forcefullyCrashRenderer`, plain and emulated tab) → `screenshot`; changed and base | ENV-3 | Pass | `E2E-10-crashed-renderer-screenshot-failed.txt`, `E2E-10-crash_probe.mjs` | after: `"code":"browser_screenshot_failed","message":"The tab did not draw a frame to capture within 2 s (empty image)."`, `"ms":2035`/`2034` (first run 2053/2094), `"filesBefore":0,"filesAfter":0` | Base desktop threw the same code at once, but the base server relabelled it `browser_bridge_unavailable` (BEH-003); server pass-through: IMP-04 |

Supporting files: `E2E-all-worktree-run-tool-trace.txt` (every tool call/result of the ENV-1 run), `E2E-all-page-events.jsonl` (every page report), `E2E-tools-*` (page server, trace extractor, send/GraphQL/click helpers, agent definition).

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 (navigate → screenshot, not shown) | Yes | E2E-R1, E2E-02a, E2E-02b, E2E-08 | Proven | — |
| AC-002 (fresh tab never shown) | Yes | E2E-R1, E2E-01, E2E-08 | Proven | — |
| AC-003 (founder's sequence, viewport kept) | Yes | E2E-R1, E2E-01, E2E-02a, E2E-08; baseline E2E-B1 | Proven | — |
| AC-004 (minimized window) | Yes | E2E-R1, E2E-03a (+ restore), E2E-03b, E2E-07 | Proven | — |
| AC-005 (full page, bounds restored) | Yes | E2E-R1, E2E-02a | Proven | — |
| AC-006 (`browser_screenshot_failed`, reason, bounded, no artifact) | Yes | E2E-R2 (stubbed unit), E2E-10 (real Chromium), E2E-R3 (server pass-through) | Proven | — |
| AC-007 (`browser_tab_not_found`, `browser_tab_closed`) | Yes | E2E-R2, E2E-R3, E2E-05 (as the agent receives them), E2E-00; baseline E2E-B1 | Proven | — |
| AC-008 (first capture works → nothing else) | Yes | E2E-R2, E2E-04 | Proven | — |
| QR-001 (≤ 2 s extra) | — | E2E-01..E2E-03b (49–248 ms), E2E-06/E2E-08 (≤ 325 ms), E2E-10 (fail at 2.03–2.09 s) | Proven for real-use states | — |

## Validation Confidence Scorecard

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 96% | Every AC directly proven, each critical one in real Chromium and most through the real agent path (E2E-01..05, E2E-10) | AC-006 not through the agent (no tool can crash a renderer) | — |
| Changed-boundary execution directness | 85% | 96% | Packaged worktree app, founder's runtime, real MCP → server → bridge → shell (E2E-01..05); product modules in pinned Electron (E2E-06..10) | — | — |
| Cross-boundary integration realism and mock gap | 75% | 95% | Real agent, real tool path, codes as received (E2E-05) vs released app (E2E-B1) | Model `claude-haiku-5-5`, not the founder's `sonnet` (the model does not touch the tool path) | — |
| Environment, configuration, identity, and fixture fidelity | 80% | 95% | Isolated-flag gap closed: released app reproduces the founder's errors under the same flags (E2E-B1); flag-free probes in real lock states (E2E-06, E2E-08) | The founder's own machine and page (`/mobile` on 4506) not used | — |
| Failure, edge-case, lifecycle, and recovery evidence | 80% | 93% | Minimize/restore, app hide/show, screen lock, closed/unknown tabs, crashed renderer (E2E-03a/b, E2E-05..08, E2E-10) | A capture that never answers is not bounded (FU-004; seen only in a state automation produces) | FU-004 fix and its test |
| User-surface, browser, and desktop-shell confidence | 80% | 95% | Real shell window, Browser panel open/collapsed, minimize via the OS (E2E-02b, E2E-03a, E2E-04) | Window covered by other windows only via the lock (occlusion) probe, not with the instance (its flag disables occlusion) | — |
| Durable regression coverage quality and relevance | 90% | 92% | Valid real-Electron spec (fails before, passes after) + unit specs (E2E-R1..R3); E2E-09 showed the original 7 cases are lock-state independent | Screen-lock and app-hide states have no durable test (cannot be made deterministic) | — |

- Overall post-repository confidence: 82%
- Overall final confidence: 94.6% (simple average of 96, 96, 95, 95, 93, 95, 92)
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `No` — 94.6 %. The gap is the unbounded never-answering capture (FU-004) and the absence of durable tests for lock/hide states. Neither can be closed by more validation: the first needs a code/design change in a state no user produces; the second cannot be made deterministic. Every real-use scenario found was proven.
- Confidence-limiting residual risks: FU-004 (unbounded wait when `capturePage()` never answers; observed only for an app hidden while the screen was already locked). FU-002 (crash when a tab closes during a pending capture) is unchanged and not exercised.

## Broader Validation Decision

- Decision: `Required` (executed)
- Execution mode: `Project Desktop Validation` (isolated desktop instances of the worktree build and of the released app) + `Lifecycle` (OS window states, screen lock) + temporary real-Electron probes
- Confidence gap it addresses: repository evidence ran the product modules in a harness window, not the packaged app with its shell controller, bridge, server tool, MCP and a real agent; error codes as the agent receives them; window states the user actually produces.
- Browser validation needed: No separate browser probe; no renderer code changed. The renderer was used only to drive the app like a user.

## Desktop Application Validation

- Approach executed: as planned, plus OS-level window control through macOS accessibility of the instance process (CDP has no window domain in Electron) and probes for screen-lock states.
- Cases proving web-equivalent behavior: none changed. Shell-specific or lifecycle behavior: E2E-01..E2E-05 (packaged app), E2E-03a/03b (minimize/restore/app hide), E2E-06..E2E-08, E2E-10 (pinned Electron).
- Effect on any already-running desktop application: `None`. Only the two isolated instances started for this run were touched; the user's app, data and the other recorded instance (`iso-54697-a523`, not running) were left alone. The validation never locked the screen; it waited for macOS to do so.
- Behavior not directly proven: a window covered by other windows in the real app (the instance's flag disables occlusion); covered by the locked-screen occlusion probes (E2E-06/E2E-08) with the same product code.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No` (E2E-00: no `browser_session_*` left)
- Durable coverage added or retained only for compatibility-only behavior: `No`

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No` (E2E-09 tried an addition and reverted it; the spec is identical to `927079c6cd`)
- Added or updated paths attached for proportional test-code review: `Not Applicable`

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| The founder's page (`127.0.0.1:4506/mobile`) | Synthetic pages from the test page server | Founder's data and servers are read-only and not ours | None material: the failure is page-independent (probes, E2E-B1) |
| LLM model | `claude-haiku-5-5` on the founder's runtime | Cheaper; the model only chooses the calls | None for the tool path |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Isolated instance `iso-49942-c50c` (worktree build) | Yes | `pnpm --silent isolated-app stop iso-49942-c50c` | `wasRunning: True`, `dataRootRemoved: True`, both ports released |
| Isolated instance `iso-58364-b826` (released app) | Yes | `pnpm --silent isolated-app stop iso-58364-b826` | same |
| Test page server (pid in `/tmp/ae507/page-server.pid`) | Yes | `kill` | stopped |
| Probe Electron processes and temp dirs (`ae507-*`) | Yes | Each probe exits and removes its temp dir | removed |
| Spec edit of E2E-09 | Yes | `git checkout -- autobyteus-web/electron/browser/__tests__/browser-screenshot-capture.electron.spec.ts` | working tree clean for source/test files |
| Scratch `/tmp/ae507` (scripts, base `git archive`, logs) | Yes | Copied what is evidence into `evidence/api-e2e/`, then removed | removed |
| `autobyteus-web/electron-dist/` build output | Yes (rebuilt by `--build`) | Kept (untracked build output; delivery may reuse or rebuild) | untracked, not committed |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: `None`
- Next recipient from `get_handoff_rules`: see the handoff message (delivery on the direct route)
- Notes: Follow-ups added: FU-004 (bound a capture that never answers; observed only for an app hidden while the screen is locked), FU-005 (isolated instance data root too long for the node's local control socket on macOS). FU-003 was observed again (810x1800 artifact for 412x915 at 2x).
