const TEAM_LOCAL_AGENT_ID_PREFIX = 'team-local:'

const normalizeRequiredPart = (value: string, fieldName: string): string => {
  const normalized = value.trim()
  if (!normalized) {
    throw new Error(`${fieldName} is required.`)
  }
  if (normalized.includes(':')) {
    throw new Error(`${fieldName} cannot contain ':'.`)
  }
  return normalized
}

export const buildTeamLocalAgentDefinitionId = (teamId: string, agentId: string): string =>
  `${TEAM_LOCAL_AGENT_ID_PREFIX}${normalizeRequiredPart(teamId, 'teamId')}:${normalizeRequiredPart(agentId, 'agentId')}`

export const parseTeamLocalAgentDefinitionId = (
  value: string | null | undefined,
): { teamId: string; agentId: string } | null => {
  const normalized = value?.trim() ?? ''
  if (!normalized.startsWith(TEAM_LOCAL_AGENT_ID_PREFIX)) {
    return null
  }

  const remainder = normalized.slice(TEAM_LOCAL_AGENT_ID_PREFIX.length)
  const separatorIndex = remainder.lastIndexOf(':')
  if (separatorIndex <= 0 || separatorIndex === remainder.length - 1) {
    return null
  }

  const teamId = remainder.slice(0, separatorIndex)
  const agentId = remainder.slice(separatorIndex + 1)
  try {
    return {
      teamId: normalizeRequiredPart(teamId, 'teamId'),
      agentId: normalizeRequiredPart(agentId, 'agentId'),
    }
  } catch {
    return null
  }
}
