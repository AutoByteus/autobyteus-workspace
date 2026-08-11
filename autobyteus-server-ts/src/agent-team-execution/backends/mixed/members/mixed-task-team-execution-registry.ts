import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentTeamAddress } from "../../../../agent-collaboration/domain/agent-team-address.js";
import type { AgentOperationResult } from "../../../../agent-execution/domain/agent-operation-result.js";
import type { StartTaskTeamExecutionRequest } from "../../../domain/task-team-execution.js";
import type { TeamRunContext } from "../../../domain/team-run-context.js";
import type { InterAgentMessageDeliveryIntent } from "../../../domain/inter-agent-message-delivery.js";
import type { TaskTeamActiveRunDirectory } from "../../../task-delegation/task-team-active-run-directory.js";
import type { MixedSubTeamRunFactory } from "../mixed-sub-team-run-factory.js";
import type { MixedTeamRunContext } from "../mixed-team-run-context.js";
import { MixedTaskTeamMemberHandle } from "./mixed-task-team-member-handle.js";
import type { MixedTeamEventPublish } from "./mixed-team-member-handle.js";

export class MixedTaskTeamExecutionRegistry {
  private readonly handles = new Map<string, MixedTaskTeamMemberHandle>();
  private readonly pendingWork = new Map<string, AgentInputUserMessage>();

  constructor(private readonly options: {
    teamContext: TeamRunContext<MixedTeamRunContext>;
    subTeamRunFactory: MixedSubTeamRunFactory;
    taskTeamActiveRunDirectory: TaskTeamActiveRunDirectory;
    publish: MixedTeamEventPublish;
    deliverInterAgentMessage: (request: InterAgentMessageDeliveryIntent) => Promise<AgentOperationResult>;
  }) {}

  listHandles(): MixedTaskTeamMemberHandle[] { return [...this.handles.values()]; }

  async start(request: StartTaskTeamExecutionRequest): Promise<AgentOperationResult> {
    const source = this.options.teamContext.index.getTeam(request.teamNode.address);
    if (!source || source.coordinatorAddress !== request.teamNode.coordinatorAddress) {
      return { accepted: false, code: "TARGET_TEAM_NOT_FOUND", message: `Task AgentTeam target '${request.teamNode.address}' was not found.` };
    }
    const id = request.receiver.taskTeamRunIds.at(-1)?.trim() ?? "";
    const expectedTaskTeamRunIds = [...this.options.teamContext.taskTeamRunIds, id];
    if (
      !request.taskId.trim() ||
      !id ||
      request.teamNode.teamRunId !== id ||
      request.receiver.rootTeamRunId !== this.options.teamContext.config.rootTeam.teamRunId ||
      request.receiver.memberAddress !== source.coordinatorAddress ||
      request.receiver.taskAgentRunId !== null ||
      request.receiver.taskTeamRunIds.length !== expectedTaskTeamRunIds.length ||
      request.receiver.taskTeamRunIds.some((item, index) => item !== expectedTaskTeamRunIds[index])
    ) {
      return { accepted: false, code: "TASK_TEAM_IDENTITY_MISMATCH", message: `Task AgentTeam '${source.address}' receiver does not match its coordinator or task execution chain.` };
    }
    const existing = this.handles.get(id);
    if (existing?.isActive()) {
      return { accepted: false, code: "TASK_TEAM_ALREADY_ACTIVE", message: `Task TeamRun '${id}' is already active.` };
    }
    existing?.dispose();
    const handle = new MixedTaskTeamMemberHandle({
      parentContext: this.options.teamContext,
      request,
      subTeamRunFactory: this.options.subTeamRunFactory,
      taskTeamActiveRunDirectory: this.options.taskTeamActiveRunDirectory,
      publish: this.options.publish,
      deliverInterAgentMessage: this.options.deliverInterAgentMessage,
    });
    this.handles.set(id, handle);
    this.pendingWork.set(id, request.message);
    try {
      await handle.prepare();
      return { accepted: true };
    } catch (error) {
      await this.cleanup(id, handle);
      throw error;
    }
  }

  markActive(taskTeamRunId: string): void {
    if (!this.options.taskTeamActiveRunDirectory.markActive(taskTeamRunId)) {
      throw new Error(`Prepared task TeamRun '${taskTeamRunId}' was not found.`);
    }
  }

  releaseWork(target: AgentTeamAddress, taskTeamRunId: string): void {
    const id = taskTeamRunId.trim();
    const handle = this.handles.get(id);
    const message = this.pendingWork.get(id);
    if (!handle || !message || handle.context.address !== target) {
      throw new Error(`Prepared task TeamRun '${id}' was not found at '${target}'.`);
    }
    this.pendingWork.delete(id);
    queueMicrotask(() => {
      void handle.postMessage(message).then((result) => {
        if (!result.accepted) void this.cleanup(id, handle);
      }).catch(() => { void this.cleanup(id, handle); });
    });
  }

  postMessage(address: AgentTeamAddress, taskTeamRunId: string, message: AgentInputUserMessage) {
    const resolved = this.resolve(address, taskTeamRunId);
    return "accepted" in resolved ? Promise.resolve(resolved) : resolved.postMessage(message);
  }

  async settle(address: AgentTeamAddress, taskTeamRunId: string) {
    const resolved = this.resolve(address, taskTeamRunId);
    if ("accepted" in resolved) return resolved;
    const result = await resolved.terminate();
    if (result.accepted) this.forget(taskTeamRunId);
    return result;
  }

  approveToolInvocation(taskTeamRunId: string, target: AgentTeamAddress, invocationId: string, approved: boolean, reason: string | null = null, targetAgentRunId: string | null = null) {
    const handle = this.handles.get(taskTeamRunId.trim());
    return handle
      ? handle.approveToolInvocation(target, invocationId, approved, reason, targetAgentRunId)
      : Promise.resolve({ accepted: false, code: "TASK_TEAM_RUN_NOT_FOUND", message: `Task TeamRun '${taskTeamRunId}' was not found.` });
  }

  async terminateAll(): Promise<AgentOperationResult> {
    for (const [id, handle] of this.handles) {
      const result = await handle.terminate();
      if (!result.accepted) return result;
      this.forget(id);
    }
    return { accepted: true };
  }

  dispose(): void {
    for (const handle of this.handles.values()) handle.dispose();
    this.handles.clear();
    this.pendingWork.clear();
  }

  private resolve(address: AgentTeamAddress, id: string): MixedTaskTeamMemberHandle | AgentOperationResult {
    const handle = this.handles.get(id.trim());
    if (!handle) return { accepted: false, code: "TASK_TEAM_RUN_NOT_FOUND", message: `Task TeamRun '${id}' was not found.` };
    if (handle.context.address !== address) return { accepted: false, code: "TASK_TEAM_ADDRESS_MISMATCH", message: `Task TeamRun '${id}' is not at '${address}'.` };
    return handle;
  }

  private async cleanup(id: string, handle: MixedTaskTeamMemberHandle): Promise<void> {
    try { await handle.terminate(); } catch { handle.dispose(); } finally { this.forget(id); }
  }
  private forget(id: string): void {
    this.handles.delete(id.trim());
    this.pendingWork.delete(id.trim());
  }
}
