/** Whether a standalone run's host runtime is active. */
export type AgentRunActivityLookup = Readonly<{
  hasActiveRun(runId: string): boolean | Promise<boolean>;
}>;

/** The `StandaloneAgentRunRoot` of a standalone run, seen from history. */
export type StandaloneRunCollaborationRoots = Readonly<{
  hasRoot(runId: string): boolean | Promise<boolean>;
  /** Ends the run's root (children, then its host; unregister) as a Stop does; throws when it cannot finish. */
  endRoot(runId: string): Promise<void>;
}>;

/**
 * History mutations (delete, archive, prepared-run cancel) need a run that owns no live execution.
 * A run whose host is active is refused. A root outlives a host that went down on its own (its
 * children may still run), so a root that lingers after the host is ended first, as an explicit
 * Stop does; only a root that cannot be ended keeps the run live.
 */
export type StandaloneRunLiveness = Readonly<{
  /** True when the run is free for a history mutation (any lingering root has been ended). */
  releaseForHistory(runId: string): Promise<boolean>;
}>;

const processAgentRunActivity: AgentRunActivityLookup = Object.freeze({
  hasActiveRun: async (runId: string) => {
    const { AgentRunManager } = await import("../../agent-execution/services/agent-run-manager.js");
    return AgentRunManager.getInstance().hasActiveRun(runId);
  },
});

const processRootManager = async () => (await import(
  "../../standalone-agent-run-root/services/standalone-agent-run-root-manager.js"
)).findStandaloneAgentRunRootManager();

/** The process root manager; no root when none is bound. */
const processCollaborationRoots: StandaloneRunCollaborationRoots = Object.freeze({
  hasRoot: async (runId: string) => (await processRootManager())?.hasRoot(runId) ?? false,
  endRoot: async (runId: string) => { await (await processRootManager())?.endRoot(runId); },
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
