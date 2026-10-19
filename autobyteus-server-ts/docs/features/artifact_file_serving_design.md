# Artifact File Serving Design (TypeScript)

## Scope

The Artifacts tab serves produced/touched files only. Message references declared
through accepted team-route `send_message_to.reference_files` are part of Team
Communication, not the Artifacts tab. Direct exact-run
`send_message_to(target_agent_run_id=...)` references remain runtime input/event
metadata and do not create Team Communication reference rows.

## Agent Artifact Flow

1. Runtime backends convert provider events into normalized `AgentRunEvent`
   batches.
2. `AgentRunEventPipeline` processes each batch once before subscriber fan-out.
   Server team runs execute through `MixedTeamManager`; mixed member handles
   subscribe to child `AgentRun` or child `TeamRun` streams, enrich the already
   normalized runtime event with team/member provenance, and fan it out once to
   team subscribers.
3. `FileChangeEventProcessor` derives `FILE_CHANGE` only for explicit file
   mutations or known generated-output tools (`generate_image`, `edit_image`,
   `generate_speech`, `generate_video`, including AutoByteus image/audio/video
   MCP forms).
4. `RunFileChangeService` consumes `FILE_CHANGE`, canonicalizes path identity,
   and updates the run projection. Team-member projections remain scoped to the
   member run id. The general process has exactly one `RunFileChangeService`:
   `GeneralProcessRunSupervisor` constructs it, attaches it to every activated
   run through `AgentRunResourceManager`, and binds it as the process authority
   (`bindProcessRunFileChangeService` / `releaseProcessRunFileChangeService`).
   `getRunFileChangeService()` returns that bound instance and throws when none
   is bound; no module creates a default instance.
5. Metadata-only state persists to `<run-memory-dir>/file_changes.json`;
   team-member runs use the canonical memory location resolved from the root
   TeamRun id, physical ancestor TeamRun ids, rooted member address, and AgentRun
   id. Physical directory lineage is not a logical address encoding.
6. The frontend hydrates rows through the list read of the row's owner and
   applies live `FILE_CHANGE` updates through `runFileChangesStore`.
7. The viewer fetches the content route of the same owner.

Every list and content read names its owner, so the server reads only that
owner's tree and never searches all saved runs:

| Owner | List (GraphQL) | Content (REST) |
| --- | --- | --- |
| Standalone run | `getRunFileChanges(runId)` | `/runs/:runId/file-change-content?path=...` |
| Team member (configured member or team task agent) | `getTeamMemberFileChanges(teamRunId, agentRunId)` | `/team-runs/:teamRunId/agent-runs/:agentRunId/file-change-content?path=...` |
| Org member (direct agent, member-team member or task agent) | `getAgentOrgMemberFileChanges(orgRunId, memberAddress, agentRunId)` | `/agent-org-runs/:orgRunId/agent-runs/:agentRunId/file-change-content?memberAddress=...&path=...` |
| Delegated copy under a standalone run (hub) | `agentRunCollaborationMemberFileChanges(hostRunId, memberAddress, agentRunId)` | `/agent-collaborations/:hostRunId/agent-runs/:agentRunId/file-change-content?memberAddress=...&path=...` |

- The run-id reads serve standalone runs only. A run is standalone exactly when
  it has standalone run metadata, whether it is running or saved; being active
  does not decide it, because collaboration members share the same activation
  registry. For any other run id the list is empty and content answers 404
  `File change not found`. There is no fallback search.
- A member read is located by its family's member-view service
  (`TeamMemberRunViewProjectionService`,
  `AgentOrgMemberRunViewProjectionService`,
  `StandaloneRootMemberViewProjectionService`) inside the named root only, then
  served by `RunFileChangeProjectionService.getLocatedCollaborationMemberProjection`
  / `resolveLocatedCollaborationMemberEntry`. The file-change service never
  locates members itself.
- While the root runs, a member's list and content come from the live
  projection (pending and streaming entries included); otherwise from the
  member's stored `file_changes.json`.
- A workspace-relative entry resolves against the member's own launch
  workspace, taken from `locatedExecutionSource(location)`: the configured
  placement for configured members, the catalog source for task agents and
  copies of every family.
- A member the named owner does not hold: the list query errors and the content
  route answers 404 `File change not found`. A missing `memberAddress` on the
  org or copy route answers 400.
- One content response rule for every owner: the file bytes with their MIME
  type and `cache-control: no-store`; 409 `File change content is not ready yet`
  for a pending or streaming entry while its owner runs; 404 `File change
  content is not available` when the file is gone; 404 `File change not found`
  when the path is not a recorded file change of that agent.

List hydration and content serving read active runs from the process
authority, resolved on every request. A `RunFileChangeService` keeps an
in-memory projection only for runs attached to it, from `attachToRun` until
detach, because only those runs receive its `FILE_CHANGE` events. That live
projection also carries transient streaming `content`. For any other run it
returns a fresh normalized read of `file_changes.json` and caches nothing, so a
read can never pin a stale snapshot. Application execution scopes own their own
scope-local instance and never bind it as the process authority.

An attached run's first read fills its live projection from `file_changes.json`.
It does so only if the projection is still empty when that stored read returns.
A `FILE_CHANGE` event, or another read, may have filled it in the meantime. The
live projection is never older than the saved record, because `handle` updates
it before writing the record. So the filled projection wins and the late stored
read is discarded. This keeps a first read that overlaps the run's first file
change from hiding that file from the live list, or from the saved record that
the next event writes. Reads never wait for the event queue.

## Team Communication Reference Flow

1. `send_message_to(recipient_address=...)` accepts natural `content` plus optional
   explicit `reference_files` absolute local paths.
2. Accepted team-route delivery emits one `INTER_AGENT_MESSAGE` payload with
   message id, address-first sender/receiver identity, content, message type,
   team projection fields, and structured reference metadata. Structural,
   task-Team, and task-Agent senders/receivers use the exact four-field
   `TeamExecutionAddress` (`rootTeamRunId`, ordered `taskTeamRunIds`, rooted
   `memberAddress`, and nullable `taskAgentRunId`).
3. `TeamCommunicationMessageProcessor` converts accepted `INTER_AGENT_MESSAGE`
   events into one normalized `TEAM_COMMUNICATION_MESSAGE` per message.
4. `TeamCommunicationService` observes derived `TEAM_COMMUNICATION_MESSAGE`
   team events and persists one message-first projection at
   `agent_teams/<teamRunId>/team_communication_messages_*.jsonl`.
5. GraphQL exposes `getTeamCommunicationMessages(teamRunId)` for Team tab
   hydration.
6. Reference bytes are served by message-owned identity:
   `/team-runs/:teamRunId/team-communication/messages/:messageId/references/:referenceId/content`.

There is no text-scanning fallback, no standalone Team Communication
message-reference sidecar runtime event, no receiver-scoped reference route, and
no raw-path-only content route. Direct exact-run `INTER_AGENT_MESSAGE` events
intentionally omit the team projection fields consumed by this flow.

## Current Source Owners

| Owner | Path | Responsibility |
| --- | --- | --- |
| File-change event derivation | `src/agent-execution/events/processors/file-change/*` | Derives `FILE_CHANGE` from explicit mutation/generated-output semantics. |
| Run file-change projection | `src/services/run-file-changes/*` | Run-scoped metadata projection and path identity; live projections for attached runs only; process authority binding. |
| Run file-change historical read | `src/run-history/services/run-file-change-projection-service.ts` | Active/historical run reads, including team-member run ids. |
| Run file-change API | `src/api/graphql/types/run-file-changes.ts`, `src/api/rest/run-file-changes.ts` | List and preview Agent Artifacts. |
| Team communication projection | `src/services/team-communication/*` | Message-first projection, identity, normalization, and content resolution. |
| Team communication API | `src/api/graphql/types/team-communication.ts`, `src/api/rest/team-communication.ts` | Hydrate messages and stream child reference content. |
| Mixed team member event bridge | `src/agent-team-execution/backends/mixed/**` plus runtime AgentRun event converters | Converts/enriches member runtime events once before team fan-out. |
| Team Agent event projection | `src/services/agent-streaming/team-agent-event-websocket-projector.ts` | Projects canonical Agent events with one strict `agent_execution` binding before WebSocket fan-out. |

## Storage

Agent Artifact metadata:

```text
<run-memory-dir>/file_changes.json
```

Team Communication message/reference metadata:

```text
agent_teams/<teamRunId>/team_communication_messages_*.jsonl
```

Both projections store metadata only. Current filesystem bytes are read on demand
when the user opens a preview. Team Communication metadata is message-owned and
address-first; it is not scoped to the receiver run id and it should not be
mirrored into member Artifacts rows. Old flat Team Communication projection files
are rewritten by app-data migration before current runtime/API/store reads.
