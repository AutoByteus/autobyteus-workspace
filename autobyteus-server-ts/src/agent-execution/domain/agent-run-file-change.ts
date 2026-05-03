export type AgentRunFileChangeStatus = "streaming" | "pending" | "available" | "failed";
export type AgentRunFileChangeSourceTool = "write_file" | "edit_file" | "generated_output";
export type AgentRunFileChangeArtifactType =
  | "file"
  | "image"
  | "audio"
  | "video"
  | "pdf"
  | "csv"
  | "excel"
  | "other";

export interface AgentRunFileChangePayload {
  id: string;
  runId: string;
  path: string;
  type: AgentRunFileChangeArtifactType;
  status: AgentRunFileChangeStatus;
  sourceTool: AgentRunFileChangeSourceTool;
  sourceInvocationId: string | null;
  content?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const normalizeAgentRunFileChangePath = (value: string): string =>
  value.replace(/\\/g, "/").trim();

export const buildAgentRunFileChangeId = (runId: string, path: string): string =>
  `${runId}:${normalizeAgentRunFileChangePath(path)}`;

export const buildInvocationAliases = (invocationId: string): string[] => {
  const trimmed = invocationId.trim();
  if (!trimmed) {
    return [];
  }

  const aliases = [trimmed];
  if (trimmed.includes(":")) {
    const base = trimmed.split(":")[0]?.trim();
    if (base && !aliases.includes(base)) {
      aliases.push(base);
    }
  }

  return aliases;
};

export const invocationIdsMatch = (
  left: string | null | undefined,
  right: string | null | undefined,
): boolean => {
  if (!left || !right) {
    return false;
  }

  const leftAliases = buildInvocationAliases(left);
  const rightAliases = buildInvocationAliases(right);
  return leftAliases.some((alias) => rightAliases.includes(alias));
};
