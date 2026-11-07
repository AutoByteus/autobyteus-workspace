import { stat } from "node:fs/promises";
import path from "node:path";

/** Why a workspace path that is not yet registered was refused. */
export type WorkspacePathRefusalReason = "not_absolute" | "missing" | "not_a_folder";

const REFUSAL_MESSAGES: Record<WorkspacePathRefusalReason, string> = {
  not_absolute: "Workspace path must be an absolute path.",
  missing: "No folder exists at the workspace path.",
  not_a_folder: "The workspace path is a file, not a folder.",
};

export class WorkspacePathRefusedError extends Error {
  readonly reason: WorkspacePathRefusalReason;

  constructor(reason: WorkspacePathRefusalReason, rootPath: string) {
    super(`${REFUSAL_MESSAGES[reason]} (${rootPath})`);
    this.name = "WorkspacePathRefusedError";
    this.reason = reason;
  }
}

/**
 * A workspace path that is not yet registered must be an existing absolute directory.
 * Checked on the raw, trimmed input, before a relative path would be resolved against the server's working directory.
 */
export const assertWorkspaceFolder = async (rawRootPath: string): Promise<void> => {
  const rootPath = rawRootPath.trim();
  if (!path.isAbsolute(rootPath)) {
    throw new WorkspacePathRefusedError("not_absolute", rootPath);
  }
  let stats;
  try {
    stats = await stat(rootPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT" || (error as NodeJS.ErrnoException).code === "ENOTDIR") {
      throw new WorkspacePathRefusedError("missing", rootPath);
    }
    throw error;
  }
  if (!stats.isDirectory()) {
    throw new WorkspacePathRefusedError("not_a_folder", rootPath);
  }
};
