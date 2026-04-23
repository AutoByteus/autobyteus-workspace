import { generateTeamRunId } from "../../../run-history/utils/team-run-id-utils.js";
import { buildTeamMemberRunId, normalizeMemberRouteKey } from "../../../run-history/utils/team-member-run-id.js";
import { TeamMemberMemoryLayout } from "../../../agent-memory/store/team-member-memory-layout.js";
import { appConfigProvider } from "../../../config/app-config-provider.js";
import { TeamRunConfig, type TeamMemberRunConfig } from "../../domain/team-run-config.js";
import { TeamRunContext } from "../../domain/team-run-context.js";
import { TeamBackendKind } from "../../domain/team-backend-kind.js";
import type { TeamRunBackendFactory } from "../team-run-backend-factory.js";
import type { TeamManager } from "../team-manager.js";
import { MixedTeamManager } from "./mixed-team-manager.js";
import {
  MixedTeamMemberContext,
  MixedTeamRunContext,
} from "./mixed-team-run-context.js";
import { MixedTeamRunBackend } from "./mixed-team-run-backend.js";

export type MixedTeamRunBackendFactoryOptions = {
  createTeamManager?: (context: TeamRunContext<MixedTeamRunContext>) => MixedTeamManager;
  memberLayout?: TeamMemberMemoryLayout;
};

export class MixedTeamRunBackendFactory implements TeamRunBackendFactory {
  private readonly createTeamManager: (context: TeamRunContext<MixedTeamRunContext>) => MixedTeamManager;
  private readonly memberLayout: TeamMemberMemoryLayout;

  constructor(options: MixedTeamRunBackendFactoryOptions = {}) {
    this.createTeamManager =
      options.createTeamManager ?? ((context) => new MixedTeamManager(context));
    this.memberLayout =
      options.memberLayout ??
      new TeamMemberMemoryLayout(appConfigProvider.config.getMemoryDir());
  }

  async createBackend(config: TeamRunConfig): Promise<MixedTeamRunBackend> {
    const teamRunId = generateTeamRunId(config.teamDefinitionId);
    const context = this.buildTeamRunContext(config, teamRunId);
    const teamManager = this.createTeamManager(context);
    return this.createBackendFromContext(context, teamManager);
  }

  async restoreBackend(
    context: TeamRunContext<MixedTeamRunContext>,
  ): Promise<MixedTeamRunBackend> {
    const teamManager = this.createTeamManager(context);
    return this.createBackendFromContext(context, teamManager);
  }

  private buildTeamRunContext(
    config: TeamRunConfig,
    teamRunId: string,
  ): TeamRunContext<MixedTeamRunContext> {
    const memberConfigs = this.toTeamMemberRunConfigs(config, teamRunId);
    const runtimeContext = new MixedTeamRunContext({
      coordinatorMemberRouteKey: null,
      memberContexts: memberConfigs.map(
        (memberConfig) =>
          new MixedTeamMemberContext({
            memberName: memberConfig.memberName,
            memberRouteKey: memberConfig.memberRouteKey ?? memberConfig.memberName,
            memberRunId:
              memberConfig.memberRunId?.trim() ||
              buildTeamMemberRunId(teamRunId, memberConfig.memberRouteKey ?? memberConfig.memberName),
            runtimeKind: memberConfig.runtimeKind,
            platformAgentRunId: null,
          }),
      ),
    });

    return new TeamRunContext({
      runId: teamRunId,
      teamBackendKind: TeamBackendKind.MIXED,
      coordinatorMemberName: null,
      config: new TeamRunConfig({
        teamDefinitionId: config.teamDefinitionId,
        teamBackendKind: TeamBackendKind.MIXED,
        memberConfigs,
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

  private toTeamMemberRunConfigs(config: TeamRunConfig, teamRunId: string): TeamMemberRunConfig[] {
    return config.memberConfigs.map((memberConfig) => {
      const memberRouteKey = normalizeMemberRouteKey(
        memberConfig.memberRouteKey ?? memberConfig.memberName,
      );
      const memberRunId =
        memberConfig.memberRunId?.trim() || buildTeamMemberRunId(teamRunId, memberRouteKey);
      const memoryDir =
        typeof memberConfig.memoryDir === "string" && memberConfig.memoryDir.trim().length > 0
          ? memberConfig.memoryDir.trim()
          : this.memberLayout.getMemberDirPath(teamRunId, memberRunId);
      return {
        memberName: memberConfig.memberName,
        memberRouteKey,
        memberRunId,
        runtimeKind: memberConfig.runtimeKind,
        agentDefinitionId: memberConfig.agentDefinitionId,
        llmModelIdentifier: memberConfig.llmModelIdentifier,
        autoExecuteTools: memberConfig.autoExecuteTools,
        skillAccessMode: memberConfig.skillAccessMode,
        workspaceId: memberConfig.workspaceId ?? null,
        workspaceRootPath: memberConfig.workspaceRootPath ?? null,
        memoryDir,
        llmConfig: memberConfig.llmConfig ?? null,
        applicationExecutionContext: memberConfig.applicationExecutionContext ?? null,
      };
    });
  }
}

let cachedMixedTeamRunBackendFactory: MixedTeamRunBackendFactory | null = null;

export const getMixedTeamRunBackendFactory = (): MixedTeamRunBackendFactory => {
  if (!cachedMixedTeamRunBackendFactory) {
    cachedMixedTeamRunBackendFactory = new MixedTeamRunBackendFactory();
  }
  return cachedMixedTeamRunBackendFactory;
};
