import type { AgentRunIdentityAllocator } from "../../agent-execution/services/agent-run-identity-allocator.js";
import type { TeamRun } from "../domain/team-run.js";
import { getTaskAgentDirectory, type TaskAgentDirectory } from "./task-agent-directory.js";
import { TaskDelegationActivationCoordinator } from "./task-delegation-activation-coordinator.js";
import { TaskDelegationEventPublisher } from "./task-delegation-event-publisher.js";
import { TaskDelegationInputResolver } from "./task-delegation-input-resolver.js";
import { TaskDelegationLedger } from "./task-delegation-ledger.js";
import { TaskDelegationNotificationDispatcher } from "./task-delegation-notification-dispatcher.js";
import {
  TaskDelegationError,
  type DelegateTaskInput,
  type DelegateTaskResult,
  type ReviewTaskResultInput,
  type ReviewTaskResultResult,
  type SubmitTaskResultInput,
  type SubmitTaskResultResult,
  type TaskDelegationContext,
  type TaskDelegationNotificationDeliveryOutcome,
  type TaskDelegationRecord,
} from "./task-delegation-record.js";
import { TaskDelegationSettlementCoordinator } from "./task-delegation-settlement-coordinator.js";

export type TaskDelegationServiceOptions = {
  agentRunIdentityAllocator?: Pick<AgentRunIdentityAllocator, "allocateForAgentDefinition">;
};

export class TaskDelegationService {
  private readonly ledger: TaskDelegationLedger;
  private readonly taskAgentDirectory: TaskAgentDirectory;
  private readonly activationCoordinator: TaskDelegationActivationCoordinator;
  private readonly eventPublisher: TaskDelegationEventPublisher;
  private readonly notificationDispatcher: TaskDelegationNotificationDispatcher;
  private readonly inputResolver: TaskDelegationInputResolver;
  private readonly settlementCoordinator: TaskDelegationSettlementCoordinator;

  constructor(
    private readonly teamRun: TeamRun,
    options: TaskDelegationServiceOptions = {},
  ) {
    this.ledger = new TaskDelegationLedger(teamRun.runId);
    this.taskAgentDirectory = getTaskAgentDirectory(teamRun.runId);
    this.activationCoordinator = new TaskDelegationActivationCoordinator(
      this.ledger,
      this.taskAgentDirectory,
      undefined,
      undefined,
      options.agentRunIdentityAllocator,
    );
    this.eventPublisher = new TaskDelegationEventPublisher();
    this.notificationDispatcher = new TaskDelegationNotificationDispatcher();
    this.inputResolver = new TaskDelegationInputResolver(teamRun.runId, this.ledger);
    this.settlementCoordinator = new TaskDelegationSettlementCoordinator(
      teamRun,
      this.ledger,
      this.taskAgentDirectory,
      {
        coordinatorMemberRouteKey:
          teamRun.context?.coordinatorMemberRouteKey ??
          teamRun.config?.coordinatorMemberRouteKey ??
          null,
      },
    );
    this.settlementCoordinator.attach();
  }

  dispose(): void {
    this.settlementCoordinator.detach();
  }

  async delegateTask(
    context: TaskDelegationContext,
    input: DelegateTaskInput,
  ): Promise<DelegateTaskResult> {
    this.assertTeamRunActive();
    this.inputResolver.assertContext(context);
    this.assertActiveTaskAgentCaller(context);
    const createInput = this.inputResolver.buildCreateInput(context, input);
    const record = this.ledger.createRecord(createInput);
    const activationResult = await this.activationCoordinator.activateTask(
      this.teamRun,
      record.taskId,
    );
    const currentRecord = this.ledger.getRecord(record.taskId) ?? record;
    return {
      member_name: currentRecord.member.memberName,
      task_id: currentRecord.taskId,
      target_agent_run_id: currentRecord.targetAgentRunId,
      status: currentRecord.status,
      activation_accepted: activationResult.accepted,
      message: activationResult.message ?? null,
    };
  }

  async submitTaskResult(
    context: TaskDelegationContext,
    input: SubmitTaskResultInput,
  ): Promise<SubmitTaskResultResult> {
    this.assertTeamRunActive();
    this.inputResolver.assertContext(context);
    const taskAgentRunId = this.requireBoundTaskAgentRunId(context);
    const taskId = this.resolveTaskAgentTaskId(context, taskAgentRunId);
    const message = this.normalizeRequiredMessage(input.message, "message");
    const referenceFiles = this.inputResolver.normalizeReferenceFiles(input.reference_files);
    const transition = this.ledger.submitResult({
      taskId,
      taskAgentRunId,
      message,
      referenceFiles,
    });
    const { record: updated, submission, previousStatus } = transition;
    this.eventPublisher.publishResultSubmitted({
      teamRun: this.teamRun,
      teamRunId: context.teamRunId,
      previousStatus,
      record: updated,
      submission,
    });
    this.eventPublisher.publishStatusUpdated({
      teamRun: this.teamRun,
      teamRunId: context.teamRunId,
      previousStatus,
      record: updated,
    });
    const notificationOutcome = await this.notificationDispatcher.notifyResultSubmitted({
      teamRun: this.teamRun,
      record: updated,
      submission,
    });
    this.logNotificationWarning(notificationOutcome);
    return {
      task_id: updated.taskId,
      status: "awaiting_review",
      submission_id: submission.submissionId,
      notification_delivered: notificationOutcome.delivered,
      warnings: notificationOutcome.warning ? [notificationOutcome.warning] : [],
    };
  }

  async reviewTaskResult(
    context: TaskDelegationContext,
    input: ReviewTaskResultInput,
  ): Promise<ReviewTaskResultResult> {
    this.assertTeamRunActive();
    this.inputResolver.assertContext(context);
    const taskId = input.task_id.trim();
    if (!taskId) {
      throw new TaskDelegationError("VALIDATION_ERROR", "task_id is required for review_task_result.");
    }
    const existing = this.ledger.getRecord(taskId);
    if (!existing) {
      throw new TaskDelegationError("TASK_NOT_FOUND", `Delegated task '${taskId}' was not found.`);
    }
    this.assertOriginalDelegator(context, existing);
    const message = input.decision === "request_revision"
      ? this.normalizeRequiredMessage(input.message ?? "", "message")
      : this.inputResolver.normalizeStatusMessage(input.message ?? null);
    const referenceFiles = this.inputResolver.normalizeReferenceFiles(input.reference_files);
    const transition = this.ledger.reviewResult({
      taskId,
      decision: input.decision,
      message,
      referenceFiles,
      reviewer: context.caller,
    });
    const { record: updated, review, previousStatus } = transition;
    this.eventPublisher.publishResultReviewed({
      teamRun: this.teamRun,
      teamRunId: context.teamRunId,
      previousStatus,
      record: updated,
      review,
    });
    this.eventPublisher.publishStatusUpdated({
      teamRun: this.teamRun,
      teamRunId: context.teamRunId,
      previousStatus,
      record: updated,
    });

    if (input.decision === "request_revision") {
      const notificationOutcome = await this.notificationDispatcher.notifyRevisionRequested({
        teamRun: this.teamRun,
        record: updated,
        review,
      });
      this.logNotificationWarning(notificationOutcome);
      return {
        task_id: updated.taskId,
        status: "active",
        decision: input.decision,
        review_id: review.reviewId,
        reviewed_submission_id: review.reviewedSubmissionId,
        notification_delivered: notificationOutcome.delivered,
        settlement_requested: false,
        warnings: notificationOutcome.warning ? [notificationOutcome.warning] : [],
      };
    }

    const settlementRequested = this.settlementCoordinator.requestSettlement(updated.taskAgentInstance);
    return {
      task_id: updated.taskId,
      status: "accepted",
      decision: input.decision,
      review_id: review.reviewId,
      reviewed_submission_id: review.reviewedSubmissionId,
      notification_delivered: null,
      settlement_requested: settlementRequested,
      warnings: [],
    };
  }

  private assertTeamRunActive(): void {
    if (!this.teamRun.isActive()) {
      throw new TaskDelegationError(
        "TEAM_RUN_NOT_ACTIVE",
        `Team run '${this.teamRun.runId}' is not active.`,
      );
    }
  }

  private assertOriginalDelegator(
    context: TaskDelegationContext,
    record: TaskDelegationRecord,
  ): void {
    const caller = context.caller;
    const callerLogicalRoute = caller.logicalMemberRouteKey?.trim() || caller.memberRouteKey.trim();
    if (
      record.delegator.memberRouteKey !== callerLogicalRoute ||
      record.delegator.memberName !== caller.memberName
    ) {
      throw new TaskDelegationError(
        "DELEGATOR_NOT_AUTHORIZED",
        `Only original delegator '${record.delegator.memberName}' may review delegated task '${record.taskId}'.`,
      );
    }
    if (record.delegator.taskAgentRunId) {
      this.assertTaskAgentDelegatorIdentity(context, record);
      return;
    }
    if (caller.taskAgentRunId?.trim()) {
      throw new TaskDelegationError(
        "DELEGATOR_NOT_AUTHORIZED",
        `Task-agent caller is not the original delegator/reviewer for delegated task '${record.taskId}'.`,
      );
    }
    if (record.delegator.memberRunId !== caller.memberRunId) {
      throw new TaskDelegationError(
        "DELEGATOR_NOT_AUTHORIZED",
        `Caller run '${caller.memberRunId}' is not the original delegator run for delegated task '${record.taskId}'.`,
      );
    }
  }

  private assertTaskAgentDelegatorIdentity(
    context: TaskDelegationContext,
    record: TaskDelegationRecord,
  ): void {
    const caller = context.caller;
    const expected = record.delegator;
    if (
      caller.taskAgentRunId !== expected.taskAgentRunId ||
      caller.taskId !== expected.taskId ||
      caller.memberRunId !== expected.taskAgentRunId
    ) {
      throw new TaskDelegationError(
        "DELEGATOR_NOT_AUTHORIZED",
        `Caller task-agent identity is not the original delegator for delegated task '${record.taskId}'.`,
      );
    }
    this.assertActiveTaskAgentCaller(context);
  }

  private requireBoundTaskAgentRunId(context: TaskDelegationContext): string {
    const taskAgentRunId = context.caller.taskAgentRunId?.trim() || null;
    if (!taskAgentRunId) {
      throw new TaskDelegationError(
        "TASK_AGENT_CONTEXT_REQUIRED",
        "submit_task_result is available only to a bound task-agent context.",
      );
    }
    this.resolveActiveTaskAgentCallerEntry(context, taskAgentRunId, "submit task results");
    return taskAgentRunId;
  }

  private assertActiveTaskAgentCaller(context: TaskDelegationContext): void {
    const taskAgentRunId = context.caller.taskAgentRunId?.trim() || null;
    if (!taskAgentRunId) {
      return;
    }
    this.resolveActiveTaskAgentCallerEntry(context, taskAgentRunId, "perform task delegation actions");
  }

  private resolveActiveTaskAgentCallerEntry(
    context: TaskDelegationContext,
    taskAgentRunId: string,
    actionDescription: string,
  ): { taskId: string } {
    if (this.taskAgentDirectory.isTaskAgentRunSettled(taskAgentRunId)) {
      throw new TaskDelegationError(
        "TASK_AGENT_SETTLED",
        `Task-agent run '${taskAgentRunId}' is settled and cannot ${actionDescription}.`,
      );
    }
    const entry = this.taskAgentDirectory.resolveTaskAgentRunId(taskAgentRunId);
    if (!entry) {
      throw new TaskDelegationError(
        "TASK_AGENT_NOT_ACTIVE",
        `Task-agent run '${taskAgentRunId}' is not an active task-agent for ${actionDescription}.`,
      );
    }
    const callerTaskId = context.caller.taskId?.trim() || null;
    if (callerTaskId !== entry.taskId) {
      throw new TaskDelegationError(
        "TASK_AGENT_NOT_AUTHORIZED",
        `Task-agent run '${taskAgentRunId}' is not bound to task '${callerTaskId ?? "(missing)"}'.`,
      );
    }
    return entry;
  }

  private resolveTaskAgentTaskId(
    context: TaskDelegationContext,
    taskAgentRunId: string,
  ): string {
    return this.resolveActiveTaskAgentCallerEntry(context, taskAgentRunId, "submit task results").taskId;
  }

  private normalizeRequiredMessage(value: string, fieldName: string): string {
    const normalized = value.trim();
    if (!normalized) {
      throw new TaskDelegationError("VALIDATION_ERROR", `${fieldName} is required.`);
    }
    return normalized;
  }

  private logNotificationWarning(
    outcome: TaskDelegationNotificationDeliveryOutcome,
  ): void {
    if (!outcome.warning) {
      return;
    }
    console.warn("TaskDelegationService: task notification delivery failed", outcome.warning);
  }
}
