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
import type { CollaborationHandoff } from "../../agent-collaboration/domain/collaboration-handoff.js";
import { getParentAgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { CollaboratorEntry } from "../../run-history/domain/run-execution-tree-shared-records.js";

/** The enclosing scope of an Agent that is not a member of the TeamRun's own definition. */
export type MemberScope = Readonly<{ handoffs: readonly CollaborationHandoff[]; teamDefinitionId: string | null }>;

/**
 * The scope of an Agent inside a collaborator (Team root): a collaborator Agent has no
 * enclosing instruction or handoffs; a member of a collaborator Team (or of an extra copy of
 * it) uses that Team's handoffs and definition. Null for everything else.
 */
export const collaboratorMemberScope = (collaborators: readonly CollaboratorEntry[], address: string): MemberScope | null => {
  if (collaborators.some((entry) => entry.kind === "agent" && entry.address === address)) {
    return Object.freeze({ handoffs: Object.freeze([]), teamDefinitionId: null });
  }
  const parent = getParentAgentTeamAddress(address);
  const team = collaborators.find((entry) => entry.kind === "agent_team" && entry.address === parent);
  return team?.kind === "agent_team" ? Object.freeze({ handoffs: team.handoffs, teamDefinitionId: team.teamDefinitionId }) : null;
};

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
    /** Overrides the TeamRun's handoffs and definition for an Agent outside them (a collaborator). */
    scope?: MemberScope | null;
  }): Promise<MemberExecutionContext> {
    const root = requireRootExecutionIdentityKind(input.teamContext.rootIdentity, "agent_team");
    const identity = createCollaborationMemberExecutionIdentity({
      root,
      memberAddress: input.agentNode.address,
      agentRunId: input.agentNode.agentRunId,
    });
    const collaboration = new MemberCollaborationContext({
      outgoingHandoffs: (input.scope?.handoffs ?? input.teamContext.handoffs).filter(
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
    const teamDefinitionId = input.scope ? input.scope.teamDefinitionId : input.teamContext.teamNode.teamDefinitionId;
    const summary = teamDefinitionId ? await this.resolveSummary(teamDefinitionId) : { instruction: null };
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
