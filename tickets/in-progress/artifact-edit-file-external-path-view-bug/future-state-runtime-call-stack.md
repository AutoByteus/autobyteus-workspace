# Future-State Runtime Call Stack

## Scope

- Ticket: `artifact-edit-file-external-path-view-bug`
- In-Scope Use Cases: `UC-001`, `UC-002`, `UC-003`, `UC-004`
- Spine IDs: `DS-001`, `DS-002`

## Use Cases

- `UC-001` User clicks an `edit_file` artifact whose absolute path is under the run workspace root.
  - Expected: existing workspace-backed fetch continues to work.
- `UC-002` User clicks an `edit_file` artifact whose absolute path is under another loaded workspace root.
  - Expected: viewer resolves that workspace and shows file content.
- `UC-003` User clicks an `edit_file` artifact before the workspace catalog has been fetched.
  - Expected: viewer refreshes the workspace catalog once, retries resolution, then fetches content if a matching workspace exists.
- `UC-004` User views a `write_file` artifact still streaming.
  - Expected: buffered preview behavior remains unchanged.

## Call Stack

### DS-001 Cross-workspace `edit_file` resolution

1. `ArtifactsTab.vue` passes the selected artifact into `ArtifactContentViewer.vue`.
2. `ArtifactContentViewer.vue` normalizes the artifact path and enumerates loaded workspaces from `workspaceStore`.
3. The viewer selects the workspace whose `absolutePath` exactly matches `artifact.workspaceRoot`, or, failing that, the loaded workspace with the longest normalized root prefix containing the absolute artifact path.
4. The viewer computes the relative path from the matched workspace root and builds `/workspaces/:workspaceId/content?path=...`.
5. `refreshResolvedContent()` fetches the file content and renders it through `FileViewer`.

### DS-002 Cold workspace catalog retry

1. `ArtifactContentViewer.vue` attempts workspace resolution and finds no candidate workspace.
2. If `workspaceStore.workspacesFetched === false`, the viewer calls `workspaceStore.fetchAllWorkspaces()` once for the current artifact-resolution attempt.
3. The viewer reruns workspace matching against the refreshed store contents.
4. If a workspace is now found, the content fetch proceeds.
5. If no workspace is found, the viewer remains blank for `edit_file` rather than rendering diff fallback.

## Spine Sufficiency Note

- The primary spine remains global enough to represent the full user-visible path: artifact selection -> workspace resolution -> URL construction -> content fetch -> viewer render.
