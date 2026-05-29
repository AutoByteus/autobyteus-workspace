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
    this.inputResolver.assertContext(context);
    const createInputs = this.inputResolver.buildCreateInputs(context, input);
    const records = this.ledger.createRecords(createInputs);
    const activationResults = await this.activationCoordinator.activateRunnableTasks(this.teamRun);
    const currentRecords = records.map(
      (record) => this.ledger.getRecord(record.taskId) ?? record,
    );
    return {
      createdTasks: currentRecords.map((record) => ({
        task_id: record.taskId,
        task_name: record.taskName,
        assignee_name: record.assignee.memberName,
        status: record.status,
        dependency_task_ids: [...record.dependencyTaskIds],
      })),
      activationResults,
    };
  }

  async updateTaskStatus(
    context: TaskDelegationContext,
    input: UpdateTaskStatusInput,
  ): Promise<UpdateTaskStatusResult> {
    this.inputResolver.assertContext(context);
    const taskId = this.inputResolver.normalizeTaskId(input.task_id);
    const existing = this.ledger.getRecord(taskId);
    if (!existing) {
      throw new TaskDelegationError("TASK_NOT_FOUND", `Delegated task '${taskId}' was not found.`);
    }
    if (existing.assignee.memberRouteKey !== context.caller.memberRouteKey) {
      throw new TaskDelegationError(
        "ASSIGNEE_MISMATCH",
        `Only assignee '${existing.assignee.memberName}' may update delegated task '${taskId}'.`,
      );
    }

    const deliverables = this.inputResolver.normalizeDeliverables(
      context.caller,
      input.deliverables,
    );
    const previousStatus = existing.status;
    const updated = this.ledger.updateStatus({
      taskId,
      status: input.status,
      summary: input.summary ?? null,
      deliverables,
    });
    this.eventPublisher.publishStatusUpdated({
      teamRun: this.teamRun,
      teamRunId: context.teamRunId,
      previousStatus,
      record: updated,
    });

    let activatedTaskIds: string[] = [];
    let settlementRequested = false;
    if (isTaskDelegationTerminalStatus(updated.status)) {
      const activationResults = await this.activationCoordinator.activateRunnableTasks(this.teamRun);
      activatedTaskIds = activationResults
        .filter((result) => result.accepted)
        .flatMap((result) => result.taskIds);
      await this.completionNotifier.notifyTerminalStatus({
        teamRun: this.teamRun,
        payload: {
          teamRunId: context.teamRunId,
          taskId: updated.taskId,
          taskName: updated.taskName,
          assignee: updated.assignee,
          delegator: updated.delegator,
          status: updated.status,
          summary: updated.terminalSummary,
          deliverables: updated.deliverables,
          completedAt: updated.terminalAt ?? updated.updatedAt,
          activatedTaskIds,
        },
        coordinatorMemberRouteKey: context.coordinatorMemberRouteKey ?? null,
      });
      settlementRequested = this.settlementCoordinator.requestSettlement(updated.assignee);
    }

    return {
      task_id: updated.taskId,
      task_name: updated.taskName,
      status: updated.status,
      terminal: isTaskDelegationTerminalStatus(updated.status),
      deliverables_count: updated.deliverables.length,
      activated_task_ids: activatedTaskIds,
      settlement_requested: settlementRequested,
    };
  }
}
