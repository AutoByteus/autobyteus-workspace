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
import type { TeamMemberSwitchControl } from "../backends/team-run-backend.js";
import type { AgentRun } from "../../agent-execution/domain/agent-run.js";

/** How long a leaving member that was not quiet waits before it is asked again. */
const LEAVE_RETRY_MS = 1000;

/** Provider/local mechanics for exactly one concrete TeamRun. */
export class FlatTeamExecutionManager {
  private lifecycle: "active" | "quiescing" | "terminating" | "terminated" = "active";
  private preparingTermination: Promise<PreparedLocalExecutionTermination> | null = null;
  private preparedTermination: PreparedLocalExecutionTermination | null = null;
  private termination: Promise<AgentOperationResult> | null = null;
  private frozenTerminationScope: FrozenTeamRunTerminationScope | null = null;
  private readonly configured: ConfiguredAgentExecutionRegistry;
  /** Removed members finishing their turn (DS-004): who is told when each one has stopped. */
  private readonly leavingWatch = new Map<string, (agentRunId: string) => void>();
  private readonly retiring = new Set<string>();

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
      // A leaving member is stopped at its next quiet moment: each of its events is a chance, checked once the event is
      // fully applied (its handle settles its status after publishing it).
      callbacks: Object.freeze({ ...options.callbacks, publishAgentEvent: (identity, event) => {
        options.callbacks.publishAgentEvent(identity, event);
        if (this.leavingWatch.has(identity.agentRunId)) queueMicrotask(() => { void this.tryRetire(identity.agentRunId); });
      } }) as FlatTeamExecutionManagerOptions["callbacks"],
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
    const handles = new Map(this.configured.listHandles().map((handle) => [handle.context.agentRunId, handle]));
    return this.context.membership.memberContexts().flatMap((member) => {
      const handle = handles.get(member.agentRunId);
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

  /** A direct member's agent, made ready without input (activated, restored, or the live run). */
  async ensureDirectAgentReady(agentRunId: string): Promise<AgentRun> {
    this.assertActive();
    const handle = this.getDirectAgent(agentRunId);
    if (!handle) throw new Error(`RUN_NOT_FOUND: AgentRun '${agentRunId}' is not direct to TeamRun '${this.context.teamRunId}'.`);
    return handle.getOrCreateAgentRun();
  }

  /** A direct member's handle as its switch control (autobyteus-646 R-1); null when it is not a direct member. */
  directAgentControl(agentRunId: string): TeamMemberSwitchControl | null {
    this.assertActive();
    return this.getDirectAgent(agentRunId);
  }

  /** The members whose execution is live now (a handle that has not stopped): read under the persistence lock (N-14). */
  liveExecutionIds(): ReadonlySet<string> {
    return new Set(this.configured.listHandles().filter((handle) => !handle.isStopped()).map((handle) => handle.context.agentRunId));
  }

  /**
   * DS-004 (SR-010): each leaving member stops, idle at once, busy at its next quiet moment; its stopped handle stays
   * until `removeStoppedHandle`, and `stopped` is told (the root's release step follows). A member the definition takes
   * back meanwhile is not stopped (its leave is cancelled). Nothing here writes or changes the membership.
   */
  applyMembership(leavingAgentRunIds: readonly string[], stopped: (agentRunId: string) => void): void {
    for (const agentRunId of leavingAgentRunIds) {
      if (!this.context.membership.isLeaving(agentRunId)) continue;
      this.leavingWatch.set(agentRunId, stopped);
      void this.tryRetire(agentRunId);
    }
  }

  /** A stopped member's handle goes (a leaving member after its release write; a former member's left behind). */
  removeStoppedHandle(agentRunId: string): void {
    if (this.configured.find(agentRunId)?.isStopped()) this.configured.remove(agentRunId);
  }

  private async tryRetire(agentRunId: string): Promise<void> {
    const stopped = this.leavingWatch.get(agentRunId);
    if (!stopped || this.retiring.has(agentRunId)) return;
    if (!this.context.membership.isLeaving(agentRunId)) { this.leavingWatch.delete(agentRunId); return; }
    const handle = this.configured.find(agentRunId);
    if (handle?.hasOpenExecutionWork()) return;
    this.retiring.add(agentRunId);
    let done = !handle || handle.isStopped();
    try {
      const prepared = done ? null : await handle!.tryPrepareTerminationIfQuiescent();
      if (prepared && !this.context.membership.isLeaving(agentRunId)) prepared.cancel();
      else if (prepared) done = (await prepared.commit().finish()).accepted;
    } catch (error) {
      console.warn(`TEAM_MEMBER_LEAVE_STOP_FAILED: AgentRun '${agentRunId}' of TeamRun '${this.context.teamRunId}': ${String(error)}`);
    } finally {
      this.retiring.delete(agentRunId);
    }
    if (!this.context.membership.isLeaving(agentRunId)) { this.leavingWatch.delete(agentRunId); return; }
    if (!done) {
      // Not quiet yet (its turn is ending): asked again shortly, besides at its next event; never once the team ends.
      if (this.isActive()) setTimeout(() => { void this.tryRetire(agentRunId); }, LEAVE_RETRY_MS).unref?.();
      return;
    }
    this.leavingWatch.delete(agentRunId);
    stopped(agentRunId);
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

  /** A member's handle (a leaving member's only while it has one: it starts nothing new); null for any other AgentRun. */
  private getDirectAgent(agentRunId: string): FlatTeamAgentExecutionHandle | null {
    const member = this.context.membership.memberContext(agentRunId);
    if (!member) return null;
    if (this.context.membership.isLeaving(agentRunId)) return this.configured.find(agentRunId);
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
