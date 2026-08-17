import { TeamRun } from "../../domain/team-run.js";
import type { TeamRunAgentTeamNode, TeamRunApplicationBinding } from "../../domain/team-run-config.js";
import type { CollaborationHandoff } from "../../../agent-collaboration/domain/collaboration-handoff.js";
import type { TeamRunContext } from "../../domain/team-run-context.js";
import { MixedTeamRunBackend } from "./mixed-team-run-backend.js";
import type { MixedTeamManager } from "./mixed-team-manager.js";
import type {
  MixedConfiguredMemberActivationMode,
  MixedTeamRunContext,
} from "./mixed-team-run-context.js";

export type MixedSubTeamRunFactoryOptions = {
  buildContext: (input: {
    handoffs: readonly CollaborationHandoff[];
    applicationBinding?: TeamRunApplicationBinding | null;
    rootTeamRunId: string;
    teamNode: TeamRunAgentTeamNode;
    configuredMemberActivationMode: MixedConfiguredMemberActivationMode;
  }) => TeamRunContext<MixedTeamRunContext>;
  createTeamManager: (context: TeamRunContext<MixedTeamRunContext>) => MixedTeamManager;
};

export class MixedSubTeamRunFactory {
  constructor(private readonly options: MixedSubTeamRunFactoryOptions) {}

  async materializeConfiguredChild(input: {
    handoffs: readonly CollaborationHandoff[];
    applicationBinding?: TeamRunApplicationBinding | null;
    rootTeamRunId: string;
    teamNode: TeamRunAgentTeamNode;
    configuredMemberActivationMode: MixedConfiguredMemberActivationMode;
  }): Promise<TeamRun> {
    const context = this.options.buildContext(input);
    return new TeamRun(
      context,
      new MixedTeamRunBackend(context, this.options.createTeamManager(context)),
    );
  }

  async prepareFreshTaskTeam(input: {
    handoffs: readonly CollaborationHandoff[];
    applicationBinding?: TeamRunApplicationBinding | null;
    rootTeamRunId: string;
    teamNode: TeamRunAgentTeamNode;
  }): Promise<TeamRun> {
    return this.materializeConfiguredChild({
      ...input,
      configuredMemberActivationMode: "fresh",
    });
  }
}
