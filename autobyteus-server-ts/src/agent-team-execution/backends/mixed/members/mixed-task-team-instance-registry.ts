import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../../../agent-execution/domain/agent-operation-result.js";
import type { StartTaskTeamInstanceRequest } from "../../../domain/task-team-instance.js";
import type { ConversationTargetAddress } from "../../../domain/conversation-target-address.js";
import type { TeamRunContext } from "../../../domain/team-run-context.js";
import type { InterAgentMessageDeliveryIntent } from "../../../domain/inter-agent-message-delivery.js";
import type { TeamMemberSelector } from "../../../domain/team-run-member-identity.js";
import type { TaskTeamActiveRunDirectory } from "../../../task-delegation/task-team-active-run-directory.js";
import type { MixedSubTeamRunFactory } from "../mixed-sub-team-run-factory.js";
import type { MixedTeamRunContext } from "../mixed-team-run-context.js";
import { MixedTaskTeamMemberHandle } from "./mixed-task-team-member-handle.js";
import type { MixedTeamEventPublish, MixedTeamStatusChange } from "./mixed-team-member-handle.js";

export class MixedTaskTeamInstanceRegistry {
  private readonly handles = new Map<string, MixedTaskTeamMemberHandle>();

  constructor(private readonly options: {
    teamContext: TeamRunContext<MixedTeamRunContext>;
    subTeamRunFactory: MixedSubTeamRunFactory;
    taskTeamActiveRunDirectory: TaskTeamActiveRunDirectory;
    publish: MixedTeamEventPublish;
    notifyStatusChange: MixedTeamStatusChange;
    deliverInterAgentMessage: (request: InterAgentMessageDeliveryIntent) => Promise<AgentOperationResult>;
  }) {}

  listHandles(): MixedTaskTeamMemberHandle[] { return [...this.handles.values()]; }

  async start(request: StartTaskTeamInstanceRequest): Promise<AgentOperationResult> {
    const logical = this.options.teamContext.runtimeContext.memberContexts.find(
      (member) => member.memberRouteKey === request.identity.logicalTeam.memberRouteKey,
    ) ?? null;
    if (!logical) {
      return {
        accepted: false,
        code: "TARGET_TEAM_NOT_FOUND",
        message: `Logical team '${request.identity.logicalTeam.memberRouteKey}' was not found.`,
      };
    }
    if (logical.memberKind !== "agent_team") {
      return {
        accepted: false,
        code: "UNSUPPORTED_TASK_TEAM_TARGET",
        message: "Task-team instances can only start for concrete agent_team members.",
      };
    }

    const runId = request.identity.taskTeamRunId.trim();
    const existing = this.handles.get(runId) ?? null;
    if (existing?.isActive()) {
      return {
        accepted: false,
        code: "TASK_TEAM_ALREADY_ACTIVE",
        message: `Task-team run '${runId}' is already active.`,
      };
    }
    existing?.dispose();
    this.handles.delete(runId);

    const handle = new MixedTaskTeamMemberHandle({
      parentContext: this.options.teamContext,
      request,
      subTeamRunFactory: this.options.subTeamRunFactory,
      taskTeamActiveRunDirectory: this.options.taskTeamActiveRunDirectory,
      publish: this.options.publish,
      notifyStatusChange: this.options.notifyStatusChange,
      deliverInterAgentMessage: this.options.deliverInterAgentMessage,
    });
    this.handles.set(runId, handle);
    try {
      const result = await handle.start();
      if (!result.accepted) await this.cleanupFailedStart(runId, handle);
      return result;
    } catch (error) {
      await this.cleanupFailedStart(runId, handle);
      throw error;
    }
  }

  async postMessage(
    logicalTeamRouteKey: string,
    taskTeamRunId: string,
    message: AgentInputUserMessage,
  ): Promise<AgentOperationResult> {
    const resolved = this.resolve(logicalTeamRouteKey, taskTeamRunId);
    return "accepted" in resolved ? resolved : resolved.postMessage(message);
  }

  async postMessageToConversationTarget(
    logicalTeamRouteKey: string,
    taskTeamRunId: string,
    remainingAddress: ConversationTargetAddress,
    message: AgentInputUserMessage,
  ): Promise<AgentOperationResult> {
    const resolved = this.resolve(logicalTeamRouteKey, taskTeamRunId);
    return "accepted" in resolved
      ? resolved
      : resolved.postMessageToConversationTarget(message, remainingAddress);
  }

  async settle(logicalTeamRouteKey: string, taskTeamRunId: string): Promise<AgentOperationResult> {
    const resolved = this.resolve(logicalTeamRouteKey, taskTeamRunId);
    if ("accepted" in resolved) return resolved;
    const result = await resolved.terminate();
    if (result.accepted) this.handles.delete(taskTeamRunId.trim());
    return result;
  }

  async approveToolInvocation(
    taskTeamRunId: string,
    target: TeamMemberSelector,
    invocationId: string,
    approved: boolean,
    reason: string | null = null,
    targetMemberRunId: string | null = null,
  ): Promise<AgentOperationResult> {
    const handle = this.handles.get(taskTeamRunId.trim()) ?? null;
    if (!handle) {
      return {
        accepted: false,
        code: "TASK_TEAM_RUN_NOT_FOUND",
        message: `Task-team run '${taskTeamRunId}' was not found.`,
      };
    }
    return handle.approveToolInvocation(
      target,
      invocationId,
      approved,
      reason,
      targetMemberRunId,
    );
  }

  async terminateAll(): Promise<AgentOperationResult> {
    for (const [runId, handle] of this.handles.entries()) {
      const result = await handle.terminate();
      if (!result.accepted) return result;
      this.handles.delete(runId);
    }
    this.handles.clear();
    return { accepted: true };
  }

  dispose(): void {
    for (const handle of this.handles.values()) handle.dispose();
    this.handles.clear();
  }

  private resolve(
    logicalTeamRouteKey: string,
    taskTeamRunId: string,
  ): MixedTaskTeamMemberHandle | AgentOperationResult {
    const route = logicalTeamRouteKey.trim();
    const runId = taskTeamRunId.trim();
    const handle = this.handles.get(runId) ?? null;
    if (!handle) {
      return {
        accepted: false,
        code: "TASK_TEAM_RUN_NOT_FOUND",
        message: `Task-team run '${taskTeamRunId}' was not found.`,
      };
    }
    if (handle.context.memberRouteKey !== route) {
      return {
        accepted: false,
        code: "TASK_TEAM_ROUTE_MISMATCH",
        message: `Task-team run '${taskTeamRunId}' is not for logical team '${logicalTeamRouteKey}'.`,
      };
    }
    return handle;
  }

  private async cleanupFailedStart(
    taskTeamRunId: string,
    handle: MixedTaskTeamMemberHandle,
  ): Promise<void> {
    try { await handle.terminate(); }
    catch { handle.dispose(); }
    finally { this.handles.delete(taskTeamRunId.trim()); }
  }
}
