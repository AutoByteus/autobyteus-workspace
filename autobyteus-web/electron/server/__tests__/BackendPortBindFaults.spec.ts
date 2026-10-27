/**
 * AC-002: valid-port bind errors through real availability/wait functions.
 * Run: pnpm -C autobyteus-web test:electron --run server/__tests__/BackendPortBindFaults.spec.ts
 * Only net's OS bind and execFile callback are injected; no runtime/module helper mock.
 * Non-EADDRINUSE must preserve original error without inspection, retries or signals.
 */
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { EventEmitter } from 'node:events'
const { createServer, execFile } = vi.hoisted(() => ({ createServer: vi.fn(), execFile: vi.fn() }))
vi.mock('node:net', () => ({ createServer }))
vi.mock('node:child_process', () => ({ execFile }))
import { PortConflictError, waitForBackendPort } from '../backendPortAvailability'

let signalSpy: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  createServer.mockReset()
  execFile.mockReset()
  signalSpy = vi.spyOn(process, 'kill').mockImplementation(() => { throw new Error('unexpected signal') })
})
afterEach(() => {
  expect(signalSpy).not.toHaveBeenCalled()
  vi.restoreAllMocks()
})
function bind(error?: Error) {
  const server = Object.assign(new EventEmitter(), {
    listen: vi.fn(() => { queueMicrotask(() => server.emit(error ? 'error' : 'listening', error)); return server }),
    close: vi.fn((callback: (error?: Error) => void) => callback()),
  })
  createServer.mockReturnValueOnce(server)
  return server
}
it.each(['EACCES', 'EADDRNOTAVAIL', 'EMFILE'])(
  'preserves actual-shaped %s on a valid port without diagnosis/retry', async code => {
    const error = Object.assign(new Error(`listen ${code}`), { code, syscall: 'listen', address: '127.0.0.1', port: 12345 })
    const server = bind(error)
    await expect(waitForBackendPort(12345, 1000)).rejects.toBe(error)
    expect(createServer).toHaveBeenCalledTimes(1)
    expect(server.listen).toHaveBeenCalledWith({ host: '127.0.0.1', port: 12345, exclusive: true })
    expect(execFile).not.toHaveBeenCalled()
  },
)
it('preserves wildcard non-address error after a successful loopback probe', async () => {
  const loopback = bind()
  const error = Object.assign(new Error('wildcard permission denied'), { code: 'EACCES' })
  const wildcard = bind(error)
  await expect(waitForBackendPort(12345, 1000)).rejects.toBe(error)
  expect(loopback.close).toHaveBeenCalledTimes(1)
  expect(wildcard.listen).toHaveBeenCalledWith({ host: '0.0.0.0', port: 12345, exclusive: true })
  expect(createServer).toHaveBeenCalledTimes(2)
  expect(execFile).not.toHaveBeenCalled()
})
it.skipIf(!['darwin', 'linux'].includes(process.platform))('classifies only EADDRINUSE as conflict even when real inspector callback fails', async () => {
  bind(Object.assign(new Error('occupied'), { code: 'EADDRINUSE' }))
  execFile.mockImplementation((_file, _args, _options, callback) => {
    callback(Object.assign(new Error('missing binary'), { code: 'ENOENT' }), 'p123\ncnot-authoritative\n')
  })
  const error = await waitForBackendPort(12345, 0).catch(value => value)
  expect(error).toBeInstanceOf(PortConflictError)
  expect(error.diagnostic).toMatchObject({ kind: 'port-conflict', port: 12345, inspection: 'unavailable', owners: [] })
  expect(execFile).toHaveBeenCalledExactlyOnceWith('lsof', ['-nP', '-iTCP:12345', '-sTCP:LISTEN', '-Fpc'],
    { timeout: 1000, maxBuffer: 32768, encoding: 'utf8' }, expect.any(Function))
  expect(createServer).toHaveBeenCalledTimes(1)
})
