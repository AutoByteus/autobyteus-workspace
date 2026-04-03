const TEAM_LOCAL_AGENT_ID_PREFIX = 'team-local:';

const normalizeRequiredPart = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  if (normalized.includes(':')) {
    throw new Error(`${fieldName} cannot contain ':'.`);
  }
  return normalized;
};

export const buildTeamLocalAgentDefinitionId = (teamId: string, agentId: string): string =>
  `${TEAM_LOCAL_AGENT_ID_PREFIX}${normalizeRequiredPart(teamId, 'teamId')}:${normalizeRequiredPart(agentId, 'agentId')}`;

export const parseTeamLocalAgentDefinitionId = (
  value: string,
): { teamId: string; agentId: string } | null => {
  const normalized = value.trim();
  if (!normalized.startsWith(TEAM_LOCAL_AGENT_ID_PREFIX)) {
    return null;
  }

  const payload = normalized.slice(TEAM_LOCAL_AGENT_ID_PREFIX.length);
  const [teamId, agentId, ...rest] = payload.split(':');
  if (rest.length > 0 || !teamId || !agentId) {
    return null;
  }

  return { teamId, agentId };
};
