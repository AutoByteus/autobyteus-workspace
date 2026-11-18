import type { ChildProcess } from 'node:child_process'
export class ShutdownIncompleteError extends Error {
  readonly diagnostic: { kind: 'shutdown-incomplete'; message: string }
  constructor(message: string) { super(message); this.diagnostic = { kind: 'shutdown-incomplete', message } }
}
export const childExited = (child: ChildProcess): boolean => child.exitCode != null || child.signalCode != null
export function waitForChildExit(child: ChildProcess, timeoutMs: number): Promise<void> {
  if (childExited(child)) return Promise.resolve()
  if (timeoutMs <= 0) return Promise.reject(new Error('Backend exit not confirmed'))
  return new Promise((resolve, reject) => {
    const finish = (error?: Error) => { clearTimeout(timer); child.off('exit', onExit); child.off('error', onError); error ? reject(error) : resolve() }
    const onExit = () => finish()
    const onError = (error: Error) => finish(error)
    const timer = setTimeout(() => finish(new Error('Backend exit not confirmed')), Math.max(0, timeoutMs))
    child.once('exit', onExit); child.once('error', onError)
  })
}
export async function stopManagedBackend(child: ChildProcess, timeoutMs: number,
  graceful: () => Promise<void>, force: () => Promise<void>): Promise<void> {
  const deadline = Date.now() + timeoutMs
  let failure: unknown
  try { await graceful(); if (child.exitCode !== 0) throw new Error('Backend did not exit cleanly'); return }
  catch (error) { failure = error }
  // Transport failure is not authority to force early: allow the original graceful window.
  if (!childExited(child)) {
    await waitForChildExit(child, deadline - Date.now()).catch(() => {})
    if (!childExited(child)) {
      const forceDeadline = Date.now() + 2000
      try { await force(); await waitForChildExit(child, forceDeadline - Date.now()) }
      catch (error) { failure = new AggregateError([failure, error], 'Backend force cleanup unconfirmed') }
    }
  }
  throw new ShutdownIncompleteError(`Backend shutdown incomplete: ${String(failure)}`)
}
