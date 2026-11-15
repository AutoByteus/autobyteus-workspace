import { describe, expect, it, vi, beforeEach } from 'vitest'
import { computed, effectScope, ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

/**
 * autobyteus-461 SR-084 (CR-461-079, CR-461-086 folded in; F-61, F-62): Settings' delegated rows are the open run's tree's
 * rows, held while Settings shows them, live or stopped; each delegated run's liveness is its own status, not its
 * delegator's.
 */
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: async () => ({ data: { runTree: null } }) }) }))

import { useDelegatedRunRows } from '../useDelegatedRunRows'
import { useRunStatusStore } from '~/stores/runStatusStore'
import { useRunTreeStore } from '~/stores/runTreeStore'
import { agentRow } from '~/test-support/runTreeFixtures'
import { NO_CONTROL_FOR_TESTS } from './noControl'

beforeEach(() => setActivePinia(createPinia()))

describe('useDelegatedRunRows (SR-084)', () => {
  it('F-61: a stopped Team\'s rows are its tree\'s, held while shown; F-62: a live delegated run of the stopped Team is live by its own status', () => {
    const runStatus = useRunStatusStore()
    const trees = useRunTreeStore()
    const hold = vi.spyOn(trees, 'hold')
    trees.streamSnapshot({ kind: 'agent_team', runId: 'team-1' }, [
      { key: 'team:team-1', parentKey: null, depth: 0, kind: 'team', name: 'PM', address: null, openTarget: null, statusIds: ['team-1'] },
      { ...agentRow('copy', 'team:team-1', 1, 'writer'), address: '/writer' },
    ])
    const draft = ref<unknown>({ kind: 'team', teamRunId: 'team-1', isActive: false })
    const live = (id: string) => rows.isAgentLive(id)
    const control = computed(() => ({ ...NO_CONTROL_FOR_TESTS, isAgentLive: live }))
    let rows!: ReturnType<typeof useDelegatedRunRows>
    const scope = effectScope()
    scope.run(() => { rows = useDelegatedRunRows({ draft: draft as never, control, schemaFor: () => null }) })
    expect(hold).toHaveBeenLastCalledWith({ kind: 'agent_team', runId: 'team-1' })
    expect(rows.rows.value.map((row) => row.key)).toEqual(['agent:copy'])
    expect([...rows.saveTargets.value.keys()]).toEqual(['agent:copy'])
    expect(rows.rows.value[0]!.delegated?.running).toBe(false)
    runStatus.apply({ type: 'RUN_STATUS_SNAPSHOT', payload: { runs: [{ kind: 'agent', runId: 'copy', answer: 'ok', node: null, status: 'idle', agents: [{ agentRunId: 'copy', status: 'idle' }] }] } })
    expect(rows.rows.value[0]!.delegated?.running).toBe(true)
    // Another run: its own tree (not yet answered), never the last one's rows.
    draft.value = { kind: 'team', teamRunId: 'team-2', isActive: false }
    expect(rows.rows.value).toEqual([])
    scope.stop()
  })
})
