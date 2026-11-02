import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h, nextTick } from 'vue'
import { getApolloClient } from '~/utils/apolloClient'
import NotificationCenter from '../NotificationCenter.vue'
import SidebarNotificationsEntry from '~/components/layout/SidebarNotificationsEntry.vue'
import { useUpdateNotificationsStore } from '~/stores/updateNotificationsStore'
import { useAppUpdateStore } from '~/stores/appUpdateStore'
import type { AppUpdateNotification, AppUpdateState } from '~/shared/appUpdateTypes'
import { localizationRuntime } from '~/localization/runtime/localizationRuntime'

// autobyteus-356: the app's "Update automatically" switch and its outcomes in the Notification Center (REQ-001, REQ-005).
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: vi.fn() }))
vi.mock('~/stores/agentPackagesStore', () => ({ useAgentPackagesStore: () => ({ updateAgentPackage: vi.fn() }) }))
vi.mock('~/stores/skillSourcesStore', () => ({ useSkillSourcesStore: () => ({ githubOperation: vi.fn() }) }))
vi.mock('~/stores/skillStore', () => ({ useSkillStore: () => ({ fetchAllSkills: vi.fn().mockResolvedValue(undefined) }) }))
vi.mock('~/stores/skillNamesStore', () => ({
  useSkillNamesStore: () => ({ runWithSkillNameChecks: async (action: () => Promise<unknown>) => action() }),
}))
vi.mock('~/stores/capabilities/updateChecksCapabilityStore', () => ({
  useUpdateChecksCapabilityStore: () => ({ status: 'resolved', isEnabled: true, ensureResolved: vi.fn().mockResolvedValue(null) }),
}))

const FOUND_AT = '2026-11-01T10:00:00.000Z'
const record = (overrides: Partial<AppUpdateNotification> = {}): AppUpdateNotification => ({
  version: '1.5.7', fromVersion: '1.5.6', foundAt: FOUND_AT, read: false, state: 'waiting', handledVersion: null,
  releasePageUrl: null, outcome: null, outcomeReason: null, outcomeStep: null, ...overrides,
})
const Host = defineComponent({ setup: () => () => h('div', [h(SidebarNotificationsEntry, { variant: 'inline' }), h(NotificationCenter)]) })

let wrapper: VueWrapper | null = null
const electronApi = {
  setAppUpdateAutomatic: vi.fn(),
  markAppUpdateNotificationRead: vi.fn(),
}
const mountWith = async (state: Partial<AppUpdateState>) => {
  vi.mocked(getApolloClient).mockReturnValue({
    query: vi.fn().mockResolvedValue({ data: { updateNotifications: [] } }), mutate: vi.fn(),
  } as any)
  const app = useAppUpdateStore()
  app.isElectron = true
  app.applyRemoteState({ status: 'idle', currentVersion: '1.5.6', autoCheck: { enabled: true, intervalMinutes: 60 }, ...state })
  await useUpdateNotificationsStore().reload()
  wrapper = mount(Host, { attachTo: document.body, global: { mocks: { $t: (key: string, params?: Record<string, unknown>) =>
    localizationRuntime.translate(key, params as Record<string, string | number>) } } })
  await nextTick()
}
const $ = <T extends Element = HTMLElement>(selector: string) => document.querySelector<T>(selector)
const pill = () => $<HTMLButtonElement>('[data-test="sidebar-notifications-updates"]')
const openPanel = async () => { pill()!.click(); await nextTick(); await nextTick() }
const appSwitch = () => $<HTMLButtonElement>('[data-testid="auto-update-app-toggle"]')!
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  Object.defineProperty(window, 'electronAPI', { configurable: true, writable: true, value: electronApi })
  electronApi.markAppUpdateNotificationRead.mockImplementation(async () => ({ ...useAppUpdateStore().$state,
    notification: useAppUpdateStore().notification ? { ...useAppUpdateStore().notification!, read: true } : null }))
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
  Object.defineProperty(window, 'electronAPI', { configurable: true, writable: true, value: undefined })
})

describe('Notification Center: the app automatic update', () => {
  it('the software section has the app switch, off by default; turning it on asks nothing (REQ-001)', async () => {
    electronApi.setAppUpdateAutomatic.mockImplementation(async (enabled: boolean) => ({
      accepted: true, persisted: true, state: { ...useAppUpdateStore().$state, automaticUpdate: enabled },
    }))
    await mountWith({ notification: record() })
    await openPanel()
    const section = $('[data-testid="notification-section-app"]')!
    expect(section.querySelector('[data-testid="auto-update-app"]')).not.toBeNull()
    expect(appSwitch().getAttribute('aria-checked')).toBe('false')
    expect($('[data-testid="auto-update-app-explanation"]')!.textContent)
      .toBe('Install new versions on your channel as soon as they are downloaded. The app restarts by itself.')

    appSwitch().click()
    await flush(); await nextTick()
    expect(electronApi.setAppUpdateAutomatic).toHaveBeenCalledExactlyOnceWith(true)
    expect(document.querySelector('[data-testid="auto-update-app-confirm"]')).toBeNull()
    expect(appSwitch().getAttribute('aria-checked')).toBe('true')
    expect($('[data-testid="auto-update-app-explanation"]')!.textContent).toContain('restarts by itself. Switch off to update by hand.')
  })

  it('says the switch has no effect while the app\'s own checks are off', async () => {
    await mountWith({ notification: record(), automaticUpdate: true, autoCheck: { enabled: false, intervalMinutes: 60 } })
    await openPanel()
    expect($('[data-testid="auto-update-app-no-effect"]')!.textContent).toContain('only a check you start installs new versions')
  })

  it('an automatic update says "Updated automatically to <version>", new until seen, and keeps the entry visible (REQ-005)', async () => {
    await mountWith({ currentVersion: '1.5.7', notification: record({ state: 'handled', handledVersion: '1.5.7', outcome: 'AUTO_UPDATED' }) })
    expect(pill()).not.toBeNull()
    await openPanel()
    const row = $('[data-testid="notification-row-app"]')!
    expect(row.querySelector('[data-testid="notification-row-change"]')!.textContent).toContain('Updated automatically to 1.5.7')
    expect(row.querySelector('[data-testid="notification-row-auto-changed"]')!.textContent).toContain('From 1.5.6')
    // A full version beside Clear must not push the check icon onto its own line.
    expect(row.querySelector('[data-testid="notification-row-change"]')!.className).toContain('flex-nowrap')
    expect(row.querySelector('[data-testid="notification-row-new"]')).not.toBeNull()
    await flush()
    expect(electronApi.markAppUpdateNotificationRead).toHaveBeenCalledOnce()
  })

  it('the entry counts an unread automatic app update, and keeps counting it while the panel is open (F-API-001)', async () => {
    electronApi.markAppUpdateNotificationRead.mockImplementation(async () => ({ notification: { ...useAppUpdateStore().notification!, read: true } }))
    await mountWith({ currentVersion: '1.5.7', notification: record({ state: 'handled', handledVersion: '1.5.7', outcome: 'AUTO_UPDATED' }) })
    expect(pill()!.getAttribute('aria-label')).toContain('1 update applied automatically')
    expect(pill()!.textContent).toContain('1 updated')
    await openPanel()
    await flush(); await nextTick()
    expect(useAppUpdateStore().notification!.read).toBe(true)
    expect(pill()!.textContent).toContain('1 updated')
  })

  it('a manual update (no outcome) does not keep the entry visible, even unread', async () => {
    await mountWith({ currentVersion: '1.5.7', notification: record({ state: 'handled', handledVersion: '1.5.7' }) })
    expect(useUpdateNotificationsStore().hasEntry).toBe(false)
    expect(pill()).toBeNull()
  })

  it('a refused update still downloaded: the failure, that it is not retried, and the Install click (SR-004)', async () => {
    await mountWith({ status: 'downloaded', notification: record({ outcome: 'AUTO_FAILED', outcomeStep: 'install', outcomeReason: 'The update was still not ready to install after 15 minutes.' }) })
    await openPanel()
    const row = $('[data-testid="notification-row-app"]')!
    expect(row.querySelector('[data-testid="notification-row-auto-failed"]')!.textContent).toContain('still not ready')
    expect(row.querySelector('[data-testid="notification-row-not-retried"]')!.textContent).toContain('You can still install it yourself.')
    expect(row.querySelector('[data-testid="notification-row-install"]')).not.toBeNull()
  })

  it('a failed download says nothing about not retrying; during the wait the row says it is preparing, with the Install click', async () => {
    await mountWith({ notification: record({ outcome: 'AUTO_FAILED', outcomeStep: 'download', outcomeReason: 'The update download was interrupted.' }) })
    await openPanel()
    expect($('[data-testid="notification-row-not-retried"]')).toBeNull()
    useAppUpdateStore().applyRemoteState({ status: 'downloaded', automaticInstallPreparing: true })
    await nextTick()
    expect($('[data-testid="notification-row-downloaded"]')!.textContent).toContain('Preparing to install.')
    expect($('[data-testid="notification-row-install"]')).not.toBeNull()
  })

  it('a failed automatic update says nothing was changed, with the reason, and still offers Download (REQ-004)', async () => {
    await mountWith({ notification: record({ outcome: 'AUTO_FAILED', outcomeStep: 'install', outcomeReason: 'The update did not install. The app is still on 1.5.6.' }) })
    await openPanel()
    const row = $('[data-testid="notification-row-app"]')!
    const failure = row.querySelector('[data-testid="notification-row-auto-failed"]')!
    expect(failure.textContent).toContain('Automatic update failed. Nothing was changed.')
    expect(failure.textContent).toContain('The update did not install. The app is still on 1.5.6.')
    expect(row.querySelector('[data-testid="notification-row-update"]')!.textContent).toContain('Download')
  })
})
