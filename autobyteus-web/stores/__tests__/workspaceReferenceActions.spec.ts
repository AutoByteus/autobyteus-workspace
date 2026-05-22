import { describe, expect, it } from 'vitest'
import { cacheWorkspaceReferenceForStore } from '~/stores/workspaceReferenceActions'
import { workspaceReferenceKeyForRootPath } from '~/utils/workspaceReference'

describe('workspace reference cache identity', () => {
  it('preserves case-distinct root paths as distinct cache identities', () => {
    const store = {
      workspaceReferencesById: {},
      workspaceReferenceIdsByRootPath: {},
    } as any

    cacheWorkspaceReferenceForStore(store, {
      workspaceId: 'agent_ws_upper',
      workspaceRootPath: '/tmp/ProjectA',
      displayName: 'ProjectA',
      kind: 'filesystem',
    })
    cacheWorkspaceReferenceForStore(store, {
      workspaceId: 'agent_ws_lower',
      workspaceRootPath: '/tmp/projecta',
      displayName: 'projecta',
      kind: 'filesystem',
    })

    const upperKey = workspaceReferenceKeyForRootPath('/tmp/ProjectA')
    const lowerKey = workspaceReferenceKeyForRootPath('/tmp/projecta')

    expect(upperKey).not.toBe(lowerKey)
    expect(store.workspaceReferenceIdsByRootPath[upperKey]).toBe('agent_ws_upper')
    expect(store.workspaceReferenceIdsByRootPath[lowerKey]).toBe('agent_ws_lower')
  })
})
