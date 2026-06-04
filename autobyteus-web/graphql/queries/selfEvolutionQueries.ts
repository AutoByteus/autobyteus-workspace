import gql from 'graphql-tag'

export const SelfEvolutionCapabilityFields = gql`
  fragment SelfEvolutionCapabilityFields on SelfEvolutionCapability {
    enabled
    settingKey
    source
  }
`

export const SelfEvolutionEffectiveConfigFields = gql`
  fragment SelfEvolutionEffectiveConfigFields on GraphqlSelfEvolutionEffectiveConfig {
    enabled
    triggerStrategy
    evolverStrategy
    evolverAgentDefinitionId
    resolvedAt
    sourceTrace {
      source
      fields
    }
  }
`

export const SelfEvolutionSkillTargetFields = gql`
  fragment SelfEvolutionSkillTargetFields on GraphqlSelfEvolutionSkillTarget {
    skillName
    skillRootPath
    skillMdPath
    sourceLabel
    isWritable
    gitRootPath
    rollbackMode
  }
`

export const SelfEvolutionEligibilityFields = gql`
  fragment SelfEvolutionEligibilityFields on GraphqlSelfEvolutionEligibility {
    eligible
    reasons
    warnings
    skillTargets {
      ...SelfEvolutionSkillTargetFields
    }
    effectiveConfig {
      ...SelfEvolutionEffectiveConfigFields
    }
  }
  ${SelfEvolutionSkillTargetFields}
  ${SelfEvolutionEffectiveConfigFields}
`

export const SelfEvolutionRunRecordSummaryFields = gql`
  fragment SelfEvolutionRunRecordSummaryFields on GraphqlSelfEvolutionRunRecord {
    evolutionRunId
    status
    evolverRunId
    errors
  }
`

export const GetSelfEvolutionCapability = gql`
  query GetSelfEvolutionCapability {
    selfEvolutionCapability {
      ...SelfEvolutionCapabilityFields
    }
  }
  ${SelfEvolutionCapabilityFields}
`

export const GetAgentRunSelfEvolutionEligibility = gql`
  query GetAgentRunSelfEvolutionEligibility($runId: String!) {
    getAgentRunSelfEvolutionEligibility(runId: $runId) {
      ...SelfEvolutionEligibilityFields
    }
  }
  ${SelfEvolutionEligibilityFields}
`

export const GetTeamMemberSelfEvolutionEligibility = gql`
  query GetTeamMemberSelfEvolutionEligibility($teamRunId: String!, $memberRunId: String!) {
    getTeamMemberSelfEvolutionEligibility(teamRunId: $teamRunId, memberRunId: $memberRunId) {
      ...SelfEvolutionEligibilityFields
    }
  }
  ${SelfEvolutionEligibilityFields}
`

export const GetSelfEvolutionRunRecord = gql`
  query GetSelfEvolutionRunRecord($evolutionRunId: String!) {
    getSelfEvolutionRunRecord(evolutionRunId: $evolutionRunId) {
      ...SelfEvolutionRunRecordSummaryFields
    }
  }
  ${SelfEvolutionRunRecordSummaryFields}
`
