import type { CatalogDefinitionRef } from "../collaborators/catalog-address-map.js";
import type { DelegationTree } from "../delegation/delegation-tree.js";
import type { AgentTeamAddress } from "../domain/agent-team-address.js";
import type { CollaborationHandoff } from "../domain/collaboration-handoff.js";
import type { ConfiguredAgentExecutionNode, ConfiguredTeamExecutionNode } from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { RootExecutionIdentity } from "../execution/domain/root-execution-identity.js";
import { runReferenceOf } from "../execution/task/task-execution-resource-port.js";
import { sourcedPlacement, type DelegationPlacement } from "../collaborators/catalog-delegation.js";
import { configuredPlacementSource } from "../collaborators/collaborator-source-projector.js";

/**
 * A configured placement of a team or org run, from its own file: the node a copy at its address starts from, and the
 * run's handoffs (a team placement's members keep theirs). Created by the composition; run-history owns the files.
 */
export interface ConfiguredPlacementReader {
  configuredPlacementOf(run: RootExecutionIdentity, address: string): Promise<Readonly<{
    node: ConfiguredAgentExecutionNode | ConfiguredTeamExecutionNode;
    handoffs: readonly CollaborationHandoff[];
  }> | null>;
}

/**
 * One agent or team a run reaches by address step 2 (contract §2.3): at its address in an assigner's run, the agent
 * run that receives a message there, its definition (`null` when unknown), and its rank, as at base for a hosted copy:
 * an agent run's own agent (an agent the user started) is `run_agent`; a team's or org's configured placement is
 * `configured`.
 */
export type ReachedPlacement = Readonly<{
  address: AgentTeamAddress;
  agentRunId: string;
  ref: CatalogDefinitionRef | null;
  rank: "run_agent" | "configured";
  assigner: RootExecutionIdentity;
}>;

/**
 * What a run reaches by address step 2 (autobyteus-461 SR-059, design "What a delegated run sees as in its run"): the
 * standing agents of the runs that assigned its Tasks, in step 2's order (`DelegationTree.assignersOfTasksOf`; the
 * first assigner with an address wins it). The one enumeration of step 2: `CrossRunAddressResolution` resolves by it,
 * and a root's collaborator port adds it to its in-run set (the `@` note, `list_available_agents`, `delegate_task`'s
 * in-run placements, the addresses in use). Read at use from the tree's per-run data; nothing is kept here.
 */
export class ReachableAgents {
  constructor(private readonly dependencies: Readonly<{
    tree: () => Pick<DelegationTree, "tasksOf" | "assignersOfTasksOf" | "standingOf" | "agentsOf">;
    placements: ConfiguredPlacementReader;
  }>) {}

  /** Step 2's placements by address, in its order; `null` when the run works on no Task (step 2 does not apply). */
  async stepTwoOf(run: RootExecutionIdentity): Promise<ReadonlyMap<string, ReachedPlacement> | null> {
    const tree = this.dependencies.tree();
    const reference = runReferenceOf(run);
    if (!reference || !tree.tasksOf(reference).length) return null;
    const reached = new Map<string, ReachedPlacement>();
    for (const assigner of tree.assignersOfTasksOf(reference)) {
      const standing = await tree.standingOf(assigner);
      if (!standing) continue;
      const agents = new Map((await tree.agentsOf(assigner)).map((agent) => [agent.agentRunId, agent]));
      for (const [address, agentRunId] of standing.agents) {
        if (reached.has(address)) continue;
        const agent = agents.get(agentRunId);
        reached.set(address, Object.freeze({ address: address as AgentTeamAddress, agentRunId, assigner,
          rank: assigner.rootSubjectKind === "agent" ? "run_agent" as const : "configured" as const,
          // An agent at its own address; else an org's mounted team, whose address its coordinator answers.
          ref: agent?.address === address
            ? (agent.agentDefinitionId ? Object.freeze({ kind: "agent" as const, definitionId: agent.agentDefinitionId }) : null)
            : await this.teamRefOf(assigner, address) }));
      }
    }
    return reached;
  }

  /**
   * A configured placement step 2 reaches at `address`, with the snapshot a copy there starts from (as base answered
   * `delegate_task` for a hosted copy); `null` for any other address. An agent run's own agent is no such placement.
   */
  private async configuredPlacementAt(run: RootExecutionIdentity, address: string): Promise<Awaited<ReturnType<ConfiguredPlacementReader["configuredPlacementOf"]>>> {
    const reached = (await this.stepTwoOf(run))?.get(address);
    return reached?.rank === "configured" ? this.dependencies.placements.configuredPlacementOf(reached.assigner, address) : null;
  }

  /** A mounted team's definition, from its org's own file. */
  private async teamRefOf(assigner: RootExecutionIdentity, address: string): Promise<CatalogDefinitionRef | null> {
    const placement = await this.dependencies.placements.configuredPlacementOf(assigner, address);
    return placement && !("agentRunId" in placement.node) ? Object.freeze({ kind: "agent_team", definitionId: placement.node.teamDefinitionId }) : null;
  }

  /**
   * `delegate_task`'s placement at a configured placement step 2 reaches: a copy that starts from that placement's
   * snapshot, as base answered a hosted copy; `null` for any other address.
   */
  async delegationPlacementAt(run: RootExecutionIdentity, address: AgentTeamAddress): Promise<DelegationPlacement | null> {
    const found = await this.configuredPlacementAt(run, address);
    return found ? sourcedPlacement(address, configuredPlacementSource(found.node, found.handoffs)) : null;
  }
}
