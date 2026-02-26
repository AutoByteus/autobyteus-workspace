const normalizeRequiredString = (value: string, field: string): string => {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return normalized;
};

const normalizeOptionalString = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const cloneLlmConfig = (
  llmConfig: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null => {
  if (!llmConfig) {
    return null;
  }
  return { ...llmConfig };
};

export type RunScopedMemberBinding = {
  memberName: string;
  agentDefinitionId: string;
  llmModelIdentifier: string;
  autoExecuteTools: boolean;
  workspaceId: string | null;
  workspaceRootPath: string | null;
  llmConfig: Record<string, unknown> | null;
  memberRouteKey: string | null;
  memberAgentId: string | null;
  memoryDir: string | null;
  hostNodeId: string | null;
};

export type RunScopedMemberBindingInput = {
  memberName: string;
  agentDefinitionId: string;
  llmModelIdentifier: string;
  autoExecuteTools: boolean;
  workspaceId?: string | null;
  workspaceRootPath?: string | null;
  llmConfig?: Record<string, unknown> | null;
  memberRouteKey?: string | null;
  memberAgentId?: string | null;
  memoryDir?: string | null;
  hostNodeId?: string | null;
};

export const toRunScopedMemberBinding = (
  input: RunScopedMemberBindingInput,
): RunScopedMemberBinding => ({
  memberName: normalizeRequiredString(input.memberName, "memberName"),
  agentDefinitionId: normalizeRequiredString(input.agentDefinitionId, "agentDefinitionId"),
  llmModelIdentifier: normalizeRequiredString(input.llmModelIdentifier, "llmModelIdentifier"),
  autoExecuteTools: Boolean(input.autoExecuteTools),
  workspaceId: normalizeOptionalString(input.workspaceId),
  workspaceRootPath: normalizeOptionalString(input.workspaceRootPath),
  llmConfig: cloneLlmConfig(input.llmConfig),
  memberRouteKey: normalizeOptionalString(input.memberRouteKey),
  memberAgentId: normalizeOptionalString(input.memberAgentId),
  memoryDir: normalizeOptionalString(input.memoryDir),
  hostNodeId: normalizeOptionalString(input.hostNodeId),
});

export const cloneRunScopedMemberBinding = (
  input: RunScopedMemberBinding,
): RunScopedMemberBinding => ({
  memberName: input.memberName,
  agentDefinitionId: input.agentDefinitionId,
  llmModelIdentifier: input.llmModelIdentifier,
  autoExecuteTools: input.autoExecuteTools,
  workspaceId: input.workspaceId,
  workspaceRootPath: input.workspaceRootPath,
  llmConfig: cloneLlmConfig(input.llmConfig),
  memberRouteKey: input.memberRouteKey,
  memberAgentId: input.memberAgentId,
  memoryDir: input.memoryDir,
  hostNodeId: input.hostNodeId,
});
