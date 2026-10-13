# Requirements — Agent Team members after Description

## Document Status
- Package: `agent-team-members-after-description`; Project Task `project_task_7fd4b73e-075b-464c-b313-bbbd59f45797`.
- Status: Approved. Baseline: R1; current solution revision: SR-002; approval captured in SR-001.
- Owner: /software_engineering_team/solution_designer. Date: 2026-10-13.
- Approval: Solution Designer within the user-decided direction, 2026-10-13. Reference: conversation message beginning “I’ve approved the requirements within your requested scope: Description → Members → Instructions → Handoffs on all Agent Team detail pages”. Exact basis R1: REQ-001–003, AC-001–004, SCN-001–003 and preservation boundaries; no behavior-defining supplement. No Needs user decision in implementation scope.
- Authorities read: solution-designer/SKILL.md; references/requirements-engineering.md; requirements-doc and investigation-notes templates; root and autobyteus-web AGENTS.md; root DESIGN.md and TESTING.md (2026-10-13).
- Workspace/base/finalization context: see investigation-notes.md, Investigation Meta.
- Behavior-defining supplements: None; screenshots document the existing problem, not a new visual redesign.

## Problem And Desired Outcome
Long Instructions and Handoffs currently precede Members and force unnecessary scrolling. Users inspecting any Agent Team should see Description → Members → Instructions → Handoffs. Header and actions remain unchanged. Section placement, not data or behavior, is the requested change.

## Relevant Current And Desired Behavior
| ID | Kind / scenarios | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User / SCN-001, SCN-003 | Description, Instructions, Handoffs, Members | Description, Members, Instructions, Handoffs on all Team detail pages | Existing content, card layout, instruction expansion and handoff order | E001, E002 |
| BEH-002 | User / SCN-002 | Member count/cards, exact coordinator badge, View navigation | Same member content and navigation in earlier section | Shared and team-local identities and return context | E002, E003 |
| BEH-003 | User / SCN-002 | Back, Run, Edit and ownership-conditioned Delete | Unchanged | Header layout, action outcomes and permissions | E002, E003 |

## Stakeholders, Actors, And Outcomes
Users: inspect team membership before long rules, retain familiar controls. Implementation/API specialists: bounded presentation delta and observable regression proof. Delivery: explicit app verification, personal merge and cleanup/release receipt.

## Scope Guardrail (Mandatory)
### In-Scope Use Cases
- UC-001: inspect an Agent Team detail, including long-content and supported narrower renderer layouts (SCN-001, SCN-003).
- UC-002: navigate to a member or use existing Team page actions (SCN-002; preservation only).
### Out Of Scope
Team definitions/membership, runtime behavior, handoff semantics/content, backend/API/persistence changes, Agent/Org detail redesigns, unrelated performance/security/refactors.
### Non-Goals
No guarantee that every member fits above the fold; no new collapsible Members UI, sticky controls or redesigned cards.
### Preserved Behavior Boundary
BEH-002/003, REQ-002/003, AC-002/003/004. No added/removed content, member reordering or ownership changes.
### Review Authority
Blocking technical findings must cite these approved REQ/AC/BEH IDs. New product behavior, policies, migration or compatibility obligations are Requirement Gaps requiring user approval. Adjacent proposals remain non-blocking separate-ticket candidates; reviewers cannot amend this basis.

## Requirements
| ID | Requirement | Behavior | Priority | Rationale/source |
| --- | --- | --- | --- | --- |
| REQ-001 | All Agent Team detail views display Members immediately after Description, before Instructions/Handoffs. | BEH-001 | Must | User-decided order, delegated request 2026-10-13 |
| REQ-002 | Preserve member count, coordinator designation, member cards, View controls and navigation. | BEH-002 | Must | Explicit focused-change constraint |
| REQ-003 | Preserve header/actions, content, responsive behavior, instruction expansion and handoff ordering without mutating definitions or runtime behavior. | BEH-001/003 | Must | Explicit focused-change constraint |

## Acceptance Criteria
| ID | REQ / scenario | Trigger and expected outcome | Verification intent |
| --- | --- | --- | --- |
| AC-001 | REQ-001 / SCN-001 | Open any Team detail: after header, Description then Members then Instructions then Handoffs in rendered/DOM order; long handoffs never precede members. | Colocated order regression and rendered production-component/browser assertions with representative long rules; inspect screenshot |
| AC-002 | REQ-002 / SCN-002 | Count equals existing node count, coordinator badge belongs to same member, cards retain names and View controls; shared and team-local View reach same Agent detail with same return context. | Existing/new component navigation assertions and browser smoke |
| AC-003 | REQ-003 / SCN-002 | Back/Run/Edit/Delete remain in existing places and obey existing ownership visibility/actions; instruction expansion and displayed handoff contents/order remain unchanged. | Component preservation checks; browser navigation/actions without real model turns or destructive user-data operations |
| AC-004 | REQ-001/002/003 / SCN-003 | At desktop and narrower supported renderer widths, section order is identical and existing one-/two-column member layout and containment remain intact. Loading/not-found states do not gain sections. | Component state checks as relevant; rendered width/geometry assertions and visual inspection |

## Relevant Scenarios And Journeys
| ID | Actor / goal / trigger | Starting condition and product sequence | Expected outcome / alternate | Validity and evidence |
| --- | --- | --- | --- | --- |
| SCN-001 | User inspects Team members through Agent Teams catalog/detail | Existing Team with Description, members, instructions and long handoffs; open Team then read Description and member roster | Members before rules; same component serves all Teams; existing loading/not-found states preserved | Supported Normal Scenario; user screenshots E001 and source E002 |
| SCN-002 | User views a member or invokes an existing page action | Loaded Team; select a shared/team-local member View, Back, Run, Edit or permitted Delete | Existing destination/context/confirmation behavior unchanged; Org-return and ownership variants preserved where existing surface uses same component | Supported Normal Scenario; E002/E003 |
| SCN-003 | User inspects Team at narrower/desktop width | Resize supported renderer; open/read detail | Same order, existing responsive cards and header | Supported Normal Scenario; explicit preservation request, E002 responsive classes |

## UI, Interaction, And Experience Requirements
Applicable: Yes. Only normative delta is user-decided section order. Existing style/content/interaction/responsive presentation remains authoritative. Product Design request: not stated; separate Product repository/spec/visualizer/runnable mock and design confirmation: N/A — not applicable. Existing screenshots are current-state evidence, not normative fixture names/counts. No unresolved visual-taste decision.

## Quality And Non-Functional Requirements
QR-001 → REQ-003/AC-004: renderer/responsive preservation; no new overflow or CSS visual-only ordering that diverges from document reading order. QR-002 → REQ-003/AC-003: scope integrity, no API/runtime/data changes. This establishes no new performance budget or accessibility certification.

## Data Continuity And Acceptable Loss
Persisted/external data affected: No. Team definitions, members, instructions, handoffs and existing application data must remain unchanged; no loss/reset/rebuild authorized.

## External Contracts And Dependencies
Existing navigation and store contracts preserved; no external service or new dependency required. Release publication is not authorized by urgency alone.

## Supplemental Artifacts
Three supplied screenshots E001 in investigation-notes.md; read/inspected as current-state evidence. No behavior-defining supplements or independent review artifacts yet.

## Assumptions, Decisions And Traceability
- DEC-001 (Solution Designer, Decided): same existing detail surface should change for every Team, not a named-team exception; user explicitly settled this scope. Preserve variants automatically through shared rendering.
- DEC-002 (Solution Designer, Decided): retain empty/loading/not-found behavior; user asked only for placement and current source exposes those states; adding policy would exceed direction.
- DEC-003: release decision remains Delivery-owned with user agreement before publication; not a blocking intended-behavior decision for source work.
- REQ-001 → UC-001 / BEH-001 / SCN-001,003 / AC-001,004.
- REQ-002 → UC-002 / BEH-002 / SCN-002 / AC-002,004.
- REQ-003 → UC-001,002 / BEH-001,003 / SCN-001,002,003 / AC-003,004.

## Architecture Phase Input
Verify shared detail callers and current member reference mapping/action handlers. Keep existing owners/contracts. Determine smallest rendering delta after approval; no target architecture prescribed here.

## Readiness Check
Content ready: Yes; current behavior evidence-backed, desired/preserved behavior explicit, guardrails clear, IDs/testable criteria and supported scenarios complete, decisions reasoned. No material unknown or Needs user behavior decision. Product approval N/A. Approved basis ready for design: Yes; exact R1 basis and informing-message approval reference recorded.

## Delivery Constraints (not a claim of completion)
Relevant regressions and rendered UI verification required; merge into personal; user must explicitly verify in the app before finalization gates pass. Delivery records source/build provenance, finalization, cleanup and applicable release decision with user agreement. Tests/screenshots do not replace user verification.
