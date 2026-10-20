export const DAILY_ASSISTANT_AGENT_DEFINITION_ID = "autobyteus-daily-assistant";

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
] as const satisfies readonly BuiltInAgentDefinition[];
