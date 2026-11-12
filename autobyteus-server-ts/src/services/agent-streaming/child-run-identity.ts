import type { ChildRunIdentityDto } from "@autobyteus/collaboration-stream-contracts";
import type { DelegatedChild, DelegationTree } from "../../agent-collaboration/delegation/delegation-tree.js";
import type { RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";

/**
 * A child row's identity (autobyteus-461 SR-055, SR-056): what does not change while the child runs (its address, its
 * run and agents with their definitions, a team run's coordinator, its delegator and when it started), from its Task entry and the
 * `DelegationTree`'s per-run data, read once per run, never from a file per call. The view's row adds the child's launch
 * details, read fresh (`delegatedChildDto`); the listed-runs poll carries the identity alone. `null` when the child's own
 * file could not be read.
 */
export const childRunIdentity = async (child: DelegatedChild, tree: Pick<DelegationTree, "agentsOf">): Promise<ChildRunIdentityDto | null> => {
  const run: RootExecutionIdentity = "agentRunId" in child.run
    ? { rootSubjectKind: "agent", rootRunId: child.run.agentRunId }
    : { rootSubjectKind: "agent_team", rootRunId: child.run.teamRunId };
  const agents = await tree.agentsOf(run);
  if (!agents.length) return null;
  const common = { delegatorAgentRunId: child.delegatorAgentRunId, startedAt: child.linkedAt };
  const childRun = child.run;
  if ("agentRunId" in childRun) {
    const [agent] = agents;
    return Object.freeze({ kind: "agent", ...common, address: (agent!.address ?? child.recipientAddress) as never,
      agentRunId: childRun.agentRunId, agentDefinitionId: agent!.agentDefinitionId });
  }
  return Object.freeze({ kind: "agent_team", ...common, address: child.recipientAddress as never, teamRunId: childRun.teamRunId,
    // The member the delegation went to is the team run's coordinator (its Task entry's entry agent).
    coordinatorAgentRunId: child.entryAgentRunId,
    members: agents.map((agent) => {
      // A team run's members are stored at their addresses (the team file's schema requires one).
      if (!agent.address) throw new Error(`Member '${agent.agentRunId}' of team run '${childRun.teamRunId}' has no address.`);
      return { address: agent.address as never, agentRunId: agent.agentRunId, agentDefinitionId: agent.agentDefinitionId };
    }) });
};
