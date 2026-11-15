import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick, reactive } from 'vue'

/**
 * autobyteus-461 SR-083 (FU-026, F-62): Team and Org views show each delegated or peer run's status as that run answers
 * it by run ID; each open view holds the runs its rows show. A delegated run's stop icon reads its own run's status.
 */
const mocks = vi.hoisted(() => ({ teams: new Map<string, unknown>(), orgs: {} as Record<string, unknown> }))
vi.mock('~/stores/agentTeamContextsStore', () => ({ useAgentTeamContextsStore: () => ({ teams: mocks.teams }) }))
vi.mock('~/stores/agentOrgContextsStore', () => ({ useAgentOrgContextsStore: () => ({ contexts: mocks.orgs }) }))

import { installViewRunStatusBridge } from '../viewRunStatusBridge'
import { useRunStatusStore } from '~/stores/runStatusStore'
import { isDelegatedCopyLive } from '~/services/runConfigEditing/delegatedCopyLiveness'

const agent = () => reactive({ state: { currentStatus: 'offline' } })
beforeEach(() => { setActivePinia(createPinia()); mocks.teams.clear(); for (const key of Object.keys(mocks.orgs)) delete mocks.orgs[key] })

describe('the Team and Org views\' run status bridge (SR-083)', () => {
  it('holds the runs a Team view\'s rows show and shows each agent\'s status as its own run answers it', async () => {
    const copy = agent(), lead = agent()
    mocks.teams.set('team-1', { view: {
      listNavigationRows: () => [
        { kind: 'configured_agent', agentRunId: 'own', teamRunId: null },
        { kind: 'task_agent', agentRunId: 'copy', teamRunId: null },
        { kind: 'task_team', agentRunId: null, teamRunId: 'squad' },
        { kind: 'task_team_agent', agentRunId: 'squad-lead', teamRunId: null },
      ],
      getAgentContext: (id: string) => ({ copy, 'squad-lead': lead } as Record<string, unknown>)[id] ?? null,
    } })
    const runStatus = useRunStatusStore()
    const hold = vi.spyOn(runStatus, 'hold').mockImplementation(() => () => undefined)
    const stop = installViewRunStatusBridge()
    expect(hold).toHaveBeenLastCalledWith([{ kind: 'agent', runId: 'copy' }, { kind: 'agent_team', runId: 'squad' }])
    runStatus.apply({ type: 'RUN_STATUS_SNAPSHOT', payload: { runs: [
      { kind: 'agent', runId: 'copy', agents: [{ agentRunId: 'copy', status: 'idle' }] },
      { kind: 'agent_team', runId: 'squad', agents: [{ agentRunId: 'squad-lead', status: 'running' }] },
    ] } })
    await nextTick()
    expect([copy.state.currentStatus, lead.state.currentStatus]).toEqual(['idle', 'running'])
    // CR-461-094: a status shown in the view does not hold the runs again (the node would reopen each run's statuses).
    expect(hold).toHaveBeenCalledTimes(1)
    // F-62: the stop icon of a running copy shows, whatever its delegator's status.
    expect(isDelegatedCopyLive({ rootKind: 'AGENT_TEAM', rootRunId: 'team-1' }, { teamRunId: 'squad' })).toBe(true)
    runStatus.apply({ type: 'RUN_STATUS_CHANGED', payload: { kind: 'agent_team', runId: 'squad', agentRunId: 'squad-lead', status: 'offline' } })
    expect(isDelegatedCopyLive({ rootKind: 'AGENT_TEAM', rootRunId: 'team-1' }, { teamRunId: 'squad' })).toBe(false)
    stop()
  })

  it('an Org view\'s delegated rows (its own and its mounted Teams\') and its peer rows', async () => {
    const helper = agent()
    mocks.orgs['org-1'] = { remoteExecutions: [{ kind: 'agent', agent_run_id: 'peer-agent' }],
      executionTree: { rootOrg: { taskExecutions: [{ agentRunId: 'helper', taskExecutions: [] }], members: [{ taskExecutions: [{ teamRunId: 'sub', members: [{ agentRunId: 'sub-lead' }], taskExecutions: [] }] }] } },
      getAgentContext: (id: string) => (id === 'helper' ? helper : null) }
    const runStatus = useRunStatusStore()
    const hold = vi.spyOn(runStatus, 'hold').mockImplementation(() => () => undefined)
    const stop = installViewRunStatusBridge()
    expect(hold).toHaveBeenLastCalledWith([{ kind: 'agent', runId: 'helper' }, { kind: 'agent', runId: 'peer-agent' }, { kind: 'agent_team', runId: 'sub' }])
    runStatus.apply({ type: 'RUN_STATUS_SNAPSHOT', payload: { runs: [{ kind: 'agent', runId: 'helper', agents: [{ agentRunId: 'helper', status: 'running' }] }] } })
    await nextTick()
    expect(helper.state.currentStatus).toBe('running')
    stop()
  })
})
