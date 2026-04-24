import { describe, expect, it, vi } from 'vitest'
import type {
  ApplicationResourceSlotDeclaration,
  ApplicationRuntimeResourceRef,
} from '@autobyteus/application-sdk-contracts'
import { ApplicationResourceConfigurationService } from '../../../src/application-orchestration/services/application-resource-configuration-service.js'

const applicationId = 'app-1'

const buildSlot = (
  overrides: Partial<ApplicationResourceSlotDeclaration> = {},
): ApplicationResourceSlotDeclaration => ({
  slotKey: 'draftingTeam',
  name: 'Drafting Team',
  allowedResourceKinds: ['AGENT_TEAM'],
  allowedResourceOwners: ['bundle', 'shared'],
  required: true,
  supportedLaunchConfig: {
    AGENT_TEAM: {
      runtimeKind: true,
      llmModelIdentifier: true,
      workspaceRootPath: true,
      memberOverrides: {
        runtimeKind: true,
        llmModelIdentifier: true,
      },
    },
  },
  defaultResourceRef: {
    owner: 'bundle',
    kind: 'AGENT_TEAM',
    localId: 'brief-studio-team',
  },
  ...overrides,
})

const currentTeamMembers = [
  {
    memberRouteKey: 'researcher',
    memberName: 'researcher',
    agentDefinitionId: 'bundle-agent__researcher',
  },
  {
    memberRouteKey: 'writer',
    memberName: 'writer',
    agentDefinitionId: 'bundle-agent__writer',
  },
]

const resolveTeamResource = (resourceRef: ApplicationRuntimeResourceRef) => ({
  name: 'Resolved Team',
  applicationId: resourceRef.owner === 'bundle' ? applicationId : null,
  owner: resourceRef.owner,
  kind: resourceRef.kind,
  localId: resourceRef.owner === 'bundle' ? resourceRef.localId : null,
  definitionId: resourceRef.owner === 'shared' ? resourceRef.definitionId : 'brief-studio-team',
})

const buildService = (overrides: {
  slot?: ApplicationResourceSlotDeclaration
  resolveResource?: (resourceRef: ApplicationRuntimeResourceRef) => unknown | Promise<unknown>
  listConfigurations?: unknown[]
  getConfiguration?: unknown
  upsertConfiguration?: (record: unknown) => unknown | Promise<unknown>
  currentTeamMembers?: unknown[]
} = {}) => {
  const slot = overrides.slot ?? buildSlot()

  return new ApplicationResourceConfigurationService({
    applicationBundleService: {
      getApplicationById: vi.fn(async () => ({
        id: applicationId,
        resourceSlots: [slot],
      })),
    } as never,
    resourceResolver: {
      resolveResource: vi.fn(async (_applicationId: string, resourceRef: ApplicationRuntimeResourceRef) => {
        if (overrides.resolveResource) {
          return await overrides.resolveResource(resourceRef)
        }
        return resolveTeamResource(resourceRef)
      }),
    } as never,
    configurationStore: {
      listConfigurations: vi.fn(async () => overrides.listConfigurations ?? []),
      getConfiguration: vi.fn(async () => overrides.getConfiguration ?? null),
      upsertConfiguration: vi.fn(async (_applicationId: string, record: unknown) => (
        overrides.upsertConfiguration ? await overrides.upsertConfiguration(record) : record
      )),
      removeConfiguration: vi.fn(async () => undefined),
    } as never,
    teamDefinitionTraversalService: {
      collectLeafAgentMembers: vi.fn(async () => overrides.currentTeamMembers ?? currentTeamMembers),
    } as never,
  })
}

describe('ApplicationResourceConfigurationService', () => {
  it('returns a READY view and configured resource for a manifest default selection with no persisted row', async () => {
    const service = buildService()

    await expect(service.listConfigurations(applicationId)).resolves.toEqual([
      {
        slot: expect.objectContaining({ slotKey: 'draftingTeam' }),
        status: 'READY',
        configuration: {
          slotKey: 'draftingTeam',
          resourceRef: {
            owner: 'bundle',
            kind: 'AGENT_TEAM',
            localId: 'brief-studio-team',
          },
          launchProfile: null,
        },
        invalidSavedConfiguration: null,
        issue: null,
        updatedAt: null,
      },
    ])

    await expect(service.getConfiguredResource(applicationId, 'draftingTeam')).resolves.toEqual({
      slotKey: 'draftingTeam',
      resourceRef: {
        owner: 'bundle',
        kind: 'AGENT_TEAM',
        localId: 'brief-studio-team',
      },
      launchProfile: null,
    })
  })

  it('persists a team launchProfile while validating the effective resource selection', async () => {
    const savedConfigurations: unknown[] = []
    const service = buildService({
      upsertConfiguration: async (record) => {
        savedConfigurations.push(record)
        return record
      },
    })

    const view = await service.upsertConfiguration(applicationId, 'draftingTeam', {
      resourceRef: {
        owner: 'shared',
        kind: 'AGENT_TEAM',
        definitionId: 'shared-writing-team',
      },
      launchProfile: {
        kind: 'AGENT_TEAM',
        defaults: {
          llmModelIdentifier: 'qwen3.5',
          runtimeKind: 'lmstudio',
          workspaceRootPath: '/tmp/briefs',
        },
        memberProfiles: [
          {
            memberRouteKey: 'researcher',
            memberName: 'researcher',
            agentDefinitionId: 'bundle-agent__researcher',
          },
          {
            memberRouteKey: 'writer',
            memberName: 'writer',
            agentDefinitionId: 'bundle-agent__writer',
            runtimeKind: 'lmstudio',
            llmModelIdentifier: 'qwen3.5',
          },
        ],
      },
    })

    expect(view).toMatchObject({
      status: 'READY',
      configuration: {
        slotKey: 'draftingTeam',
        resourceRef: {
          owner: 'shared',
          kind: 'AGENT_TEAM',
          definitionId: 'shared-writing-team',
        },
        launchProfile: {
          kind: 'AGENT_TEAM',
          defaults: {
            llmModelIdentifier: 'qwen3.5',
            runtimeKind: 'lmstudio',
            workspaceRootPath: '/tmp/briefs',
          },
          memberProfiles: [
            {
              memberRouteKey: 'researcher',
              memberName: 'researcher',
              agentDefinitionId: 'bundle-agent__researcher',
            },
            {
              memberRouteKey: 'writer',
              memberName: 'writer',
              agentDefinitionId: 'bundle-agent__writer',
              runtimeKind: 'lmstudio',
              llmModelIdentifier: 'qwen3.5',
            },
          ],
        },
      },
    })
    expect(savedConfigurations).toHaveLength(1)
    expect(savedConfigurations[0]).toMatchObject({
      resourceRef: {
        owner: 'shared',
        kind: 'AGENT_TEAM',
        definitionId: 'shared-writing-team',
      },
      launchProfile: {
        kind: 'AGENT_TEAM',
        defaults: {
          llmModelIdentifier: 'qwen3.5',
          runtimeKind: 'lmstudio',
          workspaceRootPath: '/tmp/briefs',
        },
      },
      legacyLaunchDefaults: null,
    })
  })

  it('rejects team saves when a member still lacks an effective llmModelIdentifier after inheritance is applied', async () => {
    const savedConfigurations: unknown[] = []
    const service = buildService({
      upsertConfiguration: async (record) => {
        savedConfigurations.push(record)
        return record
      },
    })

    await expect(service.upsertConfiguration(applicationId, 'draftingTeam', {
      resourceRef: {
        owner: 'shared',
        kind: 'AGENT_TEAM',
        definitionId: 'shared-writing-team',
      },
      launchProfile: {
        kind: 'AGENT_TEAM',
        defaults: null,
        memberProfiles: [
          {
            memberRouteKey: 'researcher',
            memberName: 'researcher',
            agentDefinitionId: 'bundle-agent__researcher',
            runtimeKind: 'autobyteus',
            llmModelIdentifier: 'openai/gpt-5',
          },
          {
            memberRouteKey: 'writer',
            memberName: 'writer',
            agentDefinitionId: 'bundle-agent__writer',
            runtimeKind: 'lmstudio',
          },
        ],
      },
    })).rejects.toThrow(
      "Application resource slot 'draftingTeam' requires an effective llmModelIdentifier for team member 'writer'.",
    )

    expect(savedConfigurations).toHaveLength(0)
  })

  it('migrates a legacy flat launch-default row into the new launchProfile contract', async () => {
    const persisted = {
      slotKey: 'draftingTeam',
      resourceRef: {
        owner: 'bundle',
        kind: 'AGENT_TEAM',
        localId: 'brief-studio-team',
      },
      launchProfile: null,
      legacyLaunchDefaults: {
        runtimeKind: 'lmstudio',
        llmModelIdentifier: 'qwen3.5',
        workspaceRootPath: '/tmp/briefs',
      },
      updatedAt: '2026-04-20T12:00:00.000Z',
    }
    const migratedRows: unknown[] = []
    const service = buildService({
      listConfigurations: [persisted],
      upsertConfiguration: async (record) => {
        migratedRows.push(record)
        return record
      },
    })

    const [view] = await service.listConfigurations(applicationId)

    expect(migratedRows).toHaveLength(1)
    expect(migratedRows[0]).toMatchObject({
      slotKey: 'draftingTeam',
      launchProfile: {
        kind: 'AGENT_TEAM',
        defaults: {
          runtimeKind: 'lmstudio',
          llmModelIdentifier: 'qwen3.5',
          workspaceRootPath: '/tmp/briefs',
        },
        memberProfiles: currentTeamMembers,
      },
      legacyLaunchDefaults: null,
    })
    expect(view).toMatchObject({
      status: 'READY',
      configuration: {
        slotKey: 'draftingTeam',
        launchProfile: {
          kind: 'AGENT_TEAM',
          defaults: {
            runtimeKind: 'lmstudio',
            llmModelIdentifier: 'qwen3.5',
            workspaceRootPath: '/tmp/briefs',
          },
          memberProfiles: currentTeamMembers,
        },
      },
      invalidSavedConfiguration: null,
      issue: null,
      updatedAt: '2026-04-20T12:00:00.000Z',
    })
  })

  it('returns a recoverable INVALID_SAVED_CONFIGURATION view when the saved team topology drifted', async () => {
    const persisted = {
      slotKey: 'draftingTeam',
      resourceRef: {
        owner: 'bundle',
        kind: 'AGENT_TEAM',
        localId: 'brief-studio-team',
      },
      launchProfile: {
        kind: 'AGENT_TEAM',
        defaults: {
          runtimeKind: 'lmstudio',
          llmModelIdentifier: 'qwen3.5',
        },
        memberProfiles: [
          {
            memberRouteKey: 'researcher',
            memberName: 'researcher',
            agentDefinitionId: 'bundle-agent__researcher-old',
            runtimeKind: 'lmstudio',
          },
          {
            memberRouteKey: 'editor',
            memberName: 'editor',
            agentDefinitionId: 'bundle-agent__editor',
          },
        ],
      },
      legacyLaunchDefaults: null,
      updatedAt: '2026-04-20T12:00:00.000Z',
    }
    const service = buildService({
      listConfigurations: [persisted],
      getConfiguration: persisted,
    })

    const [view] = await service.listConfigurations(applicationId)

    expect(view).toMatchObject({
      status: 'INVALID_SAVED_CONFIGURATION',
      configuration: null,
      invalidSavedConfiguration: {
        slotKey: 'draftingTeam',
        resourceRef: {
          owner: 'bundle',
          kind: 'AGENT_TEAM',
          localId: 'brief-studio-team',
        },
      },
      issue: {
        severity: 'blocking',
        code: 'TEAM_TOPOLOGY_CHANGED',
      },
    })
    expect(view.issue?.staleMembers).toEqual([
      {
        memberRouteKey: 'researcher',
        memberName: 'researcher',
        agentDefinitionId: 'bundle-agent__researcher-old',
        reason: 'AGENT_CHANGED',
        currentAgentDefinitionId: 'bundle-agent__researcher',
      },
      {
        memberRouteKey: 'editor',
        memberName: 'editor',
        agentDefinitionId: 'bundle-agent__editor',
        reason: 'MISSING_FROM_TEAM',
      },
    ])

    await expect(service.getConfiguredResource(applicationId, 'draftingTeam')).resolves.toBeNull()
  })

  it('returns a slot-local NOT_CONFIGURED issue when a manifest default resource is stale', async () => {
    const service = buildService({
      slot: buildSlot({
        defaultResourceRef: {
          owner: 'shared',
          kind: 'AGENT_TEAM',
          definitionId: 'missing-shared-team',
        },
      }),
      resolveResource: async () => {
        throw new Error(`Application runtime resource could not be resolved for application '${applicationId}'.`)
      },
    })

    await expect(service.listConfigurations(applicationId)).resolves.toEqual([
      {
        slot: expect.objectContaining({ slotKey: 'draftingTeam' }),
        status: 'NOT_CONFIGURED',
        configuration: null,
        invalidSavedConfiguration: null,
        issue: {
          severity: 'blocking',
          code: 'INVALID_RESOURCE_SELECTION',
          message: expect.stringContaining('default runtime resource is no longer valid'),
        },
        updatedAt: null,
      },
    ])
  })
})
