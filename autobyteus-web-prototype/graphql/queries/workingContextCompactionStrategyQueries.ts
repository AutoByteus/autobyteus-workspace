import gql from 'graphql-tag'

export const GET_WORKING_CONTEXT_COMPACTION_STRATEGIES = gql`
  query GetWorkingContextCompactionStrategies {
    getWorkingContextCompactionStrategies {
      id
      name
    }
  }
`
