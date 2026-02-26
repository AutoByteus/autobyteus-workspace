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
    rm: vi.fn()
  }
}))

vi.mock('os', () => ({
  homedir: vi.fn()
}))


vi.mock('../../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
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

})
