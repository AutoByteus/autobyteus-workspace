import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { createElectronLogger } from '../../logger'
import {
  classifyServerOutputLevel,
  createServerProcessOutputForwarder,
  forwardServerProcessOutput,
} from '../serverOutputLogging'

const waitForFlush = async (): Promise<void> => {
  await new Promise<void>((resolve) => setTimeout(resolve, 30))
}

describe('serverOutputLogging', () => {
  const cleanupPaths: string[] = []

  afterEach(async () => {
    await Promise.all(cleanupPaths.splice(0).map((targetPath) => fs.rm(targetPath, { recursive: true, force: true })))
  })

  it('keeps debug stdout out of info-only Electron logs while preserving info output', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ab-server-output-log-'))
    cleanupPaths.push(tempDir)
    const logPath = path.join(tempDir, 'app.log')
    const logger = createElectronLogger({
      env: { LOG_LEVEL: 'INFO' },
      logPath,
      enableConsole: false,
      writeStartupRecord: false,
    })
    const stdoutLogger = logger.child('embedded-server.stdout')

    forwardServerProcessOutput(
      stdoutLogger,
      '[2026-04-09T00:00:00.000Z] [DEBUG] [server.runtime] debug only line\n',
      'info',
    )
    forwardServerProcessOutput(
      stdoutLogger,
      '[2026-04-09T00:00:00.000Z] [INFO] [server.runtime] info line\n',
      'info',
    )
    logger.close()
    await waitForFlush()

    const content = await fs.readFile(logPath, 'utf8')
    expect(content).toContain('info line')
    expect(content).not.toContain('debug only line')
  })

  it('preserves info lines when one chunk contains mixed debug and info output', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ab-server-output-log-'))
    cleanupPaths.push(tempDir)
    const logPath = path.join(tempDir, 'app.log')
    const logger = createElectronLogger({
      env: { LOG_LEVEL: 'INFO' },
      logPath,
      enableConsole: false,
      writeStartupRecord: false,
    })
    const stdoutForwarder = createServerProcessOutputForwarder(
      logger.child('embedded-server.stdout'),
      'info',
    )

    stdoutForwarder.pushChunk(
      '[2026-04-09T00:00:00.000Z] [DEBUG] [server.runtime] debug only line\n' +
        '[2026-04-09T00:00:00.100Z] [INFO] [server.runtime] info line\n',
    )
    stdoutForwarder.flush()
    logger.close()
    await waitForFlush()

    const content = await fs.readFile(logPath, 'utf8')
    expect(content).toContain('info line')
    expect(content).not.toContain('debug only line')
  })

  it('buffers partial lines until the terminating newline arrives', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ab-server-output-log-'))
    cleanupPaths.push(tempDir)
    const logPath = path.join(tempDir, 'app.log')
    const logger = createElectronLogger({
      env: { LOG_LEVEL: 'INFO' },
      logPath,
      enableConsole: false,
      writeStartupRecord: false,
    })
    const stdoutForwarder = createServerProcessOutputForwarder(
      logger.child('embedded-server.stdout'),
      'info',
    )

    stdoutForwarder.pushChunk('[2026-04-09T00:00:00.000Z] [INFO] [server.runtime] partial')
    await waitForFlush()
    expect(await fs.readFile(logPath, 'utf8')).toBe('')

    stdoutForwarder.pushChunk(' info line\n')
    stdoutForwarder.flush()
    logger.close()
    await waitForFlush()

    const content = await fs.readFile(logPath, 'utf8')
    expect(content).toContain('partial info line')
    expect(content.match(/partial info line/g)?.length).toBe(1)
  })

  it('classifies structured server stdout levels without promoting debug to info', () => {
    expect(classifyServerOutputLevel('{"level":20,"msg":"debug line"}', 'info')).toBe('debug')
    expect(classifyServerOutputLevel('{"level":30,"msg":"info line"}', 'info')).toBe('info')
  })
})
