import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import SkillDetail from './SkillDetail.vue'

const { fetchSkillMock, fetchSkillVersionsMock, addToastMock } = vi.hoisted(() => ({
  fetchSkillMock: vi.fn(),
  fetchSkillVersionsMock: vi.fn(),
  addToastMock: vi.fn(),
}))

vi.mock('~/stores/skillStore', () => ({
  useSkillStore: () => ({
    fetchSkill: fetchSkillMock,
    fetchSkillVersions: fetchSkillVersionsMock,
    enableSkillVersioning: vi.fn(),
    activateSkillVersion: vi.fn(),
  }),
}))

vi.mock('~/composables/useToasts', () => ({
  useToasts: () => ({
    addToast: addToastMock,
  }),
}))

const flushPromises = async () => {
  await Promise.resolve()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

const loadedSkill = {
  name: 'software-engineering-workflow-skill',
  description: 'Run a staged software-engineering delivery feedback loop from bootstrap through final handoff.',
  content: '',
  rootPath: '/skills/software-engineering-workflow-skill',
  fileCount: 12,
  isReadonly: false,
  isDisabled: false,
  isVersioned: false,
  activeVersion: null,
}

const mountSkillDetail = () => mount(SkillDetail, {
  props: {
    skillName: loadedSkill.name,
  },
  global: {
    stubs: {
      Icon: true,
      SkillWorkspaceLoader: true,
      FileExplorer: true,
      FileExplorerTabs: true,
      SkillVersioningPanel: true,
      SkillVersionCompareModal: true,
    },
  },
})

describe('SkillDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchSkillVersionsMock.mockResolvedValue([])
  })

  it('renders a recoverable state when the skill is missing', async () => {
    fetchSkillMock.mockResolvedValue(null)

    const wrapper = mount(SkillDetail, {
      props: {
        skillName: 'missing-skill',
      },
      global: {
        stubs: {
          Icon: true,
          SkillWorkspaceLoader: true,
          FileExplorer: true,
          FileExplorerTabs: true,
          SkillVersioningPanel: true,
          SkillVersionCompareModal: true,
        },
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Skill not found. It may have been removed from its source.')
    expect(wrapper.text()).toContain('Back to skills')
  })

  it('emits back from the recoverable state', async () => {
    fetchSkillMock.mockResolvedValue(null)

    const wrapper = mount(SkillDetail, {
      props: {
        skillName: 'missing-skill',
      },
      global: {
        stubs: {
          Icon: true,
          SkillWorkspaceLoader: true,
          FileExplorer: true,
          FileExplorerTabs: true,
          SkillVersioningPanel: true,
          SkillVersionCompareModal: true,
        },
      },
    })

    await flushPromises()
    await wrapper.get('.btn-recover').trigger('click')

    expect(wrapper.emitted('back')).toHaveLength(1)
  })

  it('renders the loaded skill in a compact two-line header', async () => {
    fetchSkillMock.mockResolvedValue(loadedSkill)

    const wrapper = mountSkillDetail()

    await flushPromises()

    expect(wrapper.find('.compact-header').exists()).toBe(true)
    expect(wrapper.find('.header-title-row').exists()).toBe(true)
    expect(wrapper.find('.header-top-row').exists()).toBe(false)
    expect(wrapper.find('.skill-title').text()).toBe(loadedSkill.name)
    expect(wrapper.find('.description-summary').text()).toContain(loadedSkill.description)
    expect(wrapper.find('.description-more').text()).toBe('More')
    expect(wrapper.find('skill-versioning-panel-stub').exists()).toBe(true)
    expect(wrapper.find('.description-popover').exists()).toBe(false)
    expect(wrapper.find('.description-expanded-text').exists()).toBe(false)
  })

  it('expands and collapses the full description inline from the More control', async () => {
    fetchSkillMock.mockResolvedValue(loadedSkill)

    const wrapper = mountSkillDetail()

    await flushPromises()

    await wrapper.get('.description-more').trigger('click')
    await nextTick()

    expect(wrapper.find('.description-popover').exists()).toBe(false)
    expect(wrapper.get('.description-expanded-text').text()).toContain(loadedSkill.description)
    expect(wrapper.get('.description-less').text()).toBe('Less')
    expect(wrapper.get('.description-less').attributes('aria-expanded')).toBe('true')

    await wrapper.get('.description-less').trigger('click')
    await nextTick()

    expect(wrapper.find('.description-expanded-text').exists()).toBe(false)
    expect(wrapper.get('.description-text').text()).toContain(loadedSkill.description)
    expect(wrapper.get('.description-more').attributes('aria-expanded')).toBe('false')
  })
})
