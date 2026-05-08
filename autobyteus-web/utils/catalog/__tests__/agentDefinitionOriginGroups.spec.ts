import { describe, expect, it } from 'vitest'
import type { AgentDefinition } from '~/stores/agentDefinitionStore'
import { buildAgentDefinitionOriginSections } from '../agentDefinitionOriginGroups'

const agent = (overrides: Partial<AgentDefinition> & Pick<AgentDefinition, 'id' | 'name'>): AgentDefinition => ({
  id: overrides.id,
  name: overrides.name,
  description: overrides.description ?? '',
  instructions: overrides.instructions ?? '',
  toolNames: overrides.toolNames ?? [],
  inputProcessorNames: overrides.inputProcessorNames ?? [],
  llmResponseProcessorNames: overrides.llmResponseProcessorNames ?? [],
  systemPromptProcessorNames: overrides.systemPromptProcessorNames ?? [],
  toolExecutionResultProcessorNames: overrides.toolExecutionResultProcessorNames ?? [],
  toolInvocationPreprocessorNames: overrides.toolInvocationPreprocessorNames ?? [],
  lifecycleProcessorNames: overrides.lifecycleProcessorNames ?? [],
  skillNames: overrides.skillNames ?? [],
  ownershipScope: overrides.ownershipScope ?? 'SHARED',
  ownerTeamId: overrides.ownerTeamId,
  ownerTeamName: overrides.ownerTeamName,
  ownerApplicationId: overrides.ownerApplicationId,
  ownerApplicationName: overrides.ownerApplicationName,
  ownerPackageId: overrides.ownerPackageId,
  ownerLocalApplicationId: overrides.ownerLocalApplicationId,
  defaultLaunchConfig: overrides.defaultLaunchConfig ?? null,
})

describe('agentDefinitionOriginGroups', () => {
  it('groups team-local agents by owner team and includes application-team context', () => {
    const sections = buildAgentDefinitionOriginSections([
      agent({
        id: 'source-collector',
        name: 'Source Collector',
        ownershipScope: 'TEAM_LOCAL',
        ownerTeamId: 'team-literature-review',
        ownerTeamName: 'Literature Review Team',
        ownerApplicationId: 'app-research-workspace',
        ownerApplicationName: 'Research Workspace',
      }),
      agent({
        id: 'synthesis-agent',
        name: 'Synthesis Agent',
        ownershipScope: 'TEAM_LOCAL',
        ownerTeamId: 'team-literature-review',
        ownerTeamName: 'Literature Review Team',
        ownerApplicationId: 'app-research-workspace',
        ownerApplicationName: 'Research Workspace',
      }),
    ])

    expect(sections.teamLocalGroups).toHaveLength(1)
    expect(sections.teamLocalGroups[0]).toMatchObject({
      key: 'team-literature-review',
      label: 'Research Workspace / Literature Review Team',
      applicationTeam: true,
      count: 2,
    })
    expect(sections.teamLocalGroups[0].agentDefinitions.map((definition) => definition.id)).toEqual([
      'source-collector',
      'synthesis-agent',
    ])
  })

  it('groups directly application-owned agents by application identity', () => {
    const sections = buildAgentDefinitionOriginSections([
      agent({
        id: 'citation-helper',
        name: 'Citation Helper',
        ownershipScope: 'APPLICATION_OWNED',
        ownerApplicationId: 'app-research-workspace',
        ownerApplicationName: 'Research Workspace',
      }),
      agent({
        id: 'research-assistant',
        name: 'Research Assistant',
        ownershipScope: 'APPLICATION_OWNED',
        ownerApplicationId: 'app-research-workspace',
        ownerApplicationName: 'Research Workspace',
      }),
    ])

    expect(sections.applicationGroups).toHaveLength(1)
    expect(sections.applicationGroups[0]).toMatchObject({
      key: 'app-research-workspace',
      label: 'Research Workspace',
      count: 2,
    })
    expect(sections.applicationGroups[0].agentDefinitions.map((definition) => definition.id)).toEqual([
      'citation-helper',
      'research-assistant',
    ])
  })

  it('normalizes missing and unknown ownership scopes into shared agents', () => {
    const sections = buildAgentDefinitionOriginSections([
      agent({ id: 'zeta', name: 'Zeta Agent', ownershipScope: null }),
      agent({ id: 'alpha', name: 'Alpha Agent', ownershipScope: 'UNEXPECTED' as any }),
    ])

    expect(sections.teamLocalGroups).toEqual([])
    expect(sections.applicationGroups).toEqual([])
    expect(sections.sharedAgentDefinitions.map((definition) => definition.id)).toEqual(['alpha', 'zeta'])
  })

  it('uses stable fallback labels for missing owner names and ids', () => {
    const sections = buildAgentDefinitionOriginSections([
      agent({
        id: 'team-agent',
        name: 'Team Agent',
        ownershipScope: 'TEAM_LOCAL',
      }),
      agent({
        id: 'application-agent',
        name: 'Application Agent',
        ownershipScope: 'APPLICATION_OWNED',
      }),
    ])

    expect(sections.teamLocalGroups[0]).toMatchObject({
      key: 'unknown-application:unknown-team',
      label: 'Unknown team',
      count: 1,
    })
    expect(sections.applicationGroups[0]).toMatchObject({
      key: 'unknown-application',
      label: 'Application bundle',
      count: 1,
    })
  })

  it('sorts groups by label and agents by display name then id', () => {
    const sections = buildAgentDefinitionOriginSections([
      agent({ id: 'agent-b', name: 'Same Name', ownershipScope: 'TEAM_LOCAL', ownerTeamId: 'team-z', ownerTeamName: 'Zeta Team' }),
      agent({ id: 'agent-a', name: 'Same Name', ownershipScope: 'TEAM_LOCAL', ownerTeamId: 'team-z', ownerTeamName: 'Zeta Team' }),
      agent({ id: 'alpha-team-agent', name: 'Alpha Member', ownershipScope: 'TEAM_LOCAL', ownerTeamId: 'team-a', ownerTeamName: 'Alpha Team' }),
      agent({ id: 'shared-b', name: 'Beta Shared' }),
      agent({ id: 'shared-a', name: 'Alpha Shared' }),
    ])

    expect(sections.teamLocalGroups.map((group) => group.key)).toEqual(['team-a', 'team-z'])
    expect(sections.teamLocalGroups[1].agentDefinitions.map((definition) => definition.id)).toEqual(['agent-a', 'agent-b'])
    expect(sections.sharedAgentDefinitions.map((definition) => definition.id)).toEqual(['shared-a', 'shared-b'])
  })
})
