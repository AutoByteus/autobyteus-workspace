import { describe, expect, it } from 'vitest'
import { cacheWorkspaceMetadataForStore } from '~/stores/workspaceMetadataActions'
import { workspaceMetadataKeyForRootPath } from '~/utils/workspaceMetadata'

describe('workspace metadata cache identity', () => {
  it('preserves case-distinct root paths as distinct cache identities', () => {
    const store = {
      workspaceMetadataById: {},
      workspaceMetadataIdsByRootPath: {},
    } as any

    cacheWorkspaceMetadataForStore(store, {
      workspaceId: 'agent_ws_upper',
      workspaceRootPath: '/tmp/ProjectA',
      displayName: 'ProjectA',
      kind: 'filesystem',
    })
    cacheWorkspaceMetadataForStore(store, {
      workspaceId: 'agent_ws_lower',
      workspaceRootPath: '/tmp/projecta',
      displayName: 'projecta',
      kind: 'filesystem',
    })

    const upperKey = workspaceMetadataKeyForRootPath('/tmp/ProjectA')
    const lowerKey = workspaceMetadataKeyForRootPath('/tmp/projecta')

    expect(upperKey).not.toBe(lowerKey)
    expect(store.workspaceMetadataIdsByRootPath[upperKey]).toBe('agent_ws_upper')
    expect(store.workspaceMetadataIdsByRootPath[lowerKey]).toBe('agent_ws_lower')
  })

  it('preserves metadata kind while caching by root path', () => {
    const store = {
      workspaceMetadataById: {},
      workspaceMetadataIdsByRootPath: {},
    } as any

    cacheWorkspaceMetadataForStore(store, {
      workspaceId: 'skill_ws_docs',
      workspaceRootPath: '/skills/docs',
      displayName: 'docs',
      kind: 'skill',
    })

    expect(store.workspaceMetadataById.skill_ws_docs.kind).toBe('skill')
  })
})
