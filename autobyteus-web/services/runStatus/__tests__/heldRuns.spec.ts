import { describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, reactive } from 'vue'
import { heldRunsKey, watchHeldRuns } from '../heldRuns'

/**
 * autobyteus-461 CR-461-094: a view's held runs change only when the set of runs changes. A view reads its rows again
 * whenever anything it reads changes (an agent's status among them); holding again on every such read made the node close
 * and reopen each run's statuses in a loop (a peer run's observation on its own node), so a status never settled.
 */
describe('watchHeldRuns', () => {
  it('holds once while only what the view reads (a status) changes; holds again, then releases, when the runs change', async () => {
    const view = reactive({ rows: [{ kind: 'agent' as const, runId: 'copy' }, { kind: 'agent_team' as const, runId: 'squad' }], status: 'idle' })
    const released: string[] = []
    const hold = vi.fn((refs: readonly { kind: string; runId: string }[]) => () => { released.push(heldRunsKey(refs as never)) })
    const scope = effectScope()
    // As a view's rows do: they read the agents' statuses too.
    scope.run(() => watchHeldRuns(() => view.rows.map((row) => ({ ...row, status: view.status })) as never, hold as never))
    expect(hold).toHaveBeenCalledTimes(1)
    expect(hold).toHaveBeenLastCalledWith([{ kind: 'agent', runId: 'copy' }, { kind: 'agent_team', runId: 'squad' }])
    for (const status of ['running', 'idle', 'offline']) { view.status = status; await nextTick() }
    view.rows = [...view.rows]
    await nextTick()
    expect(hold).toHaveBeenCalledTimes(1)
    expect(released).toEqual([])
    view.rows = [...view.rows, { kind: 'agent', runId: 'peer' }]
    await nextTick()
    expect(hold).toHaveBeenCalledTimes(2)
    expect(released).toEqual(['agent:copy|agent_team:squad'])
    scope.stop()
    expect(released).toEqual(['agent:copy|agent_team:squad', 'agent:copy|agent:peer|agent_team:squad'])
  })

  it('holds nothing while no run is shown', async () => {
    const view = reactive({ rows: [] as { kind: 'agent'; runId: string }[] })
    const hold = vi.fn(() => () => undefined)
    const scope = effectScope()
    scope.run(() => watchHeldRuns(() => view.rows, hold))
    expect(hold).not.toHaveBeenCalled()
    view.rows = [{ kind: 'agent', runId: 'a' }]
    await nextTick()
    expect(hold).toHaveBeenCalledWith([{ kind: 'agent', runId: 'a' }])
    scope.stop()
  })
})
