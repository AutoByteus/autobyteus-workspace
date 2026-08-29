import { randomUUID } from "node:crypto";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import type { AgentRunIdentityAllocator } from "../../agent-execution/services/agent-run-identity-allocator.js";
import { TokenUsageMigrationReadiness } from "../../token-usage/providers/token-usage-migration-readiness.js";
import type { TeamMemberExecutionIdentity } from "../domain/team-member-execution-identity.js";
import type { TeamRunExecutionTreeSnapshot } from "../domain/team-run-execution-tree.js";
import { TeamRunEventSourceType, type TeamRunEvent } from "../domain/team-run-event.js";
import type { ResolvedTeamRecipient } from "../services/resolved-team-recipient.js";
import { TeamExecutionScopeResolver } from "../services/team-execution-scope-resolver.js";
import {
  addTaskExecutionToTree,
  adoptAgentPlatformBindingInTree,
  settleTaskExecutionInTree,
} from "../services/team-run-execution-tree-mutator.js";
import {
  TeamRunPersistenceFinalizationIndeterminateError,
  type PreparedTaskMutationCommit,
  type TaskMutationCommitResult,
} from "../services/team-run-persistence-contract.js";
import { validateTaskDelegationRecordsV1Payload } from "./records/task-delegation-records-v1-schema.js";
import { TaskDelegationCommandQueue } from "./task-delegation-command-queue.js";
import {
  taskActivatedEvent,
  taskReviewedEvent,
  taskSettledEvent,
  taskSubmittedEvent,
} from "./task-delegation-event-factory.js";
import {
  findTaskConfigNode,
  requirePreparedTaskTeamNode,
  sameTaskExecutionBinding,
  taskErrorMessage,
} from "./task-delegation-execution-resolution.js";
import {
  buildTaskAssigneeWorkPacket,
  optionalTaskString,
  requireTaskString,
  validateTaskReferenceFiles,
} from "./task-delegation-input.js";
import { hasOpenChildTask, orderTasksDeepestFirst } from "./task-delegation-ownership.js";
import {
  TaskDelegationError,
  type DelegateTaskInput,
  type DelegateTaskResult,
  type ReviewTaskResultInput,
  type ReviewTaskResultResult,
  type SubmitTaskResultInput,
  type SubmitTaskResultResult,
  type TaskDelegationContext,
} from "./task-delegation-record.js";
import type {
  TaskDelegationRecordV1,
  TaskDelegationRecordsSnapshot,
  TaskExecutionReference,
  TaskReview,
  TaskSubmission,
} from "./task-delegation-record-v1.js";
import {
  findAssignedTask,
  requireTask,
  taskAssigneeAgentRunId,
} from "./task-delegation-record-resolver.js";
import type {
  TaskDelegationActivationInput,
  TaskDelegationServiceOptions,
} from "./task-delegation-service-contract.js";
import { projectTaskAgentExecution, projectTaskTeamExecution } from "./task-execution-tree-projection.js";
import type { TaskTeamRunIdentityFactory } from "./task-team-run-identity-factory.js";

/** One root-scoped task lifecycle owner and sole task command FIFO. */
export class TaskDelegationService {
  private readonly queue = new TaskDelegationCommandQueue();
  private currentTasks: TaskDelegationRecordsSnapshot;
  private accepting = true;
  private rootFailStopped = false;
  private settlementSweepScheduled = false;
  private readonly agentIds: Pick<AgentRunIdentityAllocator, "allocateForAgentDefinition">;
  private readonly taskTeams: Pick<TaskTeamRunIdentityFactory, "create">;
  private readonly tokenUsageReadiness: Pick<TokenUsageMigrationReadiness, "assertCurrentSchemaReady">;

  constructor(private readonly options: TaskDelegationServiceOptions) {
    this.currentTasks = validateTaskDelegationRecordsV1Payload(options.initialTasks, options.rootTeamRunId);
    if (!options?.taskExecutionIdentity ||
        typeof options.taskExecutionIdentity.agentRuns?.allocateForAgentDefinition !== "function" ||
        typeof options.taskExecutionIdentity.taskTeams?.create !== "function") {
      throw new Error("Task execution identity capabilities are required.");
    }
    this.agentIds = options.taskExecutionIdentity.agentRuns;
    this.taskTeams = options.taskExecutionIdentity.taskTeams;
    this.tokenUsageReadiness = options.tokenUsageMigrationReadiness ?? new TokenUsageMigrationReadiness();
  }

  getSnapshot(): TaskDelegationRecordsSnapshot { return this.currentTasks; }
  hasOpenWork(): boolean { return this.currentTasks.records.some((record) => record.status !== "accepted" && record.status !== "interrupted"); }
  closeExternalAdmission(): void { this.accepting = false; this.queue.closeExternalAdmission(); }
  enterRootFailStop(): void {
    this.rootFailStopped = true; this.accepting = false;
    this.settlementSweepScheduled = false; this.queue.enterRootFailStop();
  }
  drain(): Promise<void> { return this.queue.drain(); }

  async shutdownAndSettle(reason: string): Promise<void> {
    if (this.rootFailStopped) return this.drain();
    this.closeExternalAdmission();
    await this.drain();
    const ordered = orderTasksDeepestFirst(this.currentTasks.records, this.options.getIndex());
    for (const task of ordered) {
      if (task.status === "active" || task.status === "awaiting_review") {
        await this.interrupt(task.taskId, reason);
      }
    }
    for (const task of ordered) {
      const current = this.currentTasks.records.find((candidate) => candidate.taskId === task.taskId);
      if (current?.status === "accepted" || current?.status === "interrupted") {
        await this.queue.submitShutdown({
          kind: "settle",
          executeAtQueueHead: () => this.settleAtHead(current.taskId),
        });
      }
    }
    await this.drain();
  }

  onRootEvent(event: TeamRunEvent): void {
    if (this.rootFailStopped || event.eventSourceType !== TeamRunEventSourceType.AGENT ||
        event.payload.eventType !== "AGENT_STATUS" ||
        (event.payload.details.status !== "idle" && event.payload.details.status !== "offline")) {
      return;
    }
    this.scheduleTerminalSettlementSweep();
  }

  async delegateTask(context: TaskDelegationContext, input: DelegateTaskInput, placement: ResolvedTeamRecipient): Promise<DelegateTaskResult> {
    this.assertExternal(context.identity);
    this.tokenUsageReadiness.assertCurrentSchemaReady();
    const description = requireTaskString(input.description, "description");
    const referenceFiles = await validateTaskReferenceFiles(input.reference_files ?? []);
    const taskId = `task_${randomUUID().replace(/-/g, "")}`;
    const startedAt = new Date().toISOString();
    let prepared: import("../domain/prepared-task-execution.js").PreparedTaskExecution | null = null;
    let reservation: import("../services/team-run-resolver.js").TeamRunRegistrationReservation | null = null;
    try {
      const currentIndex = this.options.getIndex();
      const host = new TeamExecutionScopeResolver(currentIndex).resolveTargetOwner({
        callerAgentRunId: context.identity.agentRunId,
        recipientAddress: placement.address,
      });
      const hostRun = await this.options.requireTeamRun(host.teamRunId);
      if (placement.kind === "agent") {
        const source = findTaskConfigNode(this.options.config.rootTeam, placement.address);
        if (!source || source.kind !== "agent") throw new TaskDelegationError("TARGET_MEMBER_NOT_FOUND", `Agent '${placement.address}' was not found.`);
        const agentRunId = await this.agentIds.allocateForAgentDefinition(source.agentDefinitionId);
        prepared = await hostRun.prepareTaskAgent({
          taskId,
          address: placement.address,
          agentRunId,
          sourceNode: source,
          message: buildTaskAssigneeWorkPacket({ delegator: context.identity, description, referenceFiles }),
        });
      } else {
        const source = findTaskConfigNode(this.options.config.rootTeam, placement.address);
        if (!source || source.kind !== "agent_team") throw new TaskDelegationError("TARGET_MEMBER_NOT_FOUND", `AgentTeam '${placement.address}' was not found.`);
        const materialized = await this.taskTeams.create({ source, taskId });
        prepared = await hostRun.prepareTaskTeam({
          taskId,
          address: placement.address,
          teamRunId: materialized.teamNode.teamRunId,
          handoffs: this.options.config.handoffs,
          teamNode: materialized.teamNode,
          message: buildTaskAssigneeWorkPacket({ delegator: context.identity, description, referenceFiles }),
        });
        reservation = this.options.teamRunResolver.reserveTaskSubtree(prepared.preparedTeamRuns);
      }
      prepared.sealForCommit();
      const exactPrepared = prepared;
      const exactReservation = reservation;
      return await this.queue.submit({
        kind: "activate",
        executeAtQueueHead: async () => this.activateAtHead({
          context,
          placement,
          taskId,
          description,
          referenceFiles,
          startedAt,
          hostTeamRunId: host.teamRunId,
          prepared: exactPrepared,
          reservation: exactReservation,
        }),
      });
    } catch (error) {
      if (error instanceof TeamRunPersistenceFinalizationIndeterminateError) throw error;
      reservation?.cancel();
      if (prepared) await prepared.abort();
      return { task_id: taskId, status: "not_started", message: taskErrorMessage(error) };
    }
  }

  async submitTaskResult(context: TaskDelegationContext, input: SubmitTaskResultInput): Promise<SubmitTaskResultResult> {
    this.assertExternal(context.identity);
    const message = requireTaskString(input.message, "message");
    const referenceFiles = await validateTaskReferenceFiles(input.reference_files ?? []);
    return this.queue.submit({
      kind: "submit_result",
      executeAtQueueHead: async () => this.submitAtHead(context.identity, message, referenceFiles),
    });
  }

  async reviewTaskResult(context: TaskDelegationContext, input: ReviewTaskResultInput): Promise<ReviewTaskResultResult> {
    this.assertExternal(context.identity);
    const taskId = requireTaskString(input.task_id, "task_id");
    if (input.decision !== "accept" && input.decision !== "request_revision") throw new TaskDelegationError("VALIDATION_ERROR", "decision is unsupported.");
    const comment = input.decision === "request_revision"
      ? requireTaskString(input.comment ?? "", "comment")
      : optionalTaskString(input.comment);
    const referenceFiles = await validateTaskReferenceFiles(input.reference_files ?? []);
    return this.queue.submit({
      kind: "review_result",
      executeAtQueueHead: async () => this.reviewAtHead(context.identity, taskId, input.decision, comment, referenceFiles),
    });
  }

  interrupt(taskId: string, reason: string): Promise<void> {
    return this.queue.submitShutdown({
      kind: "interrupt",
      executeAtQueueHead: async () => {
        await this.interruptAtHead(
          requireTaskString(taskId, "taskId"),
          requireTaskString(reason, "reason"),
        );
      },
    });
  }

  settle(taskId: string): Promise<void> {
    return this.queue.submitShutdown({
      kind: "settle",
      executeAtQueueHead: async () => { await this.settleAtHead(requireTaskString(taskId, "taskId")); },
    });
  }

  private async activateAtHead(input: TaskDelegationActivationInput): Promise<DelegateTaskResult> {
    try {
      this.assertExternal(input.context.identity);
      if (this.currentTasks.records.some((record) => record.taskId === input.taskId)) throw new Error(`Task '${input.taskId}' already exists.`);
      const execution = input.prepared.binding.kind === "agent"
        ? projectTaskAgentExecution({ address: input.prepared.binding.address, agentRunId: input.prepared.binding.agentRunId, startedAt: input.startedAt })
        : projectTaskTeamExecution({ node: requirePreparedTaskTeamNode(input.prepared, this.options.config.rootTeam), startedAt: input.startedAt });
      const taskExecution: TaskExecutionReference = input.prepared.binding.kind === "agent"
        ? Object.freeze({ agentRunId: input.prepared.binding.agentRunId })
        : Object.freeze({ teamRunId: input.prepared.binding.teamRunId });
      const record: TaskDelegationRecordV1 = Object.freeze({
        taskId: input.taskId,
        delegatorAgentRunId: input.context.identity.agentRunId,
        recipientAddress: input.placement.address,
        taskExecution,
        description: input.description,
        referenceFiles: Object.freeze([...input.referenceFiles]),
        status: "active",
        updates: Object.freeze([]),
        createdAt: input.startedAt,
      });
      const nextTasks = validateTaskDelegationRecordsV1Payload({
        ...this.currentTasks,
        records: [...this.currentTasks.records, record],
      }, this.options.rootTeamRunId);
      let committedExecution: import("../domain/prepared-task-execution.js").CommittedTaskExecution | null = null;
      let nextTreeAtCommit: TeamRunExecutionTreeSnapshot | null = null;
      const command: PreparedTaskMutationCommit = {
        kind: "activation",
        prepareAgainstCurrent: () => {
          const expectedHost = new TeamExecutionScopeResolver(this.options.getIndex()).resolveTargetOwner({
            callerAgentRunId: input.context.identity.agentRunId,
            recipientAddress: input.placement.address,
          });
          if (expectedHost.teamRunId !== input.hostTeamRunId) throw new Error("Task host changed before activation commit.");
          let nextTree = addTaskExecutionToTree({
            tree: this.options.getTree(),
            ownerTeamRunId: input.hostTeamRunId,
            execution,
          });
          for (const binding of input.prepared.stagedPlatformBindings) {
            nextTree = adoptAgentPlatformBindingInTree({ tree: nextTree, binding }).tree;
          }
          nextTreeAtCommit = nextTree;
          return { nextTree, nextTasks };
        },
        activation: {
          assertCommitReady: () => {
            if (!this.options.isRootOpen()) throw new Error("Root TeamRun is not open.");
            if (input.prepared.binding.kind === "team" && !input.reservation) throw new Error("Task TeamRun registration is not reserved.");
          },
          abortBeforeCommit: async () => { input.reservation?.cancel(); await input.prepared.abort(); },
          commitAfterDurability: () => {
            if (!nextTreeAtCommit) throw new Error("Task activation tree was not prepared at the lock head.");
            try {
              committedExecution = input.prepared.commitAfterDurability();
            } catch (error) {
              this.options.enterLifecycleFailStop();
              throw error;
            }
            input.reservation?.commit();
            this.currentTasks = nextTasks;
            this.options.replaceState({ tree: nextTreeAtCommit, tasks: nextTasks });
            this.options.publish(taskActivatedEvent(record));
            committedExecution.releaseWork();
          },
        },
      };
      const result = await this.options.commitTaskMutation(command);
      if (result.outcome !== "committed") {
        if (result.outcome === "finalization_indeterminate") {
          throw new TeamRunPersistenceFinalizationIndeterminateError(result.file, result.stage);
        }
        return { task_id: input.taskId, status: "not_started", message: result.cause.message };
      }
      return {
        task_id: input.taskId,
        status: "active",
        target_agent_run_id: input.prepared.binding.kind === "agent"
          ? input.prepared.binding.agentRunId
          : input.prepared.binding.coordinatorAgentRunId,
      };
    } catch (error) {
      if (error instanceof TeamRunPersistenceFinalizationIndeterminateError) throw error;
      input.reservation?.cancel();
      await input.prepared.abort();
      return { task_id: input.taskId, status: "not_started", message: taskErrorMessage(error) };
    }
  }

  private async submitAtHead(identity: TeamMemberExecutionIdentity, message: string, referenceFiles: readonly string[]): Promise<SubmitTaskResultResult> {
    this.options.authorize(identity);
    const task = findAssignedTask(
      this.currentTasks.records,
      this.options.getIndex(),
      this.options.config,
      identity.agentRunId,
    );
    if (!task || task.status !== "active") throw new TaskDelegationError("TASK_NOT_ACTIVE", "The caller has no active assigned task.");
    const submission: TaskSubmission = Object.freeze({
      submissionId: `submission_${randomUUID().replace(/-/g, "")}`,
      message,
      referenceFiles: Object.freeze([...referenceFiles]),
      createdAt: new Date().toISOString(),
    });
    const next = Object.freeze({ ...task, status: "awaiting_review" as const, updates: Object.freeze([...task.updates, submission]) });
    await this.commitRecordTransition(task, next, taskSubmittedEvent(next, submission));
    const warning = await this.notify(task.delegatorAgentRunId, `Task ${task.taskId} result submitted:\n${message}`);
    return { task_id: task.taskId, status: "awaiting_review", ...(warning ? { message: warning } : {}) };
  }

  private async reviewAtHead(
    identity: TeamMemberExecutionIdentity,
    taskId: string,
    decision: "accept" | "request_revision",
    comment: string | null,
    referenceFiles: readonly string[],
  ): Promise<ReviewTaskResultResult> {
    this.options.authorize(identity);
    const task = requireTask(this.currentTasks.records, taskId);
    if (task.delegatorAgentRunId !== identity.agentRunId) throw new TaskDelegationError("DELEGATOR_NOT_AUTHORIZED", `AgentRun '${identity.agentRunId}' is not the delegator for '${taskId}'.`);
    if (task.status !== "awaiting_review") throw new TaskDelegationError("TASK_NOT_AWAITING_REVIEW", `Task '${taskId}' is not awaiting review.`);
    const submission = [...task.updates].reverse().find((update): update is TaskSubmission => "submissionId" in update);
    if (!submission) throw new Error(`Task '${taskId}' has no submission.`);
    const review: TaskReview = Object.freeze({
      reviewId: `review_${randomUUID().replace(/-/g, "")}`,
      reviewedSubmissionId: submission.submissionId,
      decision,
      comment,
      referenceFiles: Object.freeze([...referenceFiles]),
      createdAt: new Date().toISOString(),
    });
    const status = decision === "accept" ? "accepted" as const : "active" as const;
    const next = Object.freeze({ ...task, status, updates: Object.freeze([...task.updates, review]) });
    await this.commitRecordTransition(task, next, taskReviewedEvent(next, review));
    const targetAgentRunId = taskAssigneeAgentRunId(next, this.options.getIndex(), this.options.config);
    const warning = decision === "request_revision"
      ? await this.notify(targetAgentRunId, `Task ${taskId} revision requested:\n${comment}`)
      : null;
    if (decision === "accept") this.scheduleTerminalSettlementSweep();
    return decision === "accept"
      ? { task_id: taskId, status: "accepted", ...(warning ? { message: warning } : {}) }
      : { task_id: taskId, status: "active", ...(warning ? { message: warning } : {}) };
  }

  private async commitRecordTransition(previous: TaskDelegationRecordV1, next: TaskDelegationRecordV1, event: TeamRunEvent | null): Promise<void> {
    const nextTasks = validateTaskDelegationRecordsV1Payload({
      ...this.currentTasks,
      records: this.currentTasks.records.map((record) => record.taskId === previous.taskId ? next : record),
    }, this.options.rootTeamRunId);
    const result = await this.options.commitTaskMutation({
      kind: "record_transition",
      nextTasks,
      cancelBeforeDurability: () => undefined,
      commitAfterDurability: () => {
        this.currentTasks = nextTasks;
        this.options.replaceState({ tree: this.options.getTree(), tasks: nextTasks });
        if (event) this.options.publish(event);
      },
    });
    assertCommitted(result, `Task '${previous.taskId}' transition`);
  }

  private async interruptAtHead(taskId: string, reason: string): Promise<void> {
    const task = requireTask(this.currentTasks.records, taskId);
    if (task.status === "accepted" || task.status === "interrupted") return;
    const now = new Date().toISOString();
    const interruption = Object.freeze({ interruptionId: `interrupt_${randomUUID().replace(/-/g, "")}`, reason, createdAt: now });
    const next = Object.freeze({ ...task, status: "interrupted" as const, updates: Object.freeze([...task.updates, interruption]) });
    await this.commitRecordTransition(task, next, null);
    this.scheduleTerminalSettlementSweep();
  }

  private async settleAtHead(taskId: string): Promise<boolean> {
    const task = requireTask(this.currentTasks.records, taskId);
    if (task.status !== "accepted" && task.status !== "interrupted") throw new TaskDelegationError("TASK_NOT_SETTLEABLE", `Task '${taskId}' is not terminal.`);
    const indexed = this.options.getIndex().getTaskExecution(task.taskExecution);
    if (!indexed || indexed.source.settledAt) return true;
    if (hasOpenChildTask(this.currentTasks.records, task, this.options.getIndex())) return false;
    const owner = await this.options.requireTeamRun(indexed.ownerTeamRunId);
    const prepared = await owner.prepareDirectTaskSettlement(task.taskId, task.taskExecution);
    if (!prepared) return false;
    const refreshed = this.options.getIndex().getTaskExecution(task.taskExecution);
    if (!refreshed || refreshed.source.settledAt ||
        refreshed.ownerTeamRunId !== indexed.ownerTeamRunId ||
        refreshed.address !== prepared.binding.address ||
        !sameTaskExecutionBinding(task.taskExecution, prepared.binding) ||
        hasOpenChildTask(this.currentTasks.records, task, this.options.getIndex())) {
      prepared.cancelBeforeDurability();
      return !refreshed || Boolean(refreshed.source.settledAt);
    }
    const settledAt = new Date().toISOString();
    const runId = "agentRunId" in task.taskExecution ? task.taskExecution.agentRunId : task.taskExecution.teamRunId;
    let nextTreeAtCommit: TeamRunExecutionTreeSnapshot | null = null;
    const result = await this.options.commitTaskSettlement({
      settlement: prepared,
      prepareAgainstCurrent: () => {
        const nextTree = settleTaskExecutionInTree({
          tree: this.options.getTree(),
          taskExecutionRunId: runId,
          settledAt,
        });
        nextTreeAtCommit = nextTree;
        return {
          nextTree,
          commitTreeAndEvent: () => {
            if (!nextTreeAtCommit) throw new Error("Task settlement tree was not prepared at the lock head.");
            this.options.replaceState({ tree: nextTreeAtCommit, tasks: this.currentTasks });
            this.options.publish(taskSettledEvent(task, settledAt));
          },
        };
      },
    });
    if (result.outcome === "not_committed") return false;
    if (result.outcome === "finalization_indeterminate") {
      throw new TeamRunPersistenceFinalizationIndeterminateError(result.file, result.stage);
    }
    try {
      const cleanup = await result.settlement.finishLocalTeardown();
      if (!cleanup.accepted) {
        throw new TaskDelegationError(
          "TASK_EXECUTION_SETTLEMENT_FAILED",
          cleanup.message ?? `Task '${task.taskId}' execution cleanup was rejected.`,
        );
      }
    } catch (error) {
      this.options.enterLifecycleFailStop();
      if (error instanceof TaskDelegationError) throw error;
      throw new TaskDelegationError(
        "TASK_EXECUTION_SETTLEMENT_FAILED",
        `Task '${task.taskId}' execution cleanup failed: ${taskErrorMessage(error)}`,
      );
    }
    this.options.teamRunResolver.unregisterTerminated();
    this.scheduleTerminalSettlementSweep();
    return true;
  }

  private scheduleTerminalSettlementSweep(): void {
    if (this.rootFailStopped || this.settlementSweepScheduled) return;
    this.settlementSweepScheduled = true;
    queueMicrotask(() => {
      this.settlementSweepScheduled = false;
      if (this.rootFailStopped) return;
      for (const task of this.currentTasks.records) {
        if (task.status !== "accepted" && task.status !== "interrupted") continue;
        void this.settle(task.taskId).catch((error) => {
          console.error(`Task '${task.taskId}' settlement failed:`, error);
        });
      }
    });
  }

  private assertExternal(identity: TeamMemberExecutionIdentity): void {
    if (!this.accepting || !this.options.isRootOpen()) throw new TaskDelegationError("TEAM_RUN_NOT_ACTIVE", `Root TeamRun '${this.options.rootTeamRunId}' is not accepting task commands.`);
    this.options.authorize(identity);
  }

  private async notify(agentRunId: string, content: string): Promise<string | null> {
    const result = await this.options.deliverSystemMessage(agentRunId, new AgentInputUserMessage(content, SenderType.SYSTEM));
    return result.accepted ? null : `Task transition committed, but notification failed: ${result.message ?? result.code ?? "unknown error"}`;
  }
}

const assertCommitted = (result: TaskMutationCommitResult, label: string): void => {
  if (result.outcome === "committed") return;
  if (result.outcome === "not_committed") throw new TaskDelegationError("TASK_HISTORY_COMMIT_FAILED", `${label} was not committed: ${result.cause.message}`);
  throw new TeamRunPersistenceFinalizationIndeterminateError(result.file, result.stage);
};
