import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LiveStreamReconnectScheduler } from '../liveStreamReconnectScheduler'
import { subscribePageResume } from '../pageResumeSignal'
import { hidePage, installPageVisibilityControl, removePageVisibilityControl, reportOnline, showPage } from './pageVisibilityTestControl'

/**
 * autobyteus-434 DS-002 (the bounded local spine): every transition of the scheduler, with fake timers and a fake page.
 * REQ-001 / AC-001…002 (never give up while visible, ≤ 30 s apart), REQ-002 / AC-003…004 (resume, re-sync, nothing while hidden).
 */
describe('LiveStreamReconnectScheduler', () => {
  let attempt: ReturnType<typeof vi.fn>
  let resynchronize: ReturnType<typeof vi.fn>
  let onPersistentFailure: ReturnType<typeof vi.fn>
  let scheduler: LiveStreamReconnectScheduler

  beforeEach(() => {
    vi.useFakeTimers()
    installPageVisibilityControl()
    attempt = vi.fn()
    resynchronize = vi.fn()
    onPersistentFailure = vi.fn()
    scheduler = new LiveStreamReconnectScheduler({ attempt, resynchronize, onPersistentFailure })
  })
  afterEach(() => {
    scheduler.dispose()
    removePageVisibilityControl()
    vi.useRealTimers()
  })

  /** Lets the pending wait fire, failing each attempt at once, and returns the waits it saw. */
  const failRepeatedly = (times: number): number[] => {
    const waits: number[] = []
    scheduler.connectionLost()
    for (let index = 0; index < times; index += 1) {
      const before = Date.now()
      vi.advanceTimersToNextTimer()
      waits.push(Date.now() - before)
      expect(scheduler.state).toBe('attempting')
      scheduler.connectionLost()
    }
    return waits
  }

  it('starts idle and is not recovering', () => {
    expect(scheduler.state).toBe('idle')
    expect(scheduler.isRecovering()).toBe(false)
  })

  it('waits 1, 2, 4, 8, 16 s, then 30 s for ever while visible; it never gives up (REQ-001)', () => {
    expect(failRepeatedly(9)).toEqual([1_000, 2_000, 4_000, 8_000, 16_000, 30_000, 30_000, 30_000, 30_000])
    expect(attempt).toHaveBeenCalledTimes(9)
    expect(scheduler.state).toBe('waiting')
    expect(scheduler.isRecovering()).toBe(true)
  })

  it('reports a persistent failure once per streak, at the fifth consecutive failure, and keeps retrying', () => {
    failRepeatedly(3)
    expect(onPersistentFailure).not.toHaveBeenCalled()
    vi.advanceTimersToNextTimer()
    scheduler.connectionLost() // fifth
    expect(onPersistentFailure).toHaveBeenCalledTimes(1)
    vi.advanceTimersToNextTimer()
    scheduler.connectionLost()
    vi.advanceTimersToNextTimer()
    scheduler.connectionLost()
    expect(onPersistentFailure).toHaveBeenCalledTimes(1)
    expect(scheduler.state).toBe('waiting')

    // A success ends the streak: a new streak reports again at its own fifth failure.
    vi.advanceTimersToNextTimer()
    scheduler.connected()
    failRepeatedly(4)
    expect(onPersistentFailure).toHaveBeenCalledTimes(2)
  })

  it('connected() resets the count: the next loss waits 1 s again', () => {
    failRepeatedly(3)
    vi.advanceTimersToNextTimer()
    scheduler.connected()
    expect(scheduler.state).toBe('connected')
    expect(scheduler.isRecovering()).toBe(false)
    expect(failRepeatedly(1)).toEqual([1_000])
  })

  it('startOver() cancels the wait, resets the count and goes idle', () => {
    failRepeatedly(2)
    scheduler.startOver()
    expect(scheduler.state).toBe('idle')
    vi.advanceTimersByTime(60_000)
    expect(attempt).toHaveBeenCalledTimes(2)
    expect(failRepeatedly(1)).toEqual([1_000])
  })

  it('attemptNow() cancels the wait and attempts at once', () => {
    scheduler.connectionLost()
    scheduler.attemptNow()
    expect(attempt).toHaveBeenCalledTimes(1)
    expect(scheduler.state).toBe('attempting')
    vi.advanceTimersByTime(60_000)
    expect(attempt).toHaveBeenCalledTimes(1)
  })

  it('a second loss report while waiting does not count twice', () => {
    scheduler.connectionLost()
    scheduler.connectionLost()
    const before = Date.now()
    vi.advanceTimersToNextTimer()
    expect(Date.now() - before).toBe(1_000)
    scheduler.connectionLost()
    const next = Date.now()
    vi.advanceTimersToNextTimer()
    expect(Date.now() - next).toBe(2_000)
  })

  it('holds while hidden: no attempt at all, then one attempt at once on becoming visible (AC-004)', () => {
    hidePage()
    scheduler.connectionLost()
    expect(scheduler.state).toBe('held')
    expect(scheduler.isRecovering()).toBe(true)
    vi.advanceTimersByTime(10 * 60_000)
    expect(attempt).not.toHaveBeenCalled()
    showPage()
    expect(attempt).toHaveBeenCalledTimes(1)
    expect(scheduler.state).toBe('attempting')
  })

  it('a wait that ends while the page is hidden holds instead of attempting', () => {
    scheduler.connectionLost()
    hidePage()
    vi.advanceTimersByTime(5_000)
    expect(attempt).not.toHaveBeenCalled()
    expect(scheduler.state).toBe('held')
    showPage()
    expect(attempt).toHaveBeenCalledTimes(1)
  })

  it('a page resume during a wait attempts at once (the wait resets); so does `online` (REQ-002)', () => {
    failRepeatedly(4) // the next wait would be 16 s
    hidePage()
    showPage()
    expect(attempt).toHaveBeenCalledTimes(5)
    scheduler.connectionLost()
    reportOnline()
    expect(attempt).toHaveBeenCalledTimes(6)
  })

  it('re-synchronizes a connected stream after the page was hidden ≥ 30 s, not after a short glance (DEC-003)', () => {
    scheduler.connected()
    hidePage()
    vi.advanceTimersByTime(29_000)
    showPage()
    expect(resynchronize).not.toHaveBeenCalled()
    hidePage()
    vi.advanceTimersByTime(30_000)
    showPage()
    expect(resynchronize).toHaveBeenCalledTimes(1)
    expect(attempt).not.toHaveBeenCalled()
  })

  it('`online` while connected re-synchronizes nothing', () => {
    scheduler.connected()
    reportOnline()
    expect(resynchronize).not.toHaveBeenCalled()
    expect(attempt).not.toHaveBeenCalled()
  })

  it('a resume or a timer while attempting does nothing; nor does a resume while idle', () => {
    scheduler.attemptNow()
    hidePage()
    vi.advanceTimersByTime(40_000)
    showPage()
    expect(attempt).toHaveBeenCalledTimes(1)
    scheduler.startOver()
    hidePage()
    vi.advanceTimersByTime(40_000)
    showPage()
    expect(attempt).toHaveBeenCalledTimes(1)
    expect(resynchronize).not.toHaveBeenCalled()
  })

  it('dispose() cancels the wait and stops reacting to the page', () => {
    scheduler.connectionLost()
    scheduler.dispose()
    vi.advanceTimersByTime(60_000)
    showPage()
    reportOnline()
    scheduler.connectionLost()
    scheduler.attemptNow()
    expect(attempt).not.toHaveBeenCalled()
    expect(scheduler.state).toBe('idle')
  })
})

describe('subscribePageResume', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    installPageVisibilityControl()
  })
  afterEach(() => {
    removePageVisibilityControl()
    vi.useRealTimers()
  })

  it('reports how long the page was hidden, and `online` only while visible', () => {
    const events: unknown[] = []
    const unsubscribe = subscribePageResume((event) => events.push(event))
    hidePage()
    vi.advanceTimersByTime(45_000)
    reportOnline()
    showPage()
    reportOnline()
    unsubscribe()
    hidePage()
    showPage()
    expect(events).toEqual([{ hiddenForMs: 45_000, cause: 'visible' }, { hiddenForMs: 0, cause: 'online' }])
  })
})
