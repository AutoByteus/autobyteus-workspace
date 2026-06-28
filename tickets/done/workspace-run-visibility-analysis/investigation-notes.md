# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Root-cause investigation complete; requirements refined to design-ready and updated for the user's Load-button removal decision.
- Investigation Goal: Determine why the left Workspaces panel remains empty when a first-install user starts an agent or agent team run with the default temporary workspace or a selected workspace, identify the workspace-removal regression, define the safe fix boundary, incorporate the requirement that Run Agent/Run Team auto-load a typed New workspace path, and reflect the user's final decision that New workspace mode should not expose a separate Load button/action.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The defect crosses the desktop left-sidebar projection, run configuration default workspace selection, local draft/live context projection, backend workspace-list contracts, workspace-removal semantics, and tests.
- Scope Summary: Restore the invariant that the workspace associated with a newly created agent/team run appears in the left Workspaces panel immediately and the selected run row appears beneath it, while preserving the workspace-removal invariant that old history cannot recreate removed/unregistered workspace rows. Also make Run Agent/Run Team the final workspace readiness boundary so a typed or browsed New workspace path is loaded automatically before run creation, with no separate user-facing Load action.
- Primary Questions To Resolve:
  1. What data source currently drives the left Workspaces panel?
  2. What data source currently drives run rows under each workspace?
  3. During single-agent and team run creation, where is the workspace selected/defaulted and persisted?
  4. Are default temporary workspaces returned by backend workspace list results?
  5. What changed in the recent workspace-removal refactor?
  6. How can the bug be fixed without undoing workspace-removal behavior?
  7. How does the New workspace path flow currently reach the run config owner, and why does Run ignore an un-loaded typed path?

## Request Context

User reports a bug visible in screenshots: on a fresh install/empty state, the left sidebar `Workspaces` section shows `No run history yet.` The user opens the agent run configuration, keeps the default `Temp Workspace (Default)`, clicks `Run Agent`, and the center pane opens `New - Codex`, but the left sidebar still shows `No run history yet.` User states this likely came from the recent workspace refactor for `Remove from Workspaces` and asks to inspect Git history and analyze how to solve it.

User later added a related request: when the workspace selector is on `New` and the user types a path, clicking `Run Agent` or `Run Team` should load/register that path automatically and start the run. Users should not have to remember to click the separate `Load` button first.

User then refined the UX decision on 2026-06-28: remove the New-mode `Load` button/action entirely because it is unintuitive and they do not use it. Run Agent / Run Team should be the only action that registers/loads the typed or browsed new workspace path and starts the agent/team run.

Reference screenshots supplied by user:

- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_fdbb0b866ad04021a30faa521b56d7c9/solution_designer_ee75cb0734cf4482be758e5fdb1190d6/context_files/ctx_6ccb2a8336c0__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_fdbb0b866ad04021a30faa521b56d7c9/solution_designer_ee75cb0734cf4482be758e5fdb1190d6/context_files/ctx_0a3a6ce1076a__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_fdbb0b866ad04021a30faa521b56d7c9/solution_designer_ee75cb0734cf4482be758e5fdb1190d6/context_files/ctx_bd4249932f2c__image.png`

Visual observation from screenshots:

1. Initial Agents page: sidebar `Workspaces` header exists, but body says `No run history yet.`
2. Run config: `Workspace Directory` uses `Existing`, selected option is `📁 Temp Workspace (Default)`, and helper text says `Workspace: Temp Workspace`.
3. After `Run Agent`: center pane selected run is `New - Codex` / `Offline`, but sidebar still says `No run history yet.`
4. New workspace path screenshot: selector is on `New`, input contains `/home/autobyteus/workspace`, `Load` button is visible, and helper still says `Workspace: Temp Workspace`, demonstrating that the typed path is pending UI state rather than active run config state. The updated target removes that `Load` affordance and treats the typed path as pending Run input.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-run-visibility-analysis`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-run-visibility-analysis/tickets/in-progress/workspace-run-visibility-analysis`
- Current Branch: `codex/workspace-run-visibility-analysis`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-run-visibility-analysis`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-06-27.
- Task Branch: `codex/workspace-run-visibility-analysis` created from `origin/personal` at `81dd58ce72113bae72c513a99d54f558a2f09062`, then fast-forwarded to current `origin/personal` at `aef6e851` on 2026-06-27 before architecture handoff.
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: The user's original checkout `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` has unrelated untracked file `tickets/done/transient-task-ui-redesign/release-v1.3.82.log`; authoritative investigation artifacts are isolated in the dedicated worktree above.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-27 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v && git branch --show-current && git symbolic-ref refs/remotes/origin/HEAD || true && ls -la` | Bootstrap repository and branch discovery | Current checkout was `personal` tracking `origin/personal`; repo root `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`; one unrelated untracked ticket log existed. | No |
| 2026-06-27 | Command | `git worktree list --porcelain` | Check whether a matching dedicated worktree already existed | No existing `codex/workspace-run-visibility-analysis` worktree found. | No |
| 2026-06-27 | Command | `git fetch origin --prune` | Refresh tracked remote refs before creating task branch | Fetch succeeded. | No |
| 2026-06-27 | Command | `git worktree add -b codex/workspace-run-visibility-analysis /Users/normy/autobyteus_org/autobyteus-worktrees/workspace-run-visibility-analysis origin/personal` | Create isolated task worktree/branch | Worktree created from `origin/personal`. | No |
| 2026-06-27 | Command | `git status --short --branch && git rev-parse --show-toplevel && git branch --show-current && git rev-parse HEAD && git rev-parse origin/personal` | Verify task worktree | Branch is `codex/workspace-run-visibility-analysis`, root is dedicated worktree, HEAD equals `origin/personal` at `81dd58ce72113bae72c513a99d54f558a2f09062`. | No |
| 2026-06-27 | Image | User-supplied screenshot paths listed in Request Context | Confirm visible bug sequence | Shows empty `Workspaces`, config defaulting to `Temp Workspace`, then selected `New - Codex` while sidebar remains empty. | No |
| 2026-06-27 | Command | `git log --all --oneline --decorate --date=short --pretty=format:'%h %ad %d %s' --grep='workspace\|remove' -i --max-count=80` | Identify recent workspace/removal commits | Found workspace-removal sequence on 2026-06-27: `19828ad2` candidate, `b6301465` finalization, merge `6b74ce53`, release `v1.3.81`. | No |
| 2026-06-27 | Command | `git log --oneline --decorate --date=short -- ... relevant workspace/run-history files ... tickets/done/workspace-removal-design` | Identify commits that changed relevant files | `19828ad2` is the main implementation commit for workspace removal and changed the read model, projection, panel, workspace store, backend workspace manager, and tests. | No |
| 2026-06-27 | Command | `git show --stat 19828ad2`, `git show --stat b6301465`, `git show --name-status 6b74ce53` | Understand workspace-removal delivery shape | `19828ad2` changed 49 files including `runHistoryReadModel.ts`, `runTreeProjection.ts`, workspace panel/section, backend workspace manager, and workspace-removal artifacts. | No |
| 2026-06-27 | Command | `git diff --unified=80 19828ad2^ 19828ad2 -- autobyteus-web/stores/runHistoryReadModel.ts autobyteus-web/utils/runTreeProjection.ts ...` | Locate exact behavioral regression | Before refactor, history groups could create workspace descriptors. After refactor, descriptors come only from `allWorkspaces`, and the read model skips `kind !== 'filesystem'` and `isTemp`. Projection now skips persisted/draft roots without descriptors. | No |
| 2026-06-27 | Doc | `tickets/done/workspace-removal-design/requirements.md` | Recover intended product/architecture model | Requirements say top-level rows should come from persisted registry; history must not recreate removed roots; temp behavior needed validation and was recommended non-removable. | No |
| 2026-06-27 | Doc | `tickets/done/workspace-removal-design/design-spec.md` | Recover design intent and constraints | Design explicitly rejects history-created rows, hidden suppression lists, and global eager history. It notes if default temp workspace appears, sidebar must filter it out or mark it non-removable. | No |
| 2026-06-27 | Doc | `tickets/done/workspace-removal-design/handoff-summary.md` | Recover delivered behavior | Handoff states `workspaces()` is canonical visible workspace-list source for registered filesystem workspaces plus transient active temp/skill workspaces; top-level desktop rows project from `workspaceStore.allWorkspaces`; `removeWorkspace` only removes registered filesystem workspaces. | No |
| 2026-06-27 | Code | `autobyteus-web/components/AppLeftPanel.vue` | Locate desktop sidebar entrypoint | Left panel renders `WorkspaceAgentRunsTreePanel` under `Workspaces`. | No |
| 2026-06-27 | Code | `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | Determine sidebar loading behavior | On mount, fetches `workspaceStore.fetchAllWorkspaces()`, agent definitions, and team definitions; refresh loop only refreshes expanded workspace histories. It does not eagerly fetch global run history. | No |
| 2026-06-27 | Code | `autobyteus-web/composables/useWorkspaceHistoryTreeState.ts` | Determine reveal behavior | It watches the selected run/team and tree dependency signature; if matching rows exist, it expands workspace/agent/team ancestry. Missing descriptors prevent reveal because no row exists. | No |
| 2026-06-27 | Code | `autobyteus-web/stores/runHistoryStore.ts`, `autobyteus-web/stores/runHistoryReadModel.ts`, `autobyteus-web/utils/runTreeProjection.ts` | Trace workspace/run row projection | `getTreeNodes()` builds descriptors from `workspaceStore.allWorkspaces`. Current filter excludes temp. Projection attaches persisted/draft rows only to existing descriptors. | No |
| 2026-06-27 | Code | `autobyteus-web/stores/workspace.ts` | Inspect workspace store contract | `fetchAllWorkspaces()` stores all GraphQL `workspaces()` responses; getters expose `tempWorkspaceId` and `tempWorkspace`; run config relies on those getters. | No |
| 2026-06-27 | Code | `autobyteus-web/components/workspace/config/WorkspaceSelector.vue`, `RunConfigPanel.vue` | Trace run config default workspace | Selector fetches all workspaces and auto-selects `tempWorkspaceId` when no workspace is selected. `RunConfigPanel` copies selected `workspaceId` and `workspaceMetadata` into agent/team config before creating local draft context. | No |
| 2026-06-27 | Code | `autobyteus-web/stores/agentContextsStore.ts`, `autobyteus-web/stores/agentTeamContextsStore.ts` | Trace draft run creation | Single-agent draft IDs are `temp-...`; team draft IDs are `temp-team-...`. Both copy workspace config/metadata from run configuration and select the draft. | No |
| 2026-06-27 | Code | `autobyteus-web/stores/agentRunStore.ts` | Trace standalone prepare/promotion | First message prepares backend run, promotes `temp-...` to permanent run ID, locks config, sends stream message, then calls `runHistoryStore.refreshTreeQuietly()`. | No |
| 2026-06-27 | Code | `autobyteus-server-ts/src/api/graphql/types/workspace.ts`, `autobyteus-server-ts/src/workspaces/workspace-manager.ts`, `autobyteus-server-ts/src/workspaces/temp-workspace.ts` | Verify backend temp workspace exposure | `workspaces()` calls `getOrCreateTempWorkspace()` then `listVisibleWorkspaces()`. `TempWorkspace` has fixed ID `temp_ws_default`, name `Temp Workspace`, `kind: temp`, and `isTemp: true`. | No |
| 2026-06-27 | Code | `autobyteus-server-ts/src/agent-execution/services/agent-run-provisioning-service.ts`, `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts` | Check backend launch workspace handling | Agent/team backend launch paths currently ensure/register by root path, which can create a registered filesystem descriptor for the temp root after launch. Frontend should dedupe same-root descriptors and prefer filesystem when both exist. | Yes, for design sequencing. |
| 2026-06-27 | Test | `autobyteus-web/utils/__tests__/runTreeProjection.spec.ts` | Check current regression tests | Test explicitly asserts descriptors are the only top-level row source and removed roots/drafts without descriptors are skipped. This guard must remain, but needs temp descriptor cases. | Yes |
| 2026-06-27 | Test | `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` | Check panel coverage | Test asserts `loads workspace list without eager history tree on mount`; removal tests assume rows are removable. Need add non-removable temp row case. | Yes |
| 2026-06-27 | Test | `autobyteus-web/stores/__tests__/runHistoryStore.spec.ts` | Check read-model coverage | Existing tests project persisted history and temp drafts only for normal filesystem workspace descriptors; no test covers `temp_ws_default`. | Yes |

| 2026-06-27 | Code | `autobyteus-web/stores/runHistoryWorkspaceHistoryActions.ts` | Check workspace-scoped history fetch behavior for temp rows | Frontend expansion calls `GetWorkspaceRunHistory` with the row `workspaceId` and caches by workspace ID; non-quiet failures set row error. | Yes, backend must support temp IDs or UI must avoid broken temp expansion. |
| 2026-06-27 | Code | `autobyteus-server-ts/src/api/graphql/types/run-history.ts` | Check backend workspace-scoped history resolver | `workspaceRunHistory(workspaceId)` currently calls `WorkspaceManager.getRegisteredWorkspaceRootPath(workspaceId)` and throws if the ID is not registered filesystem. This would reject `temp_ws_default` if temp rows are displayed. | Yes, design should extend visible workspace root resolution for temp. |

| 2026-06-27 | Command | `git fetch origin --prune && git status --short --branch && git log --oneline --decorate --max-count=5 --left-right HEAD...origin/personal` | Verify branch freshness before architecture handoff after user approved fix | Remote `origin/personal` had advanced by one docs/release commit `aef6e851`. | No |
| 2026-06-27 | Command | `git merge --ff-only origin/personal` | Bring design worktree to latest tracked base before handoff | Fast-forwarded from `81dd58ce` to `aef6e851`; only upstream transient-task UI ticket docs/log files changed. | No |

| 2026-06-27 | Image | `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_fdbb0b866ad04021a30faa521b56d7c9/solution_designer_ee75cb0734cf4482be758e5fdb1190d6/context_files/ctx_82819006dcf6__image.png` | Inspect added request about New workspace path | Shows New tab selected, `/home/autobyteus/workspace` typed, `Load` button present, and helper still showing `Workspace: Temp Workspace`. | No |
| 2026-06-27 | Code | `autobyteus-web/components/workspace/config/WorkspaceSelector.vue` | Trace New path ownership | `tempPath` and `mode` are local component state. The component emits `load-new` only on Load/Enter and emits `select-existing` for existing selections; parent does not receive pending path on normal typing. | Yes, design parent-visible pending workspace input. |
| 2026-06-27 | Code | `autobyteus-web/components/workspace/config/AgentRunConfigForm.vue`, `TeamRunConfigForm.vue` | Check event pass-through | Forms pass only `select-existing` and `load-new` from `WorkspaceSelector` to `RunConfigPanel`; no pending-path event exists. | Yes |
| 2026-06-27 | Code | `autobyteus-web/components/workspace/config/RunConfigPanel.vue` | Trace Run behavior | `handleLoadNew` creates workspace and updates config only after `load-new`; `handleRun` is synchronous and creates the run from current config. It cannot see a typed-but-unloaded New path. | Yes |
| 2026-06-27 | Code | `autobyteus-web/stores/agentRunConfigStore.ts`, `autobyteus-web/stores/teamRunConfigStore.ts`, `autobyteus-web/utils/teamRunLaunchReadiness.ts` | Check readiness and workspace loading state | Stores already have `setWorkspaceLoading`, `setWorkspaceLoaded`, `setWorkspaceError`. Agent `isConfigured` and team launch readiness require a workspace ID/root, so Run enabling must account for a pending New path before it is loaded. | Yes |
| 2026-06-28 | Other | User clarification: `lets remove it i guess because i actually never click that load button before` | Resolve whether the Load button should remain optional or be removed | User chose to remove the New-mode Load button/action entirely. Run becomes the single submit/load boundary for typed or browsed New workspace paths. | Yes, update requirements and design to remove explicit load event/UI path. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Desktop `AppLeftPanel.vue` renders `WorkspaceAgentRunsTreePanel.vue` under the `Workspaces` header.
- Current execution flow:
  1. `WorkspaceAgentRunsTreePanel` mounts and calls `workspaceStore.fetchAllWorkspaces()` plus definition fetches.
  2. Backend `WorkspaceResolver.workspaces()` creates/returns temp workspace, then returns `WorkspaceManager.listVisibleWorkspaces()`.
  3. `workspaceStore.fetchAllWorkspaces()` stores the temp workspace in `workspaceStore.workspaces` with `workspaceId: temp_ws_default`, `kind: temp`, `isTemp: true`.
  4. `WorkspaceSelector` also calls `fetchAllWorkspaces()` and auto-selects `workspaceStore.tempWorkspaceId` if no workspace is selected.
  5. `RunConfigPanel.handleRun()` creates a local single-agent or team draft context from the selected temp workspace config.
  6. `runHistoryStore.getTreeNodes()` calls `buildRunHistoryTreeNodes()` using `workspaceStore.allWorkspaces`, `workspaceGroups`, and local `agentContexts`.
  7. `buildRunHistoryTreeNodes()` filters out temp workspaces before constructing descriptors.
  8. `buildRunTreeProjection()` only creates top-level workspace rows from descriptors and drops draft/history roots with no matching descriptor.
  9. Because the temp descriptor was filtered out, the local draft run/team cannot appear under a workspace row.
  10. In the current New workspace flow, `WorkspaceSelector` keeps the typed path locally. Until `Load` is clicked, `RunConfigPanel` still sees the previously selected workspace in the config, so `Run` cannot auto-use the typed path. The target flow removes this explicit Load action and continuously exposes pending input to the run owner.
- Ownership or boundary observations:
  - Correct top-level workspace authority after workspace removal is backend visible workspace descriptors, not history roots.
  - The defect is not that the backend fails to expose temp; it does expose temp. The defect is the frontend read model rejects a descriptor that another frontend flow uses as the default run workspace.
  - The removal action currently lacks row-level removability metadata; UI renders remove for every workspace row even though backend only accepts registered filesystem IDs.
  - The run config owner (`RunConfigPanel`) already owns workspace creation and run creation sequencing, so it is the right boundary to ensure pending workspace input is loaded before run context creation. The explicit `Load` UI action should be decommissioned rather than kept as a parallel preload command.
- Current behavior summary: The workspace-removal refactor closed the history-created-row loophole but over-filtered the descriptor set by excluding temp, breaking the default first-run path. Separately, the New path flow keeps the pending path below the run owner boundary, forcing an unintuitive Load click and making Run use stale workspace config. The final UX target removes the Load click and makes Run the single workspace-readiness boundary.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant; Boundary Or Ownership Issue
- Refactor posture evidence summary: Bounded refactor needed in the read model/projection contract so “visible workspace descriptor” includes non-removable temp workspaces while still excluding roots that are not returned by the workspace boundary. Row metadata must also distinguish removable registered filesystems from non-removable temp descriptors.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User screenshots | Run config selects `Temp Workspace (Default)`, selected run opens, sidebar stays empty. | Run creation and sidebar projection disagree about whether temp is a visible workspace. | No |
| `git diff 19828ad2^ 19828ad2` | Refactor changed projection so descriptors are only from `allWorkspaces`, then filters temp out. | The regression is directly tied to workspace-removal implementation, not an unrelated runtime failure. | No |
| Workspace-removal requirements/design | Top-level rows must be registry/workspace-list driven; temp needed validation and should be non-removable if shown. | Fix must not restore history-created top-level rows. | No |
| Backend `workspaces()` | Temp workspace is intentionally returned by visible workspace list. | Frontend should not drop it if it is selected for a run. | No |
| `runTreeProjection` tests | Existing guard only checks removed roots are skipped without descriptors. | Add temp descriptor tests while preserving guard. | Yes |
| Agent run promotion flow | Local context ID changes from `temp-...` to permanent before history refresh completes. | Need guard against standalone row disappearance after promotion. | Yes |

| New workspace screenshot | User typed a path but helper still shows Temp Workspace. | UI exposes stale active workspace state while a pending path exists. | No |
| `WorkspaceSelector.vue` | Pending `tempPath` is local and not emitted until Load. | Run owner cannot satisfy the user's expectation without a small input contract change, and the explicit Load action should be removed. | Yes |
| `RunConfigPanel.vue` | `handleRun` is synchronous and creates contexts from existing config. | Run should become final workspace readiness boundary and auto-load pending path. | Yes |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/AppLeftPanel.vue` | Desktop left navigation layout | Renders `WorkspaceAgentRunsTreePanel` under `Workspaces`. | Sidebar fix is in workspace history panel/read model, not app shell. |
| `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | Workspaces panel container, loading, expansion, remove/create action wiring | Fetches workspace list on mount and does not eagerly fetch global history. | Keep workspace-list boundary; add behavior through projection and row metadata. |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Presentational workspace/agent/team row renderer | Shows remove action for every workspace row. | Needs removability metadata from `RunTreeWorkspaceNode` or equivalent. |
| `autobyteus-web/composables/useWorkspaceHistoryTreeState.ts` | Expansion/reveal state | Can auto-reveal selected run ancestry if rows exist. | No major change needed if projection creates temp row/run row. |
| `autobyteus-web/stores/workspace.ts` | Frontend workspace metadata store and GraphQL list/create/remove calls | Stores temp workspaces and exposes `tempWorkspaceId`/`tempWorkspace`. | Store already has needed data; projection should use it. |
| `autobyteus-web/components/workspace/config/WorkspaceSelector.vue` | Run config workspace selector | Auto-selects `temp_ws_default` from workspace store. In New mode, keeps `tempPath` locally and emits only `load-new` on Load/Enter. | Must expose pending path/mode to parent, remove user-facing Load/preload behavior, and avoid stale success text. |
| `autobyteus-web/components/workspace/config/RunConfigPanel.vue` | Run config launch action | Creates draft contexts from selected workspace config. Owns explicit `handleLoadNew` workspace creation and `handleRun` launch, but `handleRun` cannot currently see pending New path. | Should replace the user-facing load handler with an internal run-launch helper that loads the pending New path before creating draft contexts. |
| `autobyteus-web/components/workspace/config/AgentRunConfigForm.vue` / `TeamRunConfigForm.vue` | Config form wrappers | Pass through only `select-existing` and `load-new` events from `WorkspaceSelector`. | Need pass through pending workspace input change event and remove `load-new` pass-through from the target UI contract. |
| `autobyteus-web/stores/agentContextsStore.ts` | Local standalone agent contexts | Creates selected `temp-...` draft contexts and promotes IDs later. | Projection must include draft and possibly live permanent local rows. |
| `autobyteus-web/stores/agentTeamContextsStore.ts` | Local team contexts | Creates selected `temp-team-...` team contexts. | Including temp workspace descriptor should unblock team row projection. |
| `autobyteus-web/stores/runHistoryReadModel.ts` | Read-model assembly for workspace/run tree | Filters out `kind !== filesystem` and `isTemp`. | Primary frontend root cause; include temp descriptor with non-removable metadata. |
| `autobyteus-web/utils/runTreeProjection.ts` | Pure tree projection from descriptors/history/drafts | Descriptors are only top-level source; drafts without descriptors are skipped. | Preserve this invariant; extend descriptor shape and local/live row handling. |
| `autobyteus-web/stores/runHistorySelectionActions.ts` | Selecting history/draft/team rows | `history` rows open backend; non-history rows select local draft contexts. | If a `live` row source is added, selection should follow local-context path. |
| `autobyteus-web/composables/useWorkspaceHistoryMutations.ts` | Run/team terminate/archive/delete/draft removal workflows | Draft removal is only for `source === draft`; history archive/delete only for `source === history`. | If `live` source exists, archive/delete should not apply; terminate can still apply if active. |
| `autobyteus-server-ts/src/api/graphql/types/workspace.ts` | Workspace GraphQL transport | `workspaces()` creates temp and returns visible list. | Backend list boundary is already providing temp. |
| `autobyteus-server-ts/src/workspaces/workspace-manager.ts` | Workspace lifecycle and registry manager | `listVisibleWorkspaces()` returns registered filesystem plus transient active workspaces. `removeRegisteredWorkspace()` rejects non-filesystem IDs. | UI needs removability metadata; frontend dedupe needed if same root appears twice. |
| `autobyteus-server-ts/src/workspaces/temp-workspace.ts` | Temp workspace specialization | Fixed ID `temp_ws_default`, `kind: temp`, `isTemp: true`, name `Temp Workspace`. | Temp descriptor should be projected as non-removable. |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-provisioning-service.ts` | Standalone run preparation/activation | Ensures workspace by root path, potentially registering temp root as filesystem. | Secondary duplicate/semantic risk; frontend dedupe should handle in-scope. |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts` | Team run creation | Ensures member workspace roots, potentially registering temp root as filesystem. | Same duplicate/semantic risk for teams. |
| `autobyteus-web/utils/teamRunLaunchReadiness.ts` | Team launch readiness | Requires workspace ID/root before launch. | Run enabling must treat pending New path as satisfying workspace input for enabling, then re-check after auto-load. |
| `tickets/done/workspace-removal-design/*` | Prior workspace-removal artifacts | Define registry/workspace list as top-level authority, history as subordinate, temp validation/non-removable recommendation. | Fix should be a correction to that design, not a reversal. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-27 | Visual repro evidence | User-supplied screenshots | Empty sidebar before and after creating `New - Codex` with `Temp Workspace (Default)`. | Symptom matches static trace: temp-selected draft has no projected workspace descriptor. |
| 2026-06-27 | Static trace | Source inspection from `WorkspaceSelector` -> `RunConfigPanel` -> `agentContextsStore` -> `runHistoryStore.getTreeNodes()` -> `buildRunHistoryTreeNodes()` -> `buildRunTreeProjection()` | Temp workspace is selected and local draft is created, but temp descriptor is filtered out before projection. | Strong root-cause evidence without needing a local GUI run. |
| 2026-06-27 | Git history trace | `git diff 19828ad2^ 19828ad2 -- ...` | The exact descriptor-source and temp-filter changes were introduced by workspace-removal commit. | Confirms regression origin. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used.
- Version / tag / commit / freshness: Not applicable.
- Relevant contract, behavior, or constraint learned: Not applicable.
- Why it matters: Not applicable.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Not run locally in GUI during this investigation; user screenshots supplied concrete UI evidence.
- Required config, feature flags, env vars, or accounts: None identified.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation only.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

1. **Regression commit:** Workspace-removal implementation commit `19828ad2` changed `buildRunHistoryTreeNodes()` from using history groups and all workspaces as descriptors to using only `workspaceStore.allWorkspaces`, then filtering by filesystem/non-temp. This enforces removal but drops temp.
2. **Correct boundary:** The left sidebar should not go back to history-created top-level rows. Workspace-removal requirements/design explicitly require top-level rows to come from the workspace boundary so removed/unregistered roots stay hidden.
3. **Wrong filter:** `kind: temp` / `isTemp: true` is currently excluded from the sidebar descriptor set, but the same temp workspace is selected by default for runs and returned by backend `workspaces()`.
4. **Draft projection gate:** `buildRunTreeProjection()` only attaches draft runs to an existing descriptor. With temp descriptor missing, the draft is intentionally ignored.
5. **Reveal behavior is available:** `useWorkspaceHistoryTreeState` already auto-expands selected run ancestry, so once temp workspace/draft row is projected, the row should become visible beneath the workspace.
6. **Remove affordance risk:** If temp rows are added without metadata changes, `WorkspaceHistoryWorkspaceSection` will show an `X` remove action that calls backend remove and fails because backend supports only registered filesystem workspaces.
7. **Temp history expansion gap:** If temp rows are displayed using `workspaceId: temp_ws_default`, the existing `workspaceRunHistory` resolver will reject them because it only resolves registered filesystem workspace IDs. The backend needs a visible-workspace root resolver that accepts temp while keeping removal filesystem-only.
8. **ID-promotion timing:** Single-agent rows are projected locally only for `temp-...` IDs. After first message, `agentContextsStore.promoteTemporaryId()` changes the context to a permanent ID before history refresh may have returned. A robust fix should keep local permanent active/prepared rows visible until history dedupes them.
9. **Same-root duplicate risk:** Backend launch paths may register the temp root as a filesystem workspace. If backend later returns both temp and filesystem descriptors for the same root, projection should render one row and keep the fixed temp workspace non-removable for that root.
10. **New-path ownership gap:** The typed New workspace path is local to `WorkspaceSelector` until Load. `RunConfigPanel.handleRun()` cannot load it because it has no current pending path contract; it runs with stale selected workspace config. The approved target removes the explicit Load event/UI path and replaces it with parent-visible pending input plus run-triggered loading.
11. **Misleading helper state:** New mode can show a pending path input while helper text still says the old workspace is active. This should be replaced with pending-path feedback until Run-triggered load succeeds; there is no separate Load-success state in the target UI.

## Constraints / Dependencies / Compatibility Facts

- `workspaces()` is the workspace-list boundary used by the sidebar and selector.
- `workspaceRunHistory(workspaceId, limitPerAgent)` is workspace-scoped and should remain subordinate to visible workspace rows; it currently handles registered filesystem IDs only and must be extended for the visible temp workspace ID.
- `listWorkspaceRunHistory(limitPerAgent)` remains for global/recent consumers but is not the desktop top-level row authority.
- `Remove from Workspaces` is non-destructive and applies only to registered filesystem workspaces.
- Backend temp workspace ID is `temp_ws_default`; temp workspace `kind` is `temp`; `isTemp` is `true`.
- Existing tests intentionally guard against history-only top-level rows; those tests should remain, with added temp descriptor cases.
- `workspaceStore.createWorkspace` is the existing workspace registration boundary for a path; Run-triggered New path loading should reuse it. The removed `Load` button should not leave a second user-facing registration path behind.
- `RunConfigPanel.handleRun` will need to become asynchronous or delegate to an async launch sequence to load the workspace before creating contexts.

## Open Unknowns / Risks

- Whether backend should stop registering the temp root as a filesystem workspace during run provisioning is a product/architecture cleanup question. It is not required to fix the immediate sidebar bug if projection dedupes descriptors by normalized root and keeps the fixed temp descriptor non-removable when both exist.
- If temp workspace should only be shown after a draft/live/history exists, the implementation can gate temp row visibility on local/history association. Current user expectation says it should appear immediately when the run starts, so this is not required unless product wants the sidebar empty before any run.
- Need design decide exact naming for row metadata: `canRemoveFromWorkspaces`, `isRemovable`, `workspaceKind`, or equivalent.
- Need design decide exact local permanent row source naming: extend `RunTreeRowSource` with `live`/`local` or fold into existing `draft`/`history` semantics. A distinct source is cleaner because permanent local rows are not drafts and should not be archived/deleted as history.
- Need backend design decide exact method name for visible workspace root resolution, separate from `getRegisteredWorkspaceRootPath` so removal remains registered-filesystem-only.
- Need frontend design decide exact event payload/name for pending workspace input (`workspace-input-change`, `pending-workspace-change`, etc.) and remove/decommission the existing `load-new` UI event path from `WorkspaceSelector`/form wrappers.

## Notes For Architect Reviewer

- The fix should be framed as a correction to the workspace-removal design: visible workspace descriptors remain authoritative, but the descriptor type must represent non-removable visible temp workspaces as well as removable registered filesystem workspaces.
- Do not approve any design that restores `workspaceGroups`/history roots as a top-level row source or adds a hidden suppression list.
- Key implementation areas likely include `runHistoryReadModel.ts`, `runTreeProjection.ts`, `WorkspaceHistoryWorkspaceSection.vue`, workspace history section contracts/tests, and run-history store tests.
- Secondary live-row work may touch `runHistorySelectionActions.ts` and `useWorkspaceHistoryMutations.ts` if a new `RunTreeRowSource` is introduced.
- Added requirement after initial architecture-review handoff: Run must auto-load pending New workspace paths. Subsequent 2026-06-28 user refinement removes the New-mode `Load` button/action entirely. The updated design package supersedes the earlier handoffs.
