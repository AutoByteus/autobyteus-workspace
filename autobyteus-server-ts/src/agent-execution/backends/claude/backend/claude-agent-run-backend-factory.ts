import { randomUUID } from "node:crypto";
import { AgentRunConfig } from "../../../domain/agent-run-config.js";
import { AgentRunContext, type RuntimeAgentRunContext } from "../../../domain/agent-run-context.js";
import {
  getClaudeSessionManager,
  type ClaudeSessionManager,
} from "../session/claude-session-manager.js";
import {
  getClaudeSessionBootstrapper,
  type ClaudeSessionBootstrapper,
} from "./claude-session-bootstrapper.js";
import type { AgentRunBackendFactory } from "../../agent-run-backend-factory.js";
import { ClaudeAgentRunBackend } from "./claude-agent-run-backend.js";

type RunIdGenerator = () => string;

export class ClaudeAgentRunBackendFactory implements AgentRunBackendFactory {
  private readonly sessionManager: ClaudeSessionManager;
  private readonly sessionBootstrapper: ClaudeSessionBootstrapper;
  private readonly generateRunId: RunIdGenerator;

  constructor(
    sessionManager: ClaudeSessionManager = getClaudeSessionManager(),
    sessionBootstrapper: ClaudeSessionBootstrapper = getClaudeSessionBootstrapper(),
    generateRunId: RunIdGenerator = () => randomUUID(),
  ) {
    this.sessionManager = sessionManager;
    this.sessionBootstrapper = sessionBootstrapper;
    this.generateRunId = generateRunId;
  }

  async createBackend(
    input: AgentRunConfig,
    preferredRunId: string | null = null,
  ): Promise<ClaudeAgentRunBackend> {
    const runId = preferredRunId?.trim() || this.generateRunId();
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
        : context.runId;
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

let cachedClaudeAgentRunBackendFactory: ClaudeAgentRunBackendFactory | null = null;

export const getClaudeAgentRunBackendFactory = (): ClaudeAgentRunBackendFactory => {
  if (!cachedClaudeAgentRunBackendFactory) {
    cachedClaudeAgentRunBackendFactory = new ClaudeAgentRunBackendFactory();
  }
  return cachedClaudeAgentRunBackendFactory;
};
