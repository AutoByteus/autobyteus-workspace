import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
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
})
