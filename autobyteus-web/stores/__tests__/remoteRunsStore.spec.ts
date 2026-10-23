import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useRemoteRunsStore } from '../remoteRunsStore'
import { useWindowNodeContextStore } from '../windowNodeContextStore'

/** autobyteus-278: the window's remote runs, by run and by agent run, with their nodes' answers and Retry. */

const team = {
  kind: 'agent_team' as const, address: '/marketing_team', team_run_id: 'marketing-run', node_id: 'srv_docker', node_name: 'docker',
  coordinator_address: '/marketing_team/lead', members: [{ address: '/marketing_team/lead', agent_run_id: 'lead-run' }],
  delegator_agent_run_id: 'manager-run', started_at: '2026-10-23T08:00:00.000Z',
}

describe('remoteRunsStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it("registers a root's remote run; an answer it had stays when the view republishes", () => {
    const store = useRemoteRunsStore()
    store.register(team, () => undefined)
    expect(store.runOfAgentRun('lead-run')).toMatchObject({ runId: 'marketing-run', nodeName: 'docker', reachable: null, title: null })
    store.applySummary({ node_id: 'srv_docker', run_id: 'marketing-run', reachable: true, title: 'Plan the October campaign', statuses: [] })
    store.register(team, () => undefined)
    expect(store.run('marketing-run')).toMatchObject({ reachable: true, title: 'Plan the October campaign' })
    store.applySummary({ node_id: 'srv_docker', run_id: 'marketing-run', reachable: false, title: null, statuses: [] })
    expect(store.run('marketing-run')).toMatchObject({ reachable: false, title: 'Plan the October campaign' })
    expect(store.runOfAgentRun('local-run')).toBeNull()
  })

  it('Retry shows checking and asks the owning root; the next answer ends it; rebinding the window forgets everything', () => {
    const store = useRemoteRunsStore()
    const retry = vi.fn()
    store.register(team, retry)
    store.retry('marketing-run')
    expect(retry).toHaveBeenCalledTimes(1)
    expect(store.run('marketing-run')?.checking).toBe(true)
    store.applySummary({ node_id: 'srv_docker', run_id: 'marketing-run', reachable: true, title: null, statuses: [] })
    expect(store.run('marketing-run')?.checking).toBe(false)
    useWindowNodeContextStore().bindingRevision += 1
    expect(store.run('marketing-run')).toBeNull()
  })
})
