import type { PrepareTaskTeamInput, RestoreTaskTeamInput } from "../../domain/task-team-execution.js";
import type { PreparedTaskExecution } from "../../domain/prepared-task-execution.js";
import type { TeamRun } from "../../domain/team-run.js";
import type { TeamRunContext } from "../../domain/team-run-context.js";
import type { TeamRunAgentTeamNode } from "../../domain/team-run-config.js";
import type { TaskTeamExecutionFactory } from "../task-team-execution-factory.js";
import type { FlatTeamExecutionContext } from "../flat-team-execution-context.js";
import { isRunningTaskExecutionStatus } from "../../../agent-collaboration/execution/task/task-execution-running-work.js";
import { TaskExecutionTeardownIndeterminateError } from "../../../agent-collaboration/execution/task/task-delegation-command.js";

type PreparedState = "preparing" | "sealed" | "committed" | "aborted";

/** Direct task-Team mechanics for one TeamRun; the root resource lifecycle policy stays outside. */
export class TaskTeamExecutionRegistry {
  private readonly active = new Map<string, TeamRun>();
  private readonly reserved = new Set<string>();
  private readonly preparedTeamRuns = new Map<string, TeamRun>();
  private readonly shuttingDown = new Set<string>();
  private materializationOpen = true;

  constructor(private readonly options: {
    teamContext: TeamRunContext<FlatTeamExecutionContext>;
    subTeamRunFactory: TaskTeamExecutionFactory;
  }) {}

  listTeamRuns(): readonly TeamRun[] { return Object.freeze([...this.active.values()]); }
  listPreparedTeamRuns(): readonly TeamRun[] { return Object.freeze([...this.preparedTeamRuns.values()]); }
  freezeMaterialization(): void { this.materializationOpen = false; }
  get(teamRunId: string): TeamRun | null { return this.active.get(teamRunId) ?? null; }
  /** Task-execution open work: a task Team counts only while one of its agents is initializing or running. */
  hasRunningWork(): boolean {
    return this.listTeamRuns().some((run) =>
      run.getLeafAgentStatusSnapshots().some((snapshot) => isRunningTaskExecutionStatus(snapshot.details.status)));
  }

  /** Re-creates one shut-down task Team in `restore` mode; members activate lazily on input. */
  async restore(input: RestoreTaskTeamInput): Promise<TeamRun> {
    if (!this.materializationOpen) throw new Error("Task Team materialization is closed for TeamRun termination.");
    const teamRunId = input.teamNode.teamRunId.trim();
    if (!teamRunId) throw new Error("Task Team restore requires one exact TeamRun ID.");
    if (this.active.has(teamRunId) || this.reserved.has(teamRunId)) {
      throw new Error(`Task TeamRun '${teamRunId}' is already active or reserved.`);
    }
    const run = await this.options.subTeamRunFactory.prepareRestoredTaskTeam({
      handoffs: input.handoffs,
      parentContext: this.options.teamContext,
      teamNode: input.teamNode,
    });
    this.active.set(teamRunId, run);
    return run;
  }

  async prepare(input: PrepareTaskTeamInput): Promise<PreparedTaskExecution> {
    if (!this.materializationOpen) throw new Error("Task Team materialization is closed for TeamRun termination.");
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
        parentContext: this.options.teamContext,
        teamNode: input.teamNode,
      });
      this.preparedTeamRuns.set(teamRunId, root);
    } catch (error) {
      this.reserved.delete(teamRunId);
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
      preparedTeamRuns: Object.freeze([root]),
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

  /** Shuts the task Team down as a whole only when every agent and nested child in it is quiet. */
  async tryShutDownIfQuiet(teamRunId: string): Promise<boolean> {
    const run = this.active.get(teamRunId);
    if (!run || this.shuttingDown.has(teamRunId)) return false;
    this.shuttingDown.add(teamRunId);
    try {
      const local = await run.tryPrepareTerminationIfQuiescent();
      if (!local) return false;
      if (this.active.get(teamRunId) !== run) {
        local.cancel();
        return false;
      }
      this.active.delete(teamRunId);
      const result = await local.commit().finish().catch((cause: unknown) => {
        throw new TaskExecutionTeardownIndeterminateError(teamRunId, `Task TeamRun '${teamRunId}' shutdown did not finish.`, { cause });
      });
      if (!result.accepted) {
        throw new TaskExecutionTeardownIndeterminateError(teamRunId, result.message ?? `Task TeamRun '${teamRunId}' shutdown was rejected.`);
      }
      return true;
    } finally {
      this.shuttingDown.delete(teamRunId);
    }
  }

  dispose(): void {
    this.active.clear();
    this.reserved.clear();
    this.preparedTeamRuns.clear();
    this.shuttingDown.clear();
  }
}
