import type { AgentRunIdentityAllocator } from "../../agent-execution/services/agent-run-identity-allocator.js";
import type { TeamRun } from "../domain/team-run.js";
import { getTaskAgentDirectory, type TaskAgentDirectory } from "./task-agent-directory.js";
import { getTaskTeamActiveRunDirectory, type TaskTeamActiveRunDirectory } from "./task-team-active-run-directory.js";
import { TaskDelegationActivationCoordinator } from "./task-delegation-activation-coordinator.js";
import { TaskDelegationAddressBuilder } from "./task-delegation-address-builder.js";
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
  type TaskDelegationReferenceFilePayload,
  type TaskReferenceFile,
} from "./task-delegation-record.js";
import {
  getTaskDelegationTaskTeamInstance,
  resolveTaskDelegationPersistenceScope,
  type TaskDelegationPersistenceScope,
} from "./task-delegation-persistence-scope.js";
import { TaskDelegationSettlementCoordinator } from "./task-delegation-settlement-coordinator.js";
import { TaskTeamSettlementCoordinator } from "./task-team-settlement-coordinator.js";
import { getTaskDelegationRunRegistry, type TaskDelegationRunRegistry } from "./task-delegation-run-registry.js";
import { normalizeTaskDelegationReferenceFiles } from "./task-delegation-reference-file.js";
import {
  getTaskDelegationRecordsService,
  type TaskDelegationRecordsService,
} from "./records/task-delegation-records-service.js";
import type { ActiveTaskDelegationRecordEntry } from "./task-delegation-active-entry.js";
import type { ResolvedTeamRecipient } from "../services/resolved-team-recipient.js";
import { TaskDelegationTargetMapper } from "./task-delegation-target-mapper.js";

export type TaskDelegationServiceOptions = {
  agentRunIdentityAllocator?: Pick<AgentRunIdentityAllocator, "allocateForAgentDefinition">;
  taskTeamDirectory?: TaskTeamActiveRunDirectory;
  runRegistry?: TaskDelegationRunRegistry;
  recordsService?: TaskDelegationRecordsService;
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
  private readonly recordsService: TaskDelegationRecordsService;
  private readonly persistenceScope: TaskDelegationPersistenceScope;
  private readonly addressBuilder: TaskDelegationAddressBuilder;
  private readonly targetMapper = new TaskDelegationTargetMapper();

  constructor(
    private readonly teamRun: TeamRun,
    options: TaskDelegationServiceOptions = {},
  ) {
    this.persistenceScope = resolveTaskDelegationPersistenceScope(teamRun);
    const runtimeContext = teamRun.getRuntimeContext() as import("../backends/mixed/mixed-team-run-context.js").MixedTeamRunContext;
    this.addressBuilder = new TaskDelegationAddressBuilder(runtimeContext.teamExecutionAddress);
    this.ledger = new TaskDelegationLedger(teamRun.teamRunId);
    this.taskAgentDirectory = getTaskAgentDirectory(teamRun.config.rootTeam.teamRunId);
    this.taskTeamDirectory = options.taskTeamDirectory ?? getTaskTeamActiveRunDirectory();
    this.runRegistry = options.runRegistry ?? getTaskDelegationRunRegistry();
    this.recordsService = options.recordsService ?? getTaskDelegationRecordsService();
    this.activationCoordinator = new TaskDelegationActivationCoordinator(
      this.ledger,
      this.taskAgentDirectory,
      undefined,
      undefined,
      options.agentRunIdentityAllocator,
    );
    this.eventPublisher = new TaskDelegationEventPublisher();
    this.notificationDispatcher = new TaskDelegationNotificationDispatcher();
    this.inputResolver = new TaskDelegationInputResolver(teamRun.teamRunId);
    this.settlementCoordinator = new TaskDelegationSettlementCoordinator(
      teamRun,
      this.ledger,
      this.taskAgentDirectory,
      { coordinatorAddress: teamRun.context.index.getTeam(teamRun.context.teamAddress)?.coordinatorAddress ?? null },
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
    return this.ledger.listEntries().some((entry) =>
      entry.phase === "starting" || entry.record.status !== "accepted",
    );
  }

  resolveTaskReference(input: {
    taskId: string;
    referenceId: string;
  }): { record: TaskDelegationRecord; reference: TaskDelegationReferenceFilePayload } | null {
    const taskId = input.taskId.trim();
    const referenceId = input.referenceId.trim();
    if (!taskId || !referenceId) return null;
    const record = this.ledger.getRecord(taskId);
    if (!record) return null;
    const reference = record.referenceFiles
      .find((candidate) => candidate.referenceId === referenceId) ?? null;
    return reference ? { record, reference: { ...reference } } : null;
  }

  async delegateTask(
    context: TaskDelegationContext,
    input: DelegateTaskInput,
    placement: ResolvedTeamRecipient,
  ): Promise<DelegateTaskResult> {
    this.assertTeamRunActive();
    this.inputResolver.assertContext(context);
    this.assertActiveTaskAgentCaller(context);
    const task = this.inputResolver.normalizeCreateInput(input);
    const target = this.targetMapper.fromRecipient(placement, context.addressing, this.teamRun.context, context.caller);
    const taskId = await this.recordsService.reserveTaskId(this.persistenceScope);
    const createInput = this.inputResolver.buildCreateInput(context, task, target, taskId);
    const referenceFiles = this.normalizeReferenceFiles(createInput.task.reference_files);
    this.ledger.createStartingEntry({
      taskId: createInput.taskId,
      persistenceScope: this.persistenceScope,
      target: createInput.target,
      reviewOwner: createInput.delegator,
      senderAddress: this.addressBuilder.buildCallerAddress(context.caller),
      receiverAddress: this.addressBuilder.buildTargetAddress(createInput.target),
      receiverTargetKind: createInput.target.kind,
      content: createInput.task.description,
      referenceFiles,
    });

    const activationResult = await this.activationCoordinator.activateTask(this.teamRun, taskId);
    if (!activationResult.accepted) {
      this.ledger.discardStartingEntry(taskId);
      return {
        task_id: taskId,
        status: "not_started",
        message: this.activationFailureMessage(activationResult.message),
      };
    }

    const startingEntry = this.ledger.getStartingEntry(taskId);
    if (!startingEntry?.boundExecution) {
      this.ledger.discardStartingEntry(taskId);
      return {
        task_id: taskId,
        status: "not_started",
        message: "Task activation did not bind an execution instance.",
      };
    }
    const activeEntry = this.ledger.activateStartingEntry({
      taskId,
      taskRun: {
        address: this.addressBuilder.buildTaskRunAddress(startingEntry.boundExecution, startingEntry.receiverAddress),
        startedAt: new Date().toISOString(),
      },
      receiverAddress: startingEntry.boundExecution.kind === "task_team"
        ? this.addressBuilder.buildTaskTeamIngressAddress(
            this.addressBuilder.buildTaskRunAddress(startingEntry.boundExecution, startingEntry.receiverAddress),
            startingEntry.target.kind === "agent_team" ? startingEntry.target.coordinatorAddress : startingEntry.receiverAddress.memberAddress,
          )
        : startingEntry.receiverAddress,
    });
    await this.persistLifecycleRecord(activeEntry);
    this.eventPublisher.publishActivated({
      teamRun: this.teamRun,
      teamRunId: this.teamRun.teamRunId,
      entry: activeEntry,
    });
    return {
      task_id: activeEntry.record.taskId,
      status: "active",
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
    const referenceFiles = this.normalizeReferenceFiles(input.reference_files);
    const transition = this.ledger.submitResultFromTaskAgent({
      taskId,
      taskAgentRunId: boundTaskAgentRunId,
      message,
      referenceFiles,
    });
    return this.publishSubmissionTransition(transition);
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
    if (context.caller.taskAgentInstance?.taskAgentRunId?.trim()) {
      throw new TaskDelegationError("TASK_TEAM_CONTEXT_REQUIRED", "Task-team ingress submission cannot be routed from a task-agent context.");
    }
    if (taskTeamInstance.parentTeamRunId !== this.teamRun.teamRunId) {
      throw new TaskDelegationError(
        "TASK_TEAM_PARENT_RUN_MISMATCH",
        `Task-team run '${taskTeamInstance.taskTeamRunId}' belongs to parent TeamRun '${taskTeamInstance.parentTeamRunId}', not '${this.teamRun.teamRunId}'.`,
      );
    }
    return this.submitTaskTeamResult(
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
    const existing = this.ledger.getRecordEntry(taskId);
    if (!existing) throw new TaskDelegationError("TASK_NOT_FOUND", `Delegated task '${taskId}' was not found.`);
    this.assertOriginalDelegator(context, existing);
    const comment = input.decision === "request_revision"
      ? this.normalizeRequiredMessage(input.comment ?? "", "comment")
      : this.inputResolver.normalizeStatusMessage(input.comment ?? null);
    const referenceFiles = this.normalizeReferenceFiles(input.reference_files);
    const transition = this.ledger.reviewResult({
      taskId,
      decision: input.decision,
      comment,
      referenceFiles,
      reviewer: context.caller,
    });
    const { entry: updatedEntry, review, previousStatus } = transition;
    await this.persistLifecycleRecord(updatedEntry);
    this.eventPublisher.publishResultReviewed({ teamRun: this.teamRun, teamRunId: this.teamRun.teamRunId, previousStatus, entry: updatedEntry, review });
    this.eventPublisher.publishStatusUpdated({ teamRun: this.teamRun, teamRunId: this.teamRun.teamRunId, previousStatus, entry: updatedEntry });

    if (input.decision === "request_revision") {
      const notificationOutcome = await this.notificationDispatcher.notifyRevisionRequested({ teamRun: this.teamRun, entry: updatedEntry, review });
      this.logNotificationWarning(notificationOutcome);
      const notificationMessage = this.notificationWarningMessage(notificationOutcome);
      return {
        task_id: updatedEntry.record.taskId,
        status: "active",
        ...(notificationMessage ? { message: notificationMessage } : {}),
      };
    }

    if (updatedEntry.taskRunExecution.kind === "task_team") {
      this.taskTeamSettlementCoordinator.requestSettlement(updatedEntry.taskRunExecution.taskTeamInstance);
    } else {
      this.settlementCoordinator.requestSettlement(updatedEntry.taskRunExecution.taskAgentInstance);
    }
    return {
      task_id: updatedEntry.record.taskId,
      status: "accepted",
    };
  }

  private async submitTaskTeamResult(
    input: SubmitTaskResultInput,
    taskId: string,
    taskTeamRunId: string,
  ): Promise<SubmitTaskResultResult> {
    const message = this.normalizeRequiredMessage(input.message, "message");
    const referenceFiles = this.normalizeReferenceFiles(input.reference_files);
    const transition = this.ledger.submitResultFromTaskTeam({ taskId, taskTeamRunId, message, referenceFiles });
    return this.publishSubmissionTransition(transition);
  }

  private async publishSubmissionTransition(
    transition: TaskResultSubmissionTransition,
  ): Promise<SubmitTaskResultResult> {
    const { entry: updatedEntry, submission, previousStatus } = transition;
    await this.persistLifecycleRecord(updatedEntry);
    this.eventPublisher.publishResultSubmitted({ teamRun: this.teamRun, teamRunId: this.teamRun.teamRunId, previousStatus, entry: updatedEntry, submission });
    this.eventPublisher.publishStatusUpdated({ teamRun: this.teamRun, teamRunId: this.teamRun.teamRunId, previousStatus, entry: updatedEntry });
    const notificationOutcome = await this.notificationDispatcher.notifyResultSubmitted({ teamRun: this.teamRun, entry: updatedEntry, submission });
    this.logNotificationWarning(notificationOutcome);
    const notificationMessage = this.notificationWarningMessage(notificationOutcome);
    return {
      task_id: updatedEntry.record.taskId,
      status: "awaiting_review",
      ...(notificationMessage ? { message: notificationMessage } : {}),
    };
  }

  private async persistLifecycleRecord(entry: ActiveTaskDelegationRecordEntry): Promise<void> {
    try {
      await this.recordsService.persistRecord(entry.persistenceScope, entry.record);
    } catch (error) {
      console.warn("TaskDelegationService: failed to persist task delegation record", {
        rootTeamRunId: entry.persistenceScope.rootTeamRunId,
        currentTeamRunId: entry.persistenceScope.currentTeamRunId,
        taskId: entry.record.taskId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private normalizeReferenceFiles(referenceFiles: readonly string[] | undefined): TaskReferenceFile[] {
    return normalizeTaskDelegationReferenceFiles(
      this.inputResolver.normalizeReferenceFiles(referenceFiles),
      new Date().toISOString(),
    );
  }

  private assertTeamRunActive(): void {
    if (!this.teamRun.isActive()) {
      throw new TaskDelegationError("TEAM_RUN_NOT_ACTIVE", `TeamRun '${this.teamRun.teamRunId}' is not active.`);
    }
  }

  private assertOriginalDelegator(context: TaskDelegationContext, entry: ActiveTaskDelegationRecordEntry): void {
    const caller = context.caller;
    const reviewOwner = entry.reviewOwner;
    if (reviewOwner.executionAddress.memberAddress !== caller.executionAddress.memberAddress) {
      throw new TaskDelegationError("DELEGATOR_NOT_AUTHORIZED", `Only task review owner '${reviewOwner.executionAddress.memberAddress}' may review delegated task '${entry.record.taskId}'.`);
    }
    if (reviewOwner.taskAgentInstance) {
      this.assertTaskAgentDelegatorIdentity(context, entry);
      return;
    }
    if (caller.taskAgentInstance?.taskAgentRunId?.trim()) {
      throw new TaskDelegationError("DELEGATOR_NOT_AUTHORIZED", `Task-agent caller is not the task review owner for delegated task '${entry.record.taskId}'.`);
    }
    if (reviewOwner.agentRunId !== caller.agentRunId) {
      throw new TaskDelegationError("DELEGATOR_NOT_AUTHORIZED", `Caller AgentRun '${caller.agentRunId}' is not the task review owner for delegated task '${entry.record.taskId}'.`);
    }
  }

  private assertTaskAgentDelegatorIdentity(context: TaskDelegationContext, entry: ActiveTaskDelegationRecordEntry): void {
    const caller = context.caller;
    const expected = entry.reviewOwner;
    if (caller.taskAgentInstance?.taskAgentRunId !== expected.taskAgentInstance?.taskAgentRunId || caller.taskAgentInstance?.taskId !== expected.taskAgentInstance?.taskId || caller.agentRunId !== expected.taskAgentInstance?.taskAgentRunId) {
      throw new TaskDelegationError("DELEGATOR_NOT_AUTHORIZED", `Caller task-agent identity is not the task review owner for delegated task '${entry.record.taskId}'.`);
    }
    this.assertActiveTaskAgentCaller(context);
  }

  private requireBoundTaskAgentRunId(context: TaskDelegationContext): string {
    const taskAgentRunId = context.caller.taskAgentInstance?.taskAgentRunId?.trim() || null;
    if (!taskAgentRunId) {
      throw new TaskDelegationError("TASK_AGENT_CONTEXT_REQUIRED", "submit_task_result is available only to a bound task-agent or task-team ingress context.");
    }
    this.resolveActiveTaskAgentCallerEntry(context, taskAgentRunId, "submit task results");
    return taskAgentRunId;
  }

  private assertActiveTaskAgentCaller(context: TaskDelegationContext): void {
    const taskAgentRunId = context.caller.taskAgentInstance?.taskAgentRunId?.trim() || null;
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
    const callerTaskId = context.caller.taskAgentInstance?.taskId?.trim() || null;
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

  private activationFailureMessage(message: string | null | undefined): string {
    return message?.trim() || "Task activation failed.";
  }

  private notificationWarningMessage(outcome: TaskDelegationNotificationDeliveryOutcome): string | null {
    if (!outcome.warning) return null;
    return outcome.warning.message.trim() || "Task notification delivery failed.";
  }
}
