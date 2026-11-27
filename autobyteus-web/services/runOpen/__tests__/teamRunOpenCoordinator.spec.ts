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
  ensureMemberProjectionMock,
  refreshTopologyMock,
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
  ensureMemberProjectionMock: vi.fn(),
  refreshTopologyMock: vi.fn(),
}))
vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => ({ refreshRunNavigationTopology: refreshTopologyMock }) }))

vi.mock('~/services/runHydration/teamRunContextHydrationService', () => ({
  hydrateLiveTeamRunContext: hydrateLiveTeamRunContextMock,
  hydrateTeamRunContextForStreamRecovery: hydrateTeamRunContextForStreamRecoveryMock,
}))
vi.mock('~/services/runHydration/teamRunHydrationCommit', () => ({
  commitTeamRunHydration: commitTeamRunHydrationMock,
  markCommittedTeamRunHydrationAuthority: markAuthorityMock,
}))
vi.mock('~/services/runHydration/teamMemberProjectionHydrationService', () => ({
  ensureAuthoritativeTeamMemberProjection: ensureMemberProjectionMock,
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
  // autobyteus-541 D-A3: the recovery is shared, so a superseded selection no longer aborts it; it only selects nothing.
  it('a reselect superseded during the replacement recovers the stream and selects nothing', async () => {
    const currentTeam = makeTeam(), replacement = makeTeam()
    getTeamContextByIdMock.mockReturnValue(currentTeam)
    hydrateTeamRunContextForStreamRecoveryMock.mockResolvedValue(hydration(replacement))
    let current = true
    replaceFailedTeamStreamMock.mockImplementation(async ({ beforeContextCommit }) => { current = false; beforeContextCommit() })
    expect(await reopenTeamRunAfterStreamLoss({ teamRunId: ROOT, selectionIntent: { isCurrent: () => current }, resolveWorkspaceMetadataByRootPath: vi.fn() })).toEqual({ disposition: 'superseded' })
    expect(commitTeamRunHydrationMock).toHaveBeenCalledTimes(1); expect(markAuthorityMock).toHaveBeenCalledTimes(1)
    expect(selectRunMock).not.toHaveBeenCalled()
  })

  describe('one recovery per Team (autobyteus-541 D-A3, AC-003)', () => {
    const deferred = () => {
      let resolve!: (value: unknown) => void, reject!: (error: Error) => void
      const promise = new Promise((yes, no) => { resolve = yes; reject = no })
      return { promise, resolve, reject }
    }

    it('a reselect during the automatic recovery joins it: one read, one replacement, then its selection', async () => {
      const replacement = makeTeam({ focus: 'run-a' })
      getTeamContextByIdMock.mockReturnValue(makeTeam({ focus: 'run-a' }))
      const read = deferred()
      hydrateTeamRunContextForStreamRecoveryMock.mockReturnValue(read.promise)
      const automatic = reopenTeamRunAfterStreamLoss({ teamRunId: ROOT, selectRun: false, resolveWorkspaceMetadataByRootPath: vi.fn() })
      const reselect = reopenTeamRunAfterStreamLoss({ teamRunId: ROOT, agentRunId: 'run-a', resolveWorkspaceMetadataByRootPath: vi.fn() })
      read.resolve({ ...hydration(replacement), expectedBaseChangeSequence: 3 })

      await expect(automatic).resolves.toMatchObject({ disposition: 'committed', focusedAgentRunId: 'run-a' })
      await expect(reselect).resolves.toMatchObject({ disposition: 'committed', focusedAgentRunId: 'run-a' })
      expect(hydrateTeamRunContextForStreamRecoveryMock).toHaveBeenCalledTimes(1)
      expect(replaceFailedTeamStreamMock).toHaveBeenCalledTimes(1)
      expect(selectRunMock).toHaveBeenCalledTimes(1)
      expect(selectRunMock).toHaveBeenCalledWith(ROOT, 'team')
      expect(ensureMemberProjectionMock).not.toHaveBeenCalled()
    })

    it('a reselect of another member joins the recovery, then loads and focuses that member', async () => {
      const replacement = makeTeam({ focus: 'run-a' })
      getTeamContextByIdMock.mockReturnValue(makeTeam({ focus: 'run-a' }))
      const read = deferred()
      hydrateTeamRunContextForStreamRecoveryMock.mockReturnValue(read.promise)
      ensureMemberProjectionMock.mockResolvedValue({ disposition: 'authoritative', agentRunId: 'run-b' })
      void reopenTeamRunAfterStreamLoss({ teamRunId: ROOT, selectRun: false, resolveWorkspaceMetadataByRootPath: vi.fn() })
      const reselect = reopenTeamRunAfterStreamLoss({ teamRunId: ROOT, agentRunId: 'run-b', resolveWorkspaceMetadataByRootPath: vi.fn() })
      read.resolve({ ...hydration(replacement), expectedBaseChangeSequence: 3 })

      await expect(reselect).resolves.toMatchObject({ disposition: 'committed', focusedAgentRunId: 'run-b', focusedMemberAddress: '/member-b' })
      expect(replaceFailedTeamStreamMock).toHaveBeenCalledTimes(1)
      expect(ensureMemberProjectionMock).toHaveBeenCalledWith(expect.objectContaining({ team: replacement, agentRunId: 'run-b' }))
      expect(replacement.view.getFocusedAgentRunId()).toBe('run-b')
    })

    it('a reselect whose joined recovery failed runs its own attempt', async () => {
      const replacement = makeTeam({ focus: 'run-b' })
      getTeamContextByIdMock.mockReturnValue(makeTeam({ focus: 'run-a' }))
      const failing = deferred()
      hydrateTeamRunContextForStreamRecoveryMock
        .mockReturnValueOnce(failing.promise)
        .mockResolvedValueOnce({ ...hydration(replacement), expectedBaseChangeSequence: 4 })
      const automatic = reopenTeamRunAfterStreamLoss({ teamRunId: ROOT, selectRun: false, resolveWorkspaceMetadataByRootPath: vi.fn() })
      const reselect = reopenTeamRunAfterStreamLoss({ teamRunId: ROOT, agentRunId: 'run-b', resolveWorkspaceMetadataByRootPath: vi.fn() })
      failing.reject(new Error('TEAM_STREAM_RECOVERY_CHECKPOINT_CHANGED: moved'))

      await expect(automatic).rejects.toThrow('TEAM_STREAM_RECOVERY_CHECKPOINT_CHANGED')
      await expect(reselect).resolves.toMatchObject({ disposition: 'committed', focusedAgentRunId: 'run-b' })
      expect(hydrateTeamRunContextForStreamRecoveryMock).toHaveBeenCalledTimes(2)
      expect(hydrateTeamRunContextForStreamRecoveryMock).toHaveBeenLastCalledWith(expect.objectContaining({ agentRunId: 'run-b' }))
      expect(replaceFailedTeamStreamMock).toHaveBeenCalledTimes(1)
      expect(selectRunMock).toHaveBeenCalledTimes(1)
    })

    // CR-001: a focus path that does not join the recovery (an execution link → a mounted Team's inspection) moved the
    // user to another member while the automatic attempt read the Team; the commit keeps that member.
    const commitSwapsContext = (replacementOf: () => ReturnType<typeof makeTeam>) => {
      replaceFailedTeamStreamMock.mockImplementation(async ({ beforeContextCommit }) => {
        beforeContextCommit()
        const replacement = replacementOf()
        getTeamContextByIdMock.mockReturnValue(replacement)
      })
    }

    it('keeps the member the user focused on the old context during the read: loaded, then focused', async () => {
      const old = makeTeam({ focus: 'run-a' })
      const replacement = makeTeam({ focus: 'run-a' })
      getTeamContextByIdMock.mockReturnValue(old)
      commitSwapsContext(() => replacement)
      const read = deferred()
      hydrateTeamRunContextForStreamRecoveryMock.mockReturnValue(read.promise)
      ensureMemberProjectionMock.mockResolvedValue({ disposition: 'authoritative', agentRunId: 'run-b' })
      const automatic = reopenTeamRunAfterStreamLoss({ teamRunId: ROOT, selectRun: false, resolveWorkspaceMetadataByRootPath: vi.fn() })
      // The link focuses the member on the mounted (old) context while the read runs.
      old.view.focusAgentForInspection('run-b')
      read.resolve({ ...hydration(replacement), expectedBaseChangeSequence: 3 })

      await expect(automatic).resolves.toMatchObject({ disposition: 'committed', focusedAgentRunId: 'run-b', focusedMemberAddress: '/member-b' })
      expect(hydrateTeamRunContextForStreamRecoveryMock).toHaveBeenCalledWith(expect.objectContaining({ agentRunId: 'run-a' }))
      expect(ensureMemberProjectionMock).toHaveBeenCalledWith({ team: replacement, agentRunId: 'run-b' })
      expect(replacement.view.getFocusedAgentRunId()).toBe('run-b')
      // The run tree's selected row follows (its navigation projection is rebuilt after the focus moved).
      expect(refreshTopologyMock).toHaveBeenCalledWith('team-stream-recovery-focus')
      expect(ensureMemberProjectionMock.mock.invocationCallOrder[0])
        .toBeGreaterThan(replaceFailedTeamStreamMock.mock.invocationCallOrder[0]!)
    })

    it('loads nothing more when the focus did not move during the read', async () => {
      const replacement = makeTeam({ focus: 'run-a' })
      getTeamContextByIdMock.mockReturnValue(makeTeam({ focus: 'run-a' }))
      commitSwapsContext(() => replacement)
      hydrateTeamRunContextForStreamRecoveryMock.mockResolvedValue({ ...hydration(replacement), expectedBaseChangeSequence: 3 })

      await reopenTeamRunAfterStreamLoss({ teamRunId: ROOT, selectRun: false, resolveWorkspaceMetadataByRootPath: vi.fn() })
      expect(ensureMemberProjectionMock).not.toHaveBeenCalled()
      expect(replacement.view.getFocusedAgentRunId()).toBe('run-a')
      expect(refreshTopologyMock).not.toHaveBeenCalled()
    })

    it('keeps the read\'s member when the moved-to member cannot be loaded', async () => {
      const old = makeTeam({ focus: 'run-a' })
      const replacement = makeTeam({ focus: 'run-a' })
      getTeamContextByIdMock.mockReturnValue(old)
      commitSwapsContext(() => replacement)
      const read = deferred()
      hydrateTeamRunContextForStreamRecoveryMock.mockReturnValue(read.promise)
      ensureMemberProjectionMock.mockRejectedValue(new Error('member read failed'))
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const automatic = reopenTeamRunAfterStreamLoss({ teamRunId: ROOT, selectRun: false, resolveWorkspaceMetadataByRootPath: vi.fn() })
      old.view.focusAgentForInspection('run-b')
      read.resolve({ ...hydration(replacement), expectedBaseChangeSequence: 3 })

      // The stream recovered all the same; the recovery is not counted as failed.
      await expect(automatic).resolves.toMatchObject({ disposition: 'committed', focusedAgentRunId: 'run-a' })
      expect(warn).toHaveBeenCalled()
      warn.mockRestore()
    })

    it('a call after a recovery ended starts a new one', async () => {
      getTeamContextByIdMock.mockReturnValue(makeTeam())
      hydrateTeamRunContextForStreamRecoveryMock.mockImplementation(async () => ({ ...hydration(makeTeam()), expectedBaseChangeSequence: 1 }))
      await reopenTeamRunAfterStreamLoss({ teamRunId: ROOT, selectRun: false, resolveWorkspaceMetadataByRootPath: vi.fn() })
      await reopenTeamRunAfterStreamLoss({ teamRunId: ROOT, selectRun: false, resolveWorkspaceMetadataByRootPath: vi.fn() })
      expect(hydrateTeamRunContextForStreamRecoveryMock).toHaveBeenCalledTimes(2)
    })
  })

})
