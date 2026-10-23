import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const team = vi.hoisted(() => ({
  focused: 'coordinator-run',
  streamReady: false,
  loaded: new Set<string>(),
  reads: [] as string[],
}))
const teamContext = { view: { getFocusedAgentRunId: () => team.focused } }
vi.mock('~/stores/agentTeamContextsStore', () => ({ useAgentTeamContextsStore: () => ({ getTeamContextById: (id: string) => id === 'team-root' ? teamContext : null }) }))
vi.mock('~/stores/agentTeamRunStore', () => ({ useAgentTeamRunStore: () => ({ refreshTeamRemote: () => team.streamReady }) }))
vi.mock('~/services/runHydration/teamMemberProjectionHydrationService', () => ({
  isTeamMemberProjectionAuthoritative: (_team: unknown, agentRunId: string) => team.loaded.has(agentRunId),
  ensureAuthoritativeTeamMemberProjection: vi.fn(async ({ agentRunId }: { agentRunId: string }) => { team.reads.push(agentRunId) }),
}))

import { registerTeamRemoteRuns } from '../teamRemoteRunRegistry'
import { useRemoteRunsStore } from '~/stores/remoteRunsStore'

/**
 * autobyteus-278 SR-008: a Team root's adapter for the one Retry rule. Its stream, its focused member and a member's
 * authoritative projection as "loaded". Against IR-003: the focused member is preferred, and after a refresh an
 * unloaded member is read too.
 */

const remoteTeam = {
  kind: 'agent_team' as const, address: '/marketing_team', team_run_id: 'marketing-run', node_id: 'srv_docker', node_name: 'docker',
  coordinator_address: '/marketing_team/lead',
  members: [{ address: '/marketing_team/lead', agent_run_id: 'lead-run' }, { address: '/marketing_team/writer', agent_run_id: 'writer-run' }],
  delegator_agent_run_id: 'coordinator-run', started_at: '2026-10-23T08:00:00.000Z',
}

describe("a Team root's remote-run Retry", () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    Object.assign(team, { focused: 'coordinator-run', streamReady: false, loaded: new Set<string>(), reads: [] })
    registerTeamRemoteRuns('team-root', [remoteTeam])
  })

  it('reads the focused member of the run when it is not loaded, and refreshes on the ready stream too', () => {
    team.focused = 'writer-run'
    team.streamReady = true
    useRemoteRunsStore().retry('marketing-run')
    expect(team.reads).toEqual(['writer-run'])
    expect(useRemoteRunsStore().run('marketing-run')?.checking).toBe(true)
  })

  it('after a refresh with another member focused, reads the first member not loaded (before: no read)', () => {
    team.streamReady = true
    team.loaded.add('lead-run')
    useRemoteRunsStore().retry('marketing-run')
    expect(team.reads).toEqual(['writer-run'])
  })

  it('a loaded focused member is not re-read; without a stream it settles at once', () => {
    team.focused = 'lead-run'
    team.loaded.add('lead-run')
    useRemoteRunsStore().retry('marketing-run')
    expect(team.reads).toEqual([])
    expect(useRemoteRunsStore().run('marketing-run')?.checking).toBe(false)
  })

  it('every member loaded, no stream: nothing is asked and it settles at once', () => {
    team.loaded.add('lead-run').add('writer-run')
    useRemoteRunsStore().retry('marketing-run')
    expect(team.reads).toEqual([])
    expect(useRemoteRunsStore().run('marketing-run')?.checking).toBe(false)
  })
})
