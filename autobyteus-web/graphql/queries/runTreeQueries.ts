import { gql } from 'graphql-tag'

/**
 * A listed run's tree, built on the server (autobyteus-461 SR-084): read when the run is expanded and again on its
 * `RUN_TREE_CHANGED` (`/ws/run-status`). An open view gets the same rows on its stream.
 */
export const GetRunTree = gql`
  query GetRunTree($kind: String!, $runId: String!) {
    runTree(kind: $kind, runId: $runId)
  }
`
