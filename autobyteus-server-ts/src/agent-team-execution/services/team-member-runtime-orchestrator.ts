import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import { getWorkspaceManager, type WorkspaceManager } from "../../workspaces/workspace-manager.js";
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
import type { TeamRunManifest, TeamRunMemberBinding, TeamMemberRuntimeReference } from "../../run-history/domain/team-models.js";
import {
  getTeamRuntimeInterAgentMessageRelay,
  type TeamRuntimeInterAgentMessageRelay,
} from "./team-runtime-inter-agent-message-relay.js";
import type {
  RuntimeAdapter,
  RuntimeInterAgentRelayRequest,
  RuntimeInterAgentRelayResult,
} from "../../runtime-execution/runtime-adapter-port.js";
import {
  getTeamRuntimeBindingRegistry,
  type TeamRuntimeBindingRegistry,
  type TeamRuntimeMode,
} from "./team-runtime-binding-registry.js";
import type {
  RelayInterAgentMessageInput,
  TeamRuntimeMemberConfig,
} from "./team-member-runtime-orchestrator.types.js";
import {
  TeamRuntimeRoutingError,
  normalizeOptionalString,
} from "./team-member-runtime-errors.js";
import { TeamMemberRuntimeRelayService } from "./team-member-runtime-relay-service.js";
import { TeamMemberRuntimeSessionLifecycleService } from "./team-member-runtime-session-lifecycle-service.js";
export { TeamRuntimeRoutingError } from "./team-member-runtime-errors.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

export class TeamMemberRuntimeOrchestrator {
  private readonly runtimeCommandIngressService: RuntimeCommandIngressService;
  private readonly teamRuntimeBindingRegistry: TeamRuntimeBindingRegistry;
  private readonly sessionLifecycleService: TeamMemberRuntimeSessionLifecycleService;
  private readonly relayService: TeamMemberRuntimeRelayService;

  constructor(options: {
    runtimeCompositionService?: RuntimeCompositionService;
    runtimeCommandIngressService?: RuntimeCommandIngressService;
    runtimeAdapterRegistry?: RuntimeAdapterRegistry;
    teamRuntimeBindingRegistry?: TeamRuntimeBindingRegistry;
    teamRuntimeInterAgentMessageRelay?: TeamRuntimeInterAgentMessageRelay;
    workspaceManager?: WorkspaceManager;
    agentDefinitionService?: AgentDefinitionService;
    agentTeamDefinitionService?: AgentTeamDefinitionService;
  } = {}) {
    this.runtimeCommandIngressService =
      options.runtimeCommandIngressService ?? getRuntimeCommandIngressService();
    const runtimeCompositionService =
      options.runtimeCompositionService ?? getRuntimeCompositionService();
    const runtimeAdapterRegistry =
      options.runtimeAdapterRegistry ?? getRuntimeAdapterRegistry();
    this.teamRuntimeBindingRegistry =
      options.teamRuntimeBindingRegistry ?? getTeamRuntimeBindingRegistry();
    const teamRuntimeInterAgentMessageRelay =
      options.teamRuntimeInterAgentMessageRelay ?? getTeamRuntimeInterAgentMessageRelay();
    const workspaceManager = options.workspaceManager ?? getWorkspaceManager();
    const agentDefinitionService =
      options.agentDefinitionService ?? AgentDefinitionService.getInstance();
    const agentTeamDefinitionService =
      options.agentTeamDefinitionService ?? AgentTeamDefinitionService.getInstance();
    this.sessionLifecycleService = new TeamMemberRuntimeSessionLifecycleService(
      runtimeCompositionService,
      runtimeAdapterRegistry,
      this.teamRuntimeBindingRegistry,
      workspaceManager,
      agentDefinitionService,
      agentTeamDefinitionService,
    );
    this.relayService = new TeamMemberRuntimeRelayService(
      this.teamRuntimeBindingRegistry,
      teamRuntimeInterAgentMessageRelay,
    );
  }

  getTeamRuntimeMode(teamRunId: string): TeamRuntimeMode | null {
    return this.sessionLifecycleService.getTeamRuntimeMode(teamRunId);
  }

  removeTeam(teamRunId: string): void {
    this.sessionLifecycleService.removeTeam(teamRunId);
  }

  async terminateMemberRuntimeSessions(teamRunId: string): Promise<boolean> {
    const result = await this.terminateMemberRuntimeSessionsWithSnapshot(teamRunId);
    return result.terminated;
  }

  async terminateMemberRuntimeSessionsWithSnapshot(
    teamRunId: string,
  ): Promise<{ terminated: boolean; memberBindings: TeamRunMemberBinding[] }> {
    const bindings = this.sessionLifecycleService.getActiveMemberBindings(teamRunId);
    if (bindings.length === 0) {
      return {
        terminated: false,
        memberBindings: [],
      };
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

    this.sessionLifecycleService.removeTeam(teamRunId);
    return {
      terminated: true,
      memberBindings: bindings,
    };
  }

  hasActiveMemberBinding(teamRunId: string): boolean {
    return this.sessionLifecycleService.hasActiveMemberBinding(teamRunId);
  }

  getActiveMemberBindings(teamRunId: string): TeamRunMemberBinding[] {
    return this.sessionLifecycleService.getActiveMemberBindings(teamRunId);
  }

  getTeamBindings(teamRunId: string): TeamRunMemberBinding[] {
    return this.sessionLifecycleService.getTeamBindings(teamRunId);
  }

  async createMemberRuntimeSessions(
    teamRunId: string,
    teamDefinitionId: string,
    memberConfigs: TeamRuntimeMemberConfig[],
  ): Promise<TeamRunMemberBinding[]> {
    return this.sessionLifecycleService.createMemberRuntimeSessions(
      teamRunId,
      teamDefinitionId,
      memberConfigs,
    );
  }

  async restoreMemberRuntimeSessions(manifest: TeamRunManifest): Promise<TeamRunMemberBinding[]> {
    return this.sessionLifecycleService.restoreMemberRuntimeSessions(manifest);
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
    this.sessionLifecycleService.refreshBindingRuntimeReference(
      teamRunId,
      resolveResult.binding.memberRunId,
      normalizeRuntimeKind(commandResult.runtimeKind ?? resolveResult.binding.runtimeKind),
      (commandResult.runtimeReference as TeamMemberRuntimeReference | null | undefined) ?? null,
    );
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
    this.sessionLifecycleService.refreshBindingRuntimeReference(
      teamRunId,
      resolveResult.binding.memberRunId,
      normalizeRuntimeKind(commandResult.runtimeKind ?? resolveResult.binding.runtimeKind),
      (commandResult.runtimeReference as TeamMemberRuntimeReference | null | undefined) ?? null,
    );
  }

  async relayInterAgentMessage(
    input: RelayInterAgentMessageInput,
  ): Promise<{ accepted: boolean; code?: string; message?: string }> {
    return this.relayService.relayInterAgentMessage(input);
  }

  async handleRuntimeInterAgentRelayRequest(
    request: RuntimeInterAgentRelayRequest,
  ): Promise<RuntimeInterAgentRelayResult> {
    return this.relayService.handleRuntimeInterAgentRelayRequest(request);
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
