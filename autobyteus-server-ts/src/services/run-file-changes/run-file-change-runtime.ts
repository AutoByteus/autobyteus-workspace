import type { AgentRun } from "../../agent-execution/domain/agent-run.js";
import type { WorkspaceManager } from "../../workspaces/workspace-manager.js";
import type { RunFileChangeProjection } from "./run-file-change-types.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

export const cloneRunFileChangeProjection = (
  projection: RunFileChangeProjection,
): RunFileChangeProjection => ({
  version: 2,
  entries: projection.entries.map((entry) => ({ ...entry })),
});

export const resolveRunFileChangeWorkspaceRootPath = (
  run: AgentRun,
  workspaceManager: WorkspaceManager,
): string | null => {
  const workspaceId = run.config.workspaceId;
  if (!workspaceId) {
    return null;
  }

  try {
    return workspaceManager.getWorkspaceById(workspaceId)?.getBasePath() ?? null;
  } catch (error) {
    logger.warn(
      `RunFileChangeService: failed resolving workspace '${workspaceId}' for run '${run.runId}': ${String(error)}`,
    );
    return null;
  }
};
