import gql from 'graphql-tag'

/** The node's available agent runtimes, models and usage limits, read live on every request (one JSON value). */
export const AvailableAgentRuntimes = gql`
  query AvailableAgentRuntimes {
    availableAgentRuntimes
  }
`
