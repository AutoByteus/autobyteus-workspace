import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { getApolloClient } from '~/utils/apolloClient'
import { useSkillStore } from '../skillStore'

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: vi.fn(),
}))

describe('skillStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('clears currentSkill when a skill lookup returns null', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      data: {
        skill: null,
      },
      errors: [],
    })
    vi.mocked(getApolloClient).mockReturnValue({
      query: queryMock,
    } as any)

    const store = useSkillStore()
    store.setCurrentSkill({
      name: 'stale-skill',
      description: 'Stale skill',
      content: '',
      rootPath: '/skills/stale',
      fileCount: 1,
      isReadonly: false,
      isDisabled: false,
      isVersioned: false,
      activeVersion: null,
    })

    const result = await store.fetchSkill('missing-skill')

    expect(result).toBeNull()
    expect(store.currentSkill).toBeNull()
    expect(queryMock).toHaveBeenCalledOnce()
  })
})
