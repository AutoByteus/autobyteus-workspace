import type {
  PreparedTaskExecutionActivation,
  RootTaskExecutionAdapter,
  TaskExecutionActivationCommitResult,
  TaskExecutionActivationPreparation,
} from "../../agent-collaboration/execution/task/root-task-execution-adapter.js";
import {
  TaskDelegationError,
  TaskExecutionTeardownIndeterminateError,
} from "../../agent-collaboration/execution/task/task-delegation-command.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import { projectTaskAgentExecution, projectTaskTeamExecution } from "../../agent-collaboration/execution/task/task-execution-tree-projection.js";
import { restoreTaskTeamNode } from "../../agent-collaboration/execution/task/task-team-node-restoration.js";
import {
  createCollaborationMemberExecutionIdentity,
  createRootExecutionPhysicalScope,
  createTaskExecutionHostIdentity,
  type CollaborationMemberExecutionIdentity,
  type RootExecutionIdentity,
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
import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { AgentRunCollaborationTreeSnapshot } from "../domain/agent-run-collaboration-tree.js";
import type {
  AgentRunCollaborationExecutionIndex,
  AgentRunCollaborationIndexedTaskExecution,
} from "./agent-run-collaboration-execution-index.js";
import type { AgentRunCollaborationPersistenceCoordinator } from "./agent-run-collaboration-persistence-coordinator.js";
import { AgentRunCollaborationTaskSourceResolver } from "./agent-run-collaboration-task-source-resolver.js";
import { addAgentRunTaskExecution, adoptAgentRunPlatformBinding } from "./agent-run-collaboration-tree-mutator.js";

/** A delegation target in an Agent root: always a collaborator of the run. */
export type AgentRunCollaborationPlacement =
  | Readonly<{ kind: "agent"; address: AgentTeamAddress }>
  | Readonly<{ kind: "agent_team"; address: AgentTeamAddress; coordinatorAddress: AgentTeamAddress }>;

const referenceOf = (execution: AgentRunCollaborationIndexedTaskExecution): TaskExecutionReference =>
  execution.kind === "agent" ? Object.freeze({ agentRunId: execution.agentRunId }) : Object.freeze({ teamRunId: execution.teamRunId });
const runIdOf = (execution: AgentRunCollaborationIndexedTaskExecution): string =>
  execution.kind === "agent" ? execution.agentRunId : execution.teamRunId;

export type AgentRunCollaborationTaskExecutionAdapterOptions = Readonly<{
  root: RootExecutionIdentity;
  taskExecutionIdentity: TaskExecutionIdentityCapabilities;
  rootAgents: RootAgentExecutionRegistry;
  teams: RootTeamExecutionDirectory;
  callbacks: FlatTeamExecutionCallbacks;
  persistence: AgentRunCollaborationPersistenceCoordinator;
  getTree(): AgentRunCollaborationTreeSnapshot;
  getIndex(): AgentRunCollaborationExecutionIndex;
  isOpen(): boolean;
  authorize(identity: CollaborationMemberExecutionIdentity): void;
  replaceTree(tree: AgentRunCollaborationTreeSnapshot): void;
  publishTaskExecutionStarted(host: TaskExecutionHostIdentity, taskExecution: TaskExecutionReference): void;
  publishAgentOffline(identity: CollaborationMemberExecutionIdentity): void;
  enterLifecycleFailStop(): void;
  memoryLocator?: RootedAgentMemoryLocator;
  activityInspector?: AgentConversationActivityInspector;
  tokenUsageReadiness?: Pick<TokenUsageMigrationReadiness, "assertCurrentSchemaReady">;
}>;

/**
 * Agent-root host / tree / registry / persistence adapter for RootTaskExecutionLifecycle.
 * Every collaborator run is hosted by the root, whoever delegates it.
 */
export class AgentRunCollaborationTaskExecutionAdapter implements RootTaskExecutionAdapter<AgentRunCollaborationPlacement> {
  private readonly readiness: Pick<TokenUsageMigrationReadiness, "assertCurrentSchemaReady">;
  private readonly memoryLocator: RootedAgentMemoryLocator;
  private readonly sources: AgentRunCollaborationTaskSourceResolver;
  private readonly host: TaskExecutionHostIdentity;

  constructor(private readonly options: AgentRunCollaborationTaskExecutionAdapterOptions) {
    this.readiness = options.tokenUsageReadiness ?? new TokenUsageMigrationReadiness();
    this.memoryLocator = options.memoryLocator ?? new RootedAgentMemoryLocator();
    this.sources = new AgentRunCollaborationTaskSourceResolver(() => options.getIndex());
    this.host = createTaskExecutionHostIdentity({
      root: options.root, hostKind: "root", hostRunId: options.root.rootRunId, hostAddress: "/",
    });
  }

  isOpen(): boolean { return this.options.isOpen(); }
  authorize(identity: CollaborationMemberExecutionIdentity): void { this.options.authorize(identity); }
  assertCurrentSchemaReady(): void { this.readiness.assertCurrentSchemaReady(); }

  async prepareActivation(input: TaskExecutionActivationPreparation<AgentRunCollaborationPlacement>): Promise<PreparedTaskExecutionActivation> {
    let prepared: PreparedTaskExecution;
    if (input.placement.kind === "agent") {
      const source = this.sources.require(input.placement.address, "agent").node;
      const agentRunId = await this.options.taskExecutionIdentity.agentRuns.allocateForAgentDefinition(source.agentDefinitionId);
      prepared = await this.options.rootAgents.prepareTask({ address: input.placement.address, agentRunId, sourceNode: source, message: input.workPacket });
    } else {
      const source = this.sources.require(input.placement.address, "agent_team");
      const materialized = await this.options.taskExecutionIdentity.taskTeams.create({ source: source.node });
      prepared = await this.options.teams.prepareRootTaskTeam({
        task: {
          address: input.placement.address,
          teamRunId: materialized.teamNode.teamRunId,
          handoffs: source.handoffs,
          teamNode: materialized.teamNode,
          message: input.workPacket,
        },
        physicalScope: createRootExecutionPhysicalScope({ root: this.options.root, ancestorTeamRunIds: [materialized.teamNode.teamRunId] }),
        callbacks: this.options.callbacks,
      });
    }
    const reservation = prepared.binding.kind === "team" ? this.options.teams.reserveTaskSubtree(prepared.preparedTeamRuns) : null;
    prepared.sealForCommit();
    return Object.freeze({
      targetAgentRunId: prepared.binding.kind === "agent" ? prepared.binding.agentRunId : prepared.binding.coordinatorAgentRunId,
      commit: () => this.commitActivation({ prepared, reservation, delegatorAgentRunId: input.identity.agentRunId, startedAt: input.startedAt }),
      abort: async () => { reservation?.cancel(); await prepared.abort(); },
    });
  }

  taskExecutionChainFor(agentRunId: string): readonly TaskExecutionReference[] {
    return this.options.getIndex().listTaskExecutionChainForAgent(agentRunId).map(referenceOf);
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

  async restoreChain(agentRunId: string): Promise<void> {
    const chain = this.options.getIndex().listTaskExecutionChainForAgent(agentRunId);
    for (const indexed of [...chain].reverse()) {
      if (this.isLive(referenceOf(indexed))) continue;
      if (indexed.kind === "agent") {
        const source = this.sources.require(indexed.address, "agent").node;
        await this.options.rootAgents.restoreTask(Object.freeze({
          ...source, agentRunId: indexed.agentRunId, platformAgentRunId: indexed.source.platformAgentRunId,
        }));
        continue;
      }
      const source = this.sources.require(indexed.address, "agent_team");
      await this.options.teams.restoreRootTaskTeam({
        teamNode: restoreTaskTeamNode({ source: source.node, execution: indexed.source }),
        handoffs: source.handoffs,
        physicalScope: createRootExecutionPhysicalScope({ root: this.options.root, ancestorTeamRunIds: [indexed.teamRunId] }),
        callbacks: this.options.callbacks,
      });
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
      shutDown = indexed.kind === "agent"
        ? await this.options.rootAgents.tryShutDownTaskIfQuiet(indexed.agentRunId)
        : await this.options.teams.tryShutDownRootTaskTeamIfQuiet(indexed.teamRunId);
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

  private ingressAgentRunId(indexed: AgentRunCollaborationIndexedTaskExecution): string {
    if (indexed.kind === "agent") return indexed.agentRunId;
    const coordinatorAddress = this.sources.require(indexed.address, "agent_team",
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
    prepared: PreparedTaskExecution;
    reservation: ReturnType<RootTeamExecutionDirectory["reserveTaskSubtree"]> | null;
    delegatorAgentRunId: string;
    startedAt: string;
  }): Promise<TaskExecutionActivationCommitResult> {
    const binding = input.prepared.binding;
    const execution = binding.kind === "agent"
      ? projectTaskAgentExecution({
          address: binding.address, agentRunId: binding.agentRunId,
          delegatorAgentRunId: input.delegatorAgentRunId, startedAt: input.startedAt,
        })
      : projectTaskTeamExecution({
          node: requirePreparedTeamNode(input.prepared),
          delegatorAgentRunId: input.delegatorAgentRunId, startedAt: input.startedAt,
        });
    let nextTreeAtCommit: AgentRunCollaborationTreeSnapshot | null = null;
    return this.options.persistence.commitTaskActivation({
      prepareAgainstCurrent: () => {
        let nextTree = addAgentRunTaskExecution({ tree: this.options.getTree(), execution });
        for (const staged of input.prepared.stagedPlatformBindings) {
          nextTree = adoptAgentRunPlatformBinding({ tree: nextTree, binding: staged }).tree;
        }
        nextTreeAtCommit = nextTree;
        return { nextTree };
      },
      abortBeforeDurability: async () => { input.reservation?.cancel(); await input.prepared.abort(); },
      commitAfterDurability: () => {
        if (!nextTreeAtCommit) throw new Error("Agent-root task activation tree was not prepared.");
        const committed = input.prepared.commitAfterDurability();
        input.reservation?.commit();
        this.options.replaceTree(nextTreeAtCommit);
        this.options.publishTaskExecutionStarted(this.host, binding.kind === "agent"
          ? Object.freeze({ agentRunId: binding.agentRunId })
          : Object.freeze({ teamRunId: binding.teamRunId }));
        committed.releaseWork();
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
