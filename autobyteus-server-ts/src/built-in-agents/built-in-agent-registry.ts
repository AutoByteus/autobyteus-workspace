import {
  AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID,
  AUTOBYTEUS_RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID,
} from "../services/server-settings-service.js";

export const MEMORY_COMPACTOR_AGENT_DEFINITION_ID = "autobyteus-memory-compactor";
export const RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID = "autobyteus-retrospective-skill-improver";

export type BuiltInAgentSettingDefault = {
  key: typeof AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID | typeof AUTOBYTEUS_RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID;
};

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
    settingDefault: {
      key: AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID,
    },
  },
  {
    id: RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID,
    templateDirName: "retrospective-skill-improver",
    displayName: "Retrospective Skill Improver",
    settingDefault: {
      key: AUTOBYTEUS_RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID,
    },
  },
] as const satisfies readonly BuiltInAgentDefinition[];
