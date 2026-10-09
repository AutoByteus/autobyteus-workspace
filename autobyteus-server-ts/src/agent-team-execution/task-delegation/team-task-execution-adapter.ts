import type { CommittedTaskExecution, TaskExecutionPreparationOperation } from "../domain/prepared-task-execution.js";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import { taskExecutionReferenceKey } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import { beginRootTaskActivation, type RegisteredTaskActivation, type TaskExecutionActivationPlan, type TaskExecutionActivationOperation,
  type PreparedTaskExecutionActivation,
  type RootTaskExecutionAdapter,
  type TaskExecutionActivationCommitResult,
  type TaskExecutionActivationPreparation,
} from "../../agent-collaboration/execution/task/root-task-execution-adapter.js";
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
import { resolveTaskCopyHost } from "../../agent-collaboration/execution/task/task-copy-host.js";
import { addTaskExecutionToTree, adoptAgentPlatformBindingInTree } from "../services/team-run-execution-tree-mutator.js";
import { TeamRunPersistenceFinalizationIndeterminateError } from "../services/team-run-persistence-contract.js";
import type { TeamDelegationPlacement } from "../services/resolved-team-recipient.js";
import type { TeamRunRegistrationReservation } from "../services/team-run-resolver.js";
import { requirePreparedTaskTeamNode } from "./task-delegation-execution-resolution.js";
import { TeamTaskSourceResolver } from "./team-task-source-resolver.js";
import { taskExecutionStartedEvent, taskExecutionsClosedEvent, taskExecutionsReopenedEvent } from "./task-execution-event-factory.js";
import type { TeamTaskExecutionServiceOptions } from "./team-task-execution-service-contract.js";

const referenceOf = (execution: IndexedTaskExecution): TaskExecutionReference =>
  execution.kind === "agent" ? Object.freeze({ agentRunId: execution.agentRunId }) : Object.freeze({ teamRunId: execution.teamRunId });

/** Team-private tree / index / registry / persistence adapter for RootTaskExecutionLifecycle. */
export class TeamTaskExecutionAdapter implements RootTaskExecutionAdapter<TeamDelegationPlacement> {
  private readonly plans = new WeakMap<TaskExecutionActivationPlan<TeamDelegationPlacement>, {
    hostTeamRunId: string; beginLocal(): Promise<TaskExecutionPreparationOperation>;
  }>();
  private readonly registrations = new Map<string, RegisteredTaskActivation>();
  get root() { return createTeamRootExecutionIdentity(this.options.rootTeamRunId); }
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

  async planActivation(input: TaskExecutionActivationPreparation<TeamDelegationPlacement>): Promise<TaskExecutionActivationPlan<TeamDelegationPlacement>> {
    const hostTeamRunId = this.copyHostTeamRunId(input.identity.agentRunId, input.placement.address);
    let execution: TaskExecutionReference;
    let ingressAgentRunId: string;
    let ownedAgentRunIds: readonly string[];
    let command: Parameters<import("../domain/team-run.js").TeamRun["beginTaskAgent"]>[0] | Parameters<import("../domain/team-run.js").TeamRun["beginTaskTeam"]>[0];
    if (input.placement.kind === "agent") {
      const source = this.sources.requireAgent(input.placement.address, input.placement.source);
      const agentRunId = await this.options.taskExecutionIdentity.agentRuns.allocateForAgentDefinition(source.agentDefinitionId);
      execution = { agentRunId }; ingressAgentRunId = agentRunId; ownedAgentRunIds = [agentRunId];
      command = { address: input.placement.address, agentRunId, sourceNode: source, message: input.workPacket };
    } else {
      const source = this.sources.requireTeam(input.placement.address, input.placement.source);
      const materialized = await this.options.taskExecutionIdentity.taskTeams.create({ source: source.node });
      const coordinator = materialized.teamNode.children.find(node => node.kind === "agent" && node.address === materialized.teamNode.coordinatorAddress);
      if (!coordinator || coordinator.kind !== "agent") throw new Error("Planned Team has no exact coordinator.");
      execution = { teamRunId: materialized.teamNode.teamRunId }; ingressAgentRunId = coordinator.agentRunId; ownedAgentRunIds = materialized.teamNode.children.flatMap(node => node.kind === "agent" ? [node.agentRunId] : []);
      command = { address: input.placement.address, teamRunId: materialized.teamNode.teamRunId,
        handoffs: source.handoffs, teamNode: materialized.teamNode, message: input.workPacket };
    }
    const plan = Object.freeze({ ...input, ownedAgentRunIds, recipientAddress: input.placement.address, target: Object.freeze({ root: this.root, execution, ingressAgentRunId }) });
    this.plans.set(plan, { hostTeamRunId, beginLocal: async () => {
      const host = await this.options.requireTeamRun(hostTeamRunId);
      return "agentRunId" in command ? host.beginTaskAgent(command) : host.beginTaskTeam(command);
    } });
    return plan;
  }

  beginActivation(plan: TaskExecutionActivationPlan<TeamDelegationPlacement>): TaskExecutionActivationOperation {
    const facts = this.plans.get(plan);
    if (!facts) throw new Error("Task plan does not belong to this root.");
    let reservation: TeamRunRegistrationReservation | null = null;
    const operation = beginRootTaskActivation({ prepare: async (assertAccepting, ownLocal) => {
      assertAccepting();
      const local = await facts.beginLocal();
      ownLocal({ prepare: () => local.prepare(), cancel: () => { reservation?.cancel(); local.cancel(); },
        release: () => { reservation?.cancel(); return local.release(); } });
      assertAccepting();
      const prepared = await local.prepare(); assertAccepting();
      reservation = prepared.binding.kind === "team" ? this.options.teamRunResolver.reserveTaskSubtree(prepared.preparedTeamRuns) : null;
      prepared.sealForCommit();
      const execution: TaskExecution = prepared.binding.kind === "agent"
        ? projectTaskAgentExecution({ address: prepared.binding.address, agentRunId: prepared.binding.agentRunId,
          delegatorAgentRunId: plan.identity.agentRunId, startedAt: plan.startedAt,
          source: plan.placement.kind === "agent" ? plan.placement.source : null })
        : projectTaskTeamExecution({ node: requirePreparedTaskTeamNode(prepared), delegatorAgentRunId: plan.identity.agentRunId,
          startedAt: plan.startedAt, source: plan.placement.kind === "agent_team" ? plan.placement.source : null });
      let work: CommittedTaskExecution | null = null;
      return Object.freeze({
        targetAgentRunId: plan.target.ingressAgentRunId,
        commit: () => { assertAccepting(); return this.commitActivation({ input: plan, hostTeamRunId: facts.hostTeamRunId,
          prepared, reservation, execution, retainWork: (value) => { work = value; } }); },
        acceptSeed: (assertOpen) => {
          assertAccepting(); if (!work) throw new Error("Task seed has no durable activation.");
          return work.releaseWork(() => { assertAccepting(); assertOpen(); });
        },
      });
    } });
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
      if (entry?.address === address) return Object.freeze({ root: this.root, execution: reference, ingressAgentRunId: this.ingressOf(entry).agentRunId });
    }
    return null;
  }
  taskExecutionTargetOf(reference: TaskExecutionReference) {
    // The index is keyed by run ID alone: the copy must also be of the requested kind.
    const entry = this.options.getIndex().getTaskExecution(reference);
    return entry && taskExecutionReferenceKey(referenceOf(entry)) === taskExecutionReferenceKey(reference) ? Object.freeze({ root: this.root, execution: referenceOf(entry), ingressAgentRunId: this.ingressOf(entry).agentRunId }) : null;
  }
  cancelOwnedExecution(reference: TaskExecutionReference): void {
    const entry = this.options.getIndex().getTaskExecution(reference);
    if (entry) this.options.teamRunResolver.getManaged(entry.ownerTeamRunId)?.cancelDirectTaskExecution(reference);
  }
  releaseOwnedExecution(reference: TaskExecutionReference): Promise<AgentOperationResult> {
    const entry = this.options.getIndex().getTaskExecution(reference);
    const host = entry && this.options.teamRunResolver.getManaged(entry.ownerTeamRunId);
    return host ? host.releaseDirectTaskExecution(reference) : Promise.resolve({ accepted: false, code: "EXACT_RELEASE_AUTHORITY_UNAVAILABLE" });
  }
  discardReleasedExecution(reference: TaskExecutionReference): void {
    this.registrations.delete(taskExecutionReferenceKey(reference));
    const entry = this.options.getIndex().getTaskExecution(reference); if (!entry) return;
    this.options.teamRunResolver.getManaged(entry.ownerTeamRunId)?.discardReleasedDirectTaskExecution(reference);
    if ("teamRunId" in reference) this.options.teamRunResolver.retireTerminated(reference.teamRunId);
  }
  taskExecutionWithIngress(agentRunId: string): TaskExecutionReference | null {
    const innermost = this.options.getIndex().listTaskExecutionChainForAgent(agentRunId)[0];
    return innermost && this.ingressOf(innermost).agentRunId === agentRunId ? referenceOf(innermost) : null;
  }

  /** REQ-012: the shared copy placement; the root placement is the root TeamRun. */
  private copyHostTeamRunId(delegatorAgentRunId: string, address: TeamDelegationPlacement["address"]): string {
    const host = resolveTaskCopyHost(this.options.getIndex(), delegatorAgentRunId, address);
    return host.hostKind === "team" ? host.hostRunId : this.options.rootTeamRunId;
  }

  containsTaskExecution(reference: TaskExecutionReference): boolean { return this.options.getIndex().getTaskExecution(reference) !== null; }
  publishTaskExecutionsClosed(references: readonly TaskExecutionReference[]): void { this.options.publish(taskExecutionsClosedEvent(references)); }
  publishTaskExecutionsReopened(references: readonly TaskExecutionReference[]): void { this.options.publish(taskExecutionsReopenedEvent(references)); }

  taskExecutionChainFor(agentRunId: string): readonly TaskExecutionReference[] {
    return this.options.getIndex().listTaskExecutionChainForAgent(agentRunId).map(referenceOf);
  }

  listTaskExecutions(): readonly TaskExecutionReference[] { return this.options.getIndex().listTaskExecutions().map(referenceOf); }
  taskExecutionStatus(reference: TaskExecutionReference): AgentExecutionStatus {
    const indexed = this.options.getIndex().getTaskExecution(reference);
    if (!indexed || !this.isLive(reference)) return "offline";
    if (indexed.kind === "team") {
      return foldTeamAggregateStatus((this.options.teamRunResolver.getActive(indexed.teamRunId)?.getLeafAgentStatusSnapshots() ?? [])
        .map((snapshot) => snapshot.details.status), "live");
    }
    return this.options.teamRunResolver.getActive(indexed.ownerTeamRunId)?.getLeafAgentStatusSnapshots()
      .find((snapshot) => snapshot.execution.agentRunId === indexed.agentRunId)?.details.status ?? "offline";
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

  async restoreChain(agentRunId: string, assertOpen: () => void): Promise<void> {
    const chain = this.options.getIndex().listTaskExecutionChainForAgent(agentRunId);
    for (const indexed of [...chain].reverse()) {
      assertOpen();
      if (this.isLive(referenceOf(indexed))) continue;
      const host = await this.options.requireTeamRun(indexed.ownerTeamRunId);
      assertOpen();
      if (indexed.kind === "agent") {
        await host.restoreTaskAgent({
          address: indexed.address,
          agentRunId: indexed.agentRunId,
          platformAgentRunId: indexed.source.platformAgentRunId,
          sourceNode: this.sources.requireAgent(indexed.address, indexed.source.source),
        });
        assertOpen();
        continue;
      }
      const source = this.sources.requireTeam(indexed.address, indexed.source.source);
      const run = await host.restoreTaskTeam({ assertOpen,
        handoffs: source.handoffs,
        teamNode: restoreTaskTeamNode({ source: source.node, execution: indexed.source }),
      });
      assertOpen();
      this.options.teamRunResolver.registerManaged(run);
      assertOpen();
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
    retainWork(work: CommittedTaskExecution): void;
  }): Promise<TaskExecutionActivationCommitResult> {
    let nextTreeAtCommit: TeamRunExecutionTreeSnapshot | null = null;
    const result = await this.options.commitTaskActivation({
      prepareAgainstCurrent: () => {
        const expectedHostTeamRunId = this.copyHostTeamRunId(input.input.identity.agentRunId, input.input.placement.address);
        if (expectedHostTeamRunId !== input.hostTeamRunId) throw new Error("Task host changed before activation commit.");
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
          this.options.replaceTree(nextTreeAtCommit);
          input.reservation?.commit();
          this.options.publish(taskExecutionStartedEvent({
            taskExecution: input.prepared.binding.kind === "agent"
              ? Object.freeze({ agentRunId: input.prepared.binding.agentRunId })
              : Object.freeze({ teamRunId: input.prepared.binding.teamRunId }),
            parentTeamRunId: input.hostTeamRunId,
          }));
          const committed = input.prepared.commitAfterDurability();
        input.retainWork(committed);
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
