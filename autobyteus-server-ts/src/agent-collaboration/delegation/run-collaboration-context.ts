import type { CollaborationHandoff } from "../domain/collaboration-handoff.js";
import { createAgentRootExecutionIdentity, type RootExecutionIdentity } from "../execution/domain/root-execution-identity.js";
import { runReferenceOf } from "../execution/task/task-execution-resource-port.js";
import type { DelegationTree } from "./delegation-tree.js";

/** An org run's configured placements, from its own file: its definition, its direct agents' addresses, its handoffs. */
export type OrgPlacements = Readonly<{
  orgDefinitionId: string;
  agentAddresses: readonly string[];
  handoffs: readonly CollaborationHandoff[];
}>;

/** Reads an org run's placements from its own file (`null`: no file). Created by the composition; run-history owns the files. */
export interface OrgPlacementsReader {
  orgPlacementsOf(orgRunId: string): Promise<OrgPlacements | null>;
}

/** What an agent run's own agent is for the prompt it reads, and what a copy of an org's configured agent inherits. */
export type AgentRunCollaboration = Readonly<{
  /** `task_agent`: another run delegated this run (its `delegatedFrom`); `standalone_agent`: the user started it. */
  role: "standalone_agent" | "task_agent";
  /**
   * A copy of an org's configured agent (the run was delegated to that agent's address by the org): that address's
   * handoff rules and the org's authored instruction. `null` for any other run.
   */
  placement: Readonly<{ handoffs: readonly CollaborationHandoff[]; instruction: string | null }> | null;
}>;

/**
 * A run's collaboration context, derived from the data (autobyteus-461 design DS-8, SR-058): what hosting used to
 * decide for a delegated run, now that every delegated run is a run of its own. One owner, asked by every kind's member
 * context builder; nothing is stored. Base's texts are kept:
 * - an agent of a delegated agent run is a task agent;
 * - an agent whose run works on a Task an org assigned has the organization line, exactly when address step 2 reaches
 *   the org's agents and teams (`DelegationTree.assignersOfTasksOf`, as `CrossRunAddressResolution` reads it);
 * - a copy of an org's configured agent inherits that address's handoff rules and the org's authored instruction, read
 *   at use from the org's own file and definition, found through the tree.
 */
export class RunCollaborationContext {
  constructor(private readonly dependencies: Readonly<{
    tree: Pick<DelegationTree, "currentTaskOf" | "assignersOfTasksOf">;
    orgs: OrgPlacementsReader;
    /** The org definition's authored instruction, read fresh. */
    orgInstruction(orgDefinitionId: string): Promise<string | null>;
  }>) {}

  /** Whether the run works on a Task an org run assigned (the organization line). */
  inOrganization(run: RootExecutionIdentity): boolean {
    const reference = runReferenceOf(run);
    return reference !== null
      && this.dependencies.tree.assignersOfTasksOf(reference).some((assigner) => assigner.rootSubjectKind === "agent_org");
  }

  /** The collaboration context of an agent run's own agent, from its current Task entry. */
  async ofAgentRun(agentRunId: string): Promise<AgentRunCollaboration> {
    const entry = this.dependencies.tree.currentTaskOf(runReferenceOf(createAgentRootExecutionIdentity(agentRunId))!);
    if (!entry) return Object.freeze({ role: "standalone_agent", placement: null });
    return Object.freeze({ role: "task_agent", placement: await this.placementOf(entry.delegatedFrom.delegatingRun, entry.recipientAddress) });
  }

  /** A copy of an org's configured agent: delegated by the org to one of its direct agents' addresses. */
  private async placementOf(delegatingRun: RootExecutionIdentity, address: string): Promise<AgentRunCollaboration["placement"]> {
    if (delegatingRun.rootSubjectKind !== "agent_org") return null;
    const org = await this.dependencies.orgs.orgPlacementsOf(delegatingRun.rootRunId);
    if (!org || !org.agentAddresses.includes(address)) return null;
    return Object.freeze({
      handoffs: Object.freeze(org.handoffs.filter((handoff) => handoff.from === address)),
      instruction: await this.dependencies.orgInstruction(org.orgDefinitionId),
    });
  }
}
