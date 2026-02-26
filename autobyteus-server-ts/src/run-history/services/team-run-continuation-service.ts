import type { AgentInputUserMessage } from "autobyteus-ts";
import { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import { UserInputConverter } from "../../api/graphql/converters/user-input-converter.js";
import type { AgentUserInput } from "../../api/graphql/types/agent-user-input.js";
import { getDefaultTeamCommandIngressService } from "../../distributed/bootstrap/default-distributed-runtime-composition.js";
import type { TeamCommandIngressService } from "../../distributed/ingress/team-command-ingress-service.js";
import { getWorkspaceManager, type WorkspaceManager } from "../../workspaces/workspace-manager.js";
import {
  TeamRunHistoryService,
  getTeamRunHistoryService,
} from "./team-run-history-service.js";
import { TeamMemberMemoryLayoutStore } from "../store/team-member-memory-layout-store.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { canonicalizeWorkspaceRootPath } from "../utils/workspace-path-normalizer.js";

type TeamLike = {
  teamRunId: string;
};

type TeamCommandIngressLike = Pick<TeamCommandIngressService, "dispatchUserMessage">;

type TeamRunManagerLike = Pick<
  AgentTeamRunManager,
  "getTeamRun" | "createTeamRunWithId" | "terminateTeamRun"
>;

export interface ContinueTeamRunInput {
  teamRunId: string;
  userInput: AgentUserInput;
  targetMemberRouteKey?: string | null;
}

export interface ContinueTeamRunResult {
  teamRunId: string;
  restored: boolean;
}

const normalizeRequiredString = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};

const normalizeOptionalString = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const resolveLocalNodeId = (): string => {
  const fromEnv = normalizeOptionalString(process.env.AUTOBYTEUS_NODE_ID);
  return fromEnv ?? "local";
};

const isLocalHostNode = (hostNodeId: string | null, localNodeId: string): boolean => {
  if (!hostNodeId) {
    return true;
  }
  if (hostNodeId === "embedded-local" || hostNodeId === "local") {
    return true;
  }
  return hostNodeId === localNodeId;
};

export class TeamRunContinuationService {
  private readonly teamRunManager: TeamRunManagerLike;
  private readonly teamCommandIngressService: TeamCommandIngressLike;
  private readonly teamRunHistoryService: TeamRunHistoryService;
  private readonly workspaceManager: WorkspaceManager;
  private readonly memberLayoutStore: TeamMemberMemoryLayoutStore;

  constructor(options: {
    teamRunManager?: TeamRunManagerLike;
    teamCommandIngressService?: TeamCommandIngressLike;
    teamRunHistoryService?: TeamRunHistoryService;
    workspaceManager?: WorkspaceManager;
    memoryDir?: string;
  } = {}) {
    this.teamRunManager = options.teamRunManager ?? AgentTeamRunManager.getInstance();
    this.teamCommandIngressService =
      options.teamCommandIngressService ?? getDefaultTeamCommandIngressService();
    this.teamRunHistoryService = options.teamRunHistoryService ?? getTeamRunHistoryService();
    this.workspaceManager = options.workspaceManager ?? getWorkspaceManager();
    this.memberLayoutStore = new TeamMemberMemoryLayoutStore(
      options.memoryDir ?? appConfigProvider.config.getMemoryDir(),
    );
  }

  async continueTeamRun(input: ContinueTeamRunInput): Promise<ContinueTeamRunResult> {
    const teamRunId = normalizeRequiredString(input.teamRunId, "teamRunId");
    const content = normalizeRequiredString(input.userInput?.content ?? "", "userInput.content");
    const userMessage = UserInputConverter.toAgentInputUserMessage({
      ...input.userInput,
      content,
    });

    let restored = false;
    try {
      if (!this.teamRunManager.getTeamRun(teamRunId)) {
        await this.restoreTeamRuntime(teamRunId);
        restored = true;
      }

      await this.dispatchUserMessage(teamRunId, userMessage, input.targetMemberRouteKey ?? null);
      await this.safeRecordActivity(teamRunId, content);
      return {
        teamRunId,
        restored,
      };
    } catch (error) {
      if (restored) {
        await this.safeTerminate(teamRunId);
      }
      throw error;
    }
  }

  private async restoreTeamRuntime(teamRunId: string): Promise<void> {
    const resumeConfig = await this.teamRunHistoryService.getTeamRunResumeConfig(teamRunId);
    const manifest = resumeConfig.manifest;
    const localNodeId = resolveLocalNodeId();
    const memberConfigs = await Promise.all(
      manifest.memberBindings.map(async (binding) => {
        const hostNodeId = normalizeOptionalString(binding.hostNodeId);
        const workspaceRootPath = binding.workspaceRootPath
          ? canonicalizeWorkspaceRootPath(binding.workspaceRootPath)
          : null;
        let workspaceId: string | null = null;
        if (workspaceRootPath && isLocalHostNode(hostNodeId, localNodeId)) {
          const workspace = await this.workspaceManager.ensureWorkspaceByRootPath(
            workspaceRootPath,
          );
          const actualWorkspaceRootPath = this.resolveWorkspaceRootPath(workspace);
          if (
            actualWorkspaceRootPath &&
            canonicalizeWorkspaceRootPath(actualWorkspaceRootPath) !== workspaceRootPath
          ) {
            throw new Error(
              `Workspace root mismatch for member '${binding.memberRouteKey}' in team '${teamRunId}'.`,
            );
          }
          workspaceId = workspace.workspaceId;
        }
        return {
          memberName: binding.memberName,
          agentDefinitionId: binding.agentDefinitionId,
          llmModelIdentifier: binding.llmModelIdentifier,
          autoExecuteTools: binding.autoExecuteTools,
          workspaceId,
          workspaceRootPath,
          llmConfig: binding.llmConfig ?? null,
          memberRouteKey: binding.memberRouteKey,
          memberAgentId: binding.memberAgentId,
          memoryDir: this.memberLayoutStore.getMemberDirPath(teamRunId, binding.memberAgentId),
          hostNodeId,
        };
      }),
    );
    await this.teamRunManager.createTeamRunWithId(
      teamRunId,
      manifest.teamDefinitionId,
      memberConfigs,
    );
  }

  private resolveWorkspaceRootPath(workspace: unknown): string | null {
    if (!workspace || typeof workspace !== "object") {
      return null;
    }
    const candidate = workspace as { rootPath?: unknown; getBasePath?: () => unknown };
    if (typeof candidate.rootPath === "string" && candidate.rootPath.trim().length > 0) {
      return candidate.rootPath.trim();
    }
    if (typeof candidate.getBasePath === "function") {
      const basePath = candidate.getBasePath();
      if (typeof basePath === "string" && basePath.trim().length > 0) {
        return basePath.trim();
      }
    }
    return null;
  }

  private async dispatchUserMessage(
    teamRunId: string,
    userMessage: AgentInputUserMessage,
    targetMemberRouteKey: string | null,
  ): Promise<void> {
    await this.teamCommandIngressService.dispatchUserMessage({
      teamId: teamRunId,
      userMessage,
      targetMemberName: normalizeOptionalString(targetMemberRouteKey),
    });
  }

  private async safeRecordActivity(teamRunId: string, summary: string): Promise<void> {
    try {
      await this.teamRunHistoryService.onTeamEvent(teamRunId, {
        status: "ACTIVE",
        summary,
      });
    } catch (error) {
      console.warn(`Failed to update team run history for '${teamRunId}': ${String(error)}`);
    }
  }

  private async safeTerminate(teamRunId: string): Promise<void> {
    try {
      await this.teamRunManager.terminateTeamRun(teamRunId);
    } catch (error) {
      console.warn(`Rollback failed while terminating restored team '${teamRunId}': ${String(error)}`);
    }
  }
}

let cachedTeamRunContinuationService: TeamRunContinuationService | null = null;

export const getTeamRunContinuationService = (): TeamRunContinuationService => {
  if (!cachedTeamRunContinuationService) {
    cachedTeamRunContinuationService = new TeamRunContinuationService();
  }
  return cachedTeamRunContinuationService;
};
