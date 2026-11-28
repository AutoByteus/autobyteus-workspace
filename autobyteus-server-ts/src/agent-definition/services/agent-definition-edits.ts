import type { AgentDefinition, AgentDefinitionUpdate } from "../domain/models.js";
import { userAvatarInput } from "../../agent-package-definitions/domain/definition-avatar-address.js";
import { normalizeDefaultLaunchConfigInput } from "../../launch-preferences/default-launch-config.js";
import type { PersonalSettingEdits } from "../../personal-settings/services/personal-settings-service.js";

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
  ...(data.avatarUrl !== undefined ? { avatarUrl: userAvatarInput(data.avatarUrl) } : {}),
  ...(data.defaultLaunchConfig !== undefined ? { defaultLaunchConfig: normalizeDefaultLaunchConfigInput(data.defaultLaunchConfig) ?? null } : {}),
});
