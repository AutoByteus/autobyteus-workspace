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
            path: '/default/skills',
            skillCount: 3,
            isDefault: true,
          },
          {
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
            <button
              v-if="show"
              data-testid="confirm-remove"
              @click="$emit('confirm')"
            >
              Confirm Remove
            </button>
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

    await wrapper.get('.btn-delete').trigger('click')
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
    await wrapper.get('.btn-add').trigger('click')
    await flushPromises()

    expect(skillNames.runWithSkillNameChecks).toHaveBeenCalledTimes(1)
    expect(sourcesStore.addSkillSource).toHaveBeenCalledWith('/extra/skills')
  })

  it('keeps the typed path when a duplicate name rejects the folder', async () => {
    const { wrapper, sourcesStore, skillNames } = await mountComponent()
    sourcesStore.addSkillSource = vi.fn().mockRejectedValue(new Error('Duplicate skill names: dup'))
    skillNames.runWithSkillNameChecks = vi.fn((action: () => Promise<unknown>) => action()) as typeof skillNames.runWithSkillNameChecks

    await wrapper.get('.input-group input').setValue('/dup/skills')
    await wrapper.get('.btn-add').trigger('click')
    await flushPromises()

    expect((wrapper.get('.input-group input').element as HTMLInputElement).value).toBe('/dup/skills')
    expect(wrapper.find('.success-alert').exists()).toBe(false)
  })
})
