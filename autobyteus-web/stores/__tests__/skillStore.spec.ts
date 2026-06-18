import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { getApolloClient } from '~/utils/apolloClient'
import { useSkillStore } from '../skillStore'
import { useSkillSourcesStore } from '../skillSourcesStore'

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

  it('replaces skills and skill sources when reloading the catalog', async () => {
    const mutateMock = vi.fn().mockResolvedValue({
      data: {
        reloadSkillCatalog: {
          skills: [
            {
              name: 'fresh-skill',
              description: 'Fresh skill',
              content: '',
              rootPath: '/skills/fresh',
              fileCount: 1,
              isReadonly: false,
              isDisabled: false,
              isVersioned: false,
              activeVersion: null,
            },
          ],
          skillSources: [
            {
              path: '/skills',
              skillCount: 1,
              isDefault: true,
            },
          ],
        },
      },
      errors: [],
    })
    vi.mocked(getApolloClient).mockReturnValue({
      mutate: mutateMock,
    } as any)

    const skillStore = useSkillStore()
    const skillSourcesStore = useSkillSourcesStore()
    skillStore.skills = []
    skillSourcesStore.skillSources = []

    await skillStore.reloadSkillCatalog()

    expect(mutateMock).toHaveBeenCalledOnce()
    expect(skillStore.skills.map((skill) => skill.name)).toEqual(['fresh-skill'])
    expect(skillSourcesStore.skillSources).toEqual([
      {
        path: '/skills',
        skillCount: 1,
        isDefault: true,
      },
    ])
    expect(skillStore.reloading).toBe(false)
  })

  it('preserves existing skills and sources when catalog reload fails', async () => {
    const mutateMock = vi.fn().mockRejectedValue(new Error('Reload failed'))
    vi.mocked(getApolloClient).mockReturnValue({
      mutate: mutateMock,
    } as any)

    const skillStore = useSkillStore()
    const skillSourcesStore = useSkillSourcesStore()
    skillStore.skills = [
      {
        name: 'existing-skill',
        description: 'Existing skill',
        content: '',
        rootPath: '/skills/existing',
        fileCount: 1,
        isReadonly: false,
        isDisabled: true,
        isVersioned: false,
        activeVersion: null,
      },
    ]
    skillSourcesStore.skillSources = [
      {
        path: '/skills',
        skillCount: 1,
        isDefault: true,
      },
    ]

    await expect(skillStore.reloadSkillCatalog()).rejects.toThrow('Reload failed')

    expect(skillStore.skills.map((skill) => skill.name)).toEqual(['existing-skill'])
    expect(skillStore.skills[0]?.isDisabled).toBe(true)
    expect(skillSourcesStore.skillSources).toEqual([
      {
        path: '/skills',
        skillCount: 1,
        isDefault: true,
      },
    ])
    expect(skillStore.error).toBe('Reload failed')
    expect(skillStore.reloading).toBe(false)
  })
})
