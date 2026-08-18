import { EventEmitter } from 'events'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BaseServerManager } from '../baseServerManager'
import { ServerStatus } from '../serverStatusEnum'
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

vi.mock('../../logger', () => ({ logger: mockScopedLogger }))

type FakeManager = EventEmitter & {
  startServer: ReturnType<typeof vi.fn>
  stopServer: ReturnType<typeof vi.fn>
  isRunning: ReturnType<typeof vi.fn>
  getServerUrls: ReturnType<typeof vi.fn>
}

const createManager = (): FakeManager => Object.assign(new EventEmitter(), {
  startServer: vi.fn(),
  stopServer: vi.fn(async () => undefined),
  isRunning: vi.fn(() => false),
  getServerUrls: vi.fn(() => ({ health: 'http://127.0.0.1:8000/rest/health' })),
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
      urls: { health: 'http://127.0.0.1:8000/rest/health' },
      message: detailedError.message,
      healthCheckStatus: '',
    }])
    expect(result.status).toBe(ServerStatus.ERROR)
    expect(result.message).toBe(detailedError.message)
  })
})
