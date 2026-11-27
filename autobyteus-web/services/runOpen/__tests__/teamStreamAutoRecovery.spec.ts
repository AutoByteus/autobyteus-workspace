import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { startTeamStreamAutoRecovery, type TeamStreamAutoRecovery } from '~/services/runOpen/teamStreamAutoRecovery'
import { useTeamStreamRecoveryStore } from '~/stores/teamStreamRecoveryStore'
import {
  hidePage,
  installPageVisibilityControl,
  removePageVisibilityControl,
  showPage,
} from '~/services/liveStreamLifecycle/__tests__/pageVisibilityTestControl'

const { reopen, teams, reopenRequired } = vi.hoisted(() => ({
  reopen: vi.fn(),
  teams: new Map<string, { view: { isRootTeamActive(): boolean } }>(),
  reopenRequired: new Set<string>(),
}))

vi.mock('~/services/runOpen/teamRunOpenCoordinator', () => ({ reopenTeamRunAfterStreamLoss: reopen }))
vi.mock('~/stores/agentTeamContextsStore', () => ({
  useAgentTeamContextsStore: () => ({ getTeamContextById: (id: string) => teams.get(id) }),
}))
vi.mock('~/stores/agentTeamRunStore', () => ({
  useAgentTeamRunStore: () => ({ isTeamStreamReopenRequired: (id: string) => reopenRequired.has(id) }),
}))
vi.mock('~/stores/runHistoryLoadActions', () => ({
  ensureRunHistoryWorkspaceByRootPath: vi.fn(),
  resolveRunHistoryWorkspaceMetadataByRootPath: vi.fn(),
}))

const ROOT = 'team-auto'
const openTeam = (id = ROOT, active = true) => { teams.set(id, { view: { isRootTeamActive: () => active } }); reopenRequired.add(id) }
/** The store's side of a stream failure, then of the commit (what `agentTeamRunStore` does). */
const fail = async (id = ROOT) => { useTeamStreamRecoveryStore().publishRequired(id); await nextTick() }
const committed = async (id = ROOT) => { reopenRequired.delete(id); useTeamStreamRecoveryStore().clear(id); await nextTick() }
const settle = () => vi.advanceTimersByTimeAsync(0)

describe('teamStreamAutoRecovery (autobyteus-541 D-A2)', () => {
  let owner: TeamStreamAutoRecovery

  beforeEach(() => {
    vi.useFakeTimers()
    installPageVisibilityControl()
    setActivePinia(createPinia())
    teams.clear()
    reopenRequired.clear()
    reopen.mockReset()
    owner = startTeamStreamAutoRecovery()
  })
  afterEach(() => {
    owner.dispose()
    removePageVisibilityControl()
    vi.useRealTimers()
  })

  it('recovers a failed Team at once, without a reselect, through the verified replacement', async () => {
    openTeam()
    reopen.mockImplementation(async () => { await committed(); return { disposition: 'committed' } })
    await fail()
    await settle()

    expect(reopen).toHaveBeenCalledTimes(1)
    expect(reopen).toHaveBeenCalledWith(expect.objectContaining({ teamRunId: ROOT, selectRun: false }))
    expect(useTeamStreamRecoveryStore().stateOf(ROOT)).toBeNull()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(reopen).toHaveBeenCalledTimes(1)
  })

  it('tries again on the reconnect cadence; the fifth failure shows the notice and the attempts go on', async () => {
    openTeam()
    reopen.mockRejectedValue(new Error('TEAM_STREAM_RECOVERY_WAIT: still working'))
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    await fail()
    await settle()
    expect(useTeamStreamRecoveryStore().stateOf(ROOT)).toBe('recovering')
    expect(reopen).toHaveBeenCalledTimes(1)

    // Waits 1, 2, 4 and 8 s: attempts 2 to 5.
    for (const [wait, attempts] of [[1_000, 2], [2_000, 3], [4_000, 4], [8_000, 5]] as const) {
      await vi.advanceTimersByTimeAsync(wait - 1)
      expect(reopen).toHaveBeenCalledTimes(attempts - 1)
      await vi.advanceTimersByTimeAsync(1)
      expect(reopen).toHaveBeenCalledTimes(attempts)
    }
    expect(useTeamStreamRecoveryStore().stateOf(ROOT)).toBe('exhausted')

    // It goes on (16 s later), and a success ends it and its notice.
    reopen.mockImplementation(async () => { await committed(); return { disposition: 'committed' } })
    await vi.advanceTimersByTimeAsync(16_000)
    expect(reopen).toHaveBeenCalledTimes(6)
    expect(useTeamStreamRecoveryStore().stateOf(ROOT)).toBeNull()
  })

  it('makes no attempt while the page is hidden; the page coming back attempts at once', async () => {
    openTeam()
    reopen.mockRejectedValueOnce(new Error('offline'))
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    await fail()
    await settle()
    hidePage()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(reopen).toHaveBeenCalledTimes(1)
    reopen.mockImplementation(async () => { await committed(); return { disposition: 'committed' } })
    showPage()
    await settle()
    expect(reopen).toHaveBeenCalledTimes(2)
  })

  it.each([
    ['the Team context is removed', () => { teams.delete(ROOT) }],
    ['a reselect recovered the stream', () => { reopenRequired.delete(ROOT) }],
  ])('ends without counting a failure when %s', async (_name, change) => {
    openTeam()
    reopen.mockRejectedValueOnce(new Error('checkpoint moved'))
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    await fail()
    await settle()
    change()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(reopen).toHaveBeenCalledTimes(1)
    expect(useTeamStreamRecoveryStore().stateOf(ROOT)).not.toBe('exhausted')
  })

  it('ends when the store clears the Team (its stream closed)', async () => {
    openTeam()
    reopen.mockRejectedValue(new Error('down'))
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    await fail()
    await settle()
    useTeamStreamRecoveryStore().clear(ROOT)
    await nextTick()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(reopen).toHaveBeenCalledTimes(1)
  })

  it('recovers a stopped Team whose view is open too (N-4)', async () => {
    openTeam(ROOT, false)
    reopen.mockImplementation(async () => { await committed(); return { disposition: 'committed' } })
    await fail()
    await settle()
    expect(reopen).toHaveBeenCalledWith(expect.objectContaining({ teamRunId: ROOT, selectRun: false }))
  })

  it('a later failure of the replacement starts a new recovery', async () => {
    openTeam()
    reopen.mockImplementation(async () => { await committed(); return { disposition: 'committed' } })
    await fail()
    await settle()
    reopenRequired.add(ROOT)
    await fail()
    await settle()
    expect(reopen).toHaveBeenCalledTimes(2)
  })

  it('each failed Team has its own recovery', async () => {
    openTeam('team-a')
    openTeam('team-b')
    reopen.mockImplementation(async ({ teamRunId }: { teamRunId: string }) => {
      if (teamRunId === 'team-a') throw new Error('a is busy')
      await committed(teamRunId)
      return { disposition: 'committed' }
    })
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    await fail('team-a')
    await fail('team-b')
    await settle()
    expect(useTeamStreamRecoveryStore().stateOf('team-a')).toBe('recovering')
    expect(useTeamStreamRecoveryStore().stateOf('team-b')).toBeNull()
  })

  it('once disposed, a failed stream has no owner and fails loudly (D-A1)', () => {
    owner.dispose()
    expect(() => useTeamStreamRecoveryStore().publishRequired(ROOT)).toThrow('No Team stream recovery owner')
    owner = startTeamStreamAutoRecovery()
  })
})
