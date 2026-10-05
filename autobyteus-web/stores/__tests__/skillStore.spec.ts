import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { getApolloClient } from '~/utils/apolloClient'
import { useSkillStore } from '../skillStore'
import { useSkillSourcesStore } from '../skillSourcesStore'
import { SkillNameConflictError } from '~/utils/skills/skillNames'

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

  it('createSkill and addSkillSource turn SKILL_NAME_CONFLICT (errors array or thrown) into a typed error (D-19)', async () => {
    vi.mocked(getApolloClient).mockReturnValue({
      mutate: vi.fn()
        .mockResolvedValueOnce({ data: null, errors: [{ message: 'Duplicate skill names: dup', extensions: { code: 'SKILL_NAME_CONFLICT', conflicts: [{ name: 'dup', existingPath: '/skills/dup', incomingPath: '/pkg/agents/a/skills/dup' }] } }] })
        .mockRejectedValueOnce({ message: 'Duplicate skill names: dup', graphQLErrors: [{ message: 'Duplicate skill names: dup', extensions: { code: 'SKILL_NAME_CONFLICT', conflicts: [{ name: 'dup', existingPath: '/skills/dup', incomingPath: '/pkg/agents/a/skills/dup' }] } }] }),
    } as any)
    const skillStore = useSkillStore()
    const skillSourcesStore = useSkillSourcesStore()

    await expect(skillStore.createSkill({ name: 'dup', description: '', content: '' })).rejects.toBeInstanceOf(SkillNameConflictError)
    await expect(skillSourcesStore.addSkillSource('/pkg')).rejects.toMatchObject({
      conflicts: [{ name: 'dup', existingPath: '/skills/dup', incomingPath: '/pkg/agents/a/skills/dup' }],
    })
    expect(skillStore.error).toBe('')
    expect(skillSourcesStore.error).toBe('')
  })
  it('refreshes selected roots and clears removed selections on source mutations as well as Reload', async () => {
    const store = useSkillStore()
    const old = { name: 'writer', description: 'writer', content: 'old', rootPath: '/g1', fileCount: 1, isReadonly: false, isDisabled: true }
    store.skills = [old]
    store.currentSkill = old
    store.currentSkillTree = 'old files'
    const query = vi.fn().mockResolvedValueOnce({ data: { skills: [{ ...old, rootPath: '/g2', content: 'new' }] } })
      .mockResolvedValueOnce({ data: { skills: [] } })
    vi.mocked(getApolloClient).mockReturnValue({ query } as any)
    await store.fetchAllSkills()
    expect(store.currentSkill?.rootPath).toBe('/g2')
    expect(store.currentSkill?.isDisabled).toBe(true)
    expect(store.currentSkillTree).toBeNull()
    await store.fetchAllSkills()
    expect(store.currentSkill).toBeNull()
  })

})
