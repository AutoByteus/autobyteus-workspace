import { createBackendPreparation } from "../../agent-run-backend-preparation.js";
import type { AgentRunBackendPreparationRequest } from "../../agent-run-backend-factory.js";
import type { CodexAppServerClientLease } from "../../../../runtime-management/codex/client/codex-app-server-client-manager.js";
import type { CodexRunContext } from "./codex-agent-run-context.js";
import { AgentRunContext } from "../../../domain/agent-run-context.js";
import type { CodexThreadManager } from "../thread/codex-thread-manager.js";
import type { CodexThreadBootstrapper } from "./codex-thread-bootstrapper.js";
import { CodexAgentRunBackend } from "./codex-agent-run-backend.js";
import type { AgentRunBackendFactory } from "../../agent-run-backend-factory.js";
import type { AgentToolMcpRunSessionExposure } from "../../../../agent-tools/mcp/agent-tool-mcp-session-authority.js";


export class CodexAgentRunBackendFactory implements AgentRunBackendFactory {
  private readonly threadManager: CodexThreadManager;
  private readonly threadBootstrapper: CodexThreadBootstrapper;
  private readonly agentToolSessions: AgentToolMcpRunSessionExposure;
  constructor(
    threadManager: CodexThreadManager,
    threadBootstrapper: CodexThreadBootstrapper,
    agentToolSessions: AgentToolMcpRunSessionExposure,
  ) {
    this.threadManager = threadManager;
    this.threadBootstrapper = threadBootstrapper;
    this.agentToolSessions = agentToolSessions;
  }

  beginPreparation(request: AgentRunBackendPreparationRequest) {
    const workspaceSkills = this.threadBootstrapper.createRunWorkspaceSkills(request.kind === "new" ? request.runId : request.context.runId);
    const clients: CodexAppServerClientLease[] = [];
    let runContext: CodexRunContext | null = null;
    return createBackendPreparation({
      prepare: async (assertAccepting) => {
        const guard = { assertAccepting, workspaceSkills,
          ownCodexClient: (lease: CodexAppServerClientLease) => { clients.push(lease); } };
        runContext = request.kind === "new"
          ? await this.threadBootstrapper.bootstrapForCreate(new AgentRunContext({ runId: request.runId, config: request.config, runtimeContext: null }), guard)
          : await this.threadBootstrapper.bootstrapForRestore(request.context as AgentRunContext<any>, guard);
        assertAccepting();
        const thread = request.kind === "new"
          ? await this.threadManager.createThread(runContext, assertAccepting)
          : await this.threadManager.restoreThread(runContext, assertAccepting);
        assertAccepting();
        return new CodexAgentRunBackend(runContext, thread, this.threadManager, this.agentToolSessions);
      },
      releaseResources: async () => {
        const errors: unknown[] = [];
        if (runContext) {
          try { await this.threadManager.releasePreparation(runContext); } catch (error) { errors.push(error); }
        }
        // The run's links: released here when preparation failed before the thread owned them (idempotent).
        try { await workspaceSkills.release(); } catch (error) { errors.push(error); }
        for (const lease of clients) {
          try { await lease.release(); } catch (error) { errors.push(error); }
        }
        if (errors.length) throw new AggregateError(errors, "Codex exact preparation release failed.");
      },
    });
  }
}
