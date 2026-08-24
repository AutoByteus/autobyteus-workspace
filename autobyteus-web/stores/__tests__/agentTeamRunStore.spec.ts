import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { computed, nextTick } from 'vue'
import { useAgentTeamRunStore } from '../agentTeamRunStore'
import RunConfigPanel from '~/components/workspace/config/RunConfigPanel.vue'
import TeamRunConfigForm from '~/components/workspace/config/TeamRunConfigForm.vue'
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore'
import { useAgentSelectionStore } from '~/stores/agentSelectionStore'
import { useWorkspaceStore } from '~/stores/workspace'
import { TeamStreamingService } from '~/services/agentStreaming'
import { AgentStatus } from '~/types/agent/AgentStatus'
import {
  buildTestTeamContext,
  testAgentNode,
  testSubTeamNode,
} from '~/test-support/currentTeamTestFixtures'
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext'
import type { TeamLaunchDraft } from '~/types/agent/TeamLaunchDraft'
import type { TeamRunConfig } from '~/types/agent/TeamRunConfig'
import type { ContextAttachment } from '~/types/conversation'

const {
  mockConnect,
  mockDisconnect,
  mockAttachContext,
  mockConnectionState,
  mockIsReady,
  mockIsReopenRequired,
  mockConnectCandidate,
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
  teamDefinitionRevision,
  mockServiceOptions,
} = vi.hoisted(() => ({
  mockConnect: vi.fn(),
  mockDisconnect: vi.fn(),
  mockAttachContext: vi.fn(),
  mockConnectionState: { value: 'connected' as 'connected' | 'disconnected' | 'connecting' | 'reconnecting' },
  mockIsReady: { value: true },
  mockIsReopenRequired: { value: false },
  mockConnectCandidate: vi.fn(),
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
    replaceTeamContext: vi.fn(),
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
  teamDefinitionRevision: { current: null as { value: number } | null },
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
      get isReopenRequired() { return mockIsReopenRequired.value },
      connect: mockConnect,
      connectCandidate: mockConnectCandidate,
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

vi.mock('~/composables/useRightSideTabs', () => ({
  useRightSideTabs: () => ({ setActiveTab: vi.fn() }),
}))

vi.mock('~/stores/agentTeamDefinitionStore', async () => {
  const { ref } = await import('vue')
  const revision = ref(0)
  teamDefinitionRevision.current = revision
  return {
    useAgentTeamDefinitionStore: () => ({
      getAgentTeamDefinitionById: (id: string) => {
        revision.value
        return teamDefinitions.get(id) ?? null
      },
    }),
  }
})

const notifyTeamDefinitionChange = (): void => {
  if (!teamDefinitionRevision.current) throw new Error('Team definition revision is unavailable.')
  teamDefinitionRevision.current.value += 1
}

const setActiveTeam = (team: AgentTeamContext): void => {
  teamContextsStoreMock.activeTeamContext = team
  teamContextsStoreMock.getTeamContextById.mockImplementation((rootTeamRunId: string) =>
    rootTeamRunId === team.view.getRootTeamRunId() ? team : undefined)
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
    focusedAgentRunId: input.focusedMemberAddress === '/coordinator'
      ? `${teamRunId}-coordinator-run`
      : `${teamRunId}-worker-run`,
    isActive: input.isActive,
  })
}

const configureSelectedNestedLaunchDraft = (): Readonly<{
  configStore: ReturnType<typeof useTeamRunConfigStore>
  draft: TeamLaunchDraft
}> => {
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
  notifyTeamDefinitionChange()
  const configStore = useTeamRunConfigStore()
  configStore.setRuntimeModelCatalog('codex_app_server', ['gpt-5.4'])
  configStore.setRuntimeModelCatalog('claude_agent_sdk', ['claude-sonnet'])
  configStore.setRuntimeModelCatalog('autobyteus', ['gpt-5.6-luna'])
  const config: TeamRunConfig = {
    teamDefinitionId: 'root-definition',
    teamDefinitionName: 'Nested Mixed Team',
    rootConfig: {
      runtimeKind: 'codex_app_server',
      workspace: {
        workspaceId: 'test-workspace',
        workspaceMetadata: {
          workspaceId: 'test-workspace',
          workspaceRootPath: '/tmp/test-workspace',
          displayName: 'test-workspace',
          kind: 'filesystem',
        },
      },
      llmModelIdentifier: 'gpt-5.4',
      llmConfig: null,
      autoExecuteTools: true,
      skillAccessMode: 'NONE',
    },
    teamOverrides: {
      '/BuildSquad': {
        runtimeKind: 'claude_agent_sdk',
        llmModelIdentifier: 'claude-sonnet',
      },
    },
    agentOverrides: {
      '/BuildSquad/implementer': {
        runtimeKind: 'autobyteus',
        llmModelIdentifier: 'gpt-5.6-luna',
      },
    },
    isLocked: true,
  }
  configStore.setConfig(config)
  configStore.focusMember('/BuildSquad/review_lead')
  const draft = configStore.selectedDraft
  if (!draft) throw new Error('Expected the real selected Team launch draft.')
  useAgentSelectionStore().selectTeamDraft(draft.draftId)
  return { configStore, draft }
}

const nestedHydratedTeam = (): AgentTeamContext => {
  const programManager = testAgentNode('/program_manager', { agentRunId: 'pm-run' })
  const reviewer = testAgentNode('/BuildSquad/review_lead', { agentRunId: 'review-run' })
  const implementer = testAgentNode('/BuildSquad/implementer', { agentRunId: 'impl-run' })
  return buildTestTeamContext({
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
}

describe('agentTeamRunStore current rooted execution contract', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockConnectionState.value = 'connected'
    mockIsReady.value = true
    mockIsReopenRequired.value = false
    mockConnectCandidate.mockResolvedValue(undefined)
    mockInterruptGeneration.mockReturnValue(true)
    mockServiceOptions.value = null
    teamContextsStoreMock.activeTeamContext = null
    teamContextsStoreMock.getTeamContextById.mockReset()
    teamDefinitions.clear()
    notifyTeamDefinitionChange()
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

  it('latches one persistent recovery notice and blocks ordinary service reuse', () => {
    const team = twoMemberTeam({ teamRunId: 'team-reopen-latched' })
    setActiveTeam(team)
    const store = useAgentTeamRunStore()
    const service = store.connectToTeamStream('team-reopen-latched')
    const options = mockServiceOptions.value as { onStreamRecoveryRequired(notice: unknown): void }
    options.onStreamRecoveryRequired({
      kind: 'team_stream_recovery_required', rootTeamRunId: 'team-reopen-latched',
    })
    mockIsReopenRequired.value = true
    const replacement = twoMemberTeam({ teamRunId: 'team-reopen-latched' })
    teamContextsStoreMock.getTeamContextById.mockReturnValue(replacement)

    expect(store.connectToTeamStream('team-reopen-latched')).toBe(service)
    expect(mockAttachContext).not.toHaveBeenCalledWith(replacement)
    expect(mockConnect).toHaveBeenCalledTimes(1)
    expect(store.getTeamStreamRecoveryNotice('team-reopen-latched')).toEqual({
      kind: 'team_stream_recovery_required', rootTeamRunId: 'team-reopen-latched',
    })
  })

  it('commits one ready recovery candidate over the unchanged failed entries', async () => {
    const failed = twoMemberTeam({ teamRunId: 'team-recovery-commit' })
    setActiveTeam(failed)
    const store = useAgentTeamRunStore()
    store.connectToTeamStream('team-recovery-commit')
    ;(mockServiceOptions.value as { onStreamRecoveryRequired(notice: unknown): void }).onStreamRecoveryRequired({
      kind: 'team_stream_recovery_required', rootTeamRunId: 'team-recovery-commit',
    })
    mockIsReopenRequired.value = true
    const candidate = twoMemberTeam({ teamRunId: 'team-recovery-commit', focusedMemberAddress: '/coordinator' })

    await expect(store.replaceFailedTeamStream({
      rootTeamRunId: 'team-recovery-commit',
      candidateContext: candidate,
      expectedBaseChangeSequence: 14,
    })).resolves.toBeTruthy()

    expect(mockConnectCandidate).toHaveBeenCalledWith('team-recovery-commit', candidate, 14)
    expect(teamContextsStoreMock.replaceTeamContext).toHaveBeenCalledWith(
      'team-recovery-commit', failed, candidate,
    )
    expect(mockDisconnect).toHaveBeenCalledTimes(1)
    expect(store.getTeamStreamRecoveryNotice('team-recovery-commit')).toBeNull()
  })

  it('preserves failed entries and notice when the candidate handshake rejects', async () => {
    const failed = twoMemberTeam({ teamRunId: 'team-recovery-reject' })
    setActiveTeam(failed)
    const store = useAgentTeamRunStore()
    store.connectToTeamStream('team-recovery-reject')
    ;(mockServiceOptions.value as { onStreamRecoveryRequired(notice: unknown): void }).onStreamRecoveryRequired({
      kind: 'team_stream_recovery_required', rootTeamRunId: 'team-recovery-reject',
    })
    mockIsReopenRequired.value = true
    mockConnectCandidate.mockRejectedValueOnce(new Error('snapshot mismatch'))
    const candidate = twoMemberTeam({ teamRunId: 'team-recovery-reject' })

    await expect(store.replaceFailedTeamStream({
      rootTeamRunId: 'team-recovery-reject',
      candidateContext: candidate,
      expectedBaseChangeSequence: 14,
    })).rejects.toThrow('snapshot mismatch')

    expect(teamContextsStoreMock.replaceTeamContext).not.toHaveBeenCalled()
    expect(mockDisconnect).toHaveBeenCalledTimes(1)
    expect(store.getTeamStreamRecoveryNotice('team-recovery-reject')).toEqual({
      kind: 'team_stream_recovery_required', rootTeamRunId: 'team-recovery-reject',
    })
  })

  it('terminates once, disconnects, and preserves an offline context for history restore', async () => {
    const team = twoMemberTeam({ teamRunId: 'team-terminate' })
    setActiveTeam(team)
    const worker = team.view.getAgentContext('team-terminate-worker-run')!
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
    expect(team.view.isRootTeamActive()).toBe(false)
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

    expect(team.view.isRootTeamActive()).toBe(true)
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
    const worker = team.view.getAgentContext('team-send-worker-run')!
    const coordinator = team.view.getAgentContext('team-send-coordinator-run')!
    const retainedImage: ContextAttachment = {
      kind: 'workspace_path', id: 'retained-image', locator: '/tmp/retained-image.png',
      displayName: 'retained-image.png', type: 'Image',
    }
    const removedFile: ContextAttachment = {
      kind: 'workspace_path', id: 'removed-file', locator: '/tmp/removed-file.txt',
      displayName: 'removed-file.txt', type: 'Text',
    }
    worker.requirement = 'inspect exact identity'
    worker.contextFilePaths = [retainedImage, removedFile]
    const visibleRequirement = computed(() => worker.requirement)
    const visibleAttachmentIds = computed(() => worker.contextFilePaths.map((attachment) => attachment.id))
    const visiblePending = computed(() => worker.submissionPending)

    expect(visibleRequirement.value).toBe('inspect exact identity')
    expect(visibleAttachmentIds.value).toEqual(['retained-image', 'removed-file'])
    expect(visiblePending.value).toBe(false)
    worker.contextFilePaths = worker.contextFilePaths.filter(
      (attachment) => attachment.id !== removedFile.id,
    )
    expect(visibleAttachmentIds.value).toEqual(['retained-image'])

    await useAgentTeamRunStore().sendMessageToFocusedMember(
      worker.requirement,
      worker.contextFilePaths,
    )

    expect(mockSendMessage).toHaveBeenCalledWith(
      'inspect exact identity',
      'team-send-worker-run',
      [],
      ['/tmp/retained-image.png'],
      expect.objectContaining({
        messageId: expect.any(String),
        dedupeKey: expect.stringContaining('team-send'),
      }),
    )
    expect(mockSendMessage).toHaveBeenCalledTimes(1)
    expect(contextFileUploadStoreMock.finalizeDraftAttachments).toHaveBeenCalledWith(expect.objectContaining({
      attachments: [retainedImage],
    }))
    expect(worker.state.conversation.messages).toEqual([
      expect.objectContaining({
        type: 'user', text: 'inspect exact identity', contextFilePaths: [retainedImage],
      }),
    ])
    expect(visibleRequirement.value).toBe('')
    expect(visibleAttachmentIds.value).toEqual([])
    expect(visiblePending.value).toBe(true)
    expect(coordinator.requirement).toBe('')
    expect(coordinator.contextFilePaths).toEqual([])
    expect(coordinator.submissionPending).toBe(false)
    expect(runHistoryStoreMock.markTeamAsActive).toHaveBeenCalledWith('team-send')
  })

  it('preserves the real associated Team draft when restore fails before local admission', async () => {
    const team = twoMemberTeam({
      teamRunId: 'team-pre-admission-failure', focusedMemberAddress: '/worker', isActive: false,
    })
    setActiveTeam(team)
    const worker = team.view.getAgentContext('team-pre-admission-failure-worker-run')!
    const stagedAttachment: ContextAttachment = {
      kind: 'workspace_path', id: 'staged-file', locator: '/tmp/staged.txt',
      displayName: 'staged.txt', type: 'Text',
    }
    worker.requirement = 'Keep this draft'
    worker.contextFilePaths = [stagedAttachment]
    const visibleRequirement = computed(() => worker.requirement)
    const visibleAttachmentIds = computed(() => worker.contextFilePaths.map((attachment) => attachment.id))
    const visiblePending = computed(() => worker.submissionPending)
    expect(visibleRequirement.value).toBe('Keep this draft')
    expect(visibleAttachmentIds.value).toEqual(['staged-file'])
    expect(visiblePending.value).toBe(false)
    mockMutate.mockResolvedValue({
      data: { restoreAgentTeamRun: { success: false, teamRunId: null } }, errors: [],
    })

    await expect(useAgentTeamRunStore().sendMessageToFocusedMember(
      worker.requirement,
      worker.contextFilePaths,
    )).rejects.toThrow('Team restore failed')

    expect(visibleRequirement.value).toBe('Keep this draft')
    expect(visibleAttachmentIds.value).toEqual(['staged-file'])
    expect(visiblePending.value).toBe(false)
    expect(worker.state.conversation.messages).toEqual([])
    expect(mockSendMessage).not.toHaveBeenCalled()
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
      agentRunId: 'team-restore-worker-run',
    }))
    expect(teamContextsStoreMock.addTeamContext).toHaveBeenCalledWith(hydrated)
    expect(mockSendMessage).toHaveBeenCalledWith(
      'restore then send',
      'team-restore-worker-run',
      [],
      [],
      expect.any(Object),
    )
  })

  it('launches a nested mixed-runtime draft with exact rooted memberAddress inputs and focus', async () => {
    const { configStore } = configureSelectedNestedLaunchDraft()
    configStore.setPendingInput('/BuildSquad/review_lead', {
      text: 'Review the exact launch.',
      attachments: [],
    })
    const draft = configStore.selectedDraft!
    const hydrated = nestedHydratedTeam()
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
          teamConfigs: expect.arrayContaining([
            expect.objectContaining({
              teamAddress: '/',
              runtimeKind: 'codex_app_server',
              llmModelIdentifier: 'gpt-5.4',
            }),
            expect.objectContaining({
              teamAddress: '/BuildSquad',
              runtimeKind: 'claude_agent_sdk',
              llmModelIdentifier: 'claude-sonnet',
            }),
          ]),
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
    expect(result.agentRunId).toBe('review-run')
    expect(result.context.view.getFocusedAgentRunId()).toBe('review-run')
    expect(result.context.view.getAgentContext('review-run')?.requirement).toBe('Review the exact launch.')
    expect(configStore.selectedDraft).toBeNull()
    expect(configStore.hasInFlightLaunch).toBe(false)
    expect(useAgentSelectionStore().subject).toEqual({ kind: 'team_run', rootTeamRunId: 'team-nested-live' })
    expect(teamContextsStoreMock.addTeamContext).toHaveBeenCalledTimes(1)
  })

  it('registers two active New Team scopes and creates exactly one TeamRun from the same launch activation', async () => {
    const { configStore } = configureSelectedNestedLaunchDraft()
    const initialDraftId = configStore.selectedDraft!.draftId
    configStore.applyTeamWorkspaceAuthoringCommand({
      kind: 'set_selection', draftId: initialDraftId, teamAddress: '/',
      selection: { mode: 'new', existingWorkspaceId: 'test-workspace', newWorkspacePath: '/workspace/root-new' },
    })
    configStore.applyTeamWorkspaceAuthoringCommand({
      kind: 'set_selection', draftId: initialDraftId, teamAddress: '/BuildSquad',
      selection: { mode: 'new', existingWorkspaceId: null, newWorkspacePath: '/workspace/build-new' },
    })
    const workspaces = useWorkspaceStore()
    const createWorkspace = vi.spyOn(workspaces, 'createWorkspace').mockImplementation(async ({ root_path }) => {
      const workspaceId = root_path.endsWith('root-new') ? 'ws-root-new' : 'ws-build-new'
      workspaces.workspaceMetadataById[workspaceId] = {
        workspaceId, workspaceRootPath: root_path, displayName: workspaceId, kind: 'filesystem',
      }
      return workspaceId
    })
    mockMutate.mockResolvedValue({
      data: { createAgentTeamRun: { success: true, teamRunId: 'team-nested-live' } }, errors: [],
    })
    mockHydrateLiveTeamRunContext.mockResolvedValue({ hydratedContext: nestedHydratedTeam() })

    await useAgentTeamRunStore().launchDraft(configStore.selectedDraft!)

    expect(createWorkspace).toHaveBeenCalledTimes(2)
    expect(createWorkspace).toHaveBeenNthCalledWith(1, { root_path: '/workspace/build-new' })
    expect(createWorkspace).toHaveBeenNthCalledWith(2, { root_path: '/workspace/root-new' })
    expect(mockMutate).toHaveBeenCalledTimes(1)
    expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({
      variables: { input: expect.objectContaining({
        teamConfigs: expect.arrayContaining([
          expect.objectContaining({ teamAddress: '/', workspaceRootPath: '/workspace/root-new' }),
          expect.objectContaining({ teamAddress: '/BuildSquad', workspaceRootPath: '/workspace/build-new' }),
        ]),
      }) },
    }))
  })

  it('deduplicates one canonical New path, scopes a registration failure to both Teams, and does not create a TeamRun', async () => {
    const { configStore } = configureSelectedNestedLaunchDraft()
    const draftId = configStore.selectedDraft!.draftId
    for (const teamAddress of ['/', '/BuildSquad'] as const) {
      configStore.applyTeamWorkspaceAuthoringCommand({
        kind: 'set_selection', draftId, teamAddress,
        selection: { mode: 'new', existingWorkspaceId: null, newWorkspacePath: '/workspace/shared-new/' },
      })
    }
    const workspaces = useWorkspaceStore()
    const createWorkspace = vi.spyOn(workspaces, 'createWorkspace').mockRejectedValue(new Error('registration unavailable'))

    await expect(useAgentTeamRunStore().launchDraft(configStore.selectedDraft!))
      .rejects.toThrow('registration unavailable')

    expect(createWorkspace).toHaveBeenCalledOnce()
    expect(createWorkspace).toHaveBeenCalledWith({ root_path: '/workspace/shared-new' })
    expect(mockMutate).not.toHaveBeenCalled()
    expect(configStore.teamWorkspaceAuthoringViewFor('/').operation).toEqual({ status: 'error', error: 'registration unavailable' })
    expect(configStore.teamWorkspaceAuthoringViewFor('/BuildSquad').operation).toEqual({ status: 'error', error: 'registration unavailable' })
    expect(configStore.teamWorkspaceAuthoringViewFor('/').selection.mode).toBe('new')
    expect(configStore.teamWorkspaceAuthoringViewFor('/BuildSquad').selection.mode).toBe('new')
  })

  it('enables the first rendered repair activation for a stale empty Team and performs zero registration or create', async () => {
    const { configStore } = configureSelectedNestedLaunchDraft()
    configStore.applyTeamWorkspaceAuthoringCommand({
      kind: 'set_selection', draftId: configStore.selectedDraft!.draftId, teamAddress: '/BuildSquad',
      selection: { mode: 'new', existingWorkspaceId: null, newWorkspacePath: '   ' },
    })
    expect(configStore.launchReadiness.canLaunch).toBe(false)
    expect(configStore.launchReadiness.blockingIssues).toContainEqual(expect.objectContaining({
      code: 'WORKSPACE_REQUIRED', subjectAddress: '/BuildSquad',
    }))

    teamDefinitions.set('root-definition', {
      id: 'root-definition', name: 'Nested Mixed Team', coordinatorMemberName: 'program_manager',
      nodes: [{ memberName: 'program_manager', refType: 'AGENT', ref: 'pm-definition' }],
    })
    notifyTeamDefinitionChange()
    await nextTick()
    const createWorkspace = vi.spyOn(useWorkspaceStore(), 'createWorkspace')
    const runStore = useAgentTeamRunStore()
    const launchDraft = vi.spyOn(runStore, 'launchDraft')
    const wrapper = mount(RunConfigPanel, {
      global: {
        stubs: { AgentRunConfigForm: true, TeamRunConfigForm: true, StoredTeamRunConfigForm: true },
      },
    })

    expect(configStore.launchReadiness).toEqual(expect.objectContaining({ canLaunch: true, blockingIssues: [] }))
    expect(configStore.repairNotice).toBeNull()
    expect(wrapper.find('.run-btn').attributes('disabled')).toBeUndefined()
    await wrapper.find('.run-btn').trigger('click')
    await vi.waitFor(() => expect(configStore.repairNotice?.addresses).toContain('/BuildSquad'))

    expect(createWorkspace).not.toHaveBeenCalled()
    expect(mockMutate).not.toHaveBeenCalled()
    expect(configStore.selectedDraft!.teamWorkspaceAuthoringByTeamAddress['/BuildSquad']).toBeUndefined()
    expect(configStore.repairNotice?.addresses).toContain('/BuildSquad')
    expect(wrapper.findComponent(TeamRunConfigForm).props('repairAddresses')).toContain('/BuildSquad')
    expect(launchDraft).toHaveBeenCalledOnce()
  })

  it('rejects a workspace result when topology changes after registration dispatch and never creates a TeamRun', async () => {
    const { configStore } = configureSelectedNestedLaunchDraft()
    configStore.applyTeamWorkspaceAuthoringCommand({
      kind: 'set_selection', draftId: configStore.selectedDraft!.draftId, teamAddress: '/BuildSquad',
      selection: { mode: 'new', existingWorkspaceId: null, newWorkspacePath: '/workspace/build-dispatched' },
    })
    const workspaces = useWorkspaceStore()
    let resolveWorkspace!: (workspaceId: string) => void
    const createWorkspace = vi.spyOn(workspaces, 'createWorkspace').mockReturnValue(new Promise((resolve) => {
      resolveWorkspace = resolve
    }))
    const launch = useAgentTeamRunStore().launchDraft(configStore.selectedDraft!)
    await vi.waitFor(() => expect(createWorkspace).toHaveBeenCalledOnce())
    teamDefinitions.set('root-definition', {
      id: 'root-definition', name: 'Nested Mixed Team', coordinatorMemberName: 'program_manager',
      nodes: [{ memberName: 'program_manager', refType: 'AGENT', ref: 'pm-definition' }],
    })
    workspaces.workspaceMetadataById['ws-dispatched'] = {
      workspaceId: 'ws-dispatched', workspaceRootPath: '/workspace/build-dispatched',
      displayName: 'dispatched', kind: 'filesystem',
    }
    resolveWorkspace('ws-dispatched')

    await expect(launch).rejects.toThrow('Team topology changed during workspace preparation')
    expect(mockMutate).not.toHaveBeenCalled()
    expect(configStore.selectedDraft!.config.teamOverrides['/BuildSquad']).toBeUndefined()
    expect(configStore.selectedDraft!.teamWorkspaceAuthoringByTeamAddress['/BuildSquad']).toBeUndefined()
    expect(configStore.repairNotice?.addresses).toContain('/BuildSquad')
  })

  it('admits one exact draft before allocation and blocks edits, selection changes, and duplicate allocation until success', async () => {
    const { configStore, draft } = configureSelectedNestedLaunchDraft()
    const hydrated = nestedHydratedTeam()
    let resolveAllocation!: (value: unknown) => void
    mockMutate.mockReturnValue(new Promise((resolve) => { resolveAllocation = resolve }))
    mockHydrateLiveTeamRunContext.mockResolvedValue({ hydratedContext: hydrated })
    const runStore = useAgentTeamRunStore()

    const launch = runStore.launchDraft(draft)

    expect(configStore.isDraftLaunchInFlight(draft.draftId)).toBe(true)
    expect(runStore.isDraftLaunchPending(draft.draftId)).toBe(true)
    expect(mockMutate).toHaveBeenCalledTimes(1)
    expect(() => configStore.applyConfigEdit({ kind: 'set_root_model', llmModelIdentifier: 'other-model' })).toThrow(/in flight/)
    expect(() => configStore.focusMember('/BuildSquad/implementer')).toThrow(/in flight/)
    expect(() => configStore.setPendingInput('/BuildSquad/review_lead', { text: 'late', attachments: [] })).toThrow(/in flight/)
    expect(() => configStore.applyTeamWorkspaceAuthoringCommand({
      kind: 'set_selection', draftId: draft.draftId, teamAddress: '/',
      selection: { mode: 'new', existingWorkspaceId: 'test-workspace', newWorkspacePath: '/tmp/late' },
    })).toThrow(/in flight/)
    expect(() => configStore.removeDraft(draft.draftId)).toThrow(/in flight/)
    expect(() => configStore.clearConfig()).toThrow(/in flight/)
    expect(() => useAgentSelectionStore().selectRun('other-run', 'team')).toThrow(/cannot change/)
    await expect(runStore.launchDraft(draft)).rejects.toThrow(/in flight/)
    expect(mockMutate).toHaveBeenCalledTimes(1)

    resolveAllocation({
      data: { createAgentTeamRun: { success: true, teamRunId: 'team-nested-live' } },
      errors: [],
    })
    await expect(launch).resolves.toMatchObject({ rootTeamRunId: 'team-nested-live' })

    expect(configStore.hasInFlightLaunch).toBe(false)
    expect(configStore.selectedDraft).toBeNull()
    expect(useAgentSelectionStore().subject).toEqual({ kind: 'team_run', rootTeamRunId: 'team-nested-live' })
  })

  it('preserves and unlocks the exact selected draft after allocation failure, then permits one later canonical launch', async () => {
    const { configStore, draft } = configureSelectedNestedLaunchDraft()
    const selectionStore = useAgentSelectionStore()
    mockMutate.mockRejectedValueOnce(new Error('allocation unavailable'))

    await expect(useAgentTeamRunStore().launchDraft(draft)).rejects.toThrow('allocation unavailable')

    expect(configStore.selectedDraft).toEqual(draft)
    expect(configStore.isDraftLaunchInFlight(draft.draftId)).toBe(false)
    expect(selectionStore.subject).toEqual({ kind: 'team_draft', draftId: draft.draftId })
    expect(() => configStore.applyConfigEdit({ kind: 'set_root_auto_execute_tools', autoExecuteTools: false })).not.toThrow()
    const retryDraft = configStore.selectedDraft!
    expect(retryDraft).not.toBe(draft)
    expect(retryDraft.config.rootConfig.autoExecuteTools).toBe(false)

    mockMutate.mockResolvedValueOnce({
      data: { createAgentTeamRun: { success: true, teamRunId: 'team-nested-live' } },
      errors: [],
    })
    mockHydrateLiveTeamRunContext.mockResolvedValue({ hydratedContext: nestedHydratedTeam() })
    await expect(useAgentTeamRunStore().launchDraft(retryDraft)).resolves.toMatchObject({
      rootTeamRunId: 'team-nested-live',
    })
    expect(mockMutate).toHaveBeenCalledTimes(2)
    expect(configStore.selectedDraft).toBeNull()
    expect(selectionStore.subject).toEqual({ kind: 'team_run', rootTeamRunId: 'team-nested-live' })
  })

  it('first-send launch uses the admitted selected draft and sends once to the exact promoted execution', async () => {
    const { configStore, draft } = configureSelectedNestedLaunchDraft()
    const hydrated = nestedHydratedTeam()
    mockMutate.mockResolvedValue({
      data: { createAgentTeamRun: { success: true, teamRunId: 'team-nested-live' } },
      errors: [],
    })
    mockHydrateLiveTeamRunContext.mockResolvedValue({ hydratedContext: hydrated })
    teamContextsStoreMock.addTeamContext.mockImplementation((team: AgentTeamContext) => setActiveTeam(team))

    await useAgentTeamRunStore().sendMessageToFocusedMember('FIRST_SEND_EXACT', [])

    const target = 'review-run'
    expect(mockMutate).toHaveBeenCalledTimes(1)
    expect(mockSendMessage).toHaveBeenCalledTimes(1)
    expect(mockSendMessage).toHaveBeenCalledWith(
      'FIRST_SEND_EXACT',
      target,
      [],
      [],
      expect.objectContaining({ dedupeKey: expect.stringContaining('team-nested-live') }),
    )
    expect(hydrated.view.getAgentContext(target)?.state.conversation.messages).toEqual([
      expect.objectContaining({ type: 'user', text: 'FIRST_SEND_EXACT' }),
    ])
    expect(hydrated.view.getAgentContext(target)?.requirement).toBe('')
    expect(configStore.selectedDraft).toBeNull()
    expect(configStore.isDraftLaunchInFlight(draft.draftId)).toBe(false)
    expect(useAgentSelectionStore().subject).toEqual({ kind: 'team_run', rootTeamRunId: 'team-nested-live' })
  })

  it('preserves an explicit approval target and never synthesizes a default target', async () => {
    const team = twoMemberTeam({ teamRunId: 'team-approval' })
    setActiveTeam(team)
    const store = useAgentTeamRunStore()
    store.connectToTeamStream('team-approval')
    const explicit = { agentRunId: 'team-approval-worker-run' }

    await store.postToolExecutionApproval('inv-default', true)
    await store.postToolExecutionApproval('inv-exact', false, 'no', explicit)

    expect(mockApproveTool).toHaveBeenCalledWith('inv-default', null, undefined)
    expect(mockDenyTool).toHaveBeenCalledWith('inv-exact', explicit, 'no')
  })

  it('interrupts only an AgentRun in the exact current Team execution', () => {
    const team = twoMemberTeam({ teamRunId: 'team-interrupt' })
    setActiveTeam(team)
    const store = useAgentTeamRunStore()
    store.connectToTeamStream('team-interrupt')
    expect(store.interruptFocusedMemberGeneration({
      teamRunId: 'team-interrupt',
      agentRunId: 'team-interrupt-worker-run',
    })).toBe(true)
    expect(mockInterruptGeneration).toHaveBeenCalledWith(expect.any(String), { agentRunId: 'team-interrupt-worker-run' })
    expect(store.interruptFocusedMemberGeneration({
      teamRunId: 'team-interrupt',
      agentRunId: 'foreign-run',
    })).toBe(false)
    expect(mockInterruptGeneration).toHaveBeenCalledTimes(1)
  })
})
