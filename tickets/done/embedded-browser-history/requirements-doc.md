# Requirements — Embedded browser history

## Document Status
- Package: `embedded-browser-history`; Task `autobyteus-workspace-1`, Project `project_3165230d-b602-4efc-ac42-fb61a03f1ed5`.
- Requested by: `/project_task_manager`; requirements owner: Solution Designer; date: 2026-10-26.
- Status: **Approved**; exact baseline **R1 / SR-001**. Approved by Solution Designer within the Task direction, user informed in the conversation message beginning “I’ve confirmed this is a missing AutoByteus browser control”. Task reread immediately before approval; no comments or changed direction.
- Authorities read: solution-designer SKILL, requirements-engineering.md, finding-the-cause.md, ticket-scope.md and requirements/investigation/revision templates (2026-10-26).
- Behavior-defining supplements: none. Screenshot is problem context, not a new visual specification.

## Problem And Desired Outcome
Users can follow links in the desktop embedded Browser but cannot return using its toolbar. Add normal Back/Forward navigation for the active tab without changing the browsed site or other browser controls. Success is demonstrated by real isolated desktop interactions, not mocked history alone.

## Relevant Current And Desired Behavior
| ID | Kind / scenarios | Current (investigation source) | Desired | Preserved |
|---|---|---|---|---|
| BEH-001 | User; SCN-001,003 | BrowserPanel has URL/new/refresh/device/close, no history controls (E1) | Back/Forward traverse current tab history | Browser page state/history semantics of underlying runtime |
| BEH-002 | User/System; SCN-002,004 | Tab switching and native views already exist; snapshot lacks history flags (E2–E4) | Enabled state matches active tab history; no tab or unavailable direction is disabled | Independent tabs, shell ownership, selection |
| BEH-003 | User; SCN-005 | Address, reload, close, device and full-view controls work through shell path (E1–E4) | Continue unchanged with history controls | Existing URL normalization, errors, native rendering and layout behaviors |

## Stakeholders, Actors, And Outcomes
Desktop user: navigates linked pages and SPA routes without reopening URLs. Embedded Browser owns navigation, never the Galavion site. Delivery owns merge, integrated proof and cleanup, without installation/release.

## Scope Guardrail
### In-Scope Use Cases
- UC-001: navigate backwards/forwards in active Browser tab (SCN-001,003).
- UC-002: switch tabs and reflect per-tab history availability (SCN-002,004).
- UC-003: preserve other toolbar and rendering behaviors (SCN-005).
### Out Of Scope
Galavion/site changes, real account operations, remote browser MCP/tools, new agent-facing browser commands, persistent history restoration, browser-wide history menus, keyboard/gesture shortcuts, releases, installation or interference with running app. No new cross-shell ownership policy.
### Non-Goals
Custom emulation of Chromium history or promises to bypass browser/platform restrictions; full browser feature parity.
### Preserved Behavior Boundary
BEH-003 / REQ-004 / AC-005; no data migration, authentication reset or tab/view recreation to traverse history. Unrelated repository edits are preserved.
### Prerequisites
None identified.
### Review Authority
Blocking corrections must cite approved REQ/AC/BEH IDs. New product behavior, policies, migrations or compatibility promises are Requirement Gaps requiring user approval. Adjacent defects become follow-ups unless an actual prerequisite. Reviewer suggestions do not amend this basis.

## Requirements
| ID | Requirement | Behavior / source |
|---|---|---|
| REQ-001 | Provide discoverable accessible Back and Forward toolbar buttons operating only on the active embedded tab. | BEH-001; Task |
| REQ-002 | Enable each direction only when the active tab can traverse that direction. Reflect page-driven navigation, history-only changes and tab selection; no active tab means both disabled. | BEH-002; Task |
| REQ-003 | Use browser-like history: Back then Forward revisits entries; new navigation after Back discards the forward branch; full-document and ordinary same-document hash/History API routes follow native semantics. | BEH-001,002; Task |
| REQ-004 | Preserve existing controls, independent tabs and shell leases; ordinary navigation failure must not navigate another tab or leave history controls permanently stuck. | BEH-003; Task constraints |
| REQ-005 | Validate regressions and rendered interaction in isolated fixtures, merge/verify appropriate base, clean task resources and report limitations/follow-ups. No release/install. | BEH-001–003; Task done criteria |

## Relevant Scenarios And Journeys
All actors are desktop users; sequences describe product behavior, not internal call graphs.
| ID / validity | Goal, trigger and start | Sequence / expected outcome | Relevant alternate | Evidence / trace |
|---|---|---|---|---|
| SCN-001 Supported Normal Scenario | Revisit linked pages from Browser toolbar; tab at A | Follow A→B→C, Back→B, Forward→C; URL/content and buttons match | At oldest/newest entry unavailable direction disabled | User report and Task; UC-001, BEH-001, REQ-001–003, AC-001 |
| SCN-002 Supported Normal Scenario | Browse two tabs without mixing histories | T1 A→B; T2 D only; switch, use Back in T1; T2 unchanged | Close active tab or all tabs: new active/no-tab state accurately reflected | Task explicit independent histories; UC-002, BEH-002, REQ-001,002,004, AC-002 |
| SCN-003 Supported Normal Scenario | Revisit SPA/anchor route via toolbar | Follow hash or pushState route, Back/Forward; replaceState replaces rather than adds; new link/address after Back removes forward branch | Same URL entries can change history without changing displayed URL; runtime determines native traversal semantics | Task same-document requirement; native contract E5; UC-001, BEH-001, REQ-002,003, AC-003 |
| SCN-004 Supported Explicit Edge Scenario | Safely use toolbar when direction unavailable or tab changes during navigation | Initial/empty state disabled; select another tab while original request settles; do not reselect old tab | Page load failure/closed tab must not strand operation; reconcile current availability | Task availability/active-only constraints; UC-002, BEH-002, REQ-002,004, AC-004 |
| SCN-005 Supported Normal Scenario | Continue normal browsing with current controls | Enter address, refresh, new/close/switch tab, mobile/desktop and full-view/restore | Non-Electron unavailable state remains unchanged | Existing product E1–E4; UC-003, BEH-003, REQ-004,005, AC-005,006 |

## Acceptance Criteria
| ID | Links | Observable success and verification |
|---|---|---|
| AC-001 | REQ-001–003; BEH-001; SCN-001 | Isolated A→B→C full-page link clicks, Back and Forward render expected page/URL; buttons follow runtime availability, with no extra history inserted by traversal. |
| AC-002 | REQ-001,002,004; BEH-002; SCN-002 | Two tabs keep independent histories; switch/close updates controls; clicking history affects only selected tab. Regression plus desktop evidence. |
| AC-003 | REQ-002,003; BEH-001; SCN-003 | Isolated hash, pushState and replaceState fixtures verify traversal and history-only updates; after Back then new link/address, Forward unavailable. Record native quirks explicitly, do not replace history with a URL list. |
| AC-004 | REQ-002,004; BEH-002; SCN-004 | No-tab/unavailable direction disabled and inert; stale/unavailable requests are safe; switching/closing during a request cannot steal selection or leave a never-settled UI operation. Simulated regression and proportionate native fixture proof. |
| AC-005 | REQ-004; BEH-003; SCN-005 | Address/refresh/new/close/tab switching, emulation and full-view remain functional; toolbar fits normal panel and full-view, with labelled keyboard-focusable buttons and visible disabled states. Rendered evidence. |
| AC-006 | REQ-005; BEH-001–003; SCN-001–005 | Tests and changed-build isolated desktop evidence are retained, appropriate base merged and verified, task resources cleaned, follow-ups/limitations recorded; real user data and running app untouched, no release/install. |

## UI, Interaction, And Experience Requirements
Applicable. Add conventional left/right arrows adjacent to the address controls using existing toolbar styling, localized accessible names “Back”/“Forward” and titles, native disabled behavior. Maintain usable address width and existing controls in panel/full-view. Product Design not requested; separate UI/UX repository, approval, spec and visualizer: N/A. No taste/scope decision requires user input. Fixture site content is illustrative only.

## Quality And Non-Functional Requirements
QR-001 accessibility → REQ-001 / AC-005: labelled keyboard buttons and disabled feedback. QR-002 reliability/isolation → REQ-004,005 / AC-004,006: no cross-tab history contamination, real-data access or process disruption. No arbitrary latency/capacity SLA.

## Data Continuity And Acceptable Loss
No persisted data change intended. Preserve browser session/auth storage and existing tab content; no app-data reset permitted. Native forward-branch truncation after new navigation is expected, not data loss. Restart history restoration is not added.

## External Contracts And Dependencies
Electron 42.11.16 owns native history; verify actual event/availability behavior against this version. Platform history semantics (including page-script history behavior) are native; report observed limitations.

## Decisions
| ID | Reasoning and recommendation | Owner / status |
|---|---|---|
| DEC-001 | Task asks for normal browser behavior, so native history (including SPA routes), not a renderer URL stack, defines expected outcome. | Solution Designer / Decided |
| DEC-002 | Existing toolbar provides a clear convention; use adjacent arrow buttons and existing styling/localization rather than redesigning Browser. | Solution Designer / Decided |
| DEC-003 | Empty/unavailable state should be inert; preserve current active selection if a previous navigation settles after tab switch. This follows active-only direction, not a new feature. | Solution Designer / Decided |
| DEC-004 | Session restoration, gestures and tool API expansion are independent features, so exclude them. | Solution Designer / Decided |

## Traceability / Supplements / Assumptions
Scenario and AC tables provide full UC/BEH/REQ/AC traceability. Supplements: original screenshot (context only), native dependency probe to be listed in investigation notes (evidence, no separate approval). No unresolved behavioral assumptions or Needs user decisions.

## Architecture Phase Input
Map SCN-001–005 through existing Browser shell IPC and native tab ownership. Verify native history APIs/events, projection equality and settlement on same-document changes; keep server tool contracts and persistence unchanged. Target implementation choices belong to design-spec, not this document.

## Readiness Check
Evidence-backed current behavior, desired/preserved behavior, scope, testable traceability, supported scenarios, decisions and quality/data constraints: Yes. Product approval: N/A. Content ready: Yes. Approval recorded for exact R1/SR-001: Yes. Ready for architecture design: Yes. Remaining blocker: None.
