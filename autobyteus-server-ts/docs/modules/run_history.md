# Run History (TypeScript)

## Scope

`src/run-history` owns persisted execution history, resume metadata, workspace history listing, and read-model projection for standalone agent runs and team runs.

## Responsibilities

- Persist agent run metadata and the agent history index.
- Persist team run metadata and the team history index.
- Expose resume configuration for stored runs:
  - agent: `agent-run-resume-config-service.ts`
  - team: `team-run-history-service.ts#getTeamRunResumeConfig(...)`
- Keep resume configuration truthful about active vs inactive state. Frontend follow-up send flows may use that flag to call explicit restore mutations, while backend WebSocket connection and `SEND_MESSAGE` remain authoritative restore-aware boundaries when the local resume-config cache is stale or absent.
- Normalize runtime-native historical replay inputs into the canonical run-history replay bundle:
  - agent: `agent-run-view-projection-service.ts`
  - team member: `team-member-run-view-projection-service.ts`
- Group agent and team history by workspace:
  - `workspace-run-history-service.ts`

## GraphQL Surface

- Agent/workspace history resolver: `src/api/graphql/types/run-history.ts`
- Team history resolver: `src/api/graphql/types/team-run-history.ts`

Workspace + agent operations:

- `listWorkspaceRunHistory`
- `getRunProjection`
- `getAgentRunResumeConfig`
- `archiveStoredRun`
- `deleteStoredRun`

Team operations:

- `getTeamRunResumeConfig`
- `getTeamMemberRunProjection`
- `archiveStoredTeamRun`
- `deleteStoredTeamRun`

## Default History Visibility, Archive, And Delete Semantics

The default `listWorkspaceRunHistory` response is intentionally a visible
history tree, not a complete retention inventory. It excludes inactive
standalone agent runs and inactive team runs whose metadata contains an
`archivedAt` timestamp before workspace grouping and count projection. If an
archived run or team is active again through a restore/resume path, it remains
visible while active so live work is not hidden.

Archive is a non-destructive visibility action:

- `archiveStoredRun(runId)` writes `archivedAt` in
  `memory/agents/<runId>/run_metadata.json`.
- `archiveStoredTeamRun(teamRunId)` writes `archivedAt` in
  `memory/agent_teams/<teamRunId>/team_run_metadata.json`.
- Archive keeps the run/team metadata, raw traces, projections, member
  directories, and index rows on disk.
- Archive rejects active runs/teams and invalid or path-unsafe ids before
  metadata read/write.
- Existing metadata with no `archivedAt` is visible by default, and metadata
  normalization must preserve unrelated optional fields when archive state is
  written.

Permanent delete remains a separate destructive action. `deleteStoredRun` and
`deleteStoredTeamRun` remove the persisted run/team storage and corresponding
history index entries instead of only hiding the row. The current product slice
does not expose an archived-list or unarchive GraphQL/UI path; archived data
remains retained on disk for future recovery tooling.

## Persistence Files

Memory root:

- `memory/run_history_index.json`
- `memory/team_run_history_index.json`
- `memory/agents/<runId>/...`
- `memory/agent_teams/<teamRunId>/...`

Standalone agent persisted files:

- metadata: `memory/agents/<runId>/run_metadata.json`
- runtime memory artifacts: `memory/agents/<runId>/{raw_traces.jsonl,working_context_snapshot.json,...}`
- segmented raw-trace archive after native compaction or provider-boundary rotation: `memory/agents/<runId>/raw_traces_archive_manifest.json` plus `memory/agents/<runId>/raw_traces_archive/*.jsonl`

Team persisted files:

- team metadata: `memory/agent_teams/<teamRunId>/team_run_metadata.json`
- member runtime memory artifacts: `memory/agent_teams/<teamRunId>/<memberRunId>/{raw_traces.jsonl,working_context_snapshot.json,...}`
- optional member segmented archive: `memory/agent_teams/<teamRunId>/<memberRunId>/raw_traces_archive_manifest.json` plus `raw_traces_archive/*.jsonl`
- team communication projection: `memory/agent_teams/<teamRunId>/team_communication_messages.json`

Important identity/storage rules:

- standalone runs persist an explicit `memoryDir` in agent metadata
- Codex and Claude standalone runs now write storage-only local memory in the same run directory as native AutoByteus runs; native AutoByteus memory remains owned by the native `autobyteus-ts` memory manager
- standalone AutoByteus run ids are stored literally under `memory/agents/<runId>/...`
- new readable standalone AutoByteus run ids are generated through the shared `autobyteus-ts` readable-id formatter, which normalizes whitespace/punctuation into folder-safe slug segments before appending the numeric suffix
- if the normalized standalone agent `name` and `role` collapse to the same value, the readable stem is written once instead of duplicating the segment
- forward-only readable-id normalization does not rename historical persisted run ids; restore continues to use the stored run id
- team members use deterministic `memberRunId` owned by the team aggregate
- `memberRunId` defaults to a readable route slug plus stable hash: `<route_slug>_<16-hex>`
- Codex and Claude team members write storage-only local memory under the member run directory, including single-runtime Claude teams and mixed-runtime members
- runtime-native identifiers remain separate from domain identifiers:
  - AutoByteus native agent id
  - Codex thread id
  - Claude session id

## Projection Model

Projection is runtime-aware and reconstructs a canonical historical replay bundle from persisted runtime-specific artifacts.

Run-history owns the replay bundle contract:

- `conversation`
- `activities`
- `summary`
- `lastActivityAt`

Produced-file Artifacts are not part of the replay bundle, but their historical
read path must resolve the same run identity. `RunFileChangeProjectionService`
uses `AgentRunMetadataService` for standalone runs and team metadata plus
`TeamMemberMemoryLayout` for team-member run ids. This lets
`getRunFileChanges(runId)` and `/runs/:runId/file-change-content` read
AutoByteus/native team-member `agent_teams/<teamRunId>/<memberRunId>/file_changes.json`
without adding a separate team-file route or treating produced files as
message-reference rows.

Team Communication messages are also outside the member replay bundle. Accepted
team `INTER_AGENT_MESSAGE` events are processor input; derived
`TEAM_COMMUNICATION_MESSAGE` events are projected once per team run into
`agent_teams/<teamRunId>/team_communication_messages.json`. Historical Team tab
hydration reads that projection through `getTeamCommunicationMessages(teamRunId)`,
and referenced content opens by persisted message-owned identity at
`/team-runs/:teamRunId/team-communication/messages/:messageId/references/:referenceId/content`.
The member Artifacts tab must not hydrate those reference files as Sent/Received
artifact rows.

The `agent-memory` subsystem no longer owns the canonical replay DTO. It supplies raw traces and memory-inspector views only; run-history is the only subsystem that may normalize those raw traces into the historical replay bundle used by reopen/hydration.

- Local-memory projection reads the complete raw-trace corpus from the declared run or team-member memory directory (complete archive segments plus active records) and is the fallback provider for native AutoByteus and for explicit `memoryDir` fallback reads.
- Codex projection prefers persisted Codex thread history through the Codex history reader, then can fall back to local memory when the runtime-specific history is unavailable.
- Claude projection prefers persisted Claude session history through the Claude history reader, then can fall back to local memory when the runtime-specific history is unavailable.
- `AgentRunViewProjectionService` may merge complementary local-memory rows with runtime-specific provider rows before deciding the projection is complete. This is required when the runtime-native provider is conversation-only (for example Claude session history with no activity rows) and local memory contains lifecycle-derived `activities`, and it also preserves early local trace history alongside later runtime-native history during restored team-member projection. Exact row matches are de-duplicated after merge.

Normalization model:

- Local memory: raw trace rows -> historical replay events -> replay bundle
- Codex preferred path: `thread/read` turns/items -> historical replay events -> replay bundle
- Claude preferred path: session history -> historical replay events -> replay bundle

Local-memory fallback resolves the local run id from the basename of the explicit `memoryDir`, so a team-member replay reads `<memberRunId>` inside `memory/agent_teams/<teamRunId>/...` rather than confusing runtime-native ids with local storage ids. Provider-boundary marker traces are provenance and are ignored as conversation/activity content by the historical replay transformer.

Frontend restore uses that bundle in two sibling hydration paths:

- middle pane: conversation hydration
- right pane: activity hydration
- team pane: Team Communication hydration from
  `getTeamCommunicationMessages(teamRunId)` for message-owned sent/received
  communication records and child reference files

Those sibling paths must stay synchronized. Reopen/hydration code should apply
the projected `conversation` and `activities` from the same replay bundle, or
preserve both existing live surfaces when a subscribed live context is kept. It
must not hydrate projected Activity rows while preserving a different live
conversation, because that creates Activity-only tool calls after restart. For
active team reopen, only newly materialized member contexts may receive
projected Activity rows, and only alongside that member's projected
conversation.

Provider registry:

- `src/run-history/projection/run-projection-provider-registry.ts`

Providers:

- `src/run-history/projection/providers/local-memory-run-view-projection-provider.ts`
- `src/run-history/projection/providers/codex-run-view-projection-provider.ts`
- `src/run-history/projection/providers/claude-run-view-projection-provider.ts`

## Archive / Rotation / Retention Boundaries

This section describes raw-trace segment archives and is separate from the
history-row visibility archive flag documented above.

Native AutoByteus compaction archives compacted raw traces into segmented `native_compaction` archive entries. Codex and Claude provider-boundary handling may rotate settled active raw traces before a normalized, rotation-eligible provider boundary marker into segmented `provider_compaction_boundary` archive entries. Run-history and memory-view readers include only complete archive segments plus active records, dedupe by raw trace id, and ignore pending manifest entries.

The old monolithic `raw_traces_archive.jsonl` path is intentionally not a current read/write target. Historical monolithic archive files are not read under the approved no-compatibility policy.

Segmented archives are not compression or retention. There is still no total-storage retention policy, no archive compression, and no working-context snapshot windowing/retention behavior.

## Team Restore / Projection Contract

For team runs:

1. Team metadata is the source of truth for member routing, member identity, and runtime kind.
2. `memberRouteKey` selects the member within the team.
3. `memberRunId` identifies the persisted child run/storage subtree.
4. `platformAgentRunId` identifies the runtime-native session/thread/agent when the runtime requires one.
5. Team-member projection resolves the member from team metadata first, then delegates to the runtime-specific projection provider.
6. Team-member reopen uses the same replay bundle shape as standalone reopen, including both `conversation` and `activities`.

This keeps create, restore, and projection aligned on the same persisted team/member contract instead of inferring storage or identity later.

Team termination should update run-history activity state only after the backend confirms termination. The frontend then marks the team resume config inactive and refreshes the workspace history tree; failed backend termination should leave the local team runtime and active/inactive cache untouched.
