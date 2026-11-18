import { createFrozenRootTerminationScope } from "../../agent-collaboration/execution/backends/frozen-root-termination-scope.js";
import type { FlatTeamExecutionManagerOptions } from "./flat-team-execution-manager-options.js";
import { releaseOwnedFlatTeamRuntime } from "./owned-flat-team-runtime-release.js";
import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { AgentRunInputOptions, AgentRunInputReservationResult } from "../../agent-execution/input/agent-run-input-contract.js";
import { createTeamAgentExecutionBinding } from "../domain/team-agent-execution-binding.js";
import {
  createCollaborationMemberExecutionIdentity,
} from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { createTeamAgentStatusDetails, createTeamAgentStatusSnapshot, type TeamAgentStatusSnapshot } from "../domain/team-agent-status.js";
import type { TeamRun } from "../domain/team-run.js";
import type { PreparedLocalExecutionTermination } from "../../agent-collaboration/execution/domain/prepared-local-execution-termination.js";
import type { TeamMemberExecutionCommand } from "../domain/team-member-execution-command.js";
import type { TeamRunContext } from "../domain/team-run-context.js";
import type { FlatTeamExecutionContext } from "./flat-team-execution-context.js";
import { ConfiguredAgentExecutionRegistry } from "./registries/configured-agent-execution-registry.js";
import { FlatTeamAgentExecutionHandle } from "./flat-team-agent-execution-handle.js";
import { FlatTeamMemberConfigResolver } from "./registries/flat-team-member-config-resolver.js";
import type { FrozenTeamRunTerminationScope } from "../domain/frozen-team-run-termination-scope.js";

/** Provider/local mechanics for exactly one concrete TeamRun. */
export class FlatTeamExecutionManager {
  private lifecycle: "active" | "quiescing" | "terminating" | "terminated" = "active";
  private preparingTermination: Promise<PreparedLocalExecutionTermination> | null = null;
  private preparedTermination: PreparedLocalExecutionTermination | null = null;
  private termination: Promise<AgentOperationResult> | null = null;
  private frozenTerminationScope: FrozenTeamRunTerminationScope | null = null;
  private readonly configured: ConfiguredAgentExecutionRegistry;

  constructor(
    private readonly context: TeamRunContext<FlatTeamExecutionContext>,
    options: FlatTeamExecutionManagerOptions,
  ) {
    const agentMechanics = {
      teamContext: context,
      agentRunManager: options.agentRunManager,
      memoryLocator: options.memoryLocator,
      activityInspector: options.activityInspector,
      workspaceManager: options.workspaceManager,
      executionFactory: options.executionFactory,
      callbacks: options.callbacks,
    };
    this.configured = new ConfiguredAgentExecutionRegistry({
      ...agentMechanics,
      configResolver: new FlatTeamMemberConfigResolver(context),
    });
  }

  cancelPrivateActivation(): void {
    for (const handle of this.configured.listHandles()) handle.cancelActivation();
  }
  async releasePrivateActivation(): Promise<AgentOperationResult> {
    this.cancelPrivateActivation();
    const errors: unknown[] = [];
    let pending = false;
    // Start every independently owned member before awaiting any provider's bounded drain.
    const results = await Promise.allSettled(this.configured.listHandles().map(handle => handle.releaseRuntime()));
    for (const result of results) {
      if (result.status === "rejected") errors.push(result.reason);
      else if (!result.value.accepted) pending = true;
    }
    if (errors.length) throw new AggregateError(errors, "Team private members could not all be released.");
    return pending ? { accepted: false, code: "RUNTIME_RELEASE_PENDING" } : { accepted: true };
  }

  isActive(): boolean { return this.lifecycle === "active" || this.lifecycle === "quiescing"; }
  isTerminated(): boolean { return this.lifecycle === "terminated"; }

  getInputStateSnapshots() {
    if (!this.isActive()) return [];
    return this.configured.listHandles().flatMap(handle => handle.getInputStateSnapshots());
  }
  getLeafAgentStatusSnapshots(): TeamAgentStatusSnapshot[] {
    if (!this.isActive()) return [];
    const handles = new Map(this.configured.listHandles().map((handle) => [handle.context.address, handle]));
    return this.context.runtimeContext.memberContexts.flatMap((member) => {
      const handle = handles.get(member.address);
      if (handle) return handle.getLeafAgentStatusSnapshots();
      return [this.offline(member.address, member.agentRunId)];
    });
  }

  hasOpenExecutionWork(): boolean {
    return this.directAgentHandles().some((handle) => handle.hasOpenExecutionWork());
  }

  reserveDirectAgentInput(
    agentRunId: string,
    message: AgentInputUserMessage,
    options: AgentRunInputOptions = {},
  ): Promise<AgentRunInputReservationResult> {
    this.assertActive();
    const handle = this.getDirectAgent(agentRunId);
    if (!handle) return Promise.resolve({
      reserved: false,
      code: "AGENT_RUN_NOT_ACCEPTING_INPUT",
      message: `AgentRun '${agentRunId}' is not a direct execution of TeamRun '${this.context.teamRunId}'.`,
    });
    return handle.reserveInput(message, options);
  }

  async deliverToDirectAgent(agentRunId: string, message: AgentInputUserMessage): Promise<AgentOperationResult> {
    this.assertActive();
    const handle = this.getDirectAgent(agentRunId);
    return handle
      ? handle.postMessage(message)
      : { accepted: false, code: "RUN_NOT_FOUND", message: `AgentRun '${agentRunId}' is not direct to TeamRun '${this.context.teamRunId}'.` };
  }

  async executeDirectAgentCommand(agentRunId: string, command: TeamMemberExecutionCommand): Promise<AgentOperationResult> {
    this.assertActive();
    const handle = this.getDirectAgent(agentRunId);
    if (!handle) return { accepted: false, code: "RUN_NOT_FOUND", message: `AgentRun '${agentRunId}' is not direct to TeamRun '${this.context.teamRunId}'.` };
    switch (command.kind) {
      case "post_message": return handle.postMessage(command.message, command.postOptions);
      case "approve_tool": return handle.approveToolInvocation(command.invocationId, command.approved, command.reason);
      case "interrupt": return handle.interrupt();
    }
  }

  /** The caller owns this entire stamped assembly; not the outer root or a borrowed host. */
  cancelRuntimeActivation(): void {
    this.configured.listHandles().forEach(handle => handle.cancelActivation());
  }
  async releaseOwnedRuntime(): Promise<AgentOperationResult> {
    if (this.lifecycle === "terminated") return { accepted: true };
    this.cancelRuntimeActivation();
    this.lifecycle = "terminating";
    const releases = this.configured.listHandles().map(handle => () => handle.releaseRuntime());
    return releaseOwnedFlatTeamRuntime({ releases, disposeAfterProof: () => {
      this.configured.dispose();
      this.lifecycle = "terminated";
    } });
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
      for (const handle of [...this.directAgentHandles()].reverse()) {
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
    const agentHandles = this.directAgentHandles().filter((handle): handle is FlatTeamAgentExecutionHandle =>
      handle instanceof FlatTeamAgentExecutionHandle);
    this.frozenTerminationScope = this.createFrozenTerminationScope(agentHandles);
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
      for (const handle of [...this.directAgentHandles()].reverse()) {
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
    const errors: unknown[] = [];
    let pending: AgentOperationResult | null = null;
    for (const local of localCommits) {
      try { const result = await local.finish(); if (!result.accepted) pending = result; }
      catch (error) { errors.push(error); }
    }
    if (errors.length) throw new AggregateError(errors, "Team exact member release failed.");
    if (pending) return pending;
    this.configured.dispose();
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
  ): FrozenTeamRunTerminationScope {
    return createFrozenRootTerminationScope({ agentHandles, teamScopes: [],
      onReleased: () => this.completeFrozenTermination() });
  }

  private completeFrozenTermination(): void {
    if (this.lifecycle === "terminated") return;
    this.configured.dispose();
    this.lifecycle = "terminated";
  }

  /** The configured members' handles. */
  private directAgentHandles(): FlatTeamAgentExecutionHandle[] {
    return [...this.configured.listHandles()];
  }

  /** A configured member's handle; null for any other AgentRun. */
  private getDirectAgent(agentRunId: string): FlatTeamAgentExecutionHandle | null {
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
      details: createTeamAgentStatusDetails({ status: "offline", backgroundTasksRunning: 0 }),
    });
  }

  private assertActive(): void {
    if (this.lifecycle !== "active") throw new Error(`TeamRun '${this.context.teamRunId}' is not active.`);
  }
}
