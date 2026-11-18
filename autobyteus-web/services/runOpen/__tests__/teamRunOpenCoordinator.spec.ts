import { beforeEach, describe, expect, it, vi } from 'vitest'
import { openTeamRun, reopenTeamRunAfterStreamLoss } from '~/services/runOpen/teamRunOpenCoordinator'
import {
  buildTestTeamContext,
  testAgentNode,
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
  commitTeamRunHydrationMock,
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
  commitTeamRunHydrationMock: vi.fn(),
  markAuthorityMock: vi.fn(),
}))

vi.mock('~/services/runHydration/teamRunContextHydrationService', () => ({
  hydrateLiveTeamRunContext: hydrateLiveTeamRunContextMock,
  hydrateTeamRunContextForStreamRecovery: hydrateTeamRunContextForStreamRecoveryMock,
}))
vi.mock('~/services/runHydration/teamRunHydrationCommit', () => ({
  commitTeamRunHydration: commitTeamRunHydrationMock,
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
    beginSelectionIntent: () => ({ isCurrent: () => true }),
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
})

const hydration = (team: ReturnType<typeof makeTeam>) => ({
  teamRunId: ROOT,
  focusedAgentRunId: team.view.getFocusedAgentRunId(),
  resumeConfig: { teamRunId: ROOT, isActive: team.view.isRootTeamActive(), executionTree: team.view.getExecutionTree() },
  projectionByAgentRunId: new Map([[team.view.getFocusedAgentRunId(), {}]]),
  memberRunStates: [],
  hydratedContext: team,
  rebuild: { liveSequenceId: team.view.isRootTeamActive() ? 'live-1' : null, baseChangeSequence: 0, lastMessageChangeSequence: team.view.isRootTeamActive() ? 0 : null },
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
    expect(commitTeamRunHydrationMock).toHaveBeenCalledWith(expect.objectContaining({ hydratedContext: hydrated }))
    expect(addTeamContextMock).toHaveBeenCalledWith(hydrated)
    expect(markAuthorityMock).toHaveBeenCalledWith(expect.objectContaining({ hydratedContext: hydrated }))
    expect(selectRunMock).toHaveBeenCalledWith(ROOT, 'team')
    expect(selectDraftMock).toHaveBeenCalledWith(null)
    expect(clearAgentRunConfigMock).toHaveBeenCalledTimes(1)
  })

  it('preserves an exact requested member focus present in the hydrated execution state', async () => {
    const hydrated = makeTeam({ focus: 'run-b' })
    getTeamContextByIdMock.mockReturnValue(null)
    hydrateLiveTeamRunContextMock.mockResolvedValue(hydration(hydrated))

    const result = await openTeamRun({
      teamRunId: ROOT,
      agentRunId: 'run-b',
      resolveWorkspaceMetadataByRootPath: vi.fn(),
      ensureWorkspaceByRootPath: vi.fn(),
    })

    expect(hydrateLiveTeamRunContextMock).toHaveBeenCalledWith(expect.objectContaining({ agentRunId: 'run-b' }))
    expect(hydrated.view.getFocusedAgentRunId()).toBe('run-b')
    expect(result.disposition === 'committed' && result.focusedAgentRunId).toBe('run-b')
  })

  it('opens an exact member of a stopped Team through the normal inactive historical path', async () => {
    const hydrated = makeTeam({ focus: 'run-b', active: false })
    getTeamContextByIdMock.mockReturnValue(null)
    hydrateLiveTeamRunContextMock.mockResolvedValue(hydration(hydrated))

    const result = await openTeamRun({
      teamRunId: ROOT,
      agentRunId: 'run-b',
      resolveWorkspaceMetadataByRootPath: vi.fn(),
      ensureWorkspaceByRootPath: vi.fn(),
    })

    expect(hydrated.view.getFocusedAgentRunId()).toBe('run-b')
    expect(result).toMatchObject({
      focusedAgentRunId: 'run-b',
      focusedMemberAddress: '/member-b',
    })
    // The open stopped Team's view gets its stream (autobyteus-461 SR-045); connecting never starts the Team.
    expect(connectToTeamStreamMock).toHaveBeenCalledWith(ROOT)
    expect(disconnectTeamStreamMock).not.toHaveBeenCalled()
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
    commitTeamRunHydrationMock.mockImplementationOnce(() => {
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

  it('uses navigation-free mobile selection and connects the inactive Team\'s view stream (SR-045)', async () => {
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
    // The open stopped Team's view gets its stream (autobyteus-461 SR-045); connecting never starts the Team.
    expect(connectToTeamStreamMock).toHaveBeenCalledWith(ROOT)
    expect(disconnectTeamStreamMock).not.toHaveBeenCalled()
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
    expect(commitTeamRunHydrationMock).toHaveBeenCalledWith(expect.objectContaining({ hydratedContext: candidate }))
    expect(markAuthorityMock).toHaveBeenCalledWith(expect.objectContaining({ hydratedContext: candidate }))
    expect(selectRunMock).toHaveBeenCalledWith(ROOT, 'team')
    expect(result).toMatchObject({ focusedAgentRunId: 'run-b', focusedMemberAddress: '/member-b' })
  })

  it('preserves an exact member focus when replacing a failed active-root stream', async () => {
    const candidate = makeTeam({ focus: 'run-b', active: true })
    getTeamContextByIdMock.mockReturnValue(makeTeam())
    hydrateTeamRunContextForStreamRecoveryMock.mockResolvedValue({ ...hydration(candidate), expectedBaseChangeSequence: 12 })
    await expect(reopenTeamRunAfterStreamLoss({ teamRunId: ROOT, agentRunId: 'run-b',
      resolveWorkspaceMetadataByRootPath: vi.fn() })).resolves.toMatchObject({ focusedAgentRunId: 'run-b' })
    expect(candidate.view.getFocusedAgentAccess()).toBe('live')
    expect(candidate.view.isRootTeamActive()).toBe(true)
    expect(replaceFailedTeamStreamMock).toHaveBeenCalledTimes(1)
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
  it.each(['success', 'error'])('superseded cold Team %s cannot publish context, activities or selection', async (completion) => {
    getTeamContextByIdMock.mockReturnValue(null)
    let current = true, resolve!: (value: unknown) => void, reject!: (error: Error) => void
    hydrateLiveTeamRunContextMock.mockReturnValue(new Promise((yes, no) => { resolve = yes; reject = no }))
    const pending = openTeamRun({ teamRunId: ROOT, selectionIntent: { isCurrent: () => current }, resolveWorkspaceMetadataByRootPath: vi.fn() })
    current = false
    if (completion === 'success') resolve(hydration(makeTeam())); else reject(new Error('old failure'))
    expect(await pending).toEqual({ disposition: 'superseded' })
    expect(addTeamContextMock).not.toHaveBeenCalled(); expect(commitTeamRunHydrationMock).not.toHaveBeenCalled()
    expect(selectRunMock).not.toHaveBeenCalled(); expect(connectToTeamStreamMock).not.toHaveBeenCalled()
  })
  it('recovery checks the same guard at stream replacement beforeContextCommit', async () => {
    const currentTeam = makeTeam(), replacement = makeTeam()
    getTeamContextByIdMock.mockReturnValue(currentTeam)
    hydrateTeamRunContextForStreamRecoveryMock.mockResolvedValue(hydration(replacement))
    let current = true
    replaceFailedTeamStreamMock.mockImplementation(async ({ beforeContextCommit }) => { current = false; beforeContextCommit() })
    expect(await reopenTeamRunAfterStreamLoss({ teamRunId: ROOT, selectionIntent: { isCurrent: () => current }, resolveWorkspaceMetadataByRootPath: vi.fn() })).toEqual({ disposition: 'superseded' })
    expect(commitTeamRunHydrationMock).not.toHaveBeenCalled(); expect(markAuthorityMock).not.toHaveBeenCalled(); expect(selectRunMock).not.toHaveBeenCalled()
  })

})
