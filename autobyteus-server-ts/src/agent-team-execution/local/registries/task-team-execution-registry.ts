import { acceptTaskSeed } from "../../../agent-collaboration/execution/task/task-execution-seed-admission.js";
import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import type { PrepareTaskTeamInput, RestoreTaskTeamInput } from "../../domain/task-team-execution.js";
import { createTaskExecutionPreparation, type TaskExecutionPreparationOperation, type PreparedTaskExecution } from "../../domain/prepared-task-execution.js";
import type { TeamRun } from "../../domain/team-run.js";
import type { TeamRunContext } from "../../domain/team-run-context.js";
import type { TeamRunAgentTeamNode } from "../../domain/team-run-config.js";
import type { TaskTeamExecutionFactory } from "../task-team-execution-factory.js";
import type { FlatTeamExecutionContext } from "../flat-team-execution-context.js";
import { isRunningTaskExecutionStatus } from "../../../agent-collaboration/execution/task/task-execution-running-work.js";

import type { FlatTeamPreparationOperation } from "../flat-team-execution-factory.js";

type PreparedState = "preparing" | "sealed" | "committed" | "aborted";

/** Direct task-Team mechanics for one TeamRun; the root resource lifecycle policy stays outside. */
export class TaskTeamExecutionRegistry {
  private readonly operations = new Map<string, TaskExecutionPreparationOperation>();
  private readonly restorations = new Map<string, FlatTeamPreparationOperation>();
  private readonly active = new Map<string, TeamRun>();
  private readonly reserved = new Set<string>();
  private readonly preparedTeamRuns = new Map<string, TeamRun>();
  private materializationOpen = true;

  constructor(private readonly options: {
    teamContext: TeamRunContext<FlatTeamExecutionContext>;
    subTeamRunFactory: TaskTeamExecutionFactory;
  }) {}

  listTeamRuns(): readonly TeamRun[] { return Object.freeze([...this.active.values()]); }
  cancelRestorations(): void { this.restorations.forEach(op => op.cancel()); }
  releaseRestorations(): Promise<AgentOperationResult>[] { return [...this.restorations.keys()].map(id => this.release(id)); }
  listPreparedTeamRuns(): readonly TeamRun[] { return Object.freeze([...this.preparedTeamRuns.values()]); }
  freezeMaterialization(): void { this.materializationOpen = false; this.restorations.forEach(op => op.cancel()); }
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
    const operation = this.options.subTeamRunFactory.beginTaskTeam({
      activationMode: "restore", prepareConfiguredAgents: false,
      handoffs: input.handoffs,
      parentContext: this.options.teamContext,
      teamNode: input.teamNode,
    });
    this.reserved.add(teamRunId);
    this.restorations.set(teamRunId, operation);
    try {
      const prepared = await operation.prepare();
      input.assertOpen();
      if (!this.materializationOpen) throw new Error("Task Team restore cancelled by root termination.");
      prepared.commitAfterDurability();
      this.active.set(teamRunId, prepared.teamRun);
      this.reserved.delete(teamRunId);
      return prepared.teamRun;
    } catch (error) {
      operation.cancel();
      try {
        if ((await operation.release()).accepted) { this.restorations.delete(teamRunId); this.reserved.delete(teamRunId); }
      } catch (cleanup) { throw new AggregateError([error, cleanup], "Task Team restore and exact cleanup failed."); }
      throw error;
    }
  }

  beginPreparation(input: PrepareTaskTeamInput): TaskExecutionPreparationOperation {
    if (!this.materializationOpen) throw new Error("Task Team materialization is closed for TeamRun termination.");
    const teamRunId = input.teamRunId.trim();
    if (!teamRunId || input.address !== input.teamNode.address || input.teamNode.teamRunId !== teamRunId) {
      throw new Error("Task Team preparation requires one exact placement and TeamRun ID.");
    }
    if (this.active.has(teamRunId) || this.reserved.has(teamRunId)) {
      throw new Error(`Task TeamRun '${teamRunId}' is already active or reserved.`);
    }
    this.reserved.add(teamRunId);
    const factoryControl = this.options.subTeamRunFactory.beginTaskTeam({
      handoffs: input.handoffs, parentContext: this.options.teamContext, teamNode: input.teamNode, activationMode: "fresh", prepareConfiguredAgents: true,
    });
    const operation = createTaskExecutionPreparation({
      cancel: () => factoryControl.cancel(),
      releaseResources: async () => {
        const result = await factoryControl.release();
        if (result.accepted) { this.reserved.delete(teamRunId); this.preparedTeamRuns.delete(teamRunId); }
        return result;
      },
      prepare: async (assertAccepting) => {
    let state: PreparedState = "preparing";
    const prepared = await factoryControl.prepare();
    assertAccepting();
    const root = prepared.teamRun;
    this.preparedTeamRuns.set(teamRunId, root);
    const coordinator = input.teamNode.children.find((node) =>
      node.kind === "agent" && node.address === input.teamNode.coordinatorAddress,
    );
    if (!coordinator || coordinator.kind !== "agent") throw new Error(`Task TeamRun '${teamRunId}' has no exact coordinator.`);
    return {
      binding: Object.freeze({
        kind: "team",
        address: input.address,
        teamRunId,
        coordinatorAgentRunId: coordinator.agentRunId,
      }),
      preparedTeamRuns: Object.freeze([root]),
      stagedPlatformBindings: prepared.stagedPlatformBindings,
      sealForCommit: () => {
        if (state !== "preparing" || !this.reserved.has(teamRunId)) throw new Error(`Task TeamRun '${teamRunId}' cannot be sealed.`);
        state = "sealed";
      },
      commitAfterDurability: () => {
        if (state !== "sealed" || !this.reserved.delete(teamRunId)) throw new Error(`Task TeamRun '${teamRunId}' is not sealed.`);
        assertAccepting();
        this.active.set(teamRunId, root);
        prepared.commitAfterDurability();
        this.preparedTeamRuns.delete(teamRunId);
        state = "committed";
        let released = false;
        return Object.freeze({
          releaseWork: (assertOpen) => {
            assertAccepting();
            if (released) throw new Error("Task seed already released.");
            released = true;
            if (!input.message) throw new Error("Helper awaits an ordinary message, not a delegated seed.");
            return acceptTaskSeed(assertOpen, () => root.postMessage(input.message!, coordinator.agentRunId));
          },
        });
      },
      abort: async () => {
        if (state === "aborted") return;
        const result = await operation.release();
        if (!result.accepted) throw new Error("Task Team release remains pending.");
        state = "aborted";
      },
    };
      },
    });
    this.operations.set(teamRunId, operation);
    return operation;
  }

  /** Reactivation, after an accepted exact release: drops the terminated task TeamRun so `restore` can build a fresh one. */
  discardReleased(teamRunId: string): void {
    const run = this.active.get(teamRunId);
    if (run && !run.isTerminated()) return;
    this.active.delete(teamRunId);
    this.operations.delete(teamRunId);
    this.restorations.delete(teamRunId);
    this.preparedTeamRuns.delete(teamRunId);
    this.reserved.delete(teamRunId);
  }

  cancel(teamRunId: string): void { this.restorations.get(teamRunId)?.cancel(); this.operations.get(teamRunId)?.cancel(); this.active.get(teamRunId)?.cancelRuntimeActivation(); }
  async release(teamRunId: string): Promise<AgentOperationResult> {
    this.cancel(teamRunId);
    const controls = [this.operations.get(teamRunId), this.restorations.get(teamRunId)].filter(Boolean);
    const run = this.active.get(teamRunId);
    const attempts = [...controls.map(control => control!.release()), ...(run ? [run.releaseOwnedRuntime()] : [])];
    if (!attempts.length) return { accepted: false, code: "EXACT_RELEASE_AUTHORITY_UNAVAILABLE" };
    const results = await Promise.allSettled(attempts);
    const errors = results.flatMap(result => result.status === "rejected" ? [result.reason] : []);
    if (errors.length) throw new AggregateError(errors, "Exact Task Team cleanup failed.");
    if (results.some(result => result.status === "fulfilled" && !result.value.accepted)) return { accepted: false, code: "RUNTIME_RELEASE_PENDING" };
    this.restorations.delete(teamRunId); this.reserved.delete(teamRunId);
    return { accepted: true };
  }

  dispose(): void {
    this.operations.forEach(operation => operation.cancel());
    this.active.clear();
    this.reserved.clear();
    this.preparedTeamRuns.clear();
    this.restorations.clear();
  }
}
