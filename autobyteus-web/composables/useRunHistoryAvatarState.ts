import type { TeamMemberTreeRow } from '~/stores/runHistoryTypes';

const toInitials = (value: string, fallback: string): string => {
  const tokens = value
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) {
    return fallback;
  }
  return tokens
    .slice(0, 2)
    .map((token) => token.charAt(0).toUpperCase())
    .join('');
};

const toTeamMemberDisplayName = (member: TeamMemberTreeRow): string => {
  const direct = member.displayName.trim();
  if (direct) {
    return direct;
  }

  const routeKey = member.memberAddress || '';
  const routeLeaf = routeKey
    .split('/')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .pop();
  return routeLeaf || routeKey || 'Member';
};

/**
 * The run history rows' names and initials. Their pictures are each row's `DefinitionAvatar` (autobyteus-669 W-1),
 * which owns loading and failure; the rows no longer keep broken-image state here.
 */
export const useRunHistoryAvatarState = () => {
  const getAgentInitials = (agentName: string): string => toInitials(agentName || 'Agent', 'AG');
  const getTeamMemberDisplayName = (member: TeamMemberTreeRow): string => toTeamMemberDisplayName(member);
  const getTeamMemberInitials = (member: TeamMemberTreeRow): string => getAgentInitials(getTeamMemberDisplayName(member));
  return { getAgentInitials, getTeamMemberDisplayName, getTeamMemberInitials };
};
