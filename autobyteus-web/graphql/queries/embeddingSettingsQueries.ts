import gql from 'graphql-tag'

/** The Embedding section's whole status in one read-only request: the models and every Project's index state. */
export const EmbeddingSettingsStatus = gql`
  query EmbeddingSettingsStatus {
    embeddingModelsStatus {
      activeModelId
      defaultModelId
      onDiskBytes
      models {
        id
        displayName
        languages
        downloadBytes
        file { state done total reason }
        activeDisplay { state phase done total reason }
      }
    }
    projectTaskIndexes { projectId name state done total changed }
  }
`
