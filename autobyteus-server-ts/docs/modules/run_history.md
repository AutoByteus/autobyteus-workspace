# Run History (TypeScript)

## Scope

`src/run-history` owns persisted execution history, resume metadata, workspace history listing, and read-model projection for standalone agent runs and team runs.

## Responsibilities

- Persist standalone agent run resume metadata and the V2 standalone history catalog index.
- Persist team run metadata and the V2 team history catalog index.
- Keep standalone index mutation behind `AgentRunHistoryCatalogService`; normal runtime, GraphQL, and lifecycle code must not rewrite `run_history_index.json` directly.
- Keep team index mutation behind `TeamRunHistoryCatalogService`; normal runtime, GraphQL, and lifecycle code must not rewrite `team_run_history_index.json` directly.
- Keep legacy/partial standalone and team index repair explicit and bounded to startup app-data migrations, plus the standalone manual migration script; normal history listing must not perform metadata-directory repair scans.
- Expose resume configuration for stored runs:
  - agent: `agent-run-resume-config-service.ts`
  - team: `team-run-history-service.ts#getTeamRunResumeConfig(...)`
- Keep resume configuration truthful about active vs inactive state. For standalone agent runs, frontend follow-up sends should not restore directly; the backend `SEND_MESSAGE` command coordinator owns restore/start/send lifecycle. WebSocket connection can attach to a durable run identity and surface status projection without restoring the runtime. Team follow-up sends remain owned by the team restore/resolve boundary.
- Project standalone visible status through `AgentRunStatusProjectionService`, with precedence `COMMAND_OVERLAY` first, active runtime second, prepared/historical metadata fallback third.
- Normalize local application-owned replay traces into the canonical run-history replay bundle:
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
standalone agent runs whose V2 catalog row contains `archivedAt` and inactive
team runs whose V2 catalog row contains `archivedAt` before workspace grouping
and count projection. If an archived run or team is active again through a
restore/resume path, it remains visible while active so live work is not hidden.

Archive is a non-destructive visibility action:

- `archiveStoredRun(runId)` writes `archivedAt` on the V2 standalone
  catalog row in `memory/run_history_index.json` through
  `AgentRunHistoryCatalogService`; it does not add standalone archive state to
  `memory/agents/<runId>/run_metadata.json`.
- `archiveStoredTeamRun(teamRunId)` writes `archivedAt` on the V2 team catalog
  row in `memory/team_run_history_index.json` through
  `TeamRunHistoryCatalogService`; it does not add new archive state to
  `memory/agent_teams/<teamRunId>/team_run_metadata.json`.
- Archive keeps the run/team metadata, raw traces, projections, member
  directories, and catalog/index rows on disk.
- Archive rejects active runs/teams and invalid or path-unsafe ids before
  catalog or metadata read/write.
- Existing standalone or team catalog rows with no `archivedAt` are visible by
  default.

Permanent delete remains a separate destructive action. `deleteStoredRun` and
`deleteStoredTeamRun` remove the persisted run/team storage and corresponding
history index entries instead of only hiding the row. The current product slice
does not expose an archived-list or unarchive GraphQL/UI path; archived data
remains retained on disk for future recovery tooling.

## Standalone Status Projection And Prepared Identities

Standalone workspace history rows separate durable catalog facts from live
runtime projection. The standalone GraphQL history item exposes these catalog
facts from the V2 index:

- `runId`
- `summary`
- `createdAt`
- `archivedAt`
- `terminatedAt`

It also exposes list-time status projection fields:

- `status`: public UI status (`offline`, `initializing`, `idle`, `running`, or
  `error`).
- `isActive`: whether the row currently represents active/current work for
  visibility and archive filtering.
- `shouldConnectStream`: whether the frontend should connect to
  `/ws/agent/:runId` even when there is not yet an active runtime subject, for
  example while a command overlay is initializing.
- `statusSource`: `COMMAND_OVERLAY`, `ACTIVE_RUNTIME`, `PREPARED_IDENTITY`,
  `HISTORICAL_METADATA`, `TERMINATED_METADATA`, or `MISSING`.

Standalone history rows no longer expose or persist `lastKnownStatus`,
`lastActivityAt`, or `activationState`. Live status is runtime/command-overlay
state; the history catalog is not a durable status log. Projection precedence is
command overlay first, active runtime second, and prepared/historical metadata
fallback third. A command overlay `initializing` projects as active and stream
connectable with `statusSource=COMMAND_OVERLAY`; a command overlay `error`
projects as non-interruptible `error`. If a row has `terminatedAt` and no active
projection, the list response reports `status=offline` and
`statusSource=TERMINATED_METADATA`.

## Team Status Projection And V2 Catalog Rows

Team workspace history rows also separate durable catalog facts from live
runtime projection. The team GraphQL history item exposes these catalog facts
from `memory/team_run_history_index.json`:

- `teamRunId`
- `teamDefinitionId`
- `teamDefinitionName`
- `workspaceRootPath`
- `summary`
- `createdAt`
- `archivedAt`
- `terminatedAt`

It also exposes list-time projection fields:

- `status`: aggregate public team status (`offline`, `initializing`, `idle`,
  `running`, or `error`).
- `isActive`: whether the team currently has an active runtime.
- `members`: flat leaf-agent member status snapshots derived from current
  runtime state and metadata.
- `memberTree`: the persisted recursive topology used for reopening and nested
  team display.

Team history rows no longer expose or persist catalog `lastKnownStatus`,
`lastActivityAt`, `deleteLifecycle`, or a file-level `version` wrapper. Team
metadata no longer persists `updatedAt`; stable metadata facts are
`teamRunId`, `teamDefinitionId`, `teamDefinitionName`,
`coordinatorMemberRouteKey`, `createdAt`, optional `archivedAt`, and
`memberTree`. `TeamRunStatusProjectionService` derives aggregate and member
status from the active team runtime manager at list time. If a team row has no
active runtime, it projects as `offline`; the catalog remains a durable history
list, not a status log.

Prepared-new run identities are explicit metadata facts, not inferred from a
missing `platformAgentRunId` and not represented by a persisted
`activationState`. Prepared metadata stores `preparedAt`, `preparedExpiresAt`,
`platformAgentRunId: null`, resume configuration, and the memory directory. A
prepared identity has a memory directory and V2 catalog row, but no runtime
until the first backend-owned `SEND_MESSAGE` activates it. Activation records
`startedAt` and the platform runtime id when available while preserving the
catalog row. GraphQL `prepareAgentRun` may return `activationState: "PREPARED"`
as a launch API response field, but that value is not a stored standalone
history or metadata field. Explicit cancellation and stale-prepared cleanup
remove only unactivated prepared identities.

## Persistence Files

Memory root:

- `memory/run_history_index.json`
- `memory/team_run_history_index.json`
- `memory/agents/<runId>/...`
- `memory/agent_teams/<teamRunId>/...`

Standalone agent persisted files:

- V2 catalog index: `memory/run_history_index.json`, with rows containing only
  `runId`, `agentDefinitionId`, `agentName`, `workspaceRootPath`, `summary`,
  `createdAt`, `archivedAt`, and `terminatedAt`
- metadata: `memory/agents/<runId>/run_metadata.json`, containing resume/config
  and prepared/start facts such as `runId`, `agentDefinitionId`,
  `workspaceRootPath`, `memoryDir`, `runtimeKind`, `llmModelIdentifier`,
  `llmConfig`, `autoExecuteTools`, `skillAccessMode`, `platformAgentRunId`,
  `preparedAt`, `preparedExpiresAt`, `startedAt`, and optional
  `applicationExecutionContext`
- runtime memory artifacts: `memory/agents/<runId>/{raw_traces.jsonl,working_context_snapshot.json,...}`
- segmented raw-trace archive after native compaction or provider-boundary rotation: `memory/agents/<runId>/raw_traces_archive_manifest.json` plus `memory/agents/<runId>/raw_traces_archive/*.jsonl`

Team persisted files:

- V2 team catalog index: `memory/team_run_history_index.json`, with rows
  containing only `teamRunId`, `teamDefinitionId`, `teamDefinitionName`,
  `workspaceRootPath`, `summary`, `createdAt`, `archivedAt`, and
  `terminatedAt`
- team metadata: `memory/agent_teams/<teamRunId>/team_run_metadata.json`,
  containing resume/config/topology and stable lifecycle facts:
  `teamRunId`, `teamDefinitionId`, `teamDefinitionName`,
  `coordinatorMemberRouteKey`, `createdAt`, optional `archivedAt`, and
  recursive `memberTree`
- member runtime memory artifacts: `memory/agent_teams/<teamRunId>/<memberRunId>/{raw_traces.jsonl,working_context_snapshot.json,...}`
- optional member segmented archive: `memory/agent_teams/<teamRunId>/<memberRunId>/raw_traces_archive_manifest.json` plus `raw_traces_archive/*.jsonl`
- team communication projection: `memory/agent_teams/<teamRunId>/team_communication_messages.json`

Important identity/storage rules:

- `AgentRunHistoryCatalogService` is the normal semantic owner for standalone
  catalog mutations: prepare/create, first/explicit summary update,
  archive/unarchive, terminate, delete/cancel, and catalog flush
- `TeamRunHistoryCatalogService` is the normal semantic owner for team catalog
  mutations: create/restore, first/explicit summary update,
  archive/unarchive, terminate, delete/cancel, and catalog flush
- ordinary message activity and live status transitions must not rewrite
  `memory/run_history_index.json` or `memory/team_run_history_index.json`
- normal history listing reads the V2 index/in-memory catalog and applies live
  status projection; it does not scan every `memory/agents/*/run_metadata.json`
  or `memory/agent_teams/*/team_run_metadata.json` to repair missing rows
- normal team history listing starts from indexed team catalog rows and reads
  `team_run_metadata.json` only for those indexed team-run ids to project
  topology/members; that row-scoped metadata read is not a repair scan
- required startup app-data migration
  `TeamRunMetadataMemberTreeMigration` is the prerequisite that canonicalizes
  legacy flat team metadata into recursive `memberTree`
- required startup app-data migration
  `TeamRunHistoryIndexV2AppDataMigration` is the primary team
  legacy/partial-index repair boundary; it runs after member-tree metadata
  migration, scans team metadata once under the app-data migration runner,
  writes a plain V2 row-array index, creates a backup of the previous index,
  records success/warnings/failures/retry state in `app_data_migration_records`,
  and resets in-process team catalog state after writing
- required startup app-data migration
  `RunHistoryIndexV2AppDataMigration` is the primary legacy/partial-index
  repair boundary; it scans metadata once under the app-data migration runner,
  writes a plain V2 row-array index, creates a backup of the previous index,
  records success/warnings/failures/retry state in `app_data_migration_records`,
  and resets in-process catalog state after writing
- manual fallback repair belongs to
  `scripts/migrate-agent-run-history-index-v2.mjs`; see
  `scripts/run-history-index-migration.md` before running cleanup against old
  memory directories
- standalone runs persist an explicit `memoryDir` in agent metadata
- Codex and Claude standalone runs now write storage-only local memory in the same run directory as native AutoByteus runs; native AutoByteus memory remains owned by the native `autobyteus-ts` memory manager
- standalone AutoByteus run ids are stored literally under `memory/agents/<runId>/...`
- new readable standalone AutoByteus run ids are generated through the shared `autobyteus-ts` readable-id formatter, which normalizes whitespace/punctuation into folder-safe slug segments before appending the numeric suffix
- if the normalized standalone agent `name` and `role` collapse to the same value, the readable stem is written once instead of duplicating the segment
- forward-only readable-id normalization does not rename historical persisted run ids; restore continues to use the stored run id
- team members use deterministic `memberRunId` owned by the team aggregate
- team member identity is path-based:
  - `memberPath` is the canonical nested path array
  - `memberRouteKey` is the normalized slash-delimited route key derived from
    that path
  - bare `memberName` is display/top-level identity and is not sufficient for
    duplicate nested leaf names
- `memberRunId` defaults to a readable route slug plus stable hash: `<route_slug>_<16-hex>`
- Codex and Claude team members write storage-only local memory under the member run directory, including single-runtime Claude teams and mixed-runtime members
- runtime-native identifiers remain separate from domain identifiers:
  - AutoByteus native agent id
  - Codex thread id
  - Claude session id

Team metadata now stores a recursive `memberTree` instead of a flat member list.
Each member has `memberKind`:

- `agent` nodes hold runtime kind, runtime-native id, workspace/model/config
  data, and the member storage id.
- `agent_team` nodes hold the child team definition id, optional restored child
  `teamRunId`, child coordinator route key, and another `memberTree`.

Flat leaf-agent views are derived through `team-run-metadata-flattener.ts` for
projection/search consumers. The derived flat view is not authoritative for
restore topology.

Nested child team runs are not independent workspace-history rows. Their child
`teamRunId` is retained on the parent subteam metadata node for restore and
projection, while default workspace history lists the parent team run and its
recursive member tree.

## Projection Model

Normal UI history projection is local-replay authoritative for every runtime.
`getRunProjection(runId)` and
`getTeamMemberRunProjection(teamRunId, memberRouteKey)` read the
application-owned raw/replay trace corpus and convert it into the canonical
run-history replay bundle. Runtime-native history providers are not selected,
merged, or used as fallback by the normal display path. If local replay history
is absent or incomplete, the UI projection may be empty or incomplete.

Run-history owns the replay bundle contract:

- `conversation`
- `activities`
- `summary`
- `lastActivityAt`

The `agent-memory` subsystem no longer owns the canonical replay DTO. It
supplies raw traces and memory-inspector views only; run-history is the only
subsystem that may normalize those raw traces into the historical replay bundle
used by reopen/hydration.

Local replay normalization model:

```text
standalone run metadata -> memoryDir/runId -> raw trace corpus -> historical replay events -> replay bundle
team member metadata -> member memoryDir -> raw trace corpus -> historical replay events -> replay bundle
```

- `AgentRunViewProjectionService` owns the normal UI source policy and always
  delegates to `LocalMemoryRunViewProjectionProvider` for display projection,
  regardless of `runtimeKind` (`autobyteus`, `codex_app_server`,
  `claude_agent_sdk`, or future runtimes).
- `TeamMemberRunViewProjectionService` resolves team/member metadata, including
  the member memory directory, then delegates to `AgentRunViewProjectionService`
  so team members use the same local replay display path as standalone runs.
- `LocalMemoryRunViewProjectionProvider` reads the complete raw-trace corpus
  from the declared run or team-member memory directory (complete archive
  segments plus active records). Explicit `memoryDir` basenames keep local run
  ids aligned with storage, so a team-member replay reads `<memberRunId>` inside
  `memory/agent_teams/<teamRunId>/...` rather than confusing runtime-native ids
  with local storage ids. Provider-boundary marker traces are provenance and
  are ignored as conversation/activity content by the historical replay
  transformer.
- `RuntimeMemoryEventAccumulator` owns the live event-to-raw-trace write
  boundary for runtime streams. When a same-turn reasoning segment is still
  open and the next visible write arrives (tool call, terminal tool result,
  assistant text, or assistant-complete output), the accumulator flushes that
  reasoning first so reload projection preserves the live ordering before tool
  cards or assistant text. `TURN_COMPLETED` still flushes pending reasoning, but
  a run that ends with open reasoning and no later visible write or turn
  completion can still have incomplete local replay by design.
- Runtime-native providers such as `CodexRunViewProjectionProvider` and
  `ClaudeRunViewProjectionProvider` are diagnostic utilities only. They are not
  reachable from normal `getRunProjection` / `getTeamMemberRunProjection` UI
  history and must not be used to recover missing local display rows.
- Local replay is the only display source, so there is no local/native
  transcript reconciliation for focused history reload.

Team rows keep their existing opening/coordinator-title behavior. Team
follow-up activity should refresh live status and selected-context activity in
memory without rewriting durable team catalog activity/status fields or
changing a stable non-empty title.

Produced-file Artifacts are not part of the replay bundle, but their historical
read path must resolve the same run identity. `RunFileChangeProjectionService`
uses `AgentRunMetadataService` for standalone runs and team metadata plus
`TeamMemberMemoryLayout` for team-member run ids. This lets
`getRunFileChanges(runId)` and `/runs/:runId/file-change-content` read
AutoByteus/native team-member `agent_teams/<teamRunId>/<memberRunId>/file_changes.json`
without adding a separate team-file route or treating produced files as
message-reference rows.

Team Communication messages are also outside the member replay bundle. Accepted
team communication events are processor input; derived
`TEAM_COMMUNICATION_MESSAGE` events are projected once per team run into
`agent_teams/<teamRunId>/team_communication_messages.json`. Historical Team tab
hydration reads that projection through `getTeamCommunicationMessages(teamRunId)`,
and referenced content opens by persisted message-owned identity at
`/team-runs/:teamRunId/team-communication/messages/:messageId/references/:referenceId/content`.
The projection stores sender and receiver `memberKind`, `memberPath`,
`memberRouteKey`, and optional `representedSubTeam` metadata. Messages to a
subteam representative remain attributable to the actual leaf path while showing
the represented subteam, and child-to-parent reports keep the sender's subteam
representation in restored Team Messages. The member Artifacts tab must not
hydrate those reference files as Sent/Received artifact rows.

The `agent-memory` subsystem no longer owns the canonical replay DTO. It supplies
raw traces and memory-inspector views only; run-history is the only subsystem
that may normalize those raw traces into the historical replay bundle used by
reopen/hydration.

Local replay is the display authority for normal run-history UI. Codex
thread-history replay and other runtime-native replay providers may still be
useful for diagnostics and provider protocol investigation, but they are not
reachable from normal `getRunProjection` / `getTeamMemberRunProjection` UI
history and must not be used to recover missing display rows. Missing Codex,
Claude, or AutoByteus display rows should be fixed by ensuring live normalized
events and local raw traces are written correctly, not by merging native runtime
history into UI projection.

Projection dedupe is identity-aware at the run-history projection boundary. Rows
with explicit message or tool invocation identity are merged by that identity;
semantic duplicates with one missing timestamp may merge into the richer row.
Repeated user/assistant rows that have no explicit identity and no timestamp are
preserved as separate rows so repeated direct messages do not disappear during
restore/open.

Normalization model:

- Local memory: raw trace rows -> historical replay events -> replay bundle

Local-memory projection resolves the local run id from the basename of the
explicit `memoryDir`, so a team-member replay reads `<memberRunId>` inside
`memory/agent_teams/<teamRunId>/...` rather than confusing runtime-native ids
with local storage ids. Provider-boundary marker traces are provenance and are
ignored as conversation/activity content by the historical replay transformer.


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

Projection files:

- `src/run-history/projection/providers/local-memory-run-view-projection-provider.ts`
- `src/run-history/projection/transformers/raw-trace-to-historical-replay-events.ts`
- `src/run-history/services/agent-run-view-projection-service.ts`
- `src/run-history/services/team-member-run-view-projection-service.ts`

Runtime-native diagnostic utilities:

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

1. Recursive `memberTree` metadata is the source of truth for member routing,
   member identity, topology, and runtime kind.
2. `memberPath` / `memberRouteKey` select the member within the team tree.
3. `memberRunId` identifies the persisted child run/storage subtree.
4. `platformAgentRunId` identifies the runtime-native session/thread/agent when the runtime requires one.
5. `agent_team` nodes record the child `teamRunId` and child tree used to
   restore nested mixed-team handles on demand.
6. Team-member projection resolves the member from recursive team metadata first,
   then delegates metadata, including the team-member memory directory, to
   `AgentRunViewProjectionService` for the local replay display path.
7. Codex and Claude team-member projection use the same local member memory
   directory path as AutoByteus; they do not preload, merge, or fallback to
   runtime-native provider projection.
7. Team-member reopen uses the same replay bundle shape as standalone reopen, including both `conversation` and `activities`.

This keeps create, restore, and projection aligned on the same persisted team/member contract instead of inferring storage or identity later.

Unsupported historical flat team metadata is not migrated or inferred into a
nested topology during restore. If the tree was not recorded, restore fails
clearly instead of guessing path ownership.

Team termination should update run-history activity state only after the backend confirms termination. The frontend then marks the team resume config inactive and refreshes the workspace history tree; failed backend termination should leave the local team runtime and active/inactive cache untouched.
