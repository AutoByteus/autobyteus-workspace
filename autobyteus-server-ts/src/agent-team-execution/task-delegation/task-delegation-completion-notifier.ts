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
  async notifyReportedStatus(input: {
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

    const delegatorTaskAgentRunId = input.payload.delegator.taskAgentRunId?.trim() || null;
    await this.postCompletionMessage(input.teamRun, input.payload, null, delegatorTaskAgentRunId);
    const fallbackRouteKey = input.coordinatorMemberRouteKey?.trim() || null;
    if (fallbackRouteKey && (fallbackRouteKey !== input.payload.delegator.memberRouteKey || delegatorTaskAgentRunId)) {
      await this.postCompletionMessage(input.teamRun, input.payload, fallbackRouteKey, null);
    }
  }

  private async postCompletionMessage(
    teamRun: TeamRun,
    payload: TaskDelegationCompletionPayload,
    overrideRouteKey?: string | null,
    targetMemberRunId?: string | null,
  ): Promise<void> {
    const targetRouteKey = overrideRouteKey?.trim() || payload.delegator.memberRouteKey;
    const targetRunId = targetMemberRunId?.trim() || null;
    const taskAgentId = payload.taskAgentInstance?.taskAgentInstanceId ?? "unbound";
    const taskAgentRunId = payload.taskAgentInstance?.taskAgentRunId ?? "unbound";
    const statusLine = payload.status === "completed"
      ? "Delegated task reported completed and is awaiting your acceptance."
      : "Delegated task reported failed.";
    const followUpLines = payload.status === "completed"
      ? [
          "",
          `If changes are needed, call send_message_to with recipient_name="${payload.member.memberName}", task_agent_id="${taskAgentId}", and task_agent_run_id="${taskAgentRunId}".`,
          `If accepted, call update_task_status with status="accepted" and task_id="${payload.taskId}".`,
        ]
      : [
          "",
          "Failure reports do not require acceptance; the framework will settle the task-agent after idle cleanup.",
        ];
    const content = [
      statusLine,
      "",
      `Task ID: ${payload.taskId}`,
      `Task: ${payload.taskLabel}`,
      `Target member: ${payload.member.memberName}`,
      `Task agent ID: ${taskAgentId}`,
      `Task agent run ID: ${taskAgentRunId}`,
      `Delegator: ${payload.delegator.memberName}`,
      `Reported status: ${payload.status}`,
      `Message: ${payload.message ?? "None provided"}`,
      "Reference files:",
      renderReferenceFiles(payload.referenceFiles),
      ...followUpLines,
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
        delegator_member_route_key: payload.delegator.memberRouteKey,
        reported_status: payload.status,
        target_member_route_key: payload.member.memberRouteKey,
        task_agent_instance_id: payload.taskAgentInstance?.taskAgentInstanceId ?? null,
        task_agent_run_id: payload.taskAgentInstance?.taskAgentRunId ?? null,
        ...(payload.delegator.taskAgentRunId ? { delegator_task_agent_run_id: payload.delegator.taskAgentRunId } : {}),
      },
    );
    const result = await teamRun.postMessage(
      message,
      selectorFromMemberRouteKey(targetRouteKey),
      targetRunId,
    );
    if (!result.accepted) {
      console.warn(
        `TaskDelegationCompletionNotifier: failed to notify '${targetRouteKey}'${targetRunId ? ` run '${targetRunId}'` : ""} for task '${payload.taskId}': ${result.message ?? "unknown error"}`,
      );
    }
  }
}
