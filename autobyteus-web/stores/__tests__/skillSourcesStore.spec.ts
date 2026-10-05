import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSkillSourcesStore, type SkillSource } from '../skillSourcesStore'
import { getApolloClient } from '~/utils/apolloClient'
import { print } from 'graphql'
import * as operations from '~/graphql/skillSources'

vi.mock('~/utils/apolloClient', () => ({ getApolloClient: vi.fn() }))
const row: SkillSource = {
  sourceId: 'one', sourceKind: 'GITHUB_REPOSITORY', path: '/managed/g1', skillCount: 1, isDefault: false,
  github: { repositoryUrl: 'https://github.com/acme/skills', defaultBranch: 'main', installedRevision: 'aaa',
    latestRevision: 'bbb', latestCheckedAt: null, status: 'UPDATE_AVAILABLE', lastError: null },
}
beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks() })

describe('skill source store', () => {
  it('keeps registry diagnostics separate from the usable local snapshot', async () => {
    vi.mocked(getApolloClient).mockReturnValue({ query: vi.fn().mockResolvedValue({ data: {
      skillSources: [], skillSourceRegistryError: 'Registry unavailable',
    } }) } as any)
    const store = useSkillSourcesStore()
    await store.fetchSkillSources()
    expect(store.registryError).toBe('Registry unavailable')
  })

  it('replaces whole snapshots and preserves committed-operation warnings', async () => {
    const mutate = vi.fn().mockResolvedValue({ data: { updateGitHubSkillSource: { sources: [row], warnings: ['Cleanup incomplete'] } } })
    vi.mocked(getApolloClient).mockReturnValue({ mutate } as any)
    const store = useSkillSourcesStore()
    await store.githubOperation('update', 'one')
    expect(store.skillSources).toEqual([row])
    expect(store.warnings).toEqual(['Cleanup incomplete'])
    expect(store.pending).toEqual({})
  })

  it('keeps visible failure and re-reads REMOVING without retrying a mutation', async () => {
    const mutate = vi.fn().mockRejectedValue(new Error('Delete failed'))
    vi.mocked(getApolloClient).mockReturnValue({ mutate, query: vi.fn().mockResolvedValue({ data: {
      skillSources: [{ ...row, github: { ...row.github, status: 'REMOVING' } }],
    } }) } as any)
    const store = useSkillSourcesStore()
    await expect(store.githubOperation('remove', 'one')).rejects.toThrow('Delete failed')
    expect(store.skillSources[0]?.github?.status).toBe('REMOVING')
    expect(store.error).toBe('Delete failed')
    expect(mutate).toHaveBeenCalledOnce()
  })

  it('all source selections, including Reload, retain the complete shared fragment', () => {
    for (const document of Object.values(operations)) {
      const query = print(document)
      expect(query).toContain('sourceId')
      expect(query).toContain('installedRevision')
      expect(query).toContain('latestCheckedAt')
    }
  })
})
