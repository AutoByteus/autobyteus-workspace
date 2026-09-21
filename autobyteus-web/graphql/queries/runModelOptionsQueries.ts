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

export const AgentOrgRunModelConfig = gql`query AgentOrgRunModelConfig($orgRunId: String!) {
  getAgentOrgRunModelConfig(orgRunId: $orgRunId) {
    orgRunId executionTree isActive editability { editable reason }
  }
}`
export const AgentOrgRunModelOptions = gql`query AgentOrgRunModelOptions($orgRunId: String!) {
  agentOrgRunModelOptions(orgRunId: $orgRunId) {
    scopeKind scopeAddress currentModelIdentifier currentContextTokens unavailableReason
    replacements { llmModelIdentifier contextTokens }
  }
}`
