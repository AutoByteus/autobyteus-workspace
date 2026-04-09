import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'
import SkillSourcesModal from './SkillSourcesModal.vue'
import { useSkillSourcesStore } from '~/stores/skillSourcesStore'
import { useSkillStore } from '~/stores/skillStore'

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
  return { wrapper, sourcesStore, skillStore }
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
})
