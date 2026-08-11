import { randomUUID } from "node:crypto";
import type { AgentRunIdentityAllocator } from "../../agent-execution/services/agent-run-identity-allocator.js";
import { AgentRunIdentityAllocator as DefaultAgentRunIdentityAllocator } from "../../agent-execution/services/agent-run-identity-allocator.js";
import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { TeamRun } from "../domain/team-run.js";
import {
  TeamRunConfig,
  type TeamRunAgentTeamNode,
  type TeamRunNode,
} from "../domain/team-run-config.js";
import { generateTeamRunIdForDefinitionName } from "../domain/team-run-id.js";

export type TaskTeamMaterialization = Readonly<{
  config: TeamRunConfig;
  teamNode: TeamRunAgentTeamNode;
}>;

export class TaskTeamRunIdentityFactory {
  constructor(
    private readonly agentRunIdentityAllocator: Pick<AgentRunIdentityAllocator, "allocateForAgentDefinition"> = DefaultAgentRunIdentityAllocator.getInstance(),
    private readonly createToken: () => string = () => randomUUID().replace(/-/g, ""),
  ) {}

  async create(input: {
    teamRun: TeamRun;
    taskId: string;
    teamAddress: AgentTeamAddress;
  }): Promise<TaskTeamMaterialization> {
    const source = input.teamRun.context.index.getTeam(input.teamAddress);
    if (!source) throw new Error(`Task AgentTeam '${input.teamAddress}' was not found.`);
    const teamNode = await this.materializeTeam(source);
    const config = new TeamRunConfig({
      teamBackendKind: input.teamRun.config.teamBackendKind,
      rootTeam: this.replaceNode(input.teamRun.config.rootTeam, teamNode) as TeamRunAgentTeamNode,
      handoffs: input.teamRun.config.handoffs,
    });
    if (!input.taskId.trim()) throw new Error("taskId is required.");
    return Object.freeze({
      config,
      teamNode,
    });
  }

  private async materializeTeam(source: TeamRunAgentTeamNode): Promise<TeamRunAgentTeamNode> {
    return {
      ...source,
      teamRunId: generateTeamRunIdForDefinitionName(
        source.teamDefinitionId,
        this.createToken(),
      ),
      children: await Promise.all(source.children.map((child) => this.materializeNode(child))),
    };
  }

  private async materializeNode(source: TeamRunNode): Promise<TeamRunNode> {
    return source.kind === "agent"
      ? {
          ...source,
          agentRunId: await this.agentRunIdentityAllocator.allocateForAgentDefinition(
            source.agentDefinitionId,
          ),
          platformAgentRunId: null,
        }
      : this.materializeTeam(source);
  }

  private replaceNode(current: TeamRunNode, replacement: TeamRunAgentTeamNode): TeamRunNode {
    if (current.address === replacement.address) return replacement;
    return current.kind === "agent" ? current : {
      ...current,
      children: current.children.map((child) => this.replaceNode(child, replacement)),
    };
  }
}
