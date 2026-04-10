import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import SkillsPage from '../skills.vue'
import { useSkillStore } from '~/stores/skillStore'

const skillFixtures = [
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
  {
    name: 'beta-skill',
    description: 'Beta skill',
    content: '',
    rootPath: '/skills/beta',
    fileCount: 1,
    isReadonly: false,
    isDisabled: false,
    isVersioned: false,
    activeVersion: null,
  },
]

const mountPage = () => {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: true,
    initialState: {
      skill: {
        skills: skillFixtures,
        loading: false,
        error: '',
      },
    },
  })

  setActivePinia(pinia)

  return mount(SkillsPage, {
    global: {
      plugins: [pinia],
      stubs: {
        SkillsList: {
          template: `
            <button
              data-testid="open-alpha"
              @click="$emit('viewDetail', 'alpha-skill')"
            >
              Open Alpha
            </button>
          `,
        },
        SkillDetail: {
          props: ['skillName'],
          template: '<div data-testid="skill-detail">Skill detail for {{ skillName }}</div>',
        },
      },
    },
  })
}

describe('skills page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('clears the selected skill when the refreshed list no longer contains it', async () => {
    const wrapper = mountPage()
    const skillStore = useSkillStore()

    await wrapper.get('[data-testid="open-alpha"]').trigger('click')
    expect(wrapper.get('[data-testid="skill-detail"]').text()).toContain('alpha-skill')

    skillStore.skills = [skillFixtures[1]]
    await nextTick()

    expect(wrapper.find('[data-testid="skill-detail"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="open-alpha"]').exists()).toBe(true)
  })
})
