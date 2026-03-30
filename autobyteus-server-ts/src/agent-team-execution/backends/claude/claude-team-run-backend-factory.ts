import {
  TeamRunConfig,
  type TeamMemberRunConfig,
} from "../../domain/team-run-config.js";
import { TeamRunContext } from "../../domain/team-run-context.js";
import { AgentRunConfig } from "../../../agent-execution/domain/agent-run-config.js";
import { RuntimeKind } from "../../../runtime-management/runtime-kind-enum.js";
import { ClaudeTeamRunBackend } from "./claude-team-run-backend.js";
import type { TeamRunBackendFactory } from "../team-run-backend-factory.js";
import { ClaudeTeamManager } from "./claude-team-manager.js";
import {
  ClaudeTeamMemberContext,
  ClaudeTeamRunContext,
} from "./claude-team-run-context.js";
import type { TeamManager } from "../team-manager.js";
import { generateTeamRunId } from "../../../run-history/utils/team-run-id-utils.js";
import { buildTeamMemberRunId, normalizeMemberRouteKey } from "../../../run-history/utils/team-member-run-id.js";

export type ClaudeTeamRunBackendFactoryOptions = {
  createTeamManager?: (context: TeamRunContext<ClaudeTeamRunContext>) => ClaudeTeamManager;
};

export class ClaudeTeamRunBackendFactory implements TeamRunBackendFactory {
  private readonly createTeamManager: (context: TeamRunContext<ClaudeTeamRunContext>) => ClaudeTeamManager;

  constructor(options: ClaudeTeamRunBackendFactoryOptions = {}) {
    this.createTeamManager =
      options.createTeamManager ?? ((context) => new ClaudeTeamManager(context));
  }

  async createBackend(config: TeamRunConfig): Promise<ClaudeTeamRunBackend> {
    const teamRunId = generateTeamRunId(config.teamDefinitionId);
    const context = this.buildTeamRunContext(config, teamRunId);
    const teamManager = this.createTeamManager(context);
    return this.createBackendFromContext(context, teamManager);
  }

  async restoreBackend(
    context: TeamRunContext<ClaudeTeamRunContext>,
  ): Promise<ClaudeTeamRunBackend> {
    const teamManager = this.createTeamManager(context);
    return this.createBackendFromContext(context, teamManager);
  }

  private buildTeamRunContext(
    config: TeamRunConfig,
    teamRunId: string,
  ): TeamRunContext<ClaudeTeamRunContext> {
    const memberConfigs = this.toTeamMemberRunConfigs(config, teamRunId);

    const runtimeContext = new ClaudeTeamRunContext({
      coordinatorMemberRouteKey: null,
      memberContexts: memberConfigs.map(
        (memberConfig) => {
          const memberRunId =
            memberConfig.memberRunId?.trim() ||
            buildTeamMemberRunId(teamRunId, memberConfig.memberRouteKey ?? memberConfig.memberName);
          return new ClaudeTeamMemberContext({
            memberName: memberConfig.memberName,
            memberRouteKey: memberConfig.memberRouteKey ?? memberConfig.memberName,
            memberRunId,
            agentRunConfig: new AgentRunConfig({
              runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
              agentDefinitionId: memberConfig.agentDefinitionId,
              llmModelIdentifier: memberConfig.llmModelIdentifier,
              autoExecuteTools: memberConfig.autoExecuteTools,
              workspaceId: memberConfig.workspaceId ?? null,
              llmConfig: memberConfig.llmConfig ?? null,
              skillAccessMode: memberConfig.skillAccessMode,
            }),
            sessionId: null,
          });
        },
      ),
    });

    return new TeamRunContext({
      runId: teamRunId,
      runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
      coordinatorMemberName: null,
      config: new TeamRunConfig({
        teamDefinitionId: config.teamDefinitionId,
        runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
        memberConfigs,
      }),
      runtimeContext,
    });
  }

  private createBackendFromContext(
    context: TeamRunContext<ClaudeTeamRunContext>,
    teamManager: TeamManager,
  ): ClaudeTeamRunBackend {
    return new ClaudeTeamRunBackend(context as TeamRunContext<ClaudeTeamRunContext>, {
      claudeTeamManager: teamManager,
    });
  }

  private toTeamMemberRunConfigs(config: TeamRunConfig, teamRunId: string): TeamMemberRunConfig[] {
    return config.memberConfigs.map((memberConfig) => {
      const memberRouteKey = normalizeMemberRouteKey(
        memberConfig.memberRouteKey ?? memberConfig.memberName,
      );
      const memberRunId =
        memberConfig.memberRunId?.trim() || buildTeamMemberRunId(teamRunId, memberRouteKey);
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
        llmConfig: memberConfig.llmConfig ?? null,
      };
    });
  }
}

let cachedClaudeTeamRunBackendFactory: ClaudeTeamRunBackendFactory | null = null;

export const getClaudeTeamRunBackendFactory = (): ClaudeTeamRunBackendFactory => {
  if (!cachedClaudeTeamRunBackendFactory) {
    cachedClaudeTeamRunBackendFactory = new ClaudeTeamRunBackendFactory();
  }
  return cachedClaudeTeamRunBackendFactory;
};
