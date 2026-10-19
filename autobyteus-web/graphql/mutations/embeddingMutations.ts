import gql from 'graphql-tag'

/** Clears an unavailable embedding model and prepares it again at once (the board and Settings). */
export const RetryEmbeddingModel = gql`
  mutation RetryEmbeddingModel {
    retryEmbeddingModel
  }
`
