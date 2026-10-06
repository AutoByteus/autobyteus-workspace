# Agent Artifacts

## Scope

Server-side ownership for the Artifacts tab's produced/touched-file experience.
The Artifacts tab is backed by derived `FILE_CHANGE` events plus the
run-file-changes projection.

Team-route `send_message_to.reference_files` are owned by Team Communication.
They are stored as child references of accepted team `INTER_AGENT_MESSAGE`
records and are rendered in the Team tab, not as Sent/Received rows in the
Artifacts tab. An exact-run `send_message_to(target_agent_run_id=...)` to an
AgentRun in the sender's own collaboration root is delivered through that root
and recorded like any other Team Communication message, including its
`reference_files`. An exact-run message to an active run outside the sender's
root carries `reference_files` only in the target runtime input/event metadata;
it omits Team Communication projection fields and creates no Team tab reference
rows.

`delegate_task` `reference_files` must be normalized absolute local paths of
existing files; anything else (relative paths, URL/protocol-shaped values,
`..` segments, directories, missing files) is rejected with
`INVALID_REFERENCE_FILE` before anything is prepared. Accepted paths are
listed in the child's first message (the work packet) under
`Reference files:`. There is no task-owned reference storage, Team tab `Tasks`
section, or task reference route any more; later file exchange with a
delegated child uses ordinary `send_message_to` `reference_files` and therefore
Team Communication.

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
  - `src/services/team-communication/team-communication-v1-store.ts`
  - `src/services/team-communication/team-communication-projection-service.ts`
  - `src/services/team-communication/team-communication-content-service.ts`
  - `src/api/graphql/types/team-communication.ts`
  - `src/api/rest/team-communication.ts`
- Delegation work-packet reference validation:
  - `src/agent-collaboration/execution/task/task-execution-input.ts`
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
  `RunFileChangeProjectionService` and `getRunFileChanges(runId)`. Active runs
  are read from the one process `RunFileChangeService` that
  `GeneralProcessRunSupervisor` binds (`getRunFileChangeService()`). It holds a
  live projection only for runs attached to it and reads any other run fresh
  from `file_changes.json`, so every recorded artifact stays listable and
  previewable without a restart.
- Serve Agent Artifact bytes by `runId + canonical path` through
  `/runs/:runId/file-change-content`.
- Keep Team Communication message/reference storage for accepted team-route
  deliveries separate at `agent_teams/<teamRunId>/team_communication_messages.json`.
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

`delegate_task` uses the same explicit absolute-local `reference_files` input
rule, but its references live only in the child's first message. Released
task-records files that still list task references stay on disk untouched; they
are not served.
