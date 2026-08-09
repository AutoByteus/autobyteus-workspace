import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { isAgentTeamAddressAncestor, type AgentTeamAddress } from "../../../../agent-collaboration/domain/agent-team-address.js";
import type { AgentOperationResult } from "../../../../agent-execution/domain/agent-operation-result.js";
import type { TeamRun } from "../../../domain/team-run.js";
import type { TeamRunContext } from "../../../domain/team-run-context.js";
import type { InterAgentMessageDeliveryHandler, ResolvedInterAgentMessageDeliveryRequest } from "../../../domain/inter-agent-message-delivery.js";
import type { TeamRunAgentTeamNode } from "../../../domain/team-run-config.js";
import type { MixedTeamRunContext, MixedSubTeamMemberContext } from "../mixed-team-run-context.js";
import type { MixedSubTeamRunFactory } from "../mixed-sub-team-run-factory.js";
import { getSubTeamActiveRunDirectory } from "../../../services/sub-team-active-run-directory.js";
import { getTaskDelegationRunRegistry } from "../../../task-delegation/task-delegation-run-registry.js";
import type { MixedTeamEventPublish, MixedTeamMemberHandle } from "./mixed-team-member-handle.js";

export class MixedSubTeamMemberHandle implements MixedTeamMemberHandle {
  readonly context: MixedSubTeamMemberContext;
  private childRun: TeamRun | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor(private readonly options: {
    parentContext: TeamRunContext<MixedTeamRunContext>;
    context: MixedSubTeamMemberContext;
    config: TeamRunAgentTeamNode;
    subTeamRunFactory: MixedSubTeamRunFactory;
    publish: MixedTeamEventPublish;
    deliverInterAgentMessage: InterAgentMessageDeliveryHandler;
  }) { this.context = options.context; }

  isActive(): boolean { return this.childRun?.isActive() ?? false; }
  getLeafAgentStatusSnapshots() { return this.childRun?.getLeafAgentStatusSnapshots() ?? []; }
  hasOpenExecutionWork(): boolean { return this.childRun?.hasOpenExecutionWork() ?? false; }

  async postMessage(message: AgentInputUserMessage): Promise<AgentOperationResult> {
    const child = await this.ensureReady();
    const result = await child.postMessage(message, this.options.config.coordinatorAddress);
    return { ...result, displayName: this.context.address };
  }

  async postMessageToAddress(message: AgentInputUserMessage, target: AgentTeamAddress, targetAgentRunId: string | null = null): Promise<AgentOperationResult> {
    if (target !== this.context.address && !isAgentTeamAddressAncestor(this.context.address, target)) {
      return { accepted: false, code: "TARGET_MEMBER_NOT_FOUND", message: `Target '${target}' is outside AgentTeam '${this.context.address}'.` };
    }
    return (await this.ensureReady()).postMessage(
      message,
      target === this.context.address ? this.options.config.coordinatorAddress : target,
      targetAgentRunId,
    );
  }

  async deliverInterMemberMessage(request: ResolvedInterAgentMessageDeliveryRequest, beforePublishMemberInput: (() => void) | null = null): Promise<AgentOperationResult> {
    if (!isAgentTeamAddressAncestor(this.context.address, request.receiverAddress.memberAddress)) {
      return { accepted: false, code: "COLLABORATION_TARGET_NOT_FOUND", message: `Recipient '${request.receiverAddress.memberAddress}' is outside AgentTeam '${this.context.address}'.` };
    }
    const result = await (await this.ensureReady()).deliverResolvedInterAgentMessage(
      request,
      beforePublishMemberInput,
    );
    return result;
  }

  async approveToolInvocation(target: AgentTeamAddress | null, invocationId: string, approved: boolean, reason: string | null = null, targetAgentRunId: string | null = null): Promise<AgentOperationResult> {
    if (!target) return { accepted: false, code: "TARGET_AGENT_REQUIRED", message: "A target Agent address is required." };
    return (await this.ensureReady()).approveToolInvocation(target, invocationId, approved, reason, targetAgentRunId);
  }

  async interrupt(target: AgentTeamAddress | null, targetAgentRunId: string | null = null): Promise<AgentOperationResult> {
    if (!target) target = this.options.config.coordinatorAddress;
    if (!this.childRun?.isActive()) return { accepted: false, code: "RUN_NOT_FOUND", message: `AgentTeam '${this.context.address}' is not active.` };
    return this.childRun.interruptMember(target, targetAgentRunId);
  }

  async terminate(): Promise<AgentOperationResult> {
    const result = this.childRun ? await this.childRun.terminate() : { accepted: true };
    if (result.accepted) this.dispose();
    return result;
  }

  dispose(): void {
    this.unbind();
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.childRun = null;
    this.context.childRuntimeContext = null;
  }

  private async ensureReady(): Promise<TeamRun> {
    if (this.childRun?.isActive()) return this.childRun;
    const restored = this.context.childRuntimeContext;
    this.unbind();
    this.unsubscribe?.();
    this.childRun = await this.options.subTeamRunFactory.createOrRestore({
      config: this.options.parentContext.config,
      teamNode: this.options.config,
      restoreRuntimeContext: restored,
      parentBoundary: {
        parentTeamRunId: this.options.parentContext.teamRunId,
        rootTeamRunId: this.options.parentContext.config.rootTeam.teamRunId,
        parentTeamAddress: this.options.parentContext.teamAddress,
        deliverInterAgentMessage: this.options.deliverInterAgentMessage,
      },
      taskTeamInstance: this.options.parentContext.runtimeContext.taskTeamInstance,
      taskTeamRunIds: this.options.parentContext.taskTeamRunIds,
    });
    this.context.childRuntimeContext = this.childRun.getRuntimeContext() as MixedTeamRunContext;
    getSubTeamActiveRunDirectory().bind(this.childRun);
    this.unsubscribe = this.childRun.subscribeToEvents(this.options.publish);
    return this.childRun;
  }

  private unbind(): void {
    const id = this.childRun?.teamRunId ?? this.context.teamRunId;
    getSubTeamActiveRunDirectory().unbind(id);
    getTaskDelegationRunRegistry().detach(id);
  }
}
