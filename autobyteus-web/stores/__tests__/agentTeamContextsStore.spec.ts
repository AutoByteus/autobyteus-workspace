import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore'
import { useAgentSelectionStore } from '~/stores/agentSelectionStore'
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore'
import { useTeamWorkspaceViewStore } from '~/stores/teamWorkspaceViewStore'
import { indexTeamMemberNodesByRouteKey } from '~/utils/teamDefinitionMembers'

const {
  ensureHistoricalTeamMemberHydratedMock,
  ensureHistoricalTeamMembersHydratedMock,
} = vi.hoisted(() => ({
  ensureHistoricalTeamMemberHydratedMock: vi.fn().mockResolvedValue(undefined),
  ensureHistoricalTeamMembersHydratedMock: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('~/services/runHydration/teamRunContextHydrationService', () => ({
  ensureHistoricalTeamMemberHydrated: ensureHistoricalTeamMemberHydratedMock,
  ensureHistoricalTeamMembersHydrated: ensureHistoricalTeamMembersHydratedMock,
}))

vi.mock('~/stores/agentTeamDefinitionStore', () => ({
  useAgentTeamDefinitionStore: () => ({
    getAgentTeamDefinitionById: (id: string) => {
      if (id === 'team-def-1') return {
        id: 'team-def-1',
        name: 'Test Team',
        coordinatorMemberName: 'agent-1',
        nodes: [
          { memberName: 'agent-1', refType: 'AGENT', ref: 'def-1' },
          { memberName: 'agent-2', refType: 'AGENT', ref: 'def-2' },
        ],
      }
      if (id === 'team-def-nested') return {
        id: 'team-def-nested',
        name: 'Nested Team',
        coordinatorMemberName: 'nested-group',
        nodes: [
          { memberName: 'nested-group', refType: 'AGENT_TEAM', ref: 'sub-team-1' },
        ],
      }
      if (id === 'sub-team-1') return {
        id: 'sub-team-1',
        name: 'Sub Team',
        coordinatorMemberName: 'leaf-a',
        nodes: [
          { memberName: 'leaf-a', refType: 'AGENT', ref: 'def-1' },
          { memberName: 'leaf-b', refType: 'AGENT', ref: 'def-2' },
        ],
      }
      return null
    },
  }),
}))

vi.mock('~/stores/agentDefinitionStore', () => ({
  useAgentDefinitionStore: () => ({
    getAgentDefinitionById: (id: string) => ({ id, name: 'Agent ' + id }),
  }),
}))

const buildAgentNode = (memberRouteKey: string) => ({
  memberKind: 'agent',
  memberName: memberRouteKey.split('/').at(-1) || memberRouteKey,
  displayName: memberRouteKey.split('/').at(-1) || memberRouteKey,
  memberPath: memberRouteKey.split('/'),
  memberRouteKey,
  agentDefinitionId: `${memberRouteKey}-def`,
})

const buildMemberContext = (overrides: Record<string, unknown> = {}) => ({
  config: {},
  state: {
    runId: '',
    conversation: { id: '', messages: [], updatedAt: '', createdAt: '' },
    compactionStatus: null,
  },
  requirement: '',
  contextFilePaths: [],
  ...overrides,
})

const buildTeamContext = (params: {
  teamRunId: string
  memberRouteKeys: string[]
  focusedMemberRouteKey: string
  historicalHydration?: Record<string, unknown> | null
  memberContexts?: Record<string, Record<string, unknown>>
}) => {
  const memberTree = params.memberRouteKeys.map(buildAgentNode)
  const leafAgentContextsByRouteKey = new Map(
    params.memberRouteKeys.map((memberRouteKey) => [
      memberRouteKey,
      buildMemberContext(params.memberContexts?.[memberRouteKey]) as any,
    ]),
  )

  return {
    teamRunId: params.teamRunId,
    config: {} as any,
    memberTree: memberTree as any,
    memberNodesByRouteKey: indexTeamMemberNodesByRouteKey(memberTree as any),
    leafAgentContextsByRouteKey,
    coordinatorMemberRouteKey: params.memberRouteKeys[0],
    historicalHydration: params.historicalHydration ?? null,
    focusedMemberRouteKey: params.focusedMemberRouteKey,
    currentStatus: 'idle' as any,
    isSubscribed: false,
    taskPlan: null,
    taskStatuses: null,
  }
}

describe('agentTeamContextsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('createRunFromTemplate', () => {
    it('creates a team context with mixed member runtimes from overrides', async () => {
      const store = useAgentTeamContextsStore()
      const selectionStore = useAgentSelectionStore()
      const runConfigStore = useTeamRunConfigStore()

      runConfigStore.setTemplate({
        id: 'team-def-1',
        name: 'Test Team',
        coordinatorMemberName: 'agent-1',
        nodes: [
          { memberName: 'agent-1', refType: 'AGENT', ref: 'def-1' },
          { memberName: 'agent-2', refType: 'AGENT', ref: 'def-2' },
        ],
      } as any)

      runConfigStore.updateConfig({
        workspaceId: 'ws-1',
        runtimeKind: 'autobyteus',
        llmModelIdentifier: 'gpt-5.4',
        llmConfig: { reasoning_effort: 'high' },
        autoExecuteTools: false,
        memberOverrides: {
          'agent-2': {
            agentDefinitionId: 'def-2',
            runtimeKind: 'claude_agent_sdk',
            llmModelIdentifier: 'claude-sonnet',
            llmConfig: { thinking_enabled: true },
          },
        },
      })
      runConfigStore.setRuntimeModelCatalog('autobyteus', ['gpt-5.4'])
      runConfigStore.setRuntimeModelCatalog('claude_agent_sdk', ['claude-sonnet'])

      await store.createRunFromTemplate()

      const [teamId] = Array.from(store.teams.keys())
      expect(teamId).toMatch(/^temp-team-/)

      const team = store.teams.get(teamId!)
      expect(team?.leafAgentContextsByRouteKey.size).toBe(2)

      const agent1 = team?.leafAgentContextsByRouteKey.get('agent-1')
      expect(agent1?.config.llmModelIdentifier).toBe('gpt-5.4')
      expect(agent1?.config.llmConfig).toEqual({ reasoning_effort: 'high' })
      expect(agent1?.config.runtimeKind).toBe('autobyteus')

      const agent2 = team?.leafAgentContextsByRouteKey.get('agent-2')
      expect(agent2?.config.llmModelIdentifier).toBe('claude-sonnet')
      expect(agent2?.config.llmConfig).toEqual({ thinking_enabled: true })
      expect(agent2?.config.runtimeKind).toBe('claude_agent_sdk')

      expect(selectionStore.selectedRunId).toBe(teamId)
      expect(selectionStore.selectedType).toBe('team')
    })

    it('keeps nested team topology while indexing leaf member contexts by route key', async () => {
      const store = useAgentTeamContextsStore()
      const runConfigStore = useTeamRunConfigStore()

      runConfigStore.setTemplate({
        id: 'team-def-nested',
        name: 'Nested Team',
        coordinatorMemberName: 'nested-group',
        nodes: [
          { memberName: 'nested-group', refType: 'AGENT_TEAM', ref: 'sub-team-1' },
        ],
      } as any)

      runConfigStore.updateConfig({
        workspaceId: 'ws-1',
        llmModelIdentifier: 'gpt-4',
        llmConfig: null,
        autoExecuteTools: false,
        memberOverrides: {},
      })
      runConfigStore.setRuntimeModelCatalog('autobyteus', ['gpt-4'])

      await store.createRunFromTemplate()

      const [teamId] = Array.from(store.teams.keys())
      const team = store.teams.get(teamId!)
      expect(team?.memberTree).toMatchObject([
        {
          memberKind: 'agent_team',
          memberName: 'nested-group',
          memberRouteKey: 'nested-group',
          children: [
            { memberKind: 'agent', memberName: 'leaf-a', memberRouteKey: 'nested-group/leaf-a' },
            { memberKind: 'agent', memberName: 'leaf-b', memberRouteKey: 'nested-group/leaf-b' },
          ],
        },
      ])
      expect(team?.leafAgentContextsByRouteKey.size).toBe(2)
      expect(team?.leafAgentContextsByRouteKey.has('nested-group/leaf-a')).toBe(true)
      expect(team?.leafAgentContextsByRouteKey.has('nested-group/leaf-b')).toBe(true)
      expect(team?.focusedMemberRouteKey).toBe('nested-group')
    })
  })

  describe('activeTeamContext', () => {
    it('returns null if no team selected', () => {
      const store = useAgentTeamContextsStore()
      expect(store.activeTeamContext).toBeNull()
    })

    it('returns context if team selected', async () => {
      const store = useAgentTeamContextsStore()
      const runConfigStore = useTeamRunConfigStore()
      runConfigStore.setTemplate({
        id: 'team-def-1',
        name: 'Test Team',
        coordinatorMemberName: 'agent-1',
        nodes: [
          { memberName: 'agent-1', refType: 'AGENT', ref: 'def-1' },
        ],
      } as any)
      runConfigStore.updateConfig({
        workspaceId: 'ws-1',
        llmModelIdentifier: 'gpt-4',
        llmConfig: null,
        autoExecuteTools: false,
        memberOverrides: {},
      })
      runConfigStore.setRuntimeModelCatalog('autobyteus', ['gpt-4'])

      await store.createRunFromTemplate()

      const [teamId] = Array.from(store.teams.keys())
      expect(store.activeTeamContext?.teamRunId).toBe(teamId)
    })
  })

  describe('setFocusedMember', () => {
    it('keeps unsent draft text and context files on the original member', () => {
      const store = useAgentTeamContextsStore()
      const selectionStore = useAgentSelectionStore()

      store.addTeamContext(buildTeamContext({
        teamRunId: 'team-1',
        memberRouteKeys: ['agent-1', 'agent-2'],
        focusedMemberRouteKey: 'agent-1',
        memberContexts: {
          'agent-1': {
            requirement: 'draft text',
            contextFilePaths: [{ kind: 'workspace_path', id: '/tmp/a.txt', locator: '/tmp/a.txt', displayName: 'a.txt', type: 'Text' }],
          },
        },
      }) as any)

      selectionStore.selectRun('team-1', 'team')
      store.setFocusedMember('agent-2')

      const team = store.activeTeamContext!
      expect(team.focusedMemberRouteKey).toBe('agent-2')
      expect(team.leafAgentContextsByRouteKey.get('agent-1')?.requirement).toBe('draft text')
      expect(team.leafAgentContextsByRouteKey.get('agent-2')?.requirement).toBe('')
    })
  })

  describe('focusMemberAndEnsureHydrated', () => {
    it('focuses the requested member and triggers lazy historical hydration', async () => {
      const store = useAgentTeamContextsStore()
      const selectionStore = useAgentSelectionStore()

      store.addTeamContext(buildTeamContext({
        teamRunId: 'team-history-1',
        memberRouteKeys: ['member-a', 'member-b'],
        focusedMemberRouteKey: 'member-a',
        historicalHydration: {
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          memberMetadataByRouteKey: {} as any,
          memberProjectionLoadStateByRouteKey: {
            'member-a': 'loaded',
            'member-b': 'unloaded',
          },
        },
      }) as any)

      selectionStore.selectRun('team-history-1', 'team')

      await store.focusMemberAndEnsureHydrated('team-history-1', 'member-b')

      expect(store.activeTeamContext?.focusedMemberRouteKey).toBe('member-b')
      expect(ensureHistoricalTeamMemberHydratedMock).toHaveBeenCalledWith({
        teamContext: expect.objectContaining({ teamRunId: 'team-history-1' }),
        memberRouteKey: 'member-b',
      })
    })
  })

  describe('ensureHistoricalMembersHydratedForView', () => {
    it('hydrates all missing members when a historical team enters a broader mode', async () => {
      const store = useAgentTeamContextsStore()
      const workspaceViewStore = useTeamWorkspaceViewStore()

      store.addTeamContext(buildTeamContext({
        teamRunId: 'team-history-2',
        memberRouteKeys: ['member-a', 'member-b'],
        focusedMemberRouteKey: 'member-a',
        historicalHydration: {
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          memberMetadataByRouteKey: {} as any,
          memberProjectionLoadStateByRouteKey: {
            'member-a': 'loaded',
            'member-b': 'unloaded',
          },
        },
      }) as any)

      workspaceViewStore.setMode('team-history-2', 'grid')
      await store.ensureHistoricalMembersHydratedForView('team-history-2', 'grid')

      expect(ensureHistoricalTeamMembersHydratedMock).toHaveBeenCalledWith({
        teamContext: expect.objectContaining({ teamRunId: 'team-history-2' }),
        memberRouteKeys: ['member-a', 'member-b'],
      })
    })
  })
})
