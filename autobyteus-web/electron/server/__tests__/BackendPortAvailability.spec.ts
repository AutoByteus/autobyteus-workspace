import { it, expect } from 'vitest'
import * as net from 'node:net'
import { assertBackendPortAvailable, waitForBackendPort, PortConflictError } from '../backendPortAvailability'
import { parsePortOwners } from '../portOwnerInspector'
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
