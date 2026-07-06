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

`removeWorkspace(input: { workspaceId })` removes a registered filesystem workspace from the visible workspace registry. It is intentionally non-destructive:

- it does **not** delete the filesystem directory;
- it does **not** delete run history, team history, memories, raw traces, artifacts, or generated files; and
- it returns the removed workspace id/root plus user-facing success or failure text.

Removal is limited to registered filesystem workspace ids. Temp and skill workspace lifecycles remain owned by their existing transient workspace flows.

Before deleting the registry entry, `WorkspaceRemovalGuard` blocks removal when active standalone agent runs or active team/member runs still use the workspace root. The user must stop active work first. When removal is allowed, `WorkspaceManager.removeRegisteredWorkspace(...)` closes any active in-memory workspace instance for that root, which also releases file-explorer resources, then deletes the registry entry.

Re-adding/loading the same root later creates the same deterministic workspace id and makes the workspace visible again. Preserved history for that root can be shown again through workspace-scoped history after the workspace is registered.

## Workspace History Boundary

Workspace-specific run-history lookup uses the visible-workspace boundary.
`workspaceRunHistory(workspaceId, limitPerAgent)` resolves `workspaceId` through
`WorkspaceManager.getWorkspaceRootPathForHistory(...)` before reading history
for that root. Registered filesystem workspace ids resolve through the registry,
and the fixed default temp workspace id resolves through the temp workspace
lifecycle. Missing, unregistered, removed filesystem, and unrelated transient
workspace ids are rejected.

The broader `listWorkspaceRunHistory(limitPerAgent)` query remains available for global/recent-history style surfaces, but desktop top-level Workspaces rows should be derived from `workspaces()`, not from all historical workspace groups.
