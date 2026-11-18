/**
 * autobyteus-339 REQ-002 (AC-004 to AC-006): "Install update and restart" prepares through
 * `ElectronApplication.prepareForInstall`. An incomplete stop still installs when the server process
 * is confirmed gone; an unconfirmed server exit keeps today's error; a clean stop is unchanged.
 * The real `ApplicationShutdown` runs; Electron, the updater and the server manager are doubles.
 */
import { it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  prepareForInstall: null as null | (() => Promise<void>),
  serverManager: { stopServer: vi.fn(), isServerProcessGone: vi.fn(), setRuntimeEnvOverrides: vi.fn() },
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn(), close: vi.fn(), child: vi.fn() },
}))

vi.mock('electron', () => ({
  app: { on: vi.fn(), quit: vi.fn(), exit: vi.fn(), getPath: vi.fn(() => '/test-owned-data'), isPackaged: false },
  BrowserWindow: { getAllWindows: () => [] }, dialog: {}, ipcMain: { handle: vi.fn(), on: vi.fn() }, shell: {},
}))
vi.mock('electron-is-dev', () => ({ default: true }))
vi.mock('../../logger', () => { mocks.logger.child.mockReturnValue(mocks.logger); return { logger: mocks.logger } })
vi.mock('../../server/serverManagerFactory', () => ({ ServerManagerFactory: { createServerManager: () => mocks.serverManager } }))
vi.mock('../../server/serverStatusManager', () => ({ ServerStatusManager: class { on() {} } }))
vi.mock('../../updater/appUpdater', () => ({
  AppUpdater: class { constructor(options: { prepareForInstall: () => Promise<void> }) { mocks.prepareForInstall = options.prepareForInstall } },
}))
vi.mock('../../updater/disabledAppUpdater', () => ({ DisabledAppUpdater: class {} }))
vi.mock('../../extensionIpcHandlers', () => ({ registerExtensionIpcHandlers: vi.fn() }))
vi.mock('../../extensions/managedExtensionService', () => ({ ManagedExtensionService: class {} }))
vi.mock('../../browser/browser-runtime', () => ({ BrowserRuntime: class {}, startBrowserRuntime: vi.fn() }))
vi.mock('../../browser/register-browser-shell-ipc-handlers', () => ({ registerBrowserShellIpcHandlers: vi.fn() }))
vi.mock('../../browser/browser-bridge-auth-registry', () => ({ BrowserBridgeAuthRegistry: class {} }))
vi.mock('../../shell/workspace-shell-window', () => ({ WorkspaceShellWindow: class {} }))
vi.mock('../../shell/workspace-shell-window-registry', () => ({ WorkspaceShellWindowRegistry: class { broadcast() {} } }))
vi.mock('../../local-file-protocol/local-file-protocol', () => ({ installLocalFileProtocol: vi.fn() }))
vi.mock('../../../client-data-migrations/electron-file-runner', () => ({ runElectronFileMigrations: vi.fn() }))
vi.mock('../../nodeRegistryStore', () => ({}))
vi.mock('../../rendererConsoleDiagnostics', () => ({ attachRendererConsoleDiagnostics: vi.fn() }))

import { ElectronApplication } from '../electronApplication'

const incomplete = new Error('Backend shutdown incomplete: Error: Backend did not exit cleanly')
const createApplication = () => {
  const application = new ElectronApplication({
    profile: { name: 'e2e', updaterEnabled: true, baseDataRoot: '/test-owned-data', clientEndpoint: { host: '127.0.0.1', port: 54330 } } as never,
  })
  // The will-quit handler's decision (`ApplicationShutdown.quit`), reached without starting Electron.
  const willQuit = () => {
    const event = { preventDefault: vi.fn() }
    ;(application as unknown as { shutdown: { quit: (...args: unknown[]) => void } }).shutdown.quit(event, vi.fn(), vi.fn(), vi.fn())
    return event.preventDefault.mock.calls.length === 0 ? 'passes' : 'prevented'
  }
  return { prepareForInstall: mocks.prepareForInstall!, willQuit }
}

beforeEach(() => { vi.clearAllMocks(); mocks.prepareForInstall = null })

it('AC-004: an incomplete stop installs when the server process is confirmed gone; the incomplete stop is logged', async () => {
  mocks.serverManager.stopServer.mockRejectedValue(incomplete)
  mocks.serverManager.isServerProcessGone.mockReturnValue(true)
  const { prepareForInstall, willQuit } = createApplication()

  await expect(prepareForInstall()).resolves.toBeUndefined()

  expect(mocks.logger.error).toHaveBeenCalledWith('Application shutdown incomplete', expect.any(AggregateError))
  expect(willQuit()).toBe('passes')
})

it('AC-005: an unconfirmed server exit keeps the error and installs nothing', async () => {
  mocks.serverManager.stopServer.mockRejectedValue(incomplete)
  mocks.serverManager.isServerProcessGone.mockReturnValue(false)
  const { prepareForInstall, willQuit } = createApplication()

  await expect(prepareForInstall()).rejects.toThrow('Application shutdown incomplete')

  expect(willQuit()).toBe('prevented')
})

it('AC-006: a clean stop prepares as before, without asking about the server process', async () => {
  mocks.serverManager.stopServer.mockResolvedValue(undefined)
  const { prepareForInstall, willQuit } = createApplication()

  await expect(prepareForInstall()).resolves.toBeUndefined()

  expect(mocks.serverManager.isServerProcessGone).not.toHaveBeenCalled()
  expect(mocks.logger.error).not.toHaveBeenCalled()
  expect(willQuit()).toBe('passes')
})
