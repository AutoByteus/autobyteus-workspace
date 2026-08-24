import type { AgentDefinition } from '~/stores/agentDefinitionStore'
import {
  formatApplicationOwnershipName,
  normalizeDefinitionOwnershipScope,
} from '~/utils/definitionOwnership'

export interface AgentDefinitionOriginGroup {
  key: string
  label: string
  count: number
  applicationTeam: boolean
  agentDefinitions: AgentDefinition[]
}

export interface AgentDefinitionOriginSections {
  teamLocalGroups: AgentDefinitionOriginGroup[]
  applicationGroups: AgentDefinitionOriginGroup[]
  sharedAgentDefinitions: AgentDefinition[]
}

type MutableOriginGroup = Omit<AgentDefinitionOriginGroup, 'count' | 'agentDefinitions'> & {
  agentDefinitions: AgentDefinition[]
}

const trimValue = (value: string | null | undefined): string => value?.trim() ?? ''

const normalizeSortValue = (value: string): string => value.trim().toLocaleLowerCase()

const compareDefinitions = (left: AgentDefinition, right: AgentDefinition): number => {
  const leftName = normalizeSortValue(left.name || '')
  const rightName = normalizeSortValue(right.name || '')
  if (leftName !== rightName) {
    return leftName.localeCompare(rightName)
  }
  return normalizeSortValue(left.id).localeCompare(normalizeSortValue(right.id))
}

const sortDefinitions = (definitions: AgentDefinition[]): AgentDefinition[] => (
  [...definitions].sort(compareDefinitions)
)

const compareGroups = (left: AgentDefinitionOriginGroup, right: AgentDefinitionOriginGroup): number => {
  const leftLabel = normalizeSortValue(left.label)
  const rightLabel = normalizeSortValue(right.label)
  if (leftLabel !== rightLabel) {
    return leftLabel.localeCompare(rightLabel)
  }
  return normalizeSortValue(left.key).localeCompare(normalizeSortValue(right.key))
}

const hasApplicationProvenance = (definition: AgentDefinition): boolean => Boolean(
  trimValue(definition.ownerApplicationName)
  || trimValue(definition.ownerLocalApplicationId)
  || trimValue(definition.ownerApplicationId)
  || trimValue(definition.ownerPackageId),
)

const applicationGroupKey = (definition: AgentDefinition): string => (
  trimValue(definition.ownerApplicationId)
  || trimValue(definition.ownerLocalApplicationId)
  || trimValue(definition.ownerPackageId)
  || trimValue(definition.ownerApplicationName)
  || 'unknown-application'
)

const applicationGroupLabel = (definition: AgentDefinition): string => formatApplicationOwnershipName(definition)

const teamGroupKey = (definition: AgentDefinition): string => (
  trimValue(definition.ownerTeamId)
  || trimValue(definition.ownerTeamName)
  || `${applicationGroupKey(definition)}:unknown-team`
)

const teamGroupLabel = (definition: AgentDefinition): string => {
  const teamLabel = trimValue(definition.ownerTeamName)
    || trimValue(definition.ownerTeamId)
    || 'Unknown team'

  if (!hasApplicationProvenance(definition)) {
    return teamLabel
  }

  return `${formatApplicationOwnershipName(definition)} / ${teamLabel}`
}

const addDefinitionToGroup = (
  groupsByKey: Map<string, MutableOriginGroup>,
  key: string,
  label: string,
  definition: AgentDefinition,
  applicationTeam = false,
): void => {
  const existingGroup = groupsByKey.get(key)
  if (existingGroup) {
    existingGroup.agentDefinitions.push(definition)
    return
  }

  groupsByKey.set(key, {
    key,
    label,
    applicationTeam,
    agentDefinitions: [definition],
  })
}

const finalizeGroups = (groupsByKey: Map<string, MutableOriginGroup>): AgentDefinitionOriginGroup[] => (
  Array.from(groupsByKey.values())
    .map((group) => {
      const agentDefinitions = sortDefinitions(group.agentDefinitions)
      return {
        ...group,
        count: agentDefinitions.length,
        agentDefinitions,
      }
    })
    .sort(compareGroups)
)

export const buildAgentDefinitionOriginSections = (
  regularDefinitions: AgentDefinition[],
): AgentDefinitionOriginSections => {
  const teamLocalGroupsByKey = new Map<string, MutableOriginGroup>()
  const applicationGroupsByKey = new Map<string, MutableOriginGroup>()
  const sharedAgentDefinitions: AgentDefinition[] = []

  for (const definition of regularDefinitions) {
    const ownershipScope = normalizeDefinitionOwnershipScope(definition)

    if (ownershipScope === 'TEAM_LOCAL') {
      addDefinitionToGroup(
        teamLocalGroupsByKey,
        teamGroupKey(definition),
        teamGroupLabel(definition),
        definition,
        hasApplicationProvenance(definition),
      )
      continue
    }

    if (ownershipScope === 'APPLICATION_OWNED') {
      addDefinitionToGroup(
        applicationGroupsByKey,
        applicationGroupKey(definition),
        applicationGroupLabel(definition),
        definition,
      )
      continue
    }

    sharedAgentDefinitions.push(definition)
  }

  return {
    teamLocalGroups: finalizeGroups(teamLocalGroupsByKey),
    applicationGroups: finalizeGroups(applicationGroupsByKey),
    sharedAgentDefinitions: sortDefinitions(sharedAgentDefinitions),
  }
}
