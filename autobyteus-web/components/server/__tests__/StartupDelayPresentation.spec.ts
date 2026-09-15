import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ServerLoading from '../ServerLoading.vue'
import ServerMonitor from '../ServerMonitor.vue'
import { useServerStore } from '~/stores/serverStore'
import { ServerStatus, type ServerStatusSnapshot } from '~/types/serverStatus'

vi.mock('~/components/server/ServerLogViewer.vue', () => ({ default: { template: '<div>Log viewer</div>' } }))
const message = 'Startup is taking longer than usual. Waiting for the backend; see logs for details.'
const urls = { graphql: 'http://127.0.0.1:29695/graphql', rest: 'http://127.0.0.1:29695/rest', graphqlWs: '', terminalWs: '', transcription: '', health: 'http://127.0.0.1:29695/rest/health' }
let snapshot: ServerStatusSnapshot
let notify: (value: ServerStatusSnapshot) => void
const mounted: Array<ReturnType<typeof mount>> = []
beforeEach(() => {
  vi.useFakeTimers()
  setActivePinia(createPinia())
  snapshot = { status: ServerStatus.STARTING, baseUrl: 'http://127.0.0.1:29695', urls, message }
  Object.defineProperty(window, 'electronAPI', { configurable: true, value: {
    getServerStatus: vi.fn(async () => snapshot),
    onServerStatus: vi.fn(cb => { notify = cb }),
    checkServerHealth: vi.fn(async () => ({ status: 'starting' })),
    getLogFilePath: vi.fn(async () => '/isolated/server.log'),
    onAppQuitting: vi.fn(),
    restartServer: vi.fn(async () => undefined),
  } })
})
afterEach(() => {
  mounted.splice(0).forEach(wrapper => wrapper.unmount())
  vi.clearAllTimers(); vi.useRealTimers()
  delete (window as any).electronAPI
})

it.each([ServerStatus.STARTING, ServerStatus.RESTARTING])('projects delayed %s through initial IPC snapshot, real store and rendered loading/monitor', async status => {
  snapshot = { ...snapshot, status }
  const store = useServerStore()
  await store.initialize()
  await vi.advanceTimersByTimeAsync(0)
  const overlay = mount(ServerLoading), monitor = mount(ServerMonitor)
  mounted.push(overlay, monitor)
  await vi.advanceTimersByTimeAsync(0)
  expect(store.status).toBe(status)
  expect(store.statusMessage).toBe(message)
  expect(store.errorMessage).toBe('')
  expect(overlay.get('[role="status"]').text()).toBe(message)
  expect(monitor.text()).toContain(message)
  expect(monitor.text()).not.toContain('Unknown status')
  expect(overlay.find('.error-state').exists()).toBe(false)
  expect(overlay.text()).not.toContain('Advanced Recovery')
  const details = overlay.findAll('button').find(button => button.text() === 'Show technical details')!
  await details.trigger('click')
  expect(overlay.text()).toContain('/isolated/server.log')
  await vi.advanceTimersByTimeAsync(101_000)
  expect(store.status).toBe(status)
  expect(store.connectionAttempts).toBe(0)
  expect(overlay.text()).toContain(message)

  // A status refresh and later pushed ready event use the same existing projection.
  store.updateServerStatus(await window.electronAPI!.getServerStatus())
  snapshot = { ...snapshot, status: ServerStatus.RUNNING, message: undefined }
  notify(snapshot)
  await nextTick()
  expect(store.statusMessage).toBe('')
  expect(store.errorMessage).toBe('')
  expect(overlay.find('.server-loading-container').exists()).toBe(false)

  notify({ ...snapshot, status: ServerStatus.RESTARTING, message })
  await nextTick()
  expect(overlay.text()).toContain(message)
  notify({ ...snapshot, status: ServerStatus.ERROR, message: 'Essential startup gate failed' })
  await nextTick()
  expect(store.statusMessage).toBe('')
  expect(overlay.get('.error-state').text()).toContain('Essential startup gate failed')
  expect(overlay.text()).not.toContain(message)
  await store.restartServer()
  await nextTick()
  expect(store.statusMessage).toBe('')
  expect(store.errorMessage).toBe('')
  expect(overlay.get('[role="status"]').text()).toBe('Restarting Agent Server...')
  notify({ ...snapshot, status: ServerStatus.STARTING })
  await nextTick()
  expect(store.connectionMessage).toBe('Connecting to Agent Server...')
})

it('retains the browser retry limit instead of applying Electron delayed-start policy', async () => {
  delete (window as any).electronAPI
  const store = useServerStore()
  store.connectionAttempts = store.maxConnectionAttempts
  await store.attemptServerConnection()
  expect(store.status).toBe(ServerStatus.ERROR)
  expect(store.errorMessage).toContain('5 attempts')
})
