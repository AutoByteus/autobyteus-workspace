import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useProjectsPanelStore } from '~/stores/projectsPanelStore'
import { LIVE_HIGHLIGHT_MS } from '~/stores/projectTaskStore'
import type { TaskWorkerTask } from '~/types/project'

/** `pending` → the shell revealed Projects → the board made the Task visible → the card completes it. */
export type TaskLocateStep = 'pending' | 'revealed' | 'visible'
export type TaskLocateRequest = Readonly<{ seq: number; step: TaskLocateStep; task: TaskWorkerTask }>
/** A request not completed by then (no panel opened, the Task is not on its board) is dropped. */
export const TASK_LOCATE_EXPIRY_MS = 10_000

/**
 * "Show Task in Projects" from a Task worker's summary in the Workspaces tree (delegated-copy-task-locator).
 * One request at a time moves through explicit steps, each advanced by the surface that owns it:
 * the workspace tool shell reveals the Projects tab, the chosen board makes the Task visible, and the
 * Task's card scrolls, takes focus and completes it, which highlights that card for 2.4 s. A newer
 * request replaces the previous one and removes its highlight at once.
 */
export const useTaskLocatorStore = defineStore('taskLocator', () => {
  const request = ref<TaskLocateRequest | null>(null)
  /** The latest located card, highlighted for `LIVE_HIGHLIGHT_MS`. */
  const located = ref<Readonly<{ taskId: string; seq: number }> | null>(null)
  let seq = 0
  let shells = 0
  let expiryTimer: ReturnType<typeof setTimeout> | undefined
  let highlightTimer: ReturnType<typeof setTimeout> | undefined

  const advance = (at: number, from: TaskLocateStep, to: TaskLocateStep) => {
    if (request.value?.seq === at && request.value.step === from) request.value = { ...request.value, step: to }
  }

  /**
   * Chooses the Task's board (remembered like a manual pick) and places the request. Without a mounted
   * workspace tool shell (a page with no right panel) `openRun` opens the row's run first; the
   * request waits for that run's shell.
   */
  const locate = (task: TaskWorkerTask, openRun: () => void) => {
    const next = ++seq
    useProjectsPanelStore().choose(task.projectId === null ? { kind: 'temp' } : { kind: 'project', projectId: task.projectId })
    clearTimeout(highlightTimer)
    located.value = null
    request.value = { seq: next, step: 'pending', task }
    clearTimeout(expiryTimer)
    expiryTimer = setTimeout(() => { if (request.value?.seq === next) request.value = null }, TASK_LOCATE_EXPIRY_MS)
    if (shells === 0) openRun()
  }

  /** A mounted workspace tool shell (it owns the right panel) is present until the release is called. */
  const registerShell = (): (() => void) => {
    shells++
    let released = false
    return () => { if (!released) { released = true; shells-- } }
  }

  const markRevealed = (at: number) => advance(at, 'pending', 'revealed')
  const markVisible = (at: number) => advance(at, 'revealed', 'visible')
  const complete = (at: number) => {
    const current = request.value
    if (current?.seq !== at || current.step !== 'visible') return
    request.value = null
    clearTimeout(expiryTimer)
    located.value = { taskId: current.task.taskId, seq: at }
    clearTimeout(highlightTimer)
    highlightTimer = setTimeout(() => { if (located.value?.seq === at) located.value = null }, LIVE_HIGHLIGHT_MS)
  }

  return { request, located, locate, registerShell, markRevealed, markVisible, complete }
})
