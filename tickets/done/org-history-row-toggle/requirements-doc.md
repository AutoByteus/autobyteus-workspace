# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-002`
- Package identifier: `ORG-HISTORY-ROW-TOGGLE-20260920-001`
- Request / ticket: Make an AgentOrg history run's primary row toggle its hierarchy like an Agent Team history row.
- Requirements owner: Solution Designer
- Date: `2026-09-20`
- Approval state and reference: Approved by the user's initiating request: “when i click that specific row, then it will expand, or collapse ... bootstrap a new ticket from the base branch.”
- Exact approved requirements baseline / solution revision: `SR-001`
- Behavior-defining supplements and their approved versions: User screenshots `ctx_d40e56ba2665__image.png` and `ctx_8fede750542e__image.png` supplied with the approved request.

## Problem And Desired Outcome

- Problem: The AgentOrg history run summary row opens and expands a collapsed run, but clicking that same row again does not collapse it. Only the separate chevron toggles both ways. The adjacent Agent Team interaction already lets the primary row disclose and collapse its hierarchy.
- Affected actors or systems: Users navigating AgentOrg run history in the workspace sidebar.
- Desired outcome: The primary AgentOrg run row toggles the run hierarchy on click while retaining its existing open/select behavior.
- Observable definition of success: Repeated activation of the same AgentOrg run row alternates its hierarchy between expanded and collapsed, while the chevron and unrelated action buttons keep their existing isolated behavior.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| `BEH-001` | User | `SCN-001` | Clicking a collapsed AgentOrg run summary expands and opens it; clicking the expanded summary opens it again but leaves it expanded. | Primary-row activation toggles the AgentOrg run hierarchy in both directions and continues the existing open/select action. | Exact run identity, open/selection behavior, child rendering, and active/stopped presentation remain unchanged. | Screenshots; `WorkspaceAgentOrgHistoryCollection.vue`; `WorkspaceAgentOrgDisclosure.spec.ts`. |
| `BEH-002` | User | `SCN-002` | The dedicated chevron toggles disclosure without opening the run; Stop is isolated with `click.stop`. | Preserve these action boundaries. | Chevron-only disclosure, Stop semantics, timestamps, nested member/team selection, and definition/workspace disclosure remain unchanged. | `WorkspaceAgentOrgHistoryCollection.vue`; current disclosure tests. |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Workspace user | Inspect and navigate run hierarchies consistently | AgentOrg row click expands/collapses naturally like Team history | Destructive or secondary controls must not toggle/open the row. |
| Engineering | Correct the local interaction defect | Bounded frontend change with focused regression coverage | No backend, API, persistence, or navigation-contract change. |

## Scope Guardrail

### In-Scope Use Cases

- `UC-001`: Activate a collapsed AgentOrg history run's primary summary row to expand and open it.
- `UC-002`: Activate the same expanded primary row to collapse it while retaining the currently opened Org workspace.
- `UC-003`: Continue using the dedicated chevron for disclosure-only toggling.

### Out Of Scope

- AgentOrg definition-group, workspace, mounted Team, task, or member-row disclosure behavior.
- Agent Team behavior changes.
- New history loading, selection, routing, backend, GraphQL, persisted-state, or migration behavior.
- Visual redesign of the workspace history tree.

### Non-Goals

- Removing the dedicated AgentOrg disclosure chevron.
- Making Stop, timestamps, or other secondary controls activate the run row.
- Changing whether selection ancestry can reveal a newly selected run.

### Preserved Behavior Boundary

- Preserve `BEH-002` and all non-AgentOrg-primary-row interactions.
- A secondary action using event isolation must not invoke the new primary-row toggle.
- Expansion state remains presentation-only and keyed by exact `rootRunId`.

### Review Authority

- Blocking findings must trace to `REQ-001`–`REQ-004`, `AC-001`–`AC-004`, or the preserved behavior boundary.
- Broader navigation, disclosure, accessibility-policy, or redesign proposals are requirement gaps unless separately approved.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| `REQ-001` | Activating the primary summary area of an AgentOrg history run must toggle that exact run's expanded state. | `BEH-001` | Required | Direct user request and Team-history parity. | User request, 2026-09-20. |
| `REQ-002` | The same activation must retain the existing open/select action for that exact AgentOrg run. | `BEH-001` | Required | Expansion parity must not remove navigation. | Current supported interaction. |
| `REQ-003` | Dedicated disclosure and secondary action controls must remain isolated: chevron toggles disclosure; Stop does not open or toggle. | `BEH-002` | Required | Prevents accidental navigation or lifecycle actions. | Current component boundaries. |
| `REQ-004` | The change must be frontend-only and preserve all history data, backend contracts, routing identities, and persisted state. | `BEH-001`, `BEH-002` | Required | This is a local interaction defect. | Source investigation. |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| `AC-001` | `REQ-001`, `REQ-002` | `BEH-001`, `SCN-001` | AgentOrg definition is expanded; target run hierarchy is collapsed | Clicking the run's primary summary expands its children and invokes the exact run open action once. | No sibling run disclosure changes. | Rendered component regression. |
| `AC-002` | `REQ-001`, `REQ-002` | `BEH-001`, `SCN-001` | Same run is expanded/open | Clicking the same primary summary collapses its children while the exact run remains the open/selected subject. | Collapse does not clear messages, draft, context, or selection. | Rendered component regression plus browser validation. |
| `AC-003` | `REQ-003` | `BEH-002`, `SCN-002` | Target run is visible | Clicking the chevron toggles only disclosure; clicking Stop invokes only termination. | Neither control double-toggles because of bubbling. | Existing and focused regressions. |
| `AC-004` | `REQ-004` | `BEH-001`, `BEH-002` | Candidate implementation | No backend/API/persistence files or contracts change; Agent Team and nested Org-member row tests remain passing. | Any broader contract change requires return to Solution Designer. | Diff inspection and focused/adjacent tests. |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `SCN-001` | User | Workspace user | Inspect or hide one AgentOrg run hierarchy from its row | Primary run summary row in workspace history | Org definition visible; run row present | Click row to expand/open; click same row again to collapse | Hierarchy alternates without losing the opened run | A newly selected run may be revealed by existing selection-ancestry behavior | Supported Normal Scenario | User request; Team-row comparator; current Org open path | `REQ-001`, `REQ-002`; `AC-001`, `AC-002` |
| `SCN-002` | User | Workspace user | Use a dedicated secondary control | Chevron or Stop button | Run row present | Click the intended control | Only that control's established action occurs | N/A | Supported Normal Scenario | Existing rendered controls/tests | `REQ-003`; `AC-003` |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`
- Linked UI/UX or interaction supplement: User screenshots listed under Supplemental Artifacts.
- Linked runnable prototype / Product prototype artifacts: `N/A — not requested; existing UI parity is sufficient.`
- Product prototype ticket / revision: `N/A`
- UI/UX user-confirmation reference: The initiating request explicitly approves Team-like row disclosure behavior.
- Approved visual-reference baseline: Existing AgentOrg and Agent Team workspace-history rows in supplied screenshots.
- Normative interaction details: Primary AgentOrg run summary click toggles disclosure and opens/selects; chevron remains disclosure-only; secondary actions remain isolated.
- Permitted variation: No new styling is required.
- Required accessibility outcome: The primary semantic button exposes current expanded state and child-control relationship when applicable; existing keyboard button activation follows the same action.
- Explicitly unresolved product decisions: None.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| `QR-001` | `REQ-003`; `AC-003` | Accessibility | Primary row and disclosure controls expose accurate expansion state; action buttons remain independently operable. | AgentOrg history row only | DOM/ARIA assertions. |
| `QR-002` | `REQ-004`; `AC-004` | Compatibility | No Agent/Team history or backend behavior regression. | Existing workspace-history surfaces | Focused adjacent tests. |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`
- Data or state that must be preserved: All run history, selection/context, drafts, messages, and runtime state.
- Acceptable loss/reset/rebuild: None required or authorized.
- Remaining evidence gap: None material.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Vue rendered button/event semantics | Click and keyboard activation use one primary-row handler; secondary controls stop propagation | Current component | Low |
| Workspace history tree state | Exact `rootRunId` disclosure state remains authoritative | `useWorkspaceHistoryTreeState.ts` | Low |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `/Users/normy/.autobyteus/server-data/memory/agent_orgs/software_development_department_75403d5130584669869fdd59725f6b3e/software_engineering_team_3e746e3211f34fb39aad3979b4751e04/solution_designer_b1a3b7b01d35499d9fa06baf799a2046/context_files/ctx_d40e56ba2665__image.png` | Current AgentOrg row and hierarchy context | `REQ-001`–`REQ-003`; `AC-001`–`AC-003` | Read | User-supplied approval context |
| `/Users/normy/.autobyteus/server-data/memory/agent_orgs/software_development_department_75403d5130584669869fdd59725f6b3e/software_engineering_team_3e746e3211f34fb39aad3979b4751e04/solution_designer_b1a3b7b01d35499d9fa06baf799a2046/context_files/ctx_8fede750542e__image.png` | Agent Team interaction comparator | `REQ-001`; `AC-001`, `AC-002` | Read | User-supplied approval context |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| `ASM-001` | “Row” means the existing primary summary/open button, excluding Stop, age text, and dedicated chevron. | Matches current Team interaction boundary and avoids accidental secondary actions. | Rendered regression / Implementation | Confirmed by product evidence and current UI |

## Open Decisions And Questions

None.

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Prototype Evidence |
| --- | --- | --- | --- | --- | --- |
| `REQ-001` | `UC-001`, `UC-002` | `BEH-001` | `AC-001`, `AC-002` | `SCN-001` | Both screenshots |
| `REQ-002` | `UC-001`, `UC-002` | `BEH-001` | `AC-001`, `AC-002` | `SCN-001` | Current source/tests |
| `REQ-003` | `UC-003` | `BEH-002` | `AC-003` | `SCN-002` | Current source/tests |
| `REQ-004` | `UC-001`–`UC-003` | `BEH-001`, `BEH-002` | `AC-004` | `SCN-001`, `SCN-002` | Investigation notes |

## Architecture Phase Input

- Approved scenario IDs: `SCN-001`, `SCN-002`.
- Constraints: preserve open/select, exact identity, chevron-only disclosure, Stop isolation, and all data/runtime behavior.
- Decisions deferred to architecture: Local handler/test shape only.
- Technical facts to verify: current primary handler's one-way expansion guard and Team comparator behavior.
- Known risk: selection-ancestry reveal must not be broadly changed.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior evidence-backed: `Yes`
- Desired and preserved behavior explicit: `Yes`
- Scope and non-goals clear: `Yes`
- Requirements and acceptance criteria testable/traceable: `Yes`
- Applicable scenarios covered: `Yes`
- Supplemental evidence integrated: `Yes`
- Applicable UI/UX approval recorded: `Yes`
- Material assumptions/open decisions visible: `Yes`
- Content ready for user approval: `Yes`
- Remaining blocker: `None`

### Approved Basis Ready For Design

- User approval received: `Yes`
- Exact requirements/supplement basis recorded: `Yes`
- Approved package ready for architecture design: `Yes`
- Remaining blocker: `None`
