import type { TeamRun } from "../domain/team-run.js";
import { getTaskAgentDirectory, type TaskAgentDirectory } from "./task-agent-directory.js";
import { TaskDelegationActivationCoordinator } from "./task-delegation-activation-coordinator.js";
import { TaskDelegationEventPublisher } from "./task-delegation-event-publisher.js";
import { TaskDelegationInputResolver } from "./task-delegation-input-resolver.js";
import { TaskDelegationLedger } from "./task-delegation-ledger.js";
import {
  isTaskDelegationTerminalStatus,
  TaskDelegationError,
  type DelegateTasksInput,
  type DelegateTasksResult,
  type AcceptTaskInput,
  type AcceptTaskResult,
  type TaskDelegationContext,
  type TaskDelegationRecord,
} from "./task-delegation-record.js";
import { TaskDelegationSettlementCoordinator } from "./task-delegation-settlement-coordinator.js";

export class TaskDelegationService {
  private readonly ledger: TaskDelegationLedger;
  private readonly taskAgentDirectory: TaskAgentDirectory;
  private readonly activationCoordinator: TaskDelegationActivationCoordinator;
  private readonly eventPublisher: TaskDelegationEventPublisher;
  private readonly inputResolver: TaskDelegationInputResolver;
  private readonly settlementCoordinator: TaskDelegationSettlementCoordinator;

  constructor(private readonly teamRun: TeamRun) {
    this.ledger = new TaskDelegationLedger(teamRun.runId);
    this.taskAgentDirectory = getTaskAgentDirectory(teamRun.runId);
    this.activationCoordinator = new TaskDelegationActivationCoordinator(
      this.ledger,
      this.taskAgentDirectory,
    );
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
        task_id: record.taskId,
        target_agent_run_id: record.targetAgentRunId,
        status: record.status,
      })),
      activationResults,
    };
  }

  async acceptTask(
    context: TaskDelegationContext,
    input: AcceptTaskInput,
  ): Promise<AcceptTaskResult> {
    this.assertTeamRunActive();
    this.inputResolver.assertContext(context);
    const taskId = input.task_id.trim();
    if (!taskId) {
      throw new TaskDelegationError("VALIDATION_ERROR", "task_id is required for accept_task.");
    }
    const existing = this.ledger.getRecord(taskId);
    if (!existing) {
      throw new TaskDelegationError("TASK_NOT_FOUND", `Delegated task '${taskId}' was not found.`);
    }
    this.assertOriginalDelegator(context, existing);
    const message = this.inputResolver.normalizeStatusMessage(input.message ?? null);
    const previousStatus = existing.status;
    const updated = this.ledger.acceptTask({ taskId, message });
    this.taskAgentDirectory.markSettledByTaskId(updated.taskId);
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
