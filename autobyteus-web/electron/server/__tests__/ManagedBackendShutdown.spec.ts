import { describe, it, expect, vi, afterEach } from 'vitest'
import { EventEmitter } from 'node:events'
import type { ChildProcess } from 'node:child_process'
import { ManagedBackendShutdownClient, SHUTDOWN_WIRE } from '../managedBackendShutdownClient'
import { stopManagedBackend } from '../managedBackendStop'
const child = () => Object.assign(new EventEmitter(), { exitCode: null, signalCode: null, send: vi.fn((_m, cb) => cb(null)) }) as unknown as ChildProcess
const exit = (proc: ChildProcess, code = 0) => { Object.assign(proc, { exitCode: code }); proc.emit('exit', code) }
afterEach(() => vi.useRealTimers())
describe('captured backend shutdown', () => {
  it('latches stop until ready and requires result AND exit, independent of pipe close', async () => {
    const proc = child(), client = new ManagedBackendShutdownClient(proc)
    const stop = client.stop(200); expect(client.stop(200)).toBe(stop)
    expect(proc.send).not.toHaveBeenCalled(); proc.emit('message', SHUTDOWN_WIRE.ready)
    expect(proc.send).toHaveBeenCalledExactlyOnceWith(SHUTDOWN_WIRE.request, expect.any(Function))
    proc.emit('message', SHUTDOWN_WIRE.complete); proc.emit('disconnect'); exit(proc)
    await stop; client.dispose()
  })
  it.each(['missing-result', 'failed', 'nonzero', 'disconnect'])('rejects %s', async reason => {
    const proc = child(), client = new ManagedBackendShutdownClient(proc)
    proc.emit('message', SHUTDOWN_WIRE.ready); const rejected = expect(client.stop(50)).rejects.toThrow()
    if (reason === 'failed') proc.emit('message', SHUTDOWN_WIRE.failed)
    if (reason === 'nonzero') proc.emit('message', SHUTDOWN_WIRE.complete)
    if (reason === 'disconnect') proc.emit('disconnect')
    exit(proc, reason === 'nonzero' ? 1 : 0); await rejected; client.dispose()
  })
  it('complete without exit times out, and a different child cannot satisfy readiness', async () => {
    vi.useFakeTimers(); const proc = child(), other = child(), client = new ManagedBackendShutdownClient(proc)
    const rejected = expect(client.stop(20)).rejects.toThrow('deadline')
    other.emit('message', SHUTDOWN_WIRE.ready); expect(proc.send).not.toHaveBeenCalled()
    proc.emit('message', SHUTDOWN_WIRE.ready); proc.emit('message', SHUTDOWN_WIRE.complete)
    await vi.advanceTimersByTimeAsync(20); await rejected; client.dispose()
  })
  it('force is bounded fallback and never successful cleanup', async () => {
    vi.useFakeTimers(); const proc = child(); const force = vi.fn(async () => exit(proc))
    const result = expect(stopManagedBackend(proc, 20, async () => { throw new Error('IPC unavailable') }, force)).rejects.toThrow('incomplete')
    await vi.advanceTimersByTimeAsync(19); expect(force).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1); await result; expect(force).toHaveBeenCalledOnce()
  })
})
