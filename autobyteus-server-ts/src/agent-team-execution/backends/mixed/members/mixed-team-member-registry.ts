import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { AgentRunManager } from "../../../../agent-execution/services/agent-run-manager.js";
import type { AgentRun } from "../../../../agent-execution/domain/agent-run.js";
import type { AgentOperationResult } from "../../../../agent-execution/domain/agent-operation-result.js";
import type { AgentMemoryScope } from "../../../../agent-memory/domain/agent-memory-location.js";
import { getAgentMemoryLocationService } from "../../../../agent-memory/services/agent-memory-location-service.js";
import type { StartTaskAgentInstanceRequest, TaskAgentInstanceIdentity } from "../../../domain/task-agent-instance.js";
import { cloneTaskAgentInstanceIdentity } from "../../../domain/task-agent-instance.js";
import type { TeamRunContext } from "../../../domain/team-run-context.js";
import type { TeamMemberRunConfig, TeamRunMemberConfig } from "../../../domain/team-run-config.js";
import { getSelectorTopLevelName, resolveTeamMemberSelector, selectorFromMemberPath, selectorFromMemberRouteKey, type TeamMemberSelector } from "../../../domain/team-run-member-identity.js";
import type { MixedTeamRunContext, MixedTeamMemberContext } from "../mixed-team-run-context.js";
import { MixedAgentMemberContext } from "../mixed-team-run-context.js";
import type { MixedSubTeamRunFactory } from "../mixed-sub-team-run-factory.js";
import { MixedAgentMemberHandle } from "./mixed-agent-member-handle.js";
import { getMixedTaskAgentHandleRecoveryCache } from "./mixed-task-agent-handle-recovery-cache.js";
import { MixedSubTeamMemberHandle } from "./mixed-sub-team-member-handle.js";
import type { MixedTeamEventPublish, MixedTeamMemberHandle, MixedTeamStatusChange } from "./mixed-team-member-handle.js";
import type { InterAgentMessageDeliveryIntent, ResolvedInterAgentMessageDeliveryRequest } from "../../../domain/inter-agent-message-delivery.js";

export class MixedTeamMemberRegistry {
  private readonly handles = new Map<string, MixedTeamMemberHandle>();
  private readonly recoverableTaskAgentHandles = getMixedTaskAgentHandleRecoveryCache();
  private readonly taskAgentHandles = new Map<string, MixedAgentMemberHandle>();
  private readonly memoryLocationService = getAgentMemoryLocationService();

  constructor(private readonly options: {
    teamContext: TeamRunContext<MixedTeamRunContext>;
    subTeamRunFactory: MixedSubTeamRunFactory;
    agentRunManager?: AgentRunManager;
    publish: MixedTeamEventPublish;
    notifyStatusChange: MixedTeamStatusChange;
    deliverInterAgentMessage: (request: InterAgentMessageDeliveryIntent) => Promise<AgentOperationResult>;
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
          agentRunManager: this.options.agentRunManager,
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
    const config = this.buildTaskAgentRunConfig(logicalContext, request.identity.taskAgentRunId);
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
      config,
      agentRunManager: this.options.agentRunManager,
      publish: this.options.publish,
      notifyStatusChange: this.options.notifyStatusChange,
      deliverInterAgentMessage: this.options.deliverInterAgentMessage,
      taskAgentInstance: cloneTaskAgentInstanceIdentity(request.identity),
    });
    this.taskAgentHandles.set(request.identity.taskAgentRunId, handle);
    try {
      const result = await handle.postMessage(request.message);
      if (!result.accepted) {
        await this.cleanupFailedTaskAgentStart(request.identity.taskAgentRunId, handle);
      } else {
        this.recoverableTaskAgentHandles.remember(request.identity, handle);
      }
      return result;
    } catch (error) {
      await this.cleanupFailedTaskAgentStart(request.identity.taskAgentRunId, handle);
      throw error;
    }
  }

  async settleTaskAgentInstance(
    logicalMemberRouteKey: string,
    taskAgentRunId: string,
  ): Promise<AgentOperationResult> {
    const resolved = this.resolveTaskAgentHandle(logicalMemberRouteKey, taskAgentRunId);
    if ("accepted" in resolved) {
      return resolved;
    }
    const result = await resolved.terminate();
    if (result.accepted) {
      this.taskAgentHandles.delete(taskAgentRunId.trim());
      this.forgetRecoverableTaskAgentHandle(taskAgentRunId);
    }
    return result;
  }

  async postMessageToTaskAgent(
    logicalMemberRouteKey: string,
    taskAgentRunId: string,
    message: AgentInputUserMessage,
  ): Promise<AgentOperationResult> {
    const resolved = this.resolveTaskAgentHandle(logicalMemberRouteKey, taskAgentRunId);
    if ("accepted" in resolved) {
      return resolved;
    }
    return resolved.postMessage(message);
  }

  async deliverInterAgentMessageToTaskAgent(
    logicalMemberRouteKey: string,
    taskAgentRunId: string,
    request: ResolvedInterAgentMessageDeliveryRequest,
    beforePublishMemberInput: (() => void) | null = null,
  ): Promise<AgentOperationResult> {
    const resolved = this.resolveTaskAgentHandle(logicalMemberRouteKey, taskAgentRunId);
    if ("accepted" in resolved) {
      return resolved;
    }
    return resolved.deliverInterMemberMessage(request, beforePublishMemberInput);
  }

  async approveTaskAgentToolInvocation(
    logicalMemberRouteKey: string,
    taskAgentRunId: string,
    invocationId: string,
    approved: boolean,
    reason: string | null = null,
  ): Promise<AgentOperationResult> {
    const resolved = this.resolveTaskAgentHandle(logicalMemberRouteKey, taskAgentRunId);
    if ("accepted" in resolved) {
      return resolved;
    }
    return resolved.approveToolInvocation(null, invocationId, approved, reason ?? null);
  }

  resolveTaskAgentLogicalContext(runId: string): MixedTeamMemberContext | null {
    for (const handle of this.taskAgentHandles.values()) {
      if (
        handle.context.memberRunId === runId ||
        handle.context.getPlatformAgentRunId() === runId
      ) {
        return this.options.teamContext.runtimeContext.memberContexts.find((member) =>
          member.memberRouteKey === handle.context.memberRouteKey,
        ) ?? null;
      }
    }
    return null;
  }

  async terminateTaskAgentInstances(): Promise<AgentOperationResult> {
    for (const [runId, handle] of this.listCurrentTaskAgentHandleEntries()) {
      const result = await handle.terminate();
      if (!result.accepted) {
        return result;
      }
      this.taskAgentHandles.delete(runId);
      this.forgetRecoverableTaskAgentHandle(runId);
    }
    this.taskAgentHandles.clear();
    this.forgetRecoverableTaskAgentHandlesForCurrentTeamRun();
    return { accepted: true };
  }

  dispose(): void {
    for (const handle of this.handles.values()) {
      handle.dispose();
    }
    for (const [runId, handle] of this.listCurrentTaskAgentHandleEntries()) {
      handle.dispose();
      this.forgetRecoverableTaskAgentHandle(runId);
    }
    this.handles.clear();
    this.taskAgentHandles.clear();
    this.forgetRecoverableTaskAgentHandlesForCurrentTeamRun();
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

  private recoverTaskAgentHandle(
    logicalMemberRouteKey: string,
    taskAgentRunId: string,
  ): MixedAgentMemberHandle | null {
    const normalizedRouteKey = logicalMemberRouteKey.trim();
    const normalizedRunId = taskAgentRunId.trim();
    if (!normalizedRouteKey || !normalizedRunId) {
      return null;
    }

    const logicalContext = this.options.teamContext.runtimeContext.memberContexts.find(
      (member) => member.memberRouteKey === normalizedRouteKey,
    ) ?? null;
    if (!logicalContext || logicalContext.memberKind !== "agent") {
      return null;
    }

    const activeRun = (this.options.agentRunManager ?? AgentRunManager.getInstance())
      .getActiveRun(normalizedRunId);
    if (activeRun) {
      const taskAgentInstance = this.resolveRecoverableTaskAgentIdentity(
        activeRun,
        logicalContext,
        normalizedRunId,
      );
      if (taskAgentInstance) {
        const handle = this.createRecoveredTaskAgentHandle(
          logicalContext,
          normalizedRunId,
          taskAgentInstance,
          activeRun.getPlatformAgentRunId(),
        );
        handle.adoptExistingRun(activeRun);
        this.taskAgentHandles.set(normalizedRunId, handle);
        this.recoverableTaskAgentHandles.remember(taskAgentInstance, handle);
        return handle;
      }
    }

    return this.recoverRememberedTaskAgentHandle(
      logicalContext,
      normalizedRunId,
    );
  }

  private resolveTaskAgentHandle(
    logicalMemberRouteKey: string,
    taskAgentRunId: string,
  ): MixedAgentMemberHandle | AgentOperationResult {
    const normalizedRouteKey = logicalMemberRouteKey.trim();
    const normalizedRunId = taskAgentRunId.trim();
    const handle = this.taskAgentHandles.get(normalizedRunId)
      ?? this.recoverTaskAgentHandle(normalizedRouteKey, normalizedRunId);
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

  private forgetRecoverableTaskAgentHandle(taskAgentRunId: string): void {
    this.recoverableTaskAgentHandles.forget(this.options.teamContext.runId, taskAgentRunId);
  }

  private forgetRecoverableTaskAgentHandlesForCurrentTeamRun(): void {
    this.recoverableTaskAgentHandles.forgetTeam(this.options.teamContext.runId);
  }

  private async cleanupFailedTaskAgentStart(
    taskAgentRunId: string,
    handle: MixedAgentMemberHandle,
  ): Promise<void> {
    try {
      await handle.terminate();
    } catch {
      handle.dispose();
    } finally {
      this.taskAgentHandles.delete(taskAgentRunId.trim());
      this.forgetRecoverableTaskAgentHandle(taskAgentRunId);
    }
  }

  private listCurrentTaskAgentHandleEntries(): Array<[string, MixedAgentMemberHandle]> {
    const entries: Array<[string, MixedAgentMemberHandle]> = [];
    const seen = new Set<MixedAgentMemberHandle>();
    const add = (runId: string, handle: MixedAgentMemberHandle): void => {
      const normalizedRunId = runId.trim();
      if (!normalizedRunId || seen.has(handle)) {
        return;
      }
      seen.add(handle);
      entries.push([normalizedRunId, handle]);
    };
    for (const [runId, handle] of this.taskAgentHandles.entries()) {
      add(runId, handle);
    }
    for (const record of this.recoverableTaskAgentHandles.listForTeam(this.options.teamContext.runId)) {
      add(record.identity.taskAgentRunId, record.handle);
    }
    return entries;
  }

  private recoverRememberedTaskAgentHandle(
    logicalContext: Extract<MixedTeamMemberContext, { memberKind: "agent" }>,
    taskAgentRunId: string,
  ): MixedAgentMemberHandle | null {
    const record = this.recoverableTaskAgentHandles.get(
      this.options.teamContext.runId,
      taskAgentRunId,
    );
    if (!record) {
      return null;
    }
    if (!this.isRecoverableTaskAgentIdentity(record.identity, logicalContext, taskAgentRunId)) {
      this.forgetRecoverableTaskAgentHandle(taskAgentRunId);
      return null;
    }

    const rememberedPlatformRunId = record.handle.context.getPlatformAgentRunId();
    const run = record.handle.releaseExistingRunForAdoption();
    const platformAgentRunId = run?.getPlatformAgentRunId() ?? rememberedPlatformRunId;
    if (!run?.isActive() && !platformAgentRunId) {
      this.forgetRecoverableTaskAgentHandle(taskAgentRunId);
      return null;
    }

    const taskAgentInstance = cloneTaskAgentInstanceIdentity(record.identity);
    const handle = this.createRecoveredTaskAgentHandle(
      logicalContext,
      taskAgentRunId,
      taskAgentInstance,
      platformAgentRunId,
    );
    if (run?.isActive()) {
      handle.adoptExistingRun(run);
    }
    this.taskAgentHandles.set(taskAgentRunId, handle);
    this.recoverableTaskAgentHandles.remember(taskAgentInstance, handle);
    return handle;
  }

  private createRecoveredTaskAgentHandle(
    logicalContext: Extract<MixedTeamMemberContext, { memberKind: "agent" }>,
    taskAgentRunId: string,
    taskAgentInstance: TaskAgentInstanceIdentity,
    platformAgentRunId: string | null,
  ): MixedAgentMemberHandle {
    const taskAgentContext = new MixedAgentMemberContext({
      memberName: logicalContext.memberName,
      memberPath: logicalContext.memberPath,
      memberRouteKey: logicalContext.memberRouteKey,
      memberRunId: taskAgentRunId,
      runtimeKind: logicalContext.runtimeKind,
      platformAgentRunId,
    });
    return new MixedAgentMemberHandle({
      teamContext: this.options.teamContext,
      context: taskAgentContext,
      config: this.buildTaskAgentRunConfig(logicalContext, taskAgentRunId),
      agentRunManager: this.options.agentRunManager,
      publish: this.options.publish,
      notifyStatusChange: this.options.notifyStatusChange,
      deliverInterAgentMessage: this.options.deliverInterAgentMessage,
      taskAgentInstance,
    });
  }

  private resolveRecoverableTaskAgentIdentity(
    activeRun: AgentRun,
    logicalContext: Extract<MixedTeamMemberContext, { memberKind: "agent" }>,
    taskAgentRunId: string,
  ): TaskAgentInstanceIdentity | null {
    const memberTeamContext = activeRun.config.memberTeamContext;
    const identity = memberTeamContext?.taskAgentInstance ?? null;
    if (!memberTeamContext || !identity) {
      return null;
    }
    if (
      activeRun.runId !== taskAgentRunId ||
      memberTeamContext.teamRunId !== this.options.teamContext.runId ||
      memberTeamContext.memberRouteKey !== logicalContext.memberRouteKey ||
      memberTeamContext.memberRunId !== taskAgentRunId ||
      !this.isRecoverableTaskAgentIdentity(identity, logicalContext, taskAgentRunId)
    ) {
      return null;
    }
    return cloneTaskAgentInstanceIdentity(identity);
  }

  private isRecoverableTaskAgentIdentity(
    identity: TaskAgentInstanceIdentity,
    logicalContext: Extract<MixedTeamMemberContext, { memberKind: "agent" }>,
    taskAgentRunId: string,
  ): boolean {
    return (
      identity.teamRunId === this.options.teamContext.runId &&
      identity.taskAgentRunId === taskAgentRunId &&
      identity.taskAgentInstanceId.trim().length > 0 &&
      identity.taskId.trim().length > 0 &&
      identity.logicalMember.memberRouteKey === logicalContext.memberRouteKey &&
      identity.logicalMember.templateMemberRunId === logicalContext.memberRunId &&
      this.sameMemberPath(identity.logicalMember.memberPath, logicalContext.memberPath)
    );
  }

  private buildTaskAgentRunConfig(
    logicalContext: Extract<MixedTeamMemberContext, { memberKind: "agent" }>,
    taskAgentRunId: string,
  ): TeamMemberRunConfig {
    const config = this.resolveConfig(logicalContext) as TeamMemberRunConfig;
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
    return {
      ...config,
      memoryDir: taskLocation.memoryDir,
    };
  }

  private getCurrentMemoryScope(): AgentMemoryScope {
    const scope = this.options.teamContext.runtimeContext.parentBoundary?.memoryScope;
    return scope
      ? { rootTeamRunId: scope.rootTeamRunId, teamRunPath: [...scope.teamRunPath] }
      : { rootTeamRunId: this.options.teamContext.runId, teamRunPath: [] };
  }

  private sameMemberPath(left: readonly string[], right: readonly string[]): boolean {
    return left.length === right.length && left.every((part, index) => part === right[index]);
  }
}
