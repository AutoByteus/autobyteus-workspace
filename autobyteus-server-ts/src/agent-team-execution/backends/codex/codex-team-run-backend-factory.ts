import {
  TeamRunConfig,
  type TeamMemberRunConfig,
} from "../../domain/team-run-config.js";
import {
  TeamRunContext,
} from "../../domain/team-run-context.js";
import { AgentRunConfig } from "../../../agent-execution/domain/agent-run-config.js";
import { TeamMemberMemoryLayout } from "../../../agent-memory/store/team-member-memory-layout.js";
import { appConfigProvider } from "../../../config/app-config-provider.js";
import { RuntimeKind } from "../../../runtime-management/runtime-kind-enum.js";
import { CodexTeamManager } from "./codex-team-manager.js";
import type { TeamManager } from "../team-manager.js";
import { CodexTeamRunBackend } from "./codex-team-run-backend.js";
import type { TeamRunBackendFactory } from "../team-run-backend-factory.js";
import {
  CodexTeamMemberContext,
  CodexTeamRunContext,
} from "./codex-team-run-context.js";
import { generateTeamRunId } from "../../../run-history/utils/team-run-id-utils.js";
import { buildTeamMemberRunId, normalizeMemberRouteKey } from "../../../run-history/utils/team-member-run-id.js";

export type CodexTeamRunBackendFactoryOptions = {
  createTeamManager?: (context: TeamRunContext<CodexTeamRunContext>) => CodexTeamManager;
  memoryDir?: string;
};

export class CodexTeamRunBackendFactory implements TeamRunBackendFactory {
  private readonly createTeamManager: (context: TeamRunContext<CodexTeamRunContext>) => CodexTeamManager;
  private readonly memberLayout: TeamMemberMemoryLayout;

  constructor(options: CodexTeamRunBackendFactoryOptions = {}) {
    this.createTeamManager =
      options.createTeamManager ?? ((context) => new CodexTeamManager(context));
    this.memberLayout = new TeamMemberMemoryLayout(
      options.memoryDir ?? appConfigProvider.config.getMemoryDir(),
    );
  }

  async createBackend(config: TeamRunConfig): Promise<CodexTeamRunBackend> {
    const teamRunId = generateTeamRunId(config.teamDefinitionId);
    const context = this.buildTeamRunContext(config, teamRunId);
    const teamManager = this.createTeamManager(context);
    return this.createBackendFromContext(context, teamManager);
  }

  async restoreBackend(
    context: TeamRunContext<CodexTeamRunContext>,
  ): Promise<CodexTeamRunBackend> {
    const teamManager = this.createTeamManager(context);
    return this.createBackendFromContext(context, teamManager);
  }

  private buildTeamRunContext(
    config: TeamRunConfig,
    teamRunId: string,
  ): TeamRunContext<CodexTeamRunContext> {
    const memberConfigs = this.toTeamMemberRunConfigs(config, teamRunId);
    const runtimeContext = new CodexTeamRunContext({
      coordinatorMemberRouteKey: null,
      memberContexts: memberConfigs.map(
        (memberConfig) => {
          const memberRunId =
            memberConfig.memberRunId?.trim() ||
            buildTeamMemberRunId(teamRunId, memberConfig.memberRouteKey ?? memberConfig.memberName);
          return new CodexTeamMemberContext({
            memberName: memberConfig.memberName,
            memberRouteKey: memberConfig.memberRouteKey ?? memberConfig.memberName,
            memberRunId,
            agentRunConfig: new AgentRunConfig({
              runtimeKind: RuntimeKind.CODEX_APP_SERVER,
              agentDefinitionId: memberConfig.agentDefinitionId,
              llmModelIdentifier: memberConfig.llmModelIdentifier,
              autoExecuteTools: memberConfig.autoExecuteTools,
              workspaceId: memberConfig.workspaceId ?? null,
              memoryDir: memberConfig.memoryDir ?? null,
              llmConfig: memberConfig.llmConfig ?? null,
              skillAccessMode: memberConfig.skillAccessMode,
              applicationExecutionContext: memberConfig.applicationExecutionContext ?? null,
            }),
            threadId: null,
          });
        },
      ),
    });
    return new TeamRunContext({
      runId: teamRunId,
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      coordinatorMemberName: null,
      config: new TeamRunConfig({
        teamDefinitionId: config.teamDefinitionId,
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        memberConfigs,
      }),
      runtimeContext,
    });
  }

  private createBackendFromContext(
    context: TeamRunContext<CodexTeamRunContext>,
    teamManager: TeamManager,
  ): CodexTeamRunBackend {
    return new CodexTeamRunBackend(context as TeamRunContext<CodexTeamRunContext>, teamManager);
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
        memoryDir:
          typeof memberConfig.memoryDir === "string" && memberConfig.memoryDir.trim().length > 0
            ? memberConfig.memoryDir.trim()
            : this.memberLayout.getMemberDirPath(teamRunId, memberRunId),
        runtimeKind: memberConfig.runtimeKind,
        agentDefinitionId: memberConfig.agentDefinitionId,
        llmModelIdentifier: memberConfig.llmModelIdentifier,
        autoExecuteTools: memberConfig.autoExecuteTools,
        skillAccessMode: memberConfig.skillAccessMode,
        workspaceId: memberConfig.workspaceId ?? null,
        workspaceRootPath: memberConfig.workspaceRootPath ?? null,
        llmConfig: memberConfig.llmConfig ?? null,
        applicationExecutionContext: memberConfig.applicationExecutionContext ?? null,
      };
    });
  }
}

let cachedCodexTeamRunBackendFactory: CodexTeamRunBackendFactory | null = null;

export const getCodexTeamRunBackendFactory = (): CodexTeamRunBackendFactory => {
  if (!cachedCodexTeamRunBackendFactory) {
    cachedCodexTeamRunBackendFactory = new CodexTeamRunBackendFactory();
  }
  return cachedCodexTeamRunBackendFactory;
};
