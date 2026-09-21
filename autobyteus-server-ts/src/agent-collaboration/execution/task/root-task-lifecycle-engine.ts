import { markTaskDelegationSystemTaskNotificationMetadata } from "../events/task-system-input-presentation.js";
import { randomUUID } from "node:crypto";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import type { CollaborationMemberExecutionIdentity } from "../domain/root-execution-identity.js";
import type { RootTaskLifecycleAdapter } from "./root-task-lifecycle-adapter.js";
import { RootTaskLifecycleCommandQueue } from "./root-task-lifecycle-command-queue.js";
import {
  buildTaskAssigneeWorkPacket,
  optionalTaskString,
  requireTaskString,
  validateTaskReferenceFiles,
} from "./root-task-lifecycle-input.js";
import type { RootTaskLifecycleEvent } from "./root-task-lifecycle-event.js";
import {
  RootTaskPersistenceFinalizationIndeterminateError,
  TaskDelegationError,
  type DelegateTaskInput,
  type DelegateTaskResult,
  type ReviewTaskResultInput,
  type ReviewTaskResultResult,
  type SubmitTaskResultInput,
  type SubmitTaskResultResult,
  type TaskDelegationContext,
} from "./task-lifecycle-command.js";
import { validateTaskDelegationRecordArrayV1 } from "./task-delegation-record-v1-schema.js";
import type {
  TaskDelegationRecordV1,
  TaskReview,
  TaskSubmission,
} from "./task-delegation-record-v1.js";

/** Selector-free FIFO and record-lifecycle policy shared by private Team/Org adapters. */
export class RootTaskLifecycleEngine<TPlacement> {
  private readonly queue = new RootTaskLifecycleCommandQueue();
  private records: readonly TaskDelegationRecordV1[];
  private accepting = true;
  private rootFailStopped = false;
  private settlementSweepScheduled = false;

  constructor(private readonly adapter: RootTaskLifecycleAdapter<TPlacement>) {
    this.records = validateTaskDelegationRecordArrayV1(adapter.initialRecords);
  }

  getRecords(): readonly TaskDelegationRecordV1[] { return this.records; }
  hasOpenWork(): boolean { return this.records.some((task) => task.status !== "accepted" && task.status !== "interrupted"); }
  closeExternalAdmission(): void { this.accepting = false; this.queue.closeExternalAdmission(); }
  enterRootFailStop(): void {
    this.rootFailStopped = true;
    this.accepting = false;
    this.settlementSweepScheduled = false;
    this.queue.enterRootFailStop();
  }
  drain(): Promise<void> { return this.queue.drain(); }

  async shutdownAndSettle(reason: string): Promise<void> {
    if (this.rootFailStopped) return this.drain();
    this.closeExternalAdmission();
    await this.drain();
    const ordered = this.orderTasksDeepestFirst();
    for (const task of ordered) {
      if (task.status === "active" || task.status === "awaiting_review") await this.interrupt(task.taskId, reason);
    }
    for (const task of ordered) {
      const current = this.records.find((candidate) => candidate.taskId === task.taskId);
      if (current?.status === "accepted" || current?.status === "interrupted") {
        await this.queue.submitShutdown({ kind: "settle", executeAtQueueHead: () => this.settleAtHead(current.taskId) });
      }
    }
    await this.drain();
  }

  onExecutionBecameIdle(): void { this.scheduleTerminalSettlementSweep(); }

  async delegateTask(
    context: TaskDelegationContext,
    input: DelegateTaskInput,
    placement: TPlacement,
  ): Promise<DelegateTaskResult> {
    this.assertExternal(context.identity);
    this.adapter.assertCurrentSchemaReady();
    const description = requireTaskString(input.description, "description");
    const referenceFiles = await validateTaskReferenceFiles(input.reference_files ?? []);
    const taskId = `task_${randomUUID().replace(/-/g, "")}`;
    const startedAt = new Date().toISOString();
    let prepared: Awaited<ReturnType<RootTaskLifecycleAdapter<TPlacement>["prepareActivation"]>> | null = null;
    try {
      prepared = await this.adapter.prepareActivation({
        identity: context.identity,
        placement,
        taskId,
        description,
        referenceFiles,
        startedAt,
        workPacket: buildTaskAssigneeWorkPacket({ delegator: context.identity, description, referenceFiles }),
      });
      const exact = prepared;
      return await this.queue.submit({
        kind: "activate",
        executeAtQueueHead: () => this.activateAtHead(context.identity, taskId, placement, description, referenceFiles, startedAt, exact),
      });
    } catch (error) {
      if (error instanceof RootTaskPersistenceFinalizationIndeterminateError) throw error;
      if (prepared) await prepared.abort();
      return { task_id: taskId, status: "not_started", message: taskErrorMessage(error) };
    }
  }

  async submitTaskResult(context: TaskDelegationContext, input: SubmitTaskResultInput): Promise<SubmitTaskResultResult> {
    this.assertExternal(context.identity);
    const message = requireTaskString(input.message, "message");
    const referenceFiles = await validateTaskReferenceFiles(input.reference_files ?? []);
    return this.queue.submit({ kind: "submit_result", executeAtQueueHead: () => this.submitAtHead(context.identity, message, referenceFiles) });
  }

  async reviewTaskResult(context: TaskDelegationContext, input: ReviewTaskResultInput): Promise<ReviewTaskResultResult> {
    this.assertExternal(context.identity);
    const taskId = requireTaskString(input.task_id, "task_id");
    if (input.decision !== "accept" && input.decision !== "request_revision") {
      throw new TaskDelegationError("VALIDATION_ERROR", "decision is unsupported.");
    }
    const comment = input.decision === "request_revision" ? requireTaskString(input.comment ?? "", "comment") : optionalTaskString(input.comment);
    const referenceFiles = await validateTaskReferenceFiles(input.reference_files ?? []);
    return this.queue.submit({
      kind: "review_result",
      executeAtQueueHead: () => this.reviewAtHead(context.identity, taskId, input.decision, comment, referenceFiles),
    });
  }

  interrupt(taskId: string, reason: string): Promise<void> {
    return this.queue.submitShutdown({
      kind: "interrupt",
      executeAtQueueHead: () => this.interruptAtHead(requireTaskString(taskId, "taskId"), requireTaskString(reason, "reason")),
    });
  }
  settle(taskId: string): Promise<void> {
    return this.queue.submitShutdown({
      kind: "settle",
      executeAtQueueHead: async () => { await this.settleAtHead(requireTaskString(taskId, "taskId")); },
    });
  }

  private async activateAtHead(
    identity: CollaborationMemberExecutionIdentity,
    taskId: string,
    _placement: TPlacement,
    description: string,
    referenceFiles: readonly string[],
    startedAt: string,
    prepared: Awaited<ReturnType<RootTaskLifecycleAdapter<TPlacement>["prepareActivation"]>>,
  ): Promise<DelegateTaskResult> {
    this.assertExternal(identity);
    if (this.records.some((record) => record.taskId === taskId)) throw new Error(`Task '${taskId}' already exists.`);
    const task: TaskDelegationRecordV1 = Object.freeze({
      taskId,
      delegatorAgentRunId: identity.agentRunId,
      recipientAddress: prepared.recipientAddress,
      taskExecution: prepared.taskExecution,
      description,
      referenceFiles: Object.freeze([...referenceFiles]),
      status: "active",
      updates: Object.freeze([]),
      createdAt: startedAt,
    });
    const nextRecords = validateTaskDelegationRecordArrayV1([...this.records, task]);
    const result = await prepared.commit({
      task,
      nextRecords,
      event: Object.freeze({ kind: "activated", task }),
      commitRecords: () => { this.records = nextRecords; },
    });
    if (!result.committed) return { task_id: taskId, status: "not_started", message: result.message };
    return { task_id: taskId, status: "active", target_agent_run_id: prepared.targetAgentRunId };
  }

  private async submitAtHead(
    identity: CollaborationMemberExecutionIdentity,
    message: string,
    referenceFiles: readonly string[],
  ): Promise<SubmitTaskResultResult> {
    this.adapter.authorize(identity);
    const task = this.findAssignedTask(identity.agentRunId);
    if (!task || task.status !== "active") throw new TaskDelegationError("TASK_NOT_ACTIVE", "The caller has no active assigned task.");
    const submission: TaskSubmission = Object.freeze({
      submissionId: `submission_${randomUUID().replace(/-/g, "")}`,
      message,
      referenceFiles: Object.freeze([...referenceFiles]),
      createdAt: new Date().toISOString(),
    });
    const next = Object.freeze({ ...task, status: "awaiting_review" as const, updates: Object.freeze([...task.updates, submission]) });
    await this.commitTransition(task, next, Object.freeze({ kind: "submitted", task: next, submission }));
    const warning = await this.notify(task.delegatorAgentRunId, `Task ${task.taskId} result submitted:\n${message}`);
    return { task_id: task.taskId, status: "awaiting_review", ...(warning ? { message: warning } : {}) };
  }

  private async reviewAtHead(
    identity: CollaborationMemberExecutionIdentity,
    taskId: string,
    decision: "accept" | "request_revision",
    comment: string | null,
    referenceFiles: readonly string[],
  ): Promise<ReviewTaskResultResult> {
    this.adapter.authorize(identity);
    const task = this.requireTask(taskId);
    if (task.delegatorAgentRunId !== identity.agentRunId) {
      throw new TaskDelegationError("DELEGATOR_NOT_AUTHORIZED", `AgentRun '${identity.agentRunId}' is not the delegator for '${taskId}'.`);
    }
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
    const next = Object.freeze({
      ...task,
      status: decision === "accept" ? "accepted" as const : "active" as const,
      updates: Object.freeze([...task.updates, review]),
    });
    await this.commitTransition(task, next, Object.freeze({ kind: "reviewed", task: next, review }));
    const warning = decision === "request_revision"
      ? await this.notify(this.adapter.taskAssigneeAgentRunId(next), `Task ${taskId} revision requested:\n${comment}`)
      : null;
    if (decision === "accept") this.scheduleTerminalSettlementSweep();
    return { task_id: taskId, status: next.status, ...(warning ? { message: warning } : {}) };
  }

  private async commitTransition(
    previous: TaskDelegationRecordV1,
    next: TaskDelegationRecordV1,
    event: RootTaskLifecycleEvent | null,
  ): Promise<void> {
    const nextRecords = validateTaskDelegationRecordArrayV1(
      this.records.map((record) => record.taskId === previous.taskId ? next : record),
    );
    await this.adapter.commitRecordTransition({
      previous,
      next,
      nextRecords,
      event,
      commitRecords: () => { this.records = nextRecords; },
    });
  }

  private async interruptAtHead(taskId: string, reason: string): Promise<void> {
    const task = this.requireTask(taskId);
    if (task.status === "accepted" || task.status === "interrupted") return;
    const interruption = Object.freeze({
      interruptionId: `interrupt_${randomUUID().replace(/-/g, "")}`,
      reason,
      createdAt: new Date().toISOString(),
    });
    const next = Object.freeze({
      ...task,
      status: "interrupted" as const,
      updates: Object.freeze([...task.updates, interruption]),
    });
    await this.commitTransition(task, next, null);
    this.scheduleTerminalSettlementSweep();
  }

  private async settleAtHead(taskId: string): Promise<boolean> {
    const task = this.requireTask(taskId);
    if (task.status !== "accepted" && task.status !== "interrupted") {
      throw new TaskDelegationError("TASK_NOT_SETTLEABLE", `Task '${taskId}' is not terminal.`);
    }
    if (this.adapter.isTaskExecutionSettled(task)) return true;
    if (this.hasOpenChildTask(task)) return false;
    const settledAt = new Date().toISOString();
    const settled = await this.adapter.settleTaskExecution({
      task,
      currentRecords: this.records,
      settledAt,
      remainsBlockedByOpenChild: () => this.hasOpenChildTask(task),
      event: Object.freeze({ kind: "settled", task, settledAt }),
    });
    if (settled) this.scheduleTerminalSettlementSweep();
    return settled;
  }

  private findAssignedTask(agentRunId: string): TaskDelegationRecordV1 | null {
    const matches = this.records.filter((task) =>
      this.adapter.taskAssigneeAgentRunId(task) === agentRunId
      && task.status !== "accepted"
      && task.status !== "interrupted");
    if (matches.length > 1) throw new TaskDelegationError("TASK_CONTEXT_AMBIGUOUS", `AgentRun '${agentRunId}' owns multiple open tasks.`);
    return matches[0] ?? null;
  }

  private hasOpenChildTask(task: TaskDelegationRecordV1): boolean {
    return this.records.some((candidate) => candidate.taskId !== task.taskId
      && this.adapter.taskOwnsAgent(task, candidate.delegatorAgentRunId)
      && !this.adapter.isTaskExecutionSettled(candidate));
  }

  private orderTasksDeepestFirst(): readonly TaskDelegationRecordV1[] {
    const depth = (task: TaskDelegationRecordV1, seen = new Set<string>()): number => {
      if (seen.has(task.taskId)) return 0;
      const parent = this.records.find((candidate) => candidate.taskId !== task.taskId
        && this.adapter.taskOwnsAgent(candidate, task.delegatorAgentRunId));
      return parent ? depth(parent, new Set(seen).add(task.taskId)) + 1 : 0;
    };
    return Object.freeze([...this.records].sort((left, right) => depth(right) - depth(left)));
  }

  private requireTask(taskId: string): TaskDelegationRecordV1 {
    const task = this.records.find((record) => record.taskId === taskId);
    if (!task) throw new TaskDelegationError("TASK_NOT_FOUND", `Task '${taskId}' was not found.`);
    return task;
  }

  private scheduleTerminalSettlementSweep(): void {
    if (this.rootFailStopped || this.settlementSweepScheduled) return;
    this.settlementSweepScheduled = true;
    queueMicrotask(() => {
      this.settlementSweepScheduled = false;
      if (this.rootFailStopped) return;
      for (const task of this.orderTasksDeepestFirst()) {
        if (task.status !== "accepted" && task.status !== "interrupted") continue;
        void this.settle(task.taskId).catch((error) => console.error(`Task '${task.taskId}' settlement failed:`, error));
      }
    });
  }

  private assertExternal(identity: CollaborationMemberExecutionIdentity): void {
    if (!this.accepting || !this.adapter.isOpen()) {
      throw new TaskDelegationError("ROOT_RUN_NOT_ACTIVE", "The collaboration root is not accepting task commands.");
    }
    this.adapter.authorize(identity);
  }

  private async notify(agentRunId: string, content: string): Promise<string | null> {
    const result = await this.adapter.deliverSystemMessage(agentRunId, new AgentInputUserMessage(content, SenderType.SYSTEM, null, markTaskDelegationSystemTaskNotificationMetadata({})));
    return result.accepted ? null : `Task transition committed, but notification failed: ${result.message ?? result.code ?? "unknown error"}`;
  }
}

const taskErrorMessage = (error: unknown): string => error instanceof Error ? error.message : String(error);
