import type { AgentRunIdentityAllocator } from "../../agent-execution/services/agent-run-identity-allocator.js";
import type { TeamRun } from "../domain/team-run.js";
import { getTaskAgentDirectory, type TaskAgentDirectory } from "./task-agent-directory.js";
import { getTaskTeamActiveRunDirectory, type TaskTeamActiveRunDirectory } from "./task-team-active-run-directory.js";
import { TaskDelegationActivationCoordinator } from "./task-delegation-activation-coordinator.js";
import { TaskDelegationEventPublisher } from "./task-delegation-event-publisher.js";
import { TaskDelegationInputResolver } from "./task-delegation-input-resolver.js";
import { TaskDelegationLedger, type TaskResultSubmissionTransition } from "./task-delegation-ledger.js";
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
import { getTaskDelegationTargetName } from "./task-delegation-target.js";
import { TaskDelegationSettlementCoordinator } from "./task-delegation-settlement-coordinator.js";
import { TaskTeamSettlementCoordinator } from "./task-team-settlement-coordinator.js";
import { getTaskDelegationRunRegistry, type TaskDelegationRunRegistry } from "./task-delegation-run-registry.js";

export type TaskDelegationServiceOptions = {
  agentRunIdentityAllocator?: Pick<AgentRunIdentityAllocator, "allocateForAgentDefinition">;
  taskTeamDirectory?: TaskTeamActiveRunDirectory;
  runRegistry?: TaskDelegationRunRegistry;
};

export class TaskDelegationService {
  private readonly ledger: TaskDelegationLedger;
  private readonly taskAgentDirectory: TaskAgentDirectory;
  private readonly taskTeamDirectory: TaskTeamActiveRunDirectory;
  private readonly runRegistry: TaskDelegationRunRegistry;
  private readonly activationCoordinator: TaskDelegationActivationCoordinator;
  private readonly eventPublisher: TaskDelegationEventPublisher;
  private readonly notificationDispatcher: TaskDelegationNotificationDispatcher;
  private readonly inputResolver: TaskDelegationInputResolver;
  private readonly settlementCoordinator: TaskDelegationSettlementCoordinator;
  private readonly taskTeamSettlementCoordinator: TaskTeamSettlementCoordinator;

  constructor(
    private readonly teamRun: TeamRun,
    options: TaskDelegationServiceOptions = {},
  ) {
    this.ledger = new TaskDelegationLedger(teamRun.runId);
    this.taskAgentDirectory = getTaskAgentDirectory(teamRun.runId);
    this.taskTeamDirectory = options.taskTeamDirectory ?? getTaskTeamActiveRunDirectory();
    this.runRegistry = options.runRegistry ?? getTaskDelegationRunRegistry();
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
    this.taskTeamSettlementCoordinator = new TaskTeamSettlementCoordinator({
      parentTeamRun: teamRun,
      taskTeamDirectory: this.taskTeamDirectory,
      runRegistry: this.runRegistry,
    });
    this.settlementCoordinator.attach();
  }

  dispose(): void {
    this.settlementCoordinator.detach();
    this.taskTeamSettlementCoordinator.detach();
  }

  hasOpenWork(): boolean {
    return this.ledger.listRecords().some((record) => record.status !== "accepted");
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
    const activationResult = await this.activationCoordinator.activateTask(this.teamRun, record.taskId);
    const currentRecord = this.ledger.getRecord(record.taskId) ?? record;
    return {
      target: {
        kind: currentRecord.target.kind,
        name: getTaskDelegationTargetName(currentRecord.target),
      },
      task_id: currentRecord.taskId,
      execution_kind: currentRecord.execution?.kind ?? null,
      task_agent_run_id: currentRecord.execution?.kind === "task_agent"
        ? currentRecord.execution.taskAgentInstance.taskAgentRunId
        : null,
      task_team_run_id: currentRecord.execution?.kind === "task_team"
        ? currentRecord.execution.taskTeamInstance.taskTeamRunId
        : null,
      status: currentRecord.status,
      activation_accepted: activationResult.accepted,
      message: activationResult.message ?? null,
    };
  }

  async submitTaskResult(
    context: TaskDelegationContext,
    input: SubmitTaskResultInput,
  ): Promise<SubmitTaskResultResult> {
    return this.submitTaskAgentResult(context, input);
  }

  async submitTaskAgentResult(
    context: TaskDelegationContext,
    input: SubmitTaskResultInput,
  ): Promise<SubmitTaskResultResult> {
    this.assertTeamRunActive();
    this.inputResolver.assertContext(context);
    const boundTaskAgentRunId = this.requireBoundTaskAgentRunId(context);
    const taskId = this.resolveTaskAgentTaskId(context, boundTaskAgentRunId);
    const message = this.normalizeRequiredMessage(input.message, "message");
    const referenceFiles = this.inputResolver.normalizeReferenceFiles(input.reference_files);
    const transition = this.ledger.submitResultFromTaskAgent({
      taskId,
      taskAgentRunId: boundTaskAgentRunId,
      message,
      referenceFiles,
    });
    return this.publishSubmissionTransition(context, transition);
  }

  async submitTaskTeamIngressResult(
    context: TaskDelegationContext,
    input: SubmitTaskResultInput,
    taskTeamInstance = context.caller.taskTeamInstance ?? null,
  ): Promise<SubmitTaskResultResult> {
    this.assertTeamRunActive();
    if (!taskTeamInstance) {
      throw new TaskDelegationError("TASK_TEAM_CONTEXT_REQUIRED", "submit_task_result requires a bound task-team ingress context for team task results.");
    }
    if (context.caller.taskAgentRunId?.trim()) {
      throw new TaskDelegationError("TASK_TEAM_CONTEXT_REQUIRED", "Task-team ingress submission cannot be routed from a task-agent context.");
    }
    if (taskTeamInstance.parentTeamRunId !== this.teamRun.runId) {
      throw new TaskDelegationError(
        "TASK_TEAM_PARENT_RUN_MISMATCH",
        `Task-team run '${taskTeamInstance.taskTeamRunId}' belongs to parent team run '${taskTeamInstance.parentTeamRunId}', not '${this.teamRun.runId}'.`,
      );
    }
    return this.submitTaskTeamResult(
      context,
      input,
      taskTeamInstance.taskId,
      taskTeamInstance.taskTeamRunId,
    );
  }

  async reviewTaskResult(
    context: TaskDelegationContext,
    input: ReviewTaskResultInput,
  ): Promise<ReviewTaskResultResult> {
    this.assertTeamRunActive();
    this.inputResolver.assertContext(context);
    const taskId = input.task_id.trim();
    if (!taskId) throw new TaskDelegationError("VALIDATION_ERROR", "task_id is required for review_task_result.");
    const existing = this.ledger.getRecord(taskId);
    if (!existing) throw new TaskDelegationError("TASK_NOT_FOUND", `Delegated task '${taskId}' was not found.`);
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
    this.eventPublisher.publishResultReviewed({ teamRun: this.teamRun, teamRunId: context.teamRunId, previousStatus, record: updated, review });
    this.eventPublisher.publishStatusUpdated({ teamRun: this.teamRun, teamRunId: context.teamRunId, previousStatus, record: updated });

    if (input.decision === "request_revision") {
      const notificationOutcome = await this.notificationDispatcher.notifyRevisionRequested({ teamRun: this.teamRun, record: updated, review });
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

    const settlementRequested = updated.execution?.kind === "task_team"
      ? this.taskTeamSettlementCoordinator.requestSettlement(updated.execution.taskTeamInstance)
      : this.settlementCoordinator.requestSettlement(updated.execution?.kind === "task_agent" ? updated.execution.taskAgentInstance : null);
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

  private async submitTaskTeamResult(
    context: TaskDelegationContext,
    input: SubmitTaskResultInput,
    taskId: string,
    taskTeamRunId: string,
  ): Promise<SubmitTaskResultResult> {
    const message = this.normalizeRequiredMessage(input.message, "message");
    const referenceFiles = this.inputResolver.normalizeReferenceFiles(input.reference_files);
    const transition = this.ledger.submitResultFromTaskTeam({ taskId, taskTeamRunId, message, referenceFiles });
    return this.publishSubmissionTransition(
      { ...context, teamRunId: this.teamRun.runId },
      transition,
    );
  }

  private async publishSubmissionTransition(
    context: TaskDelegationContext,
    transition: TaskResultSubmissionTransition,
  ): Promise<SubmitTaskResultResult> {
    const { record: updated, submission, previousStatus } = transition;
    this.eventPublisher.publishResultSubmitted({ teamRun: this.teamRun, teamRunId: this.teamRun.runId, previousStatus, record: updated, submission });
    this.eventPublisher.publishStatusUpdated({ teamRun: this.teamRun, teamRunId: this.teamRun.runId, previousStatus, record: updated });
    const notificationOutcome = await this.notificationDispatcher.notifyResultSubmitted({ teamRun: this.teamRun, record: updated, submission });
    this.logNotificationWarning(notificationOutcome);
    return {
      task_id: updated.taskId,
      status: "awaiting_review",
      submission_id: submission.submissionId,
      notification_delivered: notificationOutcome.delivered,
      warnings: notificationOutcome.warning ? [notificationOutcome.warning] : [],
    };
  }

  private assertTeamRunActive(): void {
    if (!this.teamRun.isActive()) {
      throw new TaskDelegationError("TEAM_RUN_NOT_ACTIVE", `Team run '${this.teamRun.runId}' is not active.`);
    }
  }

  private assertOriginalDelegator(context: TaskDelegationContext, record: TaskDelegationRecord): void {
    const caller = context.caller;
    const callerLogicalRoute = caller.logicalMemberRouteKey?.trim() || caller.memberRouteKey.trim();
    if (record.delegator.memberRouteKey !== callerLogicalRoute || record.delegator.memberName !== caller.memberName) {
      throw new TaskDelegationError("DELEGATOR_NOT_AUTHORIZED", `Only original delegator '${record.delegator.memberName}' may review delegated task '${record.taskId}'.`);
    }
    if (record.delegator.taskAgentRunId) {
      this.assertTaskAgentDelegatorIdentity(context, record);
      return;
    }
    if (caller.taskAgentRunId?.trim()) {
      throw new TaskDelegationError("DELEGATOR_NOT_AUTHORIZED", `Task-agent caller is not the original delegator/reviewer for delegated task '${record.taskId}'.`);
    }
    if (record.delegator.memberRunId !== caller.memberRunId) {
      throw new TaskDelegationError("DELEGATOR_NOT_AUTHORIZED", `Caller run '${caller.memberRunId}' is not the original delegator run for delegated task '${record.taskId}'.`);
    }
  }

  private assertTaskAgentDelegatorIdentity(context: TaskDelegationContext, record: TaskDelegationRecord): void {
    const caller = context.caller;
    const expected = record.delegator;
    if (caller.taskAgentRunId !== expected.taskAgentRunId || caller.taskId !== expected.taskId || caller.memberRunId !== expected.taskAgentRunId) {
      throw new TaskDelegationError("DELEGATOR_NOT_AUTHORIZED", `Caller task-agent identity is not the original delegator for delegated task '${record.taskId}'.`);
    }
    this.assertActiveTaskAgentCaller(context);
  }

  private requireBoundTaskAgentRunId(context: TaskDelegationContext): string {
    const taskAgentRunId = context.caller.taskAgentRunId?.trim() || null;
    if (!taskAgentRunId) {
      throw new TaskDelegationError("TASK_AGENT_CONTEXT_REQUIRED", "submit_task_result is available only to a bound task-agent or task-team ingress context.");
    }
    this.resolveActiveTaskAgentCallerEntry(context, taskAgentRunId, "submit task results");
    return taskAgentRunId;
  }

  private assertActiveTaskAgentCaller(context: TaskDelegationContext): void {
    const taskAgentRunId = context.caller.taskAgentRunId?.trim() || null;
    if (!taskAgentRunId) return;
    this.resolveActiveTaskAgentCallerEntry(context, taskAgentRunId, "perform task delegation actions");
  }

  private resolveActiveTaskAgentCallerEntry(
    context: TaskDelegationContext,
    taskAgentRunId: string,
    actionDescription: string,
  ): { taskId: string } {
    if (this.taskAgentDirectory.isTaskAgentRunSettled(taskAgentRunId)) {
      throw new TaskDelegationError("TASK_AGENT_SETTLED", `Task-agent run '${taskAgentRunId}' is settled and cannot ${actionDescription}.`);
    }
    const entry = this.taskAgentDirectory.resolveTaskAgentRunId(taskAgentRunId);
    if (!entry) {
      throw new TaskDelegationError("TASK_AGENT_NOT_ACTIVE", `Task-agent run '${taskAgentRunId}' is not an active task-agent for ${actionDescription}.`);
    }
    const callerTaskId = context.caller.taskId?.trim() || null;
    if (callerTaskId !== entry.taskId) {
      throw new TaskDelegationError("TASK_AGENT_NOT_AUTHORIZED", `Task-agent run '${taskAgentRunId}' is not bound to task '${callerTaskId ?? "(missing)"}'.`);
    }
    return entry;
  }

  private resolveTaskAgentTaskId(context: TaskDelegationContext, taskAgentRunId: string): string {
    return this.resolveActiveTaskAgentCallerEntry(context, taskAgentRunId, "submit task results").taskId;
  }

  private normalizeRequiredMessage(value: string, fieldName: string): string {
    const normalized = value.trim();
    if (!normalized) throw new TaskDelegationError("VALIDATION_ERROR", `${fieldName} is required.`);
    return normalized;
  }

  private logNotificationWarning(outcome: TaskDelegationNotificationDeliveryOutcome): void {
    if (outcome.warning) console.warn("TaskDelegationService: task notification delivery failed", outcome.warning);
  }
}
