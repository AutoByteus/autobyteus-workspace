# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `phone-text-size-home-525`
- Request / ticket: autobyteus-525 (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), carrying the founder's words of 2026-11-17
- Requirements owner: Solution Designer (software engineering team copy, run `solution_designer_c3a8302c63ea42e1a077547eaa960a4b`)
- Date: 2026-11-17
- Approved by and reference: `Solution Designer within the direction (user informed)`; reference: SR-001 and the message to the user in the Solution Designer's conversation, 2026-11-17
- Exact approved requirements baseline / solution revision: this document at SR-001
- Behavior-defining supplements and their approved versions: None

## Problem And Desired Outcome

- Problem: the phone's Text size (autobyteus-506, beta.9) changes only the conversation, and its control is inside a run's ⋮ menu. The run list (the founder's home screen), Files, Activity, the setup screens and the dialogs stay small, and he cannot change the size without opening a run.
- Affected actors: the founder (any phone user of the node).
- Desired outcome: one phone-wide Text size, applied to every phone screen, changed from the home screen.
- Observable definition of success: on the run list, choosing Largest makes the run names and subtitles, the header, the + button and every other phone screen larger at once, without cut-off text, overlap or sideways scrolling; the conversation keeps its 15/17/19/21 px steps; Standard looks exactly as today; the desktop does not change.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | Text size lives in a run's ⋮ menu | Text size lives on the home screen (run list) in an "On this phone" menu; the run's ⋮ menu has no Text size | Four steps, default Standard, the stored key and its value | Notes: `MobileRunMenu.vue`, `usePhoneTextSize.ts` |
| BEH-002 | User | SCN-001, SCN-002 | Only the conversation follows the step | Every phone screen follows the step proportionally | The conversation's exact sizes 15/17/19/21 px | Notes: `AgentEventMonitor.vue`, `phone-conversation.css` |
| BEH-003 | User | SCN-002 | Code in the phone file viewer is 14 px always | Code text follows the step | Images, PDFs and the VNC picture keep their own pinch zoom, not the step | Notes: `MonacoEditor.vue` |
| BEH-004 | User | SCN-003 | The desktop has its own Display font size | Unchanged | The desktop's sizes, its Display setting, its Monaco and terminal sizes | Notes: `appFontSizeStore.ts` |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Constraint |
| --- | --- | --- | --- |
| The founder on his phone | Read the run list and every phone screen comfortably | One setting on the home screen that scales the whole phone app | Phone only; release only on his word |
| autobyteus-509 (phone language, not started) | Add a Language choice later | A place for it next to Text size | Not built here |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Choose the phone's Text size from the home screen | SCN-001 |
| UC-002 | Every phone screen shows its text at the chosen size | SCN-002 |
| UC-003 | The run's ⋮ menu without Text size | SCN-001 |

### Out Of Scope

- The desktop's appearance and its Display font size setting.
- The phone language setting itself (autobyteus-509): only room for it.
- Settings for delegated runs (autobyteus-522; its own ticket, same menu file).
- Redesigning phone screens beyond what the larger steps need to stay clean.
- Images, PDFs and the VNC desktop picture (they have their own zoom).

### Non-Goals

- No new steps or a slider; no per-screen sizes; no sync of the choice across phones or with the desktop.
- Not following Android's system font size.

### Preserved Behavior Boundary

- BEH-001…BEH-004 preserved columns; at Standard every phone screen renders as today (AC-006); desktop unchanged (AC-007); the stored choice carries over (AC-004).

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Feasibility Evidence | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | The run list's header has a control (DEC-001) that opens an "On this phone" menu with the Text size choice: the same four steps (Small, Standard, Large, Largest), the current one marked. Choosing a step applies at once, and the menu stays open so the effect can be seen. | BEH-001 | Must | The founder: "better on the HOME SCREEN" | N/A | Task; DEC-001 |
| REQ-002 | The "On this phone" menu is a group with a heading so that a later Language row (autobyteus-509) joins it without changing its structure. | BEH-001 | Should | Task: "leave room for it" | N/A | Task; DEC-001 |
| REQ-003 | The run's ⋮ menu no longer shows Text size. Its views (Artifacts, Files, Messages, Activity, Settings, VNC Viewer) are unchanged. | BEH-001 | Must | One place for the setting | N/A | DEC-002 |
| REQ-004 | The choice is one phone-wide value kept on the phone under the same storage key and values; an existing choice carries over and the default is Standard. | BEH-001 | Must | Task; data continuity | N/A | Task |
| REQ-005 | Every phone screen scales its text and the sizes built on it in proportion to the step: factor = step px ÷ 17 (Small 0.882, Standard 1, Large 1.118, Largest 1.235). The conversation stays at exactly 15/17/19/21 px. Screens: the run list (header, rows, fold, banners, empty/error/loading states, the + button), the run screen (bar, menu, composer), Artifacts, Files and the opened file, Messages, Activity (with background tasks), Settings, VNC Viewer controls and clipboard, New run and its sheets, the connection sheet, the unpair confirmation, the pairing/setup screens, the "Connected to…" screen. | BEH-002 | Must | The founder: "apply to the whole app" | N/A (CSS rem scaling; rendered check in AC-005) | Task; DEC-003, DEC-007 |
| REQ-006 | Elements that use fixed pixel sizes on phone screens follow the step too: run-row nesting rails and indents stay aligned with the avatars; small fixed-pixel labels (status chips in the conversation and Activity) scale; code and text shown in the phone file viewer scale. Exceptions: images, PDFs and the VNC picture (pinch zoom), and the four Text size preview letters (each shows its own step). | BEH-002, BEH-003 | Must | Task: "fix the screens that use fixed pixel sizes" | N/A | DEC-005, DEC-006 |
| REQ-007 | At Largest on a 360 px and a 412 px wide phone, no phone screen cuts text off without an ellipsis, overlaps, or scrolls sideways (except content that already scrolls sideways by design: code blocks, tables, file content without wrap). Run names and subtitles keep one line and shorten with an ellipsis. Menus and sheets fit the screen width. | BEH-002 | Must | Task | Rendered check (RSK-001) | DEC-004 |
| REQ-008 | Desktop: nothing changes — its sizes, its Display font size setting, its editor and terminal sizes. | BEH-004 | Must | Task: "Phone only" | N/A | Task |
| REQ-009 | New visible strings use translation keys (en and zh-CN). | — | Must | autobyteus-509 follows | N/A | Task |

## Acceptance Criteria

| AC ID | Related REQ | Related BEH / SCN | Preconditions / Trigger | Observable Expected Outcome | Alternate / Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | BEH-001 / SCN-001 | Paired phone on the run list | A header button opens a menu with an "On this phone" heading and a Text size row of four steps; the stored step is marked; tapping Largest marks it and enlarges the run list at once, with the menu still open; tapping outside or Esc closes it | — | Unit + phone probe + emulator |
| AC-002 | REQ-003 | BEH-001 / SCN-001 | A run open, ⋮ tapped | The menu shows its views and no Text size | — | Unit + phone probe |
| AC-003 | REQ-005 | BEH-002 / SCN-002 | Largest chosen on the home screen, then a run opened | The conversation's text is 21 px; the run list, bars, menus, Files, Activity, Messages, Settings, sheets and setup screens are proportionally larger (root 16 × 21/17 px) | Small: 15 px conversation, everything else smaller | Phone probe measures the root and the feed sizes at the four steps; emulator screenshots |
| AC-004 | REQ-004 | BEH-001 / SCN-001 | A step chosen; the page reloaded / the Android app restarted | The same step is marked and applied on every screen from the first paint; a phone that had chosen a step in beta.9 keeps it | Storage unavailable: the choice applies until the page closes | Unit + probe reload |
| AC-005 | REQ-006, REQ-007 | BEH-002, BEH-003 / SCN-002 | Largest, phone widths 360 and 412 px | Every screen listed in REQ-005: no unintended cut-off, overlap or sideways scroll; run-row rails align with the avatars at every step; status chips and phone file-viewer code text scale; menus/sheets fit the width | — | Rendered screenshots of every phone screen at Largest (probe) reviewed; emulator check |
| AC-006 | REQ-005 | BEH-002 / SCN-002 | Standard (default) | Every phone screen measures as today (root 16 px; conversation 17 px; code 14 px) | — | Probe measurement + screenshot comparison with the base |
| AC-007 | REQ-008 | BEH-004 / SCN-003 | Desktop app, any Display font size | Root size, editor and terminal sizes as today; no phone control | — | Existing desktop unit tests unchanged and passing |
| AC-008 | REQ-009 | — | Source | The heading and the header button's label come from translation keys present in en and zh-CN | — | Unit + localization checks |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | Related REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | The founder | Make the phone's text bigger without opening a run | The home screen's header button | Paired, run list shown | Tap the button → "On this phone" → Text size → Largest → close | All text larger; choice kept | — | Supported Normal Scenario | The founder's words 2026-11-17 | REQ-001…004, AC-001, 002, 004 |
| SCN-002 | User | The founder | Read every screen at the chosen size | Open runs, views, files, setup | A step chosen | Navigate any phone screen | Each screen at the chosen size, clean | — | Supported Normal Scenario | Task | REQ-005…007, AC-003, 005, 006 |
| SCN-003 | User | Desktop user | Use the desktop | Desktop app | Any | — | Unchanged | — | Supported Normal Scenario | Task "Phone only" | REQ-008, AC-007 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`
- Linked UI/UX supplement / runnable reference / Product ticket / design revision / UI/UX confirmation / visual baseline: `N/A — not applicable` (no Product round; the Task leaves the small design to the team)
- Normative details: DEC-001 (place and shape of the control), REQ-001…REQ-007.
- Illustrative / permitted variation: exact icon and spacing of the header button and the menu, within the existing phone menu style.
- Required states: menu closed/open; each step marked; focus returns to the button on Esc; 44 px+ tap targets at every step.
- Product decisions that need the user: none; the founder sees the result on a phone-size page before release (Task) and can change DEC-001/DEC-004 then.

## Quality And Non-Functional Requirements

| Quality ID | Related | Area | Requirement | Scope | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | AC-004 | Other | No visible jump in size after the phone page appears (the stored step is applied before the first screen renders) | Phone page start | Probe / emulator observation |
| QR-002 | AC-001 | Accessibility | Steps are buttons with `aria-pressed` and translated labels; tap targets ≥ 44 px | Home menu | Unit |

## Data Continuity And Acceptable Loss

- Persisted data affected: `Yes` (read only, same format)
- Must be preserved: `autobyteus.phone.textSize` and its four values.
- Acceptable loss: none.
- Constraints: none.

## External Contracts And Dependencies

| Dependency | Constraint | Evidence | Risk |
| --- | --- | --- | --- |
| Android WebView / Chrome | rem layout and fractional root sizes | Notes | Low |

## Supplemental Artifacts

None.

## Assumptions

| ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The phone never shows the desktop's Display font size setting, so on the phone the phone step is the only source of the app's size | Single owner of the size on the phone | Code: desktop settings are unsupported on the phone (`MobileRemoteAccessShell` notices) | Confirmed (Read) |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Where does the control sit on the home screen? | Reachability; room for Language | (a) a ⋮ button at the right of the run-list header, opening a small menu; (b) inside the connection sheet behind the node button; (c) a gear opening a settings screen | (a): the header's right side is empty today; the ⋮ pattern is the one the run screen already uses, so it is familiar; one tap to the choice; the menu's "On this phone" heading gives Language (509) its place. (b) mixes the node connection with phone preferences; (c) costs a new screen for one row. Decided: (a) a ⋮ "More" button, menu with heading "On this phone" and the Text size row of four "A" steps. | Solution Designer | Decided |
| DEC-002 | Keep a Text size link in the run's ⋮ menu? | One place vs. reach from a run | Removing costs nothing; a link needs navigation to the list and opening its menu | One place, as the founder asked; a link is not free. Decided: remove. | Solution Designer | Decided |
| DEC-003 | How do non-conversation screens scale? | Standard must stay as today | Proportional factor step/17 against today's 16 px root | Keeps Standard identical, matches the conversation's ratio, one rule for every screen. Decided. | Solution Designer | Decided |
| DEC-004 | Run names/subtitles at Largest: wrap or shorten? | Readability vs. list density | Today one line with ellipsis; the Task allows "wrap or shorten cleanly" | Keep one line with ellipsis at every step: the list stays scannable, Standard stays identical, the full text is in the row's label and in the run. The founder sees it on the phone-size page and can ask for two lines. Decided. | Solution Designer | Decided |
| DEC-005 | Shared desktop components with fixed px text shown on phone screens | Desktop must not change | Change them to rem (changes desktop at its Large preset) or scale them only on the phone | Phone-only scaling; desktop untouched. Decided. | Solution Designer | Decided |
| DEC-006 | Does code in the phone file viewer follow? | "Every screen" | Monaco is px-only | Follow the step (14 px × factor, rounded); images/PDFs/VNC keep pinch zoom. Decided. | Solution Designer | Decided |
| DEC-007 | Does Small shrink the whole phone? | One setting | Consequence of one phone-wide setting | Yes: one setting means one effect; Small makes everything a little smaller. Decided. | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | AC IDs | Scenario IDs | Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001 | SCN-001 | DEC-001 |
| REQ-002 | UC-001 | BEH-001 | AC-001 | SCN-001 | DEC-001 |
| REQ-003 | UC-003 | BEH-001 | AC-002 | SCN-001 | DEC-002 |
| REQ-004 | UC-001 | BEH-001 | AC-004 | SCN-001 | — |
| REQ-005 | UC-002 | BEH-002 | AC-003, AC-006 | SCN-002 | DEC-003, DEC-007 |
| REQ-006 | UC-002 | BEH-002, BEH-003 | AC-005 | SCN-002 | DEC-005, DEC-006 |
| REQ-007 | UC-002 | BEH-002 | AC-005 | SCN-002 | DEC-004 |
| REQ-008 | — | BEH-004 | AC-007 | SCN-003 | — |
| REQ-009 | UC-001 | — | AC-008 | SCN-001 | — |

## Architecture Phase Input

- Scenarios: SCN-001…SCN-003.
- Constraints: Standard identical to today; conversation exact px; desktop unchanged; same storage key.
- Deferred to design: the owner of the document root size on the phone; how the conversation follows; the phone-only scaling of fixed px.
- Facts to verify: plugin order; Monaco update at runtime; popup widths at Largest.
- Risks: RSK-001, RSK-002.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and decisions are visible, each with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- Approval recorded: `Yes` (Solution Designer within the direction; user informed 2026-11-17)
- Exact requirements and supplement approval basis recorded: `Yes` (SR-001)
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
