import type { TerminalTarget } from "~/types/terminal/TerminalTarget";
import type { WorkspaceMetadata } from "~/types/workspace/WorkspaceMetadata";
import {
  normalizeWorkspaceRootPath,
  displayNameFromWorkspaceRootPath,
} from "~/utils/workspaceMetadata";

export interface TerminalTargetCacheScope {
  nodeId: string;
  terminalWs: string;
}

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

const normalizeTerminalEndpoint = (value: string): string => value.trim().replace(/\/+$/, "");

export const createTerminalTargetCacheScope = (params: {
  nodeId: string;
  terminalWs: string;
}): TerminalTargetCacheScope => ({
  nodeId: params.nodeId.trim(),
  terminalWs: normalizeTerminalEndpoint(params.terminalWs),
});

export const getTerminalEndpointScopeKey = (
  scope: TerminalTargetCacheScope,
): string =>
  JSON.stringify({
    nodeId: scope.nodeId,
    terminalWs: scope.terminalWs,
  });

export const getTerminalTargetCacheKey = (
  scope: TerminalTargetCacheScope,
  target: TerminalTarget | null,
): string => {
  const scopeKey = getTerminalEndpointScopeKey(scope);
  if (target === null) {
    return `${scopeKey}|server-home`;
  }

  const rootPath = normalizeWorkspaceRootPath(target.rootPath);
  if (!rootPath) {
    throw new Error("Terminal target cache key requires a root path or explicit null target");
  }

  return `${scopeKey}|cwd:${rootPath}`;
};
