import gql from 'graphql-tag'

/** Downloads a model ahead of time; for the active model, prepares it (not cancellable). */
export const DownloadEmbeddingModel = gql`
  mutation DownloadEmbeddingModel($modelId: String!) {
    downloadEmbeddingModel(modelId: $modelId)
  }
`

/** Cancels a download ahead; nothing of it is kept. */
export const CancelEmbeddingModelDownload = gql`
  mutation CancelEmbeddingModelDownload($modelId: String!) {
    cancelEmbeddingModelDownload(modelId: $modelId)
  }
`

/** Deletes a downloaded model that is neither active nor downloading. */
export const RemoveEmbeddingModel = gql`
  mutation RemoveEmbeddingModel($modelId: String!) {
    removeEmbeddingModel(modelId: $modelId)
  }
`

/** Makes a model the node's active model and prepares it now. */
export const UseEmbeddingModel = gql`
  mutation UseEmbeddingModel($modelId: String!) {
    useEmbeddingModel(modelId: $modelId)
  }
`

/** Indexes a Project's missing or changed Tasks. */
export const IndexProjectTasks = gql`
  mutation IndexProjectTasks($projectId: String!) {
    indexProjectTasks(projectId: $projectId)
  }
`

/** Drops a Project's vectors, then indexes every Task. */
export const RebuildProjectTaskIndex = gql`
  mutation RebuildProjectTaskIndex($projectId: String!) {
    rebuildProjectTaskIndex(projectId: $projectId)
  }
`

/** Indexes every Project that is not indexed or needs an update; returns how many. */
export const IndexAllProjectTasks = gql`
  mutation IndexAllProjectTasks {
    indexAllProjectTasks
  }
`
