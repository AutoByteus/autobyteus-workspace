import axios from 'axios'
import { EventEmitter } from 'events'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BaseServerManager } from '../baseServerManager'
import { ServerStatus } from '../../../types/serverStatus'
import { ServerStatusManager } from '../serverStatusManager'

const { mockScopedLogger } = vi.hoisted(() => {
  const logger = {
    child: vi.fn(),
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  }
  logger.child.mockImplementation(() => logger)
  return { mockScopedLogger: logger }
})

vi.mock('axios', () => ({ default: { get: vi.fn() } }))

vi.mock('../../logger', () => ({ logger: mockScopedLogger }))

type FakeManager = EventEmitter & {
  startServer: ReturnType<typeof vi.fn>
  stopServer: ReturnType<typeof vi.fn>
  isRunning: ReturnType<typeof vi.fn>
  getServerUrls: ReturnType<typeof vi.fn>
  getServerBaseUrl: ReturnType<typeof vi.fn>
}

const createManager = (): FakeManager => Object.assign(new EventEmitter(), {
  startServer: vi.fn(),
  stopServer: vi.fn(async () => undefined),
  isRunning: vi.fn(() => false),
  getServerUrls: vi.fn(() => ({ health: 'http://127.0.0.1:8000/rest/health' })),
  getServerBaseUrl: vi.fn(() => 'http://127.0.0.1:8000'),
})

describe('ServerStatusManager', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retains one detailed error transition when a restart attempt emits then rejects', async () => {
    const manager = createManager()
    const detailedError = new Error(
      'Server startup failed [APPLICATION_DATABASE_INITIALIZATION_FAILED]: schema unavailable',
    )
    manager.startServer.mockImplementation(async () => {
      manager.emit('error', detailedError)
      throw detailedError
    })
    const statusManager = new ServerStatusManager(manager as unknown as BaseServerManager)
    const statuses: Array<{ status: ServerStatus; message?: string }> = []
    statusManager.on('status-change', (status) => statuses.push(status))

    const result = await statusManager.restartServer()

    expect(statuses.filter((status) => status.status === ServerStatus.ERROR)).toEqual([{
      status: ServerStatus.ERROR,
      baseUrl: 'http://127.0.0.1:8000',
      urls: { health: 'http://127.0.0.1:8000/rest/health' },
      message: detailedError.message,
      healthCheckStatus: '',
    }])
    expect(result.status).toBe(ServerStatus.ERROR)
    expect(result.message).toBe(detailedError.message)
  })
})

it.each(['initialize', 'restart'])('preserves delayed %s snapshots across reads and clears on ready/error/new attempt', async mode => {
  const manager = createManager()
  let finish!: () => void
  manager.startServer.mockImplementation(() => new Promise<void>(resolve => { finish = resolve }))
  const bridge = new ServerStatusManager(manager as unknown as BaseServerManager)
  const statuses: Array<{ status: ServerStatus; message?: string }> = []
  bridge.on('status-change', value => statuses.push(value))
  const work = mode === 'initialize' ? bridge.initializeServer() : bridge.restartServer()
  await Promise.resolve()
  const pending = mode === 'initialize' ? ServerStatus.STARTING : ServerStatus.RESTARTING
  const message = 'Startup is taking longer than usual. Waiting for the backend; see logs for details.'
  manager.emit('startup-delayed', message)
  expect(bridge.getStatus()).toMatchObject({ status: pending, message })
  await bridge.checkServerHealth()
  expect(bridge.getStatus()).toMatchObject({ status: pending, message })
  expect(statuses.some(s => s.status === ServerStatus.ERROR)).toBe(false)
  manager.emit('ready'); finish(); await work
  expect(bridge.getStatus()).toMatchObject({ status: ServerStatus.RUNNING, message: undefined })
  manager.emit('startup-delayed', message)
  expect(bridge.getStatus().message).toBeUndefined()

  const next = bridge.restartServer()
  await Promise.resolve()
  expect(bridge.getStatus()).toMatchObject({ status: ServerStatus.RESTARTING, message: undefined })
  manager.emit('startup-delayed', message)
  manager.emit('error', new Error('genuine failure'))
  finish(); await next
  expect(bridge.getStatus()).toMatchObject({ status: ServerStatus.ERROR, message: 'genuine failure' })
  manager.emit('startup-delayed', message)
  expect(bridge.getStatus().message).toBe('genuine failure')
})

it('does not republish running from a diagnostic health response after a genuine failure', async () => {
  const manager = createManager()
  manager.isRunning.mockReturnValue(true)
  const bridge = new ServerStatusManager(manager as unknown as BaseServerManager)
  manager.emit('ready')
  let resolve!: (value: any) => void
  vi.mocked(axios.get).mockReturnValue(new Promise(r => { resolve = r }))
  const checking = bridge.checkServerHealth()
  manager.isRunning.mockReturnValue(false)
  manager.emit('error', new Error('current startup failed'))
  resolve({ status: 200, data: { status: 'ok' } })
  await checking
  expect(bridge.getStatus()).toMatchObject({ status: ServerStatus.ERROR, message: 'current startup failed' })
})
