/** Whether a standalone run's host runtime is active. */
export type AgentRunActivityLookup = Readonly<{
  hasActiveRun(runId: string): boolean | Promise<boolean>;
}>;

/** Whether a standalone run still has a registered Agent root. */
export type StandaloneRunCollaborationRoots = Readonly<{
  hasRoot(runId: string): boolean | Promise<boolean>;
}>;

/**
 * A standalone run is live while its host runtime is active, or while its Agent root is
 * registered: the root outlives a host that went down on its own and keeps its children
 * running. History must not delete or archive a live run; only an explicit Stop ends the root.
 */
export type StandaloneRunLiveness = Readonly<{ isLive(runId: string): Promise<boolean> }>;

const processAgentRunActivity: AgentRunActivityLookup = Object.freeze({
  hasActiveRun: async (runId: string) => {
    const { AgentRunManager } = await import("../../agent-execution/services/agent-run-manager.js");
    return AgentRunManager.getInstance().hasActiveRun(runId);
  },
});

/** The process Agent-root manager; false when none is initialized. */
const processCollaborationRoots: StandaloneRunCollaborationRoots = Object.freeze({
  hasRoot: async (runId: string) => {
    const { AgentRunCollaborationRootManager } = await import(
      "../../agent-run-collaboration/services/agent-run-collaboration-root-manager.js"
    );
    return AgentRunCollaborationRootManager.hasRegisteredRoot(runId);
  },
});

export const createStandaloneRunLiveness = (input: Readonly<{
  agentRunManager?: AgentRunActivityLookup;
  collaborationRoots?: StandaloneRunCollaborationRoots;
}> = {}): StandaloneRunLiveness => {
  const hosts = input.agentRunManager ?? processAgentRunActivity;
  const roots = input.collaborationRoots ?? processCollaborationRoots;
  return Object.freeze({
    isLive: async (runId: string) => Boolean(await hosts.hasActiveRun(runId)) || Boolean(await roots.hasRoot(runId)),
  });
};
