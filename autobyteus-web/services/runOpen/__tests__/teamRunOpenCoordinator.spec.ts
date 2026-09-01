import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TaskExecutionDto } from '@autobyteus/team-stream-contracts'
import { openTeamRun, reopenTeamRunAfterStreamLoss } from '~/services/runOpen/teamRunOpenCoordinator'
import {
  buildTestTeamContext,
  testAgentNode,
  testTaskRecord,
} from '~/test-support/currentTeamTestFixtures'

const {
  hydrateLiveTeamRunContextMock,
  hydrateTeamRunContextForStreamRecoveryMock,
  getTeamContextByIdMock,
  addTeamContextMock,
  connectToTeamStreamMock,
  disconnectTeamStreamMock,
  isTeamStreamReopenRequiredMock,
  replaceFailedTeamStreamMock,
  selectRunMock,
  selectRunWithoutShellNavigationMock,
  selectDraftMock,
  clearAgentRunConfigMock,
  commitActivitiesMock,
  markAuthorityMock,
} = vi.hoisted(() => ({
  hydrateLiveTeamRunContextMock: vi.fn(),
  hydrateTeamRunContextForStreamRecoveryMock: vi.fn(),
  getTeamContextByIdMock: vi.fn(),
  addTeamContextMock: vi.fn(),
  connectToTeamStreamMock: vi.fn(),
  disconnectTeamStreamMock: vi.fn(),
  isTeamStreamReopenRequiredMock: vi.fn(),
  replaceFailedTeamStreamMock: vi.fn(),
  selectRunMock: vi.fn(),
  selectRunWithoutShellNavigationMock: vi.fn(),
  selectDraftMock: vi.fn(),
  clearAgentRunConfigMock: vi.fn(),
  commitActivitiesMock: vi.fn(),
  markAuthorityMock: vi.fn(),
}))

vi.mock('~/services/runHydration/teamRunContextHydrationService', () => ({
  hydrateLiveTeamRunContext: hydrateLiveTeamRunContextMock,
  hydrateTeamRunContextForStreamRecovery: hydrateTeamRunContextForStreamRecoveryMock,
}))
vi.mock('~/services/runHydration/teamRunHydrationCommit', () => ({
  commitTeamRunHydrationActivities: commitActivitiesMock,
  markCommittedTeamRunHydrationAuthority: markAuthorityMock,
}))
vi.mock('~/stores/agentTeamContextsStore', () => ({
  useAgentTeamContextsStore: () => ({
    getTeamContextById: getTeamContextByIdMock,
    addTeamContext: addTeamContextMock,
  }),
}))
vi.mock('~/stores/agentTeamRunStore', () => ({
  useAgentTeamRunStore: () => ({
    connectToTeamStream: connectToTeamStreamMock,
    disconnectTeamStream: disconnectTeamStreamMock,
    isTeamStreamReopenRequired: isTeamStreamReopenRequiredMock,
    replaceFailedTeamStream: replaceFailedTeamStreamMock,
  }),
}))
vi.mock('~/stores/agentSelectionStore', () => ({
  useAgentSelectionStore: () => ({
    selectRun: selectRunMock,
    selectRunWithoutShellNavigation: selectRunWithoutShellNavigationMock,
  }),
}))
vi.mock('~/stores/agentRunConfigStore', () => ({
  useAgentRunConfigStore: () => ({ clearConfig: clearAgentRunConfigMock }),
}))
vi.mock('~/stores/teamRunConfigStore', () => ({
  useTeamRunConfigStore: () => ({ selectDraft: selectDraftMock }),
}))

const ROOT = 'team-1'

const makeTeam = (input: {
  focus?: string
  active?: boolean
  tasks?: ReturnType<typeof testTaskRecord>[]
  taskExecutions?: TaskExecutionDto[]
} = {}) => buildTestTeamContext({
  teamRunId: ROOT,
  teamDefinitionId: 'team-def-1',
  teamDefinitionName: 'Team',
  coordinatorAddress: '/member-a',
  focusedAgentRunId: input.focus ?? 'run-a',
  rootChildren: [
    testAgentNode('/member-a', { displayName: 'Member A', agentRunId: 'run-a' }),
    testAgentNode('/member-b', { displayName: 'Member B', agentRunId: 'run-b' }),
  ],
  isActive: input.active ?? true,
  tasks: input.tasks,
  taskExecutions: input.taskExecutions,
})

const hydration = (team: ReturnType<typeof makeTeam>) => ({
  teamRunId: ROOT,
  focusedAgentRunId: team.view.getFocusedAgentRunId(),
  resumeConfig: { teamRunId: ROOT, isActive: team.view.isRootTeamActive(), executionTree: team.view.getExecutionTree() },
  projectionByAgentRunId: new Map([[team.view.getFocusedAgentRunId(), {}]]),
  activityReplacements: [],
  hydratedContext: team,
})

describe('openTeamRun current exact execution identity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isTeamStreamReopenRequiredMock.mockReturnValue(true)
    replaceFailedTeamStreamMock.mockResolvedValue(undefined)
  })

  it('rejects the fresh-open path when the Team is already mounted', async () => {
    const existing = makeTeam({ focus: 'run-b' })
    getTeamContextByIdMock.mockReturnValue(existing)

    await expect(openTeamRun({
      teamRunId: ROOT,
      resolveWorkspaceMetadataByRootPath: vi.fn(),
      ensureWorkspaceByRootPath: vi.fn(),
    })).rejects.toThrow("Team context 'team-1' is already mounted.")

    expect(hydrateLiveTeamRunContextMock).not.toHaveBeenCalled()
    expect(addTeamContextMock).not.toHaveBeenCalled()
  })

  it('adds a fresh current Team projection and performs desktop selection cleanup', async () => {
    const hydrated = makeTeam()
    getTeamContextByIdMock.mockReturnValue(null)
    hydrateLiveTeamRunContextMock.mockResolvedValue(hydration(hydrated))

    await openTeamRun({
      teamRunId: ROOT,
      resolveWorkspaceMetadataByRootPath: vi.fn(),
      ensureWorkspaceByRootPath: vi.fn(),
    })

    expect(hydrated.view.getExecutionTree().root_team.members.map((node) => node.address)).toEqual(['/member-a', '/member-b'])
    expect(hydrated.view.hasAgentRun('run-a')).toBe(true)
    expect(commitActivitiesMock).toHaveBeenCalledWith(expect.objectContaining({ hydratedContext: hydrated }))
    expect(addTeamContextMock).toHaveBeenCalledWith(hydrated)
    expect(markAuthorityMock).toHaveBeenCalledWith(expect.objectContaining({ hydratedContext: hydrated }))
    expect(selectRunMock).toHaveBeenCalledWith(ROOT, 'team')
    expect(selectDraftMock).toHaveBeenCalledWith(null)
    expect(clearAgentRunConfigMock).toHaveBeenCalledTimes(1)
  })

  it('preserves an exact requested task-Agent focus present in the hydrated execution state', async () => {
    const hydrated = makeTeam({
      focus: 'task-agent-run-1',
      tasks: [testTaskRecord({
        taskId: 'task-1',
        delegatorAgentRunId: 'run-a',
        recipientAddress: '/member-b',
        target: { agentRunId: 'task-agent-run-1' },
      })],
    })
    getTeamContextByIdMock.mockReturnValue(null)
    hydrateLiveTeamRunContextMock.mockResolvedValue(hydration(hydrated))

    const result = await openTeamRun({
      teamRunId: ROOT,
      agentRunId: 'task-agent-run-1',
      resolveWorkspaceMetadataByRootPath: vi.fn(),
      ensureWorkspaceByRootPath: vi.fn(),
    })

    expect(hydrateLiveTeamRunContextMock).toHaveBeenCalledWith(expect.objectContaining({ agentRunId: 'task-agent-run-1' }))
    expect(hydrated.view.getFocusedAgentRunId()).toBe('task-agent-run-1')
    expect(result.focusedAgentRunId).toBe('task-agent-run-1')
  })

  it('opens an exact settled task Agent through the normal inactive historical path', async () => {
    const record = testTaskRecord({
      taskId: 'settled-task-1',
      delegatorAgentRunId: 'run-a',
      recipientAddress: '/member-b',
      target: { agentRunId: 'settled-task-agent-run-1' },
      status: 'interrupted',
    })
    const hydrated = makeTeam({
      focus: 'settled-task-agent-run-1',
      active: false,
      tasks: [record],
      taskExecutions: [{
        kind: 'task_agent', address: '/member-b', agent_run_id: 'settled-task-agent-run-1',
        platform_agent_run_id: null, started_at: '2026-08-14T12:00:00.000Z',
        settled_at: '2026-08-14T12:05:00.000Z',
      }],
    })
    getTeamContextByIdMock.mockReturnValue(null)
    hydrateLiveTeamRunContextMock.mockResolvedValue(hydration(hydrated))

    const result = await openTeamRun({
      teamRunId: ROOT,
      agentRunId: 'settled-task-agent-run-1',
      resolveWorkspaceMetadataByRootPath: vi.fn(),
      ensureWorkspaceByRootPath: vi.fn(),
    })

    expect(hydrated.view.getFocusedAgentRunId()).toBe('settled-task-agent-run-1')
    expect(result).toMatchObject({
      focusedAgentRunId: 'settled-task-agent-run-1',
      focusedMemberAddress: '/member-b',
    })
    expect(disconnectTeamStreamMock).toHaveBeenCalledWith(ROOT)
    expect(connectToTeamStreamMock).not.toHaveBeenCalled()
  })

  it('rejects an absent requested AgentRun without silently substituting another focus', async () => {
    getTeamContextByIdMock.mockReturnValue(null)
    hydrateLiveTeamRunContextMock.mockRejectedValue(
      new Error("Requested AgentRun 'missing-run' is not part of this Team execution."),
    )

    await expect(openTeamRun({
      teamRunId: ROOT,
      agentRunId: 'missing-run',
      resolveWorkspaceMetadataByRootPath: vi.fn(),
      ensureWorkspaceByRootPath: vi.fn(),
    })).rejects.toThrow("Requested AgentRun 'missing-run' is not part of this Team execution.")
    expect(addTeamContextMock).not.toHaveBeenCalled()
    expect(selectRunMock).not.toHaveBeenCalled()
  })

  it('leaves the fresh Team unpublished and unselected when Activity commit conflicts', async () => {
    const hydrated = makeTeam({ focus: 'run-b' })
    getTeamContextByIdMock.mockReturnValue(null)
    hydrateLiveTeamRunContextMock.mockResolvedValue(hydration(hydrated))
    commitActivitiesMock.mockImplementationOnce(() => {
      throw new Error("Team activity for 'team-1' changed before projection commit.")
    })

    await expect(openTeamRun({
      teamRunId: ROOT,
      agentRunId: 'run-b',
      resolveWorkspaceMetadataByRootPath: vi.fn(),
      ensureWorkspaceByRootPath: vi.fn(),
    })).rejects.toThrow("Team activity for 'team-1' changed before projection commit.")

    expect(addTeamContextMock).not.toHaveBeenCalled()
    expect(markAuthorityMock).not.toHaveBeenCalled()
    expect(selectRunMock).not.toHaveBeenCalled()
    expect(connectToTeamStreamMock).not.toHaveBeenCalled()
    expect(disconnectTeamStreamMock).not.toHaveBeenCalled()
  })

  it('uses navigation-free mobile selection and leaves an inactive projection disconnected', async () => {
    const hydrated = makeTeam({ active: false })
    getTeamContextByIdMock.mockReturnValue(null)
    hydrateLiveTeamRunContextMock.mockResolvedValue(hydration(hydrated))

    await openTeamRun({
      teamRunId: ROOT,
      selectionMode: 'mobile',
      resolveWorkspaceMetadataByRootPath: vi.fn(),
      ensureWorkspaceByRootPath: vi.fn(),
    })

    expect(selectRunWithoutShellNavigationMock).toHaveBeenCalledWith(ROOT, 'team')
    expect(selectRunMock).not.toHaveBeenCalled()
    expect(disconnectTeamStreamMock).toHaveBeenCalledWith(ROOT)
    expect(connectToTeamStreamMock).not.toHaveBeenCalled()
  })

  it('keeps the failed context unpublished until exact recovery candidate readiness', async () => {
    const failed = makeTeam({ focus: 'run-b' })
    const candidate = makeTeam({ focus: 'run-b' })
    getTeamContextByIdMock.mockReturnValue(failed)
    hydrateTeamRunContextForStreamRecoveryMock.mockResolvedValue({
      ...hydration(candidate),
      expectedBaseChangeSequence: 12,
    })

    const result = await reopenTeamRunAfterStreamLoss({
      teamRunId: ROOT,
      agentRunId: 'run-b',
      resolveWorkspaceMetadataByRootPath: vi.fn(),
      ensureWorkspaceByRootPath: vi.fn(),
    })

    expect(addTeamContextMock).not.toHaveBeenCalled()
    expect(replaceFailedTeamStreamMock).toHaveBeenCalledWith({
      rootTeamRunId: ROOT,
      candidateContext: candidate,
      expectedBaseChangeSequence: 12,
      beforeContextCommit: expect.any(Function),
    })
    const commit = replaceFailedTeamStreamMock.mock.calls[0]?.[0].beforeContextCommit
    commit()
    expect(commitActivitiesMock).toHaveBeenCalledWith(expect.objectContaining({ hydratedContext: candidate }))
    expect(markAuthorityMock).toHaveBeenCalledWith(expect.objectContaining({ hydratedContext: candidate }))
    expect(selectRunMock).toHaveBeenCalledWith(ROOT, 'team')
    expect(result).toMatchObject({ focusedAgentRunId: 'run-b', focusedMemberAddress: '/member-b' })
  })

  it('preserves selection when candidate replacement fails', async () => {
    const failed = makeTeam({ focus: 'run-a' })
    const candidate = makeTeam({ focus: 'run-b' })
    getTeamContextByIdMock.mockReturnValue(failed)
    hydrateTeamRunContextForStreamRecoveryMock.mockResolvedValue({
      ...hydration(candidate),
      expectedBaseChangeSequence: 12,
    })
    replaceFailedTeamStreamMock.mockRejectedValue(new Error('snapshot mismatch'))

    await expect(reopenTeamRunAfterStreamLoss({
      teamRunId: ROOT,
      agentRunId: 'run-b',
      resolveWorkspaceMetadataByRootPath: vi.fn(),
      ensureWorkspaceByRootPath: vi.fn(),
    })).rejects.toThrow('snapshot mismatch')

    expect(addTeamContextMock).not.toHaveBeenCalled()
    expect(selectRunMock).not.toHaveBeenCalled()
    expect(failed.view.getFocusedAgentRunId()).toBe('run-a')
  })
})
