import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { EventEmitter } from 'events'
import { PassThrough } from 'stream'
import type { ChildProcess } from 'child_process'
import { BaseServerManager } from '../baseServerManager'
import { EMBEDDED_SERVER_PLATFORM_FATAL_PROTOCOL } from '../embeddedServerPlatformFatal'
import { createEmbeddedServerClientEndpoint } from '../../../shared/embeddedServerClientEndpoint'
import type { EmbeddedServerLaunchConfig } from '../embeddedServerLaunchConfig'

const { axiosGet } = vi.hoisted(() => ({ axiosGet: vi.fn() }))

vi.mock('axios', () => ({ default: { get: axiosGet } }))

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  copyFileSync: vi.fn(),
  readdirSync: vi.fn(),
  promises: {
    rm: vi.fn()
  }
}))

vi.mock('os', () => ({
  homedir: vi.fn()
}))

const { mockScopedLogger } = vi.hoisted(() => {
  const hoistedLogger = {
    child: vi.fn(),
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    isLevelEnabled: vi.fn(),
    getLogPath: vi.fn(),
    close: vi.fn(),
  }
  hoistedLogger.child.mockImplementation(() => hoistedLogger)
  return {
    mockScopedLogger: hoistedLogger
  }
})

vi.mock('../../logger', () => ({
  logger: mockScopedLogger
}))

const mockedFs = vi.mocked(fs)
const mockedOs = vi.mocked(os)

const launchConfig: EmbeddedServerLaunchConfig = {
  clientEndpoint: createEmbeddedServerClientEndpoint(29695),
  listenerPolicy: 'preserve-backend-default',
  baseDataRoot: path.join('/user/home', '.autobyteus'),
  baseEnvironment: {},
}

class TestServerManager extends BaseServerManager {
  protected async launchServerProcess(): Promise<void> {
    return
  }

  protected getServerRoot(): string {
    return '/server'
  }

  public getFirstRun(): boolean {
    return this.firstRun
  }
}

const createChild = (): ChildProcess => {
  const child = new EventEmitter() as ChildProcess
  Object.assign(child, {
    stdout: new PassThrough(),
    stderr: new PassThrough(),
    kill: vi.fn(() => true),
  })
  return child
}

class LifecycleServerManager extends BaseServerManager {
  readonly child = createChild()

  protected async launchServerProcess(): Promise<void> {
    this.serverProcess = this.child
    this.setupProcessHandlers()
  }

  protected getServerRoot(): string {
    return '/server'
  }

  protected validateServerEnvironment(): string[] {
    return []
  }

  protected async waitForPortToBeFree(): Promise<void> {
    return
  }

  public configureStartupTiming(intervalMs: number, timeoutMs: number): void {
    this.healthPollIntervalMs = intervalMs
    this.maxStartupTime = timeoutMs
  }
}

const waitFor = async (predicate: () => boolean, timeoutMs = 500): Promise<void> => {
  const startedAt = Date.now()
  while (!predicate()) {
    if (Date.now() - startedAt > timeoutMs) throw new Error('Condition was not reached')
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
}

describe('BaseServerManager', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockedOs.homedir.mockReturnValue('/user/home')
    mockScopedLogger.child.mockImplementation(() => mockScopedLogger)
  })

  it('resetAppDataDir removes and recreates the app data directory', async () => {
    const appDataDir = path.join('/user/home', '.autobyteus', 'server-data')
    const envPath = path.join(appDataDir, '.env')
    const dataDirPaths = ['db', 'logs', 'download'].map((dir) => path.join(appDataDir, dir))
    let appDataExists = false
    let envExists = false
    const existingDataDirs = new Set<string>()
    mockedFs.existsSync.mockImplementation((p) => {
      if (p === appDataDir) return appDataExists
      if (p === envPath) return envExists
      if (dataDirPaths.includes(p)) return existingDataDirs.has(p)
      return true
    })
    const manager = new TestServerManager(launchConfig)
    appDataExists = true
    envExists = true
    dataDirPaths.forEach((p) => existingDataDirs.add(p))
    mockedFs.promises.rm.mockImplementationOnce(async () => {
      appDataExists = false
      envExists = false
      existingDataDirs.clear()
    })
    await manager.resetAppDataDir()

    expect(mockedFs.promises.rm).toHaveBeenCalledWith(manager.getAppDataDir(), { recursive: true, force: true })
    expect(mockedFs.mkdirSync).toHaveBeenCalledWith(manager.getAppDataDir(), { recursive: true })
    expect(manager.getFirstRun()).toBe(true)
  })

  it('ignores ready-looking logs and settles only after current-process health succeeds', async () => {
    mockedFs.existsSync.mockReturnValue(true)
    axiosGet.mockRejectedValue(new Error('not healthy yet'))
    const manager = new LifecycleServerManager(launchConfig)
    manager.configureStartupTiming(5, 500)
    const ready = vi.fn()
    manager.on('ready', ready)

    const start = manager.startServer()
    await waitFor(() => axiosGet.mock.calls.length > 0)
    ;(manager.child.stdout as PassThrough).write('Server listening on 127.0.0.1\n')
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(ready).not.toHaveBeenCalled()
    expect(manager.isRunning()).toBe(false)

    axiosGet.mockResolvedValue({ status: 200, data: { status: 'ok' } })
    await start
    expect(ready).toHaveBeenCalledOnce()
    expect(manager.isRunning()).toBe(true)
  })

  it('reports one prompt startup error when the child closes with code zero before health', async () => {
    mockedFs.existsSync.mockReturnValue(true)
    axiosGet.mockRejectedValue(new Error('not healthy yet'))
    const manager = new LifecycleServerManager(launchConfig)
    manager.configureStartupTiming(5, 500)
    const errors: Error[] = []
    manager.on('error', (error) => errors.push(error))
    const ready = vi.fn()
    manager.on('ready', ready)

    const start = manager.startServer()
    await waitFor(() => axiosGet.mock.calls.length > 0)
    manager.child.emit('close', 0)

    await expect(start).rejects.toThrow('exited before health was available (code 0)')
    expect(ready).not.toHaveBeenCalled()
    expect(errors).toHaveLength(1)
    expect(manager.isRunning()).toBe(false)
  })

  it('returns one current-generation structured platform fatal with identity, summary, and log path', async () => {
    mockedFs.existsSync.mockReturnValue(true)
    axiosGet.mockRejectedValue(new Error('not healthy yet'))
    const manager = new LifecycleServerManager(launchConfig)
    manager.configureStartupTiming(5, 500)
    const errors: Error[] = []
    manager.on('error', (error) => errors.push(error))
    const ready = vi.fn()
    manager.on('ready', ready)

    const start = manager.startServer()
    await waitFor(() => axiosGet.mock.calls.length > 0)
    const fatalLine = JSON.stringify({
      protocol: EMBEDDED_SERVER_PLATFORM_FATAL_PROTOCOL,
      code: 'APP_DATA_STARTUP_GATE_FAILED',
      summary: 'CUSTOM_PROVIDER_READABLE_ID_STARTUP_BLOCKED:FAILED:/isolated/readable.log',
      logPath: '/isolated/server-data/logs/server.log',
    })
    ;(manager.child.stderr as PassThrough).write(fatalLine.slice(0, 45))
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(errors).toHaveLength(0)
    ;(manager.child.stderr as PassThrough).write(`${fatalLine.slice(45)}\n`)

    await expect(start).rejects.toThrow(
      'Server startup failed [APP_DATA_STARTUP_GATE_FAILED]: '
      + 'CUSTOM_PROVIDER_READABLE_ID_STARTUP_BLOCKED:FAILED:/isolated/readable.log '
      + 'Server log: /isolated/server-data/logs/server.log',
    )
    manager.child.emit('close', 1)
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(ready).not.toHaveBeenCalled()
    expect(errors).toHaveLength(1)
    expect(manager.isRunning()).toBe(false)
  })
})
