# Agent Team Execution

## Scope

Manages running team runs, member placement metadata, and streaming/history behavior for team activity.

## TS Source

- `src/agent-team-execution/services/agent-team-run-manager.ts`
- `src/services/agent-streaming/agent-team-stream-handler.ts`
- `src/api/graphql/types/agent-team-run.ts`
- `src/run-history/store/team-run-manifest-store.ts`
- `src/run-history/store/team-member-memory-layout-store.ts`
- `src/run-history/store/team-member-run-manifest-store.ts`
- `src/run-history/services/team-member-run-projection-service.ts`
- `src/run-history/services/team-run-history-service.ts`

## Detailed Communication Design

- `../design/agent_team_communication_local_and_distributed.md`

## Team Memory Layout Contract

Canonical team-member memory subtree (all topologies):

- `memory/agent_teams/<teamId>/team_run_manifest.json`
- `memory/agent_teams/<teamId>/<memberAgentId>/run_manifest.json`
- `memory/agent_teams/<teamId>/<memberAgentId>/raw_trace.json`
- `memory/agent_teams/<teamId>/<memberAgentId>/raw_traces_archive.jsonl`

Rules:

- Team member memory is always team-scoped under `memory/agent_teams/<teamId>/<memberAgentId>/...`.
- Single-agent (non-team) memory remains under `memory/agents/<agentId>/...`.
- `team_run_manifest.json` is the source of truth for member bindings (`memberRouteKey`, `memberAgentId`, `hostNodeId`).
- Member `run_manifest.json` is the source of truth for per-member runtime snapshot metadata (`runVersion`, `workspaceRootPath`, `lastKnownStatus`, model/config snapshot).

Topology behavior:

- Local-only team: host stores manifest plus all member subtrees.
- Mixed distributed team: host stores manifest plus host-owned member subtrees; each worker stores only worker-owned member subtrees under the same `teamId`.
- Host-manifest-only distributed team: host stores only manifest; all member subtrees are on workers.
- Nested team: ownership is decided per leaf `memberRouteKey`; persistence path still uses the resolved `memberAgentId`.

## Projection/Restore Contract

- Projection reads the canonical local member subtree first.
- If local subtree is unavailable and binding `hostNodeId` is remote, projection falls back to remote node query by `(teamId, memberAgentId)`.
- Team restore/rerun resolves each member `memoryDir` to canonical `memory/agent_teams/<teamId>/<memberAgentId>`.

## Delete/Remove Contract

- Delete preflight is distributed-authoritative: host probes worker runtime state before cleanup.
- Cleanup is grouped by binding `hostNodeId`.
- Host-local subtree removal is performed locally.
- Worker cleanup uses dedicated history transport endpoints:
  - `POST /internal/distributed/v1/team-history/runtime-state`
  - `POST /internal/distributed/v1/team-history/cleanup`
- Team history index lifecycle transitions to `CLEANUP_PENDING` when remote cleanup is incomplete and finalizes when all ownership groups are cleaned.
