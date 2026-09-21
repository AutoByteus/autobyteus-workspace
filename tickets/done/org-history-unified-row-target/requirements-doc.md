# Requirements Document

## Document Status

- Status: Approved
- Current solution revision ID: SR-002
- Package identifier: ORG-HISTORY-UNIFIED-ROW-20260921-001
- Request / ticket: Make the AgentOrg history chevron part of the same primary row control, matching Agent Team history.
- Requirements owner: Solution Designer
- Date: 2026-09-21
- Approval state and reference: Explicitly approved by the user after source comparison: “Yes. Yeah. Please, the bootstrap are another small ticket.”
- Exact approved requirements baseline / solution revision: SR-001
- Behavior-defining supplements: The immediately preceding user clarification that the AgentOrg row should feel like one unit and the archived Agent Team comparator evidence from ORG-HISTORY-ROW-TOGGLE-20260920-001.

## Problem And Desired Outcome

- Problem: The delivered AgentOrg run row now toggles from its main row, but its chevron remains a second, independently focusable disclosure button. The Agent Team run row instead renders the chevron inside its single primary row button.
- Desired outcome: The AgentOrg chevron becomes a non-independent visual indicator inside the primary AgentOrg run button. Clicking the chevron or any other point in the primary row invokes the same one-unit toggle-and-open/select action.
- Observable success: There is exactly one primary interactive control for the AgentOrg run summary, including the chevron. Stop remains a separate isolated control.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenario IDs | Current Behavior | Desired Behavior | Preserved Behavior |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001, SCN-002 | AgentOrg run summary uses a dedicated chevron button plus a primary open/toggle button. | One primary semantic button contains the chevron, status and summary; activation anywhere in it toggles and opens/selects the exact run once. | Exact run identity, expansion state, open/select result, selected-workspace continuity and Agent Team behavior. |
| BEH-002 | User | SCN-003 | Stop is a separate propagation-isolated button. | Keep Stop independent and non-toggling. | Stop lifecycle semantics, timestamps, sibling rows, nested member/team rows and definition-level disclosure. |

## Scope Guardrail

### In Scope

- Remove the independent AgentOrg run-chevron button.
- Place the chevron icon inside the existing primary AgentOrg run row button.
- Preserve primary row pointer and native keyboard activation.
- Update focused regressions to prove a single primary control and secondary-control isolation.

### Out Of Scope

- Agent Team implementation changes.
- AgentOrg definition-level, mounted-Team, task, member or workspace disclosure changes.
- Backend, API, routing, persistence, history loading or runtime changes.
- Visual redesign beyond the local interaction/control merge.
- Electron build, release or deployment.

### Non-Goals

- Removing the chevron glyph.
- Making the full container, timestamp or Stop control part of the primary button.
- Changing run selection, reveal ancestry or expansion-state ownership.
- Keeping a compatibility-only hidden or redundant chevron button.

### Preserved Behavior Boundary

- The primary AgentOrg run button still toggles exact rootRunId disclosure and calls the exact run open/select action once.
- Collapsing an open run does not clear workspace content, conversation, draft or selection.
- Stop invokes termination only.
- Sibling disclosure and all Agent Team behavior remain unchanged.

## Requirements

| Requirement ID | Requirement | Behavior IDs | Priority | Rationale |
| --- | --- | --- | --- | --- |
| REQ-001 | Each AgentOrg history run must expose one primary summary control containing the chevron, lifecycle dot and summary label. | BEH-001 | Required | Exact Agent Team interaction parity and one-unit affordance. |
| REQ-002 | Activating any point within that primary control, including the chevron glyph, must toggle the exact run and invoke its open/select action exactly once. | BEH-001 | Required | Prevents divergent click behavior and double toggles. |
| REQ-003 | The primary control must expose the accurate expanded state and conditional child relationship to assistive technology; Space and Enter retain native button activation. | BEH-001 | Required | One semantic control must own disclosure state. |
| REQ-004 | Stop and all other secondary controls must remain separately operable and must not open, select, expand or collapse the run. | BEH-002 | Required | Prevents accidental lifecycle and navigation coupling. |
| REQ-005 | The change must be frontend-only and preserve Agent Team behavior, history data, backend contracts, routing identities and persisted state. | BEH-001, BEH-002 | Required | This is a bounded interaction correction. |

## Acceptance Criteria

| AC ID | Requirements | Preconditions / Trigger | Expected Outcome | Alternate / Preservation | Verification |
| --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | AgentOrg run row rendered | DOM contains one primary run button; the chevron is inside it and is not a separately focusable or independently labeled button. | Chevron remains visibly rotated from exact expansion state. | Rendered component regression. |
| AC-002 | REQ-002, REQ-003 | Run collapsed, then expanded | Clicking the primary text area or chevron area alternates exact-run disclosure and calls open/select once per activation. | No double toggle and no sibling change. | Rendered regression and browser validation. |
| AC-003 | REQ-003 | Primary control focused | Space and Enter follow native button activation; aria-expanded and conditional aria-controls match rendered children. | No redundant disclosure control in the accessibility tree. | DOM assertions and browser keyboard check. |
| AC-004 | REQ-004 | Active run Stop visible | Clicking Stop invokes termination only. | No open/select/toggle side effect. | Focused regression and browser validation. |
| AC-005 | REQ-005 | Candidate diff and validation | Only bounded frontend/test/docs surfaces change; Team comparator and persistence remain unchanged. | Broader contract or state changes require return to Solution Designer. | Diff inspection and focused/adjacent validation. |

## Relevant Scenarios And Journeys

| Scenario ID | Validity | Actor / Goal | Trigger | Sequence | Expected Outcome | Related IDs |
| --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Supported Normal Scenario | Workspace user expands or collapses an Org run | Pointer activation anywhere in the primary row, including the arrow | Click row; click again | Exact hierarchy alternates; exact run opens/remains selected | BEH-001; REQ-001, REQ-002; AC-001, AC-002 |
| SCN-002 | Supported Normal Scenario | Keyboard user expands or collapses an Org run | Focus primary row and use Space or Enter | Activate; activate again | Same single-control behavior and accurate ARIA | BEH-001; REQ-003; AC-003 |
| SCN-003 | Supported Normal Scenario | Workspace user stops an active Org | Click Stop | Stop request executes | Disclosure/open state is untouched by that click | BEH-002; REQ-004; AC-004 |

## UI And Accessibility Requirements

- The normative comparator is the current Agent Team history run row: chevron icon inside the primary row button, not a separate disclosure button.
- Existing sizing, typography, colors and rotation animation should remain visually consistent.
- The primary AgentOrg button remains the treeitem and owns aria-expanded, aria-controls, aria-selected and aria-current as applicable.
- The chevron glyph is presentational within that button and must not create a second tab stop or separately announced disclosure action.
- Stop remains a separate semantic button outside the primary button.

## Quality And Data Continuity

- Accessibility: one clear focus target for the primary row; accurate disclosure state.
- Compatibility: no changes to Agent Team or backend behavior.
- Persisted data affected: No.
- Required preservation: all run history, selection/context, drafts, messages and runtime state.
- Acceptable loss/reset/migration: None.

## External Contracts And Dependencies

| Contract | Constraint | Evidence | Risk |
| --- | --- | --- | --- |
| Vue native button semantics | One primary button owns pointer and keyboard activation; no nested button | Current Org component and Team comparator | Low |
| Workspace history tree state | rootRunId remains the exact disclosure key | useWorkspaceHistoryTreeState | Low |
| Open/select action | Existing onOpenAgentOrgRun call remains once per primary activation | Current component/tests | Low |

## Supplemental Artifacts

| Artifact | Purpose | Status / Approval |
| --- | --- | --- |
| tickets/done/org-history-row-toggle/requirements-doc.md | Records the prior deliberate separate-chevron requirement now superseded only for run-row control shape | Read-only historical authority |
| tickets/done/org-history-row-toggle/handoff-summary.md | Delivered baseline and preserved-behavior evidence | Read-only historical authority |
| autobyteus-web/components/workspace/history/WorkspaceAgentOrgHistoryCollection.vue | Current two-button AgentOrg implementation | Read |
| autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue | One-button Agent Team comparator | Read |
| autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentOrgDisclosure.spec.ts | Existing disclosure/open/Stop regressions | Read |

## Assumptions And Open Decisions

- No open product decision remains.
- “Whole row” means the current primary summary area including its chevron, status and summary label, while excluding timestamp and secondary action controls.
- Product Design is not requested; the existing Team comparator is sufficient.

## Traceability

| Requirement | Behaviors | Scenarios | Acceptance |
| --- | --- | --- | --- |
| REQ-001 | BEH-001 | SCN-001 | AC-001 |
| REQ-002 | BEH-001 | SCN-001 | AC-002 |
| REQ-003 | BEH-001 | SCN-002 | AC-003 |
| REQ-004 | BEH-002 | SCN-003 | AC-004 |
| REQ-005 | BEH-001, BEH-002 | SCN-001–SCN-003 | AC-005 |

## Readiness And Approval

- Current behavior evidence-backed: Yes.
- Desired and preserved behavior explicit: Yes.
- Scope, non-goals and scenarios clear: Yes.
- Acceptance criteria testable and traceable: Yes.
- Explicit user approval received: Yes, 2026-09-21.
- Approved requirements baseline: SR-001.
- Ready for architecture design: Yes.
