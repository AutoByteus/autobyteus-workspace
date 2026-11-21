import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import SkillWorkspaceLoader from './SkillWorkspaceLoader.vue'
import { useWorkspaceStore } from '~/stores/workspace'

/**
 * The Skills page's transient skill workspace lives only while its loader is mounted (autobyteus-576 FU-003, REQ-003,
 * AC-003), on the real workspace store: also when the loader unmounts before its registration has resolved.
 */
const skillEntries = () => Object.keys(useWorkspaceStore().workspaces).filter((id) => id.startsWith('skill_ws_'))
const mountLoader = () => mount(SkillWorkspaceLoader, {
  props: { skillId: 'writer', rootPath: '/skills/writer' },
  slots: { default: '<div data-test="skill-files">{{ params.workspaceId }}</div>' },
})

beforeEach(() => setActivePinia(createPinia()))
afterEach(() => vi.restoreAllMocks())

describe('SkillWorkspaceLoader', () => {
  it('registers the skill workspace while mounted and releases it on unmount', async () => {
    const wrapper = mountLoader()
    await flushPromises()
    expect(skillEntries()).toEqual(['skill_ws_writer'])
    expect(wrapper.get('[data-test="skill-files"]').text()).toBe('skill_ws_writer')
    wrapper.unmount()
    await flushPromises()
    expect(skillEntries()).toEqual([])
  })

  it('releases a registration that resolves after the loader has unmounted (left mid-load)', async () => {
    const wrapper = mountLoader()
    wrapper.unmount() // before the registration's await has resolved
    await flushPromises()
    expect(skillEntries()).toEqual([])
    expect(useWorkspaceStore().workspaceMetadataById.skill_ws_writer).toBeUndefined()
  })
})
