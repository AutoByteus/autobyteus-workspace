import { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import type { InterAgentMessageDeliveryHandler } from "../domain/inter-agent-message-delivery.js";
import { MemberCollaborationContext } from "../domain/member-collaboration-context.js";
import { MemberTeamContext } from "../domain/member-team-context.js";
import type { TeamRunAgentNode } from "../domain/team-run-config.js";
import type { TeamRunContext } from "../domain/team-run-context.js";
import { createTeamMemberExecutionIdentity } from "../domain/team-member-execution-identity.js";

export class MemberTeamContextBuilder {
  private readonly summaryCache = new Map<string, Promise<{ name: string; instruction: string | null }>>();

  constructor(
    private readonly teamDefinitionService: AgentTeamDefinitionService = AgentTeamDefinitionService.getInstance(),
  ) {}

  async build(input: {
    teamContext: TeamRunContext<unknown>;
    agentNode: TeamRunAgentNode;
    deliverInterAgentMessage?: InterAgentMessageDeliveryHandler | null;
  }): Promise<MemberTeamContext> {
    const collaboration = new MemberCollaborationContext({
      outgoingHandoffs: input.teamContext.handoffs.filter(
        (handoff) => handoff.from === input.agentNode.address,
      ),
      deliverInterAgentMessage: input.deliverInterAgentMessage ?? null,
    });
    const summary = await this.resolveSummary(input.teamContext.teamNode.teamDefinitionId);
    return new MemberTeamContext({
      identity: createTeamMemberExecutionIdentity({
        rootTeamRunId: input.teamContext.rootTeamRunId,
        memberAddress: input.agentNode.address,
        agentRunId: input.agentNode.agentRunId,
      }),
      authoredTeamInstruction: summary.instruction,
      collaboration,
    });
  }

  private resolveSummary(teamDefinitionId: string): Promise<{ name: string; instruction: string | null }> {
    if (!this.summaryCache.has(teamDefinitionId)) {
      this.summaryCache.set(teamDefinitionId, this.teamDefinitionService.getDefinitionById(teamDefinitionId)
        .then((definition) => ({
          name: definition?.name?.trim() || teamDefinitionId,
          instruction: definition?.instructions?.trim() || null,
        })));
    }
    return this.summaryCache.get(teamDefinitionId)!;
  }
}

let cached: MemberTeamContextBuilder | null = null;
export const getMemberTeamContextBuilder = (): MemberTeamContextBuilder =>
  cached ??= new MemberTeamContextBuilder();
