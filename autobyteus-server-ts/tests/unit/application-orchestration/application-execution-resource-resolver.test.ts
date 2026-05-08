import { describe, expect, it, vi } from 'vitest'
import { ApplicationExecutionResourceResolver } from '../../../src/application-orchestration/services/application-execution-resource-resolver.js'

describe('ApplicationExecutionResourceResolver', () => {
  it('uses deterministic friendly-name fallbacks for bundled and shared resources', async () => {
    const resolver = new ApplicationExecutionResourceResolver({
      applicationBundleService: {
        getApplicationById: vi.fn(async () => ({
          id: 'app-1',
          bundleResources: [
            {
              source: 'bundle',
              kind: 'AGENT',
              localId: 'bundle-agent-local',
              definitionId: 'bundle-agent-definition',
            },
            {
              source: 'bundle',
              kind: 'AGENT_TEAM',
              localId: 'bundle-team-local',
              definitionId: 'bundle-team-definition',
            },
          ],
        })),
      } as never,
      agentDefinitionService: {
        getAgentDefinitionById: vi.fn(async () => null),
        getVisibleAgentDefinitions: vi.fn(async () => ([
          {
            id: 'shared-agent-definition',
            name: '   ',
            ownershipScope: 'shared',
          },
        ])),
      } as never,
      agentTeamDefinitionService: {
        getDefinitionById: vi.fn(async () => ({
          id: 'bundle-team-definition',
          name: 'Friendly Bundled Team',
        })),
        getAllDefinitions: vi.fn(async () => ([
          {
            id: 'shared-team-definition',
            name: '',
            ownershipScope: 'shared',
          },
        ])),
      } as never,
    })

    const resources = await resolver.listAvailableExecutionResources('app-1')

    expect(resources).toEqual([
      {
        source: 'bundle',
        kind: 'AGENT',
        localId: 'bundle-agent-local',
        definitionId: 'bundle-agent-definition',
        name: 'bundle-agent-local',
        applicationId: 'app-1',
      },
      {
        source: 'bundle',
        kind: 'AGENT_TEAM',
        localId: 'bundle-team-local',
        definitionId: 'bundle-team-definition',
        name: 'Friendly Bundled Team',
        applicationId: 'app-1',
      },
      {
        source: 'shared',
        kind: 'AGENT',
        localId: null,
        definitionId: 'shared-agent-definition',
        name: 'shared-agent-definition',
        applicationId: null,
      },
      {
        source: 'shared',
        kind: 'AGENT_TEAM',
        localId: null,
        definitionId: 'shared-team-definition',
        name: 'shared-team-definition',
        applicationId: null,
      },
    ])
  })
})
