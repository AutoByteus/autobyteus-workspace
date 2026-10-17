import type { AgentRun } from "./agent-run.js";

/** How a run was activated: a new conversation, or a continued one. */
export type AgentRunActivationKind = "new" | "restore" | "platform_restore";

/**
 * Observes the published lifetime of runs in one `AgentRunManager`. `runPublished` follows every
 * publication (with how the run was activated); `runReleased` follows every release of a
 * published run's attachments, which every removal path goes through. Implementations must not
 * throw; the manager logs and ignores observer failures.
 */
export interface AgentRunLifecycleObserver {
  runPublished(run: AgentRun, activationKind: AgentRunActivationKind): void;
  runReleased(run: AgentRun): void;
}
