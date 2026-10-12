import { describe, expect, it, vi } from 'vitest'
import { createLoadedListReloader } from '../loadedListReloader'

const deferred = () => {
  let resolve!: () => void
  const promise = new Promise<void>((done) => { resolve = done })
  return { promise, resolve }
}

describe('createLoadedListReloader', () => {
  it('does nothing until the list has been loaded, and stops after it is cleared', async () => {
    const reload = vi.fn(async () => undefined)
    const reloader = createLoadedListReloader('things', reload)
    await reloader.reloadIfLoaded()
    expect(reload).not.toHaveBeenCalled()
    reloader.markLoaded()
    await reloader.reloadIfLoaded()
    expect(reload).toHaveBeenCalledTimes(1)
    reloader.markUnloaded()
    await reloader.reloadIfLoaded()
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('shares one in-flight reload and runs exactly one follow-up for changes that arrive meanwhile', async () => {
    const gates = [deferred(), deferred()]
    let call = 0
    const reload = vi.fn(() => gates[call++]!.promise)
    const reloader = createLoadedListReloader('things', reload)
    reloader.markLoaded()
    const first = reloader.reloadIfLoaded()
    const second = reloader.reloadIfLoaded()
    const third = reloader.reloadIfLoaded()
    expect(second).toBe(first)
    expect(third).toBe(first)
    gates[0]!.resolve()
    await Promise.resolve(); await Promise.resolve()
    expect(reload).toHaveBeenCalledTimes(2)
    gates[1]!.resolve()
    await first
    expect(reload).toHaveBeenCalledTimes(2)
  })

  it('logs a failed reload without rejecting, so the store keeps its previous list', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const reloader = createLoadedListReloader('things', async () => { throw new Error('offline') })
    reloader.markLoaded()
    await expect(reloader.reloadIfLoaded()).resolves.toBeUndefined()
    expect(error).toHaveBeenCalledWith('Failed to reload things:', expect.any(Error))
    error.mockRestore()
  })
})
