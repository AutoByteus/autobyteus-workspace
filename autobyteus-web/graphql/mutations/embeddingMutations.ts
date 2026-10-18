import gql from 'graphql-tag'

/** Clears an unavailable embedding model so the next search tries to prepare it again. */
export const RetryEmbeddingModel = gql`
  mutation RetryEmbeddingModel {
    retryEmbeddingModel
  }
`
