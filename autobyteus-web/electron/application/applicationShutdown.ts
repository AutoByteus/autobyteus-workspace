/** Shared preparation for normal quit and explicit updater installation. */
export class ApplicationShutdown {
  private completion?: Promise<void>
  private notified = false
  private resumed = false
  private prepared = false
  constructor(private readonly cleanup: () => Promise<void>, private readonly flush: () => void,
    private readonly timeoutMs = 30000, private readonly report: (error: unknown) => void = () => {}) {}
  stop(): Promise<void> {
    return this.completion ??= (async () => {
      let timer: NodeJS.Timeout
      try {
        await Promise.race([this.cleanup(), new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('Application shutdown deadline exceeded')), this.timeoutMs)
        })])
        this.prepared = true
      } catch (error) { this.report(error); throw error }
      finally { clearTimeout(timer!); this.flush() }
    })()
  }
  quit(event: { preventDefault(): void }, notify: () => void, resume: () => void, fail: (error: unknown) => void): void {
    if (this.prepared) return
    event.preventDefault()
    if (this.resumed) return
    this.resumed = true
    if (!this.notified) { this.notified = true; notify() }
    void this.stop().then(resume, fail)
  }
}
