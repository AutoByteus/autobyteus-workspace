import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { getWorkspaceManager, type WorkspaceManager } from "../../workspaces/workspace-manager.js";
import {
  getRuntimeCompositionService,
  type RuntimeCompositionService,
} from "../../runtime-execution/runtime-composition-service.js";
import {
  getRuntimeCommandIngressService,
  type RuntimeCommandIngressService,
} from "../../runtime-execution/runtime-command-ingress-service.js";
import type { TeamRunManifest, TeamRunMemberBinding } from "../../run-history/domain/team-models.js";
import {
  getCodexAppServerRuntimeService,
  type CodexAppServerRuntimeService,
  type CodexInterAgentRelayRequest,
  type CodexInterAgentRelayResult,
} from "../../runtime-execution/codex-app-server/codex-app-server-runtime-service.js";
import {
  getClaudeAgentSdkRuntimeService,
  type ClaudeAgentSdkRuntimeService,
  type ClaudeInterAgentRelayRequest,
  type ClaudeInterAgentRelayResult,
} from "../../runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.js";
import {
  getTeamRuntimeBindingRegistry,
  type TeamRuntimeBindingRegistry,
  type TeamRuntimeMode,
} from "./team-runtime-binding-registry.js";
import {
  normalizeOptionalString,
  TeamRuntimeRoutingError,
} from "./team-member-runtime-errors.js";
import type { TeamRuntimeMemberConfig } from "./team-member-runtime-orchestrator.types.js";
import { TeamMemberRuntimeBindingStateService } from "./team-member-runtime-binding-state-service.js";
import { TeamMemberRuntimeSessionLifecycleService } from "./team-member-runtime-session-lifecycle-service.js";
import {
  TeamMemberRuntimeRelayService,
  type InterAgentRelayRequest,
  type RelayInterAgentMessageInput,
} from "./team-member-runtime-relay-service.js";

export type { TeamRuntimeMemberConfig } from "./team-member-runtime-orchestrator.types.js";
export {
  TeamRuntimeRoutingError,
  type TeamRuntimeRoutingErrorShape,
} from "./team-member-runtime-errors.js";
const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

export class TeamMemberRuntimeOrchestrator {
  private readonly runtimeCommandIngressService: RuntimeCommandIngressService;
  private readonly teamRuntimeBindingRegistry: TeamRuntimeBindingRegistry;
  private readonly bindingStateService: TeamMemberRuntimeBindingStateService;
  private readonly sessionLifecycleService: TeamMemberRuntimeSessionLifecycleService;
  private readonly relayService: TeamMemberRuntimeRelayService;

  constructor(options: {
    runtimeCompositionService?: RuntimeCompositionService;
    runtimeCommandIngressService?: RuntimeCommandIngressService;
    teamRuntimeBindingRegistry?: TeamRuntimeBindingRegistry;
    workspaceManager?: WorkspaceManager;
    agentDefinitionService?: AgentDefinitionService;
    claudeRuntimeService?: Pick<ClaudeAgentSdkRuntimeService, "getRunRuntimeReference">;
    bindingStateService?: TeamMemberRuntimeBindingStateService;
    sessionLifecycleService?: TeamMemberRuntimeSessionLifecycleService;
    relayService?: TeamMemberRuntimeRelayService;
  } = {}) {
    const runtimeCompositionService = options.runtimeCompositionService ?? getRuntimeCompositionService();
    this.runtimeCommandIngressService =
      options.runtimeCommandIngressService ?? getRuntimeCommandIngressService();
    this.teamRuntimeBindingRegistry =
      options.teamRuntimeBindingRegistry ?? getTeamRuntimeBindingRegistry();
    const workspaceManager = options.workspaceManager ?? getWorkspaceManager();
    const agentDefinitionService = options.agentDefinitionService ?? AgentDefinitionService.getInstance();
    const claudeRuntimeService = options.claudeRuntimeService ?? getClaudeAgentSdkRuntimeService();

    this.bindingStateService =
      options.bindingStateService ??
      new TeamMemberRuntimeBindingStateService({
        teamRuntimeBindingRegistry: this.teamRuntimeBindingRegistry,
        claudeRuntimeService,
      });

    this.sessionLifecycleService =
      options.sessionLifecycleService ??
      new TeamMemberRuntimeSessionLifecycleService({
        runtimeCompositionService,
        teamRuntimeBindingRegistry: this.teamRuntimeBindingRegistry,
        workspaceManager,
        agentDefinitionService,
      });

    this.relayService =
      options.relayService ??
      new TeamMemberRuntimeRelayService({
        runtimeCommandIngressService: this.runtimeCommandIngressService,
        teamRuntimeBindingRegistry: this.teamRuntimeBindingRegistry,
        bindingStateService: this.bindingStateService,
      });
  }

  getTeamRuntimeMode(teamRunId: string): TeamRuntimeMode | null {
    return this.teamRuntimeBindingRegistry.getTeamMode(teamRunId);
  }

  removeTeam(teamRunId: string): void {
    this.teamRuntimeBindingRegistry.removeTeam(teamRunId);
  }

  async terminateExternalTeamRunSessions(teamRunId: string): Promise<boolean> {
    const result = await this.terminateExternalTeamRunSessionsWithSnapshot(teamRunId);
    return result.terminated;
  }

  async terminateExternalTeamRunSessionsWithSnapshot(
    teamRunId: string,
  ): Promise<{ terminated: boolean; memberBindings: TeamRunMemberBinding[] }> {
    const bindings = this.teamRuntimeBindingRegistry.getTeamBindings(teamRunId);
    if (bindings.length === 0) {
      return { terminated: false, memberBindings: [] };
    }

    const refreshedBindings = this.bindingStateService.refreshTeamBindingsFromRuntimeState(teamRunId);
    for (const binding of refreshedBindings) {
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
    return {
      terminated: true,
      memberBindings: refreshedBindings.map((binding) => this.bindingStateService.cloneMemberBinding(binding)),
    };
  }

  async terminateCodexTeamRunSessions(teamRunId: string): Promise<boolean> {
    return this.terminateExternalTeamRunSessions(teamRunId);
  }

  hasActiveMemberBinding(teamRunId: string): boolean {
    return this.teamRuntimeBindingRegistry.getTeamBindings(teamRunId).length > 0;
  }

  getActiveMemberBindings(teamRunId: string): TeamRunMemberBinding[] {
    return this.bindingStateService.getActiveMemberBindings(teamRunId);
  }

  getTeamBindings(teamRunId: string): TeamRunMemberBinding[] {
    return this.teamRuntimeBindingRegistry.getTeamBindings(teamRunId);
  }

  async createExternalMemberSessions(
    teamRunId: string,
    memberConfigs: TeamRuntimeMemberConfig[],
  ): Promise<TeamRunMemberBinding[]> {
    return this.sessionLifecycleService.createExternalMemberSessions(teamRunId, memberConfigs);
  }

  async restoreExternalTeamRunSessions(manifest: TeamRunManifest): Promise<TeamRunMemberBinding[]> {
    return this.sessionLifecycleService.restoreExternalTeamRunSessions(manifest);
  }

  async createCodexMemberSessions(
    teamRunId: string,
    memberConfigs: TeamRuntimeMemberConfig[],
  ): Promise<TeamRunMemberBinding[]> {
    return this.createExternalMemberSessions(teamRunId, memberConfigs);
  }

  async restoreCodexTeamRunSessions(manifest: TeamRunManifest): Promise<TeamRunMemberBinding[]> {
    return this.restoreExternalTeamRunSessions(manifest);
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
    const resolveResult = this.teamRuntimeBindingRegistry.resolveMemberBinding(teamRunId, resolvedTarget);
    if (!resolveResult.binding) {
      throw new TeamRuntimeRoutingError({
        code: resolveResult.code,
        message: resolveResult.message,
      });
    }
    const targetBinding = resolveResult.binding;

    const commandResult = await this.runtimeCommandIngressService.sendTurn({
      runId: targetBinding.memberRunId,
      mode: "agent",
      message,
    });
    if (!commandResult.accepted) {
      throw new TeamRuntimeRoutingError({
        code: commandResult.code ?? "TEAM_MEMBER_RUNTIME_SEND_FAILED",
        message: commandResult.message ?? `Failed routing message to member '${targetBinding.memberName}'.`,
      });
    }

    this.bindingStateService.applyRuntimeReferenceUpdate({
      teamRunId,
      memberRunId: targetBinding.memberRunId,
      runtimeKind: targetBinding.runtimeKind,
      runtimeReference: commandResult.runtimeReference ?? null,
      existingMetadata: targetBinding.runtimeReference?.metadata ?? null,
    });
  }

  updateMemberRuntimeReference(input: {
    teamRunId: string;
    memberRunId: string;
    runtimeReference: {
      sessionId?: string | null;
      threadId?: string | null;
      metadata?: Record<string, unknown> | null;
    } | null;
  }): boolean {
    const bindings = this.teamRuntimeBindingRegistry.getTeamBindings(input.teamRunId);
    const targetBinding = bindings.find((binding) => binding.memberRunId === input.memberRunId);
    if (!targetBinding) {
      return false;
    }

    return this.bindingStateService.applyRuntimeReferenceUpdate({
      teamRunId: input.teamRunId,
      memberRunId: input.memberRunId,
      runtimeKind: targetBinding.runtimeKind,
      runtimeReference: input.runtimeReference,
      existingMetadata: targetBinding.runtimeReference?.metadata ?? null,
    });
  }

  async approveForMember(
    teamRunId: string,
    targetMemberName: string | null | undefined,
    invocationId: string,
    approved: boolean,
    reason?: string | null,
  ): Promise<void> {
    const resolveResult = this.teamRuntimeBindingRegistry.resolveMemberBinding(teamRunId, targetMemberName);
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
    return this.relayService.relayInterAgentMessage(input);
  }

  async handleCodexInterAgentRelayRequest(
    request: CodexInterAgentRelayRequest,
  ): Promise<CodexInterAgentRelayResult> {
    return this.handleInterAgentRelayRequest(request);
  }

  async handleClaudeInterAgentRelayRequest(
    request: ClaudeInterAgentRelayRequest,
  ): Promise<ClaudeInterAgentRelayResult> {
    return this.handleInterAgentRelayRequest(request);
  }

  private async handleInterAgentRelayRequest(
    request: InterAgentRelayRequest,
  ): Promise<{ accepted: boolean; code?: string; message?: string }> {
    return this.relayService.handleInterAgentRelayRequest(request);
  }
}

let cachedTeamMemberRuntimeOrchestrator: TeamMemberRuntimeOrchestrator | null = null;
let cachedRelayUnbind: (() => void) | null = null;
const relayBindingTokenByRuntimeService = new WeakMap<CodexAppServerRuntimeService, symbol>();
const claudeRelayBindingTokenByRuntimeService = new WeakMap<ClaudeAgentSdkRuntimeService, symbol>();

const getOrCreateTeamMemberRuntimeOrchestrator = (): TeamMemberRuntimeOrchestrator => {
  if (!cachedTeamMemberRuntimeOrchestrator) {
    cachedTeamMemberRuntimeOrchestrator = new TeamMemberRuntimeOrchestrator();
  }
  return cachedTeamMemberRuntimeOrchestrator;
};

export const bindTeamMemberRuntimeRelayHandler = (options: {
  orchestrator?: TeamMemberRuntimeOrchestrator;
  codexRuntimeService?: CodexAppServerRuntimeService;
  claudeRuntimeService?: ClaudeAgentSdkRuntimeService;
} = {}): (() => void) => {
  const orchestrator = options.orchestrator ?? getOrCreateTeamMemberRuntimeOrchestrator();
  const codexRuntimeService = options.codexRuntimeService ?? getCodexAppServerRuntimeService();
  const claudeRuntimeService = options.claudeRuntimeService ?? getClaudeAgentSdkRuntimeService();
  const bindingToken = Symbol("team-member-runtime-relay-binding");
  const claudeBindingToken = Symbol("team-member-runtime-claude-relay-binding");

  codexRuntimeService.setInterAgentRelayHandler((request) =>
    orchestrator.handleCodexInterAgentRelayRequest(request),
  );
  relayBindingTokenByRuntimeService.set(codexRuntimeService, bindingToken);
  claudeRuntimeService.setInterAgentRelayHandler((request) =>
    orchestrator.handleClaudeInterAgentRelayRequest(request),
  );
  claudeRelayBindingTokenByRuntimeService.set(claudeRuntimeService, claudeBindingToken);

  return () => {
    if (relayBindingTokenByRuntimeService.get(codexRuntimeService) !== bindingToken) {
      // continue to claude cleanup path
    } else {
      relayBindingTokenByRuntimeService.delete(codexRuntimeService);
      codexRuntimeService.setInterAgentRelayHandler(null);
    }

    if (
      claudeRelayBindingTokenByRuntimeService.get(claudeRuntimeService) === claudeBindingToken
    ) {
      claudeRelayBindingTokenByRuntimeService.delete(claudeRuntimeService);
      claudeRuntimeService.setInterAgentRelayHandler(null);
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
