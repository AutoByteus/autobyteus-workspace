import { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import {
  MemberCollaborationContext,
  MemberExecutionContext,
} from "../../agent-collaboration/execution/domain/member-execution-context.js";
import {
  createCollaborationMemberExecutionIdentity,
  requireRootExecutionIdentityKind,
  type CollaborationMemberExecutionIdentity,
} from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { AvailableCollaborator } from "../../agent-collaboration/collaborators/collaborator-candidate-policy.js";
import type { MemberTaskCommandCapability } from "../../agent-collaboration/execution/task/member-task-command-capability.js";
import {
  buildDeliveryEndpointForParticipant,
  type InterAgentMessageDeliveryHandler,
} from "../domain/inter-agent-message-delivery.js";
import type { TeamRunAgentNode } from "../domain/team-run-config.js";
import type { TeamRunContext } from "../domain/team-run-context.js";
import {
  resolveMemberCollaborationScope,
  type MemberHostTeam,
} from "../../agent-collaboration/execution/domain/member-instance-scope.js";

/** The enclosing scope of an Agent that is not a member of the TeamRun's own definition. */
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
    /** The root's `list_available_agents` for this member; absent in application-owned runs. */
    listAvailableAgents?: ((identity: CollaborationMemberExecutionIdentity) => Promise<readonly AvailableCollaborator[]>) | null;
    taskCommands: MemberTaskCommandCapability;
    /** The TeamRun hosting the Agent (a collaborator Team or any copy); absent for the root TeamRun's own members. */
    hostTeam?: MemberHostTeam | null;
  }): Promise<MemberExecutionContext> {
    const root = requireRootExecutionIdentityKind(input.teamContext.rootIdentity, "agent_team");
    const identity = createCollaborationMemberExecutionIdentity({
      root,
      memberAddress: input.agentNode.address,
      agentRunId: input.agentNode.agentRunId,
    });
    // CR-001: the one owner decides the member's handoffs and enclosing instruction.
    const scope = resolveMemberCollaborationScope({
      memberAddress: input.agentNode.address,
      hostTeam: input.hostTeam,
      root: {
        configuredRootAddresses: input.teamContext.teamNode.children.map((child) => child.address),
        handoffs: input.teamContext.handoffs,
        definition: { kind: "agent_team", definitionId: input.teamContext.teamNode.teamDefinitionId },
      },
    });
    const collaboration = new MemberCollaborationContext({
      outgoingHandoffs: scope.outgoingHandoffs,
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
      listAvailableAgents: input.listAvailableAgents ? () => input.listAvailableAgents!(identity) : null,
    });
    const summary = scope.instructionDefinition
      ? await this.resolveSummary(scope.instructionDefinition.definitionId)
      : { instruction: null };
    return new MemberExecutionContext({
      identity,
      teamScoped: true,
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
