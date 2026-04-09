import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { createElectronLogger } from '../logger'

const waitForFlush = async (): Promise<void> => {
  await new Promise<void>((resolve) => setTimeout(resolve, 30))
}

describe('electron logger', () => {
  const cleanupPaths: string[] = []

  afterEach(async () => {
    await Promise.all(cleanupPaths.splice(0).map((targetPath) => fs.rm(targetPath, { recursive: true, force: true })))
  })

  it('suppresses debug logs by default while still writing info logs', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ab-electron-log-'))
    cleanupPaths.push(tempDir)
    const logPath = path.join(tempDir, 'app.log')
    const logger = createElectronLogger({
      env: {},
      logPath,
      enableConsole: false,
      writeStartupRecord: false,
    })

    logger.debug('hidden debug line')
    logger.info('visible info line')
    logger.close()
    await waitForFlush()

    const content = await fs.readFile(logPath, 'utf8')
    expect(content).toContain('visible info line')
    expect(content).not.toContain('hidden debug line')
  })

  it('emits scoped debug logs for matching overrides only', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ab-electron-log-'))
    cleanupPaths.push(tempDir)
    const logPath = path.join(tempDir, 'app.log')
    const logger = createElectronLogger({
      env: {
        LOG_LEVEL: 'INFO',
        AUTOBYTEUS_LOG_LEVEL_OVERRIDES: 'electron.server.app-data=debug',
      },
      logPath,
      enableConsole: false,
      writeStartupRecord: false,
    })

    logger.child('server.app-data').debug('visible debug line')
    logger.child('server.base-server-manager').debug('hidden debug line')
    logger.close()
    await waitForFlush()

    const content = await fs.readFile(logPath, 'utf8')
    expect(content).toContain('[electron.server.app-data]')
    expect(content).toContain('visible debug line')
    expect(content).not.toContain('hidden debug line')
  })

  it('falls back to the server-data env file when process env is unset', async () => {
    const baseDataPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ab-electron-base-'))
    cleanupPaths.push(baseDataPath)
    const serverDataPath = path.join(baseDataPath, 'server-data')
    const logsPath = path.join(baseDataPath, 'logs')
    const logPath = path.join(logsPath, 'app.log')
    await fs.mkdir(serverDataPath, { recursive: true })
    await fs.writeFile(path.join(serverDataPath, '.env'), 'LOG_LEVEL=DEBUG\n', 'utf8')

    const logger = createElectronLogger({
      env: {},
      baseDataPath,
      logPath,
      enableConsole: false,
      writeStartupRecord: false,
    })

    logger.debug('debug from env file')
    logger.close()
    await waitForFlush()

    const content = await fs.readFile(logPath, 'utf8')
    expect(content).toContain('debug from env file')
  })
})
