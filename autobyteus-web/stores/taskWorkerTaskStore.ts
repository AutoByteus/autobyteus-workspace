import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { getApolloClient } from '~/utils/apolloClient'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { getProjectChangeFeed } from '~/services/projects/projectChangeFeed'
import { GetTaskWorkerTasks } from '~/graphql/queries/projectTaskQueries'
import type { ProjectChangeMessage, ProjectTaskStatus, TaskWorkerRef, TaskWorkerTask } from '~/types/project'
import { throwProjectGraphqlErrors } from '~/utils/projects/projectRequestError'

type TaskWorkerTaskAnswer = { workerKind: 'agent' | 'team'; workerRunId: string; task: TaskWorkerTask | null }

export const taskWorkerKey = (worker: TaskWorkerRef): string => worker.kind === 'agent' ? `agent:${worker.agentRunId}` : `team:${worker.teamRunId}`

/**
 * The current Task of each Task worker the Workspaces tree shows (delegated-copy-task-locator), from
 * the server's assignment data. Rows register interest; newly listed workers are read in one batched
 * query per microtask. The `/ws/projects` feed (retained while any interest exists) marks affected
 * workers for a re-read, so the server's current-Task rule stays the only authority. A key's answer is
 * applied only when it answers that key's latest read (per-key epochs); a node rebinding starts over.
 */
export const useTaskWorkerTaskStore = defineStore('taskWorkerTasks', () => {
  const node = useWindowNodeContextStore()
  /** Known answers by worker key: its current Task, or null (it has none). Absent: not known yet. */
  const answers = ref<Record<string, TaskWorkerTask | null>>({})
  const interest = new Map<string, { worker: TaskWorkerRef; count: number }>()
  /** Per key: bumped whenever an answer read earlier must no longer be applied. */
  const epochs = new Map<string, number>()
  const queue = new Set<string>()
  let flushScheduled = false
  let releaseFeed: (() => void) | null = null

  const bump = (key: string) => { epochs.set(key, (epochs.get(key) ?? 0) + 1) }
  const forgetAnswer = (key: string) => {
    if (!(key in answers.value)) return
    const { [key]: _gone, ...rest } = answers.value
    answers.value = rest
  }

  const flush = async () => {
    const keys = [...queue].filter((key) => interest.has(key))
    queue.clear()
    if (!keys.length) return
    const stamps = new Map(keys.map((key) => [key, epochs.get(key) ?? 0]))
    const workers = keys.map((key) => interest.get(key)!.worker)
    const revision = node.bindingRevision
    try {
      if (!await node.waitForBoundBackendReady() || node.bindingRevision !== revision) return
      const { data, errors } = await getApolloClient().query({
        query: GetTaskWorkerTasks,
        variables: {
          agentRunIds: workers.flatMap((worker) => worker.kind === 'agent' ? [worker.agentRunId] : []),
          teamRunIds: workers.flatMap((worker) => worker.kind === 'team' ? [worker.teamRunId] : []),
        },
        fetchPolicy: 'network-only',
        context: { queryDeduplication: false },
      })
      throwProjectGraphqlErrors(errors)
      if (node.bindingRevision !== revision) return
      const next = { ...answers.value }
      for (const answer of (data?.taskWorkerTasks ?? []) as TaskWorkerTaskAnswer[]) {
        const key = `${answer.workerKind}:${answer.workerRunId}`
        if (!interest.has(key) || !stamps.has(key) || epochs.get(key) !== stamps.get(key)) continue
        next[key] = answer.task && { taskId: answer.task.taskId, projectId: answer.task.projectId ?? null,
          description: answer.task.description, status: answer.task.status as ProjectTaskStatus }
      }
      answers.value = next
    } catch (error) {
      // No fallback: a worker without a known Task shows no summary until the next successful read.
      console.warn('Task workers\' Tasks could not be read.', error)
    }
  }

  /** Marks one interested worker for the next batched read; an answer read before now is dropped. */
  const enqueue = (key: string) => {
    if (!interest.has(key)) return
    bump(key)
    queue.add(key)
    if (flushScheduled) return
    flushScheduled = true
    queueMicrotask(() => { flushScheduled = false; void flush() })
  }

  /** Registers interest in these workers until the returned release is called. */
  const retain = (workers: readonly TaskWorkerRef[]): (() => void) => {
    const keys = workers.map((worker) => {
      const key = taskWorkerKey(worker)
      const entry = interest.get(key)
      if (entry) entry.count++
      else { interest.set(key, { worker, count: 1 }); enqueue(key) }
      return key
    })
    if (interest.size > 0 && !releaseFeed) releaseFeed = getProjectChangeFeed().retain()
    let released = false
    return () => {
      if (released) return
      released = true
      for (const key of keys) {
        const entry = interest.get(key)
        if (!entry || --entry.count > 0) continue
        interest.delete(key)
        bump(key)
        forgetAnswer(key)
      }
      if (interest.size === 0 && releaseFeed) { releaseFeed(); releaseFeed = null }
    }
  }

  /** The worker's current Task, null when it has none, undefined while it is not known yet. */
  const taskOf = (worker: TaskWorkerRef): TaskWorkerTask | null | undefined => answers.value[taskWorkerKey(worker)]

  const requeue = (affected: (key: string, task: TaskWorkerTask | null | undefined) => boolean) => {
    for (const key of interest.keys()) if (affected(key, answers.value[key])) enqueue(key)
  }
  /** One `/ws/projects` change: re-read the workers whose current Task it may have changed. */
  const applyChange = (message: ProjectChangeMessage) => {
    if (message.type === 'connected') requeue(() => true)
    else if (message.type === 'task_upserted') {
      const root = message.task.root
      const rootKey = !root ? null : root.kind === 'agent' ? `agent:${root.ingressAgentRunId}` : root.teamRunId ? `team:${root.teamRunId}` : null
      requeue((key, task) => key === rootKey || task?.taskId === message.task.taskId)
    } else if (message.type === 'task_removed') requeue((_key, task) => task?.taskId === message.taskId)
    else if (message.type === 'project_removed') requeue((_key, task) => task?.projectId === message.projectId)
  }

  watch(() => node.bindingRevision, () => {
    answers.value = {}
    requeue(() => true)
  }, { flush: 'sync' })

  return { answers, retain, taskOf, applyChange }
})
