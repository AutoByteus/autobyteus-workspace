import type { TeamRunAgentTeamNode } from "../../agent-team-execution/domain/team-run-config.js";
import type { CollaboratorEntry } from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { CollaboratorEntryPlan } from "./collaborator-entry-builder.js";

/** The run-identity allocators admission reuses (each root already holds them for delegation). */
export type CollaboratorIdentityPorts = Readonly<{
  agentRuns: Readonly<{ allocateForAgentDefinition(agentDefinitionId: string): Promise<string> }>;
  taskTeams: Readonly<{ create(input: { source: TeamRunAgentTeamNode }): Promise<Readonly<{ teamNode: TeamRunAgentTeamNode }>> }>;
}>;

const PLACEHOLDER = "collaborator-unallocated";

/**
 * Turns admitted plans into complete collaborator entries: one AgentRun ID for an Agent; a
 * TeamRun ID and one AgentRun ID per member for a Team. Uniqueness comes from the existing
 * allocators (which check every stored root family).
 */
export class CollaboratorIdentityAllocator {
  constructor(private readonly ports: CollaboratorIdentityPorts) {}

  async allocate(plan: CollaboratorEntryPlan): Promise<CollaboratorEntry> {
    if (plan.kind === "agent") {
      const { name: _name, ...entry } = plan;
      return Object.freeze({
        ...entry,
        agentRunId: await this.ports.agentRuns.allocateForAgentDefinition(plan.agentDefinitionId),
        platformAgentRunId: null,
      });
    }
    const { teamNode } = await this.ports.taskTeams.create({ source: Object.freeze({
      kind: "agent_team",
      address: plan.address,
      teamDefinitionId: plan.teamDefinitionId,
      teamRunId: PLACEHOLDER,
      coordinatorAddress: plan.coordinatorAddress,
      defaultLaunchConfiguration: plan.defaultLaunchConfiguration,
      children: Object.freeze(plan.members.map((member) => Object.freeze({
        kind: "agent" as const,
        address: member.address,
        agentDefinitionId: member.agentDefinitionId,
        agentRunId: PLACEHOLDER,
        platformAgentRunId: null,
        role: null,
        description: null,
        ...plan.defaultLaunchConfiguration,
      }))),
    }) });
    const runIdByAddress = new Map(teamNode.children.map((child) =>
      [child.address, child.kind === "agent" ? child.agentRunId : null]));
    const { name: _name, ...entry } = plan;
    return Object.freeze({
      ...entry,
      teamRunId: teamNode.teamRunId,
      members: Object.freeze(plan.members.map((member) => {
        const agentRunId = runIdByAddress.get(member.address);
        if (!agentRunId) throw new Error(`Collaborator member '${member.address}' got no AgentRun ID.`);
        return Object.freeze({ ...member, agentRunId, platformAgentRunId: null });
      })),
      taskExecutions: Object.freeze([]),
    });
  }
}
