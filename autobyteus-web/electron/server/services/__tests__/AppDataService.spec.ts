import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { AppDataService } from '../AppDataService'

// Mock the fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  copyFileSync: vi.fn(),
  readdirSync: vi.fn(),
  promises: {
    rm: vi.fn()
  }
}))

// Mock the logger
vi.mock('../../../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

const mockedFs = vi.mocked(fs)

describe('AppDataService', () => {
  const testUserDataPath = '/test/user/data'
  const expectedAppDataDir = path.join(testUserDataPath, 'server-data')

  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('constructor', () => {
    it('should detect first run when directory does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false)

      const service = new AppDataService(testUserDataPath)

      expect(service.isFirstRun()).toBe(true)
      expect(service.getAppDataDir()).toBe(expectedAppDataDir)
    })

    it('should detect first run when env file is missing', () => {
      mockedFs.existsSync.mockImplementation((filePath) => {
        return filePath !== path.join(expectedAppDataDir, '.env')
      })

      const service = new AppDataService(testUserDataPath)

      expect(service.isFirstRun()).toBe(true)
      expect(service.getAppDataDir()).toBe(expectedAppDataDir)
    })

    it('should detect non-first run when env file exists', () => {
      mockedFs.existsSync.mockReturnValue(true)

      const service = new AppDataService(testUserDataPath)

      expect(service.isFirstRun()).toBe(false)
      expect(service.getAppDataDir()).toBe(expectedAppDataDir)
    })
  })

  describe('initialize', () => {
    it('should create app data directory and data dirs when missing', () => {
      mockedFs.existsSync.mockReturnValue(false)

      const service = new AppDataService(testUserDataPath)
      service.initialize()

      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(expectedAppDataDir, { recursive: true })
      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(path.join(expectedAppDataDir, 'db'), { recursive: true })
      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(path.join(expectedAppDataDir, 'logs'), { recursive: true })
      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(path.join(expectedAppDataDir, 'download'), { recursive: true })
    })

    it('should not create directory when it already exists', () => {
      const dataDirPaths = ['db', 'logs', 'download'].map((dir) => path.join(expectedAppDataDir, dir))
      mockedFs.existsSync.mockImplementation((filePath) => {
        if (filePath === expectedAppDataDir) {
          return true
        }
        if (dataDirPaths.includes(filePath)) {
          return true
        }
        return true
      })

      const service = new AppDataService(testUserDataPath)
      service.initialize()

      expect(mockedFs.mkdirSync).not.toHaveBeenCalled()
    })

    it('should throw error when directory creation fails', () => {
      mockedFs.existsSync.mockReturnValue(false)
      mockedFs.mkdirSync.mockImplementation(() => {
        throw new Error('Permission denied')
      })

      const service = new AppDataService(testUserDataPath)

      expect(() => service.initialize()).toThrow('Failed to create app data directory')
    })
  })

  describe('validateEnvironment', () => {
    const testServerDir = '/test/server'

    it('should return empty array when all required files exist', () => {
      mockedFs.existsSync.mockReturnValue(true)

      const service = new AppDataService(testUserDataPath)
      const errors = service.validateEnvironment(testServerDir)

      expect(errors).toEqual([])
    })

    it('should return error for missing server entrypoint', () => {
      mockedFs.existsSync.mockImplementation((filePath) => {
        return filePath !== path.join(testServerDir, 'dist', 'app.js')
      })

      const service = new AppDataService(testUserDataPath)
      const errors = service.validateEnvironment(testServerDir)

      expect(errors).toContain(`Required server entrypoint not found: ${path.join(testServerDir, 'dist', 'app.js')}`)
    })

    it('should return errors for multiple missing files', () => {
      mockedFs.existsSync.mockReturnValue(false)

      const service = new AppDataService(testUserDataPath)
      const errors = service.validateEnvironment(testServerDir)

      expect(errors.length).toBeGreaterThan(1)
      expect(errors.some(e => e.includes('server entrypoint'))).toBe(true)
      expect(errors.some(e => e.includes('package.json'))).toBe(true)
    })
  })

  describe('copyDirectory', () => {
    it('should recursively copy files and directories', () => {
      // Reset all mocks first to avoid bleed from constructor
      vi.clearAllMocks()
      
      const sourceDir = '/source'
      const destDir = '/dest'

      // For constructor check
      mockedFs.existsSync.mockReturnValueOnce(true)
      
      const service = new AppDataService(testUserDataPath)
      
      // Clear again after construction
      vi.clearAllMocks()

      // Now set up mocks for copyDirectory
      mockedFs.existsSync.mockReturnValue(false)
      mockedFs.readdirSync
        .mockReturnValueOnce([
          { name: 'file1.txt', isDirectory: () => false },
          { name: 'subdir', isDirectory: () => true },
        ] as any)
        .mockReturnValueOnce([
          { name: 'file2.txt', isDirectory: () => false },
        ] as any)

      service.copyDirectory(sourceDir, destDir)

      expect(mockedFs.mkdirSync).toHaveBeenCalled()
      expect(mockedFs.copyFileSync).toHaveBeenCalled()
    })
  })

  describe('resetAppDataDir', () => {
    it('retries on busy deletion', async () => {
      vi.useFakeTimers()
      mockedFs.existsSync.mockReturnValue(true)
      let callCount = 0
      mockedFs.promises.rm.mockImplementation(async () => {
        callCount += 1
        if (callCount < 3) {
          const err = new Error('busy') as NodeJS.ErrnoException
          err.code = 'EBUSY'
          throw err
        }
      })

      const service = new AppDataService(testUserDataPath)
      const resetPromise = service.resetAppDataDir()
      await vi.runAllTimersAsync()
      await resetPromise

      expect(mockedFs.promises.rm).toHaveBeenCalledTimes(3)
      vi.useRealTimers()
    })
  })
})
