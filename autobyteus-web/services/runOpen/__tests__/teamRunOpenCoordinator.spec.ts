import { beforeEach, describe, expect, it, vi } from 'vitest'
import { openTeamRun } from '~/services/runOpen/teamRunOpenCoordinator'
import { createTeamExecutionAddress } from '~/types/agent/TeamExecutionAddress'
import {
  buildTestTeamContext,
  testAgentNode,
  testTaskProjection,
} from '~/test-support/currentTeamTestFixtures'

const {
  hydrateLiveTeamRunContextMock,
  getTeamContextByIdMock,
  addTeamContextMock,
  connectToTeamStreamMock,
  disconnectTeamStreamMock,
  selectRunMock,
  selectRunWithoutShellNavigationMock,
  selectDraftMock,
  clearAgentRunConfigMock,
} = vi.hoisted(() => ({
  hydrateLiveTeamRunContextMock: vi.fn(),
  getTeamContextByIdMock: vi.fn(),
  addTeamContextMock: vi.fn(),
  connectToTeamStreamMock: vi.fn(),
  disconnectTeamStreamMock: vi.fn(),
  selectRunMock: vi.fn(),
  selectRunWithoutShellNavigationMock: vi.fn(),
  selectDraftMock: vi.fn(),
  clearAgentRunConfigMock: vi.fn(),
}))

vi.mock('~/services/runHydration/teamRunContextHydrationService', () => ({
  hydrateLiveTeamRunContext: hydrateLiveTeamRunContextMock,
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
const address = (
  memberAddress: string,
  taskTeamRunIds: string[] = [],
  taskAgentRunId: string | null = null,
) => createTeamExecutionAddress({ rootTeamRunId: ROOT, memberAddress, taskTeamRunIds, taskAgentRunId })

const makeTeam = (input: {
  focus?: ReturnType<typeof address>
  active?: boolean
  tasks?: ReturnType<typeof testTaskProjection>[]
} = {}) => buildTestTeamContext({
  teamRunId: ROOT,
  teamDefinitionId: 'team-def-1',
  teamDefinitionName: 'Team',
  coordinatorAddress: '/member-a',
  focusedExecutionAddress: input.focus ?? address('/member-a'),
  rootChildren: [
    testAgentNode('/member-a', { displayName: 'Member A', agentRunId: 'run-a' }),
    testAgentNode('/member-b', { displayName: 'Member B', agentRunId: 'run-b' }),
  ],
  isActive: input.active ?? true,
  tasks: input.tasks,
})

const hydration = (team: ReturnType<typeof makeTeam>) => ({
  resumeConfig: { teamRunId: ROOT, isActive: team.executions.isRootTeamActive(), metadata: {} },
  hydratedContext: team,
})

describe('openTeamRun current exact execution identity', () => {
  beforeEach(() => vi.clearAllMocks())

  it('uses the existing exact focus as the hydration request and replaces it with the current projection', async () => {
    const existing = makeTeam({ focus: address('/member-b') })
    const hydrated = makeTeam({ focus: address('/member-b') })
    getTeamContextByIdMock.mockReturnValue(existing)
    hydrateLiveTeamRunContextMock.mockResolvedValue(hydration(hydrated))

    const result = await openTeamRun({
      teamRunId: ROOT,
      resolveWorkspaceMetadataByRootPath: vi.fn(),
      ensureWorkspaceByRootPath: vi.fn(),
    })

    expect(hydrateLiveTeamRunContextMock).toHaveBeenCalledWith(expect.objectContaining({
      teamRunId: ROOT,
      memberAddress: '/member-b',
    }))
    expect(addTeamContextMock).toHaveBeenCalledWith(hydrated)
    expect(result.focusedExecutionAddress).toEqual(address('/member-b'))
    expect(connectToTeamStreamMock).toHaveBeenCalledWith(ROOT)
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

    expect(hydrated.topology.rootTeam.children.map((node) => node.address)).toEqual(['/member-a', '/member-b'])
    expect(hydrated.executions.hasExecution(address('/member-a'))).toBe(true)
    expect(addTeamContextMock).toHaveBeenCalledWith(hydrated)
    expect(selectRunMock).toHaveBeenCalledWith(ROOT, 'team')
    expect(selectDraftMock).toHaveBeenCalledWith(null)
    expect(clearAgentRunConfigMock).toHaveBeenCalledTimes(1)
  })

  it('preserves an exact requested task-Agent focus present in the hydrated execution state', async () => {
    const taskAddress = address('/member-b', [], 'task-agent-run-1')
    const hydrated = makeTeam({
      tasks: [testTaskProjection({
        taskId: 'task-1',
        executionAddress: taskAddress,
        senderAddress: address('/member-a'),
      })],
    })
    getTeamContextByIdMock.mockReturnValue(makeTeam())
    hydrateLiveTeamRunContextMock.mockResolvedValue(hydration(hydrated))

    const result = await openTeamRun({
      teamRunId: ROOT,
      executionAddress: taskAddress,
      resolveWorkspaceMetadataByRootPath: vi.fn(),
      ensureWorkspaceByRootPath: vi.fn(),
    })

    expect(hydrateLiveTeamRunContextMock).toHaveBeenCalledWith(expect.objectContaining({ memberAddress: '/member-b' }))
    expect(hydrated.executions.getFocusedAddress()).toEqual(taskAddress)
    expect(result.focusedExecutionAddress).toEqual(taskAddress)
  })

  it('falls back to the hydrated focus when a requested execution identity is absent', async () => {
    const hydrated = makeTeam({ focus: address('/member-a') })
    getTeamContextByIdMock.mockReturnValue(makeTeam())
    hydrateLiveTeamRunContextMock.mockResolvedValue(hydration(hydrated))

    const result = await openTeamRun({
      teamRunId: ROOT,
      executionAddress: address('/missing-member'),
      resolveWorkspaceMetadataByRootPath: vi.fn(),
      ensureWorkspaceByRootPath: vi.fn(),
    })

    expect(result.focusedExecutionAddress).toEqual(address('/member-a'))
    expect(hydrated.executions.getFocusedAddress()).toEqual(address('/member-a'))
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
})
