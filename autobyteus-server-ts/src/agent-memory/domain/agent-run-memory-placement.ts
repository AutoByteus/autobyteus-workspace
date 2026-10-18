import type { RootExecutionPhysicalScope } from "../../agent-collaboration/execution/domain/root-execution-identity.js";

/**
 * Where one agent's memory directory is (memory-layout contract L1). Writers decide it when they build
 * an agent; readers derive it from the execution index with `placementForAgentChain`. Both resolve the
 * directory through `AgentMemoryLayout.getAgentRunMemoryDirPath`.
 *
 * - `run_part`: a part of a run the user started (a standalone host's child placement, a team run's
 *   member, an organization's agent or mounted-team member): inside that run's folder, by physical scope.
 * - `task_agent`: a task agent is a normal run: `agents/<agentRunId>/`.
 * - `task_agent_team_member`: a member of a task agent team: `agent_teams/<teamRunId>/<agentRunId>/`
 *   (teams are flat).
 */
export type AgentRunMemoryPlacement =
  | Readonly<{ kind: "run_part"; scope: RootExecutionPhysicalScope }>
  | Readonly<{ kind: "task_agent" }>
  | Readonly<{ kind: "task_agent_team_member"; teamRunId: string }>;

/** One task execution of an execution index's chain for an agent (its own, then enclosing ones outward). */
export type AgentTaskExecutionChainEntry =
  | Readonly<{ kind: "agent"; agentRunId: string }>
  | Readonly<{ kind: "team"; teamRunId: string }>;

export const runPartPlacement = (scope: RootExecutionPhysicalScope): AgentRunMemoryPlacement =>
  Object.freeze({ kind: "run_part", scope });

export const TASK_AGENT_PLACEMENT: AgentRunMemoryPlacement = Object.freeze({ kind: "task_agent" });

export const taskAgentTeamMemberPlacement = (teamRunId: string): AgentRunMemoryPlacement => {
  const normalized = teamRunId.trim();
  if (!normalized) throw new Error("teamRunId is required.");
  return Object.freeze({ kind: "task_agent_team_member", teamRunId: normalized });
};

/**
 * The placement of `agentRunId` from its index chain (`listTaskExecutionChainForAgent`): the innermost
 * task execution decides — the agent's own (a task agent) or its task agent team (a member); an agent in
 * no task execution is a part of its run, at `scope`.
 */
export const placementForAgentChain = (
  agentRunId: string,
  chain: readonly AgentTaskExecutionChainEntry[],
  scope: RootExecutionPhysicalScope,
): AgentRunMemoryPlacement => {
  const innermost = chain[0];
  if (!innermost) return runPartPlacement(scope);
  if (innermost.kind === "team") return taskAgentTeamMemberPlacement(innermost.teamRunId);
  if (innermost.agentRunId !== agentRunId) {
    throw new Error(`Task execution chain of AgentRun '${agentRunId}' starts with another AgentRun '${innermost.agentRunId}'.`);
  }
  return TASK_AGENT_PLACEMENT;
};
