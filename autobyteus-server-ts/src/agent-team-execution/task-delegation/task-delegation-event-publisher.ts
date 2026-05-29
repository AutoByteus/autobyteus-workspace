import type { TeamRun } from "../domain/team-run.js";
import {
  TeamRunEventSourceType,
  type TeamRunTaskDelegationEventPayload,
} from "../domain/team-run-event.js";
import {
  isTaskDelegationTerminalStatus,
  type TaskDelegationActivationPayload,
  type TaskDelegationRecord,
  type TaskDelegationStatus,
  type TaskDelegationStatusUpdatePayload,
} from "./task-delegation-record.js";

export class TaskDelegationEventPublisher {
  publishActivated(input: {
    teamRun: TeamRun;
    teamRunId: string;
    assignee: TaskDelegationActivationPayload["assignee"];
    records: readonly TaskDelegationRecord[];
  }): void {
    const payload: TaskDelegationActivationPayload = {
      teamRunId: input.teamRunId,
      assignee: input.assignee,
      taskIds: input.records.map((record) => record.taskId),
      tasks: input.records.map((record) => ({
        taskId: record.taskId,
        taskName: record.taskName,
        status: record.status,
        dependencyTaskIds: [...record.dependencyTaskIds],
      })),
      activatedAt: new Date().toISOString(),
    };
    this.publish({
      teamRun: input.teamRun,
      teamRunId: input.teamRunId,
      sourcePath: input.assignee.memberPath,
      eventType: "TASK_DELEGATION_ACTIVATED",
      payload,
    });
  }

  publishStatusUpdated(input: {
    teamRun: TeamRun;
    teamRunId: string;
    previousStatus: TaskDelegationStatus;
    record: TaskDelegationRecord;
  }): void {
    const payload: TaskDelegationStatusUpdatePayload = {
      teamRunId: input.teamRunId,
      taskId: input.record.taskId,
      taskName: input.record.taskName,
      assignee: input.record.assignee,
      delegator: input.record.delegator,
      previousStatus: input.previousStatus,
      status: input.record.status,
      summary: input.record.terminalSummary,
      deliverables: input.record.deliverables,
      updatedAt: input.record.updatedAt,
      terminal: isTaskDelegationTerminalStatus(input.record.status),
    };
    this.publish({
      teamRun: input.teamRun,
      teamRunId: input.teamRunId,
      sourcePath: input.record.assignee.memberPath,
      eventType: "TASK_DELEGATION_STATUS_UPDATED",
      payload,
    });
  }

  private publish(input: {
    teamRun: TeamRun;
    teamRunId: string;
    sourcePath: string[];
    eventType: TeamRunTaskDelegationEventPayload["eventType"];
    payload: unknown;
  }): void {
    const eventPayload: TeamRunTaskDelegationEventPayload = {
      eventType: input.eventType,
      payload: input.payload,
    };
    input.teamRun.publishEvent({
      eventSourceType: TeamRunEventSourceType.TASK_DELEGATION,
      teamRunId: input.teamRunId,
      sourcePath: input.sourcePath,
      data: eventPayload,
    });
  }
}
