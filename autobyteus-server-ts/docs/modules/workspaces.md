# Workspaces

## Scope

Workspace lifecycle, registry-backed visibility, lookup, and removal management for filesystem, temp, and skill workspaces.

## TS Source

- `src/workspaces`
- `src/workspaces/workspace-manager.ts`
- `src/workspaces/workspace-registry-store.ts`
- `src/workspaces/workspace-removal-guard.ts`
- `src/api/graphql/types/workspace.ts`
- `src/api/rest/workspaces.ts`

## Main Manager

- `src/workspaces/workspace-manager.ts`

## Workspace Registry And Identity

Regular filesystem workspaces are registered in an app-data workspace registry owned by `WorkspaceRegistryStore`. The registry file is `workspaces.json` under the configured app data directory and stores `workspaceId -> canonical root path` entries.

Filesystem workspace ids are deterministic `agent_ws_<sha256(canonical-root-path)>` values. Loading the same canonical root path registers or returns the same workspace id. `workspaceMetadata(rootPath)` can resolve deterministic metadata without registering the root; `createWorkspace(input: { rootPath })` registers the root and returns metadata.

A path that is neither registered nor an active workspace must be an existing absolute folder before it is registered (`workspace-folder-check.ts`, checked on the raw trimmed input, before a relative path could resolve against the server's working directory). Otherwise registration is refused with GraphQL code `WORKSPACE_PATH_REFUSED` and `reason` `not_absolute`, `missing` or `not_a_folder`, nothing is registered and no folder is created. This covers `createWorkspace` and every server-internal path that registers a workspace for a run launch. Already registered paths are not checked again: a registered workspace whose folder was deleted still loads in the list and in history restore. Clients show the reason (the web's `utils/workspace/workspacePathRefusal.ts`).

The old `workspace-id-mapping-store.ts` helper has been replaced by `workspace-registry-store.ts`; new code should use the registry store/manager boundary rather than creating a parallel mapping or hidden-workspace list.

## Registry Persistence Invariants

`WorkspaceRegistryStore` is the only owner that reads or writes
`workspaces.json`. It must load the registry through a single-flight load path:
concurrent callers await the same load, and the store is not marked loaded until
the disk read or missing-file handling has completed.

Registry mutations are serialized inside the store. Each mutation works from a
clone of the current entries, validates the intended change, persists the clone,
and commits the in-memory entries only after persistence succeeds. Upsert
mutations must not remove entries. Explicit workspace removal may remove only the
requested filesystem workspace id, and configured temp-root cleanup may remove
only entries whose root equals the configured temp workspace root.

Persistence uses a same-directory atomic staging file named
`workspaces.json.tmp-<pid>-<timestamp>-<uuid>` followed by rename over
`workspaces.json`. Persistent `.bak` or rotating backup files are not part of the
normal registry write path. Stale registry temp files older than the cleanup
threshold may be removed during later registry writes.

Before replacing `workspaces.json`, the persistence helper re-reads the current
disk snapshot and applies the same shrink validation against that persisted
state. This guards the single packaged-server process and common stale-state
failures. It is not an interprocess lock; if a future topology intentionally
runs multiple server processes against the same app-data directory, add an
interprocess registry lock before sharing the registry file.

## Visible Workspace Listing

The GraphQL `workspaces()` query is the canonical visible workspace-list source for clients. It ensures the temp workspace exists, then returns:

- registered filesystem workspaces from the registry; and
- transient active workspaces such as temp or skill workspaces that are not duplicated by registry entries.

Internal workspaces (`<appData>/internal-workspaces/`, `internal-workspaces.ts`; the Model Router agent's) are left
out while "Show internal agents" is off (`WorkspaceManager.listVisibleWorkspaces`). Opening a run by ID still
resolves its workspace. See [Model Routing](./model_routing.md) and
[Agent Definition: Internal Agents](./agent_definition.md#internal-agents).

Run history is not an authority for top-level workspace visibility. A historical run under an unregistered or removed workspace root must not recreate a top-level workspace row by itself.

The fixed default temp workspace (`temp_ws_default`) is a visible run workspace
when returned by `workspaces()`. It may be shown in run-history/workspace UI, but
it is not a removable registry entry.

The configured temp workspace root is owned by `TempWorkspace`, not by the
filesystem registry. `createWorkspace(input: { rootPath })` and internal
workspace resolution paths that receive the configured temp root resolve to
`temp_ws_default` and clean any stale filesystem registry rows for that root
instead of persisting a duplicate `agent_ws_<hash>` row. Existing run history for
the temp root remains intact; the visible workspace list should still show that
root through the fixed temp workspace identity only.

## Remove From Workspaces

`removeWorkspace(input: { workspaceId })` unregisters a filesystem workspace, so it leaves every chooser and every view of the desktop's run section. The web offers it in the chat's folder chooser ("Remove"); the left panel lists only folders with runs and has no remove or add action. It is intentionally non-destructive:

- it does **not** delete the filesystem directory;
- it does **not** delete run history, team history, memories, raw traces, artifacts, or generated files; and
- it returns the removed workspace id/root plus user-facing success or failure text.

Removal is limited to registered filesystem workspace ids. Temp and skill workspace lifecycles remain owned by their existing transient workspace flows.

Before deleting the registry entry, `WorkspaceRemovalGuard` blocks removal when active standalone agent runs or active team/member runs still use the workspace root, with the message "Stop active runs before removing this workspace." (the approved copy of the chooser's refusal toast). The user must stop active work first. When removal is allowed, `WorkspaceManager.removeRegisteredWorkspace(...)` closes any active in-memory workspace instance for that root, which also releases file-explorer resources, then deletes the registry entry.

Re-adding/loading the same root later creates the same deterministic workspace id and makes the workspace visible again. Preserved history for that root can be shown again through workspace-scoped history after the workspace is registered.

## Workspace Static Route (HTML Preview)

`GET /rest/workspaces/:workspaceId/static/*` (`src/api/rest/workspaces.ts`)
serves workspace files for the web app's HTML preview. Its only consumer is the
preview iframe. Every file it serves carries
`Content-Security-Policy: sandbox allow-scripts`, so a workspace page runs
with an opaque origin (`null`) wherever its URL is opened: in the preview, in
the in-app browser or in a tab. It never runs at this node's origin, and the
node's Origin rule refuses its WebSocket and API requests
([Remote Access](../features/remote_access.md)). Do not remove the header or add
`allow-same-origin` to it. Error replies and the `/content` route do not send
it. The client side and what previewed pages can and cannot do are in
`autobyteus-web/docs/file_explorer.md` (HTML Preview Resource Contract).

## Workspace History Boundary

Workspace-specific run-history lookup uses the visible-workspace boundary.
`workspaceRunHistory(workspaceId, limitPerAgent)` resolves `workspaceId` through
`WorkspaceManager.getWorkspaceRootPathForHistory(...)` before reading history
for that root. Registered filesystem workspace ids resolve through the registry,
and the fixed default temp workspace id resolves through the temp workspace
lifecycle. Missing, unregistered, removed filesystem, and unrelated transient
workspace ids are rejected.

The broader `listWorkspaceRunHistory(limitPerAgent)` query remains available for global/recent-history style surfaces, but desktop top-level Workspaces rows should be derived from `workspaces()`, not from all historical workspace groups.
