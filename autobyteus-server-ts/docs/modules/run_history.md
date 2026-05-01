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
- `deleteStoredRun`

Team operations:

- `getTeamRunResumeConfig`
- `getTeamMemberRunProjection`
- `deleteStoredTeamRun`

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

The `agent-memory` subsystem no longer owns the canonical replay DTO. It supplies raw traces and memory-inspector views only; run-history is the only subsystem that may normalize those raw traces into the historical replay bundle used by reopen/hydration.

- Local-memory projection reads the complete raw-trace corpus from the declared run or team-member memory directory (complete archive segments plus active records) and is the fallback provider for native AutoByteus and for explicit `memoryDir` fallback reads.
- Codex projection prefers persisted Codex thread history through the Codex history reader, then can fall back to local memory when the runtime-specific history is unavailable.
- Claude projection prefers persisted Claude session history through the Claude history reader, then can fall back to local memory when the runtime-specific history is unavailable.

Normalization model:

- Local memory: raw trace rows -> historical replay events -> replay bundle
- Codex preferred path: `thread/read` turns/items -> historical replay events -> replay bundle
- Claude preferred path: session history -> historical replay events -> replay bundle

Local-memory fallback resolves the local run id from the basename of the explicit `memoryDir`, so a team-member replay reads `<memberRunId>` inside `memory/agent_teams/<teamRunId>/...` rather than confusing runtime-native ids with local storage ids. Provider-boundary marker traces are provenance and are ignored as conversation/activity content by the historical replay transformer.

Frontend restore uses that bundle in two sibling hydration paths:

- middle pane: conversation hydration
- right pane: activity hydration

Provider registry:

- `src/run-history/projection/run-projection-provider-registry.ts`

Providers:

- `src/run-history/projection/providers/local-memory-run-view-projection-provider.ts`
- `src/run-history/projection/providers/codex-run-view-projection-provider.ts`
- `src/run-history/projection/providers/claude-run-view-projection-provider.ts`

## Archive / Rotation / Retention Boundaries

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
