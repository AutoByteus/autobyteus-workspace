export const DAILY_ASSISTANT_AGENT_DEFINITION_ID = "autobyteus-daily-assistant";
/** The internal Model Router agent (autobyteus-32 REQ-003), run only by Model Routing's `ModelRouterAgent`. */
export const MODEL_ROUTER_AGENT_DEFINITION_ID = "autobyteus-model-router";

/**
 * Built-in agents are platform-owned: startup replaces each agent's files from its
 * shipped template, so edits made to a built-in agent do not survive a restart.
 */
export type BuiltInAgentDefinition = {
  id: string;
  templateDirName: string;
  displayName: string;
  /**
   * Whether the agent may be a collaborator: an `@` candidate, listed by `list_available_agents` (also to peers)
   * and delegated to. The Daily Assistant is one like any shared agent; the Model Router never is, whatever the
   * "Show internal agents" setting (autobyteus-455 REQ-002).
   */
  collaborationEligible: boolean;
};

export const BUILT_IN_AGENT_DEFINITIONS = [
  {
    id: DAILY_ASSISTANT_AGENT_DEFINITION_ID,
    templateDirName: "daily-assistant",
    displayName: "Daily Assistant",
    collaborationEligible: true,
  },
  {
    id: MODEL_ROUTER_AGENT_DEFINITION_ID,
    templateDirName: "model-router",
    displayName: "Model Router",
    collaborationEligible: false,
  },
] as const satisfies readonly BuiltInAgentDefinition[];
