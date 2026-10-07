import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import ChatWorkspaceMenu from '../ChatWorkspaceMenu.vue'
import { useWorkspaceStore } from '~/stores/workspace'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { localizationRuntime } from '~/localization/runtime/localizationRuntime'


type FolderResult = Awaited<ReturnType<Window['electronAPI']['showFolderDialog']>>
let wrapper: VueWrapper | null = null
let originalBridge: Window['electronAPI']
const showFolderDialog = vi.fn<() => Promise<FolderResult>>()
const field = () => wrapper!.get<HTMLInputElement>('#chat-workspace-path')
const browse = () => wrapper!.get<HTMLButtonElement>('[data-test="chat-workspace-browse"]')
const form = () => wrapper!.get('[data-test="chat-workspace-folder-form"]')
const trigger = () => wrapper!.get('[data-test="chat-workspace-trigger"]')
const pickerError = () => wrapper!.find('[data-test="chat-workspace-picker-error"]')
const openForm = async () => {
  await trigger().trigger('click')
  await wrapper!.get('[data-test="chat-workspace-open-folder"]').trigger('click')
  await flushPromises()
}
const mountForm = async () => {
  wrapper = mount(ChatWorkspaceMenu, {
    props: { workspace: { kind: 'existing', workspaceId: 'known' } },
    attachTo: document.body,
    global: { mocks: { $t: (key: string) => localizationRuntime.translate(key) } },
  })
  await openForm()
  return wrapper
}
const pendingPicker = () => {
  let resolve!: (result: FolderResult) => void
  showFolderDialog.mockReturnValue(new Promise<FolderResult>((done) => { resolve = done }))
  return resolve
}

beforeEach(() => {
  setActivePinia(createPinia())
  originalBridge = window.electronAPI
  window.electronAPI = { showFolderDialog } as unknown as Window['electronAPI']
  showFolderDialog.mockReset().mockResolvedValue({ canceled: true, path: null })
  window.history.replaceState(null, '', '/')
  useWorkspaceStore().workspaces = {
    known: { workspaceId: 'known', name: 'Known', absolutePath: '/owned/known', isTemp: false, workspaceConfig: {} },
  } as never
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  window.electronAPI = originalBridge
  window.history.replaceState(null, '', '/')
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('native folder input (REQ-001..005)', () => {
  it('labels the input and Browse; chooses text only, then reuses a known workspace on explicit apply', async () => {
    const menu = await mountForm()
    expect(document.activeElement).toBe(field().element)
    expect(menu.get('label').attributes('for')).toBe(field().attributes('id'))
    expect(field().attributes('aria-describedby')).toBe('chat-workspace-path-hint')
    expect(browse().text()).toBe('Browse…')
    expect(browse().attributes('type')).toBe('button')
    expect(menu.get('#chat-workspace-path-hint').text()).toBe('Choose a folder on this computer, or enter its full path.')
    const store = useWorkspaceStore()
    const find = vi.spyOn(store, 'findWorkspaceInfoByRootPath')
    const before = JSON.stringify(store.workspaces)
    showFolderDialog.mockResolvedValue({ canceled: false, path: '/owned/known' })
    await browse().trigger('click')
    await flushPromises()
    expect(field().element.value).toBe('/owned/known')
    expect(document.activeElement).toBe(field().element)
    expect(menu.emitted('select')).toBeUndefined()
    expect(find).not.toHaveBeenCalled()
    expect(JSON.stringify(store.workspaces)).toBe(before)
    await form().trigger('submit')
    expect(menu.emitted('select')).toEqual([[{ kind: 'existing', workspaceId: 'known' }]])
    expect(document.activeElement).toBe(trigger().element)
  })

  it('blocks duplicate requests and form Enter until the native request settles; new paths stay pending', async () => {
    const resolve = pendingPicker()
    const menu = await mountForm()
    await field().setValue('/owned/typed')
    const button = browse().element
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await form().trigger('submit')
    expect(showFolderDialog).toHaveBeenCalledTimes(1)
    expect(browse().text()).toBe('Opening…')
    expect(browse().element.disabled).toBe(true)
    expect(browse().attributes('aria-busy')).toBe('true')
    expect(form().get<HTMLButtonElement>('button[type="submit"]').element.disabled).toBe(true)
    expect(menu.emitted('select')).toBeUndefined()
    resolve({ canceled: false, path: '/owned/new' })
    await flushPromises()
    expect(browse().element.disabled).toBe(false)
    expect(menu.emitted('select')).toBeUndefined()
    await form().trigger('submit')
    expect(menu.emitted('select')).toEqual([[{ kind: 'folder', rootPath: '/owned/new' }]])
  })

  it.each<FolderResult>([
    { canceled: true, path: null }, { canceled: false, path: null },
    { canceled: false, path: '' }, { canceled: true, path: '/ignored' },
  ])('preserves typed input and selection silently for cancel/empty: %j', async (result) => {
    const menu = await mountForm()
    await field().setValue('/owned/typed')
    showFolderDialog.mockResolvedValue(result)
    await browse().trigger('click')
    await flushPromises()
    expect(field().element.value).toBe('/owned/typed')
    expect(menu.emitted('select')).toBeUndefined()
    expect(pickerError().exists()).toBe(false)
    expect(document.activeElement).toBe(browse().element)
    expect(trigger().attributes('title')).toBe('/owned/known')
  })

  it.each(['error+canceled', 'empty error', 'rejection'] as const)('shows recoverable inline failure for %s before considering cancellation', async (outcome) => {
    const menu = await mountForm()
    await field().setValue('/owned/typed')
    if (outcome === 'rejection') showFolderDialog.mockRejectedValue(new Error('private OS detail'))
    else showFolderDialog.mockResolvedValue({ canceled: true, path: null, error: outcome === 'empty error' ? '' : 'private OS detail' })
    await browse().trigger('click')
    await flushPromises()
    expect(field().element.value).toBe('/owned/typed')
    expect(menu.emitted('select')).toBeUndefined()
    expect(pickerError().attributes('role')).toBe('alert')
    expect(pickerError().text()).toBe('Couldn’t open the folder chooser. Try Browse again or enter a path.')
    expect(menu.text()).not.toContain('private OS detail')
    expect(field().attributes('aria-describedby')).toBe('chat-workspace-picker-error')
    expect(document.activeElement).toBe(browse().element)
    expect(browse().element.disabled).toBe(false)
    const resolve = pendingPicker()
    await browse().trigger('click')
    expect(pickerError().exists()).toBe(false)
    resolve({ canceled: false, path: '/owned/retry' })
    await flushPromises()
    expect(field().element.value).toBe('/owned/retry')
    expect(document.activeElement).toBe(field().element)
    expect(menu.emitted('select')).toBeUndefined()
  })

  it('clears stale validation on editing/selection and stale picker feedback on manual editing', async () => {
    await mountForm()
    await field().setValue('relative')
    await form().trigger('submit')
    expect(field().attributes('aria-invalid')).toBe('true')
    expect(field().attributes('aria-describedby')).toBe('chat-workspace-path-error')
    await field().setValue('/owned/manual')
    expect(field().attributes('aria-invalid')).toBeUndefined()
    showFolderDialog.mockResolvedValue({ canceled: true, path: null, error: 'failed' })
    await browse().trigger('click')
    await flushPromises()
    await field().setValue('relative-again')
    expect(pickerError().exists()).toBe(false)
    await form().trigger('submit')
    showFolderDialog.mockResolvedValue({ canceled: false, path: '/owned/selected' })
    await browse().trigger('click')
    await flushPromises()
    expect(field().attributes('aria-invalid')).toBeUndefined()
    expect(field().attributes('aria-describedby')).toBe('chat-workspace-path-hint')
  })

  it('form Cancel returns to the trigger without applying; menu Escape dismisses', async () => {
    const menu = await mountForm()
    await field().setValue('/owned/unapplied')
    await form().get('button[type="button"]:not([data-test])').trigger('click')
    expect(document.activeElement).toBe(trigger().element)
    expect(menu.find('[data-test="chat-workspace-menu"]').exists()).toBe(true)
    await menu.get('[data-test="chat-workspace-open-folder"]').trigger('click')
    expect(field().element.value).toBe('')
    await field().trigger('keydown', { key: 'Escape' })
    expect(menu.find('[data-test="chat-workspace-menu"]').exists()).toBe(false)
    expect(menu.emitted('select')).toBeUndefined()
  })
})

describe('native picker eligibility and form lifetime', () => {
  it.each(['browser', 'remote', 'mobile'] as const)('keeps %s manual-only with no native calls', async (context) => {
    if (context === 'browser') window.electronAPI = undefined as unknown as Window['electronAPI']
    if (context === 'remote') useWindowNodeContextStore().bindNodeContext('remote-node', 'http://remote.test:8000')
    if (context === 'mobile') window.history.replaceState(null, '', '/mobile/chat')
    const menu = await mountForm()
    expect(menu.find('[data-test="chat-workspace-browse"]').exists()).toBe(false)
    expect(menu.get('#chat-workspace-path-hint').text()).toBe('Enter the full folder path on the connected node.')
    await field().setValue('relative')
    await form().trigger('submit')
    expect(menu.emitted('select')).toBeUndefined()
    await field().setValue(' /server/typed ')
    await form().trigger('submit')
    expect(menu.emitted('select')).toEqual([[{ kind: 'folder', rootPath: '/server/typed' }]])
    expect(showFolderDialog).not.toHaveBeenCalled()
  })

  it.each(['cancel form', 'outside', 'Escape', 'node', 'workspace', 'unmount'] as const)('ignores a late reply after %s', async (change) => {
    const resolve = pendingPicker()
    const menu = await mountForm()
    await field().setValue('/owned/typed')
    await browse().trigger('click')
    if (change === 'cancel form') {
      await form().get('button[type="button"]:not([data-test])').trigger('click')
      await menu.get('[data-test="chat-workspace-open-folder"]').trigger('click')
    } else if (change === 'outside' || change === 'Escape') {
      document.dispatchEvent(change === 'outside'
        ? new MouseEvent('mousedown', { bubbles: true })
        : new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await flushPromises()
      await openForm()
    } else if (change === 'node') {
      useWindowNodeContextStore().bindNodeContext('other', 'http://remote.test:8000')
    } else if (change === 'workspace') {
      await menu.setProps({ workspace: { kind: 'folder', rootPath: '/owned/other' } })
    } else {
      menu.unmount()
      wrapper = null
    }
    if (['cancel form', 'outside', 'Escape'].includes(change)) {
      expect(browse().element.disabled).toBe(true)
      await browse().trigger('click')
      expect(showFolderDialog).toHaveBeenCalledTimes(1)
    }
    const focus = document.createElement('button')
    document.body.append(focus)
    focus.focus()
    resolve({ canceled: false, path: '/owned/stale' })
    await flushPromises()
    expect(document.activeElement).toBe(focus)
    expect(menu.emitted('select')).toBeUndefined()
    if (wrapper) {
      expect(field().element.value).not.toBe('/owned/stale')
      expect(form().get<HTMLButtonElement>('button[type="submit"]').element.disabled).toBe(false)
    }
  })

  it('accepts a reply after an equivalent workspace object refresh', async () => {
    const resolve = pendingPicker()
    const menu = await mountForm()
    await browse().trigger('click')
    await menu.setProps({ workspace: { kind: 'existing', workspaceId: 'known' } })
    resolve({ canceled: false, path: '/owned/current' })
    await flushPromises()
    expect(field().element.value).toBe('/owned/current')
    expect(document.activeElement).toBe(field().element)
  })
})
