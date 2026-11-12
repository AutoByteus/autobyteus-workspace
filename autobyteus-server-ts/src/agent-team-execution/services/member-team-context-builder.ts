import type { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import type { RunCollaborationContext } from "../../agent-collaboration/delegation/run-collaboration-context.js";
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
import type { MemberTaskCapability } from "../../agent-collaboration/execution/task/member-task-capability.js";
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

/** Team subject adapter that prepares the root-neutral AgentRun member context. */
export class MemberExecutionContextBuilder {
  private readonly summaryCache = new Map<string, Promise<{ instruction: string | null }>>();

  constructor(
    private readonly teamDefinitionService: Pick<AgentTeamDefinitionService, "getDefinitionById">,
    /** Whether the team run works on a Task an org assigned (the organization line, SR-058). */
    private readonly runCollaboration: Pick<RunCollaborationContext, "inOrganization">,
  ) {}

  async build(input: {
    teamContext: TeamRunContext<unknown>;
    agentNode: TeamRunAgentNode;
    deliverInterAgentMessage: InterAgentMessageDeliveryHandler;
    /** The root's `list_available_agents` for this member; absent in application-owned runs. */
    listAvailableAgents?: ((identity: CollaborationMemberExecutionIdentity) => Promise<readonly AvailableCollaborator[]>) | null;
    taskCapability: MemberTaskCapability;
    /** The TeamRun hosting the Agent (a Team copy); absent for the root TeamRun's own members. */
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
      agentRunId: input.agentNode.agentRunId,
      hostTeam: input.hostTeam,
      root: {
        configured: {
          addresses: input.teamContext.teamNode.children.map((child) => child.address),
          agentRunIds: input.teamContext.teamNode.children.map((child) => child.agentRunId),
          role: "team_member",
        },
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
      collaborationRole: scope.role,
      inOrganization: this.runCollaboration.inOrganization(root),
      authoredEnclosingScopeInstruction: summary.instruction,
      collaboration,
      tasks: input.taskCapability,
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
