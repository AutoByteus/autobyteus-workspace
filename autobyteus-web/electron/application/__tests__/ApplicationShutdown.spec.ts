import { it, expect, vi } from 'vitest'
import { ApplicationShutdown } from '../applicationShutdown'
it('prevents repeated quit until one cached preparation completes, then resumes once', async () => {
  let done!: () => void; const cleanup = vi.fn(() => new Promise<void>(r => done = r))
  const flush = vi.fn(), notify = vi.fn(), resume = vi.fn(), fail = vi.fn(), event = { preventDefault: vi.fn() }
  const owner = new ApplicationShutdown(cleanup, flush)
  owner.quit(event, notify, resume, fail); owner.quit(event, notify, resume, fail)
  expect(owner.stop()).toBe(owner.stop()); expect(resume).not.toHaveBeenCalled(); done(); await owner.stop(); await Promise.resolve()
  expect(cleanup).toHaveBeenCalledOnce(); expect(resume).toHaveBeenCalledOnce(); expect(notify).toHaveBeenCalledOnce(); expect(flush).toHaveBeenCalledOnce()
  owner.quit(event, notify, resume, fail); expect(event.preventDefault).toHaveBeenCalledTimes(2)
})
it('bounded failure never resumes clean quit', async () => {
  vi.useFakeTimers(); const fail = vi.fn(), resume = vi.fn()
  const owner = new ApplicationShutdown(() => new Promise(() => {}), vi.fn(), 30)
  owner.quit({ preventDefault() {} }, vi.fn(), resume, fail)
  await vi.advanceTimersByTimeAsync(30); expect(fail).toHaveBeenCalledOnce(); expect(resume).not.toHaveBeenCalled(); vi.useRealTimers()
})

it('records failed cleanup before the final logger flush and blocks updater preparation', async () => {
  const events: string[] = []
  const owner = new ApplicationShutdown(async () => { throw new Error('cleanup failed') },
    () => events.push('flush'), 30000, () => events.push('report'))
  await expect(owner.stop()).rejects.toThrow('cleanup failed')
  await expect(owner.stop()).rejects.toThrow('cleanup failed')
  expect(events).toEqual(['report', 'flush'])
})
