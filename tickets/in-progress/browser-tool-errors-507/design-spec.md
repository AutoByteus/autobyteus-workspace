# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-002`
- Approved requirements baseline: `requirements-doc.md` at SR-001, approved by the Solution Designer within the Task's direction (user informed in this conversation, 2026-11-17)
- Behavior-defining supplements: None
- User approval of the design, when the direction requires it: `Not required`
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/browser-tool-errors-507/tickets/in-progress/browser-tool-errors-507/investigation-notes.md`
- Authorities read (2026-11-17): `references/architecture-design.md`, `references/design-principles.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/browser-tool-errors-507/DESIGN.md` (whole file); `autobyteus-web/docs/browser_sessions.md` (screenshot artifact contract); `TESTING.md` (Electron specs)
- Project design-principle conflicts or discrepancies: None

## Current-State Read

`screenshot` runs: server tool (`autobyteus-server-ts/src/agent-tools/browser/screenshot.ts`) → `BrowserBridgeClient.post('/browser/screenshot')` (`browser-bridge-client.ts:154-191`) → `BrowserBridgeServer` (`autobyteus-web/electron/browser/browser-bridge-server.ts:144-151`) → `BrowserTabManager.captureScreenshot` (`browser-tab-manager.ts:107-114`) → `BrowserTabPageOperations.captureScreenshot` / `captureSessionPage` (`browser-tab-page-operations.ts:36-56, 162-216`), which calls `session.view.webContents.capturePage()` exactly once (line 168, or 208 for full page) and writes the PNG through `BrowserScreenshotArtifactWriter`.

Each tab is a `WebContentsView`. It is attached to a window only while it is the active tab of a shell that has host bounds (`browser-shell-controller.ts:361-378` → `workspace-shell-window.ts:98-126`); agent tabs are focused into the panel only by an embedded window streaming that run (`services/agentStreaming/browser/browserToolExecutionSucceededHandler.ts:30-58`). So most agent tabs are not shown. The window keeps its attached view while it is minimized or hidden (`workspace-shell-window.ts:108-126` has no visibility condition).

Measured in Electron 42.11.16 (investigation-notes.md, Runtime findings): Chromium copies only a frame the tab has drawn. A tab not shown stops drawing; the first capture after its page loaded or navigated is rejected (`UnknownVizError`; a never-drawn tab `Current display surface not available for capture`) however long one waits. A 1 px resize of the view and a retry gets a frame within ≤ 420 ms; a plain retry does not for a never-drawn tab. A tab in a minimized or hidden window cannot be captured even with the resize (rejection or no answer); the same tab detached from that window can.

Error codes: the bridge labels any non-`BrowserTabError` `browser_navigation_failed` (`browser-bridge-server.ts:203-210`), so a capture rejection reaches the agent as a navigation failure. The desktop sends `browser_session_not_found` / `browser_session_closed` (`browser-tab-manager.ts:309-333`) and `browser_screenshot_failed` (`browser-tab-page-operations.ts:43-47`); the server knows none of them (`browser-bridge-client.ts:42-53`) and turns them into `browser_bridge_unavailable` (`:193-198`).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`
- Size rationale: 4 source files changed (`browser-tab-page-operations.ts`, `workspace-shell-window.ts`, `browser-tab-types.ts`/`browser-tab-manager.ts` code names, server `browser-tool-contract.ts` + `browser-bridge-client.ts` code list), each a local change in its existing owner; 1 new Electron spec, unit test updates, 1 doc section.
- Architectural risk: `Low`
- Risk rationale: no new owner, API, route, persistence or concurrency. The error-code change is a clean cut inside one release (DESIGN.md rule 9); the result shape is unchanged. Detaching the view of a minimized/hidden window is invisible to the user. Uncertainty was removed by real-Electron probes of the exact mechanism (`evidence/design-check-out.txt`, 24 of 24).
- Escalation trigger: the Electron spec does not pass in the pinned Electron, the retry needs more than 2 s in any AC situation, or detaching on minimize shows a visible artifact on restore → return a Design Impact.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Probe | `evidence/kick.js`, `evidence/kick-out.txt` | Not shown: first capture after navigation fails 12/12 at 0–5 s waits; retry 300 ms later ok 12/12. Shown: ok 12/12 | Retry after failure; no wait before the first attempt | — |
| Probe | `evidence/strategies.js`, `strategies-out.txt` | Never-drawn tab: plain retry, `invalidate()`, `stayHidden` 0/9; resize nudge 9/9 in ≤ 222 ms | Resize nudge before each retry | — |
| Probe | `evidence/nudge-kinds.js`, `nudge-out.txt` | 1 px move does not wake a never-drawn tab (0/3); resize does (6/6); emulated `innerWidth` unchanged; page gets 1–2 `resize` events | Resize, only after a failed attempt | Pages see a resize event on the retry path only |
| Probe | `evidence/minimized.js`, `minimized2.js`, outputs | Minimized window: capture fails or never answers, also with nudge or `stayHidden`; detached from it: ok at once | Window does not hold its view while minimized/hidden | — |
| Probe | `evidence/throttling.js`, `throttling-out.txt` | `backgroundThrottling: false` does not help (0/3 never-drawn; hangs in hidden window) | Rejected | — |
| Probe | `evidence/design-check.js`, `design-check-out.txt` | Designed mechanism: 24/24 ok, max 358 ms: fresh, after navigate, full page, founder's emulated sequence (`innerWidth` same before/after), minimized and hidden window with the rule, and after restore | The whole design | — |
| Probe (side observation) | `evidence/throttling.js` first runs | Destroying a view while a capture is still pending crashed the probe's Electron (SIGTRAP) | Not designed for; FU-002 | Chromium-level |
| Code | `autobyteus-web/electron/browser/__tests__/browser-file-document-request.electron.spec.ts` | Established pattern: transpile product sources, run them in the pinned Electron binary, assert on a `RESULT` line | Regression spec pattern | — |

## Intended Change

Make the screenshot capture owner retry a failed or empty capture with a 1 px resize nudge for up to 2 s, and fail with `browser_screenshot_failed` and the reason after that; make the shell window not hold its browser view while minimized or hidden; align the bridge's tab error codes with the server contract and add `browser_screenshot_failed` to it.

## Change Scope (Mandatory)

- In scope: UC-001, UC-002. Areas: Electron screenshot capture (`BrowserTabPageOperations`), shell window projection (`WorkspaceShellWindow`), Electron tab error codes (`browser-tab-types.ts`, `browser-tab-manager.ts`), server browser tool error contract (`browser-tool-contract.ts`, `browser-bridge-client.ts`), the screenshot section of `autobyteus-web/docs/browser_sessions.md`.
- Derived consumers: `BrowserToolErrorCode` feeds `toBrowserToolErrorPayload` (`browser-tool-serialization.ts`) and the MCP adapter (`agent-tools/mcp/providers/browser-tools-mcp-adapter-provider.ts:46`): both pass the code through unchanged; no decision needed beyond the type. `BrowserTabErrorCode` is read only by the bridge server (passes through) and tests.
- Deliberately left alone: shell projection policy for which tab is shown (`browser-shell-controller.ts`); `set_device_emulation` presentation scaling (FU-003); the bridge's generic default code for other unexpected errors (FU-001); `run_script`; the Docker-node Playwright tool.
- Follow-ups: FU-001, FU-002, FU-003.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / ACs | Approved Trigger | Existing Behavior And Evidence | Approved Change Or Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001, REQ-005; AC-001..AC-005 | `screenshot` | One capture; fails when the tab has not drawn | Bounded nudge-and-retry; minimized/hidden windows do not hold the view | DS-001, DS-002, DS-003 |
| BEH-002 | Contract | REQ-004; AC-007 | Any tool with a wrong/closed `tab_id` | `browser_bridge_unavailable` | `browser_tab_not_found` / `browser_tab_closed` | DS-001 (error return) |
| BEH-003 | Contract | REQ-003; AC-006 | `screenshot` that cannot be taken | `browser_navigation_failed` / `browser_bridge_unavailable` | `browser_screenshot_failed` with reason | DS-001, DS-002 |
| BEH-004 | System | REQ-002; AC-008 | Shown tab | Capture at once | Unchanged; no nudge when the first attempt succeeds | DS-002 |
| BEH-005 | System | REQ-002; AC-003 | Emulated tab | Emulation kept | Unchanged after screenshot (nudge restores the same bounds; probe: same `innerWidth`) | DS-002 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To This Design | Status |
| --- | --- | --- | --- | --- |
| `evidence/` | Probes and trace scans | REQ-001..REQ-005 | Mechanism choice and the regression spec's scenarios | Final, evidence only |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Current design issue found: `Yes` (small)
- Structural triggers: *Repeated coordination* — no: the retry policy has one owner (`BrowserTabPageOperations`), no caller repeats it. *Vocabulary drift* — fires: the bridge says `session_not_found`/`session_closed` where the tool contract says `tab_not_found`/`tab_closed`; response: one word, the contract's (Principle 15). *Behavior by absence* — fires: a capture rejection becomes "navigation failed" because the bridge's catch-all finds no `BrowserTabError`; response: the capture owner throws its own typed `browser_screenshot_failed`. *Empty indirection* — not fired: no new layer. *Several kinds or forms* — the capture serves viewport and full page, detached tabs and tabs in a window: each traced in the probes and covered by an AC.
- Deliberate deviations: None
- Root cause classification: `Missing Invariant` — the capture owner assumes a frame is always available; it must make the tab draw and retry. Plus a `Local Implementation Defect` in the error-code vocabulary.
- Refactor needed now: `No`
- Evidence: owners are correct (capture in `BrowserTabPageOperations`, window projection in `WorkspaceShellWindow`); each fix is local to its owner; files stay small (217 and 137 lines).
- Design response: see Intended Change.
- Refactor rationale: N/A.
- Intentional deferrals and residual risk: FU-001..FU-003. Residual: a capture that never answers outside minimized/hidden windows is not bounded (no production evidence: no built-in screenshot call over 30 s in 4,222; DESIGN.md "start simple").

## Terminology

- *Shown tab*: a tab whose view is attached to a window that is visible and not minimized. *Not shown*: any other tab.
- *Nudge*: setting the view's bounds 1 px wider and back to its current bounds, which makes Chromium draw a new frame.
- Glossary: no new domain word for `GLOSSARY.md`; "tab" is the tool contract's word, now used by the bridge's error codes too.

## Legacy Removal Policy (Mandatory)

- Obsolete paths: the Electron codes `browser_session_closed` and `browser_session_not_found` (renamed, clean cut); the separate `png.length` check in `captureScreenshot` (replaced by the attempt loop's empty-image rule).
- Compatibility wrappers kept: `None` (DESIGN.md rule 9: desktop and server ship together).

## Persisted Data / State Transition Decision

- Decision: `Not Affected` — no stored data; error codes are transient tool results (saved traces keep their old text as history; nothing reads codes from them).

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001..BEH-003 | Agent's `screenshot` call | Tool result (artifact or typed error) to the agent | Server browser tool → bridge → `BrowserTabManager` | The path of the failure and of its error code |
| DS-002 | Bounded Local | BEH-001, BEH-003..BEH-005 | Capture request inside `BrowserTabPageOperations` | Non-empty image or `browser_screenshot_failed` | `BrowserTabPageOperations` | The retry loop |
| DS-003 | Return-Event | BEH-001 | Window `minimize`/`hide`/`restore`/`show` event | View detached / attached again | `WorkspaceShellWindow` | Makes tabs of an invisible window capturable |

## Primary Execution Spine(s)

DS-001: `Agent -> screenshot tool (server) -> BrowserBridgeClient -> BrowserBridgeServer -> BrowserTabManager.captureScreenshot -> BrowserTabPageOperations.captureScreenshot (DS-002) -> BrowserScreenshotArtifactWriter -> result {tab_id, artifact_path, mime_type} or error {code, message}`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The agent asks for a screenshot of its tab; the server forwards to the desktop bridge; the tab manager finds the tab and asks the page operations for a capture; the PNG is written and its path returned. A typed failure travels back with its own code. | tab, capture, artifact | `BrowserTabManager` (tab lookup), `BrowserTabPageOperations` (capture) | error-code vocabulary (bridge client list) |
| DS-002 | Try `capturePage()`. A non-empty image ends the loop. A rejection or empty image: if 2 s have passed since the first attempt, throw `browser_screenshot_failed` with the last reason; otherwise nudge the view (its current bounds +1 px wide, then back), wait 100 ms, try again. | capture attempt | `BrowserTabPageOperations` | — |
| DS-003 | On `minimize`/`hide` the window removes its browser view; on `restore`/`show` it adds the desired view again. The projection rule: hold the desired view only while the window is visible and not minimized. | window, browser view | `WorkspaceShellWindow` | — |

## Spine Actors / Main-Line Nodes

Server `screenshot` tool, `BrowserBridgeClient`, `BrowserBridgeServer`, `BrowserTabManager`, `BrowserTabPageOperations`, `BrowserScreenshotArtifactWriter`; for DS-003 `WorkspaceShellWindow`.

## Ownership Map

- `BrowserTabPageOperations`: owns how a page is captured, now including the attempt loop, the nudge, the deadline and the `browser_screenshot_failed` error. Full page: it already owns the temporary enlargement; the loop nudges the enlarged bounds it set.
- `WorkspaceShellWindow`: owns which view is attached to its window; now also the rule "no view while minimized or hidden".
- `BrowserTabManager`: owns tab lookup and its not-found/closed errors (codes renamed).
- Server `browser-tool-contract.ts`: owns the agent-facing error vocabulary; `browser-bridge-client.ts` owns which bridge codes pass through.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `BrowserBridgeServer` route `/browser/screenshot` | `BrowserTabManager` | HTTP transport | Capture retry or error translation for the screenshot path |

## Removal / Decommission Plan (Mandatory)

| Item To Remove | Why It Becomes Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| `'browser_session_closed'`, `'browser_session_not_found'` in `BrowserTabErrorCode` and their throws | Second name for the contract's `browser_tab_closed` / `browser_tab_not_found` | Those names | Update `browser-tab-manager.spec.ts:300` and others asserting the old names |
| `png.length` check in `captureScreenshot` (`browser-tab-page-operations.ts:42-48`) | The attempt loop treats an empty image as a failed attempt and throws `browser_screenshot_failed` | DS-002 | Writer's own empty-buffer guard stays (artifact contract) |

## Return Or Event Spine(s) (If Applicable)

DS-003: `BrowserWindow 'minimize'|'hide'|'restore'|'show' -> WorkspaceShellWindow.applyBrowserProjection -> contentView.removeChildView / addChildView`.

## Bounded Local / Internal Spines (If Applicable)

DS-002, parent `BrowserTabPageOperations`: `capturePage -> (non-empty: return) | (failed/empty: deadline? throw : nudge -> wait 100 ms -> capturePage)`. It matters because one attempt is not enough for a tab not shown, and the bound keeps the tool answering within QR-001.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Error-code pass-through list | DS-001 | `BrowserBridgeClient` | Which bridge codes reach the agent | Unknown codes become `browser_bridge_unavailable` | — |

## Ownership Boundaries

The capture retry stays inside `BrowserTabPageOperations`; neither the bridge nor the server retries (one policy, one owner). The window rule stays inside `WorkspaceShellWindow`; the shell controller keeps deciding *which* view is desired and does not learn about window visibility.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `BrowserTabManager.captureScreenshot` | `BrowserTabPageOperations` attempt loop | Bridge server | Bridge or server calling `capturePage` or retrying itself | Extend `BrowserTabPageOperations` |
| `WorkspaceShellWindow.attachBrowserView` | add/remove child view, visibility rule | `BrowserShellController` | Controller adding/removing child views on window events | Extend `applyBrowserProjection` |

## Dependency Rules

Unchanged directions. `BrowserTabPageOperations` uses only the session's `view` and `viewportBounds` it already receives. `WorkspaceShellWindow` subscribes to its own `browserWindow` events in its constructor. No new collaborator, lookup or after-construction connection: `None` (Principle 16).

## Interface Boundary Mapping

| Interface / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `BrowserTabPageOperations.captureScreenshot(session, fullPage, boundsHooks?)` | one tab's capture | Unchanged signature; new failure semantics | `BrowserTabRecord` | — |
| Bridge/tool error `{code, message}` | error | Codes now from one vocabulary | — | Adds `browser_screenshot_failed` |

No new interface, port, adapter or wrapper.

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `captureScreenshot` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Natural? | Same Meaning Everywhere? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- | --- |
| Missing tab error | `browser_session_not_found` → `browser_tab_not_found` | Yes | Yes after the change | Was High | Rename (clean cut) |
| Closed tab error | `browser_session_closed` → `browser_tab_closed` | Yes | Yes after the change | Was High | Rename |
| Screenshot error | `browser_screenshot_failed` (desktop) → also in server contract | Yes | Yes | — | Add to server contract |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Retry a capture | `BrowserTabPageOperations` | Extend | Owns capture already | — |
| Window visibility rule | `WorkspaceShellWindow.applyBrowserProjection` | Extend | Owns attachment already | — |
| Error type | `BrowserTabError` / `BrowserToolError` | Reuse | Existing typed errors | — |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/electron/browser` | capture, tab errors | DS-001, DS-002 | `BrowserTabManager` | Extend | — |
| `autobyteus-web/electron/shell` | window projection | DS-003 | `WorkspaceShellWindow` | Extend | — |
| `autobyteus-server-ts/src/agent-tools/browser` | tool error contract | DS-001 | server tools | Extend | — |

## Draft File Responsibility Mapping

As final mapping below (no shared structure to extract).

## Reusable Owned Structures Check

N/A — no repeated structure; the retry exists once.

## Shared Structure / Data Model Tightness Check

| Shared Structure | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlap Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `BrowserTabErrorCode` / `BrowserToolErrorCode` | Yes after rename | Yes | Low | Rename two desktop codes; add one server code |

## Final File Responsibility Mapping

| File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/electron/browser/browser-tab-page-operations.ts` | electron/browser | `BrowserTabPageOperations` | Capture with bounded nudge-and-retry for viewport and full page | Existing capture owner | `BrowserTabError` |
| `autobyteus-web/electron/shell/workspace-shell-window.ts` | electron/shell | `WorkspaceShellWindow` | Hold the browser view only while visible and not minimized | Existing projection owner | — |
| `autobyteus-web/electron/browser/browser-tab-types.ts`, `browser-tab-manager.ts` | electron/browser | tab errors | Rename codes | Existing | — |
| `autobyteus-server-ts/src/agent-tools/browser/browser-tool-contract.ts`, `browser-bridge-client.ts` | server browser tools | error contract | Add `browser_screenshot_failed`; pass it through | Existing | — |
| `autobyteus-web/electron/browser/__tests__/browser-screenshot-capture.electron.spec.ts` (new) | tests | — | Real-Electron regression for AC-001..AC-005 | One scenario set, one Electron run | Pattern of `browser-file-document-request.electron.spec.ts` |
| `autobyteus-web/electron/browser/__tests__/browser-tab-page-operations.spec.ts` | tests | — | AC-006, AC-008 with stubbed `webContents` | Existing unit spec | — |
| `autobyteus-web/electron/shell/__tests__/workspace-shell-window.spec.ts` (new or existing) | tests | — | Detach on minimize/hide, attach on restore/show | — | — |
| `autobyteus-server-ts/tests/unit/agent-tools/browser/browser-bridge-client.test.ts` | tests | — | AC-007, `browser_screenshot_failed` pass-through | Existing | — |
| `autobyteus-web/docs/browser_sessions.md` | docs | — | Screenshot section: capture of tabs not shown, window rule, error codes | Existing contract doc | — |

## Applied Patterns (If Any)

Bounded retry inside the owner (DS-002). No other pattern.

## Target Subsystem / Folder / File Mapping

As Final File Responsibility Mapping; no folders created or moved.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `autobyteus-web/electron/browser` | Main-Line Domain-Control | Yes | Low | Unchanged layout |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Attempt loop | `const startedAt = Date.now(); for (;;) { try { const image = await wc.capturePage(); if (!image.isEmpty()) return image; reason = 'empty image' } catch (e) { reason = message(e) } if (Date.now() - startedAt >= CAPTURE_DEADLINE_MS) throw new BrowserTabError('browser_screenshot_failed', \`The tab did not draw a frame to capture within 2 s (${reason}).\`); nudge(session.view, session.viewportBounds); await sleep(CAPTURE_RETRY_INTERVAL_MS) }` | Waiting before the first attempt (does not help: probe), or nudging before every capture (fires resize events in pages the user watches) | First attempt stays free for shown tabs (AC-008) |
| Nudge | `view.setBounds({ ...bounds, width: bounds.width + 1 }); view.setBounds(bounds)` with `bounds = session.viewportBounds` (the enlarged bounds during full page) | Moving `x` by 1 px (does not wake a never-drawn tab), `invalidate()`, `stayHidden` (probes: 0 of 9) | Only the resize works |
| Window rule | `applyBrowserProjection(): const nextView = this.isShowing() ? this.desiredBrowserView : null` with `isShowing = isVisible() && !isMinimized()`; constructor: `for (e of ['minimize','restore','hide','show']) browserWindow.on(e, () => this.applyBrowserProjection())` | The shell controller detaching views on window events | One owner for attachment |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement |
| --- | --- | --- | --- |
| Server accepting both `browser_session_not_found` and `browser_tab_not_found` | An older desktop with a newer server | Rejected | DESIGN.md rule 9: same release; desktop sends `browser_tab_*` |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Add the Electron spec (AC-001..AC-005) and see it fail on the current code (record the failing output in the implementation handoff).
2. Implement DS-002 in `browser-tab-page-operations.ts`; update its unit spec (AC-006, AC-008).
3. Implement DS-003 in `workspace-shell-window.ts` with its unit spec.
4. Rename the two desktop codes; add `browser_screenshot_failed` to the server contract and pass-through list; update tests (AC-007).
5. Run the Electron spec green; update `docs/browser_sessions.md`.

## Key Tradeoffs

- A page whose first capture fails sees 1–2 `resize` events (width +1 and back). Accepted: only on the failing path, i.e. a tab nobody is looking at; full page already resizes the view today.
- Detaching the view of a minimized/hidden window: invisible to the user; on restore the view is attached again and captures at once (probe 6/6).
- Rejected: showing agent tabs in a window (changes what the user sees), `backgroundThrottling: false` (does not help, measured), retry in skills (every team affected; does not fix never-drawn or minimized tabs).

## Risks

- A future Electron may change the copy behavior: the Electron spec runs against the pinned version and will show it.
- A capture that never answers outside minimized/hidden windows is not bounded (no production evidence). Destroying a tab while a capture is pending can crash Electron (probe; FU-002).

## Guidance For Implementation

- Reproduction to start from: `evidence/design-check.js` and `evidence/kick.js` (run with the pinned Electron: `env -u ELECTRON_RUN_AS_NODE <autobyteus-web/node_modules/electron binary> --user-data-dir=<tmp> evidence/kick.js`). The new spec must fail on the current code for AC-001, AC-002, AC-003 and AC-004, and pass after.
- The spec transpiles `browser-tab-page-operations.ts` (and its imports) and `workspace-shell-window.ts` as `browser-file-document-request.electron.spec.ts` does, runs them in the pinned Electron, and asserts the PNG is non-empty (decode the PNG header size or `nativeImage` size) and the AC-specific checks (`innerWidth`/`innerHeight` unchanged for AC-003, bounds restored for AC-005, view detached while minimized for AC-004). Use a test-owned `--user-data-dir`. Show a window only where the case needs one (AC-004); skip without a display as the existing spec does.
- Constants: `CAPTURE_DEADLINE_MS = 2000`, `CAPTURE_RETRY_INTERVAL_MS = 100`; the error message names the last Chromium reason.
- Do not destroy views with a capture still pending in the spec (FU-002 crash).
