# Implementation Handoff — project-testing-guideline

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review applied (Medium/High); **ARCH-REV-004 Pass on SR-007**, which supersedes the SR-006 package (ARCH-REV-003). This round's `get_handoff_rules` result: implementation complete, architectural_risk High → `/code_reviewer`.
- Requirements doc: `…/tickets/in-progress/project-testing-guideline/requirements-doc.md` (SR-007; the user's 2026-09-29 note that headless is not a concern is recorded in the SRR)
- Investigation notes: `…/tickets/in-progress/project-testing-guideline/investigation-notes.md`
- Solution revision record: `…/tickets/in-progress/project-testing-guideline/solution-revision-record.md` (SR-001..SR-007)
- Design spec: `…/tickets/in-progress/project-testing-guideline/design-spec.md` (SR-007)
- Supplemental task artifacts: `…/evidence/` (page.html, cdp2.mjs; non-normative)
- Design review report: `…/tickets/in-progress/project-testing-guideline/design-review-report.md` (ARCH-REV-004)
- Architecture review revision record: `…/tickets/in-progress/project-testing-guideline/architecture-review-revision-record.md`
- Triggering rework report: N/A (initial implementation)

(`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/project-testing-guideline`)

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `…/tickets/in-progress/project-testing-guideline/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: SR-006 (partly started, then superseded), SR-007
- Related architecture-review revision IDs: ARCH-REV-003 (superseded), ARCH-REV-004
- Related code-review / API-E2E / delivery revision IDs: N/A
- Triggering finding IDs: N/A

| Repo | Worktree | Branch | Base | Commits |
| --- | --- | --- | --- | --- |
| workspace | `/Users/normy/autobyteus_org/autobyteus-worktrees/project-testing-guideline` | `codex/project-testing-guideline` | `origin/personal` `39e512edd` | `1a035ed15` TESTING.md + links; ticket artifacts in the handoff commit |
| autobyteus-mcps | `/Users/normy/autobyteus_org/autobyteus_mcps-project-testing-guideline` (new worktree) | `codex/project-testing-guideline` | `origin/main` `6b39562` | `38df813` connect-bound split + `PAGE_BLOCKED` · `b5fcdda` SR-007 dialog decisions |

History: SR-006 dialog work (never answer / `PAGE_DIALOG_OPEN`) had started when the Solution Designer put it on hold. Nothing of it was committed; the partial code was removed before the SR-007 implementation. The connect split and `PAGE_BLOCKED`, which were unchanged between SR-006 and SR-007, were committed during the hold as `38df813`.

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `High`
- Design classification reference: design-spec §Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence: public CLI/MCP contract changes in a separately released tool (two optional parameters on two commands, additive `dialogs` result field, two error codes, shorter connect bound for existing browsers, changed default dialog semantics); docs-only workspace side.
- Selected route: `Code Review`
- Lightweight implementation self-review for direct route: `Not Applicable`
- New design impact or escalation trigger: `None`. Escalation triggers checked:
  - Electron page dialogs arrive through the context `dialog` event: verified.
  - A healthy existing-browser connect takes about 0.5 s on Electron, far below 8 s; the real-Chrome suites run without any `PAGE_BLOCKED` on healthy tabs.
  - The recorder coexists: tested.

## Reviewed Behavior Implementation Trace

| Behavior / REQ | Change | Implemented Path / Key Files | Result |
| --- | --- | --- | --- |
| BEH-004 / REQ-006 | Root testing guideline | `TESTING.md` (authored by the Solution Designer; implementation verified it and extended rule 7 with `PAGE_BLOCKED`) | Every script (`autobyteus-web`: `test:nuxt`, `test:electron`, `test`, `test:e2e:electron`, `test:e2e:electron:isolation`, `test:e2e:isolated-app`, 17 `test:e2e:*` probes; server/core `test`; root `test:e2e`, `test:e2e:real(:preflight)`, `secrets:import`, `isolated-app`, `dev`), every command form, and every file link and anchor was verified mechanically. 124 lines. |
| BEH-005 / REQ-007 | Discoverability | `README.md` (Isolated app instances, Packaged Electron API/E2E testing, Testing (Codex Runtime)), `autobyteus-server-ts/AGENTS.md` §Testing, `autobyteus-web/AGENTS.md` Chapter 1, `docs/isolated-app-instances.md` (intro back-link, Related documentation, new "Page dialogs" section, recording bullet, troubleshooting rows) | All 7 new links resolve |
| BEH-006 / REQ-008, REQ-009 | Agent decides own-tab dialogs | `runtime/dialogs.py` (`DialogDecision`, `DialogHandling`, `DialogReport`); `runtime/session.py` `session(dialog_decision)` attaches the listener to every context right after `connect_over_cdp` and keeps it until the client stops, then `resolve_target()`/`open_target()`; `application.py` `_tab_operation()` for `open_tab`, `close_tab`, `navigate`, `read_page`, `screenshot`, `dom_snapshot`, `run_script`; `policy.validate_dialog_option`; `errors.dialog_decision_required`; `contracts` (`DialogReportPayload`, `OpenTabResult`, `dialogs` on tab results); CLI `--dialog`/`--prompt-text` on `run-script`/`navigate`; MCP `dialog`/`prompt_text` on `run_script`/`navigate_to` | Rules matrix implemented; other tabs never touched; results unchanged without dialogs (CLI) |
| BEH-007 / REQ-010 | Blocked browser reported quickly | `runtime/config.py` `connect_timeout_seconds = 8.0` (owned launch keeps 20 s); `session.py` classifies a connect timeout while `/json/version` answers as `PAGE_BLOCKED` (exit 3, retryable), with targets from `/json/list` | Headless Chrome ≤ 10 s; Electron 8.2 s; recovery after answering verified |
| REQ-011 | Docs | browser-automation `SKILL.md` ("Page dialogs" section, recovery entries, recording bullet), `README.md`; `TESTING.md` rule 7; isolated-instance guide | Includes the headless note (MP-005) per the user's note |

## Key Files Or Areas

- mcps `browser-automation/src/browser_automation/`: `runtime/dialogs.py` (new), `runtime/session.py`, `runtime/config.py`, `application.py`, `policy.py`, `errors.py`, `contracts.py`, `cli.py`, `mcp/tools/{run_script,navigate_to,open_tab}.py`; tests `tests/unit/test_dialogs.py` (new), `tests/unit/test_runtime.py`, `tests/integration/test_dialogs_real_chrome.py`, `test_dialogs_mcp_real_chrome.py`, `test_page_blocked_real_chrome.py` (new), `conftest.py` (dialog fixture pages), `support.py` (headful switch); `SKILL.md`, `README.md`.
- workspace: `TESTING.md`, `README.md`, `autobyteus-server-ts/AGENTS.md`, `autobyteus-web/AGENTS.md`, `docs/isolated-app-instances.md`.

## Important Assumptions And Deviations

- **Listener lifetime:** the listener is never detached before disconnect. This follows the ARCH-REV-004 guidance, which overrides DS-1's "detach".
- **Dialog before target:** a dialog raised before the operation knows its target page is held, then answered once the target is set if it belongs to that page. Otherwise it is never touched. Page identity is by Playwright page object.
- **`open-tab` (MP-004):** the new page becomes the target, with its tab id read while it is still dialog-free, before `goto`. A dialog on load is dismissed to unblock and reported as `DIALOG_DECISION_REQUIRED`, with the hint to use `navigate`/`run-script`. It is never left open.
- **`decided_by`** is `"agent"`, `"unblock"`, or `null` for an `alert`, which needs no decision.
- **`DIALOG_DECISION_REQUIRED` wins over a failure** the dismissal caused (for example a `goto` interrupted by the dismissed dialog). The dialog is the actionable cause.
- **Late own-tab dialogs:** reports are read after disconnect, so an own-tab dialog raised after the work but before disconnect is included.
- **MCP deviation from "byte-identical":** FastMCP 1.28.1 dumps an absent optional `TypedDict` key as `null` and then validates it against its own schema. So `dialogs` is declared nullable, and MCP structured results carry `"dialogs": null` when no dialog occurred. CLI output is byte-identical.
- **`contracts.py` postponed annotations:** `from __future__ import annotations` was removed there, because stdlib `TypedDict` then cannot see `NotRequired` (every key became required). This also makes the pre-existing `ErrorPayload.details` optional, as intended.
- **Bug found and fixed during testing:** `DialogHandling.settle()` first relied on done-callbacks to empty its task set. `gather` over already-finished tasks does not yield, so it busy-looped. `settle()` now waits only on unfinished tasks.
- **Test support:** `BROWSER_AUTOMATION_TEST_HEADFUL=1` runs the real-Chrome suites against a visible Chrome.

## Validation Findings (MP-003 and MP-005)

- MP-003 was probed while SR-006 was current: does a pending dialog stay open after the operation's Playwright client disconnects?
  - Yes, on headless Chrome with http pages (8 of 8 runs) and on an Electron isolated instance (2 of 2).
  - A raw CDP client disconnect also keeps it open.
  - The exception is a `chrome-error://` page, where it is cancelled. That is not a supported page for app dialogs.
- MP-005, whether an other-tab dialog is left open: headless Chrome and headful Chrome both kept it open in the integration test. The user's note makes headless a documented limitation only, so `SKILL.md` says headless "may cancel" it.

## Known Risks

- **Undecided dialogs:** without a decision, the action runs with a dismissed dialog, and side effects before the dialog may repeat on retry. This is documented, and agents are told to pass `--dialog` when an action is expected to ask.
- **`PAGE_BLOCKED` is heuristic:** it may also mean a hung page. The message names both.
- **"Leave site?" needs user activation:** Chrome only shows it for pages the user has interacted with (documented). The test gives the page activation with a trusted CDP click.
- **Unrelated running instance:** an isolated instance `iso-9333-b35d` from another worktree (`chat-interface-entry`) was running during validation. It was not touched.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Feature + error-behavior fix
- Root cause classification: Missing Invariant (implicit auto-dismiss; conflated connect bound)
- Refactor decision: `No Refactor Needed` (one owned concern at the session boundary plus the connect split), as implemented
- Implementation matched the assessment: `Yes`
- Routed as Design Impact: `No` (no trigger fired)

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`. Implicit auto-dismiss is removed, with no switch.
- Legacy behavior retained: `No`
- Dead code removed: `Yes`. The partial SR-006 code was removed before commit.
- Shared structures tight: `Yes`. `OpenTabResult` specialises `TabSummary`, so `list-tabs`/`attach-tab` results are unchanged.
- Source files within size guardrails: `Yes`. The largest is `application.py` at 467 lines.

## Persisted Data Transition Check

- `Not Affected`.

## Environment Or Dependency Notes

- No new dependencies. `uv.lock` is unchanged.

## Local Implementation Checks Run

- mcps unit: 163/163.
- mcps real-Chrome integration, headless: 34/34 (full suite), including new dialog 8, MCP parity 1, `PAGE_BLOCKED` 1.
- Headful Chrome (`BROWSER_AUTOMATION_TEST_HEADFUL=1`): dialog + `PAGE_BLOCKED` + MCP suites, 10/10.
- Electron isolated instance (installed 1.4.91-beta.6), live through the CLI launcher:
  - `window.confirm` with `--dialog accept` → accepted and reported;
  - without a decision → `DIALOG_DECISION_REQUIRED` in 0.5 s, and the next command works;
  - `PAGE_BLOCKED` in 8.2 s with the tab listed, and recovery after answering;
  - healthy connects take about 0.5 s.
  - The instance was stopped afterwards.
- Workspace: mechanical verification of all `TESTING.md` scripts, links and anchors; all new `TESTING.md` links resolve.

These are implementation-scoped checks, not API/E2E sign-off.

## Frontend Rendered-Result Check

Not Applicable. No product UI changes; browser-automation output and documentation only.

## Downstream Coverage Hints / Suggested Scenarios

- AC-009 on a real AutoByteus confirm flow in an isolated instance (for example Settings → Nodes → remove node) with `--dialog accept` and without.
- AC-010: a dialog raised between commands → `PAGE_BLOCKED` ≤ 10 s → answered on screen → recovery.
- AC-008 walk-through: an agent given only `TESTING.md` plans a web-only change and a desktop-shell change.
- The MCP adapter over real stdio with the new parameters (the in-memory MCP parity test already passes).
