import gql from 'graphql-tag'
import {
  SkillImprovementCapabilityFields,
  SkillImprovementRunRecordSummaryFields,
} from '~/graphql/queries/skillImprovementQueries'

export const SetSkillImprovementEnabled = gql`
  mutation SetSkillImprovementEnabled($enabled: Boolean!) {
    setSkillImprovementEnabled(enabled: $enabled) {
      ...SkillImprovementCapabilityFields
    }
  }
  ${SkillImprovementCapabilityFields}
`

export const StartAgentRunSkillImprovement = gql`
  mutation StartAgentRunSkillImprovement($input: StartAgentRunSkillImprovementInput!) {
    startAgentRunSkillImprovement(input: $input) {
      improvementRunId
      improverRunId
      record {
        ...SkillImprovementRunRecordSummaryFields
      }
    }
  }
  ${SkillImprovementRunRecordSummaryFields}
`

export const StartTeamMemberSkillImprovement = gql`
  mutation StartTeamMemberSkillImprovement($input: StartTeamMemberSkillImprovementInput!) {
    startTeamMemberSkillImprovement(input: $input) {
      improvementRunId
      improverRunId
      record {
        ...SkillImprovementRunRecordSummaryFields
      }
    }
  }
  ${SkillImprovementRunRecordSummaryFields}
`
