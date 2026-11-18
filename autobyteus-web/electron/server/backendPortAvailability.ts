import * as net from 'node:net'
import { setTimeout as sleep } from 'node:timers/promises'
import type { PortConflictDiagnostic } from '../../types/serverStatus'
import { inspectPortOwner } from './portOwnerInspector'
export class PortConflictError extends Error {
  constructor(readonly diagnostic: PortConflictDiagnostic) { super(`Backend port ${diagnostic.port} is in use`); this.name = 'PortConflictError' }
}
export const isAddressInUse = (error: unknown): boolean => (error as NodeJS.ErrnoException)?.code === 'EADDRINUSE'
export async function assertBackendPortAvailable(port: number): Promise<void> {
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid backend port')
  for (const host of ['127.0.0.1', '0.0.0.0']) await new Promise<void>((resolve, reject) => {
    const server = net.createServer()
    server.once('error', reject)
    server.once('listening', () => server.close(error => error ? reject(error) : resolve()))
    server.listen({ host, port, exclusive: true })
  })
}
export async function waitForBackendPort(port: number, timeoutMs: number, signal?: AbortSignal): Promise<void> {
  const deadline = Date.now() + timeoutMs
  do {
    signal?.throwIfAborted()
    try { await assertBackendPortAvailable(port); return }
    catch (error) { if (!isAddressInUse(error)) throw error }
    if (Date.now() >= deadline) break
    await sleep(Math.min(100, deadline - Date.now()), undefined, { signal })
  } while (true)
  const diagnostic = await inspectPortOwner(port)
  signal?.throwIfAborted()
  throw new PortConflictError(diagnostic)
}
