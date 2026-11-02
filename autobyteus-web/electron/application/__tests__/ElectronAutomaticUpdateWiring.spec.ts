/**
 * autobyteus-356: the application's part of automatic updates.
 * - `recoverAfterFailedInstall` (SR-003 AR-001): after a failed automatic install the old version relaunches, but only
 *   when the server process is gone; an unconfirmed exit never relaunches (284).
 * - The node switch is a registry change (`set-auto-update`): remote entries only; `false` removes the field.
 * Electron, the updater and the server manager are doubles; nothing touches real user data.
 */
import { it, expect, vi, beforeEach, describe } from 'vitest'

const mocks = vi.hoisted(() => ({
  updaterOptions: [] as Array<{ recoverAfterFailedInstall?: () => void; testFeedUrl?: string }>,
  serverManager: { stopServer: vi.fn(), isServerProcessGone: vi.fn(), setRuntimeEnvOverrides: vi.fn() },
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn(), close: vi.fn(), child: vi.fn() },
  app: { on: vi.fn(), quit: vi.fn(), exit: vi.fn(), relaunch: vi.fn(), getPath: vi.fn(() => '/test-owned-data'), isPackaged: false },
}))

vi.mock('electron', () => ({
  app: mocks.app,
  BrowserWindow: { getAllWindows: () => [] }, dialog: {}, ipcMain: { handle: vi.fn(), on: vi.fn() }, shell: {},
}))
vi.mock('electron-is-dev', () => ({ default: true }))
vi.mock('../../logger', () => { mocks.logger.child.mockReturnValue(mocks.logger); return { logger: mocks.logger } })
vi.mock('../../server/serverManagerFactory', () => ({ ServerManagerFactory: { createServerManager: () => mocks.serverManager } }))
vi.mock('../../server/serverStatusManager', () => ({ ServerStatusManager: class { on() {} } }))
vi.mock('../../updater/appUpdater', () => ({
  AppUpdater: class { constructor(options: (typeof mocks.updaterOptions)[number]) { mocks.updaterOptions.push(options) } },
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
vi.mock('../../rendererConsoleDiagnostics', () => ({ attachRendererConsoleDiagnostics: vi.fn() }))

import { ElectronApplication } from '../electronApplication'
import type { NodeEntry, NodeRegistryChange, NodeRegistrySnapshot } from '../../nodeRegistryTypes'

type ApplicationInternals = {
  nodeRegistrySnapshot: NodeRegistrySnapshot
  applyNodeRegistryChange: (change: NodeRegistryChange) => NodeRegistrySnapshot
}

const createApplication = (profile: Record<string, unknown> = { updaterEnabled: true }) => new ElectronApplication({
  profile: { name: 'e2e', baseDataRoot: '/test-owned-data', clientEndpoint: { host: '127.0.0.1', port: 54330 }, ...profile } as never,
})

beforeEach(() => { vi.clearAllMocks(); mocks.updaterOptions = [] })

describe('recoverAfterFailedInstall (SR-003 AR-001)', () => {
  it.each([
    ['the packaged updater', { updaterEnabled: true }],
    ['the test feed updater', { updaterEnabled: false, testUpdateFeedUrl: 'http://127.0.0.1:9/feed' }],
  ])('is given to %s', (_name, profile) => {
    createApplication(profile)
    expect(mocks.updaterOptions.at(-1)?.recoverAfterFailedInstall).toBeTypeOf('function')
  })

  it('relaunches this version when the server process is gone', () => {
    mocks.serverManager.isServerProcessGone.mockReturnValue(true)
    createApplication()
    mocks.updaterOptions[0]!.recoverAfterFailedInstall!()
    expect(mocks.app.relaunch).toHaveBeenCalledOnce()
    expect(mocks.app.exit).toHaveBeenCalledExactlyOnceWith(0)
    expect(mocks.app.relaunch.mock.invocationCallOrder[0]).toBeLessThan(mocks.app.exit.mock.invocationCallOrder[0]!)
  })

  it('stays open, without relaunching, when the server exit is not confirmed (284)', () => {
    mocks.serverManager.isServerProcessGone.mockReturnValue(false)
    createApplication()
    mocks.updaterOptions[0]!.recoverAfterFailedInstall!()
    expect(mocks.app.relaunch).not.toHaveBeenCalled()
    expect(mocks.app.exit).not.toHaveBeenCalled()
    expect(mocks.logger.error).toHaveBeenCalledOnce()
  })
})

describe('the node switch registry change (set-auto-update)', () => {
  const entry = (id: string, nodeType: NodeEntry['nodeType']): NodeEntry => ({
    id, name: id, baseUrl: `http://${id}:8000`, nodeType, createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-01T00:00:00.000Z',
  })
  const withNodes = (): ApplicationInternals => {
    const application = createApplication() as unknown as ApplicationInternals
    application.nodeRegistrySnapshot = { version: 4, nodes: [
      { ...entry('embedded-local', 'embedded'), baseUrl: 'http://127.0.0.1:54330' }, entry('docker', 'remote'),
    ] }
    return application
  }

  it('turns a remote entry on, then off by removing the field', () => {
    const application = withNodes()
    const on = application.applyNodeRegistryChange({ type: 'set-auto-update', entryId: 'docker', enabled: true })
    expect(on.version).toBe(5)
    expect(on.nodes[1]).toMatchObject({ id: 'docker', autoUpdate: true })
    application.nodeRegistrySnapshot = on
    const off = application.applyNodeRegistryChange({ type: 'set-auto-update', entryId: 'docker', enabled: false })
    expect(off.nodes[1]).not.toHaveProperty('autoUpdate')
  })

  it('an unchanged value is the same snapshot (nothing is written)', () => {
    const application = withNodes()
    expect(application.applyNodeRegistryChange({ type: 'set-auto-update', entryId: 'docker', enabled: false }))
      .toBe(application.nodeRegistrySnapshot)
  })

  it('is refused for the embedded entry and an unknown entry', () => {
    const application = withNodes()
    expect(() => application.applyNodeRegistryChange({ type: 'set-auto-update', entryId: 'embedded-local', enabled: true }))
      .toThrow('Only remote nodes can update automatically')
    expect(() => application.applyNodeRegistryChange({ type: 'set-auto-update', entryId: 'missing', enabled: true }))
      .toThrow('Node does not exist')
  })
})
