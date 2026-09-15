import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EventEmitter } from 'events'
import { PassThrough } from 'stream'
import type { ChildProcess } from 'child_process'
import { BaseServerManager } from '../baseServerManager'
import { WindowsServerManager } from '../windowsServerManager'
import { ServerStatusManager } from '../serverStatusManager'
import { ServerStatus } from '../../../types/serverStatus'
import { createEmbeddedServerClientEndpoint } from '../../../shared/embeddedServerClientEndpoint'
import { EMBEDDED_SERVER_PLATFORM_FATAL_PROTOCOL } from '../embeddedServerPlatformFatal'

const { get, spawn, portCheck, log } = vi.hoisted(() => {
  const log: any = { child: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }
  log.child.mockReturnValue(log)
  return { get: vi.fn(), spawn: vi.fn(), portCheck: vi.fn(), log }
})
vi.mock('../../launch-profile/e2eLaunchPreflight', () => ({ assertEmbeddedServerListenerPortAvailable: portCheck }))
vi.mock('axios', () => ({ default: { get } }))
vi.mock('child_process', () => ({ spawn }))
vi.mock('electron-is-dev', () => ({ default: true }))
vi.mock('../../logger', () => ({ logger: log }))
vi.mock('../services/AppDataService', () => ({
  AppDataService: class {
    getAppDataDir() { return '/isolated/startup-test/server-data' }
    isFirstRun() { return false }
    initialize() {}
  },
}))

const config = { clientEndpoint: createEmbeddedServerClientEndpoint(29695), listenerPolicy: 'preserve-backend-default' as const, baseDataRoot: '/isolated/startup-test' }
const deferred = <T,>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(r => { resolve = r })
  return { promise, resolve }
}
const child = () => Object.assign(new EventEmitter(), {
  stdout: new PassThrough(), stderr: new PassThrough(), pid: 1234, exitCode: null, kill: vi.fn(() => true),
}) as unknown as ChildProcess
const healthy = { status: 200, data: { status: 'ok' } }
const notice = 'Startup is taking longer than usual. Waiting for the backend; see logs for details.'

// Both probes use the actual inherited platform stop method; only launch/preflight IO is controlled.
const probe = (Platform: typeof BaseServerManager) => class extends Platform {
  children: ChildProcess[] = []
  portWait = Promise.resolve()
  realPortWait = false
  environmentErrors: string[] = []
  launchError: Error | null = null
  protected getServerRoot() { return '/isolated/server' }
  protected validateServerEnvironment() { return this.environmentErrors }
  protected waitForPortToBeFree(timeout?: number, signal?: AbortSignal) {
    return this.realPortWait ? super.waitForPortToBeFree(timeout, signal) : this.portWait
  }
  protected async launchServerProcess() {
    if (this.launchError) throw this.launchError
    this.serverProcess = child()
    this.children.push(this.serverProcess)
    this.setupProcessHandlers()
  }
  currentChild() { return this.serverProcess }
}
const BaseProbe = probe(BaseServerManager)
const WindowsProbe = probe(WindowsServerManager)

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  get.mockRejectedValue(new Error('not listening yet'))
  spawn.mockImplementation(() => new EventEmitter())
  portCheck.mockRejectedValue(new Error('busy'))
})
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers() })

it('waits beyond 100s, notifies once, keeps the same child and bridge snapshot, then becomes ready once', async () => {
  const manager = new BaseProbe(config)
  const bridge = new ServerStatusManager(manager)
  const statuses: any[] = []
  bridge.on('status-change', status => statuses.push(status))
  const delayed = vi.fn(), ready = vi.fn(), error = vi.fn()
  manager.on('startup-delayed', delayed).on('ready', ready).on('error', error)
  const initial = bridge.initializeServer()
  const start = manager.startServer()
  expect(manager.startServer()).toBe(start)
  let settled = false
  void start.then(() => { settled = true })
  await vi.advanceTimersByTimeAsync(100_001)
  expect(settled).toBe(false)
  expect(manager.children).toHaveLength(1)
  expect(manager.children[0]!.kill).not.toHaveBeenCalled()
  expect(delayed).toHaveBeenCalledExactlyOnceWith(notice)
  expect(error).not.toHaveBeenCalled()
  expect(bridge.getStatus()).toMatchObject({ status: ServerStatus.STARTING, message: notice })
  const observed = get.mock.calls.length
  await vi.advanceTimersByTimeAsync(100_000)
  expect(get.mock.calls.length).toBeGreaterThan(observed)
  expect(delayed).toHaveBeenCalledTimes(1)
  expect(manager.listenerCount('ready')).toBe(3) // bridge, assertion, pending waiter
  get.mockResolvedValue(healthy)
  await vi.advanceTimersByTimeAsync(250)
  await initial; await start
  expect(ready).toHaveBeenCalledOnce()
  expect(statuses.filter(s => s.status === ServerStatus.RUNNING)).toHaveLength(1)
  expect(bridge.getStatus()).toMatchObject({ status: ServerStatus.RUNNING, message: undefined })
  expect(manager.isRunning()).toBe(true)
  expect(vi.getTimerCount()).toBe(0)
})

describe.each([['base', BaseProbe], ['Windows override', WindowsProbe]] as const)('%s stop contract', (_name, Probe) => {
  it('cancels pending preflight without close and does not let old setup launch or clear the next attempt', async () => {
    const manager = new Probe(config)
    const port = deferred<void>()
    manager.portWait = port.promise
    const first = manager.startServer()
    const rejected = expect(first).rejects.toThrow('startup stopped')
    await vi.advanceTimersByTimeAsync(0)
    expect(manager.children).toHaveLength(0)
    await manager.stopServer()
    await rejected
    manager.portWait = Promise.resolve()
    const second = manager.startServer()
    await vi.advanceTimersByTimeAsync(0)
    port.resolve()
    await vi.advanceTimersByTimeAsync(0)
    expect(manager.startServer()).toBe(second)
    expect(manager.children).toHaveLength(1)
    get.mockResolvedValue(healthy)
    await vi.advanceTimersByTimeAsync(250)
    await second
    expect(vi.getTimerCount()).toBe(0)
  })

  it('disposes pending observations on stop, even when shutdown produces no child close', async () => {
    const manager = new Probe(config)
    const start = manager.startServer()
    const rejected = expect(start).rejects.toThrow('startup stopped')
    await vi.advanceTimersByTimeAsync(100_001)
    const oldChild = manager.currentChild()!
    vi.mocked(oldChild.kill).mockImplementation(() => { throw new Error('already gone') })
    const stopping = manager.stopServer()
    await rejected
    const observed = get.mock.calls.length
    // Windows actual override reaches its bounded no-close hard cleanup, not Base.stopServer.
    await vi.advanceTimersByTimeAsync(12_001)
    await stopping
    expect(get.mock.calls.length).toBe(observed)
    expect(manager.currentChild()).toBeNull()
    expect(manager.listenerCount('ready')).toBe(0)
    expect(manager.listenerCount('error')).toBe(0)
    expect(manager.listenerCount('stopped')).toBe(0)
    const next = manager.startServer()
    await vi.advanceTimersByTimeAsync(0)
    const current = manager.currentChild()
    oldChild.emit('close', 0)
    expect(manager.currentChild()).toBe(current)
    expect(manager.startServer()).toBe(next)
    get.mockResolvedValue(healthy)
    await vi.advanceTimersByTimeAsync(250)
    await next
    expect(vi.getTimerCount()).toBe(0)
  })
})

it.each(['fatal', 'error', 'close-zero', 'close-nonzero'])('retains genuine %s failure once; delayed/late health and output cannot revive it', async cause => {
  const response = deferred<typeof healthy>()
  get.mockReturnValue(response.promise)
  const manager = new BaseProbe(config)
  const errors = vi.fn(), ready = vi.fn(), delayed = vi.fn()
  manager.on('error', errors).on('ready', ready).on('startup-delayed', delayed)
  const start = manager.startServer()
  const rejected = expect(start).rejects.toThrow(cause === 'fatal' ? 'essential prerequisite' : cause === 'error' ? 'spawn fault' : 'exited before health')
  await vi.advanceTimersByTimeAsync(100_001)
  const proc = manager.currentChild()!
  if (cause === 'fatal') {
    const record = JSON.stringify({ protocol: EMBEDDED_SERVER_PLATFORM_FATAL_PROTOCOL, code: 'APP_DATA_STARTUP_GATE_FAILED', summary: 'essential prerequisite', logPath: '/isolated/server.log' }) + '\n'
    proc.stderr!.emit('data', record.slice(0, 40))
    expect(errors).not.toHaveBeenCalled()
    proc.stderr!.emit('data', record.slice(40))
  } else if (cause === 'error') proc.emit('error', new Error('spawn fault'))
  else proc.emit('close', cause === 'close-zero' ? 0 : 1)
  await rejected
  response.resolve(healthy)
  proc.stdout!.emit('data', 'Server listening on port 29695\n')
  await vi.advanceTimersByTimeAsync(100_001)
  expect(errors).toHaveBeenCalledTimes(1)
  expect(ready).not.toHaveBeenCalled()
  expect(manager.isRunning()).toBe(false)
  expect(delayed).toHaveBeenCalledTimes(1)
  expect(vi.getTimerCount()).toBe(0)
})

it.each(['environment', 'port', 'launch'])('reports genuine %s setup failure and permits a fresh attempt', async cause => {
  const manager = new BaseProbe(config)
  const errors = vi.fn()
  manager.on('error', errors)
  if (cause === 'environment') manager.environmentErrors = ['missing entry']
  if (cause === 'port') manager.portWait = Promise.reject(new Error('port busy'))
  if (cause === 'launch') manager.launchError = new Error('spawn unavailable')
  await expect(manager.startServer()).rejects.toThrow()
  expect(errors).toHaveBeenCalledTimes(1)
  manager.environmentErrors = []; manager.portWait = Promise.resolve(); manager.launchError = null
  get.mockResolvedValue(healthy)
  await manager.startServer()
  expect(manager.children).toHaveLength(1)
  expect(manager.isRunning()).toBe(true)
})

it('ignores a stopped generation health result while its successor remains pending', async () => {
  const response = deferred<typeof healthy>()
  get.mockReturnValueOnce(response.promise)
  const manager = new BaseProbe(config)
  const first = manager.startServer()
  const rejected = expect(first).rejects.toThrow('startup stopped')
  await vi.advanceTimersByTimeAsync(0)
  vi.mocked(manager.currentChild()!.kill).mockImplementation(() => { throw new Error('gone') })
  await manager.stopServer(); await rejected
  const next = manager.startServer()
  await vi.advanceTimersByTimeAsync(0)
  response.resolve(healthy)
  await vi.advanceTimersByTimeAsync(0)
  expect(manager.isRunning()).toBe(false)
  expect(manager.startServer()).toBe(next)
  get.mockResolvedValue(healthy)
  await vi.advanceTimersByTimeAsync(250); await next
})

it('aborts the real bounded port-release polling operation without launching after stop', async () => {
  const manager = new BaseProbe(config)
  manager.realPortWait = true
  const start = manager.startServer()
  const rejected = expect(start).rejects.toThrow('startup stopped')
  await vi.advanceTimersByTimeAsync(0)
  expect(portCheck).toHaveBeenCalledOnce()
  await manager.stopServer()
  await rejected
  await vi.advanceTimersByTimeAsync(10_001)
  expect(portCheck).toHaveBeenCalledOnce()
  expect(manager.children).toHaveLength(0)
})
