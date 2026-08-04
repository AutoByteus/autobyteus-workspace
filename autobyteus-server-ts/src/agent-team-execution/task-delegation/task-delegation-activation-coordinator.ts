import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { AgentRunIdentityAllocator } from "../../agent-execution/services/agent-run-identity-allocator.js";
import type { TeamRun } from "../domain/team-run.js";
import { createTeamExecutionAddress } from "../domain/team-execution-address.js";
import type { TaskAgentDirectory } from "./task-agent-directory.js";
import { getTaskExecutionKind } from "./task-execution-instance.js";
import type { ActiveTaskDelegationStartingEntry } from "./task-delegation-active-entry.js";
import type { TaskDelegationLedger } from "./task-delegation-ledger.js";
import { TaskDelegationError, type TaskDelegationActivationResult, type TaskDelegationDelegatorIdentity } from "./task-delegation-record.js";
import type { TaskDelegationTarget } from "./task-delegation-target.js";
import { buildTaskAgentInstanceIdentity } from "./task-agent-instance-identity.js";
import { TaskDelegationVisibleNotificationRenderer } from "./task-delegation-visible-notification-renderer.js";
import { TaskDelegationWorkPacketRenderer } from "./task-delegation-work-packet-renderer.js";
import { TaskTeamRunIdentityFactory } from "./task-team-run-identity-factory.js";
import { markTaskDelegationSystemTaskNotificationMetadata } from "./task-delegation-system-message-visibility.js";

type ReplySelector = { recipientAddress: string | null; targetAgentRunId: string | null };

export class TaskDelegationActivationCoordinator {
  constructor(
    private readonly ledger: TaskDelegationLedger,
    private readonly taskAgentDirectory: TaskAgentDirectory,
    private readonly renderer = new TaskDelegationWorkPacketRenderer(),
    private readonly visibleRenderer = new TaskDelegationVisibleNotificationRenderer(),
    private readonly allocator: Pick<AgentRunIdentityAllocator, "allocateForAgentDefinition"> = AgentRunIdentityAllocator.getInstance(),
    private readonly taskTeamFactory = new TaskTeamRunIdentityFactory(allocator),
  ) {}

  async activateTask(teamRun: TeamRun, taskId: string): Promise<TaskDelegationActivationResult> {
    const entry = this.ledger.getStartingEntry(taskId);
    if (!entry) throw new TaskDelegationError("TASK_NOT_FOUND", `Delegated task '${taskId}' was not found or is already active.`);
    return entry.target.kind === "agent"
      ? this.activateAgent(teamRun, entry)
      : this.activateTeam(teamRun, entry);
  }

  private async activateAgent(teamRun: TeamRun, entry: ActiveTaskDelegationStartingEntry): Promise<TaskDelegationActivationResult> {
    const node = teamRun.context.index.getAgent(entry.target.address);
    if (!node) return this.rejected(entry.target, entry.taskId, `Agent '${entry.target.address}' was not found.`);
    try {
      const taskAgentRunId = await this.allocator.allocateForAgentDefinition(node.agentDefinitionId);
      const identity = buildTaskAgentInstanceIdentity({ owningTeamRunId: teamRun.teamRunId, taskId: entry.taskId, taskAgentRunId });
      const reply = this.reply(entry.reviewOwner);
      this.taskAgentDirectory.registerStartingTask({
        taskId: entry.taskId,
        memberAddress: entry.target.address,
        delegator: entry.reviewOwner,
        taskAgentInstance: identity,
        delegatorReplyRecipientAddress: reply.recipientAddress,
        delegatorReplyTargetAgentRunId: reply.targetAgentRunId,
      });
      const bound = this.ledger.bindTaskAgent({ taskId: entry.taskId, taskAgentInstance: identity, delegatorReplyRecipientAddress: reply.recipientAddress, delegatorReplyTargetAgentRunId: reply.targetAgentRunId });
      const result = await teamRun.startTaskAgentInstance({
        identity,
        receiver: createTeamExecutionAddress({ ...entry.receiverAddress, taskAgentRunId }),
        sourceNode: node,
        message: this.workMessage(bound, { target_agent_run_id: taskAgentRunId, message_type: "task_delegation_work_packet" }),
      });
      if (result.accepted) this.taskAgentDirectory.markActive(entry.taskId); else this.taskAgentDirectory.unregisterStartingTask(entry.taskId);
      return this.result(bound, result.accepted, result.message ?? null);
    } catch (error) {
      this.taskAgentDirectory.unregisterStartingTask(entry.taskId);
      return this.rejected(entry.target, entry.taskId, error);
    }
  }

  private async activateTeam(teamRun: TeamRun, entry: ActiveTaskDelegationStartingEntry): Promise<TaskDelegationActivationResult> {
    try {
      const materialized = await this.taskTeamFactory.create({ teamRun, taskId: entry.taskId, teamAddress: entry.target.address });
      const reply = this.reply(entry.reviewOwner);
      const bound = this.ledger.bindTaskTeam({ taskId: entry.taskId, taskTeamInstance: materialized.identity, delegatorReplyRecipientAddress: reply.recipientAddress, delegatorReplyTargetAgentRunId: reply.targetAgentRunId });
      const receiver = createTeamExecutionAddress({
        ...entry.receiverAddress,
        taskTeamRunIds: [...entry.receiverAddress.taskTeamRunIds, materialized.identity.taskTeamRunId],
        memberAddress: materialized.teamNode.coordinatorAddress,
        taskAgentRunId: null,
      });
      const result = await teamRun.startTaskTeamInstance({
        identity: materialized.identity,
        receiver,
        config: materialized.config,
        teamNode: materialized.teamNode,
        message: this.workMessage(bound, { task_team_run_id: materialized.identity.taskTeamRunId, task_team_instance_id: materialized.identity.taskTeamInstanceId, message_type: "task_team_delegation_work_packet" }),
      });
      return this.result(bound, result.accepted, result.message ?? null);
    } catch (error) { return this.rejected(entry.target, entry.taskId, error); }
  }

  private workMessage(entry: ActiveTaskDelegationStartingEntry, metadata: Record<string, unknown>) {
    return new AgentInputUserMessage(this.renderer.render([entry]), SenderType.SYSTEM, null,
      markTaskDelegationSystemTaskNotificationMetadata({ sender_id: "system.task_delegation", team_run_id: this.ledger.teamRunId, task_id: entry.taskId, task_ids: [entry.taskId], execution_kind: entry.boundExecution?.kind ?? null, ...metadata }, { displayContent: this.visibleRenderer.renderActivation(entry) }));
  }

  private result(entry: ActiveTaskDelegationStartingEntry, accepted: boolean, message: string | null): TaskDelegationActivationResult {
    return { target: { kind: entry.target.kind, address: entry.target.address }, accepted, task_id: entry.taskId, execution_kind: getTaskExecutionKind(entry.boundExecution), task_agent_run_id: entry.boundExecution?.kind === "task_agent" ? entry.boundExecution.taskAgentInstance.taskAgentRunId : null, task_team_run_id: entry.boundExecution?.kind === "task_team" ? entry.boundExecution.taskTeamInstance.taskTeamRunId : null, message };
  }
  private rejected(target: TaskDelegationTarget, taskId: string, error: unknown): TaskDelegationActivationResult {
    return { target: { kind: target.kind, address: target.address }, accepted: false, task_id: taskId, execution_kind: null, task_agent_run_id: null, task_team_run_id: null, message: error instanceof Error ? error.message : String(error) };
  }
  private reply(delegator: TaskDelegationDelegatorIdentity): ReplySelector {
    const taskRun = delegator.taskAgentInstance?.taskAgentRunId ?? null;
    return taskRun ? { recipientAddress: null, targetAgentRunId: taskRun } : { recipientAddress: delegator.executionAddress.memberAddress, targetAgentRunId: null };
  }
}
