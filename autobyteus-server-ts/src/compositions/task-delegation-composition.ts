import { TaskDelegation } from "../agent-collaboration/execution/task/task-delegation.js";
import { bindTaskDelegation, unbindTaskDelegation } from "../agent-collaboration/execution/task/task-delegation-binding.js";
import { DelegatedRunStarter } from "../agent-collaboration/execution/delegation/delegated-run-starter.js";
import { getDelegationTree } from "../agent-collaboration/delegation/delegation-tree-binding.js";
import type { TaskExecutionResourcePort } from "../agent-collaboration/execution/task/task-execution-resource-port.js";
import type { AgentRunService } from "../agent-execution/services/agent-run-service.js";
import type { TeamRunService } from "../agent-team-execution/services/team-run-service.js";
import type { CollaborationRootResolver } from "./collaboration-root-resolver.js";
import { bindCrossRunMessageDelivery, CrossRunMessageDelivery, unbindCrossRunMessageDelivery } from "../agent-collaboration/communication/cross-run-message-delivery.js";
import type { ActiveCollaborationRootDirectory } from "../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import { bindCrossRunAddressResolution, CrossRunAddressResolution, unbindCrossRunAddressResolution } from "../agent-collaboration/communication/cross-run-address-resolution.js";
import { RunOwnAgentsReader } from "../run-history/store/run-own-agents-reader.js";
import { bindTaskRunControl, TaskRunControl, unbindTaskRunControl } from "../agent-collaboration/execution/task/task-run-control.js";

/**
 * The process `TaskDelegation` (autobyteus-461 DS-1): every root delegates through it. A new run is created by
 * `DelegatedRunStarter`, its work packet is posted by its own root (resolved like any run's), and a run whose
 * delegation did not go through is ended (a prepared agent run cancelled, a team run ended).
 */
export const composeTaskDelegation = (deps: Readonly<{
  tasks: TaskExecutionResourcePort;
  agentRuns: Pick<AgentRunService, "prepareAgentRun" | "cancelPreparedAgentRun" | "recordCollaborating" | "stopForTaskClosure" | "getAgentRun">;
  teamRuns: Pick<TeamRunService, "createTeamRun" | "terminateTeamRun" | "stopForTaskClosure" | "getActiveTeamRun">;
  rootResolver: CollaborationRootResolver;
  activeRoots: Pick<ActiveCollaborationRootDirectory, "resolve">;
  memoryDir: string;
}>): Readonly<{ release(): void }> => {
  // Contract §2.3 step 2: an address of the run that assigned the sender's Task; §2.4: the sender's address the receiver may use.
  const addresses = new CrossRunAddressResolution({ tree: () => getDelegationTree(), standing: new RunOwnAgentsReader(deps.memoryDir) });
  // DS-2: messages between two runs of this node; the sender is active, the receiver is restored when stopped.
  const crossRun = new CrossRunMessageDelivery({
    senderAddress: (input) => addresses.reachingAddress(input.sender, input.receiverRun),
    tree: () => getDelegationTree(),
    tasks: () => deps.tasks,
    senderRoot: (run) => {
      const root = deps.activeRoots.resolve(run);
      return root?.prepareSendToRun && root.commitSentToRun
        ? { prepareSendToRun: (input) => root.prepareSendToRun!(input), commitSentToRun: (message) => root.commitSentToRun!(message) } : null;
    },
    receiverRoot: async (run) => (await deps.rootResolver.resolveOrRestore(run))?.root ?? null,
  });
  const delegation = new TaskDelegation({
    deliverToRun: (input) => crossRun.route(input),
    tasks: () => deps.tasks,
    tree: () => getDelegationTree(),
    starter: new DelegatedRunStarter({ agentRuns: deps.agentRuns, teamRuns: deps.teamRuns }),
    deliverWorkPacket: async (run, packet) => {
      const resolved = await deps.rootResolver.resolveOrRestore(run);
      if (!resolved || resolved.kind === "agent_org") return { accepted: false, code: "TARGET_NOT_FOUND", message: `Run '${run.rootRunId}' is not available.` };
      return resolved.root.acceptWorkPacket(packet);
    },
    recordCollaborating: (agentRunId, address) => deps.agentRuns.recordCollaborating(agentRunId, address),
    discard: async (run) => {
      if ("agentRunId" in run) await deps.agentRuns.cancelPreparedAgentRun(run.agentRunId);
      else await deps.teamRuns.terminateTeamRun(run.teamRunId);
    },
  });
  bindTaskDelegation(delegation);
  bindCrossRunMessageDelivery(crossRun);
  bindCrossRunAddressResolution(addresses);
  // DS-5: what the Task side asks of a run by its own identity (its closure stop, its own status).
  const control = new TaskRunControl({ agentRuns: deps.agentRuns, teamRuns: deps.teamRuns });
  bindTaskRunControl(control);
  return Object.freeze({ release: () => {
    unbindTaskDelegation(delegation); unbindCrossRunMessageDelivery(crossRun); unbindCrossRunAddressResolution(addresses); unbindTaskRunControl(control);
  } });
};
