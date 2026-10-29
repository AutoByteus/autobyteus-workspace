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
};

export const BUILT_IN_AGENT_DEFINITIONS = [
  {
    id: DAILY_ASSISTANT_AGENT_DEFINITION_ID,
    templateDirName: "daily-assistant",
    displayName: "Daily Assistant",
  },
  {
    id: MODEL_ROUTER_AGENT_DEFINITION_ID,
    templateDirName: "model-router",
    displayName: "Model Router",
  },
] as const satisfies readonly BuiltInAgentDefinition[];
