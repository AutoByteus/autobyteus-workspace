import { AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID } from "../services/server-settings-service.js";

export const MEMORY_COMPACTOR_AGENT_DEFINITION_ID = "autobyteus-memory-compactor";

export type BuiltInAgentSettingDefault = {
  key: typeof AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID;
  currentValue: "compactionAgentDefinitionId";
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
      currentValue: "compactionAgentDefinitionId",
    },
  },
] as const satisfies readonly BuiltInAgentDefinition[];
