import type { AgentRun } from "../../agent-execution/domain/agent-run.js";
import type { ActiveCollaborationRootDirectory } from "../../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import { createAgentRootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { StandaloneAgentRunRoot } from "../../standalone-agent-run-root/domain/standalone-agent-run-root.js";

/** Where an agent run's readiness is followed: its standalone root's registration, and the root's agent-ready hook. */
export type AgentRunFollowSources = Readonly<{
  registrations: Pick<ActiveCollaborationRootDirectory, "onRegistrationChanged">;
  roots: Readonly<{ getActive(agentRunId: string): Pick<StandaloneAgentRunRoot, "activeAgentRun" | "onAgentReady"> | null }>;
}>;

/**
 * Follows one agent run by its run ID for an open stream session (autobyteus-461 SR-064): the rule the team and org view
 * sessions follow (SR-046). Whoever makes the run ready (a delegator's Task message, a peer, a restart resume, another
 * session), `ready` gets its `AgentRun` from the root's agent-ready hook, which runs in the root's gate before anything
 * is posted to it; an idle shutdown and a later restore give the new `AgentRun`. `ended` is told when the run's root
 * ends. A run without a standalone root (an application's run) is never told: it binds only as before. Returns the
 * unsubscribe.
 */
export const followAgentRun = (
  sources: AgentRunFollowSources,
  agentRunId: string,
  listener: Readonly<{ ready(run: AgentRun): void; ended(): void }>,
): (() => void) => {
  let offAgentReady: (() => void) | null = null;
  const attach = (): void => {
    offAgentReady?.();
    offAgentReady = null;
    const root = sources.roots.getActive(agentRunId);
    if (!root) return;
    offAgentReady = root.onAgentReady((run) => listener.ready(run));
    const live = root.activeAgentRun();
    if (live) listener.ready(live);
  };
  const offRegistration = sources.registrations.onRegistrationChanged(createAgentRootExecutionIdentity(agentRunId), (registered) => {
    if (registered) { attach(); return; }
    offAgentReady?.();
    offAgentReady = null;
    listener.ended();
  });
  attach();
  return () => {
    offRegistration();
    offAgentReady?.();
    offAgentReady = null;
  };
};
