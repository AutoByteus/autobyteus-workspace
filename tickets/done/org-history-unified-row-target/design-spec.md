# Design Specification

## Document Status And Basis

- Status: Architecture Design Complete
- Package identifier: ORG-HISTORY-UNIFIED-ROW-20260921-001
- Current solution revision: SR-002
- Approved requirements basis: SR-001, explicitly approved by the user on 2026-09-21.
- Worktree / branch: /Users/normy/autobyteus_org/autobyteus-worktrees/org-history-unified-row-target / codex/org-history-unified-row-target
- Base / finalization target: 9a0d2c3fd0d13a28e00e8649c515a7d56c673a32 from origin/requirements/flat-agent-organization-model; final target remains that remote branch.
- Task size: Small
- Architectural risk: Low
- Route: Direct implementation; independent architecture review is not required by classification.

## Summary

Replace the AgentOrg run row's two parallel interactive controls with one primary semantic button that contains the chevron icon, lifecycle indicator and summary. The existing openRun handler remains the single activation path: it toggles exact-run disclosure and invokes the existing open/select action once. Stop remains a separate propagation-isolated control. No shared state, backend, API or persistence owner changes.

## Relevant Behavior And Production-Path Map

| Behavior | Approved intent / ACs | Trigger | Existing evidence | Target production path |
| --- | --- | --- | --- | --- |
| BEH-001 | REQ-001–REQ-003; AC-001–AC-003 | Pointer, Space or Enter on the primary Org run row, including the chevron area | Current Org two-button source; current Team one-button comparator | DS-001: unified primary button -> openRun -> toggleAgentOrgRun(rootRunId) -> onOpenAgentOrgRun(run) |
| BEH-002 | REQ-004, REQ-005; AC-004, AC-005 | Stop or unrelated row interactions | Current click.stop boundaries and focused regressions | DS-002: Stop button -> onTerminateAgentOrg only |

## Relevant Supplemental Artifacts

| Artifact | Purpose | Relationship | Status |
| --- | --- | --- | --- |
| requirements-doc.md | Approved behavior and ACs | Governs this design | Approved SR-001 |
| investigation-notes.md | Source comparison and ownership evidence | Technical basis | Current |
| tickets/done/org-history-row-toggle/requirements-doc.md | Historical separate-chevron decision | Explains why the delivered code has two controls | Read-only |
| tickets/done/org-history-row-toggle/handoff-summary.md | Prior delivery and validation baseline | Preservation context | Read-only |

## Task Design Health Assessment

- Change posture: Behavior Change / Bug Fix.
- Current design issue found: Yes.
- Root cause classification: Duplicated Policy Or Coordination, localized to rendered event ownership.
- Refactor needed now: Yes, narrowly.
- Evidence: WorkspaceAgentOrgHistoryCollection.vue renders two sibling buttons for one run disclosure, while WorkspaceHistoryWorkspaceSection.vue renders the Team chevron inside one primary button.
- Design response: remove the dedicated Org disclosure button and its parallel state call; move only its icon into the existing primary button.
- Refactor rationale: one conceptual user action should have one semantic owner and one activation path. Keeping both paths would preserve inconsistent pointer, keyboard and screen-reader behavior.
- Intentional deferrals: None within the top-level AgentOrg run row. Other disclosure surfaces are explicitly out of scope.

## Terminology

- Primary Org run control: the existing AgentOrg summary/open button that owns treeitem, selection and disclosure state.
- Chevron area: the visual arrow glyph inside the primary control; it is not an independent control.
- Secondary control: Stop or any future action button outside the primary control.

## Legacy Removal Policy

- Policy: No backward compatibility; remove the superseded dedicated-chevron path.
- In-scope obsolete shape: the dedicated button wrapper, its separate ARIA label/state, click.stop handler and tests that require disclosure without opening.
- Replacement: the existing primary button and openRun handler.
- No hidden control, compatibility selector wrapper or dual-path handler is retained.

## Persisted Data / State Transition Decision

- Decision: Not Affected.
- Reason: only Vue template composition and rendered regression assertions change. rootRunId state ownership, stores, selection, routing, APIs and stored history remain unchanged.
- Migration: N/A.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behaviors | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Bounded Local | BEH-001 | Primary Org run button activation | Existing disclosure state and exact Org selection/open result | WorkspaceAgentOrgHistoryCollection plus existing state/action owners | Governs the unified interaction |
| DS-002 | Bounded Local | BEH-002 | Stop button activation | Existing termination action | Existing Stop control/action owner | Preserves action isolation |

## Primary And Local Spines

### DS-001

Primary button pointer/native keyboard activation -> openRun(run) -> state.toggleAgentOrgRun(rootRunId) -> actions.onOpenAgentOrgRun(run).

The chevron icon is a child of the primary button, so clicking its pixels enters this same path through native event targeting/bubbling. There is no direct chevron-to-state path.

### DS-002

Stop button click -> click.stop boundary -> actions.onTerminateAgentOrg(run).

No disclosure or open/select handler runs.

## Spine Actors And Ownership

| Node | Ownership |
| --- | --- |
| WorkspaceAgentOrgHistoryCollection.vue | Rendered control composition, exact handler binding, local ARIA projection |
| openRun(run) | Single local sequencing point for toggle then open/select |
| WorkspaceHistorySectionState | Existing exact rootRunId disclosure state |
| WorkspaceHistorySectionActions | Existing open/select and terminate actions |
| WorkspaceAgentOrgDisclosure.spec.ts | Durable rendered regression for structure and event boundaries |

## Thin Entry Facades / Public Wrappers

N/A. The component receives typed state/action bindings and does not introduce a new facade.

## Removal / Decommission Plan

| Item | Why obsolete | Replacement | Scope |
| --- | --- | --- | --- |
| Dedicated AgentOrg run disclosure button | Creates a second semantic/focus target and parallel toggle-only path | Chevron icon inside primary button | In this change |
| Direct chevron click.stop call to toggleAgentOrgRun | Conflicts with one-unit behavior | Existing openRun sequence | In this change |
| Separate chevron aria-label/expanded/controls contract | Disclosure ownership moves to primary button | Existing primary ARIA fields | In this change |
| Tests asserting chevron-only toggle without open | No longer approved behavior | Single-control and exact-once assertions | In this change |

## Off-Spine Concerns

| Concern | Spine | Responsibility | Placement |
| --- | --- | --- | --- |
| Accessibility | DS-001 | One tab stop; accurate aria-expanded and conditional aria-controls; icon presentational | Primary button template/tests |
| Visual parity | DS-001 | Preserve icon size, rotation and row spacing consistent with Team | Component classes/rendered check |
| Secondary action isolation | DS-002 | Stop cannot bubble to the primary control | Existing click.stop plus regression |
| Data preservation | DS-001, DS-002 | No store/API/persistence mutation beyond existing presentation state | Diff/API validation |

## Ownership Boundaries And Dependency Rules

- The component may compose the existing state and action callbacks but must not duplicate disclosure state locally.
- The primary button must call openRun only; it must not separately call both owners in template expressions.
- The chevron icon must not own click, key, role, tabindex or independent ARIA disclosure attributes.
- Stop remains a sibling button and must use event isolation.
- No nested button is allowed.
- No Team component change is allowed solely to accomplish parity.
- No backend or persistence dependency may be introduced.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden bypass | Correction |
| --- | --- | --- | --- | --- |
| openRun(run) | Exact toggle/open sequencing | Unified primary button | Chevron directly calling tree state | Remove direct path |
| WorkspaceHistorySectionState | Disclosure truth by rootRunId | Component local handler | Local duplicate expanded state | Reuse existing state |
| WorkspaceHistorySectionActions | Open/select and termination | Component | Direct routing/store mutation | Reuse existing callbacks |

## Interface Boundary Mapping And Check

| Interface | Subject | Responsibility | Identity | Singular / explicit | Risk |
| --- | --- | --- | --- | --- | --- |
| openRun(run) | AgentOrg run | Toggle then open/select | AgentOrgRunHistoryItem / rootRunId | Yes / Yes | Low |
| toggleAgentOrgRun(rootRunId) | Disclosure state | Toggle exact hierarchy | rootRunId | Yes / Yes | Low |
| onOpenAgentOrgRun(run) | Selection/navigation | Open exact run | AgentOrgRunHistoryItem | Yes / Yes | Low |
| onTerminateAgentOrg(run) | Lifecycle | Stop exact active Org | AgentOrgRunHistoryItem | Yes / Yes | Low |

## Naming Check

| Subject | Name | Assessment |
| --- | --- | --- |
| openRun | Natural local sequencing name | Keep |
| agent-org-run-open data-test | Existing test selector for primary control | Keep; no product contract impact |
| agent-org-run-disclosure data-test | Previously identified a button | Retain only on the presentational icon if useful for test/browser targeting, or rename to chevron consistently; it must not imply a second control in assertions |

## Existing Capability Reuse

| Need | Existing capability | Decision | Why |
| --- | --- | --- | --- |
| Disclosure state | useWorkspaceHistoryTreeState through section state | Reuse | Already exact and validated |
| Open/select | onOpenAgentOrgRun | Reuse | Existing supported path |
| Unified row pattern | Agent Team run button | Reuse pattern, not component | Same local interaction shape without unnecessary abstraction |
| Rendered regression | WorkspaceAgentOrgDisclosure.spec.ts | Extend | Owns the exact behavior |

No shared component should be created. Org and Team rows have different data/actions; extracting a generic row for this local change would increase coupling.

## Subsystem / Capability Allocation

| Area | Concerns | Decision |
| --- | --- | --- |
| Workspace history renderer | Control composition, event and ARIA projection | Extend current Org component |
| Workspace history state/actions | Disclosure/open/Stop ownership | Reuse unchanged |
| Frontend regression tests | Single-control structure and event isolation | Extend current spec |
| Canonical frontend docs | Record one-unit AgentOrg row contract | Delivery docs sync |

## Draft And Final File Responsibility Mapping

| File | Responsibility | Change |
| --- | --- | --- |
| autobyteus-web/components/workspace/history/WorkspaceAgentOrgHistoryCollection.vue | Render AgentOrg history collection and bind local interactions | Remove separate disclosure button; move icon into primary button; preserve handler/ARIA/Stop |
| autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentOrgDisclosure.spec.ts | Prove disclosure, selection, action isolation and state preservation | Replace separate-chevron assertions with one-control/chevron-inside-primary/exact-once assertions |
| autobyteus-web/docs/agent_orgs.md | Canonical behavior documentation | Delivery sync only if current text still describes a dedicated control |

## Reusable Structures And Tightness Check

- Repeated structure requiring extraction: None.
- New shared type/schema/helper: None.
- Parallel representation risk: Low after removal; the change deletes the parallel interactive path.
- Must not become: a generic history-row abstraction or shared policy layer.

## Target Folder / File Mapping

| Path | Kind | Owner | Responsibility | Must not contain |
| --- | --- | --- | --- | --- |
| autobyteus-web/components/workspace/history/WorkspaceAgentOrgHistoryCollection.vue | File | Workspace history renderer | Unified Org run control | New local state or backend logic |
| autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentOrgDisclosure.spec.ts | File | Frontend rendered tests | Structural/event regression | API mocks that bypass real tree state |
| tickets/in-progress/org-history-unified-row-target | Folder | Ticket evidence | Requirements/design/implementation/validation history | Production source |

The existing compact folder layout remains clear for this two-file change.

## Concrete Shape Guidance

Good shape:
- One button with treeitem role.
- Chevron icon is its first presentational child.
- Status and summary follow.
- Button click calls openRun once.
- Stop is a sibling button with click.stop.

Avoid:
- Two sibling buttons for chevron and summary.
- A nested button.
- Chevron-specific click or key handler.
- Calling toggle twice through icon and parent bubbling.
- Retaining a hidden dedicated disclosure control for old tests.

## Backward-Compatibility Rejection Log

| Candidate | Decision | Reason | Clean cut |
| --- | --- | --- | --- |
| Keep old disclosure button visually hidden | Rejected | Leaves redundant focus/accessibility path | Delete button |
| Keep icon click.stop plus primary click | Rejected | Recreates divergent behavior | Icon has no handler |
| Add compatibility wrapper around both controls | Rejected | Unnecessary for an unreleased feature branch | One primary control |

## Change Sequence

1. Update WorkspaceAgentOrgHistoryCollection.vue: delete the dedicated chevron button; insert the same rotating icon inside the primary button; ensure row spacing/focus remain coherent.
2. Keep openRun, disclosure-state owner, open/select owner and Stop handler unchanged.
3. Update WorkspaceAgentOrgDisclosure.spec.ts to prove one primary button, icon containment, exact-once toggle/open from text and icon targeting, correct ARIA, keyboard-capable native button semantics, Stop isolation, sibling isolation and selection/draft preservation.
4. Run the focused Org disclosure suite and relevant workspace history adjacent suites after documented Nuxt preparation.
5. Inspect the rendered row at normal sidebar dimensions and compare with Agent Team.
6. Validate no backend/API/persistence files changed and no Send/inference occurs in browser validation.
7. Delivery synchronizes canonical docs if required.

## Key Tradeoffs

- Keeping the existing primary button avoids navigation/state rewiring.
- Removing the dedicated control loses toggle-without-open behavior, intentionally, because the user requested one Team-like interaction unit.
- Pattern reuse is preferable to component extraction for this bounded delta.

## Risks And Mitigations

| Risk | Mitigation |
| --- | --- |
| Icon click triggers two handlers | Icon has no handler; only ancestor primary button handles activation |
| Spacing or focus ring regresses | Preserve Team-compatible classes and perform rendered inspection |
| Tests continue querying the old button contract | Replace structural assertions and, if selector retained on icon, assert its closest button is the primary control |
| Stop bubbles into primary action | Preserve click.stop and verify exact call counts |
| ARIA becomes duplicated | Only primary button owns expanded/controls; icon is presentational |

## Guidance For Implementation

- Do not modify openRun sequencing unless a focused test exposes an actual defect.
- Do not change useWorkspaceHistoryTreeState, action contracts or Team source.
- Prefer moving the existing Icon node, not recreating a second control abstraction.
- Keep the existing primary data-test stable. A chevron data-test may live on the icon for targeting, but it must not be treated as an independent interactive contract.
- Assertions must prove exact call counts and one-button containment, not merely visual presence.
- Any need for backend, store, routing or generic shared-component changes is Design Impact and must return to Solution Designer.

## Classification Evidence

- Code/runtime surfaces: one Vue component and its focused rendered spec.
- Contract/persistence/security/concurrency/deployment changes: none.
- Existing owners absorb the change without new interfaces.
- Task size: Small.
- Architectural risk: Low.
- Escalation trigger: any discovered need to change shared history state, navigation actions, backend/API behavior, or persisted state.
