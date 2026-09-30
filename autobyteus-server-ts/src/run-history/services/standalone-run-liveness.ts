/** Whether a standalone run's host runtime is active. */
export type AgentRunActivityLookup = Readonly<{
  hasActiveRun(runId: string): boolean | Promise<boolean>;
}>;

/** The Agent root of a standalone run, seen from history. */
export type StandaloneRunCollaborationRoots = Readonly<{
  hasRoot(runId: string): boolean | Promise<boolean>;
  /** Ends the run's Agent root (fence, stop every child, unregister); throws when it cannot finish. */
  endRoot(runId: string): Promise<void>;
}>;

/**
 * History mutations (delete, archive, prepared-run cancel) need a run that owns no live execution.
 * A run whose host is active is refused. The Agent root outlives a host that went down on its
 * own (its children may still run), so a root that lingers after the host is ended first, as an
 * explicit Stop does; only a root that cannot be ended keeps the run live.
 */
export type StandaloneRunLiveness = Readonly<{
  /** True when the run is free for a history mutation (any lingering Agent root has been ended). */
  releaseForHistory(runId: string): Promise<boolean>;
}>;

const processAgentRunActivity: AgentRunActivityLookup = Object.freeze({
  hasActiveRun: async (runId: string) => {
    const { AgentRunManager } = await import("../../agent-execution/services/agent-run-manager.js");
    return AgentRunManager.getInstance().hasActiveRun(runId);
  },
});

const rootManager = async () => (await import(
  "../../agent-run-collaboration/services/agent-run-collaboration-root-manager.js"
)).AgentRunCollaborationRootManager;

/** The process Agent-root manager; no root when none is initialized. */
const processCollaborationRoots: StandaloneRunCollaborationRoots = Object.freeze({
  hasRoot: async (runId: string) => (await rootManager()).hasRegisteredRoot(runId),
  endRoot: async (runId: string) => { await (await rootManager()).endRegisteredRoot(runId); },
});

export const createStandaloneRunLiveness = (input: Readonly<{
  agentRunManager?: AgentRunActivityLookup;
  collaborationRoots?: StandaloneRunCollaborationRoots;
}> = {}): StandaloneRunLiveness => {
  const hosts = input.agentRunManager ?? processAgentRunActivity;
  const roots = input.collaborationRoots ?? processCollaborationRoots;
  return Object.freeze({
    releaseForHistory: async (runId: string) => {
      if (await hosts.hasActiveRun(runId)) return false;
      if (!(await roots.hasRoot(runId))) return true;
      try {
        await roots.endRoot(runId);
        return true;
      } catch (error) {
        console.warn(`Agent root of run '${runId}' could not be ended before a history change:`, error);
        return false;
      }
    },
  });
};
