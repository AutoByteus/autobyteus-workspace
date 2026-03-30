# Run History (TypeScript)

## Scope

`src/run-history` owns persisted execution history, resume metadata, workspace history listing, and read-model projection for standalone agent runs and team runs.

## Responsibilities

- Persist agent run metadata and the agent history index.
- Persist team run metadata and the team history index.
- Expose resume configuration for stored runs:
  - agent: `agent-run-resume-config-service.ts`
  - team: `team-run-history-service.ts#getTeamRunResumeConfig(...)`
- Build runtime-specific conversation projections:
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

Team persisted files:

- team metadata: `memory/agent_teams/<teamRunId>/team_run_metadata.json`
- member runtime memory artifacts: `memory/agent_teams/<teamRunId>/<memberRunId>/{raw_traces.jsonl,working_context_snapshot.json,...}`

Important identity/storage rules:

- standalone runs persist an explicit `memoryDir` in agent metadata
- team members use deterministic `memberRunId` owned by the team aggregate
- `memberRunId` defaults to a readable route slug plus stable hash: `<route_slug>_<16-hex>`
- runtime-native identifiers remain separate from domain identifiers:
  - AutoByteus native agent id
  - Codex thread id
  - Claude session id

## Projection Model

Projection is runtime-aware and reconstructs a common conversation view from persisted runtime-specific artifacts.

- AutoByteus projection reads stored memory artifacts from the declared run or team-member memory directory.
- Codex projection reads persisted Codex thread history through the Codex history reader.
- Claude projection reads persisted Claude session history through the Claude history reader.

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

This keeps create, restore, and projection aligned on the same persisted team/member contract instead of inferring storage or identity later.
