import { describe, expect, it, vi } from 'vitest'
import { ApplicationRuntimeResourceResolver } from '../../../src/application-orchestration/services/application-runtime-resource-resolver.js'

describe('ApplicationRuntimeResourceResolver', () => {
  it('uses deterministic friendly-name fallbacks for bundled and shared resources', async () => {
    const resolver = new ApplicationRuntimeResourceResolver({
      applicationBundleService: {
        getApplicationById: vi.fn(async () => ({
          id: 'app-1',
          bundleResources: [
            {
              owner: 'bundle',
              kind: 'AGENT',
              localId: 'bundle-agent-local',
              definitionId: 'bundle-agent-definition',
            },
            {
              owner: 'bundle',
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

    const resources = await resolver.listAvailableResources('app-1')

    expect(resources).toEqual([
      {
        owner: 'bundle',
        kind: 'AGENT',
        localId: 'bundle-agent-local',
        definitionId: 'bundle-agent-definition',
        name: 'bundle-agent-local',
        applicationId: 'app-1',
      },
      {
        owner: 'bundle',
        kind: 'AGENT_TEAM',
        localId: 'bundle-team-local',
        definitionId: 'bundle-team-definition',
        name: 'Friendly Bundled Team',
        applicationId: 'app-1',
      },
      {
        owner: 'shared',
        kind: 'AGENT',
        localId: null,
        definitionId: 'shared-agent-definition',
        name: 'shared-agent-definition',
        applicationId: null,
      },
      {
        owner: 'shared',
        kind: 'AGENT_TEAM',
        localId: null,
        definitionId: 'shared-team-definition',
        name: 'shared-team-definition',
        applicationId: null,
      },
    ])
  })
})
