import gql from 'graphql-tag'

export const SkillImprovementCapabilityFields = gql`
  fragment SkillImprovementCapabilityFields on SkillImprovementCapability {
    enabled
    settingKey
    source
  }
`

export const SkillImprovementEffectiveConfigFields = gql`
  fragment SkillImprovementEffectiveConfigFields on GraphqlSkillImprovementEffectiveConfig {
    enabled
    triggerStrategy
    improverStrategy
    improverAgentDefinitionId
    resolvedAt
    sourceTrace {
      source
      fields
    }
  }
`

export const SkillImprovementSkillTargetFields = gql`
  fragment SkillImprovementSkillTargetFields on GraphqlSkillImprovementSkillTarget {
    skillName
    skillRootPath
    skillMdPath
    sourceLabel
    isWritable
  }
`

export const SkillImprovementEligibilityFields = gql`
  fragment SkillImprovementEligibilityFields on GraphqlSkillImprovementEligibility {
    eligible
    reasons
    warnings
    skillTargets {
      ...SkillImprovementSkillTargetFields
    }
    effectiveConfig {
      ...SkillImprovementEffectiveConfigFields
    }
  }
  ${SkillImprovementSkillTargetFields}
  ${SkillImprovementEffectiveConfigFields}
`

export const SkillImprovementRunRecordSummaryFields = gql`
  fragment SkillImprovementRunRecordSummaryFields on GraphqlSkillImprovementRunRecord {
    improvementRunId
    status
    improverRunId
    errors
  }
`

export const GetSkillImprovementCapability = gql`
  query GetSkillImprovementCapability {
    skillImprovementCapability {
      ...SkillImprovementCapabilityFields
    }
  }
  ${SkillImprovementCapabilityFields}
`

export const GetAgentRunSkillImprovementEligibility = gql`
  query GetAgentRunSkillImprovementEligibility($runId: String!) {
    getAgentRunSkillImprovementEligibility(runId: $runId) {
      ...SkillImprovementEligibilityFields
    }
  }
  ${SkillImprovementEligibilityFields}
`

export const GetTeamMemberSkillImprovementEligibility = gql`
  query GetTeamMemberSkillImprovementEligibility($teamRunId: String!, $agentRunId: String!) {
    getTeamMemberSkillImprovementEligibility(teamRunId: $teamRunId, agentRunId: $agentRunId) {
      ...SkillImprovementEligibilityFields
    }
  }
  ${SkillImprovementEligibilityFields}
`

export const GetSkillImprovementRunRecord = gql`
  query GetSkillImprovementRunRecord($improvementRunId: String!) {
    getSkillImprovementRunRecord(improvementRunId: $improvementRunId) {
      ...SkillImprovementRunRecordSummaryFields
    }
  }
  ${SkillImprovementRunRecordSummaryFields}
`
