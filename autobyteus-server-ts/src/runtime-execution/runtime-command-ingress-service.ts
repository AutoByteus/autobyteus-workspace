import {
  DEFAULT_RUNTIME_KIND,
  type RuntimeKind,
} from "../runtime-management/runtime-kind.js";
import {
  getRuntimeCapabilityService,
  type RuntimeCapabilityService,
} from "../runtime-management/runtime-capability-service.js";
import { AgentRunManager } from "../agent-execution/services/agent-run-manager.js";
import { AgentTeamRunManager } from "../agent-team-execution/services/agent-team-run-manager.js";
import {
  evaluateCommandCapability,
  type RuntimeCommandOperation,
} from "./runtime-capability-policy.js";
import { getRuntimeAdapterRegistry, type RuntimeAdapterRegistry } from "./runtime-adapter-registry.js";
import type {
  RuntimeApproveToolInput,
  RuntimeCommandResult,
  RuntimeInterruptRunInput,
  RuntimeRelayInterAgentMessageInput,
  RuntimeMode,
  RuntimeSendTurnInput,
  RuntimeSessionRecord,
  RuntimeTerminateRunInput,
} from "./runtime-adapter-port.js";
import { getRuntimeSessionStore, type RuntimeSessionStore } from "./runtime-session-store.js";

export interface RuntimeIngressResult extends RuntimeCommandResult {
  runtimeKind: RuntimeKind;
}

export class RuntimeCommandIngressService {
  private sessionStore: RuntimeSessionStore;
  private adapterRegistry: RuntimeAdapterRegistry;
  private agentManager: AgentRunManager;
  private teamManager: AgentTeamRunManager;
  private runtimeCapabilityService: RuntimeCapabilityService;

  constructor(
    sessionStore: RuntimeSessionStore = getRuntimeSessionStore(),
    adapterRegistry: RuntimeAdapterRegistry = getRuntimeAdapterRegistry(),
    agentManager: AgentRunManager = AgentRunManager.getInstance(),
    teamManager: AgentTeamRunManager = AgentTeamRunManager.getInstance(),
    runtimeCapabilityService: RuntimeCapabilityService = getRuntimeCapabilityService(),
  ) {
    this.sessionStore = sessionStore;
    this.adapterRegistry = adapterRegistry;
    this.agentManager = agentManager;
    this.teamManager = teamManager;
    this.runtimeCapabilityService = runtimeCapabilityService;
  }

  bindRunSession(session: RuntimeSessionRecord): void {
    this.sessionStore.upsertSession(session);
  }

  async sendTurn(input: RuntimeSendTurnInput): Promise<RuntimeIngressResult> {
    return this.execute(input.runId, input.mode, "send_turn", (session) =>
      this.adapterRegistry.resolveAdapter(session.runtimeKind).sendTurn(input),
    );
  }

  async approveTool(input: RuntimeApproveToolInput): Promise<RuntimeIngressResult> {
    return this.execute(input.runId, input.mode, "approve_tool", (session) =>
      this.adapterRegistry.resolveAdapter(session.runtimeKind).approveTool(input),
    );
  }

  async relayInterAgentMessage(
    input: RuntimeRelayInterAgentMessageInput,
  ): Promise<RuntimeIngressResult> {
    return this.execute(input.runId, "agent", "relay_inter_agent_message", (session) => {
      const adapter = this.adapterRegistry.resolveAdapter(session.runtimeKind);
      if (!adapter.relayInterAgentMessage) {
        return Promise.resolve({
          accepted: false,
          code: "INTER_AGENT_RELAY_UNSUPPORTED",
          message: `Runtime '${session.runtimeKind}' does not support inter-agent relay.`,
        });
      }
      return adapter.relayInterAgentMessage(input);
    });
  }

  async interruptRun(input: RuntimeInterruptRunInput): Promise<RuntimeIngressResult> {
    return this.execute(input.runId, input.mode, "interrupt_run", (session) =>
      this.adapterRegistry.resolveAdapter(session.runtimeKind).interruptRun(input),
    );
  }

  async terminateRun(input: RuntimeTerminateRunInput): Promise<RuntimeIngressResult> {
    return this.execute(input.runId, input.mode, "terminate_run", (session) => {
      const adapter = this.adapterRegistry.resolveAdapter(session.runtimeKind);
      if (!adapter.terminateRun) {
        return adapter.interruptRun({
          runId: input.runId,
          mode: input.mode,
          turnId: null,
        });
      }
      return adapter.terminateRun(input);
    });
  }

  private async execute(
    runId: string,
    mode: RuntimeMode,
    operation: RuntimeCommandOperation,
    fn: (session: RuntimeSessionRecord) => Promise<RuntimeCommandResult>,
  ): Promise<RuntimeIngressResult> {
    const session = this.resolveSession(runId, mode);
    if (!session) {
      return {
        accepted: false,
        code: "RUN_SESSION_NOT_FOUND",
        message: `Run session '${runId}' is not active.`,
        runtimeKind: DEFAULT_RUNTIME_KIND,
      };
    }
    const capability = this.runtimeCapabilityService.getRuntimeCapability(session.runtimeKind);
    const capabilityDecision = evaluateCommandCapability(capability, operation);
    if (!capabilityDecision.allowed) {
      return {
        accepted: false,
        code: capabilityDecision.code ?? "RUNTIME_UNAVAILABLE",
        message:
          capabilityDecision.message ??
          `Runtime '${session.runtimeKind}' is unavailable for operation '${operation}'.`,
        runtimeKind: session.runtimeKind,
      };
    }
    try {
      const result = await fn(session);
      return {
        ...result,
        runtimeKind: session.runtimeKind,
      };
    } catch (error) {
      return {
        accepted: false,
        code: "RUNTIME_COMMAND_FAILED",
        message: String(error),
        runtimeKind: session.runtimeKind,
      };
    }
  }

  private resolveSession(runId: string, mode: RuntimeMode): RuntimeSessionRecord | null {
    const existing = this.sessionStore.getSession(runId);
    if (existing) {
      const adapter = this.adapterRegistry.resolveAdapter(existing.runtimeKind);
      if (adapter.isRunActive) {
        const isActive = adapter.isRunActive(runId);
        if (!isActive) {
          this.sessionStore.removeSession(runId);
          return null;
        }
      }
      return existing;
    }

    const hasActiveRun =
      mode === "agent"
        ? this.agentManager.getAgentRun(runId) !== null
        : this.teamManager.getTeamRun(runId) !== null;
    if (!hasActiveRun) {
      const configuredRuntimeKinds = this.adapterRegistry.listRuntimeKinds();
      const canUseLegacyImplicitSession =
        configuredRuntimeKinds.length === 1 &&
        configuredRuntimeKinds[0] === DEFAULT_RUNTIME_KIND;
      if (!canUseLegacyImplicitSession) {
        return null;
      }
    }

    const implicitRuntimeKind =
      this.adapterRegistry.listRuntimeKinds().includes(DEFAULT_RUNTIME_KIND)
        ? DEFAULT_RUNTIME_KIND
        : this.adapterRegistry.listRuntimeKinds()[0];
    if (!implicitRuntimeKind) {
      return null;
    }

    const implicitSession: RuntimeSessionRecord = {
      runId,
      runtimeKind: implicitRuntimeKind,
      mode,
      runtimeReference: {
        runtimeKind: implicitRuntimeKind,
        sessionId: runId,
        threadId: null,
        metadata: null,
      },
    };
    this.sessionStore.upsertSession(implicitSession);
    return implicitSession;
  }
}

let cachedRuntimeCommandIngressService: RuntimeCommandIngressService | null = null;

export const getRuntimeCommandIngressService = (): RuntimeCommandIngressService => {
  if (!cachedRuntimeCommandIngressService) {
    cachedRuntimeCommandIngressService = new RuntimeCommandIngressService();
  }
  return cachedRuntimeCommandIngressService;
};
