import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h, nextTick } from 'vue'
import { getApolloClient } from '~/utils/apolloClient'
import NotificationCenter from '../NotificationCenter.vue'
import SidebarNotificationsEntry from '~/components/layout/SidebarNotificationsEntry.vue'
import { useUpdateNotificationsStore } from '~/stores/updateNotificationsStore'
import { useUpdateAutomationStore } from '~/stores/updateAutomationStore'
import { useNotificationCenterStore } from '~/stores/notificationCenterStore'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import type { NodeUpdateNotification, UpdateAutomationSettings } from '~/types/updateNotifications'
import type { AgentRuntime } from '~/types/agentRuntimes'
import { localizationRuntime } from '~/localization/runtime/localizationRuntime'

/** The Notification Center with automatic updates, their outcomes and agent runtimes (UXJ-003..008, 012). */
const { capabilityState } = vi.hoisted(() => ({ capabilityState: { status: 'resolved', isEnabled: true } }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: vi.fn() }))
vi.mock('~/stores/agentPackagesStore', () => ({ useAgentPackagesStore: () => ({ updateAgentPackage: vi.fn() }) }))
vi.mock('~/stores/skillSourcesStore', () => ({ useSkillSourcesStore: () => ({ githubOperation: vi.fn() }) }))
vi.mock('~/stores/skillStore', () => ({ useSkillStore: () => ({ fetchAllSkills: vi.fn().mockResolvedValue(undefined) }) }))
vi.mock('~/stores/skillNamesStore', () => ({
  useSkillNamesStore: () => ({ runWithSkillNameChecks: async (action: () => Promise<unknown>) => action() }),
}))
vi.mock('~/stores/capabilities/updateChecksCapabilityStore', () => ({
  useUpdateChecksCapabilityStore: () => ({ ...capabilityState, ensureResolved: vi.fn().mockResolvedValue(null) }),
}))

const A = 'a'.repeat(40)
const B = 'b'.repeat(40)
const hourAgo = () => new Date(Date.now() - 3_600_000).toISOString()
const record = (sourceId: string, overrides: Partial<NodeUpdateNotification> = {}): NodeUpdateNotification => ({
  kind: 'AGENT_PACKAGE', sourceId, name: `acme/${sourceId}`, repositoryUrl: `https://github.com/acme/${sourceId}`,
  defaultBranch: 'main', installedRevision: A, latestRevision: B, foundAt: hourAgo(), read: false, state: 'WAITING',
  handledRevision: null, handledAt: null, outcome: null, outcomeReason: null, outcomeAt: null, ...overrides,
})
const runtimeRecord = (overrides: Partial<NodeUpdateNotification> = {}): NodeUpdateNotification => record('claude_agent_sdk', {
  kind: 'AGENT_RUNTIME', name: 'claude_agent_sdk', repositoryUrl: null, defaultBranch: null,
  installedRevision: '2.1.302', latestRevision: '2.1.304', ...overrides,
})
const runtime = (overrides: Partial<AgentRuntime> = {}): AgentRuntime => ({
  runtimeKind: 'claude_agent_sdk', installed: true, installedVersion: '2.1.302',
  updates: { state: 'UPDATE_AVAILABLE', latestVersion: '2.1.304' }, account: { state: 'SIGNED_IN' }, signInRoute: 'COMMAND_LINE',
  installInstructionsUrl: 'https://install.example', runningAgentCount: 0, operation: null, checkedAt: hourAgo(), ...overrides,
})
const settings = (overrides: Partial<UpdateAutomationSettings> = {}): UpdateAutomationSettings => ({
  intervals: { agentPackages: 30, skillSources: 30, agentRuntimes: 60 },
  automaticUpdates: { agentPackages: false, skillSources: false, agentRuntimes: false },
  githubWaitUntil: null, desktopEmbeddedNode: true, ...overrides,
})

let notifications: NodeUpdateNotification[]
let automation: UpdateAutomationSettings
let runtimes: AgentRuntime[]
const mutate = vi.fn()
const operationName = (document: { definitions: Array<{ name?: { value: string } }> }) => document.definitions[0]?.name?.value

const Host = defineComponent({
  setup: () => () => h('div', [h('div', { id: 'outside' }, 'page'), h(SidebarNotificationsEntry, { variant: 'inline' }), h(NotificationCenter)]),
})
let wrapper: VueWrapper | null = null
const mountHost = async () => {
  await useUpdateAutomationStore().refresh()
  await useUpdateNotificationsStore().reload()
  wrapper = mount(Host, { attachTo: document.body, global: { mocks: { $t: (key: string, params?: Record<string, unknown>) =>
    localizationRuntime.translate(key, params as Record<string, string | number>) } } })
  await flushPromises()
}
const $ = <T extends Element = HTMLElement>(selector: string) => document.querySelector<T>(selector)
const pill = () => $<HTMLButtonElement>('[data-test="sidebar-notifications-updates"]')
const openPanel = async () => { pill()!.click(); await flushPromises() }

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  capabilityState.isEnabled = true
  notifications = []
  automation = settings()
  runtimes = [runtime()]
  vi.spyOn(useWindowNodeContextStore(), 'waitForBoundBackendReady').mockResolvedValue(true)
  mutate.mockImplementation(async ({ mutation, variables }: { mutation: never; variables: Record<string, unknown> }) => {
    switch (operationName(mutation)) {
      case 'MarkUpdateNotificationsRead':
        notifications = notifications.map((entry) => ({ ...entry, read: true }))
        return { data: { markUpdateNotificationsRead: notifications } }
      case 'SetAutomaticUpdates': {
        const field = { AGENT_PACKAGE: 'agentPackages', SKILL_SOURCE: 'skillSources', AGENT_RUNTIME: 'agentRuntimes' }[variables.kind as string]!
        automation = { ...automation, automaticUpdates: { ...automation.automaticUpdates, [field]: variables.enabled } }
        return { data: { setAutomaticUpdates: automation } }
      }
      case 'UpdateAgentRuntime':
        runtimes = runtimes.map((entry) => ({ ...entry, operation: { kind: 'UPDATE', state: 'RUNNING', command: 'claude update', step: null, fromVersion: '2.1.302', toVersion: null, error: null } }))
        return { data: { updateAgentRuntime: true } }
      default: return { data: {} }
    }
  })
  vi.mocked(getApolloClient).mockReturnValue({
    query: vi.fn(async ({ query }: { query: never }) => {
      switch (operationName(query)) {
        case 'GetUpdateNotifications': return { data: { updateNotifications: structuredClone(notifications) } }
        case 'GetUpdateAutomationSettings': return { data: { updateAutomationSettings: structuredClone(automation) } }
        default: return { data: { agentRuntimes: structuredClone(runtimes), agentRuntimeSignInBrowserAvailable: false } }
      }
    }),
    mutate,
  } as never)
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
  vi.useRealTimers()
})

describe('automatic updates in the Notification Center', () => {
  it('turning packages on asks first, above the panel; Cancel and Esc leave it off and the panel open (UXJ-004)', async () => {
    notifications = [record('p1')]
    await mountHost()
    await openPanel()
    const toggle = () => $<HTMLButtonElement>('[data-testid="auto-update-agent_package-toggle"]')!
    expect(toggle().getAttribute('aria-checked')).toBe('false')
    toggle().click()
    await nextTick()
    const dialog = $('[role="dialog"][aria-modal="true"]')!
    expect(dialog.textContent).toContain('Turn on automatic updates for agent packages?')
    expect(dialog.textContent).toContain('Local changes and files you added in a package are replaced without asking and cannot be restored.')
    expect(dialog.parentElement!.className).toContain('z-[100]')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect($('[role="dialog"][aria-modal="true"]')).toBeNull()
    expect($('[data-testid="notification-center"]')).not.toBeNull()
    expect(mutate.mock.calls.some(([options]) => operationName(options.mutation) === 'SetAutomaticUpdates')).toBe(false)
  })

  it('Turn on saves the one node setting; the text and the applying note follow (UXJ-003, TR-103)', async () => {
    notifications = [record('p1'), record('p2')]
    await mountHost()
    await openPanel()
    $<HTMLButtonElement>('[data-testid="auto-update-agent_package-toggle"]')!.click()
    await nextTick()
    const turnOn = Array.from(document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')).find((button) => button.textContent?.trim() === 'Turn on')!
    turnOn.click()
    await flushPromises()
    expect(mutate).toHaveBeenCalledWith(expect.objectContaining({ variables: { kind: 'AGENT_PACKAGE', enabled: true } }))
    expect($('[data-testid="auto-update-agent_package-toggle"]')!.getAttribute('aria-checked')).toBe('true')
    expect($('[data-testid="auto-update-agent_package-explanation"]')!.textContent).toContain('Installs new revisions on its own')
    expect($('[data-testid="auto-update-agent_package-applying"]')!.textContent).toContain('2 waiting updates will be installed within about a minute.')
  })

  it('a switch that is on says it has no effect while Update checks is off (UXJ-008)', async () => {
    capabilityState.isEnabled = false
    automation = settings({ automaticUpdates: { agentPackages: true, skillSources: false, agentRuntimes: false } })
    notifications = [record('p1')]
    await mountHost()
    await openPanel()
    expect($('[data-testid="auto-update-agent_package-no-effect"]')!.textContent).toContain('No effect while Update checks is off for this node.')
  })

  it('outcomes are rows of their kind: updated automatically (with the compare link) and an automatic failure (UXJ-005, 006)', async () => {
    notifications = [
      record('p1', { state: 'HANDLED', handledRevision: B, handledAt: hourAgo(), outcome: 'AUTO_UPDATED', outcomeAt: hourAgo() }),
      record('p2', { outcome: 'AUTO_FAILED', outcomeReason: 'GitHub answered 502 while downloading the repository archive.', read: true }),
    ]
    await mountHost()
    await openPanel()
    const updated = $('[data-testid="notification-row-agent_package:p1"]')!
    expect(updated.textContent).toContain(`Updated automatically to ${B.slice(0, 7)}`)
    expect(updated.querySelector('[data-testid="notification-row-compare"]')!.getAttribute('href')).toBe(`https://github.com/acme/p1/compare/${A}...${B}`)
    expect(updated.querySelector('[data-testid="notification-row-new"]')).not.toBeNull()
    const failed = $('[data-testid="notification-row-agent_package:p2"]')!
    expect(failed.querySelector('[data-testid="notification-row-auto-failed"]')!.textContent)
      .toContain('Automatic update failed. Nothing was changed.')
    expect(failed.textContent).toContain('GitHub answered 502')
    expect(failed.querySelector('[data-testid="notification-row-update"]')).not.toBeNull()
  })

  it('the entry reads "N updated" when nothing waits and an automatic update is unread; it stays until the panel closes (UXJ-001)', async () => {
    notifications = [record('p1', { state: 'HANDLED', handledRevision: B, handledAt: hourAgo(), outcome: 'AUTO_UPDATED', outcomeAt: hourAgo() })]
    await mountHost()
    expect(pill()!.textContent).toContain('1 updated')
    expect(pill()!.getAttribute('aria-label')).toBe('1 update applied automatically: 1 updated automatically')
    await openPanel()
    expect(mutate).toHaveBeenCalledWith(expect.objectContaining({ mutation: expect.anything() }))
    expect(notifications[0]!.read).toBe(true)
    expect(pill()).not.toBeNull()
    useNotificationCenterStore().close()
    await nextTick()
    expect(pill()).toBeNull()
  })
})

describe('agent runtimes in the Notification Center (REQ-020..022)', () => {
  it('shows the runtime category with the page\'s runtime name and versions in the own window of the desktop\'s node', async () => {
    notifications = [runtimeRecord()]
    await mountHost()
    await openPanel()
    const row = $('[data-testid="notification-row-agent_runtime:claude_agent_sdk"]')!
    expect($('[data-testid="notification-section-agent_runtime"]')!.textContent).toContain('Agent runtime update')
    expect(row.textContent).toContain('Claude')
    expect(row.textContent).toContain('2.1.302')
    expect(row.textContent).toContain('2.1.304')
    expect($('[data-testid="auto-update-agent_runtime-toggle"]')).not.toBeNull()
  })

  it('has no runtime category in a window of another node, nor when the node is not the desktop\'s own (AC-022)', async () => {
    notifications = [runtimeRecord(), record('p1')]
    automation = settings({ desktopEmbeddedNode: false })
    await mountHost()
    expect($('[data-test="sidebar-notifications-updates"]')!.textContent).toContain('1 update')
    await openPanel()
    expect($('[data-testid="notification-section-agent_runtime"]')).toBeNull()
    expect($('[data-testid="notification-section-agent_package"]')).not.toBeNull()
  })

  it('Update is unavailable while that runtime\'s agents run, and says why (UXJ-007, TR-111)', async () => {
    notifications = [runtimeRecord({ outcome: 'AUTO_WAITING', outcomeReason: 'Update unavailable while 2 agent(s) are running.' })]
    automation = settings({ automaticUpdates: { agentPackages: false, skillSources: false, agentRuntimes: true } })
    runtimes = [runtime({ runningAgentCount: 2 })]
    await mountHost()
    await openPanel()
    const update = $<HTMLButtonElement>('[data-testid="notification-row-agent_runtime:claude_agent_sdk"] [data-testid="notification-row-update"]')!
    expect(update.getAttribute('aria-disabled')).toBe('true')
    expect($('[data-testid="notification-row-blocked"]')!.textContent)
      .toContain('Update unavailable while 2 agents are running. It will be updated automatically once no agent is running.')
    update.click()
    await flushPromises()
    expect(mutate.mock.calls.some(([options]) => operationName(options.mutation) === 'UpdateAgentRuntime')).toBe(false)
  })

  it('with the runtime switch off, a waiting row no longer promises an automatic update (CR-002, REQ-022)', async () => {
    notifications = [runtimeRecord({ outcome: 'AUTO_WAITING', outcomeReason: 'Update unavailable while 2 agent(s) are running.' })]
    automation = settings({ automaticUpdates: { agentPackages: false, skillSources: false, agentRuntimes: false } })
    runtimes = [runtime({ runningAgentCount: 2 })]
    await mountHost()
    await openPanel()
    const blocked = $('[data-testid="notification-row-blocked"]')!.textContent!.trim()
    expect(blocked).toBe('Update unavailable while 2 agents are running.')
    expect(blocked).not.toContain('updated automatically')
  })

  it('Update runs the vendor update and shows Updating…, then the vendor\'s failure with Try again (UXJ-007, TR-108..110)', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    notifications = [runtimeRecord()]
    await mountHost()
    await openPanel()
    $<HTMLButtonElement>('[data-testid="notification-row-update"]')!.click()
    await flushPromises()
    expect(mutate).toHaveBeenCalledWith(expect.objectContaining({ variables: { runtimeKind: 'claude_agent_sdk' } }))
    expect($('[data-testid="notification-row-updating"]')).not.toBeNull()
    runtimes = [runtime({ operation: { kind: 'UPDATE', state: 'FAILED', command: 'claude update', step: null, fromVersion: '2.1.302', toVersion: null, error: 'npm ERR! EACCES' } })]
    await vi.advanceTimersByTimeAsync(2_000)
    await flushPromises()
    const error = $('[data-testid="notification-row-error"]')!
    expect(error.textContent).toContain('Update failed. Nothing was changed.')
    expect(error.textContent).toContain('npm ERR! EACCES')
    expect($('[data-testid="notification-row-update"]')!.textContent).toContain('Try again')
  })

  it('reads runtimes without starting a check, and stops reading when the panel closes', async () => {
    notifications = [runtimeRecord()]
    await mountHost()
    await openPanel()
    expect(mutate.mock.calls.some(([options]) => operationName(options.mutation) === 'CheckAgentRuntimes')).toBe(false)
    const query = vi.mocked(getApolloClient)().query as ReturnType<typeof vi.fn>
    const reads = () => query.mock.calls.filter(([options]) => operationName(options.query) === 'AgentRuntimes').length
    expect(reads()).toBe(1)
    useNotificationCenterStore().close()
    await flushPromises()
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    await vi.advanceTimersByTimeAsync(60_000)
    expect(reads()).toBe(1)
  })
})
