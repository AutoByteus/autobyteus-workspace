import { onScopeDispose, ref, shallowRef, watch } from 'vue'
import type { DocumentNode } from 'graphql'
import { getApolloClient } from '~/utils/apolloClient'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { EmbeddingSettingsStatus } from '~/graphql/queries/embeddingSettingsQueries'
import {
  CancelEmbeddingModelDownload, DownloadEmbeddingModel, IndexAllProjectTasks, IndexProjectTasks, RebuildProjectTaskIndex,
  RemoveEmbeddingModel, UseEmbeddingModel,
} from '~/graphql/mutations/embeddingSettingsMutations'
import { RetryEmbeddingModel } from '~/graphql/mutations/embeddingMutations'
import type { EmbeddingModelsStatus, EmbeddingSettingsStatus as Status, ProjectTaskIndex } from '~/types/embeddingSettings'

/** While a download, a model preparation or indexing runs, the status is read this often (REQ-007: at most 2 s stale). */
export const BUSY_POLL_MS = 2000
/** Otherwise this often, so changes made elsewhere (the board, an agent, Advanced) still show. */
export const IDLE_POLL_MS = 10000

export type EmbeddingAnnouncement = { kind: 'downloaded' | 'ready' | 'indexed'; name: string }
/** A failed action: the server's message, or `unreachable` for a transport failure with no server message (DEC-013). */
export type EmbeddingActionError = { kind: 'server'; message: string } | { kind: 'unreachable' }
type GraphqlErrorLike = { message?: string }

const isBusy = (status: Status) =>
  status.models.models.some((model) => model.file.state === 'DOWNLOADING' || model.activeDisplay?.state === 'PREPARING')
  || status.projects.some((project) => project.state === 'WAITING' || project.state === 'INDEXING')

/** Completions between two readings: a download ahead finished, the active model became ready, a Project was indexed. */
const completionsBetween = (before: Status, after: Status): EmbeddingAnnouncement[] => {
  const previousModels = new Map(before.models.models.map((model) => [model.id, model]))
  const previousProjects = new Map(before.projects.map((project) => [project.projectId, project]))
  const done: EmbeddingAnnouncement[] = []
  for (const model of after.models.models) {
    const previous = previousModels.get(model.id)
    if (previous?.file.state === 'DOWNLOADING' && model.file.state === 'DOWNLOADED' && !model.activeDisplay) {
      done.push({ kind: 'downloaded', name: model.displayName })
    }
    if (previous?.activeDisplay?.state === 'PREPARING' && model.activeDisplay?.state === 'READY') {
      done.push({ kind: 'ready', name: model.displayName })
    }
  }
  for (const project of after.projects) {
    const previous = previousProjects.get(project.projectId)?.state
    if ((previous === 'WAITING' || previous === 'INDEXING') && project.state === 'READY') {
      done.push({ kind: 'indexed', name: project.name })
    }
  }
  return done
}

/** The server's message carried by a failed request, if the server answered at all. */
const serverMessageOf = (cause: unknown): string | null => {
  const failure = cause as { graphQLErrors?: GraphqlErrorLike[]; networkError?: { result?: { errors?: GraphqlErrorLike[] } } } | null
  return failure?.graphQLErrors?.[0]?.message || failure?.networkError?.result?.errors?.[0]?.message || null
}

/**
 * The Embedding section's data: one read-only status request (models and Project indexes) polled every 2 s while
 * work runs and every 10 s otherwise, until the caller's scope ends; the latest request wins. Reading the status never
 * starts work; the actions do, and the status is read again right after each one.
 */
export const useEmbeddingSettings = () => {
  const node = useWindowNodeContextStore()
  const status = shallowRef<Status | null>(null)
  const loadStatus = ref<'loading' | 'error' | 'ready'>('loading')
  const actionError = ref<EmbeddingActionError | null>(null)
  const announcements = shallowRef<EmbeddingAnnouncement[]>([])
  let latest = 0
  let timer: ReturnType<typeof setTimeout> | null = null
  let disposed = false

  const clearTimer = () => { if (timer) clearTimeout(timer); timer = null }
  const schedule = (delay: number) => {
    clearTimer()
    if (!disposed) timer = setTimeout(() => { timer = null; void refresh() }, delay)
  }

  const refresh = async (): Promise<void> => {
    clearTimer()
    const seq = ++latest
    const revision = node.bindingRevision
    const current = () => !disposed && seq === latest && node.bindingRevision === revision
    try {
      if (!await node.waitForBoundBackendReady()) throw new Error(node.lastReadyError || 'Bound backend is not ready')
      const { data, errors } = await getApolloClient().query({
        query: EmbeddingSettingsStatus, fetchPolicy: 'network-only', context: { queryDeduplication: false },
      })
      if (errors?.length) throw new Error(errors.map((entry: GraphqlErrorLike) => entry.message).join(', '))
      if (!current()) return
      const next: Status = {
        models: data.embeddingModelsStatus as EmbeddingModelsStatus,
        projects: data.projectTaskIndexes as ProjectTaskIndex[],
      }
      const done = status.value ? completionsBetween(status.value, next) : []
      if (done.length) announcements.value = done
      status.value = next
      loadStatus.value = 'ready'
    } catch {
      if (!current()) return
      // The first reading failed: the panel offers Retry. A later failed poll keeps the last status and tries again.
      if (!status.value) {
        loadStatus.value = 'error'
        return
      }
    }
    schedule(status.value && isBusy(status.value) ? BUSY_POLL_MS : IDLE_POLL_MS)
  }

  /**
   * Runs one action and settles as soon as the server answered it (the caller's buttons come back then, O-2); the status
   * is read again right after, in the background. False (with `actionError` set) when the action failed.
   */
  const act = async (mutation: DocumentNode, variables?: Record<string, unknown>): Promise<boolean> => {
    actionError.value = null
    let ok = true
    try {
      const { errors } = await getApolloClient().mutate({ mutation, variables })
      if (errors?.length) {
        actionError.value = { kind: 'server', message: errors.map((entry: GraphqlErrorLike) => entry.message).join(', ') }
        ok = false
      }
    } catch (cause) {
      const message = serverMessageOf(cause)
      actionError.value = message ? { kind: 'server', message } : { kind: 'unreachable' }
      ok = false
    }
    void refresh()
    return ok
  }

  // Another node bound to this window: start over with its status.
  watch(() => node.bindingRevision, () => {
    status.value = null
    loadStatus.value = 'loading'
    void refresh()
  })
  onScopeDispose(() => { disposed = true; latest++; clearTimer() })

  return {
    status,
    loadStatus,
    actionError,
    /** The completions seen by the latest reading (for the polite live region). */
    announcements,
    /** Reads the status now (first load and the load-error Retry). */
    load: () => {
      if (!status.value) loadStatus.value = 'loading'
      return refresh()
    },
    download: (modelId: string) => act(DownloadEmbeddingModel, { modelId }),
    cancelDownload: (modelId: string) => act(CancelEmbeddingModelDownload, { modelId }),
    remove: (modelId: string) => act(RemoveEmbeddingModel, { modelId }),
    use: (modelId: string) => act(UseEmbeddingModel, { modelId }),
    retryModel: () => act(RetryEmbeddingModel),
    indexProject: (projectId: string) => act(IndexProjectTasks, { projectId }),
    rebuildProject: (projectId: string) => act(RebuildProjectTaskIndex, { projectId }),
    indexAll: () => act(IndexAllProjectTasks),
  }
}

export type EmbeddingSettings = ReturnType<typeof useEmbeddingSettings>
