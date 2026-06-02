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
    record: TaskDelegationRecord;
  }): void {
    if (!input.record.taskAgentInstance) {
      throw new Error(`Task '${input.record.taskId}' is missing task-agent instance identity.`);
    }
    const payload: TaskDelegationActivationPayload = {
      teamRunId: input.teamRunId,
      member: input.record.member,
      taskAgentInstance: input.record.taskAgentInstance,
      taskIds: [input.record.taskId],
      tasks: [input.record].map((record) => ({
        taskId: record.taskId,
        taskLabel: record.taskLabel,
        status: record.status,
      })),
      activatedAt: new Date().toISOString(),
    };
    this.publish({
      teamRun: input.teamRun,
      teamRunId: input.teamRunId,
      sourcePath: input.record.member.memberPath,
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
      taskLabel: input.record.taskLabel,
      member: input.record.member,
      delegator: input.record.delegator,
      taskAgentInstance: input.record.taskAgentInstance,
      previousStatus: input.previousStatus,
      status: input.record.status,
      message: input.record.status === "accepted"
        ? input.record.acceptanceMessage
        : input.record.statusMessage,
      referenceFiles: input.record.statusReferenceFiles,
      acceptanceMessage: input.record.acceptanceMessage,
      acceptedAt: input.record.acceptedAt,
      updatedAt: input.record.updatedAt,
      terminal: isTaskDelegationTerminalStatus(input.record.status),
    };
    this.publish({
      teamRun: input.teamRun,
      teamRunId: input.teamRunId,
      sourcePath: input.record.member.memberPath,
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
