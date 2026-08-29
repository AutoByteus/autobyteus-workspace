import type { RootTeamRun } from "../../agent-team-execution/domain/root-team-run.js";
import type { TaskDelegationToolContext } from "./task-delegation-tool-contract.js";

/** Invokes the selector-free capability bound to the exact Team member. */
export class TaskDelegationToolRunRouter {
  async resolveRoot(context: TaskDelegationToolContext): Promise<RootTeamRun> {
    return context.rootResolver.resolveActiveRoot();
  }
}
