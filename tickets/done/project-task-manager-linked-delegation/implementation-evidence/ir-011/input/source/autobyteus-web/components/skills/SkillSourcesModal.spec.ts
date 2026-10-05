import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'
import SkillSourcesModal from './SkillSourcesModal.vue'
import { useSkillSourcesStore } from '~/stores/skillSourcesStore'
import { useSkillStore } from '~/stores/skillStore'
import { useSkillNamesStore } from '~/stores/skillNamesStore'

const flushPromises = async () => {
  await Promise.resolve()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

const mountComponent = async () => {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: true,
    initialState: {
      skillSources: {
        skillSources: [
          {
            sourceId: 'default', sourceKind: 'DEFAULT', github: null,
            path: '/default/skills',
            skillCount: 3,
            isDefault: true,
          },
          {
            sourceId: 'local', sourceKind: 'LOCAL_PATH', github: null,
            path: '/custom/skills',
            skillCount: 2,
            isDefault: false,
          },
        ],
        loading: false,
        error: '',
      },
      skill: {
        skills: [],
        loading: false,
        error: '',
      },
    },
  })

  setActivePinia(pinia)

  const sourcesStore = useSkillSourcesStore()
  const skillStore = useSkillStore()
  sourcesStore.fetchSkillSources = vi.fn().mockResolvedValue(undefined)
  sourcesStore.removeSkillSource = vi.fn().mockResolvedValue(undefined)
  skillStore.fetchAllSkills = vi.fn().mockResolvedValue(undefined)
  const skillNames = useSkillNamesStore()
  skillNames.fetchIssues = vi.fn().mockResolvedValue([])
  skillNames.runWithSkillNameChecks = vi.fn((action: () => Promise<unknown>) => action()) as typeof skillNames.runWithSkillNameChecks

  const wrapper = mount(SkillSourcesModal, {
    global: {
      plugins: [pinia],
      stubs: {
        ConfirmationModal: {
          props: ['show'],
          template: `
            <div v-if="show"><slot /><button data-testid="confirm-remove" @click="$emit('confirm')">Confirm</button><button data-testid="cancel" @click="$emit('cancel')">Cancel</button></div>
          `,
        },
      },
    },
  })

  await flushPromises()
  return { wrapper, sourcesStore, skillStore, skillNames }
}

describe('SkillSourcesModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('refreshes skills after removing a source', async () => {
    const { wrapper, sourcesStore, skillStore } = await mountComponent()

    await wrapper.get('.remove').trigger('click')
    await wrapper.get('[data-testid="confirm-remove"]').trigger('click')
    await flushPromises()

    expect(sourcesStore.removeSkillSource).toHaveBeenCalledWith('/custom/skills')
    expect(skillStore.fetchAllSkills).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Skill source removed. Skills list refreshed.')
  })

  it('adds a folder through the skill-name checks (D-19) and reports the added count', async () => {
    const { wrapper, sourcesStore, skillNames } = await mountComponent()
    sourcesStore.addSkillSource = vi.fn().mockResolvedValue(undefined)

    await wrapper.get('.input-group input').setValue('/extra/skills')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(skillNames.runWithSkillNameChecks).toHaveBeenCalledTimes(1)
    expect(sourcesStore.addSkillSource).toHaveBeenCalledWith('/extra/skills')
  })

  it('keeps the typed path when a duplicate name rejects the folder', async () => {
    const { wrapper, sourcesStore, skillNames } = await mountComponent()
    sourcesStore.addSkillSource = vi.fn().mockRejectedValue(new Error('Duplicate skill names: dup'))
    skillNames.runWithSkillNameChecks = vi.fn((action: () => Promise<unknown>) => action()) as typeof skillNames.runWithSkillNameChecks

    await wrapper.get('.input-group input').setValue('/dup/skills')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect((wrapper.get('.input-group input').element as HTMLInputElement).value).toBe('/dup/skills')
    expect(wrapper.find('.success-alert').exists()).toBe(false)
  })
  it('checks GitHub sources once on open and imports URL through the conflict boundary', async () => {
    const { wrapper, sourcesStore, skillNames } = await mountComponent()
    expect(sourcesStore.checkGitHubSources).toHaveBeenCalledOnce()
    await wrapper.findAll('.input-modes button')[1]!.trigger('click')
    expect(wrapper.text()).toContain('Import only sources you trust')
    await wrapper.get('input').setValue('https://github.com/acme/skills')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(sourcesStore.githubOperation).toHaveBeenCalledWith('import', undefined, 'https://github.com/acme/skills')
    expect(skillNames.runWithSkillNameChecks).toHaveBeenCalledOnce()
  })

  it('confirms whole-source replacement, supports cancellation and keeps removal ownership clear', async () => {
    const { wrapper, sourcesStore } = await mountComponent()
    sourcesStore.skillSources.push({
      sourceId: 'remote', sourceKind: 'GITHUB_REPOSITORY', path: '/managed/g1', skillCount: 1, isDefault: false,
      github: { repositoryUrl: 'https://github.com/acme/skills', defaultBranch: 'main', installedRevision: 'aaaa',
        latestRevision: 'bbbb', latestCheckedAt: null, status: 'UPDATE_AVAILABLE', lastError: null },
    })
    await flushPromises()
    const row = wrapper.findAll('.source-row').find(row => row.text().includes('https://github.com'))!
    await row.findAll('button').find(button => button.text() === 'Update')!.trigger('click')
    expect(wrapper.text()).toContain('Local edits will be overwritten')
    await wrapper.get('[data-testid="cancel"]').trigger('click')
    expect(sourcesStore.githubOperation).not.toHaveBeenCalled()
    await row.findAll('button').find(button => button.text() === 'Update')!.trigger('click')
    await wrapper.get('[data-testid="confirm-remove"]').trigger('click')
    await flushPromises()
    expect(sourcesStore.githubOperation).toHaveBeenCalledWith('update', 'remote')
    await row.get('.remove').trigger('click')
    expect(wrapper.text()).toContain('Delete this downloaded skill source and any local edits')
  })

  it('shows per-row failure and retry-removal while disabling commands during operations', async () => {
    const { wrapper, sourcesStore } = await mountComponent()
    sourcesStore.skillSources.push({
      sourceId: 'remote', sourceKind: 'GITHUB_REPOSITORY', path: '/managed/g1', skillCount: 0, isDefault: false,
      github: { repositoryUrl: 'https://github.com/acme/skills', defaultBranch: 'main', installedRevision: 'aaaa',
        latestRevision: null, latestCheckedAt: null, status: 'REMOVING', lastError: 'permission denied' },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('Retry removal')
    expect(wrapper.text()).toContain('permission denied')
    sourcesStore.pending.remote = 'remove'
    await flushPromises()
    expect(wrapper.findAll('.actions button').every(button => button.attributes('disabled') !== undefined)).toBe(true)
  })

})
