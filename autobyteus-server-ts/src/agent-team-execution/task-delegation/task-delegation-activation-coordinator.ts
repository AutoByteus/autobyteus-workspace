import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { AgentRunIdentityAllocator } from "../../agent-execution/services/agent-run-identity-allocator.js";
import type { TeamRun } from "../domain/team-run.js";
import { createTeamExecutionAddress } from "../domain/team-execution-address.js";
import type { TaskAgentDirectory } from "./task-agent-directory.js";
import {
  createActiveTaskExecutionBinding,
  getActiveTaskExecutionRunId,
  type ActiveTaskExecutionBinding,
} from "./active-task-execution-binding.js";
import type { ActiveTaskDelegationStartingEntry } from "./task-delegation-active-entry.js";
import type { TaskDelegationLedger } from "./task-delegation-ledger.js";
import { TaskDelegationError, type TaskDelegationDelegatorIdentity } from "./task-delegation-record.js";
import { TaskDelegationVisibleNotificationRenderer } from "./task-delegation-visible-notification-renderer.js";
import { TaskDelegationWorkPacketRenderer } from "./task-delegation-work-packet-renderer.js";
import { TaskTeamRunIdentityFactory, type TaskTeamMaterialization } from "./task-team-run-identity-factory.js";
import { markTaskDelegationSystemTaskNotificationMetadata } from "./task-delegation-system-message-visibility.js";

type ReplySelector = { recipientAddress: string | null; targetAgentRunId: string | null };

export type PreparedTaskActivation = Readonly<{
  binding: ActiveTaskExecutionBinding;
  start: () => Promise<{ accepted: boolean; message?: string | null }>;
  commit: () => void;
  openWork: () => void;
  abort: () => Promise<void>;
}>;

export class TaskDelegationActivationCoordinator {
  constructor(
    private readonly ledger: TaskDelegationLedger,
    private readonly taskAgentDirectory: TaskAgentDirectory,
    private readonly renderer = new TaskDelegationWorkPacketRenderer(),
    private readonly visibleRenderer = new TaskDelegationVisibleNotificationRenderer(),
    private readonly allocator: Pick<AgentRunIdentityAllocator, "allocateForAgentDefinition"> = AgentRunIdentityAllocator.getInstance(),
    private readonly taskTeamFactory = new TaskTeamRunIdentityFactory(allocator),
  ) {}

  async prepareTask(teamRun: TeamRun, taskId: string): Promise<PreparedTaskActivation> {
    const entry = this.ledger.getStartingEntry(taskId);
    if (!entry) {
      throw new TaskDelegationError("TASK_NOT_FOUND", `Delegated task '${taskId}' was not found or is already active.`);
    }
    return entry.target.kind === "agent"
      ? this.prepareAgent(teamRun, entry)
      : this.prepareTeam(teamRun, entry);
  }

  private async prepareAgent(
    teamRun: TeamRun,
    entry: ActiveTaskDelegationStartingEntry,
  ): Promise<PreparedTaskActivation> {
    const node = teamRun.context.index.getAgent(entry.target.address);
    if (!node) throw new Error(`Agent '${entry.target.address}' was not found.`);
    const taskAgentRunId = await this.allocator.allocateForAgentDefinition(node.agentDefinitionId);
    const executionAddress = createTeamExecutionAddress({
      ...entry.receiverAddress,
      taskAgentRunId,
    });
    const binding = createActiveTaskExecutionBinding({
      kind: "task_agent",
      taskId: entry.taskId,
      executionAddress,
    });
    const reply = this.reply(entry.reviewOwner);
    let message: AgentInputUserMessage;
    this.taskAgentDirectory.registerStartingTask({
      taskId: entry.taskId,
      executionAddress,
      memberAddress: entry.target.address,
      delegator: entry.reviewOwner,
      delegatorReplyRecipientAddress: reply.recipientAddress,
      delegatorReplyTargetAgentRunId: reply.targetAgentRunId,
    });
    try {
      const bound = this.ledger.bindTaskExecution({
        taskId: entry.taskId,
        execution: binding,
        delegatorReplyRecipientAddress: reply.recipientAddress,
        delegatorReplyTargetAgentRunId: reply.targetAgentRunId,
      });
      message = this.workMessage(bound, {
        target_agent_run_id: taskAgentRunId,
        message_type: "task_delegation_work_packet",
      });
    } catch (error) {
      this.taskAgentDirectory.unregisterPreparedTask(entry.taskId);
      throw error;
    }
    return Object.freeze({
      binding,
      start: () => teamRun.startTaskAgentExecution({ taskId: entry.taskId, receiver: executionAddress, sourceNode: node, message }),
      commit: () => {
        if (!this.taskAgentDirectory.markActive(entry.taskId)) {
          throw new Error(`Prepared task Agent '${entry.taskId}' was not found.`);
        }
      },
      openWork: () => { teamRun.releaseTaskAgentExecutionWork(entry.target.address, taskAgentRunId); },
      abort: async () => {
        this.taskAgentDirectory.unregisterPreparedTask(entry.taskId);
        await teamRun.settleTaskAgentExecution(entry.target.address, taskAgentRunId, "activation aborted");
      },
    });
  }

  private async prepareTeam(
    teamRun: TeamRun,
    entry: ActiveTaskDelegationStartingEntry,
  ): Promise<PreparedTaskActivation> {
    const materialized = await this.taskTeamFactory.create({
      teamRun,
      taskId: entry.taskId,
      teamAddress: entry.target.address,
    });
    return this.buildPreparedTeam(teamRun, entry, materialized);
  }

  private buildPreparedTeam(
    teamRun: TeamRun,
    entry: ActiveTaskDelegationStartingEntry,
    materialized: TaskTeamMaterialization,
  ): PreparedTaskActivation {
    const taskTeamRunId = materialized.teamNode.teamRunId;
    const executionAddress = createTeamExecutionAddress({
      ...entry.receiverAddress,
      taskTeamRunIds: [...entry.receiverAddress.taskTeamRunIds, taskTeamRunId],
      memberAddress: entry.target.address,
      taskAgentRunId: null,
    });
    const receiver = createTeamExecutionAddress({
      ...executionAddress,
      memberAddress: materialized.teamNode.coordinatorAddress,
    });
    const binding = createActiveTaskExecutionBinding({
      kind: "task_team",
      taskId: entry.taskId,
      executionAddress,
    });
    const reply = this.reply(entry.reviewOwner);
    const bound = this.ledger.bindTaskExecution({
      taskId: entry.taskId,
      execution: binding,
      delegatorReplyRecipientAddress: reply.recipientAddress,
      delegatorReplyTargetAgentRunId: reply.targetAgentRunId,
    });
    const message = this.workMessage(bound, {
      task_team_run_id: taskTeamRunId,
      message_type: "task_team_delegation_work_packet",
    });
    return Object.freeze({
      binding,
      start: () => teamRun.startTaskTeamExecution({
        taskId: entry.taskId,
        receiver,
        config: materialized.config,
        teamNode: materialized.teamNode,
        message,
      }),
      commit: () => { teamRun.markTaskTeamExecutionActive(taskTeamRunId); },
      openWork: () => { teamRun.releaseTaskTeamExecutionWork(entry.target.address, taskTeamRunId); },
      abort: async () => {
        await teamRun.settleTaskTeamExecution(entry.target.address, taskTeamRunId, "activation aborted");
      },
    });
  }

  private workMessage(entry: ActiveTaskDelegationStartingEntry, metadata: Record<string, unknown>) {
    return new AgentInputUserMessage(
      this.renderer.render([entry]),
      SenderType.SYSTEM,
      null,
      markTaskDelegationSystemTaskNotificationMetadata({
        sender_id: "system.task_delegation",
        team_run_id: this.ledger.teamRunId,
        task_id: entry.taskId,
        task_ids: [entry.taskId],
        execution_kind: entry.boundExecution?.kind ?? null,
        ...metadata,
      }, { displayContent: this.visibleRenderer.renderActivation(entry) }),
    );
  }

  private reply(delegator: TaskDelegationDelegatorIdentity): ReplySelector {
    const taskRun = delegator.executionAddress.taskAgentRunId;
    return taskRun
      ? { recipientAddress: null, targetAgentRunId: taskRun }
      : { recipientAddress: delegator.executionAddress.memberAddress, targetAgentRunId: null };
  }
}
