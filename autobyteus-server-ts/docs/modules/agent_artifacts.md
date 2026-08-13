# Agent Artifacts

## Scope

Server-side ownership for the Artifacts tab's produced/touched-file experience.
The Artifacts tab is backed by derived `FILE_CHANGE` events plus the
run-file-changes projection.

Team-route `send_message_to.reference_files` are owned by Team Communication.
They are stored as child references of accepted team `INTER_AGENT_MESSAGE`
records and are rendered in the Team tab, not as Sent/Received rows in the
Artifacts tab. Direct exact-run `send_message_to(target_agent_run_id=...)`
messages carry `reference_files` in the target runtime input/event metadata, but
they intentionally omit Team Communication projection fields and do not create
Team tab reference rows.

Task-delegation `reference_files` are owned by Task Delegation. They must be
explicit absolute local filesystem paths; relative paths, URL/protocol-shaped
values, and route-template or relative segments are rejected before task
persistence. Accepted paths are normalized as task-owned `referenceFiles` on
persisted `TaskDelegationRecord` rows, rendered in the Team tab `Tasks` section,
and served by task-owned identity. New task references use a route-safe opaque
`referenceId`; the persisted `referenceFiles[].path` remains the absolute local
path used for content streaming. Live task-delegation events may trigger a
records refresh, but the durable reference source is the task-delegation records
file, not Agent Artifacts or Team Communication.

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
- Team Communication references for accepted `recipient_address` deliveries:
  - `src/agent-execution/events/processors/team-communication/team-communication-message-event-processor.ts`
  - `src/services/team-communication/team-communication-service.ts`
  - `src/services/team-communication/team-communication-projection-store.ts`
  - `src/services/team-communication/team-communication-projection-service.ts`
  - `src/services/team-communication/team-communication-content-service.ts`
  - `src/api/graphql/types/team-communication.ts`
  - `src/api/rest/team-communication.ts`
- Task Delegation references for delegated task records:
  - `src/services/reference-files/absolute-local-reference-files.ts`
  - `src/agent-team-execution/task-delegation/task-delegation-reference-file.ts`
  - `src/agent-team-execution/task-delegation/task-delegation-reference-content-service.ts`
  - `src/agent-team-execution/task-delegation/task-delegation-service.ts`
  - `src/api/rest/task-delegation.ts`
- Streaming transport:
  - `src/services/agent-streaming/agent-run-event-message-mapper.ts`
  - `src/agent-team-execution/backends/mixed/mixed-team-run-backend.ts`

## Responsibilities

- Run each normalized backend event batch through `AgentRunEventPipeline` once
  before subscriber fan-out.
- Let `FileChangeEventProcessor` derive the sole live Agent Artifact event,
  `FILE_CHANGE`.
- Keep produced Agent Artifacts scoped to the producing member run id in team
  contexts.
- Persist Agent Artifact metadata-only projection state to
  `<run-memory-dir>/file_changes.json`.
- For team-member runs of any runtime, persist produced Agent Artifact metadata
  to the canonical member memory directory resolved from
  `{rootTeamRunId, ancestorTeamRunIds, agentRunId, memberAddress}`. The physical
  directory lineage uses TeamRun ids; it is deliberately not a logical member
  path or address encoding.
- Hydrate active and historical Agent Artifact rows through
  `RunFileChangeProjectionService` and `getRunFileChanges(runId)`.
- Serve Agent Artifact bytes by `runId + canonical path` through
  `/runs/:runId/file-change-content`.
- Keep Team Communication message/reference storage for accepted team-route
  deliveries separate at `agent_teams/<teamRunId>/team_communication_messages.json`.
- Keep Task Delegation reference rows on durable task records in
  `agent_teams/<rootTeamRunId>/task_delegation_records.json` and serve bytes by
  `teamRunId + taskId + referenceId` through
  `/team-runs/:teamRunId/task-delegations/:taskId/references/:referenceId/content`.
- Treat source invocation ids as opaque tool-call identities when correlating
  `FILE_CHANGE` context. The context store is keyed by exact source invocation
  id only: numeric/provider ordinals such as `run_bash:0`, semantic-looking
  suffixes such as `call_1:write_file`, and approval metadata suffixes such as
  `call_1:approval-1` are different ids from their bases. Runtime producers
  must emit the same canonical source invocation id on related events instead
  of relying on server-side alias repair.

## Notes

Paths mentioned only in inter-agent message prose are ordinary text. Explicit
reference files may be visible to recipient runtimes through a generated
`Reference files:` block, but the durable Team Communication metadata source is
the structured `reference_files` list on accepted `recipient_address` team-route
message payloads. Direct exact-run message references remain direct runtime
input/event metadata unless a separate future projection is designed.

Task-delegation references use the same explicit absolute-local
`reference_files` input idea but remain task-owned: the active task service
normalizes valid paths into durable `TaskReferenceFile` objects on
`TaskDelegationRecord` rows. The task reference route first uses active task
services when available, then falls back to the persisted root-run records file,
without involving Team Communication storage or Agent Artifact projection.
Historical relative task references or pre-fix path-derived ids are not repaired
by this route; invalid stored paths continue to fail at readback instead of
falling back to workspace-relative resolution.
