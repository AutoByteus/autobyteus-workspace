import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { TeamRun } from "../domain/team-run.js";
import { selectorFromMemberRouteKey } from "../domain/team-run-member-identity.js";
import type {
  TaskDelegationNotificationDeliveryOutcome,
  TaskDelegationNotificationType,
  TaskDelegationRecord,
  TaskDelegationWarning,
  TaskResultReview,
  TaskResultSubmission,
} from "./task-delegation-record.js";

const renderReferenceFiles = (referenceFiles: readonly string[]): string =>
  referenceFiles.length > 0
    ? referenceFiles.map((referenceFile) => `- ${referenceFile}`).join("\n")
    : "- None specified";

const renderOperationResultMessage = (result: AgentOperationResult): string =>
  result.message?.trim() || result.code?.trim() || "The target runtime rejected the system task notification.";

type NotificationTarget =
  | { kind: "member"; memberRouteKey: string; taskAgentRunId: string | null }
  | { kind: "task_team"; memberRouteKey: string; taskTeamRunId: string };

export class TaskDelegationNotificationDispatcher {
  async notifyResultSubmitted(input: {
    teamRun: TeamRun;
    record: TaskDelegationRecord;
    submission: TaskResultSubmission;
  }): Promise<TaskDelegationNotificationDeliveryOutcome> {
    return this.deliver({
      teamRun: input.teamRun,
      record: input.record,
      target: this.resolveDelegatorTarget(input.record),
      notificationType: "result_submitted",
      content: this.renderResultSubmitted(input.record, input.submission),
      metadata: {
        task_id: input.record.taskId,
        submission_id: input.submission.submissionId,
        execution_kind: input.submission.execution.kind,
        message_type: "task_result_submitted",
      },
    });
  }

  async notifyRevisionRequested(input: {
    teamRun: TeamRun;
    record: TaskDelegationRecord;
    review: TaskResultReview;
  }): Promise<TaskDelegationNotificationDeliveryOutcome> {
    return this.deliver({
      teamRun: input.teamRun,
      record: input.record,
      target: this.resolveExecutionTarget(input.record),
      notificationType: "revision_requested",
      content: this.renderRevisionRequested(input.record, input.review),
      metadata: {
        task_id: input.record.taskId,
        review_id: input.review.reviewId,
        reviewed_submission_id: input.review.reviewedSubmissionId,
        execution_kind: input.record.execution?.kind ?? null,
        message_type: "task_revision_requested",
      },
    });
  }

  private async deliver(input: {
    teamRun: TeamRun;
    record: TaskDelegationRecord;
    target: NotificationTarget;
    notificationType: TaskDelegationNotificationType;
    content: string;
    metadata: Record<string, unknown>;
  }): Promise<TaskDelegationNotificationDeliveryOutcome> {
    const message = new AgentInputUserMessage(input.content, SenderType.SYSTEM, null, {
      ...input.metadata,
      sender_id: "system.task_delegation",
      team_run_id: input.teamRun.runId,
      input_origin: "task_delegation_notification",
      task_notification_type: input.notificationType,
      target_member_route_key: input.target.memberRouteKey,
      target_task_agent_run_id: input.target.kind === "member" ? input.target.taskAgentRunId : null,
      target_task_team_run_id: input.target.kind === "task_team" ? input.target.taskTeamRunId : null,
    });

    try {
      const result = input.target.kind === "task_team"
        ? await input.teamRun.postMessageToTaskTeamInstance(
            input.target.memberRouteKey,
            input.target.taskTeamRunId,
            message,
          )
        : await input.teamRun.postMessage(
            message,
            selectorFromMemberRouteKey(input.target.memberRouteKey),
            input.target.taskAgentRunId,
          );
      if (result.accepted) return this.delivered(input.notificationType, input.target);
      return this.rejected(input.notificationType, input.record, input.target, renderOperationResultMessage(result));
    } catch (error) {
      return this.rejected(
        input.notificationType,
        input.record,
        input.target,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private resolveDelegatorTarget(record: TaskDelegationRecord): NotificationTarget {
    const taskAgentRunId = record.delegator.taskAgentRunId?.trim() || null;
    return {
      kind: "member",
      memberRouteKey: record.delegator.logicalMemberRouteKey?.trim() || record.delegator.memberRouteKey,
      taskAgentRunId,
    };
  }

  private resolveExecutionTarget(record: TaskDelegationRecord): NotificationTarget {
    if (record.execution?.kind === "task_agent") {
      return {
        kind: "member",
        memberRouteKey: record.execution.taskAgentInstance.logicalMember.memberRouteKey,
        taskAgentRunId: record.execution.taskAgentInstance.taskAgentRunId,
      };
    }
    if (record.execution?.kind === "task_team") {
      return {
        kind: "task_team",
        memberRouteKey: record.execution.taskTeamInstance.logicalTeam.memberRouteKey,
        taskTeamRunId: record.execution.taskTeamInstance.taskTeamRunId,
      };
    }
    throw new Error(`Task '${record.taskId}' has no bound execution instance.`);
  }

  private delivered(
    notificationType: TaskDelegationNotificationType,
    target: NotificationTarget,
  ): TaskDelegationNotificationDeliveryOutcome {
    return {
      notificationType,
      delivered: true,
      targetMemberRouteKey: target.memberRouteKey,
      targetTaskAgentRunId: target.kind === "member" ? target.taskAgentRunId : null,
      targetTaskTeamRunId: target.kind === "task_team" ? target.taskTeamRunId : null,
      warning: null,
    };
  }

  private rejected(
    notificationType: TaskDelegationNotificationType,
    record: TaskDelegationRecord,
    target: NotificationTarget,
    reason: string,
  ): TaskDelegationNotificationDeliveryOutcome {
    const warning: TaskDelegationWarning = {
      code: "TASK_NOTIFICATION_DELIVERY_FAILED",
      notification_type: notificationType,
      task_id: record.taskId,
      target_member_route_key: target.memberRouteKey,
      target_task_agent_run_id: target.kind === "member" ? target.taskAgentRunId : null,
      target_task_team_run_id: target.kind === "task_team" ? target.taskTeamRunId : null,
      message: reason,
    };
    return {
      notificationType,
      delivered: false,
      targetMemberRouteKey: target.memberRouteKey,
      targetTaskAgentRunId: warning.target_task_agent_run_id ?? null,
      targetTaskTeamRunId: warning.target_task_team_run_id ?? null,
      warning,
    };
  }

  private renderResultSubmitted(record: TaskDelegationRecord, submission: TaskResultSubmission): string {
    const executionLabel = submission.execution.kind === "task_agent"
      ? `Task-agent run: ${submission.execution.taskAgentInstance.taskAgentRunId}`
      : `Task-team run: ${submission.execution.taskTeamInstance.taskTeamRunId}`;
    return [
      "Task result submitted for review.",
      "",
      `Task ID: ${record.taskId}`,
      `Submission ID: ${submission.submissionId}`,
      `Execution kind: ${submission.execution.kind}`,
      executionLabel,
      "",
      "Result message:",
      submission.message,
      "",
      "Reference files:",
      renderReferenceFiles(submission.referenceFiles),
      "",
      "Review instructions:",
      `- Accept with review_task_result({"task_id":"${record.taskId}","decision":"accept"}).`,
      `- Request revision with review_task_result({"task_id":"${record.taskId}","decision":"request_revision","message":"<revision instructions>"}).`,
      "- Do not use send_message_to for task acceptance or revision requests.",
    ].join("\n");
  }

  private renderRevisionRequested(record: TaskDelegationRecord, review: TaskResultReview): string {
    return [
      "Revision requested for delegated task.",
      "",
      `Task ID: ${record.taskId}`,
      `Review ID: ${review.reviewId}`,
      `Reviewed submission ID: ${review.reviewedSubmissionId}`,
      `Execution kind: ${record.execution?.kind ?? "unknown"}`,
      "",
      "Revision instructions:",
      review.message ?? "",
      "",
      "Reference files:",
      renderReferenceFiles(review.referenceFiles),
      "",
      "When the revision is ready, call submit_task_result with the revised result message and optional reference_files.",
      "Do not use send_message_to as the task result submission protocol.",
    ].join("\n");
  }
}
