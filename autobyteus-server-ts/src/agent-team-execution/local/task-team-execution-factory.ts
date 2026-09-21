import { TeamRun } from "../domain/team-run.js";
import type { TeamRunAgentTeamNode, TeamRunApplicationBinding } from "../domain/team-run-config.js";
import type { CollaborationHandoff } from "../../agent-collaboration/domain/collaboration-handoff.js";
import type { TeamRunContext } from "../domain/team-run-context.js";
import { FlatTeamRunBackend } from "./flat-team-run-backend.js";
import type { FlatTeamExecutionManager } from "./flat-team-execution-manager.js";
import type {
  ConfiguredMemberActivationMode,
  FlatTeamExecutionContext,
} from "./flat-team-execution-context.js";
import {
  createRootExecutionPhysicalScope,
  type RootExecutionPhysicalScope,
} from "../../agent-collaboration/execution/domain/root-execution-identity.js";

export type TaskTeamExecutionFactoryOptions = {
  buildContext: (input: {
    handoffs: readonly CollaborationHandoff[];
    applicationBinding?: TeamRunApplicationBinding | null;
    physicalScope: RootExecutionPhysicalScope;
    teamNode: TeamRunAgentTeamNode;
    configuredMemberActivationMode: ConfiguredMemberActivationMode;
  }) => TeamRunContext<FlatTeamExecutionContext>;
  createTeamManager: (context: TeamRunContext<FlatTeamExecutionContext>) => FlatTeamExecutionManager;
};

export class TaskTeamExecutionFactory {
  constructor(private readonly options: TaskTeamExecutionFactoryOptions) {}

  async prepareFreshTaskTeam(input: {
    handoffs: readonly CollaborationHandoff[];
    parentContext: TeamRunContext<FlatTeamExecutionContext>;
    teamNode: TeamRunAgentTeamNode;
  }): Promise<TeamRun> {
    return this.materialize({
      ...input,
      applicationBinding: null,
      configuredMemberActivationMode: "fresh",
    });
  }

  private async materialize(input: {
    parentContext: TeamRunContext<FlatTeamExecutionContext>;
    handoffs: readonly CollaborationHandoff[];
    applicationBinding: TeamRunApplicationBinding | null;
    teamNode: TeamRunAgentTeamNode;
    configuredMemberActivationMode: ConfiguredMemberActivationMode;
  }): Promise<TeamRun> {
    const context = this.options.buildContext({
      handoffs: input.handoffs,
      applicationBinding: input.applicationBinding,
      physicalScope: createRootExecutionPhysicalScope({
        root: input.parentContext.physicalScope.root,
        ancestorTeamRunIds: [
          ...input.parentContext.physicalScope.ancestorTeamRunIds,
          input.teamNode.teamRunId,
        ],
      }),
      teamNode: input.teamNode,
      configuredMemberActivationMode: input.configuredMemberActivationMode,
    });
    return new TeamRun(
      context,
      new FlatTeamRunBackend(context, this.options.createTeamManager(context)),
    );
  }
}
