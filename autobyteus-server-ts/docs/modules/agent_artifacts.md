# Agent Artifacts

## Scope

Live touched-file and generated-output events emitted to streaming clients.
This module no longer owns a persisted-artifact metadata service or a live GraphQL artifact query path for the Artifacts tab.

## TS Source

- `src/agent-customization/processors/tool-result/agent-artifact-event-processor.ts`
- `src/services/agent-streaming`
- `src/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.ts`
- `src/agent-execution/backends/codex/events/codex-turn-event-converter.ts`
- `src/agent-execution/backends/codex/events/codex-item-event-converter.ts`
- `src/api/rest/workspaces.ts`

## Current Responsibilities

- emit `ARTIFACT_PERSISTED` for `write_file` and generated outputs when the runtime has a concrete file/output path **and the tool result succeeded**
- emit `ARTIFACT_UPDATED` for `edit_file` / runtime file-change updates as a refresh-only signal
- forward artifact events through the agent streaming transport to WebSocket clients
- expose workspace-backed file bytes for frontend viewers through `/workspaces/:workspaceId/content`

## Current Live Design

- The frontend artifacts area is a live projection of touched files and outputs.
- Event identity is path-oriented in practice (`runId:path` on the frontend).
- Text/code inspection is workspace-backed once the file exists.
- Media/document outputs can use direct URLs when available.
- Denied/failed tool results do not emit artifact availability events.
- No active runtime path depends on persisted artifact metadata or `agentArtifacts(...)` GraphQL retrieval.

## Notes

If history-based reconstruction is needed later, that should come from run history / runtime traces rather than from reintroducing the old live artifact-persistence requirement by default.
