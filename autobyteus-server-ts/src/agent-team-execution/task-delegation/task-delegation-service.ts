import type { TeamRun } from "../domain/team-run.js";
import { TaskDelegationActivationCoordinator } from "./task-delegation-activation-coordinator.js";
import { TaskDelegationCompletionNotifier } from "./task-delegation-completion-notifier.js";
import { TaskDelegationEventPublisher } from "./task-delegation-event-publisher.js";
import { TaskDelegationInputResolver } from "./task-delegation-input-resolver.js";
import { TaskDelegationLedger } from "./task-delegation-ledger.js";
import {
  isTaskDelegationTerminalStatus,
  TaskDelegationError,
  type DelegateTasksInput,
  type DelegateTasksResult,
  type TaskDelegationContext,
  type TaskDelegationRecord,
  type UpdateTaskStatusInput,
  type UpdateTaskStatusResult,
} from "./task-delegation-record.js";
import { TaskDelegationSettlementCoordinator } from "./task-delegation-settlement-coordinator.js";

export class TaskDelegationService {
  private readonly ledger: TaskDelegationLedger;
  private readonly activationCoordinator: TaskDelegationActivationCoordinator;
  private readonly completionNotifier: TaskDelegationCompletionNotifier;
  private readonly eventPublisher: TaskDelegationEventPublisher;
  private readonly inputResolver: TaskDelegationInputResolver;
  private readonly settlementCoordinator: TaskDelegationSettlementCoordinator;

  constructor(private readonly teamRun: TeamRun) {
    this.ledger = new TaskDelegationLedger(teamRun.runId);
    this.activationCoordinator = new TaskDelegationActivationCoordinator(this.ledger);
    this.completionNotifier = new TaskDelegationCompletionNotifier();
    this.eventPublisher = new TaskDelegationEventPublisher();
    this.inputResolver = new TaskDelegationInputResolver(teamRun.runId, this.ledger);
    this.settlementCoordinator = new TaskDelegationSettlementCoordinator(
      teamRun,
      this.ledger,
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

  async delegateTasks(
    context: TaskDelegationContext,
    input: DelegateTasksInput,
  ): Promise<DelegateTasksResult> {
    this.assertTeamRunActive();
    this.inputResolver.assertContext(context);
    const createInputs = this.inputResolver.buildCreateInputs(context, input);
    const records = this.ledger.createRecords(createInputs);
    const activationResults = await this.activationCoordinator.activateRunnableTasks(this.teamRun);
    const currentRecords = records.map(
      (record) => this.ledger.getRecord(record.taskId) ?? record,
    );
    return {
      createdTasks: currentRecords.map((record) => ({
        member_name: record.member.memberName,
        status: record.status,
      })),
      activationResults,
    };
  }

  async updateTaskStatus(
    context: TaskDelegationContext,
    input: UpdateTaskStatusInput,
  ): Promise<UpdateTaskStatusResult> {
    this.assertTeamRunActive();
    this.inputResolver.assertContext(context);
    if (input.status === "accepted") {
      return this.acceptTaskStatus(context, input);
    }

    const existing = this.resolveCallerBoundRecord(context);
    const message = this.inputResolver.normalizeStatusMessage(input.message ?? null);
    const referenceFiles = this.inputResolver.normalizeReferenceFiles(input.reference_files);
    const previousStatus = existing.status;
    const updated = this.ledger.updateStatus({
      taskId: existing.taskId,
      status: input.status,
      message,
      referenceFiles,
    });
    this.eventPublisher.publishStatusUpdated({
      teamRun: this.teamRun,
      teamRunId: context.teamRunId,
      previousStatus,
      record: updated,
    });

    let settlementRequested = false;
    if (input.status === "completed" || input.status === "failed") {
      await this.completionNotifier.notifyReportedStatus({
        teamRun: this.teamRun,
        payload: {
          teamRunId: context.teamRunId,
          taskId: updated.taskId,
          taskLabel: updated.taskLabel,
          member: updated.member,
          delegator: updated.delegator,
          taskAgentInstance: updated.taskAgentInstance,
          status: input.status,
          message: updated.statusMessage,
          referenceFiles: updated.statusReferenceFiles,
          completedAt: updated.terminalAt ?? updated.updatedAt,
        },
        coordinatorMemberRouteKey: context.coordinatorMemberRouteKey ?? null,
      });
      if (input.status === "failed") {
        settlementRequested = this.settlementCoordinator.requestSettlement(updated.taskAgentInstance);
      }
    }

    return {
      status: updated.status,
      terminal: isTaskDelegationTerminalStatus(updated.status),
      message: updated.statusMessage,
      reference_files_count: updated.statusReferenceFiles.length,
      settlement_requested: settlementRequested,
    };
  }

  private acceptTaskStatus(
    context: TaskDelegationContext,
    input: Extract<UpdateTaskStatusInput, { status: "accepted" }>,
  ): UpdateTaskStatusResult {
    const taskId = input.task_id.trim();
    if (!taskId) {
      throw new TaskDelegationError("VALIDATION_ERROR", "task_id is required for accepted status.");
    }
    const existing = this.ledger.getRecord(taskId);
    if (!existing) {
      throw new TaskDelegationError("TASK_NOT_FOUND", `Delegated task '${taskId}' was not found.`);
    }
    this.assertOriginalDelegator(context, existing);
    const message = this.inputResolver.normalizeStatusMessage(input.message ?? null);
    const previousStatus = existing.status;
    const updated = this.ledger.acceptTask({ taskId, message });
    this.eventPublisher.publishStatusUpdated({
      teamRun: this.teamRun,
      teamRunId: context.teamRunId,
      previousStatus,
      record: updated,
    });
    const settlementRequested = this.settlementCoordinator.requestSettlement(updated.taskAgentInstance);
    return {
      status: updated.status,
      terminal: isTaskDelegationTerminalStatus(updated.status),
      message: updated.acceptanceMessage,
      reference_files_count: updated.statusReferenceFiles.length,
      settlement_requested: settlementRequested,
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

  private resolveCallerBoundRecord(context: TaskDelegationContext): TaskDelegationRecord {
    const callerTaskAgentRunId = context.caller.taskAgentRunId?.trim() || context.caller.memberRunId.trim();
    if (!callerTaskAgentRunId) {
      throw new TaskDelegationError(
        "TASK_AGENT_CONTEXT_REQUIRED",
        "update_task_status requires a task-agent instance context.",
      );
    }
    const records = this.ledger.listRecordsForTaskAgentRun(callerTaskAgentRunId);
    if (records.length === 0) {
      throw new TaskDelegationError(
        "TASK_AGENT_NOT_BOUND",
        `Task-agent run '${callerTaskAgentRunId}' is not bound to an active delegated task.`,
      );
    }
    if (records.length > 1) {
      throw new TaskDelegationError(
        "TASK_AGENT_AMBIGUOUS",
        `Task-agent run '${callerTaskAgentRunId}' is bound to ${records.length} delegated tasks; update_task_status requires exactly one bound task.`,
      );
    }
    const record = records[0]!;
    const callerLogicalRouteKey =
      context.caller.logicalMemberRouteKey?.trim() || context.caller.memberRouteKey;
    if (record.member.memberRouteKey !== callerLogicalRouteKey) {
      throw new TaskDelegationError(
        "MEMBER_MISMATCH",
        `Only member '${record.member.memberName}' may update the bound delegated task.`,
      );
    }
    const taskAgentInstance = record.taskAgentInstance;
    if (!taskAgentInstance) {
      throw new TaskDelegationError(
        "TASK_NOT_ACTIVATED",
        `Delegated task '${record.taskId}' is not bound to a task-agent instance.`,
      );
    }
    const callerTaskAgentInstanceId = context.caller.taskAgentInstanceId?.trim();
    if (
      callerTaskAgentInstanceId &&
      callerTaskAgentInstanceId !== taskAgentInstance.taskAgentInstanceId
    ) {
      throw new TaskDelegationError(
        "TASK_AGENT_MISMATCH",
        `Delegated task '${record.taskId}' belongs to task-agent instance '${taskAgentInstance.taskAgentInstanceId}'.`,
      );
    }
    const callerTaskId = context.caller.taskId?.trim();
    if (callerTaskId && callerTaskId !== record.taskId) {
      throw new TaskDelegationError(
        "TASK_AGENT_MISMATCH",
        `Caller task-agent context is bound to task '${callerTaskId}', not '${record.taskId}'.`,
      );
    }
    return record;
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
        `Only original delegator '${record.delegator.memberName}' may accept delegated task '${record.taskId}'.`,
      );
    }
    if (record.delegator.taskAgentRunId) {
      this.assertTaskAgentDelegatorIdentity(context, record);
      return;
    }
    if (caller.taskAgentRunId?.trim()) {
      throw new TaskDelegationError(
        "DELEGATOR_NOT_AUTHORIZED",
        `Task-agent caller is not the original delegator for delegated task '${record.taskId}'.`,
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
      caller.taskAgentInstanceId !== expected.taskAgentInstanceId ||
      caller.taskId !== expected.taskId ||
      caller.memberRunId !== expected.taskAgentRunId
    ) {
      throw new TaskDelegationError(
        "DELEGATOR_NOT_AUTHORIZED",
        `Caller task-agent identity is not the original delegator for delegated task '${record.taskId}'.`,
      );
    }
  }
}
