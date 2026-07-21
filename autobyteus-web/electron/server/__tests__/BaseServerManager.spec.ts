import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { BaseServerManager } from '../baseServerManager'

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  copyFileSync: vi.fn(),
  readdirSync: vi.fn(),
  promises: {
    rm: vi.fn(),
    readdir: vi.fn()
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
    const manager = new TestServerManager()
    appDataExists = true
    envExists = true
    dataDirPaths.forEach((p) => existingDataDirs.add(p))
    mockedFs.promises.readdir.mockResolvedValue(['db', 'logs', 'download', '.env', 'secret-store'] as never)
    mockedFs.promises.rm.mockResolvedValue(undefined)
    await manager.resetAppDataDir()

    expect(mockedFs.promises.rm).toHaveBeenCalledTimes(4)
    expect(mockedFs.promises.rm).not.toHaveBeenCalledWith(
      path.join(manager.getAppDataDir(), 'secret-store'),
      expect.anything(),
    )
    expect(manager.getFirstRun()).toBe(true)
  })
})
