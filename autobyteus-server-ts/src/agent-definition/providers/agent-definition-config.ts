import type {
  AgentDefinition,
  AgentDefinitionDefaultLaunchConfig,
} from "../domain/models.js";

export type AgentConfigRecord = {
  toolNames?: string[];
  skillNames?: string[];
  inputProcessorNames?: string[];
  llmResponseProcessorNames?: string[];
  systemPromptProcessorNames?: string[];
  toolExecutionResultProcessorNames?: string[];
  toolInvocationPreprocessorNames?: string[];
  lifecycleProcessorNames?: string[];
  avatarUrl?: string | null;
  defaultLaunchConfig?: AgentDefinitionDefaultLaunchConfig | null;
};

export const normalizeStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];

const normalizeRuntimeKind = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const normalizeObjectRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

export const normalizeDefaultLaunchConfig = (
  value: unknown,
): AgentDefinitionDefaultLaunchConfig | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const candidate = value as Record<string, unknown>;
  const llmModelIdentifier = typeof candidate.llmModelIdentifier === "string"
    ? candidate.llmModelIdentifier.trim() || null
    : null;
  const runtimeKind = normalizeRuntimeKind(candidate.runtimeKind);
  const llmConfig = normalizeObjectRecord(candidate.llmConfig);

  if (!llmModelIdentifier && !runtimeKind && !llmConfig) {
    return null;
  }

  return {
    llmModelIdentifier,
    runtimeKind,
    llmConfig,
  };
};

export const defaultAgentConfig = (): AgentConfigRecord => ({
  toolNames: [],
  skillNames: [],
  inputProcessorNames: [],
  llmResponseProcessorNames: [],
  systemPromptProcessorNames: [],
  toolExecutionResultProcessorNames: [],
  toolInvocationPreprocessorNames: [],
  lifecycleProcessorNames: [],
  avatarUrl: null,
  defaultLaunchConfig: null,
});

export const normalizeAgentConfigRecord = (
  value: AgentConfigRecord | Record<string, unknown> | null | undefined,
): AgentConfigRecord => ({
  toolNames: normalizeStringArray(value?.toolNames),
  skillNames: normalizeStringArray(value?.skillNames),
  inputProcessorNames: normalizeStringArray(value?.inputProcessorNames),
  llmResponseProcessorNames: normalizeStringArray(value?.llmResponseProcessorNames),
  systemPromptProcessorNames: normalizeStringArray(value?.systemPromptProcessorNames),
  toolExecutionResultProcessorNames: normalizeStringArray(value?.toolExecutionResultProcessorNames),
  toolInvocationPreprocessorNames: normalizeStringArray(value?.toolInvocationPreprocessorNames),
  lifecycleProcessorNames: normalizeStringArray(value?.lifecycleProcessorNames),
  avatarUrl: typeof value?.avatarUrl === "string" ? value.avatarUrl : null,
  defaultLaunchConfig: normalizeDefaultLaunchConfig(value?.defaultLaunchConfig),
});

export const buildAgentConfigRecord = (domainObj: AgentDefinition): AgentConfigRecord => ({
  toolNames: domainObj.toolNames ?? [],
  skillNames: domainObj.skillNames ?? [],
  inputProcessorNames: domainObj.inputProcessorNames ?? [],
  llmResponseProcessorNames: domainObj.llmResponseProcessorNames ?? [],
  systemPromptProcessorNames: domainObj.systemPromptProcessorNames ?? [],
  toolExecutionResultProcessorNames: domainObj.toolExecutionResultProcessorNames ?? [],
  toolInvocationPreprocessorNames: domainObj.toolInvocationPreprocessorNames ?? [],
  lifecycleProcessorNames: domainObj.lifecycleProcessorNames ?? [],
  avatarUrl: domainObj.avatarUrl ?? null,
  defaultLaunchConfig: domainObj.defaultLaunchConfig ?? null,
});

export const mergeAgentConfigRecord = (
  existingConfig: Record<string, unknown>,
  domainObj: AgentDefinition,
): Record<string, unknown> => ({
  ...existingConfig,
  ...buildAgentConfigRecord(domainObj),
});
