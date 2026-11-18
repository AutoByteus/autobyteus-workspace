import type { MemberExecutionContext } from "../../agent-collaboration/execution/domain/member-execution-context.js";
import type { AgentRun } from "../../agent-execution/domain/agent-run.js";
import type {
  StandaloneAgentRunActivationResult,
  StandaloneRunAgentActivationInput,
} from "../../agent-execution/services/standalone-agent-run-lifecycle-service.js";
import type { StandaloneRunAgentTerminationResult } from "../../agent-execution/services/standalone-run-ports.js";

/** The standalone activation mechanics (the lifecycle service, the only writer of `run_metadata.json`). */
export type StandaloneRunAgentActivationBackend = Readonly<{
  getActiveRun(agentRunId: string): AgentRun | null;
  activateRunAgent(agentRunId: string, input: StandaloneRunAgentActivationInput): Promise<StandaloneAgentRunActivationResult>;
  terminateRunAgent(agentRunId: string): Promise<StandaloneRunAgentTerminationResult>;
}>;

export type StandaloneRunAgentReadiness = "offline" | "activating" | "live";

/**
 * The root-owned handle of a standalone run's own agent. Every root path to the agent (user
 * command, child message, stream connect, create and restore) goes through `ensureReady`: a
 * live agent is returned as is; a prepared, stopped or crashed one is activated or restored
 * with the root-built member context in one attempt that concurrent callers join.
 */
export class StandaloneRunAgentHandle {
  private activation: Promise<AgentRun> | null = null;

  constructor(private readonly options: Readonly<{
    agentRunId: string;
    backend: StandaloneRunAgentActivationBackend;
    buildMemberExecutionContext(): Promise<MemberExecutionContext>;
  }>) {}

  get agentRunId(): string { return this.options.agentRunId; }

  getActiveRun(): AgentRun | null { return this.options.backend.getActiveRun(this.agentRunId); }

  get readiness(): StandaloneRunAgentReadiness {
    if (this.getActiveRun()?.isActive()) return "live";
    return this.activation ? "activating" : "offline";
  }

  ensureReady(): Promise<AgentRun> {
    const live = this.getActiveRun();
    if (live) return Promise.resolve(live);
    if (this.activation) return this.activation;
    const attempt = this.activateOnce();
    this.activation = attempt;
    void attempt.finally(() => { if (this.activation === attempt) this.activation = null; }).catch(() => undefined);
    return attempt;
  }

  /** Stops the agent after any in-flight activation settles (so a starting agent is not left running). */
  async terminate(): Promise<StandaloneRunAgentTerminationResult> {
    await this.activation?.catch(() => undefined);
    return this.options.backend.terminateRunAgent(this.agentRunId);
  }

  private async activateOnce(): Promise<AgentRun> {
    const memberExecutionContext = await this.options.buildMemberExecutionContext();
    return (await this.options.backend.activateRunAgent(this.agentRunId, { memberExecutionContext })).run;
  }
}
