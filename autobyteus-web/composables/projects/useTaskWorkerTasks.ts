import { computed, onScopeDispose, watch } from 'vue'
import { taskWorkerKey, useTaskWorkerTaskStore } from '~/stores/taskWorkerTaskStore'
import { useTaskLocatorStore } from '~/stores/taskLocatorStore'
import type { RunHistoryTeamExecutionRow } from '~/stores/runHistoryTypes'
import type { TaskWorkerRef, TaskWorkerTask } from '~/types/project'
import { isFeatureAvailableInRuntime } from '~/utils/mobileFeatureGates'

/**
 * Which tree rows can be a Task worker: a task Agent row (its agent run) or a task Team row (its team
 * run). Team members and stable rows never are; the server answers null for sub-work copies and
 * `@`-involved units, which are no Task's root.
 */
export const taskWorkerRefOf = (row: RunHistoryTeamExecutionRow): TaskWorkerRef | null => {
  if (row.kind !== 'transient_execution') return null
  if (row.transientKind === 'task_agent' && row.agentRunId) return { kind: 'agent', agentRunId: row.agentRunId }
  if (row.transientKind === 'task_team' && row.teamRunIdForNode) return { kind: 'team', teamRunId: row.teamRunIdForNode }
  return null
}

/**
 * A host tree's Task-worker summaries (Agent-run and Team-run hosts): keeps interest in the listed
 * rows' workers while the host is mounted, answers each row's current Task, and locates a Task.
 * Summaries exist only where the Projects tab does.
 */
export const useTaskWorkerTasks = (rows: () => readonly RunHistoryTeamExecutionRow[]) => {
  const store = useTaskWorkerTaskStore()
  const locator = useTaskLocatorStore()
  const enabled = isFeatureAvailableInRuntime('projects')
  const workers = computed(() => enabled
    ? rows().map(taskWorkerRefOf).filter((worker): worker is TaskWorkerRef => worker !== null)
    : [])
  let release: (() => void) | null = null
  // Retain the new set before releasing the old one, so workers still listed keep their answers.
  watch(() => workers.value.map(taskWorkerKey).sort().join('|'), () => {
    const previous = release
    release = workers.value.length ? store.retain(workers.value) : null
    previous?.()
  }, { immediate: true })
  onScopeDispose(() => { release?.(); release = null })

  /** The row's current Task when known; null for rows without one (one-line rows). */
  const taskOf = (row: RunHistoryTeamExecutionRow): TaskWorkerTask | null => {
    const worker = enabled ? taskWorkerRefOf(row) : null
    return worker ? store.taskOf(worker) ?? null : null
  }
  /** Locates the Task in the right panel; `openRun` opens the row's run when the page has no right panel. */
  const locate = (task: TaskWorkerTask, openRun: () => void) => locator.locate(task, openRun)

  return { taskOf, locate }
}
