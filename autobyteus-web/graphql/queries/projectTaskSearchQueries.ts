import gql from 'graphql-tag'

/** Exact and meaning matches of a Project's Tasks, best-first, with the readiness of meaning search. */
export const SearchProjectTasks = gql`
  query SearchProjectTasks($projectId: String!, $query: String!) {
    searchProjectTasks(projectId: $projectId, query: $query) {
      matches { taskId match }
      meaningSearch { state phase done total reason }
    }
  }
`
