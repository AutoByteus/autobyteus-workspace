import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { AgentTeamRunManager } from "../../../agent-team-execution/services/agent-team-run-manager.js";
import {
  TeamRuntimeRoutingError,
  getTeamMemberRuntimeOrchestrator,
} from "../../../agent-team-execution/services/team-member-runtime-orchestrator.js";
import { AgentTeamDefinitionService } from "../../../agent-team-definition/services/agent-team-definition-service.js";
import {
  TeamRunManifest,
  TeamRunMemberBinding,
  type TeamMemberRuntimeReference,
} from "../../../run-history/domain/team-models.js";
import { getTeamRunContinuationService } from "../../../run-history/services/team-run-continuation-service.js";
import { getTeamRunHistoryService } from "../../../run-history/services/team-run-history-service.js";
import { TeamMemberMemoryLayoutStore } from "../../../run-history/store/team-member-memory-layout-store.js";
import {
  buildTeamMemberRunId,
  normalizeMemberRouteKey,
} from "../../../run-history/utils/team-member-run-id.js";
import { generateTeamRunId } from "../../../run-history/utils/team-run-id.js";
import {
  DEFAULT_RUNTIME_KIND,
  isRuntimeKind,
  type RuntimeKind,
} from "../../../runtime-management/runtime-kind.js";
import { getWorkspaceManager } from "../../../workspaces/workspace-manager.js";
import { appConfigProvider } from "../../../config/app-config-provider.js";
import { UserInputConverter } from "../converters/user-input-converter.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export interface TeamMemberConfigPayload {
  memberName: string;
  agentDefinitionId: string;
  llmModelIdentifier: string;
  autoExecuteTools: boolean;
  workspaceId?: string | null;
  workspaceRootPath?: string | null;
  llmConfig?: Record<string, unknown> | null;
  memberRouteKey?: string | null;
  memberRunId?: string | null;
  runtimeKind?: string | null;
}

export interface CreateAgentTeamRunPayload {
  teamDefinitionId: string;
  memberConfigs: TeamMemberConfigPayload[];
}

export interface SendMessageToTeamPayload {
  userInput: unknown;
  teamRunId?: string | null;
  targetNodeName?: string | null;
  targetMemberName?: string | null;
  teamDefinitionId?: string | null;
  memberConfigs?: TeamMemberConfigPayload[] | null;
}

export interface CreateAgentTeamRunResultPayload {
  success: boolean;
  message: string;
  teamRunId?: string | null;
}

export interface TerminateAgentTeamRunResultPayload {
  success: boolean;
  message: string;
}

export interface SendMessageToTeamResultPayload {
  success: boolean;
  message: string;
  teamRunId?: string | null;
}

type TeamRuntimeMemberConfig = {
  memberName: string;
  runtimeKind: RuntimeKind;
  runtimeReference?: TeamMemberRuntimeReference | null;
  agentDefinitionId: string;
  llmModelIdentifier: string;
  autoExecuteTools: boolean;
  workspaceId?: string | null;
  memoryDir?: string | null;
  workspaceRootPath?: string | null;
  llmConfig?: Record<string, unknown> | null;
  memberRouteKey: string;
  memberRunId: string;
};

export class TeamRunMutationService {
  private readonly teamRunHistoryService = getTeamRunHistoryService();
  private readonly teamRunContinuationService = getTeamRunContinuationService();
  private readonly teamMemberRuntimeOrchestrator = getTeamMemberRuntimeOrchestrator();
  private readonly teamDefinitionService = AgentTeamDefinitionService.getInstance();
  private readonly workspaceManager = getWorkspaceManager();
  private readonly teamMemberMemoryLayoutStore = new TeamMemberMemoryLayoutStore(
    appConfigProvider.config.getMemoryDir(),
  );

  private get agentTeamRunManager(): AgentTeamRunManager {
    return AgentTeamRunManager.getInstance();
  }

  private generateTeamRunId(teamLabel: string | null | undefined): string {
    return generateTeamRunId(teamLabel);
  }

  private async resolveWorkspaceId(config: TeamMemberConfigPayload): Promise<string | null> {
    const workspaceId =
      typeof config.workspaceId === "string" && config.workspaceId.trim().length > 0
        ? config.workspaceId.trim()
        : null;
    if (workspaceId) {
      return workspaceId;
    }

    const workspaceRootPath =
      typeof config.workspaceRootPath === "string" && config.workspaceRootPath.trim().length > 0
        ? config.workspaceRootPath.trim()
        : null;
    if (!workspaceRootPath) {
      return null;
    }

    const workspace = await this.workspaceManager.ensureWorkspaceByRootPath(workspaceRootPath);
    return workspace.workspaceId;
  }

  private resolveWorkspaceRootPath(config: TeamRuntimeMemberConfig): string | null {
    if (typeof config.workspaceRootPath === "string" && config.workspaceRootPath.trim().length > 0) {
      return config.workspaceRootPath.trim();
    }
    if (typeof config.workspaceId !== "string" || config.workspaceId.trim().length === 0) {
      return null;
    }

    const workspace = this.workspaceManager.getWorkspaceById(config.workspaceId.trim());
    if (!workspace) {
      return null;
    }
    const rootPath =
      typeof (workspace as { rootPath?: unknown }).rootPath === "string"
        ? ((workspace as { rootPath: string }).rootPath ?? null)
        : typeof workspace.getBasePath === "function"
          ? workspace.getBasePath()
          : null;

    if (typeof rootPath !== "string") {
      return null;
    }

    const normalized = rootPath.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private resolveTeamWorkspaceRootPath(memberConfigs: TeamRuntimeMemberConfig[]): string | null {
    const workspaceRootPaths = memberConfigs
      .map((config) => this.resolveWorkspaceRootPath(config))
      .filter((value): value is string => Boolean(value));

    if (workspaceRootPaths.length === 0) {
      return null;
    }

    const uniqueRoots = Array.from(new Set(workspaceRootPaths));
    if (uniqueRoots.length > 1) {
      logger.warn(
        `Team run member workspace roots diverged (${uniqueRoots.join(", ")}); using first root for team grouping.`,
      );
    }

    return uniqueRoots[0] ?? null;
  }

  private resolveRuntimeKind(config: TeamMemberConfigPayload): RuntimeKind {
    const raw =
      typeof config.runtimeKind === "string" && config.runtimeKind.trim().length > 0
        ? config.runtimeKind.trim()
        : null;
    if (!raw) {
      return DEFAULT_RUNTIME_KIND;
    }
    if (!isRuntimeKind(raw)) {
      throw new Error(
        `[INVALID_RUNTIME_KIND] Unsupported runtime kind '${raw}' for member '${config.memberName}'.`,
      );
    }
    return raw;
  }

  private resolveTeamRuntimeMode(
    memberConfigs: TeamRuntimeMemberConfig[],
  ): "autobyteus_team" | "codex_members" {
    const runtimeKinds = new Set<RuntimeKind>(memberConfigs.map((config) => config.runtimeKind));
    if (runtimeKinds.size === 0) {
      return "autobyteus_team";
    }
    if (runtimeKinds.size > 1) {
      throw new Error(
        "[MIXED_TEAM_RUNTIME_UNSUPPORTED] Team members must use one runtime kind per team run.",
      );
    }
    const runtimeKind = Array.from(runtimeKinds)[0] ?? DEFAULT_RUNTIME_KIND;
    return runtimeKind === "codex_app_server" ? "codex_members" : "autobyteus_team";
  }

  private resolveRuntimeMemberConfigs(
    teamRunId: string,
    memberConfigs: TeamMemberConfigPayload[],
  ): TeamRuntimeMemberConfig[] {
    return memberConfigs.map((config) => {
      const memberName = config.memberName.trim();
      const memberRouteKey = normalizeMemberRouteKey(config.memberRouteKey ?? memberName);
      const memberRunId =
        typeof config.memberRunId === "string" && config.memberRunId.trim().length > 0
          ? config.memberRunId.trim()
          : buildTeamMemberRunId(teamRunId, memberRouteKey);

      const resolvedConfig: TeamRuntimeMemberConfig = {
        memberName,
        runtimeKind: this.resolveRuntimeKind(config),
        runtimeReference: null,
        agentDefinitionId: config.agentDefinitionId.trim(),
        llmModelIdentifier: config.llmModelIdentifier.trim(),
        autoExecuteTools: Boolean(config.autoExecuteTools),
        workspaceId: config.workspaceId ?? null,
        memoryDir: this.teamMemberMemoryLayoutStore.getMemberDirPath(teamRunId, memberRunId),
        workspaceRootPath:
          typeof config.workspaceRootPath === "string" && config.workspaceRootPath.trim().length > 0
            ? config.workspaceRootPath.trim()
            : null,
        llmConfig: config.llmConfig ?? null,
        memberRouteKey,
        memberRunId,
      };

      return {
        ...resolvedConfig,
        workspaceRootPath: this.resolveWorkspaceRootPath(resolvedConfig),
      };
    });
  }

  private buildTeamRunManifest(options: {
    teamRunId: string;
    teamDefinitionId: string;
    teamDefinitionName: string;
    coordinatorMemberName?: string | null;
    memberConfigs: TeamRuntimeMemberConfig[];
    memberBindingsOverride?: TeamRunMemberBinding[] | null;
  }): TeamRunManifest {
    const now = new Date().toISOString();
    const memberBindings =
      options.memberBindingsOverride && options.memberBindingsOverride.length > 0
        ? options.memberBindingsOverride.map((binding) => {
            const normalizedRouteKey = normalizeMemberRouteKey(binding.memberRouteKey);
            const sourceConfig =
              options.memberConfigs.find(
                (config) =>
                  normalizeMemberRouteKey(config.memberRouteKey ?? config.memberName) ===
                  normalizedRouteKey,
              ) ?? null;
            const fallbackWorkspaceRootPath = sourceConfig
              ? this.resolveWorkspaceRootPath(sourceConfig)
              : null;

            return {
              ...binding,
              memberRouteKey: normalizedRouteKey,
              memberName: binding.memberName.trim(),
              memberRunId: binding.memberRunId.trim(),
              runtimeKind: binding.runtimeKind,
              runtimeReference: binding.runtimeReference ?? null,
              agentDefinitionId: binding.agentDefinitionId.trim(),
              llmModelIdentifier: binding.llmModelIdentifier.trim(),
              autoExecuteTools: Boolean(binding.autoExecuteTools),
              llmConfig: binding.llmConfig ?? null,
              workspaceRootPath: binding.workspaceRootPath ?? fallbackWorkspaceRootPath ?? null,
            };
          })
        : options.memberConfigs.map((config) => {
            const memberName = config.memberName.trim();
            const routeKey = normalizeMemberRouteKey(config.memberRouteKey ?? memberName);
            const memberRunId =
              typeof config.memberRunId === "string" && config.memberRunId.trim().length > 0
                ? config.memberRunId.trim()
                : buildTeamMemberRunId(options.teamRunId, routeKey);

            return {
              memberRouteKey: routeKey,
              memberName,
              memberRunId,
              runtimeKind: config.runtimeKind,
              runtimeReference: config.runtimeReference ?? null,
              agentDefinitionId: config.agentDefinitionId.trim(),
              llmModelIdentifier: config.llmModelIdentifier.trim(),
              autoExecuteTools: Boolean(config.autoExecuteTools),
              llmConfig: config.llmConfig ?? null,
              workspaceRootPath: this.resolveWorkspaceRootPath(config),
            };
          });

    const normalizedCoordinatorName =
      typeof options.coordinatorMemberName === "string" && options.coordinatorMemberName.trim().length > 0
        ? options.coordinatorMemberName.trim()
        : null;

    const coordinatorMemberRouteKey =
      (normalizedCoordinatorName
        ? memberBindings.find((binding) => binding.memberName === normalizedCoordinatorName)
            ?.memberRouteKey ??
          memberBindings.find(
            (binding) => binding.memberRouteKey === normalizeMemberRouteKey(normalizedCoordinatorName),
          )?.memberRouteKey
        : null) ??
      memberBindings[0]?.memberRouteKey ??
      "coordinator";

    return {
      teamRunId: options.teamRunId,
      teamDefinitionId: options.teamDefinitionId.trim(),
      teamDefinitionName: options.teamDefinitionName.trim() || options.teamDefinitionId.trim(),
      workspaceRootPath:
        options.memberBindingsOverride && options.memberBindingsOverride.length > 0
          ? this.resolveTeamWorkspaceRootPath(
              options.memberBindingsOverride.map((binding) => ({
                memberName: binding.memberName,
                runtimeKind: binding.runtimeKind,
                runtimeReference: binding.runtimeReference ?? null,
                agentDefinitionId: binding.agentDefinitionId,
                llmModelIdentifier: binding.llmModelIdentifier,
                autoExecuteTools: binding.autoExecuteTools,
                workspaceId: null,
                workspaceRootPath: binding.workspaceRootPath ?? null,
                llmConfig: binding.llmConfig ?? null,
                memberRouteKey: binding.memberRouteKey,
                memberRunId: binding.memberRunId,
              })),
            )
          : this.resolveTeamWorkspaceRootPath(options.memberConfigs),
      coordinatorMemberRouteKey,
      runVersion: 1,
      createdAt: now,
      updatedAt: now,
      memberBindings,
    };
  }

  private async resolveTeamDefinitionMetadata(teamDefinitionId: string): Promise<{
    teamDefinitionName: string;
    coordinatorMemberName: string | null;
  }> {
    const normalizedId = teamDefinitionId.trim();
    if (!normalizedId) {
      return {
        teamDefinitionName: "",
        coordinatorMemberName: null,
      };
    }

    try {
      const definition = await this.teamDefinitionService.getDefinitionById(normalizedId);
      return {
        teamDefinitionName:
          typeof definition?.name === "string" && definition.name.trim().length > 0
            ? definition.name.trim()
            : normalizedId,
        coordinatorMemberName:
          typeof definition?.coordinatorMemberName === "string" &&
          definition.coordinatorMemberName.trim().length > 0
            ? definition.coordinatorMemberName.trim()
            : null,
      };
    } catch (error) {
      logger.warn(
        `Failed to resolve team definition metadata for '${normalizedId}', using fallback metadata: ${String(error)}`,
      );
      return {
        teamDefinitionName: normalizedId,
        coordinatorMemberName: null,
      };
    }
  }

  private async ensureTeamCreated(options: {
    teamDefinitionId: string;
    memberConfigs: TeamMemberConfigPayload[];
  }): Promise<{ teamRunId: string; runtimeMode: "autobyteus_team" | "codex_members" }> {
    const metadata = await this.resolveTeamDefinitionMetadata(options.teamDefinitionId);
    const teamRunId = this.generateTeamRunId(
      metadata.teamDefinitionName || options.teamDefinitionId,
    );
    const memberConfigs = await Promise.all(
      options.memberConfigs.map(async (config) => ({
        ...config,
        workspaceId: await this.resolveWorkspaceId(config),
        llmConfig: config.llmConfig ?? null,
      })),
    );
    const resolvedMemberConfigs = this.resolveRuntimeMemberConfigs(teamRunId, memberConfigs);
    const runtimeMode = this.resolveTeamRuntimeMode(resolvedMemberConfigs);
    let memberBindingsOverride: TeamRunMemberBinding[] | null = null;

    if (runtimeMode === "codex_members") {
      memberBindingsOverride = await this.teamMemberRuntimeOrchestrator.createCodexMemberSessions(
        teamRunId,
        resolvedMemberConfigs,
      );
    } else {
      this.teamMemberRuntimeOrchestrator.removeTeam(teamRunId);
      await this.agentTeamRunManager.createTeamRunWithId(
        teamRunId,
        options.teamDefinitionId,
        resolvedMemberConfigs,
      );
    }

    try {
      const manifest = this.buildTeamRunManifest({
        teamRunId,
        teamDefinitionId: options.teamDefinitionId,
        teamDefinitionName: metadata.teamDefinitionName,
        coordinatorMemberName: metadata.coordinatorMemberName,
        memberConfigs: resolvedMemberConfigs,
        memberBindingsOverride,
      });
      await this.teamRunHistoryService.upsertTeamRunHistoryRow({
        teamRunId,
        manifest,
        summary: "",
        lastKnownStatus: "IDLE",
      });
    } catch (historyError) {
      logger.warn(
        `Failed to upsert team run history for '${teamRunId}' during team create flow: ${String(historyError)}`,
      );
    }

    return { teamRunId, runtimeMode };
  }

  async createAgentTeamRun(
    input: CreateAgentTeamRunPayload,
  ): Promise<CreateAgentTeamRunResultPayload> {
    try {
      const { teamRunId } = await this.ensureTeamCreated({
        teamDefinitionId: input.teamDefinitionId,
        memberConfigs: input.memberConfigs,
      });
      return {
        success: true,
        message: "Agent team run created successfully.",
        teamRunId,
      };
    } catch (error) {
      logger.error(`Error creating agent team run: ${String(error)}`);
      return { success: false, message: String(error) };
    }
  }

  async terminateAgentTeamRun(id: string): Promise<TerminateAgentTeamRunResultPayload> {
    try {
      const runtimeMode = this.teamMemberRuntimeOrchestrator.getTeamRuntimeMode(id);
      let success = false;
      if (runtimeMode === "codex_members") {
        success = await this.teamMemberRuntimeOrchestrator.terminateCodexTeamRunSessions(id);
      } else {
        success = await this.agentTeamRunManager.terminateTeamRun(id);
      }
      if (success) {
        try {
          await this.teamRunHistoryService.onTeamTerminated(id);
        } catch (historyError) {
          logger.warn(`Failed to mark team run '${id}' terminated in history: ${String(historyError)}`);
        }
      }

      return {
        success,
        message: success
          ? "Agent team run terminated successfully."
          : "Agent team run not found.",
      };
    } catch (error) {
      logger.error(`Error terminating agent team run with ID ${id}: ${String(error)}`);
      return { success: false, message: String(error) };
    }
  }

  async sendMessageToTeam(input: SendMessageToTeamPayload): Promise<SendMessageToTeamResultPayload> {
    try {
      let teamRunId = input.teamRunId ?? null;
      let runtimeMode: "autobyteus_team" | "codex_members" | null = null;

      if (teamRunId && !input.teamDefinitionId && !input.memberConfigs) {
        await this.teamRunContinuationService.continueTeamRun({
          teamRunId,
          targetMemberRouteKey: input.targetMemberName ?? input.targetNodeName ?? null,
          userInput: input.userInput as any,
        });

        return {
          success: true,
          message: "Message sent to team successfully.",
          teamRunId,
        };
      }

      if (!teamRunId) {
        logger.info("sendMessageToTeam: teamRunId not provided. Attempting lazy creation.");
        if (!input.teamDefinitionId || !input.memberConfigs) {
          throw new Error("teamDefinitionId and memberConfigs are required for lazy team creation.");
        }
        const created = await this.ensureTeamCreated({
          teamDefinitionId: input.teamDefinitionId,
          memberConfigs: input.memberConfigs,
        });
        teamRunId = created.teamRunId;
        runtimeMode = created.runtimeMode;
        logger.info(`Lazy creation successful. New team run ID: ${teamRunId}`);
      }

      if (!teamRunId) {
        throw new Error("Team run ID could not be resolved for sendMessageToTeam.");
      }

      const userMessage = UserInputConverter.toAgentInputUserMessage(input.userInput as any);
      const targetMemberName = input.targetMemberName ?? input.targetNodeName ?? null;
      if (!runtimeMode) {
        runtimeMode = this.teamMemberRuntimeOrchestrator.getTeamRuntimeMode(teamRunId);
      }
      if (runtimeMode === "codex_members") {
        await this.teamMemberRuntimeOrchestrator.sendToMember(
          teamRunId,
          targetMemberName,
          userMessage as AgentInputUserMessage,
        );
      } else {
        const team = this.agentTeamRunManager.getTeamRun(teamRunId);
        if (!team) {
          throw new Error(`Agent team run with ID '${teamRunId}' not found.`);
        }
        await (team as any).postMessage(userMessage, targetMemberName);
      }

      try {
        await this.teamRunHistoryService.onTeamEvent(teamRunId, {
          status: "ACTIVE",
          summary: (input.userInput as { content?: string })?.content ?? "",
        });
      } catch (historyError) {
        logger.warn(`Failed to record team run activity for '${teamRunId}': ${String(historyError)}`);
      }

      return {
        success: true,
        message: "Message sent to team successfully.",
        teamRunId,
      };
    } catch (error) {
      if (error instanceof TeamRuntimeRoutingError) {
        logger.error(`Error sending message to team: [${error.code}] ${error.message}`);
        return {
          success: false,
          message: `[${error.code}] ${error.message}`,
          teamRunId: input.teamRunId ?? null,
        };
      }
      logger.error(`Error sending message to team: ${String(error)}`);
      return {
        success: false,
        message: String(error),
        teamRunId: input.teamRunId ?? null,
      };
    }
  }
}
