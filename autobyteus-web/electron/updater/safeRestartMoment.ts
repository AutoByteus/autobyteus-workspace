export const SAFE_RESTART_QUIET_MS = 5 * 60_000
export const SAFE_RESTART_RECHECK_MS = 30_000
export type BusyRuns = () => Promise<{ busy: number; unknown: number } | null>

/** One stage watch. Neither an old answer nor input during a server read can admit a restart. */
export class SafeRestartMoment {
  private token = 0
  private timer?: ReturnType<typeof setTimeout>
  constructor(private readonly lastInputAt: () => number, private readonly busyRuns: BusyRuns,
    private readonly now = () => performance.now(),
    private readonly timers: Pick<typeof globalThis, 'setTimeout' | 'clearTimeout'> = globalThis) {}

  cancel(): void {
    ++this.token
    this.timers.clearTimeout(this.timer)
    this.timer = undefined
  }

  watch(onSafe: () => void): void {
    this.cancel()
    const token = this.token
    const quietRemaining = () => this.lastInputAt() + SAFE_RESTART_QUIET_MS - this.now()
    const schedule = (ms: number) => { this.timer = this.timers.setTimeout(() => { void check() }, ms) }
    const check = async () => {
      if (token !== this.token) return
      const wait = quietRemaining()
      if (wait > 0) { schedule(wait); return }
      let answer = null
      try { answer = await this.busyRuns() } catch { /* unknown: keep waiting */ }
      if (token !== this.token) return
      const remaining = quietRemaining()
      if (remaining > 0) { schedule(remaining); return }
      if (answer?.busy !== 0 || answer.unknown !== 0) { schedule(SAFE_RESTART_RECHECK_MS); return }
      onSafe()
    }
    void check()
  }
}
