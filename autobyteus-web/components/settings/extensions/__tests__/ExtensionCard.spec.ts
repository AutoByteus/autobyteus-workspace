import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ExtensionCard from '../ExtensionCard.vue'
import { useExtensionsStore } from '~/stores/extensionsStore'
import type { ExtensionItem } from '~/types/extensions'

/** The common extension card in each state of the list payload (VIS-V1…V13; ui-ux-spec card component). */
const item = (overrides: Partial<ExtensionItem> = {}): ExtensionItem => ({
  id: 'voice-input', name: 'Voice Input', description: 'Dictate instead of typing.', platforms: ['darwin-arm64', 'win32-x64'],
  translations: { 'zh-CN': { name: '语音输入', description: '用说话代替打字。' } }, state: 'notInstalled', catalogVersion: '1.0.0',
  notAvailableReason: null, progress: null, installedVersion: null, enabled: null, ready: null, message: null, starting: false,
  update: null, failureMessage: null, ...overrides,
})
const installed = (overrides: Partial<ExtensionItem> = {}) => item({ state: 'installed', installedVersion: '1.0.0', enabled: true, ready: true, message: 'Ready.', update: 'none', ...overrides })
const render = (value: ExtensionItem, options: { canInstall?: boolean; platform?: string } = {}) => mount(ExtensionCard, {
  props: { item: value, platform: options.platform ?? 'darwin-arm64', canInstall: options.canInstall ?? true },
  global: { stubs: { ExtensionPageFrame: true } },
})
const text = (wrapper: ReturnType<typeof render>, id: string) => wrapper.get(`[data-testid="${id}"]`).text()

describe('ExtensionCard', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('Not installed: name, catalog version, pill and Install, disabled without a verified catalog (V2-01, V13)', async () => {
    const store = useExtensionsStore()
    const install = vi.spyOn(store, 'install').mockResolvedValue()
    const wrapper = render(item())
    expect(text(wrapper, 'extension-version-voice-input')).toBe('1.0.0')
    expect(text(wrapper, 'extension-state-voice-input')).toBe('Not installed')
    await wrapper.get('[data-testid="extension-install-voice-input"]').trigger('click')
    expect(install).toHaveBeenCalledWith('voice-input')
    expect(render(item(), { canInstall: false }).get('[data-testid="extension-install-voice-input"]').attributes('disabled')).toBeDefined()
  })

  it('Installing: the extension\'s progress message, a percent only when it reports one (V2-02, V2-03)', () => {
    const moving = render(item({ state: 'installing', progress: { message: 'Preparing the speech model', percent: null } }))
    expect(text(moving, 'extension-state-voice-input')).toBe('Installing')
    expect(text(moving, 'extension-progress-voice-input')).toBe('Preparing the speech model')
    const counted = render(item({ state: 'installing', progress: { message: 'Downloading', percent: 35 } }))
    expect(text(counted, 'extension-progress-voice-input')).toContain('35%')
  })

  it('Installed and on, starting: spinner and "Installed and on." after this window installed it (V2-04, TR-001)', () => {
    const store = useExtensionsStore()
    store.justInstalled['voice-input'] = true
    const wrapper = render(installed({ starting: true, message: 'Getting ready: the speech model is loading (about 30 seconds).' }))
    expect(text(wrapper, 'extension-state-voice-input')).toBe('On')
    expect(wrapper.find('[data-testid="extension-starting-voice-input"]').exists()).toBe(true)
    expect(text(wrapper, 'extension-message-voice-input')).toBe('Installed and on. Getting ready: the speech model is loading (about 30 seconds).')
  })

  it('Ready says nothing more; Off is a pill and the switch; a start failure is Not ready with its reason (V2-05, V4, V12-02)', async () => {
    const ready = render(installed())
    expect(ready.find('[data-testid="extension-message-voice-input"]').exists()).toBe(false)
    const store = useExtensionsStore()
    const setEnabled = vi.spyOn(store, 'setEnabled').mockResolvedValue()
    const off = render(installed({ enabled: false }))
    expect(text(off, 'extension-state-voice-input')).toBe('Off')
    expect(off.get('[data-testid="extension-switch-voice-input"]').attributes('aria-checked')).toBe('false')
    await off.get('[data-testid="extension-switch-voice-input"]').trigger('click')
    expect(setEnabled).toHaveBeenCalledWith('voice-input', true)
    const failedStart = render(installed({ ready: false, message: 'Could not start: ffmpeg is missing' }))
    expect(text(failedStart, 'extension-state-voice-input')).toBe('Not ready')
    expect(text(failedStart, 'extension-message-voice-input')).toBe('Could not start: ffmpeg is missing')
  })

  it('Update available, failed update and an update that needs a newer AutoByteus (V9-01, AC-003, V13-05)', () => {
    const available = render(installed({ update: 'available', catalogVersion: '1.1.0' }))
    expect(text(available, 'extension-update-badge-voice-input')).toBe('1.1.0 available')
    expect(text(available, 'extension-update-voice-input')).toBe('Update to 1.1.0')
    const failed = render(installed({ update: 'available', catalogVersion: '1.1.0', message: 'Update to 1.1.0 failed: model download failed' }))
    expect(text(failed, 'extension-message-voice-input')).toBe('Update to 1.1.0 failed: model download failed')
    const newer = render(installed({ update: 'needsNewerAutoByteus', catalogVersion: '2.0.0' }))
    expect(text(newer, 'extension-update-needs-newer-app-voice-input')).toBe('2.0.0 needs a newer AutoByteus')
    expect(newer.find('[data-testid="extension-update-voice-input"]').exists()).toBe(false)
  })

  it('Failed: the reason, Install again, View log and Remove; no settings (V13-02, V12-01)', () => {
    const wrapper = render(item({ state: 'failed', failureMessage: 'The download of Voice Input 1.0.0 does not match the signed list of extensions (SHA-256).' }))
    expect(text(wrapper, 'extension-state-voice-input')).toBe('Failed')
    expect(text(wrapper, 'extension-failed-voice-input')).toContain('does not match the signed list')
    expect(text(wrapper, 'extension-reinstall-voice-input')).toBe('Install again')
    expect(wrapper.find('[data-testid="extension-log-voice-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="extension-toggle-page-voice-input"]').exists()).toBe(false)
  })

  it('Not available: names this computer\'s platform and the offered ones, or needs a newer AutoByteus (V1-05, V13-04)', () => {
    const platform = render(item({ state: 'notAvailableHere', notAvailableReason: 'platform' }), { platform: 'linux-arm64' })
    expect(text(platform, 'extension-state-voice-input')).toBe('Not available on this computer')
    expect(text(platform, 'extension-not-available-voice-input')).toBe('There is no build for this computer, Linux (ARM). Offered for macOS (Apple silicon), Windows (x64).')
    const contract = render(item({ state: 'notAvailableHere', notAvailableReason: 'newerAutoByteus', catalogVersion: '2.0.0' }))
    expect(text(contract, 'extension-state-voice-input')).toBe('Not available')
    expect(text(contract, 'extension-not-available-voice-input')).toBe('Needs a newer AutoByteus. Update AutoByteus to install Voice Input 2.0.0.')
  })

  it('Removing: pill and bar while this window\'s Remove runs, no footer (V10-02)', () => {
    const store = useExtensionsStore()
    store.pending['voice-input'] = 'remove'
    const wrapper = render(installed())
    expect(text(wrapper, 'extension-state-voice-input')).toBe('Removing')
    expect(text(wrapper, 'extension-progress-voice-input')).toBe('Removing')
    expect(wrapper.find('[data-testid="extension-log-voice-input"]').exists()).toBe(false)
  })

  it('opens the extension\'s own page in place under the footer', async () => {
    const wrapper = render(installed())
    await wrapper.get('[data-testid="extension-toggle-page-voice-input"]').trigger('click')
    expect(wrapper.find('extension-page-frame-stub').exists()).toBe(true)
    expect(text(wrapper, 'extension-toggle-page-voice-input')).toBe('Hide settings')
  })
})
