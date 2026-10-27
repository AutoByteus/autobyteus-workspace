import { it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
const mocks = vi.hoisted(() => ({ spawn: vi.fn(), force: vi.fn(), log: { child: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() } }))
vi.mock('child_process', async original => ({ ...await original<typeof import('child_process')>(), spawn: mocks.spawn, execFile: mocks.force }))
vi.mock('fs', () => ({ existsSync: () => true }))
vi.mock('electron-is-dev', () => ({ default: true }))
vi.mock('../../logger', () => { mocks.log.child.mockReturnValue(mocks.log); return { logger: mocks.log } })
vi.mock('../services/AppDataService', () => ({ AppDataService: class { getAppDataDir() { return '/test-owned-data' } isFirstRun() { return false } initialize() {} } }))
import { WindowsServerManager } from '../windowsServerManager'
import { SHUTDOWN_WIRE } from '../managedBackendShutdownClient'
import { createEmbeddedServerClientEndpoint } from '../../../shared/embeddedServerClientEndpoint'
class Manager extends WindowsServerManager {
  protected validateServerEnvironment() { return [] }
  protected async waitForPortToBeFree() {}
  protected buildServerEnv() { return { ELECTRON_RUN_AS_NODE: '1' } }
  protected async checkServerHealth() { this.ready = true; this.isServerRunning = true; this.emit('ready') }
}
let child: any
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks()
  child = Object.assign(new EventEmitter(), { pid: 42, exitCode: null, signalCode: null,
    stdout: new PassThrough(), stderr: new PassThrough(), send: vi.fn((_m, cb) => cb(null)) })
  mocks.spawn.mockReturnValue(child)
  mocks.force.mockImplementation((_file, _args, _options, cb) => { child.exitCode = 0; child.emit('exit', 0); cb(null) })
})
afterEach(() => vi.useRealTimers())
const manager = () => new Manager({ clientEndpoint: createEmbeddedServerClientEndpoint(54321), listenerPolicy: 'preserve-backend-default', baseDataRoot: '/test-owned-data', environmentPolicy: 'isolated-baseline' })
it('production Windows launcher attaches IPC to the captured child and stop waits for complete plus exit', async () => {
  const owner = manager(); await owner.startServer()
  expect(mocks.spawn.mock.calls[0][2].stdio).toEqual(['ignore', 'pipe', 'pipe', 'ipc'])
  const stopping = owner.stopServer(); expect(child.send).not.toHaveBeenCalled()
  child.emit('message', SHUTDOWN_WIRE.ready); expect(child.send).toHaveBeenCalledExactlyOnceWith(SHUTDOWN_WIRE.request, expect.any(Function))
  child.emit('message', SHUTDOWN_WIRE.complete); child.emit('disconnect'); child.exitCode = 0; child.emit('exit', 0)
  await stopping; expect(mocks.force).not.toHaveBeenCalled()
})
it('uses taskkill only after the graceful deadline and reports forced stop as incomplete', async () => {
  const owner = manager(); await owner.startServer()
  const rejected = expect(owner.stopServer()).rejects.toThrow('incomplete')
  child.emit('message', SHUTDOWN_WIRE.ready)
  await vi.advanceTimersByTimeAsync(19999); expect(mocks.force).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(1); await rejected
  expect(mocks.force).toHaveBeenCalledWith('taskkill', ['/pid', '42', '/f', '/t'], expect.objectContaining({ timeout: 1000 }), expect.any(Function))
})
