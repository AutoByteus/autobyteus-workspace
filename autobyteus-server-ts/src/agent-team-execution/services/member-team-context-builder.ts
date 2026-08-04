import { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import type { InterAgentMessageDeliveryHandler } from "../domain/inter-agent-message-delivery.js";
import { MemberCollaborationContext } from "../domain/member-collaboration-context.js";
import { createMemberLogicalAddressContext } from "../domain/member-logical-address-context.js";
import { MemberTeamContext } from "../domain/member-team-context.js";
import type { TaskAgentInstanceIdentity } from "../domain/task-agent-instance.js";
import type { TaskTeamInstanceIdentity } from "../domain/task-team-instance.js";
import type { TeamRunAgentNode } from "../domain/team-run-config.js";
import type { TeamRunContext } from "../domain/team-run-context.js";

export class MemberTeamContextBuilder {
  private readonly summaryCache = new Map<string, Promise<{ name: string; instruction: string | null }>>();

  constructor(
    private readonly teamDefinitionService: AgentTeamDefinitionService = AgentTeamDefinitionService.getInstance(),
  ) {}

  async build(input: {
    teamContext: TeamRunContext<unknown>;
    agentNode: TeamRunAgentNode;
    deliverInterAgentMessage?: InterAgentMessageDeliveryHandler | null;
    taskAgentInstance?: TaskAgentInstanceIdentity | null;
    taskTeamInstance?: TaskTeamInstanceIdentity | null;
  }): Promise<MemberTeamContext> {
    const team = input.teamContext.index.getTeam(input.teamContext.teamAddress);
    if (!team) throw new Error(`Missing Team node '${input.teamContext.teamAddress}'.`);
    const addressing = createMemberLogicalAddressContext({
      rootTeamRunId: input.teamContext.config.rootTeam.teamRunId,
      memberAddress: input.agentNode.address,
    });
    const collaboration = new MemberCollaborationContext({
      addressing,
      outgoingHandoffs: input.teamContext.config.handoffs.filter(
        (handoff) => handoff.from === input.agentNode.address,
      ),
      deliverInterAgentMessage: input.deliverInterAgentMessage ?? null,
    });
    const summary = await this.resolveSummary(team.teamDefinitionId);
    const runtime = input.teamContext.runtimeContext;
    const teamExecutionAddress = runtime && typeof runtime === "object" &&
      "teamExecutionAddress" in runtime
      ? (runtime as { teamExecutionAddress: {
          rootTeamRunId: string;
          taskTeamRunIds: readonly string[];
        } }).teamExecutionAddress
      : {
          rootTeamRunId: input.teamContext.config.rootTeam.teamRunId,
          taskTeamRunIds: input.teamContext.taskTeamRunIds,
        };
    return new MemberTeamContext({
      teamRunId: team.teamRunId,
      teamDefinitionId: team.teamDefinitionId,
      teamName: summary.name,
      teamBackendKind: input.teamContext.teamBackendKind,
      teamAddress: team.address,
      memberAddress: input.agentNode.address,
      agentRunId: input.agentNode.agentRunId,
      runtimeKind: input.agentNode.runtimeKind,
      coordinatorAddress: team.coordinatorAddress,
      teamInstruction: summary.instruction,
      collaboration,
      executionAddress: {
        ...teamExecutionAddress,
        memberAddress: input.agentNode.address,
        taskAgentRunId: input.taskAgentInstance?.taskAgentRunId ?? null,
      },
      taskAgentInstance: input.taskAgentInstance ?? null,
      taskTeamInstance: input.taskTeamInstance ?? null,
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
