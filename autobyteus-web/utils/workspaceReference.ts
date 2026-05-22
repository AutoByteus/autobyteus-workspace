import type { WorkspaceReference } from '~/types/workspace/WorkspaceReference';

export const normalizeWorkspaceRootPath = (value: string | null | undefined): string => {
  const source = (value || '').trim();
  if (!source) {
    return '';
  }
  const normalized = source.replace(/\\/g, '/');
  if (normalized === '/') {
    return normalized;
  }
  return normalized.replace(/\/+$/, '');
};

export const workspaceReferenceKeyForRootPath = (value: string | null | undefined): string =>
  normalizeWorkspaceRootPath(value);

export const displayNameFromWorkspaceRootPath = (rootPath: string): string => {
  const normalized = normalizeWorkspaceRootPath(rootPath);
  if (!normalized || normalized === '/') {
    return normalized || 'Workspace';
  }
  return normalized.split('/').filter(Boolean).pop() || normalized;
};

export const createWorkspaceReference = (params: {
  workspaceId: string;
  workspaceRootPath: string;
  displayName?: string | null;
}): WorkspaceReference => {
  const workspaceRootPath = normalizeWorkspaceRootPath(params.workspaceRootPath);
  return {
    workspaceId: params.workspaceId,
    workspaceRootPath,
    displayName: params.displayName?.trim() || displayNameFromWorkspaceRootPath(workspaceRootPath),
    kind: 'filesystem',
  };
};

export const workspaceReferenceFromWorkspaceInfo = (workspace: {
  workspaceId: string;
  name?: string | null;
  absolutePath?: string | null;
  workspaceConfig?: Record<string, any> | null;
}): WorkspaceReference | null => {
  const workspaceRootPath = normalizeWorkspaceRootPath(
    workspace.absolutePath ||
      workspace.workspaceConfig?.root_path ||
      workspace.workspaceConfig?.rootPath ||
      null,
  );
  if (!workspaceRootPath || workspace.workspaceId.startsWith('skill_ws_')) {
    return null;
  }
  return createWorkspaceReference({
    workspaceId: workspace.workspaceId,
    workspaceRootPath,
    displayName: workspace.name,
  });
};
