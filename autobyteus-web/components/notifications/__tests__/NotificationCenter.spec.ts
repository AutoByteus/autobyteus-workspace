import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h, nextTick } from 'vue'
import { getApolloClient } from '~/utils/apolloClient'
import NotificationCenter from '../NotificationCenter.vue'
import SidebarNotificationsEntry from '~/components/layout/SidebarNotificationsEntry.vue'
import { useUpdateNotificationsStore } from '~/stores/updateNotificationsStore'
import { useNotificationCenterStore } from '~/stores/notificationCenterStore'
import { useAppUpdateStore } from '~/stores/appUpdateStore'
import type { NodeUpdateNotification } from '~/types/updateNotifications'
import { localizationRuntime } from '~/localization/runtime/localizationRuntime'

const { packagesStore, skillSourcesStore, capabilityState } = vi.hoisted(() => ({
  packagesStore: { updateAgentPackage: vi.fn() },
  skillSourcesStore: { githubOperation: vi.fn() },
  capabilityState: { status: 'resolved', isEnabled: true },
}))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: vi.fn() }))
vi.mock('~/stores/agentPackagesStore', () => ({ useAgentPackagesStore: () => packagesStore }))
vi.mock('~/stores/skillSourcesStore', () => ({ useSkillSourcesStore: () => skillSourcesStore }))
vi.mock('~/stores/skillStore', () => ({ useSkillStore: () => ({ fetchAllSkills: vi.fn().mockResolvedValue(undefined) }) }))
vi.mock('~/stores/skillNamesStore', () => ({
  useSkillNamesStore: () => ({ runWithSkillNameChecks: async (action: () => Promise<unknown>) => action() }),
}))
vi.mock('~/stores/capabilities/updateChecksCapabilityStore', () => ({
  useUpdateChecksCapabilityStore: () => ({ ...capabilityState, ensureResolved: vi.fn().mockResolvedValue(null) }),
}))

const A = 'a'.repeat(40)
const B = 'b'.repeat(40)
const node = (sourceId: string, overrides: Partial<NodeUpdateNotification> = {}): NodeUpdateNotification => ({
  kind: 'AGENT_PACKAGE', sourceId, name: `acme/${sourceId}`, repositoryUrl: `https://github.com/acme/${sourceId}`,
  defaultBranch: 'main', installedRevision: A, latestRevision: B, foundAt: new Date(Date.now() - 3_600_000).toISOString(),
  read: false, state: 'WAITING', handledRevision: null, handledAt: null, ...overrides,
})

const Host = defineComponent({
  setup: () => () => h('div', [h('div', { id: 'outside', tabindex: -1 }, 'page'), h(SidebarNotificationsEntry, { variant: 'inline' }), h(NotificationCenter)]),
})

let wrapper: VueWrapper | null = null
const mountWith = async (notifications: NodeUpdateNotification[]) => {
  const mutate = vi.fn(async ({ mutation }: { mutation: { definitions: Array<{ name?: { value: string } }> } }) => {
    const name = mutation.definitions[0]?.name?.value
    if (name === 'MarkUpdateNotificationsRead') return { data: { markUpdateNotificationsRead: notifications.map((entry) => ({ ...entry, read: true })) } }
    return { data: { clearUpdateNotification: [] } }
  })
  vi.mocked(getApolloClient).mockReturnValue({
    query: vi.fn().mockResolvedValue({ data: { updateNotifications: notifications } }), mutate,
  } as any)
  await useUpdateNotificationsStore().reload()
  // The real en catalog, so the specs check the approved strings.
  wrapper = mount(Host, { attachTo: document.body, global: { mocks: { $t: (key: string, params?: Record<string, unknown>) =>
    localizationRuntime.translate(key, params as Record<string, string | number>) } } })
  await nextTick()
  return { mutate }
}
const pill = () => document.querySelector<HTMLButtonElement>('[data-test="sidebar-notifications-updates"]')
const panel = () => document.querySelector<HTMLElement>('[data-testid="notification-center"]')
const openPanel = async () => { pill()!.click(); await nextTick(); await nextTick() }
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  capabilityState.status = 'resolved'
  capabilityState.isEnabled = true
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
})

describe('Notification Center', () => {
  it('shows the pill only while updates wait, solid while unread; nothing opens by itself (REQ-011)', async () => {
    await mountWith([node('p1'), node('p2', { kind: 'SKILL_SOURCE' })])
    expect(pill()!.textContent).toContain('2 updates')
    expect(pill()!.className).toContain('bg-sky-700')
    expect(pill()!.getAttribute('aria-label')).toBe('2 updates available: 1 agent package update, 1 skill update')
    expect(panel()).toBeNull()
  })

  it('opening marks everything read: the pill turns soft, the New dots stay until it closes (REQ-010)', async () => {
    const { mutate } = await mountWith([node('p1')])
    await openPanel()
    await flush()
    expect(panel()).not.toBeNull()
    expect(document.activeElement).toBe(panel())
    expect(mutate).toHaveBeenCalledTimes(1)
    expect(pill()!.className).toContain('bg-sky-100')
    expect(document.querySelectorAll('[data-testid="notification-row-new"]')).toHaveLength(1)
    useNotificationCenterStore().close()
    await nextTick()
    await openPanel()
    expect(document.querySelectorAll('[data-testid="notification-row-new"]')).toHaveLength(0)
  })

  it('closes on Esc and returns focus to the pill; a click outside closes without moving focus (UXJ-007)', async () => {
    await mountWith([node('p1')])
    await openPanel()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick(); await nextTick()
    expect(panel()).toBeNull()
    expect(document.activeElement).toBe(pill())

    await openPanel()
    const outside = document.getElementById('outside')!
    outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    await nextTick()
    expect(panel()).toBeNull()
  })

  it('the first Tab stop is ✕, which closes the panel', async () => {
    await mountWith([node('p1')])
    await openPanel()
    const close = document.querySelector<HTMLButtonElement>('[data-testid="notification-center-close"]')!
    expect(panel()!.querySelector('button')).toBe(close)
    close.click()
    await nextTick(); await nextTick()
    expect(panel()).toBeNull()
  })

  it('a package Update runs in the row; a skill Update first shows the existing confirmation (DEC-012)', async () => {
    await mountWith([node('p1'), node('s1', { kind: 'SKILL_SOURCE' })])
    await openPanel()
    packagesStore.updateAgentPackage.mockResolvedValue(undefined)
    document.querySelector<HTMLButtonElement>('[data-testid="notification-row-agent_package:p1"] [data-testid="notification-row-update"]')!.click()
    await flush()
    expect(packagesStore.updateAgentPackage).toHaveBeenCalledWith('p1')

    document.querySelector<HTMLButtonElement>('[data-testid="notification-row-skill_source:s1"] [data-testid="notification-row-update"]')!.click()
    await nextTick()
    expect(document.body.textContent).toContain('Update entire skill source?')
    expect(skillSourcesStore.githubOperation).not.toHaveBeenCalled()
    // Esc closes the confirmation first; the panel stays open.
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(document.body.textContent).not.toContain('Update entire skill source?')
    expect(panel()).not.toBeNull()
  })

  it('shows the first three rows of a section, then "Show N more" / "Show less" (TR-012)', async () => {
    await mountWith(['p1', 'p2', 'p3', 'p4', 'p5'].map((id) => node(id)))
    await openPanel()
    const rows = () => document.querySelectorAll('[data-testid^="notification-row-agent_package:"]')
    expect(rows()).toHaveLength(3)
    const more = document.querySelector<HTMLButtonElement>('[data-testid="notification-section-more"]')!
    expect(more.textContent).toContain('Show 2 more')
    more.click(); await nextTick()
    expect(rows()).toHaveLength(5)
    expect(more.textContent).toContain('Show less')
  })

  it('a handled row shows "Updated to" and Clear, and does not count', async () => {
    await mountWith([node('p1', { state: 'HANDLED', handledRevision: B, read: true })])
    expect(pill()).toBeNull()
    useNotificationCenterStore().open({ left: 8, bottom: 40 })
    await nextTick(); await nextTick()
    const row = document.querySelector('[data-testid="notification-row-agent_package:p1"]')!
    expect(row.textContent).toContain(`Updated to ${B.slice(0, 7)}`)
    expect(row.querySelector('[data-testid="notification-row-clear"]')).not.toBeNull()
  })

  it('the details show the repository · branch and the GitHub compare link (REQ-004, DEC-014)', async () => {
    await mountWith([node('p1')])
    await openPanel()
    document.querySelector<HTMLButtonElement>('[data-testid="notification-row-summary"]')!.click()
    await nextTick()
    const details = document.querySelector('[data-testid="notification-row-details"]')!
    expect(details.textContent).toContain('acme/p1 · main')
    expect(details.querySelector('a')!.getAttribute('href')).toBe(`https://github.com/acme/p1/compare/${A}...${B}`)
  })

  it('the empty panel says checks are off when the setting is off', async () => {
    capabilityState.isEnabled = false
    await mountWith([])
    useNotificationCenterStore().open({ left: 8, bottom: 40 })
    await nextTick(); await nextTick()
    expect(document.querySelector('[data-testid="notification-center-empty"]')!.textContent).toContain('Background checks are off.')
  })

  it('the app row offers Download, then the progress, then Install and restart (UXJ-005)', async () => {
    const app = useAppUpdateStore()
    app.isElectron = true
    app.applyRemoteState({ status: 'idle', currentVersion: '1.5.6', notification: {
      version: '1.5.7', fromVersion: '1.5.6', foundAt: new Date().toISOString(), read: false, state: 'waiting', handledVersion: null, releasePageUrl: null,
    } })
    await mountWith([])
    await openPanel()
    const appRow = () => document.querySelector('[data-testid="notification-row-app"]')!
    expect(appRow().querySelector('[data-testid="notification-row-update"]')!.textContent).toContain('Download')
    app.applyRemoteState({ status: 'downloading', downloadPercent: 42 })
    await nextTick()
    expect(appRow().textContent).toContain('Downloading 42%')
    expect(appRow().querySelector('[data-testid="notification-row-update"]')).toBeNull()
    app.applyRemoteState({ status: 'downloaded' })
    await nextTick()
    expect(appRow().querySelector('[data-testid="notification-row-install"]')).not.toBeNull()
  })
})
