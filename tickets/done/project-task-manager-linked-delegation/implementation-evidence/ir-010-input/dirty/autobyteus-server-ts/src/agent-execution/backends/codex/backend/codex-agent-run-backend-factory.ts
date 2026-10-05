import { createBackendPreparation } from "../../agent-run-backend-preparation.js";
import type { AgentRunBackendPreparationRequest } from "../../agent-run-backend-factory.js";
import type { MaterializedWorkspaceSkill } from "../../shared/workspace-skill-materializer.js";
import type { CodexAppServerClientLease } from "../../../../runtime-management/codex/client/codex-app-server-client-manager.js";
import type { CodexRunContext } from "./codex-agent-run-context.js";
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

  beginPreparation(request: AgentRunBackendPreparationRequest) {
    const skills: MaterializedWorkspaceSkill[] = [];
    const clients: CodexAppServerClientLease[] = [];
    let runContext: CodexRunContext | null = null;
    return createBackendPreparation({
      prepare: async (assertAccepting) => {
        const guard = { assertAccepting, ownSkill: (skill: MaterializedWorkspaceSkill) => { skills.push(skill); },
          ownCodexClient: (lease: CodexAppServerClientLease) => { clients.push(lease); } };
        runContext = request.kind === "new"
          ? await this.threadBootstrapper.bootstrapForCreate(new AgentRunContext({ runId: request.runId, config: request.config, runtimeContext: null }), guard)
          : await this.threadBootstrapper.bootstrapForRestore(request.context as AgentRunContext<any>, guard);
        assertAccepting();
        const thread = request.kind === "new"
          ? await this.threadManager.createThread(runContext, assertAccepting)
          : await this.threadManager.restoreThread(runContext, assertAccepting);
        assertAccepting();
        return new CodexAgentRunBackend(runContext, thread, this.threadManager);
      },
      releaseResources: async () => {
        const errors: unknown[] = [];
        if (runContext) {
          try { await this.threadManager.releasePreparation(runContext); } catch (error) { errors.push(error); }
        }
        try { await this.threadCleanup.cleanupPreparedWorkspaceSkills(skills); } catch (error) { errors.push(error); }
        for (const lease of clients) {
          try { await lease.release(); } catch (error) { errors.push(error); }
        }
        if (errors.length) throw new AggregateError(errors, "Codex exact preparation release failed.");
      },
    });
  }
}
