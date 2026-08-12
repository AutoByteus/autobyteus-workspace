import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAgentTeamRunStore } from '../agentTeamRunStore'
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore'
import { TeamStreamingService } from '~/services/agentStreaming'
import { AgentStatus } from '~/types/agent/AgentStatus'
import {
  createTeamExecutionAddress,
  type TeamExecutionAddress,
} from '~/types/agent/TeamExecutionAddress'
import {
  buildTestTeamContext,
  testAgentNode,
  testSubTeamNode,
} from '~/test-support/currentTeamTestFixtures'
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext'
import type { TeamLaunchDraft, TeamLaunchDraftId } from '~/types/agent/TeamLaunchDraft'

const {
  mockConnect,
  mockDisconnect,
  mockAttachContext,
  mockConnectionState,
  mockIsReady,
  mockSendMessage,
  mockApproveTool,
  mockDenyTool,
  mockInterruptGeneration,
  mockMutate,
  mockClearActivities,
  mockHydrateLiveTeamRunContext,
  teamContextsStoreMock,
  runHistoryStoreMock,
  contextFileUploadStoreMock,
  teamDefinitions,
  mockServiceOptions,
} = vi.hoisted(() => ({
  mockConnect: vi.fn(),
  mockDisconnect: vi.fn(),
  mockAttachContext: vi.fn(),
  mockConnectionState: { value: 'connected' as 'connected' | 'disconnected' | 'connecting' | 'reconnecting' },
  mockIsReady: { value: true },
  mockSendMessage: vi.fn(),
  mockApproveTool: vi.fn(),
  mockDenyTool: vi.fn(),
  mockInterruptGeneration: vi.fn(),
  mockMutate: vi.fn(),
  mockClearActivities: vi.fn(),
  mockHydrateLiveTeamRunContext: vi.fn(),
  teamContextsStoreMock: {
    activeTeamContext: null as AgentTeamContext | null,
    getTeamContextById: vi.fn(),
    addTeamContext: vi.fn(),
  },
  runHistoryStoreMock: {
    markTeamAsActive: vi.fn(),
    markTeamAsInactive: vi.fn(),
    refreshTreeQuietly: vi.fn().mockResolvedValue(undefined),
    applyRunNavigationEffect: vi.fn(),
  },
  contextFileUploadStoreMock: {
    finalizeDraftAttachments: vi.fn(async ({ attachments }: { attachments: unknown[] }) => attachments),
  },
  teamDefinitions: new Map<string, unknown>(),
  mockServiceOptions: { value: null as unknown },
}))

vi.mock('~/services/agentStreaming', () => ({
  ConnectionState: {
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    RECONNECTING: 'reconnecting',
  },
  TeamStreamingService: vi.fn().mockImplementation((_endpoint, options) => {
    mockServiceOptions.value = options
    return {
      get connectionState() { return mockConnectionState.value },
      get isReady() { return mockIsReady.value },
      connect: mockConnect,
      disconnect: mockDisconnect,
      attachContext: mockAttachContext,
      sendMessage: mockSendMessage,
      approveTool: mockApproveTool,
      denyTool: mockDenyTool,
      interruptGeneration: mockInterruptGeneration,
    }
  }),
}))

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => ({ getBoundEndpoints: () => ({ teamWs: 'ws://node-a.example/ws/agent-team' }) }),
}))

vi.mock('~/stores/agentTeamContextsStore', () => ({
  useAgentTeamContextsStore: () => teamContextsStoreMock,
}))

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: () => ({ mutate: mockMutate }),
}))

vi.mock('~/stores/agentActivityStore', () => ({
  useAgentActivityStore: () => ({
    clearActivities: mockClearActivities,
    getCompactionActivities: vi.fn(() => []),
  }),
}))

vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => runHistoryStoreMock }))
vi.mock('~/stores/contextFileUploadStore', () => ({ useContextFileUploadStore: () => contextFileUploadStoreMock }))

vi.mock('~/services/runHydration/teamRunContextHydrationService', () => ({
  hydrateLiveTeamRunContext: mockHydrateLiveTeamRunContext,
}))

vi.mock('~/stores/runHistoryLoadActions', () => ({
  ensureRunHistoryWorkspaceByRootPath: vi.fn(),
  resolveRunHistoryWorkspaceMetadataByRootPath: vi.fn(),
}))

vi.mock('~/stores/agentTeamDefinitionStore', () => ({
  useAgentTeamDefinitionStore: () => ({
    getAgentTeamDefinitionById: (id: string) => teamDefinitions.get(id) ?? null,
  }),
}))

const execution = (
  rootTeamRunId: string,
  memberAddress: string,
  taskTeamRunIds: string[] = [],
  taskAgentRunId: string | null = null,
): TeamExecutionAddress => createTeamExecutionAddress({ rootTeamRunId, memberAddress, taskTeamRunIds, taskAgentRunId })

const setActiveTeam = (team: AgentTeamContext): void => {
  teamContextsStoreMock.activeTeamContext = team
  teamContextsStoreMock.getTeamContextById.mockImplementation((rootTeamRunId: string) =>
    rootTeamRunId === team.executions.getRootTeamRunId() ? team : undefined)
}

const twoMemberTeam = (input: {
  teamRunId?: string
  focusedMemberAddress?: string
  isActive?: boolean
} = {}): AgentTeamContext => {
  const teamRunId = input.teamRunId ?? 'team-1'
  return buildTestTeamContext({
    teamRunId,
    coordinatorAddress: '/coordinator',
    rootChildren: [
      testAgentNode('/coordinator', {
        displayName: 'Coordinator',
        agentRunId: `${teamRunId}-coordinator-run`,
        currentStatus: AgentStatus.Running,
      }),
      testAgentNode('/worker', {
        displayName: 'Worker',
        agentRunId: `${teamRunId}-worker-run`,
        currentStatus: AgentStatus.Idle,
      }),
    ],
    focusedExecutionAddress: execution(teamRunId, input.focusedMemberAddress ?? '/worker'),
    isActive: input.isActive,
  })
}

describe('agentTeamRunStore current rooted execution contract', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockConnectionState.value = 'connected'
    mockIsReady.value = true
    mockInterruptGeneration.mockReturnValue(true)
    mockServiceOptions.value = null
    teamContextsStoreMock.activeTeamContext = null
    teamContextsStoreMock.getTeamContextById.mockReset()
    teamDefinitions.clear()
    contextFileUploadStoreMock.finalizeDraftAttachments.mockImplementation(
      async ({ attachments }: { attachments: unknown[] }) => attachments,
    )
  })

  it('connects the exact Team context to the bound Team WebSocket endpoint', () => {
    const team = twoMemberTeam({ teamRunId: 'team-connect' })
    setActiveTeam(team)

    const service = useAgentTeamRunStore().connectToTeamStream('team-connect')

    expect(service).toBeTruthy()
    expect(TeamStreamingService).toHaveBeenCalledWith(
      'ws://node-a.example/ws/agent-team',
      expect.objectContaining({
        onInterruptCommandResult: expect.any(Function),
        onInterruptCommandTransportFailure: expect.any(Function),
      }),
    )
    expect(mockConnect).toHaveBeenCalledWith('team-connect', team)
  })

  it('reattaches an existing service to the latest context with the same root identity', () => {
    const original = twoMemberTeam({ teamRunId: 'team-reattach' })
    setActiveTeam(original)
    const store = useAgentTeamRunStore()
    store.connectToTeamStream('team-reattach')
    const replacement = twoMemberTeam({ teamRunId: 'team-reattach' })
    teamContextsStoreMock.getTeamContextById.mockReturnValue(replacement)

    store.connectToTeamStream('team-reattach')

    expect(TeamStreamingService).toHaveBeenCalledTimes(1)
    expect(mockAttachContext).toHaveBeenCalledWith(replacement)
  })

  it('terminates once, disconnects, and preserves an offline context for history restore', async () => {
    const team = twoMemberTeam({ teamRunId: 'team-terminate' })
    setActiveTeam(team)
    const worker = team.executions.getAgentContext(execution('team-terminate', '/worker'))!
    worker.submissionPending = true
    const store = useAgentTeamRunStore()
    store.connectToTeamStream('team-terminate')
    mockMutate.mockResolvedValue({
      data: { terminateAgentTeamRun: { success: true, message: 'terminated' } },
      errors: [],
    })

    expect(await store.terminateTeamRun('team-terminate')).toBe(true)

    expect(mockMutate).toHaveBeenCalledTimes(1)
    expect(mockDisconnect).toHaveBeenCalledTimes(1)
    expect(team.executions.isRootTeamActive()).toBe(false)
    expect(worker.state.currentStatus).toBe(AgentStatus.Offline)
    expect(worker.submissionPending).toBe(false)
    expect(runHistoryStoreMock.markTeamAsInactive).toHaveBeenCalledWith('team-terminate')
  })

  it('does not mutate local lifecycle when backend termination rejects', async () => {
    const team = twoMemberTeam({ teamRunId: 'team-terminate-reject' })
    setActiveTeam(team)
    mockMutate.mockResolvedValue({
      data: { terminateAgentTeamRun: { success: false, message: 'not found' } },
      errors: [],
    })

    expect(await useAgentTeamRunStore().terminateTeamRun('team-terminate-reject')).toBe(false)

    expect(team.executions.isRootTeamActive()).toBe(true)
    expect(runHistoryStoreMock.markTeamAsInactive).not.toHaveBeenCalled()
  })

  it('deduplicates concurrent Stop requests while the first mutation is pending', async () => {
    const team = twoMemberTeam({ teamRunId: 'team-stop-dedupe' })
    setActiveTeam(team)
    let complete!: (value: unknown) => void
    mockMutate.mockReturnValue(new Promise((resolve) => { complete = resolve }))
    const store = useAgentTeamRunStore()

    const first = store.terminateTeamRun('team-stop-dedupe')
    expect(await store.terminateTeamRun('team-stop-dedupe')).toBe(false)
    expect(mockMutate).toHaveBeenCalledTimes(1)
    complete({ data: { terminateAgentTeamRun: { success: true, message: 'terminated' } }, errors: [] })
    expect(await first).toBe(true)
  })

  it('sends to the exact focused persistent execution and records the local submission', async () => {
    const team = twoMemberTeam({ teamRunId: 'team-send', focusedMemberAddress: '/worker' })
    setActiveTeam(team)

    await useAgentTeamRunStore().sendMessageToFocusedMember('inspect exact identity', [])

    expect(mockSendMessage).toHaveBeenCalledWith(
      'inspect exact identity',
      execution('team-send', '/worker'),
      [],
      [],
      expect.objectContaining({
        messageId: expect.any(String),
        dedupeKey: expect.stringContaining('team-send'),
      }),
    )
    const worker = team.executions.getAgentContext(execution('team-send', '/worker'))!
    expect(worker.state.conversation.messages.at(-1)).toMatchObject({ text: 'inspect exact identity' })
    expect(runHistoryStoreMock.markTeamAsActive).toHaveBeenCalledWith('team-send')
  })

  it('restores an inactive Team and sends to the unchanged exact execution address', async () => {
    const stale = twoMemberTeam({ teamRunId: 'team-restore', focusedMemberAddress: '/worker', isActive: false })
    const hydrated = twoMemberTeam({ teamRunId: 'team-restore', focusedMemberAddress: '/worker', isActive: true })
    setActiveTeam(stale)
    mockMutate.mockResolvedValue({
      data: { restoreAgentTeamRun: { success: true, teamRunId: 'team-restore' } },
      errors: [],
    })
    mockHydrateLiveTeamRunContext.mockResolvedValue({ hydratedContext: hydrated })

    await useAgentTeamRunStore().sendMessageToFocusedMember('restore then send', [])

    expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({ variables: { teamRunId: 'team-restore' } }))
    expect(mockHydrateLiveTeamRunContext).toHaveBeenCalledWith(expect.objectContaining({
      teamRunId: 'team-restore',
      memberAddress: '/worker',
    }))
    expect(teamContextsStoreMock.addTeamContext).toHaveBeenCalledWith(hydrated)
    expect(mockSendMessage).toHaveBeenCalledWith(
      'restore then send',
      execution('team-restore', '/worker'),
      [],
      [],
      expect.any(Object),
    )
  })

  it('launches a nested mixed-runtime draft with exact rooted memberAddress inputs and focus', async () => {
    teamDefinitions.set('root-definition', {
      id: 'root-definition',
      name: 'Nested Mixed Team',
      coordinatorMemberName: 'program_manager',
      nodes: [
        { memberName: 'program_manager', refType: 'AGENT', ref: 'pm-definition' },
        { memberName: 'BuildSquad', refType: 'AGENT_TEAM', ref: 'build-definition' },
      ],
    })
    teamDefinitions.set('build-definition', {
      id: 'build-definition',
      name: 'Build Squad',
      coordinatorMemberName: 'review_lead',
      nodes: [
        { memberName: 'review_lead', refType: 'AGENT', ref: 'review-definition' },
        { memberName: 'implementer', refType: 'AGENT', ref: 'impl-definition' },
      ],
    })
    const configStore = useTeamRunConfigStore()
    configStore.setRuntimeModelCatalog('codex_app_server', ['gpt-5.4'])
    configStore.setRuntimeModelCatalog('claude_agent_sdk', ['claude-sonnet'])
    configStore.setRuntimeModelCatalog('autobyteus', ['gpt-5.6-luna'])
    const draft: TeamLaunchDraft = Object.freeze({
      draftId: 'team-draft-nested' as TeamLaunchDraftId,
      focusedMemberAddress: '/BuildSquad/review_lead',
      pendingInputsByMemberAddress: Object.freeze({}),
      config: Object.freeze({
        teamDefinitionId: 'root-definition',
        teamDefinitionName: 'Nested Mixed Team',
        runtimeKind: 'codex_app_server',
        workspaceId: 'test-workspace',
        workspaceMetadata: {
          workspaceId: 'test-workspace',
          workspaceRootPath: '/tmp/test-workspace',
          displayName: 'test-workspace',
          kind: 'filesystem',
        },
        llmModelIdentifier: 'gpt-5.4',
        llmConfig: null,
        autoExecuteTools: true,
        skillAccessMode: 'NONE',
        memberOverrides: {
          '/BuildSquad/review_lead': {
            agentDefinitionId: 'review-definition',
            runtimeKind: 'claude_agent_sdk',
            llmModelIdentifier: 'claude-sonnet',
          },
          '/BuildSquad/implementer': {
            agentDefinitionId: 'impl-definition',
            runtimeKind: 'autobyteus',
            llmModelIdentifier: 'gpt-5.6-luna',
          },
        },
        isLocked: true,
      }),
    })
    const programManager = testAgentNode('/program_manager', { agentRunId: 'pm-run' })
    const reviewer = testAgentNode('/BuildSquad/review_lead', { agentRunId: 'review-run' })
    const implementer = testAgentNode('/BuildSquad/implementer', { agentRunId: 'impl-run' })
    const hydrated = buildTestTeamContext({
      teamRunId: 'team-nested-live',
      teamDefinitionId: 'root-definition',
      coordinatorAddress: programManager.address,
      rootChildren: [
        programManager,
        testSubTeamNode('/BuildSquad', [reviewer, implementer], {
          teamDefinitionId: 'build-definition',
          teamRunId: 'build-run',
          coordinatorAddress: reviewer.address,
        }),
      ],
    })
    mockMutate.mockResolvedValue({
      data: { createAgentTeamRun: { success: true, teamRunId: 'team-nested-live' } },
      errors: [],
    })
    mockHydrateLiveTeamRunContext.mockResolvedValue({ hydratedContext: hydrated })

    const result = await useAgentTeamRunStore().launchDraft(draft)

    expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({
      variables: {
        input: {
          teamDefinitionId: 'root-definition',
          memberConfigs: expect.arrayContaining([
            expect.objectContaining({
              memberAddress: '/program_manager',
              runtimeKind: 'codex_app_server',
              llmModelIdentifier: 'gpt-5.4',
            }),
            expect.objectContaining({
              memberAddress: '/BuildSquad/review_lead',
              runtimeKind: 'claude_agent_sdk',
              llmModelIdentifier: 'claude-sonnet',
            }),
            expect.objectContaining({
              memberAddress: '/BuildSquad/implementer',
              runtimeKind: 'autobyteus',
              llmModelIdentifier: 'gpt-5.6-luna',
            }),
          ]),
        },
      },
    }))
    expect(result.rootTeamRunId).toBe('team-nested-live')
    expect(result.executionAddress).toEqual(execution('team-nested-live', '/BuildSquad/review_lead'))
    expect(result.context.executions.getFocusedAddress()).toEqual(result.executionAddress)
  })

  it('preserves an explicit approval target and never synthesizes a default target', async () => {
    const team = twoMemberTeam({ teamRunId: 'team-approval' })
    setActiveTeam(team)
    const store = useAgentTeamRunStore()
    store.connectToTeamStream('team-approval')
    const explicit = { executionAddress: execution('team-approval', '/worker', ['task-team-1']) }

    await store.postToolExecutionApproval('inv-default', true)
    await store.postToolExecutionApproval('inv-exact', false, 'no', explicit)

    expect(mockApproveTool).toHaveBeenCalledWith('inv-default', null, undefined)
    expect(mockDenyTool).toHaveBeenCalledWith('inv-exact', explicit, 'no')
  })

  it('interrupts only an exact same-root execution address', () => {
    const team = twoMemberTeam({ teamRunId: 'team-interrupt' })
    setActiveTeam(team)
    const store = useAgentTeamRunStore()
    store.connectToTeamStream('team-interrupt')
    const target = execution('team-interrupt', '/worker', ['task-team-1'], 'task-agent-1')

    expect(store.interruptFocusedMemberGeneration({
      teamRunId: 'team-interrupt',
      executionAddress: target,
    })).toBe(true)
    expect(mockInterruptGeneration).toHaveBeenCalledWith(expect.any(String), { executionAddress: target })
    expect(store.interruptFocusedMemberGeneration({
      teamRunId: 'team-interrupt',
      executionAddress: execution('foreign-root', '/worker'),
    })).toBe(false)
    expect(mockInterruptGeneration).toHaveBeenCalledTimes(1)
  })
})
