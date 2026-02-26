import { EMBEDDED_NODE_ID, isEmbeddedNode } from '~/types/node';

const normalizeHomeNodeId = (homeNodeId: string | null | undefined): string => {
  const normalized = String(homeNodeId ?? '').trim();
  return normalized || EMBEDDED_NODE_ID;
};

/**
 * A team-level workspace selected on this frontend node can only be applied to
 * members that execute on the embedded node. Remote members must use their own
 * node-local workspace configuration.
 */
export const resolveWorkspaceIdForTeamMember = (
  homeNodeId: string | null | undefined,
  selectedWorkspaceId: string | null | undefined,
): string | null => {
  const workspaceId = String(selectedWorkspaceId ?? '').trim();
  if (!workspaceId) {
    return null;
  }
  return isEmbeddedNode(normalizeHomeNodeId(homeNodeId)) ? workspaceId : null;
};
