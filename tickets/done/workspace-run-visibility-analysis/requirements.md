# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

After the workspace-removal refactor, a first-install / empty-state user can configure and start a single agent or agent team with the default **Temp Workspace**, but the left sidebar `Workspaces` section still shows `No run history yet.` The selected run opens in the center pane, but the workspace row and the draft run row are missing from the sidebar.

A related run-start UX issue is that when the user switches the workspace selector to **New**, types a workspace path, and clicks **Run Agent** / **Run Team** without clicking **Load**, the typed path is not used. The config still points at the previously selected workspace, often Temp Workspace, and the user has to remember an unintuitive intermediate Load step.

Expected behavior: when a run is created from the agent or team configuration flow, the workspace associated with that run must become visible in the left `Workspaces` section immediately, and the newly selected draft/live run must be revealed beneath that workspace without requiring reload or history polling. If the user entered a new workspace path, clicking Run must load/register that path automatically before creating the run. The `New` workspace selector must not expose a separate `Load` button or require any explicit preload step; Run Agent / Run Team is the single submit action for launching with the typed or browsed path.

## Investigation Findings

- The screenshots confirm the reported temp-workspace sequence: the sidebar starts empty on the Agents page, the run configuration shows `Temp Workspace (Default)`, and after `Run Agent` the center pane opens `New - Codex` while the sidebar still says `No run history yet.`
- Git history identifies the regression source as the workspace-removal delivery, primarily commit `19828ad2` (`checkpoint: workspace removal candidate before delivery refresh`) merged by `6b74ce53` and released in `v1.3.81`.
- That refactor intentionally changed the desktop sidebar so top-level workspace rows are derived from `workspaceStore.allWorkspaces` / backend `workspaces()` descriptors, not from every historical run root. This was correct for removal because deleted/unregistered workspaces must not reappear from old history.
- The same commit also added a frontend descriptor filter in `autobyteus-web/stores/runHistoryReadModel.ts` that skips every workspace with `kind !== 'filesystem'` and every workspace with `isTemp === true`. Backend `workspaces()` still exposes the temp workspace via `WorkspaceResolver.workspaces()` -> `WorkspaceManager.getOrCreateTempWorkspace()` -> `WorkspaceManager.listVisibleWorkspaces()`, and the run config selector auto-selects that temp workspace as the default.
- `autobyteus-web/utils/runTreeProjection.ts` now treats workspace descriptors as the only top-level row source. Draft runs and persisted history are attached only if their normalized root matches a visible descriptor. Because the temp descriptor is filtered out, draft runs for `temp_ws_default` are discarded from the sidebar projection.
- This affects single-agent and team flows: team nodes are also rendered under `workspaceNodes`, so a missing temp workspace row prevents the team draft/live row from being displayed.
- There is a secondary timing weakness for standalone agent runs: only IDs with the `temp-` prefix are projected as local draft rows before backend history appears. After the first message promotes a standalone draft run to its permanent run ID, the row can disappear or fail to appear until `refreshTreeQuietly()` returns a history row. Team run projection is more robust because active team contexts are projected separately once a workspace row exists.
- The workspace-removal requirements already called out that temp workspace behavior needed validation and recommended temp rows be non-removable. Current UI renders the remove action for every workspace row, while backend removal only supports registered filesystem workspace IDs.
- The new-workspace screenshot shows the selector on the `New` tab with `/home/autobyteus/workspace` typed, while the helper still says `Workspace: Temp Workspace`. Code confirms `WorkspaceSelector.vue` keeps the typed `tempPath` as local state and only emits it via `load-new` when the user clicks `Load`; `RunConfigPanel.handleRun()` cannot see the pending path and creates runs from the previously selected workspace config. The user has now clarified that this separate `Load` button should be removed entirely rather than kept as an optional action.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant; Boundary Or Ownership Issue
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed, but bounded to the sidebar projection/read-model contract and non-removable workspace metadata.
- Evidence basis: The workspace-removal refactor correctly made backend-visible workspaces the top-level authority, but the frontend read model rejects the temp workspace even though the run configuration and backend list treat it as the default visible run workspace. The projection gate then drops local draft runs because no descriptor exists for their root.
- Requirement or scope impact: The fix must preserve the workspace-removal invariant that old history does not recreate top-level rows, add a precise visible-workspace invariant for active temp/default workspaces and local draft/live runs, and make Run own final workspace readiness by auto-loading a pending new workspace path before creating the run.

## Recommendations

1. Keep the workspace-removal architecture decision: top-level sidebar workspace rows must come from backend-visible workspace descriptors, not from historical run roots.
2. Treat the default temp workspace as a backend-visible, non-removable workspace descriptor for the sidebar when it is returned by `workspaces()` and used by run configuration.
3. Update the frontend projection/read model to include `kind: 'temp'` / `isTemp: true` descriptors, while continuing to exclude unrelated transient skill workspaces from the run-history sidebar unless a separate product requirement says otherwise.
4. Extend workspace row metadata with removability (`canRemoveFromWorkspaces` or equivalent) so temp rows do not show or enable `Remove from Workspaces`.
5. Preserve descriptor gating for persisted history and drafts: if a root is not represented by a visible workspace descriptor, it must not create a top-level row.
6. Add local standalone live-run projection for selected/active non-`temp-` agent contexts that are not yet present in history, or otherwise guarantee the row remains visible across temporary-ID promotion until history refresh catches up.
7. Add regression coverage for the exact first-install temp run flow, the team equivalent, removed-workspace history suppression, non-removable temp rows, and no duplicate rows when temp and filesystem descriptors share the same root.
8. Remove the user-facing `Load` button/action from New workspace mode. Keep typed or browsed paths as pending launch input and let Run Agent / Run Team perform the registration/loading step.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: First-install / empty-state user starts a single-agent run with the default temp workspace.
- UC-002: First-install / empty-state user starts an agent-team run with the default temp workspace.
- UC-003: User starts a single-agent run with an explicitly selected existing registered workspace.
- UC-004: User starts an agent-team run with an explicitly selected existing registered workspace.
- UC-005: User has old run/team history for a removed/unregistered workspace root.
- UC-006: Backend `workspaces()` returns both a temp descriptor and a registered filesystem descriptor for the same normalized root.
- UC-007: User inspects workspace-row actions in the left sidebar.
- UC-008: User types a new workspace path for a single-agent run and clicks `Run Agent` without any Load button/action.
- UC-009: User types a new workspace path for an agent-team run and clicks `Run Team` without any Load button/action.

## Out of Scope

- Broad workspace UX redesign.
- Changing the product meaning of `Remove from Workspaces` for registered filesystem workspaces.
- Deleting or migrating run/team history, memory, artifacts, or filesystem contents.
- Reintroducing global history as a top-level workspace-row source.
- Skill workspace sidebar behavior unless directly needed to avoid regressions.
- Release/deployment work.
- Broader workspace selector redesign beyond removing the New-mode `Load` button/action and required helper-state adjustments.

## Functional Requirements

- REQ-001: The left sidebar `Workspaces` top-level rows must continue to be derived only from backend-visible workspace descriptors held in `workspaceStore.allWorkspaces` or the equivalent workspace-list boundary.
- REQ-002: A backend-visible temp workspace descriptor returned by `workspaces()` and used by run configuration must be eligible to create a top-level sidebar workspace row.
- REQ-003: Historical run/team roots that have no matching visible workspace descriptor must not create top-level sidebar workspace rows.
- REQ-004: When a single-agent draft run is created from the configuration flow, its workspace row and draft run row must appear immediately if the run's normalized workspace root matches a visible descriptor.
- REQ-005: When an agent-team draft run is created from the configuration flow, its workspace row and team draft row must appear immediately if the team/member workspace root matches a visible descriptor.
- REQ-006: The sidebar must reveal the selected new run's ancestry so the workspace row and the relevant agent/team group are expanded enough for the run row to be visible.
- REQ-007: A standalone agent run must remain visible across temporary run ID promotion and backend history reconciliation; it must not disappear merely because the permanent run ID has not yet arrived in the history query response.
- REQ-008: Temp workspace rows must be non-removable from the sidebar; the UI must not offer an action that will call `removeWorkspace` for `temp_ws_default` or another non-removable temp descriptor.
- REQ-009: Registered filesystem workspace rows must retain the existing `Remove from Workspaces` behavior and guard semantics.
- REQ-010: Workspace-scoped history loading must support visible temp workspace IDs by resolving them to the temp workspace root; expanding or refreshing a temp workspace row must not fail only because the row is not a registered filesystem workspace.
- REQ-011: If multiple visible descriptors resolve to the same normalized workspace root, the projection must produce at most one workspace row. For the fixed temp workspace root, the temp descriptor should control row identity/removability so the row remains non-removable even if a filesystem descriptor for the same root is present.
- REQ-012: Existing regular workspace creation/selection from the run configuration flow must continue to register the workspace and make it visible in the sidebar.
- REQ-013: The fix must add or update durable tests covering temp/default workspace projection, immediate draft visibility, temp workspace history loading, live/promotion reconciliation, non-removable temp rows, descriptor dedupe, and removed-workspace history suppression.
- REQ-014: `WorkspaceSelector` must expose the current workspace input state, including New/Existing mode and the current pending New-mode path, to `RunConfigPanel` continuously as launch input; this state must not depend on a `Load` click.
- REQ-015: When New mode has a non-empty pending path and the user clicks `Run Agent`, the run flow must create/register that workspace and update the agent run config before creating the local agent context.
- REQ-016: When New mode has a non-empty pending path and the user clicks `Run Team`, the run flow must create/register that workspace and update the team run config before creating the local team context and member configs.
- REQ-017: A pending New-mode path must take precedence over any previously selected existing/temp workspace when Run is clicked.
- REQ-018: If auto-loading the pending New-mode path fails, no agent/team run may be created; the workspace selector/config area must show the failure and allow correction.
- REQ-019: The Run button must not be disabled solely because the pending New-mode path has not been preloaded, provided all other launch requirements are satisfied and the path is non-empty.
- REQ-020: The New-mode helper text must not show the previously selected workspace as the active workspace while the user has typed a different pending path that has not been loaded.
- REQ-021: New workspace mode must not render or expose a user-facing `Load` button/action. Pressing Enter in the path input must not invoke a removed explicit preload flow; if Enter is handled, it must follow the same launch semantics as the Run button or remain a no-op/prevent-default input behavior.

## Acceptance Criteria

- AC-001: Given a fresh app state where backend `workspaces()` returns only `temp_ws_default`, when the user clicks `Run` on an agent, chooses/keeps `Temp Workspace (Default)`, and clicks `Run Agent`, then the left sidebar shows a `Temp Workspace` row and the selected `New - <Agent>` draft row under it without reloading.
- AC-002: Given the state in AC-001, the selected draft run's workspace and agent group are expanded automatically so the run row is visible, not merely present under a collapsed row.
- AC-003: Given a fresh app state where backend `workspaces()` returns only `temp_ws_default`, when the user starts an agent team using the default temp workspace, then the sidebar shows `Temp Workspace` and the selected team draft row under it without reloading.
- AC-004: Given a selected existing registered filesystem workspace, when the user starts a single-agent run, then that registered workspace row remains/appears in the sidebar and the draft run row appears beneath it immediately.
- AC-005: Given a selected existing registered filesystem workspace, when the user starts an agent-team run, then that registered workspace row remains/appears in the sidebar and the team draft row appears beneath it immediately.
- AC-006: Given an unregistered or removed workspace root has persisted run/team history, when the sidebar tree is built, then that history does not create a top-level workspace row.
- AC-007: Given the same root is later added/registered again, when the workspace row is expanded and workspace-scoped history loads, then the old history for that root can appear beneath the registered workspace row.
- AC-008: Given a temp workspace row is displayed, then no visible/enabled `Remove from Workspaces` action is available for that row, and no remove-workspace backend mutation is attempted for it.
- AC-009: Given a registered filesystem workspace row is displayed, then the existing `Remove from Workspaces` action, confirmation, backend mutation, success pruning, and active-run block behavior remain intact.
- AC-010: Given a temp workspace row is expanded or refreshed, then `workspaceRunHistory` resolves `temp_ws_default` to the temp workspace root and returns the workspace-scoped history group instead of throwing `Registered workspace ... was not found`.
- AC-011: Given both `temp_ws_default` and a registered filesystem descriptor have the same normalized root path, then only one workspace row is rendered for that root, and the row remains non-removable because the fixed temp descriptor controls removability for that root.
- AC-012: Given a standalone agent draft run has been promoted from a `temp-...` ID to a permanent run ID, when history refresh has not yet completed, then the sidebar still shows the selected/local run row under its workspace.
- AC-013: Given history refresh later returns the same permanent run, then the sidebar deduplicates the local/live row with the history row and does not show duplicates.
- AC-014: Given backend `workspaces()` does not include a workspace descriptor for a draft/live context root, then the sidebar does not invent a top-level workspace row from that context alone; it may log/ignore the orphaned draft as invalid projection input.
- AC-015: Existing frontend and backend tests for workspace removal, workspace creation, draft run removal, and workspace-scoped history loading continue to pass after the change.
- AC-016: Given the workspace selector is on `New` and the user typed `/home/autobyteus/workspace`, when the user clicks `Run Agent` without any Load button/action, then the app calls the existing create/register workspace path, updates the agent run config to that workspace, creates the draft run under that workspace, and reveals it in the sidebar.
- AC-017: Given the workspace selector is on `New` and the user typed `/home/autobyteus/workspace`, when the user clicks `Run Team` without any Load button/action, then the app creates/registers that workspace, updates the team run config/member workspace metadata, creates the team draft run under that workspace, and reveals it in the sidebar.
- AC-018: Given the workspace selector is on `New` with a pending path and a previous Temp Workspace selection, when Run is clicked, then the pending path is used instead of Temp Workspace.
- AC-019: Given the workspace selector is on `New` with an invalid or uncreatable path, when Run is clicked, then no run/team is created and the workspace error is displayed.
- AC-020: Given the workspace selector is on `New` with a non-empty pending path and all non-workspace launch requirements are satisfied, then the Run button is enabled even before any explicit preload step; while auto-loading is in progress, duplicate Run clicks are prevented.
- AC-021: Given the workspace selector is on `New` and the user types a path different from the previously selected workspace, then the helper text no longer says that the old workspace is the active workspace; it indicates a pending path or otherwise clears the old success state until the path is loaded.
- AC-022: Given the workspace selector is on `New`, then no `Load` button or explicit preload action is rendered. If a folder browse affordance is available, it only fills or changes the pending path; it does not create/register the workspace until Run is clicked.

## Constraints / Dependencies

- Must preserve the workspace-removal boundary: the workspace list is the authoritative top-level row source; run/team history is subordinate.
- Must not use hidden suppression lists or dual workspace visibility authorities.
- Must account for `workspaceRootPath` and `absolutePath` normalization already present in the stores/projection.
- Must keep GraphQL resolvers as transport facades; backend workspace ownership remains under `WorkspaceManager` / workspace services.
- Must avoid old behavior restoration where history roots directly create top-level workspace rows.
- Must not make temp workspace removable unless backend/product semantics are explicitly changed.
- Auto-load-on-run should reuse the existing workspace creation/loading path instead of duplicating workspace registration policy in the run context stores.
- New-mode pending path state must not become a second durable workspace source; it is launch input only until `workspaceStore.createWorkspace` succeeds.

## Assumptions

- `Temp Workspace` is intentionally visible/selectable as the default run workspace on first install.
- A temp workspace that is returned by backend `workspaces()` is valid for the left `Workspaces` sidebar, but non-removable.
- Skill workspaces are unrelated to this bug and should not be added to the desktop run-history sidebar by this fix.
- The center-pane run creation flow should remain unchanged except for any needed projection/reveal updates.
- Removing the New-mode `Load` button/action is approved by the user. If a folder browse affordance remains available on supported platforms, it is only a path chooser; Run remains the single action that registers/loads a new workspace path and creates the run.

## Risks / Open Questions

- Backend run provisioning currently calls `ensureWorkspaceByRootPath` for agent and team launch paths, which can register the temp root as a filesystem workspace. The frontend must handle descriptor dedupe if both temp and filesystem descriptors appear for the same root. A deeper backend semantic cleanup can be considered if implementation evidence shows duplicate registration causes user-visible issues beyond sidebar projection.
- If the product later decides temp workspace should never appear in the sidebar until a run exists, the descriptor rule may need an additional `hasLocalRunOrHistory` visibility condition. Current user expectation and screenshots point to showing it when the run starts.
- If skill workspaces can become run workspaces, they need their own requirement/design pass rather than being included opportunistically.

## Requirement-To-Use-Case Coverage

| Use Case | Covered Requirements |
| --- | --- |
| UC-001 | REQ-001, REQ-002, REQ-004, REQ-006, REQ-007, REQ-008, REQ-010, REQ-013 |
| UC-002 | REQ-001, REQ-002, REQ-005, REQ-006, REQ-008, REQ-010, REQ-013 |
| UC-003 | REQ-001, REQ-003, REQ-004, REQ-006, REQ-009, REQ-012 |
| UC-004 | REQ-001, REQ-003, REQ-005, REQ-006, REQ-009, REQ-012 |
| UC-005 | REQ-001, REQ-003, REQ-009 |
| UC-006 | REQ-011 |
| UC-007 | REQ-008, REQ-009, REQ-010 |
| UC-008 | REQ-014, REQ-015, REQ-017, REQ-018, REQ-019, REQ-020, REQ-021 |
| UC-009 | REQ-014, REQ-016, REQ-017, REQ-018, REQ-019, REQ-020, REQ-021 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Reproduces and fixes the screenshot bug for standalone temp/default run start. |
| AC-002 | Confirms the run row is actually visible, not only present under collapsed ancestors. |
| AC-003 | Covers the equivalent team launch path. |
| AC-004 | Protects selected registered workspace behavior for standalone agents. |
| AC-005 | Protects selected registered workspace behavior for teams. |
| AC-006 | Preserves the workspace-removal regression guard. |
| AC-007 | Preserves re-add/restored-history behavior from workspace removal. |
| AC-008 | Prevents temp rows from exposing a broken remove action. |
| AC-009 | Prevents regression of filesystem workspace removal. |
| AC-010 | Ensures expanded temp rows can load history through the workspace-scoped backend boundary. |
| AC-011 | Prevents duplicate rows and wrong removability when temp root is also registered. |
| AC-012 | Guards the standalone agent ID-promotion timing gap. |
| AC-013 | Guards history/live row deduplication after reconciliation. |
| AC-014 | Prevents reintroducing context/history-created top-level rows without descriptors. |
| AC-015 | Requires existing workspace-removal and history behavior to remain covered. |
| AC-016 | Verifies auto-load-on-run for standalone agent. |
| AC-017 | Verifies auto-load-on-run for team. |
| AC-018 | Ensures pending New-mode path overrides stale temp/existing selection. |
| AC-019 | Ensures workspace load failure blocks run creation safely. |
| AC-020 | Ensures the Run button can trigger auto-load and prevents duplicate launches. |
| AC-021 | Removes misleading helper text shown in the screenshot. |
| AC-022 | Verifies the explicit Load action is removed and Browse, if present, is only path selection. |

## Approval Status

Approved by user on 2026-06-27 via request to kick off the fix after reviewing the temp-workspace root-cause analysis. Expanded on 2026-06-27 by user request to make Run Agent/Run Team auto-load a typed New workspace path so the separate Load click is not required. Refined on 2026-06-28 by user decision to remove the New-mode `Load` button/action entirely.
