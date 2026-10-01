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
  createTeamRootExecutionIdentity,
} from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { RootedAgentMemoryLocator } from "../../agent-collaboration/execution/services/rooted-agent-memory-locator.js";
import { getAgentConversationActivityInspector } from "../../agent-memory/services/agent-conversation-activity-inspector.js";
import { TokenUsageMigrationReadiness } from "../../token-usage/providers/token-usage-migration-readiness.js";
import type { PreparedTaskExecution } from "../domain/prepared-task-execution.js";
import type { TaskExecution, TeamRunExecutionTreeSnapshot } from "../domain/team-run-execution-tree.js";
import {
  createTeamAgentStatusDetails,
  createTeamAgentStatusEvent,
  createTeamAgentStatusSnapshot,
} from "../domain/team-agent-status.js";
import type { IndexedTaskExecution } from "../services/team-execution-index.js";
import { TeamExecutionScopeResolver } from "../services/team-execution-scope-resolver.js";
import { addTaskExecutionToTree, adoptAgentPlatformBindingInTree } from "../services/team-run-execution-tree-mutator.js";
import { TeamRunPersistenceFinalizationIndeterminateError } from "../services/team-run-persistence-contract.js";
import type { TeamDelegationPlacement } from "../services/resolved-team-recipient.js";
import type { TeamRunRegistrationReservation } from "../services/team-run-resolver.js";
import { requirePreparedTaskTeamNode } from "./task-delegation-execution-resolution.js";
import { TeamTaskSourceResolver } from "./team-task-source-resolver.js";
import { taskExecutionStartedEvent } from "./task-execution-event-factory.js";
import type { TeamTaskExecutionServiceOptions } from "./team-task-execution-service-contract.js";

const referenceOf = (execution: IndexedTaskExecution): TaskExecutionReference =>
  execution.kind === "agent" ? Object.freeze({ agentRunId: execution.agentRunId }) : Object.freeze({ teamRunId: execution.teamRunId });

/** Team-private tree / index / registry / persistence adapter for RootTaskExecutionLifecycle. */
export class TeamTaskExecutionAdapter implements RootTaskExecutionAdapter<TeamDelegationPlacement> {
  private readonly tokenUsageReadiness: Pick<TokenUsageMigrationReadiness, "assertCurrentSchemaReady">;
  private readonly memoryLocator: RootedAgentMemoryLocator;
  private readonly sources: TeamTaskSourceResolver;

  constructor(private readonly options: TeamTaskExecutionServiceOptions) {
    this.tokenUsageReadiness = options.tokenUsageMigrationReadiness ?? new TokenUsageMigrationReadiness();
    this.memoryLocator = options.memoryLocator ?? new RootedAgentMemoryLocator();
    this.sources = new TeamTaskSourceResolver({ config: options.config, getIndex: () => options.getIndex() });
  }

  isOpen(): boolean { return this.options.isRootOpen(); }
  authorize(identity: Parameters<TeamTaskExecutionServiceOptions["authorize"]>[0]): void { this.options.authorize(identity); }
  assertCurrentSchemaReady(): void { this.tokenUsageReadiness.assertCurrentSchemaReady(); }

  async prepareActivation(input: TaskExecutionActivationPreparation<TeamDelegationPlacement>): Promise<PreparedTaskExecutionActivation> {
    const host = new TeamExecutionScopeResolver(this.options.getIndex()).resolveTargetOwner({
      callerAgentRunId: input.identity.agentRunId,
      recipientAddress: input.placement.address,
    });
    const hostRun = await this.options.requireTeamRun(host.teamRunId);
    let prepared: PreparedTaskExecution;
    let reservation: TeamRunRegistrationReservation | null = null;
    if (input.placement.kind === "agent") {
      const source = this.sources.requireAgent(input.placement.address, input.placement.source);
      const agentRunId = await this.options.taskExecutionIdentity.agentRuns.allocateForAgentDefinition(source.agentDefinitionId);
      prepared = await hostRun.prepareTaskAgent({
        address: input.placement.address,
        agentRunId,
        sourceNode: source,
        message: input.workPacket,
      });
    } else {
      const source = this.sources.requireTeam(input.placement.address, input.placement.source);
      const materialized = await this.options.taskExecutionIdentity.taskTeams.create({ source: source.node });
      prepared = await hostRun.prepareTaskTeam({
        address: input.placement.address,
        teamRunId: materialized.teamNode.teamRunId,
        handoffs: source.handoffs,
        teamNode: materialized.teamNode,
        message: input.workPacket,
      });
      reservation = this.options.teamRunResolver.reserveTaskSubtree(prepared.preparedTeamRuns);
    }
    prepared.sealForCommit();
    const delegatorAgentRunId = input.identity.agentRunId;
    const execution: TaskExecution = prepared.binding.kind === "agent"
      ? projectTaskAgentExecution({
          address: prepared.binding.address,
          agentRunId: prepared.binding.agentRunId,
          delegatorAgentRunId,
          startedAt: input.startedAt,
          source: input.placement.kind === "agent" ? input.placement.source : null,
        })
      : projectTaskTeamExecution({
          node: requirePreparedTaskTeamNode(prepared),
          delegatorAgentRunId,
          startedAt: input.startedAt,
          source: input.placement.kind === "agent_team" ? input.placement.source : null,
        });
    const exactReservation = reservation;
    return Object.freeze({
      targetAgentRunId: prepared.binding.kind === "agent" ? prepared.binding.agentRunId : prepared.binding.coordinatorAgentRunId,
      commit: () => this.commitActivation({
        input,
        hostTeamRunId: host.teamRunId,
        prepared,
        reservation: exactReservation,
        execution,
      }),
      abort: async () => { exactReservation?.cancel(); await prepared.abort(); },
    });
  }

  taskExecutionChainFor(agentRunId: string): readonly TaskExecutionReference[] {
    return this.options.getIndex().listTaskExecutionChainForAgent(agentRunId).map(referenceOf);
  }

  isLive(reference: TaskExecutionReference): boolean {
    const indexed = this.options.getIndex().getTaskExecution(reference);
    if (!indexed) return false;
    const host = this.options.teamRunResolver.getActive(indexed.ownerTeamRunId);
    return Boolean(host?.hasLiveDirectTaskExecution(reference));
  }

  assertRestorableChain(agentRunId: string): void {
    const index = this.options.getIndex();
    for (const indexed of index.listTaskExecutionChainForAgent(agentRunId)) {
      if (this.isLive(referenceOf(indexed))) continue;
      const ingress = this.ingressOf(indexed);
      const memoryDir = this.memoryLocator.getLocation(
        index.getTeamRunPhysicalScope(ingress.scopeTeamRunId),
        ingress.agentRunId,
      ).memoryDir;
      const activity = (this.options.activityInspector ?? getAgentConversationActivityInspector())
        .inspect({ agentRunId: ingress.agentRunId, memoryDir });
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
      const host = await this.options.requireTeamRun(indexed.ownerTeamRunId);
      if (indexed.kind === "agent") {
        await host.restoreTaskAgent({
          address: indexed.address,
          agentRunId: indexed.agentRunId,
          platformAgentRunId: indexed.source.platformAgentRunId,
          sourceNode: this.sources.requireAgent(indexed.address, indexed.source.source),
        });
        continue;
      }
      const source = this.sources.requireTeam(indexed.address, indexed.source.source);
      const run = await host.restoreTaskTeam({
        handoffs: source.handoffs,
        teamNode: restoreTaskTeamNode({ source: source.node, execution: indexed.source }),
      });
      this.options.teamRunResolver.registerManaged(run);
    }
  }

  async tryShutDownIfQuiet(reference: TaskExecutionReference): Promise<boolean> {
    const index = this.options.getIndex();
    const indexed = index.getTaskExecution(reference);
    if (!indexed) return false;
    const host = this.options.teamRunResolver.getActive(indexed.ownerTeamRunId);
    if (!host) return false;
    const key = indexed.kind === "agent" ? indexed.agentRunId : indexed.teamRunId;
    const affectedAgents = index.listAgentExecutions().filter((agent) =>
      index.listTaskExecutionChainForAgent(agent.agentRunId).some((execution) =>
        (execution.kind === "agent" ? execution.agentRunId : execution.teamRunId) === key));
    let shutDown: boolean;
    try {
      shutDown = await host.tryShutDownDirectTaskExecutionIfQuiet(reference);
    } catch (error) {
      if (error instanceof TaskExecutionTeardownIndeterminateError) this.options.enterLifecycleFailStop();
      throw error;
    }
    if (!shutDown) return false;
    this.options.teamRunResolver.unregisterTerminated();
    const root = createTeamRootExecutionIdentity(this.options.rootTeamRunId);
    for (const agent of affectedAgents) {
      this.options.publish(createTeamAgentStatusEvent(createTeamAgentStatusSnapshot({
        execution: createCollaborationMemberExecutionIdentity({ root, memberAddress: agent.address, agentRunId: agent.agentRunId }),
        details: createTeamAgentStatusDetails({ status: "offline" }),
      })));
    }
    return true;
  }

  private ingressOf(indexed: IndexedTaskExecution): Readonly<{ agentRunId: string; scopeTeamRunId: string }> {
    if (indexed.kind === "agent") return Object.freeze({ agentRunId: indexed.agentRunId, scopeTeamRunId: indexed.ownerTeamRunId });
    const source = this.sources.resolve(indexed.address, indexed.source.source);
    if (!source || source.kind !== "agent_team") {
      throw new TaskDelegationError("TASK_EXECUTION_CONTEXT_UNAVAILABLE", `AgentTeam '${indexed.address}' is not configured or a collaborator of this run.`);
    }
    const coordinatorAddress = source.node.coordinatorAddress;
    const coordinator = indexed.source.members.find((member) =>
      "agentRunId" in member && member.address === coordinatorAddress);
    if (!coordinator || !("agentRunId" in coordinator)) {
      throw new TaskDelegationError(
        "TASK_EXECUTION_CONTEXT_UNAVAILABLE",
        `Task TeamRun '${indexed.teamRunId}' has no coordinator AgentRun at '${coordinatorAddress}'.`,
      );
    }
    return Object.freeze({ agentRunId: coordinator.agentRunId, scopeTeamRunId: indexed.teamRunId });
  }

  private async commitActivation(input: {
    input: TaskExecutionActivationPreparation<TeamDelegationPlacement>;
    hostTeamRunId: string;
    prepared: PreparedTaskExecution;
    reservation: TeamRunRegistrationReservation | null;
    execution: TaskExecution;
  }): Promise<TaskExecutionActivationCommitResult> {
    let nextTreeAtCommit: TeamRunExecutionTreeSnapshot | null = null;
    const result = await this.options.commitTaskActivation({
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
        return { nextTree };
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
          this.options.replaceTree(nextTreeAtCommit);
          this.options.publish(taskExecutionStartedEvent({
            taskExecution: input.prepared.binding.kind === "agent"
              ? Object.freeze({ agentRunId: input.prepared.binding.agentRunId })
              : Object.freeze({ teamRunId: input.prepared.binding.teamRunId }),
            parentTeamRunId: input.hostTeamRunId,
          }));
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
}
