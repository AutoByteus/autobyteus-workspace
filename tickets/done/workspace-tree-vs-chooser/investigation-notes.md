# Investigation Notes

## Investigation Meta

- Package identifier: `workspace-tree-vs-chooser` (Project Task `autobyteus-385`)
- Request / ticket: autobyteus-385. Remove a workspace from the left tree without taking it away from the chat's workspace chooser
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-tree-vs-chooser`
- Repository mode: `Git`; branch `codex/workspace-tree-vs-chooser`
- Resolved base: `origin/personal` @ `3ef5e33eecf7b50588b2b6dcec6908ab18152f1e` (fetched 2026-11-05); finalization target `origin/personal`
- Bootstrap: worktree created; no install yet. Project documents present: `DESIGN.md`, `TESTING.md`, `RELEASE.md`
- Current solution revision ID: `SR-004`
- Authorities read: `SKILL.md` (updated 2026-11-05), `references/project-documents.md` and `references/ticket-scope.md` (updated), `references/requirements-engineering.md` (this conversation)
- Investigation status: complete for the requirements

## Initial Request And Clarifications

- The user (2026-11-05, in the Task): "the workspaces tree displays all workspaces; in the chat area I only want to select a workspace for the execution. If I remove it from the tree, I think it is also removed from the chat area... can we first allow removing it from the tree area but I can still select it in the chat area? I'm not sure whether that is a good idea."
- The PM: autobyteus-378 is stopped; do not coordinate with it. Ask the user directly where he must decide. Do not put "the user has verified" into Done-when.

## Source Log

| Type | Source | Finding | ID |
| --- | --- | --- | --- |
| Code | `autobyteus-server-ts/src/workspaces/workspace-manager.ts:207-258` | `removeRegisteredWorkspace`: only `agent_ws_*` folders; blocked while a run is active (`WorkspaceRemovalGuard`); closes the open workspace object, deletes the registry entry. Message: "Files, memories, and run history were not deleted." **Confirmed** | E-01 |
| Code | `workspace-registry-store.ts`, `workspace-registry-file-persistence.ts:20-80` | `workspaces.json` is a flat map `{ workspaceId: rootPath }` (the user's: 18 entries; keys and count only read). Writes are atomic and validated; a removal must remove exactly the named entry | E-02 |
| Code | `workspace-manager.ts:54-103` | Starting a run in a folder (`createWorkspace` / `ensureWorkspaceByRootPath`, also used by delegations into a Project's folder) **upserts** the registry entry, so a removed folder comes back. **Confirmed** (the PM's note) | E-03 |
| Code | `api/graphql/types/workspace.ts:77-80,125-127`; `workspace-manager.ts:163-173` `listVisibleWorkspaces` | One list (`workspaces`) serves every client; `removeWorkspace` is the one removal | E-04 |
| Code | `autobyteus-web/stores/runHistoryReadModel.ts:141,157-176,223-291`; `utils/runTreeProjection.ts:245-262` | The tree builds a workspace node **only** for a listed folder; history groups of an unlisted folder are skipped (`if (!workspaceNode) continue`). So a removed folder's runs vanish from the tree but stay on disk | E-05 |
| Code | `components/chat/ChatWorkspaceMenu.vue:232-271`, `ChatNewSurface.vue:239` | The chooser lists `workspaceStore.allWorkspaces`, the same list. **Confirmed** | E-06 |
| Code | `allWorkspaces` readers | Choosing a folder: chat chooser, Project editor, Org launch page, application workspace root selector, mobile launch, Settings. Listing runs by folder: the desktop tree (`runHistoryReadModel`) and the phone's work list (`composables/mobile/useMobileWorkCatalog.ts:217`) | E-07 |
| Code | `ChatWorkspaceMenu.vue` | The chooser has no remove action today | E-08 |
| Code | `api/graphql/types/agent-run.ts:233`, `remote-collaboration/inbound/remote-delegation-receiver.ts:98`, web `stores/agentRunStore.ts:190-211` | (SR-003) The user's agent path is the GraphQL `prepareAgentRun` resolver; a peer's delegation calls the service directly, not the resolver. GraphQL `createAgentRun` has no caller in the repository (FU-001) | E-09 |
| Code | `run-history/services/agent-run-history-service.ts:77-102`, `agent-run-history-catalog-service.ts:150,189` (callers only `agent-execution/services/agent-run-provisioning-service.ts:131`, `standalone-agent-run-lifecycle-service.ts:349`), `run-history/store/task-agent-own-records.ts:15-19` | (SR-003) A folder's history groups list standalone agent runs and team/org runs only. Delegated copies are kept in their coordinating run's tree, not in the folder's groups, so an active delegated copy does not count as an active run of the folder (AC-003 holds under DS-004). The web also adds open local contexts (`runHistoryReadModel.ts:246-283`) | E-10 |

| Code | `components/workspace/history/WorkspaceAgentRunsTreePanel.vue` (520 lines at `origin/personal`) :4, :64, :490-505; `stores/runSectionModeStore.ts`; `components/layout/LeftSidebarStrip.vue:112` | (SR-004) The panel hosts both views (switch, Projects tree), the add form and the X. Its mount loads the history and polls every 5 s. The mode is `workspaces \| projects` per node; the strip label follows it | E-11 |
| Code | `stores/runHistoryStore.ts:119,427,435`; `runHistoryLoadActions.ts:97-130`; `runHistoryRetiredRuns.ts:7-61`; `composables/mobile/useMobileWorkCatalog.ts:322` | (SR-004) Every history read takes `limitPerAgent` (default 6; the phone 5); the reconcile assumes the cap; team history is not capped | E-12 |
| Code | `utils/runTreeProjection.ts:229-300` | (SR-004) Folder nodes are made from every registered folder first, then filled with history and local (including draft) runs | E-13 |
| Code | `stores/projectRunsProjection.ts:65`; `components/workspace/history/ProjectsRunsTree.vue:47`; `stores/projectRunsStore.ts` (`projectRunHistory`) | (SR-004) The Projects view lists every Project; its empty state links "New Project" | E-14 |
| Code / docs | Branch `codex/left-panel-super-agents` (base `3ef5e33eec`, same as this ticket): commits `79d6c0e584`, `04b1cc57b0`; uncommitted `run-last-activity-reader.ts` (85 lines) and its test; its `design-spec.md` SR-006 (ARCH-REV-003: AR-005, AR-006 resolved); `code-review-report.md` CRR-001 Fail (CR-001 order by last activity; CR-002 dead standalone target) | (SR-004) The Runs list (`components/runList/*`, `runListStore`, `runListProjection`, `useRunListDisclosure`, `useRunListArchiveOlder`, the read window, `archiveRuns`) exists against the same base. That ticket also removed the trees and moved the load to `app.vue` | E-15 |
| Repo | This branch: `1da49572ab` (docs), `8fe7b2e57e` (server SR-003); uncommitted web SR-003 work (the implementation engineer's pause report, 2026-11-05) | (SR-004) What must be reverted or adapted | E-16 |

## Persisted Data And State Facts

- `workspaces.json`, a flat map. Adding a per-entry flag would change its value shape, and an older build would fail to read it (strict parse, E-02). A separate list of folders hidden from the tree leaves the registry as it is: no migration, and an older build ignores the new file (the tree then simply shows everything).

## Supplemental Artifact Inventory

None.

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution |
| --- | --- | --- | --- |
| R-01 | Risk | A folder hidden from the tree hides its run history from the tree too (as removal does today, E-05) | Stated to the user; the history stays on disk and returns when the folder is shown again |
