# Artifact File Serving Design (TypeScript)

## Scope

Covers the **current live design** for touched-file inspection and generated-output preview serving.
The active runtime no longer persists artifact metadata as the source of truth for the Artifacts tab.

## Relevant TS Modules

- Tool-result event emission:
  - `src/agent-customization/processors/tool-result/agent-artifact-event-processor.ts`
  - `src/agent-customization/processors/tool-result/media-tool-result-url-transformer-processor.ts`
- Runtime event conversion:
  - `src/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.ts`
  - `src/agent-execution/backends/codex/events/codex-turn-event-converter.ts`
  - `src/agent-execution/backends/codex/events/codex-item-event-converter.ts`
- Streaming transport:
  - `src/services/agent-streaming/agent-run-event-message-mapper.ts`
  - `src/services/agent-streaming/agent-stream-handler.ts`
- File serving:
  - `src/api/rest/workspaces.ts`

## High-Level Flow

1. Runtime/tool-result processors discover a touched file or generated output path.
2. The backend emits `ARTIFACT_UPDATED` or `ARTIFACT_PERSISTED` into the agent-run event stream only when the runtime path has an artifact-relevant success/update signal to project.
3. Agent streaming maps those events directly to WebSocket messages.
4. The frontend projects those messages into a touched-files store keyed by run and path.
5. The viewer resolves final text/code content from the workspace/content route and uses direct URLs for media when available.

## Event Semantics

### `ARTIFACT_PERSISTED`

Used for:

- `write_file`
- generated image/audio/video/pdf/csv/excel outputs
- completed runtime file-output events

`ARTIFACT_PERSISTED` is the success-authorized availability signal. Denied/failed tool results must not emit it.

Payload should include the resolved output path and type, plus:

- `workspace_root` when the file is workspace-backed
- `url` when a direct preview URL exists

### `ARTIFACT_UPDATED`

Used for:

- `edit_file`
- runtime diff/file-change updates that should refresh an already known touched row

Payload should include the file path and type, plus `workspace_root` when available.
It is a refresh/update signal, not a claim that discoverability should fire again for an already-visible row.

## Source Of Truth

### Text / code files

The source of truth is the workspace file itself, served by:

- `GET /workspaces/:workspaceId/content?path=<relative-path>`

This route is what the frontend viewer uses once a touched file is available.

### Media / document outputs

The source of truth is the resolved file path and, when available, the direct output URL emitted by the runtime/tool-result processor.

## Current Guarantees

- The live Artifacts tab does not require a backend persisted-artifact database lookup.
- A touched file can appear before its final content is available.
- `write_file` keeps its streamed preview UX.
- `edit_file` is surfaced as a full-file inspector, not as a diff-only viewer.
- refresh-only artifact updates do not re-announce discoverability for existing rows.
- failed or denied tool results do not emit artifact availability events.
- Missing workspace files produce a `404`, which the frontend renders as a deleted/moved state.

## Removed Live Path

The following are no longer part of the active live serving path for the Artifacts tab:

- `src/agent-artifacts/**`
- `src/api/graphql/types/agent-artifact.ts`
- backend artifact metadata persistence as a runtime requirement
- the old `agentArtifacts(...)` GraphQL restore path
