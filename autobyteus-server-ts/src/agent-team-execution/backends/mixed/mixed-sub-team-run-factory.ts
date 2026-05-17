import { TeamRun } from "../../domain/team-run.js";
import { TeamRunConfig, stripMemberPathPrefix, type TeamSubTeamMemberRunConfig } from "../../domain/team-run-config.js";
import type { TeamRunContext } from "../../domain/team-run-context.js";
import type { TeamManager } from "../team-manager.js";
import { MixedTeamRunBackend } from "./mixed-team-run-backend.js";
import { MixedTeamRunContext, type MixedParentBoundaryContext } from "./mixed-team-run-context.js";
import { TeamBackendKind } from "../../domain/team-backend-kind.js";
import { buildTeamMemberRunId } from "../../../run-history/utils/team-member-run-id.js";
import { generateTeamRunId } from "../../../run-history/utils/team-run-id-utils.js";

export type MixedSubTeamRunFactoryOptions = {
  buildContext: (
    config: TeamRunConfig,
    teamRunId: string,
    restoreRuntimeContext?: MixedTeamRunContext | null,
    parentBoundary?: MixedParentBoundaryContext | null,
  ) => TeamRunContext<MixedTeamRunContext>;
  createTeamManager: (context: TeamRunContext<MixedTeamRunContext>) => TeamManager;
};

export class MixedSubTeamRunFactory {
  constructor(private readonly options: MixedSubTeamRunFactoryOptions) {}

  async createOrRestore(input: {
    parentTeamRunId: string;
    subTeamConfig: TeamSubTeamMemberRunConfig;
    childTeamRunId?: string | null;
    restoreRuntimeContext?: MixedTeamRunContext | null;
    parentBoundary?: MixedParentBoundaryContext | null;
  }): Promise<TeamRun> {
    const childTeamRunId = input.childTeamRunId?.trim() || generateTeamRunId(input.subTeamConfig.teamDefinitionId);
    const childTree = stripMemberPathPrefix(
      input.subTeamConfig.memberConfigs,
      input.subTeamConfig.memberPath,
    );
    const config = new TeamRunConfig({
      teamDefinitionId: input.subTeamConfig.teamDefinitionId,
      teamBackendKind: TeamBackendKind.MIXED,
      coordinatorMemberRouteKey: input.subTeamConfig.coordinatorMemberRouteKey
        ? stripRoutePrefix(input.subTeamConfig.coordinatorMemberRouteKey, input.subTeamConfig.memberRouteKey)
        : null,
      memberTree: childTree.map((member) => ({
        ...member,
        memberRunId: member.memberRunId ?? buildTeamMemberRunId(childTeamRunId, member.memberRouteKey),
      })),
    });
    const context = this.options.buildContext(
      config,
      childTeamRunId,
      input.restoreRuntimeContext ?? null,
      input.parentBoundary ?? null,
    );
    const manager = this.options.createTeamManager(context);
    const backend = new MixedTeamRunBackend(context, manager);
    return new TeamRun({ context, backend });
  }
}

const stripRoutePrefix = (routeKey: string, prefix: string): string => {
  if (routeKey === prefix) {
    return routeKey;
  }
  const prefixWithSlash = `${prefix}/`;
  return routeKey.startsWith(prefixWithSlash) ? routeKey.slice(prefixWithSlash.length) : routeKey;
};
