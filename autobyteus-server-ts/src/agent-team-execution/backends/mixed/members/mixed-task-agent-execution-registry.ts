import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentTeamAddress } from "../../../../agent-collaboration/domain/agent-team-address.js";
import type { AgentOperationResult } from "../../../../agent-execution/domain/agent-operation-result.js";
import type { AgentRunManager } from "../../../../agent-execution/services/agent-run-manager.js";
import type { StartTaskAgentExecutionRequest } from "../../../domain/task-agent-execution.js";
import type { TeamRunContext } from "../../../domain/team-run-context.js";
import type {
  InterAgentMessageDeliveryIntent,
  ResolvedInterAgentMessageDeliveryRequest,
} from "../../../domain/inter-agent-message-delivery.js";
import {
  MixedAgentMemberContext,
  type MixedTeamRunContext,
  type MixedTeamMemberContext,
} from "../mixed-team-run-context.js";
import { MixedAgentMemberHandle } from "./mixed-agent-member-handle.js";
import { getMixedTaskAgentHandleRecoveryCache } from "./mixed-task-agent-handle-recovery-cache.js";
import type { MixedTeamEventPublish } from "./mixed-team-member-handle.js";
import { MixedTeamMemberConfigResolver } from "./mixed-team-member-config-resolver.js";

export type TaskAgentExecutionDeliveryAccess = {
  deliverInterAgentMessageToTaskAgent(
    address: AgentTeamAddress,
    taskAgentRunId: string,
    request: ResolvedInterAgentMessageDeliveryRequest,
    beforePublishMemberInput?: (() => void) | null,
  ): Promise<AgentOperationResult>;
  resolveTaskAgentLogicalContext(runId: string): MixedTeamMemberContext | null;
};

export class MixedTaskAgentExecutionRegistry implements TaskAgentExecutionDeliveryAccess {
  private readonly cache = getMixedTaskAgentHandleRecoveryCache();
  private readonly handles = new Map<string, MixedAgentMemberHandle>();
  private readonly pendingWork = new Map<string, AgentInputUserMessage>();

  constructor(private readonly options: {
    teamContext: TeamRunContext<MixedTeamRunContext>;
    configResolver: MixedTeamMemberConfigResolver;
    agentRunManager?: AgentRunManager;
    publish: MixedTeamEventPublish;
    deliverInterAgentMessage: (request: InterAgentMessageDeliveryIntent) => Promise<AgentOperationResult>;
  }) {}

  listHandles(): MixedAgentMemberHandle[] { return [...this.handles.values()]; }

  async start(request: StartTaskAgentExecutionRequest): Promise<AgentOperationResult> {
    const address = request.receiver.memberAddress;
    const source = this.options.teamContext.index.getAgent(address);
    if (!source || source.address !== request.sourceNode.address) {
      return { accepted: false, code: "TARGET_MEMBER_NOT_FOUND", message: `Task Agent target '${address}' was not found.` };
    }
    const runId = request.receiver.taskAgentRunId?.trim() ?? "";
    if (!runId || !request.taskId.trim()) {
      return { accepted: false, code: "TASK_AGENT_IDENTITY_MISMATCH", message: "Task Agent request requires taskId and taskAgentRunId." };
    }
    const existing = this.handles.get(runId);
    if (existing?.isActive()) {
      return { accepted: false, code: "TASK_AGENT_ALREADY_ACTIVE", message: `Task AgentRun '${runId}' is already active.` };
    }
    existing?.dispose();
    const handle = this.createHandle(request, source.runtimeKind);
    this.handles.set(runId, handle);
    this.pendingWork.set(runId, request.message);
    this.cache.remember({
      rootTeamRunId: this.rootId(),
      taskId: request.taskId,
      taskAgentRunId: runId,
    }, handle);
    return { accepted: true };
  }

  releaseWork(taskAgentRunId: string): void {
    const runId = taskAgentRunId.trim();
    const handle = this.handles.get(runId);
    const message = this.pendingWork.get(runId);
    if (!handle || !message) throw new Error(`Prepared task AgentRun '${runId}' was not found.`);
    this.pendingWork.delete(runId);
    queueMicrotask(() => {
      void handle.postMessage(message).then((result) => {
        if (!result.accepted) void this.cleanup(runId, handle);
      }).catch(() => { void this.cleanup(runId, handle); });
    });
  }

  postMessage(address: AgentTeamAddress, taskAgentRunId: string, message: AgentInputUserMessage) {
    const resolved = this.resolve(address, taskAgentRunId);
    return "accepted" in resolved ? Promise.resolve(resolved) : resolved.postMessage(message);
  }

  deliverInterAgentMessageToTaskAgent(
    address: AgentTeamAddress,
    taskAgentRunId: string,
    request: ResolvedInterAgentMessageDeliveryRequest,
    beforePublishMemberInput: (() => void) | null = null,
  ) {
    const resolved = this.resolve(address, taskAgentRunId);
    return "accepted" in resolved
      ? Promise.resolve(resolved)
      : resolved.deliverInterMemberMessage(request, beforePublishMemberInput);
  }

  approveToolInvocation(address: AgentTeamAddress, taskAgentRunId: string, invocationId: string, approved: boolean, reason: string | null = null) {
    const resolved = this.resolve(address, taskAgentRunId);
    return "accepted" in resolved
      ? Promise.resolve(resolved)
      : resolved.approveToolInvocation(address, invocationId, approved, reason);
  }

  interrupt(address: AgentTeamAddress, taskAgentRunId: string) {
    const resolved = this.resolve(address, taskAgentRunId);
    return "accepted" in resolved
      ? Promise.resolve(resolved)
      : resolved.interrupt(address, taskAgentRunId);
  }

  async settle(address: AgentTeamAddress, taskAgentRunId: string) {
    const resolved = this.resolve(address, taskAgentRunId);
    if ("accepted" in resolved) return resolved;
    const result = await resolved.terminate();
    if (result.accepted) this.forget(taskAgentRunId);
    return result;
  }

  async terminateAll(): Promise<AgentOperationResult> {
    for (const [runId, handle] of this.handles) {
      const result = await handle.terminate();
      if (!result.accepted) return result;
      this.forget(runId);
    }
    this.cache.forgetTeam(this.rootId());
    return { accepted: true };
  }

  resolveTaskAgentLogicalContext(runId: string): MixedTeamMemberContext | null {
    const handle = this.handles.get(runId) ?? null;
    if (!handle) return null;
    return this.options.teamContext.runtimeContext.memberContexts
      .find((member) => member.address === handle.context.address) ?? null;
  }

  dispose(): void {
    for (const handle of this.handles.values()) handle.dispose();
    this.handles.clear();
    this.pendingWork.clear();
    this.cache.forgetTeam(this.rootId());
  }

  private createHandle(
    request: StartTaskAgentExecutionRequest,
    runtimeKind: import("../../../../runtime-management/runtime-kind-enum.js").RuntimeKind,
  ): MixedAgentMemberHandle {
    const taskAgentRunId = request.receiver.taskAgentRunId!;
    return new MixedAgentMemberHandle({
      teamContext: this.options.teamContext,
      context: new MixedAgentMemberContext({
        address: request.receiver.memberAddress,
        agentRunId: taskAgentRunId,
        runtimeKind,
        platformAgentRunId: null,
      }),
      config: Object.freeze({ ...request.sourceNode, agentRunId: taskAgentRunId, platformAgentRunId: null }),
      agentRunManager: this.options.agentRunManager,
      publish: this.options.publish,
      deliverInterAgentMessage: this.options.deliverInterAgentMessage,
      taskId: request.taskId,
    });
  }

  private resolve(address: AgentTeamAddress, taskAgentRunId: string): MixedAgentMemberHandle | AgentOperationResult {
    const runId = taskAgentRunId.trim();
    const handle = this.handles.get(runId) ?? this.cache.get(this.rootId(), runId)?.handle ?? null;
    if (!handle) return { accepted: false, code: "TASK_AGENT_RUN_NOT_FOUND", message: `Task AgentRun '${taskAgentRunId}' was not found.` };
    if (handle.context.address !== address) return { accepted: false, code: "TASK_AGENT_ADDRESS_MISMATCH", message: `Task AgentRun '${taskAgentRunId}' is not at '${address}'.` };
    this.handles.set(runId, handle);
    return handle;
  }

  private async cleanup(runId: string, handle: MixedAgentMemberHandle): Promise<void> {
    try { await handle.terminate(); } catch { handle.dispose(); } finally { this.forget(runId); }
  }
  private forget(runId: string): void {
    this.handles.delete(runId.trim());
    this.pendingWork.delete(runId.trim());
    this.cache.forget(this.rootId(), runId);
  }
  private rootId(): string { return this.options.teamContext.config.rootTeam.teamRunId; }
}
