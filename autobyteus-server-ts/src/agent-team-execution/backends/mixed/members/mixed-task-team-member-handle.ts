import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentTeamAddress } from "../../../../agent-collaboration/domain/agent-team-address.js";
import type { AgentOperationResult } from "../../../../agent-execution/domain/agent-operation-result.js";
import type { TeamRun } from "../../../domain/team-run.js";
import type { TeamRunContext } from "../../../domain/team-run-context.js";
import type { InterAgentMessageDeliveryHandler, ResolvedInterAgentMessageDeliveryRequest } from "../../../domain/inter-agent-message-delivery.js";
import type { StartTaskTeamInstanceRequest } from "../../../domain/task-team-instance.js";
import type { MixedSubTeamRunFactory } from "../mixed-sub-team-run-factory.js";
import { MixedSubTeamMemberContext, type MixedTeamRunContext } from "../mixed-team-run-context.js";
import type { TaskTeamActiveRunDirectory } from "../../../task-delegation/task-team-active-run-directory.js";
import type { MixedTeamEventPublish, MixedTeamMemberHandle } from "./mixed-team-member-handle.js";

export class MixedTaskTeamMemberHandle implements MixedTeamMemberHandle {
  readonly context: MixedSubTeamMemberContext;
  private childRun: TeamRun | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor(private readonly options: {
    parentContext: TeamRunContext<MixedTeamRunContext>;
    request: StartTaskTeamInstanceRequest;
    subTeamRunFactory: MixedSubTeamRunFactory;
    taskTeamActiveRunDirectory: TaskTeamActiveRunDirectory;
    publish: MixedTeamEventPublish;
    deliverInterAgentMessage: InterAgentMessageDeliveryHandler;
  }) {
    this.context = new MixedSubTeamMemberContext({
      address: options.request.teamNode.address,
      teamDefinitionId: options.request.teamNode.teamDefinitionId,
      teamRunId: options.request.identity.taskTeamRunId,
    });
  }

  isActive() { return this.childRun?.isActive() ?? false; }
  getLeafAgentStatusSnapshots() { return this.childRun?.getLeafAgentStatusSnapshots() ?? []; }
  hasOpenExecutionWork() { return this.childRun?.hasOpenExecutionWork() ?? false; }

  async start() { return this.postMessage(this.options.request.message); }
  async postMessage(message: AgentInputUserMessage) {
    return (await this.ensureReady()).postMessage(message, this.options.request.teamNode.coordinatorAddress);
  }
  async postMessageToAddress(message: AgentInputUserMessage, target: AgentTeamAddress, targetAgentRunId: string | null = null) {
    return (await this.ensureReady()).postMessage(message, target, targetAgentRunId);
  }
  async deliverInterMemberMessage(_request: ResolvedInterAgentMessageDeliveryRequest): Promise<AgentOperationResult> {
    return { accepted: false, code: "TASK_TEAM_DIRECT_DELIVERY_UNSUPPORTED", message: "Task AgentTeam handle does not own ordinary inter-Agent delivery." };
  }
  async approveToolInvocation(target: AgentTeamAddress | null, invocationId: string, approved: boolean, reason: string | null = null, targetAgentRunId: string | null = null) {
    return (await this.ensureReady()).approveToolInvocation(target ?? this.options.request.teamNode.coordinatorAddress, invocationId, approved, reason, targetAgentRunId);
  }
  async interrupt(target: AgentTeamAddress | null, targetAgentRunId: string | null = null) {
    return this.childRun?.isActive()
      ? this.childRun.interruptMember(target ?? this.options.request.teamNode.coordinatorAddress, targetAgentRunId)
      : Promise.resolve({ accepted: true });
  }
  async terminate() {
    const result = this.childRun ? await this.childRun.terminate() : { accepted: true };
    if (result.accepted) this.dispose();
    return result;
  }
  dispose(): void {
    this.unsubscribe?.(); this.unsubscribe = null; this.childRun = null;
    this.context.childRuntimeContext = null;
    this.options.taskTeamActiveRunDirectory.unbind(this.options.request.identity.taskTeamRunId);
  }

  private async ensureReady(): Promise<TeamRun> {
    if (this.childRun?.isActive()) return this.childRun;
    this.unsubscribe?.();
    this.childRun = await this.options.subTeamRunFactory.createOrRestore({
      config: this.options.request.config,
      teamNode: this.options.request.teamNode,
      parentBoundary: {
        parentTeamRunId: this.options.parentContext.teamRunId,
        rootTeamRunId: this.options.parentContext.config.rootTeam.teamRunId,
        parentTeamAddress: this.options.parentContext.teamAddress,
        deliverInterAgentMessage: this.options.deliverInterAgentMessage,
      },
      taskTeamInstance: this.options.request.identity,
      taskTeamRunIds: this.options.request.receiver.taskTeamRunIds,
    });
    this.context.childRuntimeContext = this.childRun.getRuntimeContext() as MixedTeamRunContext;
    this.options.taskTeamActiveRunDirectory.bindActiveRun(this.options.request.identity, this.childRun);
    this.unsubscribe = this.childRun.subscribeToEvents(this.options.publish);
    return this.childRun;
  }
}
