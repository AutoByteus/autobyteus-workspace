import type { RootTaskLifecycleAdapter, RootTaskActivationPreparation, PreparedRootTaskActivation } from "../../agent-collaboration/execution/task/root-task-lifecycle-adapter.js";
import type { RootTaskLifecycleEvent } from "../../agent-collaboration/execution/task/root-task-lifecycle-event.js";
import type { TaskDelegationRecordV1, TaskExecutionReference } from "../../agent-collaboration/execution/task/task-delegation-record-v1.js";
import { projectTaskAgentExecution, projectTaskTeamExecution } from "../../agent-collaboration/execution/task/task-execution-tree-projection.js";
import type { CollaborationMemberExecutionIdentity, RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { createRootExecutionPhysicalScope } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { TokenUsageMigrationReadiness } from "../../token-usage/providers/token-usage-migration-readiness.js";
import type { TaskExecutionIdentityCapabilities } from "../../agent-team-execution/task-delegation/task-execution-identity-capabilities.js";
import type { PreparedTaskExecution } from "../../agent-team-execution/domain/prepared-task-execution.js";
import type { PreparedTaskSettlement } from "../../agent-team-execution/domain/prepared-task-settlement.js";
import type { TeamRun } from "../../agent-team-execution/domain/team-run.js";
import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import { validateAgentOrgTaskDelegationRecordsV1 } from "../persistence/agent-org-task-delegation-records-v1-schema.js";
import type { AgentOrgTaskDelegationRecordsFileV1 } from "../persistence/agent-org-task-delegation-records-v1.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "../domain/agent-org-run-execution-tree.js";
import type { AgentOrgExecutionIndex } from "./agent-org-execution-index.js";
import { AgentOrgTeamExecutionDirectory } from "./agent-org-team-execution-directory.js";
import { AgentOrgRootAgentExecutionRegistry } from "./agent-org-root-agent-execution-registry.js";
import { AgentOrgRunPersistenceCoordinator } from "./agent-org-run-persistence-coordinator.js";
import { addAgentOrgTaskExecution, adoptAgentOrgPlatformBinding, settleAgentOrgTaskExecution } from "./agent-org-run-execution-tree-mutator.js";
import { findAgentOrgConfiguredSourceNode } from "./agent-org-runtime-config-projector.js";
import type { FlatTeamExecutionCallbacks } from "../../agent-team-execution/local/flat-team-execution-callbacks.js";

export type ResolvedAgentOrgRecipient =
  | Readonly<{ kind: "agent"; address: AgentTeamAddress }>
  | Readonly<{ kind: "agent_team"; address: AgentTeamAddress; coordinatorAddress: AgentTeamAddress }>;

/** Org-private task host/tree/sidecar/event adapter for RootTaskLifecycleEngine. */
export class AgentOrgTaskLifecycleAdapter implements RootTaskLifecycleAdapter<ResolvedAgentOrgRecipient> {
  readonly initialRecords;
  private readonly readiness: Pick<TokenUsageMigrationReadiness, "assertCurrentSchemaReady">;

  constructor(private readonly options: Readonly<{
    root: RootExecutionIdentity;
    initial: AgentOrgTaskDelegationRecordsFileV1;
    taskExecutionIdentity: TaskExecutionIdentityCapabilities;
    rootAgents: AgentOrgRootAgentExecutionRegistry;
    teams: AgentOrgTeamExecutionDirectory;
    callbacks: FlatTeamExecutionCallbacks;
    persistence: AgentOrgRunPersistenceCoordinator;
    getTree(): AgentOrgRunExecutionTreeSnapshot;
    getIndex(): AgentOrgExecutionIndex;
    isOpen(): boolean;
    authorize(identity: CollaborationMemberExecutionIdentity): void;
    beginTaskExecutionEventRetirement(reference: TaskExecutionReference): () => void;
    replaceState(tree: AgentOrgRunExecutionTreeSnapshot, tasks: AgentOrgTaskDelegationRecordsFileV1): void;
    publish(event: RootTaskLifecycleEvent): void;
    deliverSystemMessage(agentRunId: string, message: AgentInputUserMessage): Promise<AgentOperationResult>;
    enterLifecycleFailStop(): void;
    tokenUsageReadiness?: Pick<TokenUsageMigrationReadiness, "assertCurrentSchemaReady">;
  }>) {
    this.initialRecords = options.initial.records;
    this.readiness = options.tokenUsageReadiness ?? new TokenUsageMigrationReadiness();
  }

  isOpen(): boolean { return this.options.isOpen(); }
  authorize(identity: CollaborationMemberExecutionIdentity): void { this.options.authorize(identity); }
  assertCurrentSchemaReady(): void { this.readiness.assertCurrentSchemaReady(); }

  async prepareActivation(input: RootTaskActivationPreparation<ResolvedAgentOrgRecipient>) {
    const source = findAgentOrgConfiguredSourceNode(this.options.getTree(), input.placement.address);
    if (!source || source.kind !== input.placement.kind) throw new Error(`Configured target '${input.placement.address}' was not found with the requested kind.`);
    const host = this.options.getIndex().requireAgent(input.identity.agentRunId).host;
    let prepared: PreparedTaskExecution;
    if (input.placement.kind === "agent" && source.kind === "agent") {
      const agentRunId = await this.options.taskExecutionIdentity.agentRuns.allocateForAgentDefinition(source.agentDefinitionId);
      const command = { taskId: input.taskId, address: input.placement.address, agentRunId, sourceNode: source, message: input.workPacket };
      prepared = host.hostKind === "root"
        ? await this.options.rootAgents.prepareTask(command)
        : await this.options.teams.require(host.hostRunId).prepareTaskAgent(command);
    } else if (input.placement.kind === "agent_team" && source.kind === "agent_team") {
      const materialized = await this.options.taskExecutionIdentity.taskTeams.create({ source, taskId: input.taskId });
      const command = {
        taskId: input.taskId,
        address: input.placement.address,
        teamRunId: materialized.teamNode.teamRunId,
        handoffs: this.options.getTree().handoffs,
        teamNode: materialized.teamNode,
        message: input.workPacket,
      };
      prepared = host.hostKind === "root"
        ? await this.options.teams.prepareRootTaskTeam({
            task: command,
            physicalScope: createRootExecutionPhysicalScope({
              root: this.options.root,
              ancestorTeamRunIds: [materialized.teamNode.teamRunId],
            }),
            callbacks: this.options.callbacks,
          })
        : await this.options.teams.require(host.hostRunId).prepareTaskTeam(command);
    } else throw new Error(`Configured target '${input.placement.address}' changed kind.`);
    const reservation = prepared.binding.kind === "team"
      ? this.options.teams.reserveTaskSubtree(prepared.preparedTeamRuns)
      : null;
    prepared.sealForCommit();
    const taskExecution = prepared.binding.kind === "agent"
      ? Object.freeze({ agentRunId: prepared.binding.agentRunId })
      : Object.freeze({ teamRunId: prepared.binding.teamRunId });
    return Object.freeze({
      recipientAddress: input.placement.address,
      taskExecution,
      targetAgentRunId: prepared.binding.kind === "agent" ? prepared.binding.agentRunId : prepared.binding.coordinatorAgentRunId,
      commit: (commitInput: Parameters<PreparedRootTaskActivation["commit"]>[0]) => this.commitActivation({
        host,
        prepared,
        reservation,
        startedAt: input.startedAt,
        ...commitInput,
      }),
      abort: async () => { reservation?.cancel(); await prepared.abort(); },
    });
  }

  async commitRecordTransition(input: Parameters<RootTaskLifecycleAdapter<ResolvedAgentOrgRecipient>["commitRecordTransition"]>[0]): Promise<void> {
    const nextTasks = this.tasksEnvelope(input.nextRecords);
    await this.options.persistence.commitTaskRecords({
      nextTasks,
      commitAfterDurability: () => {
        input.commitRecords();
        this.options.replaceState(this.options.getTree(), nextTasks);
        if (input.event) this.options.publish(input.event);
      },
    });
  }

  taskAssigneeAgentRunId(task: TaskDelegationRecordV1): string {
    if ("agentRunId" in task.taskExecution) return task.taskExecution.agentRunId;
    const source = findAgentOrgConfiguredSourceNode(this.options.getTree(), task.recipientAddress);
    if (!source || source.kind !== "agent_team") throw new Error(`Configured Team '${task.recipientAddress}' was not found.`);
    const team = this.options.getIndex().requireTeam(task.taskExecution.teamRunId);
    const coordinator = this.options.getIndex().listDirectAgents({
      root: this.options.root,
      hostKind: "team",
      hostRunId: team.teamRunId,
      hostAddress: team.address,
    }).find((agent) => agent.address === source.coordinatorAddress);
    if (!coordinator) throw new Error(`Task TeamRun '${team.teamRunId}' has no exact coordinator AgentRun.`);
    return coordinator.agentRunId;
  }
  taskOwnsAgent(task: TaskDelegationRecordV1, agentRunId: string): boolean {
    if ("agentRunId" in task.taskExecution) return task.taskExecution.agentRunId === agentRunId;
    const taskTeamRunId = task.taskExecution.teamRunId;
    const agent = this.options.getIndex().getAgent(agentRunId);
    return Boolean(agent && agent.host.hostKind === "team"
      && this.options.getIndex().listTeamAncestorsDeepestFirst(agent.host.hostRunId)
        .some((team) => team.teamRunId === taskTeamRunId));
  }
  isTaskExecutionSettled(task: TaskDelegationRecordV1): boolean {
    return Boolean(this.options.getIndex().getTaskExecution(task.taskExecution)?.source.settledAt);
  }

  async settleTaskExecution(input: Parameters<RootTaskLifecycleAdapter<ResolvedAgentOrgRecipient>["settleTaskExecution"]>[0]): Promise<boolean> {
    const indexed = this.options.getIndex().getTaskExecution(input.task.taskExecution);
    if (!indexed || indexed.source.settledAt) return true;
    if (input.remainsBlockedByOpenChild()) return false;
    let prepared: PreparedTaskSettlement | null;
    if (indexed.host.hostKind === "root" && indexed.kind === "agent") {
      prepared = await this.options.rootAgents.prepareSettlement(input.task.taskId, indexed.agentRunId, indexed.address);
    } else if (indexed.host.hostKind === "root" && indexed.kind === "team") {
      prepared = await this.options.teams.prepareSettlement(input.task.taskId, indexed.teamRunId);
    } else {
      prepared = await this.options.teams.require(indexed.host.hostRunId)
        .prepareDirectTaskSettlement(input.task.taskId, input.task.taskExecution);
    }
    if (!prepared) return false;
    const refreshed = this.options.getIndex().getTaskExecution(input.task.taskExecution);
    if (!refreshed || refreshed.source.settledAt || input.remainsBlockedByOpenChild()
      || !sameBinding(input.task.taskExecution, prepared.binding)) {
      prepared.cancelBeforeDurability();
      return !refreshed || Boolean(refreshed.source.settledAt);
    }
    const runId = "agentRunId" in input.task.taskExecution ? input.task.taskExecution.agentRunId : input.task.taskExecution.teamRunId;
    let committed: ReturnType<PreparedTaskSettlement["commitAfterDurability"]> | null = null;
    let finishEventRetirement = (): void => undefined;
    await this.options.persistence.commitTreeMutation({
      prepareAgainstCurrent: () => {
        const nextTree = settleAgentOrgTaskExecution({ tree: this.options.getTree(), taskExecutionRunId: runId, settledAt: input.settledAt });
        return {
          nextTree,
          cancelBeforeDurability: () => prepared!.cancelBeforeDurability(),
          commitAfterDurability: () => {
            finishEventRetirement = this.options.beginTaskExecutionEventRetirement(input.task.taskExecution);
            committed = prepared!.commitAfterDurability();
            this.options.replaceState(nextTree, this.tasksEnvelope(input.currentRecords));
            this.options.publish(input.event);
          },
        };
      },
    });
    try {
      const result = await committed!.finishLocalTeardown();
      if (!result.accepted) throw new Error(result.message ?? `Task '${input.task.taskId}' cleanup was rejected.`);
    } catch (error) {
      this.options.enterLifecycleFailStop();
      throw error;
    } finally {
      finishEventRetirement();
    }
    return true;
  }

  enterLifecycleFailStop(): void { this.options.enterLifecycleFailStop(); }
  deliverSystemMessage(agentRunId: string, message: AgentInputUserMessage): Promise<AgentOperationResult> {
    return this.options.deliverSystemMessage(agentRunId, message);
  }

  private async commitActivation(input: {
    host: ReturnType<AgentOrgExecutionIndex["requireAgent"]>["host"];
    prepared: PreparedTaskExecution;
    reservation: ReturnType<AgentOrgTeamExecutionDirectory["reserveTaskSubtree"]> | null;
    startedAt: string;
    task: TaskDelegationRecordV1;
    nextRecords: readonly TaskDelegationRecordV1[];
    event: RootTaskLifecycleEvent;
    commitRecords(): void;
  }) {
    const execution = input.prepared.binding.kind === "agent"
      ? projectTaskAgentExecution({ address: input.prepared.binding.address, agentRunId: input.prepared.binding.agentRunId, startedAt: input.startedAt })
      : projectTaskTeamExecution({ node: requirePreparedTeamNode(input.prepared), startedAt: input.startedAt });
    const nextTasks = this.tasksEnvelope(input.nextRecords);
    let nextTreeAtCommit: AgentOrgRunExecutionTreeSnapshot | null = null;
    return this.options.persistence.commitTaskActivation({
      prepareAgainstCurrent: () => {
        let nextTree = addAgentOrgTaskExecution({ tree: this.options.getTree(), host: input.host, execution });
        for (const binding of input.prepared.stagedPlatformBindings) {
          nextTree = adoptAgentOrgPlatformBinding({ tree: nextTree, binding }).tree;
        }
        nextTreeAtCommit = nextTree;
        return { nextTree, nextTasks };
      },
      abortBeforeDurability: async () => { input.reservation?.cancel(); await input.prepared.abort(); },
      commitAfterDurability: () => {
        if (!nextTreeAtCommit) throw new Error("AgentOrg task activation tree was not prepared.");
        const committed = input.prepared.commitAfterDurability();
        input.reservation?.commit();
        input.commitRecords();
        this.options.replaceState(nextTreeAtCommit, nextTasks);
        this.options.publish(input.event);
        committed.releaseWork();
      },
    });
  }

  private tasksEnvelope(records: readonly TaskDelegationRecordV1[]): AgentOrgTaskDelegationRecordsFileV1 {
    return validateAgentOrgTaskDelegationRecordsV1({
      schemaVersion: 1,
      subjectKind: "agent_org",
      orgRunId: this.options.root.rootRunId,
      records,
    }, this.options.root.rootRunId);
  }
}

const requirePreparedTeamNode = (prepared: PreparedTaskExecution) => {
  const binding = prepared.binding;
  if (binding.kind !== "team") throw new Error("Prepared task execution is not a Team.");
  const run = prepared.preparedTeamRuns.find((candidate) => candidate.teamRunId === binding.teamRunId);
  if (!run) throw new Error(`Prepared TeamRun '${binding.teamRunId}' was not found.`);
  return run.context.teamNode;
};
const sameBinding = (
  reference: TaskDelegationRecordV1["taskExecution"],
  binding: PreparedTaskSettlement["binding"],
): boolean => binding.kind === "agent"
  ? "agentRunId" in reference && reference.agentRunId === binding.agentRunId
  : "teamRunId" in reference && reference.teamRunId === binding.teamRunId;
