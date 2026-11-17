# API/E2E Coverage Investigation — browser-tool-errors-507

The plan: what must be proven, how, decisions about existing tests, planned cases. Results are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (Approved, SR-001)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (SR-002)
- Design Spec (required on every route): `design-spec.md` (SR-002, Ready)
- Supplemental Task Artifacts: `evidence/` (designer probes, IMP-* checks), `follow-ups.md` (FU-001..FU-003)
- Design Review Report: `N/A — not applicable` (direct route)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct route, Small + Low)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: implementation complete, IR-001, direct route (message from `/implementation_engineer`, 2026-11-17)
- Prior Investigation Reviewed: None (first round)
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

- REQ-001 / AC-001..AC-005: `screenshot` of a tab not shown on screen (never shown, not the panel's active tab, window minimized) returns a non-empty PNG, including the first screenshot right after `open_tab`, `navigate_to`, `set_device_emulation`; viewport and full page.
- REQ-002 / AC-003, AC-008: nothing visible changes; the emulated viewport is kept; a capture that works at once does nothing else.
- REQ-003 / AC-006: a capture that keeps failing returns `browser_screenshot_failed` with the reason within the bound, no artifact.
- REQ-004 / AC-007: `browser_tab_not_found` for an unknown id, `browser_tab_closed` for a closed tab, as the agent receives them (server tool error code).
- REQ-005: real-Electron regression spec that fails before, passes after (IMP-01, IMP-02).
- QR-001: ≤ 2 s extra on the retry path.
- Design: DS-001 (agent → server tool → bridge client → bridge server → `BrowserTabManager` → `BrowserTabPageOperations`), DS-002 (bounded nudge-and-retry), DS-003 (window holds the view only while visible and not minimized).

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001..SCN-005.
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - SCN-001/003 variant "Browser panel shows another tab": an agent that opened two tabs works on the first while the panel shows the second (an embedded window streaming the run focuses each new agent tab: `browserToolExecutionSucceededHandler.ts`). Trigger: the agent's own `open_tab` calls.
  - SCN-001/003 variant "user left the run's view": the user sends the message and moves to another page of the app while the agent works (the founder's "away" case). Trigger: user navigation in the app.
  - SCN-001 variant "minimized after the tab was shown": the agent's tab is the panel's active tab; the user minimizes the window; the agent navigates and screenshots (the case the window rule exists for). Trigger: user minimizes the window.
  - Restore after minimize: the tab is shown again (DS-003 return spine).
  - Added during execution: "user away, screen locked" (macOS idle lock while the agent works; the founder was on the phone): tabs never shown and a tab shown in a visible window, captured while the screen is locked. Trigger: macOS idle lock (never produced by the validation; probes waited for it).
  - Added during execution: "user hides the app" (Hide AutoByteus / Cmd-H) with the agent tab shown in the panel. Trigger: app hide.
- Recorded as not a real-use scenario after execution: the app hidden *while the screen is already locked*. Only automation produced it (a user cannot act on an app while the screen is locked); it is recorded as observation FU-004 and does not count as a `Fail`.
- The founder's agents run on the `claude_agent_sdk` runtime (`team_run_execution_tree.json` of `product_team_b622…`: `runtimeKind = claude_agent_sdk`, model `sonnet`), which reaches the browser tools through the node's agent-tools MCP (`browser-tools-mcp-adapter-provider.ts`). The journeys use the same runtime.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: None.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 capture of tabs not shown | Changed | design DS-002/DS-003; IMP-01/02 | Real-Electron spec (reused) + real-app journeys through the agent path |
| BEH-002 tab error codes | Changed | `browser-tab-manager.ts`, `browser-tab-types.ts` | Unit (reused) + agent-received codes in the real app |
| BEH-003 `browser_screenshot_failed` | Added (server contract) / Changed (desktop path) | `browser-tool-contract.ts`, `browser-bridge-client.ts` | Unit with stubbed `webContents` (reused); cannot be produced in the real app without making Chromium fail permanently |
| BEH-004 shown tab captured at once | Preserved | AC-008 unit | Unit (reused) + real-app journey: shown tab, page sees no resize |
| BEH-005 emulation kept | Preserved | AC-003 spec | Spec (reused) + real-app journey with `innerWidth/innerHeight` from the page |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | server error-code list | IMP-04 unit tests | None material | — |
| API / transport / contract | Yes | bridge → server code pass-through; MCP result to the agent | IMP-04 (client stubbed HTTP) | The code as the agent receives it through the real MCP path | Real agent run in an isolated instance |
| Frontend component / state | No | — | — | — | — |
| Browser integration / user journey | No (no renderer change) | — | — | The panel's focus behavior decides which tab is shown | Isolated instance |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | No | — | — | — | — |
| Desktop shell / Electron-specific integration | Yes | `BrowserTabPageOperations`, `WorkspaceShellWindow` | IMP-02 spec (product modules in the pinned Electron, own harness window) | Packaged app: real shell controller, real window, launch flags, bridge server, isolated-launch flags | Isolated desktop instance of the worktree build |
| Process / lifecycle | Yes | window minimize/restore | IMP-02 AC-004 (spec window) | The app's main window | Isolated instance, minimize via the OS |
| Persisted-data transition | No (`Not Affected`) | — | — | — | — |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes | Chromium `capturePage` | IMP-02 | Covered by the spec in the pinned Electron | — |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/browser-tool-errors-507`, branch `codex/browser-tool-errors-507`, validated commit `baf0439559` (code = `927079c6cd`; `git diff --name-only 927079c6cd baf0439559` touches only `tickets/`).
- Project type and runtime stack: pnpm monorepo; Electron 42.11.16 desktop (`autobyteus-web`) with embedded Node server (`autobyteus-server-ts`).
- Project testing guideline path(s): `/Users/normy/autobyteus_org/autobyteus-worktrees/browser-tool-errors-507/TESTING.md` (root; no closer `TESTING*.md` under `autobyteus-web/` or `autobyteus-server-ts/`).
- Conflicting, missing, or unclear project instructions: `docs/isolated-app-instances.md` says isolated instances start with `--disable-backgrounding-occluded-windows --disable-renderer-backgrounding`, which a user's app does not have. Those flags could change whether a tab not shown draws. Handled by running the same journey on the released app (1.5.13-beta.7, the founder's version) in an isolated instance with the same flags first: if it fails there as the founder's did, the flags do not hide the defect.
- Changed build-input paths: `None` (`git diff --name-only e4f4b3e176...HEAD`: `autobyteus-web/electron/**`, `autobyteus-web/docs/**`, `autobyteus-server-ts/src/**`, tests, `tickets/**`; no manifest, lockfile, tsconfig, baseline, workflow, contract package or new cross-package import). No fresh-start build case.
- Required environment variables or secrets available: `Yes` — the `claude_agent_sdk` runtime uses the signed-in `claude` CLI under the real `HOME`, which the isolated instance's server receives in its system-baseline environment. No provider key needed; the test vault is not used.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Test layers, rules | Desktop-shell change → Electron main tests + isolated desktop instance; Rule 1 worktree build `pnpm --silent isolated-app start --build`; Rule 2 never the user's app; Rule 5 stop what you started; both typechecks |
| `docs/isolated-app-instances.md`, `skills/autobyteus-isolated-app/SKILL.md` | Isolated instance lifecycle and control | `start --build` / `start` (installed app), `stop <id>`; control via `autobyteus-skills/browser-automation/scripts/browser` with `CHROME_REMOTE_DEBUGGING_PORT=<controlPort> BROWSER_AUTOMATION_ATTACH_ONLY=1` |
| `autobyteus-web/docs/browser_sessions.md` | Screenshot artifact contract | Non-empty PNG, `{tab_id, artifact_path, mime_type}` |
| `autobyteus-web/services/agentStreaming/browser/browserToolExecutionSucceededHandler.ts` | Which agent tab is shown | A window streaming the run focuses each `open_tab` result in the Browser panel |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Isolated instance, worktree build | worktree root | `pnpm --silent isolated-app start --build` | auto data root, free ports | `start` JSON `ok:true` (health + window) | `pnpm --silent isolated-app stop <instanceId>` |
| Isolated instance, released app 1.5.13-beta.7 (baseline) | worktree root | `pnpm --silent isolated-app start` (installed `/Applications/AutoByteus.app`) | same | same | same |
| Test page server | `/tmp/ae507` | `python3 -I tools/page_server.py <free port> page-events.jsonl` | loopback only | `curl /p/smoke` | kill its pid |
| CDP control | — | browser-automation launcher, attach-only | — | `list-tabs` | none |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| A test agent with the browser tools on `claude_agent_sdk` | `createAgentDefinition` GraphQL from the instance's own window (public API) | instance data root only | removed with the data root at `stop` |
| Test pages | test page server | loopback, synthetic | server stopped |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/electron/browser/__tests__/browser-screenshot-capture.electron.spec.ts` (new) | AC-001..AC-005 in the pinned Electron, product modules transpiled from source | REQ-001, REQ-005 | Still Valid | Read: drives `BrowserTabManager` + `WorkspaceShellWindow`; asserts non-empty PNG, bound, emulated viewport, bounds restored, detach while minimized; IMP-01 fails / IMP-02 passes | Reuse IMP-02 |
| `autobyteus-web/electron/browser/__tests__/browser-tab-page-operations.spec.ts` | AC-006 (reject and empty variants), AC-008 | REQ-002, REQ-003 | Still Valid | IMP-03 | Reuse |
| `autobyteus-web/electron/shell/__tests__/workspace-shell-window.spec.ts` | Detach on minimize/hide, attach on restore/show | DS-003 | Still Valid | IMP-03 | Reuse |
| `autobyteus-web/electron/browser/__tests__/browser-tab-manager.spec.ts` | `browser_tab_not_found` / `browser_tab_closed` | REQ-004 | Still Valid | IMP-03 | Reuse |
| `autobyteus-server-ts/tests/unit/agent-tools/browser/browser-bridge-client.test.ts` | pass-through of `browser_tab_*`, `browser_screenshot_failed` | REQ-003, REQ-004 | Still Valid | IMP-04 | Reuse |
| Stale-assertion search | `browser_session_not_found` / `browser_session_closed` anywhere outside `tickets/` | Removed codes | — | grep in Planned Case E2E-00 | none expected |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| E2E-R1 | AC-001..AC-005, REQ-005, QR-001 | Product capture modules in pinned Electron | Reused | IMP-01 (fail before), IMP-02 (pass after) | Ran on `927079c6cd`; nothing outside `tickets/` changed since; evidence has header and RESULT line |
| E2E-R2 | AC-006, AC-007 (desktop), AC-008, DS-003 | Electron main-process suite | Reused | IMP-03 | Same commit; header + totals |
| E2E-R3 | AC-007 (server), BEH-003 pass-through | Server browser tools | Reused | IMP-04 | Same commit |
| E2E-R4 | — | Both typechecks | Reused | IMP-05, IMP-06 | Same commit |
| E2E-00 | REQ-004 (clean cut) | Repository | Temporary Probe | `git grep -n -E "browser_session_(not_found|closed)" -- ':!tickets'` | Removed codes must not survive anywhere |
| E2E-B1 | Baseline for E2E-01, E2E-05 | Released app 1.5.13-beta.7, isolated, real agent | Journey | Founder sequence (user leaves the view) + `pending` + closed tab on the installed released app | Shows the journeys reach the founder's defect under the isolated-launch flags (fails before) |
| E2E-01 | AC-002, AC-003, REQ-001, REQ-002, QR-001 | Worktree build, real `claude_agent_sdk` agent → agent-tools MCP → server tool → bridge → desktop | Journey | User sends the founder's sequence (`open_tab` → `set_device_emulation` mobile 412x915 → `screenshot`) and leaves the run's view for another app page; page log shows `hidden` | The founder's exact case, tab never shown |
| E2E-02a | AC-001, AC-003, AC-005, REQ-001 | same | Journey | Agent opens tab A then tab B; `navigate_to` A → `set_device_emulation` A mobile 412x915 → `screenshot` A → `screenshot` A full page; Browser panel collapsed | Tab not shown (panel closed) |
| E2E-02b | AC-001, REQ-001 | same | Journey | Browser panel opened (real click) showing tab B; `navigate_to` A → `screenshot` A | Tab not the panel's active tab |
| E2E-03 / 03a / 03b | AC-004, REQ-001, DS-003 | same + OS window state (macOS accessibility on the instance process only) | Journey | Agent tab shown in the panel; 03a: window minimized (AXMinimized) → `navigate_to` → `screenshot`; restore → `screenshot`; 03b: app hidden (process visible=false) → `navigate_to` → `screenshot`. Run 1 of 03 happened while the screen was locked (see FU-004) | Window rule in the real app |
| E2E-04 | AC-008, BEH-004, REQ-002 | same | Journey | Shown tab B: `screenshot`; page log shows no event around it | Nothing extra for a shown tab |
| E2E-05 | AC-007, REQ-004 | same | Journey | Agent: `screenshot` with `tab_id` `pending` → `browser_tab_not_found`; `close_tab` then `screenshot` and `navigate_to` → `browser_tab_closed` | Codes as the agent receives them |
| E2E-06 | REQ-001 (screen locked) | Product capture modules in pinned Electron, no isolated flags | Temporary Probe | `E2E-06-occluded_probe.mjs` on changed and base sources while macOS had locked the screen: tab attached to a visible window, navigate → screenshot ×3 + founder sequence | A locked screen cannot be produced by a durable test; added when the screen locked during the run |
| E2E-07 | AC-004 variant (app hidden) | same | Temporary Probe | `E2E-07-apphide_probe.mjs` on changed and base sources: attached tab, `app.hide()`, navigate → screenshot, `app.show()` | Isolates app hide from the screen lock seen in E2E-03 run 1 |
| E2E-08 | REQ-001, AC-001..AC-003 (screen locked) | same | Temporary Probe | `E2E-08-lock_probe.mjs` started by a watcher when macOS locked the screen by itself: detached fresh / after navigate / founder sequence, attached in visible window, app hidden while locked; changed ×2, base ×1 | The founder's likely state (away, display locked) with tabs never shown |
| E2E-10 | AC-006, REQ-003, QR-001 | Product capture modules in pinned Electron | Temporary Probe | `E2E-10-crash_probe.mjs`: tab whose renderer crashed (`forcefullyCrashRenderer`), plain and emulated → `screenshot`; changed and base | The requirements' example of a capture that still fails; proves AC-006 against real Chromium, not only the stubbed unit test |
| E2E-09 | AC-004 variant | Real-Electron spec | Durable (attempted) | App-hidden cases added to `browser-screenshot-capture.electron.spec.ts` and run | Kept only if deterministic; see decision below |

- Test progress log needed: `Yes`

## Durable Coverage To Add

None kept. E2E-09 added an app-hidden case to `browser-screenshot-capture.electron.spec.ts`; it passes with the screen unlocked (E2E-07) but does not answer while macOS has locked the screen (no window `hide` event then; FU-004). Agents run `test:electron` while the user is away, so a case whose result depends on the lock state would fail for reasons outside the code under test; it was reverted. Original note: the journeys need a packaged app, a signed-in runtime CLI and an OS-level minimize; the repository has no harness for an agent-driven isolated-instance journey, and the durable regression for the changed boundary already exists in real Electron (`browser-screenshot-capture.electron.spec.ts`). The journey scripts are kept as evidence.

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None.

## Desktop Application Validation Plan

- Desktop framework / shell: Electron 42.11.16, `WorkspaceShellWindow` + `BrowserShellController` + `BrowserTabManager`, embedded server.
- Testing guideline used: `TESTING.md` (Choosing the path: desktop-shell behavior → Electron main tests + isolated desktop instance).
- Web-equivalent behavior: none changed.
- Shell-specific or lifecycle behavior: capture of native `WebContentsView`s not shown, window minimize/restore.
- Chosen approach: isolated desktop instance of the worktree build; a real agent on the founder's runtime calls the tools through the real MCP → server → bridge path; the page reports its own visibility so "not shown" is observed, not assumed.
- How the run avoids disturbing the running desktop app: isolated instance (own data root, ports, process group); never the user's app; only the instance's own window is minimized.

## Live Environment And Fixture Plan

- Startup order: page server → `isolated-app start --build` (worktree) → CDP attach → create test agent (GraphQL from the instance window) → journeys → stop. Baseline: `isolated-app start` (installed 1.5.13-beta.7) → same agent and journeys → stop.
- Environment choices: isolated-launch flags (see discrepancy above); `claude_agent_sdk` runtime with the signed-in CLI, cheapest model available.
- Health / readiness: `start` JSON `ok:true`.
- Seed data: one agent definition, created per instance.
- Evidence: run trace tool calls and results (from the instance data root), artifact PNG headers (dimensions), page event log, window screenshots, instance log excerpts.
- Owned processes to clean up: both isolated instances, page server, `/tmp/ae507` scratch.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| AC-006 through the agent in the real app | No agent tool can crash a tab's renderer; proven against real Chromium with the product modules (E2E-10), the server pass-through by IMP-04, and the agent-facing pass-through of bridge codes by E2E-05 | Low | No | None |
| Window hidden by `BrowserWindow.hide()` without app hide | The app never hides its window itself (code read: no `hide()`/`minimize()` calls in `autobyteus-web/electron`); app hide was tested instead (E2E-03b, E2E-07) | Low | No | None |
| Sleeping display / locked screen in the real app | The validation never locks the user's screen; covered by probes when macOS locked it by itself (E2E-06, E2E-08), without the isolated flags | Low | No | None |

## Ambiguities Or Reroute Triggers

None at planning time. During execution: the app hidden while the screen is locked gives an unbounded capture wait (FU-004); not a real-use state, recorded as a follow-up, no reroute.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: E2E-B1 runs the released app only to show the journeys reach the defect; it is not a test of this change.
