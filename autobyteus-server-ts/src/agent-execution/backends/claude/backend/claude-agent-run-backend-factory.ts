import { AgentRunConfig } from "../../../domain/agent-run-config.js";
import { AgentRunContext, type RuntimeAgentRunContext } from "../../../domain/agent-run-context.js";
import type { ClaudeSessionManager } from "../session/claude-session-manager.js";
import type { ClaudeSessionBootstrapper } from "./claude-session-bootstrapper.js";
import type { AgentRunBackendFactory } from "../../agent-run-backend-factory.js";
import { ClaudeAgentRunBackend } from "./claude-agent-run-backend.js";
import { ClaudeProviderSessionLifecycle } from "../session/claude-provider-session-lifecycle.js";


export class ClaudeAgentRunBackendFactory implements AgentRunBackendFactory {
  private readonly sessionManager: ClaudeSessionManager;
  private readonly sessionBootstrapper: ClaudeSessionBootstrapper;
  constructor(
    sessionManager: ClaudeSessionManager,
    sessionBootstrapper: ClaudeSessionBootstrapper,
  ) {
    this.sessionManager = sessionManager;
    this.sessionBootstrapper = sessionBootstrapper;
  }

  async createBackend(
    input: AgentRunConfig,
    agentRunId: string,
  ): Promise<ClaudeAgentRunBackend> {
    const runId = agentRunId.trim();
    if (!runId) {
      throw new Error("Claude backend creation requires agentRunId.");
    }
    const runContext = await this.sessionBootstrapper.bootstrapForCreate(
      new AgentRunContext({
        runId,
        config: input,
        runtimeContext: null,
      }),
    );

    const session = await this.sessionManager.createRunSession(runContext);

    const backend = new ClaudeAgentRunBackend(runContext, session);
    return backend;
  }

  async restoreBackend(
    context: AgentRunContext<RuntimeAgentRunContext>,
  ): Promise<ClaudeAgentRunBackend> {
    const runtimeContext =
      context.runtimeContext instanceof Object ? context.runtimeContext : null;
    const platformAgentRunId =
      runtimeContext &&
      "sessionId" in runtimeContext &&
      typeof runtimeContext.sessionId === "string" &&
      runtimeContext.sessionId.trim()
        ? runtimeContext.sessionId.trim()
        : null;
    if (!platformAgentRunId || platformAgentRunId === context.runId) {
      throw new Error("PLATFORM_AGENT_RUN_BINDING_INVALID: Claude restore requires a provider UUID.");
    }
    ClaudeProviderSessionLifecycle.restore(platformAgentRunId, context.runId);
    const runContext = await this.sessionBootstrapper.bootstrapForRestore(
      context as AgentRunContext<any>,
    );

    const session = await this.sessionManager.restoreRunSession(
      runContext,
      platformAgentRunId,
    );

    const backend = new ClaudeAgentRunBackend(runContext, session);
    return backend;
  }
}
