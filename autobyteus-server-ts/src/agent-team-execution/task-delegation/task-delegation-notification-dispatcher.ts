import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { TeamRun } from "../domain/team-run.js";
import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { ActiveTaskDelegationRecordEntry } from "./task-delegation-active-entry.js";
import type {
  TaskDelegationNotificationDeliveryOutcome,
  TaskDelegationNotificationType,
  TaskDelegationWarning,
  TaskReferenceFile,
  TaskResultReview,
  TaskResultSubmission,
} from "./task-delegation-record.js";
import { markTaskDelegationSystemTaskNotificationMetadata } from "./task-delegation-system-message-visibility.js";
import { TaskDelegationVisibleNotificationRenderer } from "./task-delegation-visible-notification-renderer.js";

const renderReferenceFiles = (referenceFiles: readonly TaskReferenceFile[]): string =>
  referenceFiles.length > 0
    ? referenceFiles.map((referenceFile) => `- ${referenceFile.path}`).join("\n")
    : "- None specified";

const renderOperationResultMessage = (result: AgentOperationResult): string =>
  result.message?.trim() || result.code?.trim() || "The target runtime rejected the system task notification.";

type NotificationTarget =
  | { kind: "agent"; memberAddress: AgentTeamAddress; taskAgentRunId: string | null }
  | { kind: "task_team"; memberAddress: AgentTeamAddress; taskTeamRunId: string };

export class TaskDelegationNotificationDispatcher {
  constructor(
    private readonly visibleNotificationRenderer = new TaskDelegationVisibleNotificationRenderer(),
  ) {}

  async notifyResultSubmitted(input: {
    teamRun: TeamRun;
    entry: ActiveTaskDelegationRecordEntry;
    submission: TaskResultSubmission;
  }): Promise<TaskDelegationNotificationDeliveryOutcome> {
    return this.deliver({
      teamRun: input.teamRun,
      entry: input.entry,
      target: this.resolveDelegatorTarget(input.entry),
      notificationType: "result_submitted",
      content: this.renderResultSubmitted(input.entry, input.submission),
      displayContent: this.visibleNotificationRenderer.renderResultSubmitted(input.entry, input.submission),
      metadata: {
        task_id: input.entry.record.taskId,
        submission_id: input.submission.submissionId,
        execution_kind: input.submission.execution.kind,
        message_type: "task_result_submitted",
      },
    });
  }

  async notifyRevisionRequested(input: {
    teamRun: TeamRun;
    entry: ActiveTaskDelegationRecordEntry;
    review: TaskResultReview;
  }): Promise<TaskDelegationNotificationDeliveryOutcome> {
    return this.deliver({
      teamRun: input.teamRun,
      entry: input.entry,
      target: this.resolveExecutionTarget(input.entry),
      notificationType: "revision_requested",
      content: this.renderRevisionRequested(input.entry, input.review),
      displayContent: this.visibleNotificationRenderer.renderRevisionRequested(input.entry, input.review),
      metadata: {
        task_id: input.entry.record.taskId,
        review_id: input.review.reviewId,
        reviewed_submission_id: input.review.reviewedSubmissionId,
        execution_kind: input.entry.taskRunExecution.kind,
        message_type: "task_revision_requested",
      },
    });
  }

  private async deliver(input: {
    teamRun: TeamRun;
    entry: ActiveTaskDelegationRecordEntry;
    target: NotificationTarget;
    notificationType: TaskDelegationNotificationType;
    content: string;
    displayContent: string;
    metadata: Record<string, unknown>;
  }): Promise<TaskDelegationNotificationDeliveryOutcome> {
    const message = new AgentInputUserMessage(input.content, SenderType.SYSTEM, null, markTaskDelegationSystemTaskNotificationMetadata({
      ...input.metadata,
      sender_id: "system.task_delegation",
      team_run_id: input.teamRun.teamRunId,
      input_origin: "task_delegation_notification",
      task_notification_type: input.notificationType,
      target_member_address: input.target.memberAddress,
      target_task_agent_run_id: input.target.kind === "agent" ? input.target.taskAgentRunId : null,
      target_task_team_run_id: input.target.kind === "task_team" ? input.target.taskTeamRunId : null,
    }, {
      displayContent: input.displayContent,
    }));

    try {
      const result = input.target.kind === "task_team"
        ? await input.teamRun.postMessageToTaskTeamInstance(
            input.target.memberAddress,
            input.target.taskTeamRunId,
            message,
          )
        : await input.teamRun.postMessage(
            message,
            input.target.memberAddress,
            input.target.taskAgentRunId,
          );
      if (result.accepted) return this.delivered(input.notificationType, input.target);
      return this.rejected(input.notificationType, input.entry, input.target, renderOperationResultMessage(result));
    } catch (error) {
      return this.rejected(
        input.notificationType,
        input.entry,
        input.target,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private resolveDelegatorTarget(entry: ActiveTaskDelegationRecordEntry): NotificationTarget {
    const taskAgentRunId = entry.reviewOwner.taskAgentInstance?.taskAgentRunId ?? null;
    return {
      kind: "agent",
      memberAddress: entry.reviewOwner.executionAddress.memberAddress,
      taskAgentRunId,
    };
  }

  private resolveExecutionTarget(entry: ActiveTaskDelegationRecordEntry): NotificationTarget {
    if (entry.taskRunExecution.kind === "task_agent") {
      return {
        kind: "agent",
        memberAddress: entry.record.receiverAddress.memberAddress,
        taskAgentRunId: entry.taskRunExecution.taskAgentInstance.taskAgentRunId,
      };
    }
    return {
      kind: "task_team",
      memberAddress: entry.record.receiverAddress.memberAddress,
      taskTeamRunId: entry.taskRunExecution.taskTeamInstance.taskTeamRunId,
    };
  }

  private delivered(
    notificationType: TaskDelegationNotificationType,
    target: NotificationTarget,
  ): TaskDelegationNotificationDeliveryOutcome {
    return {
      notificationType,
      delivered: true,
      targetMemberAddress: target.memberAddress,
      targetTaskAgentRunId: target.kind === "agent" ? target.taskAgentRunId : null,
      targetTaskTeamRunId: target.kind === "task_team" ? target.taskTeamRunId : null,
      warning: null,
    };
  }

  private rejected(
    notificationType: TaskDelegationNotificationType,
    entry: ActiveTaskDelegationRecordEntry,
    target: NotificationTarget,
    reason: string,
  ): TaskDelegationNotificationDeliveryOutcome {
    const warning: TaskDelegationWarning = {
      code: "TASK_NOTIFICATION_DELIVERY_FAILED",
      notification_type: notificationType,
      task_id: entry.record.taskId,
      target_member_address: target.memberAddress,
      target_task_agent_run_id: target.kind === "agent" ? target.taskAgentRunId : null,
      target_task_team_run_id: target.kind === "task_team" ? target.taskTeamRunId : null,
      message: reason,
    };
    return {
      notificationType,
      delivered: false,
      targetMemberAddress: target.memberAddress,
      targetTaskAgentRunId: warning.target_task_agent_run_id ?? null,
      targetTaskTeamRunId: warning.target_task_team_run_id ?? null,
      warning,
    };
  }

  private renderResultSubmitted(entry: ActiveTaskDelegationRecordEntry, submission: TaskResultSubmission): string {
    return [
      "Task result submitted for review.",
      "",
      `Task ID: ${entry.record.taskId}`,
      "Task:",
      entry.record.content,
      "",
      "Submitted result:",
      submission.content,
      "",
      "Reference files:",
      renderReferenceFiles(submission.referenceFiles),
      "",
      "Task review guidance:",
      "- Use review_task_result with decision=accept when the result is ready to finalize.",
      "- Use review_task_result with decision=request_revision and a non-empty comment when the task result needs changes.",
    ].join("\n");
  }

  private renderRevisionRequested(entry: ActiveTaskDelegationRecordEntry, review: TaskResultReview): string {
    return [
      "Revision requested for delegated task.",
      "",
      `Task ID: ${entry.record.taskId}`,
      "Task:",
      entry.record.content,
      "",
      "Review comment:",
      review.content ?? "",
      "",
      "Reference files:",
      renderReferenceFiles(review.referenceFiles),
      "",
      "When the revision is ready, call submit_task_result with the revised result message and optional reference_files.",
    ].join("\n");
  }
}
