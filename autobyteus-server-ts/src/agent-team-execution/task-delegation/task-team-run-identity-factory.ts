import { randomUUID } from "node:crypto";
import type { AgentRunIdentityAllocator } from "../../agent-execution/services/agent-run-identity-allocator.js";
import type { TeamRunAgentTeamNode, TeamRunNode } from "../domain/team-run-config.js";
import { generateTeamRunIdForDefinitionName } from "../domain/team-run-id.js";

export type TaskTeamMaterialization = Readonly<{ teamNode: TeamRunAgentTeamNode }>;

/** Allocates a complete fresh concrete subtree from one configured Team placement. */
export class TaskTeamRunIdentityFactory {
  constructor(
    private readonly agents: Pick<AgentRunIdentityAllocator, "allocateForAgentDefinition">,
    private readonly createToken: () => string = () => randomUUID().replace(/-/g, ""),
  ) {
    if (!agents || typeof agents.allocateForAgentDefinition !== "function") {
      throw new Error("Task Agent-run identity allocator is required.");
    }
  }

  async create(input: { source: TeamRunAgentTeamNode; taskId: string }): Promise<TaskTeamMaterialization> {
    if (!input.taskId.trim()) throw new Error("taskId is required.");
    return Object.freeze({ teamNode: await this.materializeTeam(input.source) });
  }

  private async materializeTeam(source: TeamRunAgentTeamNode): Promise<TeamRunAgentTeamNode> {
    return Object.freeze({
      ...source,
      teamRunId: generateTeamRunIdForDefinitionName(source.teamDefinitionId, this.createToken()),
      children: Object.freeze(await Promise.all(source.children.map((child) => this.materializeNode(child)))),
    });
  }

  private async materializeNode(source: TeamRunNode): Promise<TeamRunNode> {
    return source.kind === "agent"
      ? Object.freeze({
          ...source,
          agentRunId: await this.agents.allocateForAgentDefinition(source.agentDefinitionId),
          platformAgentRunId: null,
        })
      : this.materializeTeam(source);
  }
}
