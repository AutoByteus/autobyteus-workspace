import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import type { AgentRunManager } from "../../../agent-execution/services/agent-run-manager.js";
import type { AgentRunInputOptions, AgentRunInputReservationResult } from "../../../agent-execution/input/agent-run-input-contract.js";
import { createTeamAgentExecutionBinding } from "../../domain/team-agent-execution-binding.js";
import { createTeamMemberExecutionIdentity } from "../../domain/team-member-execution-identity.js";
import { createTeamAgentStatusDetails, createTeamAgentStatusSnapshot, type TeamAgentStatusSnapshot } from "../../domain/team-agent-status.js";
import type { PrepareTaskAgentInput } from "../../domain/task-agent-execution.js";
import type { PrepareTaskTeamInput } from "../../domain/task-team-execution.js";
import type { PreparedTaskExecution } from "../../domain/prepared-task-execution.js";
import type { PreparedLocalExecutionTermination } from "../../domain/prepared-local-execution-termination.js";
import type { PreparedTaskSettlement } from "../../domain/prepared-task-settlement.js";
import type { TeamMemberExecutionCommand } from "../../domain/team-member-execution-command.js";
import type { TeamRunContext } from "../../domain/team-run-context.js";
import type { InterAgentMessageDeliveryIntent } from "../../domain/inter-agent-message-delivery.js";
import type { TeamRunEvent } from "../../domain/team-run-event.js";
import { MixedTeamRunContext } from "./mixed-team-run-context.js";
import { MixedSubTeamRunFactory } from "./mixed-sub-team-run-factory.js";
import { MixedConfiguredMemberRegistry } from "./members/mixed-configured-member-registry.js";
import { MixedAgentMemberHandle } from "./members/mixed-agent-member-handle.js";
import { MixedSubTeamMemberHandle } from "./members/mixed-sub-team-member-handle.js";
import { MixedTaskAgentExecutionRegistry } from "./members/mixed-task-agent-execution-registry.js";
import { MixedTaskTeamExecutionRegistry } from "./members/mixed-task-team-execution-registry.js";
import { MixedTeamMemberConfigResolver } from "./members/mixed-team-member-config-resolver.js";
import type { TeamAgentPlatformBinding } from "../../domain/team-agent-platform-binding.js";
import type { FrozenTeamRunTerminationScope } from "../../domain/frozen-team-run-termination-scope.js";

/** Provider/local mechanics for exactly one concrete TeamRun. */
export class MixedTeamManager {
  private lifecycle: "active" | "quiescing" | "terminating" | "terminated" = "active";
  private preparingTermination: Promise<PreparedLocalExecutionTermination> | null = null;
  private preparedTermination: PreparedLocalExecutionTermination | null = null;
  private termination: Promise<AgentOperationResult> | null = null;
  private frozenTerminationScope: FrozenTeamRunTerminationScope | null = null;
  private readonly configured: MixedConfiguredMemberRegistry;
  private readonly taskAgents: MixedTaskAgentExecutionRegistry;
  private readonly taskTeams: MixedTaskTeamExecutionRegistry;

  constructor(
    private readonly context: TeamRunContext<MixedTeamRunContext>,
    options: {
      subTeamRunFactory: MixedSubTeamRunFactory;
      agentRunManager?: AgentRunManager;
      publish: (event: TeamRunEvent) => void;
      deliverInterAgentMessage: (intent: InterAgentMessageDeliveryIntent) => Promise<AgentOperationResult>;
      acceptPlatformBinding: (binding: TeamAgentPlatformBinding) => Promise<void>;
    },
  ) {
    this.configured = new MixedConfiguredMemberRegistry({
      teamContext: context,
      configResolver: new MixedTeamMemberConfigResolver(context),
      subTeamRunFactory: options.subTeamRunFactory,
      agentRunManager: options.agentRunManager,
      publish: options.publish,
      deliverInterAgentMessage: options.deliverInterAgentMessage,
      acceptPlatformBinding: options.acceptPlatformBinding,
    });
    this.taskAgents = new MixedTaskAgentExecutionRegistry({
      teamContext: context,
      agentRunManager: options.agentRunManager,
      publish: options.publish,
      deliverInterAgentMessage: options.deliverInterAgentMessage,
      acceptPlatformBinding: options.acceptPlatformBinding,
    });
    this.taskTeams = new MixedTaskTeamExecutionRegistry({
      teamContext: context,
      subTeamRunFactory: options.subTeamRunFactory,
    });
  }

  isActive(): boolean { return this.lifecycle === "active" || this.lifecycle === "quiescing"; }
  isTerminated(): boolean { return this.lifecycle === "terminated"; }

  getLeafAgentStatusSnapshots(): TeamAgentStatusSnapshot[] {
    if (!this.isActive()) return [];
    const handles = new Map(this.configured.listHandles().map((handle) => [handle.context.address, handle]));
    const configured = this.context.runtimeContext.memberContexts.flatMap((member) => {
      const handle = handles.get(member.address);
      if (handle) return handle.getLeafAgentStatusSnapshots();
      if (member.kind === "agent") return [this.offline(member.address, member.agentRunId)];
      return this.offlineConfiguredTeam(member.address);
    });
    return [
      ...configured,
      ...this.taskAgents.listHandles().flatMap((handle) => handle.getLeafAgentStatusSnapshots()),
      ...this.taskTeams.listTeamRuns().flatMap((run) => run.getLeafAgentStatusSnapshots()),
    ];
  }

  hasOpenExecutionWork(): boolean {
    return this.configured.listHandles().some((handle) => handle.hasOpenExecutionWork()) ||
      this.taskAgents.listHandles().some((handle) => handle.hasOpenExecutionWork()) ||
      this.taskTeams.listTeamRuns().some((run) => run.hasOpenExecutionWork());
  }

  async getOrCreateConfiguredChildTeam(teamRunId: string) {
    this.assertActive();
    const member = this.context.runtimeContext.memberContexts.find((candidate) =>
      candidate.kind === "agent_team" && candidate.teamRunId === teamRunId,
    );
    if (!member || member.kind !== "agent_team") {
      throw new Error(`TeamRun '${teamRunId}' is not a direct configured child of '${this.context.teamRunId}'.`);
    }
    const handle = this.configured.getOrCreate(member);
    if (!(handle instanceof MixedSubTeamMemberHandle)) throw new Error(`TeamRun '${teamRunId}' has an invalid local handle.`);
    return handle.getOrCreateTeamRun();
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

  prepareDirectTaskSettlement(
    taskId: string,
    binding: { agentRunId: string } | { teamRunId: string },
  ): Promise<PreparedTaskSettlement | null> {
    this.assertActive();
    return "agentRunId" in binding
      ? this.taskAgents.prepareSettlement(taskId, binding.agentRunId)
      : this.taskTeams.prepareSettlement(taskId, binding.teamRunId);
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

  freezeForRootTermination(): FrozenTeamRunTerminationScope {
    if (this.frozenTerminationScope) return this.frozenTerminationScope;
    this.configured.freezeMaterialization();
    this.taskAgents.freezeMaterialization();
    this.taskTeams.freezeMaterialization();

    const agentHandles = [...new Set([
      ...this.configured.listHandles().filter((handle): handle is MixedAgentMemberHandle =>
        handle instanceof MixedAgentMemberHandle),
      ...this.taskAgents.listHandles(),
      ...this.taskAgents.listPreparedHandles(),
    ])];
    const configuredChildRuns = this.configured.listHandles()
      .filter((handle): handle is MixedSubTeamMemberHandle => handle instanceof MixedSubTeamMemberHandle)
      .map((handle) => handle.getMaterializedTeamRun())
      .filter((run): run is NonNullable<typeof run> => run !== null);
    const childRuns = [...new Set([
      ...configuredChildRuns,
      ...this.taskTeams.listTeamRuns(),
      ...this.taskTeams.listPreparedTeamRuns(),
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
      for (const run of this.taskTeams.listPreparedTeamRuns()) {
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
    agentHandles: readonly MixedAgentMemberHandle[],
    childScopes: readonly FrozenTeamRunTerminationScope[],
  ): FrozenTeamRunTerminationScope {
    let prepared: readonly PreparedLocalExecutionTermination[] | null = null;
    let preparing: Promise<void> | null = null;
    let finishing: Promise<AgentOperationResult> | null = null;

    const prepareMemberRuns = (): Promise<void> => {
      if (prepared) return Promise.resolve();
      if (preparing) return preparing;
      const attempt = Promise.all([
        ...agentHandles.map((handle) => handle.prepareTermination()),
        ...childScopes.map(async (scope) => { await scope.prepareMemberRuns(); return null; }),
      ]).then((results) => {
        prepared = Object.freeze(results.filter((item): item is PreparedLocalExecutionTermination => item !== null));
      });
      preparing = attempt;
      void attempt.finally(() => {
        if (preparing === attempt) preparing = null;
      }).catch(() => undefined);
      return attempt;
    };

    const finishOnce = async (): Promise<AgentOperationResult> => {
      await prepareMemberRuns();
      for (const scope of childScopes) {
        const result = await scope.finish();
        if (!result.accepted) return result;
      }
      for (const local of prepared ?? []) {
        const result = await local.commit().finish();
        if (!result.accepted) return result;
      }
      this.completeFrozenTermination();
      return { accepted: true };
    };

    return Object.freeze({
      interruptActiveTurns: async () => {
        const results = await Promise.all([
          ...agentHandles.map((handle) => handle.interruptForRootTermination()),
          ...childScopes.map((scope) => scope.interruptActiveTurns()),
        ]);
        return results.find((result) => !result.accepted) ?? { accepted: true };
      },
      prepareMemberRuns,
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
    this.lifecycle = "terminated";
  }

  private getConfiguredAgent(agentRunId: string): MixedAgentMemberHandle | null {
    const member = this.context.runtimeContext.memberContexts.find((candidate) =>
      candidate.kind === "agent" && candidate.agentRunId === agentRunId,
    );
    if (!member || member.kind !== "agent") return null;
    const handle = this.configured.getOrCreate(member);
    return handle instanceof MixedAgentMemberHandle ? handle : null;
  }

  private offline(address: import("../../../agent-collaboration/domain/agent-team-address.js").AgentTeamAddress, agentRunId: string) {
    return createTeamAgentStatusSnapshot({
      execution: createTeamAgentExecutionBinding(createTeamMemberExecutionIdentity({
        rootTeamRunId: this.context.rootTeamRunId,
        memberAddress: address,
        agentRunId,
      })),
      details: createTeamAgentStatusDetails({ status: "offline" }),
    });
  }

  private offlineConfiguredTeam(address: import("../../../agent-collaboration/domain/agent-team-address.js").AgentTeamAddress) {
    const team = this.context.teamNode.children.find((node) => node.kind === "agent_team" && node.address === address);
    if (!team || team.kind !== "agent_team") return [];
    const result: TeamAgentStatusSnapshot[] = [];
    const visit = (node: import("../../domain/team-run-config.js").TeamRunNode): void => {
      if (node.kind === "agent") result.push(this.offline(node.address, node.agentRunId));
      else node.children.forEach(visit);
    };
    team.children.forEach(visit);
    return result;
  }

  private assertActive(): void {
    if (this.lifecycle !== "active") throw new Error(`TeamRun '${this.context.teamRunId}' is not active.`);
  }
}
