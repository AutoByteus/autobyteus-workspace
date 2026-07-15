# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready — approved by user on 2026-06-27. Product semantics: workspace removal is registry/visibility removal only; it does not delete files, run history, memories, or artifacts.

## Goal / Problem Statement

Customers can add or see workspaces in the left sidebar `Workspaces` section, but cannot remove workspace entries they no longer need. The product should provide a clear, safe, row-specific workspace-removal affordance and durable removal behavior so the workspace does not reappear after refresh/reload.

## Investigation Findings

- The visible `Workspaces` section is rendered by `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue`, with row rendering delegated to `WorkspaceHistoryWorkspaceSection.vue`.
- The header `+` button is a global add/load action. It is not the right location for removal because removal must be tied to one exact workspace row.
- Workspace rows are currently built from two data sources:
  - active workspace metadata from `workspaceStore.allWorkspaces`; and
  - non-archived run/team history groups from backend `listWorkspaceRunHistory`.
- No backend or GraphQL remove/delete workspace mutation exists today.
- Therefore, a correct remove feature needs both UI affordance and backend-supported workspace registry removal semantics; a frontend-only row deletion would reappear on refresh.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / behavior gap.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant + Boundary Or Ownership Issue.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Limited refactor needed.
- Evidence basis: `WorkspaceHistoryWorkspaceSection.vue` has no row action; `runHistoryStore.getTreeNodes()` combines active workspace descriptors and run-history groups; backend `WorkspaceResolver`/`WorkspaceManager` expose create/list but no remove; `WorkspaceRunHistoryService` has no registry-authoritative workspace listing.
- Requirement or scope impact: Must add a row-level remove affordance plus durable backend registry removal state, not only a UI button.

## Recommendations

- Put the remove affordance on each workspace row, far right, using hover/focus/touch-visible row action behavior consistent with existing run/team row actions.
- Prefer label/copy `Remove from Workspaces` rather than `Delete workspace` to avoid implying filesystem deletion.
- Keep the existing header `+` as add/load only; do not add a global header-level remove button.
- Confirm before removal. The confirmation must explicitly state that files are not deleted and that stored history will not appear under Workspaces unless the workspace is added again.
- Backend removal should delete the workspace's registry entry, close any active file-explorer sessions for that root, and ensure the top-level workspace list is registry-derived so old history does not recreate removed rows.
- Block removal when the workspace has active agent/team runs; ask the user to stop active work first.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium: visual row button is small, but durable behavior touches frontend row/action contracts, stores, GraphQL schema/mutations, backend workspace manager/storage, run-history grouping, and tests.

## In-Scope Use Cases

- UC-001: User removes a workspace entry they no longer need from the `Workspaces` section.
- UC-002: User is protected from accidental removal through an explicit confirmation flow.
- UC-003: UI state remains coherent when the removed workspace is selected, expanded, or contains visible children.
- UC-004: Re-adding/loading the same workspace root restores the workspace to the list without deleting previous stored run history.

## Out of Scope

- Bulk workspace removal.
- Workspace rename, move, archive browser, or import/export.
- Deleting the underlying filesystem directory or user files.
- Permanently deleting all run/team history for a workspace as part of workspace removal.
- Broader redesign of the full sidebar/navigation model.

## Functional Requirements

- REQ-001: The `Workspaces` list must expose a discoverable removal action for each removable real workspace.
- REQ-002: The removal action must be tied to the specific workspace row and must not appear as an ambiguous global header action.
- REQ-003: The removal action must not be easily triggered accidentally during normal workspace selection or expansion.
- REQ-004: The user must confirm removal before the workspace is removed.
- REQ-005: Confirmation copy must state that files are not deleted and explain what happens to stored run/team history visibility.
- REQ-006: On successful removal, the workspace must disappear from the `Workspaces` list without requiring an app restart and must remain absent after refresh/reload.
- REQ-007: If the removed workspace is currently selected or expanded, the application must transition to a valid remaining state without stale child items, stale file-explorer sessions, or broken selection.
- REQ-008: If removal fails, the workspace must remain visible and the user must receive an actionable error message.
- REQ-009: A workspace with active agent/team runs must not be silently removed; the user must be told to stop active work first.
- REQ-010: Re-adding/loading the same workspace root must restore its visibility.
- REQ-011: Top-level workspace rows must be derived from the persisted workspace registry, while run/team history is shown beneath registered workspace rows when the workspace is expanded or selected.

## Acceptance Criteria

- AC-001: Given a workspace row in the left sidebar, when the row is hovered, focused, or viewed on touch/mobile, the user can find a `Remove from Workspaces` action associated with that exact workspace.
- AC-002: Given the remove action is invoked, the workspace row does not expand/collapse as a side effect of clicking the remove action.
- AC-003: Given the remove action is invoked, the confirmation identifies the workspace and states that workspace files will not be deleted.
- AC-004: Given the user cancels confirmation, the workspace list and selection remain unchanged.
- AC-005: Given the user confirms removal and the backend succeeds, the workspace row is removed from the sidebar and the workspace remains absent after workspace/history refresh or app reload.
- AC-006: Given the removed workspace was selected, expanded, or had visible nested items, the UI clears that selection/expansion and does not show stale children after removal.
- AC-007: Given removal fails or the workspace has active runs/team runs, the row remains visible and an actionable error is shown.
- AC-008: Given the same workspace root is added/loaded again later, the root becomes visible again and any non-deleted stored history for that root can appear again.
- AC-009: The remove affordance remains keyboard/screen-reader accessible and does not rely on hover only.
- AC-010: Given a run history record exists for an unregistered/removed workspace root, that record does not create a top-level workspace row; after the same root is re-added, expanding that workspace can reveal its history again.




### Workspace List / History Interaction Model Clarification (2026-06-27)

The intended UI model is now clarified: the top-level `Workspaces` list should show registered workspaces from the persisted workspace registry. Workspace history is subordinate to a workspace row. When the user clicks/expands the chevron for a registered workspace, the application should load/show run/team history for that workspace. Historical runs should not independently create top-level workspace rows for unregistered/removed workspace roots.

### User Clarification Update (2026-06-27)

The user clarified the intended meaning: removing a workspace should remove it from what is shown in the frontend and keep it absent after application restart. Agent run memories/history created under that workspace should **not** be deleted. This confirms the design direction: delete the workspace registry entry and unregister loaded workspace metadata, while preserving run/team history and memory records.

## Persistence Semantics Clarification

Recommended product meaning: **Remove from Workspaces** means the app forgets/removes the workspace root as a user-visible workspace entry. It does **not** delete the underlying filesystem folder, workspace files, run history, memory, or artifacts.

Preferred persistence-level effects after user clarification:

1. Treat the persisted workspace registry as the authority for which workspaces appear in the frontend workspace list. The current app-data `workspaces.json` is close to this concept, but today it behaves more like an ID-to-root mapping and is not yet the sole frontend list authority.
2. `Add workspace` should create/restore one registry entry for the workspace root.
3. `Remove from Workspaces` should delete that registry entry and close/unregister any active in-memory workspace instance plus file-explorer live sessions/watchers for that root.
4. The frontend top-level Workspaces list should be derived from the registry-backed `workspaces` endpoint, not recreated from all historical run/team workspace groups.
5. Run/team history records remain intact and continue to reference their original workspace root. They are queried/shown only when their workspace is registered/selected/expanded, or when a separate global recent-history surface intentionally asks for them.
6. Re-adding/loading the same root path recreates the registry entry and can reveal old history for that root again.

Rejected meaning: deleting the physical directory or deleting all historical run/team records for that workspace. Those are separate destructive operations and are out of scope for this feature.

## Constraints / Dependencies

- Must align with existing workspace store, run-history tree, and backend workspace manager ownership.
- Must avoid destructive filesystem deletion.
- Must not implement frontend-only filtering that is lost on refresh/reload; visible workspace rows should come from a backend-persisted workspace registry.
- Must keep existing run/team archive/delete semantics separate from workspace removal.
- Must preserve the existing global `+` add/load affordance in the `Workspaces` header.

## Assumptions

- The customer complaint is about removing a workspace from the application's workspace list, not deleting the underlying directory from disk.
- The safest default is `Remove from Workspaces` rather than `Delete folder`.
- History for unregistered workspaces should not create top-level workspace rows; re-adding the same root restores access to that history.

## Risks / Open Questions

- Need validate exact default temp workspace behavior if it appears in this sidebar; recommended behavior is not removable.
- Need define exact message if active runs block removal.

## Requirement-To-Use-Case Coverage

| Requirement | Use Cases |
| --- | --- |
| REQ-001 | UC-001 |
| REQ-002 | UC-001 |
| REQ-003 | UC-001, UC-002 |
| REQ-004 | UC-002 |
| REQ-005 | UC-002 |
| REQ-006 | UC-001 |
| REQ-007 | UC-003 |
| REQ-008 | UC-001, UC-002 |
| REQ-009 | UC-001, UC-003 |
| REQ-010 | UC-004 |
| REQ-011 | UC-001, UC-004 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Discoverability and row association of removal action |
| AC-002 | Remove action does not conflict with expand/collapse row interaction |
| AC-003 | Safe, explicit confirmation semantics |
| AC-004 | Cancel path has no side effects |
| AC-005 | Successful durable removal and reload persistence |
| AC-006 | Selected/expanded workspace state cleanup |
| AC-007 | Failure/active-run path preserves data and informs user |
| AC-008 | Re-add restores visibility without deleting history |
| AC-009 | Accessibility of removal action |
| AC-010 | Removed/unregistered workspace history does not create a top-level row; re-add restores access |

## Approval Status

Approved by user on 2026-06-27. Proceed to refactor-aware design and architecture review.
