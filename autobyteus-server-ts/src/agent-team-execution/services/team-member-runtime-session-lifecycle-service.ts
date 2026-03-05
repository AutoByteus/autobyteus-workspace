import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { TempWorkspace } from "../../workspaces/temp-workspace.js";
import type { WorkspaceManager } from "../../workspaces/workspace-manager.js";
import type { RuntimeCompositionService } from "../../runtime-execution/runtime-composition-service.js";
import { normalizeRuntimeKind, type RuntimeKind } from "../../runtime-management/runtime-kind.js";
import type {
  TeamMemberRuntimeReference,
  TeamRunManifest,
  TeamRunMemberBinding,
} from "../../run-history/domain/team-models.js";
import { normalizeMemberRouteKey } from "../../run-history/utils/team-member-run-id.js";
import { isSendMessageToToolName } from "../../runtime-execution/codex-app-server/codex-send-message-tooling.js";
import type { TeamRuntimeBindingRegistry } from "./team-runtime-binding-registry.js";
import {
  normalizeOptionalString,
  normalizeRequiredString,
  TeamRuntimeRoutingError,
} from "./team-member-runtime-errors.js";
import type { TeamRuntimeMemberConfig } from "./team-member-runtime-orchestrator.types.js";

type TeamManifestMetadataMember = {
  memberName: string;
  role: string | null;
  description: string | null;
};

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

const parseMetadataBoolean = (value: unknown): boolean | null => {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") {
      return true;
    }
    if (normalized === "false" || normalized === "0") {
      return false;
    }
  }
  return null;
};

const resolveWorkspaceRootPathFromWorkspace = (
  workspace: { getBasePath?: () => string; rootPath?: string } | null | undefined,
): string | null => {
  if (!workspace) {
    return null;
  }
  const basePath =
    typeof workspace.getBasePath === "function" ? workspace.getBasePath() : workspace.rootPath;
  if (typeof basePath !== "string") {
    return null;
  }
  const normalized = basePath.trim();
  return normalized.length > 0 ? normalized : null;
};

const toRuntimeReference = (
  runtimeKind: RuntimeKind,
  runId: string,
  reference?: TeamMemberRuntimeReference | null,
  metadata?: Record<string, unknown> | null,
): TeamMemberRuntimeReference => ({
  runtimeKind,
  sessionId: reference?.sessionId ?? runId,
  threadId: reference?.threadId ?? null,
  metadata: {
    ...(reference?.metadata ?? {}),
    ...(metadata ?? {}),
  },
});

const ensureExternalMemberRuntime = (runtimeKind: RuntimeKind): void => {
  if (runtimeKind === "autobyteus") {
    throw new TeamRuntimeRoutingError({
      code: "TEAM_RUNTIME_MODE_UNSUPPORTED",
      message: `Runtime '${runtimeKind}' is not supported by external member runtime orchestrator.`,
    });
  }
};

export class TeamMemberRuntimeSessionLifecycleService {
  private readonly runtimeCompositionService: RuntimeCompositionService;
  private readonly teamRuntimeBindingRegistry: TeamRuntimeBindingRegistry;
  private readonly workspaceManager: WorkspaceManager;
  private readonly agentDefinitionService: AgentDefinitionService;

  constructor(options: {
    runtimeCompositionService: RuntimeCompositionService;
    teamRuntimeBindingRegistry: TeamRuntimeBindingRegistry;
    workspaceManager: WorkspaceManager;
    agentDefinitionService: AgentDefinitionService;
  }) {
    this.runtimeCompositionService = options.runtimeCompositionService;
    this.teamRuntimeBindingRegistry = options.teamRuntimeBindingRegistry;
    this.workspaceManager = options.workspaceManager;
    this.agentDefinitionService = options.agentDefinitionService;
  }

  async createExternalMemberSessions(
    teamRunId: string,
    memberConfigs: TeamRuntimeMemberConfig[],
  ): Promise<TeamRunMemberBinding[]> {
    const normalizedTeamRunId = normalizeRequiredString(teamRunId, "teamRunId");
    const teamMemberManifest = await this.buildTeamManifestMetadata(
      memberConfigs.map((member) => ({
        memberName: member.memberName,
        agentDefinitionId: member.agentDefinitionId,
      })),
    );
    const bindings: TeamRunMemberBinding[] = [];

    for (const config of memberConfigs) {
      const runtimeKind = normalizeRuntimeKind(config.runtimeKind);
      ensureExternalMemberRuntime(runtimeKind);
      const memberRouteKey = normalizeMemberRouteKey(config.memberRouteKey);
      const memberRunId = normalizeRequiredString(config.memberRunId, "memberRunId");
      const workspaceRootPath = await this.resolveWorkspaceRootPath(config);
      const sendMessageToEnabled = await this.resolveSendMessageToCapability({
        agentDefinitionId: config.agentDefinitionId,
        runtimeReference: config.runtimeReference ?? null,
      });

      const session = await this.runtimeCompositionService.restoreAgentRun({
        runId: memberRunId,
        runtimeKind,
        runtimeReference: toRuntimeReference(runtimeKind, memberRunId, config.runtimeReference, {
          teamRunId: normalizedTeamRunId,
          memberRouteKey,
          memberName: config.memberName,
          sendMessageToEnabled,
          teamMemberManifest,
        }),
        agentDefinitionId: normalizeRequiredString(config.agentDefinitionId, "agentDefinitionId"),
        llmModelIdentifier: normalizeRequiredString(
          config.llmModelIdentifier,
          "llmModelIdentifier",
        ),
        autoExecuteTools: Boolean(config.autoExecuteTools),
        workspaceId: config.workspaceId ?? null,
        llmConfig: config.llmConfig ?? null,
      });

      bindings.push({
        memberRouteKey,
        memberName: normalizeRequiredString(config.memberName, "memberName"),
        memberRunId,
        runtimeKind,
        runtimeReference: toRuntimeReference(
          runtimeKind,
          memberRunId,
          (session.runtimeReference as TeamMemberRuntimeReference | null | undefined) ?? null,
          {
            teamRunId: normalizedTeamRunId,
            memberRouteKey,
            memberName: config.memberName,
            sendMessageToEnabled,
            teamMemberManifest,
          },
        ),
        agentDefinitionId: normalizeRequiredString(config.agentDefinitionId, "agentDefinitionId"),
        llmModelIdentifier: normalizeRequiredString(
          config.llmModelIdentifier,
          "llmModelIdentifier",
        ),
        autoExecuteTools: Boolean(config.autoExecuteTools),
        llmConfig: config.llmConfig ?? null,
        workspaceRootPath,
      });
    }

    this.teamRuntimeBindingRegistry.upsertTeamBindings(
      normalizedTeamRunId,
      "external_member_runtime",
      bindings,
    );
    return bindings;
  }

  async restoreExternalTeamRunSessions(manifest: TeamRunManifest): Promise<TeamRunMemberBinding[]> {
    const normalizedTeamRunId = normalizeRequiredString(manifest.teamRunId, "teamRunId");
    const teamMemberManifest = await this.buildTeamManifestMetadata(
      manifest.memberBindings.map((member) => ({
        memberName: member.memberName,
        agentDefinitionId: member.agentDefinitionId,
      })),
    );
    const bindings: TeamRunMemberBinding[] = [];

    for (const binding of manifest.memberBindings) {
      const runtimeKind = normalizeRuntimeKind(binding.runtimeKind);
      ensureExternalMemberRuntime(runtimeKind);
      const sendMessageToEnabled = await this.resolveSendMessageToCapability({
        agentDefinitionId: binding.agentDefinitionId,
        runtimeReference: binding.runtimeReference ?? null,
      });

      let workspaceId: string | null = null;
      if (binding.workspaceRootPath) {
        try {
          const workspace = await this.workspaceManager.ensureWorkspaceByRootPath(
            binding.workspaceRootPath,
          );
          workspaceId = workspace.workspaceId;
        } catch (error) {
          logger.warn(
            `Failed to restore workspace for member '${binding.memberName}' (${binding.workspaceRootPath}): ${String(error)}`,
          );
        }
      }

      const session = await this.runtimeCompositionService.restoreAgentRun({
        runId: binding.memberRunId,
        runtimeKind,
        runtimeReference: toRuntimeReference(runtimeKind, binding.memberRunId, binding.runtimeReference, {
          teamRunId: normalizedTeamRunId,
          memberRouteKey: binding.memberRouteKey,
          memberName: binding.memberName,
          sendMessageToEnabled,
          teamMemberManifest,
        }),
        agentDefinitionId: binding.agentDefinitionId,
        llmModelIdentifier: binding.llmModelIdentifier,
        autoExecuteTools: binding.autoExecuteTools,
        workspaceId,
        llmConfig: binding.llmConfig ?? null,
      });

      bindings.push({
        ...binding,
        runtimeKind,
        runtimeReference: toRuntimeReference(
          runtimeKind,
          binding.memberRunId,
          (session.runtimeReference as TeamMemberRuntimeReference | null | undefined) ?? null,
          {
            teamRunId: normalizedTeamRunId,
            memberRouteKey: binding.memberRouteKey,
            memberName: binding.memberName,
            sendMessageToEnabled,
            teamMemberManifest,
          },
        ),
      });
    }

    this.teamRuntimeBindingRegistry.upsertTeamBindings(
      normalizedTeamRunId,
      "external_member_runtime",
      bindings,
    );
    return bindings;
  }

  private async resolveWorkspaceRootPath(config: TeamRuntimeMemberConfig): Promise<string | null> {
    const explicitRootPath = normalizeOptionalString(config.workspaceRootPath);
    if (explicitRootPath) {
      return explicitRootPath;
    }

    const workspaceId = normalizeOptionalString(config.workspaceId);
    if (!workspaceId) {
      return null;
    }

    const existingWorkspace = this.workspaceManager.getWorkspaceById(workspaceId);
    const existingWorkspaceRootPath = resolveWorkspaceRootPathFromWorkspace(existingWorkspace);
    if (existingWorkspaceRootPath) {
      return existingWorkspaceRootPath;
    }

    if (workspaceId === TempWorkspace.TEMP_WORKSPACE_ID) {
      try {
        const tempWorkspace = await this.workspaceManager.getOrCreateTempWorkspace();
        const tempWorkspaceRootPath = resolveWorkspaceRootPathFromWorkspace(tempWorkspace);
        if (tempWorkspaceRootPath) {
          return tempWorkspaceRootPath;
        }
      } catch (error) {
        logger.warn(
          `Failed resolving temp workspace root path for member '${config.memberName}': ${String(error)}`,
        );
      }
      return null;
    }

    try {
      const workspace = await this.workspaceManager.getOrCreateWorkspace(workspaceId);
      return resolveWorkspaceRootPathFromWorkspace(workspace);
    } catch (error) {
      logger.warn(
        `Failed resolving workspace root path for member '${config.memberName}' (workspaceId=${workspaceId}): ${String(error)}`,
      );
      return null;
    }
  }

  private async resolveSendMessageToCapability(options: {
    agentDefinitionId: string;
    runtimeReference?: TeamMemberRuntimeReference | null;
  }): Promise<boolean> {
    const metadata = options.runtimeReference?.metadata;
    const explicitDisableFlag = parseMetadataBoolean(
      metadata?.sendMessageToExplicitlyDisabled ?? metadata?.send_message_to_explicitly_disabled,
    );
    if (explicitDisableFlag === true) {
      return false;
    }

    const metadataFlag = parseMetadataBoolean(
      metadata?.sendMessageToEnabled ?? metadata?.send_message_to_enabled,
    );
    if (metadataFlag === true) {
      return true;
    }

    try {
      const definition = await this.agentDefinitionService.getAgentDefinitionById(
        options.agentDefinitionId,
      );
      const toolNames = definition?.toolNames ?? [];
      if (
        toolNames.some((toolName) =>
          isSendMessageToToolName(typeof toolName === "string" ? toolName : null),
        )
      ) {
        return true;
      }
    } catch (error) {
      logger.warn(
        `Failed resolving send_message_to capability for agent definition '${options.agentDefinitionId}': ${String(error)}`,
      );
    }

    return true;
  }

  private async buildTeamManifestMetadata(
    members: Array<{ memberName: string; agentDefinitionId: string }>,
  ): Promise<TeamManifestMetadataMember[]> {
    const manifest: TeamManifestMetadataMember[] = [];
    for (const member of members) {
      const memberName = normalizeRequiredString(member.memberName, "memberName");
      const agentDefinitionId = normalizeRequiredString(member.agentDefinitionId, "agentDefinitionId");
      try {
        const definition = await this.agentDefinitionService.getAgentDefinitionById(
          agentDefinitionId,
        );
        manifest.push({
          memberName,
          role:
            typeof definition?.role === "string" && definition.role.trim().length > 0
              ? definition.role.trim()
              : null,
          description:
            typeof definition?.description === "string" && definition.description.trim().length > 0
              ? definition.description.trim()
              : null,
        });
      } catch (error) {
        logger.warn(
          `Failed resolving team-manifest metadata for member '${memberName}' (agentDefinitionId='${agentDefinitionId}'): ${String(error)}`,
        );
        manifest.push({
          memberName,
          role: null,
          description: null,
        });
      }
    }
    return manifest;
  }
}
