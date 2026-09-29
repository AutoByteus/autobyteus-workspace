import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import ChatWorkspaceMenu from '../ChatWorkspaceMenu.vue'
import { useWorkspaceStore } from '~/stores/workspace'

const labels: Record<string, string> = {
  'chat.workspace.temp': 'Temp workspace',
  'chat.workspace.tempDescription': 'Scratch folder for quick chats',
  'chat.workspace.search': 'Search workspaces',
}
vi.mock('~/composables/useLocalization', () => ({ useLocalization: () => ({ t: (key: string) => labels[key] ?? key }) }))

const workspace = (workspaceId: string, name: string, absolutePath: string | null, isTemp = false) =>
  ({ workspaceId, name, absolutePath, isTemp, workspaceConfig: {} })

let wrapper: VueWrapper | null = null
const mountMenu = () => {
  wrapper = mount(ChatWorkspaceMenu, {
    props: { workspace: { kind: 'existing', workspaceId: 'temp_ws_default' } },
    attachTo: document.body,
  })
  return wrapper
}
const openMenu = async (menu: VueWrapper) => {
  await menu.get('[data-test="chat-workspace-trigger"]').trigger('click')
  await flushPromises()
}
const optionTests = (menu: VueWrapper) => menu.findAll('[data-option]').map((option) => option.attributes('data-test'))

beforeEach(() => {
  setActivePinia(createPinia())
  const store = useWorkspaceStore()
  store.workspaces = {
    temp_ws_default: workspace('temp_ws_default', 'temp', '/Users/me/.autobyteus/temp_workspace', true),
    ws_mcps: workspace('ws_mcps', 'autobyteus_mcps', '/Users/me/autobyteus_mcps'),
    ws_tools: workspace('ws_tools', 'tools', '/Users/me/work/MCPS-tools'),
    ws_notes: workspace('ws_notes', 'notes', '/Users/me/notes'),
  } as never
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

describe('ChatWorkspaceMenu search', () => {
  it('focuses a labelled search box on open and lists every workspace for an empty query', async () => {
    const menu = mountMenu()
    await openMenu(menu)
    const search = menu.get('[data-test="chat-workspace-search"]')
    expect(document.activeElement).toBe(search.element)
    // Template strings use the global test `$t` fallback (last key segment).
    expect(search.attributes('aria-label')).toBe('Search')
    expect(search.attributes('placeholder')).toBe('Search')
    expect(search.element.closest('[role="listbox"]')).toBeNull()
    expect(optionTests(menu)).toEqual(['chat-workspace-option-temp', 'chat-workspace-option-ws_mcps', 'chat-workspace-option-ws_notes', 'chat-workspace-option-ws_tools'])
    expect(menu.findAll('[role="listbox"] [role="option"]')).toHaveLength(4)
  })

  it('filters by name or path, hides the temp workspace unless it matches, and shows an empty state (AC-007)', async () => {
    const menu = mountMenu()
    await openMenu(menu)
    const search = menu.get('[data-test="chat-workspace-search"]')

    await search.setValue('MCPS')
    expect(optionTests(menu)).toEqual(['chat-workspace-option-ws_mcps', 'chat-workspace-option-ws_tools'])
    expect(menu.text()).toContain('Your workspaces')

    await search.setValue('scratch')
    expect(optionTests(menu)).toEqual(['chat-workspace-option-temp'])
    expect(menu.text()).not.toContain('Your workspaces')

    await search.setValue('zzz')
    expect(optionTests(menu)).toEqual([])
    expect(menu.find('[data-test="chat-workspace-search-empty"]').exists()).toBe(true)
    expect(menu.find('[data-test="chat-workspace-open-folder"]').exists()).toBe(true)
  })

  it('ArrowDown moves into the results and Enter picks the highlighted workspace (AC-008)', async () => {
    const menu = mountMenu()
    await openMenu(menu)
    const search = menu.get('[data-test="chat-workspace-search"]')
    await search.setValue('mcps')
    await search.trigger('keydown', { key: 'ArrowDown' })
    const first = menu.get('[data-test="chat-workspace-option-ws_mcps"]')
    expect(document.activeElement).toBe(first.element)

    await menu.get('[role="listbox"]').trigger('keydown', { key: 'ArrowDown' })
    const second = menu.get('[data-test="chat-workspace-option-ws_tools"]')
    expect(document.activeElement).toBe(second.element)
    await menu.get('[role="listbox"]').trigger('keydown', { key: 'ArrowUp' })
    await menu.get('[role="listbox"]').trigger('keydown', { key: 'ArrowUp' })
    expect(document.activeElement).toBe(search.element)

    await search.trigger('keydown', { key: 'ArrowDown' })
    await menu.get('[role="listbox"]').trigger('keydown', { key: 'ArrowDown' })
    await second.trigger('click')
    expect(menu.emitted('select')?.at(-1)?.[0]).toEqual({ kind: 'existing', workspaceId: 'ws_tools' })
    expect(menu.find('[data-test="chat-workspace-menu"]').exists()).toBe(false)
  })

  it('Enter in the search box picks the first match', async () => {
    const menu = mountMenu()
    await openMenu(menu)
    const search = menu.get('[data-test="chat-workspace-search"]')
    await search.setValue('notes')
    await search.trigger('keydown', { key: 'Enter', isComposing: true })
    expect(menu.emitted('select')).toBeUndefined()
    await search.trigger('keydown', { key: 'Enter' })
    expect(menu.emitted('select')?.at(-1)?.[0]).toEqual({ kind: 'existing', workspaceId: 'ws_notes' })
    expect(menu.find('[data-test="chat-workspace-menu"]').exists()).toBe(false)
  })

  it('Escape closes without selecting, and the query resets on reopen (AC-008)', async () => {
    const menu = mountMenu()
    await openMenu(menu)
    await menu.get('[data-test="chat-workspace-search"]').setValue('mcps')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()
    expect(menu.find('[data-test="chat-workspace-menu"]').exists()).toBe(false)
    expect(menu.emitted('select')).toBeUndefined()

    await openMenu(menu)
    expect((menu.get('[data-test="chat-workspace-search"]').element as HTMLInputElement).value).toBe('')
    expect(optionTests(menu)).toHaveLength(4)
  })
})
