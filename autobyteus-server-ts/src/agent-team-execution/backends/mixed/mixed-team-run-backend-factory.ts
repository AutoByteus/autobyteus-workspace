import { generateTeamRunId } from "../../../run-history/utils/team-run-id-utils.js";
import { buildTeamMemberRunId } from "../../../run-history/utils/team-member-run-id.js";
import { TeamMemberMemoryLayout } from "../../../agent-memory/store/team-member-memory-layout.js";
import { appConfigProvider } from "../../../config/app-config-provider.js";
import {
  TeamRunConfig,
  type TeamRunMemberConfig,
} from "../../domain/team-run-config.js";
import { TeamRunContext } from "../../domain/team-run-context.js";
import { TeamBackendKind } from "../../domain/team-backend-kind.js";
import type { TeamRunBackendFactory } from "../team-run-backend-factory.js";
import type { TeamManager } from "../team-manager.js";
import { MixedTeamManager } from "./mixed-team-manager.js";
import {
  MixedAgentMemberContext,
  MixedSubTeamMemberContext,
  MixedTeamRunContext,
  type MixedParentBoundaryContext,
  type MixedTeamMemberContext,
} from "./mixed-team-run-context.js";
import { MixedTeamRunBackend } from "./mixed-team-run-backend.js";
import { MixedSubTeamRunFactory } from "./mixed-sub-team-run-factory.js";

export type MixedTeamRunBackendFactoryOptions = {
  createTeamManager?: (context: TeamRunContext<MixedTeamRunContext>, subTeamRunFactory: MixedSubTeamRunFactory) => MixedTeamManager;
  memberLayout?: TeamMemberMemoryLayout;
};

export class MixedTeamRunBackendFactory implements TeamRunBackendFactory {
  private readonly createTeamManager: (context: TeamRunContext<MixedTeamRunContext>, subTeamRunFactory: MixedSubTeamRunFactory) => MixedTeamManager;
  private readonly memberLayout: TeamMemberMemoryLayout;
  private readonly subTeamRunFactory: MixedSubTeamRunFactory;

  constructor(options: MixedTeamRunBackendFactoryOptions = {}) {
    this.createTeamManager =
      options.createTeamManager ?? ((context, subTeamRunFactory) => new MixedTeamManager(context, { subTeamRunFactory }));
    this.memberLayout =
      options.memberLayout ??
      new TeamMemberMemoryLayout(appConfigProvider.config.getMemoryDir());
    this.subTeamRunFactory = new MixedSubTeamRunFactory({
      buildContext: (config, teamRunId, restoreRuntimeContext, parentBoundary) =>
        this.buildTeamRunContext(config, teamRunId, restoreRuntimeContext, parentBoundary),
      createTeamManager: (context) => this.createTeamManager(context, this.subTeamRunFactory),
    });
  }

  async createBackend(config: TeamRunConfig): Promise<MixedTeamRunBackend> {
    const teamRunId = generateTeamRunId(config.teamDefinitionId);
    const context = this.buildTeamRunContext(config, teamRunId);
    const teamManager = this.createTeamManager(context, this.subTeamRunFactory);
    return this.createBackendFromContext(context, teamManager);
  }

  async restoreBackend(
    context: TeamRunContext<MixedTeamRunContext>,
  ): Promise<MixedTeamRunBackend> {
    const teamManager = this.createTeamManager(context, this.subTeamRunFactory);
    return this.createBackendFromContext(context, teamManager);
  }

  buildTeamRunContext(
    config: TeamRunConfig,
    teamRunId: string,
    restoreRuntimeContext: MixedTeamRunContext | null = null,
    parentBoundary: MixedParentBoundaryContext | null = null,
  ): TeamRunContext<MixedTeamRunContext> {
    const memberTree = this.attachRuntimeIdentity(config.memberTree, teamRunId);
    const runtimeContext = new MixedTeamRunContext({
      coordinatorMemberRouteKey: config.coordinatorMemberRouteKey,
      memberContexts: memberTree.map((memberConfig) =>
        this.buildRuntimeMemberContext(memberConfig, restoreRuntimeContext),
      ),
      parentBoundary,
    });

    return new TeamRunContext({
      runId: teamRunId,
      teamBackendKind: TeamBackendKind.MIXED,
      coordinatorMemberName: config.coordinatorMemberName,
      coordinatorMemberRouteKey: config.coordinatorMemberRouteKey,
      config: new TeamRunConfig({
        teamDefinitionId: config.teamDefinitionId,
        teamBackendKind: TeamBackendKind.MIXED,
        coordinatorMemberName: config.coordinatorMemberName,
        coordinatorMemberRouteKey: config.coordinatorMemberRouteKey,
        memberTree,
      }),
      runtimeContext,
    });
  }

  private createBackendFromContext(
    context: TeamRunContext<MixedTeamRunContext>,
    teamManager: TeamManager,
  ): MixedTeamRunBackend {
    return new MixedTeamRunBackend(context, teamManager);
  }

  private attachRuntimeIdentity(
    memberTree: readonly TeamRunMemberConfig[],
    teamRunId: string,
  ): TeamRunMemberConfig[] {
    return memberTree.map((memberConfig) => {
      const memberRunId =
        memberConfig.memberRunId?.trim() || buildTeamMemberRunId(teamRunId, memberConfig.memberRouteKey);
      if (memberConfig.memberKind === "agent_team") {
        return {
          ...memberConfig,
          memberRunId,
          memberConfigs: this.attachRuntimeIdentity(memberConfig.memberConfigs, teamRunId),
        };
      }
      const memoryDir =
        typeof memberConfig.memoryDir === "string" && memberConfig.memoryDir.trim().length > 0
          ? memberConfig.memoryDir.trim()
          : this.memberLayout.getMemberDirPath(teamRunId, memberRunId);
      return {
        ...memberConfig,
        memberRunId,
        memoryDir,
      };
    });
  }

  private buildRuntimeMemberContext(
    memberConfig: TeamRunMemberConfig,
    restoreRuntimeContext: MixedTeamRunContext | null,
  ): MixedTeamMemberContext {
    const restored = this.findRestoredMemberContext(memberConfig, restoreRuntimeContext);
    if (memberConfig.memberKind === "agent") {
      return new MixedAgentMemberContext({
        memberName: memberConfig.memberName,
        memberPath: memberConfig.memberPath,
        memberRouteKey: memberConfig.memberRouteKey,
        memberRunId: memberConfig.memberRunId!,
        runtimeKind: memberConfig.runtimeKind,
        platformAgentRunId: restored?.memberKind === "agent" ? restored.platformAgentRunId : null,
      });
    }
    return new MixedSubTeamMemberContext({
      memberName: memberConfig.memberName,
      memberPath: memberConfig.memberPath,
      memberRouteKey: memberConfig.memberRouteKey,
      memberRunId: memberConfig.memberRunId!,
      teamDefinitionId: memberConfig.teamDefinitionId,
      childTeamRunId:
        (restored?.memberKind === "agent_team" ? restored.childTeamRunId : null) ??
        memberConfig.childTeamRunId ??
        null,
      childRuntimeContext: restored?.memberKind === "agent_team" ? restored.childRuntimeContext : null,
    });
  }

  private findRestoredMemberContext(
    memberConfig: TeamRunMemberConfig,
    restoreRuntimeContext: MixedTeamRunContext | null,
  ): MixedTeamMemberContext | null {
    if (!restoreRuntimeContext) {
      return null;
    }
    return restoreRuntimeContext.memberContexts.find(
      (memberContext) =>
        memberContext.memberRunId === memberConfig.memberRunId ||
        memberContext.memberRouteKey === memberConfig.memberRouteKey,
    ) ?? null;
  }
}

let cachedMixedTeamRunBackendFactory: MixedTeamRunBackendFactory | null = null;

export const getMixedTeamRunBackendFactory = (): MixedTeamRunBackendFactory => {
  if (!cachedMixedTeamRunBackendFactory) {
    cachedMixedTeamRunBackendFactory = new MixedTeamRunBackendFactory();
  }
  return cachedMixedTeamRunBackendFactory;
};
