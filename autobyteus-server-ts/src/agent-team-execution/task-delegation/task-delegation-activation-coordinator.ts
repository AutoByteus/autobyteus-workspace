import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import type { TeamRun } from "../domain/team-run.js";
import type { TaskDelegationLedger } from "./task-delegation-ledger.js";
import type {
  TaskDelegationActivationResult,
} from "./task-delegation-record.js";
import { buildTaskAgentInstanceIdentity } from "./task-agent-instance-identity.js";
import { TaskDelegationEventPublisher } from "./task-delegation-event-publisher.js";
import { TaskDelegationWorkPacketRenderer } from "./task-delegation-work-packet-renderer.js";

export class TaskDelegationActivationCoordinator {
  constructor(
    private readonly ledger: TaskDelegationLedger,
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
      const queued = this.ledger.markQueued(
        [runnableRecord.taskId],
        new Map([[runnableRecord.taskId, taskAgentInstance]]),
      );
      if (queued.length === 0) {
        continue;
      }
      const record = queued[0];
      const message = new AgentInputUserMessage(
        this.renderer.render([record]),
        SenderType.SYSTEM,
        null,
        {
          sender_id: "system.task_delegation",
          team_run_id: this.ledger.teamRunId,
          task_id: record.taskId,
          task_ids: [record.taskId],
          task_agent_instance_id: taskAgentInstance.taskAgentInstanceId,
          task_agent_run_id: taskAgentInstance.taskAgentRunId,
          message_type: "task_delegation_work_packet",
        },
      );
      const result = await teamRun.startTaskAgentInstance({
        identity: taskAgentInstance,
        message,
      });
      if (!result.accepted) {
        this.ledger.markNotStarted([record.taskId]);
      } else {
        this.eventPublisher.publishActivated({
          teamRun,
          teamRunId: this.ledger.teamRunId,
          record,
        });
      }
      results.push({
        memberName: record.member.memberName,
        taskCount: 1,
        accepted: result.accepted,
        message: result.message ?? null,
      });
    }

    return results;
  }
}
