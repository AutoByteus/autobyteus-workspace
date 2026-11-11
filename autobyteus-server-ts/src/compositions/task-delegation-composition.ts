import { TaskDelegation } from "../agent-collaboration/execution/task/task-delegation.js";
import { bindTaskDelegation, unbindTaskDelegation } from "../agent-collaboration/execution/task/task-delegation-binding.js";
import { DelegatedRunStarter } from "../agent-collaboration/execution/delegation/delegated-run-starter.js";
import { getDelegationTree } from "../agent-collaboration/delegation/delegation-tree-binding.js";
import type { TaskExecutionResourcePort } from "../agent-collaboration/execution/task/task-execution-resource-port.js";
import type { AgentRunService } from "../agent-execution/services/agent-run-service.js";
import type { TeamRunService } from "../agent-team-execution/services/team-run-service.js";
import type { CollaborationRootResolver } from "./collaboration-root-resolver.js";

/**
 * The process `TaskDelegation` (autobyteus-461 DS-1): every root delegates through it. A new run is created by
 * `DelegatedRunStarter`, its work packet is posted by its own root (resolved like any run's), and a run whose
 * delegation did not go through is ended (a prepared agent run cancelled, a team run ended).
 */
export const composeTaskDelegation = (deps: Readonly<{
  tasks: TaskExecutionResourcePort;
  agentRuns: Pick<AgentRunService, "prepareAgentRun" | "cancelPreparedAgentRun">;
  teamRuns: Pick<TeamRunService, "createTeamRun" | "terminateTeamRun">;
  rootResolver: CollaborationRootResolver;
}>): Readonly<{ release(): void }> => {
  const delegation = new TaskDelegation({
    tasks: () => deps.tasks,
    tree: () => getDelegationTree(),
    starter: new DelegatedRunStarter({ agentRuns: deps.agentRuns, teamRuns: deps.teamRuns }),
    deliverWorkPacket: async (run, packet) => {
      const resolved = await deps.rootResolver.resolveOrRestore(run);
      if (!resolved || resolved.kind === "agent_org") return { accepted: false, code: "TARGET_NOT_FOUND", message: `Run '${run.rootRunId}' is not available.` };
      return resolved.root.acceptWorkPacket(packet);
    },
    discard: async (run) => {
      if ("agentRunId" in run) await deps.agentRuns.cancelPreparedAgentRun(run.agentRunId);
      else await deps.teamRuns.terminateTeamRun(run.teamRunId);
    },
  });
  bindTaskDelegation(delegation);
  return Object.freeze({ release: () => unbindTaskDelegation(delegation) });
};
