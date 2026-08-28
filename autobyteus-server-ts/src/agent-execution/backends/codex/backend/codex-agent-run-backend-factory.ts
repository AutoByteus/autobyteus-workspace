import { AgentRunConfig } from "../../../domain/agent-run-config.js";
import { AgentRunContext, type RuntimeAgentRunContext } from "../../../domain/agent-run-context.js";
import type { CodexThreadManager } from "../thread/codex-thread-manager.js";
import type { CodexThreadBootstrapper } from "./codex-thread-bootstrapper.js";
import type { CodexThreadCleanup } from "./codex-thread-cleanup.js";
import { CodexAgentRunBackend } from "./codex-agent-run-backend.js";
import type { AgentRunBackendFactory } from "../../agent-run-backend-factory.js";


export class CodexAgentRunBackendFactory implements AgentRunBackendFactory {
  private readonly threadManager: CodexThreadManager;
  private readonly threadBootstrapper: CodexThreadBootstrapper;
  private readonly threadCleanup: CodexThreadCleanup;
  constructor(
    threadManager: CodexThreadManager,
    threadBootstrapper: CodexThreadBootstrapper,
    threadCleanup: CodexThreadCleanup,
  ) {
    this.threadManager = threadManager;
    this.threadBootstrapper = threadBootstrapper;
    this.threadCleanup = threadCleanup;
  }

  async createBackend(
    input: AgentRunConfig,
    agentRunId: string,
  ): Promise<CodexAgentRunBackend> {
    const runId = agentRunId.trim();
    if (!runId) {
      throw new Error("Codex backend creation requires agentRunId.");
    }
    const runContext = await this.threadBootstrapper.bootstrapForCreate(
      new AgentRunContext({
        runId,
        config: input,
        runtimeContext: null,
      }),
    );
    let thread;
    try {
      thread = await this.threadManager.createThread(runContext);
    } catch (error) {
      await this.threadCleanup
        .cleanupPreparedWorkspaceSkills(runContext.runtimeContext.materializedConfiguredSkills)
        .catch(() => {});
      throw error;
    }
    const backend = new CodexAgentRunBackend(runContext, thread, this.threadManager);
    return backend;
  }

  async restoreBackend(
    context: AgentRunContext<RuntimeAgentRunContext>,
  ): Promise<CodexAgentRunBackend> {
    const runContext = await this.threadBootstrapper.bootstrapForRestore(
      context as AgentRunContext<any>,
    );
    let thread;
    try {
      thread = await this.threadManager.restoreThread(runContext);
    } catch (error) {
      await this.threadCleanup
        .cleanupPreparedWorkspaceSkills(runContext.runtimeContext.materializedConfiguredSkills)
        .catch(() => {});
      throw error;
    }
    const backend = new CodexAgentRunBackend(runContext, thread, this.threadManager);
    return backend;
  }
}
