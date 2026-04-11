export type RunFileChangeStatus = "streaming" | "pending" | "available" | "failed";
export type RunFileChangeSourceTool = "write_file" | "edit_file" | "generated_output";
export type RunFileChangeArtifactType =
  | "file"
  | "image"
  | "audio"
  | "video"
  | "pdf"
  | "csv"
  | "excel"
  | "other";

export interface RunFileChangeEntry {
  id: string;
  runId: string;
  path: string;
  type: RunFileChangeArtifactType;
  status: RunFileChangeStatus;
  sourceTool: RunFileChangeSourceTool;
  sourceInvocationId: string | null;
  content?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RunFileChangeProjection {
  version: 2;
  entries: RunFileChangeEntry[];
}

export interface RunFileChangeLivePayload extends RunFileChangeEntry {}

export const EMPTY_RUN_FILE_CHANGE_PROJECTION: RunFileChangeProjection = {
  version: 2,
  entries: [],
};

export const normalizeRunFileChangePath = (value: string): string => value.replace(/\\/g, "/").trim();

export const buildRunFileChangeId = (runId: string, path: string): string =>
  `${runId}:${normalizeRunFileChangePath(path)}`;

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
