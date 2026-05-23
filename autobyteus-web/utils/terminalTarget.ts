import type { TerminalTarget } from "~/types/terminal/TerminalTarget";
import type { WorkspaceMetadata } from "~/types/workspace/WorkspaceMetadata";
import {
  normalizeWorkspaceRootPath,
  displayNameFromWorkspaceRootPath,
} from "~/utils/workspaceMetadata";

export const createTerminalTarget = (params: {
  rootPath?: string | null;
  workspaceId?: string | null;
  displayName?: string | null;
}): TerminalTarget | null => {
  const rootPath = normalizeWorkspaceRootPath(params.rootPath);
  if (!rootPath) {
    return null;
  }
  return {
    rootPath,
    workspaceId: params.workspaceId?.trim() || null,
    displayName:
      params.displayName?.trim() || displayNameFromWorkspaceRootPath(rootPath),
  };
};

export const terminalTargetFromWorkspaceMetadata = (
  metadata: WorkspaceMetadata | null | undefined,
): TerminalTarget | null => {
  if (!metadata) {
    return null;
  }
  return createTerminalTarget({
    rootPath: metadata.workspaceRootPath,
    workspaceId: metadata.workspaceId,
    displayName: metadata.displayName,
  });
};
