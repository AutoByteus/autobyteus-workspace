# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete; dedicated task worktree/branch created.
- Current Status: Requirements approved; refactor-aware design spec produced and ready for architecture review.
- Investigation Goal: Determine current workspace UI/storage/API ownership and recommend where and how to add a safe remove action.
- Scope Classification (`Small`/`Medium`/`Large`): Medium.
- Scope Classification Rationale: The visible button is a small UI change, but correct behavior spans sidebar row rendering, workspace/run-history projection, frontend stores, GraphQL schema/actions, backend workspace persistence, and state cleanup.
- Scope Summary: Add a row-specific `Remove from Workspaces` action that removes a registered workspace from the sidebar registry without deleting the user's files.
- Primary Questions Resolved:
  - Where is the Workspaces sidebar rendered? `WorkspaceAgentRunsTreePanel.vue` delegates workspace row rendering to `WorkspaceHistoryWorkspaceSection.vue`.
  - How are workspace rows built? `runHistoryStore.getTreeNodes()` merges run-history workspace groups with active workspace descriptors from `workspaceStore.allWorkspaces`.
  - Is removal an existing backend capability? No GraphQL/backend workspace remove/delete mutation exists.
  - Where should the button live? On the specific workspace row, at the far right as a hover/focus contextual row action; not in the `Workspaces` header next to the global add button.

## Request Context

User reported that a customer cannot remove workspaces under the `Workspaces` place; they feel some workspaces are no longer needed but always remain visible. User asks to analyze and identify where a remove button should be added if removal is designed.

Reference screenshot: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_f0e821df2c4349aebcc595f2727da90d/solution_designer_b9ca960658f848028e52a69509b49dd5/context_files/ctx_ac7330467733__image.png`. It shows the left sidebar `Workspaces` header with a `+` add button and per-workspace rows with chevron/folder/name, but no visible remove action.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-removal-design`.
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-removal-design/tickets/done/workspace-removal-design`.
- Current Branch: `codex/workspace-removal-design`.
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-removal-design`.
- Bootstrap Base Branch: `origin/personal` (remote default HEAD branch is `personal`).
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-06-27.
- Task Branch: `codex/workspace-removal-design`, created from `origin/personal`.
- Expected Base Branch (if known): `origin/personal`.
- Expected Finalization Target (if known): `personal`.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Main checkout `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` had unrelated untracked `.article-work/` and `docs/articles/`; task work proceeds in dedicated clean worktree.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-27 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v && git branch --show-current` in `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` | Bootstrap environment discovery | Repository root is `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`; current branch was `personal` tracking `origin/personal`; unrelated untracked paths existed. | No |
| 2026-06-27 | Command | `git remote show origin` | Resolve base branch | Remote HEAD branch is `personal`. | No |
| 2026-06-27 | Command | `git fetch origin --prune` | Refresh tracked remote refs before task worktree creation | Completed with no errors. | No |
| 2026-06-27 | Command | `git worktree add -b codex/workspace-removal-design /Users/normy/autobyteus_org/autobyteus-worktrees/workspace-removal-design origin/personal` | Create dedicated task worktree/branch | Worktree and branch created; branch tracks `origin/personal`; HEAD `ad4c1d69`. | No |
| 2026-06-27 | Data | Screenshot `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_f0e821df2c4349aebcc595f2727da90d/solution_designer_b9ca960658f848028e52a69509b49dd5/context_files/ctx_ac7330467733__image.png` | Understand reported UI surface | Sidebar contains `Workspaces` section with global `+` add button; rows show chevron, folder icon, name; no row-level visible remove affordance. | No |
| 2026-06-27 | Code | `autobyteus-web/components/AppLeftPanel.vue` | Locate sidebar composition | Left panel embeds `WorkspaceAgentRunsTreePanel` in the bottom section under the main navigation. | No |
| 2026-06-27 | Code | `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | Inspect Workspaces container | Header owns global add button and inline create form. It fetches `workspaceStore.fetchAllWorkspaces()` and `runHistoryStore.fetchTree()`, wires tree state, creation, selection, run/team archive/delete/terminate actions, and renders `WorkspaceHistoryWorkspaceSection` for each workspace node. | Yes: add workspace removal wiring here, but keep row rendering delegated. |
| 2026-06-27 | Code | `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Inspect workspace row rendering | The root workspace row is currently a single full-width button toggling expansion. Child run/team rows already use row-level right-side actions with `@click.stop` and hover/focus opacity patterns. | Yes: add the remove affordance on the workspace row itself, using a split row so row toggle and row action do not conflict. |
| 2026-06-27 | Code | `autobyteus-web/components/workspace/history/workspaceHistorySectionContracts.ts` | Inspect section props/actions boundary | The section receives state/action contracts from the parent. No workspace-removal action/state exists yet. | Yes: extend contracts with workspace removal state/action. |
| 2026-06-27 | Code | `autobyteus-web/composables/useWorkspaceHistoryWorkspaceCreation.ts` | Inspect current workspace creation flow | Creation is already separated into a dedicated composable, calls `runHistoryStore.createWorkspace(rootPath)` and refreshes workspace metadata. | Yes: mirror this separation with a dedicated removal composable instead of bloating run/team mutation logic. |
| 2026-06-27 | Code | `autobyteus-web/composables/useWorkspaceHistoryMutations.ts` | Inspect current destructive action patterns | Handles run/team terminate, archive, draft remove, and permanent delete with confirmation. Workspace removal is a different subject and should not be mixed into this already-large composable unless intentionally refactored. | Yes |
| 2026-06-27 | Code | `autobyteus-web/stores/runHistoryStore.ts` | Inspect workspace tree and creation owner | `createWorkspace(rootPath)` delegates to `workspaceStore.createWorkspace`, and `getTreeNodes()` builds rows from `workspaceGroups` plus `workspaceStore.allWorkspaces`. No remove/hide workspace action exists. | Yes: add run-history-level workspace removal action so both row projection and selected context cleanup stay coherent. |
| 2026-06-27 | Code | `autobyteus-web/stores/runHistoryReadModel.ts` and `autobyteus-web/utils/runTreeProjection.ts` | Inspect why rows remain visible | Workspace rows are descriptors from non-archived history groups and active workspaces. A workspace can stay visible because it has history even if no explicit active workspace descriptor remains. | Yes: backend removal must hide/filter run-history groups, not only delete frontend active workspace state. |
| 2026-06-27 | Code | `autobyteus-web/stores/workspace.ts` | Inspect workspace metadata store | Store supports `createWorkspace`, `fetchAllWorkspaces`, and local `removeWorkspaceEntriesByRootPath` used for duplicate replacement. No durable workspace removal mutation/action exists. Local removal already clears file-explorer sessions/state for matching roots. | Yes: add durable `removeWorkspace` action and strengthen metadata cleanup. |
| 2026-06-27 | Code | `autobyteus-web/graphql/mutations/workspace_mutations.ts` and `autobyteus-web/graphql/queries/workspace_queries.ts` | Inspect workspace GraphQL surface | Only `CreateWorkspace`, `GetAllWorkspaces`, and `GetWorkspaceMetadata` exist. No remove/delete mutation. | Yes |
| 2026-06-27 | Code | `autobyteus-server-ts/src/api/graphql/types/workspace.ts` | Inspect backend workspace GraphQL resolver | Resolver exposes `workspaces`, `workspaceMetadata`, and `createWorkspace` only. `workspaces()` ensures temp workspace and returns active workspace manager entries. | Yes: add `removeWorkspace` mutation here. |
| 2026-06-27 | Code | `autobyteus-server-ts/src/workspaces/workspace-manager.ts` | Inspect backend workspace manager | Manager owns active `FileSystemWorkspace` instances and deterministic ID mapping persistence. It can create/get/list but cannot remove, close, or forget a workspace by root. | Yes: add remove/forget capability under this owner. |
| 2026-06-27 | Code | `autobyteus-server-ts/src/workspaces/workspace-id-mapping-store.ts` | Inspect persistent workspace mapping | Persists `workspaceId -> rootPath` in app-data `workspaces.json`; no removal method and no visibility/hide model. | Yes: add mapping removal and a separate visibility store. |
| 2026-06-27 | Code | `autobyteus-server-ts/src/run-history/services/workspace-run-history-service.ts` | Inspect history grouping owner | `listWorkspaceRunHistory()` merges agent and team history groups by workspace root and sorts them. It has no workspace-hidden filter. | Yes: filter hidden workspace roots here so removed workspaces stop appearing in desktop sidebar/mobile recent. |
| 2026-06-27 | Code | `autobyteus-web/composables/mobile/useMobileWorkCatalog.ts` | Check broader workspace listing impact | Mobile workspaces segment uses `workspaceStore.allWorkspaces`; mobile recent uses `runHistoryStore.workspaceGroups`. Backend filtering and workspace store removal will affect both consistently. | No |
| 2026-06-27 | Test | `autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts` and `autobyteus-server-ts/tests/unit/workspaces/workspace-manager.test.ts` | Inspect existing coverage patterns | Tests cover create/list/metadata/temp behavior and manager deterministic recreation. No remove coverage exists. | Yes: add backend remove tests. |
| 2026-06-27 | Test | `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` and `.regressions.spec.ts` | Inspect frontend coverage patterns | Existing tests cover workspace row collapsed default, expansion, run/team actions, create run, archive/delete behavior. No workspace removal tests exist. | Yes: add row action/confirmation tests. |
| 2026-06-27 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/skills/solution-designer/references/design-examples.md` | User asked to follow design examples before kicking off the ticket | Used CRUD/request and runtime/facade examples to shape registry-owned spines, explicit interface boundaries, and removal/decommission plan. | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Left sidebar `Workspaces` section, rendered by `WorkspaceAgentRunsTreePanel.vue` inside `AppLeftPanel.vue`.
- Current execution flow:
  1. `WorkspaceAgentRunsTreePanel` mounts and calls `workspaceStore.fetchAllWorkspaces()` plus `runHistoryStore.fetchTree()`.
  2. `runHistoryStore.fetchTree()` calls GraphQL `listWorkspaceRunHistory` and stores backend `workspaceGroups`.
  3. `runHistoryStore.getTreeNodes()` calls `buildRunHistoryTreeNodes(...)` with `workspaceGroups` and `workspaceStore.allWorkspaces`.
  4. `buildRunHistoryTreeNodes(...)` creates workspace descriptors from both persisted run history and active loaded workspaces, then `buildRunTreeProjection(...)` renders workspace rows even when a workspace has no expanded children.
  5. `WorkspaceHistoryWorkspaceSection` renders each workspace root row as a single toggle button.
- Ownership or boundary observations:
  - Frontend container owner: `WorkspaceAgentRunsTreePanel.vue` wires data sources, actions, confirmation modals, and refresh cadence.
  - Frontend row renderer: `WorkspaceHistoryWorkspaceSection.vue` owns visual row layout but receives action/state contracts from the parent.
  - Frontend workspace metadata owner: `stores/workspace.ts` owns active workspace metadata and file-explorer session cleanup.
  - Frontend history projection owner: `stores/runHistoryStore.ts` + read model/projection utilities own the sidebar tree rows.
  - Backend workspace owner: `WorkspaceManager` owns active filesystem workspace lifecycle and ID mappings.
  - Backend history grouping owner: `WorkspaceRunHistoryService` owns workspace grouping of run/team history.
- Current behavior summary: Users can add/load a workspace via the header `+`, archive/delete individual runs/team histories, and remove drafts. There is no per-workspace remove/hide action, no workspace removal GraphQL mutation, and no backend hidden-workspace visibility policy.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / behavior gap.
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing invariant plus boundary/ownership issue.
- Refactor posture evidence summary: Limited refactor needed now. Correct removal cannot be implemented as a UI-only row deletion because workspace rows come from two owners: active workspace metadata and run-history grouping. A durable backend visibility/removal boundary is needed.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Screenshot | Add action exists at section header; removal absent. | Product affordance gap. | Add row-specific action. |
| `WorkspaceHistoryWorkspaceSection.vue` | Workspace row is one full-width toggle button; no action area. | Need split row layout so remove click does not toggle expansion. | Modify row markup. |
| `runHistoryReadModel.ts` / `runTreeProjection.ts` | Workspace descriptors are built from persisted history and active workspace descriptors. | Removing only from `workspaceStore.workspaces` will not remove history-backed rows. | Add backend visibility filter. |
| `workspace.ts` store | Has local duplicate cleanup by root path but no durable removal mutation. | Existing cleanup logic can be reused after backend success, but not treated as authoritative removal. | Extend store. |
| `WorkspaceManager` / `WorkspaceIdMappingStore` | No removal method; mappings persist workspace IDs to root paths. | Backend owner cannot currently forget a workspace. | Add explicit remove/forget method. |
| `WorkspaceRunHistoryService` | Groups all non-archived run/team histories by workspace root. | Hidden workspace roots need to be filtered here to keep rows gone after refresh/reload. | Add visibility store dependency. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/AppLeftPanel.vue` | Shell left-panel composition | Hosts `WorkspaceAgentRunsTreePanel` under the primary nav. | No direct change needed. |
| `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | Workspaces tree container, data refresh, action wiring, modals | Owns header add button and existing run/team delete confirmation. | Add workspace removal composable wiring and confirmation modal here. |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Workspace/agent/team row rendering | Workspace row has no right-side action area. | Add per-row far-right remove action here via parent contract. |
| `autobyteus-web/components/workspace/history/workspaceHistorySectionContracts.ts` | State/action contract between container and section renderer | No workspace removal state/action. | Extend with `isWorkspaceRemoving` and `onRemoveWorkspace`. |
| `autobyteus-web/composables/useWorkspaceHistoryWorkspaceCreation.ts` | Dedicated workspace add/load flow | Clean separation exists for workspace create. | Add sibling `useWorkspaceHistoryWorkspaceRemoval.ts`. |
| `autobyteus-web/stores/runHistoryStore.ts` | History tree state/actions | Builds the tree and currently creates workspaces. | Add `removeWorkspace(rootPath)` action that coordinates workspace store removal, tree cleanup, selection cleanup, and refresh. |
| `autobyteus-web/stores/workspace.ts` | Active workspace metadata and file-explorer live sessions | Has local root-path removal helper but no durable mutation. | Add GraphQL-backed `removeWorkspace` action and metadata cleanup. |
| `autobyteus-web/graphql/mutations/workspace_mutations.ts` | Frontend workspace mutations | Only create exists. | Add remove mutation. |
| `autobyteus-server-ts/src/api/graphql/types/workspace.ts` | Workspace GraphQL resolver | Only list/metadata/create. | Add `removeWorkspace(input: RemoveWorkspaceInput)` mutation. |
| `autobyteus-server-ts/src/workspaces/workspace-manager.ts` | Backend active workspace lifecycle and ID mapping | No remove/close/forget operation. | Add root-path removal/unregister method. |
| `autobyteus-server-ts/src/workspaces/workspace-id-mapping-store.ts` | Durable workspace ID -> root mapping | No remove method. | Add mapping removal by workspace ID/root as needed. |
| `autobyteus-server-ts/src/run-history/services/workspace-run-history-service.ts` | Backend workspace grouping for run/team history | No hidden-workspace filtering. | Reuse/extend workspace visibility capability to exclude removed roots. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-27 | Static trace | Code path traced from `AppLeftPanel.vue` to `WorkspaceAgentRunsTreePanel.vue`, `runHistoryStore.getTreeNodes()`, `buildRunHistoryTreeNodes(...)`, backend `WorkspaceRunHistoryService` | Sidebar row visibility is derived from active workspace metadata plus run history. | Need backend-backed removal/hide semantics, not just a UI button. |

## External / Public Source Findings

No external sources consulted.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Not needed for current design placement analysis; downstream implementation should run frontend unit tests and backend GraphQL/unit coverage.
- Required config, feature flags, env vars, or accounts: None identified.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation only.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

- The `Workspaces` header `+` is a global create/load affordance. A remove button placed beside it would be ambiguous because it would not identify which workspace is being removed.
- The workspace row is the correct identity boundary: every removable workspace has a root row containing the exact workspace name/root represented by `workspaceNode.workspaceRootPath`.
- Existing child rows already use right-side row actions with hidden-on-hover/focus styling. The workspace row should follow this visual language while being more careful with confirmation because workspace removal affects an entire group.
- The product should label the action `Remove from Workspaces`, not `Delete workspace`, because the safest requirement is to hide/forget the workspace entry without deleting filesystem contents.
- Existing backend run/team archive/delete actions remove individual rows from history. A workspace-level removal should not permanently delete all run/team history by default; it should hide the workspace from the Workspaces list and allow re-adding the same root path to show it again.





### Workspace List / History Interaction Model Clarification (2026-06-27)

User agreed that the more logical model is: a workspace row represents an explicitly registered workspace from persisted JSON/registry; clicking/expanding the chevron for that workspace is the moment the user asks to open/show workspace history. Therefore history should be subordinate to registered workspace rows and should not be an independent source of top-level workspace rows. This implies a design change from the current projection model, which combines `workspaceStore.allWorkspaces` and `runHistoryStore.workspaceGroups` into top-level workspace nodes.

### User Architecture Proposal Update (2026-06-27)

User proposed a cleaner model: keep a persisted workspace JSON/registry as the list of workspaces the user wants loaded when opening the application. Removing a workspace should remove that registry entry. Work history should not independently recreate top-level workspace rows; instead, history should be fetched for a registered/selected workspace. This is architecturally stronger than a separate `hiddenWorkspaceRoots` suppression list because it gives one authoritative owner for visible workspace identity. Current code does not fully work this way: `WorkspaceIdMappingStore` persists ID-to-root mappings but `workspaces()` lists active in-memory workspaces, and the sidebar also derives rows from run/team history. Target design should make the workspace registry/list endpoint authoritative for top-level workspace rows and move history under registered/selected workspace expansion.

### User Clarification Update (2026-06-27)

User confirmed the desired behavior: workspace removal should remove the workspace from the frontend-visible Workspaces list and keep it removed across application restart. It should not delete agent run memories/history, underlying files, or artifacts. This narrows the persistence semantics to registered-workspace visibility/unregistration. The cleaner target is to make the workspace registry authoritative for top-level rows so history-backed rows are not independently created for unregistered roots.

### Persistence Semantics Clarification (2026-06-27)

The recommended meaning of `Remove from Workspaces` is not filesystem deletion. A workspace in this product is best understood as a registered/root-path-backed application entry plus in-memory workspace/file-explorer lifecycle, while run/team history stores the root path as historical metadata. Therefore removal should delete/forget the registered workspace entry and close active workspace/file-explorer state. Top-level workspace listing should come from the persisted registry; history should be queried under registered workspaces instead of creating independent top-level rows. Historical run/team records and the user's files should remain intact. Re-adding the same root should unhide it.


### Target Direction Supersession Note (2026-06-27)

Earlier investigation rows mention hidden-root filtering as a possible way to stop history-backed rows from reappearing. That is now superseded by the user's approved target model: the persisted workspace registry is the authoritative source of top-level `Workspaces` rows, and run/team history is fetched/shown underneath a registered workspace only when that workspace is expanded/selected. Do not implement a separate hidden-root list unless architecture review explicitly rejects the registry-authoritative refactor.

## Constraints / Dependencies / Compatibility Facts

- Do not delete user files/directories under the workspace root.
- Do not implement a header-level remove button because it lacks row identity.
- Backend registry must be authoritative for durable removal state; frontend-only filtering would be undone on refresh/reload.
- Active runs/team runs in a workspace should block workspace removal or require explicit stop first; silently hiding active work would make running state hard to recover.
- The `unassigned-team-workspace` synthetic group is not a filesystem workspace and should not expose a normal remove-workspace action.
- Re-adding/loading the same root path should recreate the workspace registry entry.

## Open Unknowns / Risks

- Need verify exact behavior for temp workspace rows if they appear in the sidebar; recommendation is to block removing the default temp workspace.

## Notes For Architect Reviewer

If the user approves implementation, the design should treat workspace removal as a backend-owned workspace visibility/removal command with frontend row affordance. The primary design risk is trying to solve this only in `WorkspaceHistoryWorkspaceSection.vue`; that would remove a row visually until the next history refresh but would not address the backend sources that make the row reappear.
