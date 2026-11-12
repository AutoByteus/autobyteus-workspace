# Requirements Document — autobyteus-480

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-002` (requirements unchanged since SR-001)
- Package identifier: `markdown-heading-links-480`
- Request: Project Task `autobyteus-480` (reported by the user 2026-11-12; small ticket, the SD decides the route)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) for the user
- Requirements owner: Solution Designer; date 2026-11-12
- Approved by and reference: `Solution Designer within the direction (user informed)`; SR-001 and the Solution Designer's message to the user, 2026-11-12
- Behavior-defining supplements: None

## Problem And Desired Outcome

- Problem: a link to a heading of the same Markdown document (a Contents entry) leaves the page and shows a 404. Headings carry no ids, and the click goes to the browser, which hands the fragment to the app's router.
- Desired outcome: such a link scrolls to its heading inside the rendered document, everywhere Markdown is rendered, with GitHub-compatible ids, and never changes the route. Links that cannot be followed do nothing.

## Relevant Current And Desired Behavior

| Behavior ID | Current | Desired | Preserved |
| --- | --- | --- | --- |
| BEH-001 | `#heading` click → 404 page | Scroll to the heading in the same rendered document; no route or URL change | — |
| BEH-002 | No heading ids | GitHub-compatible ids | — |
| BEH-003 | Relative/root-relative link to another file → browser navigation away | Nothing happens (no navigation, no error page) | — |
| BEH-004 | External `http(s)` and file-action links | Unchanged | Yes |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Scenario |
| --- | --- | --- |
| UC-001 | Follow a same-document heading link in the Skills file preview, the Files panel, the phone file viewer and a conversation message | SCN-001 |
| UC-002 | Click a link that cannot be followed here (broken anchor, relative link to another file) without leaving the page | SCN-002 |

### Out Of Scope

- Opening another file from a relative link (FU-001).
- Changing the window URL's fragment to the heading (no "#section" in the address).
- Heading anchor icons or copy-link buttons.

### Non-Goals

None.

### Preserved Behavior Boundary

BEH-004; REQ-004.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Behaviors | Priority |
| --- | --- | --- | --- |
| REQ-001 | Every rendered Markdown heading gets a GitHub-compatible anchor:<br>- the heading's text, lowercased;<br>- every character that is not a letter, mark, number, connector punctuation, space or hyphen removed;<br>- each space turned into a hyphen;<br>- a duplicate in the same document numbered `-1`, `-2`, … in order.<br>So existing GitHub-style Contents lists (e.g. `design-principles.md`) resolve. | BEH-002 | High |
| REQ-002 | Clicking (or activating by keyboard) a link whose target is `#<anchor>` scrolls the heading with that anchor in the same rendered document into view, without changing the route or the window URL. A link to an anchor no heading has does nothing visible. | BEH-001 | High |
| REQ-003 | A link with no scheme that is not a same-document anchor (`other.md`, `other.md#x`, `/path/x.md`) and is not one of the renderer's file-action links does nothing when clicked: no navigation, no error page. | BEH-003 | Medium |
| REQ-004 | Preserved: external `http(s)` links open externally; the event monitor's file-action links open their files; other schemes (e.g. `mailto:`) behave as today; rendering of everything else (code, math, Mermaid, images) is unchanged. | BEH-004 | High |

## Acceptance Criteria

| AC ID | Requirements | Trigger | Expected Outcome | Verification |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | Render `design-principles.md` (a copy as a test fixture) | Every Contents entry's `#anchor` matches exactly one heading; duplicates and punctuation cases (unit table, incl. `1. Approved …`, `The Approach: Spine First, …`, a repeated heading, non-ASCII letters) give GitHub's results | Unit tests |
| AC-002 | REQ-002 | Click each Contents entry in the Skills file preview, the Files panel (desktop window) and the phone viewer | The heading scrolls into view; the route and URL are unchanged; no 404 | Unit test of the click + browser probe (desktop window and phone bundle) |
| AC-003 | REQ-002 | A conversation message with its own Contents; two messages with the same heading on one screen | Each link scrolls within its own message | Unit test |
| AC-004 | REQ-002, REQ-003 | A broken anchor; `other.md`; `other.md#x`; `/x.md` | Nothing visible happens; route unchanged | Unit test + probe |
| AC-005 | REQ-004 | An external link, a file-action link, a `mailto:` link | As today | Existing and unit tests |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Outcome | Validity | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User reading a skill or a file | Jump to a section | Click a Contents entry | Scrolls to the section | Supported Normal Scenario | User report |
| SCN-002 | User | User | — | Click a link to another file, or a broken anchor | Page stays | Supported Normal Scenario | Code |

## UI, Interaction, And Experience Requirements

- Applicable: `No` new UI (scrolling only). Product Design: `N/A — not applicable`.

## Quality And Non-Functional Requirements

| Quality ID | Related | Area | Requirement |
| --- | --- | --- | --- |
| QR-001 | REQ-001 | Security | Ids are sanitized and namespaced (`user-content-`) so they cannot clash with the app's own element ids or DOM properties |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`.

## Decisions

| Decision ID | Question | Why It Matters | Options | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Relative links to other files: open them, or not? | The Task leaves it to the SD ("keep it simple") | Open per surface (four open owners: Files panel, Skills, phone, conversations, each with its own path base), or do nothing | Do nothing in this ticket (no broken page), follow-up FU-001 to open them | Solution Designer | Decided |
| DEC-002 | Put `#section` in the address bar? | GitHub does; the app's hash router would read it as a route | No | No URL change | Solution Designer | Decided |
| DEC-003 | Slug library or own function? | A dependency changes the lockfile (fresh-start build check) | `github-slugger` or a small function with its rule | A small function with GitHub's rule and a test table | Solution Designer | Decided |

## Traceability

| Requirement | Use Cases | Behaviors | ACs | Scenarios |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-002 | AC-001 | SCN-001 |
| REQ-002 | UC-001, 002 | BEH-001 | AC-002, 003, 004 | SCN-001, 002 |
| REQ-003 | UC-002 | BEH-003 | AC-004 | SCN-002 |
| REQ-004 | — | BEH-004 | AC-005 | — |

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

- Approval recorded: `Yes`
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
