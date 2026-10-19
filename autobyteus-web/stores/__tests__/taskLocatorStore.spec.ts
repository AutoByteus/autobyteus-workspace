import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('~/utils/apolloClient', () => ({ getApolloClient: vi.fn(() => ({ query: vi.fn(), mutate: vi.fn() })) }))

import { TASK_LOCATE_EXPIRY_MS, useTaskLocatorStore } from '../taskLocatorStore'
import { useProjectsPanelStore } from '../projectsPanelStore'
import { LIVE_HIGHLIGHT_MS } from '../projectTaskStore'
import type { TaskWorkerTask } from '~/types/project'

const task = (taskId: string, projectId: string | null = 'p1'): TaskWorkerTask => ({ taskId, projectId, description: taskId, status: 'TODO' })

describe('taskLocatorStore (delegated-copy-task-locator DS-005)', () => {
  beforeEach(() => { vi.useFakeTimers(); setActivePinia(createPinia()); window.localStorage.clear() })
  afterEach(() => { vi.useRealTimers() })

  const located = (store: ReturnType<typeof useTaskLocatorStore>, seq: number) => {
    store.markRevealed(seq); store.markVisible(seq); store.complete(seq)
  }

  it('chooses the Task\'s Project or Temp tasks like a manual pick (REQ-005)', () => {
    const store = useTaskLocatorStore()
    const panel = useProjectsPanelStore()
    const choose = vi.spyOn(panel, 'choose')
    store.registerShell()
    store.locate(task('a', 'p2'), vi.fn())
    expect(choose).toHaveBeenLastCalledWith({ kind: 'project', projectId: 'p2' })
    store.locate(task('b', null), vi.fn())
    expect(choose).toHaveBeenLastCalledWith({ kind: 'temp' })
  })

  it('moves through its steps only in order, then highlights the located card for 2.4 s', () => {
    const store = useTaskLocatorStore()
    store.registerShell()
    store.locate(task('a'), vi.fn())
    const seq = store.request!.seq
    store.markVisible(seq)
    store.complete(seq)
    expect(store.request?.step).toBe('pending')
    store.markRevealed(seq)
    store.markRevealed(seq)
    expect(store.request?.step).toBe('revealed')
    store.markVisible(seq)
    expect(store.request?.step).toBe('visible')
    store.complete(seq)
    expect(store.request).toBeNull()
    expect(store.located).toEqual({ taskId: 'a', seq })
    vi.advanceTimersByTime(LIVE_HIGHLIGHT_MS - 1)
    expect(store.located).not.toBeNull()
    vi.advanceTimersByTime(1)
    expect(store.located).toBeNull()
  })

  it('a newer locate supersedes the request and removes the previous highlight at once (AC-013)', () => {
    const store = useTaskLocatorStore()
    store.registerShell()
    store.locate(task('a'), vi.fn())
    const first = store.request!.seq
    located(store, first)
    expect(store.located?.taskId).toBe('a')

    store.locate(task('b'), vi.fn())
    expect(store.located).toBeNull()
    const second = store.request!.seq
    store.markRevealed(first)
    expect(store.request).toMatchObject({ seq: second, step: 'pending' })
    located(store, second)
    expect(store.located).toEqual({ taskId: 'b', seq: second })
    // The first highlight's timer never clears the second.
    vi.advanceTimersByTime(LIVE_HIGHLIGHT_MS - 1)
    expect(store.located?.taskId).toBe('b')
  })

  it('expires a request that is not completed within 10 s', () => {
    const store = useTaskLocatorStore()
    store.registerShell()
    store.locate(task('a'), vi.fn())
    store.markRevealed(store.request!.seq)
    vi.advanceTimersByTime(TASK_LOCATE_EXPIRY_MS - 1)
    expect(store.request).not.toBeNull()
    vi.advanceTimersByTime(1)
    expect(store.request).toBeNull()
  })

  it('opens the row\'s run only when no workspace tool shell is mounted (REQ-012)', () => {
    const store = useTaskLocatorStore()
    const openRun = vi.fn()
    store.locate(task('a'), openRun)
    expect(openRun).toHaveBeenCalledOnce()
    expect(store.request?.step).toBe('pending')

    const release = store.registerShell()
    store.locate(task('b'), openRun)
    expect(openRun).toHaveBeenCalledOnce()
    release()
    release()
    store.locate(task('c'), openRun)
    expect(openRun).toHaveBeenCalledTimes(2)
  })
})
