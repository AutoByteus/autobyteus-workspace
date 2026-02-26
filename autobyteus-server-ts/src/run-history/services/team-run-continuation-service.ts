import type { AgentInputUserMessage } from "autobyteus-ts";
import { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import { UserInputConverter } from "../../api/graphql/converters/user-input-converter.js";
import type { AgentUserInput } from "../../api/graphql/types/agent-user-input.js";
import { getWorkspaceManager, type WorkspaceManager } from "../../workspaces/workspace-manager.js";
import { TeamMemberMemoryLayoutStore } from "../store/team-member-memory-layout-store.js";
import { normalizeMemberRouteKey } from "../utils/team-member-run-id.js";
import {
  TeamRunHistoryService,
  getTeamRunHistoryService,
} from "./team-run-history-service.js";
import { appConfigProvider } from "../../config/app-config-provider.js";

type TeamLike = {
  teamRunId: string;
  postMessage: (message: AgentInputUserMessage, targetMemberName?: string | null) => Promise<void>;
};

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

const normalizeRouteKey = (value: string): string => {
  try {
    return normalizeMemberRouteKey(value);
  } catch {
    return value.trim();
  }
};

export class TeamRunContinuationService {
  private readonly teamRunManager: TeamRunManagerLike;
  private readonly teamRunHistoryService: TeamRunHistoryService;
  private readonly workspaceManager: WorkspaceManager;
  private readonly memberLayoutStore: TeamMemberMemoryLayoutStore;

  constructor(options: {
    teamRunManager?: TeamRunManagerLike;
    teamRunHistoryService?: TeamRunHistoryService;
    workspaceManager?: WorkspaceManager;
    memoryDir?: string;
  } = {}) {
    this.teamRunManager = options.teamRunManager ?? AgentTeamRunManager.getInstance();
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
      let team = this.teamRunManager.getTeamRun(teamRunId) as TeamLike | null;
      if (!team) {
        await this.restoreTeamRuntime(teamRunId);
        restored = true;
        team = this.teamRunManager.getTeamRun(teamRunId) as TeamLike | null;
      }
      if (!team) {
        throw new Error(`Team run '${teamRunId}' restore failed.`);
      }

      const targetMemberName = await this.resolveTargetMemberName(
        teamRunId,
        input.targetMemberRouteKey ?? null,
      );
      await team.postMessage(userMessage, targetMemberName);
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

    const memberConfigs = await Promise.all(
      manifest.memberBindings.map(async (binding) => {
        let workspaceId: string | null = null;
        if (binding.workspaceRootPath) {
          const workspace = await this.workspaceManager.ensureWorkspaceByRootPath(
            binding.workspaceRootPath,
          );
          workspaceId = workspace.workspaceId;
        }
        return {
          memberName: binding.memberName,
          agentDefinitionId: binding.agentDefinitionId,
          llmModelIdentifier: binding.llmModelIdentifier,
          autoExecuteTools: binding.autoExecuteTools,
          workspaceId,
          memoryDir: this.memberLayoutStore.getMemberDirPath(teamRunId, binding.memberRunId),
          llmConfig: binding.llmConfig ?? null,
          memberRouteKey: binding.memberRouteKey,
          memberRunId: binding.memberRunId,
        };
      }),
    );

    await this.teamRunManager.createTeamRunWithId(
      teamRunId,
      manifest.teamDefinitionId,
      memberConfigs,
    );
  }

  private async resolveTargetMemberName(
    teamRunId: string,
    targetMemberRouteKey: string | null,
  ): Promise<string | null> {
    const normalizedTarget = normalizeOptionalString(targetMemberRouteKey);
    if (!normalizedTarget) {
      return null;
    }

    try {
      const resumeConfig = await this.teamRunHistoryService.getTeamRunResumeConfig(teamRunId);
      const normalizedRoute = normalizeRouteKey(normalizedTarget);
      const member = resumeConfig.manifest.memberBindings.find(
        (binding) =>
          normalizeRouteKey(binding.memberRouteKey) === normalizedRoute ||
          binding.memberName.trim() === normalizedTarget,
      );
      return member?.memberName ?? normalizedTarget;
    } catch {
      return normalizedTarget;
    }
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
