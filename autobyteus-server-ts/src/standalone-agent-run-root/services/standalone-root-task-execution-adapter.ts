import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { CommittedTaskExecution, TaskExecutionPreparationOperation } from "../../agent-team-execution/domain/prepared-task-execution.js";
import { taskExecutionReferenceKey } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import { beginRootTaskActivation, type RegisteredTaskActivation, type TaskExecutionActivationPlan, type TaskExecutionActivationOperation,
  type RootTaskExecutionAdapter,
  type TaskExecutionActivationCommitResult,
  type TaskExecutionActivationPreparation,
} from "../../agent-collaboration/execution/task/root-task-execution-adapter.js";
import type { DelegationPlacement } from "../../agent-collaboration/collaborators/catalog-delegation.js";
import { resolveTaskCopyHost } from "../../agent-collaboration/execution/task/task-copy-host.js";
import type { TaskExecutionSource } from "../../run-history/domain/run-execution-tree-shared-records.js";
import {
  TaskDelegationError,
  TaskExecutionTeardownIndeterminateError,
} from "../../agent-collaboration/execution/task/task-delegation-command.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import { foldTeamAggregateStatus, type AgentExecutionStatus } from "@autobyteus/collaboration-stream-contracts";
import { projectTaskAgentExecution, projectTaskTeamExecution } from "../../agent-collaboration/execution/task/task-execution-tree-projection.js";
import { restoreTaskTeamNode } from "../../agent-collaboration/execution/task/task-team-node-restoration.js";
import {
  createCollaborationMemberExecutionIdentity,
  createRootExecutionPhysicalScope,
  type CollaborationMemberExecutionIdentity,
  type RootExecutionIdentity,
  createTaskExecutionHostIdentity,
  type TaskExecutionHostIdentity,
} from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { RootedAgentMemoryLocator } from "../../agent-collaboration/execution/services/rooted-agent-memory-locator.js";
import type { RootAgentExecutionRegistry } from "../../agent-collaboration/execution/backends/root-agent-execution-registry.js";
import type { RootTeamExecutionDirectory } from "../../agent-collaboration/execution/backends/root-team-execution-directory.js";
import {
  getAgentConversationActivityInspector,
  type AgentConversationActivityInspector,
} from "../../agent-memory/services/agent-conversation-activity-inspector.js";
import { TokenUsageMigrationReadiness } from "../../token-usage/providers/token-usage-migration-readiness.js";
import type { TaskExecutionIdentityCapabilities } from "../../agent-team-execution/task-delegation/task-execution-identity-capabilities.js";
import type { PreparedTaskExecution } from "../../agent-team-execution/domain/prepared-task-execution.js";
import type { FlatTeamExecutionCallbacks } from "../../agent-team-execution/local/flat-team-execution-callbacks.js";
import type { StandaloneRootTreeSnapshot } from "../domain/standalone-root-tree.js";
import type {
  StandaloneRootExecutionIndex,
  StandaloneRootIndexedTaskExecution,
} from "./standalone-root-execution-index.js";
import type { StandaloneRootPersistenceCoordinator } from "./standalone-root-persistence-coordinator.js";
import { StandaloneRootTaskSourceResolver } from "./standalone-root-task-source-resolver.js";
import { addStandaloneRootTaskExecution, adoptStandaloneRootPlatformBinding } from "./standalone-root-tree-mutator.js";

/** A delegation target in an Agent root: always a collaborator of the run. */
export type StandaloneRootPlacement = DelegationPlacement;

const referenceOf = (execution: StandaloneRootIndexedTaskExecution): TaskExecutionReference =>
  execution.kind === "agent" ? Object.freeze({ agentRunId: execution.agentRunId }) : Object.freeze({ teamRunId: execution.teamRunId });
const runIdOf = (execution: StandaloneRootIndexedTaskExecution): string =>
  execution.kind === "agent" ? execution.agentRunId : execution.teamRunId;

export type StandaloneRootTaskExecutionAdapterOptions = Readonly<{
  root: RootExecutionIdentity;
  taskExecutionIdentity: TaskExecutionIdentityCapabilities;
  rootAgents: RootAgentExecutionRegistry;
  teams: RootTeamExecutionDirectory;
  callbacks: FlatTeamExecutionCallbacks;
  persistence: StandaloneRootPersistenceCoordinator;
  getTree(): StandaloneRootTreeSnapshot;
  getIndex(): StandaloneRootExecutionIndex;
  isOpen(): boolean;
  authorize(identity: CollaborationMemberExecutionIdentity): void;
  replaceTree(tree: StandaloneRootTreeSnapshot): void;
  publishTaskExecutionStarted(host: TaskExecutionHostIdentity, taskExecution: TaskExecutionReference): void;
  publishTaskExecutionsClosed(taskExecutions: readonly TaskExecutionReference[]): void;
  publishTaskExecutionsReopened(taskExecutions: readonly TaskExecutionReference[]): void;
  publishAgentOffline(identity: CollaborationMemberExecutionIdentity): void;
  enterLifecycleFailStop(): void;
  memoryLocator?: RootedAgentMemoryLocator;
  activityInspector?: AgentConversationActivityInspector;
  tokenUsageReadiness?: Pick<TokenUsageMigrationReadiness, "assertCurrentSchemaReady">;
}>;

/**
 * Agent-root host / tree / registry / persistence adapter for RootTaskExecutionLifecycle.
 * A task execution is an extra copy of a collaborator, hosted by the delegator's host: the
 * root for a root-level Agent, else the delegator's Team (a collaborator Team or a task Team).
 */
export class StandaloneRootTaskExecutionAdapter implements RootTaskExecutionAdapter<StandaloneRootPlacement> {
  private readonly plans = new WeakMap<TaskExecutionActivationPlan<StandaloneRootPlacement>, { host: TaskExecutionHostIdentity; beginLocal(): TaskExecutionPreparationOperation }>();
  private readonly registrations = new Map<string, RegisteredTaskActivation>();
  get root(): RootExecutionIdentity { return this.options.root; }
  private readonly readiness: Pick<TokenUsageMigrationReadiness, "assertCurrentSchemaReady">;
  private readonly memoryLocator: RootedAgentMemoryLocator;
  private readonly sources: StandaloneRootTaskSourceResolver;

  constructor(private readonly options: StandaloneRootTaskExecutionAdapterOptions) {
    this.readiness = options.tokenUsageReadiness ?? new TokenUsageMigrationReadiness();
    this.memoryLocator = options.memoryLocator ?? new RootedAgentMemoryLocator();
    this.sources = new StandaloneRootTaskSourceResolver(() => options.getIndex());
  }

  isOpen(): boolean { return this.options.isOpen(); }
  authorize(identity: CollaborationMemberExecutionIdentity): void { this.options.authorize(identity); }
  assertCurrentSchemaReady(): void { this.readiness.assertCurrentSchemaReady(); }

  async planActivation(input: TaskExecutionActivationPreparation<StandaloneRootPlacement>): Promise<TaskExecutionActivationPlan<StandaloneRootPlacement>> {
    // The copy is placed by its address (shared owner), not under the delegator's host.
    const copyHost = resolveTaskCopyHost(this.options.getIndex(), input.identity.agentRunId, input.placement.address);
    const host = createTaskExecutionHostIdentity(copyHost.hostKind === "team"
      ? { root: this.root, hostKind: "team", hostRunId: copyHost.hostRunId, hostAddress: copyHost.hostAddress }
      : { root: this.root, hostKind: "root", hostRunId: this.root.rootRunId, hostAddress: "/" });
    let beginLocal: () => TaskExecutionPreparationOperation;
    let execution: TaskExecutionReference;
    let ingressAgentRunId: string;
    let ownedAgentRunIds: readonly string[];
    if (input.placement.kind === "agent") {
      const source = this.sources.require(input.placement.address, "agent", input.placement.source).node;
      const agentRunId = await this.options.taskExecutionIdentity.agentRuns.allocateForAgentDefinition(source.agentDefinitionId);
      const command = { address: input.placement.address, agentRunId, sourceNode: source, message: input.workPacket };
      execution = { agentRunId }; ingressAgentRunId = agentRunId; ownedAgentRunIds = [agentRunId];
      beginLocal = () => host.hostKind === "root" ? this.options.rootAgents.beginTaskPreparation(command)
        : this.options.teams.require(host.hostRunId).beginTaskAgent(command);
    } else {
      const source = this.sources.require(input.placement.address, "agent_team", input.placement.source);
      const materialized = await this.options.taskExecutionIdentity.taskTeams.create({ source: source.node });
      const command = { address: input.placement.address, teamRunId: materialized.teamNode.teamRunId,
        handoffs: source.handoffs, teamNode: materialized.teamNode, message: input.workPacket };
      const coordinator = command.teamNode.children.find((node) => node.kind === "agent" && node.address === command.teamNode.coordinatorAddress);
      if (!coordinator || coordinator.kind !== "agent") throw new Error("Planned Team has no exact coordinator ingress.");
      execution = { teamRunId: command.teamRunId }; ingressAgentRunId = coordinator.agentRunId; ownedAgentRunIds = command.teamNode.children.flatMap(node => node.kind === "agent" ? [node.agentRunId] : []);
      beginLocal = () => host.hostKind === "root" ? this.options.teams.beginRootTaskTeam({
        task: command, physicalScope: createRootExecutionPhysicalScope({ root: this.root, ancestorTeamRunIds: [command.teamRunId] }),
        callbacks: this.options.callbacks,
      }) : this.options.teams.require(host.hostRunId).beginTaskTeam(command);
    }
    const plan = Object.freeze({ ...input, ownedAgentRunIds, recipientAddress: input.placement.address, target: Object.freeze({ root: this.root, execution, ingressAgentRunId }) });
    this.plans.set(plan, { host, beginLocal });
    return plan;
  }

  beginActivation(plan: TaskExecutionActivationPlan<StandaloneRootPlacement>): TaskExecutionActivationOperation {
    const facts = this.plans.get(plan);
    if (!facts) throw new Error("Activation plan does not belong to this root.");
    let reservation: ReturnType<RootTeamExecutionDirectory["reserveTaskSubtree"]> | null = null;
    const operation = beginRootTaskActivation({
      prepare: async (assertAccepting, ownLocal) => {
        assertAccepting();
        const local = facts.beginLocal();
        ownLocal({ prepare: () => local.prepare(), cancel: () => { reservation?.cancel(); local.cancel(); },
          release: () => { reservation?.cancel(); return local.release(); } });
        const prepared = await local.prepare(); assertAccepting();
        reservation = prepared.binding.kind === "team" ? this.options.teams.reserveTaskSubtree(prepared.preparedTeamRuns) : null;
        prepared.sealForCommit();
        let work: CommittedTaskExecution | null = null;
        return Object.freeze({
          targetAgentRunId: plan.target.ingressAgentRunId,
          commit: () => {
            assertAccepting();
            return this.commitActivation({ host: facts.host, prepared, reservation,
              delegatorAgentRunId: plan.identity.agentRunId, startedAt: plan.startedAt, source: plan.placement.source ?? null,
              retainWork: (value) => { work = value; } });
          },
          acceptSeed: (assertOpen) => {
            assertAccepting(); if (!work) throw new Error("Task seed has no durable activation.");
            return work.releaseWork(() => { assertAccepting(); assertOpen(); });
          },
        });
      },
    });
    this.registrations.set(taskExecutionReferenceKey(plan.target.execution), Object.freeze({ target: plan.target, ownedAgentRunIds: plan.ownedAgentRunIds, operation }));
    return operation;
  }

  registrationFor(reference: TaskExecutionReference) { return this.registrations.get(taskExecutionReferenceKey(reference)) ?? null; }
  ownershipChainFor(agentRunId: string): readonly TaskExecutionReference[] {
    const chain = this.taskExecutionChainFor(agentRunId);
    return chain.length ? chain : [...this.registrations.values()]
      .filter(entry => entry.ownedAgentRunIds.includes(agentRunId)).map(entry => entry.target.execution);
  }
  taskExecutionAt(address: string, among: readonly TaskExecutionReference[]) {
    for (const reference of among) {
      const entry = this.options.getIndex().getTaskExecution(reference);
      if (entry?.address === address) return Object.freeze({ root: this.root, execution: reference, ingressAgentRunId: this.ingressAgentRunId(entry) });
    }
    return null;
  }
  taskExecutionTargetOf(reference: TaskExecutionReference) {
    // The index is keyed by run ID alone: the copy must also be of the requested kind.
    const entry = this.options.getIndex().getTaskExecution(reference);
    return entry && taskExecutionReferenceKey(referenceOf(entry)) === taskExecutionReferenceKey(reference) ? Object.freeze({ root: this.root, execution: referenceOf(entry), ingressAgentRunId: this.ingressAgentRunId(entry) }) : null;
  }
  cancelOwnedExecution(reference: TaskExecutionReference): void {
    const entry = this.options.getIndex().getTaskExecution(reference); if (!entry) return;
    if (entry.host.hostKind === "team") this.options.teams.getManaged(entry.host.hostRunId)?.cancelDirectTaskExecution(reference);
    else if (entry.kind === "agent") this.options.rootAgents.cancelTask(entry.agentRunId);
    else this.options.teams.cancelTask(entry.teamRunId);
  }
  releaseOwnedExecution(reference: TaskExecutionReference): Promise<AgentOperationResult> {
    const entry = this.options.getIndex().getTaskExecution(reference);
    if (!entry) return Promise.resolve({ accepted: false, code: "EXACT_RELEASE_AUTHORITY_UNAVAILABLE" });
    if (entry.host.hostKind === "team") {
      const host = this.options.teams.getManaged(entry.host.hostRunId);
      return host ? host.releaseDirectTaskExecution(reference) : Promise.resolve({ accepted: false, code: "EXACT_RELEASE_AUTHORITY_UNAVAILABLE" });
    }
    return entry.kind === "agent" ? this.options.rootAgents.releaseTask(entry.agentRunId) : this.options.teams.releaseTask(entry.teamRunId);
  }
  discardReleasedExecution(reference: TaskExecutionReference): void {
    this.registrations.delete(taskExecutionReferenceKey(reference));
    const entry = this.options.getIndex().getTaskExecution(reference); if (!entry) return;
    if (entry.host.hostKind === "team") this.options.teams.getManaged(entry.host.hostRunId)?.discardReleasedDirectTaskExecution(reference);
    else if (entry.kind === "agent") this.options.rootAgents.discardReleasedTask(entry.agentRunId);
    // A task TeamRun is registered in the directory wherever it is hosted.
    if (entry.kind === "team") this.options.teams.discardReleasedTask(entry.teamRunId);
  }
  taskExecutionWithIngress(agentRunId: string): TaskExecutionReference | null {
    const innermost = this.options.getIndex().listTaskExecutionChainForAgent(agentRunId)[0];
    return innermost && this.ingressAgentRunId(innermost) === agentRunId ? referenceOf(innermost) : null;
  }

  containsTaskExecution(reference: TaskExecutionReference): boolean { return this.options.getIndex().getTaskExecution(reference) !== null; }
  publishTaskExecutionsClosed(references: readonly TaskExecutionReference[]): void { this.options.publishTaskExecutionsClosed(references); }
  publishTaskExecutionsReopened(references: readonly TaskExecutionReference[]): void { this.options.publishTaskExecutionsReopened(references); }

  taskExecutionChainFor(agentRunId: string): readonly TaskExecutionReference[] {
    return this.options.getIndex().listTaskExecutionChainForAgent(agentRunId).map(referenceOf);
  }

  listTaskExecutions(): readonly TaskExecutionReference[] { return this.options.getIndex().listTaskExecutions().map(referenceOf); }
  taskExecutionStatus(reference: TaskExecutionReference): AgentExecutionStatus {
    const indexed = this.options.getIndex().getTaskExecution(reference);
    if (!indexed || !this.isLive(reference)) return "offline";
    // A task TeamRun is registered in the directory wherever it is hosted; its status folds its leaves.
    if (indexed.kind === "team") {
      return foldTeamAggregateStatus((this.options.teams.get(indexed.teamRunId)?.getLeafAgentStatusSnapshots() ?? [])
        .map((snapshot) => snapshot.details.status), "live");
    }
    if (indexed.host.hostKind === "team") {
      return this.options.teams.get(indexed.host.hostRunId)?.getLeafAgentStatusSnapshots()
        .find((snapshot) => snapshot.execution.agentRunId === indexed.agentRunId)?.details.status ?? "offline";
    }
    return this.options.rootAgents.get(indexed.agentRunId)?.getStatusSnapshot().details.status ?? "offline";
  }

  isLive(reference: TaskExecutionReference): boolean {
    const indexed = this.options.getIndex().getTaskExecution(reference);
    if (!indexed) return false;
    if (indexed.host.hostKind === "team") {
      return Boolean(this.options.teams.get(indexed.host.hostRunId)?.hasLiveDirectTaskExecution(reference));
    }
    return indexed.kind === "agent"
      ? this.options.rootAgents.isTaskLive(indexed.agentRunId)
      : this.options.teams.get(indexed.teamRunId) !== null;
  }

  assertRestorableChain(agentRunId: string): void {
    const index = this.options.getIndex();
    for (const indexed of index.listTaskExecutionChainForAgent(agentRunId)) {
      if (this.isLive(referenceOf(indexed))) continue;
      const ingressAgentRunId = this.ingressAgentRunId(indexed);
      const memoryDir = this.memoryLocator.getLocation(index.getPhysicalScopeForAgent(ingressAgentRunId), ingressAgentRunId).memoryDir;
      const activity = (this.options.activityInspector ?? getAgentConversationActivityInspector())
        .inspect({ agentRunId: ingressAgentRunId, memoryDir });
      if (activity.kind !== "present") {
        throw new TaskDelegationError(
          "TASK_EXECUTION_CONTEXT_UNAVAILABLE",
          `The delegated ${indexed.kind === "agent" ? "Agent" : "Team"} at '${indexed.address}' is shut down and its saved conversation is unavailable (${activity.kind}); it cannot be restored.`,
        );
      }
    }
  }

  async restoreChain(agentRunId: string, assertOpen: () => void): Promise<void> {
    const chain = this.options.getIndex().listTaskExecutionChainForAgent(agentRunId);
    for (const indexed of [...chain].reverse()) {
      assertOpen();
      if (this.isLive(referenceOf(indexed))) continue;
      if (indexed.kind === "agent") {
        const source = this.sources.require(indexed.address, "agent", indexed.source.source).node;
        const sourceNode = Object.freeze({ ...source, agentRunId: indexed.agentRunId, platformAgentRunId: indexed.source.platformAgentRunId });
        if (indexed.host.hostKind === "root") await this.options.rootAgents.restoreTask(sourceNode);
        else {
          await this.options.teams.require(indexed.host.hostRunId).restoreTaskAgent({
            address: indexed.address, agentRunId: indexed.agentRunId, platformAgentRunId: indexed.source.platformAgentRunId, sourceNode,
          });
        }
        assertOpen();
        continue;
      }
      const source = this.sources.require(indexed.address, "agent_team", indexed.source.source);
      const teamNode = restoreTaskTeamNode({ source: source.node, execution: indexed.source });
      if (indexed.host.hostKind === "root") {
        await this.options.teams.restoreRootTaskTeam({ assertOpen,
          teamNode,
          handoffs: source.handoffs,
          physicalScope: createRootExecutionPhysicalScope({ root: this.options.root, ancestorTeamRunIds: [indexed.teamRunId] }),
          callbacks: this.options.callbacks,
        });
      } else {
        const run = await this.options.teams.require(indexed.host.hostRunId).restoreTaskTeam({ assertOpen, handoffs: source.handoffs, teamNode });
        assertOpen();
        this.options.teams.registerRestoredTaskTeam(run);
      }
      assertOpen();
    }
  }

  async tryShutDownIfQuiet(reference: TaskExecutionReference): Promise<boolean> {
    const index = this.options.getIndex();
    const indexed = index.getTaskExecution(reference);
    if (!indexed || !this.isLive(reference)) return false;
    const key = runIdOf(indexed);
    const affected = index.listChildAgents().filter((agent) =>
      index.listTaskExecutionChainForAgent(agent.agentRunId).some((execution) => runIdOf(execution) === key));
    let shutDown: boolean;
    try {
      if (indexed.host.hostKind === "team") {
        shutDown = await this.options.teams.require(indexed.host.hostRunId).tryShutDownDirectTaskExecutionIfQuiet(reference);
      } else {
        shutDown = indexed.kind === "agent"
          ? await this.options.rootAgents.tryShutDownTaskIfQuiet(indexed.agentRunId)
          : await this.options.teams.tryShutDownRootTaskTeamIfQuiet(indexed.teamRunId);
      }
    } catch (error) {
      if (error instanceof TaskExecutionTeardownIndeterminateError) this.options.enterLifecycleFailStop();
      throw error;
    }
    if (!shutDown) return false;
    this.options.teams.unregisterTerminated();
    for (const agent of affected) {
      this.options.publishAgentOffline(createCollaborationMemberExecutionIdentity({
        root: this.options.root, memberAddress: agent.address, agentRunId: agent.agentRunId,
      }));
    }
    return true;
  }

  private ingressAgentRunId(indexed: StandaloneRootIndexedTaskExecution): string {
    if (indexed.kind === "agent") return indexed.agentRunId;
    const coordinatorAddress = this.sources.require(indexed.address, "agent_team", indexed.source.source,
      (message) => new TaskDelegationError("TASK_EXECUTION_CONTEXT_UNAVAILABLE", message)).node.coordinatorAddress;
    const coordinator = indexed.source.members.find((member) => "agentRunId" in member && member.address === coordinatorAddress);
    if (!coordinator || !("agentRunId" in coordinator)) {
      throw new TaskDelegationError(
        "TASK_EXECUTION_CONTEXT_UNAVAILABLE",
        `Task TeamRun '${indexed.teamRunId}' has no coordinator AgentRun at '${coordinatorAddress}'.`,
      );
    }
    return coordinator.agentRunId;
  }

  private commitActivation(input: {
    host: TaskExecutionHostIdentity;
    prepared: PreparedTaskExecution;
    reservation: ReturnType<RootTeamExecutionDirectory["reserveTaskSubtree"]> | null;
    delegatorAgentRunId: string;
    startedAt: string;
    source: TaskExecutionSource | null;
    retainWork(work: CommittedTaskExecution): void;
  }): Promise<TaskExecutionActivationCommitResult> {
    const binding = input.prepared.binding;
    const execution = binding.kind === "agent"
      ? projectTaskAgentExecution({
          address: binding.address, agentRunId: binding.agentRunId,
          delegatorAgentRunId: input.delegatorAgentRunId, startedAt: input.startedAt,
          source: input.source?.kind === "agent" ? input.source : null,
        })
      : projectTaskTeamExecution({
          node: requirePreparedTeamNode(input.prepared),
          delegatorAgentRunId: input.delegatorAgentRunId, startedAt: input.startedAt,
          source: input.source?.kind === "agent_team" ? input.source : null,
        });
    let nextTreeAtCommit: StandaloneRootTreeSnapshot | null = null;
    return this.options.persistence.commitTaskActivation({
      prepareAgainstCurrent: () => {
        let nextTree = addStandaloneRootTaskExecution({ tree: this.options.getTree(), host: input.host, execution });
        for (const staged of input.prepared.stagedPlatformBindings) {
          nextTree = adoptStandaloneRootPlatformBinding({ tree: nextTree, binding: staged }).tree;
        }
        nextTreeAtCommit = nextTree;
        return { nextTree };
      },
      abortBeforeDurability: async () => { input.reservation?.cancel(); await input.prepared.abort(); },
      commitAfterDurability: () => {
        if (!nextTreeAtCommit) throw new Error("Agent-root task activation tree was not prepared.");
        this.options.replaceTree(nextTreeAtCommit);
        input.reservation?.commit();
        this.options.publishTaskExecutionStarted(input.host, binding.kind === "agent"
          ? Object.freeze({ agentRunId: binding.agentRunId })
          : Object.freeze({ teamRunId: binding.teamRunId }));
        const committed = input.prepared.commitAfterDurability();
        input.retainWork(committed);
      },
    });
  }
}

const requirePreparedTeamNode = (prepared: PreparedTaskExecution) => {
  const binding = prepared.binding;
  if (binding.kind !== "team") throw new Error("Prepared task execution is not a Team.");
  const run = prepared.preparedTeamRuns.find((candidate) => candidate.teamRunId === binding.teamRunId);
  if (!run) throw new Error(`Prepared TeamRun '${binding.teamRunId}' was not found.`);
  return run.context.teamNode;
};
