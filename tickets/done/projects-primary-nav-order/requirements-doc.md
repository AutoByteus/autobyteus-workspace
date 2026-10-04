# Requirements — Projects primary navigation order

## Document Status
- Package: `projects-primary-nav-order`; owner: Solution Designer; date: 2026-10-03.
- Status: Approved. Approved requirements baseline: SR-001; current solution revision: SR-002.
- Approval reference AP-001: user replied “yesss” on 2026-10-03 to the exact SR-001 order/scope approval prompt. SR-001 is approved unchanged; no behavior-defining supplements.

## Problem And Desired Outcome
Projects currently follows Nodes. The user wants it immediately after Agent Orgs because Projects is expected to be used more widely than Skills. Success is a reordered primary navigation with unchanged destinations and availability.

## Relevant Current And Desired Behavior
| ID | Kind / scenario | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User / SCN-001 | Projects is last, after Nodes | Projects immediately follows Agent Orgs | Relative order of every other item; labels/icons/routes/active state | investigation-notes.md E-001–E-003 |
| BEH-002 | System / SCN-002 | Capability-disabled and mobile-runtime Projects is hidden | Same visibility rules | Existing Applications/Nodes filtering and capability resolution | investigation-notes.md E-002–E-003 |

## Stakeholders, Actors, And Outcomes
Users locating Projects need a more prominent entry without changing its functionality. Engineering must preserve existing shared navigation and gating behavior.

## Scope Guardrail
- UC-001: Locate and open Projects from primary shell navigation (SCN-001).
- UC-002: Use primary navigation when Projects is unavailable (SCN-002).
- In scope: BEH-001 ordering and BEH-002 preservation in expanded and compact navigation.
- Out of scope: Projects features, enabling Projects by default, mobile Projects support, route changes, translations, sidebar redesign, other navigation reordering.
- Non-goal: Proving or measuring relative feature usage.
- Preserved boundary: REQ-002 / AC-002–AC-004. All non-Projects entries retain their relative order.
- Review authority: Blocking corrections must cite these requirements/ACs or preserved behaviors. New product behavior is a Requirement Gap requiring renewed user approval; reviewer comments do not amend scope. Adjacent concerns are non-blocking/separate work unless approved.

## Requirements
| ID | Requirement | Behavior | Priority | Source |
| --- | --- | --- | --- | --- |
| REQ-001 | When Projects is available, place it immediately after Agent Orgs and before Applications (if shown) and Skills | BEH-001 | Must | Initial user request; SR-001 approved by AP-001 |
| REQ-002 | Preserve all other relative order, existing feature/runtime visibility, labels, icons, routes, active states and navigation interactions | BEH-001, BEH-002 | Must | Narrow reorder scope and existing behavior |

## Acceptance Criteria
| ID | Requirements / scenario | Trigger | Observable outcome | Verification intent |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001 / SCN-001 | Projects enabled, desktop web-equivalent runtime | Order: Chat, Agents, Agent Teams, Agent Orgs, Projects, Applications if enabled, Skills, Memory, Nodes | Ordered-key assertions with Applications enabled and disabled; rendered navigation |
| AC-002 | REQ-002 / SCN-002 | Projects capability disabled | No Projects entry; remaining entries keep their original relative order | Gating regression assertions |
| AC-003 | REQ-002 / SCN-002 | Mobile remote-access runtime, Projects enabled | Projects still hidden; existing filtering unchanged | Existing runtime-gating tests |
| AC-004 | REQ-002 / SCN-001 | User selects Projects and opens project subroute | Same /projects destination and active highlighting; same folder icon and translated label, expanded/compact navigation agree | Route tests and rendered web-equivalent checks |

## Relevant Scenarios And Journeys
- SCN-001 — Supported Normal Scenario (User). Actor: desktop/web user; goal: open Projects. Starting state: Projects enabled, shell open. Trigger: inspect primary navigation, choose Projects. Steps: find Projects below Agent Orgs → select → Projects opens. Expected: desired order and unchanged destination. Alternate: Applications can be shown or hidden without changing Projects adjacency. Independent evidence: user screenshot/request and production shared navigation. Related: UC-001, REQ-001/002, AC-001/004.
- SCN-002 — Supported Normal Scenario (System/User). Goal: navigate available features only. Starting state: capability disabled or mobile remote-access runtime. Trigger: render shell navigation. Steps: capability/runtime eligibility is resolved → user sees eligible entries. Expected: Projects absent, other ordering/filtering preserved. No new error behavior. Evidence: existing capability filter, mobile gates and tests. Related: UC-002, REQ-002, AC-002/003.

## UI, Interaction, And Experience Requirements
Applicable: Yes. Only item placement changes; existing styling, accessibility labels and interactions remain. The supplied screenshot is current-state evidence, not a normative redesign. Product support was not requested. Prototype, UI/UX supplement, external prototype ticket/revision/confirmation: N/A — not applicable.

## Quality And Non-Functional Requirements
Preserve existing behavior under REQ-002 / AC-002–004; no new performance/security targets.

## Data Continuity And Acceptable Loss
No stored data affected. No data loss/reset authorized. Existing project and capability state remains unchanged.

## External Contracts And Dependencies
Existing Projects capability and runtime availability are preserved; no external-contract changes requested.

## Supplemental Artifacts
User screenshot (absolute source in investigation notes): evidence only, not behavior-defining. Other supplements: N/A.

## Assumptions / Open Decisions
No material scope unknowns. DEC-001 resolved by AP-001: explicit approval of SR-001.

## Traceability
REQ-001 → UC-001 → BEH-001 → SCN-001 → AC-001.
REQ-002 → UC-001/002 → BEH-001/002 → SCN-001/002 → AC-002–004.

## Architecture Phase Input
Verify shared owner and all consumers; preserve gating and routes. Technical mechanism is specified in design-spec.md after AP-001. No migration or structural refactor requirement.

## Readiness Check
Current/desired/preserved behavior, scope, testable ACs, supported scenarios and evidence: ready. Product prototype: N/A. Content ready for approval: Yes. Approved basis ready for design: Yes — AP-001 approves SR-001 unchanged. Architecture design completed at SR-002.
