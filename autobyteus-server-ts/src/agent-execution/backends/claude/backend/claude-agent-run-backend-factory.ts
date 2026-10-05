import { createBackendPreparation } from "../../agent-run-backend-preparation.js";
import type { AgentRunBackendPreparationRequest } from "../../agent-run-backend-factory.js";
import type { MaterializedWorkspaceSkill } from "../../shared/workspace-skill-materializer.js";
import type { ClaudeRunContext } from "./claude-agent-run-context.js";
import type { ClaudeSession } from "../session/claude-session.js";
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

  beginPreparation(request: AgentRunBackendPreparationRequest) {
    const skills: MaterializedWorkspaceSkill[] = [];
    let runContext: ClaudeRunContext | null = null;
    let session: ClaudeSession | null = null;
    return createBackendPreparation({
      prepare: async (assertAccepting) => {
        const guard = { assertAccepting, ownSkill: (skill: MaterializedWorkspaceSkill) => { skills.push(skill); } };
        let platformAgentRunId: string | null = null;
        if (request.kind === "restore") {
          const runtime = request.context.runtimeContext;
          platformAgentRunId = runtime && "sessionId" in runtime && typeof runtime.sessionId === "string" ? runtime.sessionId.trim() : null;
          if (!platformAgentRunId || platformAgentRunId === request.context.runId) throw new Error("PLATFORM_AGENT_RUN_BINDING_INVALID");
          ClaudeProviderSessionLifecycle.restore(platformAgentRunId, request.context.runId);
        }
        runContext = request.kind === "new"
          ? await this.sessionBootstrapper.bootstrapForCreate(new AgentRunContext({ runId: request.runId, config: request.config, runtimeContext: null }), guard)
          : await this.sessionBootstrapper.bootstrapForRestore(request.context as AgentRunContext<any>, guard);
        assertAccepting();
        const ownSession = (value: ClaudeSession) => { session = value; };
        session = platformAgentRunId
          ? await this.sessionManager.restoreRunSession(runContext, platformAgentRunId, ownSession)
          : await this.sessionManager.createRunSession(runContext, ownSession);
        assertAccepting();
        return new ClaudeAgentRunBackend(runContext, session);
      },
      releaseResources: async () => {
        const errors: unknown[] = [];
        if (session) {
          try { await this.sessionManager.releaseExactSession(session); } catch (error) { errors.push(error); }
        }
        try { await this.sessionBootstrapper.releaseSkills(skills); } catch (error) { errors.push(error); }
        if (errors.length) throw new AggregateError(errors, "Claude exact preparation release failed.");
      },
    });
  }
}
