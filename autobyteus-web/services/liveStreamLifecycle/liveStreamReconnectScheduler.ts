import { isPageVisible, subscribePageResume, type PageResumeEvent } from './pageResumeSignal'

/**
 * When one run stream tries again (autobyteus-434). Its stream owner keeps how it connects, where it
 * succeeds and how it catches up; the scheduler only says when: a capped wait with no final give-up
 * while the page is visible, nothing while it is hidden, an attempt at once on a page resume, and a
 * re-synchronization of an apparently connected stream after the page was hidden for 30 s or more.
 *
 * States: `idle` (no stream wanted, or the owner connects on its own), `attempting`, `connected`,
 * `waiting` (a timer is pending), `held` (lost while hidden).
 */

/** The waits after consecutive failures; the last one repeats. No 0 s step, so nothing loops tightly. */
export const RECONNECT_DELAYS_MS: readonly number[] = [1_000, 2_000, 4_000, 8_000, 16_000, 30_000]
/** A resume after the page was hidden this long re-synchronizes a stream that looks connected. */
export const RESYNC_AFTER_HIDDEN_MS = 30_000
/** The consecutive failure that reports a persistent failure, once per failure streak. */
export const PERSISTENT_FAILURE_ATTEMPTS = 5

export type LiveStreamReconnectState = 'idle' | 'attempting' | 'connected' | 'waiting' | 'held'

export type LiveStreamReconnectSchedulerOptions = Readonly<{
  /** The owner's own attempt: open (and catch up). It ends in `connected()`, `connectionLost()` or `startOver()`. */
  attempt(): void
  /** The owner drops a stream that looks open and reconnects it with its catch-up. */
  resynchronize(): void
  /** Called once per failure streak, at the fifth consecutive failure; retrying goes on. */
  onPersistentFailure?(): void
}>

export class LiveStreamReconnectScheduler {
  private current: LiveStreamReconnectState = 'idle'
  private failures = 0
  private reportedThisStreak = false
  private timer: ReturnType<typeof setTimeout> | null = null
  private disposed = false
  private readonly unsubscribe: () => void

  constructor(private readonly options: LiveStreamReconnectSchedulerOptions) {
    this.unsubscribe = subscribePageResume(this.handleResume)
  }

  get state(): LiveStreamReconnectState { return this.current }

  /** Lost, waiting or held, or attempting: the stream is in a loss streak and the scheduler will attempt. */
  isRecovering(): boolean {
    return this.current === 'waiting' || this.current === 'held' || this.current === 'attempting'
  }

  /** The stream was lost, or an attempt failed before the owner's success point. */
  connectionLost(): void {
    if (this.disposed || this.current === 'waiting' || this.current === 'held') return
    const delay = RECONNECT_DELAYS_MS[Math.min(this.failures, RECONNECT_DELAYS_MS.length - 1)]!
    this.failures += 1
    if (isPageVisible()) {
      this.current = 'waiting'
      this.timer = setTimeout(this.handleTimer, delay)
    } else {
      this.current = 'held'
    }
    if (this.failures >= PERSISTENT_FAILURE_ATTEMPTS && !this.reportedThisStreak) {
      this.reportedThisStreak = true
      this.options.onPersistentFailure?.()
    }
  }

  /** The owner's success point. */
  connected(): void {
    if (this.disposed) return
    this.clearTimer()
    this.current = 'connected'
    this.resetStreak()
  }

  /** The owner starts (or stops wanting) a stream itself: cancel any wait and reset the count. */
  startOver(): void {
    if (this.disposed) return
    this.clearTimer()
    this.current = 'idle'
    this.resetStreak()
  }

  /** Attempt at once (a page resume, an owner re-sync, or a connect request during a wait). */
  attemptNow(): void {
    if (this.disposed) return
    this.clearTimer()
    this.current = 'attempting'
    this.options.attempt()
  }

  dispose(): void {
    if (this.disposed) return
    this.clearTimer()
    this.unsubscribe()
    this.current = 'idle'
    this.disposed = true
  }

  private readonly handleTimer = (): void => {
    this.timer = null
    if (this.disposed || this.current !== 'waiting') return
    // Hidden since the wait began: hold; the page resume attempts.
    if (!isPageVisible()) {
      this.current = 'held'
      return
    }
    this.attemptNow()
  }

  private readonly handleResume = (event: PageResumeEvent): void => {
    if (this.disposed) return
    if (this.current === 'waiting' || this.current === 'held') {
      this.attemptNow()
    } else if (this.current === 'connected' && event.hiddenForMs >= RESYNC_AFTER_HIDDEN_MS) {
      this.options.resynchronize()
    }
  }

  private resetStreak(): void {
    this.failures = 0
    this.reportedThisStreak = false
  }

  private clearTimer(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
  }
}
