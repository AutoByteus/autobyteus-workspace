# Run History (TypeScript)

## Scope

`src/run-history` owns persisted execution history, resume metadata, workspace history listing, and read-model projection for standalone agent runs and team runs.

## Responsibilities

- Persist agent run metadata and the agent history index.
- Persist team run metadata and the team history index.
- Expose resume configuration for stored runs:
  - agent: `agent-run-resume-config-service.ts`
  - team: `team-run-history-service.ts#getTeamRunResumeConfig(...)`
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
- optional archive after pruning/compaction: `memory/agents/<runId>/raw_traces_archive.jsonl`

Team persisted files:

- team metadata: `memory/agent_teams/<teamRunId>/team_run_metadata.json`
- member runtime memory artifacts: `memory/agent_teams/<teamRunId>/<memberRunId>/{raw_traces.jsonl,working_context_snapshot.json,...}`

Important identity/storage rules:

- standalone runs persist an explicit `memoryDir` in agent metadata
- standalone AutoByteus run ids are stored literally under `memory/agents/<runId>/...`
- new readable standalone AutoByteus run ids are generated through the shared `autobyteus-ts` readable-id formatter, which normalizes whitespace/punctuation into folder-safe slug segments before appending the numeric suffix
- if the normalized standalone agent `name` and `role` collapse to the same value, the readable stem is written once instead of duplicating the segment
- forward-only readable-id normalization does not rename historical persisted run ids; restore continues to use the stored run id
- team members use deterministic `memberRunId` owned by the team aggregate
- `memberRunId` defaults to a readable route slug plus stable hash: `<route_slug>_<16-hex>`
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

- AutoByteus projection reads stored memory artifacts from the declared run or team-member memory directory.
- Codex projection reads persisted Codex thread history through the Codex history reader.
- Claude projection reads persisted Claude session history through the Claude history reader.

Normalization model:

- AutoByteus: raw trace rows -> historical replay events -> replay bundle
- Codex: `thread/read` turns/items -> historical replay events -> replay bundle
- Claude: session history -> historical replay events -> replay bundle

Frontend restore uses that bundle in two sibling hydration paths:

- middle pane: conversation hydration
- right pane: activity hydration

Provider registry:

- `src/run-history/projection/run-projection-provider-registry.ts`

Providers:

- `src/run-history/projection/providers/autobyteus-run-view-projection-provider.ts`
- `src/run-history/projection/providers/codex-run-view-projection-provider.ts`
- `src/run-history/projection/providers/claude-run-view-projection-provider.ts`

## Team Restore / Projection Contract

For team runs:

1. Team metadata is the source of truth for member routing, member identity, and runtime kind.
2. `memberRouteKey` selects the member within the team.
3. `memberRunId` identifies the persisted child run/storage subtree.
4. `platformAgentRunId` identifies the runtime-native session/thread/agent when the runtime requires one.
5. Team-member projection resolves the member from team metadata first, then delegates to the runtime-specific projection provider.
6. Team-member reopen uses the same replay bundle shape as standalone reopen, including both `conversation` and `activities`.

This keeps create, restore, and projection aligned on the same persisted team/member contract instead of inferring storage or identity later.
