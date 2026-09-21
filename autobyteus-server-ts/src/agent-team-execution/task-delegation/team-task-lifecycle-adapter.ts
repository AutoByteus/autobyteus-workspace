import type { PreparedRootTaskActivation, RootTaskLifecycleAdapter, RootTaskActivationPreparation } from "../../agent-collaboration/execution/task/root-task-lifecycle-adapter.js";
import type { RootTaskLifecycleEvent } from "../../agent-collaboration/execution/task/root-task-lifecycle-event.js";
import type { TaskDelegationRecordV1 } from "../../agent-collaboration/execution/task/task-delegation-record-v1.js";
import { TokenUsageMigrationReadiness } from "../../token-usage/providers/token-usage-migration-readiness.js";
import type { PreparedTaskExecution } from "../domain/prepared-task-execution.js";
import type { TeamRunExecutionTreeSnapshot } from "../domain/team-run-execution-tree.js";
import { TeamExecutionScopeResolver } from "../services/team-execution-scope-resolver.js";
import {
  addTaskExecutionToTree,
  adoptAgentPlatformBindingInTree,
  settleTaskExecutionInTree,
} from "../services/team-run-execution-tree-mutator.js";
import {
  TeamRunPersistenceFinalizationIndeterminateError,
  type TaskMutationCommitResult,
} from "../services/team-run-persistence-contract.js";
import type { ResolvedTeamRecipient } from "../services/resolved-team-recipient.js";
import { validateTaskDelegationRecordsV1Payload } from "./records/task-delegation-records-v1-schema.js";
import { taskActivatedEvent, taskReviewedEvent, taskSettledEvent, taskSubmittedEvent } from "./task-delegation-event-factory.js";
import {
  findTaskConfigNode,
  requirePreparedTaskTeamNode,
  sameTaskExecutionBinding,
} from "./task-delegation-execution-resolution.js";
import { taskAssigneeAgentRunId } from "./task-delegation-record-resolver.js";
import { taskOwnsAgent } from "./task-delegation-ownership.js";
import type { TaskDelegationServiceOptions } from "./task-delegation-service-contract.js";
import { projectTaskAgentExecution, projectTaskTeamExecution } from "./task-execution-tree-projection.js";

/** Team-private tree/index/persistence/event adapter for RootTaskLifecycleEngine. */
export class TeamTaskLifecycleAdapter implements RootTaskLifecycleAdapter<ResolvedTeamRecipient> {
  readonly initialRecords;
  private readonly tokenUsageReadiness: Pick<TokenUsageMigrationReadiness, "assertCurrentSchemaReady">;

  constructor(private readonly options: TaskDelegationServiceOptions) {
    this.initialRecords = options.initialTasks.records;
    this.tokenUsageReadiness = options.tokenUsageMigrationReadiness ?? new TokenUsageMigrationReadiness();
  }

  isOpen(): boolean { return this.options.isRootOpen(); }
  authorize(identity: Parameters<TaskDelegationServiceOptions["authorize"]>[0]): void { this.options.authorize(identity); }
  assertCurrentSchemaReady(): void { this.tokenUsageReadiness.assertCurrentSchemaReady(); }

  async prepareActivation(input: RootTaskActivationPreparation<ResolvedTeamRecipient>) {
    const currentIndex = this.options.getIndex();
    const host = new TeamExecutionScopeResolver(currentIndex).resolveTargetOwner({
      callerAgentRunId: input.identity.agentRunId,
      recipientAddress: input.placement.address,
    });
    const hostRun = await this.options.requireTeamRun(host.teamRunId);
    let prepared: PreparedTaskExecution;
    let reservation: ReturnType<TaskDelegationServiceOptions["teamRunResolver"]["reserveTaskSubtree"]> | null = null;
    if (input.placement.kind === "agent") {
      const source = findTaskConfigNode(this.options.config.rootTeam, input.placement.address);
      if (!source || source.kind !== "agent") throw new Error(`Agent '${input.placement.address}' was not found.`);
      const agentRunId = await this.options.taskExecutionIdentity.agentRuns.allocateForAgentDefinition(source.agentDefinitionId);
      prepared = await hostRun.prepareTaskAgent({
        taskId: input.taskId,
        address: input.placement.address,
        agentRunId,
        sourceNode: source,
        message: input.workPacket,
      });
    } else {
      const source = findTaskConfigNode(this.options.config.rootTeam, input.placement.address);
      if (!source || source.kind !== "agent_team") throw new Error(`AgentTeam '${input.placement.address}' was not found.`);
      const materialized = await this.options.taskExecutionIdentity.taskTeams.create({ source, taskId: input.taskId });
      prepared = await hostRun.prepareTaskTeam({
        taskId: input.taskId,
        address: input.placement.address,
        teamRunId: materialized.teamNode.teamRunId,
        handoffs: this.options.config.handoffs,
        teamNode: materialized.teamNode,
        message: input.workPacket,
      });
      reservation = this.options.teamRunResolver.reserveTaskSubtree(prepared.preparedTeamRuns);
    }
    prepared.sealForCommit();
    const execution = prepared.binding.kind === "agent"
      ? projectTaskAgentExecution({ address: prepared.binding.address, agentRunId: prepared.binding.agentRunId, startedAt: input.startedAt })
      : projectTaskTeamExecution({ node: requirePreparedTaskTeamNode(prepared, this.options.config.rootTeam), startedAt: input.startedAt });
    const taskExecution = prepared.binding.kind === "agent"
      ? Object.freeze({ agentRunId: prepared.binding.agentRunId })
      : Object.freeze({ teamRunId: prepared.binding.teamRunId });
    return Object.freeze({
      recipientAddress: input.placement.address,
      taskExecution,
      targetAgentRunId: prepared.binding.kind === "agent" ? prepared.binding.agentRunId : prepared.binding.coordinatorAgentRunId,
      commit: async (commitInput: Parameters<PreparedRootTaskActivation["commit"]>[0]) => this.commitActivation({
        input,
        hostTeamRunId: host.teamRunId,
        prepared,
        reservation,
        execution,
        ...commitInput,
      }),
      abort: async () => { reservation?.cancel(); await prepared.abort(); },
    });
  }

  async commitRecordTransition(input: Parameters<RootTaskLifecycleAdapter<ResolvedTeamRecipient>["commitRecordTransition"]>[0]): Promise<void> {
    const nextTasks = this.tasksEnvelope(input.nextRecords);
    const result = await this.options.commitTaskMutation({
      kind: "record_transition",
      nextTasks,
      cancelBeforeDurability: () => undefined,
      commitAfterDurability: () => {
        input.commitRecords();
        this.options.replaceState({ tree: this.options.getTree(), tasks: nextTasks });
        const event = input.event ? this.toTeamEvent(input.event) : null;
        if (event) this.options.publish(event);
      },
    });
    this.assertCommitted(result, `Task '${input.previous.taskId}' transition`);
  }

  taskAssigneeAgentRunId(task: TaskDelegationRecordV1): string {
    return taskAssigneeAgentRunId(task, this.options.getIndex(), this.options.config);
  }
  taskOwnsAgent(task: TaskDelegationRecordV1, agentRunId: string): boolean {
    return taskOwnsAgent(task, agentRunId, this.options.getIndex());
  }
  isTaskExecutionSettled(task: TaskDelegationRecordV1): boolean {
    return Boolean(this.options.getIndex().getTaskExecution(task.taskExecution)?.source.settledAt);
  }

  async settleTaskExecution(input: Parameters<RootTaskLifecycleAdapter<ResolvedTeamRecipient>["settleTaskExecution"]>[0]): Promise<boolean> {
    const indexed = this.options.getIndex().getTaskExecution(input.task.taskExecution);
    if (!indexed || indexed.source.settledAt) return true;
    if (input.remainsBlockedByOpenChild()) return false;
    const owner = await this.options.requireTeamRun(indexed.ownerTeamRunId);
    const prepared = await owner.prepareDirectTaskSettlement(input.task.taskId, input.task.taskExecution);
    if (!prepared) return false;
    const refreshed = this.options.getIndex().getTaskExecution(input.task.taskExecution);
    if (!refreshed || refreshed.source.settledAt
      || refreshed.ownerTeamRunId !== indexed.ownerTeamRunId
      || refreshed.address !== prepared.binding.address
      || !sameTaskExecutionBinding(input.task.taskExecution, prepared.binding)
      || input.remainsBlockedByOpenChild()) {
      prepared.cancelBeforeDurability();
      return !refreshed || Boolean(refreshed.source.settledAt);
    }
    const runId = "agentRunId" in input.task.taskExecution
      ? input.task.taskExecution.agentRunId
      : input.task.taskExecution.teamRunId;
    let nextTreeAtCommit: TeamRunExecutionTreeSnapshot | null = null;
    const result = await this.options.commitTaskSettlement({
      settlement: prepared,
      prepareAgainstCurrent: () => {
        const nextTree = settleTaskExecutionInTree({
          tree: this.options.getTree(),
          taskExecutionRunId: runId,
          settledAt: input.settledAt,
        });
        nextTreeAtCommit = nextTree;
        return {
          nextTree,
          commitTreeAndEvent: () => {
            if (!nextTreeAtCommit) throw new Error("Task settlement tree was not prepared at the lock head.");
            this.options.replaceState({ tree: nextTreeAtCommit, tasks: this.tasksEnvelope(input.currentRecords) });
            this.options.publish(this.toTeamEvent(input.event));
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
      if (!cleanup.accepted) throw new Error(cleanup.message ?? `Task '${input.task.taskId}' execution cleanup was rejected.`);
    } catch (error) {
      this.options.enterLifecycleFailStop();
      throw error;
    }
    this.options.teamRunResolver.unregisterTerminated();
    return true;
  }

  enterLifecycleFailStop(): void { this.options.enterLifecycleFailStop(); }
  deliverSystemMessage(...args: Parameters<TaskDelegationServiceOptions["deliverSystemMessage"]>) {
    return this.options.deliverSystemMessage(...args);
  }

  private async commitActivation(input: {
    input: RootTaskActivationPreparation<ResolvedTeamRecipient>;
    hostTeamRunId: string;
    prepared: PreparedTaskExecution;
    reservation: ReturnType<TaskDelegationServiceOptions["teamRunResolver"]["reserveTaskSubtree"]> | null;
    execution: import("../domain/team-run-execution-tree.js").TaskExecution;
    task: TaskDelegationRecordV1;
    nextRecords: readonly TaskDelegationRecordV1[];
    event: RootTaskLifecycleEvent;
    commitRecords(): void;
  }): Promise<Readonly<{ committed: true }> | Readonly<{ committed: false; message: string }>> {
    const nextTasks = this.tasksEnvelope(input.nextRecords);
    let nextTreeAtCommit: TeamRunExecutionTreeSnapshot | null = null;
    const result = await this.options.commitTaskMutation({
      kind: "activation",
      prepareAgainstCurrent: () => {
        const expectedHost = new TeamExecutionScopeResolver(this.options.getIndex()).resolveTargetOwner({
          callerAgentRunId: input.input.identity.agentRunId,
          recipientAddress: input.input.placement.address,
        });
        if (expectedHost.teamRunId !== input.hostTeamRunId) throw new Error("Task host changed before activation commit.");
        let nextTree = addTaskExecutionToTree({
          tree: this.options.getTree(),
          ownerTeamRunId: input.hostTeamRunId,
          execution: input.execution,
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
          const committed = input.prepared.commitAfterDurability();
          input.reservation?.commit();
          input.commitRecords();
          this.options.replaceState({ tree: nextTreeAtCommit, tasks: nextTasks });
          this.options.publish(this.toTeamEvent(input.event));
          committed.releaseWork();
        },
      },
    });
    if (result.outcome === "committed") return Object.freeze({ committed: true });
    if (result.outcome === "finalization_indeterminate") {
      throw new TeamRunPersistenceFinalizationIndeterminateError(result.file, result.stage);
    }
    return Object.freeze({ committed: false, message: result.cause.message });
  }

  private tasksEnvelope(records: readonly TaskDelegationRecordV1[]) {
    return validateTaskDelegationRecordsV1Payload({
      schemaVersion: 1,
      rootTeamRunId: this.options.rootTeamRunId,
      records,
    }, this.options.rootTeamRunId);
  }

  private toTeamEvent(event: RootTaskLifecycleEvent) {
    switch (event.kind) {
      case "activated": return taskActivatedEvent(event.task);
      case "submitted": return taskSubmittedEvent(event.task, event.submission);
      case "reviewed": return taskReviewedEvent(event.task, event.review);
      case "settled": return taskSettledEvent(event.task, event.settledAt);
    }
  }

  private assertCommitted(result: TaskMutationCommitResult, label: string): void {
    if (result.outcome === "committed") return;
    if (result.outcome === "not_committed") throw new Error(`${label} was not committed: ${result.cause.message}`);
    throw new TeamRunPersistenceFinalizationIndeterminateError(result.file, result.stage);
  }
}
