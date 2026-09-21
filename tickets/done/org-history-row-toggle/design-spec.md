# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-002`
- Approved requirements baseline / revision and user-approval reference: `SR-001`, approved by the initiating 2026-09-20 request.
- Behavior-defining supplements: Two user-supplied screenshots listed in `requirements-doc.md` and `investigation-notes.md`.
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-row-toggle/tickets/in-progress/org-history-row-toggle/investigation-notes.md`

## Current-State Read

`WorkspaceAgentOrgHistoryCollection.vue` already composes the correct owners: exact-root presentation state from `useWorkspaceHistoryTreeState` and exact Org opening through `WorkspaceHistorySectionActions`. Its local `openRun()` handler is the defect: it calls the disclosure toggle only when collapsed, so the primary row cannot collapse. The dedicated chevron directly toggles, and Stop stops propagation. No ownership or contract gap exists.

## Task Size And Architectural Risk

- Task size: `Small`
- Size rationale: One local Vue interaction handler/ARIA binding and one focused rendered test file; adjacent existing tests may be run without production changes.
- Architectural risk: `Low`
- Risk rationale: No API, backend, persistence, schema, runtime lifecycle, security, concurrency, or ownership-boundary change. Existing exact-root disclosure and open owners are reused.
- Escalation trigger: If implementation requires modifying selection ancestry, shared history state, routing, backend contracts, or more than the local component/test boundary, return as `Design Impact`.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Source read | `autobyteus-web/components/workspace/history/WorkspaceAgentOrgHistoryCollection.vue` | `openRun` conditionally toggles only when collapsed | Replace one-way guard with exact-root toggle before existing open action | None |
| Comparator read | `WorkspaceHistoryWorkspaceSection.vue`; `useWorkspaceHistorySelectionActions.ts` | Team primary row couples selection/open with disclosure behavior | Preserve the same user-visible composition without rewriting Team logic | None |
| State-owner read | `useWorkspaceHistoryTreeState.ts` | `toggleAgentOrgRun(rootRunId)` already owns exact presentation state | Reuse owner unchanged | None |
| Rendered test read | `WorkspaceAgentOrgDisclosure.spec.ts` | Current test asserts second row click remains expanded | Convert to desired expand/collapse regression and preserve action isolation | None |

## Intended Change

Make the AgentOrg run primary summary button a bidirectional disclosure trigger while retaining its existing exact Org open action. Publish accurate `aria-expanded` and `aria-controls` on that button. Preserve the separate chevron and all secondary controls.

## Relevant Behavior And Production-Path Map

| Behavior ID | Kind | Approved Requirement / Intent And AC IDs | Approved Trigger | Existing Behavior / Evidence | Approved Change Or Preserved Outcome | Target Production Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| `BEH-001` | User | `REQ-001`, `REQ-002`; `AC-001`, `AC-002` | Primary AgentOrg run summary activation | Component-local one-way guard | Toggle exact hierarchy in both directions, then retain exact open action | `DS-001` |
| `BEH-002` | User | `REQ-003`, `REQ-004`; `AC-003`, `AC-004` | Chevron or secondary action | Existing direct toggle and propagation isolation | Preserve unchanged | `DS-002` |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To Design | Status |
| --- | --- | --- | --- | --- |
| User screenshot paths in `requirements-doc.md` | Visual interaction context and Team comparator | `REQ-001`–`REQ-003` | Confirms existing surface; no redesign | Approved evidence |

## Task Design Health Assessment

- Change posture: `Bug Fix`
- Current design issue found: `No`
- Root cause classification: `Local Implementation Defect`
- Refactor needed now: `No`
- Evidence: Existing component, tree state, subject action, and tests already separate responsibilities correctly; only the local composition is one-way.
- Design response: Remove the one-way guard, use the existing toggle on every primary-row activation, and retain the existing open call.
- Refactor rationale: A new helper or shared policy would be empty indirection for one local handler.
- Intentional deferrals/residual risk: None; selection-ancestry reveal remains intentionally outside this change.

## Terminology

- **Primary summary button:** The button carrying the run status and summary and currently invoking `openRun`; excludes the dedicated chevron, Stop, and timestamp.
- **Disclosure state:** Whether the exact AgentOrg run's execution hierarchy is rendered.

## Legacy Removal Policy

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: Remove the obsolete conditional one-way expansion branch from `openRun`.
- No wrapper, fallback, or dual behavior is introduced.

## Persisted Data / State Transition Decision

- Decision: `Not Affected`
- Rationale: Only ephemeral Vue presentation state and DOM attributes change; no stored representation, reader, writer, or schema changes.
- Supported criteria: `AC-002`, `AC-004` require context/data preservation.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behaviors | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| `DS-001` | Primary End-to-End | `BEH-001` | Primary AgentOrg run row activation | Hierarchy toggled and exact Org remains opened | `WorkspaceAgentOrgHistoryCollection.vue` composes existing owners | Implements requested parity |
| `DS-002` | Bounded Local | `BEH-002` | Chevron or Stop activation | Only dedicated action applied | Existing button/event boundary | Prevents bubbling and double action |

## Primary Execution Spine

`Primary summary button -> component-local openRun(run) -> toggleAgentOrgRun(rootRunId) -> existing onOpenAgentOrgRun(run) -> existing AgentOrg inspection/navigation`

## Spine Narratives

| Spine ID | Short Narrative | Main Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-001` | A semantic button toggles the exact run's presentation state, exposes that state through ARIA, and delegates unchanged opening/navigation to the existing action owner. | run row, exact disclosure state, exact Org open | Component composition | Async open failure remains existing behavior; disclosure is presentation-local. |
| `DS-002` | Dedicated controls retain stopped propagation and invoke only their existing action. | chevron, Stop | Individual button handlers | No parent-row handler must be added to the outer container. |

## Spine Actors / Main-Line Nodes

- Primary summary button: receives user activation.
- `openRun`: composes toggle and open without owning either underlying policy.
- Tree state: owns exact `rootRunId` expanded state.
- Section action: owns exact AgentOrg open/navigation.

## Ownership Map

- `WorkspaceAgentOrgHistoryCollection.vue`: row rendering and interaction composition.
- `useWorkspaceHistoryTreeState.ts`: disclosure state only; unchanged.
- `useWorkspaceHistorySubjectActions.ts`: Org open/navigation only; unchanged.

## Thin Entry Facades / Public Wrappers

| Facade | Governing Owner | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `WorkspaceHistorySectionState.toggleAgentOrgRun` | Tree state | Supplies exact toggle to presentation component | Navigation or hydration |
| `WorkspaceHistorySectionActions.onOpenAgentOrgRun` | Subject actions | Supplies exact open action | Disclosure state |

## Removal / Decommission Plan

| Item | Why Unnecessary | Replacement | Scope | Notes |
| --- | --- | --- | --- | --- |
| `if (!isRunExpanded(...))` one-way guard in `openRun` | Blocks collapse from the primary row | Unconditional existing exact-root toggle | In this change | Clean-cut behavior correction |
| Test expectation that second row click remains expanded | Encodes the defect | Bidirectional row-toggle regression | In this change | Preserve adjacent assertions |

## Return Or Event Spines

N/A — no new asynchronous return/event contract. Existing open promise behavior is retained.

## Bounded Local / Internal Spines

- `DS-002`: secondary button click -> propagation stopped -> existing dedicated action; outer primary handler is not invoked.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves Owner | Responsibility | Why | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| ARIA disclosure state | `DS-001` | Primary summary button | Reflect `aria-expanded` and conditional `aria-controls` | Button now toggles children | Assistive state mismatch |
| Event isolation | `DS-002` | Secondary controls | Prevent double toggle/open | Existing control boundaries | Accidental terminate/navigation |

## Ownership Boundaries

The component may compose state and action boundaries but must not duplicate expansion maps or navigation logic. Tree state and subject actions remain authoritative and unchanged.

## Boundary Encapsulation Map

| Boundary | Internal Mechanism | Upstream Caller | Forbidden Bypass | Fix If Too Thin |
| --- | --- | --- | --- | --- |
| `toggleAgentOrgRun(rootRunId)` | `expandedAgentOrgRuns` map | Collection component | Direct map mutation | Extend tree-state API, not component state |
| `onOpenAgentOrgRun(run)` | Inspection, selection intent, route | Collection component | Direct router/context mutation | Extend subject action boundary |

## Dependency Rules

- Component may call only the supplied state/action interfaces.
- Do not import stores/router into the collection for this fix.
- Do not add a parent-container click handler that captures Stop or other controls.
- Do not change Team behavior or selection-ancestry reveal.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity | Notes |
| --- | --- | --- | --- | --- |
| `toggleAgentOrgRun(rootRunId)` | AgentOrg run disclosure | Toggle presentation state | exact `rootRunId` | Reused unchanged |
| `onOpenAgentOrgRun(run)` | AgentOrg run | Open/select exact run | `AgentOrgRunHistoryItem` | Reused unchanged |

## Interface Boundary Check

| Interface | Singular? | Explicit Identity? | Ambiguity Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `toggleAgentOrgRun` | Yes | Yes | Low | None |
| `onOpenAgentOrgRun` | Yes | Yes | Low | None |

## Main Domain Subject Naming Check

| Subject | Name | Self-Descriptive? | Drift Risk | Action |
| --- | --- | --- | --- | --- |
| AgentOrg run disclosure | `toggleAgentOrgRun` | Yes | Low | Reuse |
| Exact Org opening | `onOpenAgentOrgRun` | Yes | Low | Reuse |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Capability | Decision | Why | If New |
| --- | --- | --- | --- | --- |
| Toggle Org hierarchy | Tree state | Reuse | Already exact and tested | N/A |
| Open Org | Subject actions | Reuse | Already owns inspection/navigation | N/A |
| Rendered regression | Existing disclosure spec | Extend | Closest behavior owner | N/A |

## Subsystem / Capability Allocation

- Workspace history presentation: one component modification.
- Workspace history rendered tests: one test modification/addition.
- No other subsystem changes.

## Draft And Final File Responsibilities

| Path | Change | Final Responsibility |
| --- | --- | --- |
| `autobyteus-web/components/workspace/history/WorkspaceAgentOrgHistoryCollection.vue` | Modify | Compose bidirectional exact-root toggle with unchanged open action; publish correct ARIA state. |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentOrgDisclosure.spec.ts` | Modify | Prove row expand/collapse, open action, disclosure-only chevron, and secondary-action isolation. |

No reusable structure extraction is justified.

## Folder / Path Mapping

All changes remain in the existing `autobyteus-web/components/workspace/history` capability area and its colocated tests.

## Change Sequence

1. Replace the conditional expansion in `openRun` with the existing exact-root toggle on every primary-row activation.
2. Add accurate `aria-expanded` and conditional `aria-controls` to the primary summary button.
3. Revise the focused rendered regression to prove expanded -> collapsed -> expanded behavior and exact open-action calls.
4. Preserve and run chevron, Stop, nested member/team, refresh, localization, selection, and adjacent workspace-history tests.

## Tradeoffs And Alternatives

- Rejected: outer-row click handler. It would risk capturing Stop/timestamp/secondary actions.
- Rejected: merging chevron and primary button. Not required and would change disclosure-only behavior.
- Rejected: moving toggle policy into subject actions. That would mix presentation state with navigation ownership.

## Risks And Controls

| Risk | Control |
| --- | --- |
| Double toggle from nested controls | Keep distinct buttons and existing `click.stop`; no outer handler. |
| Collapse immediately undone by selection reveal | Test repeated activation of the already opened run; preserve intentional reveal for newly selected subjects. |
| Open action accidentally removed | Assert exact open call on primary activation. |
| ARIA state stale | Bind both primary and chevron controls to the same existing state function. |

## Validation Plan

- Focused rendered tests for `WorkspaceAgentOrgDisclosure.spec.ts`.
- Adjacent workspace history component/tree-state tests.
- Frontend build or type validation proportional to repository capability.
- Browser validation of a real AgentOrg history row: row click expands, second row click collapses, chevron remains independent, Stop does not toggle.

## Implementation Guidance

- Keep the patch local and explicit; do not create a generic disclosure helper.
- Await/return the existing open action exactly as today after synchronously toggling presentation state.
- Preserve existing data-test selectors unless adding a narrowly useful assertion target.

## Final Classification

- Result: `Architecture Design Complete`
- Task size / risk: `Small / Low`
- Route basis: Existing owners absorb the change with one local handler/test correction; no independent architecture review is required unless the escalation trigger is reached.
