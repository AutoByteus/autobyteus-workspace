import gql from 'graphql-tag'
import {
  SelfEvolutionCapabilityFields,
  SelfEvolutionRunRecordSummaryFields,
} from '~/graphql/queries/selfEvolutionQueries'

export const SetSelfEvolutionEnabled = gql`
  mutation SetSelfEvolutionEnabled($enabled: Boolean!) {
    setSelfEvolutionEnabled(enabled: $enabled) {
      ...SelfEvolutionCapabilityFields
    }
  }
  ${SelfEvolutionCapabilityFields}
`

export const StartAgentRunSelfEvolution = gql`
  mutation StartAgentRunSelfEvolution($input: StartAgentRunSelfEvolutionInput!) {
    startAgentRunSelfEvolution(input: $input) {
      evolutionRunId
      evolverRunId
      record {
        ...SelfEvolutionRunRecordSummaryFields
      }
    }
  }
  ${SelfEvolutionRunRecordSummaryFields}
`

export const StartTeamMemberSelfEvolution = gql`
  mutation StartTeamMemberSelfEvolution($input: StartTeamMemberSelfEvolutionInput!) {
    startTeamMemberSelfEvolution(input: $input) {
      evolutionRunId
      evolverRunId
      record {
        ...SelfEvolutionRunRecordSummaryFields
      }
    }
  }
  ${SelfEvolutionRunRecordSummaryFields}
`
