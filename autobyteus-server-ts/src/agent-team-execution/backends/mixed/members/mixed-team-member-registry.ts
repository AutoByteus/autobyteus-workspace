import type { AgentOperationResult } from "../../../../agent-execution/domain/agent-operation-result.js";
import type { StartTaskAgentInstanceRequest } from "../../../domain/task-agent-instance.js";
import { cloneTaskAgentInstanceIdentity } from "../../../domain/task-agent-instance.js";
import type { TeamRunContext } from "../../../domain/team-run-context.js";
import type { TeamRunMemberConfig } from "../../../domain/team-run-config.js";
import {
  getSelectorTopLevelName,
  resolveTeamMemberSelector,
  selectorFromMemberPath,
  selectorFromMemberRouteKey,
  type TeamMemberSelector,
} from "../../../domain/team-run-member-identity.js";
import type { MixedTeamRunContext, MixedTeamMemberContext } from "../mixed-team-run-context.js";
import { MixedAgentMemberContext } from "../mixed-team-run-context.js";
import type { MixedSubTeamRunFactory } from "../mixed-sub-team-run-factory.js";
import { MixedAgentMemberHandle } from "./mixed-agent-member-handle.js";
import { MixedSubTeamMemberHandle } from "./mixed-sub-team-member-handle.js";
import type { MixedTeamEventPublish, MixedTeamMemberHandle, MixedTeamStatusChange } from "./mixed-team-member-handle.js";
import type { InterAgentMessageDeliveryRequest } from "../../../domain/inter-agent-message-delivery.js";

export class MixedTeamMemberRegistry {
  private readonly handles = new Map<string, MixedTeamMemberHandle>();
  private readonly taskAgentHandles = new Map<string, MixedAgentMemberHandle>();

  constructor(private readonly options: {
    teamContext: TeamRunContext<MixedTeamRunContext>;
    subTeamRunFactory: MixedSubTeamRunFactory;
    publish: MixedTeamEventPublish;
    notifyStatusChange: MixedTeamStatusChange;
    deliverInterAgentMessage: (request: InterAgentMessageDeliveryRequest) => Promise<AgentOperationResult>;
  }) {}

  listHandles(): MixedTeamMemberHandle[] {
    return Array.from(this.handles.values());
  }

  listTaskAgentHandles(): MixedAgentMemberHandle[] {
    return Array.from(this.taskAgentHandles.values());
  }

  remove(memberRouteKey: string): boolean {
    const normalized = memberRouteKey.trim();
    const handle = this.handles.get(normalized) ?? null;
    if (!handle) {
      return false;
    }
    handle.dispose();
    this.handles.delete(normalized);
    return true;
  }

  resolveContext(selector: TeamMemberSelector): MixedTeamMemberContext | AgentOperationResult {
    const resolution = resolveTeamMemberSelector(selector, this.options.teamContext.runtimeContext.memberContexts);
    if (resolution.ok) {
      return resolution.member;
    }

    const topLevelName = getSelectorTopLevelName(selector);
    if (topLevelName) {
      const topLevelSelector = selector.kind === "path"
        ? selectorFromMemberPath([topLevelName])
        : selectorFromMemberRouteKey(topLevelName);
      const topLevelResolution = resolveTeamMemberSelector(
        topLevelSelector,
        this.options.teamContext.runtimeContext.memberContexts,
      );
      if (topLevelResolution.ok && topLevelResolution.member.memberKind === "agent_team") {
        return topLevelResolution.member;
      }
    }

    return { accepted: false, code: resolution.code, message: resolution.message };
  }

  getOrCreate(context: MixedTeamMemberContext): MixedTeamMemberHandle {
    const existing = this.handles.get(context.memberRouteKey) ?? null;
    if (existing) {
      return existing;
    }
    const config = this.resolveConfig(context);
    const handle = context.memberKind === "agent"
      ? new MixedAgentMemberHandle({
          teamContext: this.options.teamContext,
          context,
          config: config as Extract<TeamRunMemberConfig, { memberKind: "agent" }>,
          publish: this.options.publish,
          notifyStatusChange: this.options.notifyStatusChange,
          deliverInterAgentMessage: this.options.deliverInterAgentMessage,
        })
      : new MixedSubTeamMemberHandle({
          parentContext: this.options.teamContext,
          context,
          config: config as Extract<TeamRunMemberConfig, { memberKind: "agent_team" }>,
          subTeamRunFactory: this.options.subTeamRunFactory,
          publish: this.options.publish,
          notifyStatusChange: this.options.notifyStatusChange,
          deliverInterAgentMessage: this.options.deliverInterAgentMessage,
        });
    this.handles.set(context.memberRouteKey, handle);
    return handle;
  }

  async startTaskAgentInstance(
    request: StartTaskAgentInstanceRequest,
  ): Promise<AgentOperationResult> {
    const logicalContext = this.options.teamContext.runtimeContext.memberContexts.find(
      (member) =>
        member.memberRouteKey === request.identity.logicalMember.memberRouteKey,
    ) ?? null;
    if (!logicalContext) {
      return {
        accepted: false,
        code: "TARGET_MEMBER_NOT_FOUND",
        message: `Logical member '${request.identity.logicalMember.memberRouteKey}' was not found.`,
      };
    }
    if (logicalContext.memberKind !== "agent") {
      return {
        accepted: false,
        code: "UNSUPPORTED_TASK_AGENT_TARGET",
        message: "Task-agent instances can only start for concrete agent members.",
      };
    }
    const existing = this.taskAgentHandles.get(request.identity.taskAgentRunId) ?? null;
    if (existing?.isActive()) {
      return {
        accepted: false,
        code: "TASK_AGENT_ALREADY_ACTIVE",
        message: `Task-agent run '${request.identity.taskAgentRunId}' is already active.`,
      };
    }
    existing?.dispose();
    this.taskAgentHandles.delete(request.identity.taskAgentRunId);
    const config = this.resolveConfig(logicalContext);
    const taskAgentContext = new MixedAgentMemberContext({
      memberName: logicalContext.memberName,
      memberPath: logicalContext.memberPath,
      memberRouteKey: logicalContext.memberRouteKey,
      memberRunId: request.identity.taskAgentRunId,
      runtimeKind: logicalContext.runtimeKind,
      platformAgentRunId: null,
    });
    const handle = new MixedAgentMemberHandle({
      teamContext: this.options.teamContext,
      context: taskAgentContext,
      config: config as Extract<TeamRunMemberConfig, { memberKind: "agent" }>,
      publish: this.options.publish,
      notifyStatusChange: this.options.notifyStatusChange,
      deliverInterAgentMessage: this.options.deliverInterAgentMessage,
      taskAgentInstance: cloneTaskAgentInstanceIdentity(request.identity),
    });
    this.taskAgentHandles.set(request.identity.taskAgentRunId, handle);
    const result = await handle.postMessage(request.message);
    if (!result.accepted) {
      await handle.terminate();
      this.taskAgentHandles.delete(request.identity.taskAgentRunId);
    }
    return result;
  }

  async settleTaskAgentInstance(
    logicalMemberRouteKey: string,
    taskAgentRunId: string,
  ): Promise<AgentOperationResult> {
    const handle = this.taskAgentHandles.get(taskAgentRunId) ?? null;
    if (!handle) {
      return {
        accepted: false,
        code: "TASK_AGENT_RUN_NOT_FOUND",
        message: `Task-agent run '${taskAgentRunId}' was not found.`,
      };
    }
    if (handle.context.memberRouteKey !== logicalMemberRouteKey) {
      return {
        accepted: false,
        code: "TASK_AGENT_ROUTE_MISMATCH",
        message: `Task-agent run '${taskAgentRunId}' is not for logical member '${logicalMemberRouteKey}'.`,
      };
    }
    const result = await handle.terminate();
    if (result.accepted) {
      this.taskAgentHandles.delete(taskAgentRunId);
    }
    return result;
  }

  async approveTaskAgentToolInvocation(
    logicalMemberRouteKey: string,
    taskAgentRunId: string,
    invocationId: string,
    approved: boolean,
    reason: string | null = null,
  ): Promise<AgentOperationResult> {
    const handle = this.taskAgentHandles.get(taskAgentRunId) ?? null;
    if (!handle) {
      return {
        accepted: false,
        code: "TASK_AGENT_RUN_NOT_FOUND",
        message: `Task-agent run '${taskAgentRunId}' was not found.`,
      };
    }
    if (handle.context.memberRouteKey !== logicalMemberRouteKey) {
      return {
        accepted: false,
        code: "TASK_AGENT_ROUTE_MISMATCH",
        message: `Task-agent run '${taskAgentRunId}' is not for logical member '${logicalMemberRouteKey}'.`,
      };
    }
    if (!handle.isActive()) {
      return {
        accepted: false,
        code: "TARGET_MEMBER_INACTIVE",
        message: `Task-agent run '${taskAgentRunId}' is not active.`,
      };
    }
    return handle.approveToolInvocation(null, invocationId, approved, reason ?? null);
  }

  resolveTaskAgentLogicalContext(runId: string): MixedTeamMemberContext | null {
    for (const handle of this.taskAgentHandles.values()) {
      if (
        handle.context.memberRunId === runId ||
        handle.context.getPlatformAgentRunId() === runId
      ) {
        return this.options.teamContext.runtimeContext.memberContexts.find(
          (member) => member.memberRouteKey === handle.context.memberRouteKey,
        ) ?? null;
      }
    }
    return null;
  }

  async terminateTaskAgentInstances(): Promise<AgentOperationResult> {
    for (const [runId, handle] of this.taskAgentHandles.entries()) {
      const result = await handle.terminate();
      if (!result.accepted) {
        return result;
      }
      this.taskAgentHandles.delete(runId);
    }
    return { accepted: true };
  }

  dispose(): void {
    for (const handle of this.handles.values()) {
      handle.dispose();
    }
    for (const handle of this.taskAgentHandles.values()) {
      handle.dispose();
    }
    this.handles.clear();
    this.taskAgentHandles.clear();
  }

  private resolveConfig(context: MixedTeamMemberContext): TeamRunMemberConfig {
    const stack = [...(this.options.teamContext.config?.memberTree ?? [])];
    while (stack.length > 0) {
      const member = stack.shift()!;
      if (member.memberRouteKey === context.memberRouteKey || member.memberRunId === context.memberRunId) {
        return member;
      }
      if (member.memberKind === "agent_team") {
        stack.push(...member.memberConfigs);
      }
    }
    throw new Error(`Missing member config for '${context.memberRouteKey}'.`);
  }
}
