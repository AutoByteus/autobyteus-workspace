import { afterEach, describe, expect, it, vi } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { EventEmitter } from 'events'
import { PassThrough } from 'stream'
import type { ChildProcess } from 'child_process'
import { createEmbeddedServerClientEndpoint } from '../../../shared/embeddedServerClientEndpoint'
import type { EmbeddedServerLaunchConfig } from '../embeddedServerLaunchConfig'

const { spawnMock } = vi.hoisted(() => ({ spawnMock: vi.fn() }))

vi.mock('child_process', async (importOriginal) => ({
  ...await importOriginal<typeof import('child_process')>(),
  spawn: spawnMock,
}))

vi.mock('../../utils/shellEnv', () => ({
  getLoginShellPath: () => '/caller/login-shell/bin',
}))

vi.mock('electron-is-dev', () => ({ default: false }))

const { mockLogger } = vi.hoisted(() => {
  const logger = {
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
  logger.child.mockImplementation(() => logger)
  return { mockLogger: logger }
})

vi.mock('../../logger', () => ({ logger: mockLogger }))

import { LinuxServerManager } from '../linuxServerManager'

class TestLinuxServerManager extends LinuxServerManager {
  constructor(config: EmbeddedServerLaunchConfig, private readonly serverRoot: string) {
    super(config)
  }

  protected override getServerRoot(): string {
    return this.serverRoot
  }

  public launchForTest(): Promise<void> {
    this.serverDir = this.serverRoot
    return this.launchServerProcess()
  }
}

function childProcessFixture(): ChildProcess {
  return Object.assign(new EventEmitter(), {
    pid: 55123,
    exitCode: null,
    signalCode: null,
    stdout: new PassThrough(),
    stderr: new PassThrough(),
  }) as ChildProcess
}

describe('platform server environment handoff', () => {
  const cleanupRoots: string[] = []

  afterEach(() => {
    vi.unstubAllEnvs()
    spawnMock.mockReset()
    for (const root of cleanupRoots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })

  async function launchWithPolicy(
    environmentPolicy: EmbeddedServerLaunchConfig['environmentPolicy'],
  ): Promise<{ env: NodeJS.ProcessEnv; args: string[]; root: string }> {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'autobyteus-server-env-test-'))
    cleanupRoots.push(root)
    const serverRoot = path.join(root, 'server')
    fs.mkdirSync(path.join(serverRoot, 'dist'), { recursive: true })
    fs.writeFileSync(path.join(serverRoot, 'dist', 'app.js'), '')
    spawnMock.mockReturnValue(childProcessFixture())
    const manager = new TestLinuxServerManager({
      clientEndpoint: createEmbeddedServerClientEndpoint(31041),
      listenerPolicy: 'preserve-backend-default',
      baseDataRoot: path.join(root, 'data'),
      environmentPolicy,
    }, serverRoot)

    await manager.launchForTest()

    const [, args, options] = spawnMock.mock.calls[0]
    return { env: options.env, args, root }
  }

  function stubCallerEnvironment(): void {
    vi.stubEnv('OPENAI_API_KEY', 'non-secret-openai-sentinel')
    vi.stubEnv('GOOGLE_API_KEY', 'non-secret-provider-sentinel')
    vi.stubEnv('SERPER_API_KEY', 'non-secret-search-sentinel')
    vi.stubEnv('AUTOBYTEUS_MEMORY_DIR', '/caller/production/memory')
    vi.stubEnv('DB_NAME', '/caller/production/db/production.db')
    vi.stubEnv('CODEX_HOME', '/caller/codex-home')
    vi.stubEnv('HOME', '/caller/home')
    vi.stubEnv('PATH', '/caller/process/bin')
    vi.stubEnv('AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE', 'e2e')
    vi.stubEnv('AUTOBYTEUS_ELECTRON_SERVER_PORT', '31041')
    vi.stubEnv('AUTOBYTEUS_ELECTRON_DATA_ROOT', '/caller/e2e-root')
  }

  // This platform-spawn contract requires the dedicated Electron Node runner.
  // The Nuxt runner also discovers electron/** but preloads a browser-oriented
  // application graph before this module mock can own child_process.
  it.skipIf(process.env.NUXT_TEST === 'true')(
    'inherit-caller (production) preserves the caller environment before manager overrides',
    async () => {
      stubCallerEnvironment()

      const { env, args, root } = await launchWithPolicy('inherit-caller')

      expect(args).toContain('31041')
      expect(env.OPENAI_API_KEY).toBe('non-secret-openai-sentinel')
      expect(env.GOOGLE_API_KEY).toBe('non-secret-provider-sentinel')
      expect(env.SERPER_API_KEY).toBe('non-secret-search-sentinel')
      expect(env.AUTOBYTEUS_MEMORY_DIR).toBe('/caller/production/memory')
      expect(env.CODEX_HOME).toBe('/caller/codex-home')
      expect(env.HOME).toBe('/caller/home')
      expect(env.PATH).toBe('/caller/login-shell/bin')
      expect(env.ELECTRON_RUN_AS_NODE).toBe('1')
      expect(env.PORT).toBe('31041')
      expect(env.SERVER_PORT).toBe('31041')
      expect(env.AUTOBYTEUS_SERVER_HOST).toBe('http://127.0.0.1:31041')
      expect(env.AUTOBYTEUS_DATA_DIR).toBe(path.join(root, 'data', 'server-data'))
    },
  )

  it.skipIf(process.env.NUXT_TEST === 'true')(
    'isolated-baseline (e2e) passes only baseline caller values plus Electron-owned values',
    async () => {
      stubCallerEnvironment()

      const { env, args, root } = await launchWithPolicy('isolated-baseline')

      expect(args).toContain('31041')
      for (const name of [
        'OPENAI_API_KEY',
        'GOOGLE_API_KEY',
        'SERPER_API_KEY',
        'AUTOBYTEUS_MEMORY_DIR',
        'DB_NAME',
        'AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE',
        'AUTOBYTEUS_ELECTRON_SERVER_PORT',
        'AUTOBYTEUS_ELECTRON_DATA_ROOT',
      ]) {
        expect(env, name).not.toHaveProperty(name)
      }
      expect(env.CODEX_HOME).toBe('/caller/codex-home')
      expect(env.HOME).toBe('/caller/home')
      expect(env.PATH).toBe('/caller/login-shell/bin')
      expect(env.ELECTRON_RUN_AS_NODE).toBe('1')
      expect(env.PORT).toBe('31041')
      expect(env.DB_TYPE).toBe('sqlite')
      expect(env.AUTOBYTEUS_SERVER_HOST).toBe('http://127.0.0.1:31041')
      expect(env.AUTOBYTEUS_DATA_DIR).toBe(path.join(root, 'data', 'server-data'))
      expect(env.DATABASE_URL).toBe(
        `file:${path.join(root, 'data', 'server-data', 'db', 'production.db')}`,
      )
    },
  )
})
