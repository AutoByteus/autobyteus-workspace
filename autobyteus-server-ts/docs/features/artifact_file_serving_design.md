# Artifact File Serving Design (TypeScript)

## Scope

The Artifacts tab serves produced/touched files only. Message references declared
through `send_message_to.reference_files` are part of Team Communication, not the
Artifacts tab.

## Agent Artifact Flow

1. Runtime backends convert provider events into normalized `AgentRunEvent`
   batches.
2. `AgentRunEventPipeline` processes each batch once before subscriber fan-out.
   Native AutoByteus teams keep one backend-owned native event bridge per active
   team run so a native event is converted, enriched, processed once, and then
   fanned out to subscribers.
3. `FileChangeEventProcessor` derives `FILE_CHANGE` only for explicit file
   mutations or known generated-output tools (`generate_image`, `edit_image`,
   `generate_speech`, including AutoByteus image/audio MCP forms).
4. `RunFileChangeService` consumes `FILE_CHANGE`, canonicalizes path identity,
   and updates the run projection. Team-member projections remain scoped to the
   member run id.
5. Metadata-only state persists to `<run-memory-dir>/file_changes.json`; native
   team-member runs use `agent_teams/<teamRunId>/<memberRunId>/file_changes.json`.
6. The frontend hydrates rows through `getRunFileChanges(runId)` and applies live
   `FILE_CHANGE` updates through `runFileChangesStore`.
7. The viewer fetches `/runs/:runId/file-change-content?path=...`.

## Team Communication Reference Flow

1. `send_message_to` accepts natural `content` plus optional explicit
   `reference_files` absolute local paths.
2. Accepted delivery emits one `INTER_AGENT_MESSAGE` payload with message id,
   sender/receiver identity, content, message type, and structured reference
   metadata.
3. `TeamCommunicationMessageProcessor` converts accepted `INTER_AGENT_MESSAGE`
   events into one normalized `TEAM_COMMUNICATION_MESSAGE` per message.
4. `TeamCommunicationService` observes derived `TEAM_COMMUNICATION_MESSAGE`
   team events and persists one message-first projection at
   `agent_teams/<teamRunId>/team_communication_messages.json`.
5. GraphQL exposes `getTeamCommunicationMessages(teamRunId)` for Team tab
   hydration.
6. Reference bytes are served by message-owned identity:
   `/team-runs/:teamRunId/team-communication/messages/:messageId/references/:referenceId/content`.

There is no text-scanning fallback, no standalone message-reference sidecar
runtime event, no receiver-scoped reference route, and no raw-path-only content
route.

## Current Source Owners

| Owner | Path | Responsibility |
| --- | --- | --- |
| File-change event derivation | `src/agent-execution/events/processors/file-change/*` | Derives `FILE_CHANGE` from explicit mutation/generated-output semantics. |
| Run file-change projection | `src/services/run-file-changes/*` | Run-scoped metadata projection and path identity. |
| Run file-change historical read | `src/run-history/services/run-file-change-projection-service.ts` | Active/historical run reads, including team-member run ids. |
| Run file-change API | `src/api/graphql/types/run-file-changes.ts`, `src/api/rest/run-file-changes.ts` | List and preview Agent Artifacts. |
| Team communication projection | `src/services/team-communication/*` | Message-first projection, identity, normalization, and content resolution. |
| Team communication API | `src/api/graphql/types/team-communication.ts`, `src/api/rest/team-communication.ts` | Hydrate messages and stream child reference content. |
| AutoByteus team bridge | `src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend.ts` | Converts/enriches native team events once before fan-out. |

## Storage

Agent Artifact metadata:

```text
<run-memory-dir>/file_changes.json
```

Team Communication message/reference metadata:

```text
agent_teams/<teamRunId>/team_communication_messages.json
```

Both projections store metadata only. Current filesystem bytes are read on demand
when the user opens a preview.
