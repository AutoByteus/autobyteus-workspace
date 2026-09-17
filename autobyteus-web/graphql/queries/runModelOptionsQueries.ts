import gql from 'graphql-tag'
const options = gql`fragment RunModelOptionsFields on RunModelOptionsObject {
  currentModelIdentifier currentContextTokens unavailableReason
  replacements { llmModelIdentifier contextTokens }
}`
export const AgentRunModelOptions = gql`query AgentRunModelOptions($agentRunId: String!) {
  agentRunModelOptions(agentRunId: $agentRunId) { ...RunModelOptionsFields }
} ${options}`
export const TeamRunModelOptions = gql`query TeamRunModelOptions($teamRunId: String!) {
  teamRunModelOptions(teamRunId: $teamRunId) {
    scopeKind scopeAddress currentModelIdentifier currentContextTokens unavailableReason
    replacements { llmModelIdentifier contextTokens }
  }
}`

export const AgentOrgMemberModelConfig = gql`query AgentOrgMemberModelConfig($identity: AgentOrgMemberModelConfigIdentityInput!) {
  getAgentOrgMemberModelConfig(identity: $identity) {
    orgRunId memberAddress agentRunId launchConfiguration isActive editability { editable reason }
    modelOptions { ...RunModelOptionsFields }
  }
} ${options}`
