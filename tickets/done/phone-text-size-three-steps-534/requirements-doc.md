# Requirements Document — phone-text-size-three-steps-534

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-002`
- Package identifier: `phone-text-size-three-steps-534`
- Request / ticket: autobyteus-534 (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), follow-up of autobyteus-525
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), carrying the founder's words of 2026-11-18
- Requirements owner: Solution Designer (run `solution_designer_c3a8302c63ea42e1a077547eaa960a4b`)
- Date: 2026-11-18
- Approved by and reference: SR-001 `Solution Designer within the direction (user informed)`, the message to the user in the Solution Designer's conversation, 2026-11-18; SR-002 (UC-003, REQ-005, AC-005) `User`: the founder's own request in the Solution Designer's conversation, 2026-11-18 ("put the setting at the bottom below the vnc… normally settings are below other entries", with a screenshot of the run's ⋮ menu)
- Exact approved baseline: this document at SR-002
- Behavior-defining supplements: None

## Problem And Desired Outcome

- Problem: the phone's smallest Text size (Small, 15 px) is far too small for the founder, and the menu shows a redundant "On this phone" heading above "Text size".
- Desired outcome: three steps — Standard 17 (default, the smallest), Large 19, Largest 21 — and a menu that shows only the "Text size" header and the three sizes.
- Success: the run list's ⋮ shows "Text size" and three "A" buttons; a phone that had Small saved opens at Standard without an error; nothing else changes.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenario | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | "On this phone" heading, "Text size" label, four steps | "Text size" header, three steps (Standard, Large, Largest) | ⋮ place, menu opens/closes as today, applies at once, menu stays open, focus on the chosen step, 44 px targets | Notes BEH-001 |
| BEH-002 | User | SCN-002 | Saved step applies; unknown → Standard | A saved Small applies as Standard, silently; other settings untouched | Storage key and the three remaining values | Notes BEH-002 |
| BEH-003 | User | SCN-003 | Screens scale by step/17 | Unchanged for the three steps | Every screen's sizes at Standard, Large, Largest; desktop | Notes BEH-003 |
| BEH-004 | User | SCN-004 | The run's ⋮: Artifacts, Files, Messages (when it applies), Activity, Settings, VNC Viewer (when it applies) | Settings is the last entry: … Activity, VNC Viewer (when it applies), Settings | Which entries show and when; each entry's screen | Notes BEH-004 |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Scenarios |
| --- | --- | --- |
| UC-001 | Choose one of three Text size steps on the run list's ⋮ | SCN-001 |
| UC-002 | Open the phone with a Small saved by beta.10 | SCN-002 |
| UC-003 | Open a run's ⋮ and find Settings at the bottom | SCN-004 |

### Out Of Scope

- A larger default (stays 17; the founder decides if he wants otherwise).
- The phone Language setting (autobyteus-509).
- Any phone screen's layout; the desktop; the iOS/Android shells (same `/mobile` page).

### Non-Goals

- No new step, no change of the remaining steps' sizes.

### Preserved Behavior Boundary

- BEH-001 preserved column; BEH-003 entirely (autobyteus-525 AC-003…AC-007 for Standard, Large, Largest).

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| ID | Requirement | Behavior | Priority | Rationale | Feasibility | Source |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | The phone has three Text size steps: Standard 17 px (default and smallest), Large 19 px, Largest 21 px. Small no longer exists anywhere the steps are listed (the control, the step list, translation keys, tests, probe cases, phone docs). | BEH-001 | Must | The founder | N/A | Task (a) |
| REQ-002 | The run list's ⋮ menu shows no "On this phone" text; its only header is "Text size", followed by the three "A" buttons. A later Language row can join the same menu below with its own label and no menu heading. | BEH-001 | Must | The founder | N/A | Task (c); DEC-002 |
| REQ-003 | A phone whose saved step is Small opens at Standard on every screen, with no error and no change to any other stored setting; the Standard button is marked. | BEH-002 | Must | beta.10 phones may hold Small | N/A | Task (b); DEC-001 |
| REQ-005 | In the run's ⋮ menu, Settings is always the last entry, below VNC Viewer when VNC Viewer is shown; the other entries keep their order (Artifacts, Files, Messages, Activity, VNC Viewer) and their show rules. | BEH-004 | Must | The founder: settings normally sit below the other entries | N/A | The founder, 2026-11-18 (SR-002) |
| REQ-004 | Standard, Large and Largest render every phone screen as they do today (autobyteus-525); the desktop is unchanged. | BEH-003 | Must | Preserved | N/A | Task (d), (e) |

## Acceptance Criteria

| ID | REQ | BEH / SCN | Trigger | Expected Outcome | Alternate | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | BEH-001 / SCN-001 | Run list → ⋮ | The menu shows the header "Text size" and three buttons labelled (aria) Standard, Large, Largest; no "On this phone" text; the saved step is marked and focused; a tap applies at once, the menu stays open; Esc/outside closes it | zh-CN: header "文字大小" (existing key), buttons 标准 / 大 / 特大; no "本机设置" text | Unit + probe MSP-60 + screenshots of the control at the three steps |
| AC-002 | REQ-003 | BEH-002 / SCN-002 | `autobyteus.phone.textSize = small` saved, page opened | First screen at Standard (root 16 px, conversation 17 px), Standard marked, no console error; other localStorage keys unchanged | — | Unit (reader and store) + probe start with a saved `small` |
| AC-003 | REQ-004 | BEH-003 / SCN-003 | Standard, Large, Largest | Run list, conversation, Files, Activity, Settings, VNC bar, dialogs as in 525 (sizes and clean layout); desktop unchanged | — | Probe MSP-60 / MSP-74 rerun; run list screenshots at the three steps; desktop unit tests unchanged |
| AC-005 | REQ-005 | BEH-004 / SCN-004 | A run's ⋮ opened (a Team member on the node with a node desktop; a standalone agent; a run without VNC Viewer) | Entries in order: Artifacts, Files, [Messages], Activity, [VNC Viewer], Settings — Settings last in every case | — | Unit (menu and run screen) + probe order assertions |
| AC-004 | REQ-001 | — | Source | No `small` step, no `mobile.onThisPhone.textSize.small` key (en, zh-CN), no Small in tests, probe or phone docs | — | grep + catalog test |

## Relevant Scenarios And Journeys

| ID | Kind | Actor | Goal | Trigger | Start | Steps | Outcome | Alternate | Validity | Evidence | REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | The founder | Pick a readable size | Run list ⋮ | Paired | Open ⋮ → tap Large | Whole phone at Large | — | Supported Normal | His words 2026-11-18 | REQ-001, 002; AC-001 |
| SCN-002 | User | A phone user who chose Small in beta.9/10 | Keep using the phone after the update | Open the updated page | `small` saved | Open | Standard everywhere | — | Supported Normal (beta.10 shipped Small) | Notes "Persisted Data" | REQ-003; AC-002 |
| SCN-004 | User | The founder | Open a run's settings | Run ⋮ | A run open | Tap ⋮ → Settings (last) | Settings opens | — | Supported Normal | His words and screenshot 2026-11-18 | REQ-005; AC-005 |
| SCN-003 | User | Any phone user | Read every screen | Any screen | A step | Navigate | As today | — | Supported Normal | 525 evidence | REQ-004; AC-003 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`. Product supplement / runnable reference / confirmation / baseline: `N/A — not applicable` (no Product round; small change in the founder's own words).
- Normative: DEC-002 (header), REQ-001…REQ-003.
- Permitted variation: exact spacing of the header and the three buttons within today's menu style.
- Needs user: none.

## Quality And Non-Functional Requirements

| ID | Related | Area | Requirement | Verification |
| --- | --- | --- | --- | --- |
| QR-001 | AC-001 | Accessibility | Menu keeps an accessible name; the group is labelled "Text size"; buttons `aria-pressed`; ≥ 44 px targets | Unit |

## Data Continuity And Acceptable Loss

- Persisted data affected: `Yes` (read only).
- Preserve: the key and `standard | large | largest`; every other stored setting.
- Acceptable: a saved `small` is shown as Standard and stays in storage until the next choice overwrites it.

## External Contracts And Dependencies

None.

## Supplemental Artifacts

None.

## Assumptions

| ID | Assumption | Status |
| --- | --- | --- |
| ASM-001 | The default stays 17 px (his words: "the second one is the default and the smallest") | Confirmed by his words; the PM will relay any change |

## Decisions

| ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | How is a saved Small handled? | beta.10 phones | (a) the existing reader's "unknown value → Standard"; (b) an explicit `small → standard` mapping; (c) rewrite storage at start | (a): the reader already treats any value that is not a step as Standard, silently, without touching storage; a dedicated test proves it for `small`. (b) keeps a removed step's name in current code; (c) writes storage for no visible gain (the next choice overwrites it). Decided (a). | Solution Designer | Decided |
| DEC-002 | What does the menu show once "On this phone" is gone? | The founder: only "Text size" and the sizes | "Text size" kept as the small grey label, or promoted to the header | Promote "Text size" to the header (the removed heading's style: dark, semibold), so the menu reads as one titled block; the menu keeps "On this phone" only as its invisible accessible name; a Language row later adds its own header-label below. Decided. | Solution Designer | Decided |
| DEC-003 | The "A" preview sizes | Visual cue | Today 13/16/19/22 px for four steps | Each remaining step keeps its own letter size: Standard 16, Large 19, Largest 22 px; three columns. Decided. | Solution Designer | Decided |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-004 | SCN-001 |
| REQ-002 | UC-001 | BEH-001 | AC-001 | SCN-001 |
| REQ-003 | UC-002 | BEH-002 | AC-002 | SCN-002 |
| REQ-004 | — | BEH-003 | AC-003 | SCN-003 |
| REQ-005 | UC-003 | BEH-004 | AC-005 | SCN-004 |

## Architecture Phase Input

- Scenarios SCN-001…003; constraints: store/CSS/screens unchanged; storage key unchanged.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence: `N/A`
- UI/UX approval basis: `N/A`
- Material assumptions and decisions are visible: `Yes`
- Content ready for approval: `Yes`; blocker: None

### Approved Basis Ready For Design

- Approval recorded: `Yes`; exact basis: `Yes` (SR-001); ready for design: `Yes`; blocker: None
