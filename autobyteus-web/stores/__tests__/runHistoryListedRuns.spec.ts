import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useRunHistoryStore } from '~/stores/runHistoryStore'

// autobyteus-461 SR-055 (autobyteus-426 D-09, autobyteus-435 REQ-011): the listed runs of every kind the history poll
// asks children for.
describe('runHistoryStore.listedRuns', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('lists every Agent run and Team run of every listed folder and every Org run, active or stopped', () => {
    const store = useRunHistoryStore()
    const run = (runId: string, isActive: boolean) => ({ runId, isActive, summary: '', status: 'IDLE', createdAt: '', lastActivityAt: '' })
    store.workspaceGroups = [
      { workspaceRootPath: '/a', workspaceName: 'a', agentDefinitions: [
        { agentDefinitionId: 'pm', agentName: 'PM', runs: [run('pm-1', true), run('pm-2', false)] },
        { agentDefinitionId: 'w', agentName: 'Writer', runs: [run('w-1', true)] },
      ], teamDefinitions: [{ teamDefinitionId: 't', teamDefinitionName: 'Team', runs: [{ teamRunId: 'team-1', isActive: true }, { teamRunId: 'team-2', isActive: false }] }] },
      { workspaceRootPath: '/b', workspaceName: 'b', agentDefinitions: [{ agentDefinitionId: 'pm', agentName: 'PM', runs: [run('pm-3', true)] }], teamDefinitions: [] },
    ] as never
    store.agentOrgHistory = [{ rootRunId: 'org-1', isActive: false }] as never
    expect(store.listedRuns).toEqual([
      { kind: 'agent', runId: 'pm-1' }, { kind: 'agent', runId: 'pm-2' }, { kind: 'agent', runId: 'w-1' },
      { kind: 'agent_team', runId: 'team-1' }, { kind: 'agent_team', runId: 'team-2' },
      { kind: 'agent', runId: 'pm-3' },
      { kind: 'agent_org', runId: 'org-1' },
    ])
  })
})
