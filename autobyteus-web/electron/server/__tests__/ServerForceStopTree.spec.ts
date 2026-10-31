/**
 * AC-011: when the embedded server does not exit within the graceful window, the POSIX force step
 * removes the server and everything it started. Real processes: a wedged server (ignores SIGTERM),
 * a runtime-CLI-like child in the server's group, and a tool-command-like child of that CLI leading
 * its own group and ignoring SIGTERM. macOS/Linux only (Windows has its own `taskkill /f /t` path).
 */
import { it, expect, vi, afterEach } from 'vitest'
import { spawn, type ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import { BaseServerManager } from '../baseServerManager'
import { createEmbeddedServerClientEndpoint } from '../../../shared/embeddedServerClientEndpoint'

const log = vi.hoisted(() => ({ child: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }))
vi.mock('../../logger', () => { log.child.mockReturnValue(log); return { logger: log } })
vi.mock('../services/AppDataService', () => ({
  AppDataService: class { getAppDataDir() { return '/test-owned-data' } isFirstRun() { return false } initialize() {} },
}))

const WEDGED_SERVER = `
const { spawn } = require('child_process');
process.on('SIGTERM', () => {});
const cli = spawn(process.execPath, ['-e', \`
  const { spawn } = require('child_process');
  const tool = spawn(process.execPath, ['-e', "process.on('SIGTERM', () => {}); setInterval(() => {}, 1000)"],
    { stdio: 'ignore', detached: true });
  process.stdout.write(String(tool.pid) + '\\\\n');
  setInterval(() => {}, 1000);
\`], { stdio: ['ignore', 'pipe', 'ignore'] });
cli.stdout.once('data', tool => process.stdout.write(JSON.stringify({ cli: cli.pid, tool: Number(String(tool).trim()) }) + '\\n'));
setInterval(() => {}, 1000);
`

class WedgedServerManager extends BaseServerManager {
  protected async launchServerProcess(): Promise<void> {}
  protected getServerRoot(): string { return '/server' }
  adopt(proc: ChildProcess): void { this.serverProcess = proc; this.gracefulShutdownTimeoutMs = 300 }
}

const newManager = () => new WedgedServerManager({
  clientEndpoint: createEmbeddedServerClientEndpoint(54329), listenerPolicy: 'preserve-backend-default',
  baseDataRoot: '/test-owned-data', environmentPolicy: 'isolated-baseline',
})

const spawned: number[] = []
const exists = (pid: number) => { try { process.kill(pid, 0); return true } catch (error) { return (error as NodeJS.ErrnoException).code !== 'ESRCH' } }
const waitUntil = async (predicate: () => boolean, timeoutMs: number) => {
  const deadline = Date.now() + timeoutMs
  while (!predicate() && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 25))
}

afterEach(() => {
  for (const pid of spawned.splice(0)) { try { process.kill(pid, 'SIGKILL') } catch { /* already gone */ } }
})

it.skipIf(process.platform === 'win32')('force-stops a wedged server and its whole tree, leaving no process behind', async () => {
  const server = spawn(process.execPath, ['-e', WEDGED_SERVER], { stdio: ['ignore', 'pipe', 'ignore'] })
  const pids = await new Promise<{ cli: number; tool: number }>((resolve, reject) => {
    server.stdout!.once('data', data => resolve(JSON.parse(String(data))))
    server.once('exit', () => reject(new Error('wedged server exited early')))
  })
  spawned.push(server.pid!, pids.cli, pids.tool)
  const manager = new WedgedServerManager({
    clientEndpoint: createEmbeddedServerClientEndpoint(54329), listenerPolicy: 'preserve-backend-default',
    baseDataRoot: '/test-owned-data', environmentPolicy: 'isolated-baseline',
  })
  manager.adopt(server)
  expect(manager.isServerProcessGone()).toBe(false)

  await expect(manager.stopServer()).rejects.toThrow('incomplete')
  // autobyteus-339 AC-004 precondition: the stop is incomplete, yet the server process is confirmed gone.
  expect(manager.isServerProcessGone()).toBe(true)

  await waitUntil(() => ![server.pid!, pids.cli, pids.tool].some(exists), 3000)
  expect({ server: exists(server.pid!), cli: exists(pids.cli), tool: exists(pids.tool) })
    .toEqual({ server: false, cli: false, tool: false })
}, 15_000)

it('reports the server process gone only when none was started or it has an exit code or signal (autobyteus-339)', () => {
  const manager = newManager()
  expect(manager.isServerProcessGone()).toBe(true)
  const child = Object.assign(new EventEmitter(), { exitCode: null, signalCode: null }) as unknown as ChildProcess
  manager.adopt(child)
  expect(manager.isServerProcessGone()).toBe(false)
  Object.assign(child, { signalCode: 'SIGKILL' })
  expect(manager.isServerProcessGone()).toBe(true)
})

