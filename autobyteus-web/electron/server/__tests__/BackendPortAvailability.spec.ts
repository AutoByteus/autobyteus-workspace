import { it, expect } from 'vitest'
import * as net from 'node:net'
import { assertBackendPortAvailable, waitForBackendPort, PortConflictError } from '../backendPortAvailability'
import { parsePortOwners } from '../portOwnerInspector'

/** True once a default-host (dual-stack `[::]`) listener binds on this host; false when IPv6 is unavailable. */
async function canListenDualStack(): Promise<boolean> {
  const probe = net.createServer()
  try {
    await new Promise<void>((resolve, reject) => {
      probe.once('error', reject)
      probe.once('listening', () => resolve())
      probe.listen(0)
    })
    return true
  } catch {
    return false
  } finally {
    await new Promise<void>(r => probe.close(() => r()))
  }
}

it('reports a conflict from an [::] dual-stack holder (the incident shape) without killing it; recovers once it exits (AC-005)', async t => {
  t.skip(!(await canListenDualStack()), 'IPv6/dual-stack listen is unavailable on this host')
  // Default host (no `host` argument): the incident's [::] holder, which a 127.0.0.1-only
  // probe would miss but the wildcard 0.0.0.0 probe in assertBackendPortAvailable catches.
  const holder = net.createServer()
  await new Promise<void>(r => holder.listen(0, r))
  const port = (holder.address() as net.AddressInfo).port
  try {
    await expect(assertBackendPortAvailable(port)).rejects.toMatchObject({ code: 'EADDRINUSE' })
    await expect(waitForBackendPort(port, 1)).rejects.toBeInstanceOf(PortConflictError)
    expect(holder.listening).toBe(true)
  } finally {
    await new Promise<void>(r => holder.close(() => r()))
  }
  await assertBackendPortAvailable(port)
})

it('reports real loopback conflict without killing listener; fresh retry succeeds', async () => {
  const fixture = net.createServer(); await new Promise<void>(r => fixture.listen(0, '127.0.0.1', r))
  const port = (fixture.address() as net.AddressInfo).port
  try {
    await expect(assertBackendPortAvailable(port)).rejects.toMatchObject({ code: 'EADDRINUSE' })
    await expect(waitForBackendPort(port, 1)).rejects.toBeInstanceOf(PortConflictError)
    expect(fixture.listening).toBe(true)
  } finally { await new Promise<void>(r => fixture.close(() => r())) }
  await assertBackendPortAvailable(port)
})
it('aborts polling and preserves non-address error classification', async () => {
  await expect(waitForBackendPort(-1, 20)).rejects.toThrow('Invalid backend port')
  const abort = new AbortController(); abort.abort(new Error('cancelled'))
  await expect(waitForBackendPort(12345, 20, abort.signal)).rejects.toThrow('cancelled')
})
it('bounds and sanitizes advisory identity without arguments', () => {
  expect(parsePortOwners('p12\ncnode\x00name\nf3\np12\ncnode\n')).toEqual([{ pid: 12, executable: 'node' }])
})
