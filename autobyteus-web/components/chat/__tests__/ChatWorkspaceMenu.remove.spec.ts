import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import ChatWorkspaceMenu from '../ChatWorkspaceMenu.vue'
import { useWorkspaceStore } from '~/stores/workspace'
import { useRunHistoryStore } from '~/stores/runHistoryStore'

// workspace-tree-vs-chooser (REQ-002, REQ-004, AC-002, AC-005, VIS-007…VIS-010): the chooser lists every folder, also one
// the left panel does not list, and its "Remove" unregisters a folder after a confirmation.
const addToast = vi.fn()
vi.mock('~/composables/useToasts', () => ({ useToasts: () => ({ addToast }) }))
const labels: Record<string, string> = {
  'workspaceFolders.removeTitle': 'Remove folder',
  'workspaceFolders.removeConfirm': 'Remove',
  'workspaceFolders.removeBody': 'It will no longer be offered when you choose a folder, and its runs will not be listed in the left panel. Files, memories, artifacts, and run history are not deleted. Add the folder again to use it.',
}
vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({
    t: (key: string, params?: Record<string, string>) => key === 'workspaceFolders.removeQuestion'
      ? `Remove ${params?.name}?`
      : key === 'workspaceFolders.chooserRemove' ? `Remove ${params?.name}`
        : key === 'workspaceFolders.removedToast' ? `${params?.name} removed. Files, memories, and run history were not deleted.`
          : labels[key] ?? key,
  }),
}))

const workspace = (workspaceId: string, name: string, absolutePath: string, extra: Record<string, unknown> = {}) =>
  ({ workspaceId, name, absolutePath, workspaceRootPath: absolutePath, workspaceConfig: {}, isTemp: false, ...extra })

let wrapper: VueWrapper | null = null
const mountMenu = (selectedId = 'ws_notes') => {
  wrapper = mount(ChatWorkspaceMenu, {
    props: { workspace: { kind: 'existing', workspaceId: selectedId } },
    attachTo: document.body,
  })
  return wrapper
}
const openMenu = async (menu: VueWrapper) => {
  await menu.get('[data-test="chat-workspace-trigger"]').trigger('click')
  await flushPromises()
}
const dialog = () => document.body.querySelector<HTMLElement>('[role="dialog"]')
const dialogButton = (label: string) => Array.from(dialog()?.querySelectorAll('button') ?? [])
  .find((button) => button.textContent?.trim().toLowerCase() === label.toLowerCase()) as HTMLButtonElement | undefined

beforeEach(() => {
  setActivePinia(createPinia())
  addToast.mockReset()
  useWorkspaceStore().workspaces = {
    temp_ws_default: workspace('temp_ws_default', 'temp', '/Users/me/.autobyteus/temp_workspace', { isTemp: true }),
    ws_notes: workspace('ws_notes', 'notes', '/Users/me/notes'),
    // A folder without runs: the left panel does not list it; the chooser does.
    ws_old: workspace('ws_old', 'old-project', '/Users/me/old-project'),
  } as never
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.restoreAllMocks()
})

describe('ChatWorkspaceMenu Remove (workspace-tree-vs-chooser)', () => {
  it('offers every folder, and a Remove button (28px, centred) on each user folder only, not on Temp workspace', async () => {
    const menu = mountMenu()
    await openMenu(menu)

    expect(menu.find('[data-test="chat-workspace-option-ws_old"]').exists()).toBe(true)
    expect(menu.find('[data-test="chat-workspace-remove-ws_old"]').attributes('aria-label')).toBe('Remove old-project')
    expect(menu.find('[data-test="chat-workspace-remove-ws_notes"]').exists()).toBe(true)
    expect(menu.get('[data-test="chat-workspace-remove-ws_old"]').classes()).toEqual(expect.arrayContaining(['h-7', 'w-7', 'self-center', 'md:opacity-0']))
    expect(menu.find('[data-test="chat-workspace-remove-temp_ws_default"]').exists()).toBe(false)
    // Arrow-key navigation moves between options only.
    expect(menu.find('[data-test="chat-workspace-remove-ws_old"]').attributes('data-option')).toBeUndefined()
  })

  it('asks first; Cancel removes nothing', async () => {
    const store = useWorkspaceStore()
    const remove = vi.spyOn(store, 'removeWorkspace')
    const menu = mountMenu()
    await openMenu(menu)

    await menu.get('[data-test="chat-workspace-remove-ws_old"]').trigger('click')
    await flushPromises()

    expect(menu.find('[data-test="chat-workspace-menu"]').exists()).toBe(false)
    expect(dialog()?.textContent).toContain('Remove folder')
    expect(dialog()?.innerHTML).toContain('Remove <strong>old-project</strong>?')
    expect(dialog()?.textContent).toContain('Files, memories, artifacts, and run history are not deleted.')
    expect(dialog()?.textContent).toContain('/Users/me/old-project')
    dialogButton('Cancel')?.click()
    await flushPromises()

    expect(remove).not.toHaveBeenCalled()
    expect(dialog()).toBeNull()
  })

  it('AC-002: confirming unregisters the folder, drops it from the left panel\'s history, and keeps the current choice', async () => {
    const store = useWorkspaceStore()
    const remove = vi.spyOn(store, 'removeWorkspace').mockImplementation(async (workspaceId: string) => {
      delete store.workspaces[workspaceId]
      return { workspaceRootPath: '/Users/me/old-project', message: 'Workspace removed from Workspaces.' }
    })
    const prune = vi.spyOn(useRunHistoryStore(), 'pruneWorkspace').mockImplementation(() => undefined)
    const menu = mountMenu()
    await openMenu(menu)

    await menu.get('[data-test="chat-workspace-remove-ws_old"]').trigger('click')
    await flushPromises()
    dialogButton('Remove')?.click()
    await flushPromises()

    expect(remove).toHaveBeenCalledWith('ws_old')
    expect(prune).toHaveBeenCalledWith('ws_old', '/Users/me/old-project')
    expect(addToast).toHaveBeenCalledWith('old-project removed. Files, memories, and run history were not deleted.', 'success')
    expect(menu.emitted('select')).toBeUndefined()
    expect(dialog()).toBeNull()
    await openMenu(menu)
    expect(menu.find('[data-test="chat-workspace-option-ws_old"]').exists()).toBe(false)
  })

  it('removing the chosen folder moves the chip to Temp workspace', async () => {
    const store = useWorkspaceStore()
    vi.spyOn(store, 'removeWorkspace').mockResolvedValue({ workspaceRootPath: '/Users/me/notes', message: 'removed' })
    vi.spyOn(useRunHistoryStore(), 'pruneWorkspace').mockImplementation(() => undefined)
    const menu = mountMenu('ws_notes')
    await openMenu(menu)

    await menu.get('[data-test="chat-workspace-remove-ws_notes"]').trigger('click')
    await flushPromises()
    dialogButton('Remove')?.click()
    await flushPromises()

    expect(menu.emitted('select')).toEqual([[{ kind: 'existing', workspaceId: 'temp_ws_default' }]])
  })

  it('AC-005: a refusal (a run is active) keeps the folder and shows the server message', async () => {
    const store = useWorkspaceStore()
    vi.spyOn(store, 'removeWorkspace').mockRejectedValue(
      new Error('Stop active runs before removing this workspace.'),
    )
    const prune = vi.spyOn(useRunHistoryStore(), 'pruneWorkspace')
    const menu = mountMenu()
    await openMenu(menu)

    await menu.get('[data-test="chat-workspace-remove-ws_old"]').trigger('click')
    await flushPromises()
    dialogButton('Remove')?.click()
    await flushPromises()

    expect(prune).not.toHaveBeenCalled()
    expect(addToast).toHaveBeenCalledWith('Stop active runs before removing this workspace.', 'error')
    expect(store.workspaces.ws_old).toBeDefined()
    expect(menu.emitted('select')).toBeUndefined()
  })
})
