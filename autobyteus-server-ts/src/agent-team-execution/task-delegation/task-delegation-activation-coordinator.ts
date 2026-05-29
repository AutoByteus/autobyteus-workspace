import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import type { TeamRun } from "../domain/team-run.js";
import { selectorFromMemberRouteKey } from "../domain/team-run-member-identity.js";
import type { TaskDelegationLedger } from "./task-delegation-ledger.js";
import type {
  TaskDelegationActivationResult,
  TaskDelegationRecord,
} from "./task-delegation-record.js";
import { TaskDelegationEventPublisher } from "./task-delegation-event-publisher.js";
import { TaskDelegationWorkPacketRenderer } from "./task-delegation-work-packet-renderer.js";

const groupByAssigneeRouteKey = (
  records: readonly TaskDelegationRecord[],
): Map<string, TaskDelegationRecord[]> => {
  const grouped = new Map<string, TaskDelegationRecord[]>();
  for (const record of records) {
    const key = record.assignee.memberRouteKey;
    const existing = grouped.get(key) ?? [];
    existing.push(record);
    grouped.set(key, existing);
  }
  return grouped;
};

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
    const queued = this.ledger.markQueued(runnable.map((record) => record.taskId));
    const grouped = groupByAssigneeRouteKey(queued);
    const results: TaskDelegationActivationResult[] = [];

    for (const records of grouped.values()) {
      const assignee = records[0].assignee;
      const message = new AgentInputUserMessage(
        this.renderer.render(records),
        SenderType.SYSTEM,
        null,
        {
          sender_id: "system.task_delegation",
          team_run_id: this.ledger.teamRunId,
          task_ids: records.map((record) => record.taskId),
          message_type: "task_delegation_work_packet",
        },
      );
      const result = await teamRun.postMessage(
        message,
        selectorFromMemberRouteKey(assignee.memberRouteKey),
      );
      if (!result.accepted) {
        this.ledger.markNotStarted(records.map((record) => record.taskId));
      } else {
        this.eventPublisher.publishActivated({
          teamRun,
          teamRunId: this.ledger.teamRunId,
          assignee,
          records,
        });
      }
      results.push({
        assignee,
        taskIds: records.map((record) => record.taskId),
        accepted: result.accepted,
        message: result.message ?? null,
      });
    }

    return results;
  }
}
