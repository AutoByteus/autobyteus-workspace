# Agent Artifacts

## Overview

The Artifacts tab is the live **touched files / outputs** view for an agent run.
It is no longer limited to `write_file`, and it is not driven by a persisted-artifact GraphQL restore path.

A row appears when the run touches a file or output, including:

- `write_file`
- `edit_file`
- generated images / audio / video / pdf / csv / excel outputs
- runtime file-change events from supported backends

The UI goal is simple:

> if the agent touched a file or output during this run, the user should be able to click it and inspect it immediately.

The tab label is still **Artifacts**, but the runtime model is best understood as **touched files and outputs**.

## High-Level Flow

```mermaid
sequenceDiagram
    participant Agent as Agent / Runtime
    participant Backend as Backend
    participant WS as WebSocket
    participant SegmentHandler as segmentHandler.ts
    participant ArtifactHandler as artifactHandler.ts
    participant Store as AgentArtifactsStore
    participant UI as Artifacts UI

    Agent->>Backend: write_file / edit_file / generated output
    Backend->>WS: SEGMENT_START (write_file or edit_file)
    WS->>SegmentHandler: handleSegmentStart()
    SegmentHandler->>Store: upsertTouchedEntryFromSegmentStart()
    Store->>UI: create touched-file row

    loop write_file only
        Backend->>WS: SEGMENT_CONTENT
        WS->>SegmentHandler: handleSegmentContent()
        SegmentHandler->>Store: appendArtifactContent()
        Store->>UI: live buffered preview updates
    end

    Backend->>WS: ARTIFACT_UPDATED / ARTIFACT_PERSISTED
    WS->>ArtifactHandler: handleArtifactUpdated() / handleArtifactPersisted()
    ArtifactHandler->>Store: refreshTouchedEntryFromArtifactUpdate() / markTouchedEntryAvailableFromArtifactPersisted()
    Store->>UI: refresh row state; announce only on first visibility or explicit re-touch
```

## Runtime Model

### Statuses

| Status | Meaning |
| --- | --- |
| `streaming` | A `write_file` entry is actively buffering streamed content. |
| `pending` | The touched file is known, but the final file-backed state is not available yet. |
| `available` | The file/output is ready to inspect. |
| `failed` | The write/edit attempt was denied or failed, but the row remains visible. |

### Source Tools

| `sourceTool` | Meaning |
| --- | --- |
| `write_file` | File is being created or overwritten through the write-file flow. |
| `edit_file` | Existing file is being modified. |
| `generated_output` | Tool produced a media/document output path or URL directly. |
| `runtime_file_change` | Runtime emitted a file-change event without a matching segment-start entry. |

### Store Shape

```ts
interface AgentArtifact {
  id: string; // stable identity: runId:path
  runId: string;
  path: string;
  type: 'file' | 'image' | 'audio' | 'video' | 'pdf' | 'csv' | 'excel' | 'other';
  status: 'streaming' | 'pending' | 'available' | 'failed';
  sourceTool: 'write_file' | 'edit_file' | 'generated_output' | 'runtime_file_change';
  sourceInvocationId?: string | null;
  backendArtifactId?: string | null;
  content?: string; // buffered write_file content only
  url?: string | null; // generated media / direct preview URL
  workspaceRoot?: string | null;
  createdAt: string;
  updatedAt: string;
}
```

## Key Owners

| Owner | Path | Responsibility |
| --- | --- | --- |
| Touched-entry store | `stores/agentArtifactsStore.ts` | owns touched-entry identity, status changes, latest-visible selection signal, and buffered `write_file` content |
| Segment ingestion | `services/agentStreaming/handlers/segmentHandler.ts` | creates touched rows as soon as `write_file` / `edit_file` paths are known |
| Artifact event ingestion | `services/agentStreaming/handlers/artifactHandler.ts` | reconciles `ARTIFACT_UPDATED` as refresh-only metadata and `ARTIFACT_PERSISTED` as success-authorized availability |
| Tool terminal reconciliation | `services/agentStreaming/handlers/toolLifecycleHandler.ts` | keeps denied/failed rows visible and marks terminal availability when lifecycle events arrive |
| Viewer | `components/workspace/agent/ArtifactContentViewer.vue` | shows the current file/output content, using buffered `write_file` content, workspace fetches, or media URLs as appropriate |
| Sidebar discoverability | `components/workspace/agent/ArtifactsTab.vue`, `components/layout/RightSideTabs.vue` | auto-select the latest visible touched entry and switch to the Artifacts tab when new touched content appears |

## Frontend Behavior By Output Type

### `write_file`

- The row appears immediately on `SEGMENT_START` once `path` is known.
- While the segment is still active, streamed deltas are buffered in memory and shown directly in the viewer.
- When the file becomes `available`, the viewer stops relying on the temporary buffer and resolves the file from the workspace/content path.

### `edit_file`

- The row also appears immediately on `SEGMENT_START` once `path` is known.
- The Artifacts tab does **not** try to render diffs.
- `ARTIFACT_UPDATED` refreshes the existing row but does **not** re-announce discoverability for already-visible rows.
- Clicking the row opens the file viewer and resolves the current full file content from the workspace/content path.
- If the edit later succeeds, the same row refreshes to the latest file state.

### Generated outputs

- Generated image/audio/video/pdf/csv/excel outputs are inserted through artifact events.
- Generated-output rows are created only from successful tool results; denied/failed tool results do not synthesize artifact availability rows.
- The row uses the same list semantics as file rows.
- The viewer prefers a direct URL when one is available.

### Missing files

If the workspace/content fetch returns `404`, the viewer shows a deleted/moved state instead of silently failing.

## Viewer Resolution Rules

For text/code entries, the viewer treats the workspace file as the source of truth once the file is available:

1. `write_file` and not yet `available` -> show buffered streamed content
2. text file with a resolvable workspace path -> fetch current file content from `/workspaces/:workspaceId/content?path=...`
3. text file without a resolvable workspace path -> fall back to `artifact.content`
4. media / document types -> use `artifact.url` or resolved URL

This keeps the Artifacts tab focused on **final inspectable content**, not a diff-specific rendering workflow.

## What Changed In The Architecture

### Removed from the live UX

- persisted-artifact GraphQL restore as the active source for the tab
- backend artifact metadata persistence as a requirement for the current live experience
- the old assumption that only `write_file` should surface in the Artifacts tab

### Kept for UX

- live `write_file` streaming preview
- immediate visibility for touched files
- auto-selection of the latest visible touched entry
- generated-output preview support

## Testing

Primary durable coverage lives in the existing Nuxt/Vitest suite:

- `stores/__tests__/agentArtifactsStore.spec.ts`
- `services/agentStreaming/handlers/__tests__/segmentHandler.spec.ts`
- `services/agentStreaming/handlers/__tests__/artifactHandler.spec.ts`
- `services/agentStreaming/handlers/__tests__/toolLifecycleHandler.spec.ts`
- `components/workspace/agent/__tests__/ArtifactsTab.spec.ts`
- `components/workspace/agent/__tests__/ArtifactList.spec.ts`
- `components/workspace/agent/__tests__/ArtifactContentViewer.spec.ts`
- `components/layout/__tests__/RightSideTabs.spec.ts`

Notable viewer assertions now cover:

- buffered `write_file` preview bypassing workspace fetch
- workspace-backed resolved content for available text files
- deleted-file handling on `404`
- non-404 fetch error reporting
- refresh-only artifact updates not retriggering latest-visible discoverability
- denied/failed backend tool results not emitting artifact availability

## Related Documentation

- [Agent Execution Architecture](./agent_execution_architecture.md)
- [File Explorer](./file_explorer.md)
- [Content Rendering](./content_rendering.md)
- [Tools & MCP](./tools_and_mcp.md)
