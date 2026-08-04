import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentTeamAddress } from "../../../../agent-collaboration/domain/agent-team-address.js";
import type { AgentOperationResult } from "../../../../agent-execution/domain/agent-operation-result.js";
import type { StartTaskTeamInstanceRequest } from "../../../domain/task-team-instance.js";
import type { TeamRunContext } from "../../../domain/team-run-context.js";
import type { InterAgentMessageDeliveryIntent } from "../../../domain/inter-agent-message-delivery.js";
import type { TaskTeamActiveRunDirectory } from "../../../task-delegation/task-team-active-run-directory.js";
import type { MixedSubTeamRunFactory } from "../mixed-sub-team-run-factory.js";
import type { MixedTeamRunContext } from "../mixed-team-run-context.js";
import { MixedTaskTeamMemberHandle } from "./mixed-task-team-member-handle.js";
import type { MixedTeamEventPublish } from "./mixed-team-member-handle.js";

export class MixedTaskTeamInstanceRegistry {
  private readonly handles = new Map<string, MixedTaskTeamMemberHandle>();
  constructor(private readonly options: {
    teamContext: TeamRunContext<MixedTeamRunContext>;
    subTeamRunFactory: MixedSubTeamRunFactory;
    taskTeamActiveRunDirectory: TaskTeamActiveRunDirectory;
    publish: MixedTeamEventPublish;
    deliverInterAgentMessage: (request: InterAgentMessageDeliveryIntent) => Promise<AgentOperationResult>;
  }) {}
  listHandles() { return [...this.handles.values()]; }
  async start(request: StartTaskTeamInstanceRequest) {
    const source = this.options.teamContext.index.getTeam(request.receiver.memberAddress);
    if (!source || source.address !== request.teamNode.address) return { accepted: false, code: "TARGET_TEAM_NOT_FOUND", message: `Task AgentTeam target '${request.receiver.memberAddress}' was not found.` };
    const id = request.identity.taskTeamRunId.trim();
    const existing = this.handles.get(id);
    if (existing?.isActive()) return { accepted: false, code: "TASK_TEAM_ALREADY_ACTIVE", message: `Task TeamRun '${id}' is already active.` };
    existing?.dispose();
    const handle = new MixedTaskTeamMemberHandle({ parentContext: this.options.teamContext, request, subTeamRunFactory: this.options.subTeamRunFactory, taskTeamActiveRunDirectory: this.options.taskTeamActiveRunDirectory, publish: this.options.publish, deliverInterAgentMessage: this.options.deliverInterAgentMessage });
    this.handles.set(id, handle);
    try { const result = await handle.start(); if (!result.accepted) await this.cleanup(id, handle); return result; }
    catch (error) { await this.cleanup(id, handle); throw error; }
  }
  postMessage(address: AgentTeamAddress, taskTeamRunId: string, message: AgentInputUserMessage) {
    const resolved = this.resolve(address, taskTeamRunId);
    return "accepted" in resolved ? Promise.resolve(resolved) : resolved.postMessage(message);
  }
  async settle(address: AgentTeamAddress, taskTeamRunId: string) {
    const resolved = this.resolve(address, taskTeamRunId);
    if ("accepted" in resolved) return resolved;
    const result = await resolved.terminate(); if (result.accepted) this.handles.delete(taskTeamRunId.trim()); return result;
  }
  approveToolInvocation(taskTeamRunId: string, target: AgentTeamAddress, invocationId: string, approved: boolean, reason: string | null = null, targetAgentRunId: string | null = null) {
    const handle = this.handles.get(taskTeamRunId.trim());
    return handle ? handle.approveToolInvocation(target, invocationId, approved, reason, targetAgentRunId)
      : Promise.resolve({ accepted: false, code: "TASK_TEAM_RUN_NOT_FOUND", message: `Task TeamRun '${taskTeamRunId}' was not found.` });
  }
  async terminateAll(): Promise<AgentOperationResult> { for (const [id, handle] of this.handles) { const result = await handle.terminate(); if (!result.accepted) return result; this.handles.delete(id); } return { accepted: true }; }
  dispose() { for (const handle of this.handles.values()) handle.dispose(); this.handles.clear(); }
  private resolve(address: AgentTeamAddress, id: string): MixedTaskTeamMemberHandle | AgentOperationResult {
    const handle = this.handles.get(id.trim());
    if (!handle) return { accepted: false, code: "TASK_TEAM_RUN_NOT_FOUND", message: `Task TeamRun '${id}' was not found.` };
    if (handle.context.address !== address) return { accepted: false, code: "TASK_TEAM_ADDRESS_MISMATCH", message: `Task TeamRun '${id}' is not at '${address}'.` };
    return handle;
  }
  private async cleanup(id: string, handle: MixedTaskTeamMemberHandle) { try { await handle.terminate(); } catch { handle.dispose(); } finally { this.handles.delete(id.trim()); } }
}
