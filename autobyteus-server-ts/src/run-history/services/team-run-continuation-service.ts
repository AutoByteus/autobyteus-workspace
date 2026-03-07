import type { AgentInputUserMessage } from "autobyteus-ts";
import { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import {
  TeamMemberRuntimeOrchestrator,
  TeamRuntimeRoutingError,
  getTeamMemberRuntimeOrchestrator,
} from "../../agent-team-execution/services/team-member-runtime-orchestrator.js";
import { UserInputConverter } from "../../api/graphql/converters/user-input-converter.js";
import type { AgentUserInput } from "../../api/graphql/types/agent-user-input.js";
import { getWorkspaceManager, type WorkspaceManager } from "../../workspaces/workspace-manager.js";
import { TeamMemberMemoryLayoutStore } from "../store/team-member-memory-layout-store.js";
import type { TeamRunManifest } from "../domain/team-models.js";
import type { TeamRunMemberBinding } from "../domain/team-models.js";
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

const mergeRestoredMemberBindings = (
  currentBindings: TeamRunMemberBinding[],
  restoredBindings: TeamRunMemberBinding[],
): TeamRunMemberBinding[] => {
  const restoredByRunId = new Map<string, TeamRunMemberBinding>();
  const restoredByRouteKey = new Map<string, TeamRunMemberBinding>();

  for (const binding of restoredBindings) {
    restoredByRunId.set(binding.memberRunId, binding);
    restoredByRouteKey.set(normalizeRouteKey(binding.memberRouteKey), binding);
  }

  return currentBindings.map((binding) => {
    const byRunId = restoredByRunId.get(binding.memberRunId);
    if (byRunId) {
      return byRunId;
    }
    const byRouteKey = restoredByRouteKey.get(normalizeRouteKey(binding.memberRouteKey));
    return byRouteKey ?? binding;
  });
};

export class TeamRunContinuationService {
  private readonly teamRunManager: TeamRunManagerLike;
  private readonly teamRunHistoryService: TeamRunHistoryService;
  private readonly workspaceManager: WorkspaceManager;
  private readonly memberLayoutStore: TeamMemberMemoryLayoutStore;
  private readonly teamMemberRuntimeOrchestrator: TeamMemberRuntimeOrchestrator;

  constructor(options: {
    teamRunManager?: TeamRunManagerLike;
    teamRunHistoryService?: TeamRunHistoryService;
    workspaceManager?: WorkspaceManager;
    teamMemberRuntimeOrchestrator?: TeamMemberRuntimeOrchestrator;
    memoryDir?: string;
  } = {}) {
    this.teamRunManager = options.teamRunManager ?? AgentTeamRunManager.getInstance();
    this.teamRunHistoryService = options.teamRunHistoryService ?? getTeamRunHistoryService();
    this.workspaceManager = options.workspaceManager ?? getWorkspaceManager();
    this.teamMemberRuntimeOrchestrator =
      options.teamMemberRuntimeOrchestrator ?? getTeamMemberRuntimeOrchestrator();
    this.memberLayoutStore = new TeamMemberMemoryLayoutStore(
      options.memoryDir ?? appConfigProvider.config.getMemoryDir(),
    );
  }

  async continueTeamRun(input: ContinueTeamRunInput): Promise<ContinueTeamRunResult> {
    const teamRunId = normalizeRequiredString(input.teamRunId, "teamRunId");
    const content = normalizeRequiredString(input.userInput?.content ?? "", "userInput.content");
    const resumeConfig = await this.teamRunHistoryService.getTeamRunResumeConfig(teamRunId);
    const manifest = resumeConfig.manifest;

    const userMessage = UserInputConverter.toAgentInputUserMessage({
      ...input.userInput,
      content,
    });

    if (this.isMemberRuntimeManifest(manifest)) {
      return this.continueMemberRuntimeTeamRun({
        teamRunId,
        userMessage,
        targetMemberRouteKey: input.targetMemberRouteKey ?? null,
        content,
        manifest,
      });
    }

    let restored = false;
    try {
      let team = this.teamRunManager.getTeamRun(teamRunId) as TeamLike | null;
      if (!team) {
        await this.restoreAutobyteusTeamRuntime(teamRunId, manifest);
        restored = true;
        team = this.teamRunManager.getTeamRun(teamRunId) as TeamLike | null;
      }
      if (!team) {
        throw new Error(`Team run '${teamRunId}' restore failed.`);
      }

      const targetMemberName = this.resolveTargetMemberName(
        manifest,
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
        await this.safeTerminateAutobyteus(teamRunId);
      }
      throw error;
    }
  }

  private async continueMemberRuntimeTeamRun(input: {
    teamRunId: string;
    userMessage: AgentInputUserMessage;
    targetMemberRouteKey: string | null;
    content: string;
    manifest: TeamRunManifest;
  }): Promise<ContinueTeamRunResult> {
    let restored = false;
    let effectiveManifest = input.manifest;
    try {
      if (!this.teamMemberRuntimeOrchestrator.hasActiveMemberBinding(input.teamRunId)) {
        const restoredBindings =
          await this.teamMemberRuntimeOrchestrator.restoreMemberRuntimeSessions(input.manifest);
        effectiveManifest = {
          ...input.manifest,
          updatedAt: new Date().toISOString(),
          memberBindings: mergeRestoredMemberBindings(
            input.manifest.memberBindings,
            restoredBindings,
          ),
        };
        try {
          await this.teamRunHistoryService.persistTeamRunManifest(
            input.teamRunId,
            effectiveManifest,
          );
        } catch (persistError) {
          console.warn(
              `Failed to persist refreshed member-runtime team manifest for '${input.teamRunId}': ${String(persistError)}`,
          );
        }
        restored = true;
      }

      const targetMemberName = this.resolveTargetMemberName(
        effectiveManifest,
        input.targetMemberRouteKey,
      );
      const fallbackTargetMemberName = this.resolveCoordinatorMemberName(effectiveManifest);

      await this.teamMemberRuntimeOrchestrator.sendToMember(
        input.teamRunId,
        targetMemberName,
        input.userMessage,
        { fallbackTargetMemberName },
      );
      await this.safeRecordActivity(input.teamRunId, input.content);

      return {
        teamRunId: input.teamRunId,
        restored,
      };
    } catch (error) {
      if (restored) {
        this.teamMemberRuntimeOrchestrator.removeTeam(input.teamRunId);
      }
      if (error instanceof TeamRuntimeRoutingError) {
        throw new Error(`[${error.code}] ${error.message}`);
      }
      throw error;
    }
  }

  private async restoreAutobyteusTeamRuntime(teamRunId: string, manifest: TeamRunManifest): Promise<void> {
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

  private resolveTargetMemberName(
    manifest: TeamRunManifest,
    targetMemberRouteKey: string | null,
  ): string | null {
    const normalizedTarget = normalizeOptionalString(targetMemberRouteKey);
    if (!normalizedTarget) {
      return null;
    }

    const normalizedRoute = normalizeRouteKey(normalizedTarget);
    const member = manifest.memberBindings.find(
      (binding) =>
        normalizeRouteKey(binding.memberRouteKey) === normalizedRoute ||
        binding.memberName.trim() === normalizedTarget,
    );
    return member?.memberName ?? normalizedTarget;
  }

  private resolveCoordinatorMemberName(manifest: TeamRunManifest): string | null {
    const coordinator = manifest.memberBindings.find(
      (binding) => binding.memberRouteKey === manifest.coordinatorMemberRouteKey,
    );
    return coordinator?.memberName ?? null;
  }

  private isMemberRuntimeManifest(manifest: TeamRunManifest): boolean {
    if (manifest.memberBindings.length === 0) {
      return false;
    }
    return manifest.memberBindings.every(
      (binding) =>
        typeof binding.runtimeKind === "string" &&
        binding.runtimeKind.length > 0 &&
        binding.runtimeKind !== "autobyteus",
    );
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

  private async safeTerminateAutobyteus(teamRunId: string): Promise<void> {
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
