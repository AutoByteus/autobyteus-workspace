import type { MeaningSearchStatus, ProjectTask, ProjectTaskSearchResult } from '~/types/project'

/**
 * A stand-in for the server's `searchProjectTasks` in board tests. It answers like the server: exact matches are the
 * Tasks whose description contains the trimmed query (case-insensitive), latest update first; scripted meaning
 * matches (by query) follow; `meaningSearch` is READY unless a test sets another state.
 */
export const createProjectTaskSearchServer = (tasksOf: (projectId: string) => readonly ProjectTask[]) => {
  const server = {
    meaning: {} as Record<string, string[]>,
    meaningSearch: { state: 'READY', phase: null, done: null, total: null, reason: null } as MeaningSearchStatus,
    requests: [] as Array<{ projectId: string; query: string }>,
    answer(projectId: string, query: string): ProjectTaskSearchResult {
      server.requests.push({ projectId, query })
      const needle = query.trim().toLocaleLowerCase()
      const exact = [...tasksOf(projectId)].filter((task) => task.description.toLocaleLowerCase().includes(needle))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      const exactIds = new Set(exact.map((task) => task.taskId))
      return {
        matches: [
          ...exact.map((task) => ({ taskId: task.taskId, match: 'EXACT' as const })),
          ...(server.meaning[query.trim()] ?? []).filter((id) => !exactIds.has(id)).map((taskId) => ({ taskId, match: 'MEANING' as const })),
        ],
        meaningSearch: server.meaningSearch,
      }
    },
    /** True when the Apollo `query` call is a search (to route it in a shared mock). */
    isSearch: (options: { variables?: Record<string, unknown> }) => typeof options.variables?.query === 'string',
    respond: (options: { variables: { projectId: string; query: string } }) =>
      Promise.resolve({ data: { searchProjectTasks: server.answer(options.variables.projectId, options.variables.query) } }),
  }
  return server
}

/** Waits past the board's search debounce and lets the answer render. */
export const afterSearchDebounce = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms))
