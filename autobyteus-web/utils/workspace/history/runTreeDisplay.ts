export const getAgentNodeKey = (workspaceRootPath: string, agentDefinitionId: string): string => {
  return `${workspaceRootPath}::${agentDefinitionId}`;
};

export const getAgentAvatarKey = (
  workspaceRootPath: string,
  agentDefinitionId: string,
  avatarUrl?: string | null,
): string => {
  return `${getAgentNodeKey(workspaceRootPath, agentDefinitionId)}::${(avatarUrl || '').trim()}`;
};

export const agentInitials = (agentName: string): string => {
  const normalizedName = (agentName || '').trim();
  if (!normalizedName) {
    return 'AG';
  }
  const tokens = normalizedName.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return 'AG';
  }
  return tokens
    .slice(0, 2)
    .map((token) => token.charAt(0).toUpperCase())
    .join('');
};

export const workspacePathLeafName = (workspaceRootPath: string): string => {
  const normalized = workspaceRootPath.replace(/\\/g, '/').replace(/\/+$/, '');
  if (!normalized || normalized === '/') {
    return workspaceRootPath;
  }
  const segments = normalized.split('/').filter(Boolean);
  return segments[segments.length - 1] || workspaceRootPath;
};
