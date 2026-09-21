import { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import {
  MemberCollaborationContext,
  MemberExecutionContext,
} from "../../agent-collaboration/execution/domain/member-execution-context.js";
import {
  createCollaborationMemberExecutionIdentity,
  requireRootExecutionIdentityKind,
} from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { MemberTaskCommandCapability } from "../../agent-collaboration/execution/task/member-task-command-capability.js";
import {
  buildDeliveryEndpointForParticipant,
  type InterAgentMessageDeliveryHandler,
} from "../domain/inter-agent-message-delivery.js";
import type { TeamRunAgentNode } from "../domain/team-run-config.js";
import type { TeamRunContext } from "../domain/team-run-context.js";

/** Team subject adapter that prepares the root-neutral AgentRun member context. */
export class MemberExecutionContextBuilder {
  private readonly summaryCache = new Map<string, Promise<{ instruction: string | null }>>();

  constructor(
    private readonly teamDefinitionService: AgentTeamDefinitionService = AgentTeamDefinitionService.getInstance(),
  ) {}

  async build(input: {
    teamContext: TeamRunContext<unknown>;
    agentNode: TeamRunAgentNode;
    deliverInterAgentMessage: InterAgentMessageDeliveryHandler;
    taskCommands: MemberTaskCommandCapability;
  }): Promise<MemberExecutionContext> {
    const root = requireRootExecutionIdentityKind(input.teamContext.rootIdentity, "agent_team");
    const identity = createCollaborationMemberExecutionIdentity({
      root,
      memberAddress: input.agentNode.address,
      agentRunId: input.agentNode.agentRunId,
    });
    const collaboration = new MemberCollaborationContext({
      outgoingHandoffs: input.teamContext.handoffs.filter(
        (handoff) => handoff.from === input.agentNode.address,
      ),
      deliverLogicalMessage: (message) => input.deliverInterAgentMessage({
        rootTeamRunId: root.rootRunId,
        recipientAddress: message.recipientAddress,
        sender: buildDeliveryEndpointForParticipant(Object.freeze({
          kind: "agent",
          identity,
          displayName: input.agentNode.address.split("/").at(-1) ?? input.agentNode.agentRunId,
        })),
        content: message.content,
        messageType: message.messageType,
        referenceFiles: message.referenceFiles ? [...message.referenceFiles] : null,
      }),
    });
    const summary = await this.resolveSummary(input.teamContext.teamNode.teamDefinitionId);
    return new MemberExecutionContext({
      identity,
      authoredEnclosingScopeInstruction: summary.instruction,
      collaboration,
      tasks: input.taskCommands,
    });
  }

  private resolveSummary(teamDefinitionId: string): Promise<{ instruction: string | null }> {
    if (!this.summaryCache.has(teamDefinitionId)) {
      this.summaryCache.set(teamDefinitionId, this.teamDefinitionService.getDefinitionById(teamDefinitionId)
        .then((definition) => ({ instruction: definition?.instructions?.trim() || null })));
    }
    return this.summaryCache.get(teamDefinitionId)!;
  }
}

let cached: MemberExecutionContextBuilder | null = null;
export const getMemberExecutionContextBuilder = (): MemberExecutionContextBuilder =>
  cached ??= new MemberExecutionContextBuilder();
