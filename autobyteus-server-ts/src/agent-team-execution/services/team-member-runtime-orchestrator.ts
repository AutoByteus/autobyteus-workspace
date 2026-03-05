import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { getWorkspaceManager, type WorkspaceManager } from "../../workspaces/workspace-manager.js";
import { TempWorkspace } from "../../workspaces/temp-workspace.js";
import {
  getRuntimeCompositionService,
  type RuntimeCompositionService,
} from "../../runtime-execution/runtime-composition-service.js";
import {
  getRuntimeCommandIngressService,
  type RuntimeCommandIngressService,
} from "../../runtime-execution/runtime-command-ingress-service.js";
import {
  getRuntimeAdapterRegistry,
  type RuntimeAdapterRegistry,
} from "../../runtime-execution/runtime-adapter-registry.js";
import { normalizeRuntimeKind, type RuntimeKind } from "../../runtime-management/runtime-kind.js";
import type {
  TeamRunManifest,
  TeamRunMemberBinding,
  TeamMemberRuntimeReference,
} from "../../run-history/domain/team-models.js";
import { normalizeMemberRouteKey } from "../../run-history/utils/team-member-run-id.js";
import {
  getTeamRuntimeInterAgentMessageRelay,
  type TeamRuntimeInterAgentMessageRelay,
} from "../../runtime-execution/team-runtime-inter-agent-message-relay.js";
import type {
  RuntimeAdapter,
  RuntimeInterAgentRelayRequest,
  RuntimeInterAgentRelayResult,
  TeamRuntimeExecutionMode,
} from "../../runtime-execution/runtime-adapter-port.js";
import {
  getTeamRuntimeBindingRegistry,
  type TeamRuntimeBindingRegistry,
  type TeamRuntimeMode,
} from "./team-runtime-binding-registry.js";

export interface TeamRuntimeMemberConfig {
  memberName: string;
  memberRouteKey: string;
  memberRunId: string;
  runtimeKind: RuntimeKind;
  runtimeReference?: TeamMemberRuntimeReference | null;
  agentDefinitionId: string;
  llmModelIdentifier: string;
  autoExecuteTools: boolean;
  workspaceId?: string | null;
  workspaceRootPath?: string | null;
  llmConfig?: Record<string, unknown> | null;
}

type TeamManifestMetadataMember = {
  memberName: string;
  role: string | null;
  description: string | null;
};

export interface RelayInterAgentMessageInput {
  teamRunId: string;
  senderMemberRunId: string;
  recipientName: string;
  content: string;
  messageType?: string | null;
  senderAgentName?: string | null;
}

export interface TeamRuntimeRoutingErrorShape {
  code: string;
  message: string;
}

export class TeamRuntimeRoutingError extends Error {
  readonly code: string;

  constructor(input: TeamRuntimeRoutingErrorShape) {
    super(input.message);
    this.code = input.code;
    this.name = "TeamRuntimeRoutingError";
  }
}

const normalizeRequiredString = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new TeamRuntimeRoutingError({
      code: "INVALID_INPUT",
      message: `${fieldName} is required.`,
    });
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

const isSendMessageToToolName = (toolName: string | null): boolean => {
  if (!toolName) {
    return false;
  }
  const normalized = toolName.trim().toLowerCase();
  return (
    normalized === "send_message_to" ||
    normalized.endsWith(".send_message_to") ||
    normalized.endsWith("/send_message_to")
  );
};

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
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

export class TeamMemberRuntimeOrchestrator {
  private readonly runtimeCompositionService: RuntimeCompositionService;
  private readonly runtimeCommandIngressService: RuntimeCommandIngressService;
  private readonly runtimeAdapterRegistry: RuntimeAdapterRegistry;
  private readonly teamRuntimeBindingRegistry: TeamRuntimeBindingRegistry;
  private readonly teamRuntimeInterAgentMessageRelay: TeamRuntimeInterAgentMessageRelay;
  private readonly workspaceManager: WorkspaceManager;
  private readonly agentDefinitionService: AgentDefinitionService;

  constructor(options: {
    runtimeCompositionService?: RuntimeCompositionService;
    runtimeCommandIngressService?: RuntimeCommandIngressService;
    runtimeAdapterRegistry?: RuntimeAdapterRegistry;
    teamRuntimeBindingRegistry?: TeamRuntimeBindingRegistry;
    teamRuntimeInterAgentMessageRelay?: TeamRuntimeInterAgentMessageRelay;
    workspaceManager?: WorkspaceManager;
    agentDefinitionService?: AgentDefinitionService;
  } = {}) {
    this.runtimeCompositionService =
      options.runtimeCompositionService ?? getRuntimeCompositionService();
    this.runtimeCommandIngressService =
      options.runtimeCommandIngressService ?? getRuntimeCommandIngressService();
    this.runtimeAdapterRegistry =
      options.runtimeAdapterRegistry ?? getRuntimeAdapterRegistry();
    this.teamRuntimeBindingRegistry =
      options.teamRuntimeBindingRegistry ?? getTeamRuntimeBindingRegistry();
    this.teamRuntimeInterAgentMessageRelay =
      options.teamRuntimeInterAgentMessageRelay ?? getTeamRuntimeInterAgentMessageRelay();
    this.workspaceManager = options.workspaceManager ?? getWorkspaceManager();
    this.agentDefinitionService = options.agentDefinitionService ?? AgentDefinitionService.getInstance();
  }

  getTeamRuntimeMode(teamRunId: string): TeamRuntimeMode | null {
    return this.teamRuntimeBindingRegistry.getTeamMode(teamRunId);
  }

  removeTeam(teamRunId: string): void {
    this.teamRuntimeBindingRegistry.removeTeam(teamRunId);
  }

  async terminateMemberRuntimeSessions(teamRunId: string): Promise<boolean> {
    const bindings = this.teamRuntimeBindingRegistry.getTeamBindings(teamRunId);
    if (bindings.length === 0) {
      return false;
    }

    for (const binding of bindings) {
      const result = await this.runtimeCommandIngressService.terminateRun({
        runId: binding.memberRunId,
        mode: "agent",
      });
      if (!result.accepted) {
        logger.warn(
          `Failed terminating member runtime '${binding.memberRunId}' for team '${teamRunId}': [${result.code ?? "UNKNOWN"}] ${result.message ?? "no message"}`,
        );
      }
    }

    this.teamRuntimeBindingRegistry.removeTeam(teamRunId);
    return true;
  }

  hasActiveMemberBinding(teamRunId: string): boolean {
    return this.teamRuntimeBindingRegistry.getTeamBindings(teamRunId).length > 0;
  }

  getTeamBindings(teamRunId: string): TeamRunMemberBinding[] {
    return this.teamRuntimeBindingRegistry.getTeamBindings(teamRunId);
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
      const definition = await this.agentDefinitionService.getAgentDefinitionById(
        options.agentDefinitionId,
      );
      const toolNames = definition?.toolNames ?? [];
      return toolNames.some((toolName) =>
        isSendMessageToToolName(typeof toolName === "string" ? toolName : null),
      );
    } catch (error) {
      logger.warn(
        `Failed resolving send_message_to capability for agent definition '${options.agentDefinitionId}': ${String(error)}`,
      );
      return false;
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

  async createMemberRuntimeSessions(
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
      this.ensureSupportedMemberRuntime(runtimeKind);
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

    this.teamRuntimeBindingRegistry.upsertTeamBindings(normalizedTeamRunId, "member_runtime", bindings);
    return bindings;
  }

  async restoreMemberRuntimeSessions(manifest: TeamRunManifest): Promise<TeamRunMemberBinding[]> {
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
      this.ensureSupportedMemberRuntime(runtimeKind);
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
        runtimeReference: toRuntimeReference(
          runtimeKind,
          binding.memberRunId,
          binding.runtimeReference,
          {
            teamRunId: normalizedTeamRunId,
            memberRouteKey: binding.memberRouteKey,
            memberName: binding.memberName,
            sendMessageToEnabled,
            teamMemberManifest,
          },
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

    this.teamRuntimeBindingRegistry.upsertTeamBindings(normalizedTeamRunId, "member_runtime", bindings);
    return bindings;
  }

  async sendToMember(
    teamRunId: string,
    targetMemberName: string | null | undefined,
    message: AgentInputUserMessage,
    options: { fallbackTargetMemberName?: string | null } = {},
  ): Promise<void> {
    const resolvedTarget =
      normalizeOptionalString(targetMemberName) ??
      normalizeOptionalString(options.fallbackTargetMemberName);
    const resolveResult = this.teamRuntimeBindingRegistry.resolveMemberBinding(
      teamRunId,
      resolvedTarget,
    );
    if (!resolveResult.binding) {
      throw new TeamRuntimeRoutingError({
        code: resolveResult.code,
        message: resolveResult.message,
      });
    }

    const commandResult = await this.runtimeCommandIngressService.sendTurn({
      runId: resolveResult.binding.memberRunId,
      mode: "agent",
      message,
    });
    if (!commandResult.accepted) {
      throw new TeamRuntimeRoutingError({
        code: commandResult.code ?? "TEAM_MEMBER_RUNTIME_SEND_FAILED",
        message:
          commandResult.message ??
          `Failed routing message to member '${resolveResult.binding.memberName}'.`,
      });
    }
  }

  async approveForMember(
    teamRunId: string,
    targetMemberName: string | null | undefined,
    invocationId: string,
    approved: boolean,
    reason?: string | null,
  ): Promise<void> {
    const resolveResult = this.teamRuntimeBindingRegistry.resolveMemberBinding(
      teamRunId,
      targetMemberName,
    );
    if (!resolveResult.binding) {
      throw new TeamRuntimeRoutingError({
        code: resolveResult.code,
        message: resolveResult.message,
      });
    }

    const commandResult = await this.runtimeCommandIngressService.approveTool({
      runId: resolveResult.binding.memberRunId,
      mode: "agent",
      invocationId,
      approved,
      reason: reason ?? null,
      approvalTarget: resolveResult.binding.memberName,
      approvalTargetSource: "target_member_name",
    });
    if (!commandResult.accepted) {
      throw new TeamRuntimeRoutingError({
        code: commandResult.code ?? "TEAM_MEMBER_RUNTIME_APPROVAL_FAILED",
        message:
          commandResult.message ??
          `Failed routing tool approval to member '${resolveResult.binding.memberName}'.`,
      });
    }
  }

  async relayInterAgentMessage(
    input: RelayInterAgentMessageInput,
  ): Promise<{ accepted: boolean; code?: string; message?: string }> {
    const sender = this.teamRuntimeBindingRegistry.resolveByMemberRunId(input.senderMemberRunId);
    if (!sender || sender.teamRunId !== input.teamRunId) {
      return {
        accepted: false,
        code: "SENDER_MEMBER_NOT_FOUND",
        message: `Sender member run '${input.senderMemberRunId}' is not bound to team '${input.teamRunId}'.`,
      };
    }

    const resolveResult = this.teamRuntimeBindingRegistry.resolveMemberBinding(
      input.teamRunId,
      input.recipientName,
    );
    if (!resolveResult.binding) {
      return {
        accepted: false,
        code: resolveResult.code,
        message: resolveResult.message,
      };
    }

    const relayResult = await this.teamRuntimeInterAgentMessageRelay.deliverInterAgentMessage({
      teamRunId: input.teamRunId,
      recipientMemberRunId: resolveResult.binding.memberRunId,
      senderAgentRunId: sender.binding.memberRunId,
      senderAgentName: normalizeOptionalString(input.senderAgentName) ?? sender.binding.memberName,
      recipientName: resolveResult.binding.memberName,
      messageType: normalizeOptionalString(input.messageType) ?? "agent_message",
      content: normalizeRequiredString(input.content, "content"),
      metadata: {
        senderMemberRouteKey: sender.binding.memberRouteKey,
        recipientMemberRouteKey: resolveResult.binding.memberRouteKey,
      },
    });

    if (!relayResult.accepted) {
      return {
        accepted: false,
        code: relayResult.code ?? "RECIPIENT_UNAVAILABLE",
        message:
          relayResult.message ??
          `Recipient '${resolveResult.binding.memberName}' is unavailable for inter-agent delivery.`,
      };
    }

    return { accepted: true };
  }

  async handleRuntimeInterAgentRelayRequest(
    request: RuntimeInterAgentRelayRequest,
  ): Promise<RuntimeInterAgentRelayResult> {
    const recipientNameRaw =
      request.toolArguments.recipient_name ??
      request.toolArguments.recipientName ??
      request.toolArguments.recipient;
    const contentRaw = request.toolArguments.content;
    const messageTypeRaw =
      request.toolArguments.message_type ?? request.toolArguments.messageType ?? "agent_message";

    if (typeof recipientNameRaw !== "string" || recipientNameRaw.trim().length === 0) {
      return {
        accepted: false,
        code: "RECIPIENT_NOT_FOUND_OR_AMBIGUOUS",
        message: "send_message_to requires a non-empty recipient_name.",
      };
    }
    if (typeof contentRaw !== "string" || contentRaw.trim().length === 0) {
      return {
        accepted: false,
        code: "INVALID_MESSAGE_CONTENT",
        message: "send_message_to requires a non-empty content field.",
      };
    }

    const resolvedTeamRunId =
      normalizeOptionalString(request.senderTeamRunId) ??
      this.teamRuntimeBindingRegistry.resolveByMemberRunId(request.senderRunId)?.teamRunId ??
      null;
    if (!resolvedTeamRunId) {
      return {
        accepted: false,
        code: "SENDER_MEMBER_NOT_FOUND",
        message: `Sender member run '${request.senderRunId}' is not mapped to an active team runtime binding.`,
      };
    }

    return this.relayInterAgentMessage({
      teamRunId: resolvedTeamRunId,
      senderMemberRunId: request.senderRunId,
      recipientName: recipientNameRaw,
      content: contentRaw,
      messageType: typeof messageTypeRaw === "string" ? messageTypeRaw : "agent_message",
      senderAgentName: request.senderMemberName,
    });
  }
}

let cachedTeamMemberRuntimeOrchestrator: TeamMemberRuntimeOrchestrator | null = null;
let cachedRelayUnbind: (() => void) | null = null;
const relayBindingTokenByAdapter = new WeakMap<RuntimeAdapter, symbol>();

const getOrCreateTeamMemberRuntimeOrchestrator = (): TeamMemberRuntimeOrchestrator => {
  if (!cachedTeamMemberRuntimeOrchestrator) {
    cachedTeamMemberRuntimeOrchestrator = new TeamMemberRuntimeOrchestrator();
  }
  return cachedTeamMemberRuntimeOrchestrator;
};

export const bindTeamMemberRuntimeRelayHandler = (options: {
  orchestrator?: TeamMemberRuntimeOrchestrator;
  runtimeAdapterRegistry?: RuntimeAdapterRegistry;
} = {}): (() => void) => {
  const orchestrator = options.orchestrator ?? getOrCreateTeamMemberRuntimeOrchestrator();
  const runtimeAdapterRegistry = options.runtimeAdapterRegistry ?? getRuntimeAdapterRegistry();
  const unbindHandlers: Array<() => void> = [];

  for (const runtimeKind of runtimeAdapterRegistry.listRuntimeKinds()) {
    const adapter = runtimeAdapterRegistry.resolveAdapter(runtimeKind);
    if (!adapter.bindInterAgentRelayHandler) {
      continue;
    }
    const bindingToken = Symbol(`team-member-runtime-relay-binding:${runtimeKind}`);
    const unbind = adapter.bindInterAgentRelayHandler((request) =>
      orchestrator.handleRuntimeInterAgentRelayRequest(request),
    );
    relayBindingTokenByAdapter.set(adapter, bindingToken);
    unbindHandlers.push(() => {
      if (relayBindingTokenByAdapter.get(adapter) !== bindingToken) {
        return;
      }
      relayBindingTokenByAdapter.delete(adapter);
      unbind();
    });
  }

  return () => {
    for (const unbind of unbindHandlers) {
      unbind();
    }
  };
};

export const ensureTeamMemberRuntimeRelayHandlerBound = (): void => {
  if (cachedRelayUnbind) {
    return;
  }
  cachedRelayUnbind = bindTeamMemberRuntimeRelayHandler();
};

export const getTeamMemberRuntimeOrchestrator = (): TeamMemberRuntimeOrchestrator => {
  const orchestrator = getOrCreateTeamMemberRuntimeOrchestrator();
  ensureTeamMemberRuntimeRelayHandlerBound();
  return orchestrator;
};
