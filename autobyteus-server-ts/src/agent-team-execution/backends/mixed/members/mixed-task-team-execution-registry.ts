import type { PrepareTaskTeamInput } from "../../../domain/task-team-execution.js";
import type { PreparedTaskExecution } from "../../../domain/prepared-task-execution.js";
import type { PreparedTaskSettlement } from "../../../domain/prepared-task-settlement.js";
import type { TeamRun } from "../../../domain/team-run.js";
import type { TeamRunContext } from "../../../domain/team-run-context.js";
import type { TeamRunAgentTeamNode } from "../../../domain/team-run-config.js";
import type { MixedSubTeamRunFactory } from "../mixed-sub-team-run-factory.js";
import type { MixedTeamRunContext } from "../mixed-team-run-context.js";

type PreparedState = "preparing" | "sealed" | "committed" | "aborted";

/** Direct task-Team mechanics for one TeamRun; root task policy stays outside. */
export class MixedTaskTeamExecutionRegistry {
  private readonly active = new Map<string, TeamRun>();
  private readonly reserved = new Set<string>();
  private readonly preparedTeamRuns = new Map<string, TeamRun>();
  private readonly settling = new Set<string>();

  constructor(private readonly options: {
    teamContext: TeamRunContext<MixedTeamRunContext>;
    subTeamRunFactory: MixedSubTeamRunFactory;
  }) {}

  listTeamRuns(): readonly TeamRun[] { return Object.freeze([...this.active.values()]); }
  listPreparedTeamRuns(): readonly TeamRun[] { return Object.freeze([...this.preparedTeamRuns.values()]); }
  get(teamRunId: string): TeamRun | null { return this.active.get(teamRunId) ?? null; }

  async prepare(input: PrepareTaskTeamInput): Promise<PreparedTaskExecution> {
    const teamRunId = input.teamRunId.trim();
    if (!teamRunId || input.address !== input.teamNode.address || input.teamNode.teamRunId !== teamRunId) {
      throw new Error("Task Team preparation requires one exact placement and TeamRun ID.");
    }
    if (this.active.has(teamRunId) || this.reserved.has(teamRunId)) {
      throw new Error(`Task TeamRun '${teamRunId}' is already active or reserved.`);
    }
    this.reserved.add(teamRunId);
    let state: PreparedState = "preparing";
    let root: TeamRun;
    try {
      root = await this.options.subTeamRunFactory.prepareFreshTaskTeam({
        handoffs: input.handoffs,
        rootTeamRunId: this.options.teamContext.rootTeamRunId,
        teamNode: input.teamNode,
      });
      this.preparedTeamRuns.set(teamRunId, root);
    } catch (error) {
      this.reserved.delete(teamRunId);
      throw error;
    }
    let preparedTeamRuns: TeamRun[];
    try {
      preparedTeamRuns = await this.materializeSubtree(root, input.teamNode);
    } catch (error) {
      this.reserved.delete(teamRunId);
      this.preparedTeamRuns.delete(teamRunId);
      await root.terminate();
      throw error;
    }
    const coordinator = input.teamNode.children.find((node) =>
      node.kind === "agent" && node.address === input.teamNode.coordinatorAddress,
    );
    if (!coordinator || coordinator.kind !== "agent") {
      this.reserved.delete(teamRunId);
      this.preparedTeamRuns.delete(teamRunId);
      await root.terminate();
      throw new Error(`Task TeamRun '${teamRunId}' has no exact coordinator binding.`);
    }
    return {
      binding: Object.freeze({
        kind: "team",
        address: input.address,
        teamRunId,
        coordinatorAgentRunId: coordinator.agentRunId,
      }),
      preparedTeamRuns: Object.freeze(preparedTeamRuns),
      stagedPlatformBindings: Object.freeze([]),
      sealForCommit: () => {
        if (state !== "preparing" || !this.reserved.has(teamRunId)) throw new Error(`Task TeamRun '${teamRunId}' cannot be sealed.`);
        state = "sealed";
      },
      commitAfterDurability: () => {
        if (state !== "sealed" || !this.reserved.delete(teamRunId)) throw new Error(`Task TeamRun '${teamRunId}' is not sealed.`);
        this.preparedTeamRuns.delete(teamRunId);
        this.active.set(teamRunId, root);
        state = "committed";
        let released = false;
        return Object.freeze({
          releaseWork: () => {
            if (released) return;
            released = true;
            queueMicrotask(() => { void root.postMessage(input.message, coordinator.agentRunId); });
          },
        });
      },
      abort: async () => {
        if (state === "committed" || state === "aborted") return;
        state = "aborted";
        this.reserved.delete(teamRunId);
        this.preparedTeamRuns.delete(teamRunId);
        await root.terminate();
      },
    };
  }

  async prepareSettlement(taskId: string, teamRunId: string): Promise<PreparedTaskSettlement | null> {
    const run = this.active.get(teamRunId);
    if (!run) return null;
    if (this.settling.has(teamRunId)) throw new Error(`Task TeamRun '${teamRunId}' is already preparing settlement.`);
    this.settling.add(teamRunId);
    let local;
    try {
      local = await run.prepareTermination();
    } catch (error) {
      this.settling.delete(teamRunId);
      throw error;
    }
    if (this.active.get(teamRunId) !== run || run.hasOpenExecutionWork()) {
      local.cancel();
      this.settling.delete(teamRunId);
      return null;
    }

    let state: "prepared" | "cancelled" | "committed" = "prepared";
    let committed: ReturnType<PreparedTaskSettlement["commitAfterDurability"]> | null = null;
    const prepared: PreparedTaskSettlement = Object.freeze({
      taskId,
      binding: Object.freeze({ kind: "team", address: run.context.teamNode.address, teamRunId, coordinatorAgentRunId: this.coordinatorAgentRunId(run) }),
      cancelBeforeDurability: () => {
        if (state !== "prepared") return;
        state = "cancelled";
        local.cancel();
        this.settling.delete(teamRunId);
      },
      commitAfterDurability: () => {
        if (state === "cancelled") throw new Error(`Task TeamRun '${teamRunId}' settlement was cancelled.`);
        if (committed) return committed;
        if (this.active.get(teamRunId) !== run) throw new Error(`Task TeamRun '${teamRunId}' changed before settlement commit.`);
        state = "committed";
        this.active.delete(teamRunId);
        this.settling.delete(teamRunId);
        const localCommit = local.commit();
        committed = Object.freeze({ finishLocalTeardown: () => localCommit.finish() });
        return committed;
      },
    });
    return prepared;
  }

  dispose(): void {
    this.active.clear();
    this.reserved.clear();
    this.preparedTeamRuns.clear();
    this.settling.clear();
  }

  private coordinatorAgentRunId(run: TeamRun): string {
    const node = run.context.teamNode;
    const coordinator = node.children.find((child) =>
      child.kind === "agent" && child.address === node.coordinatorAddress,
    );
    if (!coordinator || coordinator.kind !== "agent") {
      throw new Error(`Task TeamRun '${run.teamRunId}' has no exact coordinator AgentRun.`);
    }
    return coordinator.agentRunId;
  }

  private async materializeSubtree(root: TeamRun, node: TeamRunAgentTeamNode): Promise<TeamRun[]> {
    const output = [root];
    for (const child of node.children) {
      if (child.kind !== "agent_team") continue;
      const childRun = await root.getOrCreateConfiguredChildTeam(child.teamRunId);
      output.push(...await this.materializeSubtree(childRun, child));
    }
    return output;
  }
}
