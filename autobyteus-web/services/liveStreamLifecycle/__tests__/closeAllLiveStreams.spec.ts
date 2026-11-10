import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'
import { closeAllLiveStreams } from '../closeAllLiveStreams'
import { useAgentRunStore } from '~/stores/agentRunStore'
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore'
import { useAgentRunCollaborationStore } from '~/stores/agentRunCollaborationStore'
import { useAgentOrgContextsStore } from '~/stores/agentOrgContextsStore'
import { useWorkspaceStore } from '~/stores/workspace'

// autobyteus-435 REQ-010 (b): the phone's session end closes every registry's streams through the registry's own action.
describe('closeAllLiveStreams', () => {
  beforeEach(() => { setActivePinia(createTestingPinia({ createSpy: vi.fn, stubActions: true })) })

  it('asks each of the five stream registries to close all its streams, once', () => {
    closeAllLiveStreams()

    expect(useAgentRunStore().disconnectAllAgentStreams).toHaveBeenCalledTimes(1)
    expect(useAgentTeamRunStore().disconnectAllTeamStreams).toHaveBeenCalledTimes(1)
    expect(useAgentRunCollaborationStore().releaseAll).toHaveBeenCalledTimes(1)
    expect(useAgentOrgContextsStore().releaseAll).toHaveBeenCalledTimes(1)
    expect(useWorkspaceStore().disconnectAllFileExplorerLiveStreams).toHaveBeenCalledTimes(1)
  })
})
