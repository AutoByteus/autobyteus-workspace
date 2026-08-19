import type { RootTeamRun } from "../../agent-team-execution/domain/root-team-run.js";
import { TaskDelegationError } from "../../agent-team-execution/task-delegation/task-delegation-record.js";
import type { TaskDelegationToolContext } from "./task-delegation-tool-contract.js";

export type RootTeamRunResolver = {
  resolveTeamRun(teamRunId: string): Promise<RootTeamRun | null>;
};

/** Thin root lookup only; task lifecycle and routing remain inside RootTeamRun. */
export class TaskDelegationToolRunRouter {
  constructor(private readonly rootTeamRunResolver: RootTeamRunResolver) {}

  async resolveRoot(context: TaskDelegationToolContext): Promise<RootTeamRun> {
    const rootTeamRunId = context.identity.rootTeamRunId.trim();
    if (!rootTeamRunId) {
      throw new TaskDelegationError("TEAM_RUN_CONTEXT_REQUIRED", "Task delegation requires a root TeamRun identity.");
    }
    const root = await this.rootTeamRunResolver.resolveTeamRun(rootTeamRunId);
    if (!root || root.teamRunId !== rootTeamRunId) {
      throw new TaskDelegationError("TEAM_RUN_NOT_FOUND", `RootTeamRun '${rootTeamRunId}' is not active and could not be restored.`);
    }
    return root;
  }
}
