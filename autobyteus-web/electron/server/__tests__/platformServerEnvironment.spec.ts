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
    developmentRendererOrigin: string | null = null,
  ): Promise<{ env: NodeJS.ProcessEnv; args: string[]; root: string; manager: TestLinuxServerManager }> {
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
      developmentRendererOrigin,
    }, serverRoot)

    await manager.launchForTest()

    const [, args, options] = spawnMock.mock.calls[spawnMock.mock.calls.length - 1]
    return { env: options.env, args, root, manager }
  }

  function stubCallerEnvironment(): void {
    // The caller's own PORT/SERVER_PORT (if any) is not this test's concern; AC-004 asserts
    // only that the composer itself injects neither, so the fixture must not carry one in.
    vi.stubEnv('PORT', undefined)
    vi.stubEnv('SERVER_PORT', undefined)
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

  it.skipIf(process.env.NUXT_TEST === 'true')(
    'NAS-01 NAS-31 hands the node a fresh launch owner credential in its spawn environment only, a new one at each start',
    async () => {
      for (const policy of ['inherit-caller', 'isolated-baseline'] as const) {
        const { env, manager } = await launchWithPolicy(policy)
        expect(env.AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL).toMatch(/^own_[A-Za-z0-9_-]{43}$/)
        expect(manager.getLaunchOwnerCredential()).toBe(env.AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL)
        expect(process.env.AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL).toBeUndefined()
        const first = env.AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL
        await manager.launchForTest()
        const [, , again] = spawnMock.mock.calls[spawnMock.mock.calls.length - 1]
        expect(again.env.AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL).not.toBe(first)
      }
      expect(JSON.stringify(mockLogger.info.mock.calls)).not.toContain('own_')
    },
  )

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
      // The backend's port travels only as the --port argument; a generic PORT/SERVER_PORT
      // would leak into every agent runtime and tool shell this process spawns (AC-004).
      expect(env).not.toHaveProperty('PORT')
      expect(env).not.toHaveProperty('SERVER_PORT')
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
      expect(env).not.toHaveProperty('PORT')
      expect(env).not.toHaveProperty('SERVER_PORT')
      expect(env.DB_TYPE).toBe('sqlite')
      expect(env.AUTOBYTEUS_SERVER_HOST).toBe('http://127.0.0.1:31041')
      expect(env.AUTOBYTEUS_DATA_DIR).toBe(path.join(root, 'data', 'server-data'))
      expect(env.DATABASE_URL).toBe(
        `file:${path.join(root, 'data', 'server-data', 'db', 'production.db')}`,
      )
    },
  )

  it.skipIf(process.env.NUXT_TEST === 'true')(
    'passes the launch config development renderer origin to the node (autobyteus-416 D7)',
    async () => {
      stubCallerEnvironment()

      const { env } = await launchWithPolicy('inherit-caller', 'http://localhost:3000')

      expect(env.AUTOBYTEUS_ALLOWED_ORIGINS).toBe('http://localhost:3000')
    },
  )
})
