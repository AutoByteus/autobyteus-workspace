/**
 * The New chat chip's Project choice (projects-left-navigation, UXJ-004, UXJ-005; REQ-004, REQ-005, AC-015, VIS-010…014):
 * no Projects tab without Projects; the Projects tab lists "No project" and each Project with its folder; the chip shows
 * the Project, and "Project · folder" when the folder is not the Project's; the Project's folder is marked.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import ChatWorkspaceMenu from '../ChatWorkspaceMenu.vue'
import { useWorkspaceStore } from '~/stores/workspace'
import type { Project } from '~/types/project'

vi.mock('~/composables/useLocalization', () => ({ useLocalization: () => ({
  t: (key: string, params?: Record<string, unknown>) => (key === 'chat.workspace.temp' ? 'Temp workspace' : params?.name ? `${key}(${params.name})` : key),
}) }))

const project = (projectId: string, name: string, folder: string | null): Project => ({ projectId, name, description: '', createdAt: '',
  updatedAt: '', openTaskCount: 0, taskCount: 0,
  workspaces: folder ? [{ workspaceRootPath: folder, displayName: '', description: '', availability: 'available' as never }] : [] })
const projects = [project('P', 'AutoByteus', '/Users/me/autobyteus'), project('Q', 'Notes Project', null)]

let wrapper: VueWrapper | null = null
const mountMenu = (props: Record<string, unknown>) => {
  wrapper = mount(ChatWorkspaceMenu, { props: { workspace: { kind: 'existing', workspaceId: 'temp_ws_default' }, ...props }, attachTo: document.body })
  return wrapper
}
const open = async (menu: VueWrapper) => { await menu.get('[data-test="chat-workspace-trigger"]').trigger('click'); await flushPromises() }

beforeEach(() => {
  setActivePinia(createPinia())
  useWorkspaceStore().workspaces = {
    temp_ws_default: { workspaceId: 'temp_ws_default', name: 'temp', absolutePath: '/tmp/temp', isTemp: true, workspaceConfig: {} },
    ws_ab: { workspaceId: 'ws_ab', name: 'autobyteus', absolutePath: '/Users/me/autobyteus', isTemp: false, workspaceConfig: {} },
    ws_x: { workspaceId: 'ws_x', name: 'x', absolutePath: '/Users/me/x', isTemp: false, workspaceConfig: {} },
  } as never
})
afterEach(() => { wrapper?.unmount(); wrapper = null })

describe('ChatWorkspaceMenu Project choice', () => {
  it('offers no Projects tab when the node has no Project (VIS-010, VIS-011)', async () => {
    const menu = mountMenu({ projects: [] })
    await open(menu)
    expect(menu.find('[data-test="chat-target-switch"]').exists()).toBe(false)
    expect(menu.get('[data-test="chat-workspace-trigger"]').text()).toBe('Temp workspace')
  })

  it('lists "No project" and each Project with the folder it brings; choosing one emits it (VIS-012)', async () => {
    const menu = mountMenu({ projects })
    await open(menu)
    await menu.get('[data-test="chat-target-tab-projects"]').trigger('click')
    expect(menu.get('[data-test="chat-project-option-P"]').text()).toContain('autobyteus')
    expect(menu.get('[data-test="chat-project-option-Q"]').text()).toContain('Temp workspace')
    await menu.get('[data-test="chat-project-option-P"]').trigger('click')
    expect(menu.emitted('select-project')).toEqual([['P']])
    await open(menu)
    await menu.get('[data-test="chat-target-tab-projects"]').trigger('click')
    await menu.get('[data-test="chat-project-option-none"]').trigger('click')
    expect(menu.emitted('select-project')).toEqual([['P'], [null]])
  })

  it('shows the Project on the chip, "Project · folder" when the folder differs, and marks the Project folder (VIS-013, VIS-014)', async () => {
    const own = mountMenu({ projects, projectId: 'P', workspace: { kind: 'existing', workspaceId: 'ws_ab' } })
    expect(own.get('[data-test="chat-workspace-trigger"]').text()).toBe('AutoByteus')
    expect(own.get('[data-test="chat-workspace-trigger"]').attributes('aria-label')).toBe('projectsTree.chipAria(AutoByteus)')
    await open(own)
    // The menu opens on the tab of what the chip shows.
    expect(own.find('[data-test="chat-project-options"]').exists()).toBe(true)
    await own.get('[data-test="chat-target-tab-workspaces"]').trigger('click')
    expect(own.find('[data-test="chat-workspace-option-ws_ab"] [data-test="chat-workspace-project-badge"]').exists()).toBe(true)
    expect(own.find('[data-test="chat-workspace-option-ws_x"] [data-test="chat-workspace-project-badge"]').exists()).toBe(false)
    own.unmount()

    const other = mountMenu({ projects, projectId: 'P', workspace: { kind: 'existing', workspaceId: 'ws_x' } })
    expect(other.get('[data-test="chat-workspace-trigger"]').text()).toBe('AutoByteus · x')
    other.unmount()
    const noFolder = mountMenu({ projects, projectId: 'Q' })
    expect(noFolder.get('[data-test="chat-workspace-trigger"]').text()).toBe('Notes Project')
  })
})
