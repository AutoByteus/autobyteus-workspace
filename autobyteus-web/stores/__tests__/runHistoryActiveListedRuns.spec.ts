import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useRunHistoryStore } from '~/stores/runHistoryStore'

// autobyteus-426 D-09: the listed standalone Agent runs the history poll asks child states for.
describe('runHistoryStore.activeListedAgentRunIds', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('lists the active standalone Agent runs of every listed folder, never a Team run', () => {
    const store = useRunHistoryStore()
    const run = (runId: string, isActive: boolean) => ({ runId, isActive, summary: '', status: 'IDLE', createdAt: '', lastActivityAt: '' })
    store.workspaceGroups = [
      { workspaceRootPath: '/a', workspaceName: 'a', agentDefinitions: [
        { agentDefinitionId: 'pm', agentName: 'PM', runs: [run('pm-1', true), run('pm-2', false)] },
        { agentDefinitionId: 'w', agentName: 'Writer', runs: [run('w-1', true)] },
      ], teamDefinitions: [{ teamDefinitionId: 't', teamDefinitionName: 'Team', runs: [{ teamRunId: 'team-1', isActive: true }] }] },
      { workspaceRootPath: '/b', workspaceName: 'b', agentDefinitions: [{ agentDefinitionId: 'pm', agentName: 'PM', runs: [run('pm-3', true)] }], teamDefinitions: [] },
    ] as never
    expect(store.activeListedAgentRunIds).toEqual(['pm-1', 'w-1', 'pm-3'])
  })
})
