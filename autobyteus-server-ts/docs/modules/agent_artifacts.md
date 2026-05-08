# Agent Artifacts

## Scope

Server-side ownership for the Artifacts tab's produced/touched-file experience.
The Artifacts tab is backed by derived `FILE_CHANGE` events plus the
run-file-changes projection.

Inter-agent `send_message_to.reference_files` are owned by Team Communication.
They are stored as child references of accepted `INTER_AGENT_MESSAGE` records and
are rendered in the Team tab, not as Sent/Received rows in the Artifacts tab.

## TS Source

- Agent Artifact runtime/projection:
  - `src/agent-execution/domain/agent-run-file-change.ts`
  - `src/agent-execution/domain/agent-run-file-change-path.ts`
  - `src/agent-execution/events/agent-run-event-pipeline.ts`
  - `src/agent-execution/events/default-agent-run-event-pipeline.ts`
  - `src/agent-execution/events/processors/file-change/file-change-event-processor.ts`
  - `src/services/run-file-changes/run-file-change-service.ts`
  - `src/services/run-file-changes/run-file-change-path-identity.ts`
  - `src/services/run-file-changes/run-file-change-projection-store.ts`
  - `src/run-history/services/run-file-change-projection-service.ts`
  - `src/api/graphql/types/run-file-changes.ts`
  - `src/api/rest/run-file-changes.ts`
- Team Communication references:
  - `src/agent-execution/events/processors/team-communication/team-communication-message-event-processor.ts`
  - `src/services/team-communication/team-communication-service.ts`
  - `src/services/team-communication/team-communication-projection-store.ts`
  - `src/services/team-communication/team-communication-projection-service.ts`
  - `src/services/team-communication/team-communication-content-service.ts`
  - `src/api/graphql/types/team-communication.ts`
  - `src/api/rest/team-communication.ts`
- Streaming transport:
  - `src/services/agent-streaming/agent-run-event-message-mapper.ts`
  - `src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend.ts`

## Responsibilities

- Run each normalized backend event batch through `AgentRunEventPipeline` once
  before subscriber fan-out.
- Let `FileChangeEventProcessor` derive the sole live Agent Artifact event,
  `FILE_CHANGE`.
- Keep produced Agent Artifacts scoped to the producing member run id in team
  contexts.
- Persist Agent Artifact metadata-only projection state to
  `<run-memory-dir>/file_changes.json`.
- For AutoByteus/native team-member runs, persist produced Agent Artifact
  metadata to `agent_teams/<teamRunId>/<memberRunId>/file_changes.json`.
- Hydrate active and historical Agent Artifact rows through
  `RunFileChangeProjectionService` and `getRunFileChanges(runId)`.
- Serve Agent Artifact bytes by `runId + canonical path` through
  `/runs/:runId/file-change-content`.
- Keep Team Communication message/reference storage separate at
  `agent_teams/<teamRunId>/team_communication_messages.json`.

## Notes

Paths mentioned only in inter-agent message prose are ordinary text. Explicit
reference files may be visible to recipient runtimes through a generated
`Reference files:` block, but the durable metadata source is the structured
`reference_files` list on the accepted message payload.
