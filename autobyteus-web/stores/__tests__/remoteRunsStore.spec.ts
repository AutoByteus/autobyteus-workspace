import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useRemoteRunsStore } from '../remoteRunsStore'
import { useWindowNodeContextStore } from '../windowNodeContextStore'
import { streamOnlyRetryAdapter } from '~/test-support/remoteRunRetryAdapter'

/** autobyteus-278: the window's remote runs, by run and by agent run, with their nodes' answers and Retry. */

const team = {
  kind: 'agent_team' as const, address: '/marketing_team', team_run_id: 'marketing-run', node_id: 'srv_docker', node_name: 'docker',
  coordinator_address: '/marketing_team/lead',
  members: [{ address: '/marketing_team/lead', agent_run_id: 'lead-run' }, { address: '/marketing_team/writer', agent_run_id: 'writer-run' }],
  delegator_agent_run_id: 'manager-run', started_at: '2026-10-23T08:00:00.000Z',
}

/** A family's adapter: its stream answers `refreshed`; `loaded` agents are loaded; a read starts for any other agent. */
const adapter = (input: { refreshed: boolean; selected?: string | null; loaded?: readonly string[] }) => {
  const loaded = new Set(input.loaded ?? [])
  const reads: string[] = []
  return {
    reads,
    refreshOnStream: vi.fn(() => input.refreshed),
    selectedAgent: () => input.selected ?? null,
    isLoaded: (agentRunId: string) => loaded.has(agentRunId),
    rereadAgent: vi.fn((agentRunId: string) => {
      if (loaded.has(agentRunId)) return false
      reads.push(agentRunId)
      return true
    }),
  }
}

describe('remoteRunsStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it("registers a root's remote run; an answer it had stays when the view republishes", () => {
    const store = useRemoteRunsStore()
    store.register(team, streamOnlyRetryAdapter())
    expect(store.runOfAgentRun('lead-run')).toMatchObject({ runId: 'marketing-run', nodeName: 'docker', reachable: null, title: null })
    store.applySummary({ node_id: 'srv_docker', run_id: 'marketing-run', reachable: true, title: 'Plan the October campaign', statuses: [] })
    store.register(team, streamOnlyRetryAdapter())
    expect(store.run('marketing-run')).toMatchObject({ reachable: true, title: 'Plan the October campaign' })
    store.applySummary({ node_id: 'srv_docker', run_id: 'marketing-run', reachable: false, title: null, statuses: [] })
    expect(store.run('marketing-run')).toMatchObject({ reachable: false, title: 'Plan the October campaign' })
    expect(store.runOfAgentRun('local-run')).toBeNull()
  })

  it("Retry's answer ends 'Checking'; a read's answer too; rebinding the window forgets everything", () => {
    const store = useRemoteRunsStore()
    store.register(team, streamOnlyRetryAdapter())
    store.retry('marketing-run')
    expect(store.run('marketing-run')?.checking).toBe(true)
    store.applySummary({ node_id: 'srv_docker', run_id: 'marketing-run', reachable: true, title: null, statuses: [] })
    expect(store.run('marketing-run')?.checking).toBe(false)
    store.retry('marketing-run')
    store.markReachable('marketing-run', true)
    expect(store.run('marketing-run')).toMatchObject({ reachable: true, checking: false })
    useWindowNodeContextStore().bindingRevision += 1
    expect(store.run('marketing-run')).toBeNull()
  })
})

/** SR-008 (AR-404): the one Retry rule, the same for every family. */
describe('the Retry rule', () => {
  beforeEach(() => setActivePinia(createPinia()))
  const retryWith = (family: ReturnType<typeof adapter>) => {
    const store = useRemoteRunsStore()
    store.register(team, family)
    store.retry('marketing-run')
    return { store, checking: store.run('marketing-run')!.checking }
  }

  it('refreshes on the stream and reads the selected agent of the run when it is not loaded', () => {
    const family = adapter({ refreshed: true, selected: 'writer-run', loaded: ['lead-run'] })
    expect(retryWith(family).checking).toBe(true)
    expect(family.refreshOnStream).toHaveBeenCalledTimes(1)
    expect(family.reads).toEqual(['writer-run'])
  })

  it('without a selected agent of the run, reads the first agent that is not loaded, whether or not the stream refreshed', () => {
    for (const refreshed of [true, false]) {
      const family = adapter({ refreshed, selected: 'another-run', loaded: ['lead-run'] })
      expect(retryWith(family).checking).toBe(true)
      expect(family.reads).toEqual(['writer-run'])
    }
  })

  it('a loaded selected agent is not replaced by another (N-407): with a refresh it waits for the answer; without, it settles', () => {
    const refreshing = adapter({ refreshed: true, selected: 'lead-run', loaded: ['lead-run'] })
    expect(retryWith(refreshing).checking).toBe(true)
    expect(refreshing.rereadAgent).toHaveBeenCalledWith('lead-run')
    expect(refreshing.reads).toEqual([])
    const idle = adapter({ refreshed: false, selected: 'lead-run', loaded: ['lead-run'] })
    expect(retryWith(idle).checking).toBe(false)
    expect(idle.reads).toEqual([])
  })

  it('every agent loaded and no stream: nothing is asked, so it settles at once', () => {
    const family = adapter({ refreshed: false, loaded: ['lead-run', 'writer-run'] })
    expect(retryWith(family).checking).toBe(false)
    expect(family.rereadAgent).not.toHaveBeenCalled()
  })

  it('a read that does not start and no stream: it settles at once', () => {
    const family = { ...adapter({ refreshed: false }), rereadAgent: vi.fn(() => false) }
    expect(retryWith(family).checking).toBe(false)
    expect(family.rereadAgent).toHaveBeenCalledWith('lead-run')
  })
})
