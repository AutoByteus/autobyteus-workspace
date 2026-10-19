import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue'
import { getApolloClient } from '~/utils/apolloClient'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { SearchProjectTasks } from '~/graphql/queries/projectTaskSearchQueries'
import { RetryEmbeddingModel } from '~/graphql/mutations/embeddingMutations'
import type { MeaningSearchStatus, ProjectTask, ProjectTaskSearchResult } from '~/types/project'
import { throwProjectGraphqlErrors, toProjectRequestError } from '~/utils/projects/projectRequestError'

/** Pause after typing stops before the search is sent. */
export const SEARCH_DEBOUNCE_MS = 250
/** While meaning search prepares, the shown query is asked again this often, so results update without retyping. */
export const PREPARING_POLL_MS = 2000

/** The board's answer for one Project and query: each matching Task's rank (best-first) and meaning-search readiness. */
export interface ProjectTaskSearchAnswer {
  projectId: string
  query: string
  ranks: Map<string, number>
  meaningSearch: MeaningSearchStatus
}

/**
 * Server-side search for a Project board (the server decides matches: exact text, then meaning). Owns the debounce,
 * the request lifecycle (the latest request wins; answers for an older query or Project are dropped), polling while
 * meaning search prepares, a new request when the Project's Task list changes, and Retry of an unavailable model.
 * An empty query sends nothing: the board shows its normal order.
 */
export const useProjectTaskSearch = (source: { projectId: () => string; query: () => string; tasks: () => readonly ProjectTask[] }) => {
  const node = useWindowNodeContextStore()
  const answer = shallowRef<ProjectTaskSearchAnswer | null>(null)
  const error = ref<string | null>(null)
  const pending = ref(false)
  let latest = 0
  let timer: ReturnType<typeof setTimeout> | null = null
  const query = computed(() => source.query().trim())
  const active = computed(() => query.value.length > 0)

  const clearTimer = () => { if (timer) clearTimeout(timer); timer = null }
  /**
   * A new query, Project or Task list makes the shown answer unsettled until its request answers. A readiness poll
   * (`refresh`) asks the same question again for a settled answer, so it never makes it unsettled: the locator can act
   * on the answer while meaning search prepares.
   */
  const schedule = (delay: number, refresh = false) => {
    clearTimer()
    if (!refresh) pending.value = true
    timer = setTimeout(() => { timer = null; void run(refresh) }, delay)
  }

  const run = async (refresh = false) => {
    const seq = ++latest
    const projectId = source.projectId(), text = query.value, revision = node.bindingRevision
    if (!text) return
    if (!refresh) pending.value = true
    const current = () => seq === latest && node.bindingRevision === revision
    try {
      if (!await node.waitForBoundBackendReady()) throw new Error(node.lastReadyError || 'Bound backend is not ready')
      const { data, errors } = await getApolloClient().query({ query: SearchProjectTasks, variables: { projectId, query: text },
        fetchPolicy: 'network-only', context: { queryDeduplication: false } })
      throwProjectGraphqlErrors(errors)
      if (!current()) return
      const result = data.searchProjectTasks as ProjectTaskSearchResult
      answer.value = { projectId, query: text, ranks: new Map(result.matches.map((match, index) => [match.taskId, index])), meaningSearch: result.meaningSearch }
      error.value = null
      pending.value = false
      if (result.meaningSearch.state === 'PREPARING') schedule(PREPARING_POLL_MS, true)
    } catch (cause) {
      if (!current()) return
      error.value = toProjectRequestError(cause).message
      pending.value = false
    }
  }

  watch([() => source.projectId(), query], ([projectId], [previousProjectId]) => {
    latest++
    clearTimer()
    if (projectId !== previousProjectId) answer.value = null
    if (!active.value) {
      answer.value = null
      error.value = null
      pending.value = false
      return
    }
    schedule(SEARCH_DEBOUNCE_MS)
  }, { immediate: true })
  // A Task added, edited or removed changes what matches: ask again for the shown query.
  watch(() => source.tasks().map((task) => `${task.taskId}@${task.updatedAt}`).join('|'), () => {
    if (active.value) schedule(SEARCH_DEBOUNCE_MS)
  })
  onScopeDispose(() => { latest++; clearTimer() })

  /** The answer for the shown Project; while a newer query is on its way the previous answer stays shown. */
  const shown = computed(() => active.value && answer.value?.projectId === source.projectId() ? answer.value : null)
  return {
    active,
    answer: shown,
    meaningSearch: computed(() => shown.value?.meaningSearch ?? null),
    error,
    /** The shown answer is for the current query and nothing newer is pending (or the request failed). */
    settled: computed(() => !active.value || (!pending.value && (error.value !== null || shown.value?.query === query.value))),
    /** Asks the server to try the model again, then searches again. */
    retry: async () => {
      try {
        await getApolloClient().mutate({ mutation: RetryEmbeddingModel })
      } catch (cause) {
        error.value = toProjectRequestError(cause).message
        return
      }
      clearTimer()
      await run()
    },
    /** Searches the current query again (after a failed request). */
    reload: () => { clearTimer(); void run() },
  }
}
