import type { AgentDefinition, AgentDefinitionUpdate } from "../domain/models.js";
import { normalizeDefaultLaunchConfigInput } from "../../launch-preferences/default-launch-config.js";
import type { PersonalSettingEdits } from "../../personal-settings/services/personal-settings-service.js";

/** A trimmed non-empty string, or null. */
export const normalizeOptionalString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

/** A copy that keeps the class (and copies the arrays it patches). */
export const cloneAgent = (definition: AgentDefinition): AgentDefinition => Object.assign(
  Object.create(Object.getPrototypeOf(definition) as object) as AgentDefinition,
  definition,
  {
    toolNames: [...definition.toolNames],
    skillNames: [...definition.skillNames],
    inputProcessorNames: [...definition.inputProcessorNames],
    llmResponseProcessorNames: [...definition.llmResponseProcessorNames],
    toolExecutionResultProcessorNames: [...definition.toolExecutionResultProcessorNames],
    toolInvocationPreprocessorNames: [...definition.toolInvocationPreprocessorNames],
    lifecycleProcessorNames: [...definition.lifecycleProcessorNames],
  },
);

/** The input's personal settings, normalized as the files would hold them; an absent field stays absent. */
export const personalEditsOf = (data: AgentDefinitionUpdate): PersonalSettingEdits => ({
  ...(data.toolNames !== undefined && data.toolNames !== null ? { toolNames: data.toolNames } : {}),
  ...(data.skillNames !== undefined && data.skillNames !== null ? { skillNames: data.skillNames } : {}),
  ...(data.avatarUrl !== undefined ? { avatarUrl: normalizeOptionalString(data.avatarUrl) } : {}),
  ...(data.defaultLaunchConfig !== undefined ? { defaultLaunchConfig: normalizeDefaultLaunchConfigInput(data.defaultLaunchConfig) ?? null } : {}),
  ...(typeof data.semanticMemoryEnabled === "boolean" ? { semanticMemoryEnabled: data.semanticMemoryEnabled } : {}),
});
