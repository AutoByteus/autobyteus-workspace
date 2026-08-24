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
import {
  createChildTeamRunPhysicalScope,
  type TeamRunPhysicalScope,
} from "../../domain/team-run-physical-scope.js";

export type MixedSubTeamRunFactoryOptions = {
  buildContext: (input: {
    handoffs: readonly CollaborationHandoff[];
    applicationBinding?: TeamRunApplicationBinding | null;
    physicalScope: TeamRunPhysicalScope;
    teamNode: TeamRunAgentTeamNode;
    configuredMemberActivationMode: MixedConfiguredMemberActivationMode;
  }) => TeamRunContext<MixedTeamRunContext>;
  createTeamManager: (context: TeamRunContext<MixedTeamRunContext>) => MixedTeamManager;
};

export class MixedSubTeamRunFactory {
  constructor(private readonly options: MixedSubTeamRunFactoryOptions) {}

  async materializeConfiguredChild(input: {
    parentContext: TeamRunContext<MixedTeamRunContext>;
    teamNode: TeamRunAgentTeamNode;
    configuredMemberActivationMode: MixedConfiguredMemberActivationMode;
  }): Promise<TeamRun> {
    return this.materialize({
      parentContext: input.parentContext,
      handoffs: input.parentContext.handoffs,
      applicationBinding: input.parentContext.applicationBinding,
      teamNode: input.teamNode,
      configuredMemberActivationMode: input.configuredMemberActivationMode,
    });
  }

  async prepareFreshTaskTeam(input: {
    handoffs: readonly CollaborationHandoff[];
    parentContext: TeamRunContext<MixedTeamRunContext>;
    teamNode: TeamRunAgentTeamNode;
  }): Promise<TeamRun> {
    return this.materialize({
      ...input,
      applicationBinding: null,
      configuredMemberActivationMode: "fresh",
    });
  }

  private async materialize(input: {
    parentContext: TeamRunContext<MixedTeamRunContext>;
    handoffs: readonly CollaborationHandoff[];
    applicationBinding: TeamRunApplicationBinding | null;
    teamNode: TeamRunAgentTeamNode;
    configuredMemberActivationMode: MixedConfiguredMemberActivationMode;
  }): Promise<TeamRun> {
    const context = this.options.buildContext({
      handoffs: input.handoffs,
      applicationBinding: input.applicationBinding,
      physicalScope: createChildTeamRunPhysicalScope(
        input.parentContext.physicalScope,
        input.teamNode.teamRunId,
      ),
      teamNode: input.teamNode,
      configuredMemberActivationMode: input.configuredMemberActivationMode,
    });
    return new TeamRun(
      context,
      new MixedTeamRunBackend(context, this.options.createTeamManager(context)),
    );
  }
}
