import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata';

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

export const workspaceMetadataKeyForRootPath = (value: string | null | undefined): string =>
  normalizeWorkspaceRootPath(value);

export const displayNameFromWorkspaceRootPath = (rootPath: string): string => {
  const normalized = normalizeWorkspaceRootPath(rootPath);
  if (!normalized || normalized === '/') {
    return normalized || 'Workspace';
  }
  return normalized.split('/').filter(Boolean).pop() || normalized;
};

export const createWorkspaceMetadata = (params: {
  workspaceId: string;
  workspaceRootPath: string;
  displayName?: string | null;
  kind?: WorkspaceMetadata['kind'];
}): WorkspaceMetadata => {
  const workspaceRootPath = normalizeWorkspaceRootPath(params.workspaceRootPath);
  return {
    workspaceId: params.workspaceId,
    workspaceRootPath,
    displayName: params.displayName?.trim() || displayNameFromWorkspaceRootPath(workspaceRootPath),
    kind: params.kind || 'filesystem',
  };
};

export const workspaceMetadataFromWorkspaceInfo = (workspace: {
  workspaceId: string;
  name?: string | null;
  absolutePath?: string | null;
  workspaceRootPath?: string | null;
  workspaceConfig?: Record<string, any> | null;
  kind?: WorkspaceMetadata['kind'] | string | null;
}): WorkspaceMetadata | null => {
  const workspaceRootPath = normalizeWorkspaceRootPath(
    workspace.workspaceRootPath ||
      workspace.absolutePath ||
      workspace.workspaceConfig?.root_path ||
      workspace.workspaceConfig?.rootPath ||
      null,
  );
  if (!workspaceRootPath) {
    return null;
  }
  return createWorkspaceMetadata({
    workspaceId: workspace.workspaceId,
    workspaceRootPath,
    displayName: workspace.name,
    kind: workspace.kind === 'skill' || workspace.workspaceId.startsWith('skill_ws_')
      ? 'skill'
      : workspace.kind === 'temp'
        ? 'temp'
        : 'filesystem',
  });
};
