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

export const TASK_AGENT_PLACEMENT: AgentRunMemoryPlacement = Object.freeze({ kind: "task_agent" });
