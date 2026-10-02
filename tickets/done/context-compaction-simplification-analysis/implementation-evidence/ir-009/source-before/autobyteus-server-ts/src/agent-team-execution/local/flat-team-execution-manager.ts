import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import type { AgentRunInputOptions, AgentRunInputReservationResult } from "../../agent-execution/input/agent-run-input-contract.js";
import { createTeamAgentExecutionBinding } from "../domain/team-agent-execution-binding.js";
import {
  createCollaborationMemberExecutionIdentity,
} from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { createTeamAgentStatusDetails, createTeamAgentStatusSnapshot, type TeamAgentStatusSnapshot } from "../domain/team-agent-status.js";
import type { PrepareTaskAgentInput, RestoreTaskAgentInput } from "../domain/task-agent-execution.js";
import type { PrepareTaskTeamInput, RestoreTaskTeamInput } from "../domain/task-team-execution.js";
import type { TeamRun } from "../domain/team-run.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import type { PreparedTaskExecution } from "../domain/prepared-task-execution.js";
import type { PreparedLocalExecutionTermination } from "../../agent-collaboration/execution/domain/prepared-local-execution-termination.js";
import type { TeamMemberExecutionCommand } from "../domain/team-member-execution-command.js";
import type { TeamRunContext } from "../domain/team-run-context.js";
import { FlatAgentExecutionContext, FlatTeamExecutionContext, type ConfiguredMemberActivationMode } from "./flat-team-execution-context.js";
import type { TeamRunAgentNode } from "../domain/team-run-config.js";
import { CollaboratorTeamExecutionRegistry, type PreparedCollaboratorTeam } from "./registries/collaborator-team-execution-registry.js";
import { TaskTeamExecutionFactory } from "./task-team-execution-factory.js";
import { ConfiguredAgentExecutionRegistry } from "./registries/configured-agent-execution-registry.js";
import { FlatTeamAgentExecutionHandle } from "./flat-team-agent-execution-handle.js";
import { TaskAgentExecutionRegistry } from "./registries/task-agent-execution-registry.js";
import { TaskTeamExecutionRegistry } from "./registries/task-team-execution-registry.js";
import { FlatTeamMemberConfigResolver } from "./registries/flat-team-member-config-resolver.js";
import type { FrozenTeamRunTerminationScope } from "../domain/frozen-team-run-termination-scope.js";
import type { RootedAgentMemoryLocator } from "../../agent-collaboration/execution/services/rooted-agent-memory-locator.js";
import type { AgentConversationActivityInspector } from "../../agent-memory/services/agent-conversation-activity-inspector.js";
import type { WorkspaceManager } from "../../workspaces/workspace-manager.js";
import type { FlatTeamExecutionCallbacks } from "./flat-team-execution-callbacks.js";

/** Provider/local mechanics for exactly one concrete TeamRun. */
export class FlatTeamExecutionManager {
  private lifecycle: "active" | "quiescing" | "terminating" | "terminated" = "active";
  private preparingTermination: Promise<PreparedLocalExecutionTermination> | null = null;
  private preparedTermination: PreparedLocalExecutionTermination | null = null;
  private termination: Promise<AgentOperationResult> | null = null;
  private frozenTerminationScope: FrozenTeamRunTerminationScope | null = null;
  private readonly configured: ConfiguredAgentExecutionRegistry;
  private readonly taskAgents: TaskAgentExecutionRegistry;
  private readonly taskTeams: TaskTeamExecutionRegistry;
  private readonly configResolver: FlatTeamMemberConfigResolver;
  private readonly collaboratorTeams: CollaboratorTeamExecutionRegistry;

  constructor(
    private readonly context: TeamRunContext<FlatTeamExecutionContext>,
    options: {
      subTeamRunFactory: TaskTeamExecutionFactory;
      agentRunManager?: AgentRunManager;
      memoryLocator?: RootedAgentMemoryLocator;
      activityInspector?: AgentConversationActivityInspector;
      workspaceManager?: Pick<WorkspaceManager, "ensureWorkspaceByRootPath">;
      callbacks: FlatTeamExecutionCallbacks;
    },
  ) {
    this.configResolver = new FlatTeamMemberConfigResolver(context);
    this.configured = new ConfiguredAgentExecutionRegistry({
      teamContext: context,
      configResolver: this.configResolver,
      agentRunManager: options.agentRunManager,
      memoryLocator: options.memoryLocator,
      activityInspector: options.activityInspector,
      workspaceManager: options.workspaceManager,
      callbacks: options.callbacks,
    });
    this.taskAgents = new TaskAgentExecutionRegistry({
      teamContext: context,
      agentRunManager: options.agentRunManager,
      memoryLocator: options.memoryLocator,
      activityInspector: options.activityInspector,
      workspaceManager: options.workspaceManager,
      callbacks: options.callbacks,
    });
    this.taskTeams = new TaskTeamExecutionRegistry({
      teamContext: context,
      subTeamRunFactory: options.subTeamRunFactory,
    });
    this.collaboratorTeams = new CollaboratorTeamExecutionRegistry({
      teamContext: context,
      subTeamRunFactory: options.subTeamRunFactory,
    });
  }

  /**
   * Adds a collaborator Agent as a direct Agent of this TeamRun (Team root): its context joins
   * `memberContexts` (routing, status) and its node the config resolver. The handle starts
   * lazily on the first message. `commit` runs after the tree write is durable.
   */
  prepareCollaboratorAgent(node: TeamRunAgentNode, mode: ConfiguredMemberActivationMode): Readonly<{ commit(): void }> {
    this.assertActive();
    if (this.context.runtimeContext.memberContexts.some((member) =>
      member.address === node.address || member.agentRunId === node.agentRunId)) {
      throw new Error(`TeamRun '${this.context.teamRunId}' already has an Agent at '${node.address}'.`);
    }
    return Object.freeze({
      commit: () => {
        this.configResolver.addCollaborator(node, mode);
        this.context.runtimeContext.memberContexts.push(new FlatAgentExecutionContext({
          address: node.address,
          agentRunId: node.agentRunId,
          runtimeKind: node.runtimeKind,
          platformAgentRunId: node.platformAgentRunId,
        }));
      },
    });
  }

  /** Prepares a collaborator Team as one TeamRun under this TeamRun (lazy members, no idle shutdown). */
  prepareCollaboratorTeam(input: Parameters<CollaboratorTeamExecutionRegistry["prepare"]>[0]): Promise<PreparedCollaboratorTeam> {
    this.assertActive();
    return this.collaboratorTeams.prepare(input);
  }

  requireCollaboratorTeam(teamRunId: string): TeamRun {
    const run = this.collaboratorTeams.get(teamRunId);
    if (!run) throw new Error(`Collaborator TeamRun '${teamRunId}' is not active in TeamRun '${this.context.teamRunId}'.`);
    return run;
  }


  async prepareConfiguredActivation(): Promise<Readonly<{
    stagedPlatformBindings: readonly import("../../agent-collaboration/execution/domain/collaboration-agent-platform-binding.js").CollaborationAgentPlatformBinding[];
    stagedNoConversationBindingReplacements: readonly import("../../agent-collaboration/execution/domain/collaboration-agent-platform-binding.js").CollaborationAgentNoConversationBindingReplacement[];
    commitAfterDurability(): void;
    abort(): Promise<void>;
  }>> {
    this.assertActive();
    const prepared: Array<Awaited<ReturnType<FlatTeamAgentExecutionHandle["prepareConfiguredActivation"]>>> = [];
    try {
      for (const member of this.context.runtimeContext.memberContexts) {
        const handle = this.configured.getOrCreate(member);
        prepared.push(await handle.prepareConfiguredActivation());
      }
    } catch (error) {
      for (const activation of [...prepared].reverse()) await activation.abort().catch(() => undefined);
      throw error;
    }
    let state: "prepared" | "committed" | "aborted" = "prepared";
    return Object.freeze({
      stagedPlatformBindings: Object.freeze(prepared.flatMap((activation) => activation.stagedPlatformBindings)),
      stagedNoConversationBindingReplacements: Object.freeze(
        prepared.flatMap((activation) => activation.stagedNoConversationBindingReplacements),
      ),
      commitAfterDurability: () => {
        if (state !== "prepared") throw new Error(`TeamRun '${this.context.teamRunId}' configured activation is not publishable.`);
        for (const activation of prepared) activation.commitAfterDurability();
        state = "committed";
      },
      abort: async () => {
        if (state !== "prepared") return;
        state = "aborted";
        for (const activation of [...prepared].reverse()) await activation.abort();
      },
    });
  }

  isActive(): boolean { return this.lifecycle === "active" || this.lifecycle === "quiescing"; }
  isTerminated(): boolean { return this.lifecycle === "terminated"; }

  getInputStateSnapshots() {
    if (!this.isActive()) return [];
    return [...this.configured.listHandles().flatMap(handle => handle.getInputStateSnapshots()),
      ...this.taskAgents.getInputStateSnapshots(),
      ...this.taskTeams.listTeamRuns().flatMap(run => run.getInputStateSnapshots())];
  }
  getLeafAgentStatusSnapshots(): TeamAgentStatusSnapshot[] {
    if (!this.isActive()) return [];
    const handles = new Map(this.configured.listHandles().map((handle) => [handle.context.address, handle]));
    const configured = this.context.runtimeContext.memberContexts.flatMap((member) => {
      const handle = handles.get(member.address);
      if (handle) return handle.getLeafAgentStatusSnapshots();
      return [this.offline(member.address, member.agentRunId)];
    });
    return [
      ...configured,
      ...this.taskAgents.getLeafAgentStatusSnapshots(),
      ...this.taskTeams.listTeamRuns().flatMap((run) => run.getLeafAgentStatusSnapshots()),
      ...this.collaboratorTeams.list().flatMap((run) => run.getLeafAgentStatusSnapshots()),
    ];
  }

  hasOpenExecutionWork(): boolean {
    return this.configured.listHandles().some((handle) => handle.hasOpenExecutionWork()) ||
      this.taskAgents.hasRunningWork() ||
      this.taskTeams.hasRunningWork() ||
      this.collaboratorTeams.hasOpenExecutionWork();
  }

  reserveDirectAgentInput(
    agentRunId: string,
    message: AgentInputUserMessage,
    options: AgentRunInputOptions = {},
  ): Promise<AgentRunInputReservationResult> {
    this.assertActive();
    const task = this.taskAgents.get(agentRunId);
    if (task) return task.reserveInput(message, options);
    const handle = this.getConfiguredAgent(agentRunId);
    if (!handle) return Promise.resolve({
      reserved: false,
      code: "AGENT_RUN_NOT_ACCEPTING_INPUT",
      message: `AgentRun '${agentRunId}' is not a direct execution of TeamRun '${this.context.teamRunId}'.`,
    });
    return handle.reserveInput(message, options);
  }

  async deliverToDirectAgent(agentRunId: string, message: AgentInputUserMessage): Promise<AgentOperationResult> {
    this.assertActive();
    const task = this.taskAgents.get(agentRunId);
    if (task) return task.postMessage(message);
    const handle = this.getConfiguredAgent(agentRunId);
    return handle
      ? handle.postMessage(message)
      : { accepted: false, code: "RUN_NOT_FOUND", message: `AgentRun '${agentRunId}' is not direct to TeamRun '${this.context.teamRunId}'.` };
  }

  async executeDirectAgentCommand(agentRunId: string, command: TeamMemberExecutionCommand): Promise<AgentOperationResult> {
    this.assertActive();
    if (this.taskAgents.get(agentRunId)) return this.taskAgents.executeCommand(agentRunId, command);
    const handle = this.getConfiguredAgent(agentRunId);
    if (!handle) return { accepted: false, code: "RUN_NOT_FOUND", message: `AgentRun '${agentRunId}' is not direct to TeamRun '${this.context.teamRunId}'.` };
    switch (command.kind) {
      case "post_message": return handle.postMessage(command.message);
      case "approve_tool": return handle.approveToolInvocation(command.invocationId, command.approved, command.reason);
      case "interrupt": return handle.interrupt();
    }
  }

  prepareTaskAgent(input: PrepareTaskAgentInput): Promise<PreparedTaskExecution> {
    this.assertActive();
    return this.taskAgents.prepare(input);
  }

  prepareTaskTeam(input: PrepareTaskTeamInput): Promise<PreparedTaskExecution> {
    this.assertActive();
    return this.taskTeams.prepare(input);
  }

  restoreTaskAgent(input: RestoreTaskAgentInput): Promise<void> {
    this.assertActive();
    return this.taskAgents.restore(input);
  }

  restoreTaskTeam(input: RestoreTaskTeamInput): Promise<TeamRun> {
    this.assertActive();
    return this.taskTeams.restore(input);
  }

  hasLiveDirectTaskExecution(reference: TaskExecutionReference): boolean {
    if (!this.isActive()) return false;
    return "agentRunId" in reference
      ? this.taskAgents.isLive(reference.agentRunId)
      : this.taskTeams.get(reference.teamRunId)?.isActive() ?? false;
  }

  tryShutDownDirectTaskExecutionIfQuiet(reference: TaskExecutionReference): Promise<boolean> {
    this.assertActive();
    return "agentRunId" in reference
      ? this.taskAgents.tryShutDownIfQuiet(reference.agentRunId)
      : this.taskTeams.tryShutDownIfQuiet(reference.teamRunId);
  }

  prepareTermination(): Promise<PreparedLocalExecutionTermination> {
    if (this.preparedTermination) return Promise.resolve(this.preparedTermination);
    if (this.preparingTermination) return this.preparingTermination;
    const preparation = this.prepareTerminationOnce();
    this.preparingTermination = preparation;
    void preparation.finally(() => {
      if (this.preparingTermination === preparation) this.preparingTermination = null;
    }).catch(() => undefined);
    return preparation;
  }

  async tryPrepareTerminationIfQuiescent(): Promise<PreparedLocalExecutionTermination | null> {
    if (this.preparedTermination) return this.preparedTermination;
    if (this.preparingTermination || this.lifecycle !== "active") return null;
    this.lifecycle = "quiescing";
    const locals: PreparedLocalExecutionTermination[] = [];
    try {
      for (const handle of this.taskAgents.listHandles()) {
        const local = await handle.tryPrepareTerminationIfQuiescent();
        if (!local) return this.cancelDeferredPreparation(locals);
        locals.push(local);
      }
      for (const handle of this.taskAgents.listPreparedHandles()) {
        const local = await handle.tryPrepareTerminationIfQuiescent();
        if (!local) return this.cancelDeferredPreparation(locals);
        locals.push(local);
      }
      for (const run of this.taskTeams.listTeamRuns()) {
        const local = await run.tryPrepareTerminationIfQuiescent();
        if (!local) return this.cancelDeferredPreparation(locals);
        locals.push(local);
      }
      for (const run of [...this.taskTeams.listPreparedTeamRuns(), ...this.collaboratorTeams.list()]) {
        const local = await run.tryPrepareTerminationIfQuiescent();
        if (!local) return this.cancelDeferredPreparation(locals);
        locals.push(local);
      }
      for (const handle of [...this.configured.listHandles()].reverse()) {
        const local = await handle.tryPrepareTerminationIfQuiescent();
        if (!local) return this.cancelDeferredPreparation(locals);
        locals.push(local);
      }
      return this.createPreparedTermination(locals);
    } catch (error) {
      this.cancelDeferredPreparation(locals);
      throw error;
    }
  }

  freezeForRootTermination(): FrozenTeamRunTerminationScope {
    if (this.frozenTerminationScope) return this.frozenTerminationScope;
    this.configured.freezeMaterialization();
    this.taskAgents.freezeMaterialization();
    this.taskTeams.freezeMaterialization();
    this.collaboratorTeams.freezeMaterialization();

    const agentHandles = [...new Set([
      ...this.configured.listHandles().filter((handle): handle is FlatTeamAgentExecutionHandle =>
        handle instanceof FlatTeamAgentExecutionHandle),
      ...this.taskAgents.listHandles(),
      ...this.taskAgents.listPreparedHandles(),
    ])];
    const childRuns = [...new Set([
      ...this.taskTeams.listTeamRuns(),
      ...this.taskTeams.listPreparedTeamRuns(),
      ...this.collaboratorTeams.list(),
    ])];
    const childScopes = childRuns.map((run) => run.freezeForRootTermination());
    this.frozenTerminationScope = this.createFrozenTerminationScope(agentHandles, childScopes);
    return this.frozenTerminationScope;
  }

  async terminate(): Promise<AgentOperationResult> {
    if (this.lifecycle === "terminated") return Promise.resolve({ accepted: true });
    if (this.termination) return this.termination;
    const prepared = await this.prepareTermination();
    return prepared.commit().finish();
  }

  private async prepareTerminationOnce(): Promise<PreparedLocalExecutionTermination> {
    if (this.lifecycle === "terminated") return this.completedTerminationPreparation();
    if (this.lifecycle !== "active") {
      throw new Error(`TeamRun '${this.context.teamRunId}' termination preparation is unavailable.`);
    }
    this.lifecycle = "quiescing";
    const locals: PreparedLocalExecutionTermination[] = [];
    try {
      for (const handle of this.taskAgents.listHandles()) {
        locals.push(await handle.prepareTermination());
      }
      for (const handle of this.taskAgents.listPreparedHandles()) {
        locals.push(await handle.prepareTermination());
      }
      for (const run of this.taskTeams.listTeamRuns()) {
        locals.push(await run.prepareTermination());
      }
      for (const run of [...this.taskTeams.listPreparedTeamRuns(), ...this.collaboratorTeams.list()]) {
        locals.push(await run.prepareTermination());
      }
      for (const handle of [...this.configured.listHandles()].reverse()) {
        locals.push(await handle.prepareTermination());
      }
    } catch (error) {
      [...locals].reverse().forEach((local) => local.cancel());
      this.lifecycle = "active";
      throw error;
    }

    return this.createPreparedTermination(locals);
  }

  private createPreparedTermination(
    locals: readonly PreparedLocalExecutionTermination[],
  ): PreparedLocalExecutionTermination {
    let state: "prepared" | "cancelled" | "committed" = "prepared";
    let committed: ReturnType<PreparedLocalExecutionTermination["commit"]> | null = null;
    const prepared: PreparedLocalExecutionTermination = Object.freeze({
      cancel: () => {
        if (state !== "prepared") return;
        state = "cancelled";
        [...locals].reverse().forEach((local) => local.cancel());
        this.lifecycle = "active";
        if (this.preparedTermination === prepared) this.preparedTermination = null;
      },
      commit: () => {
        if (state === "cancelled") throw new Error(`TeamRun '${this.context.teamRunId}' termination preparation was cancelled.`);
        if (committed) return committed;
        state = "committed";
        this.lifecycle = "terminating";
        const localCommits = locals.map((local) => local.commit());
        committed = Object.freeze({ finish: () => this.finishCommittedTermination(localCommits) });
        return committed;
      },
    });
    this.preparedTermination = prepared;
    return prepared;
  }

  private cancelDeferredPreparation(
    locals: readonly PreparedLocalExecutionTermination[],
  ): null {
    [...locals].reverse().forEach((local) => local.cancel());
    this.lifecycle = "active";
    return null;
  }

  private finishCommittedTermination(
    localCommits: readonly ReturnType<PreparedLocalExecutionTermination["commit"]>[],
  ): Promise<AgentOperationResult> {
    if (this.termination) return this.termination;
    const termination = this.finishCommittedTerminationOnce(localCommits);
    this.termination = termination;
    void termination.then((result) => {
      if (!result.accepted && this.termination === termination) this.termination = null;
    }, () => {
      if (this.termination === termination) this.termination = null;
    });
    return termination;
  }

  private async finishCommittedTerminationOnce(
    localCommits: readonly ReturnType<PreparedLocalExecutionTermination["commit"]>[],
  ): Promise<AgentOperationResult> {
    for (const local of localCommits) {
      const result = await local.finish();
      if (!result.accepted) return result;
    }
    this.configured.dispose();
    this.taskAgents.dispose();
    this.taskTeams.dispose();
    this.collaboratorTeams.dispose();
    this.lifecycle = "terminated";
    return { accepted: true };
  }

  private completedTerminationPreparation(): PreparedLocalExecutionTermination {
    return Object.freeze({
      cancel: () => undefined,
      commit: () => Object.freeze({ finish: async () => ({ accepted: true as const }) }),
    });
  }

  private createFrozenTerminationScope(
    agentHandles: readonly FlatTeamAgentExecutionHandle[],
    childScopes: readonly FrozenTeamRunTerminationScope[],
  ): FrozenTeamRunTerminationScope {
    let fencing: Promise<AgentOperationResult> | null = null;
    let finishing: Promise<AgentOperationResult> | null = null;

    const fenceOnce = async (): Promise<AgentOperationResult> => {
      const results = await Promise.all([
        ...agentHandles.map((handle) => handle.fenceForRootShutdown()),
        ...childScopes.map((scope) => scope.fenceAgentRunsForRootShutdown()),
      ]);
      return results.find((result) => !result.accepted) ?? { accepted: true };
    };

    const finishOnce = async (): Promise<AgentOperationResult> => {
      for (const scope of childScopes) {
        const result = await scope.finish();
        if (!result.accepted) return result;
      }
      for (const handle of [...agentHandles].reverse()) {
        const result = await handle.terminate();
        if (!result.accepted) return result;
      }
      this.completeFrozenTermination();
      return { accepted: true };
    };

    return Object.freeze({
      fenceAgentRunsForRootShutdown: () => {
        if (fencing) return fencing;
        const attempt = fenceOnce();
        fencing = attempt;
        void attempt.then((result) => {
          if (!result.accepted && fencing === attempt) fencing = null;
        }, () => {
          if (fencing === attempt) fencing = null;
        });
        return attempt;
      },
      finish: () => {
        if (this.lifecycle === "terminated") return Promise.resolve({ accepted: true });
        if (finishing) return finishing;
        const attempt = finishOnce();
        finishing = attempt;
        void attempt.then((result) => {
          if (!result.accepted && finishing === attempt) finishing = null;
        }, () => {
          if (finishing === attempt) finishing = null;
        });
        return attempt;
      },
    });
  }

  private completeFrozenTermination(): void {
    if (this.lifecycle === "terminated") return;
    this.configured.dispose();
    this.taskAgents.dispose();
    this.taskTeams.dispose();
    this.collaboratorTeams.dispose();
    this.lifecycle = "terminated";
  }

  private getConfiguredAgent(agentRunId: string): FlatTeamAgentExecutionHandle | null {
    const member = this.context.runtimeContext.memberContexts.find((candidate) =>
      candidate.kind === "agent" && candidate.agentRunId === agentRunId,
    );
    if (!member || member.kind !== "agent") return null;
    const handle = this.configured.getOrCreate(member);
    return handle instanceof FlatTeamAgentExecutionHandle ? handle : null;
  }

  private offline(address: import("../../agent-collaboration/domain/agent-team-address.js").AgentTeamAddress, agentRunId: string) {
    return createTeamAgentStatusSnapshot({
      execution: createTeamAgentExecutionBinding(createCollaborationMemberExecutionIdentity({
        root: this.context.rootIdentity,
        memberAddress: address,
        agentRunId,
      })),
      details: createTeamAgentStatusDetails({ status: "offline" }),
    });
  }

  private assertActive(): void {
    if (this.lifecycle !== "active") throw new Error(`TeamRun '${this.context.teamRunId}' is not active.`);
  }
}
