import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { AgentRunManager } from "../../../../agent-execution/services/agent-run-manager.js";
import type { AgentRun } from "../../../../agent-execution/domain/agent-run.js";
import type { AgentOperationResult } from "../../../../agent-execution/domain/agent-operation-result.js";
import type { AgentMemoryScope } from "../../../../agent-memory/domain/agent-memory-location.js";
import { getAgentMemoryLocationService } from "../../../../agent-memory/services/agent-memory-location-service.js";
import {
  cloneTaskAgentInstanceIdentity,
  type StartTaskAgentInstanceRequest,
  type TaskAgentInstanceIdentity,
} from "../../../domain/task-agent-instance.js";
import type { TeamRunContext } from "../../../domain/team-run-context.js";
import type { TeamMemberRunConfig } from "../../../domain/team-run-config.js";
import type {
  InterAgentMessageDeliveryIntent,
  ResolvedInterAgentMessageDeliveryRequest,
} from "../../../domain/inter-agent-message-delivery.js";
import { MixedAgentMemberContext, type MixedTeamRunContext, type MixedTeamMemberContext } from "../mixed-team-run-context.js";
import { MixedAgentMemberHandle } from "./mixed-agent-member-handle.js";
import { getMixedTaskAgentHandleRecoveryCache } from "./mixed-task-agent-handle-recovery-cache.js";
import type { MixedTeamEventPublish, MixedTeamStatusChange } from "./mixed-team-member-handle.js";
import { MixedTeamMemberConfigResolver } from "./mixed-team-member-config-resolver.js";
import type { MemberTeamContextBuilder } from "../../../services/member-team-context-builder.js";
import type {
  AgentToolMcpSessionManager,
} from "../../../../agent-tools/mcp/agent-tool-mcp-session-service.js";

export type TaskAgentInstanceDeliveryAccess = {
  deliverInterAgentMessageToTaskAgent(
    logicalMemberRouteKey: string,
    taskAgentRunId: string,
    request: ResolvedInterAgentMessageDeliveryRequest,
    beforePublishMemberInput?: (() => void) | null,
  ): Promise<AgentOperationResult>;
  resolveTaskAgentLogicalContext(runId: string): MixedTeamMemberContext | null;
};

export class MixedTaskAgentInstanceRegistry implements TaskAgentInstanceDeliveryAccess {
  private readonly recoverableTaskAgentHandles = getMixedTaskAgentHandleRecoveryCache();
  private readonly handles = new Map<string, MixedAgentMemberHandle>();
  private readonly memoryLocationService = getAgentMemoryLocationService();

  constructor(private readonly options: {
    teamContext: TeamRunContext<MixedTeamRunContext>;
    configResolver: MixedTeamMemberConfigResolver;
    agentRunManager?: AgentRunManager;
    agentToolMcpSessionManager?: AgentToolMcpSessionManager;
    memberTeamContextBuilder: MemberTeamContextBuilder;
    publish: MixedTeamEventPublish;
    notifyStatusChange: MixedTeamStatusChange;
    deliverInterAgentMessage: (request: InterAgentMessageDeliveryIntent) => Promise<AgentOperationResult>;
  }) {}

  listHandles(): MixedAgentMemberHandle[] { return [...this.handles.values()]; }

  async start(request: StartTaskAgentInstanceRequest): Promise<AgentOperationResult> {
    const logicalContext = this.resolveLogicalAgentContext(request.identity.logicalMember.memberRouteKey);
    if (!logicalContext) {
      return {
        accepted: false,
        code: "TARGET_MEMBER_NOT_FOUND",
        message: `Logical member '${request.identity.logicalMember.memberRouteKey}' was not found.`,
      };
    }
    if ("accepted" in logicalContext) return logicalContext;
    const existing = this.handles.get(request.identity.taskAgentRunId) ?? null;
    if (existing?.isActive()) {
      return {
        accepted: false,
        code: "TASK_AGENT_ALREADY_ACTIVE",
        message: `Task-agent run '${request.identity.taskAgentRunId}' is already active.`,
      };
    }
    existing?.dispose();
    this.handles.delete(request.identity.taskAgentRunId);

    const handle = new MixedAgentMemberHandle({
      teamContext: this.options.teamContext,
      context: new MixedAgentMemberContext({
        memberName: logicalContext.memberName,
        memberPath: logicalContext.memberPath,
        memberRouteKey: logicalContext.memberRouteKey,
        memberRunId: request.identity.taskAgentRunId,
        runtimeKind: logicalContext.runtimeKind,
        platformAgentRunId: null,
      }),
      config: this.buildTaskAgentRunConfig(logicalContext, request.identity.taskAgentRunId),
      agentRunManager: this.options.agentRunManager,
      agentToolMcpSessionManager:
        this.options.agentToolMcpSessionManager,
      memberTeamContextBuilder: this.options.memberTeamContextBuilder,
      publish: this.options.publish,
      notifyStatusChange: this.options.notifyStatusChange,
      deliverInterAgentMessage: this.options.deliverInterAgentMessage,
      taskAgentInstance: cloneTaskAgentInstanceIdentity(request.identity),
    });
    this.handles.set(request.identity.taskAgentRunId, handle);
    try {
      const result = await handle.postMessage(request.message);
      if (!result.accepted) {
        await this.cleanupFailedStart(request.identity.taskAgentRunId, handle);
      } else {
        this.recoverableTaskAgentHandles.remember(request.identity, handle);
      }
      return result;
    } catch (error) {
      await this.cleanupFailedStart(request.identity.taskAgentRunId, handle);
      throw error;
    }
  }

  async postMessage(
    logicalMemberRouteKey: string,
    taskAgentRunId: string,
    message: AgentInputUserMessage,
  ): Promise<AgentOperationResult> {
    const resolved = this.resolveHandle(logicalMemberRouteKey, taskAgentRunId);
    return "accepted" in resolved ? resolved : resolved.postMessage(message);
  }

  async deliverInterAgentMessageToTaskAgent(
    logicalMemberRouteKey: string,
    taskAgentRunId: string,
    request: ResolvedInterAgentMessageDeliveryRequest,
    beforePublishMemberInput: (() => void) | null = null,
  ): Promise<AgentOperationResult> {
    const resolved = this.resolveHandle(logicalMemberRouteKey, taskAgentRunId);
    return "accepted" in resolved
      ? resolved
      : resolved.deliverInterMemberMessage(request, beforePublishMemberInput);
  }

  async approveToolInvocation(
    logicalMemberRouteKey: string,
    taskAgentRunId: string,
    invocationId: string,
    approved: boolean,
    reason: string | null = null,
  ): Promise<AgentOperationResult> {
    const resolved = this.resolveHandle(logicalMemberRouteKey, taskAgentRunId);
    return "accepted" in resolved
      ? resolved
      : resolved.approveToolInvocation(null, invocationId, approved, reason ?? null);
  }

  async settle(logicalMemberRouteKey: string, taskAgentRunId: string): Promise<AgentOperationResult> {
    const resolved = this.resolveHandle(logicalMemberRouteKey, taskAgentRunId);
    if ("accepted" in resolved) return resolved;
    const result = await resolved.terminate();
    if (result.accepted) this.forgetAndDelete(taskAgentRunId);
    return result;
  }

  async terminateAll(): Promise<AgentOperationResult> {
    for (const [runId, handle] of this.listCurrentHandleEntries()) {
      const result = await handle.terminate();
      if (!result.accepted) return result;
      this.forgetAndDelete(runId);
    }
    this.handles.clear();
    this.recoverableTaskAgentHandles.forgetTeam(this.options.teamContext.runId);
    return { accepted: true };
  }

  resolveTaskAgentLogicalContext(runId: string): MixedTeamMemberContext | null {
    for (const handle of this.handles.values()) {
      if (handle.context.memberRunId === runId || handle.context.getPlatformAgentRunId() === runId) {
        return this.options.teamContext.runtimeContext.memberContexts.find((member) =>
          member.memberRouteKey === handle.context.memberRouteKey,
        ) ?? null;
      }
    }
    return null;
  }

  dispose(): void {
    for (const [runId, handle] of this.listCurrentHandleEntries()) {
      handle.dispose();
      this.recoverableTaskAgentHandles.forget(this.options.teamContext.runId, runId);
    }
    this.handles.clear();
    this.recoverableTaskAgentHandles.forgetTeam(this.options.teamContext.runId);
  }

  private resolveLogicalAgentContext(
    logicalMemberRouteKey: string,
  ): Extract<MixedTeamMemberContext, { memberKind: "agent" }> | null | AgentOperationResult {
    const logicalContext = this.options.teamContext.runtimeContext.memberContexts.find(
      (member) => member.memberRouteKey === logicalMemberRouteKey,
    ) ?? null;
    if (!logicalContext) return null;
    if (logicalContext.memberKind !== "agent") {
      return {
        accepted: false,
        code: "UNSUPPORTED_TASK_AGENT_TARGET",
        message: "Task-agent instances can only start for concrete agent members.",
      };
    }
    return logicalContext;
  }

  private resolveHandle(
    logicalMemberRouteKey: string,
    taskAgentRunId: string,
  ): MixedAgentMemberHandle | AgentOperationResult {
    const normalizedRouteKey = logicalMemberRouteKey.trim();
    const normalizedRunId = taskAgentRunId.trim();
    const handle = this.handles.get(normalizedRunId)
      ?? this.recoverHandle(normalizedRouteKey, normalizedRunId);
    if (!handle) {
      return {
        accepted: false,
        code: "TASK_AGENT_RUN_NOT_FOUND",
        message: `Task-agent run '${taskAgentRunId}' was not found.`,
      };
    }
    if (handle.context.memberRouteKey !== normalizedRouteKey) {
      return {
        accepted: false,
        code: "TASK_AGENT_ROUTE_MISMATCH",
        message: `Task-agent run '${taskAgentRunId}' is not for logical member '${logicalMemberRouteKey}'.`,
      };
    }
    return handle;
  }

  private recoverHandle(logicalMemberRouteKey: string, taskAgentRunId: string): MixedAgentMemberHandle | null {
    if (!logicalMemberRouteKey || !taskAgentRunId) return null;
    const logicalContext = this.resolveLogicalAgentContext(logicalMemberRouteKey);
    if (!logicalContext || "accepted" in logicalContext) return null;

    const activeRun = (this.options.agentRunManager ?? AgentRunManager.getInstance()).getActiveRun(taskAgentRunId);
    if (activeRun) {
      const taskAgentInstance = this.resolveRecoverableIdentity(activeRun, logicalContext, taskAgentRunId);
      if (taskAgentInstance) {
        const handle = this.createRecoveredHandle(
          logicalContext,
          taskAgentRunId,
          taskAgentInstance,
          activeRun.getPlatformAgentRunId(),
        );
        handle.adoptExistingRun(activeRun);
        this.handles.set(taskAgentRunId, handle);
        this.recoverableTaskAgentHandles.remember(taskAgentInstance, handle);
        return handle;
      }
    }
    return this.recoverRememberedHandle(logicalContext, taskAgentRunId);
  }

  private recoverRememberedHandle(
    logicalContext: Extract<MixedTeamMemberContext, { memberKind: "agent" }>,
    taskAgentRunId: string,
  ): MixedAgentMemberHandle | null {
    const record = this.recoverableTaskAgentHandles.get(this.options.teamContext.runId, taskAgentRunId);
    if (!record) return null;
    if (!this.isRecoverableIdentity(record.identity, logicalContext, taskAgentRunId)) {
      this.recoverableTaskAgentHandles.forget(this.options.teamContext.runId, taskAgentRunId);
      return null;
    }

    const rememberedPlatformRunId = record.handle.context.getPlatformAgentRunId();
    const run = record.handle.releaseExistingRunForAdoption();
    const platformAgentRunId = run?.getPlatformAgentRunId() ?? rememberedPlatformRunId;
    if (!run?.isActive() && !platformAgentRunId) {
      this.recoverableTaskAgentHandles.forget(this.options.teamContext.runId, taskAgentRunId);
      return null;
    }

    const taskAgentInstance = cloneTaskAgentInstanceIdentity(record.identity);
    const handle = this.createRecoveredHandle(logicalContext, taskAgentRunId, taskAgentInstance, platformAgentRunId);
    if (run?.isActive()) handle.adoptExistingRun(run);
    this.handles.set(taskAgentRunId, handle);
    this.recoverableTaskAgentHandles.remember(taskAgentInstance, handle);
    return handle;
  }

  private createRecoveredHandle(
    logicalContext: Extract<MixedTeamMemberContext, { memberKind: "agent" }>,
    taskAgentRunId: string,
    taskAgentInstance: TaskAgentInstanceIdentity,
    platformAgentRunId: string | null,
  ): MixedAgentMemberHandle {
    return new MixedAgentMemberHandle({
      teamContext: this.options.teamContext,
      context: new MixedAgentMemberContext({
        memberName: logicalContext.memberName,
        memberPath: logicalContext.memberPath,
        memberRouteKey: logicalContext.memberRouteKey,
        memberRunId: taskAgentRunId,
        runtimeKind: logicalContext.runtimeKind,
        platformAgentRunId,
      }),
      config: this.buildTaskAgentRunConfig(logicalContext, taskAgentRunId),
      agentRunManager: this.options.agentRunManager,
      agentToolMcpSessionManager:
        this.options.agentToolMcpSessionManager,
      memberTeamContextBuilder: this.options.memberTeamContextBuilder,
      publish: this.options.publish,
      notifyStatusChange: this.options.notifyStatusChange,
      deliverInterAgentMessage: this.options.deliverInterAgentMessage,
      taskAgentInstance,
    });
  }

  private resolveRecoverableIdentity(
    activeRun: AgentRun,
    logicalContext: Extract<MixedTeamMemberContext, { memberKind: "agent" }>,
    taskAgentRunId: string,
  ): TaskAgentInstanceIdentity | null {
    const memberTeamContext = activeRun.config.memberTeamContext;
    const identity = memberTeamContext?.taskAgentInstance ?? null;
    if (!memberTeamContext || !identity) return null;
    if (
      activeRun.runId !== taskAgentRunId ||
      memberTeamContext.teamRunId !== this.options.teamContext.runId ||
      memberTeamContext.memberRouteKey !== logicalContext.memberRouteKey ||
      memberTeamContext.memberRunId !== taskAgentRunId ||
      !this.isRecoverableIdentity(identity, logicalContext, taskAgentRunId)
    ) return null;
    return cloneTaskAgentInstanceIdentity(identity);
  }

  private isRecoverableIdentity(
    identity: TaskAgentInstanceIdentity,
    logicalContext: Extract<MixedTeamMemberContext, { memberKind: "agent" }>,
    taskAgentRunId: string,
  ): boolean {
    return identity.teamRunId === this.options.teamContext.runId &&
      identity.taskAgentRunId === taskAgentRunId &&
      identity.taskAgentInstanceId.trim().length > 0 &&
      identity.taskId.trim().length > 0 &&
      identity.logicalMember.memberRouteKey === logicalContext.memberRouteKey &&
      identity.logicalMember.templateMemberRunId === logicalContext.memberRunId &&
      this.sameMemberPath(identity.logicalMember.memberPath, logicalContext.memberPath);
  }

  private buildTaskAgentRunConfig(
    logicalContext: Extract<MixedTeamMemberContext, { memberKind: "agent" }>,
    taskAgentRunId: string,
  ): TeamMemberRunConfig {
    const config = this.options.configResolver.resolve(logicalContext) as TeamMemberRunConfig;
    const scope = this.getCurrentMemoryScope();
    const logicalLocation = this.memoryLocationService.getTeamAgentRunLocation({
      rootTeamRunId: scope.rootTeamRunId,
      teamRunPath: scope.teamRunPath,
      agentRunId: logicalContext.memberRunId,
    });
    const taskLocation = this.memoryLocationService.getTaskAgentLocation({
      logicalMemberLocation: logicalLocation,
      taskAgentRunId,
      logicalMemberRunId: logicalContext.memberRunId,
      logicalMemberRouteKey: logicalContext.memberRouteKey,
    });
    return { ...config, memoryDir: taskLocation.memoryDir };
  }

  private getCurrentMemoryScope(): AgentMemoryScope {
    const scope = this.options.teamContext.runtimeContext.parentBoundary?.memoryScope;
    return scope
      ? { rootTeamRunId: scope.rootTeamRunId, teamRunPath: [...scope.teamRunPath] }
      : { rootTeamRunId: this.options.teamContext.runId, teamRunPath: [] };
  }

  private async cleanupFailedStart(taskAgentRunId: string, handle: MixedAgentMemberHandle): Promise<void> {
    try { await handle.terminate(); }
    catch { handle.dispose(); }
    finally { this.forgetAndDelete(taskAgentRunId); }
  }

  private forgetAndDelete(taskAgentRunId: string): void {
    const normalized = taskAgentRunId.trim();
    this.handles.delete(normalized);
    this.recoverableTaskAgentHandles.forget(this.options.teamContext.runId, normalized);
  }

  private listCurrentHandleEntries(): Array<[string, MixedAgentMemberHandle]> {
    const entries: Array<[string, MixedAgentMemberHandle]> = [];
    const seen = new Set<MixedAgentMemberHandle>();
    const add = (runId: string, handle: MixedAgentMemberHandle): void => {
      const normalizedRunId = runId.trim();
      if (!normalizedRunId || seen.has(handle)) return;
      seen.add(handle);
      entries.push([normalizedRunId, handle]);
    };
    for (const [runId, handle] of this.handles.entries()) add(runId, handle);
    for (const record of this.recoverableTaskAgentHandles.listForTeam(this.options.teamContext.runId)) {
      add(record.identity.taskAgentRunId, record.handle);
    }
    return entries;
  }

  private sameMemberPath(left: readonly string[], right: readonly string[]): boolean {
    return left.length === right.length && left.every((part, index) => part === right[index]);
  }
}
