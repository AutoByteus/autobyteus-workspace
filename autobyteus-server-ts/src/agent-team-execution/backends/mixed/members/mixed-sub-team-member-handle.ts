import type { AgentOperationResult } from "../../../../agent-execution/domain/agent-operation-result.js";
import type { TeamRun } from "../../../domain/team-run.js";
import type { TeamRunContext } from "../../../domain/team-run-context.js";
import type { TeamRunAgentTeamNode } from "../../../domain/team-run-config.js";
import type { PreparedLocalExecutionTermination } from "../../../domain/prepared-local-execution-termination.js";
import type { MixedTeamRunContext, MixedSubTeamMemberContext } from "../mixed-team-run-context.js";
import type { MixedSubTeamRunFactory } from "../mixed-sub-team-run-factory.js";

/** Direct configured child handle for exactly one owning TeamRun. */
export class MixedSubTeamMemberHandle {
  readonly context: MixedSubTeamMemberContext;
  private childRun: TeamRun | null = null;

  constructor(private readonly options: {
    parentContext: TeamRunContext<MixedTeamRunContext>;
    context: MixedSubTeamMemberContext;
    config: TeamRunAgentTeamNode;
    subTeamRunFactory: MixedSubTeamRunFactory;
  }) { this.context = options.context; }

  isActive(): boolean { return this.childRun?.isActive() ?? false; }
  getLeafAgentStatusSnapshots() { return this.childRun?.getLeafAgentStatusSnapshots() ?? []; }
  hasOpenExecutionWork(): boolean { return this.childRun?.hasOpenExecutionWork() ?? false; }
  getOrCreateTeamRun(): Promise<TeamRun> { return this.ensureReady(); }

  async prepareTermination(): Promise<PreparedLocalExecutionTermination> {
    const childRun = this.childRun;
    const prepared = childRun ? await childRun.prepareTermination() : null;
    let state: "prepared" | "cancelled" | "committed" = "prepared";
    let committed: ReturnType<PreparedLocalExecutionTermination["commit"]> | null = null;
    return Object.freeze({
      cancel: () => {
        if (state !== "prepared") return;
        state = "cancelled";
        prepared?.cancel();
      },
      commit: () => {
        if (state === "cancelled") throw new Error(`TeamRun '${this.context.teamRunId}' termination preparation was cancelled.`);
        if (committed) return committed;
        state = "committed";
        const teamTermination = prepared?.commit() ?? null;
        committed = Object.freeze({
          finish: async () => {
            const result = teamTermination ? await teamTermination.finish() : { accepted: true as const };
            if (result.accepted) this.dispose();
            return result;
          },
        });
        return committed;
      },
    });
  }

  async terminate(): Promise<AgentOperationResult> {
    const prepared = await this.prepareTermination();
    return prepared.commit().finish();
  }

  dispose(): void {
    this.childRun = null;
    this.context.childRuntimeContext = null;
  }

  private async ensureReady(): Promise<TeamRun> {
    if (this.childRun?.isActive()) return this.childRun;
    this.childRun = await this.options.subTeamRunFactory.createOrRestore({
      handoffs: this.options.parentContext.handoffs,
      applicationBinding: this.options.parentContext.applicationBinding,
      rootTeamRunId: this.options.parentContext.rootTeamRunId,
      teamNode: this.options.config,
      restoreRuntimeContext: this.context.childRuntimeContext,
    });
    this.context.childRuntimeContext = this.childRun.getRuntimeContext() as MixedTeamRunContext;
    return this.childRun;
  }
}
