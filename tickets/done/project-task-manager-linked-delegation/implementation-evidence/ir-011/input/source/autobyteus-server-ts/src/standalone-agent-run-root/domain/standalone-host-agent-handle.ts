import type { MemberExecutionContext } from "../../agent-collaboration/execution/domain/member-execution-context.js";
import type { AgentRun } from "../../agent-execution/domain/agent-run.js";
import type {
  StandaloneAgentRunActivationResult,
  StandaloneHostActivationInput,
} from "../../agent-execution/services/standalone-agent-run-lifecycle-service.js";
import type { StandaloneHostTerminationResult } from "../../agent-execution/services/standalone-run-ports.js";

/** The standalone activation mechanics (the lifecycle service, the only writer of `run_metadata.json`). */
export type StandaloneHostActivationBackend = Readonly<{
  getActiveRun(hostRunId: string): AgentRun | null;
  activateHost(hostRunId: string, input: StandaloneHostActivationInput): Promise<StandaloneAgentRunActivationResult>;
  terminateHost(hostRunId: string): Promise<StandaloneHostTerminationResult>;
}>;

export type StandaloneHostReadiness = "offline" | "activating" | "live";

/**
 * The root-owned handle of a standalone run's own agent. Every root path to the host (user
 * command, child message, stream connect, create and restore) goes through `ensureReady`: a
 * live host is returned as is; a prepared, stopped or crashed one is activated or restored
 * with the root-built member context in one attempt that concurrent callers join.
 */
export class StandaloneHostAgentHandle {
  private activation: Promise<AgentRun> | null = null;

  constructor(private readonly options: Readonly<{
    hostRunId: string;
    backend: StandaloneHostActivationBackend;
    buildMemberExecutionContext(): Promise<MemberExecutionContext>;
  }>) {}

  get hostRunId(): string { return this.options.hostRunId; }

  getActiveRun(): AgentRun | null { return this.options.backend.getActiveRun(this.hostRunId); }

  get readiness(): StandaloneHostReadiness {
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

  /** Stops the host after any in-flight activation settles (so a starting host is not left running). */
  async terminate(): Promise<StandaloneHostTerminationResult> {
    await this.activation?.catch(() => undefined);
    return this.options.backend.terminateHost(this.hostRunId);
  }

  private async activateOnce(): Promise<AgentRun> {
    const memberExecutionContext = await this.options.buildMemberExecutionContext();
    return (await this.options.backend.activateHost(this.hostRunId, { memberExecutionContext })).run;
  }
}
