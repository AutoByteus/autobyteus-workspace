import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import type { TeamRun } from "../domain/team-run.js";
import type { TaskAgentDirectory } from "./task-agent-directory.js";
import type { TaskDelegationLedger } from "./task-delegation-ledger.js";
import type {
  TaskDelegationActivationResult,
  TaskDelegationDelegatorIdentity,
} from "./task-delegation-record.js";
import { buildTaskAgentInstanceIdentity } from "./task-agent-instance-identity.js";
import { TaskDelegationEventPublisher } from "./task-delegation-event-publisher.js";
import { TaskDelegationWorkPacketRenderer } from "./task-delegation-work-packet-renderer.js";

type DelegatorReplySelector = {
  recipientName: string | null;
  targetAgentRunId: string | null;
};

export class TaskDelegationActivationCoordinator {
  constructor(
    private readonly ledger: TaskDelegationLedger,
    private readonly taskAgentDirectory: TaskAgentDirectory,
    private readonly renderer = new TaskDelegationWorkPacketRenderer(),
    private readonly eventPublisher = new TaskDelegationEventPublisher(),
  ) {}

  async activateRunnableTasks(teamRun: TeamRun): Promise<TaskDelegationActivationResult[]> {
    const runnable = this.ledger.listRunnableNotStarted();
    if (runnable.length === 0) {
      return [];
    }
    const results: TaskDelegationActivationResult[] = [];

    for (const runnableRecord of runnable) {
      const taskAgentInstance = buildTaskAgentInstanceIdentity({
        teamRunId: this.ledger.teamRunId,
        taskId: runnableRecord.taskId,
        logicalMember: runnableRecord.member,
      });
      const delegatorReply = this.resolveDelegatorReplySelector(runnableRecord.delegator);
      try {
        this.taskAgentDirectory.registerStartingTask({
          taskId: runnableRecord.taskId,
          logicalMember: runnableRecord.member,
          delegator: runnableRecord.delegator,
          taskAgentInstance,
          delegatorReplyRecipientName: delegatorReply.recipientName,
          delegatorReplyTargetAgentRunId: delegatorReply.targetAgentRunId,
        });
      } catch (error) {
        results.push({
          memberName: runnableRecord.member.memberName,
          taskCount: 1,
          accepted: false,
          task_id: runnableRecord.taskId,
          target_agent_run_id: null,
          message: error instanceof Error ? error.message : String(error),
        });
        continue;
      }

      let record = runnableRecord;
      try {
        record = this.ledger.bindTaskAgent({
          taskId: runnableRecord.taskId,
          taskAgentInstance,
          delegatorReplyRecipientName: delegatorReply.recipientName,
          delegatorReplyTargetAgentRunId: delegatorReply.targetAgentRunId,
        });
        const message = new AgentInputUserMessage(
          this.renderer.render([record]),
          SenderType.SYSTEM,
          null,
          {
            sender_id: "system.task_delegation",
            team_run_id: this.ledger.teamRunId,
            task_id: record.taskId,
            task_ids: [record.taskId],
            target_agent_run_id: taskAgentInstance.taskAgentRunId,
            message_type: "task_delegation_work_packet",
          },
        );
        const result = await teamRun.startTaskAgentInstance({
          identity: taskAgentInstance,
          message,
        });
        if (!result.accepted) {
          this.rollbackStartingTask(record.taskId);
        } else {
          const activeRecord = this.ledger.markActive(record.taskId);
          this.taskAgentDirectory.markActive(record.taskId);
          this.eventPublisher.publishActivated({
            teamRun,
            teamRunId: this.ledger.teamRunId,
            record: activeRecord,
          });
        }
        results.push({
          memberName: record.member.memberName,
          taskCount: 1,
          accepted: result.accepted,
          task_id: record.taskId,
          target_agent_run_id: result.accepted ? taskAgentInstance.taskAgentRunId : null,
          message: result.message ?? null,
        });
      } catch (error) {
        this.rollbackStartingTask(record.taskId);
        results.push({
          memberName: runnableRecord.member.memberName,
          taskCount: 1,
          accepted: false,
          task_id: runnableRecord.taskId,
          target_agent_run_id: null,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }

  private resolveDelegatorReplySelector(
    delegator: TaskDelegationDelegatorIdentity,
  ): DelegatorReplySelector {
    const parentTaskAgentRunId = delegator.taskAgentRunId?.trim() || null;
    if (parentTaskAgentRunId) {
      return { recipientName: null, targetAgentRunId: parentTaskAgentRunId };
    }
    return { recipientName: delegator.memberName, targetAgentRunId: null };
  }

  private rollbackStartingTask(taskId: string): void {
    this.taskAgentDirectory.unregisterStartingTask(taskId);
    this.ledger.markNotStarted([taskId]);
  }
}
