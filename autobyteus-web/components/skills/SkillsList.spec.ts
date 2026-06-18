import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'
import SkillsList from './SkillsList.vue'
import { useSkillStore } from '~/stores/skillStore'

const flushPromises = async () => {
  await Promise.resolve()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

const mountComponent = async (skillStateOverrides = {}) => {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: true,
    initialState: {
      skill: {
        skills: [
          {
            name: 'alpha-skill',
            description: 'Alpha skill',
            content: '',
            rootPath: '/skills/alpha',
            fileCount: 1,
            isReadonly: false,
            isDisabled: false,
            isVersioned: false,
            activeVersion: null,
          },
        ],
        loading: false,
        reloading: false,
        error: '',
        ...skillStateOverrides,
      },
    },
  })

  setActivePinia(pinia)

  const skillStore = useSkillStore()
  Object.assign(skillStore, skillStateOverrides)
  skillStore.fetchAllSkills = vi.fn().mockResolvedValue(undefined)
  skillStore.reloadSkillCatalog = vi.fn().mockResolvedValue(undefined)

  const wrapper = mount(SkillsList, {
    global: {
      plugins: [pinia],
      stubs: {
        Icon: true,
        SkillCard: {
          props: ['skill'],
          template: '<div class="skill-card-stub">{{ skill.name }}</div>',
        },
        SkillSourcesModal: true,
        ConfirmationModal: true,
      },
    },
  })

  await flushPromises()
  return { wrapper, skillStore }
}

describe('SkillsList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('triggers catalog reload and shows success feedback', async () => {
    const { wrapper, skillStore } = await mountComponent()

    const reloadButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Reload'))

    expect(reloadButton).toBeTruthy()
    await reloadButton!.trigger('click')
    await flushPromises()

    expect(skillStore.reloadSkillCatalog).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Skills reloaded.')
  })

  it('disables the reload button and shows loading feedback while reloading', async () => {
    const { wrapper } = await mountComponent({ reloading: true })

    const reloadButton = wrapper
      .findAll('button')
      .find((button) => button.text().toLowerCase().includes('reloading'))

    expect(reloadButton).toBeTruthy()
    expect(reloadButton!.attributes('disabled')).toBeDefined()
  })
})
