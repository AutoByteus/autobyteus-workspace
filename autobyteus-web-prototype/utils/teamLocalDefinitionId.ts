export type TeamLocalDefinitionSubject = 'agent' | 'agent_team'

const TEAM_LOCAL_AGENT_ID_PREFIX = 'team-local-agent:'
const TEAM_LOCAL_TEAM_ID_PREFIX = 'team-local-team:'

export type ParsedTeamLocalDefinitionId =
  | { subject: 'agent'; ownerTeamId: string; localDefinitionId: string }
  | { subject: 'agent_team'; ownerTeamId: string; localDefinitionId: string }

const normalizeRequiredPart = (value: string, fieldName: string): string => {
  const normalized = value.trim()
  if (!normalized) {
    throw new Error(`${fieldName} is required.`)
  }
  if (
    normalized === '.'
    || normalized === '..'
    || normalized.includes('/')
    || normalized.includes('\\')
  ) {
    throw new Error(`${fieldName} must be a safe local definition segment.`)
  }
  return normalized
}

const encodePart = (value: string, fieldName: string): string =>
  encodeURIComponent(normalizeRequiredPart(value, fieldName))

const decodePart = (value: string): string | null => {
  if (!value) {
    return null
  }
  try {
    const decoded = decodeURIComponent(value)
    const normalized = decoded.trim()
    if (
      !normalized
      || normalized === '.'
      || normalized === '..'
      || normalized.includes('/')
      || normalized.includes('\\')
    ) {
      return null
    }
    return normalized
  } catch {
    return null
  }
}

const buildTeamLocalDefinitionId = (
  prefix: string,
  ownerTeamId: string,
  localDefinitionId: string,
): string => `${prefix}${encodePart(ownerTeamId, 'ownerTeamId')}:${encodePart(localDefinitionId, 'localDefinitionId')}`

export const buildTeamLocalAgentDefinitionId = (
  ownerTeamId: string,
  localAgentId: string,
): string => buildTeamLocalDefinitionId(TEAM_LOCAL_AGENT_ID_PREFIX, ownerTeamId, localAgentId)

export const buildTeamLocalTeamDefinitionId = (
  ownerTeamId: string,
  localTeamId: string,
): string => buildTeamLocalDefinitionId(TEAM_LOCAL_TEAM_ID_PREFIX, ownerTeamId, localTeamId)

const parseWithPrefix = (
  value: string,
  prefix: string,
  subject: TeamLocalDefinitionSubject,
): ParsedTeamLocalDefinitionId | null => {
  if (!value.startsWith(prefix)) {
    return null
  }

  const payload = value.slice(prefix.length)
  const separatorIndex = payload.indexOf(':')
  if (separatorIndex <= 0 || separatorIndex === payload.length - 1) {
    return null
  }
  if (payload.indexOf(':', separatorIndex + 1) !== -1) {
    return null
  }

  const ownerTeamId = decodePart(payload.slice(0, separatorIndex))
  const localDefinitionId = decodePart(payload.slice(separatorIndex + 1))
  if (!ownerTeamId || !localDefinitionId) {
    return null
  }

  return subject === 'agent'
    ? { subject, ownerTeamId, localDefinitionId }
    : { subject, ownerTeamId, localDefinitionId }
}

export const parseTeamLocalDefinitionId = (
  value: string | null | undefined,
): ParsedTeamLocalDefinitionId | null => {
  const normalized = value?.trim() ?? ''
  if (!normalized) {
    return null
  }
  return parseWithPrefix(normalized, TEAM_LOCAL_AGENT_ID_PREFIX, 'agent')
    ?? parseWithPrefix(normalized, TEAM_LOCAL_TEAM_ID_PREFIX, 'agent_team')
}
