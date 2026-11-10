import type { SessionConfigOption } from "@agentclientprotocol/sdk";
import type { IntegrationRunAccess } from "../../../../credential-proxy/integration-run-access.js";
import {
  ProviderRelayKeyMissingError,
  type ProviderRelayAccess,
} from "../../../../credential-proxy/provider-relays/provider-relay-access.js";
import type { AgentRunConfig } from "../../../domain/agent-run-config.js";
import type { AgentRunEvent } from "../../../domain/agent-run-event.js";
import { AgentCreationError } from "../../../errors.js";
import type { AgentToolMcpDescriptor } from "../../../../agent-tools/mcp/agent-tool-mcp-session.js";
import type { MaterializedWorkspaceSkill } from "../../shared/workspace-skill-materializer.js";
import type {
  AcpAgentLaunchProfile,
  AcpLaunch,
  AcpRelayAccess,
} from "../../../../runtime-management/acp/acp-agent-launch-profile.js";
import { AcpAgentProcess } from "../../../../runtime-management/acp/acp-agent-process.js";
import { AcpClientConnection } from "../../../../runtime-management/acp/acp-client-connection.js";
import { AcpAgentCapabilities } from "../../../../runtime-management/acp/acp-agent-capabilities.js";
import { describeAcpActivationError } from "../../../../runtime-management/acp/acp-error-message.js";
import type { AcpAgentSessionProfile } from "../acp-agent-session-profile.js";
import { AcpAgentSession } from "./acp-agent-session.js";

/**
 * The single holder of one run's ACP launch, process, connection, session and provider call subscription (and its
 * skill links), for creation, restore and reopen alike. Every handle is recorded as soon as it exists, so a
 * half-opened process is always held; `AcpSessionLauncher.end` ends exactly what it holds now.
 */
export type AcpPreparationOwner = {
  /** What the current generation's launch prepared on disk, released after its process stopped. */
  launch: AcpLaunch | null;
  process: AcpAgentProcess | null;
  connection: AcpClientConnection | null;
  session: AcpAgentSession | null;
  /** Removes the current generation's provider call listener (exactly that one). */
  providerCalls: (() => void) | null;
  skills: MaterializedWorkspaceSkill[];
};

export const createAcpPreparationOwner = (): AcpPreparationOwner => ({
  launch: null, process: null, connection: null, session: null, providerCalls: null, skills: [],
});

/** Where a session's output and failure go: the run's backend, once bound; nowhere once detached. */
export type AcpSessionEventTarget = Readonly<{
  publish(events: readonly AgentRunEvent[]): void;
  handleSessionFailure(): void;
}>;

/**
 * Forwards one session's output to its target. Activation emits no events before the backend
 * exists; a session ended on purpose (a reopen) is detached first, so its exit is not a failure.
 */
export class AcpSessionEventSink {
  private target: AcpSessionEventTarget | null = null;

  emit = (events: AgentRunEvent[]): void => { this.target?.publish(events); };
  failed = (): void => { this.target?.handleSessionFailure(); };

  bind(target: AcpSessionEventTarget): void { this.target = target; }
  detach(): void { this.target = null; }
}

export type AcpSessionOpenRequest = Readonly<{
  owner: AcpPreparationOwner;
  runId: string;
  config: AgentRunConfig;
  workingDirectory: string;
  descriptor: AgentToolMcpDescriptor;
  sink: AcpSessionEventSink;
  assertAccepting: () => void;
  /** The run's composed instructions, given to every launch (create, restore and reopen). */
  instructions: string;
}> & (
  | Readonly<{ mode: "new" }>
  /** Restore and reopen: the same conversation, by `session/load` or `session/resume` as the agent offers. */
  | Readonly<{ mode: "restore"; sessionId: string }>
);

/** The model settings an ACP session reads from a run's stored `llmConfig`. New runs keep only these keys. */
export const ACP_SESSION_SETTING_KEYS: readonly string[] = ["reasoning_effort"];

const reasoningEffortOf = (config: AgentRunConfig): string | null => {
  const value = config.llmConfig?.reasoning_effort;
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

/**
 * The launch and end of one run's agent session generation, for the factory (create, restore, release) and the
 * backend (reopen). `open` gets the run's provider relay access when the launch profile names a relay (refused before
 * anything starts when this host has none), launches and spawns the agent, opens the session (`new`, or restore by the
 * agent's restore method), applies the run's model and effort, awaits Agent Tools MCP readiness, and subscribes this
 * generation to the run's provider calls. Agent errors surface as `AgentCreationError` with the agent's text; the
 * caller ends whatever the owner holds on failure.
 */
export class AcpSessionLauncher {
  constructor(private readonly deps: Readonly<{
    launchProfile: AcpAgentLaunchProfile;
    sessionProfile: AcpAgentSessionProfile;
    integrationRunAccess: IntegrationRunAccess | null;
    providerRelayAccess: ProviderRelayAccess | null;
  }>) {}

  get agentLabel(): string { return this.deps.launchProfile.agentLabel; }

  async open(request: AcpSessionOpenRequest): Promise<Readonly<{ sessionId: string }>> {
    const { launchProfile, sessionProfile } = this.deps;
    const { owner, config, assertAccepting } = request;
    const relayId = launchProfile.providerRelayId;
    if (relayId && !this.deps.providerRelayAccess) {
      // Never launch such an agent without the relay: it would look for a key outside the vault (DEC-020).
      throw new AgentCreationError(
        `PROVIDER_RELAY_UNAVAILABLE: ${launchProfile.agentLabel} needs the AutoByteus credential proxy, which this host does not run.`);
    }
    assertAccepting();
    const run = { runId: request.runId, agentDefinitionId: config.agentDefinitionId };
    // The run's integration variables (a reopen keeps the run's pass).
    const integrationVariables = (await this.deps.integrationRunAccess?.environmentForRun(run, globalThis.process.env)) ?? {};
    const relayAccess = relayId ? await this.prepareRelayAccess(run, relayId) : null;
    assertAccepting();
    const launch = await launchProfile.runLaunch({
      runId: request.runId, workingDirectory: request.workingDirectory, instructions: request.instructions,
      model: config.llmModelIdentifier, reasoningEffort: reasoningEffortOf(config), relayAccess,
    });
    owner.launch = launch;
    assertAccepting();
    const process = AcpAgentProcess.spawn({
      command: launchProfile.command(),
      args: launch.args,
      env: { ...launch.env, ...integrationVariables },
      cwd: request.workingDirectory,
    });
    owner.process = process;
    const connection = new AcpClientConnection(process, launchProfile.agentLabel);
    owner.connection = connection;
    const session = new AcpAgentSession({
      runId: request.runId, connection, profile: sessionProfile, model: config.llmModelIdentifier,
      autoExecuteTools: config.autoExecuteTools, emit: request.sink.emit, onFailed: request.sink.failed,
    });
    owner.session = session;
    try {
      const capabilities = AcpAgentCapabilities.fromInitialize(await connection.initialize());
      capabilities.require(launchProfile.agentLabel,
        AcpAgentCapabilities.requiredFor({ restore: request.mode === "restore", mcp: true }));
      assertAccepting();
      const mcpServers = sessionProfile.mcpServers(request.descriptor);
      let sessionId: string;
      let configOptions: readonly SessionConfigOption[] | null | undefined;
      if (request.mode === "new") {
        const response = await session.openNew({
          cwd: request.workingDirectory, mcpServers,
          _meta: sessionProfile.newSessionMeta({ composedPrompt: request.instructions, autoExecuteTools: config.autoExecuteTools }),
        });
        sessionId = response.sessionId;
        configOptions = response.configOptions;
      } else {
        sessionId = request.sessionId;
        const reopen = { sessionId, cwd: request.workingDirectory, mcpServers };
        configOptions = (capabilities.restoreMethod() === "load"
          ? await session.openLoad(reopen) : await session.openResume(reopen)).configOptions;
      }
      await session.applyConfigSelection(
        { model: config.llmModelIdentifier, reasoningEffort: reasoningEffortOf(config) }, configOptions ?? []);
      const readiness = sessionProfile.mcpReadiness(request.descriptor);
      if (readiness) await session.awaitMcpServerReady(readiness);
      if (relayAccess) {
        owner.providerCalls = this.deps.providerRelayAccess!.observe(request.runId, (observation) => session.onProviderCall(observation));
      }
      assertAccepting();
      if (session.state === "failed") {
        throw new Error(`ACP_SESSION_FAILED: ${launchProfile.agentLabel} stopped during activation.`);
      }
      return Object.freeze({ sessionId });
    } catch (error) {
      const message = describeAcpActivationError(launchProfile.agentLabel, error);
      throw message ? new AgentCreationError(message) : error;
    }
  }

  /**
   * Ends one generation of what the owner holds, in this order: its provider call listener, the session, the connection
   * (or the process), then the launch's files, after the process that reads them stopped. The handles are cleared
   * first; every step runs even when an earlier one failed. The caller detaches the session's sink first when the end
   * is deliberate.
   */
  static async end(owner: AcpPreparationOwner): Promise<void> {
    const { providerCalls, session, connection, process, launch } = owner;
    owner.providerCalls = null;
    owner.session = null;
    owner.connection = null;
    owner.process = null;
    owner.launch = null;
    const errors: unknown[] = [];
    try { providerCalls?.(); } catch (error) { errors.push(error); }
    try { session?.close(); } catch (error) { errors.push(error); }
    try {
      if (connection) await connection.close();
      else await process?.stop();
    } catch (error) { errors.push(error); }
    try { await launch?.release(); } catch (error) { errors.push(error); }
    if (errors.length) throw new AggregateError(errors, "ACP session end failed.");
  }

  private async prepareRelayAccess(run: Readonly<{ runId: string; agentDefinitionId: string }>, relayId: string): Promise<AcpRelayAccess> {
    try {
      return await this.deps.providerRelayAccess!.prepareForRun(run, relayId);
    } catch (error) {
      if (error instanceof ProviderRelayKeyMissingError) throw new AgentCreationError(error.message);
      throw error;
    }
  }
}
