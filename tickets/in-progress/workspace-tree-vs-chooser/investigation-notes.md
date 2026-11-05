# Investigation Notes

## Investigation Meta

- Package identifier: `workspace-tree-vs-chooser` (Project Task `autobyteus-385`)
- Request / ticket: autobyteus-385. Remove a workspace from the left tree without taking it away from the chat's workspace chooser
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-tree-vs-chooser`
- Repository mode: `Git`; branch `codex/workspace-tree-vs-chooser`
- Resolved base: `origin/personal` @ `3ef5e33eecf7b50588b2b6dcec6908ab18152f1e` (fetched 2026-11-05); finalization target `origin/personal`
- Bootstrap: worktree created; no install yet. Project documents present: `DESIGN.md`, `TESTING.md`, `RELEASE.md`
- Current solution revision ID: `SR-003`
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

## Persisted Data And State Facts

- `workspaces.json`, a flat map. Adding a per-entry flag would change its value shape, and an older build would fail to read it (strict parse, E-02). A separate list of folders hidden from the tree leaves the registry as it is: no migration, and an older build ignores the new file (the tree then simply shows everything).

## Supplemental Artifact Inventory

None.

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution |
| --- | --- | --- | --- |
| R-01 | Risk | A folder hidden from the tree hides its run history from the tree too (as removal does today, E-05) | Stated to the user; the history stays on disk and returns when the folder is shown again |
