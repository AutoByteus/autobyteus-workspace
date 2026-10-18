import type { RuntimeSkillProfile } from "../../shared/runtime-skill-profile.js";
import { createBackendPreparation } from "../../agent-run-backend-preparation.js";
import type { AgentRunBackendPreparationRequest } from "../../agent-run-backend-factory.js";
import type { CodexRunContext } from "./codex-agent-run-context.js";
import { AgentRunContext } from "../../../domain/agent-run-context.js";
import type { CodexThreadManager } from "../thread/codex-thread-manager.js";
import type { CodexThreadBootstrapper } from "./codex-thread-bootstrapper.js";
import { CodexAgentRunBackend } from "./codex-agent-run-backend.js";
import type { AgentRunBackendFactory } from "../../agent-run-backend-factory.js";


export class CodexAgentRunBackendFactory implements AgentRunBackendFactory {
  private readonly threadManager: CodexThreadManager;
  private readonly threadBootstrapper: CodexThreadBootstrapper;
  constructor(
    threadManager: CodexThreadManager,
    threadBootstrapper: CodexThreadBootstrapper,
  ) {
    this.threadManager = threadManager;
    this.threadBootstrapper = threadBootstrapper;
  }

  beginPreparation(request: AgentRunBackendPreparationRequest) {
    const profiles: RuntimeSkillProfile[] = [];
    let runContext: CodexRunContext | null = null;
    return createBackendPreparation({
      prepare: async (assertAccepting) => {
        const guard = { assertAccepting, ownSkillProfile: (profile: RuntimeSkillProfile) => { profiles.push(profile); } };
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
        if (!errors.length) for (const profile of profiles) {
          try { await profile.release(); } catch (error) { errors.push(error); }
        }
        if (errors.length) throw new AggregateError(errors, "Codex exact preparation release failed.");
      },
    });
  }
}
