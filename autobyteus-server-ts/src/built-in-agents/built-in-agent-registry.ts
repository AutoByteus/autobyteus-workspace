import {
  AUTOBYTEUS_RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID,
} from "../services/server-settings-service.js";

export const MEMORY_COMPACTOR_AGENT_DEFINITION_ID = "autobyteus-memory-compactor";
export const RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID = "autobyteus-retrospective-skill-improver";
export const DAILY_ASSISTANT_AGENT_DEFINITION_ID = "autobyteus-daily-assistant";

export type BuiltInAgentSettingDefault = {
  key: typeof AUTOBYTEUS_RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID;
};

/**
 * Built-in agents are platform-owned: startup replaces each agent's files from its
 * shipped template, so edits made to a built-in agent do not survive a restart.
 */
export type BuiltInAgentDefinition = {
  id: string;
  templateDirName: string;
  displayName: string;
  settingDefault?: BuiltInAgentSettingDefault;
};

export const BUILT_IN_AGENT_DEFINITIONS = [
  {
    id: MEMORY_COMPACTOR_AGENT_DEFINITION_ID,
    templateDirName: "memory-compactor",
    displayName: "Memory Compactor",
  },
  {
    id: RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID,
    templateDirName: "retrospective-skill-improver",
    displayName: "Retrospective Skill Improver",
    settingDefault: {
      key: AUTOBYTEUS_RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID,
    },
  },
  {
    id: DAILY_ASSISTANT_AGENT_DEFINITION_ID,
    templateDirName: "daily-assistant",
    displayName: "Daily Assistant",
  },
] as const satisfies readonly BuiltInAgentDefinition[];
