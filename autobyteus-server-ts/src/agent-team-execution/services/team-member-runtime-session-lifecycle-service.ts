import type { AgentDefinition } from "../../agent-definition/domain/models.js";
import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import type { RuntimeCompositionService } from "../../runtime-execution/runtime-composition-service.js";
import type { RuntimeAdapterRegistry } from "../../runtime-execution/runtime-adapter-registry.js";
import { normalizeRuntimeKind, type RuntimeKind } from "../../runtime-management/runtime-kind.js";
import type {
  TeamRunManifest,
  TeamRunMemberBinding,
  TeamMemberRuntimeReference,
} from "../../run-history/domain/team-models.js";
import { normalizeMemberRouteKey } from "../../run-history/utils/team-member-run-id.js";
import { TempWorkspace } from "../../workspaces/temp-workspace.js";
import type { WorkspaceManager } from "../../workspaces/workspace-manager.js";
import type {
  RuntimeRunReference,
  TeamRuntimeExecutionMode,
} from "../../runtime-execution/runtime-adapter-port.js";
import type { TeamRuntimeBindingRegistry, TeamRuntimeMode } from "./team-runtime-binding-registry.js";
import type { TeamRuntimeMemberConfig } from "./team-member-runtime-orchestrator.types.js";
import {
  TeamRuntimeRoutingError,
  normalizeOptionalString,
  normalizeRequiredString,
} from "./team-member-runtime-errors.js";
import {
  MemberRuntimeInstructionSourceResolver,
  type MemberRuntimeInstructionSources,
} from "./member-runtime-instruction-source-resolver.js";
import {
  cloneMemberBinding,
  isRuntimeReferenceChanged,
  mergeRuntimeReferenceMetadata,
  toRuntimeReference,
} from "./team-member-runtime-reference-utils.js";

type TeamManifestMetadataMember = {
  memberName: string;
  role: string | null;
  description: string | null;
};

type TeamRuntimeAgentDefinition = Pick<AgentDefinition, "toolNames" | "role" | "description">;

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

const isSendMessageToToolName = (toolName: string | null): boolean => {
  if (!toolName) {
    return false;
  }
  const normalized = toolName.trim().toLowerCase();
  return (
    normalized === "send_message_to" ||
    normalized.endsWith("__send_message_to") ||
    normalized.endsWith(".send_message_to") ||
    normalized.endsWith("/send_message_to")
  );
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

export class TeamMemberRuntimeSessionLifecycleService {
  private readonly instructionSourceResolver: MemberRuntimeInstructionSourceResolver;

  constructor(
    private readonly runtimeCompositionService: RuntimeCompositionService,
    private readonly runtimeAdapterRegistry: RuntimeAdapterRegistry,
    private readonly teamRuntimeBindingRegistry: TeamRuntimeBindingRegistry,
    private readonly workspaceManager: WorkspaceManager,
    private readonly agentDefinitionService: AgentDefinitionService,
    private readonly agentTeamDefinitionService: AgentTeamDefinitionService,
  ) {
    this.instructionSourceResolver = new MemberRuntimeInstructionSourceResolver(
      agentDefinitionService,
      agentTeamDefinitionService,
    );
  }

  getTeamRuntimeMode(teamRunId: string): TeamRuntimeMode | null {
    return this.teamRuntimeBindingRegistry.getTeamMode(teamRunId);
  }

  removeTeam(teamRunId: string): void {
    this.teamRuntimeBindingRegistry.removeTeam(teamRunId);
  }

  getTeamBindings(teamRunId: string): TeamRunMemberBinding[] {
    return this.teamRuntimeBindingRegistry.getTeamBindings(teamRunId);
  }

  listActiveTeamRunIds(): string[] {
    return this.teamRuntimeBindingRegistry.listTeamRunIds();
  }

  getActiveMemberBindings(teamRunId: string): TeamRunMemberBinding[] {
    const state = this.teamRuntimeBindingRegistry.getTeamBindingState(teamRunId);
    if (!state || state.memberBindings.length === 0) {
      return [];
    }

    let changed = false;
    const refreshedBindings = state.memberBindings.map((binding) => {
      const nextRuntimeReference = this.resolveLatestRuntimeReference(binding);
      if (isRuntimeReferenceChanged(binding.runtimeReference, nextRuntimeReference)) {
        changed = true;
      }
      return {
        ...binding,
        runtimeReference: nextRuntimeReference,
      };
    });

    if (changed) {
      this.teamRuntimeBindingRegistry.upsertTeamBindings(teamRunId, state.mode, refreshedBindings);
    }

    return refreshedBindings.map((binding) => cloneMemberBinding(binding));
  }

  hasActiveMemberBinding(teamRunId: string): boolean {
    return this.getTeamBindings(teamRunId).length > 0;
  }

  private getInstructionSourceResolver(): MemberRuntimeInstructionSourceResolver {
    return this.instructionSourceResolver;
  }

  private async resolveAgentDefinition(
    agentDefinitionId: string,
  ): Promise<TeamRuntimeAgentDefinition | null> {
    const getFreshAgentDefinitionById = (
      this.agentDefinitionService as AgentDefinitionService & {
        getFreshAgentDefinitionById?: (
          definitionId: string,
        ) => Promise<TeamRuntimeAgentDefinition | null>;
      }
    ).getFreshAgentDefinitionById;
    if (typeof getFreshAgentDefinitionById === "function") {
      return await getFreshAgentDefinitionById.call(this.agentDefinitionService, agentDefinitionId);
    }
    return await this.agentDefinitionService.getAgentDefinitionById(agentDefinitionId);
  }

  private resolveTeamExecutionMode(runtimeKind: RuntimeKind): TeamRuntimeExecutionMode {
    const adapter = this.runtimeAdapterRegistry.resolveAdapter(runtimeKind);
    return adapter.teamExecutionMode ?? "member_runtime";
  }

  private ensureSupportedMemberRuntime(runtimeKind: RuntimeKind): void {
    const mode = this.resolveTeamExecutionMode(runtimeKind);
    if (mode !== "member_runtime") {
      throw new TeamRuntimeRoutingError({
        code: "TEAM_RUNTIME_MODE_UNSUPPORTED",
        message: `Runtime '${runtimeKind}' is not supported by member-runtime orchestration.`,
      });
    }
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
    const metadataFlag =
      metadata?.sendMessageToEnabled ?? metadata?.send_message_to_enabled;
    if (typeof metadataFlag === "boolean") {
      return metadataFlag;
    }
    if (typeof metadataFlag === "string") {
      const normalized = metadataFlag.trim().toLowerCase();
      if (normalized === "true" || normalized === "1") {
        return true;
      }
      if (normalized === "false" || normalized === "0") {
        return false;
      }
    }

    try {
      const definition = await this.resolveAgentDefinition(options.agentDefinitionId);
      const toolNames = Array.isArray(definition?.toolNames)
        ? definition.toolNames.filter((toolName): toolName is string => typeof toolName === "string")
        : [];
      if (toolNames.length === 0) {
        return true;
      }
      return toolNames.some((toolName) => isSendMessageToToolName(toolName));
    } catch (error) {
      logger.warn(
        `Failed resolving send_message_to capability for agent definition '${options.agentDefinitionId}': ${String(error)}`,
      );
      return true;
    }
  }

  private async buildTeamManifestMetadata(
    members: Array<{
      memberName: string;
      agentDefinitionId: string;
    }>,
  ): Promise<TeamManifestMetadataMember[]> {
    const manifest: TeamManifestMetadataMember[] = [];
    for (const member of members) {
      const memberName = normalizeRequiredString(member.memberName, "memberName");
      const agentDefinitionId = normalizeRequiredString(
        member.agentDefinitionId,
        "agentDefinitionId",
      );
      try {
        const definition = await this.resolveAgentDefinition(agentDefinitionId);
        manifest.push({
          memberName,
          role:
            typeof definition?.role === "string" && definition.role.trim().length > 0
              ? definition.role.trim()
              : null,
          description:
            typeof definition?.description === "string" &&
            definition.description.trim().length > 0
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

  private async buildRuntimeReferenceMetadata(input: {
    teamRunId: string;
    teamDefinitionId: string;
    memberRouteKey: string;
    memberName: string;
    agentDefinitionId: string;
    runtimeReference?: TeamMemberRuntimeReference | null;
    teamMemberManifest: TeamManifestMetadataMember[];
  }): Promise<{
    metadata: Record<string, unknown>;
    sendMessageToEnabled: boolean;
    instructionSources: MemberRuntimeInstructionSources;
  }> {
    const sendMessageToEnabled = await this.resolveSendMessageToCapability({
      agentDefinitionId: input.agentDefinitionId,
      runtimeReference: input.runtimeReference ?? null,
    });
    const instructionSources = await this.getInstructionSourceResolver().resolveForMember({
      teamDefinitionId: input.teamDefinitionId,
      agentDefinitionId: input.agentDefinitionId,
    });

    return {
      sendMessageToEnabled,
      instructionSources,
      metadata: {
        teamRunId: input.teamRunId,
        teamDefinitionId: input.teamDefinitionId,
        memberRouteKey: input.memberRouteKey,
        memberName: input.memberName,
        sendMessageToEnabled,
        teamMemberManifest: input.teamMemberManifest,
        memberInstructionSources: {
          teamInstructions: instructionSources.teamInstructions,
          agentInstructions: instructionSources.agentInstructions,
        },
        teamInstructions: instructionSources.teamInstructions,
        agentInstructions: instructionSources.agentInstructions,
      },
    };
  }

  async createMemberRuntimeSessions(
    teamRunId: string,
    teamDefinitionId: string,
    memberConfigs: TeamRuntimeMemberConfig[],
  ): Promise<TeamRunMemberBinding[]> {
    const normalizedTeamRunId = normalizeRequiredString(teamRunId, "teamRunId");
    const normalizedTeamDefinitionId = normalizeRequiredString(teamDefinitionId, "teamDefinitionId");
    const teamMemberManifest = await this.buildTeamManifestMetadata(
      memberConfigs.map((member) => ({
        memberName: member.memberName,
        agentDefinitionId: member.agentDefinitionId,
      })),
    );
    const bindings: TeamRunMemberBinding[] = [];

    for (const config of memberConfigs) {
      const runtimeKind = normalizeRuntimeKind(config.runtimeKind);
      this.ensureSupportedMemberRuntime(runtimeKind);
      const memberRouteKey = normalizeMemberRouteKey(config.memberRouteKey);
      const memberRunId = normalizeRequiredString(config.memberRunId, "memberRunId");
      const workspaceRootPath = await this.resolveWorkspaceRootPath(config);
      const { metadata, sendMessageToEnabled } = await this.buildRuntimeReferenceMetadata({
        teamRunId: normalizedTeamRunId,
        teamDefinitionId: normalizedTeamDefinitionId,
        memberRouteKey,
        memberName: config.memberName,
        agentDefinitionId: config.agentDefinitionId,
        runtimeReference: config.runtimeReference ?? null,
        teamMemberManifest,
      });

      const session = await this.runtimeCompositionService.restoreAgentRun({
        runId: memberRunId,
        runtimeKind,
        runtimeReference: toRuntimeReference(runtimeKind, memberRunId, config.runtimeReference, metadata),
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
          metadata,
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

    this.teamRuntimeBindingRegistry.upsertTeamBindings(normalizedTeamRunId, "member_runtime", bindings);
    return bindings;
  }

  async restoreMemberRuntimeSessions(manifest: TeamRunManifest): Promise<TeamRunMemberBinding[]> {
    const normalizedTeamRunId = normalizeRequiredString(manifest.teamRunId, "teamRunId");
    const normalizedTeamDefinitionId = normalizeRequiredString(
      manifest.teamDefinitionId,
      "teamDefinitionId",
    );
    const teamMemberManifest = await this.buildTeamManifestMetadata(
      manifest.memberBindings.map((member) => ({
        memberName: member.memberName,
        agentDefinitionId: member.agentDefinitionId,
      })),
    );
    const bindings: TeamRunMemberBinding[] = [];

    for (const binding of manifest.memberBindings) {
      const runtimeKind = normalizeRuntimeKind(binding.runtimeKind);
      this.ensureSupportedMemberRuntime(runtimeKind);
      const { metadata } = await this.buildRuntimeReferenceMetadata({
        teamRunId: normalizedTeamRunId,
        teamDefinitionId: normalizedTeamDefinitionId,
        memberRouteKey: binding.memberRouteKey,
        memberName: binding.memberName,
        agentDefinitionId: binding.agentDefinitionId,
        runtimeReference: binding.runtimeReference ?? null,
        teamMemberManifest,
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
        runtimeReference: toRuntimeReference(
          runtimeKind,
          binding.memberRunId,
          binding.runtimeReference,
          metadata,
        ),
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
          metadata,
        ),
      });
    }

    this.teamRuntimeBindingRegistry.upsertTeamBindings(normalizedTeamRunId, "member_runtime", bindings);
    return bindings;
  }

  refreshBindingRuntimeReference(
    teamRunId: string,
    memberRunId: string,
    runtimeKind: RuntimeKind,
    runtimeReference: TeamMemberRuntimeReference | null | undefined,
  ): void {
    if (!runtimeReference) {
      return;
    }

    const state = this.teamRuntimeBindingRegistry.getTeamBindingState(teamRunId);
    if (!state) {
      return;
    }

    const nextBindings = state.memberBindings.map((binding) => {
      if (binding.memberRunId !== memberRunId) {
        return binding;
      }
      const mergedReference: TeamMemberRuntimeReference = {
        runtimeKind,
        sessionId: runtimeReference.sessionId ?? binding.runtimeReference?.sessionId ?? memberRunId,
        threadId: runtimeReference.threadId ?? binding.runtimeReference?.threadId ?? null,
        metadata: mergeRuntimeReferenceMetadata(binding.runtimeReference, runtimeReference),
      };
      return {
        ...binding,
        runtimeKind,
        runtimeReference: mergedReference,
      };
    });

    this.teamRuntimeBindingRegistry.upsertTeamBindings(teamRunId, state.mode, nextBindings);
  }

  private resolveLatestRuntimeReference(
    binding: TeamRunMemberBinding,
  ): TeamMemberRuntimeReference | null {
    const existingReference = binding.runtimeReference ?? null;

    try {
      const adapter = this.runtimeAdapterRegistry.resolveAdapter(binding.runtimeKind);
      const latestReference = adapter.getRunRuntimeReference?.(binding.memberRunId) ?? null;
      if (!latestReference) {
        return existingReference;
      }
      return this.mergeLatestRuntimeReference(binding, latestReference);
    } catch (error) {
      logger.warn(
        `Failed refreshing runtime reference for member '${binding.memberRunId}' (${binding.runtimeKind}): ${String(error)}`,
      );
      return existingReference;
    }
  }

  private mergeLatestRuntimeReference(
    binding: TeamRunMemberBinding,
    latestReference: RuntimeRunReference,
  ): TeamMemberRuntimeReference {
    return {
      runtimeKind: binding.runtimeKind,
      sessionId:
        latestReference.sessionId ??
        latestReference.threadId ??
        binding.runtimeReference?.sessionId ??
        binding.memberRunId,
      threadId:
        latestReference.threadId ??
        latestReference.sessionId ??
        binding.runtimeReference?.threadId ??
        null,
      metadata: {
        ...(binding.runtimeReference?.metadata ?? {}),
        ...(latestReference.metadata ?? {}),
      },
    };
  }
}
