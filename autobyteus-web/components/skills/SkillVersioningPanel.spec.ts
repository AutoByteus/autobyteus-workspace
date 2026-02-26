import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SkillVersioningPanel from './SkillVersioningPanel.vue'

describe('SkillVersioningPanel', () => {
  const mockSkill = {
    name: 'test-skill',
    directory: '/tmp/test',
    isVersioned: false,
    activeVersion: null,
    isReadonly: false,
    metadata: {},
    error: null,
    loading: false
  }

  it('renders "Enable Versioning" when not versioned (Default Mode)', () => {
    const wrapper = mount(SkillVersioningPanel, {
      props: {
        skill: mockSkill,
        versions: [],
        versionsLoading: false,
        versionsError: '',
        actionError: '',
        actionLoading: false,
        mode: 'default'
      }
    })
    expect(wrapper.text()).toContain('Not versioned')
    expect(wrapper.find('button.btn-magic').exists()).toBe(true)
    expect(wrapper.find('button.btn-magic').text()).toContain('Enable Versioning')
  })

  it('renders "Enable Versioning" when not versioned (Compact Mode)', () => {
    const wrapper = mount(SkillVersioningPanel, {
      props: {
        skill: mockSkill,
        versions: [],
        versionsLoading: false,
        versionsError: '',
        actionError: '',
        actionLoading: false,
        mode: 'compact'
      }
    })
    expect(wrapper.text()).toContain('Not versioned')
    // Check for new class name
    expect(wrapper.find('.status-badge-ghost').exists()).toBe(true)
  })

   it('renders version controls when versioned', async () => {
    const versionedSkill = { ...mockSkill, isVersioned: true, activeVersion: 'v1' }
    const versions = [{ tag: 'v1' }, { tag: 'v2' }]
    const wrapper = mount(SkillVersioningPanel, {
      props: {
        skill: versionedSkill,
        versions: versions,
        versionsLoading: false,
        versionsError: '',
        actionError: '',
        actionLoading: false,
        mode: 'default'
      }
    })
    
    expect(wrapper.text()).toContain('Versioned')
    expect(wrapper.find('select').exists()).toBe(true)
    expect(wrapper.findAll('option')).toHaveLength(2)
  })
})
