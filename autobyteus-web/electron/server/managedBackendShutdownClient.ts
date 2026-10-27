import type { ChildProcess } from 'node:child_process'
export const SHUTDOWN_WIRE = {
  ready: 'autobyteus.embedded-server.shutdown.v1:ready',
  request: 'autobyteus.embedded-server.shutdown.v1:request',
  complete: 'autobyteus.embedded-server.shutdown.v1:complete',
  failed: 'autobyteus.embedded-server.shutdown.v1:failed',
} as const
/** One captured child and one request; capability readiness is not HTTP readiness. */
export class ManagedBackendShutdownClient {
  private ready = false
  private sent = false
  private result?: 'complete' | 'failed'
  private failure?: Error
  private promise?: Promise<void>
  private evaluate = () => {}
  constructor(private readonly child: ChildProcess) {
    child.on('message', this.message); child.on('error', this.error)
    child.on('disconnect', this.disconnect); child.on('exit', this.exit)
  }
  private message = (message: unknown) => {
    if (message === SHUTDOWN_WIRE.ready) this.ready = true
    if (this.sent && message === SHUTDOWN_WIRE.complete) this.result ??= 'complete'
    if (this.sent && message === SHUTDOWN_WIRE.failed) this.result ??= 'failed'
    this.evaluate()
  }
  private error = (error: Error) => { this.failure = error; this.evaluate() }
  private disconnect = () => { setImmediate(() => {
    if (!this.result) this.failure = new Error('Backend IPC disconnected without cleanup result')
    this.evaluate()
  }) }
  private exit = () => { this.evaluate() }
  stop(timeoutMs: number): Promise<void> {
    return this.promise ??= new Promise<void>((resolve, reject) => {
      const finish = (error?: Error) => { clearTimeout(timer); this.evaluate = () => {}; error ? reject(error) : resolve() }
      const timer = setTimeout(() => finish(new Error('Backend cleanup result/exit deadline exceeded')), timeoutMs)
      this.evaluate = () => {
        if (this.failure) return finish(this.failure)
        if (this.result === 'failed') return finish(new Error('Backend reported incomplete cleanup'))
        if (this.child.exitCode != null || this.child.signalCode != null) {
          if (this.result === 'complete' && this.child.exitCode === 0) return finish()
          // Result can already be queued when exit arrives; one event-loop turn, not pipe EOF.
          setImmediate(() => {
            if (this.result === 'complete' && this.child.exitCode === 0) finish()
            else finish(new Error('Backend exited without confirmed successful cleanup'))
          })
          return
        }
        if (this.ready && !this.sent) {
          this.sent = true
          try { this.child.send(SHUTDOWN_WIRE.request, error => { if (error) this.error(error) }) }
          catch (error) { this.error(error as Error) }
        }
      }
      this.evaluate()
    })
  }
  dispose(): void {
    this.child.off('message', this.message); this.child.off('error', this.error)
    this.child.off('disconnect', this.disconnect); this.child.off('exit', this.exit)
  }
}
