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
 * How startup keeps a built-in agent's files in line with its template:
 * - `overwrite`: platform-owned; files are replaced from the template on every startup.
 * - `seedIfMissing`: user-configurable; only missing files are seeded, so user edits persist.
 */
export type BuiltInAgentSyncPolicy = "overwrite" | "seedIfMissing";

export type BuiltInAgentDefinition = {
  id: string;
  templateDirName: string;
  displayName: string;
  syncPolicy: BuiltInAgentSyncPolicy;
  settingDefault?: BuiltInAgentSettingDefault;
};

export const BUILT_IN_AGENT_DEFINITIONS = [
  {
    id: MEMORY_COMPACTOR_AGENT_DEFINITION_ID,
    templateDirName: "memory-compactor",
    displayName: "Memory Compactor",
    syncPolicy: "overwrite",
  },
  {
    id: RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID,
    templateDirName: "retrospective-skill-improver",
    displayName: "Retrospective Skill Improver",
    syncPolicy: "overwrite",
    settingDefault: {
      key: AUTOBYTEUS_RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID,
    },
  },
  {
    id: DAILY_ASSISTANT_AGENT_DEFINITION_ID,
    templateDirName: "daily-assistant",
    displayName: "Daily Assistant",
    syncPolicy: "seedIfMissing",
  },
] as const satisfies readonly BuiltInAgentDefinition[];
