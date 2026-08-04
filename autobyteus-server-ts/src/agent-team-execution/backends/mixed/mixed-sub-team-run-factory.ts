import { TeamRun } from "../../domain/team-run.js";
import type { TaskTeamInstanceIdentity } from "../../domain/task-team-instance.js";
import type { TeamRunAgentTeamNode, TeamRunConfig } from "../../domain/team-run-config.js";
import type { TeamRunContext } from "../../domain/team-run-context.js";
import type { TeamManager } from "../team-manager.js";
import { MixedTeamRunBackend } from "./mixed-team-run-backend.js";
import type {
  MixedParentBoundaryContext,
  MixedTeamRunContext,
} from "./mixed-team-run-context.js";

export type MixedSubTeamRunFactoryOptions = {
  buildContext: (input: {
    config: TeamRunConfig;
    teamRunId: string;
    teamAddress: TeamRunAgentTeamNode["address"];
    restoreRuntimeContext?: MixedTeamRunContext | null;
    parentBoundary?: MixedParentBoundaryContext | null;
    taskTeamInstance?: TaskTeamInstanceIdentity | null;
    taskTeamRunIds?: readonly string[] | null;
  }) => TeamRunContext<MixedTeamRunContext>;
  createTeamManager: (context: TeamRunContext<MixedTeamRunContext>) => TeamManager;
};

export class MixedSubTeamRunFactory {
  constructor(private readonly options: MixedSubTeamRunFactoryOptions) {}

  async createOrRestore(input: {
    config: TeamRunConfig;
    teamNode: TeamRunAgentTeamNode;
    restoreRuntimeContext?: MixedTeamRunContext | null;
    parentBoundary?: MixedParentBoundaryContext | null;
    taskTeamInstance?: TaskTeamInstanceIdentity | null;
    taskTeamRunIds?: readonly string[] | null;
  }): Promise<TeamRun> {
    const context = this.options.buildContext({
      config: input.config,
      teamRunId: input.teamNode.teamRunId,
      teamAddress: input.teamNode.address,
      restoreRuntimeContext: input.restoreRuntimeContext ?? null,
      parentBoundary: input.parentBoundary ?? null,
      taskTeamInstance: input.taskTeamInstance ?? null,
      taskTeamRunIds: input.taskTeamRunIds ?? null,
    });
    const backend = new MixedTeamRunBackend(context, this.options.createTeamManager(context));
    return new TeamRun({ context, backend });
  }
}
