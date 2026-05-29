import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import type { TeamRun } from "../domain/team-run.js";
import {
  TeamRunEventSourceType,
  type TeamRunTaskDelegationEventPayload,
} from "../domain/team-run-event.js";
import { selectorFromMemberRouteKey } from "../domain/team-run-member-identity.js";
import type { TaskDelegationCompletionPayload } from "./task-delegation-record.js";

const renderReferenceFiles = (
  referenceFiles: TaskDelegationCompletionPayload["referenceFiles"],
): string => {
  if (referenceFiles.length === 0) {
    return "- None submitted";
  }
  return referenceFiles.map((referenceFile) => `- ${referenceFile}`).join("\n");
};

export class TaskDelegationCompletionNotifier {
  async notifyTerminalStatus(input: {
    teamRun: TeamRun;
    payload: TaskDelegationCompletionPayload;
    coordinatorMemberRouteKey?: string | null;
  }): Promise<void> {
    const eventPayload: TeamRunTaskDelegationEventPayload = {
      eventType: "TASK_DELEGATION_TERMINAL_STATUS",
      payload: input.payload,
    };
    input.teamRun.publishEvent({
      eventSourceType: TeamRunEventSourceType.TASK_DELEGATION,
      teamRunId: input.payload.teamRunId,
      sourcePath: input.payload.member.memberPath,
      data: eventPayload,
    });

    await this.postCompletionMessage(input.teamRun, input.payload);
    const fallbackRouteKey = input.coordinatorMemberRouteKey?.trim() || null;
    if (
      fallbackRouteKey &&
      fallbackRouteKey !== input.payload.delegator.memberRouteKey
    ) {
      await this.postCompletionMessage(input.teamRun, input.payload, fallbackRouteKey);
    }
  }

  private async postCompletionMessage(
    teamRun: TeamRun,
    payload: TaskDelegationCompletionPayload,
    overrideRouteKey?: string | null,
  ): Promise<void> {
    const targetRouteKey = overrideRouteKey?.trim() || payload.delegator.memberRouteKey;
    const content = [
      `Delegated task ${payload.status}.`,
      "",
      `Task: ${payload.taskLabel} (${payload.taskId})`,
      `Member: ${payload.member.memberName}`,
      `Status: ${payload.status}`,
      `Message: ${payload.message ?? "None provided"}`,
      "Reference files:",
      renderReferenceFiles(payload.referenceFiles),
    ].join("\n");
    const message = new AgentInputUserMessage(
      content,
      SenderType.SYSTEM,
      null,
      {
        sender_id: "system.task_delegation",
        team_run_id: payload.teamRunId,
        task_id: payload.taskId,
        message_type: "task_delegation_terminal_status",
      },
    );
    const result = await teamRun.postMessage(
      message,
      selectorFromMemberRouteKey(targetRouteKey),
    );
    if (!result.accepted) {
      console.warn(
        `TaskDelegationCompletionNotifier: failed to notify '${targetRouteKey}' for task '${payload.taskId}': ${result.message ?? "unknown error"}`,
      );
    }
  }
}
