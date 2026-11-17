# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `browser-tool-errors-507`
- Request / ticket: Project Task `autobyteus-507` (project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the founder
- Requirements owner: Solution Designer (`software_engineering_team_3d7d5fec66ac45b7a4dd130eb4f3671d`)
- Date: 2026-11-17
- Approved by and reference: `Solution Designer within the direction (user informed)`; reference: this conversation's message to the user, 2026-11-17 (SR-001), and the investigation result sent with the handoff
- Exact approved requirements baseline / solution revision: this document at SR-001
- Behavior-defining supplements and their approved versions: None

## Problem And Desired Outcome

- Problem: agents' `screenshot` calls fail with `{"code":"browser_navigation_failed","message":"UnknownVizError"}` (or `"Current display surface not available for capture"`) whenever the tab is not shown on screen at that moment: the agent works in the background, the user is away or on the phone, the app window is covered, minimized or asleep. The first capture after a page load or navigation fails however long the agent waits; often the next attempt works, sometimes not. The error codes also mislead: a screenshot failure is labelled a navigation failure, and a call with a tab id that does not exist is labelled "bridge unavailable". The founder's Product team run hit it twice in a row and the agent abandoned the built-in browser.
- Affected actors or systems: every agent that uses the built-in browser's `screenshot`: Product team (designer, baseline bootstrapper), Software Engineering team (implementation and API/E2E validation), Article Writing team (browser check), standalone agents. Not the Docker-node agents (Computer Use Operator, marketers) in the saved data: they use a different, Playwright-based browser tool.
- Desired outcome: a screenshot of a tab the agent opened returns the image whether or not the user is looking at that tab, and a failure that does remain says what failed.
- Observable definition of success: the founder's sequence (open the page, set mobile emulation, screenshot) returns an image with the tab not shown; the regression test in the real Electron the app ships fails before the change and passes after.

## Answer To The Founder's Question (summary of the evidence)

- **It is the tools, not the agents.** The agents call `open_tab` → `screenshot` correctly on tabs they opened. The screenshot tool makes one capture attempt, and Chromium refuses to copy a tab that has not drawn a frame since its page loaded. A tab draws only while it is on screen; agents' tabs mostly are not.
- One of the founder's errors is the agent's own: `set_device_emulation` with `tab_id: "pending"`, sent in parallel with `open_tab` before its result. It is the only such call in all saved runs (1 of 143 `set_device_emulation` calls), and the agent corrected it 1.5 s later. No skill or instruction change is warranted.
- No environment cause: no other agent used the browser at that time; tab `c0cde0` was used only by the bootstrapper; memory is not involved (the failure is a missing frame, reproduced on an idle machine).
- Measured over every saved run (2026-04 to 2026-11-17): 255 of 4,222 screenshots failed (6 %); 176 of them are this frame failure, on all teams; the first screenshot after a `navigate_to` fails 11 %, after `open_tab` 6 %. Earlier Product team runs had it too (e.g. one designer run 37 failures in 254 screenshots).

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001, SCN-002, SCN-003 | Screenshot of a tab not shown fails when the tab has not drawn since its load/navigation: `UnknownVizError` / `Current display surface not available for capture` | Screenshot returns the image | Result shape `{tab_id, artifact_path, mime_type}`; empty images never returned as success | investigation-notes.md, Runtime findings |
| BEH-002 | Contract | SCN-004 | Unknown or closed tab id → `browser_bridge_unavailable` | `browser_tab_not_found` / `browser_tab_closed` | Message text naming the tab | founder run seq 69; code |
| BEH-003 | Contract | SCN-005 | A screenshot that cannot be taken → `browser_navigation_failed` (capture rejection) or `browser_bridge_unavailable` (empty image) | `browser_screenshot_failed`, with the underlying reason | — | trace scan; code |
| BEH-004 | System | SCN-001 | Shown tab: capture succeeds at once | Unchanged; nothing extra happens to a tab that captures at once | What the user sees in the browser panel | probe kick.js attached-shown |
| BEH-005 | System | SCN-003 | Mobile emulation set by `set_device_emulation` | Unchanged by taking a screenshot | Emulated viewport width/height | probe nudge-kinds.js |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Founder | Agents work while he is away or on the phone | Screenshots work without him watching | Release only on his word |
| Agents using the built-in browser | See the page they work on | Image returned; clear error otherwise | — |
| User watching a tab in the browser panel | See the page | No visible change caused by the fix | — |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | An agent takes a screenshot (viewport or full page) of a tab it opened, while the tab is not shown on screen | SCN-001, SCN-002, SCN-003 |
| UC-002 | An agent receives a browser tool error that names what failed | SCN-004, SCN-005 |

### Out Of Scope

- How the browser panel shows or focuses agent tabs (shell projection); the tab-strip UI.
- `run_script` failures: they are the agents' own script errors (thrown errors, non-cloneable return values), not the tool.
- The Docker-node Playwright browser tool used by the Computer Use Operator and marketers.
- The bridge's generic default code for unexpected non-browser errors other than the screenshot path (follow-up FU-001).
- Skill or instruction changes for the Product team (no cause found; DEC-004).

### Non-Goals

- No new tool, parameter or option; no change to the screenshot result shape.
- Not making every Chromium rendering situation capturable (for example a renderer that crashed); those still fail, with a clear error.

### Preserved Behavior Boundary

- BEH-004, BEH-005; the screenshot artifact contract in `autobyteus-web/docs/browser_sessions.md` (non-empty PNG only, same result shape); full-page capture restores the tab's bounds and mobile emulation afterwards.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Feasibility Evidence | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | `screenshot` of an open tab returns a non-empty PNG when the tab is not shown on screen (never shown since it opened; not the panel's active tab; the window is covered or minimized), including the first screenshot right after `open_tab`, `navigate_to` or `set_device_emulation`, for viewport and full-page captures | BEH-001 | Must | The founder's failure and 176 recorded failures | Probes in Electron 42.11.16 (investigation-notes.md, Runtime findings; design-spec mechanism measurements) | Task autobyteus-507 |
| REQ-002 | Making a tab capturable must not change what the user sees in the browser panel, the tab's emulated viewport, or the page's state, beyond what a capture already does | BEH-004, BEH-005 | Must | The user may be watching | Probe nudge-kinds.js / throttling.js | DEC-001 |
| REQ-003 | When a screenshot still cannot be taken, the tool fails within a bounded time with code `browser_screenshot_failed` and a message giving the underlying reason; no artifact is written | BEH-003 | Must | The agent must know it is a screenshot failure, not a navigation failure | N/A | DEC-003 |
| REQ-004 | A browser tool call naming a tab that does not exist fails with `browser_tab_not_found`; one naming a closed tab with `browser_tab_closed` | BEH-002 | Should | "Bridge unavailable" sent the agent the wrong way | N/A | DEC-003 |
| REQ-005 | A regression test runs the product's capture code in the Electron version the app ships, fails before the change and passes after | BEH-001 | Must | Asked by the Task; mocks cannot show Chromium's behavior | `browser-file-document-request.electron.spec.ts` shows the pattern | Task autobyteus-507 |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-005 | BEH-001 / SCN-002 | Real Electron; a tab not attached to any window has loaded a page, then navigated; screenshot immediately | Non-empty PNG artifact | Before the change: rejected with `UnknownVizError` | Electron spec |
| AC-002 | REQ-001, REQ-005 | BEH-001 / SCN-001 | Real Electron; a fresh tab never shown; screenshot right after it loaded | Non-empty PNG | Before: `Current display surface not available for capture` | Electron spec |
| AC-003 | REQ-001, REQ-002, REQ-005 | BEH-001, BEH-005 / SCN-003 | The founder's sequence: open a page, mobile emulation 412x915, screenshot | Non-empty PNG; the page's `innerWidth`/`innerHeight` after the screenshot equal those before | Before: `UnknownVizError` | Electron spec |
| AC-004 | REQ-001, REQ-005 | BEH-001 / SCN-001 | Real Electron; a tab attached to a minimized window navigates; screenshot | Non-empty PNG within the bound | Before: `UnknownVizError` or no answer | Electron spec |
| AC-005 | REQ-001 | BEH-001 / SCN-002 | Full-page screenshot of a tab not shown, right after navigation | Non-empty PNG; tab bounds restored afterwards | — | Electron spec |
| AC-006 | REQ-003 | BEH-003 / SCN-005 | Capture keeps failing (stubbed webContents that always rejects or returns an empty image) | `browser_screenshot_failed`, message contains the underlying reason, returned within the bound; no artifact written | — | Unit test |
| AC-007 | REQ-004 | BEH-002 / SCN-004 | Bridge call with an unknown tab id, then a closed one | Server tool error codes `browser_tab_not_found`, `browser_tab_closed` | — | Unit tests (Electron + server client) |
| AC-008 | REQ-002 | BEH-004 / SCN-001 | Capture succeeds at the first attempt | Nothing else is done to the tab (no bounds change) | — | Unit test |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | An agent with the built-in browser tools | See a page it opened | `open_tab` then `screenshot` | User not watching that tab | Open page → screenshot | Image | Clear `browser_screenshot_failed` if impossible | Supported Normal Scenario | 625 screenshots right after `open_tab` in saved runs | REQ-001, AC-002, AC-004, AC-008 |
| SCN-002 | System | Same | Check a page after moving to it | `navigate_to` then `screenshot` | Tab not shown | Navigate → screenshot | Image | Same | Supported Normal Scenario | 920 screenshots right after `navigate_to` | REQ-001, AC-001, AC-005 |
| SCN-003 | System | Product team agents | Check a phone layout | `open_tab`, `set_device_emulation` mobile, `screenshot` | Tab not shown | Open → emulate → screenshot | Image at the emulated size | Same | Supported Normal Scenario | Founder's run; 59 such sequences | REQ-001, REQ-002, AC-003 |
| SCN-004 | Contract | An agent | Use a tab | Any tool with a wrong or closed `tab_id` | — | Call → error | `browser_tab_not_found` / `browser_tab_closed` | — | Supported Explicit Edge Scenario (tool contract's error codes) | `browser-tool-contract.ts` | REQ-004, AC-007 |
| SCN-005 | Contract | An agent | Know why a screenshot failed | `screenshot` | Capture impossible | Call → error | `browser_screenshot_failed` with reason | — | Supported Explicit Edge Scenario | docs/browser_sessions.md screenshot contract | REQ-003, AC-006 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` (no UI change; REQ-002 preserves what the user sees). Product design fields: `N/A — not applicable`.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001, REQ-003, AC-006 | Performance | A screenshot that needs extra work to become capturable adds at most 2 s; one that captures at once adds nothing | Tab not shown vs shown | Electron spec timings; unit test |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Electron `webContents.capturePage` (42.11.16) | Copies only a frame the tab has drawn | Probes; Chromium `CopyFromSurfaceError` | An Electron upgrade may change it; the Electron spec catches that |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `evidence/` (probes, trace scans and their outputs) | Evidence | REQ-001..REQ-005 | Final | Evidence only |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The founder's tab was not shown (his app window not in front or minimized while he used the phone) | Explains both failures | Reproduced with the same sequence; REQ-001 covers every not-shown state | Accepted |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Fix by showing agent tabs in a window, or by making the capture itself work for tabs not shown? | Showing tabs changes what the user sees and steals focus | Probes: tabs not shown can be made to draw without being shown | Make capture work without showing the tab; REQ-002 forbids visible change | Solution Designer | Decided |
| DEC-002 | Retry on the agent side (skills: "retry the screenshot") or in the tool? | Every team is hit; a skill fix would be repeated in every package and still fail for minimized windows | Retry alone fails for never-drawn tabs (0 of 9) and minimized windows | Fix in the tool | Solution Designer | Decided |
| DEC-003 | Which codes for the two misleading errors? | Agents read codes to decide what to do | Server contract already has `browser_tab_not_found`, `browser_tab_closed`; screenshot has none | Add `browser_screenshot_failed` to the server contract; the desktop bridge sends the server's tab codes | Solution Designer | Decided |
| DEC-004 | Send a skill/instruction Task to the Package Creator? | The Task asks for it if the cause is the agents | 1 agent mistake in all saved runs, self-corrected; no pattern | No Task | Solution Designer | Decided |
| DEC-005 | Release | Hard to undo | Founder: release only on his word | Not part of this ticket | User | Decided by the Task |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001..AC-005 | SCN-001..SCN-003 | evidence/ |
| REQ-002 | UC-001 | BEH-004, BEH-005 | AC-003, AC-008 | SCN-001, SCN-003 | evidence/nudge-out.txt, throttling-out.txt |
| REQ-003 | UC-002 | BEH-003 | AC-006 | SCN-005 | — |
| REQ-004 | UC-002 | BEH-002 | AC-007 | SCN-004 | — |
| REQ-005 | UC-001 | BEH-001 | AC-001..AC-005 | SCN-001..SCN-003 | — |

## Architecture Phase Input

- Approved scenario IDs: SCN-001..SCN-005.
- Constraints: REQ-002 (nothing visible changes), QR-001 (≤ 2 s extra), the screenshot artifact contract.
- Deferred to design: the mechanism that makes a not-shown tab drawable; where the bounded retry lives.
- Technical facts to verify: the mechanism in the pinned Electron for detached, covered and minimized tabs; no crash when a tab closes during a capture.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and decisions are visible, each decision with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- Approval recorded: `Yes` (Solution Designer within the direction; user informed in this conversation, SR-001)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
