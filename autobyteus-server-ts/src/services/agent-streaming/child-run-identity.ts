/**
 * A run a run delegated to on this node, by what does not change while it runs (autobyteus-461 SR-056): its address,
 * its run and agents (a team run's coordinator among them), its delegator and when it started. A view's row in base's
 * shape is projected from it and the run's launch details, read fresh (`collaboration-execution-tree-dto-projection.ts`).
 */
export type DelegatedRunIdentity = Readonly<{
  /** Its name under the delegating run: the address it was delegated to (an agent run's own address once stored). */
  address: string;
  /** The agent of the delegating run that delegated to it; absent for a run recorded before its delegator was stored. */
  delegatorAgentRunId?: string;
  startedAt: string;
}> & (
  | Readonly<{ kind: "agent"; agentRunId: string; agentDefinitionId: string | null }>
  | Readonly<{ kind: "agent_team"; teamRunId: string; coordinatorAgentRunId: string;
    members: readonly Readonly<{ address: string; agentRunId: string; agentDefinitionId: string | null }>[] }>
);
import type { DelegatedChild, DelegationIndex } from "../../agent-collaboration/delegation/delegation-index.js";
import type { RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";

/**
 * A delegated run's identity (autobyteus-461 SR-056), from its Task entry and the `DelegationIndex`'s per-run data, read
 * once per run, never from a file per call. `null` when the run's own file could not be read.
 */
export const childRunIdentity = async (child: DelegatedChild, tree: Pick<DelegationIndex, "agentsOf">): Promise<DelegatedRunIdentity | null> => {
  const run: RootExecutionIdentity = "agentRunId" in child.run
    ? { rootSubjectKind: "agent", rootRunId: child.run.agentRunId }
    : { rootSubjectKind: "agent_team", rootRunId: child.run.teamRunId };
  const agents = await tree.agentsOf(run);
  if (!agents.length) return null;
  const common = { delegatorAgentRunId: child.delegatorAgentRunId, startedAt: child.linkedAt };
  const childRun = child.run;
  if ("agentRunId" in childRun) {
    const [agent] = agents;
    // The tree gives a delegated agent run the address it was delegated to until its own is stored.
    if (!agent!.address) throw new Error(`Agent run '${childRun.agentRunId}' has no address.`);
    return Object.freeze({ kind: "agent", ...common, address: agent!.address as never,
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
