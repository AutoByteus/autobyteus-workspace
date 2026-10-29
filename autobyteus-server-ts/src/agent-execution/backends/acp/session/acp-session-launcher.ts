import type { AgentRunConfig } from "../../../domain/agent-run-config.js";
import type { AgentRunEvent } from "../../../domain/agent-run-event.js";
import { AgentCreationError } from "../../../errors.js";
import type { AgentToolMcpDescriptor } from "../../../../agent-tools/mcp/agent-tool-mcp-session.js";
import type { MaterializedWorkspaceSkill } from "../../shared/workspace-skill-materializer.js";
import type { AcpAgentLaunchProfile } from "../../../../runtime-management/acp/acp-agent-launch-profile.js";
import { AcpAgentProcess } from "../../../../runtime-management/acp/acp-agent-process.js";
import { AcpClientConnection } from "../../../../runtime-management/acp/acp-client-connection.js";
import { AcpAgentCapabilities } from "../../../../runtime-management/acp/acp-agent-capabilities.js";
import { describeAcpActivationError } from "../../../../runtime-management/acp/acp-error-message.js";
import type { AcpAgentSessionProfile } from "../acp-agent-session-profile.js";
import { AcpAgentSession } from "./acp-agent-session.js";

/**
 * The single holder of one run's ACP process, connection and session (and its skill links), for
 * creation, restore and reopen alike. Every handle is recorded as soon as it exists, so a
 * half-opened process is always held; releasing the run closes exactly what it holds now.
 */
export type AcpPreparationOwner = {
  process: AcpAgentProcess | null;
  connection: AcpClientConnection | null;
  session: AcpAgentSession | null;
  skills: MaterializedWorkspaceSkill[];
};

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
}> & (
  | Readonly<{ mode: "new"; newSessionMeta: Record<string, unknown> | undefined }>
  | Readonly<{ mode: "load"; sessionId: string }>
);

const reasoningEffortOf = (config: AgentRunConfig): string | null => {
  const value = config.llmConfig?.reasoning_effort;
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

/**
 * Spawns an agent process, connection and session into a run's owner and opens it: `new` for a
 * new run, `load` for a restore or a reopen of the same conversation. The Agent Tools MCP server
 * from the descriptor is attached and its readiness awaited. Shared by the factory (create,
 * restore) and the backend (reopen). Agent errors surface as `AgentCreationError` with the
 * agent's text; the caller ends whatever the owner holds on failure.
 */
export class AcpSessionLauncher {
  constructor(private readonly deps: Readonly<{
    launchProfile: AcpAgentLaunchProfile;
    sessionProfile: AcpAgentSessionProfile;
  }>) {}

  get agentLabel(): string { return this.deps.launchProfile.agentLabel; }

  async open(request: AcpSessionOpenRequest): Promise<Readonly<{ sessionId: string }>> {
    const { launchProfile, sessionProfile } = this.deps;
    const { owner, config, assertAccepting } = request;
    assertAccepting();
    const process = AcpAgentProcess.spawn({
      command: launchProfile.command(),
      args: launchProfile.args({ model: config.llmModelIdentifier, reasoningEffort: reasoningEffortOf(config) }),
      env: launchProfile.env(globalThis.process.env),
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
      const initialized = await connection.initialize();
      AcpAgentCapabilities.fromInitialize(initialized).require(launchProfile.agentLabel,
        AcpAgentCapabilities.requiredFor({ restore: request.mode === "load", mcp: true }));
      assertAccepting();
      const mcpServers = sessionProfile.mcpServers(request.descriptor);
      let sessionId: string;
      if (request.mode === "new") {
        sessionId = (await session.openNew({
          cwd: request.workingDirectory, mcpServers, _meta: request.newSessionMeta,
        })).sessionId;
      } else {
        await session.openLoad({ sessionId: request.sessionId, cwd: request.workingDirectory, mcpServers });
        sessionId = request.sessionId;
      }
      const readiness = sessionProfile.mcpReadiness(request.descriptor);
      if (readiness) await session.awaitMcpServerReady(readiness);
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
   * Ends what the owner holds (session, then connection or process) and clears its handles. The
   * caller detaches the session's sink first when the end is deliberate.
   */
  static async end(owner: AcpPreparationOwner): Promise<void> {
    const { session, connection, process } = owner;
    owner.session = null;
    owner.connection = null;
    owner.process = null;
    const errors: unknown[] = [];
    try { session?.close(); } catch (error) { errors.push(error); }
    try {
      if (connection) await connection.close();
      else await process?.stop();
    } catch (error) { errors.push(error); }
    if (errors.length) throw new AggregateError(errors, "ACP session end failed.");
  }
}
