import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ServerLoading from '../ServerLoading.vue'
import ServerMonitor from '../ServerMonitor.vue'
import { useServerStore } from '~/stores/serverStore'
import { useLocalization } from '~/composables/useLocalization'
import { ServerStatus, type ServerStatusSnapshot } from '~/types/serverStatus'
vi.mock('~/components/server/ServerLogViewer.vue', () => ({ default: { template: '<div />' } }))
const wrappers: Array<ReturnType<typeof mount>> = []
beforeEach(() => {
  vi.useFakeTimers(); setActivePinia(createPinia())
  Object.defineProperty(window, 'electronAPI', { configurable: true, value: {
    checkServerHealth: vi.fn(async () => ({ status: 'starting' })), getLogFilePath: vi.fn(async () => ''), restartServer: vi.fn(),
  } })
})
afterEach(() => { wrappers.splice(0).forEach(w => w.unmount()); vi.clearAllTimers(); vi.useRealTimers(); delete (window as any).electronAPI })
it.each(['en', 'zh-CN'] as const)('shows safe conflict guidance in %s without details/reset and supplies derived monitor summary', async locale => {
  const { setPreference, t } = useLocalization(); await setPreference(locale)
  const store = useServerStore(); store.isElectron = true
  const snapshot: ServerStatusSnapshot = { status: ServerStatus.ERROR, baseUrl: 'http://127.0.0.1:54321',
    urls: { graphql: '', rest: '', graphqlWs: '', terminalWs: '', transcription: '', health: '' }, healthCheckStatus: '',
    message: 'old timeout error', diagnostic: { kind: 'port-conflict', port: 54321, inspection: 'available', observedAt: 'now', owners: [{ pid: 123, executable: '<unsafe-long-name>' }] } }
  store.updateServerStatus(snapshot)
  const loading = mount(ServerLoading, { global: { mocks: { $t: t } } }), monitor = mount(ServerMonitor, { global: { mocks: { $t: t } } }); wrappers.push(loading, monitor)
  await nextTick()
  expect(loading.get('[role="alert"]').text()).toContain('<unsafe-long-name>')
  expect(loading.get('[role="alert"]').text()).toContain(t('server.conflict.noReset'))
  expect(loading.find('unsafe-long-name').exists()).toBe(false)
  expect(loading.text()).not.toContain('Advanced Recovery')
  expect(monitor.text()).toContain(t('server.conflict.summary', { port: 54321 }))
  expect(monitor.text()).not.toContain('old timeout error')
  store.updateServerStatus({ ...snapshot, status: ServerStatus.RUNNING, diagnostic: undefined })
  await nextTick(); expect(store.diagnostic).toBeUndefined(); expect(loading.find('.error-state').exists()).toBe(false)
})
