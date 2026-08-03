import type { CollaborationHandoff } from "../../agent-collaboration/domain/collaboration-handoff.js";
import { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import type { TaskAgentInstanceIdentity } from "../domain/task-agent-instance.js";
import type { TaskTeamInstanceIdentity } from "../domain/task-team-instance.js";
import type { TokenUsageTeamExecutionScope } from "../domain/token-usage-execution-scope.js";
import type { InterAgentMessageDeliveryHandler } from "../domain/inter-agent-message-delivery.js";
import { MemberCollaborationContext } from "../domain/member-collaboration-context.js";
import { createMemberLogicalAddressContext } from "../domain/member-logical-address-context.js";
import { MemberTeamContext } from "../domain/member-team-context.js";
import type { TeamBackendKind } from "../domain/team-backend-kind.js";
import {
  getTokenUsageExecutionAddressBuilder,
  type TokenUsageExecutionAddressBuilder,
} from "./token-usage-execution-address-builder.js";

export class MemberTeamContextBuilder {
  private readonly teamDefinitionSummaryCache = new Map<string, Promise<{
    name: string | null;
    instruction: string | null;
  }>>();

  constructor(
    private readonly teamDefinitionService: AgentTeamDefinitionService = AgentTeamDefinitionService.getInstance(),
    private readonly tokenUsageAddressBuilder: TokenUsageExecutionAddressBuilder = getTokenUsageExecutionAddressBuilder(),
  ) {}

  async build(input: {
    teamRunId: string;
    teamDefinitionId: string;
    teamBackendKind: TeamBackendKind;
    currentMemberName: string;
    currentMemberPath?: string[] | null;
    currentMemberRouteKey: string;
    currentMemberRunId: string;
    coordinatorMemberRouteKey?: string | null;
    collaborationRootTeamRunId: string;
    teamMountPath?: readonly string[] | null;
    effectiveHandoffs?: readonly CollaborationHandoff[] | null;
    deliverInterAgentMessage?: InterAgentMessageDeliveryHandler | null;
    taskAgentInstance?: TaskAgentInstanceIdentity | null;
    taskTeamInstance?: TaskTeamInstanceIdentity | null;
    tokenUsageTeamScope?: TokenUsageTeamExecutionScope | null;
  }): Promise<MemberTeamContext> {
    const currentMemberPath = input.currentMemberPath?.length
      ? [...input.currentMemberPath]
      : [input.currentMemberName];
    const teamMountPath = [...(input.teamMountPath ?? [])];
    const addressing = createMemberLogicalAddressContext({
      rootTeamRunId: input.collaborationRootTeamRunId,
      memberPath: [...teamMountPath, ...currentMemberPath],
      immediateTeamPath: teamMountPath,
    });
    const collaboration = new MemberCollaborationContext({
      addressing,
      outgoingHandoffs: (input.effectiveHandoffs ?? []).filter(
        (handoff) => handoff.from === addressing.memberAddress,
      ),
      deliverInterAgentMessage: input.deliverInterAgentMessage ?? null,
    });
    const tokenUsageTeamScope = input.tokenUsageTeamScope ??
      this.tokenUsageAddressBuilder.buildRootTeamScope(input.teamRunId);
    const tokenUsageExecutionScope = this.tokenUsageAddressBuilder.buildMemberRunScope({
      teamScope: tokenUsageTeamScope,
      memberRouteKey: input.currentMemberRouteKey,
      taskAgentInstance: input.taskAgentInstance ?? null,
    });
    const summary = await this.resolveTeamDefinitionSummary(input.teamDefinitionId);

    return new MemberTeamContext({
      teamRunId: input.teamRunId,
      teamDefinitionId: input.teamDefinitionId,
      teamName: summary.name ?? input.teamDefinitionId,
      teamBackendKind: input.teamBackendKind,
      memberName: input.currentMemberName,
      memberPath: currentMemberPath,
      memberRouteKey: input.currentMemberRouteKey,
      memberRunId: input.currentMemberRunId,
      coordinatorMemberRouteKey: input.coordinatorMemberRouteKey ?? null,
      teamInstruction: summary.instruction,
      collaboration,
      taskAgentInstance: input.taskAgentInstance ?? null,
      taskTeamInstance: input.taskTeamInstance ?? null,
      tokenUsageExecutionScope,
    });
  }

  private resolveTeamDefinitionSummary(teamDefinitionId: string): Promise<{
    name: string | null;
    instruction: string | null;
  }> {
    if (!this.teamDefinitionSummaryCache.has(teamDefinitionId)) {
      this.teamDefinitionSummaryCache.set(
        teamDefinitionId,
        this.teamDefinitionService.getDefinitionById(teamDefinitionId)
          .then((definition) => ({
            name: definition?.name?.trim() || null,
            instruction: definition?.instructions?.trim() || null,
          }))
          .catch(() => ({ name: null, instruction: null })),
      );
    }
    return this.teamDefinitionSummaryCache.get(teamDefinitionId)!;
  }
}

let cachedMemberTeamContextBuilder: MemberTeamContextBuilder | null = null;

export const getMemberTeamContextBuilder = (): MemberTeamContextBuilder => {
  cachedMemberTeamContextBuilder ??= new MemberTeamContextBuilder();
  return cachedMemberTeamContextBuilder;
};
